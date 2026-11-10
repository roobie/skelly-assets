// A light four-wheel-drive cargo truck with its cab over the engine and a wooden dropside platform: 5.8 m long, 2.3 m
// wide, 2.5 m to the cab roof, with a 3.3 m wheelbase and about 3.4 t unladen.
{
  rear: -2.9, front: 2.9, side: 1.08, face: 2.76, cabBack: 1.0, doorRear: 1.08, doorFront: 2.3,
  floor: 1.25, waist: 1.85, roof: 2.34, lean: 0.18, raisedSeat: false,
  frontAxle: 1.8, rearAxles: [-1.5], frontZ: 0.91, rearZ: 0.875, twinRear: false,
  frontAxlePart: 'light_4x4_truck_front_axle', rearAxlePart: 'light_4x4_truck_axle',
  wheel: 'light_4x4_truck_wheel', r: 0.535, wheelW: 0.31,
  railBottom: 0.82, railTop: 1.0, railZ: 0.5,
  bumperLow: 0.75, bumperTop: 0.95, lampY: 1.2,
  engine: 'engine_v8_petrol_medium', engineX: 1.2, engineY: 0.5, engineLength: 0.8,
  gearbox: 'gearbox_inline', gearboxLength: 0.62, radiator: 'radiator_van',
  batteryX: -0.55,
  paint: 'paint-green',
  chassisMass: 474, shellMass: 201,
  frontAxleMass: 330, axleMass: 250, transferCaseMass: 57, frontShaftMass: 14, wheelMass: 118,
  // Platform
  deckRear: -2.86, deckFront: 0.52, deckBottom: 1.21875, deckTop: 1.28125, deckSide: 1.12, boardTop: 1.78125,
  platformMass: 300, dropsideMass: 55, tailgateMass: 50,
  // Running gear under the platform
  transferX: -0.15, transferY: 0.38, shaftY: 0.45,
}
