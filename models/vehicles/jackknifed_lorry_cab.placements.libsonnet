local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'jackknifed_lorry_cab.spec.libsonnet';
local rearAt(x) = local p = s.at([x, s.hubY]); [p[0], p[1], s.wheelZ];
{
  sites: [
    one('chassis', 'jackknifed_lorry_cab_chassis'),
    one('near_side', 'jackknifed_lorry_cab_near_side'),
    one('far_side', 'jackknifed_lorry_cab_far_side'),
    one('back', 'jackknifed_lorry_cab_back'),
    one('roof', 'jackknifed_lorry_cab_roof'),
    one('windscreen_frame', 'jackknifed_lorry_cab_windscreen_frame'),
    one('nose', 'jackknifed_lorry_cab_nose'),
    one('earth', 'jackknifed_lorry_cab_earth'),
    one('bumper', 'jackknifed_lorry_cab_bumper'),
    one('near_door', 'jackknifed_lorry_cab_near_door'),
    one('stacks', 'jackknifed_lorry_cab_stacks'),
    one('fuel_tank', 'jackknifed_lorry_cab_fuel_tank'),
    one('seat_frames', 'jackknifed_lorry_cab_seat_frames'),
    one('dash', 'jackknifed_lorry_cab_dash'),
    one('loose_wheel', 'jackknifed_lorry_cab_loose_wheel', [-0.35, 0, 2.5]),
    one('jammed_wheel', 'jackknifed_lorry_cab_jammed_wheel', [2.15, s.wheelR + 0.01, -1.42]),
  ]
  + pair('first_axle_wheel', 'jackknifed_lorry_cab_rear_wheel', rearAt(s.rearAxles[0]))
  + pair('last_axle_wheel', 'jackknifed_lorry_cab_rear_wheel', rearAt(s.rearAxles[1])),
}
