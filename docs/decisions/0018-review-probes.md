---
read_if:
  - choosing which unreviewed catalogue rows to review first
  - a review probe flags a row, or misses a defect a reviewer found
  - deciding whether a review probe should become a build check
  - adding a probe for a kind of defect reviews keep finding
---

# 18. Review probes rank a review queue and do not fail the build

## Context

The catalogue is too large for a reviewer to look at every row soon, and the same few defects kept coming back from
reviews: a part set a cell off the middle of what it caps, a shape that is nearly but not quite round or square, parts
that float apart from the rest, and a pipe or wire drawn as short pieces that the voxel grain breaks into a staircase
or a jagged line.

Each of these can be read off a model without a person, but none is a rule every model must keep. A set of dice lies
apart and a teapot has its spout on one side. Rows a reviewer passed still show findings: a probe sees the near miss,
not whether it was meant.

## Decision

The probes rank the rows nobody has reviewed, most likely defects first, so a review spends its time where a fix is
likeliest; they are a report, run on demand, and never a check in the build or CI. A check needs no false findings on
the catalogue, or a true reason recorded for each allowed one, and these probes flag intended shapes too often for
either: the allowance list would hold most findings and stop meaning anything. See `tools/review-probe.mjs`,
`rankedQueue`.

Shape probes judge the built model as the cells of its own voxel lattice that its surface passes through, so a model is
judged at the grain it is drawn at, which is the grain a reviewer sees. Symmetry is judged per slot about the slot's
own middle, because a model's parts are rarely all symmetric about one plane, and only across the level axes, because
a thing's top is rarely its base turned over. A near miss counts only between what sampling a true mirror leaves
unmatched and what a shape not meant to be symmetric misses. See `tools/shapeProbe.mjs`, `shapeFindings`.

Run probes judge a row's pieces, because a staircase of round pieces stepping along a slant is one pipe drawn the wrong
way whatever it looks like voxelized, and the source says so plainly where the cells would not. See
`tools/runProbe.mjs`, `stairRuns` and `thinRuns`.

The verdicts that say which rows were reviewed are the review's own tracking and stay out of the repository, so the
tool takes them as an argument.

## Consequences

Each probe was shown to find a defect a review recorded as fixed, in the model or source from before the fix, and to
miss it after.

A part set beside the middle of another, such as a brush head off the line of its handle, is not found: both parts are
their own mirror, and telling a part meant to sit to one side from one that slipped needs to know which parts are meant
to share a line.

Probing reads every unreviewed model's surface, so a full run takes many minutes; it runs on demand, like the review
renders.
