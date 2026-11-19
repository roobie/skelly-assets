import { describe, expect, it } from 'vitest';
import {
  grainAxis,
  leafInputs,
  SURFACE_PASSES,
  setLeafInputs,
  surfaceKey,
  surfaceUniforms,
  tuneSurface,
} from '../src/patch.ts';
import { SURFACE_KINDS } from '../src/schema.ts';
import { lookOf } from './looks.ts';

const MODEL = { size: [3, 0.3, 0.4] } as const;

describe('grainAxis', () => {
  const up = lookOf('bark');
  const lying = { ...up, grain: 'main' } as const;

  it('runs a standing trunk up the model, whatever its shape', () => {
    expect(grainAxis({ ...up, grain: 'up' }, [3, 0.3, 0.4])).toEqual([0, 1, 0]);
  });

  it('runs a lying log along its longest side', () => {
    expect(grainAxis(lying, [3, 0.3, 0.4])).toEqual([1, 0, 0]);
    expect(grainAxis(lying, [0.3, 2, 0.4])).toEqual([0, 1, 0]);
    expect(grainAxis(lying, [0.3, 0.4, 5])).toEqual([0, 0, 1]);
  });

  it('settles a tie on the earlier axis', () => {
    expect(grainAxis(lying, [1, 1, 1])).toEqual([1, 0, 0]);
    expect(grainAxis(lying, [0.5, 1, 1])).toEqual([0, 1, 0]);
  });

  it('feeds the bark its axis as a uniform', () => {
    expect(surfaceUniforms(lying, MODEL).barkAxis?.value).toEqual([1, 0, 0]);
  });
});

describe('surfaceKey', () => {
  it('ignores a look’s numbers, which are uniforms, so a retune shares the program', () => {
    const bark = lookOf('bark');
    const retuned = { ...bark, relief: 0.1, furrow: { ...bark.furrow, spacing: 0.3 }, grain: 'main' } as const;
    const leaf = lookOf('leaf');
    for (const pass of SURFACE_PASSES) {
      expect(surfaceKey(retuned, pass)).toBe(surfaceKey(bark, pass));
      expect(surfaceKey({ ...leaf, coverage: 0.3, shape: 'needle' }, pass)).toBe(surfaceKey(leaf, pass));
      expect(surfaceKey(leaf, pass)).not.toBe(surfaceKey(bark, pass));
      expect(surfaceKey(bark, pass)).not.toMatch(/\d/);
    }
    expect(new Set(SURFACE_PASSES.map((pass) => surfaceKey(bark, pass))).size).toBe(SURFACE_PASSES.length);
  });
});

describe('uniforms', () => {
  it.each(SURFACE_KINDS)('give the %s kind one uniform per name, none shared with the game inputs', (kind) => {
    const names = Object.keys(surfaceUniforms(lookOf(kind), MODEL));
    expect(names.every((name) => name.startsWith(kind))).toBe(true);
    for (const name of Object.keys(leafInputs())) expect(names).not.toContain(name);
  });

  it('retune in place, so a program holding them needs no recompile', () => {
    const bark = lookOf('bark');
    const uniforms = surfaceUniforms(bark, MODEL);
    const held = uniforms.barkRelief;
    const axis = uniforms.barkAxis?.value;
    tuneSurface(uniforms, { ...bark, relief: 0.1, grain: 'main' }, MODEL);
    expect(uniforms.barkRelief).toBe(held);
    expect(held?.value).toBe(0.1);
    expect(uniforms.barkAxis?.value).toBe(axis);
    expect(axis).toEqual([1, 0, 0]);
  });

  it('refuse a retune to another kind, which only a recompile serves', () => {
    expect(() => tuneSurface(surfaceUniforms(lookOf('bark'), MODEL), lookOf('leaf'), MODEL)).toThrow('no uniform');
  });

  it('never write into the look they were read from', () => {
    const bark = lookOf('bark');
    const uniforms = surfaceUniforms(bark, MODEL);
    tuneSurface(uniforms, { ...bark, relief: 0.1 }, MODEL);
    expect(bark.relief).not.toBe(0.1);
  });

  it('take the game inputs in place each frame', () => {
    const inputs = leafInputs();
    const eye = inputs.leafEye?.value;
    setLeafInputs(inputs, { eye: [1, 2, 3], player: [4, 5, 6], nearCoverage: 0.25, seeRadius: 1.5, seeEdge: 0.5 });
    expect(inputs.leafEye?.value).toBe(eye);
    expect(eye).toEqual([1, 2, 3]);
    expect(inputs.leafPlayer?.value).toEqual([4, 5, 6]);
    expect(inputs.leafNearCoverage?.value).toBe(0.25);
    expect(inputs.leafSeeRadius?.value).toBe(1.5);
    expect(inputs.leafSeeEdge?.value).toBe(0.5);
  });

  it('open no leaves at the default inputs', () => {
    expect(leafInputs().leafNearCoverage?.value).toBe(1);
  });
});
