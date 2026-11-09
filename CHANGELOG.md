---
read_if:
  - upgrading the assets a product pins, or checking what a release changed for consumers
---

# Changelog

What each release changes for those who consume the assets. Each version's section is assembled from the change notes in `changes/`; see `changes/README.md`.

## 0.4.1 - 2026-11-09

### Breaking

- Vehicle part rows that differed only in paint are merged: a taxi, a police car or a camper van now fits the shared
  pressing, and the site that fits it names the paint in a new `finish`. Part models mark the materials that take paint,
  as `paintable` slots in each part's `*.model.json` and `paintable` in each glTF material's extras.

### Upgrading from 0.4.0

- Apply `renames.json` to saved and authored part ids; the retired rows map to the shared pressing.
- Read `finish` from each site in `vehicles/<vehicle>.placements.json` and from fittings built on them, and when the
  vehicle is spawned put that finish's material from `finishes.json` in place of each material of that copy of the part
  marked `paintable`, never the rest of the part; a site without one keeps the part's own materials.
- Keep the paint with the copy of the part afterwards rather than with the vehicle or the model.

### Added

- The release ships the finish library as `finishes.json`, also the manifest's `finishes`: each finish a vehicle site may
  name, as the glTF material a painted surface in it carries.

### Changed

- A build from source reuses every model whose source and generator code are unchanged, so a rebuild after an edit
  takes seconds rather than minutes. Exported files are unchanged.

## 0.4.0 - 2026-11-09

### Breaking

- Every model is now in glTF's frame: +z forward, +y up, +x the model's left. Held models put their working end on
  +z, vehicle placements are in the model frame with far-side twins mirrored across x, actors face +z, and guns lie
  with their bore along +z and their right along -x.
- Ambiguous model fronts are settled by one rule: a model's front, +z, is where its user faces while using it.
  Things lying on their back, such as garments and mattresses, put their head end at -z, and arm and leg guards,
  sleeves, plates, tails and the kite shield lie lengthways along z. Things with no front in use, such as sheets, tape,
  cut stock, kits and slings, lie with their longest side along x. Held poses are unchanged: the grip turns carry
  the new lay.

### Upgrading from 0.3.2

- Drop any axis conversion on import; every kind of model needs the same turn, none for a consumer in glTF's frame.
- Held models: a grip turn now carries the file onto held axes with the working end +z and up +y, so the
  forward hold turns +z, not +x, to the view's front (in skelly, the half turn about y replaces the quarter turn
  in `prepareModel` and `modelToView`), and the upright hold raises +z (a quarter turn about x instead of z).
- Apply `roll` about +z, not +x, and stand an upright `rest` on its -z end. A lens defaults to the middle of the
  +z end.
- Mirror a left-handed hold across the model's x, not z (in skelly, `mirrorModelZ`).
- Vehicles: lay out blueprints in the model frame, forward +z and the near side at -x: a site at x, y, z in the old
  vehicle frame is now at -z, y, x. Mirror a far-side twin across x (in skelly, `pair()` and `place()`). A view
  that turned a vehicle's front from +x (in skelly, `FORWARD_TO_FRONT`) turns it from +z instead.
- Actors face +z: take yaw as `atan2(facing[0], facing[2])` instead of `atan2(-facing[0], -facing[2])`
  (in skelly, `yawOf` and the other actor yaws).
- Guns: read a gun's anchors, hands, collision and round seats with the bore along +z; the default export's grip
  turn is none. A gun exported outside this repository takes the same turn, `FILE_FROM_GUNGEN` in
  `tools/packages/gun-authoring-tool/src/gun/exportFrame.ts`.
- A magazine round's `tilt` is now about the file's -x, the magazine's right, instead of its +z.
- Cite the frame decision at `docs/decisions/0002-model-frame.md`, renamed from `0002-deadvox-model-frame.md`.
- Drop any turn you added to place or hold one of these models the right way round.

### Added

- Each release's notes now say what it changes for consumers, breaking changes first, and `CHANGELOG.md` keeps them
  for every version.
- Each release ships `renames.json`, also the manifest's `renames`: every model id an earlier release held and this one
  retired, mapped to its current id, so a pin moved over several releases maps saved ids in one lookup.

### Changed

- A cold build from source exports models about three times faster. Exported files are unchanged.

## 0.3.2 - 2026-11-09

### Breaking

- Vehicle parts that were identical to another part are merged into one model, and every vehicle that used
  them now places the surviving part; for example `prison_bus_windscreen` is now `coach_windscreen`, and
  `police_car_dashboard` and `taxi_dashboard` are now `saloon_dashboard`.
- For those who read the sources: model rows and the values authors tune move from
  `tools/packages/thing-authoring-tool/` to `models/`, and the libraries left in `tools/` export only their
  builder functions. Released files are unchanged.

### Upgrading from 0.3.1

- Map stored ids through `renames.json` (also the manifest's `renames`). This release does not ship it yet;
  take it from any later release, whose map is cumulative and covers these ids.
- Read model rows from the file of the same name under `models/` instead of
  `tools/packages/thing-authoring-tool/`; three take new names: `models/shambler-parts.libsonnet`,
  `models/worn-clothing.libsonnet` and `models/flesh-chunks.libsonnet`.
- Read measures from `models/measures/` (`arm`, `leg`, `bust`, `jacket`, `bags`, `container-masses`) and the
  item settings from `models/item-settings.libsonnet`.
- The cans library no longer exports `shellMassKg`; it is local to `models/cans.libsonnet`, so a consumer that
  imported it keeps its own value.

### Added

- Placements for eleven electric and hybrid vehicles, so they can be assembled: `electric_box_truck`,
  `electric_city_bus`, `electric_city_car`, `electric_minibus`, `electric_panel_van`,
  `electric_saloon`, `hybrid_ambulance`, `hybrid_double_decker`, `hybrid_refuse_truck`,
  `hybrid_saloon` and `hybrid_suv`. Each ships in its parent's pack and carries its parent's tags.

### Changed

- `jerry_can` is now a pressed-steel 20 L can instead of a placeholder carton. The plastic `jerrycan`
  and `jerrycan_backpack` are unchanged.
- Vehicle tags: `prison_bus` has the role `utility` instead of `emergency`; `utility_4x4` is also
  `armoured`; `military_ambulance` is a `truck` body instead of `van`, as are its part models, and
  gains the role `emergency`. `battery_tray` carries no `vehicle-body` tag.
- Building from source is incremental: an edit recompiles only the sources it reaches, and
  `tools/build.mjs <id>…` builds any model by id at its pack path.

### Fixed

- `road_flare` marks its striker as its glowing part (`emissiveMaterial` in its model entry).

## 0.3.1 - 2026-11-09

### Breaking

- Catalogue ids are renamed to plain English; for example `binder_top` is now `chest_binder` and
  `helmet_bronze` is now `bronze_helmet`.
- Some models move pack to match their category: `cutting_board`, `iron_pot` and `pan` from
  `skelly.containers` to `skelly.household`, `oven_door` from `skelly.structures` to `skelly.electronics`, and
  `chest_binder` from `skelly.arcana` to `skelly.wearables`.
- For those who read the sources: the catalogue moves from `tools/packages/thing-authoring-tool/catalogue/` to
  `models/catalogue/`.

### Upgrading from 0.3.0

- Map stored ids through `renames.json` (also the manifest's `renames`). This release does not ship it yet;
  take it from any later release, whose map is cumulative and covers these ids.
- Bundle the new pack of each moved model.
- Read catalogue sets from `models/catalogue/sets/` and the worn templates from `models/catalogue/worn.libsonnet`
  instead of `tools/packages/thing-authoring-tool/catalogue/`.

### Added

- About 2,200 ordinary world items from the catalogue, each in the pack of its category, including
  the new packs `skelly.household`, `skelly.furniture`, `skelly.machinery`, `skelly.nature`,
  `skelly.keys` and `skelly.recreation`. Worn weapon gear (holsters, sheaths, slings) is in
  `skelly.wearables`.
- Classical alchemy gear: glassware such as `alembic`, `retort` and `pelican`, heating ware such as
  `athanor` and `sand_bath`, bench tools, instruments and a `grimoire`.
- 105 vehicles that can be assembled from their parts: cars, vans, trucks, buses, military
  vehicles, work and farm machines, trailers and bikes in `skelly.ground-vehicles`, helicopters in
  the new pack `skelly.aircraft`, and wrecks in the new pack `skelly.vehicle-wrecks`.
- Vehicle placements: each vehicle ships `<pack>/vehicles/<vehicle>.placements.json`, listing the
  part model at each site, its offset in the vehicle frame and whether it is a mirrored far-side
  twin. The manifest gains a top-level `vehicles` list.
- Each manifest pack entry gains `dependsOn`: load those packs with it. `skelly.aircraft` depends
  on `skelly.ground-vehicles`, and `skelly.vehicle-wrecks` on `skelly.aircraft`.
- Printed labels: a packaged item's model entry and manifest entry can carry `label`, the text and
  the rectangle it fills. The GLB has no lettering; the consumer draws the text.

### Changed

- `cord_coil` and `small_spring` hold their turns together with a rod.
- Building from source is faster: model exports run in parallel, unchanged Jsonnet sources are not
  recompiled, and the Node version is pinned in `.node-version`.

### Fixed

- The utility vest worn over a jacket no longer cuts into the hoodie beneath it.

## 0.3.0 - 2026-11-09

### Breaking

- `lame_saber` and `sun_shield` move from `skelly.melee` to `skelly.wearables`.
- For those who read the sources: the vehicle part rows move from
  `tools/packages/thing-authoring-tool/vehicle-parts.libsonnet` to `models/vehicle-parts.libsonnet`.

### Upgrading from 0.2.0

- Bundle `skelly.wearables` for `lame_saber` and `sun_shield`.
- Read the vehicle part rows from `models/vehicle-parts.libsonnet`, and the vehicle kits and shared parts from
  `models/vehicles/`.

### Added

- Every manifest model entry carries a `category` and facet `tags` from the vocabulary in
  `models/taxonomy.json`.
- The `leaper` mob in `skelly.bestiary`, with the clips `run`, `pounce` and `flinch`, the gaits
  `limping.walk.left`, `limping.walk.right` and `dragging.walk` chosen by the cuts its body has
  taken, and event timings on its finite clips.
- Four flesh chunks in `skelly.deadvox.actors`: `flesh_chunk_small`, `flesh_chunk_medium`,
  `flesh_chunk_large` and `flesh_chunk_strip`.
- Vehicle parts in `skelly.ground-vehicles`: the shared kit parts and the parts of the saloon (with
  its electric and hybrid noses), the taxi and the crew pickup.

### Fixed

- Symmetric parts no longer voxelize a voxel lopsided, which changes the bytes of most voxelized
  models; pack contents are unchanged.

## 0.2.0 - 2026-11-08

### Added

- `kite_shield` and `tower_shield` in `skelly.melee`.
