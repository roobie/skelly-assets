local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local box = h.box;
local turned = h.turned;
local inHand = h.inHand;
// A medicine bottle of the vessel family: a body, a shoulder up to a neck, a cap and a paper label band.
local bottle(id, massKg, radius, height, neckRadius, capRadius, capHeight, finish, dimensions={}, grain=0.002) = h.item(id, 'vessel', massKg, {
  radius: radius, height: height, shoulderHeight: 0.005, neckRadius: neckRadius, neckHeight: 0.005,
  capRadius: capRadius, capHeight: capHeight, rimHeight: 0.001, bandHeight: height * 0.6, bandInset: 0.0004,
} + dimensions, finish) + inHand(id, 'body') + { voxelGrain: grain };
// A cylinder standing on y from `y0` to `y1`.
local disc(id, slot, radius, y0, y1) = turned(id, slot, 'y', [[y0, 0], [y0, radius], [y1, radius], [y1, 0]]);
[
  // A 50 ml amber glass dropper bottle of homemade herbal oil, 36 mm across and 110 mm tall with its
  // rubber bulb, labelled with a strip of tape.
  h.compound('mugwort_oil', 0.1, [
    turned('bottle', 'glass', 'y', [[0, 0], [0, 0.018], [0.062, 0.018], [0.072, 0.009], [0.076, 0.009], [0.076, 0]]),
    disc('collar', 'collar', 0.0105, 0.074, 0.09),
    turned('bulb', 'bulb', 'y', [[0.09, 0], [0.09, 0.0075], [0.104, 0.0075], [0.108, 0.005], [0.11, 0.002], [0.11, 0]]),
    turned('tape', 'tape', 'y', [[0.022, 0], [0.022, 0.0185], [0.042, 0.0185], [0.042, 0]]),
  ], { glass: 'plastic-amber', collar: 'plastic-black', bulb: 'rubber-black', tape: 'tape-grey' }) + { title: 'Mugwort oil' } + inHand('mugwort_oil', 'bottle') + { voxelGrain: 0.002 } + { taxonomy: { category: 'medical', tags: { material: ['plastic', 'rubber'] } } },

  // A twin contact lens case, 52 mm long and 17 mm tall: two round wells joined by a bridge, one screw
  // cap blue and one green to tell left from right.
  h.compound('contact_lenses', 0.0094, [
    turned('well-left', 'body', 'y', [[0, 0], [0, 0.011], [0.011, 0.011], [0.011, 0]], [-0.014, 0, 0]),
    turned('well-right', 'body', 'y', [[0, 0], [0, 0.011], [0.011, 0.011], [0.011, 0]], [0.014, 0, 0]),
    box('bridge', 'body', [-0.012, 0, -0.005], [0.012, 0.006, 0.005]),
    turned('cap-left', 'left', 'y', [[0.009, 0], [0.009, 0.0125], [0.017, 0.0125], [0.017, 0]], [-0.014, 0, 0]),
    turned('cap-right', 'right', 'y', [[0.009, 0], [0.009, 0.0125], [0.017, 0.0125], [0.017, 0]], [0.014, 0, 0]),
  ], { body: 'plastic-white', left: 'plastic-blue', right: 'plastic-green' }) + { title: 'Contact lenses' } + inHand('contact_lenses', 'bridge') + { voxelGrain: 0.002 } + { taxonomy: { category: 'medical', tags: { material: ['plastic'], setting: ['modern'] } } },

  // A round plastic can of nicotine pouches, 68 mm across and 24 mm tall, its snap lid carrying a small
  // compartment on top for used pouches.
  h.compound('nicotine_pouch', 0.026, [
    disc('body', 'body', 0.033, 0, 0.016),
    turned('lid', 'lid', 'y', [[0.013, 0], [0.013, 0.034], [0.02, 0.034], [0.022, 0.032], [0.022, 0]]),
    disc('catch', 'catch', 0.016, 0.022, 0.025),
  ], { body: 'plastic-white', lid: 'plastic-blue', catch: 'plastic-white' }) + { title: 'Nicotine pouch' } + inHand('nicotine_pouch', 'body') + { voxelGrain: 0.002 } + { taxonomy: { category: 'medical', tags: { material: ['plastic'], setting: ['modern'] }, keywords: ['tobacco'] } },

  // A 250 ml bottle of green night-time cough syrup, 62 mm across and 165 mm tall, with a dosing cup
  // over the cap.
  bottle('night_cough_syrup', 0.35, 0.031, 0.105, 0.014, 0.022, 0.03,
         { body: 'plastic-green', label: 'paint-police-blue', cap: 'plastic-white' },
         { shoulderHeight: 0.016, neckHeight: 0.01 }) + { title: 'Night cough syrup' } + { taxonomy: { category: 'medical', tags: { material: ['plastic'], setting: ['modern'] } } },

  // A single two-tone capsule, 26 mm long and 11 mm across, lying along z, one half apple-red and the
  // other white.
  h.compound('red_capsule', 0.0012, h.capsule(0.026, 0.0055)('capsule', 0, 0, 0),
             { 'capsule-a': 'plastic-clear-red', 'capsule-b': 'plastic-white' }) + { title: 'Red capsule' }
  + inHand('red_capsule', 'capsule-a') + { voxelGrain: 0.002 } + { taxonomy: { category: 'medical', tags: { material: ['plastic'], setting: ['modern'] } } },

  // A reused 250 ml glass medicine bottle of dark homemade syrup, 60 mm across and 160 mm tall,
  // stoppered with a cork and labelled with a strip of tape. The body shows the syrup, as through glass.
  h.compound('poppy_cough_syrup', 0.34, [
    disc('syrup', 'syrup', 0.03, 0, 0.1),
    turned('shoulder', 'glass', 'y', [[0.1, 0], [0.1, 0.03], [0.118, 0.012], [0.145, 0.012], [0.145, 0]]),
    disc('cork', 'cork', 0.0105, 0.14, 0.16),
    turned('tape', 'tape', 'y', [[0.035, 0], [0.035, 0.0305], [0.06, 0.0305], [0.06, 0]]),
  ], { syrup: 'paint-oxblood', glass: 'glass-clear', cork: 'cork', tape: 'tape-grey' }) + { title: 'Poppy cough syrup' } + inHand('poppy_cough_syrup', 'syrup') + { voxelGrain: 0.004 } + { taxonomy: { category: 'medical', tags: { material: ['glass'] } } },

  // A 240 ml bottle of pink heartburn syrup, 60 mm across and 170 mm tall, with a wide cap.
  bottle('heartburn_syrup', 0.32, 0.03, 0.115, 0.016, 0.02, 0.026,
         { body: 'paint-terracotta', label: 'paper-white', cap: 'paint-terracotta' },
         { shoulderHeight: 0.018, neckHeight: 0.008 }) + { title: 'Heartburn syrup' } + { taxonomy: { category: 'medical', tags: { material: ['plastic'], setting: ['modern'] } } },
]
