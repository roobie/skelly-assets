---
read_if:
  - changing how the showcase or the review sheets show a wearable worn
  - adding a body slot, a worn segment or a wearable whose pieces are drawn in a new doll part
  - changing the default player avatar's models, parts or anchors
  - wondering why a wearable without worn pieces sits on the doll as it does
---

# 8. One dressing rule dresses the doll

## Context

A wearable shown only loose, folded or lying as authored, does not show whether it fits the body it is made for, and
a reviewer cannot judge a sleeve or a boot shaft from a folded slab. The showcase and the review sheets both need to
show it worn, and two placements of the same item would drift apart, so a sheet could pass what the showcase draws
wrong. Most wearables have no worn pieces yet: only a few garments and carried goods are drawn in the body's frames.

## Decision

Both show a wearable worn on the doll, the default player avatar assembled from its bust and limb models, through
one rule: `models/dressing.libsonnet` holds what is content, and `tools/dress.mjs`, `wornSites`, turns it into sites
when the showcase is built (`site/build.mjs`). The review sheets build and draw the showcase, so they draw the same
sites and cannot place a wearable differently.

The doll is assembled from the avatar's own models and anchors, read from the built tree, so a change to the body
moves every worn view with it and no copy of its measures is kept. Each limb hangs by its own anchor from the bust's
anchor of the same name, so a limb authored with its joint off its origin still meets the bust.

A worn piece is drawn in the frame of the doll part its segment names, in every copy of that part, because that is
the frame the piece is authored in for the game. Pieces fitted over other clothing are left out, since the doll wears
each item alone. A piece's frame is a doll part's origin, so a doll part turned off its model's axes is refused
rather than drawn askew.

A wearable with no worn pieces is placed by its slot: against the doll part its slot's place names, centred across
and sunk into it by a share of its own depth. This shows where it belongs and roughly how big it is beside the body,
which a reviewer can judge before the item has worn pieces. A head piece is placed by the bust's brow anchor
instead, its origin at the hairline: a hat stands on its brim in the model frame, so its brim meets the head at the
brow whatever the hat's height, where sinking it by a share of its height would set a tall hat over the face and a
low cap above the head. A piece that encloses the head, a helmet with a visor or a hood, has no brim at the brow, so
it names its own `brow` anchor, the point of it that meets the hairline, and that anchor goes to the bust's instead of
its origin; the point is the author's call, which no box measure can make for them. A folded or lying wearable is stood up first, head end
up and front forward, because the model frame lays every garment flat the same way
(`docs/decisions/0002-model-frame.md`, "Decision"). Its pose stays as authored, so an unsettled front or lying pose
shows as such on the doll too.

## Consequences

Every slot the vocabulary names needs a place on the doll, or the showcase build fails for the first wearable that
names it; a test holds the content to that, see `tools/test/dress.test.mjs`. A worn-only set, with pieces but no loose
model, is not a wearable here and stays shown as its pieces. A rigid head piece is placed by its slot rather than by
the fit a consumer gives it, so its opening must clear the doll's head and hair with its brim at the brow: a hat whose
cone is the head's own width would clip the hair's corners. The wizard hat (`models/catalogue/sets/batch-129.libsonnet`)
widens only its foot for that, near upright over the height of the head, and keeps its cone and brim their original
size above and around it, because scaling the whole hat to the head makes it absurdly wide and stretching its opening
to the head's outline makes a box of it. A skullcap, with no height to spare, sits a little high at the brow; it is
accepted until a cap has worn pieces of its own.
