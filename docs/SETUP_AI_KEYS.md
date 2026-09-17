# AI keys (free tiers)

Scripts are written by Gemini (primary) with Groq as a fallback. Both have free tiers that are
far above what one Short per day needs (two calls: writer + reviewer, occasionally a rewrite).

Without any key the pipeline still works: it uses the 14 hand-checked scripts in
`data/fallback-scripts/` (each once) and tells you on Telegram that it did.

## Gemini (Google AI Studio)

1. Go to <https://aistudio.google.com/apikey> and sign in with a Google account.
2. **Create API key** (choose or create a project; the default is fine).
3. Copy it into `GEMINI_API_KEY`.
4. Optional: set `GEMINI_MODEL` (default `gemini-3.6-flash`; `gemini-2.5-flash` is no longer offered to new keys). Any model listed as available on
   the free tier in AI Studio works; flash models are fast and cheap. Check the current list in
   AI Studio's model picker — names change over time.

Keep the AI Studio project **without billing enabled**: then it cannot cost anything. Free-tier
rate limits (requests per minute/day) are documented on <https://ai.google.dev/gemini-api/docs/rate-limits>;
the pipeline retries on `429` with backoff and falls back to Groq if Gemini keeps refusing.

## Groq

1. Go to <https://console.groq.com/keys>, sign up, **Create API Key**.
2. Copy it into `GROQ_API_KEY`.
3. Optional: `GROQ_MODEL` (default `llama-3.3-70b-versatile`). See
   <https://console.groq.com/docs/models> for current production models.

## Where to put them

- Locally: `.env`.
- GitHub Actions: repository **Settings → Secrets and variables → Actions**:
  secrets `GEMINI_API_KEY`, `GROQ_API_KEY`; optional *variables* (not secrets) `GEMINI_MODEL`,
  `GROQ_MODEL`, `CHANNEL_LANGUAGE`.

## Test

```bash
npm run generate -- --dry-run --skip-render
```

The log shows `Writing script for "…"`, the reviewer verdict and the validator result. The
script lands in `out/dryrun-<date>-<topic>/script.json`.
