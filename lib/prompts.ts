// =====================================
// PROMPT 1 — CANONICAL SKU IMAGE
// =====================================

// ---------------------
// Prompt 1 — Fresh SKU
// ---------------------
export const PROMPT_IMAGE1_FRESH = `
Use the provided image as the source.

Keep the product itself completely unchanged.
Do NOT alter the item’s shape, cut, color, texture, quantity, or any natural details.

Disregard or replace all other elements including:
- original plate, tray, bowl, board
- stickers, labels, text, watermarks
- background and props

Strictly reconstruct the scene as follows:
- Place the fresh item neatly on a round light-wooden plate with a simple rim.
- Center the plate within a 1:1 square canvas.
- Use a standard e-commerce fresh food angle: approximately 30° isometric view.
- The plate should appear almost circular with slight perspective.
- Ensure the plate is fully visible and not cropped.
- Scale the item so it covers approximately 80% of the plate area for consistent SKU sizing.

Background and lighting:
- Pure white background (#FFFFFF), completely flat.
- Soft, even studio lighting.
- A subtle, natural shadow directly beneath the wooden plate only.
- Natural food photography look: realistic textures, slight imperfections,
  soft film grain, matte highlights.
- No plastic-like shine.

Output:
- Photorealistic commercial grocery image.
- 1:1 square aspect ratio.
- Sharp focus, high clarity.
`.trim();


// -------------------------
// Prompt 1 — Non-Fresh SKU
// -------------------------
export const PROMPT_IMAGE1_NONFRESH = `
A photorealistic commercial product shot of the item shown in the reference image.

Reproduce the product EXACTLY as shown:
- Keep the original packaging shape, structure, colors, logos, and text.
- Do not remove, blur, or alter any branding or printed information.

Camera and composition:
- View the product from a 3/4 front-side angle to show depth and volume.
- Center the product within a 1:1 square canvas.
- Ensure the product is fully visible and not cropped.
- Scale the product to fill approximately 80% of the canvas.

Background and lighting:
- Pure white background (#FFFFFF).
- Clean studio lighting with soft reflections appropriate to the material
  (plastic, glass, carton, metal, etc.).
- No shadows or only a very soft grounding shadow.

Quality:
- Commercial e-commerce product photography.
- High fidelity, sharp focus, realistic materials.
- 4K-equivalent clarity or higher.

Do NOT add props, text, watermarks, stickers, or extra elements.
`.trim();



// =====================================
// PROMPT 2 — PACKAGING VARIANTS
// =====================================

// -----------------------------
// Prompt 2 — Global Rules
// -----------------------------
export const PROMPT_IMAGE2_GLOBAL = `
Use the provided image as the source of truth for the product.

Keep the product itself completely unchanged:
- Do not alter shape, cut, color, texture, quantity, or natural surface details.
- Do not change branding or printed text if present.

Only modify packaging, background, and lighting.

Composition:
- 1:1 square canvas.
- Product + packaging centered.
- Product occupies approximately 80% of the canvas.
- Camera angle: straight 90° top-down flat-lay.
- Lens equivalent: 50–70mm (no distortion).

Background and lighting:
- Pure white background (#FFFFFF).
- High-key studio lighting.
- Very soft, faint shadow directly under the packaging only.

No props, no extra items, no stickers, no watermarks,
except an optional ice pack when explicitly requested.
`.trim();



// -------------------------------------
// Prompt 2 — Fresh (Vacuum Sealed)
// -------------------------------------
export const PROMPT_IMAGE2_FRESH_VACUUM = `
${PROMPT_IMAGE2_GLOBAL}

Packaging:
- Place the fresh raw items into a vacuum-sealed transparent plastic bag.
- Items are tightly packed so the plastic conforms to their contours.
- Visible skin texture, fat, and natural surface details must remain accurate.
- Plastic shows realistic sealed edges, light wrinkles, folds, and soft reflections.
- No labels, no branding, no stickers.

Style:
- Clean, clinical, hygienic look suitable for e-commerce grocery catalogs.
- Subtle condensation or chill effect is allowed but must remain natural.

Output:
- High-detail photorealistic grocery pack-shot.
- Ultra-sharp focus and realistic textures.
`.trim();



// ------------------------------------------------
// Prompt 2 — Fresh (Vacuum Sealed + Ice Pack)
// ------------------------------------------------
export const PROMPT_IMAGE2_FRESH_VACUUM_WITH_ICEPACK = `
${PROMPT_IMAGE2_FRESH_VACUUM}

Add-on:
- Add ONE slim white gel ice pack as an additional “what’s in the box” item.
- Position it at the bottom-right corner of the canvas.
- Ice pack occupies approximately 10% of the canvas width.
- Ice pack should be fully visible, clean, and neatly placed.
- Photographed with the same lighting and perspective.
`.trim();



// -------------------------------------
// Prompt 2 — Fresh (Gembolan Plastic)
// -------------------------------------
export const PROMPT_IMAGE2_FRESH_GEMBOLAN = `
${PROMPT_IMAGE2_GLOBAL}

Packaging:
- Place the fresh item inside a thin transparent plastic bag.
- Bag loosely hugs the item with a natural, irregular shape.
- Tie the bag at the top using a simple knot.
- Visible wrinkles, folds, small air pockets.
- Mild condensation or droplets inside the bag are allowed.
- No labels, no branding.

Style:
- Natural market-style fresh packaging.
- Clean but informal, realistic everyday grocery look.
`.trim();



// -------------------------------------
// Prompt 2 — Fresh (Mika Container)
// -------------------------------------
export const PROMPT_IMAGE2_FRESH_MIKA = `
${PROMPT_IMAGE2_GLOBAL}

Packaging:
- Place the fresh item inside a clear rigid PET clamshell (mika) container.
- Container is closed with a hinged lid.
- Square shape with softly rounded corners and raised rim.
- Subtle snap-lock detail visible.
- Lid has gentle reflections and minor micro-scuffs.
- No labels, no stickers, no branding.

Style:
- Clean supermarket fresh-produce punnet look.
- Appetizing, orderly, and ready-to-sell.
`.trim();



// -------------------------------------
// Prompt 2 — Fresh (Mesh Bag)
// -------------------------------------
export const PROMPT_IMAGE2_FRESH_MESH = `
${PROMPT_IMAGE2_GLOBAL}

Packaging:
- Place the fresh item inside a thin neon-green plastic mesh bag.
- Mesh has a diamond net pattern.
- Mesh wraps naturally around the item contours.
- A simple knotted handle at the top.
- Mesh should hang and sag naturally based on the item weight.
- No labels, no branding.

Style:
- Common grocery produce mesh packaging.
- Clean, realistic, and photorealistic.
`.trim();



// -------------------------------------
// Prompt 2 — Non-Fresh SKU
// -------------------------------------
export const PROMPT_IMAGE2_NONFRESH = `
Use the provided image as the reference.

Keep the product completely unchanged.
Reproduce the original packaging, branding, colors, logos, and text exactly.

Camera and composition:
- 3/4 front-side angle to show depth and volume.
- Centered within a 1:1 square canvas.
- Product fills approximately 80% of the frame.

Background and lighting:
- Pure white background (#FFFFFF).
- Clean studio lighting with soft reflections appropriate to the material.

Quality:
- Commercial e-commerce product photography.
- High fidelity, sharp focus, realistic materials.

Do NOT add packaging variants, ice packs, props, or extra elements.
`.trim();
