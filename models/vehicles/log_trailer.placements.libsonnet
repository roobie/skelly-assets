local site = import 'site.libsonnet';
local s = import 'log_trailer.spec.libsonnet';
local bolsterIds = std.range(0, std.length(s.bolsters) - 1);
local axleIds = std.range(0, std.length(s.axles) - 1);
{
  sites: [
    site.one('chassis', 'log_trailer_chassis'),
    site.one('floor', 'log_trailer_floor'),
    site.one('headboard', 'log_trailer_headboard'),
  ]
  + [site.one('bolster_' + i, 'log_trailer_bolster', [s.bolsters[i], 0, 0]) for i in bolsterIds]
  + [site.one('axle_' + i, 'trailer_axle_truck', [s.axles[i], s.hub - 0.52, 0]) for i in axleIds]
  + std.flattenArrays([site.pair('stake_' + i, 'log_trailer_stake', [s.bolsters[i], s.deck, s.stakeZ]) for i in bolsterIds])
  + std.flattenArrays([site.pair('wheel_' + i, 'wheel_8r19_5', [s.axles[i], s.hub, s.wheelZ]) for i in axleIds])
  + site.pair('resting_leg', 'trailer_leg', [4.4, 0, 0.31])
  + site.pair('mudguard', 'log_trailer_mudguard')
  + site.pair('tail_lamp', 'tail_lamp_small', [s.rear - 0.03, s.frameLow + 0.02, 0.9]),
}
