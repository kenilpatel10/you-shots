# Sound effects

None are used by default: young children find sudden sounds unpleasant, and quiet, predictable
audio is part of the channel's identity.

If you want a soft "ding" when the antenna lights up on the wow fact, add a short file from the
YouTube Audio Library's sound-effects section as `public/sfx/ding.mp3` and render it in
`remotion/scenes/FactScene.tsx` with `<Audio src={staticFile("sfx/ding.mp3")} volume={0.3} />`
inside a `<Sequence>` starting at frame 0 of the scene. Keep it below −20 dB relative to speech.
