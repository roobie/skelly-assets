// The joint ranges and reach poles of a human body, which every doll's rig takes for the joints it shares with it, so
// one body's range is one body's range on whichever doll it is drawn as. Fields and conventions are a rig's
// (models/dolls/player/rig.libsonnet).
{
  // The root's flex is the body's pitch in the world, no joint's, so it reaches a figure lying on its front or back.
  pelvis: { flex: [-90, 90], twist: [-30, 30], abduct: [-15, 15] },
  neck: { flex: [-30, 40], twist: [-60, 60], abduct: [-30, 30] },
  head: { flex: [-30, 30], twist: [-45, 45], abduct: [-20, 20] },
  // Negative twist supinates, turning the palm up from facing the body; a support hand under a rifle's handguard, its
  // elbow down and out, takes nearly all of it. The forearm turns about as far each way, so a hand on a pistol grip, its
  // elbow out, pronates as far as the support hand supinates.
  forearm: { flex: [0, 150], twist: [-90, 90], abduct: [0, 0] },
  // The wrist's abduction is deviation, positive toward the thumb, and it bends further toward the little finger: a
  // pistol grip, raked back, is held with the wrist deviated that way, furthest when the hand rolls the rifle onto its
  // side. The limits are a supple wrist's, so a hand reaching across a rolled rifle to its charging handle bends back
  // as far as it can rather than stopping short of the handle.
  wrist: { flex: [-80, 85], twist: [0, 0], abduct: [-45, 25] },
  thigh: { flex: [-20, 120], twist: [-40, 40], abduct: [-20, 50] },
  knee: { flex: [0, 140], twist: [0, 0], abduct: [0, 0] },
  ankle: { flex: [-30, 45], twist: [-10, 10], abduct: [-20, 20] },
  // A finger's joints from the knuckle out: the knuckle hyperextends a little and spreads; the joints beyond it only
  // curl, the middle one furthest.
  phalanges: [{ flex: [-20, 90], abduct: [-15, 15] }, { flex: [0, 110], abduct: [0, 0] }, { flex: [0, 80], abduct: [0, 0] }],
  // The thumb's joints from its root out: the root crosses the palm further than it spreads away, rolls into
  // opposition and lifts toward the palm; the knuckle beyond bends a little back and most of a right angle forward;
  // the last joint bends further.
  thumb: [{ flex: [-10, 60], twist: [0, 70], abduct: [-60, 25] }, { flex: [-10, 60], twist: [0, 0], abduct: [0, 0] }, { flex: [0, 80], twist: [0, 0], abduct: [0, 0] }],
  // Reach poles, in the doll's frame: the elbow down and out, as an arm reaching in front of the body carries it; the
  // knee forward.
  poles: { hand: [0.5, -1, -0.3], foot: [0, 0, 1] },
}
