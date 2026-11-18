import {
  DirectionalLight,
  HemisphereLight,
  type Light,
  type Object3D,
  PointLight,
  Scene,
  type WebGLRenderer,
} from 'three';
import { makeStage } from '../../../../site/render.mjs';
import { srgb } from './colour.ts';
import { isShowcase, type Lab, type Stage } from './content.ts';

/** A stage's lit scene, and the torch the player carries in it, if it has one, with where it is held. */
export interface Lit {
  readonly scene: Scene;
  readonly torch?: { readonly light: PointLight; readonly offset: readonly [number, number, number] };
}

// The sun casts the shadows the leaf kind's depth pass cuts, over a square about the origin wide enough for the model
// and the pieces.
const castShadows = (sun: DirectionalLight, { mapSize, extent, bias, normalBias }: Lab['shadow']) => {
  sun.castShadow = true;
  sun.shadow.mapSize.set(mapSize, mapSize);
  sun.shadow.bias = bias;
  sun.shadow.normalBias = normalBias;
  const camera = sun.shadow.camera;
  camera.left = camera.bottom = -extent;
  camera.right = camera.top = extent;
  camera.near = 0.1;
  camera.far = sun.position.length() + 2 * extent;
  camera.updateProjectionMatrix();
};

const isDirectional = (object: Object3D): object is DirectionalLight =>
  (object as Light & { isDirectionalLight?: boolean }).isDirectionalLight === true;

/**
 * The stages' lit scenes. The showcase stage is the showcase's own (site/render.mjs, makeStage) with its sun made to
 * cast shadows; the others are lit from content and share its environment map, at their own share.
 */
export const stages = (renderer: WebGLRenderer) => {
  const showcase: Scene = makeStage(renderer);
  const light = (stage: Stage, lab: Lab): Lit => {
    if (isShowcase(stage)) {
      showcase.background = srgb(stage.background);
      for (const sun of showcase.children.filter(isDirectional)) {
        // A shadow-casting sun needs a distance to fit its shadow camera; the showcase's gives a direction alone.
        sun.position.setLength(2 * lab.shadow.extent);
        castShadows(sun, lab.shadow);
      }
      return { scene: showcase };
    }
    const scene = new Scene();
    scene.background = srgb(stage.background);
    scene.environment = showcase.environment;
    scene.environmentIntensity = stage.environment;
    const sun = new DirectionalLight(srgb(stage.sun.colour), stage.sun.intensity);
    sun.position.set(...stage.sun.from);
    castShadows(sun, lab.shadow);
    const { sky, ground, intensity } = stage.hemisphere;
    scene.add(sun, new HemisphereLight(srgb(sky), srgb(ground), intensity));
    if (stage.torch === undefined) return { scene };
    const { colour, distance, decay, offset } = stage.torch;
    const torch = new PointLight(srgb(colour), stage.torch.intensity, distance, decay);
    torch.castShadow = true;
    torch.shadow.mapSize.set(lab.shadow.mapSize, lab.shadow.mapSize);
    scene.add(torch);
    return { scene, torch: { light: torch, offset } };
  };
  /** The showcase's scene, kept for the page's life; every other stage's scene is the caller's to dispose. */
  return { showcase, light };
};
