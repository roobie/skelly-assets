local site = import 'site.libsonnet';
local t = import 'truck-cab.libsonnet';
local exhaust = import 'exhaust-kit.libsonnet';
local fuelTank = import 'fuel-tank-kit.libsonnet';
local s = t.spec(import 'semi_tractor.spec.libsonnet');
{
  // The twin stacks take the place of the cab's exhaust.
  sites: site.adjust(
    t.fittings(site.kit, 'semi_tractor', s),
    drop=['exhaust'],
    add=[
      site.one('sleeper', 'semi_tractor_sleeper'),
      site.one('fairing', 'semi_tractor_fairing'),
      site.one('fifth_wheel', 'semi_tractor_fifth_wheel'),
      site.one('catwalk', 'semi_tractor_catwalk'),
    ] + exhaust.sites('exhaust_semi_tractor', [s.sleeperBack - 0.12, 0, 1.0], s.detail, paired=true)
    + fuelTank.sites('fuel_tank_truck', [s.tankX, s.tankY, -(s.side - 0.34)], s.detail, 'fuel_tank_far'),
  ),
}
