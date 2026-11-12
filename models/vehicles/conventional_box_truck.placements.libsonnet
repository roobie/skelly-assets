local site = import 'site.libsonnet';
local t = import 'truck-cab.libsonnet';
{
  title: 'Conventional box truck',
  // The box truck's box, laid behind this cab.
  sites: t.fittings(site.kit, 'conventional_box_truck', import 'conventional_box_truck.spec.libsonnet')
         + t.bodySites(site.kit, (import 'box_truck.placements.libsonnet').sites, 'box_truck', import 'box_truck.spec.libsonnet'),
}
