// A generic modern Western main battle tank of 55 to 65 t, drawn to no one design: 7.7 m of hull, 3.84 m across its
// side skirts, 2.6 m to its turret roof and 0.5 m clear of the ground. Metres in the vehicle frame and kilograms; the masses
// are estimates.
{
  id: 'mbt',
  rear: -3.85, nose: 3.85, belly: 0.5, floor: 0.58, shelf: 1.22, roof: 1.65, roofTop: 1.7,
  // The lower hull's sides between the tracks, the upper hull's over them, and the skirts outside them.
  wall: 0.92, side: 1.8, skirt: 1.86,
  // The nose's tip, where the upper glacis meets the roof, and where the lower glacis meets the belly.
  noseTop: 1.0, glacisTop: 2.2, lowerGlacisX: 3.1,
  // Each plate's thickness, and how far the belly's lower edges are chamfered in.
  armour: { lowerGlacis: 0.15, upperGlacis: 0.22, lowerWall: 0.06, shelf: 0.06, upperWall: 0.08, rear: 0.08, deck: 0.02, chine: 0.15 },
  massKg: { belly: 7000, side: 3200, nose: 6000, roof: 2200 },
  track: 'mbt_track', trackZ: 1.48,
  roadArm: { massKg: 80, pivot: [-0.42, 0.15], thick: 0.17, pivotRadius: 0.11 },
  turret: 'mbt_turret', turretX: -0.3,
  ring: { massKg: 300, inner: 1.0, outer: 1.15, height: 0.05, sides: 32 },
  // The powerpack behind the turret, offset so the engine's air box clears the near wall.
  engine: 'v12_diesel_tank', engineX: -2.3, engineZ: -0.08, radiatorX: -1.15, radiatorZ: 0,
  engineDeck: { massKg: 600, x: [$.rear + 0.15, $.turretX - $.ring.outer], z: [-1.2, 1.2], louvres: 14 },
  transmission: { massKg: 2300, offset: 0, length: 0.5, width: 1.24, above: 0.43, shaft: 0.09 },
  // The driver sits on the centre line under the glacis, the main gun's ready rounds beside them on the far side.
  driverX: 1.75, driverZ: 0, hatchX: 1.65,
  ammoRack: { massKg: 600, x: [1.0, 2.1], z: [-0.86, -0.42], top: 1.45 },
  fuelTank: { massKg: 250, x: [0.3, 1.75] },
  towEye: { length: 0.1, height: 0.14, width: 0.12, z: 0.55 },
  headlamp: { x: 2.6, z: 1.45 },
  tailLamp: { y: 1.3, z: 1.6 },
  battery: { x: 0.9, z: 0.55 },
  paint: 'paint-olive',
}
