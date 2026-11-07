// The mod's item rows (thing tool) and GAT's gun roster (gun tool), one array; tools/build.mjs picks the tool by
// each row's kind. The gun rows' sources stay relative to tools/, where GAT's loader resolves them.
local voxel = import 'tools/jsonnet/lib/voxel-grains.libsonnet';
local owned = std.set([
  'ammo_can', 'cartridge_box_308_h_winchester', 'cartridge_box_357_h_magnum', 'cartridge_box_5_d_56x45',
  'cartridge_box_7_d_62x39', 'scrap_foregrip', 'shotshell_box', 'taped_flashlight_mount', 'weapon_sling',
  'weapon_sling_worn', 'weapon_sling_worn_jacket',
]);
local items = [
  {
    id: row.id,
    kind: 'item',
    source: row.id,
    voxel: voxel.of(voxel.item, row),
    options: { mass: row.exportMass },
  }
  for row in (import 'packages/thing-authoring-tool/items.jsonnet').items
  if std.setMember(row.id, owned)
];
items + (import 'packages/gun-authoring-tool/exports/deadvox.jsonnet')
