local site = import 'site.libsonnet';
local s = import 'flatbed_truck.spec.libsonnet';
{
  sites: (import 'truck-cab.libsonnet').fittings(site.kit, 'flatbed_truck', s) + [
    site.one('deck', 'flatbed_truck_deck'),
    site.one('headboard', 'flatbed_truck_headboard'),
    site.one('toolbox', 'flatbed_truck_toolbox', [-0.55, 0.62, 1.0]),
  ],
}
