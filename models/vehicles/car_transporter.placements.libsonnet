local site = import 'site.libsonnet';
local t = import 'truck-cab.libsonnet';
local s = t.spec(import 'car_transporter.spec.libsonnet');
{
  sites: t.fittings(site.kit, 'car_transporter', s) + [
    site.one('lower_deck', 'car_transporter_lower_deck'),
    site.one('deck_posts', 'car_transporter_deck_posts'),
    site.one('upper_deck', 'car_transporter_upper_deck'),
    site.one('head_rack', 'car_transporter_head_rack'),
    site.one('tail_slope', 'car_transporter_tail_slope'),
    site.one('side_guard', 'car_transporter_side_guard'),
  ]
  + site.pair('ramp', 'car_transporter_ramp'),
}
