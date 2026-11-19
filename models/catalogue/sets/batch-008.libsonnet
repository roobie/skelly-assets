local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local box = h.box;
local turned = h.turned;
// A prism whose profile may be listed either way round: it is turned counterclockwise before use.
local prism(id, slot, axis, profile, start, end) =
  local n = std.length(profile);
  local area = std.sum([profile[i][0] * profile[(i + 1) % n][1] - profile[(i + 1) % n][0] * profile[i][1] for i in std.range(0, n - 1)]);
  h.prism(id, slot, axis, if area > 0 then profile else std.reverse(profile), start, end);
local rod = h.rod;
local inHand = h.inHand;
// A cylinder standing on y from `y0` to `y1`.
local disc(id, slot, radius, y0, y1) = turned(id, slot, 'y', [[y0, 0], [y0, radius], [y1, radius], [y1, 0]]);
[
  // A 10 ml amber injection vial, 24 mm across and 52 mm tall, with an aluminium crimp, a green flip-off
  // cap and a paper label.
  h.compound('prophylactic_antivenom', 0.02, [
    turned('vial', 'glass', 'y', [[0, 0], [0, 0.012], [0.036, 0.012], [0.04, 0.007], [0.043, 0.007], [0.043, 0]]),
    disc('crimp', 'crimp', 0.0085, 0.042, 0.05),
    disc('flip', 'flip', 0.0082, 0.05, 0.053),
    turned('label', 'label', 'y', [[0.006, 0], [0.006, 0.0124], [0.03, 0.0124], [0.03, 0]]),
  ], { glass: 'plastic-amber', crimp: 'alu-bare', flip: 'plastic-green', label: 'paper-white' }) + { title: 'Prophylactic antivenom' } + inHand('prophylactic_antivenom', 'vial') + { voxelGrain: 0.002 } + { taxonomy: { category: 'medical', tags: { material: ['glass', 'plastic'], setting: ['modern'] } } },

  // A sealed single-use olive foil sachet of clotting powder, 50 mm by 70 mm and lying flat, with a white
  // printed panel, a red stripe and crimped ends.
  h.compound('hemostatic_powder', 0.03, [
    box('pouch', 'pouch', [-0.03, 0, -0.025], [0.03, 0.006, 0.025]),
    box('crimp-top', 'crimp', [0.03, 0.002, -0.025], [0.035, 0.004, 0.025]),
    box('crimp-bottom', 'crimp', [-0.035, 0.002, -0.025], [-0.03, 0.004, 0.025]),
    box('panel', 'panel', [-0.022, 0.006, -0.019], [0.012, 0.007, 0.019]),
    box('stripe', 'stripe', [0.017, 0.006, -0.025], [0.023, 0.007, 0.025]),
  ], { pouch: 'paint-olive', crimp: 'paint-olive', panel: 'paper-white', stripe: 'plastic-red' }) + { title: 'Haemostatic powder' } + inHand('hemostatic_powder', 'pouch') + h.label('panel', '+y') + { voxelGrain: 0.002 } + { taxonomy: { category: 'medical', tags: { material: ['metal'], setting: ['modern'] } } },

  // A 250 ml bag of saline for a drip, 180 mm long and 95 mm wide lying flat, with a printed label, two
  // ports at one end and a hanging tab at the other.
  h.compound('saline', 0.24, [
    prism('bag', 'bag', 'z', [[-0.075, 0.009], [-0.065, 0], [0.065, 0], [0.075, 0.009], [0.065, 0.02], [-0.065, 0.02]], -0.045, 0.045),
    box('label', 'label', [-0.05, 0.02, -0.032], [0.045, 0.021, 0.032]),
    box('tab', 'bag', [0.075, 0.008, -0.012], [0.09, 0.01, 0.012]),
    rod('port-a', 'port', 0.0035, -0.092, -0.07, 0.009) + { origin: [-0.092, 0.009, -0.014] },
    rod('port-b', 'port', 0.0035, -0.092, -0.07, 0.009) + { origin: [-0.092, 0.009, 0.014] },
    rod('cap-a', 'cap', 0.004, -0.1, -0.092, 0.009) + { origin: [-0.1, 0.009, -0.014] },
    rod('cap-b', 'tip', 0.004, -0.1, -0.092, 0.009) + { origin: [-0.1, 0.009, 0.014] },
  ], { bag: 'plastic-clear', label: 'paper-white', port: 'plastic-white', cap: 'plastic-blue', tip: 'plastic-red' }) + { title: 'Saline' } + inHand('saline', 'bag') + h.label('label', '+y') + { voxelGrain: 0.004 } + { taxonomy: { category: 'medical', tags: { material: ['plastic'], place: ['hospital'], setting: ['modern'] } } },

  // A reused 250 ml trigger spray bottle of homemade deodorising wash, 55 mm across and 200 mm tall,
  // labelled with a strip of tape.
  h.compound('skunk_neutralizer', 0.26, [
    turned('bottle', 'bottle', 'y', [[0, 0], [0, 0.0275], [0.12, 0.0275], [0.135, 0.013], [0.145, 0.013], [0.145, 0]]),
    disc('collar', 'head', 0.015, 0.145, 0.158),
    box('head', 'head', [-0.025, 0.158, -0.012], [0.028, 0.188, 0.012]),
    box('nozzle', 'nozzle', [0.028, 0.172, -0.005], [0.038, 0.182, 0.005]),
    prism('trigger', 'trigger', 'z', [[0.012, 0.158], [0.022, 0.158], [0.026, 0.13], [0.018, 0.13]], -0.006, 0.006),
    rod('tube', 'head', 0.006, -0.025, -0.012, 0.18),
    turned('tape', 'tape', 'y', [[0.05, 0], [0.05, 0.028], [0.08, 0.028], [0.08, 0]]),
  ], { bottle: 'plastic-frosted', head: 'plastic-white', nozzle: 'plastic-black', trigger: 'plastic-blue', tape: 'tape-grey' }) + { title: 'Spray bottle of skunk neutraliser' } + inHand('skunk_neutralizer', 'bottle') + { voxelGrain: 0.004 } + { taxonomy: { category: 'medical', tags: { material: ['plastic'], setting: ['modern'] } } },

  // A 5 ml white dropper bottle of steroid eye drops, 18 mm across and 62 mm tall, with a narrow paper
  // label and a tall pink cap.
  h.compound('steroid_eyedrops', 0.012, [
    turned('bottle', 'bottle', 'y', [[0, 0], [0, 0.009], [0.034, 0.009], [0.04, 0.006], [0.04, 0]]),
    turned('label', 'label', 'y', [[0.01, 0], [0.01, 0.0094], [0.026, 0.0094], [0.026, 0]]),
    turned('cap', 'cap', 'y', [[0.038, 0], [0.038, 0.0075], [0.054, 0.0075], [0.062, 0.004], [0.062, 0]]),
  ], { bottle: 'enamel-white', label: 'paper-white', cap: 'plastic-pink' }) + { title: 'Steroid eyedrops' } + inHand('steroid_eyedrops', 'bottle') + { voxelGrain: 0.002 } + { taxonomy: { category: 'medical', tags: { material: ['plastic'], setting: ['modern'] } } },

  // A 30 ml cobalt-blue glass bottle of essential oil, 32 mm across and 80 mm tall, with a black dropper
  // cap and a paper label.
  h.compound('thyme_oil', 0.035, [
    turned('bottle', 'glass', 'y', [[0, 0], [0, 0.016], [0.052, 0.016], [0.06, 0.008], [0.062, 0.008], [0.062, 0]]),
    turned('cap', 'cap', 'y', [[0.06, 0], [0.06, 0.0105], [0.078, 0.0105], [0.08, 0.009], [0.08, 0]]),
    turned('label', 'label', 'y', [[0.012, 0], [0.012, 0.0164], [0.042, 0.0164], [0.042, 0]]),
  ], { glass: 'plastic-clear-blue', cap: 'plastic-black', label: 'paper-white' }) + { title: 'Thyme oil' } + inHand('thyme_oil', 'bottle') + { voxelGrain: 0.002 } + { taxonomy: { category: 'medical', tags: { material: ['glass', 'plastic'], setting: ['modern'] } } },

  // A broken half of a large white vitamin tablet, 20 mm by 9 mm and 6 mm thick, lying flat.
  h.compound('vitamin_c_fragment', 0.0012, [
    prism('half', 'tablet', 'y', [[0, -0.01], [0.003, -0.0095], [0.006, -0.008], [0.008, -0.005], [0.009, 0], [0.008, 0.005], [0.006, 0.008], [0.003, 0.0095], [0, 0.01]], 0, 0.006),
  ], { tablet: 'enamel-white' }) + { title: 'Vitamin C fragment' } + inHand('vitamin_c_fragment', 'half') + { voxelGrain: 0.002 } + { taxonomy: { category: 'medical', tags: { setting: ['modern'] } } },
]
