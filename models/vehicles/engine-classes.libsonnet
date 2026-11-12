// The size classes of an engine's salvageable accessories. Every engine of one general size fits the same alternator,
// starter motor, air box, fuel pump, drive belt and radiator, so a part salvaged from one fits any other of its size,
// while a truck's are bigger than a car's. A class is one entry here; `engines.libsonnet` names each engine's class.
// Metres and kilograms; `engine-kit.libsonnet` says each accessory's frame.
{
  light: {
    radiator: 'radiator_car',
    // The front-end drive in (y, z) from the crank's centre on the engine's front face: the belt runs round the crank,
    // water pump and alternator pulleys, so the class's belt fits every engine of the class. An alternator is placed
    // `at` a point, or `high` above the block.
    drive: {
      crank: { at: [0, 0], radius: 0.075 },
      pump: { at: [0.2, 0], radius: 0.05 },
      alternator: { at: [0, 0.32], radius: 0.035 },
    },
    alternator: { id: 'alternator_light', title: 'Light alternator', massKg: 6, radius: 0.07, length: 0.15 },
    starter: { id: 'starter_motor_light', title: 'Light starter motor', massKg: 4, radius: 0.045, length: 0.2 },
    airBox: { id: 'air_box_light', title: 'Light air box', massKg: 2, length: 0.28, height: 0.16, width: 0.2 },
    fuelPump: { id: 'fuel_pump_light', title: 'Light fuel pump', massKg: 1.5, size: 0.08 },
    driveBelt: { id: 'drive_belt_light', title: 'Light drive belt', massKg: 0.3, width: 0.02, thickness: 0.012 },
  },
  // A light truck's or a big off-roader's: bigger than a car's, smaller than a heavy truck's.
  medium: {
    radiator: 'radiator_van',
    drive: {
      crank: { at: [0, 0], radius: 0.09 },
      pump: { at: [0.24, 0], radius: 0.06 },
      // A light truck's engine sits between frame rails and springs that reach up past the block's side, so its
      // alternator rides high, level with the block's top beside the head, where `engine-kit.libsonnet` places it.
      alternator: { high: true, radius: 0.045 },
    },
    alternator: { id: 'alternator_medium', title: 'Medium alternator', massKg: 8, radius: 0.085, length: 0.18 },
    starter: { id: 'starter_motor_medium', title: 'Medium starter motor', massKg: 10, radius: 0.06, length: 0.26 },
    airBox: { id: 'air_box_medium', title: 'Medium air box', massKg: 4, length: 0.36, height: 0.2, width: 0.26 },
    fuelPump: { id: 'fuel_pump_medium', title: 'Medium fuel pump', massKg: 2, size: 0.1 },
    driveBelt: { id: 'drive_belt_medium', title: 'Medium drive belt', massKg: 0.4, width: 0.025, thickness: 0.014 },
  },
  // A heavy truck's or an armoured vehicle's: a V8 diesel of 12 litres or more.
  heavy: {
    radiator: 'radiator_truck',
    drive: {
      crank: { at: [0, 0], radius: 0.12 },
      pump: { at: [0.32, 0], radius: 0.08 },
      alternator: { at: [0, 0.62], radius: 0.06 },
    },
    alternator: { id: 'alternator_heavy', title: 'Heavy alternator', massKg: 14, radius: 0.1, length: 0.24 },
    starter: { id: 'starter_motor_heavy', title: 'Heavy starter motor', massKg: 18, radius: 0.075, length: 0.34 },
    airBox: { id: 'air_box_heavy', title: 'Heavy air box', massKg: 8, length: 0.5, height: 0.28, width: 0.2 },
    fuelPump: { id: 'fuel_pump_heavy', title: 'Heavy fuel pump', massKg: 4, size: 0.14 },
    driveBelt: { id: 'drive_belt_heavy', title: 'Heavy drive belt', massKg: 0.8, width: 0.03, thickness: 0.016 },
  },
}
