local site = import 'site.libsonnet';
local s = import 'flatbed_truck.spec.libsonnet';
{
  title: 'Flatbed truck',
  sites: (import 'truck-cab.libsonnet').fittings(site.kit, 'flatbed_truck', s) + [
    site.one('deck', 'flatbed_truck_deck'),
    site.one('headboard', 'flatbed_truck_headboard'),
    site.one('toolbox', 'flatbed_truck_toolbox', [-0.55, 0.62, 1.0]),
  ],
  unjudged: [
    site.unjudged('dashboard', 'radiator', 0.06,
      'The lower piece of flatbed_truck_dashboard runs into the core piece of radiator_truck.'),
  ],
}
