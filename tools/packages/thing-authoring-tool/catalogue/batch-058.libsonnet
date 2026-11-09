local h = import '../compound.libsonnet';
// A flat piece lying in the xz plane, `t` thick about y = `y`; its outline is [z, x] and must be convex.
local flat(id, slot, outline, t, y=0) = h.prism(id, slot, 'y', outline, y - t / 2, y + t / 2);
local held(id, solid) = { handling: h.gripOn(id, solid) };
[
  // A hedging bill on a 1.25 m ash shaft: a 220 mm hooked blade 70 mm deep with a back spur, 1.5 m overall.
  h.compound('brush_axe', 2.400, [
    h.turned('shaft', 'shaft', 'x', [[0, 0], [0, 0.017], [1.200, 0.016], [1.200, 0]]),
    h.turned('socket', 'socket', 'x', [[0, 0], [0, 0.019], [0.100, 0.016], [0.100, 0]], [1.180, 0, 0]),
    flat('blade-root', 'blade', [[-0.014, 1.270], [0.014, 1.270], [0.020, 1.400], [-0.040, 1.400], [-0.034, 1.300]], 0.006),
    flat('blade-belly', 'blade', [[-0.040, 1.400], [0.020, 1.400], [0.016, 1.460], [-0.030, 1.440]], 0.006),
    flat('blade-hook', 'blade', [[-0.030, 1.440], [0.016, 1.460], [0.004, 1.490], [-0.020, 1.500], [-0.046, 1.478]], 0.006),
    flat('spur', 'blade', [[0.014, 1.300], [0.020, 1.330], [0.050, 1.322]], 0.006),
    h.box('neck', 'blade', [1.270, -0.004, -0.012], [1.290, 0.004, 0.012]),
  ], { shaft: 'wood-oak', socket: 'steel-grey', blade: 'steel-grey' }) + held('brush_axe', 'shaft') + { voxelGrain: 0.004 },
  // A 900 mm hardwood stick 35 mm thick, its last 200 mm carved flat into a 55 mm blade and hardened in the fire.
  h.compound('digging_stick', 1.133, [
    h.turned('shaft', 'shaft', 'x', [[0, 0], [0, 0.016], [0.020, 0.018], [0.720, 0.017], [0.720, 0]]),
    h.turned('knot', 'bark', 'x', [[0, 0], [0, 0.019], [0.030, 0.019], [0.030, 0]], [0.300, 0, 0]),
    flat('neck', 'blade', [[-0.015, 0.700], [0.015, 0.700], [0.026, 0.780], [-0.026, 0.780]], 0.022),
    flat('blade', 'blade', [[-0.026, 0.780], [0.026, 0.780], [0.024, 0.850], [-0.024, 0.850]], 0.014),
    flat('tip', 'tip', [[-0.024, 0.850], [0.024, 0.850], [0.010, 0.890], [0, 0.900], [-0.010, 0.890]], 0.010),
  ], { shaft: 'wood-pine', bark: 'bark', blade: 'wood-pine', tip: 'coal-black' }) + held('digging_stick', 'shaft') + { voxelGrain: 0.004 } + { taxonomy: { tags: { material: ['wood'], setting: ['prehistoric'] } } },
]
