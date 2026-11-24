---
read_if:
  - adding a doll, or a figure on a skeleton the dolls do not have
  - changing a joint, a girth or a length of either doll's body, or wondering why the player's is the UAL mannequin's
  - fitting a garment to one doll only, or a garment fits one doll and not the other
  - a part of the UAL doll stands off its bone, or the UAL mannequin's GLB or its skeleton file changes
  - seating a worn piece on the UAL doll, or reading what it hides there
---

# 23. A second doll stands on UAL's skeleton, and one set of garments fits both dolls

## Context

rog1 poses its figures on the skeleton of Quaternius's Universal Animation Library 1 mannequin, with UAL's clips, and
wants skelly's worn gear on them, seated by bone name with no fit table of its own. Its spike seated the player's
pieces on UAL's bones with a move, a turn and a stretch per part: the skin poked through until the pieces were widened
by 15 to 25 per cent, which made the shoulders boxy, and each part's origin had to be rebuilt from sites and node
translations. The other consumers, arpg1, ahg3 and deadvox, pose the player's rig with skelly's own clips, holds and
joint limits.

## Decision

UAL's figure is a second doll, `ual`, beside the player, and not a retarget of the player. The two rigs differ in
kind: UAL names its bones its own way, rests in a T-pose, turns its bones' rest frames, differently on each side, cuts
the spine into three and carries the clavicles in the trunk. A game on UAL's skeleton must find each part on a bone of
that skeleton as it stands, and a map from the player's rig onto it would be the fit table rog1 asked not to keep, held
once in every such game. A doll is a record of content (`models/dolls/ual/doll.libsonnet`) under the one dressing rule
(`docs/decisions/0008-dressing.md`), so the second doll adds no second rule.

The doll has one part for each bone that bends. A rigid piece rides one bone, so a part spanning two could follow
neither, and with a part per bone a hideable region (`docs/decisions/0012-hidden-body.md`) is whole parts, closed by
construction; only the foot is still cut within a part.

UAL's rest skeleton is content, measured once from the vendored mannequin (`models/references/ual1`,
`models/dolls/ual/skeleton.json`, written by `tools/ual-skeleton.mjs`), and the file names the hash of the GLB it was
read from, which a test holds it to. Every joint position and bone length of the doll derives from it; girths are set
by hand against the mannequin, because measuring them off its mesh would be a tool for one use. Since the derivation is
exact, each part's origin is held to its bone's head within a tenth of a millimetre, and each node's rest turn to the
skeleton's as closely (`tools/dollRig.mjs`, `SKELETON_TOLERANCE`): a looser bound, such as half a voxel, would pass
real errors.

The T-pose is a turn of the arm's site, not of its model. Limb models stay authored hanging, so a worn piece, which
is drawn in a part's frame, is authored once against the part as it hangs and follows however a doll rests it. The
thumb is a limb for the same reason: the mannequin's leaves the hand at 36 degrees, a part is drawn square to its
model's axes, and that lean drawn in the arm's model was a stair of thin steps that read as no thumb. The
mannequin's three thumb bones run in one line, so the thumb is drawn hanging straight in a model of its own and one
turn, on the hand, rests all of it on both dolls.

Garments get no version per doll. Pieces fitted per doll from shared content were built first and withdrawn: they
doubled the worn models and their build, left every consumer to choose a garment by doll, and let two fits of one
garment drift apart. The bodies were reconciled instead, the player's to UAL's in every region, head, trunk, shoulders,
arms, hands, legs and feet, because UAL's skeleton is what its consumers animate and cannot move, while the player's
poses are skelly's own and can be authored again. Both dolls read their joints and shared girths from one place
(`models/dolls/ual/joints.libsonnet`). Where a hold authored against the old, shallower body then clipped the new
one, the hold was re-authored and the clip allowances kept, since easing a girth toward the old player would have
split the dolls again and wider allowances would have hidden real clips.

What still differs between the dolls is how the same body is cut into parts, and each doll's record says so in its own
words. A worn piece's segment names the player's part, and the doll's `slots` name the part of its own that the piece
is drawn in, with where the player's part frame lies in it when the two turn about different joints, as the chest and
the pelvis do. A piece's `covers` resolve to the doll's own regions by name, so hiding stays by name on both dolls and
no map of one doll's regions onto the other's is kept.

A game reads none of that record. A worn model's manifest entry keeps the player's names for its part and for what it
covers, since one entry cannot name every doll's, and each doll's rig carries the answer on its bones (`bind.wears`):
the name the bone's part is worn under, where a piece drawn on it rests in the bone's node, and what each name a
piece may cover hides of the bone's part. The rig was chosen over a slot map in the manifest because a game already
reads the rig to bind each part to its bone, so seating and hiding a piece is one lookup on a bone it holds, and a map
would have been a second table to join to the first, in every game. The player's rig carries the same fields, so a
game reads either doll one way. The rest check (`docs/decisions/0019-garment-rest-check.md`) and
the cover check run every garment on both dolls, so a garment cannot come to fit one and not the other unnoticed.

## Consequences

A change to a joint, a length or a shared girth moves both dolls and every garment over them, and the player's
consumers took the reconciling as breaking changes: a taller figure, renamed digits, clavicle and toe bones, and
re-posed holds. A new hold must fit the shared body as it is; when one cannot, another way to carry the weapon is
chosen, as the shoulder carry replaced the low two-hand idle.

A third doll on the same body cut another way is another record. One on a different body would need per-doll fits
after all, or a third reconciling, and that choice is open.

A changed mannequin GLB fails the hash test until the skeleton is measured again, and every measure derived from it
moves with it.
