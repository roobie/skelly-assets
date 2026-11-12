local site = import 'site.libsonnet';
local s = import 'box_truck.spec.libsonnet';
{
  title: 'Box truck',
  sites: (import 'truck-cab.libsonnet').fittings(site.kit, 'box_truck', s) + [
    site.one('box_floor', 'box_truck_box_floor'),
    site.one('box_front', 'box_truck_box_front'),
    site.one('box_roof', 'box_truck_box_roof'),
  ]
  + site.pair('box_side', 'box_truck_box_side')
  + site.pair('rear_door', 'box_truck_rear_door'),
}
