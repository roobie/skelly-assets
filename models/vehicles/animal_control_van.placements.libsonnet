local site = import 'site.libsonnet';
local van = import 'van-body.libsonnet';
local s = import 'animal_control_van.spec.libsonnet';
local b = s.box;
local cages(tag, y) = std.flattenArrays([
  site.pair(tag + i, 'animal_control_van_cage', [b.columns[i], y, b.cageIn])
  for i in [0, 1, 2]
]);
{
  title: 'Animal control van',
  sites: van.fittings(site.kit, 'animal_control_van', s) + [
    site.one('roof_vent', 'roof_vent', [-1.4, b.roof, 0]),
    site.one('beacon', 'beacon_amber', [-0.3, b.roof, 0]),
  ]
  + cages('cage_low', b.floor)
  + cages('cage_high', b.floor + b.cageHeight)
  + site.pair('hatches', 'animal_control_van_hatches')
  + site.pair('rear_hatches', 'animal_control_van_rear_hatches'),
  tags: { 'vehicle-role': ['utility'] },
  unjudged: [
    site.unjudged('exhaust', 'rear_axle', 0.06,
      'The tailpipe piece of exhaust_long runs into the beam piece of beam_axle_van.'),
  ],
}
