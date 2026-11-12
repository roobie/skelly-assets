import { Box3, Mesh, Ray, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { expect, it } from 'vitest';
import recipes from '../../../../models/recipes/skelly.wearables.json' with { type: 'json' };
import { catalogue } from '../src/content.ts';
import { loadThingRecipe } from '../src/exports.ts';

type Triangle = readonly [Vector3, Vector3, Vector3];
const direction = new Vector3(1, 0.31, 0.17).normalize();
const inset = 0.001;

const shell = async (id: string) => {
  const row = loadThingRecipe(recipes.filter((entry) => entry.id === id), catalogue)[0];
  expect(row).toBeDefined();
  const { glb } = row!.generate();
  const { scene } = await new GLTFLoader().parseAsync(Uint8Array.from(glb).buffer, '');
  scene.updateMatrixWorld(true);
  const triangles: Triangle[] = [];
  scene.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const position = node.geometry.getAttribute('position');
    const index = node.geometry.getIndex()!;
    const vertex = (i: number) => new Vector3().fromBufferAttribute(position, index.getX(i)).applyMatrix4(node.matrixWorld);
    for (let i = 0; i < index.count; i += 3) triangles.push([vertex(i), vertex(i + 1), vertex(i + 2)]);
  });
  expect(triangles.length).toBeGreaterThan(0);
  const bounds = new Box3().setFromPoints(triangles.flat());
  const ray = new Ray(new Vector3(), direction);
  const hit = new Vector3();
  return {
    points: triangles.flatMap(([a, b, c]) => {
      const inward = new Vector3().crossVectors(c.clone().sub(a), b.clone().sub(a)).normalize();
      const centre = a.clone().add(b).add(c).divideScalar(3);
      return [a, b, c, centre].map((corner) => {
        const toward = centre.clone().sub(corner);
        const step = Math.min(inset, toward.length() / 2);
        return corner.clone().addScaledVector(toward.normalize(), step).addScaledVector(inward, inset);
      });
    }),
    contains: (point: Vector3) => {
      if (!bounds.containsPoint(point)) return false;
      ray.origin.copy(point);
      let crossings = 0;
      for (const [a, b, c] of triangles) {
        if (ray.intersectTriangle(a, b, c, false, hit) && hit.distanceToSquared(point) > 1e-18) crossings++;
      }
      return crossings % 2 === 1;
    },
  };
};

// Both torso garments take the over-jacket gear, so it must clear each of them.
it.each(['jacket_worn_body', 'hoodie_worn_body'])('exports the over-jacket utility vest clear of %s', async (id) => {
  const garment = await shell(id);
  const vest = await shell('utility_vest_worn_jacket');
  expect(garment.points.filter(vest.contains)).toHaveLength(0);
  expect(vest.points.filter(garment.contains)).toHaveLength(0);
});
