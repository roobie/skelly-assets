local site = import 'site.libsonnet';
local van = import 'van-body.libsonnet';
local s = import 'prisoner_van.spec.libsonnet';
{
  title: 'Prisoner van',
  sites: van.fittings(site.kit, 'prisoner_van', s) + [
    site.one('side_bars', 'prisoner_van_side_bars'),
    site.one('cab_cage', 'prisoner_van_cab_cage'),
  ]
  + site.pair('rear_bars', 'prisoner_van_rear_bars')
  + site.pair('side_bench', 'prisoner_van_side_bench'),
  tags: { 'vehicle-role': ['emergency'] },
  unjudged: [
    site.unjudged('exhaust', 'rear_axle', 0.06,
      'The tailpipe piece of exhaust_long runs into the beam piece of beam_axle_van.'),
  ],
}
