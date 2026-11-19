// The AR-15 frame of the modular AR family: every dimension its parts are built from, in millimetres, and the mass of
// every item. Positions are in the gun frame, whose origin is on the bore at the upper receiver's front face, with x to
// the muzzle and y up; a part that moves with a choice (the stock on its tube, the grip, the muzzle device, the gas
// block) is measured from its own mount instead. Each value says where it comes from: 'traced: <trace key>',
// 'sourced: <URL>' or 'derived: <reason>'. Traced values are read off the AM-15 side profile, so a retrace moves them.
local profile = import '../references/ar15-profile.trace.jsonnet';

local dim(mm, source) = { mm: mm, source: source };
local outline(points, source) = { mm: points, source: source };
local mass(kg, source) = { kg: kg, source: source };

// Profile pixels to the gun frame: the handguard calibration sets the scale, the upper front face and the bore the datum.
local calibration = profile.reference.calibration;
local mmPerPx = calibration.lengthMm.value / (calibration.pixels.value[1][0] - calibration.pixels.value[0][0]);
local xOf(px) = (px - profile.values.registrationXPx.value) * mmPerPx;
local yOf(px) = (profile.values.boreYPx.value - px) * mmPerPx;
local traced(key) = 'traced: ar15-profile/' + key;
local tracedX(px, key) = dim(xOf(px), traced(key));
local tracedY(px, key) = dim(yOf(px), traced(key));
// Profile pixel points about a mount point: each point less the mount, in mm.
local aboutMount(pixels, mount) = [[xOf(p[0]) - mount[0], yOf(p[1]) - mount[1]] for p in pixels];
local tracedOutline(pixels, mount, key) = outline(aboutMount(pixels, mount), traced(key));

local picatinny = 'sourced: https://en.wikipedia.org/wiki/Picatinny_rail';
// The parts with thin features export at the detail grain; the thinnest feature it carries evenly is this many mm. An
// authored wall is drawn at least this thick, so the export never drops a voxel from one side of it.
local grains = import 'models/voxel-grains.libsonnet';
local detailFeature = grains.featureVoxels * grains.detailGrain * 1000;
local detailWall(what) = dim(detailFeature, 'derived: ' + what + ' wall two detail voxels thick');
local mounts = (import 'platforms.jsonnet').mounts;
local tubeOuterDiameter = mounts.stock.standards['ar-tube-carbine'].dimensions.outerDiameter;
local journalDiameter = mounts['gas-block'].standards['ar-journal-750'].dimensions.journalDiameter;
local tubeRadius = tubeOuterDiameter.mm / 2;
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
local closeUpCalibration = closeUp.reference.calibration;
local closeUpMmPerPx =
  closeUpCalibration.lengthMm.value / (closeUpCalibration.pixels.value[1][0] - closeUpCalibration.pixels.value[0][0]);
local bladeRear = [[1795, 2120], [1770, 2300], [1800, 2420], [1890, 2520]];
local bladeFront = [[1850, 2120], [1805, 2300], [1830, 2400], [1900, 2490]];
local bladeMid = [[(bladeRear[i][0] + bladeFront[i][0]) / 2, (bladeRear[i][1] + bladeFront[i][1]) / 2] for i in std.range(0, 3)];
local bladeHang = [xOf(440), guardTopY];
// The barrel's breech sits this far behind the upper front face: the listing's 457 mm barrel ends at the traced muzzle
// shoulder.
local breechSetback = profile.values.barrelMm.value - xOf(903);
local tubeLength = 181;
local tubeEndX = xOf(370) - tubeLength;
// The close-up shows the upper's rear face upright where it meets the buffer tower; the profile's outline slants down
// to the parting line only because the forward assist and its shadow hide that face.
local upperRearX = dim(xOf(profile.values.upperRearXPx.value), traced('upperRearXPx'));
local stockMount = [tubeEndX, 0];

{
  rail: {
    pitch: dim(10.01, picatinny),
    slotWidth: dim(5.23, picatinny),
    slotDepth: dim(3.0, picatinny),
    drawnSlotDepth: dim(detailFeature, 'derived: the slot depth exaggerated to two detail voxels, so every slot cuts evenly'),
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
    topY: tracedY(88, 'upperReceiver'),
    halfWidth: dim(14.5, 'derived: wider than the rail it carries'),
    rail: {
      rearX: tracedX(386, 'upperRail'),
      topY: tracedY(75, 'topRailLine'),
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
    ejectionPort: {
      rearX: tracedX(459, 'ejectionPortCover'),
      frontX: tracedX(529, 'ejectionPortCover'),
      topY: tracedY(110, 'ejectionPortCover'),
      bottomY: tracedY(121, 'ejectionPortCover'),
      lane: dim(100, 'derived: room for a spent case to leave the port'),
    },
  },

  barrel: {
    radius: dim((yOf(96) - yOf(112)) / 2, traced('exposedBarrel')),
    breechSetback: dim(breechSetback, 'derived: the listing barrel length less the traced muzzle shoulder'),
    // A barrel length and gas system, by name; lengths and the gas port are measured from the bolt face.
    lengths: {
      '16-mid': {
        length: dim(406.4, 'derived: 16 in'),
        // Sources differ by about an inch: the Primary Arms guide's ~9 in (229 mm) is a rounded figure from the upper's
        // front face, while this is Faxon's barrel print from the bolt face, the datum the barrel is built on.
        gasPort: dim(245.4, 'sourced: 9.66 in from the bolt face, https://www.rifleconfigurator.com/tools/how-ar-15-gas-systems-work'),
      },
    },
  },

  gasBlock: {
    journalRadius: dim(journalRadius, 'derived: the ar-journal-750 journal the block clamps'),
    length: dim(22, 'derived: a low-profile block about as long as its two set screws need'),
    wall: dim(gasBlockWall, 'derived: a steel wall around the journal, room for the set screws'),
  },

  handguard: {
    lengths: {
      '15': dim(calibration.lengthMm.value, 'sourced: https://www.jakt.se/anderson-am-15-utility-223-wylde-18-5rd'),
    },
    railTopY: tracedY(79, 'handguardRail'),
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
    skirt: outline(
      [[xOf(538), yOf(124)], [xOf(545), yOf(127)], [xOf(580), yOf(127)], [xOf(580), yOf(120)], [xOf(538), yOf(120)]],
      traced('handguard'),
    ),
    skirtHalfWidth: dim(17, 'derived: the barrel nut under the tube'),
  },

  flashHider: {
    length: dim(44.5, 'derived: the A2 birdcage, 1.75 in ahead of the barrel shoulder'),
    radius: dim(11.1, 'derived: the A2 birdcage, 0.875 in across'),
  },

  receiverExtension: {
    radius: dim(tubeRadius, 'derived: the ar-tube-carbine outer diameter'),
    length: dim(tubeLength, 'derived: a mil-spec carbine extension, 7.125 in'),
    castleNut: {
      length: dim(xOf(370) - xOf(357), traced('castleNut')),
      radius: dim((yOf(86) - yOf(117)) / 2, traced('castleNut')),
    },
  },

  // The collapsible stock, measured from the end of its tube at the traced position.
  stock: {
    frontX: dim(xOf(284) - stockMount[0], traced('moduleStockToReceiverExtension')),
    rearX: dim(xOf(128) - stockMount[0], traced('stock')),
    topY: tracedY(86, 'stock'),
    bottomY: dim(-yOf(86), 'derived: the body is centred on the tube'),
    tubeClearance: dim(1, 'derived: a sliding fit on the tube'),
    halfWidth: dim(20, 'derived: a body a little wider than the tube it wraps'),
    toe: tracedOutline([[270, 122], [128, 122], [138, 196], [150, 200], [165, 193]], stockMount, 'stock'),
    toeHalfWidth: dim(15, 'derived: the toe narrower than the body'),
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
  },
}
