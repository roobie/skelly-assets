// The driveline measures a ladder chassis is laid around, so the axles and shafts `shared.libsonnet` draws and the
// frame `truck-cab.libsonnet` lays read the same numbers.
{
  propShaftRadius: 0.04,
  // Each sprung axle by part id. `seat` is its near spring seat in the axle's frame: its bottom and top along `y` and
  // its inner and outer edge along `z`. A chassis hangs its springs on the seats, so a seat must span the spring under
  // the rail it carries.
  axles: {
    beam_axle_light: { seat: { y: [0.4225, 0.4725], z: [0.39, 0.53] } },
    beam_axle_van: { seat: { y: [0.4225, 0.4725], z: [0.48, 0.62] } },
    beam_axle_truck: { seat: { y: [0.58, 0.63], z: [0.32, 0.46] } },
    steered_axle_heavy: { seat: { y: [0.58, 0.62], z: [0.32, 0.46] } },
    steered_axle_medium: { seat: { y: [0.475, 0.5], z: [0.32, 0.46] } },
    beam_axle_wide: { seat: { y: [0.61, 0.66], z: [0.6, 0.74] } },
    steered_axle_wide: { seat: { y: [0.58, 0.62], z: [0.6, 0.74] } },
  },
}
