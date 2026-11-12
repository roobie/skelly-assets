// The size classes of a wheel's brake. Every wheel of one general size takes the same brake parts, so a part salvaged
// from one fits any other of its size, while a truck's are bigger than a car's. A class offers a `disc` brake, a `drum`
// brake or both, since one size of wheel is braked either way on different vehicles; a vehicle chooses which, and a
// class leaves out a kind no wheel of its size is built for. A class is one entry here; `wheels.libsonnet` names each
// wheel's class. Metres and kilograms; `wheel-kit.libsonnet` says each part's frame.
{
  light: {
    disc: {
      // A vented disc: the friction ring round a top hat that bolts against the rim's face.
      disc: { id: 'brake_disc_light', title: 'Light brake disc', massKg: 5, radius: 0.14, hub: 0.085, thickness: 0.025, hat: 0.03, finish: { ring: 'iron-cast', hat: 'iron-dull' } },
      // A sliding caliper behind the hub, its pistons inboard of the disc: `inner` and `outer` are its reach from the
      // wheel's axis and `span` the degrees it wraps round the ring.
      caliper: { id: 'brake_caliper_light', title: 'Light brake caliper', massKg: 3, inner: 0.1, outer: 0.165, span: 60, housing: 0.035, jaw: 0.016, finish: 'paint-red' },
    },
    // A small car's rear drum. The drum's closed `face` bolts against the rim's face and its barrel runs `depth`
    // inboard, round shoes of `width` that a wheel cylinder, its `body` thick and `length` long, spreads across the
    // gap at the top, `gap` degrees wide; the backing plate closes the drum's open end and carries both.
    drum: {
      drum: { id: 'brake_drum_light', title: 'Light brake drum', massKg: 4.5, radius: 0.1, wall: 0.014, face: 0.012, depth: 0.055, finish: 'iron-cast' },
      backingPlate: { id: 'brake_backing_plate_light', title: 'Light brake backing plate', massKg: 1.5, thickness: 0.008, lip: 0.006, finish: 'paint-charcoal' },
      shoes: { id: 'brake_shoes_light', title: 'Light brake shoes', massKg: 1.4, thickness: 0.014, width: 0.035, gap: 30, finish: 'iron-dull' },
      wheelCylinder: { id: 'brake_wheel_cylinder_light', title: 'Light brake wheel cylinder', massKg: 0.3, body: 0.03, length: 0.075, finish: 'iron-cast' },
      shoeAssembly: { id: 'brake_shoe_assembly_light', title: 'Light brake shoe assembly' },
    },
  },
  // A 20-inch military or medium truck wheel's hydraulic drum. Its steel disc wheels are built only for drums, so the
  // class offers no disc.
  medium: {
    drum: {
      drum: { id: 'brake_drum_medium', title: 'Medium brake drum', massKg: 22, radius: 0.19, wall: 0.018, face: 0.016, depth: 0.09, finish: 'iron-cast' },
      backingPlate: { id: 'brake_backing_plate_medium', title: 'Medium brake backing plate', massKg: 4, thickness: 0.01, lip: 0.008, finish: 'paint-charcoal' },
      shoes: { id: 'brake_shoes_medium', title: 'Medium brake shoes', massKg: 7, thickness: 0.02, width: 0.065, gap: 26, finish: 'iron-dull' },
      wheelCylinder: { id: 'brake_wheel_cylinder_medium', title: 'Medium brake wheel cylinder', massKg: 0.7, body: 0.05, length: 0.13, finish: 'iron-cast' },
      shoeAssembly: { id: 'brake_shoe_assembly_medium', title: 'Medium brake shoe assembly' },
    },
  },
  heavy: {
    disc: {
      // A truck's air disc brake.
      disc: { id: 'brake_disc_heavy', title: 'Heavy brake disc', massKg: 34, radius: 0.215, hub: 0.12, thickness: 0.045, hat: 0.05, finish: { ring: 'iron-cast', hat: 'iron-dull' } },
      caliper: { id: 'brake_caliper_heavy', title: 'Heavy brake caliper', massKg: 22, inner: 0.15, outer: 0.25, span: 90, housing: 0.07, jaw: 0.032, finish: 'paint-charcoal' },
    },
    // A truck's 16.5 by 7 inch drum.
    drum: {
      drum: { id: 'brake_drum_heavy', title: 'Heavy brake drum', massKg: 45, radius: 0.21, wall: 0.022, face: 0.02, depth: 0.205, finish: 'iron-cast' },
      backingPlate: { id: 'brake_backing_plate_heavy', title: 'Heavy brake backing plate', massKg: 9, thickness: 0.012, lip: 0.01, finish: 'paint-charcoal' },
      shoes: { id: 'brake_shoes_heavy', title: 'Heavy brake shoes', massKg: 20, thickness: 0.03, width: 0.178, gap: 24, finish: 'iron-dull' },
      wheelCylinder: { id: 'brake_wheel_cylinder_heavy', title: 'Heavy brake wheel cylinder', massKg: 1.5, body: 0.07, length: 0.16, finish: 'iron-cast' },
      shoeAssembly: { id: 'brake_shoe_assembly_heavy', title: 'Heavy brake shoe assembly' },
    },
  },
}
