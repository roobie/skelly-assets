// A 12 m low-floor city bus after a rear engine fire, about 9 t: on bare rims, so 0.23 m lower than on tyres, with the
// roof collapsed over its rear third. Metres in the vehicle frame; the rims rest on y = 0.
{
  rear: -6, front: 6, side: 1.275, sill: 0.07, floor: 0.13, floorRear: 0.59, floorStep: -1.4,
  deck: { x: -4.25, y: 0.97 },
  waist: 0.92, windowTop: 2.32, roofBase: 2.59, roof: 2.77, lean: 0.14, screenLow: 0.72,
  bayFront: 5.6, pitch: 1.35, bays: 8,
  frontAxle: 3.3, rearAxle: -2.6, hubY: 0.3, rimR: 0.3, wheelZ: 1.1, arch: 0.58,
  doors: [[4.3, 5.55], [0.2, 1.5]],
  // How far the roof has dropped along its centre at the rear wall, and the station where it starts to go.
  collapse: { depth: 1.45, from: -0.8, to: -5.6 },
  seats: [
    { x: 2.25, y: 0.13 },
    { x: 1.45, y: 0.13 },
    { x: 0.65, y: 0.13 },
    { x: -0.15, y: 0.13 },
    { x: -0.95, y: 0.13 },
    { x: -1.75, y: 0.59 },
    { x: -3.5, y: 0.59 },
  ],
  driver: { x: 4.72, y: 0.13, z: 0.72 },
  finish: {
    paint: 'paint-white',
    band: 'paint-drum-blue',
    rust: 'scrap-rusted',
    rustRed: 'rust-red',
    ash: 'iron-dull',
    soot: 'iron-cast',
    char: 'steel-spall-black',
  },
}
