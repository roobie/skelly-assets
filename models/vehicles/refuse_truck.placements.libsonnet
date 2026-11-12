local site = import 'site.libsonnet';
local t = import 'truck-cab.libsonnet';
local s = t.spec(import 'refuse_truck.spec.libsonnet');
{
  title: 'Refuse truck',
  sites: t.fittings(site.kit, 'refuse_truck', s) + [
    site.one('subframe', 'refuse_truck_subframe'),
    site.one('body', 'refuse_truck_body'),
    site.one('hopper', 'refuse_truck_hopper'),
    site.one('packer', 'refuse_truck_packer'),
    site.one('bin_lift', 'refuse_truck_bin_lift'),
    site.one('rear_step', 'refuse_truck_rear_step'),
    site.one('side_guard', 'refuse_truck_side_guard'),
    site.one('cab_beacon', 'beacon_amber', [s.face - s.lean - 0.6, s.roof + 0.15, 0]),
  ]
  + site.pair('rear_beacon', 'beacon_amber', [s.bodyRear + 0.1, s.bodyRiseRear - 0.12, 0.95])
  + site.pair('high_lamp', 'tail_lamp_tall', [s.hopperRear - 0.01, s.hopperSill + 0.05, 1.2]),
  tags: { 'vehicle-role': ['utility'] },
  unjudged: [
    site.unjudged('dashboard', 'radiator', 0.06,
      'The lower piece of refuse_truck_dashboard runs into the core piece of radiator_truck.'),
    site.unjudged('gearbox', 'exhaust', 0.06,
      'The case piece of gearbox_heavy runs into the pipe piece of exhaust_long.'),
    site.unjudged('mudguard_far', 'hopper', 0.036,
      'The guard_1_aft_far piece of refuse_truck_mudguard runs into the bowl piece of refuse_truck_hopper.'),
    site.unjudged('mudguard_near', 'hopper', 0.036,
      'The guard_1_aft piece of refuse_truck_mudguard runs into the bowl piece of refuse_truck_hopper.'),
    site.unjudged('subframe', 'hopper', 0.12,
      'The runner_near piece of refuse_truck_subframe runs into the bowl piece of refuse_truck_hopper.'),
  ],
}
