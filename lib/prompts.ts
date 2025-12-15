export const PROMPT_IMAGE1_FRESH = `Fresh
"Use the provided image as the source.

Keep the product itself completely unchanged - do not alter the meat's shape, cut, color, brand, or label.

Disregard or replace all other elements including the original plate, board, stickers, text, and background.

Strictly reconstruct the scene as to follows:
- Place the fresh items neatly on a round light-wooden plate with a simple rim.
- Center the wooden plate within a 1:1 square canvas.
- Change and apply the camera angle to a standard e-commerce fresh items product shot: 30° isometrical perspective, where the plate appears as an almost full circle with slight perspectives.
- Ensure the plate is fully visible with a small margin, not cropped.
- Scale the product so it covers approximately 80% of the plate's area, to maintain consistent sizing across SKUs.
Background and lighting:
- Replace the background with a pure white (#FFFFFF), completely flat - no gradients or textures.
- Apply soft, even studio lighting, with a subtle, natural shadow beneath the wooden plate.
- Maintain a natural food photography aesthetic: slight imperfections, realistic textures, soft film grain, matte highlights, and no plastic-like shine
Image Resolution
- 16k resolution ultra high-definition
- Super clear and super crisp and sharp
- hyper realistic textures to the fresh items, such as chicken, meats, fish, salmon"`;

export const PROMPT_IMAGE1_NONFRESH = `Non-Fresh
"Use the provided image as the source. Keep the product itself completely unchanged - do not alter the meat's shape, cut, color, brand, or label. Disregard or replace all other elements including the original plate, board, stickers, text, and background.

Reconstruct the scene as to follows:
- Place the product neatly center of the canvas
- Center the product image within a 1:1 square canvas
- Match the camera angle to a standard e-commerce product shot photography: 30° top-front angle, where the product appears as an almost full circle with slight perspectives
- Ensure the product is fully visible with a small margin, not cropped.
- Scale the product so it covers approximately 80% of canvas, to maintain consistent sizing across SKUs.
- detects any watermarks and remove from the product image

Background and lighting:
- Replace the background with a pure white (#FFFFFF), completely flat - no gradients or textures.
- Apply soft, even studio lighting, no shadow around the product
- Maintain a natural product photography aesthetic: slight imperfections, realistic textures, soft film grain, matte highlights

Image Resolution
- 16k resolution ultra high-definition
- Super clear and super crisp and sharp
- hyper realistic textures"`;

// Prompt 2 EXACTLY as you gave (kept verbatim)
export const PROMPT_IMAGE2 = `"Use this image as reference
and generate image 

Put this fresh raw items into a vacuum-sealed transparent plastic bag, tightly packed together with visible skin texture, fat. The plastic wrap has light wrinkles, folds, and soft reflections, clearly showing the shape of each item inside. No labels, no branding, just the plain product in its frozen/packed state. The mood is clean, clinical, and suitable for e-commerce grocery or fresh food catalog photography, with accurate color, natural imperfections, and realistic texture on both the item and plastic.

Shot from a straight 90° top-down flat-lay angle, using a standard 50–70mm equivalent lens to avoid distortion and keep the proportions of the bag and item natural and true to life.

A seamless, pure white studio background (#FFFFFF), evenly lit, with either no visible shadows or only a very soft, faint shadow directly under the bag to keep the focus entirely on the product and create a high-key, hygienic look.

High-key studio product pack-shot, commercial food photography style. Soft, diffused lighting from above and slightly from one side to create gentle highlights on the plastic without harsh glare. No props, no text, no additional elements. Emphasize clarity of the meat through the transparent packaging, subtle condensation or chill effect, and overall freshness, suitable for online grocery thumbnails.

Ultra high-definition 1:1 square canvas, 8000 × 8000 px or higher (8K), super sharp focus across the entire bag and its contents, with fine detail visible in skin pores, plastic wrinkles, and subtle surface grain. Maintain the items coverate 80% of the canvas.

Add and put an icepack as an additional whats in the box item:
Around 10% of proportion of the canvas, put on the bottom right of the canvas, of this ice packs, square rounded around 16px with blue outlines, white background, The ice pack is a single Thermafreeze ice pack standing vertically in the center of a 1:1 square canvas. The ice pack is a slim, elongated white pouch filled with frozen gel, with slightly curved sides and sealed top and bottom seams. On the surface, keep the blue printed branding fully readable: circular “SAFETY HEALTH-TESTED” icon at the top and bottom, and the bold word “THERMAFREEZE” with smaller lines of text such as “Best Alternative Ice Replacement” and “Do Not Eat / Tidak boleh dimakan"."`;
