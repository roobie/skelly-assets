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

local bustBase = joints.bustBase;
local level(bone) = head(bone)[1] - bustBase[1];
// The bone each of the bust family's segments turns with, its joint at the bone's head.
local segmentBones = {
  pelvis: 'pelvis', waist: 'spine_01', ribs: 'spine_02', chest: 'spine_03',
  clavicle_l: 'clavicle_l', clavicle_r: 'clavicle_r', neck: 'neck_01', head: 'Head',
};
local trunk = joints.trunk;
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
  local chestFoot = self.pelvisHeight + self.waistHeight + self.ribHeight,
  chestHeight: level('neck_01') - chestFoot,
  armpit: (trunk.chestJoint[1] - chestFoot) / self.chestHeight,
  clavicleCut: trunk.clavicleCut,
  // The shoulder joint is upperarm's head: out past the chest's side, below its top and behind the centre line.
  shoulderJointOut: head('upperarm_l')[0] - self.chestWidth / 2,
  shoulderJointBelow: head('neck_01')[1] - head('upperarm_l')[1],
  shoulderJointForward: head('upperarm_l')[2] - bustBase[2],
  // The neck runs on past the chin into the head, to the head's joint.
  neckOverlap: head('Head')[1] - trunk.chin,
} + the(trunk, [
  'waistWidth', 'waistDepth', 'waistHeight', 'ribWidth', 'ribDepth', 'ribHeight', 'chestWidth', 'chestDepth',
  'trapeziusDrop', 'deltoidCrown', 'deltoidRadius', 'neckWidth', 'neckHeight',
]) + the(playerBust, [
  'chestLowShare', 'headWidth', 'headHeight', 'headDepth', 'jawHeight', 'torsoChamfer', 'chestChamfer', 'eyeShare',
  'hairCover', 'hairThickness', 'facePower', 'hairSweep', 'hairRise', 'hairCrownShare', 'hairCrownBack',
  'hairLayerCount',
]);

local arm = joints.arm {
  foreDepthExtra: 0.001, wristDepthExtra: 0.0075, wristShare: 0.3,
} + the(playerArm, [
  'seamOverlap', 'handOverlap', 'armChamfer', 'wristChamfer', 'fingerThicknessShare', 'thumbThicknessShare',
  'fingerFrontShare', 'thumbProjection',
]);

local leg = joints.leg {
  thighTop: playerLeg.hipsOverlap - level('thigh_l'),
} + the(playerLeg, [
  'thighChamfer', 'shinChamfer', 'shoeChamfer', 'kneeOverlap', 'ankleOverlap', 'upperSideInset', 'upperLengthInset',
  'upperBackShift',
]);

// The hand's layout in the terms of models/measures/hand.libsonnet, so the set and the rig lay a UAL hand out as they
// do the player's: each digit's socket is the skeleton's next joint (`tail`), where the player's hangs straight down.
local hand = joints.hand;

{ bust: bust, arm: arm, leg: leg, hand: hand }
