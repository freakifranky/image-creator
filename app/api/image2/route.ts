import { NextResponse } from "next/server";
import {
  PROMPT_IMAGE2_FRESH_VACUUM,
  PROMPT_IMAGE2_FRESH_VACUUM_WITH_ICEPACK,
  PROMPT_IMAGE2_FRESH_GEMBOLAN,
  PROMPT_IMAGE2_FRESH_MIKA,
  PROMPT_IMAGE2_FRESH_MESH,
} from "@/lib/prompts";
import { geminiImageEdit } from "@/lib/gemini";
import { openaiImageEdit } from "@/lib/openai";
import { postprocessPng } from "@/lib/postprocess";

export const runtime = "nodejs";

type PackagingType = "vacuum" | "gembolan" | "mika" | "mesh";

function normalizePackaging(v: string): PackagingType {
  if (v === "gembolan" || v === "mika" || v === "mesh") return v;
  return "vacuum";
}

function pickPrompt(packaging: PackagingType, ice: boolean) {
  if (packaging === "vacuum") {
    return ice
      ? PROMPT_IMAGE2_FRESH_VACUUM_WITH_ICEPACK
      : PROMPT_IMAGE2_FRESH_VACUUM;
  }
  if (packaging === "gembolan") return PROMPT_IMAGE2_FRESH_GEMBOLAN;
  if (packaging === "mika") return PROMPT_IMAGE2_FRESH_MIKA;
  return PROMPT_IMAGE2_FRESH_MESH;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const provider = String(form.get("provider") || "gemini");
    const preferPro = form.get("preferPro") === "true";
    const transparentBg = form.get("transparentBg") === "true";

    const maxKb = Number(form.get("maxKb") || 0);
    const maxBytes = maxKb > 0 ? maxKb * 1024 : undefined;

    const packaging = normalizePackaging(String(form.get("packagingType")));
    const addIcePack =
      packaging === "vacuum" && form.get("addIcePack") === "true";

    const prompt = pickPrompt(packaging, addIcePack);

    const file = form.get("file");
    if (!(file instanceof File)) {
      return new NextResponse("Missing file", { status: 400 });
    }

    const inputAB = await file.arrayBuffer();
    const inputBuf = Buffer.from(inputAB);

    let base64 = "";
    let usedModel = "";

    if (provider === "openai") {
      const f = new File([inputAB], "input.png", { type: file.type });
      const r = await openaiImageEdit({ prompt, file: f });
      base64 = r.pngBase64;
      usedModel = "gpt-image-1";
    } else {
      const r = await geminiImageEdit({
        prompt,
        base64: inputBuf.toString("base64"),
        mimeType: file.type,
        preferPro,
      });
      base64 = r.pngBase64;
      usedModel = r.usedModel;
    }

    // ✅ DO NOT reassign buffers
    const original = Buffer.from(base64, "base64");
    const processed = await postprocessPng(original, {
      maxBytes,
      transparentBg,
    });

    return new NextResponse(new Uint8Array(processed), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
        "X-Used-Model": usedModel,
        "X-Packaging-Type": packaging,
        "X-Ice-Pack": String(addIcePack),
      },
    });
  } catch (e: any) {
    return new NextResponse(String(e?.message || "Server error"), {
      status: 500,
    });
  }
}
