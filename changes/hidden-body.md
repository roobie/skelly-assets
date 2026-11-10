---
type: added
---
For game developers: a worn model can say which of the avatar's body it hides. The bust's torso is drawn as two
primitives, marked `trunk` and `shoulders` in each primitive's `extras.piece`, each a closed surface. A worn model's
sidecar and manifest entry may carry `covers`, naming the avatar part it is drawn on or regions of that part. Stop
drawing those primitives of that part copy while the model is worn, so the skin under a close shell no longer
flickers through it.
