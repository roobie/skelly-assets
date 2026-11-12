local site = import 'site.libsonnet';
local van = import 'van-body.libsonnet';
local s = import 'camper_van.spec.libsonnet';
{
  title: 'Camper van',
  sites: van.fittings(site.kit, 'camper_van', s) + [
    site.one('pop_top', 'camper_van_pop_top'),
    site.one('kitchen', 'camper_van_kitchen'),
    site.one('curtains', 'camper_van_curtains'),
    site.one('rear_bench', 'bench_seat_3', [-1.72, s.floor, 0]),
  ],
  unjudged: [
    site.unjudged('exhaust', 'rear_axle', 0.063,
      'The silencer piece of exhaust_long runs into the beam piece of beam_axle_van.'),
  ],
}
