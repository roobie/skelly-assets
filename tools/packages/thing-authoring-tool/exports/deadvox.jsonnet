// Every catalogue row exports under its own id, on the item voxel class unless the row names its own `voxelGrain`.
local voxel = import 'jsonnet/lib/voxel-grains.libsonnet';
[
  {
    id: row.id,
    kind: 'item',
    source: row.id,
    voxel: voxel.of(voxel.item, row),
    options: { mass: row.exportMass },
  }
  for row in (import '../items.jsonnet').items
]
