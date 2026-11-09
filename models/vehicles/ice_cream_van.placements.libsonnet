local site = import 'site.libsonnet';
local van = import 'van-body.libsonnet';
local s = import 'ice_cream_van.spec.libsonnet';
{
  sites: van.fittings(site.kit, 'ice_cream_van', s) + [
    site.one('serving_hatch', 'ice_cream_van_serving_hatch'),
    site.one('roof_cone', 'ice_cream_van_roof_cone'),
    site.one('freezer', 'ice_cream_van_freezer'),
  ],
}
