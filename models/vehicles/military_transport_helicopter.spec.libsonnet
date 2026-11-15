// A medium twin-turbine utility helicopter on main wheels and a tail wheel: about 20 m over the rotor and tail rotor,
// 4.7 m tall, about 4.8 t empty. The mast stands at x = 0 and the tyres rest on y = 0. Metres in the vehicle frame.
{
  nose: 5.75, floor: 1.3, hub: 4.05, mastFoot: 3.42,
  windscreen: [3.3, 4.6], windscreenArc: 70,
  cockpitDoor: [2.1, 3.3], cockpitArc: 38, cockpitPane: 62, cockpitDoorOpens: 90,
  // The cabin door's head stays low enough on the flank to plug out and slide beneath the engine nacelles.
  cabinDoor: [-1.1, 1.0], cabinArc: 37, cabinPane: [46, 66], cabinPaneX: [self.cabinDoor[0] + 0.6, self.cabinDoor[1] - 0.6],
  // How far the cabin door stands out before it slides, so it rides outside the skin behind it.
  cabinDoorPlug: 0.15,
  gunWindow: [1.2, 1.9], gunWindowArc: [50, 72],
  // The full section runs on aft of the cabin for the cabin door to slide its whole length clear of the doorway. The
  // tail cone hangs off its end, so a hull whose section ends sooner is that much shorter.
  sectionEnd: -3.3,
  bulkhead: -1.6, tailEnd: self.sectionEnd - 2.8,
  rotorRadius: 8.2,
  // The tail rotor stands off the main rotor's tips rather than off the hull, so the blades of the two discs never
  // meet however short the hull is; a shorter hull gets a longer boom.
  tailRotorClearance: 1.05,
  tailRotor: { x: -($.rotorRadius + self.radius + $.tailRotorClearance), y: 3.75, z: 0.24, radius: 1.35 },
  mainGear: { x: 2.6, radius: 0.4375, width: 0.24, z: 1.45, top: 0.85, root: 0.9 },
  tailGear: { x: $.sectionEnd - 2.3, radius: 0.3, width: 0.16, top: 1.7, rake: 0.25, brace: { x: $.sectionEnd - 1.45, y: 1.35 } },
  engine: { x: -1.3, y: 3.13, z: 0.85, length: 1.6, radius: 0.34 },
  body: [
    { x: 5.75, top: 1.62, bottom: 1.2, half: 0.1, waist: 1.3 },
    { x: 5.55, top: 1.85, bottom: 0.95, half: 0.5, waist: 1.3 },
    { x: 5.1, top: 2.0, bottom: 0.78, half: 0.8, waist: 1.3 },
    { x: 4.6, top: 2.1, bottom: 0.68, half: 1.0, waist: 1.3 },
    { x: 4.1, top: 2.5, bottom: 0.62, half: 1.1, waist: 1.3 },
    { x: 3.4, top: 2.85, bottom: 0.6, half: 1.18, waist: 1.3 },
    { x: 2.6, top: 2.97, bottom: 0.6, half: 1.22, waist: 1.3 },
    { x: $.sectionEnd, top: 2.97, bottom: 0.6, half: 1.22, waist: 1.3 },
    { x: $.sectionEnd - 0.6, top: 2.9, bottom: 0.76, half: 1.1, waist: 1.5 },
    { x: $.sectionEnd - 1.7, top: 2.72, bottom: 1.42, half: 0.68, waist: 2.0 },
    { x: $.tailEnd, top: 2.62, bottom: 1.92, half: 0.36, waist: 2.25 },
  ],
  shellMass: 1755, paint: 'paint-olive', trim: 'paint-charcoal',
}
