---
type: added
---
The doll walks holding what it wields: `doll_guns` gains `<gun>_<sneak|walk|run|crouch_walk>_<idle|guard>` and
`doll_melee` gains `<class>_<sneak|walk|run|crouch_walk>_idle`. Each loops in place and is advanced as the empty walk
of `doll_locomotion` is (`strideMetres`, `speedMetresPerSecond`), its legs that walk's, with `held` as the class's
stance clips; a gun stays in both hands, at guard level ahead, while a melee weapon swings with its hand.
