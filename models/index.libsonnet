// Every model source: each file is a list of rows. A row exports under its own id; models/export.json or a pack's recipe
// in models/recipes/ selects the ones that tools/build.mjs installs into built/<packId>/ (the rest, such as ground models,
// are built only on request).
local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
(import 'bolt-carbine.libsonnet')
+ (import 'bolt-scattergun.libsonnet')
+ (import 'bolt-plasma-caster.libsonnet')
+ (import 'trooper.libsonnet')
+ (import 'heavy-blue.libsonnet')
+ (import 'plate.libsonnet')
+ (import 'power.libsonnet')
+ (import 'vehicle-parts.libsonnet')
// Each vehicle's file tags its own rows with what that vehicle is; every row of the fleet is a vehicle part.
+ taxonomy.inherit({ category: 'vehicle-parts' }, std.flattenArrays(std.objectValues(import 'vehicles/index.libsonnet')))
