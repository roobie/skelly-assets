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
}
