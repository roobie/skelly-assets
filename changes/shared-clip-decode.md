---
type: changed
---
The posing page and `tools/actorCompose.mjs` share one clip decode, `site/clipFrames.mjs`; `site/poseSample.mjs` and
`decodeFrame` in `site/poseFile.mjs` are gone, so a copy of the site reading them imports `site/clipFrames.mjs` instead.
