local voxel = import 'tools/jsonnet/lib/voxel-grains.libsonnet';
local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
// Hand-held items take the gun grain, so a long thin shape keeps its taper, hook and edge.
local gunGrained = std.set(['baseball_bat', 'kabar', 'machete', 'steel_pipe', 'lame_saber', 'sun_shield']);
// The poles are long enough that the item grain keeps their shape; the kite and tower shields name their own grain.
local owned = std.setUnion(std.set(['pike_pole', 'long_pole', 'kite_shield', 'tower_shield']), gunGrained);
[
  {
    id: row.id,
    kind: 'item',
    source: row.id,
    voxel: voxel.of(if std.setMember(row.id, gunGrained) then voxel.gun else voxel.item, row),
    options: { mass: row.exportMass },
  } + taxonomy.of(row)
  for row in (import 'packages/thing-authoring-tool/items.jsonnet').items
  if std.setMember(row.id, owned)
]
