import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { exportPool, exportRecipes } from '../build.mjs';
import { DEFAULT_CACHE } from '../generation.mjs';
import { evaluateJsonnet } from '../jsonnet/index.mjs';
import { solid } from '../pieceSolid.mjs';
import { meeting } from './pieces.mjs';

const root = resolve(import.meta.dirname, '../..');
const data = JSON.parse(evaluateJsonnet(`{
  original: import 'models/vehicles/security_walker.libsonnet',
  own: import 'models/vehicles/security_walker_sleek.libsonnet',
  optics: (import 'models/vehicles/turret-kit.libsonnet').classRows('two_man_autocannon'),
  guns: (import 'models/vehicles/turret-kit.libsonnet').classRows('one_man_mg'),
  shared: [r for r in (import 'models/vehicles/shared.libsonnet') if r.id=='headlamp_military'],
  cv: (import 'models/vehicles/turret-kit.libsonnet').sites('cv9040_turret',[0,0,0],'assembly'),
  spec: import 'models/vehicles/security_walker_sleek.spec.libsonnet',
  base: (import 'models/vehicles/security_walker.placements.libsonnet').sites,
  sleek: (import 'models/vehicles/security_walker_sleek.placements.libsonnet').sites,
}`, root));
const { spec, base, sleek } = data;
const bySite = new Map(sleek.map(p => [p.id, p]));
const baseSite = new Map(base.map(p => [p.id, p]));
const rows = new Map([...data.original, ...data.own, ...data.optics, ...data.guns, ...data.shared].map(r => [r.id, r]));
const pieces = row => JSON.parse(row.parts[0].params.pieces);
const body = pieces(rows.get('security_walker_sleek_carrier'));
const moved = (part, at) => JSON.parse(evaluateJsonnet(`local k=import 'models/vehicles/kit.libsonnet'; [k.moved(p,${JSON.stringify(at)}) for p in ${JSON.stringify(pieces(rows.get(part)))}]`, root));
const drawn = p => JSON.parse(evaluateJsonnet(`local k=import 'models/vehicles/kit.libsonnet'; [k.moved(${p.mirror ? 'k.far(q)' : 'q'},${JSON.stringify(p.at)}) for q in ${JSON.stringify(pieces(rows.get(p.part)))}]`, root));
const atY = (site, y) => ({ ...site, at: [site.at[0], y, site.at[2]] });
const ammoSites = sleek.filter(p => p.id.startsWith('ammo_')).map(p => p.id);
const weaponModuleSites = [...spec.weaponSites, ...ammoSites];

// The sleek placement states only what it changes, so each base site is either dropped, overridden as the spec says,
// or the very same site.
function expectedFrom(site) {
  if (site.id === 'hull') return { ...site, id: 'carrier', part: 'security_walker_sleek_carrier' };
  if (site.id in spec.lowered) return atY(site, spec.lowered[site.id]);
  if (spec.weaponSites.includes(site.id)) return atY(site, site.at[1] + spec.weaponLift);
  return site;
}

test('a base walker site the sleek walker neither drops nor overrides is placed unchanged', () => {
  for (const site of base.filter(p => !spec.dropped.includes(p.id))) {
    const expected = expectedFrom(site);
    assert.deepEqual(bySite.get(expected.id), expected, site.id);
  }
  for (const id of spec.dropped) {
    const now = bySite.get(id);
    assert.ok(now === undefined || now.part !== baseSite.get(id).part || now.at.some((v, i) => v !== baseSite.get(id).at[i]), `${id} is dropped, so it is absent or replaced`);
  }
});

test('every site id is unique and the sleek walker defines only parts of its own name', () => {
  assert.equal(new Set(sleek.map(p => p.id)).size, sleek.length);
  assert.ok(data.own.every(r => r.id.startsWith('security_walker_sleek_')));
});

test('the carrier keeps the original hip ram lugs welded on and meets the hip drive and hoses', () => {
  const lugs = ps => ps.filter(p => p.id.startsWith('hip_ram_lug_'));
  assert.deepEqual(lugs(body), lugs(pieces(rows.get('security_walker_hull'))));
  const structural = body.filter(p => !p.id.startsWith('hip_ram_lug_'));
  for (const lug of lugs(body)) assert.ok(meeting([lug], structural, 0.02).touches, `${lug.id} must be welded to carrier`);
  for (const side of ['near', 'far']) {
    for (const id of ['hip_hoses', 'hip_drive']) {
      assert.ok(meeting(drawn(bySite.get(`${id}_${side}`)), body, 0.004).touches, `${id}_${side} must meet the carrier`);
    }
  }
});

test('the CV9040 optics and roof hatch sit on the roof without intersecting each other', () => {
  const cvParts = new Set(data.cv.map(p => p.part));
  const roof = pieces(rows.get('security_walker_sleek_hull')).filter(p => p.id === 'roof');
  const accessories = spec.optics.map(o => ({ id: o.id, pieces: moved(o.part, o.at) }));
  accessories.push({ id: 'roof_hatch', pieces: pieces(rows.get('security_walker_sleek_roof_hatch')) });
  for (const o of spec.optics) assert.ok(cvParts.has(o.part), `${o.part} is not a CV9040 fitting`);
  for (const [i, a] of accessories.entries()) {
    assert.ok(meeting(a.pieces, roof, 0.01).touches, `${a.id} floats off roof`);
    for (const b of accessories.slice(i + 1)) assert.ok(!meeting(a.pieces, b.pieces, 0.01).overlaps, `${a.id} intersects ${b.id}`);
  }
});

test('an unpaintable optic keeps its own material instead of taking the walker paint', () => {
  const unpaintable = spec.optics.filter(o => !('paintable' in rows.get(o.part).parts[0]) || rows.get(o.part).parts[0].paintable.length === 0);
  assert.ok(unpaintable.length > 0, 'vacuous: no optic is unpaintable');
  for (const o of unpaintable) assert.ok(!('finish' in bySite.get(o.id)), o.id);
  for (const o of spec.optics.filter(o => !unpaintable.includes(o))) assert.equal(bySite.get(o.id).finish, spec.paint, o.id);
});

test('each pod cassette and enclosed feed is one connected chute from cassette to receiver, clear of the pod and gun', () => {
  for (const side of ['near', 'far']) {
    const cassette = drawn(bySite.get(`ammo_cassette_${side}`));
    const feed = drawn(bySite.get(`ammo_feed_${side}`));
    const pod = drawn(bySite.get(`weapon_pod_${side}`));
    const gun = drawn(bySite.get(`pod_gun_${side}`));
    for (const mount of cassette.filter(p => p.id.startsWith('mount_'))) {
      assert.ok(meeting([mount], pod.filter(p => p.id.startsWith('housing')), 0.004).touches, `${side}: cassette mount floats off pod`);
    }
    assert.ok(!meeting(cassette, pod, 0.004).overlaps, `${side}: cassette intersects pod/raised stripe`);
    assert.ok(meeting(feed, cassette, 0.004).touches, `${side}: feed detached from cassette`);
    assert.ok(meeting(feed, gun.filter(p => p.id.startsWith('receiver')), 0.002).touches, `${side}: feed detached from receiver`);
    assert.ok(!meeting(feed, gun, 0.004).overlaps, `${side}: feed penetrates gun instead of meeting side face`);
    assert.ok(!meeting(feed, pod, 0.004).overlaps, `${side}: feed passes through pod or cradle`);
    const joined = [feed[0]], pending = feed.slice(1);
    while (pending.length) {
      const i = pending.findIndex(p => meeting([p], joined, 0.004).touches);
      assert.ok(i >= 0, `${side}: disconnected feed solids: ${pending.map(p => p.id)}`);
      joined.push(...pending.splice(i, 1));
    }
  }
});

test('each lamp fitting faces forward on its hull and clears the other lamps and the weapon modules', () => {
  for (const part of ['carrier', 'hull']) {
    const ps = pieces(rows.get(`security_walker_sleek_${part}`));
    const core = ps.filter(p => !p.id.startsWith('headlamp_') && p.id !== 'floodlight_plinth');
    const roots = ps.filter(p => p.id.startsWith(part === 'hull' ? 'headlamp_brace' : 'headlamp_backplate') || p.id === 'floodlight_plinth');
    for (const p of roots) assert.ok(meeting([p], core, 0.004).touches, `${part}: ${p.id} is not connected to the shell`);
    if (part === 'hull') for (const p of ps.filter(p => p.id.startsWith('headlamp_backplate'))) {
      assert.ok(meeting([p], roots, 0.004).touches, `${p.id} is detached from its brace`);
    }
  }
  const weapons = weaponModuleSites.map(id => drawn(bySite.get(id)));
  const lamps = sleek.filter(p => /^(base_headlamp|turret_headlamp|floodlight)/.test(p.id));
  assert.ok(lamps.length > 0, 'vacuous: no lamp sites');
  for (const lamp of lamps) {
    const fixed = !lamp.id.startsWith('turret_');
    const shapes = drawn(lamp);
    const support = pieces(rows.get(fixed ? 'security_walker_sleek_carrier' : 'security_walker_sleek_hull'));
    assert.ok(meeting(shapes, support, 0.004).touches, `${lamp.id} floats off its hull`);
    assert.ok(!meeting(shapes, support, 0.004).overlaps, `${lamp.id} penetrates hull`);
    const lenses = shapes.filter(p => p.id.startsWith('lens') && !p.id.startsWith('lens_divider'));
    assert.ok(lenses.length > 0, lamp.id);
    for (const lens of lenses) assert.ok(solid(lens).min[0] > lamp.at[0], `${lamp.id} lens must face +x`);
    if (fixed) assert.ok(Math.max(...shapes.map(p => solid(p).max[1])) < spec.rotary.centre[1], `${lamp.id} reaches the turning body`);
    for (const module of weapons) assert.ok(!meeting(shapes, module, 0.006).overlaps, `${lamp.id} intersects a weapon/ammo fitting`);
    for (const other of lamps.filter(q => q !== lamp)) {
      assert.ok(!meeting(shapes, drawn(other), 0.01).overlaps, `${lamp.id} intersects ${other.id}`);
    }
  }
});

test('the new hull is shallower than the original torso and its roof sits behind its nose', () => {
  const old = spec.base.torso.profile.map(p => p[1]);
  assert.ok(spec.hull.high - spec.hull.low < (Math.max(...old) - Math.min(...old)) / 2);
  assert.ok(Math.max(...spec.hull.roof.map(p => p[1])) < Math.max(...spec.hull.bottom.map(p => p[1])));
});

// The exported boxes are the conservative per-solid bounds a game collides with, so the voxel overhang that the source
// shapes lack only shows in a real build.
async function exportedBoxes() {
  const out = mkdtempSync(join(tmpdir(), 'sleek-walker-'));
  const pool = exportPool(DEFAULT_CACHE);
  try {
    const { models } = await exportRecipes({ out, tools: ['thing'], pool, ids: new Set(sleek.map(p => p.part)) });
    return Object.fromEntries(models.map(m => {
      const model = JSON.parse(readFileSync(join(out, m.pack, 'things', `${m.id}.model.json`), 'utf8'));
      return [m.id, model.parts ? Object.values(model.parts).flatMap(p => p.collision ?? []) : model.collision];
    }));
  } finally {
    await pool.close();
    rmSync(out, { recursive: true, force: true });
  }
}

// A site's boxes in the exported frame, which is the source frame as [-z, y, x].
function siteBounds(site, boxes) {
  const own = boxes[site.part];
  assert.ok(own?.length, `no baked collision for ${site.part}`);
  const offset = [-site.at[2], site.at[1], site.at[0]];
  const placed = own.map(b => ({
    min: b.min.map((v, i) => offset[i] + (site.mirror && i === 0 ? -b.max[i] : v)),
    max: b.max.map((v, i) => offset[i] + (site.mirror && i === 0 ? -b.min[i] : v)),
  }));
  return { min: [0, 1, 2].map(i => Math.min(...placed.map(b => b.min[i]))), max: [0, 1, 2].map(i => Math.max(...placed.map(b => b.max[i]))) };
}

// The fittings that stay put while the upper body turns: the borrowed ones and the fixed new ones. Classified once on
// the authored placement so a displaced fitting stays in its group.
const fixedIds = new Set([
  ...sleek.filter(p => base.some(b => JSON.stringify(expectedFrom(b)) === JSON.stringify(p)) && !spec.weaponSites.includes(p.id)),
  ...sleek.filter(p => /^(carrier|terrain_camera|base_headlamp|floodlight)/.test(p.id)),
].map(p => p.id));

// The rotor itself is the bearing, which touches the carrier on purpose.
function rotaryClearance(sites, boxes) {
  const fixed = sites.filter(p => fixedIds.has(p.id));
  const turning = sites.filter(p => !fixedIds.has(p.id) && p.id !== 'rotor');
  const fixedTop = Math.max(...fixed.map(p => siteBounds(p, boxes).max[1]));
  const rotor = siteBounds(sites.find(p => p.id === 'rotor'), boxes);
  const hull = siteBounds(sites.find(p => p.id === 'hull'), boxes);
  return {
    upperGap: Math.min(...turning.map(p => siteBounds(p, boxes).min[1])) - fixedTop,
    bearingGap: rotor.min[1] - fixedTop,
    floorGap: hull.min[1] - rotor.max[1],
  };
}
const holds = ({ upperGap, bearingGap, floorGap }) => ({
  upperGap: upperGap >= spec.yawClearance,
  bearingGap: bearingGap >= -1e-6 && bearingGap <= spec.grain,
  floorGap: Math.abs(floorGap) <= spec.grain,
});
const clears = gaps => Object.values(holds(gaps)).every(Boolean);

test('the turning upper body clears the fixed body at every yaw, with the rotor seated on the carrier and under the hull', async () => {
  const boxes = await exportedBoxes();
  assert.ok(clears(rotaryClearance(sleek, boxes)), JSON.stringify(rotaryClearance(sleek, boxes)));
  const displaced = (id, dy) => sleek.map(p => (p.id === id ? atY(p, p.at[1] + dy) : p));
  // Each case breaks one condition and no other, so removing any condition from `clears` is caught.
  const alone = { upperGap: ['cooling_pack', -0.2], bearingGap: ['carrier', -0.1], floorGap: ['hull', 0.1] };
  for (const [gap, [id, dy]] of Object.entries(alone)) {
    const failing = Object.entries(holds(rotaryClearance(displaced(id, dy), boxes))).filter(([, ok]) => !ok).map(([name]) => name);
    assert.deepEqual(failing, [gap], `${id} displaced by ${dy}`);
  }
});
