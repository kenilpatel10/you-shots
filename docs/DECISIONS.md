# Decisions and deviations from the original spec

Everything below was verified against the installed packages' type definitions and READMEs
(`node_modules/*/dist/*.d.ts`) at build time, because official doc sites were not reachable from
the build environment. Package versions are pinned in `package.json`.

## Runtime and packages

| Decision | Why |
| --- | --- |
| **Node ≥ 20, 22 recommended.** `googleapis` is pinned to `^160` (engines `>=18`); the latest major requires Node 22. | Keeps the "Node 20+" requirement true. GitHub Actions uses Node 22. |
| `@google/genai` pinned `<3`. | v3 changes automatic function calling and requires Node 22. Structured output uses `responseMimeType: "application/json"` + `responseJsonSchema` (present in v2.22 typings). |
| Groq uses `response_format: { type: "json_object" }` with the schema in the prompt. | `json_schema` mode only works on some Groq models; `json_object` works on all. |
| `zod` pinned to exactly **4.5.4**. | Remotion 4.0.525 declares `zod@4.5.4` and its CLI warns on any other version. |
| Remotion 4.0.525 (`remotion`, `@remotion/cli`, `@remotion/renderer`, `@remotion/bundler`, `@remotion/media-utils`, `@remotion/install-whisper-cpp`, `@remotion/fonts`). | Current at build time. Remotion is free for individuals and companies ≤ 3 people (see `node_modules/remotion/LICENSE.md`); a company licence is needed above that. |
| TypeScript 5.9, `tsx` for running CLIs, ESLint 9 flat config, Vitest 3. | Boring, stable choices. TypeScript 7 (Go compiler) was available but typescript-eslint support was not confirmed. |

## Video

- **Fonts are bundled**, not fetched from Google Fonts at render time: `public/fonts/fredoka-*.woff2`
  (OFL) loaded with `@remotion/fonts`. Renders are byte-identical across machines and work offline.
- **Browser:** locally the renderer uses `REMOTION_BROWSER_EXECUTABLE`, else a known system
  Chrome/headless-shell path, else Remotion downloads its headless shell into `.remotion/`.
  Full Chrome builds no longer support the old headless mode, so full-Chrome paths run with
  `chromeMode: "chrome-for-testing"` and headless-shell paths with `"headless-shell"`. In CI,
  `REMOTION_PREFER_DOWNLOADED_BROWSER=1` forces the (cached) download for consistency.
- **Music mixing and ducking happen inside Remotion** (`MusicBed` computes the volume per frame
  from the word timeline) rather than in a separate ffmpeg step. Loudness normalisation of the
  voice is done in pure JS (`src/audio/wav.ts`). Result: no ffmpeg dependency of our own —
  Remotion ships its own encoder.
- **Default music is generated** (`src/audio/music.ts`, deterministic, original) so the repo is
  royalty-free out of the box; a YouTube Audio Library track can replace it (`assets/music/README.md`).
- **Short duration** = measured audio + gaps + a 2 s sign-off tail, hard-capped at 59 s in code.
  The validator estimates 2.7 words/s before TTS (conservative); a script that still renders
  above 59 s fails loudly and the next topic is tried on the following run.
- Long video uses the same `Episode` component in a **landscape layout** (Bolt left, text right);
  it is never a letterboxed vertical video. Chapter timestamps come from the same frame plan the
  composition renders (`remotion/long/plan.ts`).
- Safe zones are enforced by layout constants (`remotion/layout.ts`): nothing important in the
  top 15 %, bottom 25 % or right 14 % of a Short.

## Audio

- **Kokoro** via `kokoro-js` 1.2.1 with `dtype: "q8"`, `device: "cpu"`, voice `af_heart` at
  speed 1.06 (configurable in `config/channel.json`). We call `tts.stream()` (sentence splitting)
  instead of `generate()` because `generate()` silently **truncates at 510 tokens**. Voice
  embeddings ship inside the npm package; only the ONNX model is downloaded (cached in
  `.cache/hf`, restored by `actions/cache`).
- **whisper.cpp 1.7.5** through `@remotion/install-whisper-cpp` (built from source on
  Linux/macOS — needs `git` and `cmake`, both present on GitHub runners; prebuilt on Windows).
  Each section is transcribed separately (16 kHz WAV produced in JS), then the recognised tokens
  are aligned to the script's own words with an LCS aligner (`src/audio/align.ts`) so captions
  always show the exact script text. If whisper cannot be installed, timings are estimated
  proportionally by character count and the draft message says `captions: estimated`.
- **Placeholder voice** (`src/audio/placeholder.ts`): a clearly labelled robot-babble generator
  used only with `--dry-run --placeholder-voice` (or `ALLOW_PLACEHOLDER_VOICE=1` as an automatic
  fallback in dry runs). `generate` refuses to send or upload anything voiced this way. It exists
  because the build sandbox could not reach huggingface.co; on a normal machine Kokoro is used.

## Content safety

- Banned words are split into **`banned`** (matched everywhere as whole words) and
  **`bannedInExperiment`** (hazards such as fire, stove, electricity, scissors, hot, road). The
  explanation of "how does a light switch work" may say *electricity*; the experiment may not.
- The "ask a grown-up" requirement is triggered by handling words (pour, fill, cup, water,
  spoon, tape, …) and satisfied only by a literal "ask a grown-up" / "with a grown-up" phrase.
- Statistics, studies, "scientists say", percentages, URLs, app/website mentions and engagement
  bait are regex-checked in code, independent of the LLM reviewer.
- `containsSyntheticMedia` defaults to **true**. Bolt is obviously a cartoon, but the narration is
  synthetic; disclosing is honest and costs nothing. It is a config switch.

## Topics and scheduling

- `data/topics.json` has 370 questions (≥ 365 required) in 10 categories, 77 at difficulty 1.
  The picker never repeats, never uses the same category twice in a row, prefers difficulty 1
  for the first 30 picks and then balances toward the least-used categories.
- One draft per calendar day in the channel timezone; `generate` exits early if today already has
  a non-rejected draft (`--force` overrides). `/redo` re-queues a topic for the next run.
- Uploads are scheduled at `uploadTime` in `timezone`, one per day, never within 30 minutes of
  now, skipping days already taken (`src/publish/schedule.ts`, DST-tested).
- Weekly compilation: ISO week Monday–Sunday in the channel timezone, run Sunday 03:00 UTC,
  requires `weeklyMinApproved` (5) approved/uploaded Shorts dated in that week, once per week key.

## Storage and workflows

- Drafts live as assets on a **prerelease** tagged `draft-<date>` (`weekly-<ISO week>` for
  compilations). The publish job downloads the asset via the API URL, so this also works if the
  repo is private.
- `data/state.json` is committed back with `[skip ci]` through `scripts/commit-state.sh`
  (rebase + retry ×5). All three workflows share the `bolt-state` concurrency group.
- The repo is assumed public; secrets only come from GitHub Secrets/`.env`, and the logger
  redacts any secret value that appears in a message.

## Enhancements beyond the spec (added after the tool evaluation)

- **Guess beat.** `script.guess` (optional) adds a spoken prompt after the hook and a 2.6 s pause
  with three answer bubbles; the answer section opens with a 1.4 s reveal. Timing constants:
  `GUESS_PAUSE_MS`, `REVEAL_FRAMES` in `remotion/schema.ts`. The validator includes the pause in
  its length estimate, so scripts stay under 58 s. Scripts without `guess` render exactly as before.
- **Cross-provider review.** `completeJson(..., { avoidProvider })` reorders the provider chain so
  the reviewer runs on a different model than the writer when possible (logged as "independent
  of writer").
- **Chimes.** `src/audio/sfx.ts` synthesises a quiet bell (wow fact) and pop (reveal) into
  `public/sfx/` on first use; both are placed with `<Sequence>` + `<Audio>` in `Episode.tsx`.
- **External generators** (ZSky, InVideo, Pictory, D-ID, Steve AI) were evaluated and rejected
  for the core pipeline — see `docs/TOOL_EVALUATION.md`.

## Not done / known limitations

- Hindi is prepared in config, prompt registry and font stack but **not implemented**; kokoro-js
  has no Hindi voice (see `docs/HINDI.md`).
- Remotion's `@remotion/captions` is used only for the `Caption` type; caption paging is our own
  (per section, ≤ 4 words / 22 chars per page) to keep sections from bleeding into each other.
- Rendering speed: ~1.5–3× realtime on a 4-core runner (a Short takes 3–6 minutes, the weekly
  video 20–35 minutes). `weekly.yml` has a 90-minute timeout.
- `thumbnails.set` needs a phone-verified channel; failure is logged, not fatal.
