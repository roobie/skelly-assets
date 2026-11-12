local h = import '../tools/packages/thing-authoring-tool/compound.libsonnet';
local box = h.box;

// The body the bolt guns share: a slab receiver, the pistol grip and trigger group, the butt stock, the paints and
// the row around them. One source keeps the three guns one family, so a change to the shared body reaches all of
// them; each gun's file keeps only what sets it apart. Laid out with the muzzle at +x, the axis `gripOn` names.
{
  // The receiver from the butt joint at x = -0.18 to `front`, `y0` to `y1`, `w` its half width, with a top ridge
  // `ridge` = [front, top, half width] and a painted band round it.
  receiver(front, y0, y1, w, ridge): [
    box('receiver', 'body', [-0.18, y0, -w], [front, y1, w]),
    box('ridge', 'body', [-0.16, y1, -ridge[2]], [ridge[0], ridge[1], ridge[2]]),
    box('receiver-band', 'accent', [-0.04, y0, -w - 0.003], [0.0, y1, w + 0.003]),
  ],

  // The pistol grip, trigger guard and trigger hung under a receiver whose underside is at `top`.
  grip(top): [
    h.prism('grip', 'grip', 'z', [[-0.13, top], [-0.07, top], [-0.10, 0.03], [-0.155, 0.03]], -0.026, 0.026),
    box('guard', 'metal', [-0.075, top - 0.045, -0.008], [0.005, top - 0.033, 0.008]),
    box('guard-front', 'metal', [-0.005, top - 0.045, -0.008], [0.005, top, 0.008]),
    box('trigger', 'metal', [-0.045, top - 0.033, -0.005], [-0.033, top - 0.002, 0.005]),
  ],

  // A stubby butt with a rubber pad, its top at `top` and `w` its half width.
  stock(top, w): [
    h.prism('butt', 'body', 'z', [[-0.18, 0.16], [-0.18, top], [-0.27, top - 0.005], [-0.30, 0.30], [-0.30, 0.15], [-0.27, 0.135]], -w, w),
    box('butt-pad', 'grip', [-0.32, 0.14, -w - 0.002], [-0.30, 0.31, w + 0.002]),
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
