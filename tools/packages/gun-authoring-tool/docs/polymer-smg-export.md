---
read_if:
  - you build or tune the polymer SMG or its side-folding skeleton stock
  - you retrace the polymer SMG from its reference drawing
  - you add a traced SMG section or change the traced-SMG builders it shares with the compact SMG
  - you add the stock's fold motion or rail-mounted optics to the polymer SMG
---

# Polymer SMG export

The polymer SMG is an approximate UMP9, built the same way as the compact SMG (`docs/compact-smg-export.md`). It must read as a UMP from the side. That means a boxy flat-top receiver with a top rail, a rear-sight hump and a hooded front-sight tower. It also needs a handguard with side and bottom rails, a grip with a large integral trigger guard, and a long, straight magazine tilted forward. The stock is a skeletal side-folder, and the charging handle sits forward and to the left on a cocking tube. The gun carries a generic name because it is an approximation, not a licensed likeness.

## Reference and scale

The reference is a labelled side-view drawing of the UMP supplied by the owner and kept outside the repository. It is an illustration, not a photo, so its proportions are only approximate. A retrace against a better source changes `src/gun/polymerSmgProportions.ts`, `POLYMER_SMG_PROPORTIONS`, and nothing else.

The drawing has no dimensions, so it is scaled from one published length. That length is the extended overall length of 690 mm, from the threaded muzzle tip to the butt plate's rear face ([Heckler & Koch UMP, Wikipedia](https://en.wikipedia.org/wiki/Heckler_%26_Koch_UMP)). The same source gives the 200 mm barrel, which runs back from the threaded tip to place the breech. It also gives 450 mm folded and 2.3 kg for the UMP9. The published lengths outrank the drawing: the stock's reach is derived from the 690 mm, not read off the picture (see `stockReachU`). Registration follows the compact SMG: the bore is horizontal and the origin is the receiver's front face.

## Rulings

- **Shared builders.** The compact and polymer SMGs share one set of builders, and each traced section is a table (`src/gun/tracedSmgSections.ts`). The two guns differ in outline, not in construction. Copying the builders would let the copies drift apart, and a third traced SMG then costs only a table. Adding the polymer section must leave the compact SMG's export byte-identical.
- **Sights and rails.** The rear-sight hump, the front-sight tower and hood, and the rails are traced as receiver, barrel and handguard solids, so the receiver keeps `rail: 'none'`. The rule from the compact SMG applies: no sight at all is better than a sight that looks like another gun's. The rails show the gun's shape. Mounting optics on them is a separate interface and has not been built yet.
- **Trigger guard.** The large guard keeps the trigger-guard rule's equal clearances and wall thickness, and its upright rear wall meets the grip face to face. Where the drawing's curve disagrees with that rule, the rule wins, as on the compact SMG.
- **Charging handle.** The handle reuses the compact SMG's notched tube and lock-back, because the UMP's handle works the same way. Only the tube's height and the knob's reach change, so the knob clears the wider handguard.
- **Stock.** Only the extended pose is built, which is the length the scale comes from. The fold is a configuration state, like the compact stock's pose, so the fold motion will come later as a pose and not as part of the firing cycle. The skeleton stock is traced to this one gun, so its `length` param does not change it.
- **Calibre and roster.** The gun uses the existing 9x19 cartridge. It is not on the roster yet, so it does not ship in Deadvox until someone chooses to add it.
