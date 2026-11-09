local voxel = import 'tools/jsonnet/lib/voxel-grains.libsonnet';
local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local catalogue = import 'models/catalogue/packs.libsonnet';
// Hand-held items take the gun grain, so a long thin shape keeps its taper, hook and edge.
local gunGrained = std.set(['baseball_bat', 'kabar', 'machete', 'steel_pipe']);
local owned = std.setUnion(catalogue.ids('skelly.melee'), gunGrained);
// Every row is a weapon unless its catalogue row names another shelf, as the shields do.
taxonomy.inherit({ category: 'weapons' }, [
  {
    id: row.id,
    kind: 'item',
    source: row.id,
    voxel: voxel.of(if std.setMember(row.id, gunGrained) then voxel.gun else voxel.item, row),
    options: { mass: row.exportMass },
  } + taxonomy.of(row)
  for row in catalogue.rows(owned)
])
