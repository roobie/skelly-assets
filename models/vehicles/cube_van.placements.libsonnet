local site = import 'site.libsonnet';
local van = import 'van-body.libsonnet';
local s = import 'cube_van.spec.libsonnet';
{
  title: 'Cube van',
  sites: van.fittings(site.kit, 'cube_van', s) + [
    site.one('peak', 'cube_van_peak'),
    site.one('stowage', 'cube_van_removal_stowage'),
  ],
}
