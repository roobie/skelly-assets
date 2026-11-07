import { posix } from 'node:path';

export function outputPath(packId, file) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(packId) || packId === '.' || packId === '..') {
    throw new Error(`Invalid pack id: ${packId}`);
  }
  if (!file || file.includes('\\') || posix.isAbsolute(file) || file.split('/').some(segment => segment === '..' || segment === '.' || segment === '')) {
    throw new Error(`Invalid logical output path: ${file}`);
  }
  return posix.join(packId, file);
}
