local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'jackknifed_lorry_cab.spec.libsonnet';
local rearAt(x) = local p = s.at([x, s.hubY]); [p[0], p[1], s.wheelZ];
{
  title: 'Jackknifed lorry cab',
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
  unjudged: [
    site.unjudged('chassis', 'earth', 0.063,
      'The heap_13_10 piece of jackknifed_lorry_cab_chassis runs into the cross_5 piece of jackknifed_lorry_cab_earth.'),
    site.unjudged('chassis', 'nose', 0.044,
      'The floor_9_11 piece of jackknifed_lorry_cab_chassis runs into the wing_side_near_6_0 piece of jackknifed_lorry_cab_nose.'),
    site.unjudged('chassis', 'windscreen_frame', 0.04,
      'The floor_6_8 piece of jackknifed_lorry_cab_chassis runs into the frame_3_10 piece of jackknifed_lorry_cab_windscreen_frame.'),
    site.unjudged('earth', 'bumper', 0.125,
      'The heap_6_17 piece of jackknifed_lorry_cab_earth runs into the far piece of jackknifed_lorry_cab_bumper.'),
    site.unjudged('nose', 'bumper', 0.125,
      'The end piece of jackknifed_lorry_cab_nose runs into the side_near_5_9 piece of jackknifed_lorry_cab_bumper.'),
    site.unjudged('nose', 'earth', 0.093,
      'The side_far_1_0 piece of jackknifed_lorry_cab_nose runs into the heap_11_9 piece of jackknifed_lorry_cab_earth.'),
    site.unjudged('nose', 'jammed_wheel', 0.093,
      'The tyre piece of jackknifed_lorry_cab_nose runs into the wing_side_far_4_1 piece of jackknifed_lorry_cab_jammed_wheel.'),
    site.unjudged('windscreen_frame', 'earth', 0.048,
      'The heap_14_7 piece of jackknifed_lorry_cab_windscreen_frame runs into the frame_0_7 piece of jackknifed_lorry_cab_earth.'),
  ],
}
