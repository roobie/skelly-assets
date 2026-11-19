---
type: breaking
---
A model's `motion` is an object: its stages under `stages`, and the named places on its clock under `stops`, `rest` at 0 and `open` at 1 for every vehicle part.

Upgrade:
- Read a model's stages from `motion.stages`.
- Take the motion type and math from `@skelly/motion/motion` (which `npm install` links from the submodule's workspace), and place a fitting's motion with `transformMotion(motion, { ...(mirror ? reflection(0) : IDENTITY_RIGID), shift: at })` instead of thing-core's `mirrorMotion` plus shifting the hinge points.
