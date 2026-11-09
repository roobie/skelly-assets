local fit = import 'packages/thing-authoring-tool/worn-fit.libsonnet';
local rows = std.flattenArrays(std.objectValues(import 'sets/index.libsonnet'));
local worn = import 'packages/thing-authoring-tool/worn-taxonomy.libsonnet';
local finish(model) = [r for r in rows if r.id == model][0].parts[0].finish;
// A fitted template with its shells tagged as the garment they belong to.
local tagged(own, template) = template + { rows: worn.shells(own, template.rows) };
local clothing(material) = { category: 'clothing', tags: { material: material, setting: ['modern'] } };
{
  leather_jacket: tagged(clothing(['leather']), fit.torso('leather_jacket', finish('leather_jacket'), {
    collar: 'lapel', zipX: 0.035, belt: true, slots: { body: 'cloth', trim: 'cloth', fastener: 'zip' },
  })),
  leather_gloves: tagged(clothing(['leather']), fit.hands('leather_gloves', finish('leather_gloves'), { cuff: 0.05, backRidges: 3 })),
  combat_boots: tagged(clothing(['fabric', 'rubber']), fit.feet('combat_boots', finish('combat_boots'),
                                                                { l: 0.3, w: 0.105, s: 0.026, toe: 0.06, instep: 0.085, top: 0.22, shaft: 0.12, laces: 6 })),
}
