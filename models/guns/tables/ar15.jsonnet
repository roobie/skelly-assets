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
local flatTopExtra = mounts['sight-height'].standards['ar-flat-top'].dimensions.baseExtraHeight.mm;
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
local railTopY = tracedY(75, 'topRailLine');
// The flat-top's front post stands at this height over the bore; the carry-handle base is the ar-flat-top extra lower.
local sightPlane = dim(66.04, 'sourced: 2.6 in, the M4 front sight base, https://www.recoilweb.com/back-up-iron-sights-78135.html?nonamp=1');
local wingCarryHandle = 'https://www.wingtactical.com/accessories/optics-sights/sights/aero-precision-a2-detachable-carry-handle-with-rear-sight';
local cmmgSightBase = 'https://www.wingtactical.com/firearm-parts-accessories/cmmg-a2-front-sight-base-assembly';

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
      topY: railTopY,
    },
    // The fixed A2 carry handle, from the receiver's rear face forward: the rear sight housing, the bar a hand closes
    // round, and the front leg. No print of the fixed handle was found, so it takes the detachable handle's size.
    carryHandle: {
      length: dim(176.276, "sourced: the detachable A2 handle's 6.94 in, " + wingCarryHandle),
      topY: dim(
        railTopY.mm + 41.402,
        "derived: the detachable A2 handle's 1.63 in (" + wingCarryHandle + ') over the flat-top rail, the fixed one standing as tall',
      ),
      apertureY: dim(sightPlane.mm - flatTopExtra, 'derived: the sight plane less the ar-flat-top extra height, level with the carry-handle front post'),
      apertureHalfHeight: dim(3, 'derived: a flip aperture plate between the ears'),
      apertureThickness: dim(1.5, 'derived: a stamped aperture plate, drawn smooth'),
      slotHalfWidth: dim(3.5, 'derived: the slot between the ears the aperture flips in'),
      halfWidth: dim(9, 'derived: a forged handle narrower than the receiver'),
      rearSightLength: dim(30, 'derived: the rear sight housing with its windage drum'),
      barDepth: dim(12, 'derived: a bar a hand closes round'),
      frontLegLength: dim(20, 'derived: a forged leg standing on the receiver'),
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
    // The gas systems by name, each the port a barrel is drilled at; a drop-in handguard is made for one of them.
    gasPorts: gasPorts,
    // A barrel length and gas system, by name; lengths and the gas port are measured from the bolt face.
    lengths: {
      '16-mid': { length: dim(406.4, 'derived: 16 in'), gasPort: gasPorts.mid },
      '20-rifle': { length: dim(508, 'derived: 20 in'), gasPort: gasPorts.rifle },
    },
  },

  gasBlock: {
    journalRadius: dim(journalRadius, 'derived: the ar-journal-750 journal the block clamps'),
    // The journals a block can be bored for, by the name its port standard ends in; the barrel has the 0.750 in one.
    journals: {
      '750': journalDiameter,
      '936': mounts['gas-block'].standards['ar-journal-936'].dimensions.journalDiameter,
    },
    length: dim(22, 'derived: a low-profile block about as long as its two set screws need'),
    wall: dim(gasBlockWall, 'derived: a steel wall around the journal, room for the set screws'),
  },

  // The A2 front sight base, measured from the top of the journal at its gas port: a ring round the journal with the
  // bayonet lug ahead of it, the tower, the post between its ears, and the sling loop under the ring. Its heights are
  // the carry-handle base's; the flat-top base stands the ar-flat-top extra height taller.
  frontSightBase: {
    length: dim(45.72, 'sourced: 1.8 in, ' + cmmgSightBase),
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
    deckAboveJournal: dim(49.276, 'sourced: 1.94 in, https://charliescustomclones.com/front-sight-base-fsb-f-height-750-stripped'),
    postTipY: dim(
      sightPlane.mm - flatTopExtra - journalRadius,
      'derived: the sight plane less the ar-flat-top extra height, over the top of the journal',
    ),
    ringLength: dim(25.4, 'derived: the ring round the journal, the bayonet lug filling the rest of the length'),
    wall: dim(gasBlockWall, 'derived: a forged wall round the journal, as on the gas block'),
    towerLength: dim(12, 'derived: a tower thinner than the ring, as forged'),
    earThickness: dim(3, 'derived: ears guarding the post'),
    postWidth: dim(1.8, 'derived: a post about 0.07 in square'),
    lugHalfWidth: dim(5, 'derived: the bayonet lug and sling loop narrower than the ring'),
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
    radius: dim(tubeRadius, 'derived: the ar-tube-carbine outer diameter'),
    // By the buffer each takes, the name its stock port standard ends in. The carbine extension is locked by a castle
    // nut ahead of the collapsible stock; the rifle extension is held by the fixed stock's screw, so it has none.
    buffers: {
      carbine: {
        length: tubeLengths.carbine,
        castleNut: {
          length: dim(xOf(370) - xOf(357), traced('castleNut')),
          radius: dim((yOf(86) - yOf(117)) / 2, traced('castleNut')),
        },
      },
      rifle: { length: tubeLengths.rifle },
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
    toe: collapsibleToe,
    toeHalfWidth: dim(15, 'derived: the toe narrower than the body'),
  },

  // The A2 fixed stock, measured from the end of the rifle extension it slides over: its front closes against the
  // lower's buffer tower, and the butt plate covers the extension's end. No A2 side reference is traced, so its depth
  // is the traced collapsible stock's.
  stockA2: {
    frontX: dim(tubeLengths.rifle.mm, "derived: closed against the lower's buffer tower"),
    rearX: dim(
      tubeLengths.rifle.mm - 266.7,
      'derived: 10-1/2 in long (https://www.gunmann.com/learning/a1-vs-a2-stock/); the 13.5 in length of pull the same '
      + 'page gives comes out 0.3 in longer from the trigger',
    ),
    topY: dim(tubeRadius + 6, 'derived: the comb a 6 mm wall over the extension'),
    frontBottomY: dim(-tubeRadius - 6, 'derived: a 6 mm wall under the extension where the stock meets the tower'),
    toeY: dim(std.foldl(std.min, [p[1] for p in collapsibleToe.mm], 0), 'derived: the butt as deep as the traced collapsible toe'),
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
    ar15_handguard_drop_in_mid: mass(0.247, 'sourced: 8.7 oz, ' + magpulMid),
    ar15_handguard_drop_in_rifle: mass(0.204, 'sourced: 7.2 oz, https://www.opticsplanet.com/luth-ar-a2-rifle-handguard.html'),
    ar15_tube_rifle: mass(
      0.283,
      'sourced: 10 oz with its buffer, spring, spacer and screw, '
      + 'https://www.ar15.build/products/buffer-tube/33353/ar-15-m16-a2-rifle-buffer-tube-assembly-080000625',
    ),
    ar15_stock_a2: mass(0.315, 'sourced: 11.1 oz, https://www.hogueinc.com/overmolded-fixed-buttstock-fits-a2-buffer-tube-black-ar-15-m16'),
  },
}
