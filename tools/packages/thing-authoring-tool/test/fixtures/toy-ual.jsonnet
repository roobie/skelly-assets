// A toy doll shaped like a skeleton that is not the player's, as the UAL mannequin's is: the player's measures with the
// trunk bent at three spine joints and the clavicles, joints off the limbs' centre lines, a foot bending at its ball,
// a knuckle row of its own and its own part names. The families' parameters for such a body are checked on it.
local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local fit = import 'packages/thing-authoring-tool/worn-fit.libsonnet';
local arm = import 'models/measures/arm.libsonnet';
local leg = import 'models/measures/leg.libsonnet';
local bust = import 'models/measures/bust.libsonnet';
local girdle = (import 'models/girdle.libsonnet')(bust);
local band = import 'models/head-band.libsonnet';
local hand = (import 'models/measures/hand.libsonnet') + {
  part(finger, k):: '%s_%02d' % [finger, k + 1],
  // A knuckle row straighter than the player's, a few millimetres further from the wrist.
  knuckles:: [[k[0], k[1] - 0.004, k[2]] for k in super.knuckles],
};
local skin = { skin: 'body-skin-player', underwear: 'cloth-pants-player' };
local item(id, part) = { id: id, title: id, exportMass: 'parts', parts: [part], connections: [] };

local waistTop = bust.pelvisHeight + bust.waistHeight;
local armpit = waistTop + bust.ribHeight + bust.chestHeight * bust.armpit;
local spineCuts = { ribs: waistTop + bust.ribHeight / 2, chest: armpit, clavicle: (armpit + girdle.chestTop) / 2 };
local bustOrigins = {
  pelvis: [0, 0, 0],
  waist: [0, bust.pelvisHeight, 0.01],
  ribs: [0, spineCuts.ribs, 0.015],
  chest: [0, spineCuts.chest, 0.012],
  'clavicle-left': [0.03, spineCuts.clavicle, 0.01],
  'clavicle-right': [-0.03, spineCuts.clavicle, 0.01],
};
local bustPart(segment) = h.part(segment, 'bust', 1, girdle.bustParams {
  segment: segment,
  hairRing: band.hairRing,
  spineCuts: spineCuts,
  origins: bustOrigins,
}, skin);

local elbow = -arm.upperLength, wrist = elbow - arm.foreLength;
local armPart(id, segment) = h.part(id, 'avatarArm', 1, arm + segment + {
  origins: { upper: [0, 0, 0.004], fore: [0.003, elbow, -0.006], palm: [0.002, wrist, 0.004] },
  knuckles: hand.knuckles,
}, skin);

local ankle = -leg.length + leg.shoeHeight;
local footOrigin = [0, ankle, -0.01];
// Behind the toes, across the instep.
local ballJoint = [0, -leg.length + 0.02, leg.toeReach - leg.upperLengthInset - leg.upperBackShift - 0.05];
local legPart(segment) = h.part(segment, 'avatarLeg', 1, leg {
  segment: segment,
  origins: { thigh: [0, 0, 0], shin: [0, -leg.thighLength, 0.02], foot: footOrigin },
  ballJoint: ballJoint,
}, skin);

local jacket = fit.torso('toy_jacket', { cloth: 'paint-charcoal', zip: 'paint-charcoal' }, {
  spine: {
    cuts: spineCuts,
    segments: {
      waist: { part: 'waist', origin: bustOrigins.waist },
      belly: { part: 'ribs', origin: bustOrigins.ribs },
      body: { part: 'chest', origin: bustOrigins.chest },
    },
  },
}, title='Toy jacket');
local boot = fit.feet('toy_boot', { upper: 'paint-charcoal', toe: 'paint-charcoal', sole: 'paint-charcoal', collar: 'paint-charcoal' },
                      { l: 0.3, w: 0.13, s: 0.025, toe: 0.085, instep: 0.11, top: 0.18, laces: 0 },
                      { covers: ['sole'], ball: { joint: [ballJoint[i] - footOrigin[i] for i in [0, 1, 2]], part: 'ball' } },
                      title='Toy boot');

{
  units: { metresPerUnit: 1, grid: 0.001, bevel: 0 },
  facets: 12,
  defaultMaterial: 'paint-charcoal',
  spineCuts: spineCuts,
  parts: {
    bust: [item('toy_bust_' + segment, bustPart(segment)) for segment in std.objectFields(bustOrigins)],
    arm: [
      item('toy_arm_' + segment, armPart(segment, { segment: segment }))
      for segment in ['upper', 'fore', 'palm']
    ] + [
      item('toy_arm_' + hand.part('index', 0), armPart(hand.part('index', 0), { segment: 'finger', finger: 'index', phalanx: 0 })),
      item('toy_arm_' + hand.thumbPart(0), armPart(hand.thumbPart(0), { segment: 'thumb', phalanx: 0 })),
    ],
    leg: [item('toy_leg_' + segment, legPart(segment)) for segment in ['thigh', 'shin', 'foot', 'ball']],
  },
  garments: { jacket: jacket.rows, boot: boot.rows },
}
