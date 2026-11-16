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
  overlaps: van.engineSeat,
  sites: van.fittings(site.kit, 'animal_control_van', s) + [
    site.one('roof_vent', 'roof_vent', [-1.4, b.roof, 0]),
    site.one('beacon', 'beacon_amber', [-0.3, b.roof, 0]),
  ]
  + cages('cage_low', b.floor)
  + cages('cage_high', b.floor + b.cageHeight)
  + std.flattenArrays([
    site.pair('hatch' + i, 'animal_control_van_hatch', [b.hatches.corners[i][0], b.hatches.corners[i][1], 0])
    for i in std.range(0, std.length(b.hatches.corners) - 1)
  ])
  + site.pair('rear_hatches', 'animal_control_van_rear_hatches', rides='rear_door'),
  tags: { 'vehicle-role': ['utility'] },
}
