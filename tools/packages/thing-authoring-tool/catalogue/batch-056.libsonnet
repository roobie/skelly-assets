local h = import '../compound.libsonnet';
local box = h.box;
local turned = h.turned;
local prism = h.prism;
// A hollow shell turned about `axis`, closed on its first point so the hole stays open.
local shell(id, slot, axis, profile, origin) = turned(id, slot, axis, profile + [profile[0]], origin);
// A stored-pressure extinguisher standing on y, label on +z and hose down the +x side: a cylinder `r` across and
// `ht` to the shoulder, a valve with carry handle and squeeze lever on top, a hose from the valve to an outlet `nozzle`
// clipped low on the side. Slots: body, foot, label, valve, lever, gauge, hose, nozzle.
local extinguisher(r, ht, valveHt, hoseR, nozzle) =
  local top = ht + r * 0.5;
  local vy = top + 0.004;
  local hx = r + hoseR + 0.002;
  [
    turned('body', 'body', 'y', [[0, 0], [0, r - 0.004], [0.006, r], [ht, r], [ht + r * 0.3, r * 0.75], [top, r * 0.3], [top, 0]]),
    shell('foot', 'foot', 'y', [[0, r - 0.006], [0, r + 0.003], [0.02, r + 0.003], [0.02, r - 0.006]], [0, -0.002, 0]),
    box('label', 'label', [-r * 0.6, ht * 0.35, r - 0.01], [r * 0.6, ht * 0.75, r + 0.003]),
    h.disc('neck', 'valve', r * 0.22, top - 0.004, vy + 0.012),
    box('valve', 'valve', [-r * 0.3, vy + 0.008, -0.016], [r * 0.45, vy + valveHt, 0.016]),
    h.turned('gauge', 'gauge', 'z', [[0, 0], [0, 0.014], [0.008, 0.014], [0.008, 0]], [-r * 0.05, vy + valveHt * 0.55, 0.016]),
    box('carry', 'valve', [-r * 1.1, vy + valveHt - 0.012, -0.009], [-r * 0.3, vy + valveHt - 0.002, 0.009]),
    box('lever', 'lever', [-r * 1.15, vy + valveHt + 0.012, -0.010], [r * 0.4, vy + valveHt + 0.020, 0.010]),
    box('lever-pin', 'lever', [r * 0.25, vy + valveHt - 0.004, -0.006], [r * 0.4, vy + valveHt + 0.014, 0.006]),
    h.rod('hose-out', 'hose', hoseR, r * 0.45, hx + hoseR, vy + valveHt * 0.4),
    turned('hose', 'hose', 'y', [[0, 0], [0, hoseR], [vy + valveHt * 0.4 - nozzle[1], hoseR], [vy + valveHt * 0.4 - nozzle[1], 0]], [hx, nozzle[1], 0]),
    box('clip', 'foot', [r - 0.004, nozzle[1] + 0.01, -0.012], [hx + nozzle[0] + 0.004, nozzle[1] + 0.022, 0.012]),
    turned('nozzle', 'nozzle', 'y', [[0, nozzle[0] * 0.5], [0, nozzle[0]], [nozzle[2], nozzle[0] * 0.6], [nozzle[2], 0]], [hx, nozzle[1] - nozzle[2], 0]),
  ];
[
  // A 1.6 m pike pole lying flat: a yellow fibreglass shaft with a rubber butt grip, and a steel head with a straight
  // spike and a hook curving back on +z.
  h.compound('pike_pole', 3.1, [
    turned('shaft', 'shaft', 'x', [[0, 0], [0, 0.016], [1.48, 0.016], [1.48, 0]]),
    turned('grip', 'grip', 'x', [[0, 0], [0, 0.02], [0.3, 0.019], [0.3, 0]]),
    turned('ferrule', 'head', 'x', [[0, 0], [0, 0.02], [0.07, 0.019], [0.07, 0]], [1.47, 0, 0]),
    turned('spike', 'head', 'x', [[0, 0], [0, 0.012], [0.06, 0.002], [0.06, 0]], [1.54, 0, 0]),
    prism('hook-arm', 'head', 'y', [[0.012, 1.565], [0.064, 1.53], [0.058, 1.514], [0.012, 1.545]], -0.006, 0.006),
    prism('hook-tip', 'head', 'y', [[0.056, 1.534], [0.072, 1.525], [0.072, 1.48], [0.058, 1.494]], -0.006, 0.006),
  ], { shaft: 'plastic-yellow', grip: 'rubber-black', head: 'steel-grey' }) + {
    handling: h.gripOn('pike_pole', 'grip'),
  },
]
