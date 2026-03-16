import { GoogleGenAI } from "@google/genai";

/**
 * FIXED: 2026 SDK Client Initialization
 * Uses the modern unified client architecture.
 */
export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  return new GoogleGenAI({ apiKey });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isOverloaded(e: any) {
  const status = Number(e?.status || e?.code || 0);
  const msg = String(e?.message || "").toLowerCase();
  // 429 is the 'Resource Exhausted' code for the 500/day free limit.
  return status === 429 || status === 503 || msg.includes("overloaded");
}

async function generateWithRetry(ai: GoogleGenAI, args: any) {
  const maxAttempts = 5;
  const baseDelay = 2000; // 2s delay keeps you under the 15 Requests Per Minute free limit.
  let lastErr: any = null;

  for (let i = 1; i <= maxAttempts; i++) {
    try {
      // NEW: In v1.x, call generateContent directly on the client.models service.
      return await ai.models.generateContent(args);
    } catch (e: any) {
      lastErr = e;
      if (!isOverloaded(e) || i === maxAttempts) break;
      await sleep(baseDelay * Math.pow(2, i - 1) + Math.floor(Math.random() * 500));
    }
  }
  throw lastErr;
}

export async function geminiImageEdit(params: {
  prompt: string;
  mimeType: string;
  base64: string;
  preferPro?: boolean;//
}) {
  const ai = getGeminiClient();

  /**
   * THE "FREE CHAMPION" MODEL:
   * 'gemini-2.5-flash-image' (Nano Banana)
   * This is the only model with 500 free requests per day in 2026.
   */
  const modelId = "gemini-2.5-flash-image";

  try {
    const resp = await generateWithRetry(ai, {
      model: modelId,
      contents: [
        {
          role: "user",
          parts: [
            // PRO TIP: Put the image data BEFORE the text for better 2.5 editing.
            { inlineData: { mimeType: params.mimeType, data: params.base64 } },
            { text: params.prompt },
          ],
        },
      ],
      config: {
        // MANDATORY: Triggers the image generation engine instead of text output.
        responseModalities: ["IMAGE"],
      },
    });

    const candidate = resp?.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find((p: any) => p?.inlineData?.data);

    if (!imagePart?.inlineData?.data) {
      const refusalText = candidate?.content?.parts?.find((p: any) => p?.text)?.text;
      throw new Error(refusalText || "Free Tier: Limit reached or image refused by safety filters.");
    }

    return {
      usedModel: modelId,
      pngBase64: imagePart.inlineData.data as string,
    };
  } catch (e: any) {
    console.error("Gemini Edit Error:", e);
    throw e;
  }
}
