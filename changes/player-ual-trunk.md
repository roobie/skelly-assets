---
type: breaking
---
The player's trunk stands on the UAL mannequin's joints, so one garment fits both dolls. The spine turns at 0.2105 m, the neck at 0.6476 m and the head at 0.7287 m above the hips' foot. The shoulders sit at ±0.1919 m, 0.6008 m high and 0.0654 m behind the centre line, where before they were at ±0.231 m and 0.54 m high. The chest is narrower and deeper (0.34 m by 0.28 m, from 0.4 m by 0.22 m), and its top is the neck's joint. The neck is wider, the waist and ribs are narrower and deeper, and the deltoids and trapezius follow the shoulders. Torso shells, sleeves, vests, packs, slings, cuirasses and pauldrons are drawn round the new trunk, and the mannequin and the warrior statue stand on it too. The plate cuirass's breast is as wide as the chest's shell, so the hanging arms clear it, and its deltoid caps stand a voxel further off the shoulders. Torso shells lap each level down over the one below, and vests step out below the shell's lap.

The held weapons are re-posed for the deeper chest. The long guns stand more bladed, with their shouldered bore held level, and the pump-action shotgun is turned furthest so the left hand reaches its fore-end, with the stock seated on the shoulder pocket. The press check stands more bladed, with its pocket nearer the arm and the right elbow drawn back. The two-hand strikes are re-posed so both hands keep within their wrists' limits. Thigh pieces and the robe's skirt stand clear of the hand where the resting arm now hangs.

The player's arms now rest swung out about 5.65° from straight down, just enough that a hanging arm clears the ribs and hips by a sleeve's layer. The rig's revision is 10. The doll rig's `eye` is now derived from the drawn eyes, at [0, 0.1417, 0.0749] from the head's joint, where before it was [0, 0.11, 0.08]. The head's attachment frame stands 0.1058 m above the top of the neck, up from 0.0995 m.

Upgrade:
- Re-target pose files to the doll rig's revision 10, and re-judge any pose that places the arms: the shoulders have moved, and the arms rest turned.
- Re-import the gun, two-hand wield and press check clips and their pose files: the stances, strikes and key frames have changed.
- Re-seat anything drawn over the plate cuirass's breast or deltoid caps: the breast is narrower and the caps stand further out.
- Seat each arm part from its bone's `bind.rest`, which now carries the arm's rest turn. A part's faces at rest are its `bind.hanging.box` as the part hangs, turned by `bind.turn` about `bind.hanging.about`. `bind.box` is only a loose bound on a turned part.
- Read the look point from the rig's `eye`, not from a copied constant.
- Raise the player figure's head attachment frame (`attachmentFrames.head.at`) by 0.0063 m, so it stands 0.1058 m above the top of the neck.
- Move anything worn at the shoulders, the spine or the neck to the new joints given above.
