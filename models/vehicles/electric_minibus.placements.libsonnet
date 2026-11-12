local site = import 'site.libsonnet';
local s = import 'minibus.spec.libsonnet';
{
  title: 'Electric minibus',
  parent: 'minibus',
  sites(base): (import 'van-body.libsonnet').electricSites(base, s),
  unjudged: [
    site.unjudged('front_wing_near', 'charge_port', 0.06,
      'The over_arch piece of minibus_front_wing runs into the socket piece of charge_port.'),
    site.unjudged('shell', 'pack', 0.05,
      'The cab_pan piece of minibus_shell runs into the lead piece of traction_pack_van.'),
  ],
}
