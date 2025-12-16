import sharp from "sharp";

export type PostOpts = {
  maxBytes?: number;          // e.g. 250 * 1024
  transparentBg?: boolean;    // true => turn near-white into alpha
};

async function makeWhiteTransparent(input: Uint8Array) {
  const img = sharp(input).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

  const out = Buffer.from(data); // RGBA
  const TH = 248; // near-white threshold
  const SOFT = 10; // softer edge handling

  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];

    const avg = (r + g + b) / 3;

    // Hard remove near-white
    if (r >= TH && g >= TH && b >= TH) {
      out[i + 3] = 0;
      continue;
    }

    // Soft fade for almost-white pixels (helps jagged edges)
    if (avg >= TH - SOFT) {
      const t = (avg - (TH - SOFT)) / SOFT; // 0..1
      const newA = Math.round((1 - t) * 255); // 255..0
      out[i + 3] = Math.min(out[i + 3], newA);
    }
  }

  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
}

async function compressToTarget(input: Uint8Array, maxBytes: number) {
  let buf = Buffer.from(input);

  // 1) Try palette compression first (often enough)
  buf = await sharp(buf).png({ compressionLevel: 9, palette: true }).toBuffer();
  if (buf.length <= maxBytes) return buf;

  // 2) Then progressively resize down
  const meta = await sharp(buf).metadata();
  let w = meta.width ?? 1024;
  const minW = 256;

  while (w > minW) {
    w = Math.floor(w * 0.88);

    const candidate = await sharp(buf)
      .resize({ width: w, withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();

    buf = candidate;
    if (buf.length <= maxBytes) break;
  }

  return buf;
}

export async function postprocessPng(inputPng: Uint8Array, opts: PostOpts) {
  let buf = Buffer.from(inputPng);

  if (opts.transparentBg) {
    buf = await makeWhiteTransparent(buf);
  }

  if (opts.maxBytes && buf.length > opts.maxBytes) {
    buf = await compressToTarget(buf, opts.maxBytes);
  }

  return buf; // Buffer is fine to return because it's a Uint8Array too
}
