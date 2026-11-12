local site = import 'site.libsonnet';
local s = import 'car_trailer.spec.libsonnet';
local axleIds = std.range(0, std.length(s.axles) - 1);
{
  title: 'Car trailer',
  sites: [
    site.one('chassis', 'car_trailer_chassis'),
    site.one('deck', 'car_trailer_deck'),
    site.one('wheel_stop', 'car_trailer_wheel_stop'),
    site.one('headboard', 'car_trailer_headboard'),
    site.one('coupling', 'trailer_coupling', [s.tip, s.frameLow, 0]),
    site.one('jockey_wheel', 'trailer_jockey_wheel', [s.tip - 0.42, 0, 0.17]),
  ]
  + [site.one('axle_' + i, 'trailer_axle_light', [s.axles[i], s.hub - 0.37, 0]) for i in axleIds]
  + std.flattenArrays([site.pair('wheel_' + i, 'wheel_145r10', [s.axles[i], s.hub, s.wheelZ]) for i in axleIds])
  + site.pair('ramp', 'car_trailer_ramp')
  + site.pair('tail_lamp', 'tail_lamp_small', [s.rear - 0.04, s.frameLow, 0.8])
  + site.pair('marker', 'marker_lamp', [1.56, 1.2, 0.47]),
}
