local b = import 'packages/thing-authoring-tool/equipment.libsonnet';
local equipment = b.equipment;
local band = import 'models/head-band.libsonnet';
local headlampGrain = 0.002;
// The headlamp's family lays its lens toward -z, which the build turns onto +z.
local headlampStrap = band.strap('headlamp', headlampGrain, 0.004, forward=180);
[
  equipment('blowtorch', 'blowtorch', 0.900, {
    radius: 0.026, bodyHeight: 0.115, footHeight: 0.008, neckRadius: 0.012,
    neckHeight: 0.035, nozzleLength: 0.072, nozzleRadius: 0.007,
    mouthLength: 0.020, mouthRadius: 0.013, valveRadius: 0.016,
  }, { body: 'plastic-blue', rubber: 'paint-charcoal', metal: 'steel-grey', control: 'plastic-red' }, 'body', [0, 0, 0]) + { taxonomy: { category: 'tools' } },
  equipment('headlamp', 'headlamp', 0.180, {
    strap: headlampStrap.pieces,
    housingWidth: 0.060, housingHeight: 0.040, housingDepth: 0.030,
    lensRadius: 0.017, lensDepth: 0.005,
  }, { strap: 'cord-olive', body: 'plastic-red', metal: 'steel-grey', lens: 'glass-grey', control: 'paint-charcoal' }, headlampStrap.anchors.strap_back_inner.solid, [0, 0, 0], [0.5, 0.5, 1]) + {
    voxelGrain: headlampGrain,
    anchors: {
      lens: { part: 'equipment', solid: 'lens', fraction: [0.5, 0.5, 0] },
      housing_bottom: { part: 'equipment', solid: 'body', fraction: [0.5, 0, 0.5] },
      housing_top: { part: 'equipment', solid: 'body', fraction: [0.5, 1, 0.5] },
      housing_back: { part: 'equipment', solid: 'body', fraction: [0.5, 0.5, 1] },
    } + { [name]: { part: 'equipment' } + headlampStrap.anchors[name] for name in std.objectFields(headlampStrap.anchors) },
  } + { taxonomy: { category: 'lighting' } },
  equipment('weapon_sling', 'webbingSling', 0.150, {
    foldedLength: 0.290, width: 0.028, thickness: 0.003,
    buckleWidth: 0.026, buckleDepth: 0.036, buckleWall: 0.004,
    clipWidth: 0.020, clipLength: 0.026, clipWall: 0.004,
  }, { strap: 'cord-olive', metal: 'steel-grey' }, 'webbing-1', [0, -90, 0], [0.1, 0.5, 0.5]) + { taxonomy: { category: 'weapon-parts' } },
  equipment('repair_kit', 'repairKit', 1.250, {
    kind: 'patches', width: 0.200, depth: 0.130, height: 0.035, wall: 0.003,
    rollRadius: 0.029, rollHeight: 0.032, patchWidth: 0.080, patchDepth: 0.090,
  }, { body: 'paint-charcoal', patch: 'steel-grey', roll: 'steel-grey', cloth: 'paperboard-tan', metal: 'steel-grey' }, 'rim-left', [0, -90, 0]) + { taxonomy: { category: 'tools' } },
  equipment('wire_strippers', 'pliers', 0.180, {
    kind: 'wire', length: 0.160, jawLength: 0.042, spread: 0.048,
    gripWidth: 0.014, thickness: 0.007, pivotRadius: 0.012, teeth: 5, toothDepth: 0.004,
  }, { metal: 'steel-grey', grip: 'plastic-red', dark: 'paint-charcoal' }, 'grip--1', hold='upright') + { taxonomy: { category: 'tools' } },
  equipment('adjustable_pliers', 'pliers', 0.300, {
    kind: 'groove', length: 0.200, jawLength: 0.060, spread: 0.055,
    gripWidth: 0.014, thickness: 0.008, pivotRadius: 0.017, teeth: 5, toothDepth: 0.004,
  }, { metal: 'steel-grey', grip: 'plastic-blue', dark: 'paint-charcoal' }, 'grip--1', hold='upright') + { taxonomy: { category: 'tools' } },
  equipment('sewing_repair_kit', 'repairKit', 0.420, {
    kind: 'sewing', width: 0.180, depth: 0.110, height: 0.030, wall: 0.002,
    rollRadius: 0.015, rollHeight: 0.028, patchWidth: 0.070, patchDepth: 0.075,
  }, { body: 'paint-terracotta', patch: 'cord-olive', roll: 'plastic-red', cloth: 'paperboard-tan', metal: 'steel-grey' }, 'rim-left', [0, -90, 0]) + { taxonomy: { category: 'tools' } },
  equipment('portable_radio', 'portableRadio', 0.600, {
    width: 0.075, height: 0.130, depth: 0.040, antennaLength: 0.048, antennaRadius: 0.002,
    dialRadius: 0.010, dialDepth: 0.008, speakerRadius: 0.026, grilleBars: 9,
  }, { body: 'polymer-od-green', metal: 'steel-grey', control: 'paint-charcoal', display: 'glass-grey', marker: 'plastic-red' }, 'body', [0, 0, 0], [0.5, 0.25, 0.5]) + { taxonomy: { category: 'electrical' } },
]
