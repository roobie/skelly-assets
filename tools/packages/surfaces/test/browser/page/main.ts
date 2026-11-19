// The page the browser tests drive: it compiles and draws surfaces with three and measures the pixels where they
// are drawn, so only numbers cross back to Node.
import { WebGLRenderer } from 'three';
import type { CompileCase, DrawSpec } from './cases.ts';
import { compile } from './compile.ts';
import { difference, draw, kept, shade } from './draw.ts';
import { watchErrors } from './surface.ts';

const canvas = document.querySelector('canvas');
if (canvas === null) throw new Error('the page has no canvas');
const gpu = watchErrors(new WebGLRenderer({ canvas, antialias: false }));

/** The context the tests run on, so a run on another rasteriser or on WebGL 1 is refused rather than passed. */
const context = () => {
  const gl = gpu.renderer.getContext();
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    webgl2: gl instanceof WebGL2RenderingContext,
    renderer: String(gl.getParameter(debug === null ? gl.RENDERER : debug.UNMASKED_RENDERER_WEBGL)),
  };
};

const api = {
  context,
  compile: (test: CompileCase) => compile(gpu, test),
  draw: (name: string, spec: DrawSpec) => draw(gpu, name, spec),
  kept,
  difference,
  shade,
};
export type SurfaceTestApi = typeof api;

/** One entry point, so a driver waits on one function and calls each measure by name. */
const surfaceTest = <Method extends keyof SurfaceTestApi>(
  method: Method,
  ...args: Parameters<SurfaceTestApi[Method]>
): ReturnType<SurfaceTestApi[Method]> =>
  (api[method] as (...given: Parameters<SurfaceTestApi[Method]>) => ReturnType<SurfaceTestApi[Method]>)(...args);

declare global {
  interface Window {
    surfaceTest: typeof surfaceTest;
  }
}
window.surfaceTest = surfaceTest;
