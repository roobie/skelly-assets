---
type: breaking
---
The models that each sat in a hand-picked pack now ship in the pack their category routes to, as every other catalogue
model does. No model id changes. Ten packs that held only such models are gone: `skelly.basic-recipes`,
`skelly.deadvox.camp`, `skelly.deadvox.rural-sites`, `skelly.deadvox.scenario.gauntlet.city`,
`skelly.deadvox.scenario.lock-test`, `skelly.deadvox.scenario.playtest`, `skelly.electric-power`, `skelly.flame-tools`,
`skelly.fuel` and `skelly.packaged-foods`. `skelly.deadvox.actors` keeps its actors but no longer carries the severed
shambler parts and flesh chunks.

Upgrade:
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
