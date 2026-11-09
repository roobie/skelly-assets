---
read_if:
  - authoring a model that has a front, or choosing which way a new kind of model faces
  - importing assets into Deadvox or another consumer, and wondering whether to convert axes
  - changing the showcase's or the review page's views
---

# 2. Models use Deadvox's frame

## Context

A model that has a front, such as a vehicle, a gun or a creature, must face some axis, and every consumer must agree
on which. Deadvox is the consumer: it places, attaches and drives these models in its own frame. A model authored in
another frame needs a conversion on import, which every consumer must repeat and which hides a mismatch until the
model is seen in the game. The review page also has to know where a model's front is to draw its front, rear and side.

## Decision

Every model is authored in Deadvox's frame: +x forward, +y up and +z to the model's right, which is a vehicle's near
side. A consumer then imports a model with no conversion. Deadvox states the frame where it consumes vehicles and
magazines; see Deadvox's `src/core/schema.ts`, `VehicleFittingSchema` and `MagazineRoundSchema`. A kind whose source
faces another axis is a mismatch to fix at its source, not with a turn on import.

The pages read the frame from `site/modelFrame.mjs`, `FORWARD`, so the review page draws its front and rear
three-quarters and its right-hand profile from where the front is, not from the model's proportions, which mislead for
a model that is wider than it is long. The showcase's default view is the same front three-quarter.

## Consequences

A review tile shows a model's front where Deadvox expects it, so a model that faces the wrong way shows it on the
tile. A new kind of model must face +x before a consumer relies on it.
