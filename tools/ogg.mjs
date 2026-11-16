// Encodes mono samples to an Ogg Vorbis file whose bytes depend only on the samples and the settings, so two builds of
// a sound agree byte for byte (tools/check-built.mjs). The encoder is the reference libvorbis compiled to WebAssembly,
// whose arithmetic is the same on every machine; it draws a random stream serial number, which encodeOgg fixes.
import { createOggEncoder } from 'wasm-media-encoders';

// Any constant does: a file holds one stream, and the serial only tells streams in one file apart.
const SERIAL = 1;

// Ogg's page checksum: CRC-32 with polynomial 0x04c11db7, unreflected, from zero.
const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, byte) => {
  let r = byte << 24;
  for (let bit = 0; bit < 8; bit++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1;
  return r >>> 0;
});
const pageCrc = (bytes) => bytes.reduce((crc, byte) => ((crc << 8) ^ CRC_TABLE[((crc >>> 24) ^ byte) & 0xff]) >>> 0, 0);

// Sets every page's serial number and recomputes its checksum, which covers the serial.
function fixSerial(file) {
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  for (let at = 0; at < file.length; ) {
    if (String.fromCharCode(...file.subarray(at, at + 4)) !== 'OggS') throw new Error(`no Ogg page at byte ${at}`);
    const segments = file[at + 26];
    const length = 27 + segments + file.subarray(at + 27, at + 27 + segments).reduce((sum, size) => sum + size, 0);
    view.setUint32(at + 14, SERIAL, true);
    view.setUint32(at + 22, 0, true);
    view.setUint32(at + 22, pageCrc(file.subarray(at, at + length)), true);
    at += length;
  }
  return file;
}

let encoder;

// samples: a Float32Array between -1 and 1; quality: Vorbis VBR quality, -1 to 10.
export async function encodeOgg(samples, { sampleRate, quality }) {
  encoder ??= await createOggEncoder();
  encoder.configure({ channels: 1, sampleRate, vbrQuality: quality });
  // The encoder owns the arrays it returns, so each is copied before the next call.
  const body = encoder.encode([samples]).slice();
  const tail = encoder.finalize().slice();
  const file = new Uint8Array(body.length + tail.length);
  file.set(body);
  file.set(tail, body.length);
  return fixSerial(file);
}
