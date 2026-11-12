---
read_if:
  - judging whether a worn item shows the body through it, or what the clearance probe or the skin check reports
  - adding a tolerance, a margin or a threshold to the clearance probe or the skin check
  - running the clearance sweep, or reading its report
---

# 11. Clearance findings are classified, not forgiven by a margin

## Context

A garment rides its doll parts rigidly, so a pose changes its fit only at the joints, and a fit can be wrong at rest
as well. The first probe forgave every body point within a margin of its garment, so that a flush fit read clean.
The margin was wider than the faults it had to find: a leather jacket's chamfered shoulders left strips of the
doll's blockier deltoids showing, and the probe called the jacket clean. A margin cannot tell a face that lies on
the garment's, which draws in stripes, from one a hair beneath it, which never shows.

## Decision

**Classify, with no margin.** The probe (`site/clearance.mjs`, `clearanceProbe`) sorts every finding into a kind
whose meaning does not depend on how far it is: a covered body point outside every piece pokes; one on a piece's
outer face is flush, a coincident face that draws in a tie and shows as stripes; one hidden inside the figure, as
where parts meet or a lining lies against the body, is not a finding. A piece point a pose drives into the body sinks,
unless it was there at rest by design or lies inside another piece, a seam. Every kind is reported, so a reviewer
weighs a flush ledge and a deep poke from one report instead of a margin deciding for them.

**The one tolerance is the float error.** `COINCIDENT` is the distance under which two surfaces are one. It is set
far above what float storage and a few transforms move a vertex by, and far below a review pixel, so no fault a
camera could show is called coincident and no exact contact is called a poke. `PITCH` samples each face finely
enough that a strip passing out between a coarse part's corners is still sampled; a strip narrower than it is narrower
than a review pixel. Neither is a fit allowance, so neither should grow to quiet a finding.

**What a piece covers is what it encloses or passes beneath.** A body point is meant to be covered when a piece
encloses it at rest, or when a ray from it into its part, across the bone, meets the piece still inside the part, as a
jacket's yoke passes through a deltoid standing proud of it. Coverage by span along the bone was tried and dropped:
it gave a belt bag the whole small of the back to cover. A ray along the bone is not used, because it leaves through
the part's end into the next piece's opening and would make a cuff cover the fingertips. A piece that declares what
it covers of the part copy it rides (`docs/decisions/0012-hidden-body.md`, "Decision") passes beneath only that, so a
tank top's armholes and straps, which lie beneath the deltoids and pectorals it leaves bare, do not make bare skin
count as covered. What a piece encloses it still covers, declared or not, because enclosure needs no guess at intent.

**A camera check beside the probe.** The probe says where and how far; whether it shows depends on the view. The skin
check (`site/skin.mjs`, `skinCheck`) draws the covered surface in a colour of its own over the figure from the review
views and counts its pixels. It is nudged towards the camera by a constant depth offset, so a coincident face counts
as showing, as its tie does on screen; a slope-scaled offset was dropped because it drove faces seen edge-on through
garments standing off them. It draws only sample triangles covered at every corner, because a triangle a hem crosses
would paint its uncovered part as showing.

**A sweep over the wardrobe, on demand.** `tools/clearance-sweep.mjs` runs both checks on every wearable that rides
the doll's bones, in every pose fixture, and ranks them by covered skin showing, so a rig or doll change is judged
on the whole wardrobe at once. It draws in a browser and takes minutes, so it is a review tool, not a check on every
change; the browser test of the skin check runs in the manual slow-tests workflow for the same reason. Tests assert
the kinds a known-bad and a known-good fit produce, never a count, which moves with every garment.

## Consequences

The report is long for a garment that is close to the body everywhere, since every flush face is listed; the ranking
by pixels showing keeps the worst first. A wearable placed whole rather than on the doll's bones is listed as not
swept, since no pose moves it relative to the body.
