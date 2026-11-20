// Report how each model's smooth copy (docs/decisions/0020-smooth-copy.md) fares under the fit checks its voxel file is
// held to: the head-gear straps (tools/strap-fit.mjs), the rigid head shells (tools/head-fit.mjs) and the worn pieces'
// covers (tools/dollRig.mjs, `coverGaps`), each drawn smooth on the smooth doll but placed by the voxel build's
// datums, as a consumer drawing smooth places them, and whether every smooth file reads as its voxel file's twin. The
// voxel checks were tuned to the lattice, so a smooth finding is a refit to weigh, not a broken build: this only reports.
// Usage: node tools/smooth-fit.mjs [--built built]. The built tree needs its manifest.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { coverGaps, dollRig } from './dollRig.mjs';
import {
  coveringItems,
  dollDressings,
  dollGarments,
  modelMeshes,
  readDoll,
  readDressing,
  wornSites,
} from './dress.mjs';
import { glbJson } from './glb.mjs';
import { readSeats, seatFindings } from './head-fit.mjs';
import { MANIFEST } from './manifest.mjs';
import {
  anchorFindings,
  builtModels,
  formFile,
  readBandFit,
  strapFindings,
  strapGrain,
  strapMesh,
} from './strap-fit.mjs';

const repo = resolve(import.meta.dirname, '..');

// A model's findings, or the one finding that its check could not be run on it.
const guarded = (model, check) => {
  try {
    return check();
  } catch (error) {
    return [`${model}: not checked, ${error.message}`];
  }
};

// The ways a smooth file is not its voxel file's twin: unreadable, drawn in voxels, or naming other nodes.
function fileFindings(built, models) {
  const nodesOf = (json) => json.nodes.map(({ name }) => name).sort();
  return models.flatMap((entry) =>
    guarded(entry.id, () => {
      const smooth = glbJson(readFileSync(join(built, formFile(entry, 'smooth'))));
      const voxel = glbJson(readFileSync(join(built, formFile(entry, 'voxel'))));
      const findings = [];
      if (
        smooth.meshes.flatMap(({ primitives }) => primitives).some(({ extras }) => extras?.voxelGrain !== undefined)
      ) {
        findings.push(`${entry.id}: its smooth copy draws voxels`);
      }
      if (JSON.stringify(nodesOf(smooth)) !== JSON.stringify(nodesOf(voxel)))
        findings.push(`${entry.id}: its smooth copy names other nodes`);
      return findings;
    }),
  );
}

// The strap findings of every band-fitted gear model drawn smooth on the smooth head, held to its voxel strap's grain.
function strapSmoothFindings(built, manifest, root) {
  const { frame, worn } = readBandFit(root);
  const voxel = builtModels(built, manifest, 'voxel');
  const { glbOf, anchorsOf, head } = builtModels(built, manifest, 'smooth');
  return Object.entries(worn).flatMap(([model, place]) =>
    guarded(model, () => [
      ...strapFindings({
        head,
        strap: strapMesh(glbOf(model), model),
        grain: strapGrain(voxel.glbOf(model), model),
        frame,
        worn: place,
        model,
      }),
      ...anchorFindings({ head, anchors: anchorsOf(model), frame, worn: place, model }),
    ]),
  );
}

// The seat findings of every seated head shell drawn smooth on the smooth head.
function seatSmoothFindings(built, manifest, root) {
  const { frame } = readBandFit(root);
  const { glbOf, head } = builtModels(built, manifest, 'smooth');
  return Object.entries(readSeats(root)).flatMap(([model, worn]) =>
    guarded(model, () => seatFindings({ head, meshes: modelMeshes(glbOf(model)), frame, worn, model })),
  );
}

// The cover gaps of every covering item's worn pieces drawn smooth over the smooth doll, the most samples open first.
function coverSmoothFindings(built, manifest, root) {
  const models = manifest.models.filter(({ path }) => path.endsWith('.glb'));
  const byId = new Map(models.map((model) => [model.id, model]));
  const meshesOf = (id, keep) => modelMeshes(readFileSync(join(built, formFile(byId.get(id), 'smooth'))), keep);
  const unplaced = () => {
    throw new Error('a covering item is dressed by its worn pieces, never placed whole');
  };
  const gaps = dollDressings(readDressing(root)).flatMap((dressing) => {
    const doll = readDoll(built, manifest, dressing);
    const rig = dollRig(doll, dressing);
    return dollGarments(dressing, coveringItems(models)).flatMap((id) =>
      guarded(id, () =>
        coverGaps(rig, wornSites({ id }, { dressing, doll, models, boxOf: unplaced, anchorsOf: unplaced }), meshesOf),
      ),
    );
  });
  const open = (gap) => (typeof gap === 'string' ? Infinity : gap.open === 'nothing' ? 0 : gap.open);
  return gaps
    .sort((a, b) => open(b) - open(a))
    .map((gap) =>
      typeof gap === 'string'
        ? gap
        : `${gap.piece} (${gap.side}) covers ${gap.name}, but ${
            gap.open === 'nothing'
              ? 'it names nothing there'
              : `${gap.open} samples show, one at [${gap.at.map((x) => x.toFixed(3))}]`
          }`,
    );
}

/** Each smooth check's findings over the built tree at `built`, whose manifest is `manifest`. */
export function smoothFindings(built, manifest, root = repo) {
  const smooth = manifest.models.filter((entry) => entry.smooth !== undefined);
  if (smooth.length === 0) return { files: ['the built tree holds no smooth copy'] };
  return {
    files: fileFindings(built, smooth),
    straps: strapSmoothFindings(built, manifest, root),
    seats: seatSmoothFindings(built, manifest, root),
    covers: coverSmoothFindings(built, manifest, root),
  };
}

function main() {
  const { values } = parseArgs({ options: { built: { type: 'string', default: join(repo, 'built') } } });
  const built = resolve(values.built);
  const findings = smoothFindings(built, JSON.parse(readFileSync(join(built, MANIFEST), 'utf8')));
  for (const [check, lines] of Object.entries(findings)) {
    console.log(`smooth ${check}: ${lines.length} finding${lines.length === 1 ? '' : 's'}`);
    for (const line of lines) console.log(`  ${line}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
