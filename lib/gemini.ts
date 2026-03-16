import { GoogleGenerativeAI } from "@google/generative-ai"; // Standard package name

export function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
  // Ensure you are using the standard constructor
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isOverloaded(e: any) {
  const msg = String(e?.message || "");
  const status = Number(e?.status || e?.code || 0);
  // 429 is the most common code for "Rate Limit Reached" on the Free Tier
  return status === 429 || status === 503 || msg.includes("UNAVAILABLE") || msg.toLowerCase().includes("overloaded");
}

async function generateWithRetry(modelInstance: any, args: any) {
  const maxAttempts = 4;
  const baseDelay = 1000; // Increased base delay for Free Tier limits
  let lastErr: any = null;

  for (let i = 1; i <= maxAttempts; i++) {
    try {
      // Note: In the official SDK, you call generateContent on the model instance
      return await modelInstance.generateContent(args);
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
  preferPro?: boolean;
}) {
  const genAI = getGeminiClient();

  /**
   * FREE TIER MODELS:
   * 1. gemini-1.5-flash: Best balance of speed and multimodal capability.
   * 2. gemini-1.5-flash-8b: Faster, lower limits, good for simple edits.
   */
  const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-flash-8b"];

  let resp: any;
  let usedModel = "";

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      
      resp = await generateWithRetry(model, {
        contents: [
          {
            role: "user",
            parts: [
              { text: params.prompt },
              { inlineData: { mimeType: params.mimeType, data: params.base64 } },
            ],
          },
        ],
        // Generation configuration for multimodal output
        generationConfig: {
          responseModalities: ["image"],
          // On the free tier, complex image configs might trigger errors; 
          // keeping it simple is best.
        },
      });
      
      usedModel = modelName;
      break;
    } catch (e: any) {
      // If we've tried all models, throw the last error
      if (modelName === modelsToTry[modelsToTry.length - 1]) throw e;
      console.warn(`Model ${modelName} failed, trying next...`);
    }
  }

  const response = await resp.response;
  const parts = response.candidates?.[0]?.content?.parts || [];
  
  // Look for the returned image data
  const imagePart = parts.find((p: any) => p?.inlineData?.data);
  
  if (!imagePart?.inlineData?.data) {
    const textPart = parts.find((p: any) => p?.text)?.text;
    throw new Error(textPart || "Gemini did not return an image. It might have refused the prompt or reached a safety filter.");
  }

  return {
    usedModel,
    pngBase64: imagePart.inlineData.data as string,
  };
}
