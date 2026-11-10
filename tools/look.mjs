// What the review tools (model-sheet.mjs, vehicle-gallery.mjs) decide without a browser: which manifest entries to
// draw, which built files a picture is drawn from, and which pictures those files have since changed under. A
// manifest here may also list, under `assemblies`, the kit assemblies the showcase can place from the tree
// (site/build.mjs), so a look draws them like vehicles, and under `worn` the sites that dress each wearable on the doll
// (tools/dress.mjs), so a wearable's picture changes with the doll and its pieces.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// The review tools' default folder, git-ignored, so a look never leaves tracked changes.
export const LOOK_DIR = 'look/sheet';

const vehicleById = (manifest) => new Map(manifest.vehicles.map((vehicle) => [vehicle.id, vehicle]));
const glbById = (manifest) => new Map(manifest.models.filter(({ path }) => path.endsWith('.glb')).map((model) => [model.id, model]));
const assemblyById = (manifest) => new Map((manifest.assemblies ?? []).map((assembly) => [assembly.id, assembly]));
const wornById = (manifest) => new Map(Object.entries(manifest.worn ?? {}));

// The ids to draw: those named, every vehicle with `vehicles`, every assembly with `assemblies`, or everything when
// none is given.
export function lookIds(manifest, { ids = [], vehicles = false, assemblies = false } = {}) {
  const drawn = [glbById(manifest), vehicleById(manifest), assemblyById(manifest)].map((byId) => [...byId.keys()]);
  const known = new Set(drawn.flat());
  const unknown = ids.filter((id) => !known.has(id));
  if (unknown.length > 0) throw new Error(`no model, vehicle or assembly of the built tree: ${unknown.join(' ')}`);
  const all = [...(vehicles ? drawn[1] : []), ...(assemblies ? drawn[2] : [])];
  return [...new Set([...ids, ...(ids.length > 0 || vehicles || assemblies ? all : known)])].sort();
}

const fileOf = ({ pack, path }) => `${pack}/${path}`;

// The built files a picture of `id` is drawn from, under the built tree: a model's GLB, a vehicle's placements and the
// GLB of every part they place, or the GLB of every part of an assembly; a wearable's adds every model it is worn with.
export function lookSources(built, manifest, id) {
  const models = glbById(manifest);
  const partFiles = (parts) => [...new Set(parts.map((part) => fileOf(models.get(part))))];
  const assembly = assemblyById(manifest).get(id);
  if (assembly) return partFiles(assembly.sites.map(({ model }) => model));
  const vehicle = vehicleById(manifest).get(id);
  if (!vehicle) return [...new Set([fileOf(models.get(id)), ...partFiles((wornById(manifest).get(id) ?? []).map(({ model }) => model))])];
  const placements = fileOf(vehicle);
  const { sites } = JSON.parse(readFileSync(join(built, placements), 'utf8'));
  return [placements, ...partFiles(sites.map(({ part }) => part))];
}

// A digest of everything a picture of `id` shows: its built files and the manifest entries that steer the drawing,
// such as a printed label, where an assembly sites its parts or where the doll wears a wearable. Undefined when the
// tree no longer holds it or one of its files.
export function lookDigest(built, manifest, id) {
  const entries = [...glbById(manifest).values(), ...manifest.vehicles, ...assemblyById(manifest).values()]
    .filter((entry) => entry.id === id);
  if (entries.length === 0) return undefined;
  let files;
  try {
    files = lookSources(built, manifest, id);
  } catch {
    return undefined;
  }
  if (files.some((file) => !existsSync(join(built, file)))) return undefined;
  const hash = createHash('sha256').update(JSON.stringify([entries, wornById(manifest).get(id) ?? null]));
  for (const file of files) hash.update(file).update(readFileSync(join(built, file)));
  return hash.digest('hex');
}

// A look's options as the sheet prints and keys them: its view set and the sites it keeps (site/lookOptions.mjs).
export const lookName = ({ views = 'review', sites = [] } = {}) => (sites.length > 0 ? `${views} views, sites ${sites.join(', ')}` : `${views} views`);

// The sheet's rows after a look named `look` (lookName): each row drawn now replaces its earlier one, so a few redrawn
// entries still show beside the rest of a batch, and a row whose entry the tree no longer holds is dropped. A sheet
// shows one look, so rows drawn with other options are dropped too.
export function mergeRows(previous, drawn, known, look = lookName()) {
  const byId = new Map(previous.filter((row) => known.has(row.id) && (row.look ?? lookName()) === look).map((row) => [row.id, row]));
  for (const row of drawn) byId.set(row.id, row);
  return [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// The ids whose picture no longer shows the built tree: a row drawn from files that have changed since, or that the
// tree no longer holds. A row that failed to draw has no picture to be stale.
export const staleIds = (rows, digestOf) => rows.filter((row) => !row.error && digestOf(row.id) !== row.digest).map(({ id }) => id);
