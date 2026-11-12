---
read_if:
  - upgrading the assets a product pins, or checking what a release changed for consumers
---

# Changelog

What each release changes for those who consume the assets. Each version's section is assembled from the change notes in `changes/`; see `changes/README.md`.

## 0.5.0 - 2026-11-11

### Breaking

- For game developers: `rifle_assault` now ships with iron sights, its A2 front post and a new removable rear aperture
  sight, attachment `rail-rear-sight` (model `rail_rear_sight`), on the upper's rail. The 1-6x scope is no longer fitted
  but still fits that rail once the rear sight comes off.
- Wheels can carry drum brakes: a drum and a shoe assembly at sites of their own, with backing plate, shoes and wheel
  cylinder as salvage rows. Trucks, buses, the half-track and the microcar's rear wheels choose disc or drum per axle,
  so some vehicles' brake parts, sites and masses change, and wheel assemblies are named for their brake.
- The worn shells of the jacket, hoodie, jeans, rubber boots and sneakers are named for their garment, as
  `<garment>_worn_<segment>`, so the showcase and the review sheets dress the doll in them. They are fitted round the
  player body by the worn-fit templates, so the body no longer shows through them at rest; their proportions follow
  the body's measures, each declares in `covers` the doll it encloses, and the sneakers are high-tops with a shaft of their own.
- The models that each sat in a hand-picked pack now ship in the pack their category routes to, as every other catalogue
  model does. No model id changes. Ten packs that held only such models are gone: `skelly.basic-recipes`,
  `skelly.deadvox.camp`, `skelly.deadvox.rural-sites`, `skelly.deadvox.scenario.gauntlet.city`,
  `skelly.deadvox.scenario.lock-test`, `skelly.deadvox.scenario.playtest`, `skelly.electric-power`, `skelly.flame-tools`,
  `skelly.fuel` and `skelly.packaged-foods`. `skelly.deadvox.actors` keeps its actors but no longer carries the severed
  shambler parts and flesh chunks.
- Vehicle part masses are rebalanced so each part weighs what its geometry could: truck frames are lighter, engines,
  axles, bodies and booms heavier, and heavy vehicles land in real curb-weight ranges. The bucket truck now fits
  `box_truck_chassis` and a new `bucket_truck_hydraulics` part; `bucket_truck_chassis` is retired.

### Upgrading from 0.4.2

- Register an item for the `rail_rear_sight` model, as for `rail_front_sight`, so the rifle's fitted rear sight has an
  item to become.
- Apply `renames.json`; axles drawn without their brakes now end in `_bare`.
- Offer the `<wheel>_brake_drum` and `<wheel>_brake_shoes` sites as loot alongside the disc brake's; keep turning only
  the wheel site.
- Read wheel assemblies as `<wheel>_disc_assembly` or `<wheel>_drum_assembly` in place of `<wheel>_assembly`.
- Apply `renames.json`; `worn_jacket_body` maps to `jacket_worn_body`, and so on for each shell.
- Dress the sneakers' new `sneakers_worn_shaft` on each shin hem, as the rubber boots' shaft is.
- Read these models from their new packs, and bundle those packs in place of the removed ones:
  - `skelly.basic-foods`: `beans`, `canned_beans`, `canned_soup`, `chocolate_bar`, `crackers`, `empty_can`,
    `empty_soda_can`, `juice_carton`, `opened_beans`, `opened_soda`, `opened_soup`, `soda`, `soda_can`, `soup`,
    `water_bottle` (from `skelly.packaged-foods`).
  - `skelly.body`: `flesh_chunk_large`, `flesh_chunk_medium`, `flesh_chunk_small`, `flesh_chunk_strip`,
    `shambler_head`, `shambler_left_arm`, `shambler_left_leg`, `shambler_right_arm`, `shambler_right_leg`,
    `shambler_torso` (from `skelly.deadvox.actors`).
  - `skelly.containers`: `gas_canister` (from `skelly.fuel`); `fanny_pack`, `hiking_backpack`, `school_backpack`
    (from `skelly.wearables`; their worn shells stay there).
  - `skelly.electronics`: `aa_battery`, `night_vision_goggles`, `portable_radio` (from `skelly.electric-power`).
  - `skelly.hand-tools`: `blowtorch` (from `skelly.flame-tools`); `hand_saw` (from `skelly.basic-recipes`);
    `bottle_jack`, `engine_hoist`, `scissor_jack` (from `skelly.ground-vehicles`).
  - `skelly.household`: `can_opener`, `kitchen_knife` (from `skelly.hand-tools`).
  - `skelly.keys`: `camp_armoury_key`, `camp_hq_safe_key` (from `skelly.deadvox.camp`); `pharmacy_key`,
    `police_armoury_key` (from `skelly.deadvox.rural-sites`); `gauntlet_lab_entry_card` (from
    `skelly.deadvox.scenario.gauntlet.city`); `shed_key` (from `skelly.deadvox.scenario.lock-test`); `dad_cabin_key`
    (from `skelly.deadvox.scenario.playtest`).
  - `skelly.light-sources`: `flashlight`, `headlamp` (from `skelly.electric-power`); `dead_desk_lamp` (from
    `skelly.electronics`).
  - `skelly.materials`: `wooden_plank` (from `skelly.basic-recipes`); `field_patch` (from `skelly.electronics`);
    `hinge_set` (from `skelly.structures`).
  - `skelly.wearables`: `baseball_cap` (from `skelly.deadvox.scenario.playtest`).
- Apply `renames.json` to saved and authored part ids; `bucket_truck_chassis` maps to `box_truck_chassis`.

### Added

- For game developers: the armoured personnel carrier fits its turret as a core at `turret` plus a 14.5 mm heavy machine
  gun, a coaxial 7.62 mm machine gun, a day sight, two periscopes, a hatch and six smoke launchers at sites of their own,
  each a lootable row; the guns are weapons. The whole turret is lighter, so the carrier weighs about 16.4 t.
- For game developers: a new vehicle, `cab_over_field_car`, a hard-top forward-control 4x4 on portal axles in olive
  paint, about 2.3 t empty and 4.35 m long. A petrol six sits between the front seats under a cover; it has two cab
  doors, a side door each side, and a single rear door carrying the spare. A new engine row, `i6_petrol`, comes with it.
- A conventional box truck, `conventional_box_truck`: the box truck's box behind a long-bonnet cab, as most Kodiak box
  trucks were built, on a longer wheelbase. Its cab, bonnet, wings, grille, front bumper and chassis are new parts named
  `conventional_box_truck_*`; it shares the box truck's box, rear doors, mudguard and rear underrun bar.
- For game developers: a CV9040 tracked infantry fighting vehicle, tagged armoured and military, with a two-man turret
  whose 40 mm Bofors autocannon, coaxial machine gun, sights, periscopes, hatches and smoke launchers are lootable rows,
  and a Scania V8 diesel on the engine assembly kit.
  Tracks fit as a band of links plus a sprocket, idler and road wheels at sites of their own, each a lootable row shared
  by its track class; the excavator and trencher gain them too, and a game can spin the wheel sites.
- For game developers: the saloon, taxi, estate, coupe and police car fit their engine as a core at `engine` plus an
  alternator, starter motor, air box, fuel pump and drive belt at sites of their own, each a lootable row shared by every
  light engine; other vehicles keep one fused engine model, with the same total mass.
- For game developers: the saloon and its derived cars, the estate, coupe, police car and semi tractor fit their exhaust, fuel tank and radiator as parts: a front pipe, catalytic converter, mid pipe, muffler and tailpipe, a tank body with filler neck and straps, a radiator core with fan and hoses.
  New lootable rows are `catalytic_converter_*`, `muffler_*`, `fuel_filler_neck_*`, `cooling_fan_*`, `radiator_hose_*` and each exhaust's pipes and tank's body and strap; `semi_tractor_stack` is now the pair of `exhaust_semi_tractor`, 20 kg heavier for its under-frame runs and mufflers, and the other fused rows keep their ids and masses.
- For game developers: each part node of a multi-part model, such as a gun, names its `mount` and `meets` in its
  extras, the port sites where it meets its neighbours, and port nodes carry their `standard`; nodes, meshes and masses
  are unchanged. The showcase and `tools/model-sheet.mjs` draw such models exploded into their components.
- For game developers: a WWII armoured half-track after the US M3, with a steered wheeled front axle, a tracked rear bogie, an open troop bay and a pedestal mount site. It weighs about 7.1 t rather than the real 8 t because crew kit, stowage, fuel, ammunition and the gun are not modelled.
- For game developers: a worn model can say which of the avatar's body it hides. The bust's torso is drawn as two
  primitives, marked `trunk` and `shoulders` in each primitive's `extras.piece`, each a closed surface. A worn model's
  sidecar and manifest entry may carry `covers`, naming the avatar part it is drawn on or regions of that part. Stop
  drawing those primitives of that part copy while the model is worn, so the skin under a close shell no longer
  flickers through it.
- For game developers: a new vehicle, `light_4x4_truck`, a civilian four-wheel-drive cargo truck with its cab over the
  engine and a dropside platform, about 3.1 t empty. It fits a new medium petrol V8, `engine_v8_petrol_medium`, as an
  assembly whose alternator, starter motor, air box, fuel pump and drive belt are new medium-class rows.
- For game developers: two new vehicles, `microcar`, a two-seat city car about 2.7 m long with its three-cylinder engine
  under the boot floor, about 815 kg empty, and its electric variant `electric_microcar`. They bring a new engine,
  `engine_i3_petrol`, its exhaust, staggered 15-inch wheels, a De Dion rear axle with drum brakes and a small traction pack.
- For game developers: a scavenged pipe rifle, `rifle_pipe`, a single-shot turn-bolt in 9x19 with a rusted pipe barrel
  strapped to a plank and a taped board stock; it loads one round by hand and carries no magazine.
- For mod and game authors: the showcase has a pose page that bends the default player avatar within its joint limits,
  plays the player's clips on it, shows where a worn garment lets the body through, and saves a pose as a player clip frame.
- For mod authors: `tools/model-sheet.mjs --views underside` draws a vehicle from below and behind, and `--sites` keeps
  only the sites whose ids start with the given prefixes, so an exhaust run, a fuel tank or a radiator can be reviewed
  without the body that hides it. Exhausts, fuel tanks and radiators are drawn on their own as kit assemblies too.
- For game developers: the saloon and its derived cars, the estate, coupe, police car and semi tractor have a brake disc and caliper at `<wheel>_brake_disc` and `<wheel>_caliper` beside each wheel; keep turning only the wheel site, and expect these cars to weigh 32 kg more.
  `wheel_205_55r16` and `wheel_295_80r22_5` keep their ids and masses with spoked rims, and new lootable rows are `tyre_*`, `rim_*`, `brake_disc_*` and `brake_caliper_*`, the tyre and rim being what a salvaged wheel yields.
- For mod authors: the showcase's viewer shows a wearable worn on the default player avatar as well as loose, and
  `tools/model-sheet.mjs` draws it worn beside its four loose views.
- For game developers: the tank top can be worn. `tank_top_worn_body` fits the doll's trunk under a shirt, in the folded
  tank top's heather grey, with a strap over each shoulder and the shoulders bare.
- For game developers: the wizard robe can be worn. `wizard_robe_worn_body`, `_pelvis`, `_upper`, `_fore`, `_thigh` and
  `_shin` fit the doll in the folded robe's navy, shimmer and gold; seat `_pelvis` on the hips so the skirt follows the legs.

### Changed

- For game developers: the armoured personnel carrier now weighs about 10.7 t empty (was 16.4 t). Its hull weighs its
  steel plate, its wheels and axles are heavier, and it fits a new, lighter `engine_v8_turbo_diesel` in place of
  `engine_i6_heavy_diesel`. It sits about 1.5 t under an empty BTR-80's 12.2 t because it is drawn about 15% smaller and
  does not model the water jet, winch, bulkhead and stiffeners, radios, filtration unit, batteries (it fits the shared
  14 kg car battery for the real two of 72 kg), tools and spares.
- For mod authors: the tables you tune now live under `models/`, with the content licence. This covers finishes, voxel
  grains, gun cartridges, designs, references and tables, mob templates and clips, vehicle blueprints, footwear proportions
  and the carton, vessel, tin and key defaults. Exported models are unchanged.
- For mod authors: `tools/model-sheet.mjs` draws each vehicle exploded beside its four views, and each kit assembly, such
  as an engine with its fittings, a turret or a wheel with its brake, on its own and exploded about its own centre. The
  showcase explodes a vehicle by the same rule, which now moves every part clear of the others, an engine's accessories
  included.
- For game developers: cloth, leather, felt, knit and rubber finishes now carry a `fabric` grain and a sheen, exported
  as `KHR_materials_sheen` with the grain in the material's extras, and garments that wore plastic or paint finishes now
  wear fabric ones. Drawing the grain is optional; see `docs/decisions/0013-fabric-finishes.md`, "What a game does".
- For game developers: the fire engine's empty water tank weighs what a polypropylene booster tank does, and the weight
  it shed sits in the pump, the locker body and the stowed equipment, so the fire engine still weighs about 13.6 t empty.
  The rescue truck, which shares the locker body, is about 1.5 t heavier.
- The box truck, tow truck, bucket truck and street sweeper weigh as 1990s Chevrolet Kodiak and GMC T-series builds: the
  shared medium diesel weighs as a Caterpillar 3126B, the shared chassis and cab are lighter, the bucket truck's aerial
  device weighs as an Altec AT37G, and the sweeper is heavier.
- For game developers: the military cargo truck and military ambulance carry their weight in a V8 diesel, a heavy
  gearbox, a new transfer case and three new driven axles instead of their frame; the cargo truck still weighs about
  9.3 t empty. New parts: `engine_v8_diesel`, `military_truck_transfer_case`, `military_truck_front_axle`,
  `military_truck_axle`.
- For game developers: the military cargo truck now weighs its sourced kerb weight, about 8.4 t empty (was 9.3 t), and
  the military ambulance about 8.9 t (was 9.8 t). The truck has its own wheels and a winch at their real weights, a
  lighter frame and cab, and a front drive shaft from the transfer case to the driven front axle. New parts:
  `military_truck_wheel`, `military_truck_winch`, `military_truck_front_shaft`.
- For mod authors: a row file that is not plain data, with a function, a hidden field or a field that reads `self` or
  `super`, now fails the Jsonnet build with the file and the field path instead of building differently from its source.
- For game developers: the player doll (`player_bust`, `player_arm`, `player_leg`) is shaped as a body within the
  measures its worn pieces are fitted to: rounded torso, shoulders, limbs, hands with fingers and feet with toes, and a
  domed head with a face, ears and hair. The head's eyes take a new `body-eye-white` finish beside `body-eye`.
- For mod authors: the firearms pack's gun roster (`models/guns/roster.libsonnet`), the body slot each worn shell
  covers (`models/worn-slots.libsonnet`) and the thing builders' default holds (`models/measures/handling.libsonnet`)
  now live under `models/`, with the content licence. Exported models are unchanged.
- For game developers: the guns a turret fits at their own sites, `kpvt_heavy_machine_gun`, `pkt_machine_gun`,
  `bofors_40mm_l70_autocannon` and `ksp_m39_machine_gun`, are drawn on the 4 mm gun grain, as hand-held firearms are,
  so their barrels read round instead of as blocks. The fused turrets still draw them on the vehicle grain.
- For game developers: the wizard hat (`wizard_hat`, also `wizard_hat_costume`) is round again and 420 mm tall: its foot
  widens to 250 mm, near upright for the height of the head, under its original cone and brim, so the doll's head and
  hair stay inside it with the brim at the brow. The bust gains a `brow` anchor at the hairline, and the showcase seats a
  head-slot item's origin there instead of sinking it into the head by half its height.

### Fixed

- For game developers: the electric saloon no longer keeps the alternator, starter motor, air box, fuel pump and drive belt sites of its parent's engine.
- For game developers: the worn hoodie covers the doll's shoulders and ribs, and the hoodie and jacket upper sleeves
  rise over the deltoids, so no skin shows through them at the shoulders or the sides.

## 0.4.2 - 2026-11-09

### Changed

- Documentation only: the docs now point to a product's source by the product and the symbol, with no file path, and
  the bone-to-region map and the fused-mass note are reworded to match. The assets are unchanged, so moving a pin
  from 0.4.1 needs no step.

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
