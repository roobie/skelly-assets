local s = import 'minibus.spec.libsonnet';
{
  title: 'Electric minibus',
  parent: 'minibus',
  sites(base): (import 'van-body.libsonnet').electricSites(base, s),
}
