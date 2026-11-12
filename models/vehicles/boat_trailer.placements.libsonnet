local site = import 'site.libsonnet';
local s = import 'boat_trailer.spec.libsonnet';
{
  title: 'Boat trailer',
  sites: [
    site.one('chassis', 'boat_trailer_chassis'),
    site.one('bunks', 'boat_trailer_bunks'),
    site.one('winch_post', 'boat_trailer_winch_post'),
    site.one('boat', 'boat_trailer_boat'),
    site.one('outboard', 'boat_trailer_outboard'),
    site.one('axle', 'trailer_axle_light', [s.axle, s.hub - 0.37, 0]),
    site.one('coupling', 'trailer_coupling', [s.tip, s.frameLow, 0]),
    site.one('jockey_wheel', 'trailer_jockey_wheel', [s.tip - 0.42, 0, 0.117]),
  ]
  + site.pair('mudguard', 'boat_trailer_mudguard')
  + site.pair('wheel', 'wheel_165_70r13', [s.axle, s.hub, s.wheelZ])
  + site.pair('tail_lamp', 'tail_lamp_small', [s.rear - 0.04, s.frameLow - 0.05, 0.46]),
  unjudged: [
    site.unjudged('chassis', 'jockey_wheel', 0.035,
      'The drawbar_near piece of boat_trailer_chassis runs into the post piece of trailer_jockey_wheel.'),
  ],
}
