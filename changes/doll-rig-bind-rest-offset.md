---
type: added
---
Each bone of the doll's rig names its joint `node` (rest rotation) and its `bind.rest`, the bound part's offset in that node (`translation`, `rotation`, `scale` [-1, 1, 1] for the mirrored copy), so a piece drawn in a doll part's frame is seated on the bone's joint node, the one a clip turns, by that one constant. `frame` stays the joint-limit frame.
