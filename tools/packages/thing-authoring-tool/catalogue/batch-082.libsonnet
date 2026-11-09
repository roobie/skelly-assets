local h = import '../compound.libsonnet';
local box = h.box;
local turned = h.turned;
local disc = h.disc;
local rod = h.rod;
// A ring of round section `t` about y, centre radius `rc`, its foot at `y0`: one turn of a coiled hose or cord.
local ring(id, slot, rc, t, y0, x=0, z=0) =
  local pts = [[t + t * std.sin(std.pi * i / 4), rc + t * std.cos(std.pi * i / 4)] for i in std.range(0, 7)];
  turned(id, slot, 'y', pts + [pts[0]], [x, y0, z]);
// A pistol-grip drill lying on its side along x, chuck at +x and a bit in it. A cordless one stands its grip on a
// battery pack; a corded one ends its grip in a strain relief with the cord coiled under it. Slots: housing, grip,
// trigger, chuck, bit, and battery or cord.
local drill(cordless) = [
  turned('housing', 'housing', 'x', [[0, 0], [0, 0.024], [0.012, 0.031], [0.105, 0.031], [0.12, 0.026], [0.12, 0]], [-0.075, 0.165, 0]),
  turned('nose', 'housing', 'x', [[0, 0], [0, 0.024], [0.018, 0.02], [0.018, 0]], [0.045, 0.165, 0]),
  turned('chuck', 'chuck', 'x', [[0, 0], [0, 0.018], [0.03, 0.017], [0.038, 0.011], [0.038, 0]], [0.063, 0.165, 0]),
  rod('bit', 'bit', 0.003, 0.101, 0.145, 0.165),
  h.prism('grip', 'grip', 'z', [[-0.062, 0.03], [-0.026, 0.03], [0.002, 0.14], [-0.04, 0.14]], -0.016, 0.016),
  box('trigger', 'trigger', [-0.004, 0.105, -0.007], [0.01, 0.128, 0.007]),
  box('switch', 'trigger', [-0.03, 0.15, -0.019], [-0.018, 0.158, 0.019]),
] + (
  if cordless then [
    box('battery', 'battery', [-0.08, 0, -0.035], [0.0, 0.032, 0.035]),
    box('battery-latch', 'grip', [-0.07, 0.032, -0.02], [-0.02, 0.036, 0.02]),
  ] else [
    box('foot', 'grip', [-0.072, 0.012, -0.02], [-0.018, 0.034, 0.02]),
    rod('relief', 'cord', 0.008, -0.095, -0.072, 0.022),
    ring('cord-a', 'cord', 0.045, 0.004, 0, -0.04, 0),
    ring('cord-b', 'cord', 0.041, 0.004, 0.006, -0.04, 0.004),
    box('cord-up', 'cord', [-0.099, 0.008, -0.004], [-0.091, 0.022, 0.004]),
  ]
);
// A demolition breaker lying along x: a T handle at -x, its drive body, the nose and a moil point at +x. Slots: handle,
// grip, body, nose, bit; the electric one adds battery, the petrol one engine, tank and starter.
local breakerFront(x0, x1, r) = [
  turned('body', 'body', 'x', [[0, 0], [0, r * 0.85], [0.015, r], [x1 - x0 - 0.015, r], [x1 - x0, r * 0.7], [x1 - x0, 0]], [x0, 0.09, 0]),
  turned('nose', 'nose', 'x', [[0, 0], [0, 0.045], [0.06, 0.04], [0.08, 0.03], [0.08, 0]], [x1, 0.09, 0]),
  turned('collar', 'nose', 'x', [[0, 0], [0, 0.05], [0.02, 0.05], [0.02, 0]], [x1 + 0.02, 0.09, 0]),
  turned('bit', 'bit', 'x', [[0, 0], [0, 0.016], [0.17, 0.014], [0.22, 0]], [x1 + 0.08, 0.09, 0]),
];
local tHandle(x) = [
  rod('shaft', 'handle', 0.022, x, x + 0.08, 0.09),
  turned('bar', 'handle', 'z', [[0, 0], [0, 0.02], [0.5, 0.02], [0.5, 0]], [x, 0.09, -0.25]),
  turned('grip-a', 'grip', 'z', [[0, 0], [0, 0.026], [0.13, 0.026], [0.13, 0]], [x, 0.09, -0.25]),
  turned('grip-b', 'grip', 'z', [[0, 0], [0, 0.026], [0.13, 0.026], [0.13, 0]], [x, 0.09, 0.12]),
];
// A cast case tray open for use, `w` along x and `d` deep, with walls `t` thick, floor at y = 0.
local tray(w, d, ht, t) = [
  box('floor', 'case', [-w / 2, 0, -d / 2], [w / 2, t, d / 2]),
  box('wall-front', 'case', [-w / 2, 0, d / 2 - t], [w / 2, ht, d / 2]),
  box('wall-back', 'case', [-w / 2, 0, -d / 2], [w / 2, ht, -d / 2 + t]),
  box('wall-left', 'case', [-w / 2, 0, -d / 2], [-w / 2 + t, ht, d / 2]),
  box('wall-right', 'case', [w / 2 - t, 0, -d / 2], [w / 2, ht, d / 2]),
];
[

  // A rough-cast bronze hammer head, 9 cm tall, on a 25 cm pine haft wrapped in rawhide under the head.
  h.compound('hammer_bronze', 0.5, [
    rod('handle', 'handle', 0.013, 0, 0.245, 0.045),
    turned('head', 'head', 'y', [[0, 0], [0, 0.016], [0.006, 0.019], [0.045, 0.014], [0.084, 0.019], [0.09, 0.016], [0.09, 0]], [0.226, 0, 0]),
    turned('wrap', 'wrap', 'x', [[0, 0], [0, 0.016], [0.02, 0.016], [0.02, 0]], [0.188, 0.045, 0]),
  ], { handle: 'wood-birch', head: 'bronze', wrap: 'skin-rawhide' }) + {
    handling: h.gripOn('hammer_bronze', 'handle'),
    voxelGrain: 0.002,
  } + { taxonomy: { tags: { material: ['metal', 'wood'], setting: ['ancient'] } } },
]
