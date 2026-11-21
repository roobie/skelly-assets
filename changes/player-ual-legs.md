---
type: breaking
---
The player doll's legs and feet take the `ual` doll's proportions, so one garment fits both: the figure stands about 36 mm taller, its shins rake back, its feet are longer and its thighs deeper, its toes bend at the ball, and its rig is revision 9.

Upgrade:
- Raise any eye height, camera height or held-item height you measured on the player by about 36 mm, or read it again from the rig.
- Write pose files for the player's rig as revision 9; a world point a revision-8 pose file reaches for stands about 36 mm lower against the new figure.
- Read `player_bust`'s `hip_left` and `hip_right` anchors again: they stand on the hip joints, 89 mm either side of the middle and 92 mm above the hips' foot.
- Advance the walks by each clip's own `strideMetres`, which grows by about 13%, rather than by a stride you measured.
- Refit anything drawn around the player's thighs, which are 190 mm deep rather than 160 mm.
- Read the `player_leg` model's `knee` and `ankle` anchors, and the leg measures' `origins`, as points off the upright: the shin's and the foot's parts hang there, the knee 3 mm and the ankle 37 mm behind the hip.
- Pose the toes on the rig's new bones `ball.L` and `ball.R`, children of `foot.L` and `foot.R`, and hang anything at the toes from `player_leg`'s new `ball` anchor, where they bend, 15 mm above the ground and 149 mm ahead of the ankle.
- Dress the player's `ball` part, and the `ual` doll's `ball-l` and `ball-r`, with each boot's or shoe's new `<id>_worn_toe` piece; its `_worn_foot` piece now ends at the ball.
- Give every `avatarLeg` part a `thighTop`, the height below the hip joint where the thigh's flesh ends; `0` keeps a thigh that runs up to the joint.
