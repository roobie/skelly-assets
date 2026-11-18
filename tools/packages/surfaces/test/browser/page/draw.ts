import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  FloatType,
  type Material,
  Mesh,
  MeshDepthMaterial,
  MeshDistanceMaterial,
  MeshStandardMaterial,
  type Object3D,
  OrthographicCamera,
  Scene,
  WebGLRenderTarget,
} from 'three';
import { leafInputs, setLeafInputs } from '../../../src/patch.ts';
import type { DrawSpec, Light, Ring, View } from './cases.ts';
import { type Gpu, wear } from './surface.ts';

/** A drawn frame's linear RGBA, rows from the bottom, as `readPixels` gives them. */
interface Frame {
  readonly view: View;
  readonly rgba: Float32Array;
}

const frames = new Map<string, Frame>();

const frameOf = (name: string) => {
  const frame = frames.get(name);
  if (frame === undefined) throw new Error(`no frame ${name} drawn`);
  return frame;
};

// Far enough back that no box drawn reaches the camera.
const CAMERA_DISTANCE = 50;

const materialOf = ({ pass, colour }: DrawSpec): Material => {
  switch (pass) {
    case 'colour':
      return new MeshStandardMaterial({ color: new Color(...colour), roughness: 1, metalness: 0 });
    case 'depth':
      return new MeshDepthMaterial();
    case 'distance':
      return new MeshDistanceMaterial();
  }
};

// Ambient light ignores the normal, so it shows the shade alone; a slanting sun shows the normal's relief too.
const lightsOf = (light: Light): Object3D[] => {
  switch (light) {
    case 'none':
      return [];
    case 'ambient':
      return [new AmbientLight(0xffffff, 1)];
    case 'directional': {
      const sun = new DirectionalLight(0xffffff, 2);
      sun.position.set(-1, 0.6, 0.8);
      return [sun];
    }
  }
};

/**
 * Draws the spec's box straight on through an orthographic camera into a float target and keeps the pixels as
 * `name`. The plain finish is drawn when the spec names no surface. A kept fragment's alpha is 1 and the clear's 0.
 */
export const draw = ({ renderer, takeErrors }: Gpu, name: string, spec: DrawSpec) => {
  const { view } = spec;
  const material = materialOf(spec);
  const inputs = leafInputs();
  if (spec.inputs !== undefined) setLeafInputs(inputs, spec.inputs);
  if (spec.surface !== undefined) wear(material, spec.surface, spec.pass, { model: spec.model, inputs });
  const geometry = new BoxGeometry(...spec.model);
  const scene = new Scene().add(new Mesh(geometry, material), ...lightsOf(spec.light));
  const half = view.width / 2;
  const camera = new OrthographicCamera(-half, half, half, -half, 1, 2 * CAMERA_DISTANCE);
  camera.position.set(view.centre[0], view.centre[1], CAMERA_DISTANCE);
  const target = new WebGLRenderTarget(view.pixels, view.pixels, { type: FloatType });
  const rgba = new Float32Array(view.pixels * view.pixels * 4);
  renderer.setClearColor(0x000000, 0);
  renderer.setRenderTarget(target);
  try {
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, view.pixels, view.pixels, rgba);
  } finally {
    renderer.setRenderTarget(null);
    target.dispose();
    geometry.dispose();
    material.dispose();
  }
  const errors = takeErrors();
  if (errors.length > 0) throw new Error(`${name} did not compile:\n${errors.join('\n')}`);
  frames.set(name, { view, rgba });
};

const isKept = ({ rgba }: Frame, pixel: number) => (rgba[pixel * 4 + 3] ?? 0) > 0.5;

/** Where a pixel's centre lies in the plane of the view, in metres. */
const worldOf = ({ centre, width, pixels }: View, column: number, row: number) => {
  const step = width / pixels;
  return [centre[0] - width / 2 + (column + 0.5) * step, centre[1] - width / 2 + (row + 0.5) * step] as const;
};

const inRing = (view: View, column: number, row: number, { centre, from, to }: Ring) => {
  const [x, y] = worldOf(view, column, row);
  const distance = Math.hypot(x - centre[0], y - centre[1]);
  return distance >= from && distance < to;
};

/** The share of a frame's pixels that were kept, within `ring` if one is given, and how many pixels it counted. */
export const kept = (name: string, ring?: Ring) => {
  const frame = frameOf(name);
  const { pixels } = frame.view;
  let counted = 0;
  let held = 0;
  for (let row = 0; row < pixels; row++)
    for (let column = 0; column < pixels; column++) {
      if (ring !== undefined && !inRing(frame.view, column, row, ring)) continue;
      counted++;
      if (isKept(frame, row * pixels + column)) held++;
    }
  return { share: held / counted, pixels: counted };
};

/**
 * The pixels kept in one frame and not in the other, compared where they overlap when `b`'s camera stood `shift`
 * pixels further along x than `a`'s, so a's column c shows what b's column c − shift does.
 */
export const difference = (a: string, b: string, shift = 0) => {
  const first = frameOf(a);
  const second = frameOf(b);
  const { pixels } = first.view;
  if (second.view.pixels !== pixels) throw new Error(`${a} and ${b} differ in size`);
  let onlyA = 0;
  let onlyB = 0;
  let compared = 0;
  for (let row = 0; row < pixels; row++)
    for (let column = Math.max(0, shift); column < Math.min(pixels, pixels + shift); column++) {
      const inA = isKept(first, row * pixels + column);
      const inB = isKept(second, row * pixels + column - shift);
      compared++;
      if (inA && !inB) onlyA++;
      if (inB && !inA) onlyB++;
    }
  return { onlyA, onlyB, compared };
};

const luminance = (rgba: Float32Array, pixel: number) =>
  0.2126 * (rgba[pixel * 4] ?? 0) + 0.7152 * (rgba[pixel * 4 + 1] ?? 0) + 0.0722 * (rgba[pixel * 4 + 2] ?? 0);

/**
 * A frame's mean colour, and its luminance's variance and mean squared step to the next pixel along x and along y,
 * each over the mean luminance squared, so they read the same at any brightness.
 */
export const shade = (name: string) => {
  const { view, rgba } = frameOf(name);
  const { pixels } = view;
  const count = pixels * pixels;
  const mean = [0, 1, 2].map((channel) => {
    let sum = 0;
    for (let pixel = 0; pixel < count; pixel++) sum += rgba[pixel * 4 + channel] ?? 0;
    return sum / count;
  });
  let sum = 0;
  let squares = 0;
  let stepX = 0;
  let stepY = 0;
  for (let row = 0; row < pixels; row++)
    for (let column = 0; column < pixels; column++) {
      const pixel = row * pixels + column;
      const here = luminance(rgba, pixel);
      sum += here;
      squares += here * here;
      if (column + 1 < pixels) stepX += (luminance(rgba, pixel + 1) - here) ** 2;
      if (row + 1 < pixels) stepY += (luminance(rgba, pixel + pixels) - here) ** 2;
    }
  const meanLuminance = sum / count;
  const scale = meanLuminance * meanLuminance;
  const steps = pixels * (pixels - 1);
  return {
    mean,
    variance: (squares / count - scale) / scale,
    stepAlongX: stepX / steps / scale,
    stepAlongY: stepY / steps / scale,
  };
};
