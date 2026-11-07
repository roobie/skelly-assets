import { describe, expect, it } from 'vitest';
import { build, generate } from '../src/core/generate.ts';
import { type PartSpec, registerTemplate, type Template } from '../src/core/template.ts';
import { heightHeadBudgets } from '../src/mob/budgets.ts';
import { partFeatures } from '../src/mob/parts.ts';
import { humanoid } from '../src/mob/templates.ts';

const signature: PartSpec = {
  bone: 'hand.L', at: 'tail', mirror: true, material: 'fixture-signature',
  shape: { kind: 'box', center: [0.01, 0, 0], half: [0.02, 0.02, 0.02] },
};

describe('retained asset authoring additions', () => {
  it('keeps signature parts on the refactor humanoid, including mirrored placement', () => {
    const template: Template = {
      ...humanoid, name: 'fixture-signature-humanoid', parts: [signature],
      materials: { ...humanoid.materials, 'fixture-signature': { color: [1, 0, 0], emissive: 0 } },
    };
    registerTemplate(template);
    const body = build(generate(template, 1));
    const actual = body.features.filter(feature => feature.material === signature.material);
    expect(actual).toEqual(partFeatures([signature], body.bones));
    expect(new Set(actual.map(feature => feature.bone))).toEqual(new Set(['hand.L', 'hand.R']));
  });

  it('uses the original budget basis when a row narrows its sampling ranges', () => {
    const genome = generate(humanoid, 1);
    const narrowed: Template = {
      ...humanoid, params: { ...humanoid.params, height: genome.params.height! / 2 },
      budgetParams: humanoid.params,
    };
    expect(heightHeadBudgets(genome, narrowed)).toEqual(heightHeadBudgets(genome, humanoid));
    expect(heightHeadBudgets(genome, { ...narrowed, budgetParams: narrowed.params }))
      .not.toEqual(heightHeadBudgets(genome, humanoid));
  });

  it('refuses a signature part on an absent bone rather than dropping it', () => {
    expect(() => partFeatures([{ ...signature, bone: 'absent' }], [])).toThrow('unknown bone');
  });
});
