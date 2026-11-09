local site = import 'site.libsonnet';
local van = import 'van-body.libsonnet';
local s = import 'panel_van.spec.libsonnet';
{
  sites: van.fittings(site.kit, 'panel_van', s),
}
