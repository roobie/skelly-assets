local site = import 'site.libsonnet';
local van = import 'van-body.libsonnet';
local s = import 'high_roof_van.spec.libsonnet';
{
  title: 'High-roof van',
  overlaps: van.engineSeat,
  sites: van.fittings(site.kit, 'high_roof_van', s),
}
