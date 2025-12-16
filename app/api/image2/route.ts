import { NextResponse } from "next/server";
import { PROMPT_IMAGE2 } from "@/lib/prompts";
import { geminiImageEdit } from "@/lib/gemini";
import { openaiImageEdit } from "@/lib/openai";
import { postprocessPng } from "@/lib/postprocess";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const preferPro = form.get("preferPro") === "true";
    const transparentBg = form.get("transparentBg") === "true";
    const maxKb = Number(form.get("maxKb") || 0);
    const maxBytes = maxKb ? Math.floor(maxKb * 1024) : undefined;

    const provider = String(form.get("provider") || "gemini");

    const file = form.get("file");
    if (!(file instanceof File)) {
      return new NextResponse("Missing file", { status: 400 });
    }

    const mimeType = file.type || "image/png";
    const inputAb = await file.arrayBuffer();
    const inputBuf = Buffer.from(inputAb);

    let outB64 = "";
    let usedModel = "";

    if (provider === "openai") {
      const f = new File([inputAb], "input.png", { type: mimeType });
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

    let out: Buffer<ArrayBufferLike> = Buffer.from(outB64, "base64");
    out = await postprocessPng(out, { maxBytes, transparentBg });

    return new NextResponse(out, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
        "X-Used-Model": usedModel,
        "X-Output-Bytes": String(out.length),
      },
    });
  } catch (e: any) {
    return new NextResponse(String(e?.message || "Server error"), { status: 500 });
  }
}
