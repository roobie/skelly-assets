---
read_if:
  - authoring a vehicle part that opens, swings or slides, such as a door, lid, tailgate or bonnet
  - drawing hinge pins, or choosing how far a part opens
  - reading a model's `motion` in a consumer, or placing a mirrored part that moves
  - adding a kind of motion, or a part that moves in several stages
---

# 15. A part's motion is content, derived from the pins it is drawn with

## Context

Consumers once guessed how a part moves from two hinge anchors: which way it turns, how far and whether it slides.
Each consumer guessed again, a guess could not be checked against the vehicle the part sits on, and an anchor pair
said nothing about the sense or the stop. The anchors were points measured off the voxels a part is drawn with, so
the line they gave moved whenever the drawing snapped differently, while the part was drawn turning about another.

## Decision

A part row declares its motion beside its anchors, and the build exports it on the part's model; see
`tools/packages/thing-core/src/schema.ts`, `MotionSchema`. Consumers play that record and invent no motion of their
own.

- **The axis is drawn, never written.** A hinge names the pins it turns on, pieces drawn on the part, and the axis is
  derived from their authored shape, not their voxels, so voxel snapping changes how a pin looks but never where the
  part turns. One shared function derives it, so any check that a swing clears the vehicle proves the axis the game
  plays; see `tools/packages/thing-core/src/motion.ts`, `pinAxis`. The vehicle kit draws pins round, so a pin turning
  in its socket keeps the same depth all through the swing, and in the part's own paint unless the author names another
  finish, so a pin reads as part of the panel it carries; see `models/vehicles/kit.libsonnet`, `hingePins`. A box pin
  turns along its one longest side.
- **The sense is a hint, the sign is derived.** The row says which way the part opens, as up, down, fore, rear, near
  or far, and the build picks the sign that carries the part's centre that way, failing when neither does clearly. A
  hand-written sign would be wrong for half the parts drawn the other way round. Each direction is fixed in the model
  frame, near being the side fore × up points to, so a hint means the same wherever the part is drawn about its own
  origin; a far twin opens the reflected way because its motion is mirrored, not because its hint is reread.
- **The stop is authored.** The open angle or slide travel is a design number in the part's row, or a parameter of
  the template that owns the family, never solved into source and never held by a tool. A part shared across vehicles
  has one stop; a vehicle that needs another uses a variant row.
- **Mirroring is not stored.** A far twin is the near part reflected, so its motion is the reflected motion, stage by
  stage; see `tools/packages/thing-core/src/motion.ts`, `mirrorMotion`. Storing both would let them disagree.
- **A motion is a sequence of rigid stages.** Each stage is a hinge or a slide, so a plug door is a slide out then a
  slide along, with no new kind for each mechanism, which would each need its own schema, sense rule, check and
  reader. Every stage is given in the part's rest frame and the first carries the rest, so a consumer nests one group
  per stage, the first outermost, and the build never poses pins through earlier stages; see
  `tools/packages/thing-core/src/motion.ts`, `posePoint`.
- **The clock is shared by distance.** Stages run one after another on one clock from rest to stop, and the build
  gives each the share its distance is of the whole, a slide its travel and a hinge the arc its part's furthest rest
  corner sweeps; see `tools/packages/thing-core/src/motion.ts`, `shareStages`. Equal shares would give a few centimetres
  of plug-out the same time as a metre of slide. Only the build has the pins and bounds, so it exports the shares and
  no consumer can derive different ones.

Pivots are not attach points, so a part with a motion has no hinge anchors. A part row has hinge anchors or a motion,
never both; a row that declares no motion keeps whatever hinge anchors it has.

## Consequences

A part's motion is the same in every vehicle that places it. Whether the swing clears its neighbours depends on the
vehicle, so that verdict belongs to each vehicle's placements, not to the part.

The derived axis runs through the pins as authored. A pin a grain across draws as a couple of voxels, so a pin
reads as a pin only from close up.
