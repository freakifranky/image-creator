// lib/prompts.ts

// --------------------
// Image 1 — Fresh
// --------------------
export const PROMPT_IMAGE1_FRESH = `
Use the provided image as the source.

Keep the product itself completely unchanged — do not alter the item’s shape, cut, color, brand, or label.
Disregard or replace all other elements including the original plate/board, stickers, text, and background.

Strictly reconstruct the scene:
- Place the item neatly on a round light-wooden plate with a simple rim.
- Center the plate within a 1:1 square canvas.
- Use a standard e-commerce fresh product angle: ~30° isometric perspective where the plate appears as an almost full circle with slight perspective.
- Ensure the plate is fully visible with a small margin and not cropped.
- Scale the item so it covers ~80% of the plate area for consistent sizing across SKUs.

Background and lighting:
- Pure white background (#FFFFFF), completely flat (no gradients, no texture).
- Soft, even studio lighting with a subtle, natural shadow beneath the wooden plate.
- Natural food photography look: realistic texture, slight imperfections, soft film grain, matte highlights, no plastic shine.

Output:
- 1:1 square, high-resolution, sharp, photorealistic.
`.trim();


// --------------------
// Image 1 — Non-Fresh (REPLACE with your new prompt)
// --------------------
export const PROMPT_IMAGE1_NONFRESH = `
A photorealistic commercial product shot of the item shown in the reference image, viewing it from a 3/4 side angle to display depth and volume.

Directly reproduce the packaging design, logos, colors, and text exactly as they appear in the original image.
The object should look 3-dimensional with realistic studio lighting and soft reflections appropriate for its material.

Background: Pure white (#FFFFFF).
Quality: 4k, sharp focus, high fidelity.

Do not add any extra text, props, stickers, or watermarks. Do not remove or alter existing branding.
`.trim();


// --------------------
// Image 2 — Shared global rules
// --------------------
export const PROMPT_IMAGE2_GLOBAL = `
Use the provided image as the source of truth for the product.

Keep the product itself completely unchanged: do not alter shape, cut, color, texture, quantity, or any printed label on the product (if any).
Only change packaging, background, and lighting.

No extra props, no additional items, no text overlays, no watermarks, no stickers, no store labels — except an optional ice pack if explicitly requested.

Composition:
- 1:1 square canvas.
- Product + packaging centered and fills ~80% of the canvas.
- Camera: straight 90° top-down flat-lay, 50–70mm equivalent, no distortion.

Background and lighting:
- Pure white background (#FFFFFF), high-key studio look.
- Soft diffused lighting, minimal faint shadow directly under the packaging only.
`.trim();


// --------------------
// Image 2 — Packaging options
// --------------------
export const PROMPT_IMAGE2_VACUUM = `
${PROMPT_IMAGE2_GLOBAL}

Packaging:
- Place the product inside a vacuum-sealed transparent plastic bag, tightly packed so the plastic conforms to the product contours.
- Plastic should show realistic sealed edges, light wrinkles, folds, and soft reflections.
- The product must remain clearly visible through the plastic with accurate color and natural texture.
- Slight condensation/chill effect is allowed but keep it subtle.

Output:
- Photorealistic e-commerce grocery pack-shot. High detail, sharp focus.
`.trim();


export const PROMPT_IMAGE2_GEMBOLAN = `
${PROMPT_IMAGE2_GLOBAL}

Packaging:
- Place the product into a thin transparent plastic bag that loosely hugs the product.
- Tie the bag at the top with a simple knot.
- Natural wrinkles, folds, small air pockets, and subtle glossy reflections.
- Mild condensation/droplets inside the bag is allowed, keep it realistic and not messy.
- No labels, no branding.

Output:
- Photorealistic e-commerce pack-shot with clean, hygienic look.
`.trim();


export const PROMPT_IMAGE2_MIKA = `
${PROMPT_IMAGE2_GLOBAL}

Packaging:
- Place the product inside a clear rigid PET clamshell container (mika), closed with a hinged lid.
- Square container with softly rounded corners and a raised rim.
- Subtle snap-lock closure detail on the front edge.
- Gentle reflections on the lid; minor micro-scuffs are OK but keep it clean.
- No labels, no stickers, no branding.

Output:
- Photorealistic supermarket punnet pack-shot, clean and appetizing.
`.trim();


export const PROMPT_IMAGE2_MESH = `
${PROMPT_IMAGE2_GLOBAL}

Packaging:
- Place the product inside a thin neon-green plastic mesh bag with a diamond net pattern.
- Mesh should wrap naturally around the product contours and hang slightly.
- A simple knot/handle at the top of the mesh bag.
- No labels, no branding.

Output:
- Photorealistic e-commerce pack-shot, sharp and clean.
`.trim();


// --------------------
// Image 2 — Optional ice pack add-on
// --------------------
export const PROMPT_IMAGE2_ICEPACK_ADDON = `
Add one slim white gel ice pack at the bottom-right corner of the canvas, taking ~10% of canvas width.
It should be fully visible, placed neatly, and photographed in the same lighting.
Keep it simple and clean, no extra props.
`.trim();
