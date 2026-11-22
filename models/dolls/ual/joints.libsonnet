// The mannequin's trunk, arm and leg joints in the families' terms, the hand's digits by the skeleton's names, and the
// girths both dolls share. The player's trunk, arm, hand and leg stand on them too (models/measures/bust.libsonnet,
// models/measures/arm.libsonnet, models/measures/hand.libsonnet, models/measures/leg.libsonnet), so one garment fits
// both dolls, and they stand apart from measures.libsonnet because that reads the player's measures.
local skeleton = import 'skeleton.libsonnet';
local head = skeleton.head;

// Where the bust's drawing frame stands in the doll frame: on the centre line at the hips' foot, where the pelvis is
// drawn up from. A height of the bust's measures is from there. The hips' foot is flesh, set by hand against the
// mannequin, as no joint marks it.
local bustBase = [0, 0.84, 0];
local inBust(bone) = [head(bone)[i] - bustBase[i] for i in [0, 1, 2]];
// The skeleton is symmetric across x, so each limb is measured on the left, the reference side. The leg hangs as the
// skeleton's does, so the right leg's delta is the left's mirrored. The arm's deltas are taken into the frame the arm
// is drawn in, the right arm hanging with its palm toward +x and its thumb forward, as the UAL doll rests that drawing
// turned into the mannequin's T-pose.
local legDelta(from, to) = local d = skeleton.delta(from + '_l', to + '_l'); [-d[0], d[1], d[2]];
local armDelta(from, to) = local d = skeleton.delta(from + '_l', to + '_l'); [-d[1], -d[0], d[2]];
local knee = legDelta('thigh', 'calf');
local elbow = armDelta('upperarm', 'lowerarm');
local wrist = armDelta('upperarm', 'hand');

// The digits by the skeleton's names: `<finger>_01` at the knuckle, counting out to the tip, and the leaf its last bone
// ends at; the thumb's likewise from its root.
local fingers = ['index', 'middle', 'ring', 'pinky'];
local phalanges = 3;
local thumbBones = 3;
local bone(finger, k) = if k == phalanges then finger + '_04_leaf' else '%s_%02d' % [finger, k + 1];
local thumbBone(k) = if k == thumbBones then 'thumb_04_leaf' else 'thumb_%02d' % (k + 1);
// Each digit bone from its joint to the next, the knuckles and the thumb's root from the wrist, in the arm's frame.
local tails = [[armDelta(bone(f, k), bone(f, k + 1)) for k in std.range(0, phalanges - 1)] for f in fingers];
local thumbTails = [armDelta(thumbBone(k), thumbBone(k + 1)) for k in std.range(0, thumbBones - 1)];
local knuckles = [armDelta('hand', bone(f, 0)) for f in fingers];
local thumbRoot = armDelta('hand', thumbBone(0));
local phalanxLengths = [[-t[1] for t in finger] for finger in tails];
local thumbLengths = [-t[1] for t in thumbTails];
local sum(xs) = std.foldl(function(a, b) a + b, xs, 0);
local fingerLengths = [sum(lengths) for lengths in phalanxLengths];
local palmLength = -knuckles[1][1];
local palmWidth = 0.1;
{
  bustBase: bustBase,
  // In the bust's frame. The girths are flesh, set by hand against the mannequin.
  trunk: {
    spine:: inBust('spine_01'),
    neck:: inBust('neck_01'),
    head:: inBust('Head'),
    // The left shoulder joint; the right one mirrors it across x.
    shoulder:: inBust('upperarm_l'),
    // Where the spine bending in three cuts the chest from the ribs: the armpit.
    chestJoint:: inBust('spine_03')[1],
    waistWidth: 0.25, waistDepth: 0.205, waistHeight: 0.17,
    ribWidth: 0.31, ribDepth: 0.235, ribHeight: 0.06,
    chestWidth: 0.34, chestDepth: 0.28,
    // How far the girdle's top falls from the neck's foot to the chest's side, so the shoulders slope as the trapezius
    // does rather than stand square; worn shells over the shoulders follow it.
    trapeziusDrop: 0.02,
    deltoidCrown: 0.03,
    // The deltoid caps the upper arm, so its plan is round on the arm's depth: a garment over it then clears the arm.
    deltoidRadius: $.arm.upperDepth / 2,
    neckWidth: 0.12,
    // The neck runs from its joint to the chin, which no joint marks; the chin is in the doll's frame.
    chin:: 1.555,
    neckHeight: self.chin - head('neck_01')[1],
  },
  // In the arm's frame, the shoulder joint its origin. The girths are flesh, set by hand against the mannequin.
  arm: {
    origins: { upper: [0, 0, 0], fore: elbow, palm: wrist },
    upperLength: -elbow[1],
    foreLength: elbow[1] - wrist[1],
    upperWidth: 0.125, upperDepth: 0.13,
    foreWidth: 0.105, wristWidth: 0.05,
    // The palm reaches the middle finger's knuckle, and each knuckle's step back from there is the skeleton's.
    palmLength: palmLength,
    palmWidth: palmWidth, palmThickness: 0.04,
    knuckles: knuckles,
    knuckleBack: [k[1] + palmLength for k in knuckles],
    fingers: fingers, fingerGap: 0.003,
    // The skeleton gives each digit bone's length whole (`phalanxLengths`, `thumbLengths`); the shares are its middle
    // finger's and its thumb's, which the family still counts the bones by.
    phalanxLengths: phalanxLengths,
    thumbLengths: thumbLengths,
    fingerLength: fingerLengths[1],
    fingerShares: [l / fingerLengths[1] for l in fingerLengths],
    phalanxShares: [l / fingerLengths[1] for l in phalanxLengths[1]],
    thumbLength: sum(thumbLengths),
    thumbShares: [l / sum(thumbLengths) for l in thumbLengths],
    // The thumb's root as the palm draws its ball, from the skeleton's thumb_01 head.
    thumbRootShare: -thumbRoot[1] / palmLength,
    thumbVolar: thumbRoot[0],
    thumbInset: palmWidth / 2 - thumbRoot[2],
  },
  // The hand's digits as a doll's parts and rig bones are named and laid out, in the arm's frame: each digit's root on
  // the palm and each bone's tail, from its joint to the next, as the skeleton runs it.
  hand: {
    fingers: fingers,
    phalanges: phalanges,
    thumbBones: thumbBones,
    knuckles: knuckles,
    knuckle(i):: knuckles[i],
    thumbRoot: thumbRoot,
    tail(i, k):: tails[i][k],
    length(i, k):: phalanxLengths[i][k],
    part(finger, k):: bone(finger, k),
    thumbPart(k):: thumbBone(k),
    thumbTail(k):: thumbTails[k],
    thumbLength(k):: thumbLengths[k],
  },
  leg: {
    // The left hip joint in the bust's frame; the right one mirrors it across x.
    hip:: inBust('thigh_l'),
    origins: { thigh: [0, 0, 0], shin: knee, foot: legDelta('thigh', 'foot') },
    // The toes bend about ball's head, which the foot is cut across at.
    ballJoint: legDelta('thigh', 'ball'),
    length: head('thigh_l')[1],
    thighLength: -knee[1],
    shoeHeight: head('foot_l')[1],
  },
}
