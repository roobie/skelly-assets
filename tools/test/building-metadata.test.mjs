import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { Quaternion, Raycaster, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { exportPool, exportRecipes } from '../build.mjs';
import { exportBuildingKits, readBuildingKits } from '../buildingKits.mjs';
import { buildManifest, manifestJson, treeDifferences } from '../manifest.mjs';
import { itemBuilding, loadCatalogue } from '../packages/thing-authoring-tool/src/catalogue.ts';
import { loadThingRecipe } from '../packages/thing-authoring-tool/src/exports.ts';
import { readBuilding, readBuildingKit } from '../packages/thing-core/src/building.ts';
import { exportCache } from '../packages/thing-export/src/cache.ts';
import { readRecipes } from '../recipes.mjs';
import { installJsonnetSources } from '../sources.mjs';
import { close, glbBounds } from './architecture-helpers.mjs';

await installJsonnetSources();
const { catalogue } = await import('../packages/thing-authoring-tool/src/content.ts');
const pack = 'skelly.structures';
const definitions = readBuildingKits();
const items = catalogue.items.filter(({ building }) =>
  ['medieval_timber', 'medieval_stone'].includes(building?.kit.id),
);
const itemById = new Map(items.map((item) => [item.id, item]));
const recipe = readRecipes()
  .find(({ packId }) => packId === pack)
  .value.filter(({ source }) => itemById.has(source));
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
const filesUnder = (directory) =>
  readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(directory, join(entry.parentPath, entry.name)))
    .sort();
const credit = () => ({ author: 'Fixture Author', licence: 'fixture' });
const yaw = (degrees) => new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (degrees * Math.PI) / 180).toArray();
const transform = (site, point) =>
  new Vector3(...point)
    .applyQuaternion(new Quaternion(...site.turn))
    .add(new Vector3(...site.at))
    .toArray();
const compose = (parent, child) => ({
  at: transform(parent, child.at),
  turn: new Quaternion(...parent.turn).multiply(new Quaternion(...child.turn)).toArray(),
});
const distance = (a, b) => Math.hypot(...a.map((v, axis) => v - b[axis]));
const profile = (building) => `${building.kit.id}@${building.kit.revision}/${building.layout.join}`;
const examples = ['timber-cottage', 'stone-dungeon', 'stone-wallwalk'].map((name) =>
  json(new URL(`../../models/architecture/${name}.example.json`, import.meta.url)),
);
const direction = (site, vector) => new Vector3(...vector).applyQuaternion(new Quaternion(...site.turn));
const untransform = (site, point) =>
  new Vector3(...point)
    .sub(new Vector3(...site.at))
    .applyQuaternion(new Quaternion(...site.turn).invert())
    .toArray();
const coincident = (a, b, message) => assert.ok(distance(a, b) < 1e-6, `${message}: ${a} != ${b}`);
const worldFrame = (site, frame) => ({
  at: transform(site, frame.at),
  normal: direction(site, frame.normal),
  up: direction(site, frame.up),
});
const alignedFrames = (a, b, opposite) =>
  distance(a.at, b.at) < 1e-6 &&
  Math.abs(a.normal.dot(b.normal) - (opposite ? -1 : 1)) < 1e-6 &&
  Math.abs(a.up.dot(b.up) - 1) < 1e-6;
const inRange = (v, lo, hi) => v >= lo - 1e-6 && v <= hi + 1e-6;

// Check the accepted source arrangements using only module semantics and their instance transforms.
const checkComposition = (example, entries, kits, parent) => {
  const sites = example.sites.map((site) => ({ ...site, ...compose(parent, site), building: entries.get(site.model) }));
  const withKind = (kind) => sites.filter(({ building }) => building.layout.kind === kind);
  const walls = withKind('wall-infill'),
    nodes = withKind('shared-node');
  for (const wall of walls)
    for (const at of wall.building.layout.nodes) {
      const required = transform(wall, at);
      assert.equal(
        nodes.filter(
          (node) =>
            profile(node.building) === profile(wall.building) &&
            distance(transform(node, node.building.layout.at), required) < 1e-6,
        ).length,
        1,
        `${wall.site}: shared node`,
      );
    }
  for (let i = 0; i < nodes.length; i++)
    for (const other of nodes.slice(i + 1)) {
      assert.ok(
        distance(transform(nodes[i], nodes[i].building.layout.at), transform(other, other.building.layout.at)) > 1e-6,
        'no duplicate/conflicting shared nodes',
      );
    }
  const capContains = (host, point) => {
    const p = untransform(host, point),
      { layout } = host.building;
    const join = kits.get(host.building.kit.id).joins[layout.join];
    if (layout.kind === 'shared-node') {
      return (
        Math.abs(p[1] - layout.at[1] - join.height) < 1e-6 &&
        Math.abs(p[0] - layout.at[0]) <= join.nodeWidth / 2 + 1e-6 &&
        Math.abs(p[2] - layout.at[2]) <= join.nodeWidth / 2 + 1e-6
      );
    }
    return (
      Math.abs(p[1] - join.height) < 1e-6 &&
      inRange(p[0], layout.nodes[0][0] + join.nodeWidth / 2, layout.nodes[1][0] - join.nodeWidth / 2) &&
      Math.abs(p[2]) <= join.depth / 2 + 1e-6
    );
  };
  for (const span of withKind('span')) {
    for (const x of span.building.layout.supportX) {
      const support = transform(span, [x, 0, 0]);
      assert.ok(
        [...walls, ...nodes].some((host) => capContains(host, support)),
        `${span.site}: support datum`,
      );
    }
  }
  let repeatJoins = 0;
  for (const site of sites.filter(({ building }) => building.layout.repeat !== undefined)) {
    const next = transform(site, site.building.layout.repeat);
    const candidates = sites.filter((other) => other.model === site.model && distance(other.at, next) < 1e-6);
    assert.ok(candidates.length <= 1, 'repeat has at most one next placement');
    for (const neighbour of candidates) {
      const { layout } = site.building;
      const ends =
        layout.kind === 'span'
          ? [
              [0, 0, layout.extentZ[1]],
              [0, 0, layout.extentZ[0]],
            ]
          : [
              [layout.extentX[1], 0, 0],
              [layout.extentX[0], 0, 0],
            ];
      coincident(transform(site, ends[0]), transform(neighbour, ends[1]), 'repeat planes abut');
      repeatJoins += 1;
    }
  }
  assert.equal(repeatJoins, 2, 'each accepted fixture demonstrates two axial repeat joins');
  for (const verge of sites.filter(({ building }) => building.datums?.attachment)) {
    const attachment = worldFrame(verge, verge.building.datums.attachment);
    const ends = sites.flatMap((site) =>
      ['front', 'rear'].flatMap((id) =>
        site.building.datums?.[id] ? [worldFrame(site, site.building.datums[id])] : [],
      ),
    );
    assert.equal(ends.filter((end) => alignedFrames(attachment, end, true)).length, 1, 'verge seats on one roof end');
  }
  for (const insert of withKind('static-insert')) {
    const { opening, frame } = insert.building.layout;
    const targets = sites
      .filter((site) => site.model === opening.model)
      .flatMap((site) =>
        (site.building.apertures ?? [])
          .filter(({ id }) => id === opening.aperture)
          .map((aperture) => worldFrame(site, aperture.frame)),
      );
    assert.equal(
      targets.filter((target) => alignedFrames(worldFrame(insert, frame), target, false)).length,
      1,
      'static insert aligns with its explicitly named aperture',
    );
  }
  for (const attachment of withKind('face-attachment')) {
    const frame = worldFrame(attachment, attachment.building.layout.frame);
    assert.ok(
      walls.some((wall) => {
        const p = untransform(wall, frame.at),
          join = kits.get(wall.building.kit.id).joins[wall.building.layout.join];
        return (
          Math.abs(p[2] - join.depth / 2) < 1e-6 &&
          inRange(p[1], 0, join.height) &&
          inRange(p[0], wall.building.layout.nodes[0][0], wall.building.layout.nodes[1][0]) &&
          frame.normal.dot(direction(wall, [0, 0, 1])) < -1 + 1e-6
        );
      }),
      `${attachment.site}: meets exterior face, not wall centre`,
    );
  }
  const named = new Map(sites.map((site) => [site.site, site]));
  const pointAt = (name, at) => transform(named.get(name), at);
  if (withKind('stair-flight').length) {
    const lower = named.get('lower-flight').building,
      upper = named.get('upper-flight').building;
    const landing = named.get('middle-landing').building.layout;
    const deck = named.get('walk-floor-4').building.layout;
    const approach = named.get('approach').building.layout;
    coincident(
      pointAt('approach', [0, approach.top, approach.footprint.z[1]]),
      pointAt('lower-flight', lower.datums.lower_approach.at),
      'approach to first riser',
    );
    coincident(
      pointAt('lower-flight', lower.datums.upper_edge.at),
      pointAt('middle-landing', [0, landing.top, landing.footprint.z[0]]),
      'first landing',
    );
    coincident(
      pointAt('middle-landing', [0, landing.top, landing.footprint.z[1]]),
      pointAt('upper-flight', upper.datums.lower_approach.at),
      'second approach',
    );
    coincident(
      pointAt('upper-flight-support', [0, landing.top, 0]),
      pointAt('upper-flight', [0, 0, 0]),
      'solid flight support',
    );
    coincident(
      pointAt('upper-flight', upper.datums.upper_edge.at),
      pointAt('walk-floor-4', [0, deck.top, deck.footprint.z[0]]),
      'finished deck',
    );
    const wall = named.get('wall-1-4').building;
    const join = kits.get(wall.kit.id).joins[wall.layout.join];
    coincident(
      pointAt('wall-1-4', [0, join.height, 0]),
      pointAt('walk-floor-4', [deck.footprint.x[1], deck.bottom, 0]),
      'deck underside',
    );
    const edge = named.get('end-parapet').building.layout,
      side = named.get('parapet-1-6').building.layout;
    coincident(
      pointAt('end-parapet', [edge.extentX[1], 0, -edge.depth / 2]),
      pointAt('parapet-1-6', [side.extentX[0], 0, 0]),
      'parapet return abuts',
    );
  }
};

// A small reference consumer, not a universal solver. Every semantic decision comes from shipped metadata.
const corner = (wall, node, parent) => {
  assert.equal(wall.layout.kind, 'wall-infill');
  assert.equal(node.layout.kind, 'shared-node');
  assert.equal(profile(wall), profile(node), 'incompatible node profile');
  const walls = [yaw(0), yaw(90)].map((turn) =>
    compose(parent, {
      at: new Vector3(...wall.layout.nodes[0])
        .applyQuaternion(new Quaternion(...turn))
        .negate()
        .toArray(),
      turn,
    }),
  );
  const requirements = walls.flatMap((site) => wall.layout.nodes.map((at) => transform(site, at)));
  const unique = requirements.filter((at, i) => requirements.findIndex((other) => distance(at, other) < 1e-6) === i);
  const nodes = unique.map((at) => ({
    at: new Vector3(...at)
      .sub(new Vector3(...node.layout.at).applyQuaternion(new Quaternion(...parent.turn)))
      .toArray(),
    turn: parent.turn,
  }));
  const check = (providers) => {
    for (const at of requirements) {
      assert.equal(
        providers.filter((site) => distance(transform(site, node.layout.at), at) < 1e-6).length,
        1,
        'one provider per shared node',
      );
    }
  };
  check(nodes);
  assert.equal(requirements.length, 4);
  assert.equal(nodes.length, 3, 'the corner shares one post/pier');
  assert.throws(() => check([...nodes, nodes[0]]), /one provider/);
  return { walls, nodes };
};

test('production building sidecars, kit discovery, geometry and cached rebuilds preserve the same contract', async () => {
  const root = mkdtempSync(join(tmpdir(), 'building-metadata-'));
  try {
    mkdirSync(join(root, 'models/recipes'), { recursive: true });
    for (const extension of ['jsonnet', 'json']) {
      writeFileSync(join(root, `models/recipes/${pack}.${extension}`), JSON.stringify(recipe));
      writeFileSync(
        join(root, `models/building-kits.${extension}`),
        JSON.stringify(definitions.map(({ pack, kit }) => ({ pack, kit }))),
      );
    }
    const run = async (directory) => {
      const out = join(root, directory);
      const pool = exportPool(join(root, 'cache'));
      let exported;
      try {
        exported = await exportRecipes({ root, out, tools: ['thing'], pool });
      } finally {
        await pool.close();
      }
      const kits = exportBuildingKits({ root, out, models: exported.models });
      const manifest = buildManifest({
        models: exported.models.map((model) => ({ ...model, title: itemById.get(model.id).title })),
        buildingKits: kits.buildingKits,
        files: [...exported.files, ...kits.files],
        credit,
      });
      writeFileSync(join(out, 'manifest.json'), manifestJson(manifest));
      assert.deepEqual(
        treeDifferences({
          files: filesUnder(out).map((file) => `built/${file}`),
          manifest,
          declared: new Set([pack, `${pack}.smooth`]),
        }),
        [],
      );
      return { out, manifest, usage: pool.usage() };
    };
    assert.equal(items.length, 22, 'all accepted timber and stone modules have metadata');
    assert.equal(recipe.length, items.length, 'each is in its production recipe');
    const cold = await run('cold');
    const warm = await run('warm');
    assert.deepEqual(cold.usage, { generated: items.length, reused: 0 });
    assert.deepEqual(warm.usage, { generated: 0, reused: items.length });
    assert.deepEqual(filesUnder(cold.out), filesUnder(warm.out));
    for (const path of filesUnder(cold.out)) {
      assert.deepEqual(readFileSync(join(cold.out, path)), readFileSync(join(warm.out, path)), path);
    }
    const entries = new Map();
    const kits = new Map(
      cold.manifest.buildingKits.map((entry) => [
        entry.id,
        readBuildingKit(json(join(cold.out, entry.pack, entry.path))),
      ]),
    );
    const index = json(join(cold.out, pack, 'things/index.json'));
    for (const model of cold.manifest.models) {
      assert.ok(model.building, model.id);
      assert.ok(model.smooth, model.id);
      const entry = json(join(cold.out, model.pack, model.building.path));
      const building = readBuilding(entry.building);
      assert.deepEqual(building, itemById.get(model.id).building, model.id);
      assert.deepEqual(building.kit, model.building.kit);
      assert.deepEqual(
        index.find(({ id }) => id === model.id),
        entry,
      );
      entries.set(model.id, building);
      const kit = kits.get(building.kit.id);
      const layout = building.layout;
      for (const { pack: filePack, path } of [model, model.smooth]) {
        const bytes = readFileSync(join(cold.out, filePack, path));
        const [min, max] = glbBounds(bytes);
        if (layout.kind === 'wall-infill' || layout.kind === 'shared-node') {
          const join = kit.joins[layout.join];
          const x =
            layout.kind === 'shared-node'
              ? [layout.at[0] - join.nodeWidth / 2, layout.at[0] + join.nodeWidth / 2]
              : [layout.nodes[0][0] + join.nodeWidth / 2, layout.nodes[1][0] - join.nodeWidth / 2];
          close(min[0], x[0], `${model.id} exported left join plane`);
          close(max[0], x[1], `${model.id} exported right join plane`);
          close(min[1], 0, `${model.id} exported base`);
          close(max[1], join.height, `${model.id} exported cap`);
          close(min[2], -join.depth / 2, `${model.id} exported rear`);
          close(max[2], join.depth / 2, `${model.id} exported exterior`);
        }
        if (layout.kind === 'span') {
          close(min[2], layout.extentZ[0], `${model.id} axial start`);
          close(max[2], layout.extentZ[1], `${model.id} axial end`);
          const section = building.section;
          const reach =
            section.kind === 'pitched-shell'
              ? section.halfSpan + section.overhang
              : section.kind === 'triangular-panel'
                ? section.halfSpan
                : section.kind === 'semicircular-shell'
                  ? section.outerRadius
                  : section.radius;
          close(min[0], -reach, `${model.id} horizontal extent`);
          close(max[0], reach, `${model.id} horizontal extent`);
          if (section.kind !== 'pitched-shell') close(min[1], 0, `${model.id} spring/support datum`);
          if (section.kind === 'pitched-shell') assert.ok(min[0] < layout.supportX[0], 'eaves are not support lines');
        }
        if (layout.kind === 'edge-run') {
          close(min[0], layout.extentX[0], 'parapet repeat start');
          close(max[0], layout.extentX[1], 'parapet repeat end');
          close(min[1], 0, 'parapet base');
          close(max[1], layout.height, 'merlon cap');
          close(max[2] - min[2], layout.depth, 'parapet depth');
        }
        if (layout.kind === 'face-attachment') close(min[2], layout.frame.at[2], 'buttress attachment, not centre');
        if (layout.kind === 'stair-flight' || building.apertures) {
          const scene = (await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer, '')).scene;
          scene.updateMatrixWorld(true);
          if (layout.kind === 'stair-flight') {
            close(max[1], layout.rise, 'stair head');
            close(max[0] - min[0], layout.width, 'stair width');
            close(min[2], -layout.run / 2, 'stair approach');
            close(max[2], layout.run / 2, 'stair upper edge');
            let top = 0;
            for (const [i, rise] of layout.risers.entries()) {
              top += rise;
              const ray = new Raycaster(
                new Vector3(0, layout.rise + 1, -layout.run / 2 + (i + 0.5) * layout.treadDepth),
                new Vector3(0, -1, 0),
              );
              const hit = ray.intersectObject(scene, true)[0];
              assert.ok(hit, `tread ${i}`);
              close(hit.point.y, top, `exported tread ${i}`);
            }
          }
          for (const aperture of building.apertures ?? []) {
            const p = aperture.profile;
            const empty =
              p.kind === 'rectangle'
                ? [0.2, 0.5, 0.8].flatMap((u) =>
                    [0.2, 0.5, 0.8].map((v) => [p.x[0] + u * (p.x[1] - p.x[0]), p.y[0] + v * (p.y[1] - p.y[0])]),
                  )
                : [
                    [0, (p.bottom + p.spring) / 2],
                    ...[0.3, 1, Math.PI / 2, 2.5, 2.8].map((a) => [
                      0.8 * p.radius * Math.cos(a),
                      p.spring + 0.8 * p.radius * Math.sin(a),
                    ]),
                  ];
            const normal = new Vector3(...aperture.frame.normal),
              up = new Vector3(...aperture.frame.up);
            const across = up.clone().cross(normal);
            for (const [x, y] of empty) {
              const origin = new Vector3(...aperture.frame.at)
                .addScaledVector(across, x)
                .addScaledVector(up, y)
                .addScaledVector(normal, aperture.through[1] + 0.1);
              const ray = new Raycaster(
                origin,
                normal.clone().negate(),
                0,
                aperture.through[1] - aperture.through[0] + 0.2,
              );
              assert.equal(ray.intersectObject(scene, true).length, 0, `${model.id}: inset nominal aperture sample`);
            }
          }
        }
        if (layout.kind === 'surface') {
          for (const [axis, span] of [
            [0, layout.footprint.x],
            [1, [layout.bottom, layout.top]],
            [2, layout.footprint.z],
          ]) {
            close(min[axis], span[0], `${model.id} exported low plane`);
            close(max[axis], span[1], `${model.id} exported high plane`);
          }
        }
      }
    }
    for (const degrees of [0, 90, 180, 270]) {
      const parent = { at: [4, 3, -6], turn: yaw(degrees) };
      for (const [wall, node] of [
        ['medieval_timber_wall', 'medieval_timber_post'],
        ['medieval_stone_wall', 'medieval_stone_pier'],
      ]) {
        corner(entries.get(wall), entries.get(node), parent);
      }
      assert.throws(
        () => corner(entries.get('medieval_stone_wall'), entries.get('medieval_timber_post'), parent),
        /incompatible node/,
      );
    }
    for (const example of examples)
      for (const turn of [
        yaw(0),
        yaw(90),
        yaw(180),
        yaw(270),
        new Quaternion().setFromAxisAngle(new Vector3(1, 1, 0).normalize(), 0.3).toArray(),
      ]) {
        checkComposition(example, entries, kits, { at: [-7, 2, 5], turn });
      }
    const badSpring = structuredClone(examples[1]);
    badSpring.sites.find(({ site }) => site === 'vault-0').at[1] += 0.2;
    assert.throws(() => checkComposition(badSpring, entries, kits, { at: [0, 0, 0], turn: yaw(0) }), /support datum/);
    const rectangular = entries.get('medieval_timber_doorway').apertures[0].profile;
    const arched = entries.get('medieval_stone_arch_doorway').apertures[0].profile;
    close(rectangular.x[1] - rectangular.x[0], 2 * arched.radius, 'same nominal width');
    close(rectangular.y[1], arched.spring + arched.radius, 'same nominal head/crown');
    const cornerX = rectangular.x[1] - 0.04,
      cornerY = rectangular.y[1] - 0.04;
    assert.ok(
      cornerX ** 2 + (cornerY - arched.spring) ** 2 > arched.radius ** 2,
      'the rectangular leaf corner does not fit the nominal arch',
    );
    const insertModel = cold.manifest.models.find(({ id }) => entries.get(id).layout.kind === 'static-insert');
    const insertPath = join(cold.out, insertModel.pack, insertModel.building.path),
      insertEntry = json(insertPath);
    const badInsert = structuredClone(insertEntry);
    badInsert.building.layout.opening.model = 'medieval_stone_arch_doorway';
    writeFileSync(insertPath, JSON.stringify(badInsert));
    assert.throws(
      () => exportBuildingKits({ root, out: cold.out, models: cold.manifest.models }),
      /incompatible insert/,
    );
    badInsert.building.layout.opening.model = 'missing';
    writeFileSync(insertPath, JSON.stringify(badInsert));
    assert.throws(
      () => exportBuildingKits({ root, out: cold.out, models: cold.manifest.models }),
      /missing insert target/,
    );
    assert.doesNotThrow(() => exportBuildingKits({ root, out: cold.out, models: [insertModel], complete: false }));
    writeFileSync(insertPath, JSON.stringify(insertEntry));
    // A cached model cannot silently lose a kit document or carry a missing/foreign join.
    const model = cold.manifest.models[0];
    assert.throws(
      () =>
        exportBuildingKits({
          root,
          out: cold.out,
          models: [{ ...model, building: { ...model.building, kit: { id: 'missing', revision: 1 } } }],
        }),
      /unknown building kit/,
    );
    const file = join(cold.out, model.pack, model.building.path);
    const entry = json(file);
    writeFileSync(file, JSON.stringify({ ...entry, id: 'wrong_model' }));
    assert.throws(() => exportBuildingKits({ root, out: cold.out, models: [model] }), /different model/);
    writeFileSync(file, JSON.stringify({ ...entry, building: undefined }));
    assert.throws(() => exportBuildingKits({ root, out: cold.out, models: [model] }));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('metadata-only edits change model cache keys without changing either GLB', () => {
  const root = mkdtempSync(join(tmpdir(), 'building-cache-'));
  try {
    const item = itemById.get('medieval_timber_post');
    const row = recipe.find(({ source }) => source === item.id);
    const { items: _items, ...settings } = catalogue;
    const recipeOf = (source) => loadThingRecipe([row], loadCatalogue({ ...settings, items: [source] }))[0];
    const cache = exportCache(root, 'fixture-code');
    const first = cache.export(recipeOf(item));
    assert.equal(first.entry.reused, false);
    const warm = cache.export(recipeOf(item));
    assert.equal(warm.entry.reused, true);
    const edited = structuredClone(item);
    edited.building.kit.revision += 1;
    edited.building.datums = { cap: { at: [0, 3, 0], normal: [0, 1, 0], up: [0, 0, -1] } };
    const changed = cache.export(recipeOf(edited));
    assert.equal(changed.entry.reused, false);
    assert.notEqual(first.entry.key, changed.entry.key);
    assert.deepEqual(changed.model.modelEntry.building, edited.building);
    assert.deepEqual(changed.model.glb, first.model.glb);
    assert.deepEqual(changed.model.smoothGlb, first.model.smoothGlb);
    assert.equal(cache.export(recipeOf(edited)).entry.reused, true);
    assert.equal(cache.export(recipeOf(item)).entry.reused, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('building authoring rejects source conversions rather than silently moving datums', () => {
  const item = items[0];
  const { items: _items, ...settings } = catalogue;
  assert.deepEqual(itemBuilding(item, settings), item.building);
  assert.throws(() => itemBuilding({ ...item, forward: '+x' }, settings), /requires a metre/);
  assert.throws(
    () => itemBuilding(item, { ...settings, units: { ...settings.units, metresPerUnit: 0.01 } }),
    /requires a metre/,
  );
  for (const building of [
    { ...item.building, typo: 1 },
    { ...item.building, version: 2 },
    { ...item.building, layout: { kind: 'future' } },
  ]) {
    assert.throws(() => loadCatalogue({ ...settings, items: [{ ...item, building }] }));
  }
});

test('manifest discovery refuses missing building sidecars and kit files', () => {
  const model = {
    id: 'wall',
    title: 'Wall',
    kind: 'item',
    pack,
    path: 'assets/models/wall.glb',
    building: { kit: { id: 'timber', revision: 1 }, path: 'things/wall.model.json' },
  };
  const kit = { id: 'timber', revision: 1, pack, path: 'building-kits/timber.v1.json' };
  const files = [`${pack}/${model.path}`, `${pack}/${model.building.path}`, `${pack}/${kit.path}`];
  const manifest = (overrides = {}) =>
    buildManifest({ models: [model], buildingKits: [kit], files, credit, ...overrides });
  assert.deepEqual(manifest().models[0].building, model.building);
  assert.throws(() => manifest({ files: files.slice(0, 1) }), /not a produced file/);
  assert.throws(() => manifest({ files: files.filter((path) => !path.endsWith('.model.json')) }), /sidecar/);
  assert.throws(() => manifest({ buildingKits: [] }), /unknown building kit/);
  assert.throws(() => manifest({ buildingKits: [kit, kit] }), /duplicate building kit/);
});
