// What the review tools (model-sheet.mjs, vehicle-gallery.mjs) decide without a browser: which manifest entries to
// draw, which built files a picture is drawn from, and which pictures those files have since changed under.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// The review tools' default folder, git-ignored, so a look never leaves tracked changes.
export const LOOK_DIR = 'look/sheet';

const vehicleById = (manifest) => new Map(manifest.vehicles.map((vehicle) => [vehicle.id, vehicle]));
const glbById = (manifest) => new Map(manifest.models.filter(({ path }) => path.endsWith('.glb')).map((model) => [model.id, model]));

// The ids to draw: those named, every vehicle with `vehicles`, or every model and vehicle when neither is given.
export function lookIds(manifest, { ids = [], vehicles = false } = {}) {
  const known = new Set([...glbById(manifest).keys(), ...vehicleById(manifest).keys()]);
  const unknown = ids.filter((id) => !known.has(id));
  if (unknown.length > 0) throw new Error(`neither a model nor a vehicle of the built tree: ${unknown.join(' ')}`);
  const all = vehicles ? [...vehicleById(manifest).keys()] : ids.length > 0 ? [] : [...known];
  return [...new Set([...ids, ...all])].sort();
}

const fileOf = ({ pack, path }) => `${pack}/${path}`;

// The built files a picture of `id` is drawn from, under the built tree: a model's GLB, or a vehicle's placements and
// the GLB of every part they place.
export function lookSources(built, manifest, id) {
  const vehicle = vehicleById(manifest).get(id);
  if (!vehicle) return [fileOf(glbById(manifest).get(id))];
  const placements = fileOf(vehicle);
  const { sites } = JSON.parse(readFileSync(join(built, placements), 'utf8'));
  const models = glbById(manifest);
  return [placements, ...new Set(sites.map(({ part }) => fileOf(models.get(part))))];
}

// A digest of everything a picture of `id` shows: its built files and the manifest entries that steer the drawing,
// such as a printed label. Undefined when the tree no longer holds it or one of its files.
export function lookDigest(built, manifest, id) {
  const entries = [...glbById(manifest).values(), ...manifest.vehicles].filter((entry) => entry.id === id);
  if (entries.length === 0) return undefined;
  let files;
  try {
    files = lookSources(built, manifest, id);
  } catch {
    return undefined;
  }
  if (files.some((file) => !existsSync(join(built, file)))) return undefined;
  const hash = createHash('sha256').update(JSON.stringify(entries));
  for (const file of files) hash.update(file).update(readFileSync(join(built, file)));
  return hash.digest('hex');
}

// The sheet's rows after a look: each row drawn now replaces its earlier one, so a few redrawn entries still show
// beside the rest of a batch, and a row whose entry the tree no longer holds is dropped.
export function mergeRows(previous, drawn, known) {
  const byId = new Map(previous.filter(({ id }) => known.has(id)).map((row) => [row.id, row]));
  for (const row of drawn) byId.set(row.id, row);
  return [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// The ids whose picture no longer shows the built tree: a row drawn from files that have changed since, or that the
// tree no longer holds. A row that failed to draw has no picture to be stale.
export const staleIds = (rows, digestOf) => rows.filter((row) => !row.error && digestOf(row.id) !== row.digest).map(({ id }) => id);
