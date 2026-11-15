// The military transport helicopter without cockpit doors, about 18 m over the rotor and tail rotor: the crew come
// forward to the cockpit through the cabin. Its cabin door moves up behind the cockpit and parks aft within the cabin's
// own full section, so the hull needs no length aft of the cabin for it.
(import 'military_transport_helicopter.spec.libsonnet') + {
  cockpitDoor: null, gunWindow: null,
  cabinDoor: [0.5, 2.6],
  sectionEnd: self.bulkhead,
}
