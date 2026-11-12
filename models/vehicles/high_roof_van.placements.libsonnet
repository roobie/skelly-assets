local site = import 'site.libsonnet';
local van = import 'van-body.libsonnet';
local s = import 'high_roof_van.spec.libsonnet';
{
  title: 'High-roof van',
  sites: van.fittings(site.kit, 'high_roof_van', s),
  unjudged: [
    site.unjudged('exhaust', 'rear_axle', 0.06,
      'The tailpipe piece of exhaust_long runs into the beam piece of beam_axle_van.'),
  ],
}
