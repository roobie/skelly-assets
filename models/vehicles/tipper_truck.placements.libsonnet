local site = import 'site.libsonnet';
local s = import 'tipper_truck.spec.libsonnet';
{
  title: 'Tipper truck',
  sites: (import 'truck-cab.libsonnet').fittings(site.kit, 'tipper_truck', s) + [
    site.one('subframe', 'tipper_truck_subframe'),
    site.one('tub_floor', 'tipper_truck_tub_floor'),
    site.one('tub_front', 'tipper_truck_tub_front'),
    site.one('tailgate', 'tipper_truck_tailgate'),
    site.one('tip_ram', 'tipper_truck_tip_ram'),
  ]
  + site.pair('tub_side', 'tipper_truck_tub_side'),
  unjudged: [
    site.unjudged('dashboard', 'radiator', 0.06,
      'The lower piece of tipper_truck_dashboard runs into the core piece of radiator_truck.'),
    site.unjudged('gearbox', 'exhaust', 0.06,
      'The case piece of gearbox_heavy runs into the pipe piece of exhaust_long.'),
    site.unjudged('gearbox', 'tip_ram', 0.09,
      'The case piece of gearbox_heavy runs into the sleeve piece of tipper_truck_tip_ram.'),
    site.unjudged('subframe', 'tub_floor', 0.08,
      'The runner_near piece of tipper_truck_subframe runs into the sill_0 piece of tipper_truck_tub_floor.'),
  ],
}
