// The generic holders solid contents are found in. A holder is drawn the same whatever it holds, so one model serves
// every content of a form; its `label` slot is its one paintable slot, which a game repaints in its contents' label
// finish, and its authored label finish is the blank label of an empty one.
local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local box = h.box;
local turned = h.turned;
local disc = h.disc;
local labelled = { parts: [part + { paintable: ['label'] } for part in super.parts] };
local shelf(materials) = { voxelGrain: 0.002, taxonomy: { category: 'containers', tags: { material: materials, setting: ['modern'] } } };
[
  // A pharmacy prescription bottle, 50 mm across and 104 mm tall, amber with a paper label and a wide white ribbed
  // push-and-turn cap.
  h.compound('pill_bottle', 0.015, [
    turned('bottle', 'bottle', 'y', [[0, 0], [0, 0.022], [0.002, 0.024], [0.086, 0.024], [0.086, 0]]),
    turned('label', 'label', 'y', [[0, 0], [0, 0.0244], [0.05, 0.0244], [0.05, 0]], [0, 0.016, 0]),
    turned('cap', 'cap', 'y', [[0, 0], [0, 0.026], [0.016, 0.026], [0.018, 0.024], [0.018, 0]], [0, 0.086, 0]),
  ] + [
    box('grip-%d' % i, 'cap', [0.0255 * std.cos(i * std.pi / 6) - 0.0015, 0.088, 0.0255 * std.sin(i * std.pi / 6) - 0.0015], [0.0255 * std.cos(i * std.pi / 6) + 0.0015, 0.102, 0.0255 * std.sin(i * std.pi / 6) + 0.0015])
    for i in std.range(0, 11)
  ], { bottle: 'plastic-amber', label: 'paper-white', cap: 'plastic-white' }) + labelled + { title: 'Pill bottle' }
  + h.inHand('pill_bottle', 'bottle') + shelf(['plastic']),

  // A small corked glass vial, 17 mm across and 48 mm tall with its cork, a paper label band round its middle.
  h.compound('glass_vial', 0.006, [
    turned('glass', 'glass', 'y', [[0, 0], [0, 0.008], [0.036, 0.008], [0.038, 0.0072], [0.039, 0.0085], [0.041, 0.0085], [0.041, 0]]),
    turned('label', 'label', 'y', [[0, 0], [0, 0.0084], [0.02, 0.0084], [0.02, 0]], [0, 0.008, 0]),
    turned('cork', 'cork', 'y', [[0, 0], [0, 0.0062], [0.006, 0.0066], [0.011, 0.0072], [0.011, 0]], [0, 0.037, 0]),
  ], { glass: 'glass-clear', label: 'paper-white', cork: 'cork' }) + labelled + { title: 'Glass vial' }
  + h.inHand('glass_vial', 'glass') + shelf(['glass']),

  // A blister card of ten empty bubbles, 100 mm by 45 mm and 6 mm thick at the bubbles, lying flat, with its printed
  // band at -x. The bubbles are boxes because round ones break into crosses at the 2 mm grain.
  h.compound('blister_card', 0.004, [
    box('card', 'foil', [-0.05, 0, -0.0225], [0.05, 0.002, 0.0225]),
    box('label', 'label', [-0.05, 0.002, -0.0225], [-0.038, 0.0025, 0.0225]),
  ] + [
    box('bubble-%d-%d' % [i, j], 'bubble', [-0.033 + i * 0.0168, 0.002, [-0.016, 0.004][j]], [-0.023 + i * 0.0168, 0.006, [-0.004, 0.016][j]])
    for i in std.range(0, 4)
    for j in std.range(0, 1)
  ], { foil: 'alu-bare', label: 'paper-white', bubble: 'plastic-clear' }) + labelled + { title: 'Blister card' }
  + h.inHand('blister_card', 'card') + shelf(['metal', 'plastic']),

  // A round tin, 68 mm across and 22 mm tall, with a paper label on its lid.
  h.compound('small_tin', 0.03, [
    disc('body', 'body', 0.033, 0, 0.016),
    disc('lid', 'lid', 0.034, 0.014, 0.022),
    disc('label', 'label', 0.024, 0.022, 0.024),
  ], { body: 'steel-grey', lid: 'steel-stainless', label: 'paper-white' }) + labelled + { title: 'Small tin' }
  + h.inHand('small_tin', 'body') + shelf(['metal']),

  // A kraft paper sack, 100 by 60 mm and 155 mm tall, its top rolled down across the top edge and a printed band
  // round the middle.
  h.compound('paper_sack', 0.05, [
    box('sack', 'paper', [-0.05, 0, -0.03], [0.05, 0.12, 0.03]),
    h.prism('shoulder', 'paper', 'x', [[0.12, -0.03], [0.12, 0.03], [0.135, 0.012], [0.135, -0.012]], -0.05, 0.05),
    turned('roll', 'roll', 'x', [[0, 0], [0, 0.012], [0.102, 0.012], [0.102, 0]], [-0.051, 0.143, 0]),
    box('label', 'label', [-0.0505, 0.045, -0.0305], [0.0505, 0.085, 0.0305]),
  ], { paper: 'paper-butcher', roll: 'paperboard-tan', label: 'paper-white' }) + labelled + { title: 'Paper sack' }
  + shelf(['paper']),

  // A small clear zip bag, 50 by 70 mm and lying flat, with its zip at -z and a white write-on panel below it.
  h.compound('zip_bag', 0.001, [
    box('bag', 'bag', [-0.025, 0, -0.035], [0.025, 0.002, 0.035]),
    box('zip', 'zip', [-0.025, 0, -0.035], [0.025, 0.003, -0.03]),
    box('label', 'label', [-0.02, 0.002, -0.027], [0.02, 0.0025, -0.012]),
  ], { bag: 'plastic-bag', zip: 'plastic-red', label: 'paper-white' }) + labelled + { title: 'Zip bag' }
  + h.inHand('zip_bag', 'bag') + shelf(['plastic']),
]
