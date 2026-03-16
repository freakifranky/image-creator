import { GoogleGenAI } from "@google/genai";

export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  
  // 2026 unified client setup
  return new GoogleGenAI({ apiKey });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isOverloaded(e: any) {
  const status = Number(e?.status || e?.code || 0);
  const msg = String(e?.message || "").toLowerCase();
  // 429 is the 'Resource Exhausted' code you'll hit on the Free Tier
  return status === 429 || status === 503 || msg.includes("overloaded");
}

async function generateWithRetry(ai: GoogleGenAI, args: any) {
  const maxAttempts = 5;
  const baseDelay = 2000; // 2s delay to safely respect 15 RPM
  let lastErr: any = null;

  for (let i = 1; i <= maxAttempts; i++) {
    try {
      return await ai.models.generateContent(args);
    } catch (e: any) {
      lastErr = e;
      if (!isOverloaded(e) || i === maxAttempts) break;
      // Exponential backoff
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
   * 'gemini-2.5-flash-image' (Nano Banana)
   * This is the stable successor to the preview models you were using.
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
        // Required for image-to-image output
        responseModalities: ["IMAGE"],
      },
    });

    const candidate = resp?.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find((p: any) => p?.inlineData?.data);

    if (!imagePart?.inlineData?.data) {
      const refusal = candidate?.content?.parts?.find((p: any) => p?.text)?.text;
      throw new Error(refusal || "Model did not return an image. Check prompt safety.");
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
