local site = import 'site.libsonnet';
local s = import 'tipper_truck.spec.libsonnet';
{
  title: 'Tipper truck',
  sites: (import 'truck-cab.libsonnet').fittings(site.kit, 'tipper_truck', s) + [
    site.one('subframe', 'tipper_truck_subframe'),
    site.one('tub_floor', 'tipper_truck_tub_floor'),
    site.one('tub_front', 'tipper_truck_tub_front'),
    site.one('tailgate', 'tipper_truck_tailgate'),
    site.one('tip_ram', 'tipper_truck_tip_ram'),
  ]
  + site.pair('tub_side', 'tipper_truck_tub_side'),
  unjudged: [
    site.unjudged('chassis', 'engine', 0.08,
      'The heavy I6\'s intake stands in the near rail.'),
  ],
}
