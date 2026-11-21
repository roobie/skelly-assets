---
type: breaking
---
The player doll's legs and feet take the `ual` doll's proportions, so one garment fits both: the figure stands about 36 mm taller, its feet are longer and its thighs deeper, and its rig is revision 9.

Upgrade:
- Raise any eye height, camera height or held-item height you measured on the player by about 36 mm, or read it again from the rig.
- Write pose files for the player's rig as revision 9; a world point a revision-8 pose file reaches for stands about 36 mm lower against the new figure.
- Read `player_bust`'s `hip_left` and `hip_right` anchors again: they stand on the hip joints, 89 mm either side of the middle and 92 mm above the hips' foot.
- Advance the walks by each clip's own `strideMetres`, which grows by about 13%, rather than by a stride you measured.
- Refit anything drawn around the player's thighs, which are 190 mm deep rather than 160 mm.
