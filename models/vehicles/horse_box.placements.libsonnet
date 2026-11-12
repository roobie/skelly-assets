local site = import 'site.libsonnet';
local s = import 'horse_box.spec.libsonnet';
local axleIds = std.range(0, std.length(s.axles) - 1);
{
  title: 'Horse box',
  sites: [
    site.one('chassis', 'horse_box_chassis'),
    site.one('floor', 'horse_box_floor'),
    site.one('wall_door', 'horse_box_wall_door'),
    site.one('wall_plain', 'horse_box_wall_plain'),
    site.one('door', 'horse_box_door'),
    site.one('roof', 'horse_box_roof'),
    site.one('nose', 'horse_box_nose'),
    site.one('ramp', 'horse_box_ramp'),
    site.one('partition', 'horse_box_partition'),
    site.one('breast_bar', 'horse_box_breast_bar'),
    site.one('vent_near_rear', 'horse_box_vent', [s.rearVent, s.ventLow, 0]),
    site.one('vent_near_mid', 'horse_box_vent', [s.midVent, s.ventLow, 0]),
    site.one('vent_far_rear', 'horse_box_vent', [s.rearVent, s.ventLow, 0]) + { mirror: true },
    site.one('vent_far_mid', 'horse_box_vent', [s.midVent, s.ventLow, 0]) + { mirror: true },
    site.one('coupling', 'trailer_coupling', [s.tip, s.frameLow, 0]),
    site.one('jockey_wheel', 'trailer_jockey_wheel', [s.tip - 0.42, 0, 0.2]),
  ]
  + [site.one('axle_' + i, 'trailer_axle_van', [s.axles[i], s.hub - 0.37, 0]) for i in axleIds]
  + std.flattenArrays([site.pair('wheel_' + i, 'wheel_185r14', [s.axles[i], s.hub, s.wheelZ]) for i in axleIds])
  + site.pair('top_door', 'horse_box_top_door')
  + site.pair('mudguard', 'horse_box_mudguard')
  + site.pair('tail_lamp', 'tail_lamp_small', [s.rear - 0.11, s.frameLow, 0.66])
  + site.pair('marker', 'marker_lamp', [s.noseFace, s.ventLow + 0.14, 0.74]),
  tags: { 'vehicle-role': ['farm'] },
  unjudged: [
    site.unjudged('chassis', 'jockey_wheel', 0.035,
      'The drawbar_near piece of horse_box_chassis runs into the post piece of trailer_jockey_wheel.'),
  ],
}
