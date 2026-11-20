// The fitted worn family: each template builds an item's worn shells around the player body's measures, so a
// garment's worn look is a short spec beside its ground row rather than hand-placed geometry. Each template returns
// `rows`, the worn models for the export, so the segment, frame and coverage contract has one source: each shell's
// coverage is declared once, on `shell`.
local h = import 'compound.libsonnet';
local bust = import 'models/measures/bust.libsonnet';
local arm = import 'models/measures/arm.libsonnet';
local leg = import 'models/measures/leg.libsonnet';
local hand = import 'models/measures/hand.libsonnet';

// How far each layer stands off the skin. An outer layer clears every inner one on the same segment.
local layers = { under: 0.003, normal: 0.012, over: 0.024, cloak: 0.036 };

// The plan outline of an octagon `w` across x and `d` along z, corners cut by `c`, as a y prism's [z, x] points.
local outline(w, d, c) = [
  [-d / 2 + c, -w / 2], [d / 2 - c, -w / 2], [d / 2, -w / 2 + c], [d / 2, w / 2 - c],
  [d / 2 - c, w / 2], [-d / 2 + c, w / 2], [-d / 2, w / 2 - c], [-d / 2, -w / 2 + c],
];

// An upright octagonal shell from y0 to y1, `w` across x and `d` along z, corners cut by `c`.
local oct(id, slot, y0, y1, w, d, c, cx=0, cz=0) = h.prism(id, slot, 'y', [[p[0] + cz, p[1] + cx] for p in outline(w, d, c)], y0, y1);

// How far out from the thigh's centre line a thigh piece may reach on its outer side, a few millimetres short of the
// hand hanging beside the thigh at rest, which a bulkier piece would sink into.
local handClear = 0.125;
// An `oct` whose outer side (local -x: the right leg is the reference, the left its mirror) stops at `handClear`, while
// its inner side and its depth keep their bulk.
local besideHand(id, slot, y0, y1, w, d, c) = oct(id, slot, y0, y1, w / 2 + handClear, d, c, (w / 2 - handClear) / 2);

// A chamfered outline set out by `g` stays parallel when its cut grows by g (2 - sqrt 2).
local around(c, g) = c + g * (2 - std.sqrt(2));

// An open octagonal band, `wall` thick inside the outline of `oct`, as one prism per side, since prisms must be
// convex. Its open middle lets a body part rise through it without the band passing through that part.
local ring(id, slot, y0, y1, w, d, c, wall) =
  local outer = outline(w, d, c), inner = outline(w - 2 * wall, d - 2 * wall, around(c, -wall));
  [
    h.prism('%s-%d' % [id, i], slot, 'y', [inner[i], outer[i], outer[(i + 1) % 8], inner[(i + 1) % 8]], y0, y1)
    for i in std.range(0, 7)
  ];

// The shoulders as the bust draws them (src/families/bust.ts), so a shell over them follows the body's own shape: the
// girdle's top sloping off the neck's foot, and the deltoid spheroid on each side.
local chestTop = bust.pelvisHeight + bust.waistHeight + bust.ribHeight + bust.chestHeight;
local neckFoot = bust.neckWidth / 2;
local slopeRun = bust.chestWidth / 2 - neckFoot;
local slopeLength = std.sqrt(slopeRun * slopeRun + bust.trapeziusDrop * bust.trapeziusDrop);
local deltoid = {
  x: bust.chestWidth / 2 + bust.shoulderWidth / 2 - bust.deltoidInset,
  y: chestTop - bust.shoulderHeight / 2 - bust.deltoidDrop,
  halfAxial: bust.shoulderWidth / 2,
  radius: std.min(bust.shoulderHeight, bust.shoulderDepth) / 2,
};
// Where the arm's inner face hangs, beside the chest, under the deltoid it is centred on.
local armInner = deltoid.x - arm.upperWidth / 2;
// The clip planes that cut a piece to the slope set out `rise` square to it, one per side.
local trapezius(rise) = [
  { normal: [side * bust.trapeziusDrop / slopeLength, slopeRun / slopeLength, 0],
    offset: (bust.trapeziusDrop * neckFoot + slopeRun * chestTop) / slopeLength + rise }
  for side in [1, -1]
];
// The slope's height set out by `rise` at `x`, which must lie past the neck's foot, where the slope is straight.
local slopeY(x, rise) =
  assert std.abs(x) >= neckFoot - 1e-9 : 'x %g lies over the neck, off the slope' % x;
  chestTop - bust.trapeziusDrop * (std.abs(x) - neckFoot) / slopeRun + rise * slopeLength / slopeRun;
// The deltoid's top set out by `rise` at `x`, or null past its reach.
local deltoidY(x, rise) =
  local a = deltoid.halfAxial + rise, u = (std.abs(x) - deltoid.x) / a;
  if std.abs(u) >= 1 then null else deltoid.y + (deltoid.radius + rise) * std.sqrt(1 - u * u);
// The highest the shoulder, slope or deltoid, set out by `rise` reaches over [x0, x1] on one side: the slope falls
// outward, so it is highest at the inner end, and the deltoid at its centre.
local shoulderY(xs, rise) =
  local inner = std.min(std.abs(xs[0]), std.abs(xs[1])), outer = std.max(std.abs(xs[0]), std.abs(xs[1]));
  local over = [inner, outer] + (if inner < deltoid.x && deltoid.x < outer then [deltoid.x] else []);
  std.foldl(std.max, [slopeY(inner, rise)] + [y for y in [deltoidY(x, rise) for x in over] if y != null], -1e9);
// A z prism across [x0, x1] whose bottom and top at x are `low(x)` and `high(x)`, straight lines each, as a strap lying
// over the slope is.
local slopeQuad(id, slot, xs, zs, low, high) =
  h.prism(id, slot, 'z', [[xs[0], low(xs[0])], [xs[1], low(xs[1])], [xs[1], high(xs[1])], [xs[0], high(xs[0])]], zs[0], zs[1]);
// A spheroid over the deltoid on `side` (1 the figure's left, +x), set out by `rise`. Its sides' flats lie on the
// set-out spheroid, and it is turned in finer steps than the body's, so it clears the body's facets.
local deltoidCap(id, slot, side, rise, steps=16) =
  local a = deltoid.halfAxial + rise, b = deltoid.radius + rise;
  h.turned(id, slot, 'x', [[0, 0]] + [
    local t = std.pi * i / steps;
    [a * (1 - std.cos(t)), b * std.sin(t)]
    for i in std.range(1, steps - 1)
  ] + [[2 * a, 0]], [side * deltoid.x - a, deltoid.y, 0]) + { sides: 16 };

// A hood lying down on the upper back, sunk a centimetre into the body shell, its lining showing at the open top.
// A shallow hood's corners and lining shrink with it, so its outlines stay convex. Both follow the trapezius's slope,
// so gear over the shoulders clears them; the lining's foot sinks into the hood as far as the slope drops under it.
local hood(slot, lining, chestD, depth) =
  local cz = -chestD / 2 + 0.01 - depth / 2;
  local liningD = depth - 2 * std.min(0.0125, depth / 4);
  local top = 0.03, liningT = 0.006, liningW = 0.22;
  [
    oct('hood', slot, chestTop - 0.2, chestTop + top - liningT, 0.26, depth, std.min(0.025, depth / 3), cz=cz)
    + { clip: trapezius(top - liningT) },
    oct('hood-lining', lining, slopeY(liningW / 2, top - 2 * liningT), chestTop + top, liningW, liningD, std.min(0.02, liningD / 3), cz=cz)
    + { clip: trapezius(top) },
  ];

local row(id, pieces, finish) = h.compound(id, 0.1, pieces, finish) + { voxelGrain: 0.004 };

// A worn shell's row. `covers` names the doll parts or regions the shell encloses at rest, which a consumer stops
// drawing while it is worn, so it lists nothing the shell leaves showing. No upper sleeve encloses its part: the elbow's
// cap reaches below the sleeve's end, where the fore sleeve takes over.
// A shell is titled for its garment and the part it covers, as `named(garment title, part label)`; the label is
// authored beside the shell it names. A template given no garment title leaves its shells untitled.
local named(garment, label) = if garment == null then null else garment + ', ' + label;
local shell(model, pieces, finish, covers, title=null) =
  row(model, pieces, finish) + (if covers == [] then {} else { covers: covers }) + (if title == null then {} else { title: title });
local fitted(shells) = { rows: shells };

// Where a torso shell's hem falls on the bust, from the hips' bottom.
local hems = { hip: 0.04, waist: 0.17, thigh: -0.1 };

{
  layers: layers,
  oct: oct,
  handClear: handClear,
  besideHand: besideHand,
  // A fitted row drawn from other pieces, at voxel grain `grain`, that keeps what the row declares: its title, what it
  // covers and its sole lift. A set restyling a template's shells keeps their enclosure, so their declarations stand;
  // the showcase build's check refuses one a restyle opens (docs/decisions/0012-hidden-body.md).
  refit(r, pieces, grain=0.004):: row(r.id, pieces, r.parts[0].finish) + { voxelGrain: grain }
                                  + { [k]: r[k] for k in ['title', 'covers', 'soleLift'] if std.objectHas(r, k) },

  // A shell over the shoulders follows the bust's: `trapezius(rise)` cuts a piece to the slope set out by `rise`,
  // `deltoidCap` covers a deltoid, and `slopeY`, `shoulderY` and the straps below seat gear on them, so all of it
  // follows the body as its measures change.
  trapezius: trapezius,
  slopeY: slopeY,
  shoulderY: shoulderY,
  deltoidCap: deltoidCap,
  // A strap across [x0, x1] and `zs` lying over the slope, between it set out by `rises[0]` and by `rises[1]`.
  slopeBand(id, slot, xs, zs, rises):: slopeQuad(id, slot, xs, zs, function(x) slopeY(x, rises[0]), function(x) slopeY(x, rises[1])),
  // A strap across [x0, x1] and `zs` hanging down a face from the slope set out by `rise` to the height `foot`.
  slopeHung(id, slot, xs, zs, foot, rise):: slopeQuad(id, slot, xs, zs, function(x) foot, function(x) slopeY(x, rise)),

  // The torso shell's levels for `layer`, in the bust's frame from the hips' bottom, each corner cut by `chamfer`
  // grown by `round`. One level covers the hips and waist, as wide as the wider of them. Gear worn over a torso shell
  // is seated on these (models/kits/worn-carry.libsonnet), so it follows the shell as the body changes.
  torsoLevels(layer, round=0)::
    local g = layers[layer];
    local waistTop = bust.pelvisHeight + bust.waistHeight;
    local ribTop = waistTop + bust.ribHeight;
    local cut = bust.torsoChamfer / 2 + round;
    local low = { width: std.max(bust.pelvisWidth, bust.waistWidth) + 2 * g, depth: std.max(bust.pelvisDepth, bust.waistDepth) + 2 * g, chamfer: cut };
    {
      pelvis: low { y: [0, bust.pelvisHeight] },
      waist: low { y: [bust.pelvisHeight, waistTop] },
      ribs: { y: [waistTop, ribTop], width: bust.ribWidth + 2 * g, depth: bust.ribDepth + 2 * g, chamfer: cut },
      // The chest level stands off the body's top by the layer, so no face lies on it: flat over the neck's foot and
      // cut to the slope by `trapezius(rise)` beyond it.
      chest: { y: [ribTop, chestTop + g], rise: g, width: bust.chestWidth + 2 * g, depth: bust.chestDepth + 2 * g, chamfer: bust.chestChamfer / 2 + round },
    },

  // A jacket, shirt, hoodie or coat: a body shell over the bust and, unless `sleeves` is 'none', upper and fore
  // sleeves. `sleeveLayer`, by default the body's, lets a loose body keep close sleeves, so a hanging arm's sleeve
  // stays clear of the hips. `round` softens every corner, for a garment of soft cloth. `hood` lays a hood `hood` deep on the back.
  // `pockets` are 'welt' slits at the hips, a 'patch' pocket either side of the closure, a 'kangaroo' pocket across
  // the belly, or 'none'. `top` 'yoke' covers the shoulders, the chest cut to the trapezius's slope and a cap over
  // each deltoid, under a collar; 'straps' cuts the body off at a neckline between the trunk's top and the shoulders,
  // held up by a strap over each trapezius, for a tank top, and draws no collar. `slots` names the ground row's finish slots the shells reuse: `body`, `trim` and `fastener`,
  // and with a hood `hood` and `lining`.
  torso(id, finish, spec, title=null)::
    local s = { layer: 'normal', sleeveLayer: self.layer, hem: 'hip', top: 'yoke', round: 0, sleeves: 'long', collar: 'band', zipX: 0, belt: false, pockets: 'welt', hood: null,
                slots: { body: 'cloth', trim: 'cloth', fastener: 'zip' } } + spec;
    assert std.member(['yoke', 'straps'], s.top) : 'torso %s: top %s is neither yoke nor straps' % [id, s.top];
    local straps = s.top == 'straps';
    local g = layers[s.layer];
    local sl = s.slots;
    local l = self.torsoLevels(s.layer, s.round);
    local hem = hems[s.hem];
    local neckline = l.ribs.y[1] + 0.65 * bust.chestHeight;
    local bodyTop = if straps then neckline else l.chest.y[1];
    // A sleeveless body's sides stand inside the hanging arm, so the arm's skin never lies over them, and stop just
    // above the armpit; above it only a front and a back panel, clear of the arm, rise to the neckline.
    local armpit = l.ribs.y[1] + bust.armpit * bust.chestHeight + g;
    local chest = if straps then l.chest { width: 2 * (armInner - g) } else l.chest;
    local panel(name, side) =
      local w = chest.width, d = chest.depth, c = chest.chamfer, inner = arm.upperDepth / 2 + g;
      local front = [[inner, -w / 2], [d / 2 - c, -w / 2], [d / 2, -w / 2 + c], [d / 2, w / 2 - c], [d / 2 - c, w / 2], [inner, w / 2]];
      h.prism('panel-' + name, sl.body, 'y', if side > 0 then front else std.reverse([[-p[0], p[1]] for p in front]), armpit, neckline);
    local collar = if straps then 'none' else s.collar;
    local level(id, v, y0, y1) = oct(id, sl.body, y0, y1, v.width, v.depth, v.chamfer);
    local front(y) = (if y < l.waist.y[1] then l.waist else if y < l.ribs.y[1] then l.ribs else l.chest).depth / 2;
    local lowFront = l.waist.depth / 2;
    local pocketReach = l.waist.width / 2 - 0.03;
    local sideName(side) = if side < 0 then 'l' else 'r';
    local pockets = {
      none: [],
      welt: [
        h.box('pocket-' + sideName(side), sl.fastener, [side * 0.13 - 0.04, 0.2, lowFront], [side * 0.13 + 0.04, 0.208, lowFront + 0.004])
        for side in [-1, 1]
      ],
      patch: [
        local xs = [side * 0.04, side * pocketReach];
        h.box('pocket-' + sideName(side), sl.trim, [std.min(xs[0], xs[1]), l.waist.y[1] - 0.18, lowFront], [std.max(xs[0], xs[1]), l.waist.y[1] - 0.09, lowFront + 0.006])
        for side in [-1, 1]
      ],
      kangaroo: [h.box('pocket', sl.trim, [-pocketReach, l.waist.y[1] - 0.16, lowFront], [pocketReach, l.waist.y[1] - 0.07, lowFront + 0.006])],
    };
    // A strap lies on the chest's front and back faces and over the trapezius, following its slope.
    local strapX = bust.chestWidth / 4, strapHalf = 0.018, strapT = 0.006;
    local strapFace = l.chest.depth / 2;
    local strap(name, side) =
      local xs = [side * strapX - strapHalf, side * strapX + strapHalf];
      [
        $.slopeHung('strap-front-' + name, sl.trim, xs, [strapFace - strapT, strapFace], neckline - 0.01, g + strapT),
        $.slopeBand('strap-top-' + name, sl.trim, xs, [-strapFace, strapFace], [g, g + strapT]),
        $.slopeHung('strap-back-' + name, sl.trim, xs, [-strapFace, -strapFace + strapT], neckline - 0.01, g + strapT),
      ];
    local body = [
      level('low', l.waist, hem, l.waist.y[1]),
      level('ribs', l.ribs, l.ribs.y[0] - 0.01, l.ribs.y[1]),
    ] + (if straps then [
      level('chest', chest, l.chest.y[0] - 0.01, armpit),
      panel('front', 1),
      panel('back', -1),
    ] + strap('l', -1) + strap('r', 1) else [
      level('chest', chest, l.chest.y[0] - 0.01, bodyTop) + { clip: trapezius(l.chest.rise) },
      deltoidCap('shoulder-left', sl.body, 1, g),
      deltoidCap('shoulder-right', sl.body, -1, g),
    ]) + (if collar == 'none' then [] else [
      oct('collar', sl.trim, chestTop - 0.01, chestTop + 0.05, bust.neckWidth + 0.06, bust.neckWidth + 0.06, 0.02, cz=-0.01),
    ]) + (if collar == 'lapel' then [
      h.prism('lapel-' + side, sl.trim, 'z', [[side * 0.03, chestTop], [side * 0.13, chestTop - 0.02], [side * 0.04, chestTop - 0.15]],
              l.chest.depth / 2, l.chest.depth / 2 + 0.008)
      for side in [-1, 1]
    ] else []) + (if s.zipX == null then [] else [
      // The closure runs down each level's front face.
      h.box('zip-' + v[0], sl.fastener, [s.zipX - 0.005, v[1], front(v[1])], [s.zipX + 0.005, v[2], front(v[1]) + 0.004])
      for v in [['low', hem, l.waist.y[1]], ['ribs', l.ribs.y[0], l.ribs.y[1]], ['chest', l.chest.y[0], bodyTop - 0.02]]
    ]) + pockets[s.pockets] + (if s.belt then [
      oct('belt', sl.body, hem, hem + 0.035, l.waist.width + 0.008, l.waist.depth + 0.008, l.waist.chamfer),
      h.box('buckle', sl.fastener, [0.1, hem + 0.002, lowFront + 0.004], [0.135, hem + 0.033, lowFront + 0.008]),
    ] else []) + (if s.hood == null then [] else hood(sl.hood, sl.lining, l.chest.depth, s.hood));
    // The sleeve's head covers the deltoid, so its depth follows the shoulder's rather than the arm's.
    local gs = layers[s.sleeveLayer];
    local upper = [oct('sleeve', sl.body, -arm.upperLength - arm.seamOverlap, 0.03, arm.upperWidth + 2 * gs + 0.01, bust.shoulderDepth + 2 * gs, 0.02 + s.round)];
    // The cuff reaches past the wrist, so its end does not lie on the forearm's.
    local fore = [
      oct('sleeve', sl.body, -arm.foreLength + 0.01, arm.seamOverlap, arm.foreWidth + 2 * gs + 0.008, arm.upperDepth + 2 * gs + 0.004, 0.02 + s.round),
      oct('cuff', sl.trim, -arm.foreLength - 0.004, -arm.foreLength + 0.03, arm.foreWidth + 2 * gs + 0.012, arm.upperDepth + 2 * gs + 0.008, 0.02 + s.round),
    ];
    fitted([shell(id + '_worn_body', body, finish, if straps then ['trunk'] else ['torso'], title=named(title, 'body'))]
           + (if s.sleeves == 'none' then [] else [
                shell(id + '_worn_upper', upper, finish, [], title=named(title, 'upper sleeve')),
                shell(id + '_worn_fore', fore, finish, ['fore'], title=named(title, 'forearm sleeve')),
              ])),

  // A long robe: a body shell from the waist up, with a hood lying on the back; a pelvis shell over the hips, with a
  // cord round them, so the robe's lower part stays with the legs when a game twists the chest off the hips; wide
  // sleeves that hug the arm on the body side, so a hanging arm's sleeve clears the hips, and flare outwards and fore
  // and aft; and the skirt as a bell on each thigh and shin, since a skirt hung from the hips would have to stand far
  // out fore and aft to hold a striding leg. `hem` is how far below the knee the skirt falls. `stars` are [x, y] on
  // the chest's front and `moon` the [x, y, radius] of a crescent there. `slots` names the ground row's finish slots:
  // `cloth`, `hood`, `lining` and `trim`.
  robe(id, finish, spec, title=null)::
    local s = { layer: 'normal', hem: 0.22, stars: [], moon: null,
                slots: { cloth: 'cloth', hood: 'hood', lining: 'lining', trim: 'gold' } } + spec;
    local g = layers[s.layer], sl = s.slots;
    local cut = bust.torsoChamfer / 2;
    local waistTop = bust.pelvisHeight + bust.waistHeight;
    local ribTop = waistTop + bust.ribHeight;
    local lowW = bust.pelvisWidth + 2 * g, lowD = bust.pelvisDepth + 2 * g;
    local chestW = bust.chestWidth + 2 * g, chestD = bust.chestDepth + 2 * g;
    // The pelvis shell's hem covers the tops of the thigh bells however far a leg swings. The cord sits below the
    // body shell's overlap, so a twisted waist does not cut through it.
    local hem = -0.08;
    local cordY = bust.pelvisHeight - 0.04;
    local star(i, p) = [
      h.box('star-%d-a' % i, sl.trim, [p[0] - 0.014, p[1] - 0.004, chestD / 2], [p[0] + 0.014, p[1] + 0.004, chestD / 2 + 0.003]),
      h.box('star-%d-b' % i, sl.trim, [p[0] - 0.004, p[1] - 0.014, chestD / 2], [p[0] + 0.004, p[1] + 0.014, chestD / 2 + 0.003]),
    ];
    // A crescent upright on the chest's front, built from convex quads because prisms must be convex.
    local moon(m) =
      local steps = 6, a0 = 200, a1 = 340;
      local ang(i) = (a0 + (a1 - a0) * i / steps) * std.pi / 180;
      local pt(r, i) = [m[0] + r * std.sin(ang(i)), m[1] + r * std.cos(ang(i))];
      [
        h.prism('moon-%d' % i, sl.trim, 'z', [pt(m[2], i), pt(m[2], i + 1), pt(m[2] * 0.6, i + 1), pt(m[2] * 0.6, i)], chestD / 2, chestD / 2 + 0.003)
        for i in std.range(0, steps - 1)
      ];
    local pelvis = [
      oct('hips', sl.cloth, hem, bust.pelvisHeight + 0.01, lowW, lowD, cut),
      oct('cord', sl.trim, cordY, cordY + 0.014, lowW + 0.01, lowD + 0.01, cut),
    ] + [
      h.box('cord-end-%d' % i, sl.trim, [0.05 + 0.025 * i, cordY - 0.16 + 0.03 * i, lowD / 2], [0.06 + 0.025 * i, cordY, lowD / 2 + 0.008])
      for i in [0, 1]
    ];
    local body = [
      oct('waist', sl.cloth, bust.pelvisHeight - 0.01, waistTop, bust.waistWidth + 2 * g, bust.waistDepth + 2 * g, cut),
      oct('ribs', sl.cloth, waistTop - 0.01, ribTop, bust.ribWidth + 2 * g, bust.ribDepth + 2 * g, cut),
      oct('chest', sl.cloth, ribTop - 0.01, chestTop + g, chestW, chestD, bust.chestChamfer / 2) + { clip: trapezius(g) },
      deltoidCap('shoulder-left', sl.cloth, 1, g),
      deltoidCap('shoulder-right', sl.cloth, -1, g),
      oct('collar', sl.trim, chestTop - 0.01, chestTop + 0.04, bust.neckWidth + 0.06, bust.neckWidth + 0.06, 0.02, cz=-0.01),
    ] + hood(sl.hood, sl.lining, chestD, 0.07) + std.flattenArrays([star(i, s.stars[i]) for i in std.range(0, std.length(s.stars) - 1)])
      + (if s.moon == null then [] else moon(s.moon));
    // On the model arm, a right arm, the body side is +x, so a sleeve flares towards -x.
    // The sleeve's head covers the deltoid, so its depth follows the shoulder's rather than the arm's.
    local uw = arm.upperWidth + 2 * g + 0.01, ud = bust.shoulderDepth + 2 * g;
    local upper = [
      oct('sleeve', sl.cloth, -arm.upperLength / 2, 0.03, uw, ud, 0.02),
      oct('sleeve-flare', sl.cloth, -arm.upperLength - arm.seamOverlap, -arm.upperLength / 2 + 0.01, uw + 0.02, ud + 0.03, 0.025, cx=-0.01),
    ];
    // The forearm sleeve widens in tiers to a bell past the wrist; each tier keeps its body-side face just off the
    // forearm, so the hanging sleeve clears the hip.
    local tiers = 4, reach = arm.foreLength + 0.02, inner = arm.foreWidth / 2 + 0.006;
    local tier(k) =
      local outer = arm.foreWidth / 2 + g + 0.02 * k;
      { y0: -reach * (k + 1) / tiers, y1: if k == 0 then arm.seamOverlap else -reach * k / tiers + 0.01,
        w: inner + outer, d: arm.upperDepth + 2 * g + 0.045 * k, cx: (inner - outer) / 2 };
    local last = tier(tiers - 1);
    local fore = [
      local t = tier(k);
      oct('sleeve-%d' % k, sl.cloth, t.y0, t.y1, t.w, t.d, 0.02, cx=t.cx)
      for k in std.range(0, tiers - 1)
    ] + [
      oct('cuff', sl.trim, -reach, -reach + 0.025, last.w + 0.008, last.d + 0.008, 0.022, cx=last.cx),
      oct('cuff-lining', sl.lining, -reach - 0.003, -reach + 0.003, last.w - 0.012, last.d - 0.012, 0.018, cx=last.cx),
    ];
    // The bells, turned about the leg, stay inside the hanging arm, which swings fore and aft but never sideways:
    // beside the sleeve the thigh's bell is narrower than the sleeve stands off the hip, and the pelvis shell covers
    // the thigh there. Below the sleeve it widens to just inside the hanging hand, below the fingertips it flares,
    // and the shin's bell flares on to the hem.
    // The shoulder joint is the deltoid cap's centre and each hip a quarter of the pelvis in from its side.
    local jointX = deltoid.x, jointY = deltoid.y;
    local hipX = bust.pelvisWidth / 4;
    local sleeveClear = jointX - inner - 0.012 - hipX;
    local handClear = jointX - arm.palmThickness / 2 - 0.006 - hipX;
    // Heights in the thigh's frame, taking the hip as the bust's base: the sleeve's end, lowest at its deep back edge,
    // which dips as the elbow bends, and the fingertips.
    local sleeveEnd = jointY - arm.upperLength - reach - 0.03;
    local fingertips = jointY - (arm.upperLength + arm.foreLength + arm.palmLength + arm.fingerLength);
    local bell(id, slot, rings) = h.turned(id, slot, 'y', [[rings[0][0], 0]] + rings + [[rings[std.length(rings) - 1][0], 0]]);
    local kneeR = handClear + 0.035, hemR = kneeR + 0.04;
    local thigh = [
      bell('skirt', sl.cloth, [[-leg.thighLength - 0.05, kneeR], [fingertips - 0.02, handClear], [hem - 0.01, handClear],
                               [sleeveEnd, sleeveClear], [0.03, sleeveClear - 0.01]]),
    ];
    local shin = [
      bell('skirt', sl.cloth, [[-s.hem, hemR], [0.06, kneeR - 0.015]]),
      bell('hem', sl.trim, [[-s.hem, hemR + 0.006], [-s.hem + 0.02, hemR + 0.006 - 0.004]]),
    ];
    // The thigh's bell is narrow by the hip, where the pelvis shell covers the leg, and the shin's ends at the hem, so
    // neither encloses its part.
    fitted([
      shell(id + '_worn_body', body, finish, ['torso'], title=named(title, 'body')),
      shell(id + '_worn_pelvis', pelvis, finish, ['pelvis'], title=named(title, 'hips')),
      shell(id + '_worn_upper', upper, finish, [], title=named(title, 'upper sleeve')),
      shell(id + '_worn_fore', fore, finish, ['fore'], title=named(title, 'forearm sleeve')),
      shell(id + '_worn_thigh', thigh, finish, [], title=named(title, 'thigh')),
      shell(id + '_worn_shin', shin, finish, [], title=named(title, 'shin')),
    ]),

  // Heavy trooper armour: a broad cuirass of stacked belly bands under a slab breastplate with a chevron, a high
  // collar open at the throat, a power pack with exhaust stacks on the back, a webbing belt with pouches and two
  // tasset lames; on the arms, oversized flat-topped pauldrons with a comb, and ribbed vambraces. `ground` is the
  // cuirass standing on the floor, for the item's ground model. Slots: `plate`, `trim`, `strap`, `rivet`, `insignia`.
  trooper(id, finish, spec={}, title=null)::
    local s = { layer: 'cloak' } + spec;
    local g = layers[s.layer];
    local cut = bust.torsoChamfer / 2;
    local waistTop = bust.pelvisHeight + bust.waistHeight;
    local ribTop = waistTop + bust.ribHeight;
    local chestTop = ribTop + bust.chestHeight;
    local lowW = bust.pelvisWidth + 2 * g, lowD = bust.pelvisDepth + 2 * g;
    local chestW = bust.chestWidth + 2 * g + 0.03, chestD = bust.chestDepth + 2 * g + 0.03;
    // The cuirass stands this far off the shoulders, low enough that its caps stay under the pauldrons' tops.
    local shoulderRise = 0.02;
    local bandBase = waistTop - 0.07;
    local front = chestD / 2, back = -chestD / 2;
    local slabFront = front + 0.012;
    local chevronY = ribTop + 0.05;
    local beltY = bandBase - 0.03;
    local body = [
      // Belly bands, each overlapping the one below and wider towards the chest.
      oct('band-%d' % i, 'plate', bandBase + i * 0.055, bandBase + i * 0.055 + 0.065,
          bust.waistWidth + 2 * g + 0.012 + 0.012 * i, bust.ribDepth + 2 * g + 0.006 + 0.008 * i, cut)
      for i in [0, 1, 2]
    ] + [
      oct('chest', 'plate', ribTop - 0.03, chestTop + shoulderRise, chestW, chestD, 0.05) + { clip: trapezius(shoulderRise) },
      deltoidCap('shoulder-left', 'plate', 1, shoulderRise),
      deltoidCap('shoulder-right', 'plate', -1, shoulderRise),
      h.prism('slab', 'plate', 'z', [[-0.16, ribTop - 0.02], [0.16, ribTop - 0.02], [0.19, chestTop - 0.03], [-0.19, chestTop - 0.03]],
              front - 0.004, slabFront),
    ] + [
      // The chevron, point down, as two convex arms.
      h.prism('chevron-%d' % i, 'insignia', 'z', [
        [side * 0.07, chevronY + 0.03], [0, chevronY - 0.02], [0, chevronY + 0.005], [side * 0.07, chevronY + 0.055],
      ], slabFront - 0.002, slabFront + 0.005)
      for i in [0, 1]
      for side in [[-1, 1][i]]
    ] + [
      // The collar wraps the back and sides of the neck, clear of the head, and stays open at the throat; a yellow
      // lip caps it.
      piece
      for c in [['collar', 'trim', 0.12, 0.098, 0.03, chestTop, chestTop + 0.085], ['collar-lip', 'insignia', 0.124, 0.096, 0.035, chestTop + 0.075, chestTop + 0.09]]
      for piece in [
        h.box(c[0] + '-back', c[1], [-c[2], c[5], -c[2]], [c[2], c[6], -c[3]]),
        h.box(c[0] + '-left', c[1], [-c[2], c[5], -c[3]], [-c[3], c[6], c[4]]),
        h.box(c[0] + '-right', c[1], [c[3], c[5], -c[3]], [c[2], c[6], c[4]]),
      ]
    ] + [
      // The power pack, finned at the back, its exhaust stacks rising past the shoulders.
      h.box('pack', 'plate', [-0.13, ribTop - 0.02, back - 0.1], [0.13, chestTop - 0.01, back + 0.01]),
    ] + [
      h.box('fin-%d' % i, 'trim', [-0.11, ribTop + 0.01 + i * 0.03, back - 0.115], [0.11, ribTop + 0.025 + i * 0.03, back - 0.1])
      for i in [0, 1, 2, 3]
    ] + [
      h.disc('stack-%d' % i, 'trim', 0.022, chestTop - 0.05, chestTop + 0.08, [-0.09, 0.09][i], back - 0.05)
      for i in [0, 1]
    ] + [
      h.disc('stack-cap-%d' % i, 'rivet', 0.027, chestTop + 0.08, chestTop + 0.092, [-0.09, 0.09][i], back - 0.05)
      for i in [0, 1]
    ] + [
      oct('belt', 'strap', beltY, beltY + 0.045, lowW + 0.01, lowD + 0.01, cut),
      h.box('buckle', 'rivet', [-0.025, beltY + 0.005, lowD / 2 + 0.004], [0.025, beltY + 0.04, lowD / 2 + 0.01]),
    ] + [
      h.box('pouch-%d' % i, 'strap', [[-0.18, 0.09][i], beltY - 0.02, lowD / 2], [[-0.09, 0.18][i], beltY + 0.05, lowD / 2 + 0.04])
      for i in [0, 1]
    ] + [
      oct('tasset-%d' % i, 'plate', beltY - 0.06 * (i + 1) - 0.01, beltY - 0.06 * i + 0.005, lowW + 0.02 + 0.01 * i, lowD + 0.02 + 0.01 * i, cut)
      for i in [0, 1]
    ] + [
      h.box('rivet-%d-%d' % [i, k], 'rivet', [[-0.16, 0.14, -0.01][k], ribTop - 0.02 + i * 0.1, slabFront - 0.002],
            [[-0.14, 0.16, 0.01][k], ribTop + i * 0.1, slabFront + 0.004])
      for i in [0, 1]
      for k in [0, 1]
    ];
    local uw = arm.upperWidth + 2 * g, ud = arm.upperDepth + 2 * g;
    local upper = [
      // The pauldron stands well proud of the shoulder: a flat top, a stepped plate, a comb and a broad rim.
      oct('pauldron', 'plate', -0.03, 0.07, uw + 0.15, ud + 0.13, 0.045),
      oct('pauldron-top', 'plate', 0.07, 0.085, uw + 0.12, ud + 0.1, 0.04),
      oct('pauldron-rim', 'insignia', -0.045, -0.03, uw + 0.158, ud + 0.138, 0.047),
      h.box('comb', 'trim', [-0.01, 0.085, -(ud + 0.09) / 2], [0.01, 0.11, (ud + 0.09) / 2]),
    ] + [
      oct('pauldron-lame-%d' % k, 'plate', -0.045 - k * 0.04, -0.035 - (k - 1) * 0.04, uw + 0.11 - 0.02 * k, ud + 0.09 - 0.02 * k, 0.035)
      for k in [1, 2]
    ] + [
      h.box('pauldron-rivet-%d' % i, 'rivet', [-0.04 + i * 0.04 - 0.006, 0.02, (ud + 0.13) / 2], [-0.04 + i * 0.04 + 0.006, 0.032, (ud + 0.13) / 2 + 0.005])
      for i in [0, 1, 2]
    ] + [
      oct('rerebrace', 'plate', -arm.upperLength - arm.seamOverlap, -0.12, uw + 0.012, ud + 0.012, 0.02),
    ];
    local fw = arm.foreWidth + 2 * g, fd = arm.upperDepth + 2 * g;
    local fore = [
      oct('couter', 'plate', -0.04, 0.04, fw + 0.04, fd + 0.04, 0.03),
      h.turned('couter-boss', 'trim', 'z', [[0, 0], [0, 0.03], [0.008, 0.024], [0.014, 0]], [0, 0, -(fd + 0.04) / 2 - 0.004]),
      oct('vambrace', 'plate', -arm.foreLength + 0.012, -0.035, fw + 0.016, fd + 0.014, 0.022),
    ] + [
      oct('vambrace-rib-%d' % i, 'trim', -0.08 - i * 0.05, -0.068 - i * 0.05, fw + 0.026, fd + 0.024, 0.022)
      for i in [0, 1, 2]
    ] + [
      oct('vambrace-rim', 'insignia', -arm.foreLength + 0.012, -arm.foreLength + 0.028, fw + 0.024, fd + 0.022, 0.022),
    ];
    // The vambrace stops short of the wrist. The body encloses the trunk but not the deltoid caps: the pauldrons over
    // them ride the upper arm, a different part copy, so the shoulders stay drawn.
    fitted([
      shell(id + '_worn_body', body, finish, ['trunk'], title=named(title, 'body')),
      shell(id + '_worn_upper', upper, finish, [], title=named(title, 'upper arm')),
      shell(id + '_worn_fore', fore, finish, [], title=named(title, 'forearm')),
    ]) + { ground: h.lifted(body, -(beltY - 0.13)) },

  // Heavy trooper leg armour: thick cuisses with a front plate, a square knee guard over a domed cop, and greaves with
  // a front ridge. `ground` stands one thigh and shin on the floor. Slots as `trooper`.
  trooperLegs(id, finish, spec={}, title=null)::
    local s = { layer: 'cloak' } + spec;
    local g = layers[s.layer];
    local shinLength = leg.length - leg.thighLength - leg.shoeHeight;
    local tw = leg.thighWidth + 2 * g, td = leg.thighDepth + 2 * g;
    local sw = leg.shinWidth + 2 * g, sd = leg.shinDepth + 2 * g;
    local kneeD = sd + 0.035;
    local thigh = [
      oct('cuisse', 'plate', -leg.thighLength + 0.03, -0.05, tw + 0.016, td + 0.02, leg.thighChamfer / 2 + 0.012),
      h.box('cuisse-plate', 'plate', [-tw * 0.4, -leg.thighLength + 0.07, (td + 0.02) / 2 - 0.004], [tw * 0.4, -0.08, (td + 0.02) / 2 + 0.012]),
      oct('cuisse-rim', 'insignia', -0.065, -0.05, tw + 0.024, td + 0.028, leg.thighChamfer / 2 + 0.012),
    ] + [
      oct('strap-%d' % i, 'strap', y, y + 0.025, tw + 0.022, td + 0.026, leg.thighChamfer / 2 + 0.012)
      for i in [0, 1]
      for y in [[-0.17, -0.31][i]]
    ];
    local shin = [
      oct('knee', 'plate', -0.065, 0.06, sw + 0.03, kneeD, 0.025),
      h.box('knee-guard', 'plate', [-0.055, -0.07, kneeD / 2 - 0.004], [0.055, 0.075, kneeD / 2 + 0.02]),
      h.dome('knee-cop', 'trim', 0.035, 0.018, 0.006, 'z', [0, 0, kneeD / 2 + 0.02]),
      oct('greave', 'plate', -shinLength - leg.ankleOverlap, -0.05, sw + 0.012, sd + 0.012, leg.shinChamfer / 2 + 0.012),
      h.prism('greave-ridge', 'trim', 'y', [[(sd + 0.012) / 2 - 0.002, -0.014], [(sd + 0.012) / 2 + 0.012, 0], [(sd + 0.012) / 2 - 0.002, 0.014]],
              -shinLength + 0.03, -0.08),
      oct('greave-rim', 'insignia', -shinLength - leg.ankleOverlap, -shinLength + 0.01, sw + 0.02, sd + 0.02, leg.shinChamfer / 2 + 0.012),
    ];
    // The cuisse leaves the hip and the knee's cap bare.
    fitted([
      shell(id + '_worn_thigh', thigh, finish, [], title=named(title, 'thigh')),
      shell(id + '_worn_shin', shin, finish, ['shin'], title=named(title, 'shin')),
    ]) + { ground: h.lifted(shin, shinLength + leg.ankleOverlap) + h.lifted(thigh, shinLength + leg.ankleOverlap + leg.thighLength) },

  // Trousers: a seat over the hips under a waistband, and a leg on each thigh and shin. The shin's leg stops above the
  // ankle bone and an open cuff carries it down to the instep, so the hem reaches the shoe without passing through
  // the foot. `ease` stands the shin's leg further off than the layer, so it clears a bent knee. `slots` names the
  // ground row's finish slots: `cloth` and `trim`.
  trousers(id, finish, spec={}, title=null)::
    local s = { layer: 'normal', ease: 0.004, slots: { cloth: 'cloth', trim: 'trim' } } + spec;
    local g = layers[s.layer], sl = s.slots;
    local cut = bust.torsoChamfer / 2;
    local seatW = bust.pelvisWidth + 2 * g, seatD = bust.pelvisDepth + 2 * g;
    local pelvis = [
      oct('seat', sl.cloth, -0.01, bust.pelvisHeight + 0.015, seatW, seatD, around(cut, g)),
      oct('waistband', sl.trim, bust.pelvisHeight - 0.02, bust.pelvisHeight + 0.02, seatW + 0.006, seatD + 0.006, around(cut, g + 0.003)),
    ];
    local thigh = [
      oct('leg', sl.cloth, -leg.thighLength - 0.02, 0.025, leg.thighWidth + 2 * g, leg.thighDepth + 2 * g, around(leg.thighChamfer / 2, g)),
    ];
    // In the knee's frame the ankle sits a shin below. The cuff stands taller than the ankle bone rises above the
    // ankle and ends a centimetre above it, clear of the instep.
    local ankle = -(leg.length - leg.thighLength - leg.shoeHeight);
    local cuff = [ankle + 0.01, ankle + 0.07];
    local shinW = leg.shinWidth + 2 * (g + s.ease), shinD = leg.shinDepth + 2 * (g + s.ease), shinCut = around(leg.shinChamfer / 2, g + s.ease);
    local shin = [oct('leg', sl.cloth, cuff[1] - 0.005, 0.025, shinW, shinD, shinCut)]
                 + ring('cuff', sl.cloth, cuff[0] + 0.03, cuff[1], shinW, shinD, shinCut, 0.008)
                 + ring('hem', sl.trim, cuff[0], cuff[0] + 0.03, shinW + 0.004, shinD + 0.004, around(shinCut, 0.002), 0.01);
    // The knee's cap reaches below the thigh's leg, where the shin's takes over, and the cuff stops above the ankle, so
    // neither leg encloses its part.
    fitted([
      shell(id + '_worn_pelvis', pelvis, finish, ['pelvis'], title=named(title, 'hips')),
      shell(id + '_worn_thigh', thigh, finish, [], title=named(title, 'thigh')),
      shell(id + '_worn_shin', shin, finish, [], title=named(title, 'shin')),
    ]),

  // Leg harness: cuisses on the thighs, knee cops and greaves on the shins. `slots` names the ground row's finish
  // slots: `shell`, `cop`, `rim` and `strap`.
  legs(id, finish, spec={}, title=null)::
    local s = { layer: 'over', greaves: true, slots: { shell: 'shell', cop: 'cop', rim: 'rim', strap: 'strap' } } + spec;
    local g = layers[s.layer], sl = s.slots;
    local shinLength = leg.length - leg.thighLength - leg.shoeHeight;
    local tw = leg.thighWidth + 2 * g, td = leg.thighDepth + 2 * g;
    local sw = leg.shinWidth + 2 * g, sd = leg.shinDepth + 2 * g;
    local thigh = [
      oct('cuisse', sl.shell, -leg.thighLength + 0.02, -0.06, tw, td, leg.thighChamfer / 2 + 0.01),
      oct('cuisse-rim', sl.rim, -0.075, -0.06, tw + 0.008, td + 0.008, leg.thighChamfer / 2 + 0.01),
    ] + [
      oct('strap-%d' % i, sl.strap, y, y + 0.02, tw + 0.006, td + 0.006, leg.thighChamfer / 2 + 0.01)
      for i in [0, 1]
      for y in [[-0.16, -0.3][i]]
    ];
    local shin = [
      // The knee cop bulges forward over the joint, with a fan on the outside.
      oct('poleyn', sl.cop, -0.05, 0.05, sw + 0.02, sd + 0.02, 0.025),
      h.turned('poleyn-boss', sl.cop, 'z', [[0, 0], [0, 0.045], [0.012, 0.035], [0.02, 0]], [0, 0, (sd + 0.02) / 2]),
    ] + (if s.greaves then [
      oct('greave', sl.shell, -shinLength - leg.ankleOverlap, -0.045, sw, sd, leg.shinChamfer / 2 + 0.01),
      oct('greave-rim', sl.rim, -shinLength - leg.ankleOverlap, -shinLength + 0.005, sw + 0.008, sd + 0.008, leg.shinChamfer / 2 + 0.01),
    ] else []);
    // The cuisse leaves the hip and the knee's cap bare.
    fitted([
      shell(id + '_worn_thigh', thigh, finish, [], title=named(title, 'thigh')),
      shell(id + '_worn_shin', shin, finish, if s.greaves then ['shin'] else [], title=named(title, 'shin')),
    ]),

  // Gloves: a palm and cuff on the wrist, a piece on each phalanx and on each thumb bone, so a curled hand bends its
  // glove at every joint. `cuff` is how far the cuff reaches up the forearm; `fingers` false leaves stubs on the knuckle
  // phalanges only. The model arm is a right arm whose palm faces +x, so the back of the hand, where `back` details go,
  // is -x. A finger piece follows the doll's hand at the glove's layer, so gloves at one layer share their finger shapes
  // on purpose and tell themselves apart by their `hand` finish and what they add to the palm.
  hands(id, finish, spec, title=null)::
    local s = { layer: 'under', cuff: 0.05, flare: 0.006, hem: 0.006, fingers: true, backRidges: 0,
                slots: { hand: 'hand', cuff: 'cuff', hem: 'hem', ridge: 'stitch' } } + spec;
    local g = layers[s.layer], sl = s.slots;
    local palmX = arm.palmThickness / 2 + g, palmZ = arm.palmWidth / 2 + g;
    local wristX = arm.wristWidth / 2 + g, wristZ = arm.wristWidth / 2 + arm.wristDepthExtra + g;
    local fingerX = arm.palmThickness * arm.fingerThicknessShare / 2 + g, fingerZ = hand.width / 2 + g;
    local thumbX = arm.palmThickness * arm.thumbThicknessShare / 2 + g;
    // The palm ends along the knuckle row, which slants back toward the little finger, so the glove's palm follows it
    // rather than standing square past the little finger's root, where a curled finger would come out through it.
    local last = std.length(hand.fingers) - 1;
    local knuckleY(i) = hand.knuckle(i)[1] - g;
    local edgeY(from, to, z) = knuckleY(from) + (knuckleY(to) - knuckleY(from)) * (z - hand.centre(from)) / (hand.centre(to) - hand.centre(from));
    local outline = [[arm.handOverlap, palmZ], [edgeY(0, 1, palmZ), palmZ]]
                    + [[knuckleY(i), hand.centre(i)] for i in std.range(1, last - 1)]
                    + [[edgeY(last, last - 1, -palmZ), -palmZ], [arm.handOverlap, -palmZ]];
    local palm = [
      h.prism('palm', sl.hand, 'x', outline, -palmX, palmX),
      oct('cuff', sl.cuff, 0, s.cuff, 2 * (wristX + s.flare), 2 * (wristZ + s.flare), 0.012),
    ] + (if s.hem > 0 then [oct('cuff-hem', sl.hem, s.cuff - s.hem, s.cuff + 0.002, 2 * (wristX + s.flare) + 0.004, 2 * (wristZ + s.flare) + 0.004, 0.012)] else [])
      + [
        h.box('ridge-%d' % i, sl.ridge, [-palmX - 0.003, -arm.palmLength + 0.02, -0.02 + i * 0.02 - 0.002], [-palmX, 0, -0.02 + i * 0.02 + 0.002])
        for i in std.range(0, s.backRidges - 1)
      ];
    // A phalanx piece in its phalanx's frame: a sleeve down its length; a stub glove ends the knuckle phalanx short.
    // Its root end stands past the skin's, which reaches into the bone above to close the joint, so a curled joint
    // shows glove at its back rather than the skin's end face.
    local phalanx(i, k) =
      local length = if s.fingers then hand.length(i, k) else 0.02;
      [h.box('finger', sl.hand, [-fingerX, -length - g, -fingerZ], [fingerX, arm.handOverlap + g, fingerZ])]
      + (if s.fingers then [] else [h.box('stub-hem', sl.hem, [-fingerX - 0.001, -length - g, -fingerZ - 0.001], [fingerX + 0.001, -length - g + 0.006, fingerZ + 0.001])]);
    local phalanges = if s.fingers then std.range(0, hand.phalanges - 1) else [0];
    local fingerPieces = [
      { id: id + '_worn_' + hand.part(hand.fingers[i], k), pieces: phalanx(i, k),
        label: hand.fingers[i] + ' finger' + (if k == 0 then '' else ' ' + (k + 1)) }
      for i in std.range(0, std.length(hand.fingers) - 1)
      for k in phalanges
    ];
    // A thumb piece in its bone's frame, down the bone's length; the root piece ends just past the root, the rest reach
    // into the bone above, each past the skin's end for the same reason as a phalanx's.
    local thumbPieces = [
      { id: id + '_worn_' + hand.thumbPart(k), label: 'thumb' + (if k == 0 then '' else ' ' + (k + 1)), pieces: [h.box('thumb', sl.hand, [-thumbX, -hand.thumbLength(k) - g, -g], [thumbX, (if k == 0 then 0 else arm.handOverlap) + g, arm.thumbProjection + 0.004 + g])] }
      for k in std.range(0, hand.thumbBones - 1)
    ];
    // The loose glove's fingers, one block across the knuckles, for the ground model.
    local fingerLength = if s.fingers then arm.fingerLength else 0.02;
    local fingers = [
      h.box('fingers', sl.hand, [-fingerX, -fingerLength - g, -arm.palmWidth / 2 - g], [fingerX, arm.handOverlap, arm.palmWidth / 2 * arm.fingerFrontShare + g]),
    ] + (if s.fingers then [] else [h.box('stub-hem', sl.hem, [-fingerX - 0.001, -fingerLength - g, -arm.palmWidth / 2 - g - 0.001], [fingerX + 0.001, -fingerLength - g + 0.006, arm.palmWidth / 2 * arm.fingerFrontShare + g + 0.001])]);
    // No phalanx or thumb piece encloses its part: each doll bone reaches into the bone above past the piece's root.
    fitted([shell(id + '_worn_palm', palm, finish, ['palm'], title=named(title, 'palm'))]
           + [shell(piece.id, piece.pieces, finish, [], title=named(title, piece.label)) for piece in thumbPieces + fingerPieces]) + {
      // One glove standing on its fingertips, cuff up, for a ground model; the fingers hang from the palm's end.
      ground: h.lifted(palm, fingerLength + g + arm.palmLength) + h.lifted(fingers, fingerLength + g),
    },

  // Boots and shoes from the ground row's own boot spec `b` (length l, width w, sole s, toe, instep, shaft top `top`,
  // laces). The foot rides the ankle; a shaft above the ankle rides the knee so a flexed ankle does not pierce it, and
  // it widens to clear the shin whatever the ground boot's proportions, and by `ease` more for a loose boot worn over
  // trousers. A shoe whose top stays below the ankle has no shaft. The sole lies under the bare foot, not round it, so
  // the foot piece declares the sole as the lift a consumer stands the shod figure on. `covers` is what of the foot the
  // vamp encloses at rest, which depends on how high it rises: the foot's 'sole' region past the bare instep, the whole
  // 'foot' past the ankle's cap too. The shaft declares nothing: the shin rises above its collar to the knee.
  feet(id, finish, b, spec={}, title=null)::
    local s = { layer: 'normal', ease: 0, covers: [] } + spec;
    local g = layers[s.layer];
    local ankleY = -leg.shoeHeight - b.s;  // The sole's floor, from the ankle: a sole under the bare foot's.
    local footZ = leg.toeReach - (leg.toeReach + leg.heelReach) / 2;  // The body foot's centre, ahead of the ankle.
    local z0 = footZ - b.l / 2, zt = footZ + b.l / 2 - b.w / 2, zs = z0 + 0.12;
    local y(v) = ankleY + v;
    local foot = [
      h.box('sole', 'sole', [-b.w / 2 - 0.004, y(0), z0 - 0.004], [b.w / 2 + 0.004, y(b.s), zt]),
      h.disc('sole-toe', 'sole', b.w / 2 + 0.004, y(0), y(b.s), 0, zt),
      h.box('heel', 'sole', [-b.w / 2 - 0.004, y(0), z0 - 0.006], [b.w / 2 + 0.004, y(b.s + 0.01), z0 + 0.07]),
      h.prism('vamp', 'upper', 'x', [[y(b.s), z0], [y(b.s), zt], [y(b.s + b.toe), zt], [y(b.s + b.instep), zs], [y(b.s + b.instep), z0]], -b.w / 2, b.w / 2),
      h.turned('toe', 'toe', 'y', [[0, 0], [0, b.w / 2], [b.toe * 0.6, b.w / 2], [b.toe, b.w * 0.3], [b.toe, 0]], [0, y(b.s), zt]),
    ] + (if b.laces == 0 then [] else [
      local zl = zs + f * (zt - zs) * 0.6, yl = y(b.s + b.instep + f * 0.6 * (b.toe - b.instep));
      h.box('instep-lace-%d' % i, 'laces', [-b.w * 0.28, yl - 0.004, zl - 0.004], [b.w * 0.28, yl + 0.002, zl])
      for i in [0, 1]
      for f in [[0.35, 0.75][i]]
    ]);
    // The shaft, in the knee's frame: the ankle sits a shin below the knee.
    local ankle = -(leg.length - leg.thighLength - leg.shoeHeight);
    local shaftW = std.max(b.w * 0.92, leg.shinWidth + 2 * (g + s.ease)), shaftD = std.max(0.116, leg.shinDepth + 2 * (g + s.ease));
    // The shaft reaches below the ankle, past the shin's end, so no skin shows over a low vamp.
    local base = ankle - leg.ankleOverlap - 0.004, top = ankle + ankleY + b.top;
    local rise = top - 0.02 - (ankle + ankleY + b.s + b.instep);
    local shaft = [
      oct('shaft', 'upper', base, top - 0.02, shaftW, shaftD, 0.02),
      oct('collar', 'collar', top - 0.02, top, shaftW + 0.008, shaftD + 0.008, 0.022),
    ] + (if b.laces == 0 then [] else [
      h.box('tongue', 'upper', [-b.w * 0.2, base, shaftD / 2], [b.w * 0.2, top + 0.012, shaftD / 2 + 0.006]),
    ] + [
      local yl = base + 0.01 + i * rise / (b.laces - 1);
      h.box('lace-%d' % i, 'laces', [-b.w * 0.3, yl, shaftD / 2 + 0.006], [b.w * 0.3, yl + 0.004, shaftD / 2 + 0.009])
      for i in std.range(0, b.laces - 1)
    ]);
    local shafted = top > ankle;
    local shod = shell(id + '_worn_foot', foot, { lining: 'paint-charcoal' } + finish, s.covers, title=named(title, 'foot'));
    fitted([shod { soleLift: b.s }]
           + (if shafted then [shell(id + '_worn_shaft', shaft, finish, [], title=named(title, 'shaft'))] else [])) + {
      // One boot on the floor, the shaft brought from the knee's frame to the ankle's, for a ground model.
      ground: h.lifted(foot, -ankleY) + (if shafted then h.lifted(shaft, -ankle - ankleY) else []),
    },

  // The head a rigid head piece seated at `base` encloses, in that seat's frame: the hair's plan half-widths, deeper
  // by the hair's sweep back, the farthest its plan reaches from the head's axis, which a round shell must clear; the
  // heights of the chin, the eyes, the hairline and the hair's top; and the hair dome's layers, each with its top and
  // its plan's reach, which a shell closing over the crown must clear. The layers follow the bust's dome
  // (`src/families/body.ts`, `dome`): each takes the section at its own top, shrunk on a quarter ellipse.
  headroom(base):: {
    local above(height) = height - bust.neckOverlap - base,
    local reach(halfX, halfZ, cz) = std.foldl(std.max, [
      std.sqrt(std.pow(halfX * c, 2) + std.pow(halfZ * s + cz, 2))
      for i in std.range(0, 360)
      for t in [i * std.pi / 180]
      for c in [std.sign(std.cos(t)) * std.pow(std.abs(std.cos(t)), 2 / bust.facePower)]
      for s in [std.sign(std.sin(t)) * std.pow(std.abs(std.sin(t)), 2 / bust.facePower)]
    ], 0),
    halfX: foot.halfX,
    halfZ: foot.halfZ + bust.hairSweep,
    reach: reach(self.halfX, self.halfZ, 0),
    chin: above(0),
    eyes: above(bust.headHeight * bust.eyeShare),
    brow: above(bust.headHeight - bust.hairCover),
    top: above(bust.headHeight + bust.hairRise),
    local foot = { halfX: bust.headWidth / 2 + bust.hairThickness, halfZ: bust.headDepth / 2 + bust.hairThickness, cz: -bust.hairSweep },
    local crown = { halfX: bust.headWidth / 2 * bust.hairCrownShare, halfZ: bust.headDepth / 2 * bust.hairCrownShare, cz: -bust.hairCrownBack },
    local brow = self.brow, local top = self.top,
    hair: [
      local t = (i + 1) / bust.hairLayerCount;
      local share = 1 - std.sqrt(1 - t * t);
      local section(key) = foot[key] + (crown[key] - foot[key]) * share;
      { top: brow + (top - brow) * t, reach: reach(section('halfX'), section('halfZ'), section('cz')) }
      for i in std.range(0, bust.hairLayerCount - 1)
    ],
  },
  // The base that seats a head piece with height `y` of it over the eyes, such as a visor's slit.
  eyesAt(y):: self.headroom(0).eyes - y,
  // A head piece's `brow` anchor, the point of it at height `y` that the showcase seats at the bust's, the hairline on
  // the hair's plan centre (models/dressing.libsonnet); `headroom(base).brow` seats it. It
  // is given as a share of the bounds `min`..`max` of its solid `solid`, which must hold that point; the share is
  // rounded, so a point on the solid's face does not fall outside it by a float's error.
  browAnchor(part, solid, min, max, y)::
    local point = [0, y, -bust.hairSweep];
    { part: part, solid: solid, fraction: [std.round(1e9 * (point[i] - min[i]) / (max[i] - min[i])) / 1e9 for i in [0, 1, 2]] },
}
