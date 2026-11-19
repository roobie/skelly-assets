local site = import 'site.libsonnet';
local s = import 'coach.spec.libsonnet';
{
  title: 'Coach',
  sites: (import 'bus-body.libsonnet').fittings(site.kit, 'coach', s) + [
    site.one('hold_floor', 'coach_hold_floor'),
  ]
  + std.flattenArrays([
    site.pair('luggage_door_' + i, 'coach_luggage_door', [s.luggageDoors[i], 0.48, s.side])
    for i in std.range(0, std.length(s.luggageDoors) - 1)
  ])
  + [site.one('roof_vent_' + i, 'roof_vent', [[2.0, -2.5][i], s.roof, 0]) for i in [0, 1]]
  + site.pair('parcel_rack', 'coach_parcel_rack', [-0.65, 2.78, 0.98]),
}
