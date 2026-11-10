// The turrets built as a core with their class's fittings; see `turret-kit.libsonnet`. `massKg` is the whole dressed
// turret's, so the fused model and the assembly weigh the same and the core takes what the fittings leave: its
// armour, gun mount, traverse gear, seats and ready ammunition. Metres in the turret's frame: x forward along the guns,
// y up from the ring, z toward the near side.
//
// The shell rises in `bands` from its base to its roof, each band stepping in toward the roof: a cone of `sides` faces,
// or a plan of corners as (z, x) at the base and the roof, listed from the front face's far corner round the near side,
// so the first face looks forward. The shell's front face is open where the guns pass, for the gun mask. Each fitting is
// its site, its class entry and where its origin sits; the guns' origins stand on the mask's back, where their
// receivers abut it. Roof hatches stand side by side across the roof, which is cut open under each. Each smoke rack
// stands its launchers in a row `along` x or z through `at`, and reaches into the shell to `reach` across that row.
{
  // A one-man turret of 7 mm welded armour as on an eight-wheeled carrier, coned from the ring to a flat roof.
  apc_turret: {
    local height = 0.455,
    local bore = 0.2,
    local back = 0.47,
    class: 'one_man_mg',
    massKg: 480,
    paint: 'paint-olive',
    shell: { sides: 12, baseRadius: 0.66, roofRadius: 0.48 },
    bands: 7,
    height: height,
    // Drawn thicker than the armour is, so the shell stays closed on the vehicle voxel grid.
    wall: 0.05,
    // The armoured gun mask across the shell's front face, from the guns' receivers to its face, and the perforated
    // jacket round the heavy gun's barrel ahead of it.
    mask: { front: 0.7, across: [-0.15, 0.19] },
    jacket: { gun: 'heavy_machine_gun', length: 0.5, radius: 0.065 },
    fittings: [
      { site: 'heavy_machine_gun', key: 'heavyGun', at: [back, bore, -0.04] },
      { site: 'coaxial_machine_gun', key: 'coaxGun', at: [back, bore, 0.1] },
      { site: 'turret_sight', key: 'sight', at: [0.3, height, 0] },
      { site: 'turret_periscope_0', key: 'periscope', at: [0.08, height, 0.29] },
      { site: 'turret_periscope_1', key: 'periscope', at: [0.08, height, -0.29] },
      { site: 'turret_hatch', key: 'hatch', at: [-0.2, height, 0] },
    ],
    // One rack across the turret's rear.
    smokeRacks: [{ along: 'z', at: [-0.78, 0.1, 0], spacing: 0.12, count: 6, reach: -0.55 }],
  },
  // The CV9040's two-man turret: a welded steel box, its faces sloped in toward the roof, the 40 mm gun on the centre
  // line with the coaxial gun beside it, the commander on the near side and the gunner on the far side, each under a
  // hatch with a sight ahead of it. Its plan is read from drawings of the vehicle and its mass is an estimate, since
  // neither is published.
  cv9040_turret: {
    local height = 0.75,
    local bore = 0.37,
    local back = 0.85,
    local hatchX = -0.3,
    class: 'two_man_autocannon',
    massKg: 3800,
    paint: 'paint-olive',
    shell: {
      base: [[-0.55, 1.05], [0.55, 1.05], [1.1, 0.6], [1.1, -1.2], [0.85, -1.6], [-0.85, -1.6], [-1.1, -1.2], [-1.1, 0.6]],
      roof: [[-0.45, 0.85], [0.45, 0.85], [0.95, 0.5], [0.95, -1.1], [0.75, -1.45], [-0.75, -1.45], [-0.95, -1.1], [-0.95, 0.5]],
    },
    bands: 5,
    height: height,
    wall: 0.08,
    mask: { front: 1.2, across: [-0.52, 0.52] },
    jacket: { gun: 'main_gun', length: 0.4, radius: 0.1 },
    fittings: [
      { site: 'main_gun', key: 'mainGun', at: [back, bore, 0] },
      { site: 'coaxial_machine_gun', key: 'coaxGun', at: [back, bore, -0.36] },
      { site: 'gunner_sight', key: 'gunnerSight', at: [0.3, height, -0.45] },
      { site: 'commander_sight', key: 'commanderSight', at: [0.3, height, 0.45] },
      { site: 'turret_periscope_0', key: 'periscope', at: [-0.85, height, 0.45] },
      { site: 'turret_periscope_1', key: 'periscope', at: [-0.85, height, -0.45] },
      { site: 'commander_hatch', key: 'hatch', at: [hatchX, height, 0.45] },
      { site: 'gunner_hatch', key: 'hatch', at: [hatchX, height, -0.45] },
    ],
    // Two clusters of three, one on each side.
    smokeRacks: [
      { along: 'x', at: [-0.1, 0.5, 1.12], spacing: 0.14, count: 3, reach: 0.95 },
      { along: 'x', at: [-0.1, 0.5, -1.12], spacing: 0.14, count: 3, reach: -0.95 },
    ],
  },
}
