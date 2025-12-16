import sharp from "sharp";

export type PostOpts = {
  maxBytes?: number;          // e.g. 250 * 1024
  transparentBg?: boolean;    // true => turn near-white into alpha
};

// IMPORTANT: Explicit generic avoids TS mismatch on Vercel builds
type NodeBuf = Buffer<ArrayBufferLike>;

async function ensurePng(input: NodeBuf): Promise<NodeBuf> {
  // Normalize into PNG to keep pipeline consistent
  return (await sharp(input).png().toBuffer()) as NodeBuf;
}

async function makeWhiteTransparent(inputPng: NodeBuf): Promise<NodeBuf> {
  // Best when background is pure/near white.
  // We use a near-white threshold + softness band to preserve edges.
  const img = sharp(inputPng).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

  const out = Buffer.from(data) as NodeBuf; // RGBA

  // Tweakable knobs
  const TH = 250;     // "white" threshold (higher = less removed)
  const SOFT = 10;    // softness band around threshold
  const MIN_ALPHA_KEEP = 20; // prevent completely nuking thin edges

  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const a = out[i + 3];

    // If pixel is already transparent-ish, keep it
    if (a < MIN_ALPHA_KEEP) continue;

    const avg = (r + g + b) / 3;

    // Hard remove only when REALLY white
    if (r >= TH && g >= TH && b >= TH) {
      out[i + 3] = 0;
      continue;
    }

    // Soft transition for near-white pixels (helps halo reduction)
    if (avg >= TH - SOFT) {
      // avg close to TH => alpha closer to 0
      const t = (TH - avg) / SOFT; // 0..1
      const newA = Math.round(Math.max(0, Math.min(255, t * 255)));
      out[i + 3] = Math.min(a, newA);
    }
  }

  const rebuilt = await sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({
      compressionLevel: 9,
      // palette=true helps a lot for size; alpha is supported.
      palette: true,
      quality: 60,
      effort: 10,
    })
    .toBuffer();

  return rebuilt as NodeBuf;
}

async function quantizePng(inputPng: NodeBuf): Promise<NodeBuf> {
  // Strong default compression for size
  const out = await sharp(inputPng)
    .png({
      compressionLevel: 9,
      palette: true,
      quality: 60,
      effort: 10,
    })
    .toBuffer();

  return out as NodeBuf;
}

export async function postprocessPng(inputPng: NodeBuf, opts: PostOpts = {}): Promise<NodeBuf> {
  let buf = await ensurePng(inputPng);

  // 1) Optional background removal (before compression)
  if (opts.transparentBg) {
    buf = await makeWhiteTransparent(buf);
  }

  // 2) First pass compression (palette/quantization)
  buf = await quantizePng(buf);

  // 3) If still too large, downscale progressively
  if (opts.maxBytes && buf.length > opts.maxBytes) {
    const meta = await sharp(buf).metadata();
    let w = meta.width || 1024;

    // Limit start width to avoid excessive loops
    w = Math.min(w, 1600);
    const minW = 256;

    while (w >= minW) {
      const candidate = await sharp(buf)
        .resize({ width: w, withoutEnlargement: true })
        .png({
          compressionLevel: 9,
          palette: true,
          quality: 55,
          effort: 10,
        })
        .toBuffer();

      const cand = candidate as NodeBuf;

      if (cand.length <= opts.maxBytes) {
        buf = cand;
        break;
      }

      // keep smallest-so-far and shrink again
      buf = cand;
      w = Math.floor(w * 0.85);
    }
  }

  return buf;
}
