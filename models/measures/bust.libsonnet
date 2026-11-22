// The player bust's measures, hips to crown. Worn shells fit around these, so the bust and its gear share one source.
// The trunk's joints, levels and girths are the UAL doll's (models/dolls/ual/joints.libsonnet), so one garment fits
// both dolls; the pelvis and the lower chest are the player's own, as its drawing needs. Each joint is
// above the hips' foot, the bust's frame.
local ual = (import 'models/dolls/ual/joints.libsonnet').trunk;
local spine = ual.spine, neck = ual.neck, head = ual.head, shoulder = ual.shoulder;
local the(measures, names) = { [name]: measures[name] for name in names };
{
  // The pivots the rig turns the trunk, the neck, the head and the left clavicle about; the right clavicle mirrors the
  // left across x. Hidden, as the bust family draws no joint.
  joints:: { spine: spine, neck: neck, head: head, clavicle: ual.clavicle },
  // The height the clavicles lift the shoulder girdles from. Hidden, as only the torso and the clavicle are cut there;
  // other busts drawn from these measures keep their girdle whole.
  clavicleCut:: ual.clavicleCut,
  pelvisWidth: 0.33, pelvisDepth: 0.2, pelvisHeight: spine[1],
  local chestFoot = self.pelvisHeight + self.waistHeight + self.ribHeight,
  // The chest's top is the neck's joint.
  chestHeight: neck[1] - chestFoot,
  // How far up the chest the armpit lies, as a share of its height: the top of the trunk a sleeveless shell covers, so
  // it and the shoulders over it each stay whole parts where a spine bending in three would cut the chest from the ribs.
  armpit: (ual.chestJoint - chestFoot) / self.chestHeight,
  // The lower chest's width as a share of the chest's: narrow enough that a sleeveless shell of the under layer fits
  // between it and the hanging arm, which the worn fit asserts.
  chestLowShare: 0.86,
  // The hips', waist's and ribs' plan corners are cut at `torsoChamfer`, the chest's at `chestChamfer`.
  torsoChamfer: 0.05, chestChamfer: 0.06,
  // The upper arm hangs just ahead of a chest shell's back corners, so they are cut no deeper than this: a deeper cut
  // brings them forward under the arm's back.
  // Hidden, as no body part takes it.
  chestBackCut:: 0.05,
  // The shoulder joint, which the arm pivots on: how far out past the chest's side, how far below its top and how far
  // ahead of the trunk's centre line. The rig and the baked poses were judged on this joint, so moving it asks for them
  // to be judged again.
  shoulderJointOut: shoulder[0] - self.chestWidth / 2,
  shoulderJointBelow: neck[1] - shoulder[1],
  shoulderJointForward: shoulder[2],
  // The neck runs from its joint to the chin, and on into the head to the head's joint.
  neckOverlap: head[1] - neck[1] - self.neckHeight,
  headWidth: 0.165, headHeight: 0.268, headDepth: 0.214, jawHeight: 0.09, hairCover: 0.07,
  // How far up the head the eyes lie, as a share of its height, so a visor's slit can be set over them.
  eyeShare: 0.58,
  // How far the hair lies off the skull, and the exponent of the plan superellipse the face, skull and hair share.
  hairThickness: 0.005, facePower: 2.8,
  // How far back the hair's dome sits on the skull, so the crown's hair lies thicker behind than over the brow.
  hairSweep: 0.004,
  // The hair's dome: how far its top stands above the skull's, and its top layer's plan, as a share of the head's and
  // set back, so the crown's hair lies thicker behind. A rigid head piece clears each of its layers.
  hairRise: 0.006, hairCrownShare: 0.72, hairCrownBack: 0.014, hairLayerCount: 3,
  // How far the head's attachment frame sits under the eyes, where the game wears goggles and lamps
  // (models/head-band.libsonnet), and so how far it sits above the top of the neck. Hidden, as no body part takes them.
  headFrameUnderEyes:: 0.03594,
  headFrameRise:: self.eye[1] - self.headFrameUnderEyes,
  // Where the figure looks from, from the head's joint: level with the drawn eyes, on the centre line and
  // `eyeBehindFace` behind the face's front, where the eyeballs' centres lie. Hidden, as no body part takes them.
  eyeBehindFace:: 0.027,
  eye:: [0, self.headHeight * self.eyeShare - self.neckOverlap, self.headDepth / 2 - self.eyeBehindFace - head[2]],
  // The grain the doll's models are voxelised at (the player bust and its limbs), which the head's drawn surface
  // inherits. Hidden, as no body part takes it.
  voxelGrain:: 0.006,
} + the(ual, [
  'waistWidth', 'waistDepth', 'waistHeight', 'ribWidth', 'ribDepth', 'ribHeight', 'chestWidth', 'chestDepth',
  'trapeziusDrop', 'deltoidCrown', 'deltoidRadius', 'neckWidth', 'neckHeight',
])
