---
type: breaking
---
The player doll's fingers bend at every joint and its thumb has three bones, so a pose can curl a hand round a grip.
Gloves follow suit: each glove's single `_worn_fingers` shell is now one shell per finger bone and per thumb bone.

Upgrade:
- Where you dress a figure in a glove's `_worn_fingers` shell, dress it in the glove's per-bone shells instead, as the manifest lists them.
