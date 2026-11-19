// @ts-check
// How generated JSON takes its text and reaches the disk. Test files run in parallel processes that each refresh the
// generated files, and a dev server watches them, so a reader must never see a half-written file and an unchanged one
// must keep its mtime.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';

// A generated file is the Jsonnet it stands in for, so its text keeps what JSON.stringify drops: a negative zero.
const NEGATIVE_ZERO = '\0negative zero';
/** @param {unknown} value */
export const jsonText = (value) =>
  JSON.stringify(value, (_key, field) => (Object.is(field, -0) ? NEGATIVE_ZERO : field)).replaceAll(
    `"\\u0000${NEGATIVE_ZERO.slice(1)}"`,
    '-0',
  );

/**
 * @param {string} path
 * @param {string | Uint8Array} contents
 */
export const replaceFile = (path, contents) => {
  mkdirSync(dirname(path), { recursive: true });
  const partial = `${path}.${process.pid}.partial`;
  writeFileSync(partial, contents);
  renameSync(partial, path);
};

// A file whose bytes are already on disk is left alone, mtime included: a dev server watching the files reloads on
// every write, and an edit reaches many files that come out as they were.
/**
 * @param {string} path
 * @param {string | Uint8Array} contents
 */
export const replaceFileIfChanged = (path, contents) => {
  try {
    if (readFileSync(path).equals(typeof contents === 'string' ? Buffer.from(contents) : contents)) return;
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
  }
  replaceFile(path, contents);
};
