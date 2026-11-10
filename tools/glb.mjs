// The JSON chunk of a GLB, which follows the 12-byte header and its own 8-byte chunk header.
export const glbJson = (buffer) => JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString('utf8'));
