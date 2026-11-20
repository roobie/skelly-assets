// The AR-15 frame of the modular AR family: every dimension its parts are built from, in millimetres, and the mass of
// every item. Positions are in the gun frame, whose origin is on the bore at the upper receiver's front face, with x to
// the muzzle and y up; a part that moves with a choice (the stock on its tube, the grip, the muzzle device, the gas
// block) is measured from its own mount instead. Each value says where it comes from: 'traced: <trace key>',
// 'sourced: <URL>' or 'derived: <reason>'. Traced values are read off the AM-15 side profile, so a retrace moves them.
local profile = import '../references/ar15-profile.trace.jsonnet';

local dim(mm, source) = { mm: mm, source: source };
local outline(points, source) = { mm: points, source: source };
local mass(kg, source) = { kg: kg, source: source };
local count(n, source) = { count: n, source: source };
local angle(deg, source) = { deg: deg, source: source };
local rate(rpm, source) = { rpm: rpm, source: source };
// A pick among the table's own named choices, the group at the dot path `of`, or a port standard its mount lists.
local choiceOf(of, name) = { choice: name, of: of };
local standardOf(mount, name) = { standard: name, mount: mount };

// A trace record's scale, from its calibration span.
local mmPerPxOf(record) =
  local c = record.reference.calibration;
  c.lengthMm.value / (c.pixels.value[1][0] - c.pixels.value[0][0]);
// Profile pixels to the gun frame: the handguard calibration sets the scale, the upper front face and the bore the datum.
local calibration = profile.reference.calibration;
local mmPerPx = mmPerPxOf(profile);
local xOf(px) = (px - profile.values.registrationXPx.value) * mmPerPx;
local yOf(px) = (profile.values.boreYPx.value - px) * mmPerPx;
local traced(key) = 'traced: ar15-profile/' + key;
local tracedX(px, key) = dim(xOf(px), traced(key));
local tracedY(px, key) = dim(yOf(px), traced(key));
// Profile pixel points about a mount point: each point less the mount, in mm.
local aboutMount(pixels, mount) = [[xOf(p[0]) - mount[0], yOf(p[1]) - mount[1]] for p in pixels];
local tracedOutline(pixels, mount, key) = outline(aboutMount(pixels, mount), traced(key));

local picatinny = 'sourced: https://en.wikipedia.org/wiki/Picatinny_rail';
// The Daniel Defense rail-mounted fixed front sight, the fixed post a free-float handguard commonly carries.
local ddFixedFront = 'https://ar15.build/products/front-sight/306521/daniel-defense-rail-mounted-fixed-front-sight-comma-black-hardcoat-dd-rail-mounted-fixed-front-sight';
// The parts with thin features export at the detail grain; the thinnest feature it carries evenly is this many mm. An
// authored wall is drawn at least this thick, so the export never drops a voxel from one side of it.
local grains = import 'models/voxel-grains.libsonnet';
local detailFeature = grains.featureVoxels * grains.detailGrain * 1000;
local detailWall(what) = dim(detailFeature, 'derived: ' + what + ' wall two detail voxels thick');
local mounts = (import 'platforms.jsonnet').mounts;
// The outside radius of the extension that takes the named buffer, from its stock standard.
local tubeRadiusOf(buffer) = mounts.stock.standards['ar-tube-' + buffer].dimensions.outerDiameter.mm / 2;
local journalDiameter = mounts['gas-block'].standards['ar-journal-750'].dimensions.journalDiameter;
// The flat-top front sight base stands 0.040 in taller than the carry-handle one, as the flat-top's rear sights stand
// that much higher.
local flatTopExtra = dim(1.016, 'sourced: 1.98 in against 1.94 in, https://charliescustomclones.com/front-sight-base-fsb-f-height-750-stripped');
// The tower is cut for the larger of the two extensions, since both thread into it.
local tubeRadius = std.max(tubeRadiusOf('carbine'), tubeRadiusOf('rifle'));
local towerWall = 3;

// The parting line is built level at the mean of its traced ends, since the forging's parting line runs parallel to the
// bore; its 3 px fall across the receiver is read as trace error, as the rail line above it falls only 2 px over three
// times the length.
local partingY = (yOf(121) + yOf(124)) / 2;
// The body of the shared stanag-30 magazine as the magazine family builds it: its depth and width, and how far its top
// stands above the seat it hangs from. test/arModular.test.ts holds the well to the built magazine.
local magazines = import 'magazines.jsonnet';
local mmPerU = (import 'unitScale.jsonnet').metresPerUnit * 1000;
local magazine = {
  depth: magazines.stanag30.depthU * mmPerU,
  width: magazines.stanag30.widthU * mmPerU,
  topAboveSeat: (magazines.well.heightU - magazines.well.clearanceU) * mmPerU,
};
local wellClearance = 0.5;
local wellFrontX = xOf(526);
local wellInnerFrontX = wellFrontX - detailFeature;
local wellInnerRearX = wellInnerFrontX - magazine.depth - 2 * wellClearance;
// The traced rear (467 px) leaves room for two walls of only 3.1 mm, so the rear wall stands past it.
local wellRearX = wellInnerRearX - detailFeature;
local gasBlockWall = 4;
local journalRadius = journalDiameter.mm / 2;
// The handguard tube clears the gas block by this much above it and at each side.
local handguardClearance = { top: 2, side: 2.5 };
// The grip seats level on the lower: its top is taken at the traced front corner, the 4 px rise behind it being tilt.
local gripMount = [xOf(418), yOf(162)];
local guardTopY = yOf(145);
// The trigger blade's shape is read off the receiver close-up, the only reference that resolves it, at that photo's
// rail-pitch scale: the midline between its traced rear and front edges, level by level from where it leaves the
// receiver to its tip. It hangs from the top of the profile's trigger trace. The profile's coarser trace bows the same
// way but runs 5 mm longer, which would put the tip into the guard's floor bar.
local closeUp = import '../references/ar15-receiver.trace.jsonnet';
local closeUpMmPerPx = mmPerPxOf(closeUp);
local bladeRear = [[1795, 2120], [1770, 2300], [1800, 2420], [1890, 2520]];
local bladeFront = [[1850, 2120], [1805, 2300], [1830, 2400], [1900, 2490]];
local bladeMid = [[(bladeRear[i][0] + bladeFront[i][0]) / 2, (bladeRear[i][1] + bladeFront[i][1]) / 2] for i in std.range(0, 3)];
local bladeHang = [xOf(440), guardTopY];
// The barrel's breech sits this far behind the upper front face: the listing's 457 mm barrel ends at the traced muzzle
// shoulder.
local breechSetback = profile.values.barrelMm.value - xOf(903);
local rifleConfigurator = 'https://www.rifleconfigurator.com/tools/how-ar-15-gas-systems-work';
// Sources differ by about an inch: the Primary Arms guide's ~9 in (229 mm) mid-length port is a rounded figure from the
// upper's front face, while these are Faxon's barrel prints from the bolt face, the datum the barrel is built on.
local gasPorts = {
  mid: dim(245.4, 'sourced: 9.66 in from the bolt face, ' + rifleConfigurator),
  rifle: dim(331.216, 'sourced: 13.04 in from the bolt face, ' + rifleConfigurator),
};
// The front sight base's rear face stands this far behind its gas port, where a drop-in handguard's cap meets it.
local magpulMid = 'https://magpul.com/moem-lokhandguard-mid-length-ar15-m4.html';
local midHandguardMounting = 218.44;
local sightBaseRearOfPort = gasPorts.mid.mm - breechSetback - midHandguardMounting;
local tubeLengths = {
  carbine: dim(181, 'derived: a mil-spec carbine extension, 7.125 in'),
  rifle: dim(
    257.175,
    'sourced: 10-1/8 in overall, https://www.ar15.build/products/buffer-tube/33353/ar-15-m16-a2-rifle-buffer-tube-assembly-080000625',
  ),
};
local tubeLength = tubeLengths.carbine.mm;
local tubeEndX = xOf(370) - tubeLength;
// The upper's rear face stands upright where it meets the buffer tower; the profile's outline slants down to the parting
// line only because the charging handle and its shadow hide that face there.
local upperRearX = dim(xOf(profile.values.upperRearXPx.value), 'derived: ' + profile.values.upperRearXPx.reason);
local stockMount = [tubeEndX, 0];
local collapsibleToe = tracedOutline([[270, 122], [128, 122], [138, 196], [150, 200], [165, 193]], stockMount, 'stock');
// The flat-top's front post stands at this height over the bore; the carry-handle base is the ar-flat-top extra lower.
local sightPlane = dim(66.04, 'sourced: 2.6 in, the M4 front sight base, https://www.recoilweb.com/back-up-iron-sights-78135.html?nonamp=1');
local cmmgSightBase = 'https://www.wingtactical.com/firearm-parts-accessories/cmmg-a2-front-sight-base-assembly';
local m4Carbine = 'https://en.wikipedia.org/wiki/M4_carbine';
local sixPositionTube = 'https://combathunting.com/AR-15-Parts-Accessories-milspec-carbine-receiver-extension-buffer-tube-6-position.html';
// The M4's overall length with its stock extended (33 in) and collapsed (29.75 in).
local m4Lengths = { extended: 838.2, collapsed: 755.65 };
// The carrier's gas key, which the charging handle draws it back by, and the room the handle has behind it, from the
// technical data package figures a gas key patent quotes.
local gasKeyPatent = 'https://patents.google.com/patent/US10982916B1/en';
// A mil-spec-size billet dust cover as a shop lists it: 3.13 in long and 0.885 in wide, the width read as the cover's
// height across the port.
local fortisDustCover = 'https://armsagora.com/fortis-manufacturing-billet-dust-cover-for-850015927034';

// The A2 parts are traced off the M16A4 side photos, each scaled by the rifle's published overall length. The side
// photo's heights are over its bore, which the sight line is measured from.
local m16a4Side = import '../references/m16a4-side.trace.jsonnet';
local m16a4Bare = import '../references/m16a4-bare.trace.jsonnet';
local side = m16a4Side.values;
local sideMmPerPx = mmPerPxOf(m16a4Side);
local sideOverBore(py) = (side.boreYPx.value - py) * sideMmPerPx;

// No print of the upper is published, so the rail top is taken from a forum compilation of measured flat-tops. The side
// photo agrees within its trace; the bare photo reads it 2 mm lower and the AM-15 profile 3.8 mm higher, each at over a
// millimetre a pixel.
local sourcedRailTopY = 30.861;
local railHeightSource =
  '1.215 in from the bore centreline, a forum compilation of flat-top rail heights, '
  + 'https://forum.308ar.com/topic/23364-advantage-of-various-upper-rail-heights/; the m16a4-side trace reads %.1f mm'
  % sideOverBore(side.railTopYPx.value);
local drawnSlotDepth = dim(detailFeature, 'derived: the slot depth exaggerated to two detail voxels, so every slot cuts evenly');

// The carry handle, registered at its rear face on the upper's rear face; a null height stands on the handle's base,
// the top of the receiver under its window.
local handleX(px) = upperRearX.mm + (px - side.handleRearXPx.value) * sideMmPerPx;
local handleBaseY = sideOverBore(side.handleBaseYPx.value);
local handlePoint(p) = [handleX(p[0]), if p[1] == null then handleBaseY else sideOverBore(p[1])];
local handleOutline(pixels) = outline([handlePoint(p) for p in pixels], 'traced: m16a4-side/carryHandle');
// The bar's top falls to the front, so the trace's bar is thinnest where it meets the front leg.
local barTopLine = m16a4Side.reference.landmarks.handleBarTop.value;
local handleBarTop(px) =
  barTopLine[0][1] + (px - barTopLine[0][0]) * (barTopLine[1][1] - barTopLine[0][1]) / (barTopLine[1][0] - barTopLine[0][0]);
local housingTop = side.housingTopYPx.value;
local housingFront = side.housingFrontXPx.value;
local windowFront = side.windowFrontXPx.value;
local handleFront = side.handleFrontXPx.value;
local handleWindowTopY = sideOverBore(handleBarTop(windowFront)) - detailFeature;

// The A2 front sight base's triangle, from its rear face and the top of the journal.
local sightBasePoint(p) = [(p[0] - side.fsbRearXPx.value) * sideMmPerPx, sideOverBore(p[1]) - journalRadius];
local fsbRear = side.fsbRearXPx.value;
local fsbFront = side.fsbFrontXPx.value;
local fsbDeck = side.fsbDeckYPx.value;
local crownFoot = side.fsbCrownFootYPx.value;
local simplified = 'simplified for legibility, BR 2026-11-19';
// A strut from its outer edge on the deck up to the crown's foot, drawn this thick across its rake and standing in from
// its outer edge by `inward` (+1 forward, -1 rearward).
local strutThickness = 5;
local strut(deckX, crownX, inward) =
  local rise = fsbDeck - crownFoot;
  local across = inward * strutThickness / sideMmPerPx * std.sqrt(std.pow(crownX - deckX, 2) + std.pow(rise, 2)) / rise;
  local corners = [[deckX, fsbDeck], [deckX + across, fsbDeck], [crownX + across, crownFoot], [crownX, crownFoot]];
  // Rear to front along the deck, then front to rear along the crown's foot.
  local ordered = if inward > 0 then corners else [corners[1], corners[0], corners[3], corners[2]];
  outline(
    [sightBasePoint(p) for p in ordered],
    'derived: the m16a4-side/frontSightBase strut %g mm thick across its rake, %s' % [strutThickness, simplified],
  );

// The A2 stock's outline off the bare photo, registered at its butt plate on the sourced stock length and at its comb on
// the side photo's comb height over the bore, which the side photo resolves five times finer. The 13.5 in length of pull
// the stock length's source also gives comes out 0.3 in longer from the trigger.
local a2StockRearX = tubeLengths.rifle.mm - m16a4Bare.values.stockLengthMm.value;
local combY = sideOverBore(side.combYPx.value);
local bareMmPerPx = mmPerPxOf(m16a4Bare);
local stockPoint(p) = [
  a2StockRearX + (p[0] - m16a4Bare.values.buttRearXPx.value) * bareMmPerPx,
  combY - (p[1] - m16a4Bare.values.combYPx.value) * bareMmPerPx,
];
local stockOutline(pixels) = outline([stockPoint(p) for p in pixels], 'traced: m16a4-bare/a2Stock');

{
  rail: {
    pitch: dim(10.01, picatinny),
    slotWidth: dim(5.23, picatinny),
    slotDepth: dim(3.0, picatinny),
    drawnSlotDepth: drawnSlotDepth,
    topWidth: dim(21.21, 'sourced: https://www.shootingillustrated.com/content/is-your-rail-truly-mil-spec'),
  },

  lower: {
    partingY: dim(partingY, traced('moduleUpperLowerParting')),
    pivotPinX: tracedX(532, 'pivotPin'),
    // The buffer tower the receiver extension threads into, and the body under the upper.
    towerRearX: tracedX(370, 'moduleReceiverExtensionToLower'),
    towerFrontX: dim(upperRearX.mm, "derived: closed against the upper's rear face"),
    bodyRearX: tracedX(376, 'lowerReceiver'),
    towerBottomY: tracedY(132, 'lowerReceiver'),
    towerTopY: dim(tubeRadius + towerWall, 'derived: a %g mm wall over the receiver extension thread' % towerWall),
    towerHalfWidth: dim(tubeRadius + towerWall, 'derived: a %g mm wall beside the receiver extension thread' % towerWall),
    bodyChamferX: tracedX(380, 'lowerReceiver'),
    bodyBottomY: tracedY(145, 'lowerReceiver'),
    halfWidth: dim(11, 'derived: narrower than the magazine well, as on the forging'),
    well: {
      clearance: dim(wellClearance, 'derived: a sliding fit around the magazine body'),
      frontX: dim(wellFrontX, traced('lowerReceiver')),
      wall: detailWall('a well'),
      innerFrontX: dim(wellInnerFrontX, 'derived: the front wall behind the traced front'),
      rearX: dim(wellRearX, 'derived: the rear wall behind the magazine body'),
      innerRearX: dim(wellInnerRearX, 'derived: the magazine body depth and 0.5 mm clearance each side'),
      frontBottomY: tracedY(160, 'lowerReceiver'),
      rearBottomY: tracedY(170, 'moduleMagazineWell'),
      innerHalfWidth: dim(magazine.width / 2 + wellClearance, 'derived: the magazine body width and 0.5 mm clearance each side'),
      outerHalfWidth: dim(magazine.width / 2 + wellClearance + detailFeature, 'derived: the side wall outside the clearance'),
    },
    // The magazine standard the well is cut for.
    magazine: standardOf('magazine', 'ar15-magazine'),
    magazineSeat: {
      x: dim(wellInnerFrontX - wellClearance - magazine.depth / 2, 'derived: the magazine body centred in the well'),
      y: dim(partingY - 1 - magazine.topAboveSeat, 'derived: the magazine top 1 mm under the upper'),
    },
    triggerGuard: {
      rearX: dim(gripMount[0], 'derived: closed against the traced grip front'),
      frontX: dim(wellRearX, 'derived: closed against the magazine well rear wall'),
      bottomY: tracedY(170, 'triggerGuard'),
      topY: dim(guardTopY, traced('lowerReceiver')),
      bar: dim(4.5, 'derived: a forged guard bar'),
      fingerClearance: dim(4, 'derived: room around the finger on the trigger'),
      halfWidth: dim(5, 'derived: a forged guard a little under the lower half width'),
      fingerHalfWidth: dim(8, 'derived: a finger across the guard'),
    },
    trigger: {
      midline: outline(
        [
          [bladeHang[0] + (p[0] - bladeMid[0][0]) * closeUpMmPerPx, bladeHang[1] - (p[1] - bladeMid[0][1]) * closeUpMmPerPx]
          for p in bladeMid
        ],
        'derived: the midline of the ar15-receiver/trigger trace at its rail-pitch scale, hung from the top of the ar15-profile/trigger trace',
      ),
      // The blade is drawn smooth, so it keeps the thickness the close-up shows where it hangs nearly upright.
      thickness: dim(
        closeUpMmPerPx * (bladeFront[1][0] - bladeRear[1][0] + bladeFront[2][0] - bladeRear[2][0]) / 2,
        "derived: the gap between the ar15-receiver/trigger trace's rear and front edges at its two middle levels, at its rail-pitch scale",
      ),
      halfWidth: dim(3, 'derived: a blade narrower than the guard'),
    },
    gripMount: {
      x: dim(gripMount[0], traced('moduleGripToLower')),
      y: dim(gripMount[1], traced('moduleGripToLower')),
      bossRearX: tracedX(380, 'moduleGripToLower'),
    },
  },

  upper: {
    rearX: upperRearX,
    // The receiver's top stands a roof over the charging handle's channel. At the sourced rail height the roof is
    // thinner than that, since the handle is lifted clear over the stock, so the receiver and its rail are raised.
    roof: dim(grains.detailGrain * 1000, "derived: one detail voxel, so the roof over the charging handle's channel exports whole"),
    topY: dim(
      std.max(
        sourcedRailTopY - drawnSlotDepth.mm,
        $.chargingHandle.shaft.bottomY.mm + $.chargingHandle.shaft.depth.mm + $.chargingHandle.shaft.clearance.mm
        + self.roof.mm,
      ),
      "derived: under the rail by its slot depth, or a roof over the charging handle's channel if that is higher; the "
      + "m16a4-side trace's receiver top reads %.1f mm" % sideOverBore(side.receiverTopYPx.value),
    ),
    halfWidth: dim(14.5, 'derived: wider than the rail it carries'),
    // The flat-top's rail is only its teeth, standing on the receiver with its slots cut to the receiver's top.
    rail: {
      rearX: tracedX(386, 'upperRail'),
      topY: dim(
        $.upper.topY.mm + drawnSlotDepth.mm,
        'derived: its teeth on the receiver, %.2f mm above the sourced height so the charging handle\'s channel keeps its roof; sourced at '
        % ($.upper.topY.mm + drawnSlotDepth.mm - sourcedRailTopY)
        + railHeightSource,
      ),
    },
    // The fixed A2 carry handle as convex side outlines: the rear sight housing with its sloped back, the aperture ears
    // over it and the block ahead of them, the bar falling to the front over the hand hole, and the front leg with its
    // rounded corner. The ears stand either side of the aperture's slot, the rest across the handle's width.
    carryHandle: {
      // The receiver's top under the handle, from the flat-top's receiver top up to the window's bottom: the charging
      // handle runs in it, where the flat-top carries its rail.
      base: outline(
        [
          [handleX(side.handleRearXPx.value), $.upper.topY.mm],
          [handleX(handleFront), $.upper.topY.mm],
          handlePoint([handleFront, null]),
          handlePoint([side.handleRearXPx.value, null]),
        ],
        'traced: m16a4-side/handleBaseYPx',
      ),
      housing: handleOutline([[side.handleRearXPx.value, null], [housingFront, null], [housingFront, housingTop], [1240, housingTop]]),
      ears: handleOutline([[1260, housingTop], [1358, housingTop], [1358, 1079], [1272, 1079], [1260, 1092]]),
      housingFront: handleOutline([[1358, housingTop], [housingFront, housingTop], [housingFront, 1088.4], [1358, 1082.8]]),
      bar: outline(
        [
          [handleX(housingFront), handleWindowTopY],
          [handleX(windowFront), handleWindowTopY],
          handlePoint([windowFront, handleBarTop(windowFront)]),
          handlePoint([housingFront, handleBarTop(housingFront)]),
        ],
        "derived: the m16a4-side/carryHandle bar top over a window top lowered from the trace's %g px so the bar's "
        % side.windowTopYPx.value + 'thinnest is one bar depth; the trace thins it to %g px' % side.barDepthPx.value,
      ),
      frontLeg: handleOutline([
        [windowFront, null],
        [handleFront, null],
        [handleFront, 1165],
        [1832, 1148],
        [1820, 1138],
        [windowFront, handleBarTop(windowFront)],
      ]),
      // The ears' foot, where the aperture plate stands on the housing between them.
      earBottomY: dim(sideOverBore(housingTop), 'traced: m16a4-side/housingTopYPx'),
      barDepth: detailWall('the bar over the window front, a'),
      apertureX: dim(handleX(side.apertureXPx.value), 'traced: m16a4-side/apertureXPx'),
      apertureY: dim(sightPlane.mm - flatTopExtra.mm, 'derived: the sight plane less the flat-top extra height, level with the carry-handle front post'),
      apertureHalfHeight: dim(5, 'derived: a flip aperture plate between the ears, a rim round its hole'),
      apertureRadius: dim(
        2.54,
        "sourced: the large 0-2 aperture's 0.200 in (https://www.opticsplanet.com/luth-ar-a2-rear-sight-aperture.html)",
      ),
      apertureThickness: dim(1.5, 'derived: a stamped aperture plate, drawn smooth'),
      slotHalfWidth: dim(3.5, 'derived: the slot between the ears the aperture flips in'),
      halfWidth: dim(9, 'derived: a forged handle narrower than the receiver'),
    },
    forwardAssist: {
      // The profile's trace runs on to its plunger and that plunger's shadow; the close-up shows the housing's rear on
      // the upper's rear face, with only the plunger standing behind it.
      rearX: dim(upperRearX.mm, "derived: the ar15-receiver/forward-assist-housing trace's rear on the upper's rear face"),
      frontX: tracedX(435, 'forwardAssist'),
      topY: tracedY(92, 'forwardAssist'),
      bottomY: tracedY(107, 'forwardAssist'),
      stand: dim(8, 'derived: a housing standing out of the right side'),
    },
    brassDeflector: {
      rearX: tracedX(443, 'brassDeflector'),
      frontX: tracedX(467, 'brassDeflector'),
      topY: tracedY(84, 'brassDeflector'),
      bottomY: tracedY(97, 'brassDeflector'),
      stand: dim(6, 'derived: a hump standing out of the right side'),
    },
    // The port is cut to the cover that closes it, whose size a shop lists. The trace of the cover reads 83.6 mm by
    // 13.1 mm and stands 10.3 mm ahead of the bolt face, so only its bottom edge is kept.
    ejectionPort: {
      frontX: dim(-breechSetback, "derived: on the bolt face, so the bolt's head ejects through the port's front"),
      rearX: dim(self.frontX.mm - $.portCover.length.mm, 'derived: as long as the cover'),
      bottomY: tracedY(121, 'ejectionPortCover'),
      // The cover is drawn thicker than it is, inward into the port, so its inner top edge swings out above the cover's
      // top; the port is cut that much taller.
      topY: dim(
        self.bottomY.mm - $.portCover.rodDrop.mm + std.sqrt(
          std.pow($.portCover.rodDrop.mm + $.portCover.height.mm, 2)
          + std.pow($.portCover.rodStandoff.mm + $.portCover.drawnThickness.mm, 2)
        ),
        "derived: as far over the cover's rod as its drawn inner top edge swings",
      ),
      lane: dim(100, 'derived: room for a spent case to leave the port'),
    },
    wall: detailWall('an aluminium receiver'),
  },

  // The bolt carrier group in battery: the carrier's rear on the upper's rear face, where the buffer meets it, and the
  // bolt's face on the barrel's breech. The carrier's length is the two spans either side of the gas key's rear, so it
  // is derived, not sourced.
  boltCarrier: {
    stroke: dim(95.25, 'sourced: the 3.75 in stroke, ' + gasKeyPatent),
    keyLength: dim(62.611, "sourced: 2.465 in from the carrier's front to the rear of its gas key, " + gasKeyPatent),
    keyRoom: dim(
      99.06,
      "derived: the gas key's rear this far ahead of the upper's rear face, read from the 3.90 in the patent gives the charging handle to draw the key back in, "
      + gasKeyPatent,
    ),
    clearance: dim(0.5, 'derived: a sliding fit in the upper'),
    boltRadius: dim(6.5, "derived: the bolt head standing out of the carrier's front, about 0.5 in across"),
    // The animated cycle's spring return takes about 83 ms over this stroke, so 700 is the fastest sourced rate it fits.
    cyclicRate: rate(700, 'derived: the low end of the M4 rate of 700 to 970 rounds a minute, ' + m4Carbine),
  },

  // The charging handle at rest: its latch closes the upper's rear face and its shaft runs forward under the rail to the
  // carrier's gas key. Drawn, both ride back over the stock, so both stand clear over the taller stock's top.
  chargingHandle: {
    rearX: tracedX(375, 'chargingHandle'),
    topY: tracedY(78, 'chargingHandle'),
    clearance: dim(0.5, "derived: a running clearance over the stock's top"),
    // The trace's 1 px below the collapsible stock's top is read as trace error.
    bottomY: dim(
      std.max($.stock.topY.mm, $.stockA2.combY.mm) + self.clearance.mm,
      "derived: clear over the stock's top, which the handle is drawn back over; the trace reads %.1f mm" % yOf(87),
    ),
    halfWidth: dim($.upper.halfWidth.mm, 'derived: as wide as the upper whose rear it closes'),
    shaft: {
      bottomY: dim($.chargingHandle.bottomY.mm, 'derived: level with the latch, clear over the stock it is drawn back over'),
      depth: dim(detailFeature, 'derived: a shaft two detail voxels deep'),
      halfWidth: dim(detailFeature / 2, 'derived: a shaft two detail voxels wide'),
      clearance: dim(0.5, 'derived: a sliding fit in its channel'),
    },
  },

  // The ejection port's dust cover, closing the port flush with its outer face standing its thickness off the upper's
  // side, and hung on a rod under the port's bottom edge and outboard of the cover. It turns out and down about the rod
  // until its outer face comes to rest on the magazine well's top outer edge, which stands out past the upper's side.
  portCover: {
    length: dim(79.502, 'sourced: 3.13 in, ' + fortisDustCover),
    height: dim(22.479, 'sourced: 0.885 in, listed as its width and read as its height across the port, ' + fortisDustCover),
    thickness: dim(1, 'derived: a stamped steel sheet'),
    drawnThickness: dim(detailFeature, 'derived: two detail voxels, drawn inward of the outer face into the port'),
    rodDrop: dim(0.75, "derived: the rod's centre under the port's bottom edge, in the upper's hinge lugs"),
    rodStandoff: dim(0.85, "derived: the rod's centre outboard of the cover's outer face, inside the knuckle rolled round it"),
    // Where the well's top outer edge stands from the rod, and the turn that brings the outer face onto it.
    local rod = [$.upper.ejectionPort.bottomY.mm - self.rodDrop.mm, $.upper.halfWidth.mm + self.thickness.mm + self.rodStandoff.mm],
    local edge = [$.lower.partingY.mm - rod[0], $.lower.well.outerHalfWidth.mm - rod[1]],
    local turn = std.atan2(-edge[0], edge[1]) + std.acos(-self.rodStandoff.mm / std.sqrt(edge[0] * edge[0] + edge[1] * edge[1])),
    openAngle: angle(turn * 180 / std.pi, "derived: the turn that rests the cover's outer face on the magazine well's top outer edge"),
  },

  barrel: {
    radius: dim((yOf(96) - yOf(112)) / 2, traced('exposedBarrel')),
    breechSetback: dim(breechSetback, 'derived: the listing barrel length less the traced muzzle shoulder'),
    // The journal every barrel is turned to under its gas block, by name.
    journal: choiceOf('gasBlock.journals', '750'),
    // The gas systems by name, each the port a barrel is drilled at; a drop-in handguard is made for one of them.
    gasPorts: gasPorts,
    // A barrel length, by name, with the gas system it is drilled for; lengths are measured from the bolt face.
    lengths: {
      '16-mid': { length: dim(406.4, 'derived: 16 in'), gas: choiceOf('barrel.gasPorts', 'mid') },
      '20-rifle': { length: dim(508, 'derived: 20 in'), gas: choiceOf('barrel.gasPorts', 'rifle') },
    },
  },

  gasBlock: {
    // The journals a block can be bored for, by the name its port standard ends in.
    journals: { '750': journalDiameter },
    length: dim(22, 'derived: a low-profile block about as long as its two set screws need'),
    wall: dim(gasBlockWall, 'derived: a steel wall around the journal, room for the set screws'),
  },

  // The front sight base, measured from the top of the journal at its gas port: a ring round the journal, the sight
  // standing over the ring on one of the profiles below, and the sling loop under the ring. Its heights are the
  // carry-handle base's; each base stands its raise taller.
  frontSightBase: {
    // Each base by the upper top whose rear sight it is made to meet, with how much taller than the carry-handle base
    // it stands.
    raise: {
      'carry-handle': dim(0, 'derived: the base the heights below are measured for'),
      'flat-top': flatTopExtra,
    },
    halfWidth: dim(11.303, 'sourced: 0.89 in across, ' + cmmgSightBase),
    bottomY: dim(
      sightPlane.mm - 92.202 - journalRadius,
      "derived: the flat-top base's 3.63 in height (" + cmmgSightBase + '), read as from its ear tops at the sight plane down to the sling loop',
    ),
    rearOfPort: dim(
      sightBaseRearOfPort,
      "derived: the mid gas port less the Magpul mid-length handguard's 8.6 in mounting length (" + magpulMid
      + ') ahead of the upper; the 12 in rifle handguard puts it within 0.6 mm',
    ),
    sightTipY: dim(
      sightPlane.mm - flatTopExtra.mm - journalRadius,
      'derived: the sight plane less the flat-top extra height, over the top of the journal',
    ),
    wall: dim(gasBlockWall, 'derived: a forged wall round the journal, as on the gas block'),
    slingLoopLength: dim(12, 'derived: a loop a sling clip closes through, centred under the ring'),
    earThickness: dim(3, 'derived: ears guarding the sight'),
    postWidth: dim(1.8, 'derived: a post about 0.07 in square'),
    lugHalfWidth: dim(5, "derived: the bayonet lug, sling loop and the sight's frame narrower than the ring"),
    // The forged A2 triangle, from the base's rear face: a deck over the ring, the rear strut raked back to the rear
    // face, the near-upright front strut, and the crown over the window between them, which is the two ears with the
    // sight's notch between them. The ring runs forward to the front strut's foot, so the front is one face from the
    // strut down past the barrel. The struts are drawn thick and the crown plain, so the triangle reads at a glance. A
    // taller base lifts everything over the deck by its raise.
    'a-frame': {
      deckY: dim(sightBasePoint([0, fsbDeck])[1], 'traced: m16a4-side/fsbDeckYPx'),
      frontFootX: dim(
        sightBasePoint([fsbFront, 0])[0],
        "traced: m16a4-side/fsbFrontXPx; 1.3 mm short of the base's sourced 1.8 in (" + cmmgSightBase
        + "), kept so the front strut's foot is the front face",
      ),
      sightX: dim(sightBasePoint([side.postXPx.value, 0])[0], 'traced: m16a4-side/postXPx'),
      crown: outline(
        [sightBasePoint(p) for p in [[3075.3, crownFoot], [3167.7, crownFoot], [3161, 1124], [3146, 1109], [3130, 1109], [3096, 1130]]],
        'derived: the m16a4-side/frontSightBase crown through its corners, ' + simplified,
      ),
      rearStrut: strut(fsbRear, 3075.3, 1),
      frontStrut: strut(fsbFront, 3167.7, -1),
    },
    // A straight sight block over the middle of the ring, as on a clamp-on front sight gas block, the ears and post
    // standing on its deck, and the bayonet lug under the barrel from the ring's front to the base's length.
    sightBlock: {
      length: dim(45.72, 'sourced: 1.8 in, ' + cmmgSightBase),
      ringLength: dim(25.4, "derived: the ring round the journal, the bayonet lug filling the rest of this base's length"),
      deckAboveJournal: dim(49.276, 'sourced: 1.94 in, https://charliescustomclones.com/front-sight-base-fsb-f-height-750-stripped'),
      blockLength: dim(12, 'derived: a block thinner than the ring'),
    },
  },

  // The fixed rear sight a flat-top carries on its rail, its aperture on the flat-top sight plane the flat-top front
  // sight base is made for.
  rearSight: {
    apertureAboveRail: dim(sightPlane.mm - $.upper.rail.topY.mm, 'derived: the flat-top sight plane over the top rail'),
  },

  // The fixed post a free-float handguard carries at the front of its rail, its tip on the same sight plane.
  railFrontSight: {
    postAboveRail: dim(sightPlane.mm - $.handguard.railTopY.mm, "derived: the flat-top sight plane over the handguard's top rail"),
    clamp: {
      length: dim(25.4, 'sourced: 1.00 in, ' + ddFixedFront),
      width: dim(31.5, 'sourced: 1.24 in, ' + ddFixedFront),
      // The post's protective ears are left undrawn, so only the clamp stands under the post.
      height: dim(5.75, "styled: half a gun unit, a look estimate taken from the generic rail sight's clamp, as the maker states no clamp height"),
    },
    // Square in section, as an A2 post is.
    postWidth: dim(1.78, 'sourced: 0.070 in, ' + ddFixedFront),
  },

  // How far a front post may stand off the rear sight's line, so a post is taken for the base it is nearer.
  sightLine: {
    tolerance: dim(flatTopExtra.mm / 2, 'derived: half the step between the two front sight base heights'),
  },

  handguard: {
    lengths: {
      '15': dim(calibration.lengthMm.value, 'sourced: https://www.jakt.se/anderson-am-15-utility-223-wylde-18-5rd'),
    },
    railTopY: dim($.upper.rail.topY.mm, "derived: flush with the upper's rail, so an optic may span the joint"),
    bottomY: tracedY(120, 'handguard'),
    wall: detailWall('an aluminium tube'),
    outerTopY: dim(
      journalRadius + gasBlockWall + handguardClearance.top + detailFeature,
      'derived: the inner top %g mm over the gas block' % handguardClearance.top,
    ),
    halfWidth: dim(
      journalRadius + gasBlockWall + handguardClearance.side + detailFeature,
      'derived: the inner side %g mm out from the gas block' % handguardClearance.side,
    ),
    chamfer: dim(self.halfWidth.mm - $.rail.topWidth.mm / 2, 'derived: the top flat as wide as the rail it carries'),
    skirt: outline(
      [[xOf(538), yOf(124)], [xOf(545), yOf(127)], [xOf(580), yOf(127)], [xOf(580), yOf(120)], [xOf(538), yOf(120)]],
      traced('handguard'),
    ),
    skirtHalfWidth: dim(17, 'derived: the barrel nut under the tube'),
    // Either handguard's, from its tube's rear end.
    supportHold: dim(
      54,
      "derived: the support palm's middle cupping the tube's rear, a half hand's width ahead of the receiver, " +
      'where the press check proved its thumb reaches the port cover and the charging handle',
    ),
  },

  // The drop-in handguard runs from the delta ring on the barrel nut to the front sight base's rear face, so its length
  // follows the gas system it is made for. Its front cap seats on the base's ring.
  dropInHandguard: {
    halfWidth: dim(31.75, "derived: half the Magpul mid-length handguard's 2.5 in height, " + magpulMid),
    wall: detailWall('a moulded handguard'),
    boreRadius: dim(12.5, "derived: the delta ring and cap clear the barrel nut and barrel, and the cap's hole is smaller than the front sight base's ring"),
    deltaRing: {
      length: dim(12, 'derived: the delta ring and its weld spring, ahead of the barrel nut'),
      halfWidth: dim(33.75, 'derived: the ring standing 2 mm proud of the handguard it holds'),
    },
    capThickness: detailWall('a stamped steel cap, drawn as a'),
  },

  flashHider: {
    length: dim(44.5, 'derived: the A2 birdcage, 1.75 in ahead of the barrel shoulder'),
    radius: dim(11.1, 'derived: the A2 birdcage, 0.875 in across'),
  },

  receiverExtension: {
    // By the buffer each takes, the name its stock port standard ends in. The carbine extension is locked by a castle
    // nut ahead of the collapsible stock; the rifle extension is held by the fixed stock's screw, so it has none.
    buffers: {
      carbine: {
        radius: dim(tubeRadiusOf('carbine'), 'derived: the ar-tube-carbine outer diameter'),
        length: tubeLengths.carbine,
        castleNut: {
          length: dim(xOf(370) - xOf(357), traced('castleNut')),
          radius: dim((yOf(86) - yOf(117)) / 2, traced('castleNut')),
        },
      },
      rifle: {
        radius: dim(tubeRadiusOf('rifle'), 'derived: the ar-tube-rifle outer diameter'),
        length: tubeLengths.rifle,
      },
    },
  },

  // The collapsible stock, measured from the end of its tube at the traced position.
  stock: {
    // The buffer of the extension it slides on.
    buffer: choiceOf('receiverExtension.buffers', 'carbine'),
    frontX: dim(xOf(284) - stockMount[0], traced('moduleStockToReceiverExtension')),
    rearX: dim(xOf(128) - stockMount[0], traced('stock')),
    topY: tracedY(86, 'stock'),
    bottomY: dim(-self.topY.mm, 'derived: the body is centred on the tube'),
    tubeClearance: dim(1, 'derived: a sliding fit on the tube'),
    halfWidth: dim(20, 'derived: a body a little wider than the tube it wraps'),
    toe: collapsibleToe,
    toeHalfWidth: dim(15, 'derived: the toe narrower than the body'),
    chamfer: dim(self.halfWidth.mm - self.toeHalfWidth.mm, 'derived: the bottom flat as wide as the toe under it'),
    // The traced stock stands fully extended, its sleeve clear of the castle nut by more than the travel to its last
    // position, so its positions run forward from the trace.
    positions: count(6, 'sourced: ' + sixPositionTube),
    pitch: dim(
      (m4Lengths.extended - m4Lengths.collapsed) / (self.positions.count - 1),
      'derived: the M4 extended less collapsed overall length (%g mm less %g mm) over the steps between its positions, %s'
      % [m4Lengths.extended, m4Lengths.collapsed, m4Carbine],
    ),
  },

  // The A2 fixed stock, measured from the end of the rifle extension it slides over: the butt plate covers the
  // extension's end, the sleeve wraps the extension to the lower's buffer tower, and the body under it deepens from the
  // tower back to the toe. Its side outline is the butt and the bands between the belly's traced points, each from the
  // comb down; the sleeve holds the extension's room through every band ahead of the butt plate.
  stockA2: {
    buffer: choiceOf('receiverExtension.buffers', 'rifle'),
    frontX: dim(tubeLengths.rifle.mm, "derived: closed against the lower's buffer tower"),
    combY: dim(combY, 'traced: m16a4-side/combYPx'),
    tubeClearance: dim(0.25, 'derived: a fixed stock is a close fit on its extension'),
    butt: stockOutline([
      [134, 157],
      [120, 157],
      [118, 157.9],
      [116, 160.1],
      [115.4, 162],
      [114.6, 170],
      [115.4, 186],
      [116.3, 198],
      [117.5, 210],
      [118.8, 222],
      [120.6, 234],
      [122.7, 246],
      [124.7, 254],
      [127.3, 258],
      [128, 258.5],
      [134, 258.5],
    ]),
    // From the toe forward, past the stock front, which closes on the tower first.
    belly: stockOutline([[134, 258.5], [160, 249.4], [208, 233.2], [256, 217.2], [304, 203.5], [332, 198.4]]),
    halfWidth: dim(20, 'derived: as wide as the collapsible stock'),
  },

  // The pistol grip, measured from the front of its top, where it closes the trigger guard.
  grip: {
    outline: outline(
      aboutMount([[418, 162], [380, 162], [346, 214], [390, 232]], gripMount),
      'derived: the ar15-profile/grip trace with its top levelled to seat on the lower (the rear corner from 158 px to 162 '
      + 'px) and the 1 px kink in its front strap at 391,220 dropped',
    ),
    halfWidth: dim(14, 'derived: a hand-filling A2 grip'),
  },

  masses: {
    ar15_lower: mass(
      0.237 + 0.213 - 0.094,
      'derived: a stripped lower (https://www.primaryarms.com/product/5038) with its parts kit '
      + '(https://www.primaryarms.com/aero-precision-ar-15-complete-lower-receiver-parts-kit-aprh100029), less the kit grip',
    ),
    ar15_upper_flattop: mass(0.196, 'sourced: https://www.wingtactical.com/firearm-parts/ar-15-parts/ar-15-upper-receiver-parts/upper-receivers/aero-precision-mil-spec-ar-15-stripped-upper-receiver/'),
    ar15_barrel_16_mid: mass(0.794, 'sourced: https://www.midwestgunworks.com/page/mgwi/prod/babl556015m'),
    ar15_gas_block_low: mass(0.034, 'sourced: https://www.midwestgunworks.com/page/mgwi/prod/la00243'),
    ar15_handguard_free_float: mass(0.281, 'sourced: https://www.opticsplanet.com/manticore-arms-15in-m-lok-rail-for-ar-15.html'),
    ar15_flash_hider: mass(0.054, 'sourced: https://www.midwestgunworks.com/page/mgwi/prod/aprh100111c'),
    ar15_tube_carbine: mass(0.278, 'sourced: https://www.primaryarms.com/product/5877'),
    ar15_stock_collapsible: mass(0.227, 'sourced: https://www.midwestgunworks.com/page/mgwi/prod/MAG400-BLK'),
    ar15_grip: mass(0.094, 'sourced: https://www.opticsplanet.com/luth-ar-ar-15-a2-pistol-grip.html'),
    ar15_upper_carry_handle: mass(0.272, 'sourced: 9.6 oz stripped, https://heartoftexasarmory.com/luth-ar-a2-stripped-upper-receiver-with-carry-handle-ur-a2-s/'),
    ar15_barrel_20_rifle: mass(0.992, 'sourced: 35 oz, https://www.midwestgunworks.com/page/mgwi/prod/babl556026m'),
    ar15_front_sight_base_flat_top: mass(0.147, 'sourced: 5.19 oz with its post and sling loop, ' + cmmgSightBase),
    ar15_front_sight_base_carry_handle: mass(0.147, 'derived: as the flat-top base (' + cmmgSightBase + '), which is 0.040 in taller'),
    // No sight-block base is sold to weigh; its block is no heavier than the triangle's struts and crown it replaces.
    ar15_front_sight_base_sight_block_flat_top: mass(0.147, 'derived: as the forged flat-top base (' + cmmgSightBase + ')'),
    ar15_front_sight_base_sight_block_carry_handle: mass(0.147, 'derived: as the forged flat-top base (' + cmmgSightBase + ')'),
    ar15_handguard_drop_in_mid: mass(0.247, 'sourced: 8.7 oz, ' + magpulMid),
    ar15_handguard_drop_in_rifle: mass(0.204, 'sourced: 7.2 oz, https://www.opticsplanet.com/luth-ar-a2-rifle-handguard.html'),
    ar15_tube_rifle: mass(
      0.283,
      'sourced: 10 oz with its buffer, spring, spacer and screw, '
      + 'https://www.ar15.build/products/buffer-tube/33353/ar-15-m16-a2-rifle-buffer-tube-assembly-080000625',
    ),
    ar15_stock_a2: mass(0.315, 'sourced: 11.1 oz, https://www.hogueinc.com/overmolded-fixed-buttstock-fits-a2-buffer-tube-black-ar-15-m16'),
    ar15_rear_sight: mass(0.048, 'sourced: 1.7 oz, a fixed A1.5 rear sight, https://www.primaryarms.com/daniel-defense-a1-5-fixed-rear-sight-19-064-11002'),
    ar15_rail_front_sight: mass(0.0312, 'sourced: 1.10 oz, ' + ddFixedFront),
    ar15_bolt_carrier: mass(0.3266, 'sourced: 11.52 oz, https://www.wingtactical.com/firearm-parts/ar-15/upper-receiver-parts/bolts-carriers/aero-precision-complete-5-56-bolt-carrier-group'),
    ar15_charging_handle: mass(0.0312, 'sourced: 1.1 oz, https://www.opticsplanet.com/aero-precision-ar15-standard-charging-handle.html'),
    ar15_port_cover: mass(0.0221, 'sourced: 0.78 oz, https://www.wingtactical.com/firearm-parts-accessories/aero-precision-ar15-dust-cover-assembly'),
  },
}
