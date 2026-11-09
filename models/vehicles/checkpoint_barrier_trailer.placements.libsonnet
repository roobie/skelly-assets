local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'checkpoint_barrier_trailer.spec.libsonnet';
local id = 'checkpoint_barrier_trailer';
{
  sites: [
    one('chassis', id + '_chassis'),
    one('floor', id + '_floor'),
    one('headboard', id + '_headboard'),
    one('tailgate', id + '_tailgate'),
    one('axle', 'trailer_axle_light', [s.axle, s.hub - 0.37, 0]),
    one('coupling', 'trailer_coupling', [s.tip - 0.03, s.frameLow, 0]),
    one('resting_leg', 'trailer_leg', [s.tip - 0.42, 0, 0.17]),
    one('straps', id + '_straps'),
  ]
  + [one('barrier_' + i, id + '_barrier', [0, s.deck, s.barrierZ[i]]) for i in std.range(0, std.length(s.barrierZ) - 1)]
  + pair('side', id + '_side')
  + pair('mudguard', id + '_mudguard')
  + pair('wheel', 'wheel_165_70r13', [s.axle, s.hub, s.wheelZ])
  + pair('tail_lamp', 'tail_lamp_small', [s.rear - 0.03, s.frameLow - 0.05, 0.46])
  + pair('marker', 'marker_lamp', [s.front + 0.02, s.wall + 0.3, 0.46]),
  tags: { 'vehicle-role': ['military'] },
}
