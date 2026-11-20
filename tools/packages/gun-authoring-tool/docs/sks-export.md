---
read_if:
  - you build, tune or retrace the SKS carbine
  - you change the one-piece wooden stock machinery the SKS shares with the hunting rifle (`src/gun/stockWood.ts`)
  - you add the SKS to the roster or unfold its bayonet
---

# SKS export

The SKS carbine is traced from one side photo with simple shapes and built in the Gungen engine, as the hunting rifle and the compact SMG were. It must read as an SKS-45 from the side: the one-piece walnut stock with its straight wrist and raised comb, the fixed angular magazine ahead of a round trigger guard, the receiver with the carrier and its knob on the right, the wooden handguard over the gas tube, the tangent rear sight, the exposed barrel with its gas block and hooded front sight, and the bayonet folded under the barrel.

## Reference trace

The reference is the [Simonov SKS-45 photo on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Simonow_SKS_45_noBG.jpg), kept outside the repository. It shows the gun twice; the trace uses the upper one, whose muzzle points right, so it is the gun's right side and the knob faces the camera. The [trace record](../../../../models/guns/references/sks-profile.trace.json) keeps the published lengths with their sources, and the table and its test read them from there, so a corrected citation cannot leave either behind. Each other value in `src/gun/sksProportions.ts` is a photo estimate in the gun frame, so a retrace changes the table and nothing else.

The record has no visible-edge SVG. The contours are written once, in gun units, in the table; an SVG would be a second copy of them, the very disagreement it exists to prevent, and the overlay that reads it is not needed while the cited lengths, not the photo's scale, fix the gun's span.

The photo is not dimensioned, so it is scaled from the published overall length, and the published barrel length places the breech, which the receiver hides. The muzzle is traced; the two lengths then fix the breech and the butt plate's heel, so the gun spans its published lengths whatever the photo's perspective does to them. The origin is the receiver's front face, where the handguard starts, as for the other traced guns (`docs/bolt-action-export.md`, "Reference registration").

A traced shape yields to a gun rule where the two disagree, since the rule guards how every gun works and the trace only estimates how this one looks.

## Why its own parts

No existing archetype is a good base. The SKS's receiver, carrier, gas tube and sights are their own, so they are built in `src/gun/sks/` from the table and not by bending the sporter or AK receivers toward it, which would tie those guns' geometry to this one. Only the hunting rifle's one-piece stock machinery is shared: the convex wood cells and the inlet cut that lets metal parts into the wood (`src/gun/stockWood.ts`).

Every part is drawn where it sits in the gun frame, so a retrace moves a part and its joint together and no offset can drift between them (`src/gun/sks/joints.ts`).

The trigger group is an integral-magazine lower, since the SKS loads from above through the open action and has no well; the feed rule then accepts it as it would a lower over a well. The knob's stroke is kept clear under its own name so the action rules guard it as they do every charging handle's.

Its cycle is its own content (`models/guns/tables/sksAction.jsonnet`), not the AK's: the AK's gas system drives a carrier much like it, but the SKS fires once per pull and holds open on its last round.

## Deferred

- **Bayonet unfolding.** The bayonet is a fixed solid in its folded place; a hinged stop is later work.
- **Roster.** The design is published, but not added to `models/guns/roster.libsonnet`.
