---
read_if:
  - the build reports that a part swings into another part, the ground or a neighbour that is also open
  - a swing entry in a placements file is stale, capped too high or listed twice
  - adding a vehicle part that opens, or placing one beside another
  - the swing check is slow, or CI's swing cache misses
  - changing how a part's motion is resolved, or what the placements export says about a swing
---

# 16. A vehicle part that opens swings clear of the rest of the vehicle

## Context

A part's motion is content (see `docs/decisions/0015-motion-as-content.md`), so the open pose is one the build can
compute. Parts that pass at rest can still pass through each other as they open: a bonnet into the windscreen
pillar, a tailgate into the roof, a door into a flare or the ground. The overlap check
(`docs/decisions/0014-site-overlap.md`) only sees the rest pose.

## Decision

The build and `tools/check-sources.mjs` sweep every site whose part moves through its stages, from rest to its stop,
against every other site of the vehicle and the ground, and fail when they sink into each other, naming the vehicle,
the parts, the sites, how far the part had opened and how deep it gets by its stop. They also pose every moving part
open at once, so twins that clear alone but meet open are caught. See `tools/swingClearance.mjs`, `swingReport`.

- Contact is relative to rest. A pair that already overlaps at rest, as a lid seated in its frame does, is in contact
  only once it sinks a quarter grain deeper than it does at rest; the seating is the overlap check's business and the
  swing check judges what the motion adds. Contact is the depth shared by a point inside both solids, as in the overlap
  check, so a part thinner than a quarter grain on both sides cannot register; the vehicle grain makes such a part
  unbuildable anyway.
- A part that rides another (`rides` on its site) moves with it as one body and is not tested against it, so a handle
  or a hinge dressing does not collide with the part it is fixed to.
- The swing sense is read once, by the same derivation the build exports, so the swing proven is the swing played. A
  far-side twin swings reflected, and its angles negate with it.
- An allowance is a depth cap, as in the overlap check: `swingContact` for a contact that is intended and says why,
  `swingUnjudged` for one nobody has judged, said again on every run. A stale, doubled or loose entry fails the
  build, and a variant inherits its parent's entries without overriding them. See `models/vehicles/site.libsonnet`.
- Each moving site's placements export carries `swing`: how much of its way it opens before the first contact, and
  what it touches there, so a game can stop a part short of the thing it would hit.

## Why it is built this way

The check runs on every PR, so the cost must stay a fraction of the model build: sampling every pose of every piece
pair does not, and a sample can step across a thin lip. The sweep therefore clears a whole stretch of the clock at
once. A pose is a rigid motion and the pieces' distance fields are 1-Lipschitz, so a cell of the mover is proven clear
for a window when its centre depth plus its radius, or the other solid's depth plus the radius plus how far a point can
travel in the window, stays under the contact floor. Only the cells that cannot be cleared are split to the sample
lattice, and only windows that hold such cells are measured, one grain of travel at a time. The test of a window is
conservative, so a thin lid cannot slip between samples; it can only cost time, never a miss.

Vehicles are swept on worker threads, one each, and a sweep is cached by the vehicle's inputs and the checker's own
source in the export cache folder, so a PR pays only for the vehicles it changes. The cache key leaves out the
allowances: a sweep does not depend on them, and applying them on every run means an allowance edit takes effect at
once and a stale one cannot hide behind a cached result. CI shards the sweeps over the same runners as the models
(`tools/build.mjs`, `fillCacheShard`) so the final build finds every entry present.

The budget is a reason, not a figure: the check may cost a PR what the rest of its build does and no more, and a
change that makes it cost more is a defect to fix in the sweep and not a reason to run it less.

## Consequences

Entries land as `swingUnjudged` for every contact the catalogue had when the check arrived, so the build stays green
and each one stays visible until fixed or judged.

A part is a rigid body: a motion that bends or scales a part is out of scope. A part that moves but is placed with no
neighbour in its swing has no contact and exports a swing of its whole way.
