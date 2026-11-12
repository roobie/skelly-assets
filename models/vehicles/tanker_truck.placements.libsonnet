local site = import 'site.libsonnet';
local s = import 'tanker_truck.spec.libsonnet';
{
  title: 'Tanker truck',
  sites: (import 'truck-cab.libsonnet').fittings(site.kit, 'tanker_truck', s) + [
    site.one('saddle', 'tanker_truck_saddle'),
    site.one('barrel', 'tanker_truck_barrel'),
    site.one('walkway', 'tanker_truck_walkway'),
    site.one('ladder', 'tanker_truck_ladder'),
    site.one('valve_gear', 'tanker_truck_valve_gear'),
  ],
  overlaps: [
    site.overlap('barrel', 'walkway', 0.05,
      'The bearers of the walkway are let into the shell of the barrel.'),
    site.overlap('saddle', 'valve_gear', 0.066,
      'The manifold pipe of the valve gear runs through a rear cradle plate of the saddle.'),
  ],
  unjudged: [
    site.unjudged('dashboard', 'radiator', 0.06,
      'The lower piece of tanker_truck_dashboard runs into the core piece of radiator_truck.'),
    site.unjudged('gearbox', 'exhaust', 0.06,
      'The case piece of gearbox_heavy runs into the pipe piece of exhaust_long.'),
    site.unjudged('gearbox', 'saddle', 0.05,
      'The case piece of gearbox_heavy runs into the foot_2 piece of tanker_truck_saddle.'),
    site.unjudged('saddle', 'barrel', 0.185,
      'The high_2 piece of tanker_truck_saddle runs into the shell piece of tanker_truck_barrel.'),
  ],
}
