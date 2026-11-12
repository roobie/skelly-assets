// Taxonomy for an armour set's rows (models/TAXONOMY.md). Every piece is armour; a worn shell's slot and fit follow from
// its id (tools/packages/thing-authoring-tool/worn-taxonomy.libsonnet), and a helmet is a rigid model worn on the head.
local taxonomy = import '../tools/jsonnet/lib/taxonomy.libsonnet';
local worn = import '../tools/packages/thing-authoring-tool/worn-taxonomy.libsonnet';
local hand = import 'measures/hand.libsonnet';
local isShell(row) = std.length(std.findSubstr('_worn_', row.id)) > 0;
// The authored name of each piece of a garment, by the segment its id ends in (worn-taxonomy.libsonnet's `segments`).
// A glove piece names its finger and segment; the phalanx words follow hand.libsonnet's order, the knuckle one first.
local fingerNames = { index: 'index finger', middle: 'middle finger', ring: 'ring finger', little: 'little finger', thumb: 'thumb' };
local phalanxNames = ['first segment', 'second segment', 'third segment'];
local bodyPieces = { body: 'body armour', upper: 'upper arm armour', fore: 'forearm armour' };
local legPieces = { thigh: 'thigh guard', shin: 'shin guard' };
local handPieces(noun) = { palm: noun + ' palm' }
                         + { [hand.part(finger, k)]: noun + ' ' + fingerNames[finger] + ', ' + phalanxNames[k] for finger in hand.fingers for k in std.range(0, hand.phalanges - 1) }
                         + { [hand.thumbPart(k)]: noun + ' ' + fingerNames.thumb + ', ' + phalanxNames[k] for k in std.range(0, hand.thumbBones - 1) };
local footPieces(noun) = { foot: noun + ' foot', shaft: noun + ' shaft' };
// Each set's shells by garment id: the set's name and the names of its pieces.
local suitNames = { trooper: 'Trooper', power: 'Power', heavy: 'Heavy' };
local garments = std.foldl(function(all, suit) all + {
  ['armor_' + suit]: { owner: suitNames[suit], pieces: bodyPieces },
  ['legguard_' + suit]: { owner: suitNames[suit], pieces: legPieces },
  ['gloves_' + suit]: { owner: suitNames[suit], pieces: handPieces('glove') },
  ['boots_' + suit]: { owner: suitNames[suit], pieces: footPieces('boot') },
}, std.objectFields(suitNames), {}) + {
  gauntlet_plate: { owner: 'Plate', pieces: handPieces('gauntlet') },
  sabaton_plate: { owner: 'Plate', pieces: footPieces('sabaton') },
};
local segmentOf(id) = std.reverse(std.split(id, '_'))[0];
local garmentOf(id) = std.split(id, '_worn_')[0];
local titled(row) =
  if std.objectHas(row, 'title') || !isShell(row) then row
  else
    local garment = garments[garmentOf(row.id)];
    row + { title: garment.owner + ' ' + garment.pieces[segmentOf(row.id)] };
{
  // `setting` is a setting term, or null for a set that reads as no particular setting.
  of(setting, rows):: 
    local own = { category: 'armour', tags: { material: ['metal'] } + (if setting == null then {} else { setting: [setting] }) };
    local shells = worn.shells(own, [row for row in rows if isShell(row)]);
    local helmets = taxonomy.inherit(own, [row + { taxonomy: { tags: { slot: ['head'] } } } for row in rows if std.startsWith(row.id, 'helmet_')]);
    local others = taxonomy.inherit(own, [row for row in rows if !isShell(row) && !std.startsWith(row.id, 'helmet_')]);
    [titled(row) for row in shells + helmets + others],
}
