local site = import 'site.libsonnet';
local t = import 'truck-cab.libsonnet';
local wheelKit = import 'wheel-kit.libsonnet';
local s = t.spec(import 'mobile_crane.spec.libsonnet');
{
  title: 'Mobile crane',
  sites: t.fittings(site.kit, 'mobile_crane', s) + [
    site.one('front_axle_2', wheelKit.axle(s.frontAxlePart, s.wheelBrakes), [s.secondAxle, s.frontAxleY, 0]),
    site.one('deck', 'mobile_crane_deck'),
    site.one('lockers', 'mobile_crane_lockers'),
    site.one('slew_ring', 'mobile_crane_slew_ring'),
    site.one('turret', 'mobile_crane_turret'),
    site.one('counterweight', 'mobile_crane_counterweight'),
    site.one('power_cowl', 'mobile_crane_power_cowl'),
    site.one('operator_cab', 'mobile_crane_operator_cab'),
    site.one('operator_glass', 'mobile_crane_operator_glass'),
    site.one('winch', 'mobile_crane_winch'),
    site.one('boom_base', 'mobile_crane_boom_base'),
    site.one('boom_stage_1', 'mobile_crane_boom_stage_1'),
    site.one('boom_stage_2', 'mobile_crane_boom_stage_2'),
    site.one('boom_stage_3', 'mobile_crane_boom_stage_3'),
    site.one('derrick_ram', 'mobile_crane_derrick_ram'),
    site.one('boom_rest', 'mobile_crane_boom_rest'),
    site.one('hook_block', 'mobile_crane_hook_block'),
  ]
  + wheelKit.pair(site.kit, 'second_front_wheel', s.wheel, [s.secondAxle, s.r, s.frontZ], s.wheelBrakes)
  + site.pair('front_outrigger', 'mobile_crane_outrigger', [s.frontRiggerX, 0, 0])
  + site.pair('rear_outrigger', 'mobile_crane_outrigger', [s.rearRiggerX, 0, 0])
  + site.pair('cab_beacon', 'beacon_amber', [s.face - s.lean - 0.6, s.roof + 0.15, 0.9]),
  tags: { 'vehicle-role': ['construction'] },
  overlaps: [
    site.overlap('counterweight', 'winch', 0.06,
      'The winch sits on the front edge of the counterweight, and the lower coils of its rope sink into the top plate.'),
    site.overlap('deck', 'front_outrigger_far', 0.125,
      'The outrigger beam slides inside the deck runner that houses it.'),
    site.overlap('deck', 'front_outrigger_near', 0.125,
      'The outrigger beam slides inside the deck runner that houses it.'),
    site.overlap('deck', 'rear_outrigger_far', 0.125,
      'The outrigger beam slides inside the deck runner that houses it.'),
    site.overlap('deck', 'rear_outrigger_near', 0.125,
      'The outrigger beam slides inside the deck runner that houses it.'),
  ],
  unjudged: [
    site.unjudged('dashboard', 'radiator', 0.06,
      'The lower piece of mobile_crane_dashboard runs into the core piece of radiator_truck.'),
    site.unjudged('gearbox', 'exhaust', 0.06,
      'The case piece of gearbox_heavy runs into the pipe piece of exhaust_long.'),
    site.unjudged('gearbox', 'front_axle_2', 0.052,
      'The case piece of gearbox_heavy runs into the beam piece of steered_axle_heavy_bare.'),
  ],
}
