---
read_if:
  - you add or change a kind of motion, a stop, or how a motion is posed or reflected
  - you need a part's pose at a clock outside the vehicle build, such as a gun part or the showcase
  - you wonder why the motion type and math are not in thing-core or construct
---

# motion

`@skelly/motion` holds the type of a part's motion and the math that poses, shares and reflects it. Vehicles, guns
and the showcase must play one motion the same way, and each has a different dependency stack, so the type and math
sit below all of them in one file that imports nothing. Importing nothing is also what lets the showcase ship it to a
browser with its types stripped; see `site/build.mjs`.

The schema that validates the type stays with the model envelope in `thing-core`, which checks its own `MotionSchema`
against this type, so the two cannot drift. The pins and bounds a build derives shares from are not here: only the
build has them, so it hands `shareStages` the measured moves.

A reflection, a placement and a change of unit are one transform of a motion, so one function applies them all and a
consumer never mirrors by hand; see `src/motion.ts`, `transformMotion`.
