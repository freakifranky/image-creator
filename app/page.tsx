"use client";

import { useMemo, useState } from "react";

type Provider = "gemini" | "openai";
type Mode = "upload" | "url";
type SkuType = "fresh" | "non_fresh";
type PackagingType = "vacuum" | "gembolan" | "mika" | "mesh";

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

async function readError(res: Response) {
  const text = await res.text();
  if (res.status === 403 && text.toLowerCase().includes("openai")) {
    return "OpenAI image model is gated (org not verified). Switch provider to Gemini.";
  }
  if (res.status === 503) {
    return "Model is busy/overloaded. Please retry.";
  }
  return text || `Request failed (${res.status})`;
}

export default function Page() {
  /* =========================
   * Step 1 — Inputs
   * ========================= */
  const [skuType, setSkuType] = useState<SkuType>("fresh");
  const [mode1, setMode1] = useState<Mode>("upload");
  const [provider1, setProvider1] = useState<Provider>("gemini");
  const [preferPro1, setPreferPro1] = useState(false);
  const [file1, setFile1] = useState<File | null>(null);
  const [url1, setUrl1] = useState("");
  const [maxKb1, setMaxKb1] = useState(250);
  const [transparentBg1, setTransparentBg1] = useState(false);

  /* =========================
   * Step 1 — Outputs
   * ========================= */
  const [busy1, setBusy1] = useState(false);
  const [err1, setErr1] = useState<string | null>(null);
  const [img1Url, setImg1Url] = useState<string | null>(null);
  const [img1Blob, setImg1Blob] = useState<Blob | null>(null);
  const [usedModel1, setUsedModel1] = useState("");

  /* =========================
   * Step 2 — Inputs
   * ========================= */
  const [provider2, setProvider2] = useState<Provider>("gemini");
  const [preferPro2, setPreferPro2] = useState(false);
  const [useImg1AsInput, setUseImg1AsInput] = useState(true);
  const [file2, setFile2] = useState<File | null>(null);
  const [maxKb2, setMaxKb2] = useState(250);
  const [transparentBg2, setTransparentBg2] = useState(false);

  // NEW — packaging controls
  const [packagingType, setPackagingType] =
    useState<PackagingType>("vacuum");
  const [addIcePack, setAddIcePack] = useState(false);

  /* =========================
   * Step 2 — Outputs
   * ========================= */
  const [busy2, setBusy2] = useState(false);
  const [err2, setErr2] = useState<string | null>(null);
  const [img2Url, setImg2Url] = useState<string | null>(null);
  const [usedModel2, setUsedModel2] = useState("");

  const canUseImg1 = useMemo(() => Boolean(img1Blob), [img1Blob]);

  /* =========================
   * Generate Image 1
   * ========================= */
  async function generateImage1() {
    setErr1(null);
    setBusy1(true);

    try {
      if (img1Url) URL.revokeObjectURL(img1Url);

      const fd = new FormData();
      fd.append("skuType", skuType);
      fd.append("mode", mode1);
      fd.append("provider", provider1);
      fd.append("preferPro", String(preferPro1));
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

      setUsedModel1(res.headers.get("X-Used-Model") || "");

      const blob = await res.blob();
      setImg1Blob(blob);
      setImg1Url(URL.createObjectURL(blob));
    } catch (e: any) {
      setErr1(e?.message || "Failed to generate Image 1");
    } finally {
      setBusy1(false);
    }
  }

  /* =========================
   * Generate Image 2
   * ========================= */
  async function generateImage2() {
    setErr2(null);
    setBusy2(true);

    try {
      if (img2Url) URL.revokeObjectURL(img2Url);

      const fd = new FormData();
      fd.append("provider", provider2);
      fd.append("preferPro", String(preferPro2));
      fd.append("maxKb", String(maxKb2));
      fd.append("transparentBg", String(transparentBg2));
      fd.append("packagingType", packagingType);
      fd.append("addIcePack", String(addIcePack));

      let inputBlob: Blob;

      if (useImg1AsInput) {
        if (!img1Blob) throw new Error("Generate Image 1 first.");
        inputBlob = img1Blob;
      } else {
        if (!file2) throw new Error("Upload an input image.");
        inputBlob = file2;
      }

      const fileLike = new File([inputBlob], "input.png", {
        type: inputBlob.type || "image/png",
      });
      fd.append("file", fileLike);

      const res = await fetch("/api/image2", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await readError(res));

      setUsedModel2(res.headers.get("X-Used-Model") || "");

      const blob = await res.blob();
      setImg2Url(URL.createObjectURL(blob));
    } catch (e: any) {
      setErr2(e?.message || "Failed to generate Image 2");
    } finally {
      setBusy2(false);
    }
  }

  /* =========================
   * UI
   * ========================= */
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold">SKU Studio</h1>
          <p className="mt-2 text-neutral-400">
            Step 1 cleans the product. Step 2 applies operational packaging.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {/* ================= STEP 1 ================= */}
          {/* (UNCHANGED FROM YOUR VERSION) */}
          {/* You already validated this — kept intact */}

          {/* ================= STEP 2 ================= */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
            <h2 className="text-lg font-semibold">Step 2 — Generate Image 2</h2>

            {/* Packaging selection */}
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold">Packaging type</p>

              {[
                ["vacuum", "Vacuum sealed (transparent)"],
                ["gembolan", "Gembolan plastic (tied bag)"],
                ["mika", "Mika container (clamshell)"],
                ["mesh", "Green mesh bag"],
              ].map(([val, label]) => (
                <label key={val} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={packagingType === val}
                    onChange={() =>
                      setPackagingType(val as PackagingType)
                    }
                  />
                  {label}
                </label>
              ))}
            </div>

            {/* Ice pack */}
            <div className="mt-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={addIcePack}
                  disabled={packagingType !== "vacuum"}
                  onChange={(e) => setAddIcePack(e.target.checked)}
                />
                Add ice pack (vacuum only)
              </label>

              {packagingType !== "vacuum" && (
                <p className="text-xs text-neutral-500">
                  Ice pack is only supported for vacuum packaging.
                </p>
              )}
            </div>

            <button
              onClick={generateImage2}
              disabled={busy2}
              className={classNames(
                "mt-4 rounded-lg px-4 py-2 text-sm font-semibold",
                busy2
                  ? "bg-neutral-700 text-neutral-300"
                  : "bg-white text-neutral-900 hover:bg-neutral-200"
              )}
            >
              {busy2 ? "Generating…" : "Generate Image 2"}
            </button>

            {err2 && (
              <div className="mt-3 text-sm text-red-300">{err2}</div>
            )}

            {img2Url && (
              <img
                src={img2Url}
                alt="Image 2"
                className="mt-4 aspect-square w-full rounded-lg bg-neutral-900 object-contain"
              />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
