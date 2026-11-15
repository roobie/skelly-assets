// An eight-wheeled armoured personnel carrier: 7 m long, 2.75 m across the wheels and the side plates. Metres in the vehicle frame.
// Its masses follow a BTR-80 without crew, fuel or ammunition, yet it weighs about 1.5 t under that 12.2 t: it is drawn
// about 15% smaller and does not model the water jet, winch, bulkhead and stiffeners, radios, filtration unit, batteries
// (it fits the shared 14 kg car battery for the real two of 72 kg), tools and spares.
{
  rear: -3.25, nose: 3.5, roof: 2.31, roofTop: 2.41, floor: 0.82, belly: 0.62, shelf: 1.19,
  side: 1.3125, sideTop: 1.24, wall: 0.94,
  axles: [2.25, 1.0625, -0.9375, -2.125],
  hub: 0.522, wheelZ: 1.15,
  turretX: 0.25, driverX: 1.55, driverZ: -0.6,
  ring: { inner: 0.6, outer: 0.85, height: 0.1 },
  platePitch: 1.156, plateFirst: -2.7,
  // How far the ramp's pins stand off the centre line.
  rampPinZ: 0.5,
  // Degrees from closed, so the lowered ramp's lip rests on the ground.
  rampOpen: 127,
  // The roof hatches' round lids, and their `open` in degrees, so a raised lid leans back past upright and stays open.
  // The squad's hatches are a pair, the near one at `squadHatch`.
  hatch: { radius: 0.3, thickness: 0.05, open: 105 },
  squadHatch: { x: -2.2, z: 0.72 },
  paint: 'paint-olive',
}
