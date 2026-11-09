local voxel = import 'tools/jsonnet/lib/voxel-grains.libsonnet';
local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local catalogue = import 'models/catalogue/packs.libsonnet';
local owned = std.setUnion(std.set(['torch', 'candle', 'oil_lamp', 'lighter', 'matches']), catalogue.ids('skelly.light-sources'));
taxonomy.inherit({ category: 'lighting' }, [
  {
    id: row.id,
    kind: 'item',
    source: row.id,
    voxel: voxel.of(voxel.item, row),
    options: { mass: row.exportMass },
  } + taxonomy.of(row)
  for row in catalogue.rows(owned)
])
