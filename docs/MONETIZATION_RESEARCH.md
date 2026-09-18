# Where this pipeline can earn — research memo (September 2026)

The pipeline (script → review → voice → captions → animated character → approval → upload, any
language, ₹0 marginal cost, one video per channel per day) is the asset. This memo scores the
ways to turn it into income, with sources, and recommends a plan.

## 1. Facts that decide everything

| Fact | Number | Why it matters |
| --- | --- | --- |
| YouTube Partner Program (YPP) threshold | 1,000 subs + 4,000 watch hours/yr **or** 10M Shorts views/90 days; doubles to 8,000 h / 20M from Feb 2027 | Long videos (weekly compilations) are the realistic route; Shorts views and watch hours never combine |
| Shorts RPM in India | ₹5–₹30 per 1,000 views; finance/tech Shorts globally $0.15–0.45 | Shorts alone don't pay; they are the discovery engine for long videos and offers |
| Long-form RPM in India | education ₹40–120, finance ₹80–250, average ₹50–200 | Long-form in a high-value niche is where ad money is |
| US/UK/AU audience vs India | 10–15× higher CPM on identical content | An English channel that attracts Western viewers changes the maths |
| "Made for kids" | only contextual ads, no comments/notifications/memberships; ~$0.25–0.35 CPM, ~$350 per 1M views | Bolt & Pip kids channels are a brand, not the money engine |
| Facebook/Instagram Reels (India) | ₹200–800 per 1M views under Meta's Content Monetization Program | Free extra distribution, small money |
| Affiliates (India) | demat ₹100–300/account, credit cards up to ₹4,000/card, SaaS 20–50% recurring | Finance/tech niches earn more from links than from ads |
| YouTube "inauthentic content" policy (July 2025, enforced channel-level; 16 channels / 35M subs terminated Jan 2026) | Mass-produced, templated AI videos are demonetised; original scripts, characters, curation and a consistent style stay eligible | **Our daily, templated output is exactly the pattern being policed. Human review, original cast, humour and per-video originality are not optional.** |
| YouTube auto-dubbing (all creators, 27 languages, Feb 2026) | Any video enters each language's recommendation pool | Reduces the edge of "just translate"; native scripts, on-screen text and cultural examples keep the edge |
| Regional India | regional languages = 55%+ of consumption; Hindi is the crowded market; Tamil/Telugu/Bengali/Marathi have demand and fewer quality creators | Cheap for us: one config entry + one channel token per language |
| Fastest-growing niches in India 2026 | personal finance (+180%), AI tools/tech (+160%), health (+140%); "science explained humorously" +16× globally | Where attention is moving |
| Explainer video prices | India studios ₹40k–1.2L per minute; Fiverr $170–400 per 60 s; SMEs spend ₹15–50k/month on digital; coaching institutes need a constant stream of mother-tongue reels | A service priced at ₹2–8k per video undercuts everyone and still has ~100% margin |
| NCERT/edtech | schools and edtech buy animated, curriculum-mapped Hindi/regional science content (iDream: 25,000+ classrooms; Muskaan Dreams; LearnoHub 7,000 free videos) | Curriculum content is evergreen, searchable and licensable |

## 2. Options scored

Scores 1–5 (5 = best). "Uniqueness" = how few others can do the same thing with the same quality and cost.

| Option | Time to first ₹ | Size of prize | Uniqueness | Pipeline fit | Risk | Total |
| --- | --- | --- | --- | --- | --- | --- |
| A. Keep Bolt & Pip kids channels (EN + HI) | 5 | 1 | 4 | 5 | 2 (kids RPM) | 17 |
| B. **Video-as-a-service** for coaching institutes / clinics / local brands (brand-kit mascot, mother-tongue reels, subscription) | 5 (this week) | 3 | 4 | 4 (needs brand-kit + delivery) | 2 (needs selling) | **18** |
| C. **English adult "science, funny" channel** aimed at US/UK viewers | 2 | 5 | 3 | 5 (English voice is our best) | 3 (competition, slow start) | **18** |
| D. Hindi personal-finance mascot (+ affiliates) | 2 | 4 | 2 (FinnovationZ etc. exist) | 4 | 4 (YMYL, SEBI finfluencer rules) | 16 |
| E. Sarkari Yojana / government-scheme explainers (Hindi + regional) | 2 | 3 | 3 | 4 | 3 (accuracy, eligibility changes) | 15 |
| F. **NCERT science in 60 s** (classes 6–10, Hindi + 2 regional, general audience, exam tip) | 2 | 4 | 4 | 5 (we already do science explainers) | 2 | **19** |
| G. Regional-language replication of any of the above | 1 (multiplier) | 4 | 4 | 5 | 1 | multiplier |

## 3. Recommendation: the "unique fit"

**Our edge is not any single niche. It is that an experiment costs ₹0 and 15 minutes a day.**
Big studios can't run three channels for two months to see which one grows; we can. So:

### Track 1 — money now: "explainer reels as a subscription" (option B)
- Offer: a branded mascot (their colours/logo, our animation), 8 vertical explainers a month in the
  client's language(s), approved on Telegram exactly like our own drafts, delivered as download links.
- Price: ₹4,999/month for 8 videos (≈₹625 each) or ₹1,999 per single video. India studios charge
  ₹40k+ per minute; Fiverr $170–400 per video. Ten clients ≈ ₹50k/month for ~2 hours of review a day.
- First customers: coaching institutes (they need constant Tier-2/3 mother-tongue reels), clinics,
  CA firms, local schools. The Bolt & Pip channels are the live demo.
- Pipeline work: a **persona/brand-kit layer** (name, colours, logo, character variant, voice, language,
  "not for kids" upload mode), client scripts via `--script` or their bullet points → writer, and a
  per-client output folder/Release. About two days.

### Track 2 — the channel with the best odds: "NCERT science in 60 seconds" (option F)
- A new general-audience channel (not "made for kids": the audience is students 11–16, parents and
  teachers, so full ads, comments and notifications apply). Bolt-style mascot, humour, one concept per
  chapter per day, an "exam tip" beat, chapter compilations weekly (that's the 4,000 watch hours).
- Hindi first, then Tamil and Telugu with the same scripts localised (not dubbed): regional demand is
  up 60% and short on quality animated content; Gemini's voice covers these languages.
- Why it is unique: nobody combines character comedy + curriculum mapping + daily cadence +
  three languages, and the same library is licensable to schools/edtech (Track 1's B2B cousin).
- Pipeline work: topic file mapped to NCERT chapters, a general-audience persona, the "exam tip"
  section, thumbnail per chapter. About three days on top of Track 1's persona layer.

### Track 3 — the big bet, zero cost to try: English "science, but funny" for US/UK viewers (option C)
- Same pipeline, English (our best voice), adult-safe humour, universal topics ("why does time feel
  faster as you age"), US-friendly examples. Science education long-form RPM in the US is
  $15–18; "science explained humorously" is the fastest-growing sub-niche.
- Run it for 60 days alongside the others; keep it only if it grows faster than the Indian channels.

### Keep, don't bet on: Bolt & Pip kids (option A)
Brand, licensing option (Amazon Kids+/Netflix Kids buy catalogues), and the demo for schools. Not
the income line.

### Avoid for now
- Finance/affiliate channel (D): highest RPM but SEBI's finfluencer rules and YMYL demonetisation
  risk; revisit once Track 2 has an audience to send to a dedicated finance channel.
- Government schemes (E): eligibility rules change monthly; wrong information hurts real people.

## 4. Guardrails against the inauthentic-content policy (applies to every track)
- Original characters and scripts, one human approval per video (already in place), one gag or
  original example per video (comedy layer), no cross-posting the same video to several channels.
- Vary structure per channel (different section order, different sidekick gags), keep captions
  and on-screen text in the target language, and answer comments on general-audience channels.
- Never upload more than one video per channel per day.

## 5. 90-day plan
| Weeks | Do | Measure |
| --- | --- | --- |
| 1–2 | Persona/brand-kit layer; service landing page on the GitHub Pages site; 3 demo reels for 3 local institutes; launch NCERT-Hindi channel | first paying client; NCERT channel: views per Short after 7 days |
| 3–6 | Add Tamil + Telugu NCERT channels; English science-funny channel; weekly compilations everywhere | subscribers/week per channel; watch hours |
| 7–12 | Double down on the fastest grower; pitch the NCERT library to two edtechs/schools; apply for YPP where thresholds are met | ₹ from service, ₹ from ads, one licensing conversation |

## Sources
- RPM/CPM India by niche: https://fluxnote.io/guides/youtube-rpm-india-2026 · https://upgrowth.in/youtube-cpm-india-guide-2026/ · https://www.identitykit.in/blog/youtube-rpm-india-niche-2026
- Shorts RPM: https://miraflow.ai/blog/youtube-shorts-rpm-2026-real-ranges-by-niche · https://air.io/en/air-data-findings/youtube-shorts-rpm-vs-long-form-how-much-do-shorts-earn-in-2026
- YPP thresholds: https://air.io/en/monetization/youtube-partner-program-requirements-2026-the-complete-guide · https://www.uptube.io/blog/youtube-new-policies-2026
- Made for kids: https://vidiq.com/blog/post/make-money-kids-youtube-channel/ · https://gyre.pro/blog/how-to-monetize-a-youtube-kids-channel
- Inauthentic content policy: https://www.tubefilter.com/2026/07/13/youtube-inauthentic-content-monetization-policy-update/ · https://outlierkit.com/resources/youtube-ai-slop-crackdown-2026/ · https://aituber.app/blog/faceless-youtube-channels-demonetized-2026/
- Auto-dubbing: https://www.socialmediatoday.com/news/youtube-expands-auto-dubbing-to-all-creators/811375/ · https://blog.youtube/news-and-events/youtube-auto-dubbing-expressive-speech/
- Facebook Reels India: https://www.kiwibox.com/facebook-payouts/ · https://about.fb.com/news/2026/03/creator-fast-track-grow-your-audience-earn-money-on-facebook/
- Affiliates: https://www.cuelinks.com/blog/best-credit-card-affiliate-programs/ · https://uppromote.com/affiliate-programs/india/ · https://supademo.com/blog/saas-affiliate-programs
- Niche growth India: https://fluxnote.io/guides/fastest-growing-youtube-niches-india-2026 · https://www.identitykit.in/blog/faceless-youtube-channel-ideas-india-2026
- Science/education RPM, humour growth: https://outlierkit.com/blog/most-profitable-youtube-niches · https://vidiq.com/blog/post/most-profitable-youtube-niches/
- Explainer pricing: https://www.motioncube.agency/blog/exploring-2024-costs-of-animated-explainer-videos-in-india/ · https://www.fiverr.com/resources/guides/costs/2d-animation · https://cybertizemedia.com/blog/animation/animation-cost/
- Coaching institutes / SME video demand: https://www.truefan.ai/blogs/ai-video-generator-coaching · https://upgrowth.in/small-business-digital-marketing-budget-india-2026/ · https://brandchanakya.in/education-marketing-trends-in-india-guide/
- Regional languages: https://freetexttovoiceai.in/best-regional-languages-youtube-growth-india-2026.html · https://www.bemultilingual.ca/blog/youtube-languages
- NCERT/edtech demand: https://ciet.ncert.gov.in/activity/adre · https://thebetterindia.com/327615/engineer-animates-ncert-syllabus-turns-govt-schools-into-digital-classrooms-muskaan-dreams/ · https://www.coschool.ai/feeds/blog/edtech-platform-schools-india
