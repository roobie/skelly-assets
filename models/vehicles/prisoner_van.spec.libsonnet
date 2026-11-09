// A prisoner transport on the long high-roof van: 5.9 m long, 2.0 m wide, 2.75 m tall, with a 3.75 m wheelbase. A high
// strip of small side windows and the rear doors' glass light the cells.
local van = import 'van-body.libsonnet';
van.cab + van.saloonFloor + {
  rear: -3.2, rearAxle: -1.98, panLow: 0.42,
  roof: 2.75, canton: 2.63, doorTop: 2.3,
  shellMass: 1500, paint: 'paint-white',
  rearGlass: true, bulkhead: false, windowSill: 1.6,
  windows: [[-2.8, -2.45], [-2.05, -1.7], [-0.9, -0.55]],
  bands: [{ finish: 'paint-drum-blue', y: [0.88, 1.03] }],
  borrow: { _bonnet: 'panel_van_bonnet', _front_bumper: 'cube_van_front_bumper', _rear_bumper: 'high_roof_van_rear_bumper', _floor: 'high_roof_van_load_floor' },
}
