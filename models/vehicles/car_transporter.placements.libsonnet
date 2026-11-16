local site = import 'site.libsonnet';
local t = import 'truck-cab.libsonnet';
local s = t.spec(import 'car_transporter.spec.libsonnet');
{
  title: 'Car transporter',
  sites: t.fittings(site.kit, 'car_transporter', s) + [
    site.one('lower_deck', 'car_transporter_lower_deck'),
    site.one('deck_posts', 'car_transporter_deck_posts'),
    site.one('upper_deck', 'car_transporter_upper_deck'),
    site.one('head_rack', 'car_transporter_head_rack'),
    site.one('tail_slope', 'car_transporter_tail_slope'),
    site.one('side_guard', 'car_transporter_side_guard'),
  ]
  + site.pair('ramp', 'car_transporter_ramp'),
  overlaps: [
    site.overlap('deck_posts', 'upper_deck', 0.058,
      'The deck posts are let into the cross members of the upper deck.'),
    site.overlap('lower_deck', 'deck_posts', 0.058,
      'The tail posts stand in the plate of the lower deck.'),
  ],
}
