import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOOLS_DIR = fileURLToPath(new URL('./', import.meta.url));
const RUNTIME_PIN = JSON.parse(readFileSync(resolve(TOOLS_DIR, 'runtime.json'), 'utf8'));
const JSONNET_NAME = process.platform === 'win32' ? 'jsonnet.exe' : 'jsonnet';
const JSONNET_EXECUTABLE = resolve(TOOLS_DIR, 'bin', RUNTIME_PIN.version, JSONNET_NAME);
const SETUP_SCRIPT = resolve(TOOLS_DIR, 'setup.mjs');

function jsonnetExecutable() {
  if (!existsSync(JSONNET_EXECUTABLE)) {
    try {
      execFileSync(process.execPath, [SETUP_SCRIPT], { cwd: REPOSITORY_ROOT, stdio: 'inherit' });
    } catch (error) {
      throw new Error('jsonnet binary missing: run npm run setup', { cause: error });
    }
  }
  if (!existsSync(JSONNET_EXECUTABLE)) {
    throw new Error('jsonnet binary missing: run npm run setup');
  }
  return JSONNET_EXECUTABLE;
}

// An `overlay` folder is searched before the repository for root-relative imports, so a caller can swap
// one library file without touching the tracked one.
export function compileJsonnetFile(sourcePath, repositoryRoot = REPOSITORY_ROOT, { overlay } = {}) {
  const absoluteSource = resolve(repositoryRoot, sourcePath);
  // go-jsonnet searches library paths right to left, so the overlay comes last.
  const libraries = ['-J', repositoryRoot, '-J', resolve(repositoryRoot, '..'), ...(overlay ? ['-J', overlay] : [])];
  try {
    return execFileSync(jsonnetExecutable(), [...libraries, absoluteSource], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      maxBuffer: Number.POSITIVE_INFINITY,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('jsonnet binary missing:')) {
      throw error;
    }
    const detail = error instanceof Error && 'stderr' in error ? String(error.stderr).trim() : String(error);
    throw new Error(`Jsonnet compilation failed for ${relative(repositoryRoot, absoluteSource)}: ${detail}`, {
      cause: error,
    });
  }
}
