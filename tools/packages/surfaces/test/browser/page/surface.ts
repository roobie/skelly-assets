import type { Material, WebGLRenderer } from 'three';
import {
  leafInputs,
  patchSurface,
  replaceHook,
  type SurfacePass,
  type SurfaceShader,
  surfaceKey,
  surfaceUniforms,
  type Uniforms,
  type Vec3,
} from '../../../src/patch.ts';
import type { Surface } from '../../../src/schema.ts';

/** The page's renderer, and the shader errors it has met since they were last taken. */
export interface Gpu {
  readonly renderer: WebGLRenderer;
  readonly takeErrors: () => string[];
}

/**
 * Checks every program three links and keeps each failure's logs rather than printing them, so a test can name the
 * case that failed.
 */
export const watchErrors = (renderer: WebGLRenderer): Gpu => {
  let errors: string[] = [];
  renderer.debug.checkShaderErrors = true;
  renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
    const logs = [
      `vertex: ${gl.getShaderInfoLog(vertex) ?? ''}`,
      `fragment: ${gl.getShaderInfoLog(fragment) ?? ''}`,
      `link: ${gl.getProgramInfoLog(program) ?? ''}`,
    ];
    errors.push(logs.filter((log) => !/^\w+: \s*$/.test(log)).join('\n'));
  };
  return {
    renderer,
    takeErrors: () => {
      const taken = errors;
      errors = [];
      return taken;
    },
  };
};

export interface Wearing {
  readonly model: Vec3;
  readonly inputs?: Uniforms;
  /** One more change to the patched source, under its own program key. */
  readonly edit?: (shader: SurfaceShader) => void;
}

/** Patches `material`'s `pass` program for `surface` from three's own compile hook, as a game does. */
export const wear = (material: Material, surface: Surface, pass: SurfacePass, wearing: Wearing) => {
  const { model, inputs = leafInputs(), edit } = wearing;
  const uniforms = surfaceUniforms(surface, { size: model });
  material.onBeforeCompile = (shader) => {
    patchSurface(shader, surface, { pass, replace: replaceHook, uniforms, inputs });
    edit?.(shader);
  };
  const key = surfaceKey(surface, pass);
  material.customProgramCacheKey = () => (edit === undefined ? key : `${key}-edited`);
};
