// Every model source: each file is a list of rows. A row exports under its own id; models/export.json or a pack's recipe
// in models/recipes/ selects the ones that tools/build.mjs installs into built/<packId>/ (the rest, such as ground models,
// are built only on request).
(import 'bolt-carbine.libsonnet')
+ (import 'bolt-scattergun.libsonnet')
+ (import 'bolt-plasma-caster.libsonnet')
+ (import 'bolt-laser-gun.libsonnet')
+ std.flattenArrays([item.rows for set in [import 'trooper.libsonnet', import 'heavy-blue.libsonnet', import 'plate.libsonnet', import 'power.libsonnet'] for item in std.objectValues(set)])
+ (import 'vehicle-parts.libsonnet')
+ std.flattenArrays(std.objectValues(import 'catalogue/sets/index.libsonnet'))
+ std.flattenArrays([set.rows for set in std.objectValues(import 'catalogue/worn.libsonnet')])
+ std.flattenArrays(std.objectValues(import 'vehicles/index.libsonnet'))
+ (import 'worn-clothing.libsonnet')
+ (import 'worn-carry.libsonnet')
