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
phalanx. The thumb is three bones in the fingers' frame (`thumbBones`) rather than a digit of its own kind: a
metacarpal that swings, rolls and lifts, then two phalanges that only bend. Opposition is the roll of that root,
read in the joint's own order with its swing and lift, because one three-freedom joint at the root is what lets the
same thumb wrap over a handle and meet a fingertip, while a fixed "opposition axis" does one of the two. A pose file
curls and spreads a hand by shorthand (`site/fingers.mjs`, `handAngles`), and names whole hands by preset
(`models/poses/hands.libsonnet`), so a clip's author never names twenty bones for a fist and every fist is the same
fist until a preset changes.

A grip is planned palm first, then fingers (`site/fingers.mjs`, `holdItem` then `closeHand`): the item carries a
grip socket, where the palm's face meets it and which way the thumb runs, the arm's two-bone solve puts the wrist
there, and each finger then flexes joint by joint from the knuckle out until the part it moves touches the item. The
fingers close by contact, not toward fingertip targets, because a target is a point the author guesses on the
item's surface, and a chain of three short phalanges under joint limits rarely reaches it exactly (fingertip CCD on
the same hand leaves the tips millimetres off a handle and runs into limits every step), while contact wraps any
handle the hand can span, with no per-item tuning beyond the socket.

A pinch is the exception (`site/fingers.mjs`, `pinchItem`): a hold names digits and the points on the item their pads
must reach, CCD bends those digits there, and the rest close by contact. A thin tab such as a charging handle's latch
is held between two pads, a contact closing finds no such pair, and the author knows the two faces the pads belong
on. The pose report gives each pinching digit's miss rather than the limits it met, since CCD presses against limits on
its way to a point it still reaches.

The palm meets a handle at the grip crease near the knuckles (the hand bone's `grip` share), not the palm's middle:
fingers curled from a handle seated mid-palm sweep past its far side before their pads reach it, and close to their
limits in the air. The thumb is long enough (`models/measures/arm.libsonnet`, `thumbLength`) to reach round a handle
seated there, as an adult's reaches past the index knuckle. The fingers close first and the thumb last, so it can lie
on the closed fingers where a haft is too thick to wrap. The thumb starts lifted wide and its root comes down onto the
item from beyond, since lifting it from the palm side would drive it through the haft it should wrap. The grip preset
swings it wide and rolls it well into opposition, so its pad comes down on the haft beside the index rather than on the
fingers' backs, which leaves a slim haft held by the fingers alone. A supporting hand under a handguard has its own
preset, the thumb swung in and barely rolled, so it lies along the handguard as a shooter's does instead of standing
off it. Each joint's swing is checked in steps rather than at its end
alone, so no part passes through a thin item to rest beyond.

The wrist flexes about the knuckle row, as the fingers do, and deviates about the palm's normal. Its limits are a
wrist's: far more flexion and extension than deviation. Bent about the arm's flex axis instead, the hand would swing in
the palm's plane, so the wide range would go to deviation, and a held item would leave the wrist's real bend to a
contorted elbow and shoulder. A hold's elbow pole points down and out, as a person's elbow does; where a hold asks
past a limit, the limit widens only within a person's range and only as far as a hold has shown it needs, and the rest
is the socket's or the pole's to fix.

## Out of scope

- **A solver shared with mobgen**, with the doll's frames and limits given to mobgen's humanoid, waits for a humanoid
  mob that needs limits or a mob that needs IK (#133); until then the twin and its agreement test are cheaper than a
  shared module across the generator.
