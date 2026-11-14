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
open at once, so twins that clear alone but meet open are caught too. See `tools/swingClearance.mjs`, `swingReport`.

- Contact is relative to rest. A pair that already overlaps at rest, as a lid seated in its frame does, is in contact
  only once it sinks a quarter grain deeper than it does at rest; the seating is the overlap check's business and the
  swing check judges what the motion adds. The rest depth is one number per pair of pieces, taken at its deepest
  point, not per place: a pair seated deeply at rest, as an engine in its bonnet, may reach that depth anywhere in its
  swing without being reported. Those fits exist because the two parts interlock by design, and a per-place cap would
  need the shape of the rest overlap, which no allowance records. Contact is the depth shared by a point inside both
  solids, as in the overlap check, so a part thinner than a quarter grain on both sides cannot register; the vehicle
  grain makes such a part unbuildable anyway.
- A part that rides another (`rides` on its site) moves with it. A rider that does not move belongs to its carrier's
  body and is not tested against it, so a handle or a hinge dressing does not collide with the part it is on. A rider
  with a motion of its own moves nested inside its carrier's on the same clock, as
  `docs/decisions/0015-motion-as-content.md` fixes, and is a body of its own: it is tested against its carrier,
  because a panel that folds onto its carrier meets it only while it moves, and against the other riders of that
  carrier, each moving on the shared clock. A part that moves with another on the clock is never an obstacle at its
  rest pose to it. What shares no carrier with a body stands at rest while the body is swept. A stowing slide is swept
  like any other, so what it hides at its stop is still tested and a shutter into its head needs an entry.
- The swing sense is read once, by the same derivation the build exports, so the swing proven is the swing played. A
  far-side twin swings reflected, and its angles negate with it.
- An allowance is a depth cap, as in the overlap check: `swingContact` for a contact that is intended and says why,
  `swingUnjudged` for one nobody has judged, said again on every run. A stale, doubled or loose entry fails the
  build, and a variant inherits its parent's entries without overriding them. See `models/vehicles/site.libsonnet`.
- Each moving site's placements export carries `swing`: how much of its way it opens before the first contact, and
  what it touches there, so a game can stop a part short of the thing it would hit.

## Why it is built this way

The check runs on every PR, so the cost must stay a fraction of the model build: testing every pose of every piece pair
does not. The sweep therefore clears most of the clock and the parts without measuring them, and measures only where a
pair might meet, at a spacing that no part a grain thick can slip through. The spacing is the sample step, a quarter
grain of travel, because a pair of plates that thin overlaps by more than the contact floor at any such sample. A part
thinner than that, or a pair whose only overlap is the rest depth it already has, is not reported. How the sweep clears
and measures is in `tools/swingSweep.mjs`.

Vehicles are swept on worker threads, one each, and a sweep is cached by the vehicle's inputs and a fingerprint of the
checker, the shared geometry packages it runs on and the Node version, in the export cache folder, so a PR pays only for the vehicles it changes. The cache key leaves out the
allowances: a sweep does not depend on them, and applying them on every run means an allowance edit takes effect at
once and a stale one cannot hide behind a cached result. CI shards the sweeps over the same runners as the models
(`tools/build.mjs`, `fillCacheShard`) so the final build finds every entry present.

The budget is a reason, not a figure: the check may cost a PR what the rest of its build does and no more, and a
change that makes it cost more is a defect to fix in the sweep and not a reason to run it less.

## Consequences

Entries landed as `swingUnjudged` for every contact the catalogue had when the check arrived, so the build stays green
and each one stays visible until fixed or judged.

A part is a rigid body, so a motion that bends or scales it is out of scope. A part that moves but is placed with no
neighbour in its swing has no contact and exports a swing of its whole way.
