local site = import 'site.libsonnet';
local s = import 'livestock_trailer.spec.libsonnet';
local axleIds = std.range(0, std.length(s.axles) - 1);
{
  title: 'Livestock trailer',
  sites: [
    site.one('chassis', 'livestock_trailer_chassis'),
    site.one('floor', 'livestock_trailer_floor'),
    site.one('headboard', 'livestock_trailer_headboard'),
    site.one('ramp', 'livestock_trailer_ramp'),
    site.one('coupling', 'trailer_coupling', [s.tip, s.frameLow, 0]),
    site.one('jockey_wheel', 'trailer_jockey_wheel', [s.tip - 0.42, 0, 0.2]),
  ]
  + site.pair('side', 'livestock_trailer_side')
  + [
    site.one('roof', 'livestock_trailer_roof'),
    site.one('top_gate', 'livestock_trailer_top_gate'),
  ]
  + [site.one('axle_' + i, 'trailer_axle_van', [s.axles[i], s.hub - 0.37, 0]) for i in axleIds]
  + std.flattenArrays([site.pair('wheel_' + i, 'wheel_185r14', [s.axles[i], s.hub, s.wheelZ]) for i in axleIds])
  + site.pair('mudguard', 'livestock_trailer_mudguard')
  + site.pair('tail_lamp', 'tail_lamp_small', [s.rear - 0.04, s.frameLow, 0.66])
  + site.pair('marker', 'marker_lamp', [s.front + 0.02, s.railLow, 0.7]),
  tags: { 'vehicle-role': ['farm'] },
  unjudged: [
    site.unjudged('chassis', 'jockey_wheel', 0.035,
      'The drawbar_near piece of livestock_trailer_chassis runs into the post piece of trailer_jockey_wheel.'),
  ],
}
