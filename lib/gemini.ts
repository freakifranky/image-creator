import { GoogleGenAI } from "@google/genai";

export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  
  // 2026 Client architecture (replaces New GoogleGenerativeAI)
  return new GoogleGenAI({ apiKey });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isOverloaded(e: any) {
  const status = Number(e?.status || e?.code || 0);
  const msg = String(e?.message || "").toLowerCase();
  // 429 is the Rate Limit for the 500 RPD / 10 RPM free limit
  return status === 429 || status === 503 || msg.includes("overloaded") || msg.includes("unavailable");
}

async function generateWithRetry(ai: GoogleGenAI, args: any) {
  const maxAttempts = 5;
  const baseDelay = 2000; // Increased to 2s to safely stay under the 10 RPM free limit
  let lastErr: any = null;

  for (let i = 1; i <= maxAttempts; i++) {
    try {
      // New SDK uses 'models.generateContent' directly on the client
      return await ai.models.generateContent(args);
    } catch (e: any) {
      lastErr = e;
      if (!isOverloaded(e) || i === maxAttempts) break;
      // Exponential backoff: 2s, 4s, 8s...
      await sleep(baseDelay * Math.pow(2, i - 1) + Math.floor(Math.random() * 500));
    }
  }
  throw lastErr;
}

export async function geminiImageEdit(params: {
  prompt: string;
  mimeType: string;
  base64: string;
}) {
  const ai = getGeminiClient();

  /**
   * FREE TIER MODELS (2026):
   * 1. 'gemini-2.5-flash-image' - Most stable for free image generation.
   * 2. 'gemini-3.1-flash-image-preview' - Newer, may have higher instability but higher quality.
   */
  const modelId = "gemini-2.5-flash-image";

  try {
    const resp = await generateWithRetry(ai, {
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
        // Essential: Tells the model to output a modified IMAGE
        responseModalities: ["IMAGE"],
      },
    });

    const candidate = resp?.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find((p: any) => p?.inlineData?.data);

    if (!imagePart?.inlineData?.data) {
      const textExplanation = candidate?.content?.parts?.find((p: any) => p?.text)?.text;
      throw new Error(textExplanation || "Free Tier: Generation refused (likely safety filter or quota).");
    }

    return {
      usedModel: modelId,
      pngBase64: imagePart.inlineData.data as string,
    };
  } catch (e: any) {
    console.error("Gemini Error:", e);
    throw e;
  }
}
