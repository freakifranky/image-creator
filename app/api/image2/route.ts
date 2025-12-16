import { NextResponse } from "next/server";
import { PROMPT_IMAGE2 } from "@/lib/prompts";
import { geminiImageEdit } from "@/lib/gemini";
import { openaiImageEdit } from "@/lib/openai";
import { postprocessPng } from "@/lib/postprocess";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const preferPro = String(form.get("preferPro") || "false") === "true";
    const transparentBg = String(form.get("transparentBg") || "false") === "true";
    const maxKb = Number(form.get("maxKb") || 0);
    const maxBytes = maxKb > 0 ? Math.floor(maxKb * 1024) : undefined;

    const provider = String(form.get("provider") || "gemini"); // "gemini" | "openai"

    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return new NextResponse("Missing file", { status: 400 });
    }

    const mimeType = file.type || "image/png";
    const inputAb = await file.arrayBuffer();
    const inputBuf: Buffer<ArrayBufferLike> = Buffer.from(inputAb);

    let outB64 = "";
    let usedModel = "";

    if (provider === "openai") {
      // ✅ Build File from ArrayBuffer (NOT Node Buffer)
      const f = new File([inputAb], "input.png", { type: mimeType || "image/png" });

      const r = await openaiImageEdit({ prompt: PROMPT_IMAGE2, file: f });
      outB64 = r.pngBase64;
      usedModel = "gpt-image-1";
    } else {
      const r = await geminiImageEdit({
        prompt: PROMPT_IMAGE2,
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

    // ✅ Convert Buffer -> Uint8Array for NextResponse typing
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
