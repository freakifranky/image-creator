import sharp from "sharp";

export type PostOpts = {
  maxBytes?: number;          // e.g. 250 * 1024
  transparentBg?: boolean;    // true => turn near-white into alpha
};

async function ensurePng(input: Buffer): Promise<Buffer> {
  return await sharp(input).png().toBuffer();
}

async function makeWhiteTransparent(inputPng: Buffer): Promise<Buffer> {
  const img = sharp(inputPng).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

  const out = Buffer.from(data); // RGBA

  const TH = 250;
  const SOFT = 10;
  const MIN_ALPHA_KEEP = 20;

  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const a = out[i + 3];

    if (a < MIN_ALPHA_KEEP) continue;

    const avg = (r + g + b) / 3;

    // hard remove only if truly white-ish
    if (r >= TH && g >= TH && b >= TH) {
      out[i + 3] = 0;
      continue;
    }

    // soft fade for near-white halo pixels
    if (avg >= TH - SOFT) {
      const t = (TH - avg) / SOFT; // 0..1
      const newA = Math.round(Math.max(0, Math.min(255, t * 255)));
      out[i + 3] = Math.min(a, newA);
    }
  }

  return await sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9, palette: true, quality: 60, effort: 10 })
    .toBuffer();
}

async function quantizePng(inputPng: Buffer): Promise<Buffer> {
  return await sharp(inputPng)
    .png({ compressionLevel: 9, palette: true, quality: 60, effort: 10 })
    .toBuffer();
}

export async function postprocessPng(inputPng: Buffer, opts: PostOpts = {}): Promise<Buffer> {
  let buf = await ensurePng(inputPng);

  if (opts.transparentBg) {
    buf = await makeWhiteTransparent(buf);
  }

  buf = await quantizePng(buf);

  if (opts.maxBytes && buf.length > opts.maxBytes) {
    const meta = await sharp(buf).metadata();
    let w = meta.width || 1024;

    w = Math.min(w, 1600);
    const minW = 256;

    while (w >= minW) {
      const cand = await sharp(buf)
        .resize({ width: w, withoutEnlargement: true })
        .png({ compressionLevel: 9, palette: true, quality: 55, effort: 10 })
        .toBuffer();

      if (cand.length <= opts.maxBytes) {
        buf = cand;
        break;
      }

      buf = cand;
      w = Math.floor(w * 0.85);
    }
  }

  return buf;
}
