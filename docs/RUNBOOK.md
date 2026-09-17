# Runbook — operating Bolt & Pip day to day

Everything runs on GitHub Actions. Your only recurring job is to answer one Telegram message a day.

## The daily loop

| When (IST) | What happens | What you do |
| --- | --- | --- |
| 07:00 | **Generate daily Short** writes, voices, renders and sends a draft to Telegram (about 10–15 min). | Watch it with sound. Reply `/approve`, `/redo` (new topic) or `/reject` (skip today). |
| every hour at :15 | **Publish approved drafts** reads your reply, uploads approved drafts to YouTube (private, made for kids) and confirms with the link. | Nothing. |
| next day 17:00 | YouTube flips the scheduled video to public. | Nothing. |
| Sunday 08:30 | **Weekly compilation** stitches the week's approved Shorts and sends it for the same review. | `/approve` or `/reject`. |
| +48 h unreviewed | Reminder in Telegram. | Reply. |

Other commands: `/status` (pipeline state), `/help`.

## Where things live

- **Drafts**: GitHub Releases, one per day (`draft-YYYY-MM-DD`): video, script, voice, props.
- **State**: `data/state.json`, committed by the bot after every run (`[skip ci]` commits).
- **Logs**: repository → Actions → the run. Failures also arrive in Telegram with the run link.
- **Secrets**: Settings → Secrets and variables → Actions → *Repository* secrets (not environment).

## Manual runs

Actions → workflow → **Run workflow** (branch: default). Useful when:

- you want a second draft today: run *Generate daily Short* with **dryRun = false** after `/reject`ing the first;
- you sent `/approve` and don't want to wait for :15: run *Publish approved drafts*;
- you want to preview without Telegram/YouTube: *Generate daily Short* with **dryRun = true** (the MP4 lands in the run's artifacts).

## Checks you can run locally

```bash
npm run auth:youtube -- --whoami   # which channel the stored token uploads to
npm test && npm run typecheck      # before changing code
npm run generate -- --dry-run      # full local render (needs Hugging Face access for the voice)
```

## When something goes wrong

| Symptom | Cause | Fix |
| --- | --- | --- |
| Telegram alert "generate failed" with `429` or `RESOURCE_EXHAUSTED` | Gemini free-tier quota | Wait for the daily reset; or add `GROQ_API_KEY` so the writer falls over to Groq. Without any key the run uses a hand-written fallback script. |
| Alert with `invalid_grant` | YouTube token revoked/expired | `npm run auth:youtube` (pick the brand channel), update the `YOUTUBE_REFRESH_TOKEN` secret. |
| Upload went to the wrong channel | Token issued for the personal channel | Same as above; confirm with `--whoami`. Delete the wrong video in YouTube Studio. |
| `quotaExceeded` from YouTube | 10 000 units/day, an upload costs 1 600 | Nothing; the draft stays *approved* and uploads on a later hourly run. |
| Run "succeeds" in seconds and no draft appears | A stalled promise (fixed: CLIs now fail loudly) | Open the run log; the last line names the stage. |
| Telegram video missing, only text arrives | File over 50 MB | Shorts are ~12 MB; the weekly video is sent at 720p to stay under the limit. The link to the Release is always included. |
| No draft today | A draft already exists for the date (`/status` shows it) | `/reject` it, then run *Generate* manually, or wait for tomorrow. |

## Changing the show

All tuning is in `config/channel.json` (voice speed, upload time, catchphrase, labels, tags) and
`config/topics.json` (the 370 questions). Change, commit, push; the next run picks it up.
Scenes and the characters live in `remotion/`; `npm run preview` opens Remotion Studio.

## Monthly budget (free tier)

| Resource | Used per month | Free allowance |
| --- | --- | --- |
| GitHub Actions minutes | ~450 (generate) + ~360 (publish polling) + ~60 (weekly) ≈ 870 | 2 000 (private) / unlimited (public repo) |
| Gemini requests | ~90 (writer + reviewer + occasional rewrite) | 1 500/day on the free tier |
| YouTube API units | ~50 000 | 300 000 |
| Storage | ~15 MB per draft on Releases | effectively unlimited |
