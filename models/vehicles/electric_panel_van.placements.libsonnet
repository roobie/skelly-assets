local site = import 'site.libsonnet';
local s = import 'panel_van.spec.libsonnet';
{
  title: 'Electric panel van',
  parent: 'panel_van',
  sites(base): (import 'van-body.libsonnet').electricSites(base, s),
}
