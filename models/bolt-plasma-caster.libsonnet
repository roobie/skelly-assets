local h = import '../tools/packages/thing-authoring-tool/compound.libsonnet';
local bolt = import 'bolt-gun.libsonnet';
local box = h.box;

// The bolt carbine's plasma caster: the family's grip and stock kept, a deeper receiver, a glowing coil core ringed with
// collars and ending in a blunt flared emitter with a glowing lens instead of the rifled barrel, and an energy cell with
// glowing windows instead of the magazine. Slot `glow` is the model's own light: crystal-glow-blue is a stand-in colour,
// the game decides what colour the glow is. About 0.9 m long.
// Laid out with the muzzle at +x, the axis `gripOn` names, so the built model's muzzle faces +z.

local w = 0.07;  // half the receiver's width
local coreY = 0.25;
local muzzleX = 0.49;
[
  // A deeper receiver than the carbine's.
  bolt.gun('bolt_plasma_caster', 12, 'energy', bolt.receiver(0.15, 0.14, 0.35, w, { front: 0.14, top: 0.37, halfWidth: 0.045 }) + [
    // The coil: a glowing core with three collars round it, then the emitter cup and its lens.
    h.rod('core', 'glow', 0.045, 0.15, 0.47, coreY) + { sides: 16 },
    h.turned('collar-a', 'metal', 'x', [[0, 0], [0, 0.08], [0.03, 0.08], [0.03, 0]], [0.17, coreY, 0]) + { sides: 8 },
    h.turned('collar-b', 'metal', 'x', [[0, 0], [0, 0.08], [0.03, 0.08], [0.03, 0]], [0.25, coreY, 0]) + { sides: 8 },
    h.turned('collar-c', 'metal', 'x', [[0, 0], [0, 0.08], [0.03, 0.08], [0.03, 0]], [0.33, coreY, 0]) + { sides: 8 },
    h.turned('emitter', 'trim', 'x', [[0, 0], [0, 0.065], [0.05, 0.09], [0.08, 0.09], [0.08, 0]], [0.40, coreY, 0]) + { sides: 8 },
    h.turned('lens', 'glow', 'x', [[0, 0], [0, 0.064], [muzzleX - 0.48, 0.06], [muzzleX - 0.48, 0]], [0.48, coreY, 0]) + { sides: 8 },
  ] + [
    // Cooling fins along the top of the coil.
    box('fin-%d' % i, 'metal', [0.21 + i * 0.08, 0.325, -0.02], [0.225 + i * 0.08, 0.37, 0.02])
    for i in [0, 1, 2]
  ] + [
    // An energy cell hung under the receiver, with a glowing window on each side.
    // On y, a prism's outline is [z, x].
    h.prism('cell', 'body', 'y', [[-0.055, 0.012], [-0.043, 0], [0.043, 0], [0.055, 0.012], [0.055, 0.138], [0.043, 0.15], [-0.043, 0.15], [-0.055, 0.138]], 0.02, 0.15),
    h.prism('cell-cap', 'trim', 'y', [[-0.058, 0.009], [-0.044, -0.005], [0.044, -0.005], [0.058, 0.009], [0.058, 0.141], [0.044, 0.155], [-0.044, 0.155], [-0.058, 0.141]], 0.01, 0.03),
    box('cell-window-l', 'glow', [0.03, 0.05, -0.0575], [0.12, 0.12, -0.055]),
    box('cell-window-r', 'glow', [0.03, 0.05, 0.055], [0.12, 0.12, 0.0575]),
  ] + bolt.grip(0.155) + bolt.stock(0.34, 0.05), { glow: 'crystal-glow-blue' }) + { title: 'Basic plasma caster' },
]
