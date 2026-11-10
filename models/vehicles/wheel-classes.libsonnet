// The size classes of a wheel's brake. Every wheel of one general size takes the same brake disc and caliper, so a
// part salvaged from one fits any other of its size, while a truck's are bigger than a car's. A class is one entry
// here; `wheels.libsonnet` names each wheel's class. Metres and kilograms; `wheel-kit.libsonnet` says each part's frame.
{
  light: {
    // A vented disc: the friction ring round a top hat that bolts against the rim's face.
    disc: { id: 'brake_disc_light', massKg: 5, radius: 0.14, hub: 0.085, thickness: 0.025, hat: 0.03, finish: { ring: 'iron-cast', hat: 'iron-dull' } },
    // A sliding caliper behind the hub, its pistons inboard of the disc: `inner` and `outer` are its reach from the
    // wheel's axis and `span` the degrees it wraps round the ring.
    caliper: { id: 'brake_caliper_light', massKg: 3, inner: 0.1, outer: 0.165, span: 60, housing: 0.035, jaw: 0.016, finish: 'paint-red' },
  },
  heavy: {
    // A truck's air disc brake; an axle drawn for it leaves out its drums, see `shared.libsonnet`.
    disc: { id: 'brake_disc_heavy', massKg: 34, radius: 0.215, hub: 0.12, thickness: 0.045, hat: 0.05, finish: { ring: 'iron-cast', hat: 'iron-dull' } },
    caliper: { id: 'brake_caliper_heavy', massKg: 22, inner: 0.15, outer: 0.25, span: 90, housing: 0.07, jaw: 0.032, finish: 'paint-charcoal' },
  },
}
