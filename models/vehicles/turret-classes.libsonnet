// The size classes of a turret's salvageable fittings. Every turret of one class takes the same guns, sights,
// periscopes, hatches, smoke launchers and stowage baskets, so one salvaged from a turret fits any other of its class.
// A class is one entry here; `turrets.libsonnet` names each turret's class and where it fits each fitting. Metres and
// kilograms; `draw` names the drawing in `turret-kit.libsonnet`, which says each fitting's frame. A gun too long for
// the `gun` voxel class's lattice names a coarser `voxelGrain` of its own.
// A fitting's `taxonomy` is its row's own, over the vehicle's (`models/TAXONOMY.md`): a gun lifted off a turret is a
// whole weapon, not a vehicle part.
local gun = { category: 'weapons', tags: { material: ['metal'], setting: ['modern'] } };
{
  // A one-man machine-gun turret: a 14.5 mm heavy machine gun with a coaxial 7.62 mm machine gun.
  one_man_mg: {
    // The body paint the painted fittings are authored in; a vehicle's site repaints each copy.
    paint: 'paint-olive',
    // A 14.5 mm KPVT, 1.98 m long overall with a 1.346 m barrel, weighs 49 kg.
    heavyGun: {
      draw: 'gun',
      id: 'kpvt_heavy_machine_gun',
      massKg: 49,
      taxonomy: gun,
      receiver: { length: 0.63, height: 0.18, width: 0.16 },
      barrel: { length: 1.346, radius: 0.03 },
      flashHider: { length: 0.1, radius: 0.042 },
    },
    // A 7.62 mm PKT, 1.098 m long overall with a 0.722 m barrel, weighs 10.5 kg. Its barrel is drawn a little thicker
    // than it is, since a thinner one falls through the vehicle voxel grid of the fused turret.
    coaxGun: {
      draw: 'coaxGun',
      id: 'pkt_machine_gun',
      massKg: 10.5,
      taxonomy: gun,
      receiver: { length: 0.376, height: 0.1, width: 0.08 },
      barrel: { length: 0.722, radius: 0.02 },
    },
    // The gunner's periscopic day sight; its head stands above the roof, glass forward.
    sight: { draw: 'sight', id: 'turret_day_sight', massKg: 12, length: 0.18, height: 0.15, width: 0.16 },
    // The hull's own vision periscope, so one salvaged from the hull fits the turret's roof.
    periscope: { draw: 'periscope', id: 'apc_periscope', massKg: 6, length: 0.22, height: 0.1, width: 0.28 },
    // A round lid of 7 mm armour on its hinge, over a square opening in the roof.
    hatch: { draw: 'hatch', id: 'turret_hatch', massKg: 15, radius: 0.22, thickness: 0.04, opening: 0.28 },
    // One empty 81 mm smoke-grenade launcher tube on its foot, raised to throw forward over the turret.
    smokeLauncher: { draw: 'smokeLauncher', id: 'smoke_launcher_81mm', massKg: 3, bore: 0.09, length: 0.24, elevation: 45 },
  },
  // A two-man autocannon turret: a 40 mm Bofors L/70 with a coaxial 7.62 mm machine gun, as on the CV9040.
  two_man_autocannon: {
    paint: 'paint-olive',
    // The Bofors 40 mm L/70's 2.8 m barrel, 3.245 m with its breech and flash hider. Its 2.4 t is the whole mounted
    // gun's; the gun alone is an estimate.
    mainGun: {
      draw: 'gun',
      id: 'bofors_40mm_l70_autocannon',
      massKg: 500,
      taxonomy: gun,
      receiver: { length: 1.1, height: 0.42, width: 0.42 },
      barrel: { length: 2.8, radius: 0.055 },
      flashHider: { length: 0.3, radius: 0.08 },
    },
    // A 7.62 mm Ksp m/39B, Sweden's Browning M1919: 0.964 m long overall with a 0.61 m barrel, 14 kg.
    coaxGun: {
      draw: 'coaxGun',
      id: 'ksp_m39_machine_gun',
      massKg: 14,
      taxonomy: gun,
      receiver: { length: 0.354, height: 0.12, width: 0.08 },
      barrel: { length: 0.61, radius: 0.02 },
    },
    // The gunner's day and thermal sight, and the commander's taller sight, which sees over the gunner's.
    gunnerSight: { draw: 'sight', id: 'ifv_gunner_sight', massKg: 30, length: 0.3, height: 0.28, width: 0.25 },
    commanderSight: { draw: 'sight', id: 'ifv_commander_sight', massKg: 35, length: 0.28, height: 0.4, width: 0.28 },
    periscope: { draw: 'periscope', id: 'ifv_turret_periscope', massKg: 7, length: 0.2, height: 0.12, width: 0.25 },
    // A crewman's round lid of armour plate on its hinge, over a square opening in the roof.
    hatch: { draw: 'hatch', id: 'ifv_turret_hatch', massKg: 30, radius: 0.3, thickness: 0.05, opening: 0.4 },
    // One empty 76 mm Galix grenade launcher tube on its foot, raised to throw forward.
    smokeLauncher: { draw: 'smokeLauncher', id: 'galix_launcher_76mm', massKg: 2.5, bore: 0.08, length: 0.2, elevation: 45 },
  },
  // A main battle tank's three-man turret: a 120 mm smoothbore gun with a coaxial 7.62 mm machine gun. The values are a
  // generic Western tank's, from the published figures of that era's guns and fittings; the masses of the sights, hatches
  // and basket are estimates.
  mbt_120mm: {
    paint: 'paint-olive',
    // A 120 mm L/44 smoothbore: a 5.28 m barrel, 44 calibres, with its fume extractor about two fifths of the way out.
    // About 3.2 t with its breech, as published for guns of its kind; the breech is drawn as the receiver.
    mainGun: {
      draw: 'gun',
      id: 'smoothbore_120mm_tank_gun',
      massKg: 3200,
      taxonomy: gun,
      receiver: { length: 1.2, height: 0.5, width: 0.6 },
      barrel: { length: 5.28, radius: 0.1 },
      fumeExtractor: { from: 2.0, length: 0.9, radius: 0.16 },
      voxelGrain: 0.008,
    },
    // A 7.62 mm general-purpose machine gun of about 1.2 m and 11 kg, with a 0.56 m barrel.
    coaxGun: {
      draw: 'coaxGun',
      id: 'coaxial_machine_gun_762',
      massKg: 11,
      taxonomy: gun,
      receiver: { length: 0.5, height: 0.1, width: 0.08 },
      barrel: { length: 0.56, radius: 0.02 },
    },
    // The gunner's stabilised day and thermal sight, a box ahead of the commander, and the commander's panoramic sight,
    // which stands high enough to see over the gunner's and turn on its own.
    gunnerSight: { draw: 'sight', id: 'mbt_gunner_sight', massKg: 90, length: 0.5, height: 0.3, width: 0.36 },
    commanderSight: { draw: 'sight', id: 'mbt_commander_sight', massKg: 60, length: 0.3, height: 0.48, width: 0.3 },
    periscope: { draw: 'periscope', id: 'mbt_turret_periscope', massKg: 8, length: 0.2, height: 0.12, width: 0.25 },
    // A crewman's round lid of thick armour plate on its hinge, over a square opening in the roof.
    hatch: { draw: 'hatch', id: 'mbt_turret_hatch', massKg: 60, radius: 0.33, thickness: 0.06, opening: 0.5 },
    // One empty 76 mm smoke-grenade discharger tube on its foot, raised to throw forward.
    smokeLauncher: { draw: 'smokeLauncher', id: 'smoke_discharger_76mm', massKg: 3, bore: 0.09, length: 0.26, elevation: 45 },
    // The steel basket the crew's kit rides in behind the turret.
    bustleRack: { draw: 'stowageBasket', id: 'turret_bustle_rack', massKg: 70, depth: 0.6, width: 2.6, height: 0.5, bar: 0.04, slats: 7 },
  },
}
