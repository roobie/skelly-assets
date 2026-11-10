// The export rows for the gun roster in models/guns/roster.libsonnet. A gun and its magazine take the gun class, so a
// seated magazine matches the receiver's voxels; cartridges and attachments are items. A cartridge or attachment may
// name its own grain in its definition in place of its class's.
local voxel = import 'tools/jsonnet/lib/voxel-grains.libsonnet';
local roster = import 'models/guns/roster.libsonnet';
local looks = (import 'models/guns/tables/appearance.jsonnet').attachments;
// What a gun export is, for the model shelves (models/TAXONOMY.md): its category, and the weapon class it is or serves.
local taxonomy(category, weapon=null) = { taxonomy: { category: category } + (if weapon == null then {} else { tags: { weapon: [weapon] } }) };
local design(row) = {
  id: row.id, kind: 'design', source: 'models/guns/designs/' + row.design + '.json', voxel: voxel.gun,
} + taxonomy('weapons', row.weapon);
// A cartridge exports as its round and its case, both on the grain its definition names.
local cartridge(row) = [
  {
    id: component + '_' + row.name, kind: 'cartridge', source: 'models/guns/cartridges/' + row.source + '.json',
    voxel: voxel.of(voxel.item, row.definition), options: { component: component },
  } + taxonomy('ammunition', row.weapon)
  for component in ['round', 'case']
];
local attachment(row) = {
  id: std.strReplace(row.source, '-', '_'), kind: 'attachment', source: row.source,
  voxel: voxel.of(voxel.item, std.get(looks, row.source, {})),
} + taxonomy('weapon-parts', std.get(row, 'weapon'));
// A look for an attachment no row exports is a misspelt id, not an unused entry.
local strays = std.setDiff(std.objectFields(looks), std.set([row.source for row in roster.attachments]));
assert std.length(strays) == 0 : 'attachment looks with no export row: %s' % [strays];
// Every catalogue item exports as its loose part, on the gun class so it matches the gun it is fitted to.
local partItems = [entry for entry in (import 'models/guns/tables/catalogue.jsonnet').parts if std.objectHas(entry, 'params')];
local partWeapon(id) =
  local classes = [roster.partWeapons[token] for token in std.split(id, '_') if std.objectHas(roster.partWeapons, token)];
  if std.length(classes) == 0 then null else classes[0];
local part(item) = { id: item.id, kind: 'part', source: item.id, voxel: voxel.gun } + taxonomy('weapon-parts', partWeapon(item.id));
local magazine(row) = {
  id: row.id, kind: 'magazine', source: row.source, voxel: voxel.gun,
  options: { cartridge: 'models/guns/cartridges/' + row.calibre + '.json', appearanceProfile: row.appearanceProfile },
} + taxonomy('weapon-parts', row.weapon);
[design(row) for row in roster.designs]
+ std.flattenArrays([cartridge(row) for row in roster.cartridges])
+ [attachment(row) for row in roster.attachments]
+ [magazine(row) for row in roster.magazines]
+ [part(item) for item in partItems]
