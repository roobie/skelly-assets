// The shoulder girdle drawn from the bust measured by `m`: the trapezius sloping off the neck's foot to the chest's
// side, and the deltoid spheroid on each side. The bust draws it and worn shells fit to it, so a shell over the
// shoulders cannot drift from the body under it.
function(m) {
  chestTop: m.pelvisHeight + m.waistHeight + m.ribHeight + m.chestHeight,
  neckFoot: m.neckWidth / 2,
  slopeRun: m.chestWidth / 2 - self.neckFoot,
  slopeLength: std.sqrt(self.slopeRun * self.slopeRun + m.trapeziusDrop * m.trapeziusDrop),
  // The deltoid on the figure's left (+x), its right the mirror: its centre, the shoulder joint, and its half extent
  // along x and radius about it.
  deltoid: {
    x: m.chestWidth / 2 + m.shoulderWidth / 2 - m.deltoidInset,
    y: $.chestTop - m.shoulderHeight / 2 - m.deltoidDrop,
    halfAxial: m.shoulderWidth / 2,
    radius: std.min(m.shoulderHeight, m.shoulderDepth) / 2,
  },
  // The clip planes that cut a piece to the slope set out `rise` square to it, one per side.
  trapezius(rise):: [
    { normal: [side * m.trapeziusDrop / $.slopeLength, $.slopeRun / $.slopeLength, 0],
      offset: (m.trapeziusDrop * $.neckFoot + $.slopeRun * $.chestTop) / $.slopeLength + rise }
    for side in [1, -1]
  ],
  // The bust family's params: the measures, with the girdle's shape in place of those only it is drawn from.
  bustParams::
    local drawnFrom = ['shoulderWidth', 'shoulderHeight', 'shoulderDepth', 'deltoidInset', 'deltoidDrop', 'trapeziusDrop'];
    std.foldl(std.objectRemoveKey, drawnFrom, m) + { girdle: { trapezius: $.trapezius(0), deltoid: $.deltoid } },
}
