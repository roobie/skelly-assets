local site = import 'site.libsonnet';
local s = import 'minibus.spec.libsonnet';
{
  title: 'Electric minibus',
  parent: 'minibus',
  sites(base): (import 'van-body.libsonnet').electricSites(base, s),
  unjudged: [
    site.unjudged('shell', 'pack', 0.05,
      'The cab_pan piece of minibus_shell runs into the lead piece of traction_pack_van.'),
  ],
}
