import { NextResponse } from "next/server";
import {
  PROMPT_IMAGE2_VACUUM,
  PROMPT_IMAGE2_GEMBOLAN,
  PROMPT_IMAGE2_MIKA,
  PROMPT_IMAGE2_MESH,
  PROMPT_IMAGE2_ICEPACK_ADDON,
} from "@/lib/prompts";
import { geminiImageEdit } from "@/lib/gemini";
import { openaiImageEdit } from "@/lib/openai";
import { postprocessPng } from "@/lib/postprocess";

export const runtime = "nodejs";

type PackagingType = "vacuum" | "gembolan" | "mika" | "mesh";

function pickPrompt(packagingType: PackagingType, addIcePack: boolean) {
  const base =
    packagingType === "gembolan"
      ? PROMPT_IMAGE2_GEMBOLAN
      : packagingType === "mika"
      ? PROMPT_IMAGE2_MIKA
      : packagingType === "mesh"
      ? PROMPT_IMAGE2_MESH
      : PROMPT_IMAGE2_VACUUM;

  if (addIcePack && packagingType === "vacuum") {
    return `${base}\n\n${PROMPT_IMAGE2_ICEPACK_ADDON}`;
  }
  return base;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const preferPro = String(form.get("preferPro") || "false") === "true";
    const transparentBg = String(form.get("transparentBg") || "false") === "true";
    const maxKb = Number(form.get("maxKb") || 0);
    const maxBytes = maxKb > 0 ? Math.floor(maxKb * 1024) : undefined;

    const provider = String(form.get("provider") || "gemini"); // "gemini" | "openai"

    const packagingType = String(form.get("packagingType") || "vacuum") as PackagingType;
    const addIcePack = String(form.get("addIcePack") || "false") === "true";

    const prompt = pickPrompt(packagingType, addIcePack);

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

    let out: Buffer<ArrayBufferLike> = Buffer.from(outB64, "base64");
    out = await postprocessPng(out, { maxBytes, transparentBg });

    // Buffer -> Uint8Array for NextResponse typing
    const body = new Uint8Array(out);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
        "X-Used-Model": usedModel || "",
        "X-Output-Bytes": String(out.length),
        "X-Packaging-Type": packagingType,
        "X-Ice-Pack": String(addIcePack),
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
