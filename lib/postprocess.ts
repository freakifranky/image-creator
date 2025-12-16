import sharp from "sharp";

export type PostOpts = {
  maxBytes?: number;          // e.g. 250 * 1024
  transparentBg?: boolean;    // true => turn near-white into alpha
};

type Bytes = Buffer | Uint8Array;

function asBuffer(x: Bytes): Buffer {
  return Buffer.isBuffer(x) ? x : Buffer.from(x);
}

async function makeWhiteTransparent(inputPng: Bytes): Promise<Buffer> {
  const img = sharp(asBuffer(inputPng)).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

  // `data` can be typed as Uint8Array by sharp typings, normalize it.
  const out = asBuffer(data);

  const TH = 248; // threshold for near-white
  const SOFT = 6; // softness / tolerance

  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];

    const nearWhite = r >= TH && g >= TH && b >= TH;

    if (nearWhite) {
      out[i + 3] = 0;
    } else {
      const avg = (r + g + b) / 3;
      if (avg >= TH - SOFT) {
        const a = Math.max(0, Math.min(255, ((TH - avg) / SOFT) * 255));
        out[i + 3] = Math.min(out[i + 3], Math.round(a));
      }
    }
  }

  const buf = await sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();

  return asBuffer(buf);
}

async function compressToMaxBytes(inputPng: Bytes, maxBytes: number): Promise<Buffer> {
  // 1) Try palette compression first
  let buf = asBuffer(await sharp(asBuffer(inputPng)).png({ compressionLevel: 9, palette: true }).toBuffer());
  if (buf.length <= maxBytes) return buf;

  // 2) Then resize down gradually
  const meta = await sharp(buf).metadata();
  let w = Math.min(meta.width ?? 1024, 1400);
  const minW = 256;

  while (w >= minW) {
    const candidate = asBuffer(
      await sharp(buf)
        .resize({ width: w, withoutEnlargement: true })
        .png({ compressionLevel: 9, palette: true })
        .toBuffer()
    );

    buf = candidate;
    if (buf.length <= maxBytes) return buf;

    w = Math.floor(w * 0.85);
  }

  return buf; // best-effort
}

export async function postprocessPng(inputPng: Bytes, opts: PostOpts): Promise<Buffer> {
  let buf = asBuffer(inputPng);

  if (opts.transparentBg) {
    buf = await makeWhiteTransparent(buf);
  }

  if (opts.maxBytes && buf.length > opts.maxBytes) {
    buf = await compressToMaxBytes(buf, opts.maxBytes);
  }

  return buf; // ✅ always Buffer
}
