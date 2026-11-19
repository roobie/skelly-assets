import {
  AmbientLight,
  BatchedMesh,
  Bone,
  BoxGeometry,
  type BufferGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  InstancedMesh,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshDepthMaterial,
  MeshDistanceMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  OrthographicCamera,
  PointLight,
  Scene,
  Skeleton,
  SkinnedMesh,
  Uint16BufferAttribute,
  WebGLRenderTarget,
} from 'three';
import type { SurfaceShader } from '../../../src/patch.ts';
import type { CompileCase, Program, Variant } from './cases.ts';
import { type Gpu, wear } from './surface.ts';

const SIZE = [1, 1, 1] as const;

const materialOf = (program: Program): Material => {
  switch (program) {
    case 'standard':
      return new MeshStandardMaterial();
    case 'physical':
      // The layers whose code reads the normal the surfaces tilt.
      return new MeshPhysicalMaterial({ clearcoat: 0.5, sheen: 0.5 });
    case 'depth':
      return new MeshDepthMaterial();
    case 'distance':
      return new MeshDistanceMaterial();
  }
};

const skinned = (geometry: BufferGeometry, material: Material) => {
  const vertices = geometry.getAttribute('position').count;
  geometry.setAttribute('skinIndex', new Uint16BufferAttribute(new Uint16Array(vertices * 4), 4));
  geometry.setAttribute(
    'skinWeight',
    new Float32BufferAttribute(
      Float32Array.from({ length: vertices * 4 }, (_, i) => (i % 4 === 0 ? 1 : 0)),
      4,
    ),
  );
  const mesh = new SkinnedMesh(geometry, material);
  const bone = new Bone();
  mesh.add(bone);
  mesh.bind(new Skeleton([bone]));
  return mesh;
};

const batched = (geometry: BufferGeometry, material: Material) => {
  const mesh = new BatchedMesh(1, geometry.getAttribute('position').count, geometry.getIndex()?.count ?? 0, material);
  mesh.addInstance(mesh.addGeometry(geometry));
  return mesh;
};

const meshOf = (variant: Variant, geometry: BufferGeometry, material: Material): Mesh | BatchedMesh => {
  switch (variant) {
    case 'plain':
      return new Mesh(geometry, material);
    case 'instanced':
      return new InstancedMesh(geometry, material, 2);
    case 'skinned':
      return skinned(geometry, material);
    case 'batched':
      return batched(geometry, material);
  }
};

// A line no GLSL compiler accepts, after an anchor every patched program has.
const breakProgram = (shader: SurfaceShader) => {
  const anchor = '#include <clipping_planes_fragment>';
  shader.fragmentShader = shader.fragmentShader.replace(anchor, () => `${anchor}\nsurfaceUndeclared = 1.0;`);
};

/**
 * Draws one frame of a mesh wearing the case's surface, through a shadow map for a shadow pass, and gives back the
 * shader errors it met. A frame, not `renderer.compile`, because a driver with parallel compiling links a program
 * only when it is first drawn.
 */
export const compile = ({ renderer, takeErrors }: Gpu, { surface, pass, program, variant, broken }: CompileCase) => {
  const patched = materialOf(program);
  wear(patched, surface, pass, { model: SIZE, ...(broken ? { edit: breakProgram } : {}) });
  const geometry = new BoxGeometry(...SIZE);
  const shown = pass === 'colour' ? patched : new MeshBasicMaterial();
  const mesh = meshOf(variant, geometry, shown);
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  if (pass === 'depth') mesh.customDepthMaterial = patched;
  if (pass === 'distance') mesh.customDistanceMaterial = patched;

  // three draws a point light's shadow with the distance material and any other light's with the depth material.
  const light: DirectionalLight | PointLight = pass === 'distance' ? new PointLight() : new DirectionalLight();
  light.position.set(0, 2, 3);
  light.castShadow = pass !== 'colour';
  const scene = new Scene().add(mesh, light, new AmbientLight());
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 5;
  const target = new WebGLRenderTarget(16, 16);
  renderer.shadowMap.enabled = pass !== 'colour';
  renderer.setRenderTarget(target);
  try {
    renderer.render(scene, camera);
    return takeErrors();
  } catch (error) {
    return [...takeErrors(), String(error)];
  } finally {
    renderer.setRenderTarget(null);
    target.dispose();
    geometry.dispose();
    patched.dispose();
    shown.dispose();
    light.dispose();
    if (mesh instanceof BatchedMesh) mesh.dispose();
  }
};
