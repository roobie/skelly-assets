// The gun content lives in the repository's models tree, outside the tools workspace, so a modder edits it
// without touching code.
import { resolve } from 'node:path';

/** The repository root, against which recipe rows name their sources. */
export const REPO_ROOT = resolve(import.meta.dirname, '../../../../..');
export const DESIGNS = resolve(REPO_ROOT, 'models/guns/designs');
export const CARTRIDGES = resolve(REPO_ROOT, 'models/guns/cartridges');
/** Trace records and their SVGs, relative to the root a trace check reads. */
export const TRACE_REFERENCES = 'models/guns/references';
