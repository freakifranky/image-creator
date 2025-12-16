import sharp from "sharp";

export type PostOpts = {
  maxBytes?: number;
  transparentBg?: boolean;
};

type NodeBuf = Buffer<ArrayBufferLike>;
type Bytes = NodeBuf | Uint8Array;

function asBuffer(x: Bytes): NodeBuf {
  // Buffer.from(Uint8Array) returns Buffer<ArrayBufferLike>
  return Buffer.isBuffer(x) ? (x as NodeBuf) : (Buffer.from(x) as NodeBuf);
}

export async function postprocessPng(inputPng: Bytes, opts: PostOpts): Promise<NodeBuf> {
  let buf: NodeBuf = asBuffer(inputPng);

  if (opts.transparentBg) {
    buf = asBuffer(await makeWhiteTransparent(buf));
  }

  if (opts.maxBytes && buf.length > opts.maxBytes) {
    buf = asBuffer(await compressToMaxBytes(buf, opts.maxBytes));
  }

  return buf;
}

// IMPORTANT: these return Bytes/Uint8Array/Buffer but are normalized by asBuffer above
async function makeWhiteTransparent(inputPng: Bytes) {
  const img = sharp(asBuffer(inputPng)).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

  const out = asBuffer(data as any); // normalize

  // ... your pixel loop ...

  return sharp(out, { raw: { width: info.width!, height: info.height!, channels: 4 } })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
}

async function compressToMaxBytes(inputPng: Bytes, maxBytes: number) {
  let buf = asBuffer(await sharp(asBuffer(inputPng)).png({ compressionLevel: 9, palette: true }).toBuffer());
  if (buf.length <= maxBytes) return buf;

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

  return buf;
}
