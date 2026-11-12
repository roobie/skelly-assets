---
read_if:
  - the build reports that a part overlaps a part at another site of a vehicle
  - placing or resizing a vehicle's parts
  - allowing a part to sit inside another part of its vehicle
---

# 14. Parts at different sites of one vehicle do not overlap unless the vehicle says so

## Context

Each part is authored and checked on its own, and a vehicle is those parts placed at its sites. Two parts that are each
valid can still occupy the same space once placed, and nothing noticed: a review probe across sites found overlaps on
several vehicles that every CI job passed.

## Decision

The build and `tools/check-sources.mjs` fail when pieces of parts at two different sites share more than one voxel
grain of depth, naming the vehicle, both parts, both sites and the pieces that meet. Faces that touch, or sink less than
a grain into each other, are contact: the vehicle grain closes gaps under a voxel anyway, so a finer difference cannot
be seen or built. The pieces of one site are the part's own business and are not compared. See `tools/siteOverlap.mjs`,
`siteOverlaps`.

A part that is meant to sit in another, such as a hub in a tyre, is allowed in the vehicle's own placements file with
`overlaps`, naming both sites and the reason. The list is content, so a vehicle's author states the exception where the
vehicle is, and the tool carries no list of vehicles. A variant allows its parent's overlaps as well as its own. See
`models/vehicles/site.libsonnet`, `overlap`.

`unreviewed` marks an overlap that was already there when the rule arrived and has not been judged. It lets the rule
bind every new overlap at once without a taste review of every shipped vehicle first; grep for it to find the fits still
to review, and replace it by a fix or by `overlap` with a reason as each vehicle is reviewed.

## Consequences

A part from the roster rather than the vehicle rows has no pieces and is not compared. The check evaluates every
vehicle part's pieces, so it adds about a minute to the build's source checks; the evaluation is the cost, not the
comparison.
