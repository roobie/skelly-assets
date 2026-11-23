---
type: breaking
---
The player's thumb leans out from the palm and forward, as the UAL mannequin's does, with UAL's bone lengths, and a glove's thumb pieces follow the lean, so one glove fits both dolls; the gripping thumb now closes onto a haft rather than standing out of the fist, and the press check's left hand is re-posed to pinch the charging handle with it. The plate harness's shoulder caps are spaulders with a rolled rim, standing 2 cm off the deltoid so they clear a T-posed arm.

Upgrade:
- Re-target pose files to the doll rig's revision 13, and re-import the press check's clips and pose files.
- Read a part's exact box from its bone's `bind.bound` (`box`, turned by `turn` about `about`), which replaces `bind.hanging`; it is given on a part its site turns and on a digit that leans off its part's axes, such as the thumb.
- Re-seat anything drawn over the plate harness's shoulder caps: they stand further out and carry a rim.
