local catalogue = import 'models/catalogue/packs.libsonnet';
local hand = import 'models/measures/hand.libsonnet';
// The worn shells are no catalogue rows, so the pack names them.
local shells = [
  'fanny_pack_worn', 'fanny_pack_worn_jacket', 'hiking_backpack_worn', 'hiking_backpack_worn_jacket',
  'school_backpack_worn', 'school_backpack_worn_jacket', 'stab_vest_worn', 'stab_vest_worn_jacket',
  'utility_vest_worn', 'utility_vest_worn_jacket', 'worn_boot_foot', 'worn_boot_shaft',
  'worn_hoodie_body', 'worn_hoodie_fore', 'worn_hoodie_upper', 'worn_jacket_body', 'worn_jacket_fore',
  'worn_jacket_upper', 'worn_sneaker_foot', 'worn_trousers_pelvis', 'worn_trousers_shin', 'worn_trousers_thigh',
  'leather_jacket_worn_body', 'leather_jacket_worn_upper', 'leather_jacket_worn_fore',
  'leather_gloves_worn_palm', 'leather_gloves_worn_thumb', 'leather_gloves_worn_' + hand.thumbTip + '',
] + ['leather_gloves_worn_' + hand.part(finger, k) for finger in hand.fingers for k in std.range(0, hand.phalanges - 1)] + [
  'combat_boots_worn_foot', 'combat_boots_worn_shaft',
  'wizard_robe_worn_body', 'wizard_robe_worn_pelvis', 'wizard_robe_worn_upper', 'wizard_robe_worn_fore',
  'wizard_robe_worn_thigh', 'wizard_robe_worn_shin',
];
catalogue.recipe('skelly.wearables') + catalogue.items(catalogue.rows(shells))
