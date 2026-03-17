import { GoogleGenAI } from "@google/genai";

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
  return status === 429 || status === 503 || msg.includes("overloaded");
}

async function generateWithRetry(ai: GoogleGenAI, args: any) {
  const maxAttempts = 5;
  const baseDelay = 4000; // 4s — free tier is 2 IPM, so space out retries
  let lastErr: any = null;

  for (let i = 1; i <= maxAttempts; i++) {
    try {
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
  preferPro?: boolean;
}) {
  const ai = getGeminiClient();

  /**
   * FREE MODEL (no billing required):
   * 'gemini-2.0-flash-exp-image-generation'
   * - Free tier: ~500 requests/day via Google AI Studio key
   * - Supports image-to-image editing (send input image + prompt)
   * - Rate limit: 2 images/min on free tier, so we use 4s base delay above
   *
   * To get your free API key: https://aistudio.google.com/apikey
   * No credit card needed.
   */
  const modelId = "gemini-2.5-flash-image";

  try {
    const resp = await generateWithRetry(ai, {
      model: modelId,
      contents: [
        {
          role: "user",
          parts: [
            // Image BEFORE text for better editing results
            { inlineData: { mimeType: params.mimeType, data: params.base64 } },
            { text: params.prompt },
          ],
        },
      ],
      config: {
        // REQUIRED: triggers image output instead of text-only
        responseModalities: ["IMAGE"],
      },
    });

    const candidate = resp?.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find((p: any) => p?.inlineData?.data);

    if (!imagePart?.inlineData?.data) {
      const refusalText = candidate?.content?.parts?.find((p: any) => p?.text)?.text;
      throw new Error(
        refusalText || "No image returned. Free tier may be at capacity — try again in a minute."
      );
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
