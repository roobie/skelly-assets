local fit = import '../worn-fit.libsonnet';
local rows = import 'ground.libsonnet';
local worn = import '../worn-taxonomy.libsonnet';
local finish(model) = [r for r in rows if r.id == model][0].parts[0].finish;
// A fitted template with its shells tagged as the garment they belong to.
local tagged(own, template) = template + { rows: worn.shells(own, template.rows) };
local clothing(material) = { category: 'clothing', tags: { material: material, setting: ['modern'] } };
{
  jacket_leather: tagged(clothing(['leather']), fit.torso('jacket_leather', finish('jacket_leather'), {
    collar: 'lapel', zipX: 0.035, belt: true, slots: { body: 'cloth', trim: 'cloth', fastener: 'zip' },
  })),
  gloves_leather: tagged(clothing(['leather']), fit.hands('gloves_leather', finish('gloves_leather'), { cuff: 0.05, backRidges: 3 })),
  boots_combat: tagged(clothing(['fabric', 'rubber']), fit.feet('boots_combat', finish('boots_combat'),
                                                                { l: 0.3, w: 0.105, s: 0.026, toe: 0.06, instep: 0.085, top: 0.22, shaft: 0.12, laces: 6 })),
}
