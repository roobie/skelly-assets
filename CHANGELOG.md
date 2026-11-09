---
read_if:
  - upgrading the assets a product pins, or checking what a release changed for consumers
---

# Changelog

What each release changes for those who consume the assets. Each version's section is assembled from the change notes in `changes/`; see `changes/README.md`.

## 0.3.2 - 2026-11-09

### Breaking

- Vehicle parts that were identical to another part are merged into one model, and every vehicle
  that used them now places the surviving part. Relink these ids (old → new):
  - `hatchback_battery_tray` → `battery_tray`
  - `bucket_truck_front_bumper` → `box_truck_front_bumper`
  - `bucket_truck_mudguard` → `box_truck_mudguard`
  - `bucket_truck_rear_underrun` → `box_truck_rear_underrun`
  - `bucket_truck_windscreen` → `box_truck_windscreen`
  - `minibus_bonnet` → `camper_van_bonnet`
  - `minibus_front_bumper` → `camper_van_front_bumper`
  - `prison_bus_dashboard` → `coach_dashboard`
  - `prison_bus_rear_window` → `coach_rear_window`
  - `prison_bus_side_window` → `coach_side_window`
  - `prison_bus_windscreen` → `coach_windscreen`
  - `convertible_dashboard` → `coupe_dashboard`
  - `prisoner_van_front_bumper` → `cube_van_front_bumper`
  - `tour_bus_open_top_dashboard` → `double_decker_dashboard`
  - `tour_bus_open_top_destination_sign` → `double_decker_destination_sign`
  - `tour_bus_open_top_door_aft` → `double_decker_door_aft`
  - `tour_bus_open_top_door_fwd` → `double_decker_door_fwd`
  - `tour_bus_open_top_side_window` → `double_decker_side_window`
  - `heavy_cargo_helicopter_beacon`, `military_transport_helicopter_beacon`,
    `news_helicopter_beacon` → `helicopter_beacon_red`
  - `news_helicopter_landing_lamp`, `police_helicopter_landing_lamp` → `helicopter_landing_lamp`
  - `light_helicopter_seat`, `news_helicopter_seat` → `helicopter_seat`
  - `minibus_floor`, `prisoner_van_floor`, `riot_van_floor` → `high_roof_van_load_floor`
  - `minibus_rear_bumper`, `prisoner_van_rear_bumper`, `riot_van_rear_bumper` →
    `high_roof_van_rear_bumper`
  - `military_ambulance_<part>`, `military_cargo_truck_<part>` → `military_truck_<part>`, for
    `bonnet`, `cab`, `chassis`, `dashboard`, `door`, `front_bumper`, `fuel_tank`, `grille`,
    `rear_bumper`, `rear_mudguard`, `windscreen` and `wing`
  - `ambulance_bonnet`, `animal_control_van_bonnet`, `cube_van_bonnet`, `ice_cream_van_bonnet`,
    `prisoner_van_bonnet`, `riot_van_bonnet` → `panel_van_bonnet`
  - `camper_van_floor` → `panel_van_load_floor`
  - `camper_van_rear_bumper` → `panel_van_rear_bumper`
  - `police_car_dashboard`, `taxi_dashboard` → `saloon_dashboard`
  - `police_car_tail_lamp`, `taxi_tail_lamp` → `saloon_tail_lamp`
  - `police_car_windscreen`, `taxi_windscreen` → `saloon_windscreen`
  - `food_truck_dashboard` → `step_van_dashboard`
  - `food_truck_load_floor` → `step_van_load_floor`
  - `food_truck_rear_bumper` → `step_van_rear_bumper`
  - `food_truck_windscreen` → `step_van_windscreen`
  - `<van>_dashboard` → `van_dashboard` and `<van>_windscreen` → `van_windscreen`, for
    `ambulance`, `animal_control_van`, `camper_van`, `cube_van`, `high_roof_van`, `ice_cream_van`,
    `minibus`, `panel_van`, `prisoner_van`, `riot_van` and `security_van`

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

- Catalogue ids are renamed to plain English. Of the ids already released, rename references:
  `binder_top` → `chest_binder`, `lame_saber` → `sabre_fencing_jacket`, `hammer_bronze` →
  `bronze_hammer`, `hat_cotton` → `cotton_hat`, `helmet_barbute` → `barbute`, `helmet_bronze` →
  `bronze_helmet`, `helmet_conical` → `conical_helm`, `helmet_corinthian` → `corinthian_helm`,
  `helmet_galea` → `galea`, `hood_ninja` → `ninja_hood`, `wizard_hat_costume` → `wizard_hat`, and
  the worn parts `jacket_leather_worn_*` → `leather_jacket_worn_*`, `gloves_leather_worn_*` →
  `leather_gloves_worn_*`, `boots_combat_worn_*` → `combat_boots_worn_*`.
- Some models move pack to match their category; bundle the new pack: `cutting_board`, `iron_pot`
  and `pan` move from `skelly.containers` to `skelly.household`, `oven_door` from
  `skelly.structures` to `skelly.electronics`, and `chest_binder` (was `binder_top`) from
  `skelly.arcana` to `skelly.wearables`.

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

- `lame_saber` and `sun_shield` move from `skelly.melee` to `skelly.wearables`; bundle
  `skelly.wearables` for them.

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
