// An animal control van: a white box on a van cab, 5.7 m long, 2.2 m wide over the box and 2.5 m tall, with a 3.75 m
// wheelbase.
local van = import 'van-body.libsonnet';
local grain = (import 'kit.libsonnet').grain;
van.cab + van.loadFloor + {
  rear: -3.0, rearAxle: -1.98, panLow: 0.42,
  slideRear: -0.82,
  // An open cage hatch stands in the side door's path, so the door does not slide.
  sideDoorSlides: false,
  shellMass: 950, paint: 'paint-white',
  bands: [{ finish: 'paint-green', y: [0.88, 1.02] }],
  box: {
    front: 0, slideFront: -0.12, mass: 1000,
    side: 1.1, skin: 1.04, glassOut: 1.1, glassIn: 1.02, roofSide: 0.98,
    sill: 0.5, floor: 0.88, panLow: 0.6, rearSill: 0.82, hatchSide: 0.94,
    waist: 1.6, windowTop: 2.0, doorTop: 2.25, canton: 2.42, roof: 2.52,
    windows: [],
    columns: [-2.8, -2.14, -1.48], width: 0.62, cageIn: 0.2, cageHeight: 0.68,
    // One hatch over each cage, in whole grains on the body's lattice, so the hatch's edge gaps, each under half a
    // grain, take no cell and the closed side shows no slot.
    hatches: {
      size: [17 * grain, 15 * grain],
      corners: [[x * grain, y * grain] for x in [-88, -67, -46] for y in [34, 52]],
    },
  },
  borrow: { _bonnet: 'panel_van_bonnet', _front_bumper: 'panel_van_front_bumper' },
}
