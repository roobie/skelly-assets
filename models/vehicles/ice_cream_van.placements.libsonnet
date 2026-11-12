local site = import 'site.libsonnet';
local van = import 'van-body.libsonnet';
local s = import 'ice_cream_van.spec.libsonnet';
{
  title: 'Ice cream van',
  sites: van.fittings(site.kit, 'ice_cream_van', s) + [
    site.one('serving_hatch', 'ice_cream_van_serving_hatch'),
    site.one('roof_cone', 'ice_cream_van_roof_cone'),
    site.one('freezer', 'ice_cream_van_freezer'),
  ],
  unjudged: [
    site.unjudged('exhaust', 'rear_axle', 0.063,
      'The silencer piece of exhaust_long runs into the beam piece of beam_axle_van.'),
  ],
}
