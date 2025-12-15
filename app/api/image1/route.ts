import { NextResponse } from "next/server";
import { PROMPT_IMAGE1_FRESH, PROMPT_IMAGE1_NONFRESH } from "@/lib/prompts";
import { geminiImageEdit } from "@/lib/gemini";
import { openaiImageEdit } from "@/lib/openai";
import { postprocessPng } from "@/lib/postprocess";


export const runtime = "nodejs";

async function fetchAsBuffer(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image URL: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
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
    let buf: Buffer;

    if (mode === "url") {
      const imageUrl = String(form.get("imageUrl") || "");
      if (!imageUrl) return new NextResponse("Missing imageUrl", { status: 400 });
      buf = await fetchAsBuffer(imageUrl);
    } else {
      const file = form.get("file");
      if (!file || !(file instanceof File)) return new NextResponse("Missing file", { status: 400 });
      mimeType = file.type || "image/png";
      buf = Buffer.from(await file.arrayBuffer());
    }

    const prompt = skuType === "fresh" ? PROMPT_IMAGE1_FRESH : PROMPT_IMAGE1_NONFRESH;

    let outB64 = "";
    let usedModel = "";

    if (provider === "openai") {
      // const f = new File([buf], "input.png", { type: mimeType });
      const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
const f = new File([u8], "input.png", { type: mime || "image/png" });
      const r = await openaiImageEdit({ prompt, file: f });
      outB64 = r.pngBase64;
      usedModel = "gpt-image-1";
    } else {
      const r = await geminiImageEdit({
        prompt,
        mimeType,
        base64: buf.toString("base64"),
        preferPro,
      });
      outB64 = r.pngBase64;
      usedModel = r.usedModel;
    }

let out = Buffer.from(outB64, "base64");
out = await postprocessPng(out, { maxBytes, transparentBg });

return new NextResponse(out, {
  status: 200,
  headers: {
    "Content-Type": "image/png",
    "Cache-Control": "no-store",
    "X-Used-Model": usedModel || "",
    "X-Output-Bytes": String(out.length),
  },
});

    // const out = Buffer.from(outB64, "base64");
    // return new NextResponse(out, {
    //   headers: { "Content-Type": "image/png", "Cache-Control": "no-store", "X-Used-Model": usedModel },
    // });
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
