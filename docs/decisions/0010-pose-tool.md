---
read_if:
  - posing the doll, writing a pose file or a pose fixture under models/poses
  - changing the doll's rig, its joint limits, its reach poles or which side limits are written for
  - choosing an IK solver or an inverse-kinematics library for the doll or a mob
  - wondering why site/kinematics.mjs twins mobgen's pose maths in plain JS
  - judging the clearance probe's margin or what counts as a garment showing the body through
  - posing a hand's fingers, holding an item by a grip socket, or sharing a solver with mobgen
---

# 10. The doll poses on mobgen's bone model with its own small solver

## Context

The showcase drew the doll only worn-still, from dressing sites. Reviewing a wearable in a pose, authoring a pose or a
clip for the player, and probing where a body shows through its clothes all need the doll to bend at its joints
within limits, from a file as well as by hand. mobgen already has a bone and pose model with joint frames and
limits, and the game reads mob clips in that model's frame format; a second model for the doll would be a second
format to read and a second set of maths to keep in step.

## Decision

**One rig model.** The doll's rig is content, `models/poses/rig.libsonnet`, in mobgen's bone shape, one bone per doll
part, named as mobgen names the player's bones. `tools/dollRig.mjs`, `dollRig`, reads each pivot from the built doll,
so the rig follows the avatar's models and anchors without copying their numbers. Limits are written once, for the
reference side, and mirrored, so a mirrored pose is the same pose with twist and abduction negated. A pose file names
the rig and its revision, so a file written against other pivots or limits is refused rather than silently bent.
A pose compiles to a mob clip frame, so a doll clip needs no new reader and a player clip plays on the doll.

**A twin, not a refactor.** The showcase loads plain modules and cannot import mobgen's TypeScript, so
`site/kinematics.mjs` twins mobgen's joint and transform maths, and a test holds the twin to mobgen's on the same
bones. Changing mobgen to share one module would reach into a generator other tools depend on, for a viewer.

**Our own IK.** Limbs reach by analytic two-bone IK with a pole: it keeps elbows and knees hinges, applies limits in
one pass and reports the distance left when a limit holds, so an author sees what the rig refused. The pole is read
in the rest axes of the bone the chain hangs from, so a pole written for the standing doll still bends the elbow
the same way relative to a turned torso. A pose stands on the ground before it reaches, so a target is read off the
standing figure as the page shows it. three.js's `CCDIKSolver` was not taken: it poses a skinned mesh and keeps its
own per-axis Euler limits, a second limit convention on one rig.

**Clearance as a probe, not a pinned count.** A garment rides its doll parts rigidly, so what a pose changes is at
the joints. The probe (`site/clearance.mjs`, `clearanceProbe`) reports covered body points a pose shows through
and garment points it newly sinks into the body, each past a margin (the rig's `clearance`), so a flush fit at rest
is clean and a test can assert the property instead of a count that moves with every garment.

## Fingers and grips

Fingers are more bones under the hand in the same content (`models/poses/rig.libsonnet`, `fingerBones`), one per
phalanx, the thumb on its own two bones because it opposes rather than flexes. A pose file curls and spreads a hand
by shorthand (`site/fingers.mjs`, `handAngles`) so a clip's author never names fifteen bones for a fist.

A grip is planned palm first, then fingers (`site/fingers.mjs`, `holdItem` then `closeHand`): the item carries a
grip socket, where the palm's face meets it and which way the thumb runs, the arm's two-bone solve puts the wrist
there, and each finger then flexes joint by joint from the knuckle out until the part it moves touches the item. The
fingers close by contact, not toward fingertip targets, because a target is a point the author guesses on the
item's surface, and a chain of three short phalanges under joint limits rarely reaches it exactly (fingertip CCD on
the same hand leaves the tips millimetres off a handle and runs into limits every step), while contact wraps any
handle the hand can span, with no per-item tuning beyond the socket. CCD remains in the module (`solveCCD`) for a
fingertip that must land on a point, such as a button, which a grip is not.

## Out of scope

- **A solver shared with mobgen**, with the doll's frames and limits given to mobgen's humanoid, waits for a humanoid
  mob that needs limits or a mob that needs IK (#133); until then the twin and its agreement test are cheaper than a
  shared module across the generator.
