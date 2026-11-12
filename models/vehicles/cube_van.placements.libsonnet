local site = import 'site.libsonnet';
local van = import 'van-body.libsonnet';
local s = import 'cube_van.spec.libsonnet';
{
  title: 'Cube van',
  sites: van.fittings(site.kit, 'cube_van', s) + [
    site.one('peak', 'cube_van_peak'),
  ],
  unjudged: [
    site.unjudged('exhaust', 'rear_axle', 0.063,
      'The silencer piece of exhaust_long runs into the beam piece of beam_axle_van.'),
  ],
}
