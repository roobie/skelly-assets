import { BarkSchema, LeafInputsSchema, type Surface, uniformFields } from '@skelly/surfaces/schema';
import { describe, expect, it } from 'vitest';
import { LOOKS } from '../../surfaces/test/looks.ts';
import { difference, jsonnet, nearestLook, onStep, slidersOf, valueAt, wearSnippet, withValue } from '../src/tune.ts';

const look = (name: string): Surface => {
  const found = LOOKS[name];
  if (found === undefined) throw new Error(`no look ${name}`);
  return found;
};

describe('slidersOf', () => {
  it('makes a slider of every ranged number of a kind, and none of a choice or an open number', () => {
    const sliders = slidersOf(uniformFields(BarkSchema));
    expect(sliders.map(({ path }) => path.join('.'))).toContain('furrow.spacing');
    expect(sliders.some(({ path }) => path[0] === 'grain' || path[0] === 'kind')).toBe(false);
    const spacing = sliders.find(({ path }) => path.join('.') === 'furrow.spacing');
    expect(spacing).toEqual({ path: ['furrow', 'spacing'], range: [0.01, 0.5], step: 0.0001 });
  });

  it('leaves the see-through distances, which the inputs leave open, to the lab content', () => {
    expect(slidersOf(uniformFields(LeafInputsSchema)).map(({ path }) => path.join('.'))).toEqual(['nearCoverage']);
  });
});

describe('values by path', () => {
  it('reads and sets a nested number without touching the original', () => {
    const tree = { furrow: { spacing: 0.06, width: 0.18 }, relief: 0.8 };
    const tuned = withValue(tree, ['furrow', 'spacing'], 0.05);
    expect(valueAt(tuned, ['furrow', 'spacing'])).toBe(0.05);
    expect(tree.furrow.spacing).toBe(0.06);
    expect(tuned.relief).toBe(0.8);
  });

  it('rounds to a slider step without float noise', () => {
    expect(onStep(0.123456, 0.001)).toBe(0.123);
    expect(onStep(3.7, 1)).toBe(4);
  });
});

describe('the wear snippet', () => {
  it('names the look alone when nothing differs', () => {
    expect(wearSnippet('bark-log', look('bark-log'), look('bark-log'))).toBe("wear('bark-log')");
  });

  it('carries only the numbers that differ, nested as wear() patches them', () => {
    const tuned = withValue(look('bark-log'), ['furrow', 'spacing'], 0.05);
    expect(wearSnippet('bark-log', look('bark-log'), tuned)).toBe("wear('bark-log', { furrow: { spacing: 0.05 } })");
  });

  it('finds the look a tuned surface came from among those of its kind', () => {
    const tuned = withValue(look('bark-birch'), ['relief'], 0.3);
    expect(nearestLook(tuned, LOOKS)).toBe('bark-birch');
    expect(nearestLook(look('leaf-needle'), LOOKS)).toBe('leaf-needle');
  });

  it('writes Jsonnet field names bare when it can and quoted when not', () => {
    expect(jsonnet({ plain: 1, 'two-words': "it's" })).toBe("{ plain: 1, 'two-words': 'it\\'s' }");
    expect(difference({ a: { b: 1 } }, { a: { b: 1 } })).toBeUndefined();
  });
});
