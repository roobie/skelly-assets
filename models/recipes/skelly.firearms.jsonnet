// The mod's item rows (thing tool) and GAT's gun roster (gun tool), one array; tools/build.mjs picks the tool by
// each row's kind. The gun rows' sources stay relative to tools/, where GAT's loader resolves them.
local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local catalogue = import 'models/catalogue/packs.libsonnet';
// The worn sling shells are no catalogue rows, so the pack names them.
local shells = ['weapon_sling_worn', 'weapon_sling_worn_jacket'];
local items = catalogue.recipe('skelly.firearms') + catalogue.items(catalogue.rows(shells));
// The whole pack is modern firearms; each row names its own shelf and weapon class.
taxonomy.inherit({ tags: { setting: ['modern'] } }, items + (import 'packages/gun-authoring-tool/exports/deadvox.jsonnet'))
