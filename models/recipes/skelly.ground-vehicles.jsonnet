// Road, farm and military vehicles that drive on the ground, with the parts they share. Helicopters and wrecks are
// their own packs, so a product can carry a city's traffic without its aircraft or its ruins.
local fleet = import 'models/vehicles/index.libsonnet';
local vehicles = ['crew_pickup', 'saloon', 'shared', 'taxi'];
// Vehicle parts carry baked collision because a fitting places it on the vehicle.
local vehicleParts = { [part.id]: true for part in (import 'models/vehicle-parts.libsonnet') + std.flattenArrays([fleet[vehicle] for vehicle in vehicles]) };
local jacks = std.set(['bottle_jack', 'engine_hoist', 'scissor_jack']);
// Loose spare parts from the catalogue: belts, filters and plugs a player carries, not fitted to a vehicle.
local catalogue = import 'models/catalogue/packs.libsonnet';
local spares = catalogue.ids('skelly.ground-vehicles');
// A vehicle part takes the vehicle class, so it matches the vehicle it sits on; a jack is an ordinary item.
// A catalogue row may name its own grain in place of its class's.
local voxel = import 'tools/jsonnet/lib/voxel-grains.libsonnet';
local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
[
  {
    id: row.id,
    kind: 'item',
    source: row.id,
    voxel: voxel.of(if std.objectHas(vehicleParts, row.id) then voxel.vehicle else voxel.item, row),
    options: { mass: row.exportMass }
             + (if std.objectHas(vehicleParts, row.id) then { collision: true } else {}),
  } + taxonomy.of(row)
  for row in catalogue.rows(std.objectFields(vehicleParts) + jacks + spares)
]
