---
read_if:
  - upgrading the assets a product pins, or checking what a release changed for consumers
---

# Changelog

What each release changes for those who consume the assets. Each version's section is assembled from the change notes in `changes/`; see `changes/README.md`.

## 0.14.0 - 2026-11-19

### Breaking

- The APC's cupola opens: its lid is an `apc_hatch` on the ring, swinging up as the roof hatches do, and the ring and
  the roof under it are open, so the raised lid shows the hull below.
- A gun's `gun.action.parts` each carry a `motion` (stages and stops, in the model file's axes and in metres, as a vehicle part's) instead of `axis`, `strokeMetres` and `turn`, and its `fire` and `hand` timelines name the stops they run through, as `legs`, instead of phase seconds. The glTF nodes no longer carry `extras.motion`; the sidecar is the one place a model's motion is read.
- A model's `motion` is an object: its stages under `stages`, and the named places on its clock under `stops`, `rest` at 0 and `open` at 1 for every vehicle part.

### Upgrading from 0.13.0

- Place `apc_hatch` wherever you place `apc_cupola`, as the APC's `cupola_lid` site does, and open it by playing its
  `motion`.
- Pose an action part with `poseAt(part.motion, clock)` from `@skelly/motion/motion`, with the clock from the timeline: each leg of `fire` or `hand` runs the clock linearly from the stop the part is at (`rest` to begin) to the stop named by `to`, in `seconds`; a leg to the stop it is at holds; after the last leg the part stays at rest until `durationSimSeconds`.
- Find the clock of a stop by its name in `part.motion.stops` (`rest`, `open`, and `unlocked` on a part that turns free); never assume clock 1 is `open`. Read a part's slide as its slide stage's `direction` times `travel`, not as the shift of `poseAt(part.motion, 1)`, which a hinge's swing adds to.
- Derive the timings you read from the legs. The open time is the sum of the legs through the last leg to `open`. The reach is the legs before the first leg to `open`, and the case is ejected at the reach plus `ejectAt` of that leg's seconds (`ejectAt` is a fraction of the first leg to `open`). The forward sound is at the end of the last leg to `open`. A bolt gun is one with a part that has an `unlocked` stop: a part may hinge without unlocking anything, as a charging handle turning into its notch.
- Read a part's motion from the sidecar's `gun.action.parts[*].motion`, matched to its glTF node by `node` (`<part>:<family>`, which the node's `extras.part` and `extras.family` give, since a loader rewrites node names), instead of the node's `extras.motion`.
- An SMG's charging handle exports its stroke only: the notch it turns into is not a step of the cycle, so its `motion` has the slide stage and the stops `rest` and `open`.
- Read a model's stages from `motion.stages`.
- Take the motion type and math from `@skelly/motion/motion` (which `npm install` links from the submodule's workspace), and place a fitting's motion with `transformMotion(motion, { ...(mirror ? reflection(0) : IDENTITY_RIGID), shift: at })` instead of thing-core's `mirrorMotion` plus shifting the hinge points.

### Added

- The doll walks holding what it wields: `doll_guns` gains `<gun>_<sneak|walk|run|crouch_walk>_<idle|guard>` and
  `doll_melee` gains `<class>_<sneak|walk|run|crouch_walk>_idle`. Each loops in place and is advanced as the empty walk
  of `doll_locomotion` is (`strideMetres`, `speedMetresPerSecond`), its legs that walk's, with `held` as the class's
  stance clips. A gun stays in both hands, at guard aimed ahead and tipped only as far as the walk leans the body, and a
  two-hand melee weapon stays in both hands as its idle holds it, while a one-hand weapon swings with its hand.
- The showcase site serves the shader lab as a page of its own, so the built models' looks can be judged, and tuned
  into a snippet to paste, without running the lab locally.
- A finish can carry a shader `surface` (bark or leaves, from `@skelly/surfaces`), exported in each GLB material's
  `extras.surface`, with the manifest's `surfaceContract` naming its version; the `bark` and `bark-birch` finishes now
  wear bark looks. A shader lab (`tools/packages/shader-lab`) shows the built models wearing their looks and retunes them
  live, so a look is judged by eye before it ships; the bark looks now have longer plates and finer birch marks.
- A Landsknecht two-handed greatsword, `zweihander`, joins the melee weapons. Its grip point seats the two-hand wield, and its anchors are `strike`, the point a thrust lands with, `edge`, a point on the cutting edge a swing lands with, and `ricasso`, where a hand closes on the leather above the cross to half-sword.

### Changed

- Picatinny rails now space their slots at the real 10.01 mm pitch, so rail optics and sights sit where they would on a real gun. Parts keep their places within a few millimetres, except the rear iron sights of the assault and anti-materiel rifles, which sit one slot further forward, and the guard stance's head aim, which follows the sight.

## 0.13.0 - 2026-11-19

### Breaking

- Solid medicines and loose goods are no longer drawn each in its own container. Six generic holders, `pill_bottle`,
  `glass_vial`, `blister_card`, `small_tin`, `paper_sack` and `zip_bag`, mark their label paintable so one model serves
  every content of a form, and loose contents draw as a small heap of their form, such as `tablet_heap` or
  `powder_heap`. Tablets, capsules and gum are drawn smooth in the voxel file too, by a new part flag `smooth` in
  catalogue rows. The retired container models map to the holder their contents come in.
- The red 10 L plastic fuel can `jerrycan` is now `plastic_fuel_can`, titled "Plastic fuel can", so it is no longer
  mistaken for the pressed-steel `jerry_can`.

### Upgrading from 0.12.0

- Draw a packed content as its holder with the label repainted in the content's label finish, and a loose one as
  its form's heap.
- Map stored ids through the release's `renames.json`, which carries `jerrycan` to `plastic_fuel_can`.

### Added

- A one-handed knightly sword, `arming_sword`, joins the melee weapons. Its grip point seats the one-hand wield, and its anchors are `strike`, the point a thrust lands with, and `edge`, a point on the cutting edge a swing lands with.
- Add optional versioned building metadata for all 22 medieval timber and stone modules: qualified shared-node joins, floor levels, nominal rectangular/arched openings, roof/vault supports and repeats, exact stair risers, parapet runs and fitted static attachments. The manifest discovers canonical sidecars and kit definitions shared by voxel and smooth copies. Strict producer schemas and forward-tolerant readers keep unsupported assembly semantics separate from ordinary rendering; production/cache and rotated-composition tests protect propagation and placement. Geometry is unchanged; no navigation, collision policy or interaction is implied.
- The doll holds long guns: a new motions entry, `doll_guns` (`skelly.body/motions/doll.guns.json`, on the same rig as
  `doll_melee`), with `<gun>_stance_idle` (low ready) and `<gun>_stance_guard` (shouldered) for `rifle_assault`,
  `rifle_pipe` and `shotgun_pump`. Each clip's `held` seats that gun in the right hand by its `grip.at`, as the melee
  clips do, and the left hand lies on that gun's fore-end, so play each gun's own clips rather than another's.
- The doll walks: `skelly.body/motions/doll.locomotion.json` (the manifest's `doll_locomotion` motions, on the doll's
  rig) holds a stand, an idle, sneak, walk, run and crouch-walk loops with their `strideMetres`, and crouch, prone,
  downed and dead poses. The rig's root (`pelvis`) now pitches ±90° so a figure can lie down.
- `skelly.audio.impact` has a glass vial landing on concrete, `glass_vial_on_concrete`, with four takes, for a game that drops glass.
- A stocked gun's sidecar gains `anchors.butt`: the middle of the stock's rear face, where it meets the shoulder.
- A gun model's root `extras.gungen` now names its `platform` (`id` and frame `sizeClass`), and every port node names a `sizeClass` and a `swap` path (`slot`, or a `job` of kind `tool` or `bench`) in its `extras.port`. A part fits another gun's site when both guns are of one platform and the mount type, gender, size class and standard agree; geometry and sidecars are unchanged.
- A `katana` in the melee pack: a curved two-handed Japanese longsword, gripped by the rear hand near the kashira so a
  two-handed wield seats both hands on the tsuka.
- Added twelve modular medieval ashlar pieces to `skelly.structures`, with smooth counterparts: pier, wall, slit window, arched doorway, flagstone floor, stair flight, landing plinth, battlement, four-metre arch, barrel vault, vault end panel and buttress. They share the timber kit's bay/storey grid, with documented thicker stone joins, source examples of a vaulted passage and stair-accessed wall-walk, and exported-geometry regression checks.
- `skelly.structures` gains ten medieval timber-and-plaster building modules, including open door/window walls, a separate plank door, floor bays, gables and tiled roofs, with smooth copies. A shared 2 m grid and source cottage example document how the pieces fit together.
- Add a seventeen-piece temperate woodland starter kit to `skelly.nature` and its smooth counterpart: spreading and upright oaks, birch, pine, two saplings, a broken snag, cut and hollow stumps, fallen log, two shrubs, fern, grass and three large boulders. Include source-only grove and same-scale lineup compositions, authored ground-origin documentation and voxel/smooth export regression checks. Existing small nature props keep their ids and geometry.
- Builders on one host can share one export cache, so a fresh worktree reuses the models others built instead of
  generating the whole catalogue: `SKELLY_EXPORT_CACHE` names the folder, and a setgid, group-writable folder keeps
  every entry some build used in the last week.
- Worktrees and users on one host can share one Jsonnet twin store, so a fresh worktree takes the twins another already
  compiled rather than compiling the catalogue again. `JSONNET_TWIN_STORE` names the folder, and a setgid,
  group-writable folder keeps every entry some checkout still uses, as a shared export cache does.
- The showcase's model page has a Smooth switch that draws a model as its smooth copy instead of its voxels, keeping the
  camera where it is, and says when a model has no copy, as a mob or a severed part has none. The switch is kept in the
  page's link as `smooth=1`. `models.json` names each model's copy as `smooth: { file, bytes }`.
- A thing's `model.json` now carries its stowage ports as `stowage`: a locker part's `slots`, each with its `id` (the port id a load-out names), `accepts`, `envelope` and `frame`, and a stowable item's `seats`, each with its `standard` and `frame`, in the model frame and metres, as the GLB's stowage port nodes give them. The field is left out of a model without stowage ports, and the GLBs and every other field are unchanged.
- A sloped compound prism can set `terrace: n` to draw its voxel copy as level steps n voxel layers tall instead of a
  slope that shifts a fraction of a voxel on every layer. The smooth copy is unchanged, and no shipped model uses it yet.
- The boss walker `mech_walker_mob_1` limps and flinches. Each foot is now a cut point (its body's `severableParts`
  lists `foot.L` and `foot.R` under the leg regions), so a game hides a lost foot as it hides any cut part, and plays
  `limping.walk.left` or `limping.walk.right`, by the side that lost it: a walk loop with its `strideMetres` in which the
  stump bears on the ground where the heel stood. `standing.flinch` is a quick tilt back with its `peakAtSimSeconds`;
  play it only on a hit by one of the rounds its `heavyRounds` names (today `round_50_h_bmg`, `round_40x365r` and
  `round_120x570`, the heavy machine gun and anti-materiel round and heavier).

### Changed

- A warm build, the showcase build and `tools/check-sources.mjs` reuse what an earlier run measured of the vehicles'
  overlaps, the doll's grips and the garments' cover, so a run after a small edit no longer redoes them. What the checks
  find and what the build writes are unchanged.
- The vehicle swing check takes a fraction of the time it did, most of all for vehicles with many moving parts, and
  `tools/check-sources.mjs` reuses the sweeps the build keeps in the export cache (`--cache`, `--no-cache`) instead of
  sweeping every vehicle on each run. What the check finds is unchanged.
- The vocabulary, `models/taxonomy.json`, now holds the meanings of the showcase's Keyword and Form filters under
  `dimensions`, and `models.json` carries them in its `taxonomy`.
- Grow the woodland's trees and shrubs from species instead of drawing them piece by piece. `woodland_oak_spreading`, `woodland_oak_upright`, `woodland_birch`, `woodland_hazel` and `woodland_shrub_low` keep their ids with grown shapes and new sizes; `woodland_scots_pine` and `woodland_spruce` are added beside the drawn `woodland_pine`, which stays. The woodland grows them sparse (density 0.2, a content knob) and voxelizes them at the standard 0.5 m grain, so a tree's voxel file stays within about 1.1k triangles; the spreading oak is now an open crown 5.5 m across. Grown wood carries the `bark` (or `bark-birch`) material id and every leaf its foliage id, so a shader can tell them apart: until skelly draws bark and see-through foliage ([roobie/skelly#1903](https://github.com/roobie/skelly/issues/1903), and the shader pipeline coming to skelly-assets), the wood is plain and the leaves solid.
- The build refuses a part with a `hinge_a` or `hinge_b` anchor, so no model carries one: a part that opens moves only
  by its `motion`, and a part without one does not open.
- The press-check pose frames start and end at unsighted fire, with the bore level, instead of at low ready, and the
  charging handle and bolt carrier draw back a short pull, just far enough to show brass, instead of the full stroke.
- Clip sampling slerps rotations with its own quaternion code, so the pose page, the showcase viewer and the Node reader
  share one interpolation and the clip decode path no longer reaches three.js.
- The 40 mm and 120 mm rounds (`round_40x365r`, `round_120x570` and their cases) look like shells: a nose ogive with a
  fuze flat, a copper driving band on a new `band` material slot, and a primer sized to the case head, its cup inside
  an anvil ring. Small-arms primers take their trade size, and the 12-gauge shell gains a primer, for 80 triangles.
- The tools that read a model's sidecar from a built tree find it through one shared path helper instead of each spelling the path out.
- A definition that names its own `voxelGrain` now keeps the rest of its recipe class, so a class that gives thin parts
  the detail grain still does. No model changes: no row that names its own grain is in such a class. The rows that name
  their own grain on the vehicle class (the bus doors, the sleek security walker, the wheeled APC and the 120 mm tank
  gun) no longer carry a detail grain in their recipe, as the class has none; none has a part tagged for it.

### Fixed

- The APC turret now has continuously sloping armour plates in its smooth copy instead of seven broad staircase bands. Its roof sits between the walls without overlapping them, and the gun mask has a closed cheek where it meets the shell. The voxel copy steps the slopes in even terraces two voxel layers tall instead of a ragged layer-by-layer stair; fittings, gun ports, hatch motion, mass and placements are preserved.
  Its collision boxes change on purpose: each sloped plate is stacked in short courses so the boxes follow the slope, and the core's 109 boxes become 122, covering 15.1% of the open interior rather than 15.8% (the fused turret: 142 become 155, 21.5% becomes 20.8%).
- Corrected construction-mismatched titles, dominant-material filters and optional tags on 15 catalogue models, including the steel jerry can, plastic fuel can, cigarette pack, leather pouches and lid-on ember carrier. Model IDs, geometry and finishes are unchanged, except that `jerrycan` is renamed to `plastic_fuel_can`.
- The city car and electric city car now have continuously sloping glass and pillars in their smooth copies, rather than broad staircase bands, with glazing trimmed clear of the pillars and panel edges to avoid z-fighting. Their voxel copies are sampled from the same continuous solids. The cabin glass and pillars now sit one voxel further out at the waist: the old bands started already pulled in by a step there, and the continuous lean starts from the waist line itself. At the waist row the door glass moves from z 0.656–0.719 to 0.687–0.750.
- The showcase can open direct links to kit assemblies, such as `apc_turret_assembly`, so a turret can be reviewed with its separately exported fine-grain gun instead of the coarse fused model. These layouts do not duplicate entries in the catalogue grid or offer a nonexistent single-file download.
- The heavy and power leg guards no longer sink into the doll's hanging hand: their cuisses are trimmed on the outer
  side, and the power cuisse's outer piston runs only below the fingertips.

## 0.12.0 - 2026-11-16

### Added

- `tools/actorCompose.mjs` composes an actor's head yaw, `applyHeadYaw`, and its walk's cross-fade into the idle at low speed, `walkToIdle`, as a game plays them.

## 0.11.0 - 2026-11-16

### Added

- The skid-steer loader's open tail door shows an engine room: the engine cover is a shell, the engine and radiator are
  fitted as assemblies, and an oil cooler on the radiator, a hydraulic tank with its filter, coolant and hydraulic hoses
  and the battery stand where a mechanic reaches them through the door.
- Every built model except mobs and severed parts has a smooth copy, its authored shapes rather than voxels, in a `<pack>.smooth` pack named by the entry's `smooth: { pack, path }`; load that pack beside the model's to draw it smooth.
  The copy has the same part nodes, pieces and skin, and uses the entry's sidecar unchanged, so mass, anchors and collision are the voxel model's and sit within half its voxel grain of the smooth surface.

### Changed

- The build fails when the doll pokes through a fitted garment at rest, for every fitted garment; a poke a garment is
  allowed is listed, with its depth and why, in `models/rest-pokes.libsonnet`.
- The mob build refuses a row whose genome records a param outside that row's range, so every shipped genome is a draw
  the row's ranges allow.

## 0.10.0 - 2026-11-16

### Breaking

- The classic small car's doors and boot lid, the army 4x4's side rails and the school bus's rear exit now export a hinge
  motion on drawn round pins in place of their hinge anchors, so the showcase's Open view swings them and a game plays
  the swing the build proved clear. The army 4x4's side rails hang just outside the tub's side and swing out. The small car's boot lid is shorter, behind a
  fixed deck under the rear screen, and its door mirrors sit a little further aft and ride the doors.
- The tractor's and combine harvester's cab doors and the skid-steer loader's tail door now export a hinge motion on
  drawn pins in place of their hinge anchors, so the showcase's Open view swings them and a game plays the same swing
  the build proved clear. The tractor door's lower edge follows the rear fender, with a fixed skirt on the cab beneath
  it; the skid-steer's tail lamps ride its tail door. The skid-steer's front door and the small tractor's footboard stay
  shut and no longer carry hinge anchors.
- The doors of the military trucks, the military ambulance, the light tactical vehicle, the cab-over 4x4 and the SWAT
  truck's rear doors now export a hinge motion in place of their hinge anchors, so the showcase's Open view swings them
  and a game plays the swing the build proved clear. Each door turns on round pins at the outer end of its hinge leaves.
  The military trucks' A-posts reach back to the door, whose window frame no longer wraps forward past its hinge. The
  cab-over 4x4's tail lamps are narrower and sit further outboard, clear of the rear door, and its spare wheel rides the
  rear door.
- Severed parts are baked from the mobs: `skelly.body` holds, per cut point of each zombie type, its whole part and one part for each set of cut points below it a cut there may find already gone, so an arm cut after its hand weighs only what is left. Each is listed with `kind: severed-part` and a `cut` naming the type, the bone and those gone cut points, and its `severed/index.json` holds every cut point's parts by type and bone. The drawn `shambler_*` parts are gone.
- The skid-steer loader's front door now exports a hinge motion: it turns on drawn pins at its left front edge and
  swings forward a right angle over the lowered bucket, which the build proves clear. It hangs above a toe board on the
  cage, the lift arms' cross brace sits behind the cab, and the tilt rams run down the front of each arm to the bucket,
  all out of the door's sweep.
- The trailers' doors, ramps and tailgates now export a hinge motion on drawn round pins in place of their hinge anchors,
  so the showcase's Open view swings them and a game plays the swing the build proved clear; the ramps lower onto the
  ground, with their battens on the face the animals walk up.

### Upgrading from 0.9.0

- Open `classic_small_car_door`, `classic_small_car_boot_lid`, `army_jeep_side_rail` and `school_bus_rear_door` by
  playing their `motion`, not by swinging them on `hinge_a` and `hinge_b`.
- Have the classic small car's `door_mirror` ride `door` and place it where the placements export puts it.
- Open `tractor_cab_door`, `combine_harvester_cab_door` and `skid_steer_tail_door` by playing their `motion`, not by
  swinging them on `hinge_a` and `hinge_b`.
- Treat `skid_steer_door` and `small_tractor_footboard` as fixed parts.
- Have the skid-steer's tail lamps ride `tail_door`, as its placements do.
- Open `military_truck_door`, `military_ambulance_rear_door`, `light_tactical_vehicle_front_door`,
  `light_tactical_vehicle_rear_door`, `cab_over_field_car_cab_door`, `cab_over_field_car_side_door`,
  `cab_over_field_car_rear_door` and `swat_truck_rear_door` by playing their `motion`, not by swinging them on
  `hinge_a` and `hinge_b`.
- Have the cab-over 4x4's `spare_wheel` ride `rear_door` and place its tail lamps where the placements export puts
  them.
- Take the item a cut leaves from `severed/index.json`, by the actor's type, the bone it severs and the top-most cut points below it already severed, instead of by hit region.
- Drop `shambler_torso`, which has no successor; apply `renames.json` for the drawn arms and legs.
- Open `skid_steer_door` by playing its `motion`; it is no longer a fixed part.
- Open `horse_box_door`, `horse_box_ramp`, `horse_box_top_door`, `livestock_trailer_ramp`, `caravan_door`,
  `semi_trailer_rear_door`, `utility_trailer_tailgate` and `checkpoint_barrier_trailer_tailgate` by playing their
  `motion`, not by swinging them on `hinge_a` and `hinge_b`.

### Added

- A part of a compound model can declare the catalogue item it is, as `item` on the part in the model source, and the
  showcase links it to that item's page. `mannequin_decoy` declares its `doll` part is `talking_doll`. The build refuses
  a declared item no model has.
- A worn piece's and a slot-placed wearable's manifest entry names the doll part it sits on, `wornOn`, the part a bone of `skelly.body`'s doll rig binds, with `side` for a wearable on one copy of a limb's part, named as the rig's `bind.side`, `both` for one across both copies and `anchor` for one seated by an anchor, such as a hat at the brow; a piece worn over a jacket (`*_worn_jacket`) names its `*_worn` twin's part. You can stop restating which part each worn segment or body slot means. `baseball_cap` loses its `fit: worn` tag: it is a loose head item, seated at the brow like other hats.
- Two rat mobs in `skelly.bestiary`, `mutant_rat` and `rat_brute`: rigged actors that idle, scurry and bite, and
  flinch when hit and fall dead onto their left or right side (`death.left`, `death.right`).

### Changed

- Cartridge models are flat-sided prisms, as optic bodies are, so every drawn level of detail and the collision hull agree
  on the side count. The flats sit at the cartridge's diameter, so a round or case is a little wider across its corners
  than before, and a dropped case comes to rest on a flat instead of rolling.
- Folding bus doors' hinge pins are drawn as fine as their panels, so they no longer stand out of the door and pillar as
  knobs the size of a vehicle voxel.
- `helmet_trooper`, `helmet_heavy` and `helmet_power` lose their block shells: each shell slopes in to a chamfered crown,
  its skirt flares out over the nape and its brow is a shaped peak; their `brow` anchors still meet the hairline.
- Boots and the armour sets now declare `covers`: combat boots, rubber boots and the trooper's boots hide the doll's new `sole` region (the foot is cut into `ankle` and `sole`), the heavy and power boots and the plate sabatons the whole `foot`, the armour gloves the `palm`, the armour legguards the `shin`, and the armour bodies the `trunk`, so a consumer can drop its own list of what boots hide.
  The trooper armour body now covers `trunk` rather than `torso`, since its pauldrons leave the shoulders open underneath; a consumer hiding by the declaration keeps drawing the trooper's shoulders.

### Fixed

- Truck front axles no longer pass through the engine's sump: the heavy and medium steered axles are drop-centre I-beams
  whose middle runs under the sump, with goosenecks up to the spring seats and king pins, which keep their height.
- Nineteen models no longer have loose or paper-thin parts: the chest pouches' harness lies round the pouch, the circular
  saw's battery and front knob join the body, the butcher rack's hooks and chain touch it, and thin straps, lips, trims and
  wires on tools, a whistle, earrings, collars, dresses, the four sheet metal and scrap plate suits and the riot leg guards
  are at least a voxel thick.
- Engine parts no longer pass through truck frames: the heavy I6's intake clears the rails, military trucks' crossmembers
  clear the engine and gearbox and their battery tray stands between two of them, and the abandoned army truck's and
  overturned delivery van's engine bays fit their frames.
- Car shells have open rear wheel arches and a hollow transmission tunnel round the gearbox; the classic small car, convertible and hearse no longer run parts through each other; van noses, mirrors, bus bumpers and bus mirrors sit on their panels instead of in them, and the van and bus wrecks' damage is drawn as damage.
  
  The city, articulated, double-decker, open-top tour and shuttle buses carry their battery in a skirt locker behind the front wheel on the driver's side, behind a hinged flap with a part of its own (`city_bus_battery_flap` and the like), instead of inside the dash.

## 0.9.0 - 2026-11-16

### Added

- Every mob ships `actors/<id>.genome.json` beside its body, named by its manifest entry's `genome`: every value the generator drew for it. Compare two releases' genomes to tell a re-rolled mob from one rebuilt from the same draws.
- Every model in the `skelly.armour` and `skelly.bolt-guns` packs now ships its `things/<id>.model.json` sidecar and each
  pack a `things/index.json`, as the other thing packs do. `helmet_trooper`, `helmet_heavy`, `helmet_power` and
  `helmet_plate_armet` carry a `brow` anchor, the point that meets the hairline when the visor or slit is over the eyes.

### Changed

- Small catalogue items (keys, food, pill bottles and the like) draw at the 2 mm grain, so their shapes read; beans and soup draw a spilled serving rather than a thin disc. Pill bottles and opened tins weigh what they draw, and every non-vehicle catalogue row has facet tags.
- `tower_shield` and `kite_shield` are shields rather than recut oven doors: a curved oak tower shield with an iron rim,
  bands and boss, 11 kg, and a hide-faced kite shield bound in rawhide with a small boss, 2.9 kg. Both lie face up with
  their top toward -z.

### Fixed

- Cars' struts stand inboard of the tyres and end under the bonnet, SUVs lose struts that doubled their beam front axle, exhausts hang under the floor pan and the saloon, coupe, estate and police car fuel tanks sit level under the rear bench.

## 0.8.0 - 2026-11-16

### Breaking

- The animal control van's cage hatches open: each is a part of its own, hung on drawn round pins at its leading edge as
  the cab doors are, so the wind shuts one left unlatched, and its vent grille and latch swing with it. An open hatch
  shows its cage's barred gate, which now faces the hatch. Its side door is hung rather than sliding, because an open
  hatch stands in the sliding door's path. Every van's hung side door, the food truck's and the ice cream van's too, now
  stands its leading edge off the frame, so it no longer rubs the wall ahead as it swings.
- The armoured vehicles' ramps, doors and hatches now export a hinge motion on drawn round pins in place of their hinge
  anchors, so the showcase's Open view swings them and a game plays the swing the build proved clear; the ramps lower
  until their lips rest on the ground. The APC hatch and the turret hatches, which had no hinge before, open too. The
  CV9040's and the main battle tank's driver's hatches are rows of their own that swing aside level, as a tank's does,
  since the gun and the turret's front leave a raised lid no room, their lids a little thinner than the turret ring is
  high so the turret clears them, and their hinge pins stand in the post behind the periscopes. The APC's tow hitch sits
  lower, under the sill, so the lowered ramp clears it. The frames facing a door's free edge stand a few millimetres off
  it, so the door's inner corner clears them as it starts to swing: the half-track's bay sides at the cab doors and its
  rear jamb, the CV9040's rear post and sponson end, and the sci-fi APC's rear lintel, tail bevel and side jamb. The
  sci-fi APC's side doorway is 1 cm longer.
- The airport crash tender drives its front axle, `drive_axle_wide` in place of `steered_axle_wide`, through new parts
  `airport_crash_tender_transfer_case`, `airport_crash_tender_front_shaft` and `airport_crash_tender_rear_shaft`. It rides
  higher on lugged tyres, its engine's manifolds sit between its frame rails, and its engine is fitted as an assembly
  whose air box hangs under the near rail at its own `low_air_box` site.
- Every bus door leaf now folds in two: a jamb panel that turns out of the doorway and a free panel that rides it,
  each exporting a hinge motion in place of the leaf's hinge anchors. A panel's origin lies on its hinge pins, not at its
  centre, it is drawn on a finer grain than its vehicle, and its leaf stops clear of the other leaf of its doorway at
  every step of the fold. The prison bus's door bars ride the panels.
- The helicopters' hinged doors now export a hinge motion on drawn round pins in place of their hinge anchors, so the
  showcase's Open view swings them and a game plays the same swing the build proved clear. A side door's free edge rakes
  toward its hinge as the wall curves in, so that edge is cut to swing off the post it shuts against, and the post draws a lip that closes on it.
  The heavy cargo helicopter's crew door hangs just ahead of the cockpit bulkhead; its rear ramp is
  narrower, so it swings inside the tail, and is drawn raised shut, lowering onto the ground as it opens; and its load
  floor stops short of the ramp's knuckle. The air ambulance's clamshell doors stand just aft of the cabin's rear end.
  Seats give the doors room: the backs of `helicopter_seat` and the police helicopter's rear bench are narrower, and the
  news helicopter's front seats sit further inboard.
- The airport crash tender's and rescue truck's locker kit, and the rescue truck's rear compartment kit, are catalogue
  items in stowage slots, as on the fire engine; new fire, rescue and generic items fill them, and the chainsaw,
  cut-off saw and pike pole can be stowed. Only kit that only fire and rescue crews carry has the `firefighting` keyword.
- Roller shutters open onto stowed kit: each fire engine, rescue truck and airport crash tender locker holds its own
  stowage part, the rescue truck's rear shutter opens onto shelved kit, the cube van carries removal kit on its walls
  and the step van parcel shelves. The fire engine's lockers are deeper, and its body's rear wall is a part of its own.
- The bulldozer's and excavator's cab doors, the technical's doors and the utility 4x4's front and rear doors now export
  a hinge motion on drawn pins in place of their hinge anchors, so the showcase's Open view swings them and a game plays
  the same swing the build proved clear. Each door's free edge, the one away from its pins, stands off the body by the gap
  its swing needs, closed by a jamb on the body. The excavator's door now closes above the cab floor rather than over its
  edge. The technical's quarter light straddles its door's pin line, so the part ahead of the pins would swing into the
  windscreen; it is fixed glass on its windows. The utility 4x4's front doors hang on leaves out to the wing's face. The
  machine steps and the quad bike's footboard stay put and no longer carry hinge anchors.
- Vehicle roller shutters open by rolling up into their heads: the cube and step van rear doors, the rescue truck's
  rear shutter, and each fire engine and airport crash tender locker shutter, now a part of its own.
- The boss mob is exported as `mech_walker_mob_1` in the new pack `skelly.bestiary.mech`, with `standing.idle`, `standing.walk` (its stomp) and `standing.attack` (its twin-pod fire), and no far-LOD or limping sets. The security walker vehicle's id changes from `security_walker` to `mech_walker_vehicle_1`.
- Boots and shoes stand the wearer on their soles: each worn foot piece's sole lies under the bare foot instead of round
  it, so the piece reaches a sole's depth below the bare sole, and the model declares that depth as `soleLift`, in
  metres, in its model entry and the manifest. The fitted boots' uppers keep their fit, so their ground models stand a
  sole taller. The wheeled skates and heel-wheel sneakers declare the lift of their wheels and soles too.
- A fire engine's locker kit is catalogue items in stowage slots, so a game can loot it or stow more: a placements
  site's new `stowed` names the item in each slot of its part, and its new `behind` names the closure that hides it.
- The opening parts of the cars built from the shared car body now swing clear: their bonnets, tailgates and boot lids
  hinge on their top edges, boot lids are narrower to fit inside their opening, the front door glass ends short of the
  B-pillar, and parts on a door, lid or tailgate ride it: the SUV and classic 4x4 spare wheel, the hybrid badges, the
  sports car spoiler, the SUV and electric crossover rear arch flares, now split at the door, and the limousine, luxury
  saloon and taxi trims, now one model per door.
- The pickups', trucks' and hearse's tailgates and the light truck's dropsides now export a hinge motion on drawn round
  pins in place of their hinge anchors, so the showcase's Open view swings them and a game plays the swing the build
  proved clear; the bed gates drop level with the deck, and the technical's tail lamps ride its tailgate.
- The cab doors of the vans built on the shared van body now export a hinge motion in place of their hinge anchors, as
  the car doors do, so the showcase's Open view swings them and a game plays the same swing the build proved clear of the
  wing. The security van's quarter-light plate is a part of its own, `security_van_quarter_plate`, since it stays shut
  when the door opens; the riot and security vans' door grilles, door markings and cab plates ride the door.
- The vans' rear doors and hinged side doors, and the trucks' cab doors, crew doors and box rear doors, export a hinge
  motion on drawn round pins in place of their hinge anchors, and the vans' bonnets open, so the showcase's Open view
  swings them as a game will. None touches the body as it opens: each edge stands a swing gap off the sill and roof it
  slides across, and each trailing edge stands off the post behind it by a tail gap wide enough for its inner corner to
  circle the pins clear. A lip inside the post behind each hinged cab door and van side door keeps that
  gap from showing through the body. The rear doors open square to the body, and kit on an opening part rides it.

### Upgrading from 0.7.0

- Place `animal_control_van_hatch` at each `hatch<n>_near` and `hatch<n>_far` site in place of
  `animal_control_van_hatches`, and open it by playing its `motion`. `renames.json` maps the retired id to it.
- Open `animal_control_van_side_door` by playing its hinge `motion`, which no longer slides.
- Open `apc_ramp`, `apc_hatch`, `apc_scifi_wheeled_ramp`, `apc_scifi_wheeled_side_door`, `cv9040_rear_door`,
  `half_track_windscreen_armour`, `half_track_cab_door` and `half_track_rear_door` by playing their `motion`, not by
  swinging them on `hinge_a` and `hinge_b`.
- Open `turret_hatch`, `ifv_turret_hatch`, `mbt_turret_hatch`, `cv9040_driver_hatch` and `mbt_driver_hatch` by
  playing their `motion`.
- Fit `cv9040_driver_hatch` and `mbt_driver_hatch` at those vehicles' `driver_hatch` sites in place of `apc_hatch`,
  as the vehicles' placements do.
- Apply `renames.json`; `steered_axle_wide` maps to `drive_axle_wide`.
- In place of each `<bus>_door`, `<bus>_door_fwd` and `<bus>_door_aft`, place its `_jamb` and `_free` panels, the free
  panel riding the jamb panel, as the vehicles' placements do; `models/renames.json` maps each old id to its jamb panel.
- Place `prison_bus_door_bars` once on each prison bus door panel, riding it.
- Open each of these by playing its `motion`, not by swinging it on `hinge_a` and `hinge_b`: `light_helicopter_door`,
  `air_ambulance_front_door`, `air_ambulance_clamshell_door`, `heavy_cargo_helicopter_crew_door`,
  `heavy_cargo_helicopter_ramp`, `military_transport_helicopter_cockpit_door`, and the front and rear doors of the
  news and police helicopters.
- Expect `heavy_cargo_helicopter_ramp` shut at rest; play its motion to lower it.
- Load `skelly.melee` with `skelly.ground-vehicles`, which now depends on it for the crash tender's pike pole.
- For each crash tender and rescue truck site with `stowed`, place each named item in its slot as for the fire engine;
  their stowage parts no longer draw the kit.
- Place `fire_engine_rear_wall` wherever you place `fire_engine_body` on a fire engine, but not on a rescue truck,
  whose rear shutter opens where it stood.
- Place the new stowage parts as the vehicles' placements do: `<vehicle>_locker_stowage_<locker>` on both sides of
  the fire engine, rescue truck and crash tender, and `step_van_parcel_shelves` on both sides of the step van; place
  `rescue_truck_rear_stowage` and `cube_van_removal_stowage` once each.
- Open `bulldozer_cab_door`, `excavator_cab_door`, `technical_door`, `utility_4x4_front_door` and
  `utility_4x4_rear_door` by playing their `motion`, not by swinging them on `hinge_a` and `hinge_b`.
- Treat `beach_buggy_step`, `forklift_step`, `golf_cart_step`, `quad_bike_footboard`, `road_roller_step` and
  `trencher_step` as fixed parts.
- Have the technical's mirrors ride `door`, as its placements do.
- Draw the technical's quarter light from `technical_windows`, not `technical_door`.
- Open `cube_van_rear_door` and `step_van_rear_door` by playing their `motion`, not by swinging them on `hinge_a` and
  `hinge_b`, which they no longer carry. Hide whatever a stowing slide carries past its `stow` offset.
- Place `fire_engine_locker_shutter_<fore|mid|wheel|aft>` on both sides in place of `fire_engine_lockers`, and
  `airport_crash_tender_locker_shutter_<fore|mid|wheel_fore|wheel_aft|aft>` in place of
  `airport_crash_tender_lockers`, as the vehicles' placements do. `renames.json` maps each retired id to its fore
  shutter, so a saved reference still resolves to one of its parts.
- Place `rescue_truck_rear_shutter_frame` wherever you place `rescue_truck_rear_shutter`.
- Place `mech_walker_vehicle_1` wherever you placed the vehicle `security_walker`, and update any reference to it, such as an item-materials entry. Its parts keep their ids.
- Name the mob `mech_walker_mob_1`.
- Stand a figure higher by the largest `soleLift` among the models it wears, and raise its eyes with it; a barefoot
  figure, or one wearing nothing that declares a lift, stands as before.
- Load the packs `skelly.ground-vehicles` now depends on with it.
- For each fire engine site with `stowed`, place each named item in its slot, its seat mated to the slot as ports
  mate, and never mirror an item on a mirrored site; see `docs/decisions/0017-stowage-slots.md`.
- Read `behind` on a site, or ignore it to draw stowed kit whatever the shutter.
- Place the new rider models where the placements export puts them: `suv_rear_door_flare`,
  `electric_crossover_rear_door_cladding`, `limousine_rear_door_brightwork`, `luxury_saloon_rear_door_brightwork`
  and `taxi_rear_door_band`, and give the rear door models the same materials as their front door ones.
- Open `crew_pickup_bed_tailgate`, `light_4x4_truck_tailgate`, `light_4x4_truck_dropside`,
  `military_cargo_truck_tailgate`, `technical_tailgate` and `hearse_tailgate` by playing their `motion`, not by swinging
  them on `hinge_a` and `hinge_b`.
- The technical's panel below its tailgate now belongs to `technical_bed`, so the gate is shorter and lighter.
- The hearse's tailgate lifts on pins under a brow on `hearse_coach`, behind the shell roof, and carries the arms that
  reach back to them.
- Open each `<van>_front_door` by playing its `motion`, not by swinging it on `hinge_a` and `hinge_b`.
- Place `security_van_quarter_plate` once on each side, beside `security_van_cab_plate`, and have the door grilles,
  door markings and cab plates ride `front_door`, as the vehicles' placements do.
- Open each of these by playing its `motion`, not by swinging it on `hinge_a` and `hinge_b`: `<van>_rear_door`,
  `food_truck_side_door`, `ice_cream_van_side_door`, `<truck>_door`, `<truck>_crew_door` and `box_truck_rear_door`.
- Open `panel_van_bonnet` and `step_van_bonnet` by playing their `motion`.
- Have `animal_control_van_rear_hatches`, `ambulance_rear_markings`, `prisoner_van_rear_bars`, `riot_van_rear_grille`,
  `riot_van_rear_markings` and `security_van_rear_door_bars` ride `rear_door`, and `swat_truck_door_guard` ride `door`,
  as the vehicles' placements do.
- `fire_engine_cab_stripe` and `airport_crash_tender_cab_stripe` hold only the stripe between and ahead of the doors;
  place `<truck>_door_stripe` riding `door` and `<truck>_crew_door_stripe` riding `crew_door` for the rest, as the
  vehicles' placements do.

### Added

- The bulldozer's blade has a tilt cylinder, `bulldozer_tilt_cylinder`, on its near push arm and a pitch brace,
  `bulldozer_tilt_brace`, on its far one. It now carries its own engine, `engine_i6_off_highway_diesel`, in place of
  `engine_i6_heavy_diesel`, fitted as a core with salvageable plant accessories (`alternator_plant`,
  `starter_motor_plant`, `air_box_plant`, `fuel_pump_plant`, `drive_belt_plant`), and its truck radiator is fitted with
  its fan and hoses.
- The doll wields melee: unarmed, one-hand and two-hand stances and strikes, baked as clips in
  `skelly.body/motions/doll.melee.json` with the rig their frames turn, which the manifest's new `motions` lists. Each
  strike names its phases and the moment it hits, and a weapon class's clips name where the weapon sits in the hand.
- Impact sounds: `skelly.audio.impact` carries a 9 mm brass case landing on concrete, metal, wood and dirt, each as
  a few Ogg Vorbis takes with its synth row as data. The manifest's new `sounds` lists each with the object and
  surface it is the sound of, so a game picks the takes by the surface an object lands on.
- A short military transport helicopter, `short_military_transport_helicopter`, in the aircraft pack: no cockpit doors, so
  the crew board through the cabin, and a 1.7 m shorter cabin and hull on a longer tail boom.
- The showcase's model page has an Open view for every vehicle with parts that move. It puts each door, lid and shutter
  at its open stop, riders following their carriers, and hides what a stowing slide has taken in, as the swing check
  does. The view is kept in the page's link.
- A part's motion can stow: a slide stage may carry `stow`, an offset along its direction past which what the part
  shows is hidden, so a shutter can rise into its head. A placement site may name the site it `rides`, the carrier
  that poses it before its own motion.
- The build checks that every vehicle part that opens swings clear of the other parts and the ground, and each moving
  site's placements export gains `swing`, how much of its way it opens before it first touches something and what that is.
  A roller shutter is checked only where it shows, not where it rolls into its head.
- The vehicle authoring tool has a Vehicles view that shows each moving part's swing verdict from the build's check, and a
  Solve button that proposes a hinge-line move or a shorter stop for a part that swings into something. It needs the tool's
  dev server and writes nothing.

### Changed

- `rifle_anti_materiel` now ships with iron sights: a fixed post on its barrel shroud and a removable one-piece peep
  rear sight, attachment `rail-peep-rear-sight`, on its receiver rail. A scope fits that rail once the rear sight
  comes off.
- The armoured vehicles' roof hatches have round lids over round holes, so an open hatch shows a way into the hull or
  turret, and the hull roof is open inside the turret ring.
- Every folding bus door hides the gap its leaves leave at rest behind a black rubber edge strip on one free panel,
  lapping the other leaf of a pair or the pillar of a single leaf, and the strip folds clear with the door.
- The vehicle gallery, the gun viewer lists and the press check clip order their names by character code, so they no longer vary with the host locale. A new test refuses locale ordering in the tools and site.
- The tracked infantry fighting vehicle's rear roof has one wide rectangular troop hatch, `cv9040_troop_hatch` at site
  `troop_hatch`, over a matching hole, in place of the pair of round APC hatches at `troop_hatch_near` and `troop_hatch_far`.
- Every petrol car now fits its four, V6 or V8 as a core with salvageable light accessories (`alternator_light`,
  `starter_motor_light`, `air_box_light`, `fuel_pump_light`, `drive_belt_light`) in place of the bare fused engine. The
  V6 and V8 are drawn as vees, with the air box standing in the valley between the banks. The armed pickup carries a new
  light truck's four, `engine_i4_petrol_medium`, with medium accessories, in place of `engine_i4_petrol`. The fused
  `engine_v6_petrol` and `engine_v8_petrol` models look different too: the engine kit draws them, with the light
  accessories and the kit's finishes. `air_box_light` is smaller and lighter and stands lower beside the block, so it
  fits under a narrow bonnet; every fused light engine that draws it changes with it. The sports car's floor behind its
  seats is open over its engine and gearbox, which now stand lower in that bay.
- The military transport helicopter's doors open as they do on medium utility helicopters: each cabin door slides aft
  along its sill rail, clear of the engines above it, and leaves the cockpit door free to swing out on pins at its front
  edge. The cabin runs on at full section behind the cabin door for the door to slide its whole length clear of the
  doorway, so the fuselage and its tail are 1.7 m longer.
- Every separate iron sight part keeps a smooth mesh in the voxel model, as cartridges already did, so posts, notches
  and holes read cleanly at the eye. That covers the loose parts `front_sight_ak`, `front_sight_ar`,
  `front_sight_sporter`, `rear_sight_sporter`, `front_bead` and `rear_sight_ak`, the attachments `rail_front_sight`,
  `rail_rear_sight` and `rail_peep_rear_sight`, and the same sights fitted to a gun. Each sits slightly into the part it
  mounts on, a loose attachment too once fitted, and the attachments now take the gun grain. Sights built into another
  part, such as a pistol slide or a revolver frame, stay voxelized. The eyes and directions of guns sighted by a
  separate sight part move to the authored sight line; built-in sights keep theirs.
  
  `rail_rear_sight` is now one solid frame round its square hole, so the smooth mesh shows no joins at its corners. The
  AK rear notch is wider, so light shows either side of the front post however far the eye sits behind it.
- Van sliding side doors, the air ambulance's sliding doors and the military transport helicopter's cabin doors now
  export a staged motion, a slide out and then a slide along, in place of their hinge anchors. What a van carries on its
  side door rides it, and the security van's side door keeps only its lock bar, `security_van_side_door_lock_bar`, in
  place of the bars with hinge straps. The air ambulance's door rolls back to the cabin's rear end. The ice cream van and
  the food truck keep a side door that does not slide, because their serving counters stand in its path.

### Fixed

- The trucks' leaf springs are now drawn on both sides and sit on their axles' seats clear of the crossmembers and the
  rear underrun. On the trucks built on the shared truck chassis, no crossmember passes through an engine or gearbox. The
  conventional box truck's and SWAT truck's radiators stand as far forward as their front crossmembers let them. The
  hybrid refuse truck's motor stands behind the crossmember behind its gearbox, which leaves room for the smaller
  `traction_pack_car` in place of `traction_pack_van`.
- Fabric grain's slow mottle no longer stripes a stepped garment, such as the wizard robe's skirt, at mid distance, and
  the thing and gun authoring tools draw a fabric finish's grain beside its sheen. The shader moved to
  `tools/fabric.mjs`; a game that ported it ports the mottle's change too (`tools/fabric.mjs`, `wearFabric`).
- A build after a change to `models/finishes.jsonnet` writes the new colours into the manifest's `finishes` on the first
  run, where it used to write the previous build's until a second build.
- `riot_helmet` and `baseball_cap` are sized from the player bust's head instead of by hand, so they no longer stand
  loose round it; `riot_helmet` is about 26 mm lower at the crown, clears the hair and carries a `brow` anchor.
  `tank_crew_helmet` covers the hair and its headset lead hangs at the nape instead of jutting out back.
- The road roller's radiator stands ahead of its engine inside the hood, so its hoses run to the engine instead of
  out through the hood's rear panel.
- The vans' cab doors, bonnet and rear doors no longer touch their frames, lamps or neighbouring panels when shut or swinging.

## 0.7.0 - 2026-11-14

### Breaking

- Car and hatchback doors, bonnets, boot lids and tailgates, and the hoist door, carry a `motion` on their model: a
  non-empty list of stages from rest to the part's stop, each a hinge axis and signed angle or a slide direction and
  travel in the model frame, with its share of the clock. They no longer have `hinge_a` or `hinge_b` anchors, and each
  shows hinge pins in its own paint where it turns.

### Upgrading from 0.6.0

- Open these parts by playing their `motion` rather than deriving a hinge from `hinge_a` and `hinge_b`.
- Run the stages one after another, each linearly through its `share` of the clock. Nest the first stage outermost:
  every stage is given in the part's rest frame.
- For a part placed mirrored, reflect each stage across the model's x = 0 plane: negate the x of the hinge axis ends
  and the angle, or the x of a slide's direction.

### Added

- Two stone altars in the arcana pack: `temple_altar`, on a stepped dais with candlesticks, a bowl of embers and a cloth,
  and `wayside_altar`, a small one with an offering ledge, candles and an upright stone behind.
- A finish may carry a `clearcoat` (amount, roughness and the metalness to use under it) for renderers that draw a clear layer. Gloss paints and glass carry a glossy coat and flat paints a faint one; a renderer without coats draws the finish as before.
- A stash chest in the containers pack: a big iron-bound chest of weathered grey planks, padlocked shut as `stash_chest` and open and empty as `stash_chest_open`. Its lid is a separate part hung at the hinge line, so a game can swing it open. Its planks are a new finish, `wood-weathered`, which vehicle sites can name too.
- The build fails when parts at different sites of a vehicle overlap deeper than a grain, unless `models/vehicles/seating.libsonnet` lists the pair as a fit or the vehicle allows or marks it unjudged; unjudged overlaps print a note on every run.
- A stone statue of an armoured warrior on a plinth, `warrior_statue`, larger than life: the player's doll in plate
  harness and armet, one hand resting on a sword planted point-down and the other on a heater shield standing at its
  side. It carries the new curated keywords `statue` and `monument`.

### Fixed

- Car boot lids have underside hinge leaves and pivots.
- Vehicle parts no longer run through each other where they were misplaced:
  
  - the van, SUV and articulated bus exhausts pass under their axles;
  - the heavy trucks' exhausts run beside the gearbox, and the SWAT truck and APC exhausts end clear of the radiator;
  - the cab-over trucks' lower dashboard stops at the radiator instead of running through it;
  - the road roller's engine hood is a panelled bay, raised to clear the engine inside it;
  - the heavy truck gearbox sits under the frame's rail top, clear of the bodies standing on it, and the mobile crane's rides over its second axle;
  - the beach buggy's rear axle is a pair of half-shafts beside its engine, and its fuel tank sits on the transaxle;
  - the road roller's fuel tank sits along the spine ahead of the rear drum;
  - the convertible's and muscle car's exhausts run below the rear bench, the shuttle bus engine and gearbox stand ahead of its rear axle, the sports car engine ahead of its twist beam, the microcar engine off centre clear of the arch liner, and the fuel tanks of the air ambulance and light tactical vehicle clear of the skids and tailgate; the sleek security walker's radiator sits forward, clear of its carrier;
  - these tyres and springs no longer pass through their neighbours: the light 4x4 truck's spare hangs on the cab above the engine, the army jeep's spare rides above the tow hitch, the semi tractor's rear overhang reaches past its underrun bar's tyres, the classic 4x4 carries a two-seat bench between its arches, the crashed hatchback's bench sits ahead of its rear wheels, and the electric box truck's and hybrid refuse truck's traction packs end ahead of the rear springs;
  - frames clear their running gear: the light tactical vehicle's crossmembers arch over the prop shafts, the crew pickup's middle crossmember stands above its rear shaft, the trencher's track beams end at the tracks, and the skid steer's engine cover rests on the frame's sponsons;
  - the mobile crane's winch stands ahead of its counterweight, and the combine harvester's reel turns over the cutter bar, clear of the auger;
  - the tanker truck's saddles cradle the barrel's curve instead of stepping up into it, and the front saddle stands clear of the barrel's band;
  - the quad bike's front shocks mount under the fenders instead of through them, and a bus's instrument binnacle stands back from a windscreen raked over the dash;
  - the military transport helicopter's engines stand high enough for its full-length cabin doors to pass under them;
  - the medium engines' alternator rides high on the exhaust side, clear of the light 4x4 truck's springs and the half-track's frame rails;
  - cabin fittings clear their doors and walls: the light helicopter's seats sit inboard of the door frames, the news helicopter's rear bench back sits inside its doors, the minivan's third row is a two-seat bench between the arches, the air ambulance's locker stands behind the sliding door's leading edge, and the APC's ammo rack stops under the wall locker;
  - the hybrid saloon carries no starter or alternator, since its motor-generator does both jobs, and its inverter sits on the transaxle clear of the air box.

## 0.6.0 - 2026-11-12

### Breaking

- The CV9040 shares the main battle tank's armoured hull: its side skirts come off as `cv9040_side_skirt`, and its
  transmission is `cv9040_transmission`.
- The player doll's fingers bend at every joint and its thumb has three bones, so a pose can curl a hand round a grip.
  Gloves follow suit: each glove's single `_worn_fingers` shell is now one shell per finger bone and per thumb bone.

### Upgrading from 0.5.0

- Apply `renames.json`; `cross_drive_transmission` maps to `cv9040_transmission`.
- Where you dress a figure in a glove's `_worn_fingers` shell, dress it in the glove's per-bone shells instead, as the manifest lists them.

### Added

- Airport crash tender: a 6x6 lime-yellow fire truck with a roof water cannon, a bumper turret, roller-shutter lockers and separable tanks, pump and turrets. It brings a 14.00 R25 flotation wheel (`wheel_385_95r25`), wide driven and steered axles (`beam_axle_wide`, `steered_axle_wide`) and the `paint-lime-yellow` finish.
- The anti-materiel rifle exports as `rifle_anti_materiel`, a rifle in the firearms pack, without an optic: its receiver rail
  takes the pack's optics as attachments. It has a magazine slot, and its ten-round `50-bmg` magazine exports loose as
  `magazine_bmg_10`. The gun tool's anti-materiel template generates rifles chambered in `50-bmg`.
- Sci-fi wheeled carrier: `apc_scifi_wheeled`, a low, slab-sided armoured hull slung between four large 18.00 R25
  flotation wheels, its long glacis raked down to a wedge nose between two fenders like a bullet's point, every face
  flat, every outer joint bevelled. Its wheel wells are half octagons, and a wedge over the glacis closes each front well
  off from the nose. The hull is a hollow shell a crouching player can enter by a big rear ramp door or a side door on
  the kerb side, to troop benches along the walls, a driver's seat with controls behind a vision slit in the glacis and
  periscopes in the roof, a locker and an equipment rack. A boxy turret with a single cannon, a launcher pod on each
  cheek, a gunner's sight and a commander's panoramic sight turns all round over periscopes ringing the roof hatches;
  grab rails along the hull's sides and a stowage pannier complete it, all in flat dark earth paint. Its shell, roof,
  glacis, doors, seats, optics and fittings are separable rows of their own, tagged `sci-fi` and `armoured`, in the
  ground-vehicles pack.
  
  The kit gains the 18.00 R25 wheel `wheel_18_00r25` (tyre `tyre_18_00r25` on rim `rim_25_steel_wide`) and the darker
  flat dark earth vehicle paint `paint-fde`. Compound prisms can be cut by sloped planes, so armour plates need not lie
  along an axis; a plate's cut can bound a skin of armour behind it, so a hull can be hollow; and two cuts can be
  bevelled where they meet, so a joint is a flat chamfer.
- For game developers: a new bolt carbine variant, `bolt_carbine_drum`, fed from a rotary drum of rocket bolts in place
  of the box magazine.
- For game developers: a new vehicle, `bulldozer`, a 20-tonne crawler dozer in construction yellow with a high-drive
  track, a ROPS cab, a semi-U blade on push arms and a three-shank ripper. Its blade, push arms, cylinders, ripper,
  shanks, engine panels, doors and track wheels are parts of their own, and it reuses existing engine, gearbox, radiator,
  seat and lamp parts.
- For game developers: smooth rounds and cases for .338 Lapua Magnum, 7.62×54mmR, .50 BMG, the 40 mm Bofors L/70 shell
  and the 120 mm smoothbore tank shell (`round_`/`case_` plus `338_h_lapua_h_magnum`, `7_d_62x54r`, `50_h_bmg`,
  `40x365r`, `120x570`). The .308 Winchester round also serves 7.62×51mm, and the anti-materiel rifle chambers .50 BMG. The shells carry
  the new `cannon` weapon class.
- For game developers: the improvised and riot armour, wetsuits and swimwear, costumes, underwear, alchemy gear, and a few tools, medicines and supplies carry search keywords in their manifest entries, such as `diving`, `alchemy`, `police` and `cooking`.
- For game developers: catalogue models in the first 49 batches, such as ovens, propane tanks, medicines, cookware and
  instruments, carry search keywords, for example `cooking`, `fuel`, `painkiller` and `music`. The showcase's search
  finds them by those words.
- For game developers: models carry search keywords. The keyword vocabulary in `models/taxonomy.json` now gives each
  word its meaning, and zombies, dragons, elementals, insects, the pipe rifle and its parts, scopes and silencers are the
  first models to carry them.
- A galvanised steel trash can, `galvanised_trashcan`, with a lid that lifts off, and the same can kicked in,
  `galvanised_trashcan_dented`: its wall caved in, leaning and its lid knocked askew. Each is a `body` and a `lid` part.
- For game developers: the recreation pack gains gym equipment, tagged `place: gym`: hex, heavy and light dumbbells,
  an empty and a loaded standard 20 kg barbell, bumper and cast iron plates, three kettlebells, an adjustable weight bench, a
  power rack, a treadmill, an air rower, a flat and a rolled exercise mat, a plate tree and a dumbbell rack.
- `tools/packages/impact-synth` renders an object dropped on a surface to samples from a Jsonnet row, the same samples
  for the same row, seed and sample rate. The first rows, `brass-on-concrete` and `glass-on-concrete`, are in
  `models/sounds/impacts.jsonnet`.
- For game developers: more catalogue models carry search keywords for their use, common name or scene, such as `cooking`, `camping`, `metalworking`, `archery`, `military`, `improvised` and `toy`.
- For game developers: the catalogue's worn clothing, headwear, jewellery and bag models carry search keywords for the
  occasion or trade they belong to, such as `cold-weather`, `costume`, `firefighting`, `jewellery`, `luggage`, `military`,
  `religious` and `safety-gear`.
- A generic main battle tank, `main_battle_tank`, of about 60 t: its turret, 120 mm gun, sights, hatches, smoke
  dischargers, bustle basket, tracks, wheels, skirts, V12 engine and transmission each come off as their own part.
- Each release carries `model-history.json`: for every model, the release that introduced it, the release that last changed its file and the file's hash. The showcase shows these on each model, and marks a model that main has changed since the latest release.
- The showcase's footer names the version it shows: the latest release tag and the main commit it follows, each linked to GitHub, or just the tag when main sits exactly on a release.
- For game developers: a model's manifest entry can carry a `place` tag, where the thing is typically found (first term
  `gym`), and `keywords`, extra kebab-case search words. The gym bags are tagged `place: gym`, and the showcase's search
  finds models by their keywords.
- The pose page plays the press check as a clip: the doll carries the rifle through its eight key frames, the charging handle drawing and closing as it goes. Frames collected on the page keep what the hands held too, so a clip built across held poses moves the item's parts with it.
- For game developers: mobgen can generate a new boss-scale mob, `security-walker`, an armoured reverse-knee guard walker with a stomping walk, a servo-twitch idle and a twin-pod fire clip, in a slate, charcoal and warning-yellow finish. It is not yet in the exported mob packs.
- `security_walker_sleek` joins `skelly.ground-vehicles` as a separate security-walker derivative, with a shallow faceted upper hull, recessed rotary bearing, CV9040 optical fittings and rear cooling module. Each detachable weapon pod carries an ammo cassette and enclosed segmented gun feed. A floodlight and paired guarded headlamps sit on the fixed hull's front, with another headlamp pair on the turret. It reuses the original walker's legs, hydraulics and detachable weapon modules; the original assembly is unchanged. Its authored rotary interface and equipment are static geometry, without runtime articulation, animation, simulated lighting or ammunition transport.
- For game developers: a new vehicle, `security_walker`, an armoured walker on two reverse-knee legs with clawed feet, a
  sensor window in place of a cab, a weapon pod on each flank and warning stripes. Each leg's thigh, shin, tarsus, foot,
  hip drive, ram barrels, ram rods and hoses are parts of their own with `pivot`, joint and ram-eye anchors, so a rig can
  turn the joints and slide the rams; it reuses existing engine, radiator, fuel tank, battery, gun, hatch and lamp parts.
- The showcase tells an assembly, which is built from other models or from several components, from an atom, which is one piece. The model panel states it, and a Form filter picks either, kept in the link as `form=`. `models.json` carries it as each entry's `form`, derived from its sites and components rather than tagged.
- For mod authors: the showcase's viewer shows a model's mass and folds its metadata into a panel that lists its parts
  with their masses, linking each part that is a model of its own, beside its manifest entry and sidecar.
- The showcase's model panel shows a model's category, mass and density. The manifest now carries `massKg` and `volumeM3` (the volume of the voxels the model is drawn with) for every catalogue model; a vehicle's panel sums its parts.
- The showcase's header links its tools: the pose and model look pages and the mob, gun, thing and vehicle viewers.

### Changed

- For game developers: the bolt guns have a new skeleton stock with a raised comb, cheek pads, a brass butt plate and a
  rubber pad, which makes each gun about 0.1 m longer, and bevelled slabs in place of raw boxes. The bolt carbine's
  magazine is straight, square to the bore, and deeper fore and aft, because its rocket bolts are longer.
- 7.62×39mm and 7.62×54mmR rounds and cases now have grey polymer-coated steel cases; other cartridges stay brass. The viewer's brass and copper now use the content's matte finish.
- For game developers: every model now carries an authored `title`, the name a player would use, and the manifest, the
  showcase, the vehicle gallery and the thing export's label text read it. The build refuses a model without one. Ids
  are no longer turned into display names, so a printed label that named no text now reads the model's title.
- The `polymer-fde` finish is a darker, greyer flat dark earth instead of a pale tan, so the anti-materiel rifle's stock
  and grip and every catalogue item finished in it, such as ration pouches and the tan helmet, look darker.
- The manifest carries `massKg` for a gun, a gun part and any other model whose tool weighs its parts but gives no total, as the sum of the parts' masses; `volumeM3` stays out for them.
- For game developers: undead mobs carry the new keyword `undead`: every zombie, which keeps `zombie`, and the
  death-knight bestiary mob. The `place` facet gains `bathroom`, `farm`, `hospital`, `kitchen`, `laboratory`, `office`
  and `workshop`, applied to the household objects, tools, machines, appliances and instruments that clearly belong in
  them.
- The showcase opens on a handful of models chosen afresh each day instead of drawing all of them, and shows the rest only once a search, a category or a filter selects them, a page at a time. It gains a combobox for keywords and one for each tag facet, and the page keeps its whole state in the URL hash (filter, open model and its view, unfolded details), so any view can be shared as a link.
- The pose page's press check plays at a shooter's pace, each key frame at its own time with eased moves, about three and a half seconds in all. Seconds scales that timing.
- For game developers: rounds and spent cases are drawn as faceted lathes with the same side count as optic bodies,
  instead of voxels. Small features land unevenly on any voxel grain, so cartridges start smooth; voxelizing them is
  revisited if the clash with the voxel guns bothers players.

### Fixed

- The night vision goggles' and headlamp's straps follow the player bust's hair all round, one strap voxel off it, as a
  narrower band that sits lower on the goggles and higher on the headlamp; their strap anchors move with them, and the
  bust's crown hair sits a little further back.
- The showcase's model look page opens on a few of the day's models instead of an empty page, with a picker that draws the models you choose and keeps them in the page's link.
- The worn tank top's armholes stand clear of the arm, so no skin shows through its sides at rest; above the armpit only a front and a back panel rise to the straps. The player bust's lower chest is a touch narrower so the top's sides can enclose it inside the hanging arm.
- A thin gun part, such as the AR charging handle or a revolver trigger, draws at the fine detail grain and no longer zigzags between two voxel layers.
- The showcase's thing viewer opens again: it lists the thing models of each pack instead of failing on the pack's guns.

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
