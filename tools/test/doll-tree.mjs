import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { after } from 'node:test';
import { modelSources } from '../check-sources.mjs';
import { dollRig, readRigContent, restMeshes, treeMeshes } from '../dollRig.mjs';
import { dollModels, modelBox, readDoll, readDressing, wornSites } from '../dress.mjs';
import { thingEntryFile } from '../layout.mjs';
import { readPressCheck } from '../press-check.mjs';
import { manifestTaxonomy } from '../taxonomy.mjs';
import { heldItems, readWields, WIELD_SETS } from '../wields.mjs';

export const repo = resolve(import.meta.dirname, '../..');
export const WEAR = 'leather_jacket';
// The everyday clothes the worn-fit templates shape (models/worn-clothing.libsonnet), and the sleeveless top whose
// armholes stand beside the arm (models/catalogue/worn.libsonnet).
export const CLOTHES = ['jacket', 'hoodie', 'jeans', 'rubber_boots', 'sneakers', 'tank_top'];
// The other fitted garments, each on a fit the everyday clothes don't exercise: the robe template and the narrow boot.
const OTHER_WORN = ['wizard_robe', 'combat_boots'];
export const WORN = [WEAR, ...CLOTHES, ...OTHER_WORN];
// The press check and the wields, read only by the files that hold something, so a garment or gait test neither waits on
// their Jsonnet nor fails when it breaks.
let heldRead;
export const heldThings = () => {
  if (heldRead) return heldRead;
  const pressCheck = readPressCheck(repo);
  const wields = readWields(repo);
  const guns = readWields(repo, WIELD_SETS.guns.file);
  const gunIds = Object.values(guns.classes).map(({ weapon }) => weapon.model);
  // Everything a hand holds: the press check's rifle and the wields' weapons and guns.
  const ids = [
    pressCheck.rifle,
    ...new Set(Object.values(wields.classes).flatMap(({ weapon }) => (weapon ? [weapon.model] : []))),
    ...gunIds,
  ];
  heldRead = { pressCheck, wields, guns, gunIds, ids };
  return heldRead;
};
const sources = await modelSources(repo);
export const shellsOf = (wear) => sources.filter(({ id }) => id.startsWith(`${wear}_worn_`)).map(({ id }) => id);
const taxonomies = new Map(sources.map(({ pack, id, taxonomy }) => [`${pack}/${id}`, taxonomy]));

// The doll, the garments `wears` with their fitted shells and, when `held`, everything a hand holds, built from the
// repo's own content, so the doll tests check the rig, the fixtures, the probe and the fitted shells against the doll as
// it is drawn, not against a stand-in. Each test file builds only what it checks, since the files build in parallel.
export const dollTree = ({ wears = [], held = false }) => {
  const dressing = readDressing(repo);
  const built = mkdtempSync(join(tmpdir(), 'doll-tree-'));
  after(() => rmSync(built, { recursive: true, force: true }));
  execFileSync(
    process.execPath,
    [
      join(repo, 'tools/build.mjs'),
      '--no-cache',
      '--out',
      built,
      ...dollModels(dressing),
      ...wears.flatMap((wear) => [wear, ...shellsOf(wear)]),
      ...(held ? heldThings().ids : []),
    ],
    { cwd: repo, stdio: 'pipe' },
  );
  // A build of named ids writes no manifest, so the models it built are listed here with their source taxonomy, what
  // they cover and the lift of their soles, from the model entry the thing export writes beside each (a gun export
  // writes none), as the manifest would list them.
  const manifest = {
    models: readdirSync(built).flatMap((pack) =>
      readdirSync(join(built, pack, 'assets/models')).map((file) => {
        const id = file.slice(0, -'.glb'.length);
        const entry = join(built, thingEntryFile(pack, id));
        const { covers, soleLift: lift } = existsSync(entry) ? JSON.parse(readFileSync(entry, 'utf8')) : {};
        return {
          id,
          pack,
          path: `assets/models/${file}`,
          covers,
          soleLift: lift,
          ...manifestTaxonomy(taxonomies.get(`${pack}/${id}`)),
        };
      }),
    ),
  };
  const doll = readDoll(built, manifest, dressing);
  const rig = dollRig(readRigContent(repo), doll, dressing);
  const models = manifest.models.filter((model) => model.path.endsWith('.glb'));
  const boxOf = (id) => {
    const entry = models.find((model) => model.id === id);
    return modelBox(readFileSync(join(built, entry.pack, entry.path)));
  };
  const anchorsOf = (id) => {
    const { pack } = models.find((model) => model.id === id);
    const entry = join(built, thingEntryFile(pack, id));
    return existsSync(entry) ? (JSON.parse(readFileSync(entry, 'utf8')).anchors ?? {}) : {};
  };
  const meshes = treeMeshes(built, manifest);
  const sitesIn = (wear) =>
    wornSites(
      models.find((model) => model.id === wear),
      { dressing, doll, models, boxOf, anchorsOf },
    );
  const { meshOf: itemMesh, entryOf: thingOf } = heldItems(built, manifest);
  return {
    built,
    manifest,
    doll,
    rig,
    models,
    sitesIn,
    restIn: (wear) => restMeshes(rig, sitesIn(wear), meshes),
    itemMesh,
    thingOf,
  };
};
