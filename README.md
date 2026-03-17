# SKU Studio

A Next.js web app that transforms raw product images into clean, standardized e-commerce catalog shots using AI image editing. Built for quick-commerce grocery catalog workflows.

---

## What it does

**Step 1 — Image Cleanup**
Takes a raw SKU photo and outputs a standardized product shot: white background, consistent angle, proper framing. Handles two SKU types:
- **Fresh** — places item on a round wooden plate, 30° isometric angle
- **Non-Fresh** — clean packaged product shot, 3/4 front angle

**Step 2 — Packaging Transformation**
Takes the Step 1 output and wraps the product in a packaging style:
- Vacuum sealed (transparent plastic)
- Vacuum sealed + ice pack
- Gembolan (tied plastic bag)
- Mika (rigid clamshell container)
- Green mesh bag

Both steps use the same AI model under the hood and can be run independently.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Frontend | React 19, Tailwind CSS v4 |
| Image AI | Google Gemini (primary), OpenAI gpt-image-1 (secondary) |
| Image post-processing | Sharp |
| Runtime | Node.js |

---

## Prerequisites

- Node.js 20+
- A paid Google Cloud project with Gemini API enabled
- A Gemini API key

> **Important:** The Gemini free tier has had **zero quota for image generation since December 2025**. A billing-enabled API key is required. See [Getting an API key](#getting-an-api-key) below.

---

## Getting started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd sku-studio
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the project root:

```bash
# Required
GEMINI_API_KEY=AIza...your-key-here

# Optional — only needed if using OpenAI provider
OPENAI_API_KEY=sk-...your-key-here
```

> ⚠️ Never commit `.env.local` to version control. It is already in `.gitignore`.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Getting an API key

### Gemini (recommended)

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Sign in with a Google account
3. Click **Create API key**
4. Go to [Google Cloud Console](https://console.cloud.google.com) → select your project → **Billing** → link a payment method
5. Copy the key into `GEMINI_API_KEY` in `.env.local`

**Cost:** ~$0.039 per image (Step 1 + Step 2 = ~$0.08 per SKU processed end-to-end). No monthly fee — pay only for what you use.


## Usage

### Basic workflow

1. Select **Fresh** or **Non-Fresh** depending on the SKU type
2. Upload an image or paste a URL in **Step 1**
3. Click **Generate Image 1** — wait ~15–30 seconds
4. In **Step 2**, select a packaging type
5. Click **Generate Image 2**
6. Download both outputs

### Settings

| Setting | Default | Notes |
|---|---|---|
| Max download size (KB) | 250 | Set to match your catalog system's upload limit |
| Transparent background | Off | Removes white background, outputs PNG with alpha |
| Provider | Gemini | Switch to OpenAI if Gemini is unavailable |

### Tips

- Step 2 can be run independently with its own uploaded image — uncheck "Use Image 1 as input"
- If you get a 503 error, the model is rate-limited — wait 30 seconds and retry
- The app retries automatically up to 5 times with exponential backoff before surfacing an error

---

## Project structure

```
sku-studio/
├── app/
│   ├── api/
│   │   ├── image1/route.ts    # Step 1 API endpoint
│   │   └── image2/route.ts    # Step 2 API endpoint
│   ├── page.tsx               # Main UI
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── gemini.ts              # Gemini API client + retry logic
│   ├── openai.ts              # OpenAI API client
│   ├── prompts.ts             # All image generation prompts
│   └── postprocess.ts         # Sharp-based image resizing + bg removal
├── .env.local                 # Your API keys (not committed)
└── package.json
```

---

## Prompts

All prompts live in `lib/prompts.ts` and are fully editable. There are 7 prompts:

| Constant | Used in | Purpose |
|---|---|---|
| `PROMPT_IMAGE1_FRESH` | Step 1 | Wooden plate, studio lighting |
| `PROMPT_IMAGE1_NONFRESH` | Step 1 | Clean packaged product shot |
| `PROMPT_IMAGE2_GLOBAL` | Step 2 (base) | Shared rules for all packaging |
| `PROMPT_IMAGE2_FRESH_VACUUM` | Step 2 | Vacuum sealed |
| `PROMPT_IMAGE2_FRESH_VACUUM_WITH_ICEPACK` | Step 2 | Vacuum + ice pack |
| `PROMPT_IMAGE2_FRESH_GEMBOLAN` | Step 2 | Tied plastic bag |
| `PROMPT_IMAGE2_FRESH_MIKA` | Step 2 | Clamshell container |
| `PROMPT_IMAGE2_FRESH_MESH` | Step 2 | Green mesh bag |

To adjust any prompt, edit the relevant constant in `lib/prompts.ts` and restart the dev server.

---

## Known limitations

- **No free tier** — Gemini image generation requires a billing-enabled API key (free quota = 0 since Dec 2025)
- **One image at a time** — no bulk processing support yet
- **Fresh items only for Step 2** — the packaging prompts are optimised for raw/fresh products; non-fresh packaged goods may produce inconsistent results in Step 2
- **Rate limits** — free-tier Gemini accounts (even with billing linked) are limited to ~2 images/minute on Tier 1. Upgrade to Tier 2+ for higher throughput
- **No persistent storage** — outputs exist only as browser object URLs. Refreshing the page clears them. Download before closing

---

## Roadmap

Improvements identified but not yet built:

- [ ] **Before/after comparison** — side-by-side view of input vs output
- [ ] **Editable prompts from UI** — tweak prompts without touching code
- [ ] **Bulk queue** — process multiple SKUs with a progress tracker
- [ ] **SKU title → prompt enhancement** — use product name to enrich the prompt context
- [ ] **Web search → image sourcing** — given a SKU title, find and pull a reference image automatically, then run through the pipeline
- [ ] **Batch export** — download all session outputs as a zip
- [ ] **Remove dead `preferPro` UI toggle** — currently visible but non-functional

---

## Deployment

### Vercel (recommended)

```bash
npm run build
```

Deploy via the [Vercel dashboard](https://vercel.com) or CLI. Add your environment variables in the Vercel project settings under **Settings → Environment Variables**.

> Do not expose `GEMINI_API_KEY` or `OPENAI_API_KEY` to the browser. Both are used server-side only (in `app/api/` routes) and are never sent to the client.

---

## License

Internal tool — not for public distribution.
