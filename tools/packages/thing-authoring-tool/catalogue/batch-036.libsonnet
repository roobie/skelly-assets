local h = import '../compound.libsonnet';
local box = h.box;
local turned = h.turned;
local disc = h.disc;
// A knob turned along z, its back face at z0.
local dial(id, slot, x, y, z0, radius, depth) = turned(id, slot, 'z', [[0, 0], [0, radius], [depth, radius], [depth, 0]], [x, y, z0]);
// A wire stub along z from z0 to z1 at (x, y).
local wire(id, slot, x, y, z0, z1) = turned(id, slot, 'z', [[0, 0], [0, 0.003], [z1 - z0, 0.003], [z1 - z0, 0]], [x, y, z0]);
[

  // An electric oven's door, 660 mm wide, 480 mm tall and 50 mm thick, laid face up with its top edge toward
  // +z: an enamelled steel frame round a smoked double-glass window, a bar handle on two posts near the top
  // and the two hinge arms that once held it to the cabinet sticking out from the bottom edge.
  h.compound('oven_door', 10, [
    box('frame', 'frame', [-0.33, 0, -0.24], [0.33, 0.05, 0.24]),
    box('window', 'window', [-0.22, 0.05, -0.15], [0.22, 0.052, 0.13]),
    box('inner-glass', 'window', [-0.24, -0.002, -0.17], [0.24, 0, 0.15]),
    box('post-a', 'handle', [-0.25, 0.05, 0.19], [-0.23, 0.08, 0.21]),
    box('post-b', 'handle', [0.23, 0.05, 0.19], [0.25, 0.08, 0.21]),
    turned('handle', 'handle', 'x', [[0, 0], [0, 0.012], [0.54, 0.012], [0.54, 0]], [-0.27, 0.088, 0.2]),
    box('hinge-a', 'hinge', [-0.29, 0.012, -0.32], [-0.27, 0.03, -0.2]),
    box('hinge-b', 'hinge', [0.27, 0.012, -0.32], [0.29, 0.03, -0.2]),
  ], { frame: 'paint-charcoal', window: 'glass-grey', handle: 'steel-stainless', hinge: 'steel-grey' })
  + { voxelGrain: 0.006 },

  // A tower shield cut from the oven door: every piece, finish, mass and grain of the door, kept as its own row so the
  // shield can be tuned toward a shield's look without changing the door.
  h.compound('tower_shield', 10, [
    box('frame', 'frame', [-0.33, 0, -0.24], [0.33, 0.05, 0.24]),
    box('window', 'window', [-0.22, 0.05, -0.15], [0.22, 0.052, 0.13]),
    box('inner-glass', 'window', [-0.24, -0.002, -0.17], [0.24, 0, 0.15]),
    box('post-a', 'handle', [-0.25, 0.05, 0.19], [-0.23, 0.08, 0.21]),
    box('post-b', 'handle', [0.23, 0.05, 0.19], [0.25, 0.08, 0.21]),
    turned('handle', 'handle', 'x', [[0, 0], [0, 0.012], [0.54, 0.012], [0.54, 0]], [-0.27, 0.088, 0.2]),
    box('hinge-a', 'hinge', [-0.29, 0.012, -0.32], [-0.27, 0.03, -0.2]),
    box('hinge-b', 'hinge', [0.27, 0.012, -0.32], [0.29, 0.03, -0.2]),
  ], { frame: 'paint-charcoal', window: 'glass-grey', handle: 'steel-stainless', hinge: 'steel-grey' })
  + { voxelGrain: 0.006 },

  // A kite shield made from the oven door: the same slab, face and back in the same frame, finish and size, its lower
  // end (+x, the end that hangs down when the figure braces it) chamfered off to a point, the hinges dropped and the
  // handle turned into a rib down the middle of the face on two posts. The long axis is x, the face is +y.
  local top = -0.33;  // the door's half length: the flat upper edge
  local tip = 0.33;  // the point
  local shoulder = 0.02;  // where the sides start to taper
  local half = 0.24;  // the door's half width
  // The kite outline inset by `inset` from the slab's, as the [z, x] points a prism along y takes.
  local kite(inset) = [[-half + inset, top + inset], [half - inset, top + inset], [half - inset, shoulder], [0, tip - inset * 1.8], [-half + inset, shoulder]];
  h.compound('kite_shield', 8, [
    h.prism('frame', 'frame', 'y', kite(0), 0, 0.05),
    h.prism('window', 'window', 'y', kite(0.05), 0.05, 0.052),
    h.prism('inner-glass', 'window', 'y', kite(0.03), -0.002, 0),
    box('post-a', 'handle', [-0.25, 0.05, -0.01], [-0.23, 0.08, 0.01]),
    box('post-b', 'handle', [0.15, 0.05, -0.01], [0.17, 0.08, 0.01]),
    h.rod('handle', 'handle', 0.012, -0.27, 0.19, 0.088),
  ], { frame: 'paint-charcoal', window: 'glass-grey', handle: 'steel-stainless' })
  + { voxelGrain: 0.006 },
]
