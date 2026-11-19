// @ts-check
/** @import { ExportPortMetadata } from './packages/thing-export/src/exportTypes.ts' */

/**
 * What these tools read of a GLB's JSON chunk.
 * @typedef {object} Gltf
 * @property {GltfAccessor[]} accessors
 * @property {GltfBufferView[]} bufferViews
 * @property {GltfNode[]} nodes
 * @property {GltfMesh[]} meshes
 * @property {{ nodes: number[] }[]} scenes
 * @property {number} [scene]
 */

/**
 * @typedef {object} GltfAccessor
 * @property {number} bufferView
 * @property {number} [byteOffset]
 * @property {keyof typeof READ} componentType
 * @property {number} count
 * @property {keyof typeof COMPONENTS} type
 * @property {[number, number, number]} [min]
 * @property {[number, number, number]} [max]
 */

/** @typedef {{ byteOffset?: number; byteLength: number; byteStride?: number }} GltfBufferView */

/**
 * A node, with the extras the export marks a part's node and a port's node by.
 * @typedef {object} GltfNode
 * @property {[number, number, number]} [translation]
 * @property {[number, number, number, number]} [rotation]
 * @property {[number, number, number]} [scale]
 * @property {number} [mesh]
 * @property {string} [name]
 * @property {number[]} [children]
 * @property {{ part?: string; port?: ExportPortMetadata }} [extras]
 */

/**
 * A primitive, with the piece and material slot the export marks it as.
 * @typedef {object} GltfPrimitive
 * @property {{ POSITION: number } & Record<string, number>} attributes
 * @property {number} [indices]
 * @property {number} [mode]
 * @property {{ piece?: string; slot?: string; voxelGrain?: number }} [extras]
 */

/** @typedef {{ primitives: GltfPrimitive[] }} GltfMesh */

/**
 * The JSON chunk of a GLB, which follows the 12-byte header and its own 8-byte chunk header.
 * @param {Buffer} buffer
 * @returns {Gltf}
 */
export const glbJson = (buffer) => JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString('utf8'));

const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
/** @type {Record<5121 | 5123 | 5125 | 5126, { size: number; read: (view: DataView, at: number) => number }>} */
const READ = {
  5121: { size: 1, read: (view, at) => view.getUint8(at) },
  5123: { size: 2, read: (view, at) => view.getUint16(at, true) },
  5125: { size: 4, read: (view, at) => view.getUint32(at, true) },
  5126: { size: 4, read: (view, at) => view.getFloat32(at, true) },
};

/**
 * The item at `index` of `list`, which a GLB names by index, or a thrown error naming what is missing.
 * @template T
 * @param {readonly T[]} list
 * @param {number} index
 * @param {string} what
 * @returns {T}
 */
export function glbItem(list, index, what) {
  const item = list[index];
  if (item === undefined) throw new Error(`the GLB has no ${what} ${index}`);
  return item;
}

/**
 * An accessor of a GLB's binary chunk, which follows the JSON chunk, as a flat array of its components.
 * @param {Buffer} buffer
 * @param {Gltf} gltf
 * @param {number} index
 * @returns {number[]}
 */
export function glbAccessor(buffer, gltf, index) {
  const { bufferView, byteOffset = 0, componentType, count, type } = glbItem(gltf.accessors, index, 'accessor');
  const viewSpec = glbItem(gltf.bufferViews, bufferView, 'buffer view');
  const bin = 20 + buffer.readUInt32LE(12) + 8;
  const view = new DataView(buffer.buffer, buffer.byteOffset + bin + (viewSpec.byteOffset ?? 0) + byteOffset);
  const components = COMPONENTS[type];
  const { size, read } = READ[componentType];
  const stride = viewSpec.byteStride ?? components * size;
  /** @type {number[]} */
  const out = new Array(count * components);
  for (let i = 0; i < count; i++)
    for (let c = 0; c < components; c++) out[i * components + c] = read(view, i * stride + c * size);
  return out;
}

const GLB_JSON = 0x4e4f534a;
const GLB_BIN = 0x004e4942;

/**
 * A GLB of `json` over the typed arrays `parts`, laid end to end in one buffer with a buffer view each, in order; the
 * json's accessors name those views by index.
 * @param {object} json
 * @param {readonly ArrayBufferView[]} parts
 */
export function writeGlb(json, parts) {
  /** @type {number[]} */
  const offsets = [];
  let length = 0;
  for (const part of parts) {
    offsets.push(length);
    length += part.byteLength + ((4 - (part.byteLength % 4)) % 4);
  }
  const bin = Buffer.alloc(length);
  parts.forEach((part, i) => Buffer.from(part.buffer, part.byteOffset, part.byteLength).copy(bin, offsets[i]));
  const full = {
    ...json,
    buffers: [{ byteLength: bin.length }],
    bufferViews: parts.map((part, i) => ({ buffer: 0, byteOffset: offsets[i], byteLength: part.byteLength })),
  };
  const raw = Buffer.from(JSON.stringify(full));
  const js = Buffer.concat([raw, Buffer.alloc((4 - (raw.length % 4)) % 4, 0x20)]);
  const header = Buffer.alloc(12);
  header.write('glTF');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
  /**
   * @param {number} size
   * @param {number} type
   */
  const chunk = (size, type) => {
    const bytes = Buffer.alloc(8);
    bytes.writeUInt32LE(size);
    bytes.writeUInt32LE(type, 4);
    return bytes;
  };
  return Buffer.concat([header, chunk(js.length, GLB_JSON), js, chunk(bin.length, GLB_BIN), bin]);
}
