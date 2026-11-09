local site = import 'site.libsonnet';
local t = import 'truck-cab.libsonnet';
local s = t.spec(import 'semi_tractor.spec.libsonnet');
{
  // The stacks take the place of the cab's exhaust.
  sites: site.adjust(
    t.fittings(site.kit, 'semi_tractor', s),
    drop=['exhaust'],
    add=[
      site.one('sleeper', 'semi_tractor_sleeper'),
      site.one('fairing', 'semi_tractor_fairing'),
      site.one('fifth_wheel', 'semi_tractor_fifth_wheel'),
      site.one('stack', 'semi_tractor_stack'),
      site.one('catwalk', 'semi_tractor_catwalk'),
      site.one('fuel_tank_far', 'fuel_tank_truck', [s.tankX, s.tankY, -(s.side - 0.34)]),
    ],
  ),
}
