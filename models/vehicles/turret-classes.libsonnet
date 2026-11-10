// The size classes of a turret's salvageable fittings. Every turret of one class takes the same guns, sight, periscopes,
// hatch and smoke launchers, so one salvaged from a turret fits any other of its class. A class is one entry here;
// `turrets.libsonnet` names each turret's class. Metres and kilograms; `turret-kit.libsonnet` says each fitting's frame.
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
      id: 'kpvt_heavy_machine_gun',
      massKg: 49,
      taxonomy: gun,
      receiver: { length: 0.63, height: 0.18, width: 0.16 },
      barrel: { length: 1.346, radius: 0.03 },
      flashHider: { length: 0.1, radius: 0.042 },
    },
    // A 7.62 mm PKT, 1.098 m long overall with a 0.722 m barrel, weighs 10.5 kg. Its barrel is drawn a little thicker
    // than it is, since a thinner one falls through the vehicle voxel grid.
    coaxGun: {
      id: 'pkt_machine_gun',
      massKg: 10.5,
      taxonomy: gun,
      receiver: { length: 0.376, height: 0.1, width: 0.08 },
      barrel: { length: 0.722, radius: 0.02 },
    },
    // The gunner's periscopic day sight; its head stands above the roof, glass forward.
    sight: { id: 'turret_day_sight', massKg: 12, length: 0.18, height: 0.15, width: 0.16 },
    // The hull's own vision periscope, so one salvaged from the hull fits the turret's roof.
    periscope: { id: 'apc_periscope', massKg: 6, length: 0.22, height: 0.1, width: 0.28 },
    // A round lid of 7 mm armour on its hinge, over a square opening in the roof.
    hatch: { id: 'turret_hatch', massKg: 15, radius: 0.22, thickness: 0.04, opening: 0.28 },
    // One empty 81 mm smoke-grenade launcher tube on its foot, raised to throw forward over the turret.
    smokeLauncher: { id: 'smoke_launcher_81mm', massKg: 3, bore: 0.09, length: 0.24, elevation: 45 },
  },
}
