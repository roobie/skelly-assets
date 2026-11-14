---
read_if:
  - the build reports that a part swings into another part, the ground or a neighbour that is also open
  - a swing entry in a placements file is stale, capped too high or listed twice
  - adding a vehicle part that opens, or placing one beside another
  - the swing check is slow, or CI's swing cache misses
  - changing how a part's motion is resolved, or what the placements export says about a swing
  - a swing needs fixing, or the vehicle authoring tool's Vehicles view or its Solve proposal is in question
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
  rest pose to it. What shares no carrier with a body stands at rest while the body is swept.
- What a stowing slide hides is not drawn, so it meets nothing while hidden, in the sweep and in the all-open pose: a
  shutter rolls into its head with no entry, and what it still shows is tested as any part is. An entry for the stowed
  part would cap the contacts the shown part makes as well, and one would be needed for every shutter. The plane is
  the leading face of the rest bounds of the solids the check measures, as every other depth here is read off those
  solids rather than the drawn voxels.
- The swing sense is read once, by the same derivation the build exports, so the swing proven is the swing played. The
  one exception is a stowing slide's plane: the checked one sits at the authored face, while the exported one can sit
  up to half a grain further out, which falls within the voxel overspill the check ignores. A far-side twin swings
  reflected, and its angles negate with it.
- An allowance is a depth cap, as in the overlap check: `swingContact` for a contact that is intended and says why,
  `swingUnjudged` for one nobody has judged, said again on every run. A stale, doubled or loose entry fails the
  build, and a variant inherits its parent's entries without overriding them. See `models/vehicles/site.libsonnet`.
- Each moving site's placements export carries `swing`: how much of its way it opens before the first contact, and
  what it touches there, so a game can stop a part short of the thing it would hit.

## Why it is built this way

The check runs on every PR, so the cost must stay a fraction of the model build: testing every pose of every piece pair
does not. The sweep therefore clears most of the clock and the parts without measuring them, and measures only where a
pair might meet, at a spacing that no part a grain thick can slip through. The spacing is the sample step, a quarter
grain of travel, because a pair of plates that thin overlaps by more than the contact floor at at least one sample. A
part thinner than that may slip through, and a pair whose only overlap is the rest depth it already has is not
reported. How the sweep clears and measures is in `tools/swingSweep.mjs`, `sweepBody`.

Vehicles are swept on worker threads, one each, and a sweep is cached by the vehicle's inputs and a fingerprint of the
checker, the shared geometry packages it runs on and the Node version, in the export cache folder, so a PR pays only
for the vehicles it changes. The cache key leaves out the allowances: a sweep does not depend on them, and applying
them on every run means an allowance edit takes effect at once and a stale one cannot hide behind a cached result. CI
shards the sweeps over the same runners as the models (`tools/build.mjs`, `fillCacheShard`) so the final build finds
every entry present.

The budget is a reason, not a figure: the check may cost a PR what the rest of its build does and no more, and a
change that makes it cost more is a defect to fix in the sweep and not a reason to run it less.

## A failing site gets a proposal, never an edit

A failing site is more useful with a remedy than with a bare verdict, so the vehicle authoring tool's Vehicles view offers
one from `tools/swingPropose.mjs`, `proposeFix`. The proposer holds no rule of its own about what clears: it accepts a
candidate only when the checker's own report for the vehicle shows no failing site of the part. A proposal is therefore as
good as the checker for the vehicle it was made in, and no better. It changes the part, because the author edits the part,
so every site of it in that vehicle takes the change. It answers for the part's own sites only: what a fix cannot change,
such as another part's swing into this one at rest, is not its to answer for, and an entry the fix wears out is handed
back for the author to drop or judge again, never a reason to refuse the fix. Other vehicles that place the part are not
swept, so a proposal never claims to clear them; the build tells the author.

It proposes and writes nothing, because the pins are drawn by a template that other vehicles share: the offset in the
vehicle frame cannot say which template parameter to change, and a silent edit to shared content would move vehicles
nobody opened. The author hand-merges it, as with the tool's Save. The verdicts need Jsonnet evaluated in Node, so only
the dev server shows them; a published tool has no Vehicles view data.

## Consequences

A contact is fixed at its cause, in the shared builder where the cause lies, before an entry is considered; an entry
stays for a contact a judgement keeps or one awaiting judgement, never as the default. The check covers placed
vehicles only, so an opening part no vehicle places is not swept.

A part is a rigid body, so a motion that bends or scales it is out of scope. A part that moves but is placed with no
neighbour in its swing has no contact and exports a swing of its whole way.
