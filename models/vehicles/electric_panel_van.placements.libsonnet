local s = import 'panel_van.spec.libsonnet';
{
  parent: 'panel_van',
  sites(base): (import 'van-body.libsonnet').electricSites(base, s),
}
