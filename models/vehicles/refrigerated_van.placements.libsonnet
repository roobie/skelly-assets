local site = import 'site.libsonnet';
local base = import 'panel_van.placements.libsonnet';
{
  title: 'Refrigerated van',
  sites: base.sites + [
    site.one('cooling_unit', 'refrigerated_van_cooling_unit'),
    site.one('lining', 'refrigerated_van_lining'),
  ],
  unjudged: [
    site.unjudged('exhaust', 'rear_axle', 0.063,
      'The silencer piece of exhaust_long runs into the beam piece of beam_axle_van.'),
  ],
}
