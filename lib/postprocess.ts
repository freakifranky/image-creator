import sharp from "sharp";

export type PostOpts = {
  maxBytes?: number;
  transparentBg?: boolean;
};

async function makeWhiteTransparent(
  input: Buffer<ArrayBufferLike>
): Promise<Buffer<ArrayBufferLike>> {
  const img = sharp(input).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

  const out = Buffer.from(data); // normalize
  const TH = 248;
  const SOFT = 6;

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

  return Buffer.from(
    await sharp(out, {
      raw: { width: info.width!, height: info.height!, channels: 4 },
    })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer()
  );
}

export async function postprocessPng(
  input: Buffer<ArrayBufferLike>,
  opts: PostOpts
): Promise<Buffer<ArrayBufferLike>> {
  let buf: Buffer<ArrayBufferLike> = input;

  if (opts.transparentBg) {
    buf = await makeWhiteTransparent(buf);
  }

  if (opts.maxBytes && buf.length > opts.maxBytes) {
    const meta = await sharp(buf).metadata();
    let width = Math.min(meta.width ?? 1024, 1400);
    const minWidth = 256;

    while (width >= minWidth) {
      const candidate = Buffer.from(
        await sharp(buf)
          .resize({ width, withoutEnlargement: true })
          .png({ compressionLevel: 9, palette: true, quality: 70 })
          .toBuffer()
      );

      if (candidate.length <= opts.maxBytes) {
        buf = candidate;
        break;
      }

      buf = candidate;
      width = Math.floor(width * 0.85);
    }
  }

  return buf;
}
