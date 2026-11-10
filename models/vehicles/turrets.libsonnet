// The turrets built as a core with their class's fittings; see `turret-kit.libsonnet`. `massKg` is the whole dressed
// turret's, so the fused model and the assembly weigh the same and the core takes what the fittings leave: its
// armour, gun mount, traverse gear, seat and ready ammunition. Metres in the turret's frame: x forward along the guns,
// y up from the ring, z toward the near side.
{
  // A one-man turret of 7 mm welded armour as on an eight-wheeled carrier, coned from the ring to a flat roof.
  apc_turret: {
    class: 'one_man_mg',
    massKg: 480,
    paint: 'paint-olive',
    // The shell's faces round the ring, and its bands up from it: each band steps in toward the roof.
    sides: 12,
    bands: 7,
    baseRadius: 0.66,
    roofRadius: 0.48,
    height: 0.455,
    // Drawn thicker than the armour is, so the shell stays closed on the vehicle voxel grid.
    wall: 0.05,
    // The guns' bore height, and each bore's offset across the turret.
    bore: { height: 0.2, heavy: -0.04, coax: 0.1 },
    // The armoured gun mask across the shell's front face, from its back, where the guns' receivers abut it, to its
    // face; and the perforated jacket round the heavy gun's barrel ahead of it.
    mask: { back: 0.47, front: 0.7, across: [-0.15, 0.19] },
    jacket: { length: 0.5, radius: 0.065 },
    // Roof fittings as (x, z) on the roof: the hatch's centre, the sight's, and the near periscope's (the far one is its
    // reflection).
    hatch: [-0.2, 0],
    sight: [0.3, 0],
    periscope: [0.08, 0.29],
    // The rack the smoke launchers stand on across the turret's rear: its front edge reaches into the shell.
    smokeRack: { x: -0.78, height: 0.1, spacing: 0.12, count: 6, inset: -0.55 },
  },
}
