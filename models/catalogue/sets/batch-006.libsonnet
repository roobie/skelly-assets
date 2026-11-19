local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local box = h.box;
local turned = h.turned;
local inHand = h.inHand;
// A cylinder standing on y from `y0` to `y1`.
local disc(id, slot, radius, y0, y1) = turned(id, slot, 'y', [[y0, 0], [y0, radius], [y1, radius], [y1, 0]]);
// A cylinder lying along x from `x0` to `x1`, its axis at height `y`.
local rod(id, slot, radius, x0, x1, y) = turned(id, slot, 'x', [[0, 0], [0, radius], [x1 - x0, radius], [x1 - x0, 0]], [x0, y, 0]);
[
  // A disposable cigarette-sized vape, 105 mm long and 9 mm across, lying along x with its tapered
  // mouthpiece at +x and the glowing tip at -x.
  h.compound('disposable_vape', 0.011, [
    rod('body', 'body', 0.0045, -0.0505, 0.028, 0.0045),
    turned('mouth', 'mouth', 'x', [[0, 0], [0, 0.0045], [0.02, 0.004], [0.0245, 0.003], [0.0245, 0]], [0.028, 0.0045, 0]),
    rod('band', 'band', 0.0047, 0.012, 0.02, 0.0045),
    rod('tip', 'tip', 0.004, -0.0525, -0.0505, 0.0045),
  ], { body: 'alu-anodized-black', mouth: 'plastic-black', band: 'steel-stainless', tip: 'plastic-clear-red' }) + { title: 'Disposable vape' } + h.gripOn('disposable_vape', 'body') + { voxelGrain: 0.002 } + { taxonomy: { category: 'medical', tags: { material: ['metal', 'plastic'], setting: ['modern'] }, keywords: ['tobacco'] } },

  // A 15 ml squeeze bottle of eye drops, 24 mm across and 84 mm tall, with its pointed dropper cap.
  h.compound('eyedrops', 0.02, [
    turned('bottle', 'bottle', 'y', [[0, 0], [0, 0.012], [0.05, 0.012], [0.056, 0.007], [0.058, 0.005], [0.058, 0]]),
    turned('label', 'label', 'y', [[0.008, 0], [0.008, 0.0123], [0.042, 0.0123], [0.042, 0]]),
    turned('cap', 'cap', 'y', [[0.056, 0], [0.056, 0.0085], [0.068, 0.008], [0.081, 0.003], [0.084, 0.0012], [0.084, 0]]),
  ], { bottle: 'plastic-white', label: 'paint-police-blue', cap: 'plastic-white' }) + { title: 'Eyedrops' } + inHand('eyedrops', 'bottle') + { voxelGrain: 0.002 } + { taxonomy: { category: 'medical', tags: { material: ['plastic'], setting: ['modern'] } } },

  // A prefilled vaccine syringe, 125 mm long with its plunger and needle cap, lying along x on the paper
  // backing of its peel pack, needle cap at +x.
  h.compound('flu_shot', 0.011, [
    box('backing', 'backing', [-0.078, 0, -0.013], [0.056, 0.001, 0.013]),
    rod('barrel', 'barrel', 0.0045, -0.03, 0.024, 0.008),
    rod('dose', 'dose', 0.0038, -0.024, 0.018, 0.008),
    rod('stopper', 'stopper', 0.0043, -0.03, -0.024, 0.008),
    box('flange', 'barrel', [-0.033, 0.006, -0.011], [-0.03, 0.01, 0.011]),
    rod('rod', 'plunger', 0.0025, -0.07, -0.03, 0.008),
    rod('thumb', 'plunger', 0.0065, -0.073, -0.07, 0.008),
    rod('hub', 'hub', 0.0032, 0.024, 0.03, 0.008),
    turned('cap', 'cap', 'x', [[0, 0], [0, 0.003], [0.022, 0.0025], [0.024, 0]], [0.03, 0.008, 0]),
  ], { backing: 'paper-white', barrel: 'glass-clear', dose: 'wax-ivory', stopper: 'rubber-black', plunger: 'plastic-white', hub: 'plastic-white', cap: 'plastic-yellow' }) + { title: 'Flu shot' } + h.gripOn('flu_shot', 'barrel') + { voxelGrain: 0.002 } + { taxonomy: { category: 'medical', tags: { material: ['glass', 'plastic'], setting: ['modern'] } } },

  // A hand-rolled cigarette, 70 mm long and 8 mm thick, lying along x with its twisted paper end at +x
  // and loose tobacco showing at the open end.
  h.compound('handrolled_cig', 0.0008, [
    turned('paper', 'paper', 'x', [[0, 0], [0, 0.0036], [0.058, 0.004], [0.064, 0.0025], [0.07, 0.001], [0.07, 0]], [-0.035, 0.004, 0]),
    rod('tobacco', 'tobacco', 0.003, -0.037, -0.035, 0.004),
  ], { paper: 'paper-white', tobacco: 'leather-brown' }) + { title: 'Hand-rolled cigarette' } + h.gripOn('handrolled_cig', 'paper') + { voxelGrain: 0.002 } + { taxonomy: { category: 'medical', tags: { material: ['paper'] }, keywords: ['tobacco'] } },

  // A 1 ml glass dosing syringe of golden cannabis oil, 85 mm long with its plunger, lying along x with
  // the luer cap at +x.
  h.compound('cannabis_oil', 0.0065, [
    rod('barrel', 'glass', 0.004, -0.025, 0.025, 0.007),
    rod('oil', 'oil', 0.0034, -0.02, 0.022, 0.007),
    box('flange', 'glass', [-0.027, 0.005, -0.008], [-0.025, 0.009, 0.008]),
    rod('rod', 'plunger', 0.002, -0.05, -0.025, 0.007),
    rod('thumb', 'plunger', 0.0055, -0.053, -0.05, 0.007),
    turned('cap', 'cap', 'x', [[0, 0], [0, 0.0035], [0.008, 0.0025], [0.008, 0]], [0.025, 0.007, 0]),
  ], { glass: 'glass-clear', oil: 'fuel-amber', plunger: 'plastic-black', cap: 'plastic-black' }) + { title: 'Cannabis oil' } + h.gripOn('cannabis_oil', 'barrel') + { voxelGrain: 0.002 } + { taxonomy: { category: 'medical', tags: { material: ['glass'], setting: ['modern'] }, keywords: ['recreational-drug'] } },

  // A 70 mm square of parchment, opened flat, with a glassy amber slab of shatter on it and a shard
  // broken off one corner.
  h.compound('cannabis_shatter', 0.0054, [
    box('paper', 'paper', [-0.035, 0, -0.035], [0.035, 0.002, 0.035]),
    box('slab', 'slab', [-0.022, 0.002, -0.018], [0.016, 0.004, 0.02]),
    box('slab-corner', 'slab', [0.016, 0.002, -0.018], [0.024, 0.004, 0.006]),
    box('shard', 'slab', [0.012, 0.002, 0.024], [0.022, 0.004, 0.03]),
  ], { paper: 'paper-white', slab: 'fuel-amber' }) + { title: 'Cannabis shatter' } + inHand('cannabis_shatter', 'paper') + { voxelGrain: 0.002 } + { taxonomy: { category: 'medical', tags: { material: ['paper'], setting: ['modern'] }, keywords: ['recreational-drug'] } },

  // A 5 ml glass concentrate jar, 38 mm across and 20 mm tall, standing open with a smear of yellow wax in
  // the bottom and its black screw lid lying beside it, 70 mm across the pair.
  h.compound('cannabis_wax', 0.026, [
    turned('jar', 'glass', 'y', [[0, 0], [0, 0.019], [0.02, 0.019], [0.02, 0.016], [0.004, 0.016], [0.004, 0]], [-0.014, 0, 0]),
    turned('wax', 'wax', 'y', [[0.004, 0], [0.004, 0.016], [0.01, 0.016], [0.01, 0]], [-0.014, 0, 0]),
    turned('lid', 'lid', 'y', [[0, 0], [0, 0.0175], [0.008, 0.0175], [0.008, 0]], [0.0195, 0, 0]),
  ], { glass: 'glass-clear', wax: 'plastic-yellow', lid: 'plastic-black' }) + { title: 'Cannabis wax' } + inHand('cannabis_wax', 'jar') + { voxelGrain: 0.002 } + { taxonomy: { category: 'medical', tags: { material: ['glass'], setting: ['modern'] }, keywords: ['recreational-drug'] } },

  // A 20 ml glass injection vial of dark yellow iron solution, 24 mm across and 57 mm tall, with an
  // aluminium crimp seal under a red flip-off top and a paper label.
  h.compound('injectable_iron', 0.024, [
    turned('vial', 'glass', 'y', [[0, 0], [0, 0.012], [0.042, 0.012], [0.047, 0.007], [0.05, 0.007], [0.05, 0.0055], [0.046, 0.0055], [0.041, 0.0105], [0.002, 0.0105], [0.002, 0]]),
    disc('liquid', 'liquid', 0.0098, 0.002, 0.036),
    turned('label', 'label', 'y', [[0.01, 0], [0.01, 0.0123], [0.034, 0.0123], [0.034, 0]]),
    disc('crimp', 'crimp', 0.0075, 0.047, 0.054),
    disc('flip', 'flip', 0.0065, 0.054, 0.057),
  ], { glass: 'glass-clear', liquid: 'fuel-amber', label: 'paper-white', crimp: 'alu-bare', flip: 'plastic-red' }) + { title: 'Vial of injectable iron' } + inHand('injectable_iron', 'vial') + { voxelGrain: 0.002 } + { taxonomy: { category: 'medical', tags: { material: ['glass'], setting: ['modern'] } } },

  // A cone-rolled joint, 85 mm long, 6 mm across at the card crutch at -x widening to 10 mm before the
  // twisted tip at +x.
  h.compound('joint', 0.0014, [
    turned('paper', 'paper', 'x', [[0, 0], [0, 0.003], [0.07, 0.005], [0.078, 0.0025], [0.085, 0.001], [0.085, 0]], [-0.0425, 0.005, 0]),
    rod('crutch', 'crutch', 0.0033, -0.0435, -0.03, 0.005),
  ], { paper: 'paper-white', crutch: 'paperboard-tan' }) + { title: 'Joint' } + h.gripOn('joint', 'paper') + { voxelGrain: 0.002 } + { taxonomy: { category: 'medical', tags: { material: ['paper'] }, keywords: ['recreational-drug'] } },
]
