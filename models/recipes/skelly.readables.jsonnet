local voxel = import 'jsonnet/lib/voxel-grains.libsonnet';
local rows = import 'packages/thing-authoring-tool/readables.libsonnet';
[
  {
    id: row.id,
    kind: 'item',
    source: row.id,
    voxel: voxel.of(voxel.item, row),
    options: { mass: 'inventory-atom' },
  }
  for row in rows
  if row.id == 'notebook'
]
