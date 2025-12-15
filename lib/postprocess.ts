import sharp from "sharp";

type PostOpts = {
  maxBytes?: number;          // e.g. 250 * 1024
  transparentBg?: boolean;    // true => turn near-white into alpha
};

async function makeWhiteTransparent(inputPng: Buffer) {
  // Works best when background is pure white (#FFFFFF) as in your prompts.
  // Uses a “near-white” threshold so slight off-whites become transparent too.
  const img = sharp(inputPng).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

  const out = Buffer.from(data); // RGBA
  const TH = 248; // threshold for near-white
  const SOFT = 6; // softness / tolerance

  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];

    // near-white detection
    const nearWhite = r >= TH && g >= TH && b >= TH;

    if (nearWhite) {
      out[i + 3] = 0; // alpha = 0
    } else {
      // optional: soften edges that are almost-white
      const avg = (r + g + b) / 3;
      if (avg >= TH - SOFT) {
        const a = Math.max(0, Math.min(255, ((TH - avg) / SOFT) * 255));
        out[i + 3] = Math.min(out[i + 3], Math.round(a));
      }
    }
  }

  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
}

export async function postprocessPng(inputPng: Buffer, opts: PostOpts) {
  let buf = inputPng;

  if (opts.transparentBg) {
    buf = await makeWhiteTransparent(buf);
  }

  // Compress to <= maxBytes by resizing down gradually + PNG palette compression.
  if (opts.maxBytes && buf.length > opts.maxBytes) {
    const meta = await sharp(buf).metadata();
    let w = meta.width || 1024;

    // Start from current size (or 1024) and shrink until it fits or we hit min width
    w = Math.min(w, 1400);
    const minW = 256;

    while (w >= minW) {
      const candidate = await sharp(buf)
        .resize({ width: w, withoutEnlargement: true })
        .png({ compressionLevel: 9, palette: true, quality: 70 })
        .toBuffer();

      if (candidate.length <= opts.maxBytes) {
        buf = candidate;
        break;
      }

      w = Math.floor(w * 0.85);
      buf = candidate; // keep the smallest so far
    }
  }

  return buf;
}
