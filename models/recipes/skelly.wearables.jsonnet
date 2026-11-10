local catalogue = import 'models/catalogue/packs.libsonnet';
// The worn shells are no catalogue rows, so the pack names them.
local shells = [
  'fanny_pack_worn', 'fanny_pack_worn_jacket', 'hiking_backpack_worn', 'hiking_backpack_worn_jacket',
  'school_backpack_worn', 'school_backpack_worn_jacket', 'stab_vest_worn', 'stab_vest_worn_jacket',
  'utility_vest_worn', 'utility_vest_worn_jacket',
  'jacket_worn_body', 'jacket_worn_upper', 'jacket_worn_fore', 'hoodie_worn_body', 'hoodie_worn_upper', 'hoodie_worn_fore',
  'jeans_worn_pelvis', 'jeans_worn_thigh', 'jeans_worn_shin',
  'rubber_boots_worn_foot', 'rubber_boots_worn_shaft', 'sneakers_worn_foot',
  'leather_jacket_worn_body', 'leather_jacket_worn_upper', 'leather_jacket_worn_fore',
  'leather_gloves_worn_palm', 'leather_gloves_worn_fingers', 'leather_gloves_worn_thumb',
  'combat_boots_worn_foot', 'combat_boots_worn_shaft',
  'wizard_robe_worn_body', 'wizard_robe_worn_pelvis', 'wizard_robe_worn_upper', 'wizard_robe_worn_fore',
  'wizard_robe_worn_thigh', 'wizard_robe_worn_shin',
];
catalogue.recipe('skelly.wearables') + catalogue.items(catalogue.rows(shells))
