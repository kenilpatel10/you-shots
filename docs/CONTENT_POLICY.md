# Content policy (review checklist)

Use this when you review a draft on Telegram. The pipeline enforces most of it in code
(`src/content/validate.ts`) and in the reviewer prompt, but **you are the last gate**.

## Every Short must

- [ ] Be **true**. Simplified is fine; wrong is not. If unsure, `/reject` and check.
- [ ] Use words a 6-year-old understands and one concrete comparison.
- [ ] Follow the fixed structure: hook → answer → wow fact → experiment → sign-off.
- [ ] Be 45–58 seconds (hard maximum 59 s, enforced).
- [ ] Sound like Bolt: curious, kind, a little clumsy, never sarcastic, never talking down.

## Never

- [ ] Scary, violent, gross-out, romantic, or religious content.
- [ ] Real living people, brands, products, apps, websites, social media, "go online".
- [ ] Invented statistics, studies, quotes, or "scientists say".
- [ ] Telling children to contact anyone or share anything.
- [ ] Engagement bait: "watch till the end", "subscribe", "like", fake cliffhangers.
- [ ] More than one Short per day, or a repeated topic (enforced by `data/state.json`).

## Experiments must

- [ ] Use only everyday, harmless items (water, salt, sugar, paper, spoon, cup, string, tape,
      ball, blanket, mirror, torch…).
- [ ] Contain **no** heat, flames, stoves, electricity, batteries, sharp objects, chemicals,
      medicines, roads, heights, or water bodies. (Word list: `config/banned-words.json` →
      `bannedInExperiment`.)
- [ ] Put nothing in or near the mouth, eyes, ears or nose; nothing to eat or taste.
- [ ] Say **"ask a grown-up to help"** whenever anything is poured, filled or handled
      (enforced), and the video shows the "Ask a grown-up" badge.

## Why this matters for the channel

YouTube demonetises and may remove "mass-produced, repetitive, inauthentic" content. This
project is designed the opposite way: one consistent hand-built character, one script a day,
varied topics with no repeats, an independent review pass, deterministic safety checks, and a
human approval before anything is public. Keep it that way — do not raise `maxShortsPerDay`.
