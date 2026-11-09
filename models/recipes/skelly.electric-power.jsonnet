local voxel = import 'tools/jsonnet/lib/voxel-grains.libsonnet';
local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local catalogue = import 'models/catalogue/packs.libsonnet';
local owned = std.set(['aa_battery', 'flashlight', 'headlamp', 'night_vision_goggles', 'portable_radio']);
// Hand-held items take the gun grain, so a long thin shape keeps its taper, hook and edge.
local gunGrained = std.set(['flashlight']);
taxonomy.inherit({ category: 'electrical' }, [
  {
    id: row.id,
    kind: 'item',
    source: row.id,
    voxel: voxel.of(if std.setMember(row.id, gunGrained) then voxel.gun else voxel.item, row),
    options: { mass: row.exportMass },
  } + taxonomy.of(row)
  for row in catalogue.rows(owned)
])
