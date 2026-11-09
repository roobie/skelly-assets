// The trooper armour set: fitted worn shells (template and measures in tools/packages) with a ground model each, in an
// olive field livery.
local armour = import 'armour.libsonnet';
local fit = import '../tools/packages/thing-authoring-tool/worn-fit.libsonnet';
local h = import '../tools/packages/thing-authoring-tool/compound.libsonnet';
// Olive paint over parkerized fittings, brass rivets and a yellow chevron and edging.
local livery = { plate: 'paint-olive', trim: 'steel-parkerized', strap: 'webbing-olive-dark', rivet: 'brass', insignia: 'paint-crane-yellow' };
local gauntlet = livery + { hand: 'leather-black' };
local trooperBoot = { upper: 'leather-black', toe: 'paint-olive', sole: 'rubber-tread', collar: 'paint-crane-yellow', laces: 'webbing-olive-dark' };
// A worn template's own ground shells as the item's ground model.
local suit(id, massKg, worn) = worn + { rows: [h.compound(id, massKg, worn.ground, worn.rows[0].parts[0].finish) + { voxelGrain: 0.004 }] + worn.rows };
// The trooper helm, base at the neck and face towards +z, the wearer's front: a flared neck guard, a deep shell under
// a domed crown with a yellow crest, an amber visor slit under a brow bar, a wedge faceplate with grille slats and a
// filter canister on the left cheek.
local helmet = [
  h.box('skirt', 'trim', [-0.135, 0, -0.15], [0.135, 0.035, 0.15]),
  h.box('shell', 'plate', [-0.12, 0.03, -0.135], [0.12, 0.27, 0.135]),
  h.box('cap', 'plate', [-0.11, 0.265, -0.125], [0.11, 0.285, 0.125]),
  h.dome('crown', 'plate', 0.11, 0.06, 0.012, 'y', [0, 0.28, 0]),
  h.box('crest', 'insignia', [-0.012, 0.28, -0.125], [0.012, 0.35, 0.125]),
  h.box('brow', 'trim', [-0.125, 0.19, 0.12], [0.125, 0.215, 0.152]),
  h.box('visor', 'lens', [-0.095, 0.155, 0.125], [0.095, 0.19, 0.142]),
  h.prism('faceplate', 'plate', 'x', [[0.04, 0.13], [0.155, 0.13], [0.135, 0.168], [0.06, 0.174]], -0.065, 0.065),
] + [
  h.box('grille-%d' % i, 'grille', [-0.045, 0.07 + i * 0.02, 0.165], [0.045, 0.08 + i * 0.02, 0.181])
  for i in [0, 1, 2]
] + [
  h.box('bolt-%d' % i, 'rivet', [[-0.13, 0.12][i], 0.12, 0.02], [[-0.12, 0.13][i], 0.14, 0.04])
  for i in [0, 1]
] + [
  h.rod('filter', 'trim', 0.026, 0.115, 0.165, 0.08) + { origin: [-0.165, 0.08, 0.07] },
];
local set = {
  armor_trooper: suit('armor_trooper', 16.0, fit.trooper('armor_trooper', livery)),
  helmet_trooper: fit.head('helmet_trooper', -0.1) + {
    rows: [h.compound('helmet_trooper', 2.8, helmet, livery + { lens: 'glass-lens-amber', grille: 'rubber-black' }) + { voxelGrain: 0.004 }],
  },
  gloves_trooper: suit('gloves_trooper', 1.2, fit.hands('gloves_trooper', gauntlet, {
    layer: 'normal', cuff: 0.13, flare: 0.03, hem: 0.016, backRidges: 4,
    slots: { hand: 'hand', cuff: 'plate', hem: 'insignia', ridge: 'rivet' },
  })),
  boots_trooper: suit('boots_trooper', 2.6, fit.feet('boots_trooper', trooperBoot,
                                                    { l: 0.32, w: 0.125, s: 0.035, toe: 0.07, instep: 0.095, top: 0.27, shaft: 0.135, laces: 0 })),
  legguard_trooper: suit('legguard_trooper', 6.5, fit.trooperLegs('legguard_trooper', livery)),
};
armour.of(null, std.flattenArrays([set[k].rows for k in std.objectFields(set)]))
