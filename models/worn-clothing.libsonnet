// The everyday clothes' worn shells, fitted round the player body by the worn-fit templates. Their finishes are the
// figure's own worn colours rather than the ground rows'.
local fit = import 'packages/thing-authoring-tool/worn-fit.libsonnet';
local worn = import 'packages/thing-authoring-tool/worn-taxonomy.libsonnet';
local jacket = import 'measures/jacket.libsonnet';
local clothing(material) = { category: 'clothing', tags: { material: material, setting: ['modern'] } };
local jacketShells = fit.torso('jacket', { cloth: 'cloth-shirt-player', trim: 'cloth-charcoal', fastener: 'steel-grey' }, jacket, worn.groundTitle('jacket'));
// Soft cloth under the jacket, its hood lying flat enough on the back that the over-jacket gear clears it.
local hoodieShells = fit.torso('hoodie', { cloth: 'cloth-red', trim: 'cloth-charcoal' }, {
  round: 0.01, collar: 'none', zipX: null, pockets: 'kangaroo', hood: 0.03,
  slots: { body: 'cloth', trim: 'trim', hood: 'cloth', lining: 'cloth' },
}, worn.groundTitle('hoodie'));
local jeansShells = fit.trousers('jeans', { cloth: 'cloth-pants-player', trim: 'cloth-charcoal' }, title=worn.groundTitle('jeans'));
// Rubber boots stand loose over trousers.
local rubberBoots = fit.feet('rubber_boots', { upper: 'rubber-black', toe: 'rubber-black', sole: 'rubber-offblack', collar: 'rubber-offblack' },
                             { l: 0.3, w: 0.13, s: 0.025, toe: 0.06, instep: 0.085, top: 0.38, laces: 0 }, { ease: 0.016 }, worn.groundTitle('rubber_boots'));
// High-tops: a shoe that stopped below the ankle bone would pass beneath it, so the probe would take it as covered.
local sneakers = fit.feet('sneakers', { upper: 'cloth-pants-player', toe: 'rubber-black', sole: 'rubber-black', collar: 'rubber-black' },
                          { l: 0.3, w: 0.13, s: 0.025, toe: 0.05, instep: 0.065, top: 0.155, laces: 0 }, title=worn.groundTitle('sneakers'));
worn.shells(clothing(['fabric']), jacketShells.rows + hoodieShells.rows + jeansShells.rows)
+ worn.shells(clothing(['rubber']), rubberBoots.rows)
+ worn.shells(clothing(['fabric', 'rubber']), sneakers.rows)
