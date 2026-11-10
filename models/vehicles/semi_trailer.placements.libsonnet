local site = import 'site.libsonnet';
local wheelKit = import 'wheel-kit.libsonnet';
local s = import 'semi_trailer.spec.libsonnet';
local axleIds = std.range(0, std.length(s.axles) - 1);
{
  sites: [
    site.one('chassis', 'semi_trailer_chassis'),
    site.one('floor', 'semi_trailer_floor'),
    site.one('roof', 'semi_trailer_roof'),
    site.one('front_wall', 'semi_trailer_front_wall'),
    site.one('kingpin', 'semi_trailer_kingpin'),
    site.one('underrun', 'semi_trailer_underrun'),
  ]
  + [site.one('axle_' + i, wheelKit.axle('trailer_axle_truck', s.wheelBrakes), [s.axles[i], s.hub - 0.52, 0]) for i in axleIds]
  + site.pair('side', 'semi_trailer_side')
  + site.pair('rear_door', 'semi_trailer_rear_door')
  + site.pair('landing_leg', 'semi_trailer_landing_leg', [s.legX, 0, s.legZ])
  + site.pair('side_guard', 'semi_trailer_side_guard')
  + site.pair('mudguard', 'semi_trailer_mudguard')
  + std.flattenArrays([wheelKit.pair(site.kit, 'wheel_' + i, 'wheel_295_80r22_5', [s.axles[i], s.hub, s.wheelZ], s.wheelBrakes) for i in axleIds])
  + site.pair('tail_lamp_outer', 'tail_lamp_small', [s.rear - 0.03, 1.14, 1.0])
  + site.pair('tail_lamp_inner', 'tail_lamp_small', [s.rear - 0.03, 1.14, 0.75])
  + site.pair('roof_lamp', 'marker_lamp', [s.front + 0.03, s.roof - 0.14, 1.1])
  + std.flattenArrays([site.pair('side_lamp_' + i, 'marker_lamp', [-5.4 + 3.6 * i, 1.31, s.side + 0.06]) for i in std.range(0, 3)]),
}
