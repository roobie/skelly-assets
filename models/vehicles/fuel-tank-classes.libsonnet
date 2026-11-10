// The size classes of a fuel tank's salvageable parts. Every tank of one general size takes the same filler neck, so
// one salvaged from one vehicle fits another, while a truck's is bigger than a car's. A car's tank is a moulded slab
// under the floor; a truck's is a drum hung off the frame. A class is one entry here; `fuel-tanks.libsonnet` names
// each tank's class. Metres and kilograms; `fuel-tank-kit.libsonnet` says each part's frame.
{
  light: {
    body: { shape: 'slab', chamfer: 0.04, finish: 'polymer-black' },
    // Leaves the tank's +z side, runs out `reach` and turns up `rise` toward the filler flap.
    neck: { id: 'fuel_filler_neck_light', massKg: 1, mount: 'side', radius: 0.025, reach: 0.15, rise: 0.06, cap: 0.04, finish: 'steel-spall-black' },
    strap: { width: 0.04, thickness: 0.03125, finish: 'steel-spall-black' },
  },
  heavy: {
    body: { shape: 'drum', finish: 'alu-bare' },
    // Stands `rise` up off the drum's top.
    neck: { id: 'fuel_filler_neck_heavy', massKg: 2, mount: 'top', radius: 0.05, reach: 0, rise: 0.06, cap: 0.07, finish: 'alu-bare' },
    strap: { width: 0.06, thickness: 0.03125, finish: 'steel-stainless' },
  },
}
