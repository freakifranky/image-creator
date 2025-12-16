import { NextResponse } from "next/server";
import { PROMPT_IMAGE1_FRESH, PROMPT_IMAGE1_NONFRESH } from "@/lib/prompts";
import { geminiImageEdit } from "@/lib/gemini";
import { openaiImageEdit } from "@/lib/openai";
import { postprocessPng } from "@/lib/postprocess";

export const runtime = "nodejs";

async function fetchAsArrayBuffer(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image URL: ${res.status}`);
  return await res.arrayBuffer();
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const preferPro = String(form.get("preferPro") || "false") === "true";
    const transparentBg = String(form.get("transparentBg") || "false") === "true";
    const maxKb = Number(form.get("maxKb") || 0);
    const maxBytes = maxKb > 0 ? Math.floor(maxKb * 1024) : undefined;

    const skuType = String(form.get("skuType") || "fresh");
    const mode = String(form.get("mode") || "upload");
    const provider = String(form.get("provider") || "gemini"); // "gemini" | "openai"

    let mimeType = "image/png";

    // Keep BOTH representations:
    // - inputAb: for OpenAI File([inputAb])
    // - inputBuf: for Gemini base64
    let inputAb: ArrayBuffer;
    let inputBuf: Buffer<ArrayBufferLike>;

    if (mode === "url") {
      const imageUrl = String(form.get("imageUrl") || "");
      if (!imageUrl) return new NextResponse("Missing imageUrl", { status: 400 });

      inputAb = await fetchAsArrayBuffer(imageUrl);
      inputBuf = Buffer.from(inputAb);
    } else {
      const file = form.get("file");
      if (!file || !(file instanceof File)) {
        return new NextResponse("Missing file", { status: 400 });
      }

      mimeType = file.type || "image/png";
      inputAb = await file.arrayBuffer();
      inputBuf = Buffer.from(inputAb);
    }

    const prompt = skuType === "fresh" ? PROMPT_IMAGE1_FRESH : PROMPT_IMAGE1_NONFRESH;

    let outB64 = "";
    let usedModel = "";

    if (provider === "openai") {
      // ✅ Build File from ArrayBuffer (NOT Node Buffer) for TS + runtime compatibility
      const f = new File([inputAb], "input.png", { type: mimeType || "image/png" });

      const r = await openaiImageEdit({ prompt, file: f });
      outB64 = r.pngBase64;
      usedModel = "gpt-image-1";
    } else {
      const r = await geminiImageEdit({
        prompt,
        mimeType,
        base64: inputBuf.toString("base64"),
        preferPro,
      });

      outB64 = r.pngBase64;
      usedModel = r.usedModel;
    }

    // Decode output + postprocess
    let out: Buffer<ArrayBufferLike> = Buffer.from(outB64, "base64");
    out = await postprocessPng(out, { maxBytes, transparentBg });

    // ✅ NextResponse wants a web BodyInit — Uint8Array is safe
    const body = new Uint8Array(out);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
        "X-Used-Model": usedModel || "",
        "X-Output-Bytes": String(out.length),
      },
    });
  } catch (e: any) {
    const msg = String(e?.message || "Server error");

    if (msg === "OPENAI_ORG_NOT_VERIFIED_FOR_GPT_IMAGE_1") {
      return new NextResponse("403 OpenAI org not verified for gpt-image-1.", { status: 403 });
    }
    if (msg.includes("overloaded") || msg.includes("UNAVAILABLE")) {
      return new NextResponse("503 Model overloaded. Please retry.", { status: 503 });
    }
    return new NextResponse(msg, { status: 500 });
  }
}
