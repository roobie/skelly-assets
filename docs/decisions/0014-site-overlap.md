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
be seen or built. The pieces of one site are the part's own business and are not compared. Of all the piece pairs two
sites have, the deepest is the one judged, so the order the pieces are swept in cannot hide a deep overlap behind a
shallow one. See `tools/siteOverlap.mjs`, `siteOverlaps`.

An overlap is allowed in two places, so each fact is stated once where it is true:

- A fit, for every vehicle: `models/vehicles/seating.libsonnet` lists, under one reason, the exact pairs of roles
  that sink into each other and how deep, in either orientation. A role is a site id without side and number, and a
  pair names whole roles: a pattern or a cross product of role sets would cover pairs nobody judged and let a real
  mistake pass, and one cap for pairs that differ three- or fourfold would hide the deeper ones. Each depth is the
  pair's own deepest overlap plus a small margin. A pair belongs in a fit only when its reason is true of those two
  parts; one nobody can explain is `unjudged` in the vehicle. Fits are a table by role and not fields on the part rows
  because the rows are a strict, cached schema and a fit belongs to how parts are placed. The table is checked on every
  run, so it cannot rot: a malformed fit, a role no drawn site has, a pair listed twice, a pair no vehicle overlaps
  on, or a depth more than two grains above what any vehicle measures fails the build.
- The vehicle, for what only it does: `overlaps` in its placements file says why a pair is correct, and `unjudged`
  holds an overlap nobody has judged, which may be a defect. Neither fails the build, but `unjudged` prints a note on
  every run, so it stays visible until someone decides. See `models/vehicles/site.libsonnet`, `overlap` and
  `unjudged`. A variant allows its parent's entries as well as its own.

Every allowance is a depth cap: a pair or entry that grows deeper than declared fails again, so the cap is the
contract, not the pair. An entry whose pair no longer overlaps, that a fit already covers, that is listed twice or
whose cap is more than two grains above its measured depth fails the build, so the lists carry no dead weight.

## Consequences

A part from the roster rather than the vehicle rows has no pieces and is not compared.

The depth is the deepest point that lies inside both solids, so a thin part sunk into a thick one reads shallow: a prop
shaft whose upper half runs through a chassis crossmember measures about half its radius and passes as contact. Catching
that needs a measure of how much of the thinner part is inside, not the mutual depth.

The check evaluates every vehicle part's pieces, so its cost follows piece evaluation and not the comparison.

A variant that inherits an unjudged entry prints only its parent's note, so each unjudged pair is said once however
many variants share it.

The build is the only gate over the whole catalogue; the unit tests hold the rule on small fixtures, so a catalogue
change cannot make them fail.
