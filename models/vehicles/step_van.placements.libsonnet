local site = import 'site.libsonnet';
local van = import 'van-body.libsonnet';
local s = import 'step_van.spec.libsonnet';
{
  title: 'Step van',
  sites: van.fittings(site.kit, 'step_van', s) + [
    site.one('roof_vent', 'roof_vent', [-0.9, s.roof, 0]),
    site.one('far_door_trim', 'step_van_far_door_trim'),
  ]
  + site.pair('door_step', 'door_step_walk_in', [s.bFront, 0.3, s.side]),
  unjudged: [
    site.unjudged('exhaust', 'rear_axle', 0.054,
      'The silencer piece of exhaust_long runs into the beam piece of beam_axle_van.'),
  ],
}
