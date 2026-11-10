// The size classes of an engine's salvageable accessories. Every engine of one general size fits the same alternator,
// starter motor, air box, fuel pump, drive belt and radiator, so a part salvaged from one fits any other of its size,
// while a truck's are bigger than a car's. A class is one entry here; `engines.libsonnet` names each engine's class.
// Metres and kilograms; `engine-kit.libsonnet` says each accessory's frame.
{
  light: {
    radiator: 'radiator_car',
    // The front-end drive in (y, z) from the crank's centre on the engine's front face: the belt runs round the crank,
    // water pump and alternator pulleys, so the class's belt fits every engine of the class.
    drive: {
      crank: { at: [0, 0], radius: 0.075 },
      pump: { at: [0.2, 0], radius: 0.05 },
      alternator: { at: [0, 0.32], radius: 0.035 },
    },
    alternator: { id: 'alternator_light', massKg: 6, radius: 0.07, length: 0.15 },
    starter: { id: 'starter_motor_light', massKg: 4, radius: 0.045, length: 0.2 },
    airBox: { id: 'air_box_light', massKg: 2, length: 0.28, height: 0.16, width: 0.2 },
    fuelPump: { id: 'fuel_pump_light', massKg: 1.5, size: 0.08 },
    driveBelt: { id: 'drive_belt_light', massKg: 0.3, width: 0.02, thickness: 0.012 },
  },
  // A light truck's or a big off-roader's: bigger than a car's, smaller than a heavy truck's.
  medium: {
    radiator: 'radiator_van',
    drive: {
      crank: { at: [0, 0], radius: 0.09 },
      pump: { at: [0.24, 0], radius: 0.06 },
      alternator: { at: [0, 0.4], radius: 0.045 },
    },
    alternator: { id: 'alternator_medium', massKg: 8, radius: 0.085, length: 0.18 },
    starter: { id: 'starter_motor_medium', massKg: 10, radius: 0.06, length: 0.26 },
    airBox: { id: 'air_box_medium', massKg: 4, length: 0.36, height: 0.2, width: 0.26 },
    fuelPump: { id: 'fuel_pump_medium', massKg: 2, size: 0.1 },
    driveBelt: { id: 'drive_belt_medium', massKg: 0.4, width: 0.025, thickness: 0.014 },
  },
  // A heavy truck's or an armoured vehicle's: a V8 diesel of 12 litres or more.
  heavy: {
    radiator: 'radiator_truck',
    drive: {
      crank: { at: [0, 0], radius: 0.12 },
      pump: { at: [0.32, 0], radius: 0.08 },
      alternator: { at: [0, 0.62], radius: 0.06 },
    },
    alternator: { id: 'alternator_heavy', massKg: 14, radius: 0.1, length: 0.24 },
    starter: { id: 'starter_motor_heavy', massKg: 18, radius: 0.075, length: 0.34 },
    airBox: { id: 'air_box_heavy', massKg: 8, length: 0.5, height: 0.28, width: 0.2 },
    fuelPump: { id: 'fuel_pump_heavy', massKg: 4, size: 0.14 },
    driveBelt: { id: 'drive_belt_heavy', massKg: 0.8, width: 0.03, thickness: 0.016 },
  },
}
