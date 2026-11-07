// The retained roster is separate from per-pack recipe production.
local voxel = import 'jsonnet/lib/voxel-grains.libsonnet';
local roster = (import 'models/export.json').ids;
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
