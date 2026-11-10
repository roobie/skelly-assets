---
type: breaking
---
The worn shells of the jacket, hoodie, jeans, rubber boots and sneakers are named for their garment, as
`<garment>_worn_<segment>`, so the showcase and the review sheets dress the doll in them. They are fitted round the
player body by the worn-fit templates, so the body no longer shows through them at rest; their proportions follow
the body's measures, each declares in `covers` the doll it encloses, and the sneakers are high-tops with a shaft of their own.

Upgrade:
- Apply `renames.json`; `worn_jacket_body` maps to `jacket_worn_body`, and so on for each shell.
- Dress the sneakers' new `sneakers_worn_shaft` on each shin hem, as the rubber boots' shaft is.
