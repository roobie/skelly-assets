---
read_if:
  - the build reports that the doll pokes out of a worn piece at rest, or a rest poke entry is stale or loose
  - adding a fitted garment, or changing a worn piece, the doll's body or the dressing
  - an entry in models/rest-pokes.libsonnet is in question
  - the rest-poke check is slow, or CI's rest-poke cache misses
---

# 19. Every fitted garment leaves none of the doll poking through it at rest

## Context

A fitted garment is drawn as worn pieces that ride the doll's parts (`docs/decisions/0008-dressing.md`). The showcase
checks that each piece encloses what it declares it covers, but it counts a point a piece passes beneath as covered,
as a jacket's yoke passes beneath a deltoid that stands proud of it, so it cannot see the skin poking out there. The
rest probe can (`docs/decisions/0011-clearance-classified.md`). It was a test over a handful of garments picked by
hand, which was most of the suite's time and left every other garment, and new ones, unguarded; a garment that poked
was left out of the list silently.

## Decision

The build probes every fitted garment on the doll at rest and fails on any body point that pokes out of the piece
meant to cover it, naming the garment, the doll's bone, the piece and how deep it pokes. See `tools/restPoke.mjs`.

- A poke is allowed only by an entry in `models/rest-pokes.libsonnet`, so an exception is content a modder or a
  reviewer can see and change: `poke` for one that is intended and says why, `unjudged` for one nobody has judged,
  said again on every run. An entry is capped at the depth it was written for, per garment, bone and piece, and a
  stale, doubled or loose entry fails, so the list cannot rot. A cap is no margin in the sense of decision 11: it
  names one place and its depth, and a poke anywhere else is still found.
- The deepest poke of each bone and piece is what an entry caps, since that is the one figure a reader can check
  against the review sheets, and a garment that pokes deeper anywhere along the same pair has changed its fit.
- Only the build runs it, not `tools/check-sources.mjs`: it reads the built doll and pieces, which the sources alone
  do not give.

## Why it is built this way

The probe samples the doll's whole surface for each garment, which is minutes of work over the catalogue, too slow
for a test but a small part of a clean build, and needless when nothing it reads has changed. It is therefore cached
by its inputs, as the swing check is (`docs/decisions/0016-swing-check.md`): the doll's and the pieces' GLBs and
declarations, the dressing, the rig and the checker's code. A key made from what was built rather than from the
sources' rows holds whatever path built them, and a change to a model's code that leaves its GLB alone costs no probe.

CI spreads a clean build's probes over the shards like its models. A shard has no built tree, so it generates the doll
and its garments' pieces through the export cache; a model another shard owns is generated twice, which costs seconds
against the probe's minutes, and both make the same entry. The build job then fails on an entry it had to add, as for
every other cache entry, so a probe no shard made is found rather than run on one runner.

## Consequences

A test keeps only the fixture that shows the check finds a poke by its depth and honours an entry, so the suite no
longer pays for the catalogue. The check proves only the rest pose; what a pose drives through a garment is the
clearance sweep's report, `tools/clearance-sweep.mjs`. Nor does it see a piece sunk at rest into a limb it does not
ride, as a thigh guard into the hand hanging beside it: no skin is left uncovered there, so it is no poke (decision
11), and calling it one charged the hand's whole far side to the guard, which no entry could judge.
