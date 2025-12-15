import { GoogleGenAI } from "@google/genai";

export function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
  return new GoogleGenAI({});
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isOverloaded(e: any) {
  const msg = String(e?.message || "");
  const status = Number(e?.status || e?.code || 0);
  return status === 503 || msg.includes("UNAVAILABLE") || msg.toLowerCase().includes("overloaded");
}

async function generateWithRetry(ai: GoogleGenAI, args: any) {
  const maxAttempts = 4;
  const baseDelay = 600;
  let lastErr: any = null;

  for (let i = 1; i <= maxAttempts; i++) {
    try {
      return await ai.models.generateContent(args);
    } catch (e: any) {
      lastErr = e;
      if (!isOverloaded(e) || i === maxAttempts) break;
      await sleep(baseDelay * Math.pow(2, i - 1) + Math.floor(Math.random() * 250));
    }
  }
  throw lastErr;
}

export async function geminiImageEdit(params: {
  prompt: string;
  mimeType: string;
  base64: string;
  preferPro?: boolean;
}) {
  const ai = getGeminiClient();

  const modelsToTry = params.preferPro
    ? ["gemini-3-pro-image-preview", "gemini-2.5-flash-image"]
    : ["gemini-2.5-flash-image", "gemini-3-pro-image-preview"];

  let resp: any;
  let usedModel = "";

  for (const model of modelsToTry) {
    try {
      resp = await generateWithRetry(ai, {
        model,
        contents: [
          {
            role: "user",
            parts: [
              { text: params.prompt },
              { inlineData: { mimeType: params.mimeType, data: params.base64 } },
            ],
          },
        ],
        // IMPORTANT: keep config minimal for image-to-image to avoid INVALID_ARGUMENT
        config: {
          responseModalities: ["Image"],
          imageConfig: { aspectRatio: "1:1" },
        },
      });
      usedModel = model;
      break;
    } catch (e: any) {
      if (model === modelsToTry[modelsToTry.length - 1]) throw e;
    }
  }

  const parts = resp?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p: any) => p?.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    const textPart = parts.find((p: any) => p?.text)?.text;
    throw new Error(textPart || "No image returned from Gemini");
  }

  return {
    usedModel,
    pngBase64: imagePart.inlineData.data as string,
  };
}
