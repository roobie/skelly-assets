local site = import 'site.libsonnet';
local s = import 'panel_van.spec.libsonnet';
{
  title: 'Electric panel van',
  parent: 'panel_van',
  sites(base): (import 'van-body.libsonnet').electricSites(base, s),
  unjudged: [
    site.unjudged('shell', 'pack', 0.05,
      'The cab_pan piece of panel_van_shell runs into the lead piece of traction_pack_van.'),
  ],
}
