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
  unjudged: [
    site.unjudged('dashboard', 'radiator', 0.06,
      'The lower piece of car_transporter_dashboard runs into the core piece of radiator_truck.'),
    site.unjudged('deck_posts', 'upper_deck', 0.058,
      'The post_0_near piece of car_transporter_deck_posts runs into the cross_6 piece of car_transporter_upper_deck.'),
    site.unjudged('gearbox', 'exhaust', 0.06,
      'The case piece of gearbox_heavy runs into the pipe piece of exhaust_long.'),
    site.unjudged('lower_deck', 'deck_posts', 0.058,
      'The plate piece of car_transporter_lower_deck runs into the tail_post_near piece of car_transporter_deck_posts.'),
  ],
}
