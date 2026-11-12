local site = import 'site.libsonnet';
local van = import 'van-body.libsonnet';
local s = import 'panel_van.spec.libsonnet';
{
  title: 'Panel van',
  sites: van.fittings(site.kit, 'panel_van', s),
  unjudged: [
    site.unjudged('exhaust', 'rear_axle', 0.063,
      'The silencer piece of exhaust_long runs into the beam piece of beam_axle_van.'),
  ],
}
