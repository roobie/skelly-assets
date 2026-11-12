import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileJsonnetFile } from '../../../jsonnet/index.mjs';

const fixture = (name: string) => resolve(import.meta.dirname, 'fixtures', `${name}.jsonnet`);
const resolved = JSON.parse(compileJsonnetFile(fixture('grain-of'))) as Record<
  'class' | 'plain' | 'own' | 'gun' | 'named',
  { grain: number; detailGrain?: number }
>;

describe('a source definition grain', () => {
  it('leaves a definition without one on its class grains', () => {
    expect(resolved.plain).toEqual(resolved.class);
  });

  it('replaces the class grain with the one the definition names, keeping detail parts nested', () => {
    expect(resolved.own.grain).toBe(0.004);
    expect(Number.isInteger(resolved.own.grain / resolved.own.detailGrain!)).toBe(true);
  });

  it.each(['grain-unnested', 'grain-zero'])('refuses %s', (name) => {
    expect(() => compileJsonnetFile(fixture(name))).toThrow('positive whole multiple');
  });

  it('draws a definition that names its class on that class in place of the recipe one', () => {
    expect(resolved.named).toEqual(resolved.gun);
  });

  it.each([
    ['grain-unknown-class', 'names no voxel class'],
    ['grain-class-and-grain', 'names both'],
  ])('refuses %s', (name, message) => {
    expect(() => compileJsonnetFile(fixture(name))).toThrow(message);
  });
});
