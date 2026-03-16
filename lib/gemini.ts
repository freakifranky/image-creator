import { GoogleGenAI } from "@google/genai";

export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  
  // 2026 SDK uses a simplified Client constructor
  return new GoogleGenAI({ apiKey });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isOverloaded(e: any) {
  const status = Number(e?.status || e?.code || 0);
  const msg = String(e?.message || "").toLowerCase();
  // 429 is the Rate Limit code for the 500 RPD free limit
  return status === 429 || status === 503 || msg.includes("overloaded") || msg.includes("unavailable");
}

async function generateWithRetry(ai: GoogleGenAI, args: any) {
  const maxAttempts = 5;
  const baseDelay = 2000; // Increased to 2s to safely stay within free tier RPM
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
}) {
  const ai = getGeminiClient();

  /**
   * 2026 FREE TIER MODEL:
   * 'gemini-2.5-flash-image' is the specific model for Image-to-Image.
   * Note: gemini-3-pro and newer 'Pro' versions do NOT have a free API tier.
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
        // IMAGE modality is required for image-to-image output
        responseModalities: ["IMAGE"],
      },
    });

    const candidate = resp?.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find((p: any) => p?.inlineData?.data);

    if (!imagePart?.inlineData?.data) {
      const textRefusal = candidate?.content?.parts?.find((p: any) => p?.text)?.text;
      throw new Error(textRefusal || "Free tier: Image generation refused by safety filters.");
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
