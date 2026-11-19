---
type: added
---
The doll walks holding what it wields: `doll_guns` gains `<gun>_<sneak|walk|run|crouch_walk>_<idle|guard>` and
`doll_melee` gains `<class>_<sneak|walk|run|crouch_walk>_idle`. Each loops in place and is advanced as the empty walk
of `doll_locomotion` is (`strideMetres`, `speedMetresPerSecond`), its legs that walk's, with `held` as the class's
stance clips. A gun stays in both hands, at guard aimed ahead and tipped only as far as the walk leans the body, and a
two-hand melee weapon stays in both hands as its idle holds it, while a one-hand weapon swings with its hand.
