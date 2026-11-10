---
read_if:
  - posing the doll, writing a pose file or a pose fixture under models/poses
  - changing the doll's rig, its joint limits or which side limits are written for
  - choosing an IK solver or an inverse-kinematics library for the doll or a mob
  - wondering why site/kinematics.mjs twins mobgen's pose maths in plain JS
---

# 10. The doll poses on mobgen's bone model with its own small solvers

## Context

The showcase drew the doll only worn-still, from dressing sites. Reviewing a wearable in a pose, authoring a pose or a
clip for the player, and probing where a body shows through its clothes all need the doll to bend at its joints
within limits, from a file as well as by hand. mobgen already has a bone and pose model with joint frames and
limits, and the game reads mob clips in that model's frame format; a second model for the doll would be a second
format to read and a second set of maths to keep in step.

## Decision

The doll's rig is content, `models/poses/rig.libsonnet`, in mobgen's bone shape (head, tail, frame, limits, parents
first), one bone per doll part, named as mobgen names the same bone. `tools/pose/rig.mjs`, `dollRig`, reads each
bone's pivot from the built doll so the rig follows the avatar's models and anchors without copying their numbers.
Limits are written once, for the reference side, and mirrored to the other side, so a mirrored pose is the same
pose with its twist and abduction negated.

The pose maths live in `site/kinematics.mjs`, plain JS the browser and Node both load, because the showcase loads
modules straight from a CDN importmap and cannot import mobgen's TypeScript. It twins mobgen's `jointRotation`,
`jointAngles`, `clampJointAngles` and `boneTransforms`; a pose file compiles to a mob clip frame, so a doll clip
needs no new reader.

Inverse kinematics are our own: analytic two-bone with a pole for limbs, which keeps elbows and knees hinges and
applies limits in one pass, and cyclic coordinate descent for chains such as fingers, where no closed form exists.
Both clamp through the same `clampJointAngles`, so one limit convention serves sliders, files and solvers. three.js's
`CCDIKSolver` was not taken: it poses a skinned mesh and keeps its own per-axis Euler limits, which would put a second
limit convention on the rig.

## Consequences

- A humanoid mob clip applies to the doll where bone names match, and a doll clip to a mob.
- mobgen's humanoid still lacks frames and limits; giving it the doll's is a follow-up, not part of this tool.
- Jointed fingers are more bones under the hand in the same content, posed by CCD; no format changes.
