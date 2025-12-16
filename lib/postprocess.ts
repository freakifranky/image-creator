import sharp from "sharp";

export type PostOpts = {
  maxBytes?: number;        // e.g. 250 * 1024
  transparentBg?: boolean;  // true => remove white background
};

type RemoveBgOpts = {
  threshold?: number; // 0..255 (higher = stricter white)
  softness?: number;  // feather band near threshold
};

async function removeWhiteBackground(
  input: Buffer,
  opts: RemoveBgOpts = {}
): Promise<Buffer> {
  const TH = opts.threshold ?? 245;
  const SOFT = opts.softness ?? 12;

  const img = sharp(input).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  if (!w || !h) return input;

  const rgba = Buffer.from(data); // RGBA
  const mask = new Uint8Array(w * h); // 1 = background (corner-connected white)

  const isWhite = (idx: number) => {
    const r = rgba[idx], g = rgba[idx + 1], b = rgba[idx + 2];
    return r >= TH && g >= TH && b >= TH;
  };

  // Flood-fill from corners to mark ONLY background region
  const q: number[] = [];
  const push = (x: number, y: number) => {
    const p = y * w + x;
    if (mask[p]) return;
    const idx = p * 4;
    if (!isWhite(idx)) return;
    mask[p] = 1;
    q.push(p);
  };

  push(0, 0);
  push(w - 1, 0);
  push(0, h - 1);
  push(w - 1, h - 1);

  while (q.length) {
    const p = q.pop()!;
    const x = p % w;
    const y = Math.floor(p / w);

    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }

  // Apply alpha
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const idx = p * 4;

      if (mask[p] === 1) {
        rgba[idx + 3] = 0; // background -> fully transparent
        continue;
      }

      // Feather only near boundary (neighbor is background)
      const near =
        (x > 0 && mask[p - 1]) ||
        (x < w - 1 && mask[p + 1]) ||
        (y > 0 && mask[p - w]) ||
        (y < h - 1 && mask[p + w]);

      if (near) {
        const r = rgba[idx], g = rgba[idx + 1], b = rgba[idx + 2];
        const avg = (r + g + b) / 3;
        if (avg >= TH - SOFT) {
          const a = Math.max(0, Math.min(255, ((TH - avg) / SOFT) * 255));
          rgba[idx + 3] = Math.min(rgba[idx + 3], Math.round(a));
        }
      }
    }
  }

  return sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
}

export async function postprocessPng(input: Buffer, opts: PostOpts): Promise<Buffer> {
  let buf: Buffer = input;

  if (opts.transparentBg) {
    buf = await removeWhiteBackground(buf, { threshold: 245, softness: 12 });
  }

  // Compress to <= maxBytes by resizing down gradually + palette PNG
  if (opts.maxBytes && buf.length > opts.maxBytes) {
    const meta = await sharp(buf).metadata();
    let width = Math.min(meta.width ?? 1024, 1400);
    const minWidth = 256;

    while (width >= minWidth) {
      const candidate = await sharp(buf)
        .resize({ width, withoutEnlargement: true })
        .png({ compressionLevel: 9, palette: true })
        .toBuffer();

      buf = candidate;
      if (candidate.length <= opts.maxBytes) break;

      width = Math.floor(width * 0.85);
    }
  }

  return buf;
}
