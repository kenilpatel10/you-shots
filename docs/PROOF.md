# Proof of output

Generated 2026-09-17T05:49:17.165Z by `npm run proof` from the files in `out/`. Everything below was measured or extracted from the actual rendered MP4s — nothing is mocked.

> Voice note: renders made in an environment without Hugging Face access use the bundled **eSpeak-NG** voice (`voice=espeak` in the log) — real, intelligible speech with a robotic timbre. On your machine or GitHub Actions the natural **Kokoro** voice is used, and `generate` refuses to publish audio that does not come from the configured engine.

## Short — en (1080×1920)

```
codec_name=h264
codec_type=video
width=1080
height=1920
r_frame_rate=30/1
codec_name=aac
codec_type=audio
sample_rate=48000
channels=2
r_frame_rate=0/0
duration=53.482667
size=12623118
```

- Title: **Why is the sky blue?** · sections: hook 5.588s, answer 18.0s, wow 9.7s, experiment 11.5s, sign-off 1.9s · total 53.4s (hard max 59s)
- Captions source: estimated; guess beat: 2.8s pause

Measured loudness (voice vs. music-only gaps — music is ducked under speech):

- speech: 1.1–3.1 s: -23.0 dBFS
- gap after hook (music only): 6.5–6.9 s: -47.9 dBFS
- speech: 10.3–12.3 s: -21.2 dBFS
- sign-off tail (music only, fading): 51.8–53.2 s: -52.9 dBFS

| Beat | Time | Frame |
| --- | --- | --- |
| hook | 2.0s | ![hook](images/proof/short-en-hook.png) |
| guess bubbles | 7.7s | ![guess bubbles](images/proof/short-en-guess-bubbles.png) |
| reveal | 10.0s | ![reveal](images/proof/short-en-reveal.png) |
| answer | 13.3s | ![answer](images/proof/short-en-answer.png) |
| wow fact (antenna glow) | 29.7s | ![wow fact (antenna glow)](images/proof/short-en-wow-fact-antenna-glow-.png) |
| experiment (badge) | 39.7s | ![experiment (badge)](images/proof/short-en-experiment-badge-.png) |
| sign-off (channel name) | 52.8s | ![sign-off (channel name)](images/proof/short-en-sign-off-channel-name-.png) |

Eight consecutive frames (1/30 s apart) during speech — the mouth follows the syllables:

![m0](images/proof/short-en-mouth-0.png) ![m1](images/proof/short-en-mouth-1.png) ![m2](images/proof/short-en-mouth-2.png) ![m3](images/proof/short-en-mouth-3.png) ![m4](images/proof/short-en-mouth-4.png) ![m5](images/proof/short-en-mouth-5.png) ![m6](images/proof/short-en-mouth-6.png) ![m7](images/proof/short-en-mouth-7.png)

## Short — hi (1080×1920)

```
codec_name=h264
codec_type=video
width=1080
height=1920
r_frame_rate=30/1
codec_name=aac
codec_type=audio
sample_rate=48000
channels=2
r_frame_rate=0/0
duration=53.482667
size=12499389
```

- Title: **आसमान नीला क्यों है?** · sections: hook 6.567s, answer 17.9s, wow 10.3s, experiment 10.4s, sign-off 1.6s · total 53.4s (hard max 59s)
- Captions source: estimated; guess beat: 2.8s pause

Measured loudness (voice vs. music-only gaps — music is ducked under speech):

- speech: 1.1–3.1 s: -21.7 dBFS
- gap after hook (music only): 7.5–7.9 s: -46.6 dBFS
- speech: 11.3–13.3 s: -22.2 dBFS
- sign-off tail (music only, fading): 51.8–53.2 s: -52.9 dBFS

| Beat | Time | Frame |
| --- | --- | --- |
| hook | 2.0s | ![hook](images/proof/short-hi-hook.png) |
| guess bubbles | 8.7s | ![guess bubbles](images/proof/short-hi-guess-bubbles.png) |
| reveal | 11.0s | ![reveal](images/proof/short-hi-reveal.png) |
| answer | 14.3s | ![answer](images/proof/short-hi-answer.png) |
| wow fact (antenna glow) | 30.5s | ![wow fact (antenna glow)](images/proof/short-hi-wow-fact-antenna-glow-.png) |
| experiment (badge) | 41.1s | ![experiment (badge)](images/proof/short-hi-experiment-badge-.png) |
| sign-off (channel name) | 52.8s | ![sign-off (channel name)](images/proof/short-hi-sign-off-channel-name-.png) |

Eight consecutive frames (1/30 s apart) during speech — the mouth follows the syllables:

![m0](images/proof/short-hi-mouth-0.png) ![m1](images/proof/short-hi-mouth-1.png) ![m2](images/proof/short-hi-mouth-2.png) ![m3](images/proof/short-hi-mouth-3.png) ![m4](images/proof/short-hi-mouth-4.png) ![m5](images/proof/short-hi-mouth-5.png) ![m6](images/proof/short-hi-mouth-6.png) ![m7](images/proof/short-hi-mouth-7.png)

## Weekly compilation (1920×1080)

```
codec_name=h264
codec_type=video
width=1920
height=1080
r_frame_rate=30/1
codec_name=aac
codec_type=audio
sample_rate=48000
channels=2
r_frame_rate=0/0
duration=284.821333
size=55577417
```

Chapters written into the YouTube description:

```
00:00 Why is the sky blue?
00:58 Why do cats purr?
01:55 Why does the Moon change shape?
02:50 Why do we yawn?
03:44 Why does it rain?
```

| Beat | Time | Frame |
| --- | --- | --- |
| intro | 1.5s | ![intro](images/proof/long-intro.png) |
| chapter card | 3.5s | ![chapter card](images/proof/long-chapter-card.png) |
| episode 1 | 12.0s | ![episode 1](images/proof/long-episode-1.png) |
| episode 2 (hook) | 63.0s | ![episode 2 (hook)](images/proof/long-episode-2-hook-.png) |
| outro | 282.8s | ![outro](images/proof/long-outro.png) |

Thumbnail (1280×720):

![thumbnail](images/proof/long-thumbnail.png)

## Design sheet (Bolt + Pip)

![Bolt design sheet](images/bolt-showcase.png)

## Checks

- `npm test` (unit tests: picker, validator, aligner, state, scheduling, Telegram commands, captions, chapters)
- `npm run typecheck`, `npm run lint`
- `npx remotion compositions remotion/index.ts` lists Short, LongVideo, Thumbnail, BoltShowcase

