# External AI video tools — evaluated against this project

Evaluated on 2026-09-16: **ZSky AI, InVideo AI, Pictory, D-ID, Steve AI.** The question was
whether any of them makes the pipeline "more worth it" or "more accurate". The answer for the
core pipeline is **no**, for three hard reasons, plus one narrow optional use.

## The three constraints they all collide with

1. **₹0/month.** Every one of these is a paid SaaS. Their free tiers are watermarked and/or
   capped far below one video per day.
2. **One hand-built, identical character.** The spec forbids AI image/video generators for Bolt.
   Generative tools cannot reproduce the same character frame after frame; consistency is what
   makes the channel recognisable and is exactly what YouTube's "inauthentic content" policy
   rewards.
3. **YouTube monetisation.** YouTube demonetises "mass-produced, repetitive, inauthentic" AI
   content. Stock-footage/template generators produce the look YouTube is now filtering out.
   Everything here is original: our own SVG character, our own scripts, our own generated music,
   a human approving each video.

## Tool by tool

| Tool | What it is | Free tier (as advertised, Sep 2026) | Fit for Bolt | Verdict |
| --- | --- | --- | --- | --- |
| **ZSky AI** (zsky.ai) | Web text/image-to-video generator (≈8 s cinematic clips, up to 1080p), ad-supported "free forever" tier with a wordmark plate; paid removes it | Free with watermark plate | Generic generative clips; cannot keep Bolt consistent; kids'-safety of generated footage unreviewable; adds a third-party brand to every frame | **No** |
| **InVideo AI** | Prompt-to-video with stock footage + AI voices | 2 video-minutes/week, 1 AI credit, 4 watermarked exports/week; Plus ≈ $25/mo | Stock-footage look is the opposite of a consistent original character; watermark on free; voice/captions are things we already do locally | **No** |
| **Pictory** | Script/article → stock-footage video | 14-day trial (15 min, 720p), then $29+/mo | Same as InVideo; trial only | **No** |
| **D-ID** | Talking-head avatars / photo animation, API | 14-day trial, 3 min, full-screen watermark; Lite $5.9/mo with watermark; API needs Pro ≈ $48/mo (100 calls) | Realistic talking heads are the wrong register for ages 5–9 and trigger the synthetic-media disclosure more aggressively; our lip sync is already audio-driven and free | **No** |
| **Steve AI** | Template animation/GenAI video maker | Free plan is watermarked with limited downloads; Starter $19/mo | Closest in spirit (animation), but template characters are shared with thousands of other channels; no code-level control of layout/safe zones/captions | **No** |

Sources: InVideo pricing/free plan ([creatify](https://creatify.ai/blog/invideo-pricing-(2026)-plans-credits-and-what-you-ll-actually-pay), [fluxnote](https://fluxnote.io/guides/invideo-ai-free-2026)); Pictory ([saasworthy](https://www.saasworthy.com/product/pictory-ai/pricing), [aiblogfirst](https://aiblogfirst.com/pictory-ai-free-trial/)); D-ID ([heyfish](https://heyfish.ai/d-id-review), [top50aitools](https://top50aitools.com/pricing/d-id)); Steve AI ([steve.ai pricing](https://app.steve.ai/pricing), [capterra](https://www.capterra.com/p/253410/Steve-AI/pricing/)); ZSky ([zsky.ai](https://zsky.ai/), [review](https://www.aitools-directory.com/blog/zsky-ai-review-2026/)).

## The one narrow optional use

**Topic B-roll for the weekly video's chapter cards** (e.g. a 6-second clip of clouds for "Why does
it rain?") could come from a generator like ZSky. It is optional, must be reviewed by you like
everything else, and should never replace Bolt. It is *not* wired in, because (a) a wordmark
appears on free output, (b) it makes the YouTube synthetic-media disclosure unambiguous for
realistic footage, and (c) the calm SVG backgrounds already carry the topic. If you ever want it:
render the clip, drop it in `public/broll/<topicId>.mp4`, and add an `<OffthreadVideo>` layer to
`remotion/compositions/LongVideo.tsx`'s chapter `Card`.

## What we did instead to make the videos more worth watching and more accurate

Implemented in this repo (see `docs/PROOF.md` for renders):

1. **"What do you think?" guess beat** — after Bolt asks the question, three big answer bubbles
   appear for a couple of seconds and the right one pops when the answer starts. Predict-then-learn
   is a well-known way to make young children remember an explanation, it invites real comments
   ("I guessed B!") without any engagement bait, and nobody else's template does it with a
   consistent character.
2. **Cross-provider fact check** — when both Gemini and Groq keys exist, the reviewer pass runs on
   a *different* model than the writer, so a single model's blind spot is less likely to pass.
3. **Soft chimes** — a synthesised two-note bell when the antenna lights up for the wow fact and
   a gentle pop on the guess reveal, both generated in code (royalty-free, quiet, no startle).
4. **Deterministic safety validator** and **human approval** stay the last gates.
