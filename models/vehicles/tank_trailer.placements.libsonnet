local site = import 'site.libsonnet';
local s = import 'tank_trailer.spec.libsonnet';
{
  title: 'Tank trailer',
  sites: [
    site.one('chassis', 'tank_trailer_chassis'),
  ]
  + [site.one('saddle_' + i, 'tank_trailer_saddle', [s.saddles[i], 0, 0]) for i in std.range(0, std.length(s.saddles) - 1)]
  + [
    site.one('barrel', 'tank_trailer_barrel'),
    site.one('walkway', 'tank_trailer_walkway'),
    site.one('ladder', 'tank_trailer_ladder'),
    site.one('hose', 'tank_trailer_hose'),
    site.one('axle', 'trailer_axle_van', [s.axle, s.hub - 0.37, 0]),
    site.one('coupling', 'trailer_coupling', [s.tip, s.frameLow, 0]),
    site.one('resting_leg', 'trailer_leg', [s.tip - 0.42, 0, 0.17]),
  ]
  + site.pair('wheel', 'wheel_225_75r16c', [s.axle, s.hub, s.wheelZ])
  + site.pair('mudguard', 'tank_trailer_mudguard')
  + site.pair('tail_lamp', 'tail_lamp_small', [s.rear - 0.08, 0.44, 0.68]),
}
