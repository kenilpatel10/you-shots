# Personas and brand kits — one pipeline, any channel

A **persona** is a complete channel definition: character, audience, tone, section guide, topic
bank, word lists, colours/logo, YouTube identity per language. The default persona is
`bolt-pip` (`config/channel.json`); every other one is `config/personas/<id>.json` with the same
schema. A **channel** is `persona/lang`, e.g. `ncert-science/hi`.

## Shipped personas

| Persona | Audience | Languages | What it is |
| --- | --- | --- | --- |
| `bolt-pip` | kids (made for kids) | en, hi | The original: one "why" a day with Bolt & Pip |
| `ncert-science` | general (students 11–16, parents, teachers) | hi, en | One NCERT class 6–10 science concept a day with an **exam tip** beat; full ads |
| `demo-coaching` | general | hi, en | Brand-kit example for the video service: a client's colours, logo and name on the same show |

## Fields a persona adds (all optional, with defaults)

```jsonc
{
  "audience": "general",                 // kids | general → made-for-kids flag, safety rules, word list
  "audienceDescription": "school students aged 11–16 …",
  "characterBio": "a small, friendly, round robot who …",
  "characterVoice": "in first person, clearly and cheerfully …",
  "experimentGuide": "one exam tip: … Start with \"Exam tip!\"",   // what section 4 is
  "extraRules": ["Stay within NCERT …"],   // appended to the writer's rules
  "topicsFile": "data/personas/ncert-science/topics.json",
  "fallbackDir": "data/personas/ncert-science/fallback-scripts",
  "bannedWordsFile": "config/banned-words-general.json",
  "brand": { "primary": "#2FA36B", "accent": "#FFB627", "logo": "brands/acme/logo.svg" }
}
```

`brand.primary` recolours the character's body and the section labels; `brand.logo` (a file under
`public/`) appears above the progress bar. Per-language `labels.experiment` names section 4 on
screen ("Exam tip" / "परीक्षा टिप").

## Running a persona

```bash
CHANNEL=ncert-science/hi npm run generate -- --dry-run          # local proof render
CHANNEL=demo-coaching/hi npm run generate -- --dry-run --script client-script.json   # client script
npm run auth:youtube -- --persona ncert-science --language hi     # → YOUTUBE_REFRESH_TOKEN_NCERT_SCIENCE_HI
CHANNELS='["bolt-pip/en","ncert-science/hi"]' npm run branding    # avatar/banner/about per channel
```

On GitHub Actions the repository variable **`CHANNELS`** (JSON array of `persona/lang`) drives the
daily and weekly matrix, one job per channel, e.g. `["bolt-pip/en","bolt-pip/hi","ncert-science/hi"]`.
`CHANNEL_LANGUAGES` keeps working for the default persona. Each non-default channel needs its own
secret `YOUTUBE_REFRESH_TOKEN_<PERSONA>_<LANG>` (upper-case, `-` → `_`) referenced in
`.github/workflows/publish.yml`. Uploads are never sent with another channel's token.

State keeps topic history per channel (`data/state.json → perChannel["persona/lang"]`); draft ids
and release tags carry the channel (`short-2026-09-19-ncert-science-hi-c8-comb-01`).

## Making a client brand kit (the video service)

1. Copy `config/personas/demo-coaching.json` to `config/personas/<client>.json`; set name, handle,
   colours, `brand.logo` (put the file in `public/brands/<client>/`), languages, catchphrase.
2. Either give it a `topicsFile` of questions, or render their scripts directly with `--script`.
3. `CHANNEL=<client>/hi npm run generate -- --dry-run` → `out/dryrun-<client>-hi-…/short.mp4`.
4. Approve on Telegram like any draft, or hand over the MP4 and the Release link.

## Guardrails

- Every persona keeps the human approval step, the fact-check reviewer and the deterministic
  validator. `audience: general` swaps the kids' word list for a profanity/adult list and drops
  the "ask a grown-up" rule; it does not drop the no-advice, no-brands, no-bait rules.
- YouTube's inauthentic-content policy targets templated mass output: keep one video per channel
  per day, keep the human review, and never post the same video to two channels.
