---
type: added
---
The doll holds long guns: a new motions entry, `doll_guns` (`skelly.body/motions/doll.guns.json`, on the same rig as
`doll_melee`), with `<gun>_stance_idle` (low ready) and `<gun>_stance_guard` (shouldered) for `rifle_assault`,
`rifle_pipe` and `shotgun_pump`. Each clip's `held` seats that gun in the right hand by its `grip.at`, as the melee
clips do, and the left hand lies on that gun's fore-end, so play each gun's own clips rather than another's.
