import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
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

// go-jsonnet searches library paths right to left, so the overlay comes last.
const libraryArgs = (repositoryRoot, overlay) => ['-J', repositoryRoot, '-J', resolve(repositoryRoot, '..'), ...(overlay ? ['-J', overlay] : [])];

function runJsonnet(args, repositoryRoot, label) {
  try {
    return execFileSync(jsonnetExecutable(), args, {
      cwd: repositoryRoot,
      encoding: 'utf8',
      maxBuffer: Number.POSITIVE_INFINITY,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('jsonnet binary missing:')) {
      throw error;
    }
    const detail = error instanceof Error && 'stderr' in error ? String(error.stderr).trim() : String(error);
    throw new Error(`Jsonnet compilation failed for ${label}: ${detail}`, { cause: error });
  }
}

// An `overlay` folder is searched before the repository for root-relative imports, so a caller can swap
// one library file without touching the tracked one.
export function compileJsonnetFile(sourcePath, repositoryRoot = REPOSITORY_ROOT, { overlay } = {}) {
  const absoluteSource = resolve(repositoryRoot, sourcePath);
  return runJsonnet([...libraryArgs(repositoryRoot, overlay), absoluteSource], repositoryRoot, relative(repositoryRoot, absoluteSource));
}

// Evaluates a Jsonnet expression with the repository's library paths. Jsonnet is lazy, so an expression that keeps
// only a few fields of a large source evaluates just those fields.
export function evaluateJsonnet(expression, repositoryRoot = REPOSITORY_ROOT) {
  return runJsonnet([...libraryArgs(repositoryRoot), '-e', expression], repositoryRoot, expression);
}

// Compiles many sources in one go-jsonnet run, each to the text compileJsonnetFile gives it. One run evaluates a file
// the sources share, such as the item catalogue every recipe imports, once rather than once per source.
export function compileJsonnetFiles(sourcePaths, repositoryRoot = REPOSITORY_ROOT) {
  const out = mkdtempSync(join(tmpdir(), 'jsonnet-'));
  try {
    const fields = sourcePaths.map((source, at) => `"${at}": import ${JSON.stringify(resolve(repositoryRoot, source))}`);
    runJsonnet([...libraryArgs(repositoryRoot), '-m', out, '-e', `{${fields.join(',')}}`], repositoryRoot, `${sourcePaths.length} sources`);
    return sourcePaths.map((_, at) => readFileSync(join(out, String(at)), 'utf8'));
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}
