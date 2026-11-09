local h = import '../compound.libsonnet';
local box = h.box;
local turned = h.turned;
local disc = h.disc;
// An open pot shell standing on y: radius `r` at the rim, `ht` tall, walls `t` thick, its floor `t` thick and its
// rim rolled out by `roll`. The profile ends on the axis, so the floor is solid.
local potShell(id, slot, r, ht, t, roll=0.003, base=0.008) = turned(id, slot, 'y', [
  [0, 0], [0, r - base], [base * 0.6, r - base * 0.15], [base, r], [ht - roll, r], [ht, r + roll], [ht, r - t],
  [t + base * 0.5, r - t], [t, r - t - base], [t, 0],
]);
// A loop handle riveted to the side of a pot at +x or -x (`side`), its grip `reach` out from the wall at height `y`.
local loopHandle(prefix, slot, side, r, y, reach, w=0.04, t=0.006) = [
  box(prefix + '-top', slot, [if side > 0 then r - 0.004 else -r - reach, y, -w / 2], [if side > 0 then r + reach else -r + 0.004, y + t, w / 2]),
  box(prefix + '-grip', slot, [if side > 0 then r + reach - t else -r - reach, y - 0.02, -w / 2], [if side > 0 then r + reach else -r - reach + t, y + t, w / 2]),
];
// A lid sitting on a rim of radius `r` at height `y`: a low dome with a knob on top.
local lid(prefix, slot, knobSlot, r, y, rise=0.02, knob=0.014) = [
  h.dome(prefix, slot, r + 0.004, rise, 0.004, 'y', [0, y, 0]),
  disc(prefix + '-stem', knobSlot, knob * 0.5, y + rise - 0.002, y + rise + 0.012),
  disc(prefix + '-knob', knobSlot, knob, y + rise + 0.01, y + rise + 0.022),
];
// A pot hammered out of one sheet: a lopsided shell with a crimped rim, hammer marks and a wire bail.
local makeshiftPot(id, massKg, metal, mark, t) = h.compound(id, massKg, [
  turned('shell', 'metal', 'y', [
    [0, 0], [0, 0.055], [0.012, 0.07], [0.03, 0.082], [0.06, 0.088], [0.075, 0.094], [0.075, 0.094 - t], [0.06, 0.088 - t],
    [0.03, 0.082 - t], [0.012 + t * 0.5, 0.07 - t], [t, 0.055 - t * 0.5], [t, 0],
  ]),
] + [
  // Crimps where the sheet was folded over at the rim, uneven in size.
  local a = i * std.pi / 4 + 0.2, w = [0.02, 0.03, 0.016, 0.026, 0.022, 0.03, 0.018, 0.024][i];
  h.prism('crimp-%d' % i, 'metal', 'y', [
    [std.sin(a) * 0.084 - std.cos(a) * w / 2, std.cos(a) * 0.084 + std.sin(a) * w / 2],
    [std.sin(a) * 0.084 + std.cos(a) * w / 2, std.cos(a) * 0.084 - std.sin(a) * w / 2],
    [std.sin(a) * 0.1 + std.cos(a) * w / 2, std.cos(a) * 0.1 - std.sin(a) * w / 2],
    [std.sin(a) * 0.1 - std.cos(a) * w / 2, std.cos(a) * 0.1 + std.sin(a) * w / 2],
  ], 0.068, 0.076)
  for i in std.range(0, 7)
] + [
  // Hammer marks on the outside, a shade darker.
  local a = [0.6, 1.9, 2.8, 4.0, 5.1, 3.4][i], y = [0.02, 0.045, 0.03, 0.05, 0.025, 0.06][i], rr = 0.068 + y * 0.28;
  box('mark-%d' % i, 'mark', [std.cos(a) * rr - 0.008, y - 0.006, std.sin(a) * rr - 0.008], [std.cos(a) * rr + 0.008, y + 0.006, std.sin(a) * rr + 0.008])
  for i in std.range(0, 5)
] + [
  h.rod('ear-a', 'metal', 0.006, 0.09, 0.104, 0.064),
  h.rod('ear-b', 'metal', 0.006, -0.104, -0.09, 0.064),
  box('bail-a', 'wire', [0.1, 0.064, -0.002], [0.104, 0.15, 0.002]),
  box('bail-b', 'wire', [-0.104, 0.064, -0.002], [-0.1, 0.15, 0.002]),
  box('bail-top', 'wire', [-0.104, 0.15, -0.002], [0.104, 0.154, 0.002]),
], { metal: metal, mark: mark, wire: 'steel-grey' }) + { voxelGrain: 0.004 };
[

  // A cast-iron skillet 410 mm long: a pan 270 mm across the rim and 50 mm deep with two pour lips, a 140 mm handle
  // with a hanging hole and a helper lug opposite.
  h.compound('pan', 2.427, [
    turned('pan', 'iron', 'y', [[0, 0], [0, 0.118], [0.008, 0.128], [0.05, 0.135], [0.05, 0.128], [0.012, 0.118], [0.006, 0.112], [0.006, 0]]),
    h.prism('handle', 'iron', 'y', [[-0.015, 0.125], [0.015, 0.125], [0.012, 0.26], [0, 0.27], [-0.012, 0.26]], 0.034, 0.046),
    disc('hole', 'hole', 0.006, 0.0455, 0.047, 0.245, 0),
    h.prism('lug', 'iron', 'y', [[-0.03, -0.125], [-0.022, -0.16], [0.022, -0.16], [0.03, -0.125]], 0.04, 0.048),
  ], { iron: 'iron-cast', hole: 'coal-black' }) + {
    handling: h.gripOn('pan', 'handle'),
    voxelGrain: 0.004,
  } + { taxonomy: { category: 'household', tags: { material: ['metal'] } } },
]
