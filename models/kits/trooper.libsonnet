// The trooper armour set: fitted worn shells (template and measures in tools/packages) with a ground model each, in an
// olive field livery.
local armour = import 'models/armour.libsonnet';
local fit = import 'packages/thing-authoring-tool/worn-fit.libsonnet';
local h = import 'packages/thing-authoring-tool/compound.libsonnet';
// Olive paint over parkerized fittings, brass rivets and a yellow chevron and edging.
local livery = { plate: 'paint-olive', trim: 'steel-parkerized', strap: 'webbing-olive-dark', rivet: 'brass', insignia: 'paint-crane-yellow' };
// The gauntlet's palm and fingers are a black leather glove under its cuff, as a soldier's are.
local gauntlet = livery + { hand: 'leather-black' };
local trooperBoot = { upper: 'leather-black', toe: 'paint-olive', sole: 'rubber-tread', collar: 'paint-crane-yellow', laces: 'webbing-olive-dark' };
// A worn template's own ground shells as the item's ground model.
local suit(id, title, massKg, worn) = worn + { rows: [h.compound(id, massKg, worn.ground, worn.rows[0].parts[0].finish) + { title: title, voxelGrain: 0.004 }] + worn.rows };
// The trooper helm, base at the neck and face towards +z, the wearer's front: a skirt flared out over the nape, a
// moulded shell sloping in to a chamfered crown with a low dome and a yellow crest, an amber visor slit under a peaked
// brow, a wedge faceplate with grille slats and a filter canister on the left cheek. It is seated with the visor slit
// over the eyes, and its brow anchor is the point of its shell that seat puts at the hairline. The shell is drawn round
// the head that seat puts it on (`fit.helmetBox`), and each fitting from the face of the shell it stands on, so a
// taller or deeper head carries them with it.
local slit = [0.155, 0.19];
local helmetBase = fit.eyesAt((slit[0] + slit[1]) / 2);
local shell = fit.helmetBox(helmetBase, [0.0325, 0.026, 0.006, 0.018]);
local side = shell.max[0], front = shell.max[2], back = shell.min[2], foot = shell.min[1], top = shell.max[1];
local visor = { min: [-0.07, slit[0], front - 0.015], max: [0.07, slit[1], front + 0.003] };
local helmet = [
  h.taperedBlock('skirt', 'trim', [-(side + 0.012), foot - 0.03, back - 0.03], [side + 0.012, foot + 0.005, front + 0.015], 0.05, [0.012, 0.012, 0.03], 0),
  h.taperedBlock('shell', 'plate', shell.min, shell.max, 0.03, [0.02, 0.01, 0.02], 0.042),
  h.dome('crown', 'plate', 0.06, 0.025, 0.01, 'y', [0, top - 0.005, -0.005]),
  h.prism('crest', 'insignia', 'x', [[top - 0.025, 0.105], [top + 0.03, 0.065], [top + 0.04, -0.055], [top - 0.025, -0.1]], -0.012, 0.012),
  h.prism('brow', 'trim', 'x', [[0.188, front - 0.017], [0.19, front + 0.011], [0.206, front + 0.021], [0.218, front - 0.011]], -0.075, 0.075),
  h.box('visor', 'lens', visor.min, visor.max),
  h.prism('faceplate', 'plate', 'x', [[foot + 0.01, front - 0.005], [0.155, front - 0.005], [0.135, front + 0.033], [foot + 0.03, front + 0.039]], -0.065, 0.065),
] + [
  h.box('grille-%d' % i, 'grille', [-0.045, foot + 0.04 + i * 0.02, front + 0.03], [0.045, foot + 0.05 + i * 0.02, front + 0.046])
  for i in [0, 1, 2]
] + [
  h.box('bolt-%d' % i, 'rivet', [[-(side + 0.005), side - 0.01][i], 0.12, 0.02], [[-(side - 0.01), side + 0.005][i], 0.14, 0.04])
  for i in [0, 1]
] + [
  h.rod('filter', 'trim', 0.026, -(side + 0.045), -(side - 0.005), foot + 0.05, 0.07),
];
local set = {
  armor_trooper: suit('armor_trooper', 'Trooper body armour', 16.0, fit.trooper('armor_trooper', livery, title='Trooper body armour')),
  helmet_trooper: {
    rows: [h.compound('helmet_trooper', 2.8, helmet, livery + { lens: 'glass-lens-amber', grille: 'rubber-black' }) + {
      title: 'Trooper helmet',
      voxelGrain: 0.004,
      anchors: { brow: fit.browAnchor('helmet_trooper', 'shell', shell.min, shell.max, fit.headroom(helmetBase).brow) },
    }],
  },
  gloves_trooper: suit('gloves_trooper', 'Trooper gauntlets', 1.2, fit.hands('gloves_trooper', gauntlet, {
    layer: 'normal', cuff: 0.13, flare: 0.03, hem: 0.016, backRidges: 4,
    slots: { hand: 'hand', cuff: 'plate', hem: 'insignia', ridge: 'rivet' },
  }, 'Trooper gauntlets')),
  boots_trooper: suit('boots_trooper', 'Trooper boots', 2.6, fit.feet('boots_trooper', trooperBoot,
                                                    { l: 0.32, w: 0.125, s: 0.035, toe: 0.105, instep: 0.13, top: 0.305, shaft: 0.135, laces: 0 }, { covers: ['sole'] }, title='Trooper boots')),
  legguard_trooper: suit('legguard_trooper', 'Trooper leg guards', 6.5, fit.trooperLegs('legguard_trooper', livery, title='Trooper leg guards')),
};
std.flattenArrays([armour.of(null, set[k].rows) for k in std.objectFields(set)])
