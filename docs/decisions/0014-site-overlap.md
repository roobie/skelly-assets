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

The build and `tools/check-sources.mjs` fail when pieces of parts at two different sites sink more than one voxel
grain into each other, naming the vehicle, both parts, both sites and the pieces that meet. How deep two pieces sink is
the shortest move along an axis that parts them, so a piece that passes right through a thin panel reads as deep as
it passes: the panel's thickness would read an engine through a floor like a shallow seat, and a fit sized to that
reading would hide the clash under a false reason. Faces that touch, or sink less than a grain into each other, are
contact: the vehicle grain closes gaps under a voxel anyway, so a finer difference cannot be seen or built. The pieces
of one site are the part's own business and are not compared. Of all the piece pairs two sites have, the deepest is the
one judged, so the order the pieces are swept in cannot hide a deep overlap behind a shallow one. See
`tools/siteOverlap.mjs`, `siteOverlaps`.

An overlap is allowed in two places, so each fact is stated once where it is true:

- A fit, for every vehicle: `models/vehicles/seating.libsonnet` lists, under one reason, the exact pairs of roles
  that sink into each other and how deep, in either orientation. A role is a site id without side and number, and a
  pair names whole roles: a pattern or a cross product of role sets would cover pairs nobody judged and let a real
  mistake pass, and one cap for pairs that differ three- or fourfold would hide the deeper ones. Each depth is the
  pair's own deepest overlap plus a small margin. A pair belongs in a fit only when its reason is true of those two
  parts; one nobody can explain is `unjudged` in the vehicle. Fits are a table by role and not fields on the part rows
  because the rows are a strict, cached schema and a fit belongs to how parts are placed. The table is checked on every
  run, so it cannot rot: a malformed fit, a role no drawn site has, a pair listed twice, a pair no vehicle overlaps
  on, or a depth more than a grain above what any vehicle measures fails the build.
- The vehicle, for what only it does: `overlaps` in its placements file says why a pair is correct, and `unjudged`
  holds an overlap nobody has judged, which may be a defect. Neither fails the build, but `unjudged` prints a note on
  every run, so it stays visible until someone decides. See `models/vehicles/site.libsonnet`, `overlap` and
  `unjudged`. A variant allows its parent's entries as well as its own. A whole family's unjudged overlaps may be
  listed apart from its placements files instead (`models/vehicles/unjudged-overlaps.libsonnet`), so that a change of
  measure that reaches every vehicle can land with nothing hidden and each family judged in a review of its own, while
  the placements files stay what someone decided. A row of that list may stand over a pair the vehicle already allows
  less deeply: the allowance was sized by an earlier measure, and raising it would put a decided reason on a depth
  nobody has judged. The row goes stale once the fits or the allowance cover the overlap again.

Every allowance is a depth cap: a pair or entry that grows deeper than declared fails again, so the cap is the
contract, not the pair. An entry whose pair no longer overlaps, that a fit already covers, that is listed twice or
whose cap is more than a grain above its measured depth fails the build, so the lists carry no dead weight. A fit's
pair that is dead or capped far above what it covers is only noted while an overlap deeper than it is unjudged: the
judgment may yet refit the pair to that overlap, and failing first would push the cap down or the pair out before
anyone has decided.

## Consequences

A part from the roster rather than the vehicle rows has no pieces and is not compared.

Moves are only along the vehicle's axes, so two pieces meeting on a slope read deeper than the move along the slope
that would part them. Vehicle parts are drawn mostly square to those axes, and a reading that is too deep can only ask
for a judgment, never hide a clash.

Each piece is read along sampled lines as the spans where it lies, so a feature thinner than the march's least step
can be stepped over where a line only grazes it.

The check evaluates every vehicle part's pieces, so its cost follows piece evaluation and not the comparison.

A variant that inherits an unjudged entry prints only its parent's note, so each unjudged pair is said once however
many variants share it.

The build is the only gate over the whole catalogue; the unit tests hold the rule on small fixtures, so a catalogue
change cannot make them fail.
