"use client";

import { useEffect, useMemo, useState } from "react";

type Mode = "upload" | "url";
type SkuType = "fresh" | "non_fresh";
type Packaging = "vacuum" | "gembolan" | "mika" | "mesh";

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

async function readError(res: Response) {
  const text = await res.text();
  if (res.status === 503) {
    return "Model is busy / rate-limited. Please wait ~30 seconds and retry.";
  }
  return text || `Request failed (${res.status})`;
}

export default function Page() {
  // Step 1 inputs
  const [skuType, setSkuType] = useState<SkuType>("fresh");
  const [mode1, setMode1] = useState<Mode>("upload");
  const [file1, setFile1] = useState<File | null>(null);
  const [url1, setUrl1] = useState("");
  const [maxKb1, setMaxKb1] = useState<number>(250);
  const [transparentBg1, setTransparentBg1] = useState<boolean>(false);

  // Step 1 outputs
  const [busy1, setBusy1] = useState(false);
  const [err1, setErr1] = useState<string | null>(null);
  const [img1Url, setImg1Url] = useState<string | null>(null);
  const [img1Blob, setImg1Blob] = useState<Blob | null>(null);
  const [usedModel1, setUsedModel1] = useState<string>("");

  // Step 2 inputs
  const [useImg1AsInput, setUseImg1AsInput] = useState(true);
  const [file2, setFile2] = useState<File | null>(null);
  const [maxKb2, setMaxKb2] = useState<number>(250);
  const [transparentBg2, setTransparentBg2] = useState<boolean>(false);

  // Packaging inputs
  const [packagingType, setPackagingType] = useState<Packaging>("vacuum");
  const [addIcePack, setAddIcePack] = useState<boolean>(false);

  // Step 2 outputs
  const [busy2, setBusy2] = useState(false);
  const [err2, setErr2] = useState<string | null>(null);
  const [img2Url, setImg2Url] = useState<string | null>(null);
  const [usedModel2, setUsedModel2] = useState<string>("");

  const canUseImg1 = useMemo(() => Boolean(img1Blob), [img1Blob]);
  const iceAllowed = packagingType === "vacuum";

  useEffect(() => {
    if (packagingType !== "vacuum" && addIcePack) setAddIcePack(false);
  }, [packagingType, addIcePack]);

  async function generateImage1() {
    setErr1(null);
    setBusy1(true);

    try {
      if (img1Url) URL.revokeObjectURL(img1Url);

      const fd = new FormData();
      fd.append("skuType", skuType);
      fd.append("mode", mode1);
      fd.append("provider", "gemini"); // always Gemini
      fd.append("maxKb", String(maxKb1));
      fd.append("transparentBg", String(transparentBg1));

      if (mode1 === "url") {
        if (!url1.trim()) throw new Error("Please paste an image URL.");
        fd.append("imageUrl", url1.trim());
      } else {
        if (!file1) throw new Error("Please upload an image.");
        fd.append("file", file1);
      }

      const res = await fetch("/api/image1", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await readError(res));

      const model = res.headers.get("X-Used-Model") || "";
      setUsedModel1(model);

      const blob = await res.blob();
      setImg1Blob(blob);
      const o = URL.createObjectURL(blob);
      setImg1Url(o);
    } catch (e: any) {
      setErr1(e?.message || "Failed to generate Image 1");
    } finally {
      setBusy1(false);
    }
  }

  async function generateImage2() {
    setErr2(null);
    setBusy2(true);

    try {
      if (img2Url) URL.revokeObjectURL(img2Url);

      const fd = new FormData();
      fd.append("provider", "gemini"); // always Gemini
      fd.append("maxKb", String(maxKb2));
      fd.append("skuType", skuType);
      fd.append("transparentBg", String(transparentBg2));
      fd.append("packagingType", packagingType);
      fd.append("addIcePack", String(iceAllowed ? addIcePack : false));

      let inputBlob: Blob;
      if (useImg1AsInput) {
        if (!img1Blob) throw new Error("Generate Image 1 first (or uncheck and upload a separate image).");
        inputBlob = img1Blob;
      } else {
        if (!file2) throw new Error("Please upload an image for Image 2 input.");
        inputBlob = file2;
      }

      const fileLike = new File([inputBlob], "input.png", {
        type: inputBlob.type || "image/png",
      });
      fd.append("file", fileLike);

      const res = await fetch("/api/image2", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await readError(res));

      const model = res.headers.get("X-Used-Model") || "";
      setUsedModel2(model);

      const blob = await res.blob();
      const o = URL.createObjectURL(blob);
      setImg2Url(o);
    } catch (e: any) {
      setErr2(e?.message || "Failed to generate Image 2");
    } finally {
      setBusy2(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">SKU Studio</h1>
          <p className="mt-2 text-neutral-400">
            Step 1 generates <span className="text-neutral-200">Image 1</span> (background cleanup).
            Step 2 generates <span className="text-neutral-200">Image 2</span> (packaging transformation).
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            Using Gemini 2.0 Flash (free tier · ~500 images/day · no credit card needed)
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Step 1 */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
            <div>
              <h2 className="text-lg font-semibold">Step 1 — Generate Image 1</h2>
              <p className="text-sm text-neutral-400">Fresh / Non-Fresh cleanup using Prompt 1.</p>
            </div>

            <div className="mt-3 grid gap-2">
              <div className="flex items-center gap-3">
                <label className="text-sm text-neutral-300">Max download size (KB)</label>
                <input
                  type="number"
                  min={50}
                  max={2000}
                  value={maxKb1}
                  onChange={(e) => setMaxKb1(Number(e.target.value || 0))}
                  className="w-28 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                />
                <span className="text-xs text-neutral-500">250 for GoMart limit</span>
              </div>

              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  checked={transparentBg1}
                  onChange={(e) => setTransparentBg1(e.target.checked)}
                />
                Transparent background (PNG)
              </label>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={skuType === "fresh"} onChange={() => setSkuType("fresh")} />
                  Fresh
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={skuType === "non_fresh"}
                    onChange={() => setSkuType("non_fresh")}
                  />
                  Non-Fresh
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={mode1 === "upload"} onChange={() => setMode1("upload")} />
                  Upload
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={mode1 === "url"} onChange={() => setMode1("url")} />
                  URL
                </label>
              </div>

              {mode1 === "upload" ? (
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="block w-full cursor-pointer rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 file:mr-4 file:rounded-md file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-sm file:text-neutral-100 hover:file:bg-neutral-700"
                  onChange={(e) => setFile1(e.target.files?.[0] || null)}
                />
              ) : (
                <input
                  value={url1}
                  onChange={(e) => setUrl1(e.target.value)}
                  placeholder="Paste image URL..."
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                />
              )}

              <button
                onClick={generateImage1}
                disabled={busy1}
                className={classNames(
                  "rounded-lg px-4 py-2 text-sm font-semibold",
                  busy1
                    ? "cursor-not-allowed bg-neutral-700 text-neutral-300"
                    : "bg-white text-neutral-900 hover:bg-neutral-200"
                )}
              >
                {busy1 ? "Generating… (may take ~30s)" : "Generate Image 1"}
              </button>

              {err1 && (
                <div className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                  {err1}
                </div>
              )}

              <div className="mt-1 text-xs text-neutral-500">
                {usedModel1 ? (
                  <>Model: <span className="text-neutral-300">{usedModel1}</span></>
                ) : (
                  <>Free tier: ~2 images/min · 500/day</>
                )}
              </div>

              {img1Url && (
                <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Output Image 1</p>
                    <a
                      href={img1Url}
                      download="image1.png"
                      className="text-sm text-neutral-300 underline hover:text-white"
                    >
                      Download
                    </a>
                  </div>
                  <img
                    src={img1Url}
                    alt="Image 1 output"
                    className="mt-3 aspect-square w-full rounded-lg bg-neutral-900 object-contain"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Step 2 */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
            <div>
              <h2 className="text-lg font-semibold">Step 2 — Generate Image 2</h2>
              <p className="text-sm text-neutral-400">Packaging transformation using Prompt 2.</p>
            </div>

            <div className="mt-3 grid gap-2">
              <div className="flex items-center gap-3">
                <label className="text-sm text-neutral-300">Max download size (KB)</label>
                <input
                  type="number"
                  min={50}
                  max={2000}
                  value={maxKb2}
                  onChange={(e) => setMaxKb2(Number(e.target.value || 0))}
                  className="w-28 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                />
                <span className="text-xs text-neutral-500">250 for GoMart limit</span>
              </div>

              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  checked={transparentBg2}
                  onChange={(e) => setTransparentBg2(e.target.checked)}
                />
                Transparent background (PNG)
              </label>
            </div>

            {/* Packaging radios */}
            <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/40 p-3">
              <p className="text-sm font-semibold">Packaging type</p>
              <div className="mt-2 grid gap-2">
                {(
                  [
                    ["vacuum", "Vacuum sealed (transparent)"],
                    ["gembolan", "Gembolan plastic (tied bag)"],
                    ["mika", "Mika container (clamshell)"],
                    ["mesh", "Green mesh bag"],
                  ] as [Packaging, string][]
                ).map(([val, label]) => (
                  <label key={val} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={packagingType === val}
                      onChange={() => setPackagingType(val)}
                    />
                    {label}
                  </label>
                ))}

                <label className={classNames("mt-2 flex items-center gap-2 text-sm", !iceAllowed && "opacity-50")}>
                  <input
                    type="checkbox"
                    checked={addIcePack}
                    onChange={(e) => setAddIcePack(e.target.checked)}
                    disabled={!iceAllowed}
                  />
                  Add ice pack (vacuum only)
                </label>

                {!iceAllowed && (
                  <p className="text-xs text-neutral-500">Ice pack is only available for Vacuum sealed packaging.</p>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useImg1AsInput}
                  onChange={(e) => setUseImg1AsInput(e.target.checked)}
                />
                Use Image 1 as input
              </label>

              {!useImg1AsInput && (
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="block w-full cursor-pointer rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 file:mr-4 file:rounded-md file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-sm file:text-neutral-100 hover:file:bg-neutral-700"
                  onChange={(e) => setFile2(e.target.files?.[0] || null)}
                />
              )}

              {useImg1AsInput && !canUseImg1 && (
                <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-300">
                  Generate Image 1 first to enable this option.
                </div>
              )}

              <button
                onClick={generateImage2}
                disabled={busy2 || (useImg1AsInput && !canUseImg1)}
                className={classNames(
                  "rounded-lg px-4 py-2 text-sm font-semibold",
                  busy2 || (useImg1AsInput && !canUseImg1)
                    ? "cursor-not-allowed bg-neutral-700 text-neutral-300"
                    : "bg-white text-neutral-900 hover:bg-neutral-200"
                )}
              >
                {busy2 ? "Generating… (may take ~30s)" : "Generate Image 2"}
              </button>

              {err2 && (
                <div className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                  {err2}
                </div>
              )}

              <div className="mt-1 text-xs text-neutral-500">
                {usedModel2 ? (
                  <>Model: <span className="text-neutral-300">{usedModel2}</span></>
                ) : (
                  <>Free tier: ~2 images/min · 500/day</>
                )}
              </div>

              {img2Url && (
                <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Output Image 2</p>
                    <a
                      href={img2Url}
                      download="image2.png"
                      className="text-sm text-neutral-300 underline hover:text-white"
                    >
                      Download
                    </a>
                  </div>
                  <img
                    src={img2Url}
                    alt="Image 2 output"
                    className="mt-3 aspect-square w-full rounded-lg bg-neutral-900 object-contain"
                  />
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className="mt-10 text-xs text-neutral-500">
          Free Gemini API key: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-neutral-300">aistudio.google.com/apikey</a>
          {" · "}Rate limited to ~2 images/min on free tier — if you get a 503, wait 30 seconds and retry.
        </footer>
      </div>
    </main>
  );
}
