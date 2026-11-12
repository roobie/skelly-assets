local site = import 'site.libsonnet';
local t = import 'truck-cab.libsonnet';
local s = t.spec(import 'bucket_truck.spec.libsonnet');
{
  title: 'Bucket truck',
  sites: t.fittings(site.kit, 'bucket_truck', s) + [
    site.one('subframe', 'bucket_truck_subframe'),
    site.one('turret', 'bucket_truck_turret'),
    site.one('lower_boom', 'bucket_truck_lower_boom'),
    site.one('hydraulics', 'bucket_truck_hydraulics'),
    site.one('cradle', 'bucket_truck_cradle'),
    site.one('knuckle', 'bucket_truck_knuckle'),
    site.one('insulated_boom', 'bucket_truck_insulated_boom'),
    site.one('basket', 'bucket_truck_basket'),
    site.one('basket_rest', 'bucket_truck_basket_rest'),
    site.one('cab_beacon', 'beacon_amber', [s.face - s.lean - 0.6, s.roof + 0.15, 0]),
    site.one('cone_a', 'bucket_truck_cone', [-0.5, s.deckTop, 0.45]),
    site.one('cone_b', 'bucket_truck_cone', [-0.1, s.deckTop, 0.45]),
  ]
  + site.pair('locker', 'bucket_truck_locker')
  + site.pair('jack', 'bucket_truck_jack'),
  tags: { 'vehicle-role': ['utility'] },
}
