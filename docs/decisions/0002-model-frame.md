---
read_if:
  - authoring a model that has a front, or choosing which way a new kind of model faces
  - deciding where the front of a chair, a tool, a garment laid flat or a thing with no front lies
  - laying out a kit or family along an axis other than its front
  - importing assets into Deadvox or another consumer, and wondering whether to convert axes
  - holding a model in the hand, or reading its grip turn, hold or rest
  - changing the showcase's or the review page's views
---

# 2. Models use glTF's frame

## Context

A model that has a front, such as a vehicle, a gun, a held tool or a creature, must face some axis, and every
consumer must agree on which. A model written in another frame needs a conversion on import, which every consumer
must repeat and which hides a mismatch until the model is seen in the game. When kinds of model face different ways,
each consumer also keeps a turn per kind. The review page has to know where a model's front is to draw its front,
rear and side.

## Decision

Every model file is written in one frame, glTF's: +z forward, +y up and +x the model's left, so its right is -x.
It is the frame of the format we ship, so a consumer imports any model, from this repository or elsewhere, with no
turn. three.js's `lookAt` and the usual face-the-target code assume it, and Unity shares its up and forward, mirrored
in x because Unity is left-handed.

A model's front is where its user faces while using it. A chair faces where its sitter faces, a tool's working end
points where its user points it, and a standing tool turns to +z the side its user faces in use. One rule decides
every front, so a reader predicts where any model faces without looking at it, and no kind needs its own ruling.

A thing that lies flat keeps its use pose, turned down onto its back. A top worn upright has its neck up; laid on its
back the neck goes to -z, and a mattress or open sleeping bag puts its user's head end there too. Every garment laid flat
thus faces the same way, whichever builder made it.

A thing with no front in use, such as fabric, a sheet, tape, cut stock, a kit, a sling, a stool, a bin, a barrel or a
packed roll, lies or stands on its largest flat face with its longest level side along x. Any turn that keeps that is
correct, and a round thing is correct in any turn, so no one has to invent a front for it.

A held model's working end is its front, so it lies along +z too. Its grip turn carries the file's axes onto the held
axes, working end +z and up +y, its roll turns about that end, and an upright rest stands it on its -z end. One frame
for holding as for placing keeps the turn of a model that already faces forward at none.

A source may be laid out along another axis when its measures read that way, as a vehicle's do along its length. It
then names that axis once, in its kit or family, or in its row when only that row's pieces are laid out so, and the
build turns its geometry, datums and placements onto +z; see
`tools/packages/thing-core/src/frame.ts`, `FRONT_TURNS`. A generator that keeps its own frame, as gungen and mobgen
do because their authored data reads in it, turns at its export instead; see
`tools/packages/gun-authoring-tool/src/gun/exportFrame.ts`, `FILE_FROM_GUNGEN`, and `tools/packages/mobgen/src/core/conventions.ts`, `TO_MODEL_FRAME`. A turn per model, or one on import, would let one model
drift from its kind. A source that names no axis already faces +z, so a new kind is authored facing +z.

The pages read the frame from `site/modelFrame.mjs`, `FORWARD`, so the review page draws its front and rear
three-quarters and its right-hand profile from where the front is, not from the model's proportions, which mislead
for a model that is wider than it is long. The showcase's default view is the same front three-quarter.

## Consequences

A review tile shows a model's front where every consumer expects it, so a model that faces the wrong way shows it on
the tile. A consumer that keeps its own world or piece frame turns imported models once, at that boundary, by the
same turn for every kind.
