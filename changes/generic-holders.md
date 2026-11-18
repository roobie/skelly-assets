---
type: breaking
---
Solid medicines and loose goods are no longer drawn each in its own container. Six generic holders, `pill_bottle`,
`glass_vial`, `blister_card`, `small_tin`, `paper_sack` and `zip_bag`, mark their label paintable so one model serves
every content of a form, and loose contents draw as a small heap of their form, such as `tablet_heap` or
`powder_heap`. The retired container models map to the holder their contents come in.

Upgrade:
- Draw a packed content as its holder with the label repainted in the content's label finish, and a loose one as
  its form's heap.
