import { ShaderLib } from 'three';
import { describe, expect, it } from 'vitest';
import {
  leafInputs,
  patchSurface,
  replaceHook,
  SURFACE_EDITS,
  type SurfacePass,
  type SurfaceShader,
  surfacePasses,
  surfaceUniforms,
} from '../src/patch.ts';
import { SURFACE_KINDS, type Surface } from '../src/schema.ts';
import { lookOf } from './looks.ts';

// three 0.186's raw sources, as a compile hook receives them: the lit program and the shadow materials'.
const PROGRAMS: Record<SurfacePass, { vertexShader: string; fragmentShader: string }> = {
  colour: ShaderLib.physical,
  depth: ShaderLib.depth,
  distance: ShaderLib.distance,
};

const MODEL = { size: [0.4, 2, 0.4] } as const;

const shaderOf = (pass: SurfacePass): SurfaceShader => ({ ...PROGRAMS[pass], uniforms: {} });

const patched = (surface: Surface, pass: SurfacePass, shader = shaderOf(pass)) => {
  patchSurface(shader, surface, {
    pass,
    replace: replaceHook,
    uniforms: surfaceUniforms(surface, MODEL),
    inputs: leafInputs(),
  });
  return shader;
};

const declared = (code: string) => [...code.matchAll(/^uniform\s+\w+\s+(\w+);/gm)].map(([, name]) => name);

describe.each(SURFACE_KINDS)('the %s kind', (kind) => {
  const surface = lookOf(kind);

  it.each(surfacePasses(kind))('patches three 0.186 in its %s pass after each of its anchors', (pass) => {
    const shader = patched(surface, pass);
    for (const { stage, anchor, code } of SURFACE_EDITS[kind][pass] ?? []) {
      expect(shader[stage === 'vertex' ? 'vertexShader' : 'fragmentShader']).toContain(`${anchor}\n${code}`);
    }
  });

  it.each(surfacePasses(kind))('names the anchor it misses in its %s pass, for each anchor', (pass) => {
    for (const { stage, anchor } of SURFACE_EDITS[kind][pass] ?? []) {
      const shader = shaderOf(pass);
      const source = stage === 'vertex' ? 'vertexShader' : 'fragmentShader';
      shader[source] = shader[source].replaceAll(anchor, '');
      expect(() => patched(surface, pass, shader)).toThrow(`three no longer has ${anchor};`);
    }
  });

  it.each(surfacePasses(kind))(
    'gives its %s program every uniform it declares, and declares every one given',
    (pass) => {
      const shader = patched(surface, pass);
      const code = (SURFACE_EDITS[kind][pass] ?? []).map(({ code }) => code).join('\n');
      expect(new Set(declared(code))).toEqual(new Set(Object.keys(shader.uniforms)));
    },
  );

  it('writes no replacement pattern, since a caller may hand its edits to String.replace', () => {
    for (const edits of Object.values(SURFACE_EDITS[kind]))
      for (const { code } of edits) expect(code).not.toContain('$');
  });

  it('refuses a pass it does not patch', () => {
    for (const pass of (['colour', 'depth', 'distance'] as const).filter((each) => !surfacePasses(kind).includes(each)))
      expect(() => patched(surface, pass)).toThrow(`patches no ${pass} pass`);
  });
});

describe('the leaf kind', () => {
  const leaf = lookOf('leaf');

  it('cuts in every pass, the shadow passes too, so a hole lets light through', () => {
    expect(surfacePasses('leaf')).toEqual(['colour', 'depth', 'distance']);
    for (const pass of surfacePasses('leaf')) expect(patched(leaf, pass).fragmentShader).toContain('discard');
  });

  it('reads the game inputs in its lit pass only, so the local view never moves a shadow', () => {
    const inputs = Object.keys(leafInputs());
    expect(Object.keys(patched(leaf, 'colour').uniforms)).toEqual(expect.arrayContaining(inputs));
    for (const pass of ['depth', 'distance'] as const) {
      const shader = patched(leaf, pass);
      for (const name of inputs) {
        expect(shader.uniforms).not.toHaveProperty(name);
        expect(shader.fragmentShader).not.toContain(name);
      }
    }
  });

  it('refuses its lit pass without the game inputs', () => {
    const shader = shaderOf('colour');
    expect(() =>
      patchSurface(shader, leaf, { pass: 'colour', replace: replaceHook, uniforms: surfaceUniforms(leaf, MODEL) }),
    ).toThrow('reads the game');
  });
});

it('shades bark on the lit surface only, leaving its shadows plain', () => {
  expect(surfacePasses('bark')).toEqual(['colour']);
});
