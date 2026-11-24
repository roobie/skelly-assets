---
type: breaking
---
The `ual_bust` model's frame is the player bust's, at the hips' foot 840 mm above the ground, with its pelvis part at the pelvis bone's head, so UAL's flesh voxels line up with the voxels of the garments it wears.

Upgrade:
- Stand `ual_bust` where `dolls/ual.rig.json` puts it, or at 840 mm above the doll's ground on its centre line, rather than at the pelvis bone's head. Read in the doll's frame, the bone heads, `bind.rest` and the hip and shoulder anchors stand where they did, while the tails of `pelvis`, `spine_03` and `Head` stand 1.3 mm higher, and the `brow`, `eye_left` and `eye_right` anchors 1.3 mm higher and 2.1 mm forward, since both are read off the flesh on its new lattice.
