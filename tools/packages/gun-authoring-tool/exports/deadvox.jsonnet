// A gun and its magazine take the gun class, so a seated magazine matches the receiver's voxels; cartridges and
// attachments are items. A cartridge or attachment may name its own grain in its definition in place of its class's.
local voxel = import '../../../jsonnet/lib/voxel-grains.libsonnet';
local attachments = (import '../src/gun/appearance.jsonnet').attachments;
// What a gun export is, for the model shelves (models/TAXONOMY.md): its category, and the weapon class it is or serves.
local taxonomy(category, weapon=null) = { taxonomy: { category: category } + (if weapon == null then {} else { tags: { weapon: [weapon] } }) };
local design(id, source, weapon) = {
  id: id, kind: 'design', source: 'packages/gun-authoring-tool/designs/' + source + '.json', voxel: voxel.gun,
} + taxonomy('weapons', weapon);
// A cartridge exports as its round and its case, both on the grain its definition names.
local cartridge(name, source, weapon, definition) = [
  {
    id: component + '_' + name, kind: 'cartridge', source: 'packages/gun-authoring-tool/cartridges/' + source + '.json',
    voxel: voxel.of(voxel.item, definition), options: { component: component },
  } + taxonomy('ammunition', weapon)
  for component in ['round', 'case']
];
local attachment(source) = {
  id: std.strReplace(source, '-', '_'), kind: 'attachment', source: source,
  voxel: voxel.of(voxel.item, std.get(attachments, source, {})),
} + taxonomy('weapon-parts', if source == 'ak-slant-compensator' then 'rifle' else null);
local attachmentSources = [
  'ak-slant-compensator',
  'foregrip',
  'improvised-suppressor',
  'optic-digital-thermal',
  'optic-fixed-prism-4x',
  'optic-high-mag-5-25x',
  'optic-holographic',
  'optic-hunting-3-9x',
  'optic-lpvo-1-6x',
  'optic-mini-reflex',
  'optic-tube-dot',
  'rail-front-sight',
  'real-suppressor',
  'tactical-flashlight-mount',
];
// A look for an attachment no row exports is a misspelt id, not an unused entry.
local strays = std.setDiff(std.objectFields(attachments), std.set(attachmentSources));
assert std.length(strays) == 0 : 'attachment looks with no export row: %s' % [strays];
// Every catalogue item exports as its loose part, on the gun class so it matches the gun it is fitted to.
local partItems = [entry for entry in (import '../src/gun/catalogue.jsonnet').parts if std.objectHas(entry, 'params')];
// A part named for its action or frame belongs to that weapon class; a part fitted to any gun names none.
local classByToken = { ak: 'rifle', ar: 'rifle', sporter: 'rifle', pump: 'shotgun', pistol: 'handgun', revolver: 'handgun' };
local partWeapon(id) =
  local classes = [classByToken[token] for token in std.split(id, '_') if std.objectHas(classByToken, token)];
  if std.length(classes) == 0 then null else classes[0];
local part(item) = { id: item.id, kind: 'part', source: item.id, voxel: voxel.gun } + taxonomy('weapon-parts', partWeapon(item.id));
local magazine(id, source, calibre, appearanceProfile, weapon) = {
  id: id, kind: 'magazine', source: source, voxel: voxel.gun,
  options: { cartridge: 'packages/gun-authoring-tool/cartridges/' + calibre + '.json', appearanceProfile: appearanceProfile },
} + taxonomy('weapon-parts', weapon);
[
  design('rifle_assault', 'archetype-ar', 'rifle'),
  design('rifle_ak', 'archetype-ak-akm', 'rifle'),
  design('shotgun_pump', 'archetype-pump-shotgun', 'shotgun'),
  design('rifle_hunting', 'hunting-rifle', 'rifle'),
  design('revolver', 'archetype-revolver', 'handgun'),
  design('pistol_service', 'service-nine', 'handgun'),
]
+ cartridge('5_d_56x45', '5.56x45', 'rifle', import '../cartridges/5.56x45.jsonnet')
+ cartridge('7_d_62x39', '7.62x39', 'rifle', import '../cartridges/7.62x39.jsonnet')
+ cartridge('12_h_gauge_h_00_h_buck', '12-gauge-00-buck', 'shotgun', import '../cartridges/12-gauge-00-buck.jsonnet')
+ cartridge('308_h_winchester', '308-winchester', 'rifle', import '../cartridges/308-winchester.jsonnet')
+ cartridge('357_h_magnum', '357-magnum', 'handgun', import '../cartridges/357-magnum.jsonnet')
+ cartridge('9x19', '9x19', 'handgun', import '../cartridges/9x19.jsonnet')
+ [attachment(source) for source in attachmentSources]
+ [
  magazine('magazine_stanag_20', 'stanag-20', '5.56x45', 'ar', 'rifle'),
  magazine('magazine_stanag_30', 'stanag-30', '5.56x45', 'ar', 'rifle'),
  magazine('magazine_akm_30', 'akm-30', '7.62x39', 'ak', 'rifle'),
  magazine('magazine_pistol_9', 'pistol-9', '9x19', 'pistol', 'handgun'),
]
+ [part(item) for item in partItems]
