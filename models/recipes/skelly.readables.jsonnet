local voxel = import 'jsonnet/lib/voxel-grains.libsonnet';
local taxonomy = import 'jsonnet/lib/taxonomy.libsonnet';
local rows = import 'packages/thing-authoring-tool/readables.libsonnet';
taxonomy.inherit({ category: 'documents' }, [
  {
    id: row.id,
    kind: 'item',
    source: row.id,
    voxel: voxel.of(voxel.item, row),
    options: { mass: 'inventory-atom' },
  } + taxonomy.of(row)
  for row in rows
  if row.id == 'notebook'
] + (import 'models/catalogue/packs.libsonnet').recipe('skelly.readables'))
