// A Swedish Strf 9040 (CV9040) tracked infantry fighting vehicle: 6.47 m long, 3.1 m across its side skirts, 2.5 m to
// its turret roof and 0.45 m clear of the ground. Metres in the vehicle frame and kilograms; the masses are estimates.
{
  id: 'cv9040',
  rear: -3.2, nose: 3.27, belly: 0.45, floor: 0.53, shelf: 1.25, roof: 1.6, roofTop: 1.65,
  // The lower hull's sides between the tracks, the upper hull's over them, and the skirts outside them.
  wall: 0.84, side: 1.5, skirt: 1.55,
  // The nose's tip, where the upper glacis meets the roof, and where the lower glacis meets the belly.
  noseTop: 1.0, glacisTop: 1.9, lowerGlacisX: 2.55,
  // Each plate's thickness, and how far the belly's lower edges are chamfered in.
  armour: { lowerGlacis: 0.08, upperGlacis: 0.08, lowerWall: 0.05, shelf: 0.05, upperWall: 0.06, rear: 0.08, deck: 0.02, chine: 0.12 },
  massKg: { belly: 4300, side: 1000, nose: 2100, roof: 1300 },
  track: 'cv9040_track', trackZ: 1.24,
  roadArm: { massKg: 25, pivot: [-0.35, 0.12], thick: 0.14, pivotRadius: 0.1 },
  turret: 'cv9040_turret', turretX: -0.2,
  ring: { massKg: 250, inner: 0.85, outer: 1.05, height: 0.05, sides: 24 },
  // The engine beside the driver, offset so its air box clears the near wall.
  engine: 'v8_diesel_heavy', engineX: 1.1, engineZ: -0.09, radiatorX: 0.3, radiatorZ: 0.34,
  engineDeck: { massKg: 120, x: [$.turretX + $.ring.outer, 1.8], z: [0.1, 1.1], louvres: 7 },
  // The Perkins X-300-5 at the front sprockets.
  transmission: { massKg: 700, offset: -0.27, length: 0.4, width: 0.56, above: 0.31, shaft: 0.08 },
  driverX: 2.15, driverZ: -0.54, hatchX: 1.36,
  // The 40 mm ready rounds below the turret, in clips.
  ammoRack: { massKg: 350, x: [-0.3, 0.2], z: [-0.75, -0.2], top: 1.4 },
  fuelTank: { massKg: 90, x: [-2.9, -1.9] },
  towEye: { length: 0.08, height: 0.12, width: 0.1, z: 0.5 },
  headlamp: { x: 2.5, z: 1.25 },
  tailLamp: { y: 1.45, z: 1.3 },
  battery: { x: -0.75, z: 0.5 },
  paint: 'paint-olive',
}
