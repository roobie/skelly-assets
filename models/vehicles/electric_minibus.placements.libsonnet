local s = import 'minibus.spec.libsonnet';
{
  parent: 'minibus',
  sites(base): (import 'van-body.libsonnet').electricSites(base, s),
}
