local h = import '../tools/packages/thing-authoring-tool/compound.libsonnet';
local box = h.box;

// The body the bolt guns share: a bevelled slab receiver, the pistol grip and trigger group, the skeleton stock, the
// paints and the row around them. One source keeps the three guns one family, so a change to the shared body reaches
// all of them; each gun's file keeps only what sets it apart. Laid out with the muzzle at +x, the axis `gripOn` names.
{
  // Where the receiver's back meets the stock.
  joint: -0.18,
  // The x at which the trigger guard's front ends, which anything hung ahead of the grip must clear.
  guardFront: 0.005,

  // A section from `y0` to `y1`, `w` its half width, its top edges cut back by `top` and its bottom edges by
  // `bottom`, as the [y, z] outline of a prism along x. Cut edges keep the chunky slabs from reading as raw boxes.
  bevel(y0, y1, w, top, bottom=top): [
    [y0, -w + bottom], [y0, w - bottom], [y0 + bottom, w], [y1 - top, w],
    [y1, w - top], [y1, -w + top], [y1 - top, -w], [y0 + bottom, -w],
  ],

  // The receiver from the stock joint to `front`, `y0` to `y1`, `w` its half width, with a top ridge running to
  // `ridge.front`, rising to `ridge.top`, `ridge.halfWidth` its half width, and a painted band round it.
  receiver(front, y0, y1, w, ridge): [
    h.prism('receiver', 'body', 'x', $.bevel(y0, y1, w, 0.016, 0.01), $.joint, front),
    h.prism('ridge', 'body', 'x', [[y1, -ridge.halfWidth], [y1, ridge.halfWidth], [ridge.top, ridge.halfWidth - 0.008], [ridge.top, -ridge.halfWidth + 0.008]], -0.16, ridge.front),
    h.prism('receiver-band', 'accent', 'x', $.bevel(y0 - 0.003, y1 + 0.003, w + 0.003, 0.018, 0.012), -0.04, 0.0),
  ],

  // The pistol grip with a flared cap, trigger guard and trigger, hung from height `top`, at or just inside the
  // receiver's underside.
  grip(top): [
    h.prism('grip', 'grip', 'z', [[-0.13, top], [-0.07, top], [-0.10, 0.03], [-0.155, 0.03]], -0.026, 0.026),
    h.prism('grip-cap', 'body', 'z', [[-0.16, 0.034], [-0.096, 0.034], [-0.093, 0.024], [-0.1, 0.016], [-0.158, 0.016], [-0.164, 0.024]], -0.03, 0.03),
    box('guard', 'metal', [-0.075, top - 0.045, -0.008], [0.005, top - 0.033, 0.008]),
    box('guard-front', 'metal', [-0.005, top - 0.045, -0.008], [$.guardFront, top, 0.008]),
    box('trigger', 'metal', [-0.045, top - 0.033, -0.005], [-0.033, top - 0.002, 0.005]),
  ],

  // The stock's size against its outline, so the stock is resized in one place without redrawing it.
  stockScale: 0.9,
  // How far the comb's top sits below the receiver's top, so the receiver stands proud over the stock on every gun.
  stockDrop: 0.015,

  // A skeleton stock from the stock joint to a butt plate and rubber pad: a wrist, a raised comb with rubber cheek
  // pads, a toe strut along the stock's underside, and the open window between them, its sides raked as the grip is.
  // `receiverTop` is the height of the receiver's top, which sets the comb's; `w` is the outline's half width.
  stock(receiverTop, w):
    // The outline is drawn about the comb's top over the stock joint, x running back from the joint and y up from the
    // comb, and placed by `at`.
    local at(x, y) = [$.joint + x * $.stockScale, receiverTop - $.stockDrop + y * $.stockScale];
    local outline(points) = [at(p[0], p[1]) for p in points];
    local across(z) = z * $.stockScale;
    // The underside, one straight line from the wrist to the toe.
    local under(x) = -0.182 + x * 0.24;
    // A window side from the underside at `foot` up to height `y`, raked as the grip.
    local side(foot, y) = { foot: [foot, under(foot)], head: [foot + (y - under(foot)) * 0.2, y] };
    // The point of a side at height `y`.
    local on(s, y) = [s.foot[0] + (s.head[0] - s.foot[0]) * (y - s.foot[1]) / (s.head[1] - s.foot[1]), y];
    local wrist = -0.017, heel = -0.205, strut = 0.04, combFoot = -0.087;
    local front = side(-0.075, wrist), back = side(-0.165, 0);
    local slab(id, slot, points, half) = h.prism(id, slot, 'z', outline(points), across(-half), across(half));
    [
      slab('stock-wrist', 'body', [[0, under(0)], [0, wrist], front.head, front.foot], w),
      slab('comb', 'body', [on(front, combFoot), front.head, [front.head[0] - 0.03, 0], back.head, on(back, combFoot)], w),
      slab('toe', 'body', [front.foot, on(front, front.foot[1] + strut), on(back, back.foot[1] + strut), back.foot], w),
      slab('butt', 'body', [back.foot, back.head, [heel, -0.004], [heel, under(heel)]], w),
      slab('butt-plate', 'trim', [[heel, under(heel) - 0.006], [heel, 0.002], [heel - 0.007, 0.002], [heel - 0.007, under(heel) - 0.006]], w + 0.003),
      slab('butt-pad', 'grip', [
        [heel - 0.007, under(heel) - 0.004], [heel - 0.007, 0], [heel - 0.02, -0.004],
        [heel - 0.03, -0.02], [heel - 0.03, under(heel) + 0.012], [heel - 0.02, under(heel) - 0.002],
      ], w + 0.001),
    ] + [
      local face = if s == 'r' then [w, w + 0.003] else [-w - 0.003, -w];
      box('cheek-pad-%s' % s, 'grip', at(-0.15, -0.072) + [across(face[0])], at(-0.10, -0.008) + [across(face[1])])
      for s in ['l', 'r']
    ],

  // The gun's row: its pieces welded into one part, painted in the family's colours plus `finish`, held by the grip.
  gun(id, massKg, weapon, pieces, finish={}):
    h.compound(id, massKg, pieces, {
      body: 'paint-charcoal',
      accent: 'paint-oxblood',
      trim: 'brass',
      metal: 'steel-parkerized',
      vent: 'rubber-black',
      grip: 'rubber-black',
    } + finish) + h.gripOn(id, 'grip') + {
      taxonomy: { category: 'weapons', tags: { weapon: [weapon], setting: ['sci-fi'] } },
      voxelGrain: 0.004,
    },
}
