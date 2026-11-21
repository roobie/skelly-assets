// The UAL doll's measures, in the families' terms (models/measures/ for the player's). Every joint is read off the
// mannequin's skeleton, so a part turns where the skeleton's bone does and a UAL clip moves the flesh with it; the
// girths, the face and the hair are set by hand against the mannequin (models/references/ual1/UAL1_Standard.glb). The
// two dolls share one drawing style, so the chamfers, overlaps and shares that shape the flesh rather than size it
// are the player's.
local skeleton = import 'skeleton.libsonnet';
local joints = import 'joints.libsonnet';
local playerBust = import 'models/measures/bust.libsonnet';
local playerArm = import 'models/measures/arm.libsonnet';
local playerLeg = import 'models/measures/leg.libsonnet';
local head = skeleton.head;
local the(measures, names) = { [name]: measures[name] for name in names };

// The skeleton is symmetric across x, so each limb is measured on the left, the reference side. The arm's deltas are
// taken into the frame the arm is drawn in, the right arm hanging, as the doll rests that drawing turned into the
// mannequin's T-pose.
local armDelta(from, to) = local d = skeleton.delta(from + '_l', to + '_l'); [-d[1], -d[0], d[2]];

local bustBase = joints.bustBase;
local level(bone) = head(bone)[1] - bustBase[1];
// The bone each of the bust family's segments turns with, its joint at the bone's head.
local segmentBones = {
  pelvis: 'pelvis', waist: 'spine_01', ribs: 'spine_02', chest: 'spine_03',
  clavicle_l: 'clavicle_l', clavicle_r: 'clavicle_r', neck: 'neck_01', head: 'Head',
};
local bust = {
  base:: bustBase,
  origins: {
    [segment]: [head(segmentBones[segment])[i] - bustBase[i] for i in [0, 1, 2]]
    for segment in std.objectFields(segmentBones)
  },
  // The waist turns at spine_01; the chest's top is the neck's joint, and the chest's region starts at its own joint,
  // spine_03, which is so the armpit.
  pelvisHeight: level('spine_01'),
  pelvisWidth: 0.32, pelvisDepth: 0.22,
  waistWidth: 0.25, waistDepth: 0.205, waistHeight: 0.17,
  ribWidth: 0.31, ribDepth: 0.235, ribHeight: 0.06,
  chestWidth: 0.34, chestDepth: 0.28,
  local chestFoot = self.pelvisHeight + self.waistHeight + self.ribHeight,
  chestHeight: level('neck_01') - chestFoot,
  armpit: (level('spine_03') - chestFoot) / self.chestHeight,
  chestLowShare: 0.95,
  // The clavicles lift the girdle from halfway between the armpit and the shoulders' top.
  clavicleCut: (level('spine_03') + level('neck_01')) / 2,
  // The shoulder joint is upperarm's head: out past the chest's side, below its top and behind the centre line.
  shoulderJointOut: head('upperarm_l')[0] - self.chestWidth / 2,
  shoulderJointBelow: head('neck_01')[1] - head('upperarm_l')[1],
  shoulderJointForward: head('upperarm_l')[2] - bustBase[2],
  trapeziusDrop: 0.02,
  deltoidRadius: 0.065, deltoidCrown: 0.03,
  // The neck runs from its joint to the chin, and on into the head to the head's joint. The chin is flesh, set by hand
  // against the mannequin, as no joint marks it.
  chin:: 1.555,
  neckWidth: 0.12,
  neckHeight: self.chin - head('neck_01')[1],
  neckOverlap: head('Head')[1] - self.chin,
} + the(playerBust, [
  'headWidth', 'headHeight', 'headDepth', 'jawHeight', 'torsoChamfer', 'chestChamfer', 'eyeShare', 'hairCover',
  'hairThickness', 'facePower', 'hairSweep', 'hairRise', 'hairCrownShare', 'hairCrownBack', 'hairLayerCount',
]);

local fingers = ['index', 'middle', 'ring', 'pinky'];
local phalanges = 3;
local thumbBones = 3;
// A digit's bones by UAL's names, `<finger>_01` at the knuckle, and the leaf its last one ends at.
local bone(finger, k) = if k == phalanges then finger + '_04_leaf' else '%s_%02d' % [finger, k + 1];
local thumbBone(k) = if k == thumbBones then 'thumb_04_leaf' else 'thumb_%02d' % (k + 1);
local tails = [[armDelta(bone(f, k), bone(f, k + 1)) for k in std.range(0, phalanges - 1)] for f in fingers];
local thumbTails = [armDelta(thumbBone(k), thumbBone(k + 1)) for k in std.range(0, thumbBones - 1)];
local knuckles = [armDelta('hand', bone(f, 0)) for f in fingers];
local thumbRoot = armDelta('hand', thumbBone(0));
local sum(xs) = std.foldl(function(a, b) a + b, xs, 0);

local arm = {
  local elbow = armDelta('upperarm', 'lowerarm'),
  local wrist = armDelta('upperarm', 'hand'),
  origins: { upper: [0, 0, 0], fore: elbow, palm: wrist },
  upperLength: -elbow[1],
  foreLength: elbow[1] - wrist[1],
  upperWidth: 0.125, upperDepth: 0.13,
  foreWidth: 0.105, wristWidth: 0.05,
  foreDepthExtra: 0.001, wristDepthExtra: 0.0075, wristShare: 0.3,
  // The palm reaches the middle finger's knuckle, and each knuckle's step back from there is the skeleton's.
  palmLength: -knuckles[1][1],
  knuckleBack: [k[1] + self.palmLength for k in knuckles],
  palmWidth: 0.1, palmThickness: 0.04,
  fingers: fingers, fingerGap: 0.003,
  // The skeleton gives each digit bone's length whole (`phalanxLengths`, `thumbLengths`); the shares are its middle
  // finger's and its thumb's, which the family still counts the bones by.
  local fingerLengths = [sum([-t[1] for t in tails[i]]) for i in std.range(0, std.length(fingers) - 1)],
  fingerLength: fingerLengths[1],
  fingerShares: [l / self.fingerLength for l in fingerLengths],
  phalanxShares: [-t[1] / self.fingerLength for t in tails[1]],
  thumbLength: sum([-t[1] for t in thumbTails]),
  thumbShares: [-t[1] / self.thumbLength for t in thumbTails],
  phalanxLengths: [[-t[1] for t in finger] for finger in tails],
  thumbLengths: [-t[1] for t in thumbTails],
  knuckles: knuckles,
  // The thumb's root as the palm draws its ball, from the skeleton's thumb_01 head.
  thumbRootShare: -thumbRoot[1] / self.palmLength,
  thumbVolar: thumbRoot[0],
  thumbInset: self.palmWidth / 2 - thumbRoot[2],
} + the(playerArm, [
  'seamOverlap', 'handOverlap', 'armChamfer', 'wristChamfer', 'fingerThicknessShare', 'thumbThicknessShare',
  'fingerFrontShare', 'thumbProjection', 'knuckleVolar',
]);

local leg = joints.leg {
  thighTop: playerLeg.hipsOverlap - level('thigh_l'),
  thighWidth: 0.155, thighDepth: 0.19,
  shinWidth: 0.11, shinDepth: 0.135,
  shoeWidth: 0.11,
  // The toes' tips and the heel's back, from the ankle's joint along z: flesh, set by hand against the mannequin's
  // shoe, since its skeleton ends the toes at ball_leaf, short of their tips, and has no heel.
  toeReach: 0.2408, heelReach: 0.0612,
} + the(playerLeg, [
  'thighChamfer', 'shinChamfer', 'shoeChamfer', 'kneeOverlap', 'ankleOverlap', 'upperSideInset', 'upperLengthInset',
  'upperBackShift',
]);

// The hand's layout in the terms of models/measures/hand.libsonnet, so the set and the rig lay a UAL hand out as they
// do the player's: each digit's socket is the skeleton's next joint (`tail`), where the player's hangs straight down.
local hand = {
  fingers: fingers,
  phalanges: phalanges,
  knuckles: knuckles,
  knuckle(i):: knuckles[i],
  thumbRoot: thumbRoot,
  tail(i, k):: tails[i][k],
  length(i, k):: -tails[i][k][1],
  part(finger, k):: bone(finger, k),
  thumbBones: thumbBones,
  thumbPart(k):: thumbBone(k),
  thumbTail(k):: thumbTails[k],
  thumbLength(k):: -thumbTails[k][1],
};

{ bust: bust, arm: arm, leg: leg, hand: hand }
