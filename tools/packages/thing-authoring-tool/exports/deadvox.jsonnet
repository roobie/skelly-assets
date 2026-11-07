// The retained roster is separate from per-pack recipe production.
local voxel = import 'jsonnet/lib/voxel-grains.libsonnet';
// models/export.json maps each roster pack id to its ids.
local roster = std.flattenArrays(std.objectValues(import 'models/export.json'));
[
  {
    id: row.id,
    kind: 'item',
    source: row.id,
    voxel: voxel.of(voxel.item, row),
    options: { mass: row.exportMass },
  }
  for row in (import '../items.jsonnet').items
  if std.member(roster, row.id)
]
