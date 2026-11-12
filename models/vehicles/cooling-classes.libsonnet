// The size classes of a radiator's salvageable parts. Every radiator of one general size takes the same fan and hoses,
// so one salvaged from one vehicle fits another, while a truck's are bigger than a car's. A class is one entry here;
// `radiators.libsonnet` names each radiator's class. Metres and kilograms; `cooling-kit.libsonnet` says each part's frame.
{
  light: {
    tanks: 'plastic-black',
    fan: { id: 'cooling_fan_light', title: 'Light cooling fan', massKg: 1.8, radius: 0.15, depth: 0.06, blades: 5, finish: 'plastic-black' },
    hose: { id: 'radiator_hose_light', title: 'Light radiator hose', massKg: 0.35, radius: 0.02, length: 0.3 },
  },
  medium: {
    tanks: 'plastic-black',
    fan: { id: 'cooling_fan_medium', title: 'Medium cooling fan', massKg: 2.5, radius: 0.21, depth: 0.07, blades: 6, finish: 'plastic-black' },
    hose: { id: 'radiator_hose_medium', title: 'Medium radiator hose', massKg: 0.5, radius: 0.025, length: 0.34 },
  },
  // A truck's engine stands close behind its radiator, so its hoses are short.
  heavy: {
    tanks: 'alu-bare',
    fan: { id: 'cooling_fan_heavy', title: 'Heavy cooling fan', massKg: 6, radius: 0.36, depth: 0.08, blades: 8, finish: 'paint-charcoal' },
    hose: { id: 'radiator_hose_heavy', title: 'Heavy radiator hose', massKg: 0.6, radius: 0.04, length: 0.13 },
  },
}
