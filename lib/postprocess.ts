import sharp from "sharp";

export type PostOpts = {
  maxBytes?: number;          // e.g. 250 * 1024
  transparentBg?: boolean;    // true => turn near-white into alpha
};

async function makeWhiteTransparent(input: Uint8Array): Promise<Uint8Array> {
  const img = sharp(input).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

  // data is a Buffer (Uint8Array). Make a mutable copy we can edit.
  const out = Buffer.from(data);

  const TH = 248;   // near-white threshold
  const SOFT = 10;  // softness for edge fade

  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];

    const avg = (r + g + b) / 3;

    // hard remove near-white
    if (r >= TH && g >= TH && b >= TH) {
      out[i + 3] = 0;
      continue;
    }

    // soft fade for almost-white pixels
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

async function compressToTarget(input: Uint8Array, maxBytes: number): Promise<Uint8Array> {
  // IMPORTANT: keep this as Uint8Array, NOT Buffer typed var
  let buf: Uint8Array = Buffer.from(input);

  // 1) palette compression first
  buf = await sharp(buf).png({ compressionLevel: 9, palette: true }).toBuffer();
  if (buf.byteLength <= maxBytes) return buf;

  // 2) progressively resize down
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
    if (buf.byteLength <= maxBytes) break;
  }

  return buf;
}

export async function postprocessPng(inputPng: Uint8Array, opts: PostOpts): Promise<Uint8Array> {
  let buf: Uint8Array = inputPng;

  if (opts.transparentBg) {
    buf = await makeWhiteTransparent(buf);
  }

  if (opts.maxBytes && buf.byteLength > opts.maxBytes) {
    buf = await compressToTarget(buf, opts.maxBytes);
  }

  return buf;
}
