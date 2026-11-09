local voxel = import 'tools/jsonnet/lib/voxel-grains.libsonnet';
local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local catalogue = import 'models/catalogue/packs.libsonnet';
local owned = std.setUnion(std.set(['jerry_can']), catalogue.ids('skelly.containers'));
taxonomy.inherit({ category: 'containers' }, [
  {
    id: row.id,
    kind: 'item',
    source: row.id,
    voxel: voxel.of(voxel.item, row),
    options: { mass: row.exportMass },
  } + taxonomy.of(row)
  for row in (import 'packages/thing-authoring-tool/items.jsonnet').items
  if std.setMember(row.id, owned)
])
