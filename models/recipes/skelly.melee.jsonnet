local voxel = import 'tools/jsonnet/lib/voxel-grains.libsonnet';
// Hand-held items take the gun grain, so a long thin shape keeps its taper, hook and edge.
local gunGrained = std.set(['baseball_bat', 'kabar', 'machete', 'steel_pipe', 'lame_saber', 'pike_pole', 'long_pole', 'sun_shield']);
[
  {
    id: row.id,
    kind: 'item',
    source: row.id,
    voxel: voxel.of(voxel.gun, row),
    options: { mass: row.exportMass },
  }
  for row in (import 'packages/thing-authoring-tool/items.jsonnet').items
  if std.setMember(row.id, gunGrained)
]
