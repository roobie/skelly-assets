---
read_if:
  - you build, tune or retrace the SKS carbine
  - you change the one-piece wooden stock machinery the SKS shares with the hunting rifle (`src/gun/stockWood.ts`)
  - you add the SKS to the roster, unfold its bayonet or give it a fire mode
---

# SKS export

The SKS carbine is traced from one side photo with simple shapes and built in the Gungen engine, as the hunting rifle and the compact SMG were. It must read as an SKS-45 from the side: the one-piece walnut stock with its straight wrist and raised comb, the fixed angular magazine ahead of a round trigger guard, the receiver with the carrier and its knob on the right, the wooden handguard over the gas tube, the tangent rear sight, the exposed barrel with its gas block and hooded front sight, and the bayonet folded under the barrel.

## Reference trace

The reference is the [Simonov SKS-45 photo on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Simonow_SKS_45_noBG.jpg), kept outside the repository. It shows the gun twice; the trace uses the upper one, whose muzzle points right, so it is the gun's right side and the knob faces the camera. The [trace record](../../../../models/guns/references/sks-profile.trace.json) keeps the photo's registration and the published lengths with their sources. Each value in `src/gun/sksProportions.ts` is a photo estimate in the gun frame, so a retrace changes the table and nothing else.

The photo is not dimensioned, so it is scaled from the published overall length, and the published barrel length places the breech, which the receiver hides. The muzzle is traced; the two lengths then fix the breech and the butt plate's heel, so the gun spans its published lengths whatever the photo's perspective does to them. The origin is the receiver's front face, where the handguard starts, as for the other traced guns (`docs/bolt-action-export.md`, "Reference registration").

A traced shape yields to a gun rule where the two disagree. The trigger guard's corners round off less than the photo's loop, because the guard rule needs its bars to meet its sides.

## Why its own parts

No existing archetype is a good base. The SKS's receiver, carrier, gas tube and sights are their own, so they are built in `src/gun/sks/` from the table and not by bending the sporter or AK receivers toward it, which would tie those guns' geometry to this one. Only the hunting rifle's one-piece stock machinery is shared: the convex wood cells and the inlet cut that lets metal parts into the wood (`src/gun/stockWood.ts`).

Every part is drawn where it sits in the gun frame, and each joint's two ports stand at one point facing each other, so the template places every part where it was drawn (`src/gun/sks/joints.ts`). Two joints take site names other than their slot's: the trigger group carries the magazine itself, and the handguard rides on the gas tube, so neither is the lower or the handguard socket that rules written for other guns expect.

The trigger group holds the fixed magazine, since the SKS loads from above through the open action and has no well. The knob stands off the carrier's right side and runs back through the receiver's open right wall, so its stroke is kept clear under its own name, as every charging handle's is.

## Deferred

- **Bayonet unfolding.** The bayonet is a fixed solid in its folded place; a hinged stop is later work.
- **Fire mode.** The trigger is drawn, but the export does not mark the SKS as semi-automatic only.
- **Roster.** The design is published, but not added to `models/guns/roster.libsonnet`.
