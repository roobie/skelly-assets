// The JSON chunk of a GLB, which follows the 12-byte header and its own 8-byte chunk header.
export const glbJson = (buffer) => JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString('utf8'));

const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const READ = {
  5121: { size: 1, read: (view, at) => view.getUint8(at) },
  5123: { size: 2, read: (view, at) => view.getUint16(at, true) },
  5125: { size: 4, read: (view, at) => view.getUint32(at, true) },
  5126: { size: 4, read: (view, at) => view.getFloat32(at, true) },
};

// An accessor of a GLB's binary chunk, which follows the JSON chunk, as a flat array of its components.
export function glbAccessor(buffer, gltf, index) {
  const { bufferView, byteOffset = 0, componentType, count, type } = gltf.accessors[index];
  const viewSpec = gltf.bufferViews[bufferView];
  const bin = 20 + buffer.readUInt32LE(12) + 8;
  const view = new DataView(buffer.buffer, buffer.byteOffset + bin + (viewSpec.byteOffset ?? 0) + byteOffset);
  const components = COMPONENTS[type];
  const { size, read } = READ[componentType];
  const stride = viewSpec.byteStride ?? components * size;
  const out = new Array(count * components);
  for (let i = 0; i < count; i++) for (let c = 0; c < components; c++) out[i * components + c] = read(view, i * stride + c * size);
  return out;
}
