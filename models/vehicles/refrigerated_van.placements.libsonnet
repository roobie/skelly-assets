local site = import 'site.libsonnet';
local base = import 'panel_van.placements.libsonnet';
{
  title: 'Refrigerated van',
  sites: base.sites + [
    site.one('cooling_unit', 'refrigerated_van_cooling_unit'),
    site.one('lining', 'refrigerated_van_lining'),
  ],
}
