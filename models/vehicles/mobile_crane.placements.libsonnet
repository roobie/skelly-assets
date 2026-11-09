local site = import 'site.libsonnet';
local t = import 'truck-cab.libsonnet';
local s = t.spec(import 'mobile_crane.spec.libsonnet');
{
  sites: t.fittings(site.kit, 'mobile_crane', s) + [
    site.one('front_axle_2', s.frontAxlePart, [s.secondAxle, s.frontAxleY, 0]),
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
  + site.pair('second_front_wheel', s.wheel, [s.secondAxle, s.r, s.frontZ])
  + site.pair('front_outrigger', 'mobile_crane_outrigger', [s.frontRiggerX, 0, 0])
  + site.pair('rear_outrigger', 'mobile_crane_outrigger', [s.rearRiggerX, 0, 0])
  + site.pair('cab_beacon', 'beacon_amber', [s.face - s.lean - 0.6, s.roof + 0.15, 0.9]),
  tags: { 'vehicle-role': ['construction'] },
}
