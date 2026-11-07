import assert from 'node:assert/strict';
import test from 'node:test';
import { meshBones } from '../packages/mobgen/src/core/mesh.ts';
import { worldPosition } from '../packages/mobgen/src/core/voxelize.ts';

const cellFixture = () => ({
  size: 0.25, origin: [-1, 0, 2], dims: [3, 2, 1],
  owner: new Uint8Array([1, 1, 2, 1, 0, 2]),
  color: new Uint8Array(6).fill(3),
  materials: [],
});

test('per-cell faces retain their owning cell, including bone boundaries, without changing surface area', () => {
  const voxels = cellFixture();
  const meshes = meshBones(voxels, 2, { perCell: true });
  const area = (mesh) => {
    let result = 0;
    for (let t = 0; t < mesh.indices.length; t += 3) {
      const points = Array.from(mesh.indices.slice(t, t + 3), (v) => Array.from(mesh.positions.slice(v * 3, v * 3 + 3)));
      const a = points[1].map((x, i) => x - points[0][i]);
      const b = points[2].map((x, i) => x - points[0][i]);
      result += Math.hypot(a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]) / 2;
    }
    return result;
  };
  const merged = meshBones(voxels, 2);
  let sawBoundary = false;
  for (const [bone, mesh] of meshes) {
    assert.equal(mesh.cellIndex.length, mesh.positions.length / 3);
    assert.equal(area(mesh), area(merged.get(bone)));
    const exposed = new Set();
    for (let t = 0; t < mesh.indices.length; t += 3) {
      const vertices = Array.from(mesh.indices.slice(t, t + 3));
      const cell = mesh.cellIndex[vertices[0]];
      assert(vertices.every((v) => mesh.cellIndex[v] === cell));
      assert.equal(voxels.owner[cell], bone + 1);
      const i = cell % voxels.dims[0];
      const j = Math.floor(cell / voxels.dims[0]) % voxels.dims[1];
      const k = Math.floor(cell / (voxels.dims[0] * voxels.dims[1]));
      const center = worldPosition(voxels, i, j, k);
      const normal = Array.from(mesh.normals.slice(vertices[0] * 3, vertices[0] * 3 + 3));
      const axis = normal.findIndex((n) => n !== 0);
      for (const vertex of vertices) {
        for (let c = 0; c < 3; c++) {
          const delta = mesh.positions[vertex * 3 + c] - center[c];
          assert.equal(Math.abs(delta), voxels.size / 2);
          if (c === axis) assert.equal(delta, normal[c] * voxels.size / 2);
        }
      }
      const neighbour = mesh.neighbourBone[vertices[0]];
      assert(vertices.every((v) => mesh.neighbourBone[v] === neighbour));
      const adjacent = [i, j, k];
      adjacent[axis] += normal[axis];
      const inside = adjacent.every((x, c) => x >= 0 && x < voxels.dims[c]);
      const expected = inside ? voxels.owner[adjacent[0] + adjacent[1] * voxels.dims[0] + adjacent[2] * voxels.dims[0] * voxels.dims[1]] - 1 : -1;
      assert.equal(neighbour, expected);
      assert.notEqual(neighbour, bone);
      if (neighbour >= 0) sawBoundary = true;
      exposed.add(`${cell}:${normal.join(',')}`);
    }
    for (let cell = 0; cell < voxels.owner.length; cell++) {
      if (voxels.owner[cell] !== bone + 1) continue;
      const coordinates = [cell % voxels.dims[0], Math.floor(cell / voxels.dims[0]) % voxels.dims[1], Math.floor(cell / (voxels.dims[0] * voxels.dims[1]))];
      for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) {
        const adjacent = [...coordinates];
        adjacent[axis] += sign;
        const inside = adjacent.every((x, c) => x >= 0 && x < voxels.dims[c]);
        const owner = inside ? voxels.owner[adjacent[0] + adjacent[1] * voxels.dims[0] + adjacent[2] * voxels.dims[0] * voxels.dims[1]] : 0;
        const normal = [0, 0, 0]; normal[axis] = sign;
        assert.equal(exposed.has(`${cell}:${normal.join(',')}`), owner !== bone + 1);
      }
    }
  }
  assert(sawBoundary);
});
