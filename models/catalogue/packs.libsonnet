// The pack each catalogue row exports into. A row goes to its category's pack, so a new set needs no recipe edits and
// a pack is one shelf a game can load whole; `placed` names the few rows a pack takes from another shelf.
local voxel = import 'tools/jsonnet/lib/voxel-grains.libsonnet';
local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local title = import 'tools/jsonnet/lib/title.libsonnet';
// Every catalogue row's head, and those of the sets, which the packs divide between them. The import is
// root-relative, so a compile's stand-in for it replaces it; see tools/sources.mjs.
local headsOf = import 'tools/jsonnet/heads.libsonnet';
local heads = import 'models/catalogue/heads.libsonnet';
local wornTaxonomy = import 'packages/thing-authoring-tool/worn-taxonomy.libsonnet';
local catalogue = headsOf.under(heads, '');
local rows = headsOf.under(heads, 'models/catalogue/sets/');
local kitRows = headsOf.under(heads, 'models/kits/');
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
// Holsters, sheaths and slings are weapon parts, but they are worn, so a game dresses a body from the same pack.
local wornIn = {
  'weapon-parts': 'skelly.wearables',
};
// Shields are armour, but a game hands them out with the melee weapons they are carried with. Fuzes arm explosives,
// not guns. A grenade or a trap is a weapon but no melee weapon, so each keeps the shelf of its own kind. A plant's
// service spares share its power shelf, rather than making a consumer load the machinery catalogue.
local placed = {
  'skelly.melee': ['kite_shield', 'tower_shield'],
  'skelly.explosives': ['delay_fuze', 'frag_grenade', 'impact_fuze'],
  'skelly.traps': ['bear_trap'],
  'skelly.electric-power': ['exciter_brush_set', 'governor_linkage', 'field_fuse', 'bearing_oiler'],
};
local placedIn = { [id]: pack for pack in std.objectFields(placed) for id in placed[pack] };
// A worn piece goes to the pack a game dresses a body from, whatever its garment's shelf, but for a sling's, which a
// game hands out with the guns it carries, and those the roster ships as packs of their own (models/export.json).
local wornPlaced = {
  'skelly.firearms': ['weapon_sling'],
};
local wornPlacedIn = { [garment]: pack for pack in std.objectFields(wornPlaced) for garment in wornPlaced[pack] };
local roster = import 'models/export.json';
local onRoster = { [id]: true for pack in std.objectFields(roster) for id in roster[pack] };
local pieces = [row.id for row in kitRows if wornTaxonomy.piece(row.id) != null && !std.objectHas(onRoster, row.id)];
local packOf(row) =
  assert std.objectHas(row, 'taxonomy') && std.objectHas(row.taxonomy, 'category') : 'catalogue row %s has no category' % row.id;
  local category = row.taxonomy.category;
  assert std.objectHas(byCategory, category) : 'no pack takes category %s (row %s)' % [category, row.id];
  local worn = std.objectHas(wornIn, category) && std.objectHas(std.get(row.taxonomy, 'tags', {}), 'slot');
  std.get(placedIn, row.id, if worn then wornIn[category] else byCategory[category]);
{
  // Each catalogue row's id and the pack that exports it.
  packs:: { [row.id]: packOf(row) for row in rows },
  // The ids of the catalogue rows that pack `packId` exports.
  ids(packId):: std.set([id for id in std.objectFields($.packs) if $.packs[id] == packId]),
  // The ids of the worn pieces of the kits that pack `packId` exports, but for those the roster ships as packs of
  // their own, so a garment a kit newly fits needs no recipe edit.
  worn(packId):: [id for id in pieces if std.get(wornPlacedIn, wornTaxonomy.piece(id).garment, 'skelly.wearables') == packId],
  // The heads of the item rows whose ids `ids` lists, in item order. Every recipe filters the whole item list, so
  // membership is a field lookup: go-jsonnet's std.setMember walks the set, and a recipe then costs rows times ids.
  // std.set drops a repeated id, which a field comprehension rejects.
  rows(ids)::
    local wanted = { [id]: true for id in std.set(ids) };
    [row for row in catalogue if std.objectHas(wanted, row.id)],
  // The item recipe rows that export `rows`, each under its own id.
  items(rows):: [
    {
      id: row.id,
      kind: 'item',
      source: row.id,
      voxel: voxel.of(voxel.item, row),
      options: { mass: row.exportMass },
    } + title.of(row) + taxonomy.of(row)
    for row in rows
  ],
  // The recipe rows of the catalogue rows that pack `packId` exports.
  recipe(packId):: $.items($.rows($.ids(packId))),
}
