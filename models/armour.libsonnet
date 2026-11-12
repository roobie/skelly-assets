// Taxonomy for an armour set's rows (models/TAXONOMY.md). Every piece is armour; a worn shell's slot and fit follow from
// its id (tools/packages/thing-authoring-tool/worn-taxonomy.libsonnet), and a helmet is a rigid model worn on the head.
local taxonomy = import '../tools/jsonnet/lib/taxonomy.libsonnet';
local worn = import '../tools/packages/thing-authoring-tool/worn-taxonomy.libsonnet';
local isShell(row) = std.length(std.findSubstr('_worn_', row.id)) > 0;
{
  // `setting` is a setting term, or null for a set that reads as no particular setting.
  of(setting, rows):: 
    local own = { category: 'armour', tags: { material: ['metal'] } + (if setting == null then {} else { setting: [setting] }) };
    local shells = worn.shells(own, [row for row in rows if isShell(row)]);
    local helmets = taxonomy.inherit(own, [row + { taxonomy: { tags: { slot: ['head'] } } } for row in rows if std.startsWith(row.id, 'helmet_')]);
    local others = taxonomy.inherit(own, [row for row in rows if !isShell(row) && !std.startsWith(row.id, 'helmet_')]);
    shells + helmets + others,
}
