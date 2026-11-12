local site = import 'site.libsonnet';
local s = import 'panel_van.spec.libsonnet';
{
  title: 'Electric panel van',
  parent: 'panel_van',
  sites(base): (import 'van-body.libsonnet').electricSites(base, s),
  unjudged: [
    site.unjudged('front_wing_near', 'charge_port', 0.06,
      'The over_arch piece of panel_van_front_wing runs into the socket piece of charge_port.'),
    site.unjudged('shell', 'pack', 0.05,
      'The cab_pan piece of panel_van_shell runs into the lead piece of traction_pack_van.'),
  ],
}
