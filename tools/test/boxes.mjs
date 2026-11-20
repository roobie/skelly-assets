import { writeGlb } from '../glb.mjs';

// Closed axis-aligned boxes of 12 outward-wound triangles each, as one mesh.
export const boxes = (...spans) => {
  const positions = [],
    indices = [];
  for (const [min, max] of spans) {
    const base = positions.length / 3;
    for (const z of [min[2], max[2]])
      for (const y of [min[1], max[1]]) for (const x of [min[0], max[0]]) positions.push(x, y, z);
    indices.push(
      ...[
        0, 2, 1, 1, 2, 3, 4, 5, 6, 5, 7, 6, 0, 1, 4, 1, 5, 4, 2, 6, 3, 3, 6, 7, 0, 4, 2, 2, 4, 6, 1, 3, 5, 3, 7, 5,
      ].map((i) => base + i),
    );
  }
  return { positions, indices };
};

// A GLB of one node, the part `part`, drawn as a box spanning `span`.
export const partGlb = (part, span) => {
  const { positions, indices } = boxes(span);
  return writeGlb(
    {
      asset: { version: '2.0' },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ extras: { part }, mesh: 0 }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, mode: 4 }] }],
      accessors: [
        { bufferView: 0, componentType: 5126, count: positions.length / 3, type: 'VEC3', min: span[0], max: span[1] },
        { bufferView: 1, componentType: 5125, count: indices.length, type: 'SCALAR' },
      ],
    },
    [new Float32Array(positions), new Uint32Array(indices)],
  );
};
