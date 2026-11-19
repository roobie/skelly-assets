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
// A traced outline about a mount point: each pixel point less the mount, in mm.
local tracedOutline(pixels, mount, key) = outline([[xOf(p[0]) - mount[0], yOf(p[1]) - mount[1]] for p in pixels], traced(key));

local picatinny = 'sourced: https://en.wikipedia.org/wiki/Picatinny_rail';
local mounts = (import 'platforms.jsonnet').mounts;
local tubeOuterDiameter = mounts.stock.standards['ar-tube-carbine'].dimensions.outerDiameter;
local journalDiameter = mounts['gas-block'].standards['ar-journal-750'].dimensions.journalDiameter;
local tubeRadius = tubeOuterDiameter.mm / 2;

// The parting line is traced level: its 3 px fall across the receiver is the photo's tilt, which the rail line shares.
local partingY = (yOf(121) + yOf(124)) / 2;
// The body of the shared stanag-30 magazine as the magazine family builds it: its depth and width, and how far its top
// stands above the seat it hangs from. test/arModular.test.ts holds the well to the built magazine.
local magazine = {
  depth: 63.25,
  width: 25.875,
  topAboveSeat: 8.625,
};
local wellClearance = 0.5;
local wellFrontX = xOf(526);
local wellInnerFrontX = wellFrontX - 3.1;
// The grip seats level on the lower: its top is taken at the traced front corner, the 4 px rise behind it being tilt.
local gripMount = [xOf(418), yOf(162)];
local guardTopY = yOf(145);
// The barrel's breech sits this far behind the upper front face: the listing's 457 mm barrel ends at the traced muzzle
// shoulder.
local breechSetback = profile.values.barrelMm.value - xOf(903);
local tubeLength = 181;
local tubeEndX = xOf(370) - tubeLength;
local stockMount = [tubeEndX, 0];

{
  rail: {
    pitch: dim(10.01, picatinny),
    slotWidth: dim(5.23, picatinny),
    slotDepth: dim(3.0, picatinny),
    topWidth: dim(21.21, 'sourced: https://www.shootingillustrated.com/content/is-your-rail-truly-mil-spec'),
  },

  lower: {
    partingY: dim(partingY, traced('moduleUpperLowerParting')),
    pivotPinX: tracedX(532, 'pivotPin'),
    // The buffer tower the receiver extension threads into, and the body under the upper.
    towerRearX: tracedX(370, 'moduleReceiverExtensionToLower'),
    bodyRearX: tracedX(376, 'lowerReceiver'),
    towerBottomY: tracedY(132, 'lowerReceiver'),
    towerTopY: dim(tubeRadius + 3, 'derived: a 3 mm wall over the receiver extension thread'),
    bodyChamferX: tracedX(380, 'lowerReceiver'),
    bodyBottomY: tracedY(145, 'lowerReceiver'),
    halfWidth: dim(11, 'derived: narrower than the magazine well, as on the forging'),
    well: {
      clearance: dim(wellClearance, 'derived: a sliding fit around the magazine body'),
      frontX: dim(wellFrontX, traced('lowerReceiver')),
      innerFrontX: dim(wellInnerFrontX, 'derived: a 3.1 mm front wall'),
      rearX: tracedX(467, 'lowerReceiver'),
      innerRearX: dim(wellInnerFrontX - magazine.depth - 2 * wellClearance, 'derived: the magazine body depth and 0.5 mm clearance each side'),
      frontBottomY: tracedY(160, 'lowerReceiver'),
      rearBottomY: tracedY(170, 'moduleMagazineWell'),
      innerHalfWidth: dim(magazine.width / 2 + wellClearance, 'derived: the magazine body width and 0.5 mm clearance each side'),
      outerHalfWidth: dim(magazine.width / 2 + wellClearance + 3, 'derived: a 3 mm side wall'),
    },
    magazineSeat: {
      x: dim(wellInnerFrontX - wellClearance - magazine.depth / 2, 'derived: the magazine body centred in the well'),
      y: dim(partingY - 1 - magazine.topAboveSeat, 'derived: the magazine top 1 mm under the upper'),
    },
    triggerGuard: {
      rearX: dim(gripMount[0], 'derived: closed against the traced grip front'),
      frontX: tracedX(467, 'triggerGuard'),
      bottomY: tracedY(170, 'triggerGuard'),
      topY: dim(guardTopY, traced('lowerReceiver')),
      bar: dim(4.5, 'derived: a forged guard bar'),
      fingerClearance: dim(4, 'derived: room around the finger on the trigger'),
      halfWidth: dim(5, 'derived: a forged guard a little under the lower half width'),
      fingerHalfWidth: dim(8, 'derived: a finger across the guard'),
    },
    gripMount: {
      x: dim(gripMount[0], traced('moduleGripToLower')),
      y: dim(gripMount[1], traced('moduleGripToLower')),
      bossRearX: tracedX(380, 'moduleGripToLower'),
    },
  },

  upper: {
    rearX: tracedX(376, 'upperReceiver'),
    shoulderX: tracedX(381, 'upperReceiver'),
    topY: tracedY(88, 'upperReceiver'),
    halfWidth: dim(14.5, 'derived: wider than the rail it carries'),
    rail: {
      rearX: tracedX(386, 'upperRail'),
      topY: tracedY(75, 'topRailLine'),
    },
    forwardAssist: {
      rearX: tracedX(372, 'forwardAssist'),
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
        gasPort: dim(245.4, 'sourced: https://www.rifleconfigurator.com/tools/how-ar-15-gas-systems-work'),
      },
    },
  },

  gasBlock: {
    journalRadius: dim(journalDiameter.mm / 2, 'derived: the ar-journal-750 journal the block clamps'),
    length: dim(22, 'derived: a low-profile block about as long as its two set screws need'),
    wall: dim(4, 'derived: a steel wall around the journal, room for the set screws'),
  },

  handguard: {
    lengths: {
      '15': dim(calibration.lengthMm.value, 'sourced: https://www.jakt.se/anderson-am-15-utility-223-wylde-18-5rd'),
    },
    railTopY: tracedY(79, 'handguardRail'),
    bottomY: tracedY(120, 'handguard'),
    wall: dim(3, 'derived: an aluminium tube wall'),
    outerTopY: dim(18.5, 'derived: the inner top 2 mm over the gas block'),
    halfWidth: dim(19, 'derived: the inner side 2.5 mm out from the gas block'),
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
    toe: tracedOutline([[284, 122], [128, 122], [138, 196], [150, 200], [165, 193]], stockMount, 'stock'),
    toeHalfWidth: dim(15, 'derived: the toe narrower than the body'),
  },

  // The pistol grip, measured from the front of its top, where it closes the trigger guard.
  grip: {
    outline: tracedOutline([[418, 162], [380, 162], [346, 214], [390, 232]], gripMount, 'grip'),
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
