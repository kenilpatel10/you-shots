# Background music

By default the pipeline generates its own gentle, original music loop
(`public/music/bolt-theme-generated.wav`, created on first run by `src/audio/music.ts`) so the
project ships fully royalty-free with no downloads.

To use a real track instead:

1. Open the **YouTube Audio Library** (YouTube Studio → Audio Library). Only use tracks from
   there — they are free to use in YouTube videos. Filter by *Attribution not required* to avoid
   having to credit anyone, or note the credit in `description` if attribution is required.
2. Pick something calm, mid-tempo, without vocals.
3. Save it as `public/music/bolt-theme.mp3` (the path in `config/channel.json → music.file`).
   `public/music/*.mp3|wav` is git-ignored: keep the file out of the repo and add it on each
   machine, or commit it deliberately if the licence allows.
4. Volume and ducking are in `config/channel.json → music` (`volume`, `duckedVolume`).

Do **not** use music from anywhere else: a copyright claim on a kids' channel is not worth it.
