---
type: breaking
---
The thumb is a model of its own on both dolls, `player_thumb` and `ual_thumb`, where it was three parts of the arm. It is drawn hanging straight from its root and rested turned on the hand, leaning out from the palm and forward as the UAL mannequin's does, with UAL's bone lengths, and it is stouter: 24 mm by 30 mm at its root, four fifths of that beyond. Each rig's `doll` lists the thumb's two sites last, the manifest's `dolls` names the model as `thumb`, and each thumb bone's `bind` names that model and site, with its rest turn in `bind.turn` and `bind.rest`. A glove's thumb pieces are drawn in the thumb's part frames, so one glove fits both dolls. The thumb's joints bend it in the plane of the palm, across toward the fingers, where they bent it toward the palm's face: its root's flex is now its swing across the palm and its abduction its lift off the palm, and a gripping thumb closes over the fist, joint by joint onto the fingers and the held item, where it used to lower only its root onto the haft. The root flexes from 25° away to 60° across, rolls 30° either way and lifts from -10° to 60°; the knuckle beyond bends from -10° to 80°. The press check's left hand is re-posed to pinch the charging handle with the thumb. The plate harness's shoulder caps are spaulders with a rolled rim, standing 2 cm off the deltoid so they clear a T-posed arm.

Upgrade:
- Draw the thumb model at the two sites each rig's `doll` adds, mirrored and turned as each site says, or seat its parts on their bones by `bind.rest`: `player_arm` and `ual_arm` no longer hold `thumb_01`, `thumb_02` and `thumb_03`.
- Re-target pose files to the player rig's revision 15 and the UAL rig's revision 2, and re-import the press check's clips and pose files.
- Re-author any pose that names a thumb bone's angles: the root's flex and abduction have changed places, and its roll is counted from the pad facing the fingers.
- Re-import posed grips and the hand presets: a grip's thumb closes over the fingers, and `fist`, `point`, `open` and `grip` pose the thumb anew.
- Read a part's exact box from its bone's `bind.bound` (`box`, turned by `turn` about `about`), given on every part its site turns, the thumb's among them.
- Re-seat anything drawn over the plate harness's shoulder caps: they stand further out and carry a rim.
