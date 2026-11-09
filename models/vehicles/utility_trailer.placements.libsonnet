local site = import 'site.libsonnet';
local s = import 'utility_trailer.spec.libsonnet';
{
  sites: [
    site.one('chassis', 'utility_trailer_chassis'),
    site.one('floor', 'utility_trailer_floor'),
    site.one('headboard', 'utility_trailer_headboard'),
    site.one('tailgate', 'utility_trailer_tailgate'),
    site.one('axle', 'trailer_axle_light', [s.axle, s.hub - 0.37, 0]),
    site.one('coupling', 'trailer_coupling', [s.tip, s.frameLow, 0]),
    site.one('jockey_wheel', 'trailer_jockey_wheel', [s.tip - 0.42, 0, 0.17]),
  ]
  + site.pair('side', 'utility_trailer_side')
  + site.pair('mudguard', 'utility_trailer_mudguard')
  + site.pair('wheel', 'wheel_165_70r13', [s.axle, s.hub, s.wheelZ])
  + site.pair('tail_lamp', 'tail_lamp_small', [s.rear - 0.04, s.frameLow - 0.05, 0.46])
  + site.pair('marker', 'marker_lamp', [s.front + 0.03, s.wall - 0.1, 0.46]),
}
