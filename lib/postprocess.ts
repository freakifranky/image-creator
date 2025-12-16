import sharp from "sharp";

export type PostOpts = {
  maxBytes?: number;
  transparentBg?: boolean;
};

type RemoveBgOpts = {
  threshold?: number;
  softness?: number;
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

  const rgba = Buffer.from(data);
  const mask = new Uint8Array(w * h);

  const isWhite = (idx: number) =>
    rgba[idx] >= TH && rgba[idx + 1] >= TH && rgba[idx + 2] >= TH;

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

  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    if (mask[i]) {
      rgba[idx + 3] = 0;
    }
  }

  return sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
}

export async function postprocessPng(
  input: Buffer,
  opts: PostOpts
): Promise<Buffer> {
  let buf = input;

  if (opts.transparentBg) {
    buf = await removeWhiteBackground(buf);
  }

  if (opts.maxBytes && buf.length > opts.maxBytes) {
    const meta = await sharp(buf).metadata();
    let width = Math.min(meta.width ?? 1024, 1400);

    while (width >= 256) {
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
