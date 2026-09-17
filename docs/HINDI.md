# Hindi (implemented, own channel) and adding other languages

**Status: Hindi runs as a second channel from the same repo.** Set the repository variable
`CHANNEL_LANGUAGES=["en","hi"]` and add the secret `YOUTUBE_REFRESH_TOKEN_HI`
(`docs/SETUP_YOUTUBE.md → 6`): the daily and weekly workflows then run one job per language,
each draft is labelled with its channel in Telegram, and uploads go to the Hindi channel's token
only. What is in place:

| Concern | Where | hi |
| --- | --- | --- |
| Channel name, handle, tags | `config/channel.json → languages.hi.channelName / handle / shortTags / longTags` | ✅ |
| Catchphrase, "बड़ों से मदद लो", feeling labels, weekly titles, font | `config/channel.json → languages.hi` | ✅ |
| Writer / reviewer prompts | `src/content/prompts/hi.ts` (English instructions, Hindi output rules) | ✅ |
| Banned / hazard / handling words in Hindi | `config/banned-words.json` | ✅ |
| Devanagari font | Baloo 2 (OFL) in `public/fonts/`, loaded next to Fredoka | ✅ |
| Hand-written fallback scripts | `data/fallback-scripts/hi/` (2, validator-tested) | ✅ |
| **Voice** | **Gemini TTS** (`src/audio/geminiTts.ts`, engine `gemini`, voice `Leda`, free tier) | ✅ default |
| Offline voice | eSpeak-NG `hi+f3` via `text2wav` (robotic but clear) — `--voice espeak` or `ALLOW_FALLBACK_VOICE=1` | ✅ fallback |
| Word timings | whisper `base` multilingual, `language: hi`; estimated timings if the model is unavailable | ✅ config |
| Topic history, redo list, weekly keys | `data/state.json → perLanguage.hi` (separate from English) | ✅ |
| Topics | `data/topics.json` questions are English; the LLM writes the Hindi script from them | ✅ |

### Why Gemini TTS for Hindi

kokoro-js only ships English voices (its phonemizer is English-only), and the Hindi Piper/MMS
voices need a native runtime. The Gemini API's TTS models (`gemini-3.1-flash-tts-preview`, fallback
`gemini-2.5-flash-preview-tts`) speak Hindi naturally, return 24 kHz PCM, and sit inside the same
free tier already used for scripts: five requests per Short. The delivery style lives in
`languages.hi.voice.style`; change the voice with `voiceId` (`Leda`, `Kore`, `Aoede`, `Zephyr`, …).
The free tier allows about 10 TTS requests per day **per model**; a Short needs 5, so the engine
walks `GEMINI_TTS_MODELS` (three models by default) and skips any whose day is spent.

---

## Adding another language

Everything language-specific is keyed by `CHANNEL_LANGUAGE` / `config/channel.json → language`:

| Concern | Where | Status for `hi` |
| --- | --- | --- |
| Catchphrase, "ask a grown-up" text, weekly titles, font | `config/channel.json → languages.hi` | add an entry |
| Writer / reviewer prompts | `src/content/prompts/hi.ts`, registered in `src/content/prompts/index.ts` | write them (copy `en.ts`; keep the JSON contract identical) |
| Banned words | `config/banned-words.json` | add Hindi entries (Devanagari and romanised) |
| Topics | `data/topics.json` (`question` text) | translate, or add a `question_hi` field and adapt the picker |
| Fallback scripts | `data/fallback-scripts/*.json` | write Hindi ones (validator word counts are language-agnostic) |
| Voice | `src/audio/tts.ts` | **needs a new engine — see below** |
| Word timings | `config/channel.json → languages.hi.whisper` | use a multilingual model: `{ "model": "base", "language": "hi" }` (not `base.en`) |
| Font | `remotion/fonts.ts`, `public/fonts/` | add a Devanagari font such as **Baloo 2** or **Noto Sans Devanagari** (OFL) and put it first in `theme.fonts.family` when `language === "hi"` |
| Captions | `remotion/components/Captions.tsx` | paging is by word/character count and works for Devanagari; check 4-word pages still fit at 60 px |

## Voice: why Hindi uses eSpeak by default (and how to get a natural voice)

Researched at build time (kokoro-js 1.2.1): the `VOICES` table only contains American (`af_*`,
`am_*`) and British (`bf_*`, `bm_*`) English voices, and the phonemizer it bundles is English-only
(`en-us` / `en`). The underlying Kokoro-82M **model** does have Hindi voices (`hf_alpha`,
`hf_beta`, `hm_omega`, `hm_psi`) in the Python package, which uses `misaki`'s Hindi G2P — that
part has not been ported to JavaScript. So Hindi cannot be produced with kokoro-js today.

### Free alternative: Piper TTS (Hindi voices)

[Piper](https://github.com/rhasspy/piper) is an open-source (MIT) neural TTS with ONNX voices.
Free Hindi voices exist on Hugging Face under `rhasspy/piper-voices`:

- `hi_IN-pratham-medium`
- `hi_IN-priyamvada-medium`

Two ways to run it without Python:

1. **`sherpa-onnx` Node bindings** (`npm i sherpa-onnx-node`) can load Piper VITS voices
   (`vits-piper-hi_IN-…` bundles from the sherpa-onnx releases) and synthesise to 22.05 kHz PCM
   in-process — the same shape as our `PcmAudio` type.
2. The **piper binary** (prebuilt for Linux/macOS/Windows on the GitHub releases page) called via
   `child_process`, reading the sentence from stdin and writing a WAV.

Implementation sketch (not built):

```ts
// src/audio/engines/piper.ts
export async function synthesizePiper(text: string, voice: string): Promise<PcmAudio> { … }
```

- Add `"engine": "piper"` to the `voice` schema in `src/config.ts` and branch in
  `src/audio/tts.ts` on `lang.voice.engine`.
- Cache the voice `.onnx` + `.json` in `.cache/piper` and add an `actions/cache` step.
- Resample Piper's 22 050 Hz output to 24 000 Hz with `resample()` so mixing stays uniform.

Everything downstream (mixing, whisper timings with a multilingual model, lip sync, captions,
render, Telegram, YouTube `defaultAudioLanguage: "hi"`) already works from `PcmAudio`.
