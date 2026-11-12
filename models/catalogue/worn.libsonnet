local fit = import 'packages/thing-authoring-tool/worn-fit.libsonnet';
local worn = import 'packages/thing-authoring-tool/worn-taxonomy.libsonnet';
local finish(model) = worn.groundRow(model).parts[0].finish;
local titleOf(model) = worn.groundRow(model).title;
// A fitted template with its shells tagged as the garment they belong to.
local tagged(own, template) = template + { rows: worn.shells(own, template.rows) };
local clothing(material, setting=['modern']) = { category: 'clothing', tags: { material: material, setting: setting } };
{
  leather_jacket: tagged(clothing(['leather']), fit.torso('leather_jacket', finish('leather_jacket'), {
    collar: 'lapel', zipX: 0.035, belt: true, slots: { body: 'cloth', trim: 'cloth', fastener: 'zip' },
  }, titleOf('leather_jacket'))),
  leather_gloves: tagged(clothing(['leather']), fit.hands('leather_gloves', finish('leather_gloves'), { cuff: 0.05, backRidges: 3 }, titleOf('leather_gloves'))),
  combat_boots: tagged(clothing(['fabric', 'rubber']), fit.feet('combat_boots', finish('combat_boots'),
                                                                { l: 0.3, w: 0.105, s: 0.026, toe: 0.06, instep: 0.085, top: 0.22, shaft: 0.12, laces: 6 }, title=titleOf('combat_boots'))),
  // A shirt or jacket goes over it, so it takes the under layer.
  tank_top: tagged(clothing(['fabric']), fit.torso('tank_top', finish('tank_top'), {
    layer: 'under', top: 'straps', sleeves: 'none', zipX: null, pockets: 'none', slots: { body: 'cloth', trim: 'bind' },
  }, titleOf('tank_top'))),
  wizard_robe: tagged(clothing(['fabric'], ['fantasy']), fit.robe('wizard_robe', finish('wizard_robe'), {
    stars: [[0.07, 0.56], [0.14, 0.5], [-0.13, 0.49]], moon: [-0.06, 0.53, 0.04],
  }, titleOf('wizard_robe'))),
}
