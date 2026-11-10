// Road, farm and military vehicles that drive on the ground, with the parts they share. Helicopters and wrecks are
// their own packs, so a product can carry a city's traffic without its aircraft or its ruins.
local packs = import 'models/vehicles/packs.libsonnet';
local vehicleParts = { [id]: true for id in std.set([part.id for part in import 'models/vehicle-parts.libsonnet'] + packs.parts('skelly.ground-vehicles')) };
// Loose spare parts from the catalogue: belts, filters and plugs a player carries, not fitted to a vehicle.
local catalogue = import 'models/catalogue/packs.libsonnet';
local spares = catalogue.ids('skelly.ground-vehicles');
// A spare is an ordinary item; a catalogue row may name its own grain in place of its class's.
local voxel = import 'tools/jsonnet/lib/voxel-grains.libsonnet';
local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
[
  if std.objectHas(vehicleParts, row.id) then packs.partRecipe(row)
  else { id: row.id, kind: 'item', source: row.id, voxel: voxel.of(voxel.item, row), options: { mass: row.exportMass } } + taxonomy.of(row)
  for row in catalogue.rows(std.objectFields(vehicleParts) + spares)
]
