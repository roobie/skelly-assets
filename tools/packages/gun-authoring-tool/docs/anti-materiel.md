---
read_if:
  - you work on the anti-materiel rifle archetype
  - you review its proportions or browser regressions
---

# Anti-materiel rifle archetype

The M82 is a proportion reference, not manufacturing geometry; the tool's modelling rule is in https://github.com/roobie/skelly, `things/README.md`, "Rules". The curated design is `models/guns/designs/archetype-anti-materiel.json`, with vocabulary in `src/gun/antiMateriel/`.

The dedicated receiver, lower and magazine exist because the shared families are sized for smaller rifle cartridges. They keep the common receiver, lower and magazine roles so shared feed and geometry rules still apply; see `src/gun/antiMateriel/heavyReceiver.ts`; `src/gun/antiMateriel/heavyLower.ts`; `src/gun/antiMateriel/heavyMagazine.ts`; and `src/gun/antiMateriel/rules.ts`.

The rifle ships without an optic. A scope is an attachment the player fits to the receiver rail, so neither the curated design nor the template's default carries one; the carry handle is still checked clear of the largest scope the rail takes. See `src/gun/templates.ts`, `antiMateriel`, and `test/antiMateriel.test.ts`.

Shroud perforations are display-only: collision and feasibility use convex solids, and surface holes add no useful fit constraint. If a future rule depends on a hole, it needs collision geometry rather than a visual mark; see `src/gun/antiMateriel/barrelShroud.ts` and `test/antiMateriel.test.ts`.

Bipod and carry-handle poses are static design variants, not animated mechanisms. The clearance rules check the chosen pose because neither the geometry model nor the export claims to simulate folding; see `src/gun/antiMateriel/bipod.ts`; `src/gun/antiMateriel/carryHandle.ts`; `src/gun/antiMateriel/rules.ts`; and `test/antiMateriel.test.ts`.

Cartridge-derived clearances use the cited .50 BMG dimensions in `src/gun/antiMateriel/cartridge.ts`. Magazine stacking and rifle dimensions remain visual estimates, not manufacturer specifications; automated fit tests do not establish that those proportions look right.
