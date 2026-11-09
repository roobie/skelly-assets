// The pack each catalogue row exports into. A row goes to its category's pack, so a new set needs no recipe edits and
// a pack is one shelf a game can load whole; `placed` names the few rows a pack takes from another shelf.
local voxel = import 'tools/jsonnet/lib/voxel-grains.libsonnet';
local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local rows = std.flattenArrays(std.objectValues(import 'sets/index.libsonnet'));
local byCategory = {
  ammunition: 'skelly.firearms',
  arcana: 'skelly.arcana',
  armour: 'skelly.wearables',
  'body-parts': 'skelly.body',
  clothing: 'skelly.wearables',
  containers: 'skelly.containers',
  documents: 'skelly.readables',
  electrical: 'skelly.electronics',
  food: 'skelly.basic-foods',
  furniture: 'skelly.furniture',
  household: 'skelly.household',
  keys: 'skelly.keys',
  lighting: 'skelly.light-sources',
  machinery: 'skelly.machinery',
  materials: 'skelly.materials',
  medical: 'skelly.medicine',
  nature: 'skelly.nature',
  recreation: 'skelly.recreation',
  structures: 'skelly.structures',
  tools: 'skelly.hand-tools',
  'vehicle-parts': 'skelly.ground-vehicles',
  'weapon-parts': 'skelly.firearms',
  weapons: 'skelly.melee',
};
// Shields are armour, but a game hands them out with the melee weapons they are carried with.
local placed = {
  'skelly.melee': ['kite_shield', 'tower_shield'],
};
local placedIn = { [id]: pack for pack in std.objectFields(placed) for id in placed[pack] };
local packOf(row) =
  assert std.objectHas(row, 'taxonomy') && std.objectHas(row.taxonomy, 'category') : 'catalogue row %s has no category' % row.id;
  assert std.objectHas(byCategory, row.taxonomy.category) : 'no pack takes category %s (row %s)' % [row.taxonomy.category, row.id];
  std.get(placedIn, row.id, byCategory[row.taxonomy.category]);
{
  // Each catalogue row's id and the pack that exports it.
  packs:: { [row.id]: packOf(row) for row in rows },
  // The ids of the catalogue rows that pack `packId` exports.
  ids(packId):: std.set([id for id in std.objectFields($.packs) if $.packs[id] == packId]),
  // The recipe rows of a pack that holds only catalogue rows.
  recipe(packId)::
    local owned = $.ids(packId);
    [
      {
        id: row.id,
        kind: 'item',
        source: row.id,
        voxel: voxel.of(voxel.item, row),
        options: { mass: row.exportMass },
      } + taxonomy.of(row)
      for row in (import 'packages/thing-authoring-tool/items.jsonnet').items
      if std.setMember(row.id, owned)
    ],
}
