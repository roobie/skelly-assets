---
type: breaking
---
The player's thumb leans out from the palm and forward, as the UAL mannequin's does, with UAL's bone lengths, and a glove's thumb pieces follow the lean, so one glove fits both dolls. Its bones bend square to that lean, so a bending segment stays in its own plane instead of swinging round a cone. A gripping thumb wraps the haft, every segment bearing on it: the closing hand seats the thumb, its roll and sweep across the palm among the angles it fits, where it used to lower only the root onto the haft. The press check's left hand is re-posed to pinch the charging handle with the thumb. The plate harness's shoulder caps are spaulders with a rolled rim, standing 2 cm off the deltoid so they clear a T-posed arm.

Upgrade:
- Re-target pose files to the doll rig's revision 14, and re-import the press check's clips and pose files.
- Re-import posed grips: a grip preset's thumb is now only where the seat starts, so a held item's thumb angles come from the closing, not the preset.
- Read a part's exact box from its bone's `bind.bound` (`box`, turned by `turn` about `about`), given on a part its site turns and, now, on a digit that leans off its part's axes, such as the thumb.
- Re-seat anything drawn over the plate harness's shoulder caps: they stand further out and carry a rim.
