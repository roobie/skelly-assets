---
read_if:
  - changing how the doll stands, idles, walks or lies, or adding a walk
  - a game's figure slides its feet, or needs a gait the doll does not ship
  - widening a limit of the doll's rig, or a pose asks the root past one
---

# 21. The doll's locomotion is a gait in code, its numbers in content, baked into clips

## Context

ahg3 takes its figure's clips from a pinned release rather than making them in-game, so the doll needs to stand, idle,
walk and lie down as ahg3's figure does. ahg3 draws that with FigureGait, arpg1's avatar gait, whose look its owner
has judged; mobgen's humanoid walk, which already plays on the doll, is a zombie's shamble. The doll's rig has joint
limits ahg3's figure lacks.

## Decision

The walks are generated, not keyed: a planted foot keeps pace with the ground only for the legs a stride was worked
out on, and the doll's legs are measured off its built parts, so key frames would slide its feet whenever the body's
proportions change. The gait's maths is code and every number that is taste, swing, knee lift, arm share, lean,
frames, nominal pace and the still poses, is content. Clips are baked so a game plays them without the solver
(decision 0010), each walk in place with the stride a loop covers, as every walk loop in the tree states one.

Where FigureGait asks past the rig, the rig's terms win without losing the look: a lean is taken at the hips first, so
a long back swing keeps within the hip's extension while the feet land where FigureGait's do, and a foot is held as
level as its ankle allows. The root's pitch is the body's attitude in the world rather than a joint, so its limit
lets a figure lie on its front or back.

## Consequences

A rebuilt doll with longer legs walks with a longer stride and the same planted feet, and a consumer reads the new
stride from the clip. Retuning a walk is an edit to its numbers. A gait FigureGait cannot draw, such as a crawl, needs
code here before it can be content.
