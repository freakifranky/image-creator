// Recommendation: Migration to '@google/genai' for the newest features
import { GoogleGenAI } from "@google/genai"; 

export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  
  // New syntax: Client accepts an options object
  return new GoogleGenAI({ apiKey });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isOverloaded(e: any) {
  const status = Number(e?.status || e?.code || 0);
  const msg = String(e?.message || "").toLowerCase();
  // 429 is the "Rate Limit" code you'll hit most on the Free Tier
  return status === 429 || status === 503 || msg.includes("overloaded") || msg.includes("unavailable");
}

async function generateWithRetry(ai: GoogleGenAI, args: any) {
  const maxAttempts = 5; // Slightly more attempts for free tier instability
  const baseDelay = 1500; // 1.5s base delay to respect the 15 RPM limit
  let lastErr: any = null;

  for (let i = 1; i <= maxAttempts; i++) {
    try {
      // New SDK uses 'models.generateContent' directly
      return await ai.models.generateContent(args);
    } catch (e: any) {
      lastErr = e;
      if (!isOverloaded(e) || i === maxAttempts) break;
      // Exponential backoff: 1.5s, 3s, 6s...
      await sleep(baseDelay * Math.pow(2, i - 1) + Math.floor(Math.random() * 500));
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

  /**
   * FREE MODELS (Stable for 2026):
   * 'gemini-1.5-flash' is the primary free model.
   * 'gemini-1.5-flash-8b' is the lightweight backup.
   */
  const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-flash-8b"];

  let resp: any;
  let usedModel = "";

  for (const modelId of modelsToTry) {
    try {
      resp = await generateWithRetry(ai, {
        model: modelId,
        contents: [
          {
            role: "user",
            parts: [
              { text: params.prompt },
              { inlineData: { mimeType: params.mimeType, data: params.base64 } },
            ],
          },
        ],
        config: {
          // Instructs the model to output an image instead of text
          responseModalities: ["IMAGE"],
        },
      });
      usedModel = modelId;
      break;
    } catch (e: any) {
      if (modelId === modelsToTry[modelsToTry.length - 1]) throw e;
      console.warn(`Model ${modelId} failed/throttled, trying next...`);
    }
  }

  // New SDK structure: images are returned in 'generatedImage' or 'inlineData'
  const candidate = resp?.candidates?.[0];
  const imagePart = candidate?.content?.parts?.find((p: any) => p?.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    const textExplanation = candidate?.content?.parts?.find((p: any) => p?.text)?.text;
    throw new Error(textExplanation || "Free tier: Image generation refused or limit reached.");
  }

  return {
    usedModel,
    pngBase64: imagePart.inlineData.data as string,
  };
}
