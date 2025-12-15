import OpenAI from "openai";

export function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function openaiImageEdit(params: { prompt: string; file: File }) {
  const openai = getOpenAI();

  try {
    const result = await openai.images.edit({
      model: "gpt-image-1",
      image: params.file,
      prompt: params.prompt,
      size: "1024x1024",
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image returned from OpenAI");
    return { pngBase64: b64 };
  } catch (e: any) {
    // Common case you already hit
    const msg = String(e?.message || "");
    if (msg.includes("must be verified") || e?.status === 403) {
      throw new Error("OPENAI_ORG_NOT_VERIFIED_FOR_GPT_IMAGE_1");
    }
    throw e;
  }
}
