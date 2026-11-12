---
read_if:
  - the build reports that a part overlaps a part at another site of a vehicle
  - placing or resizing a vehicle's parts
  - allowing a part to sit inside another part of its vehicle
  - adding a vehicle part whose solid is meant to run into its neighbours
---

# 14. Parts at different sites of one vehicle do not overlap unless they are seated or the vehicle says so

## Context

Each part is authored and checked on its own, and a vehicle is those parts placed at its sites. Two parts that are each
valid can still occupy the same space once placed, and nothing noticed: a review probe across sites found overlaps on
several vehicles that every CI job passed.

Most overlaps in the catalogue were the same few fits repeated on many vehicles: a wheel over its axle, a gearbox in its
tunnel, a wall panel into its floor. Listing each per vehicle would have buried the few overlaps that are mistakes.

## Decision

The build and `tools/check-sources.mjs` fail when pieces of parts at two different sites share more than one voxel
grain of depth, naming the vehicle, both parts, both sites and the pieces that meet. Faces that touch, or sink less than
a grain into each other, are contact: the vehicle grain closes gaps under a voxel anyway, so a finer difference cannot
be seen or built. The pieces of one site are the part's own business and are not compared. See `tools/siteOverlap.mjs`,
`siteOverlaps`.

An overlap is allowed in two places, so each fact is stated once where it is true:

- Seating, for every vehicle: `models/vehicles/seating.libsonnet` says how deep a part may sink into its neighbours,
  by the role of its site (the site id without side and number). A pair is allowed when either role seats at least as
  deep as the overlap. Seating is by role and not on the part rows because the rows are a strict, cached schema and a
  fit belongs to how parts are placed, not to the part alone. A seating entry carries its reason, and a new fit that
  every vehicle shares is one entry.
- The vehicle, for what only it does: `overlaps` in its placements file, naming both sites and the reason. A variant
  allows its parent's overlaps as well as its own. See `models/vehicles/site.libsonnet`, `overlap`.

Seating is a depth cap, so a fit that grows deeper than declared fails again; the cap is the contract, not the pair.

## Consequences

A part from the roster rather than the vehicle rows has no pieces and is not compared.

The depth is the deepest point that lies inside both solids, so a thin part sunk into a thick one reads shallow: a prop
shaft whose upper half runs through a chassis crossmember measures about half its radius and passes as contact. Catching
that needs a measure of how much of the thinner part is inside, not the mutual depth.

The check evaluates every vehicle part's pieces, so it adds about a minute to the build's source checks; the evaluation
is the cost, not the comparison.
