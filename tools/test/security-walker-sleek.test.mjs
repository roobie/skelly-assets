import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { evaluateJsonnet } from '../jsonnet/index.mjs';
import { toModelFrame } from '../packages/thing-core/src/frame.ts';
import { buildWalkers, rotaryClearance, siteBounds, siteBoxes, walkerSources } from '../security-walker-review.mjs';
import { meeting, solid } from './pieces.mjs';

const root = resolve(import.meta.dirname, '../..');
const { placements, spec } = walkerSources();
const base = placements.security_walker.sites;
const sleek = placements.security_walker_sleek.sites;
const bySite = new Map(sleek.map(p => [p.id, p]));
const data = JSON.parse(evaluateJsonnet(`{
  original: import 'models/vehicles/security_walker.libsonnet',
  own: import 'models/vehicles/security_walker_sleek.libsonnet',
  optics: (import 'models/vehicles/turret-kit.libsonnet').classRows('two_man_autocannon'),
  guns: (import 'models/vehicles/turret-kit.libsonnet').classRows('one_man_mg'),
  shared: [r for r in (import 'models/vehicles/shared.libsonnet') if r.id=='headlamp_military'],
  cv: (import 'models/vehicles/turret-kit.libsonnet').sites('cv9040_turret',[0,0,0],'assembly'),
}`, root));
const rows = new Map([...data.original,...data.own,...data.optics,...data.guns,...data.shared].map(r => [r.id,r]));
const pieces = row => JSON.parse(row.parts[0].params.pieces);
const body = pieces(rows.get('security_walker_sleek_carrier'));
const vectorClose = (a,b,tol=1e-9) => a.forEach((v,i) => assert.ok(Math.abs(v-b[i])<=tol,`${a} != ${b} (tolerance ${tol})`));
const isLeg = id => /^(hip_drive|thigh|shin|tarsus|foot|(hip|knee|ankle)_(ram_(barrel|rod)|hoses))_(near|far)$/.test(id);
const moved = (part, at) => JSON.parse(evaluateJsonnet(`local k=import 'models/vehicles/kit.libsonnet'; [k.moved(p,${JSON.stringify(at)}) for p in ${JSON.stringify(pieces(rows.get(part)))}]`,root));
const drawn = p => JSON.parse(evaluateJsonnet(`local k=import 'models/vehicles/kit.libsonnet'; [k.moved(${p.mirror?'k.far(q)':'q'},${JSON.stringify(p.at)}) for q in ${JSON.stringify(pieces(rows.get(p.part)))}]`,root));
const boxOverlap = (a,b) => [0,1,2].every(i => Math.min(a.max[i],b.max[i])-Math.max(a.min[i],b.min[i])>0.001);

test('sleek walker reuses every leg, drive, ram and hose site unchanged', () => {
  const legs = base.filter(p => isLeg(p.id));
  assert.equal(legs.length,28);
  for (const p of legs) assert.deepEqual(bySite.get(p.id),p,p.id);
  assert.ok(data.own.every(r => r.id.startsWith('security_walker_sleek_')));
  assert.equal(data.own.length,9,'only new body/service/ammo/light fittings, no copied leg or weapon models');
  assert.ok(data.own.every(r => !/_(thigh|shin|tarsus|foot|weapon_pod|pod_mount)$/.test(r.id)));
});

test('six original modular weapon fittings retain their geometry, mirrors and relative interfaces', () => {
  assert.equal(spec.weaponSites.length,6);
  for (const id of spec.weaponSites) {
    const old=base.find(p=>p.id===id), current=bySite.get(id);
    assert.deepEqual(current,{...old,at:[old.at[0],old.at[1]+spec.weaponLift,old.at[2]]},id);
    assert.ok(spec.rotatingSites.includes(id));
  }
  assert.ok(base.filter(p=>isLeg(p.id)).every(p=>!spec.rotatingSites.includes(p.id)));
});

test('all sites are unique and the old face/window are replaced, not hidden under a second body', () => {
  assert.equal(new Set(sleek.map(p=>p.id)).size,sleek.length);
  assert.equal(bySite.get('carrier').part,'security_walker_sleek_carrier');
  assert.equal(bySite.get('hull').part,'security_walker_sleek_hull');
  for (const id of ['face_guard','sensor_window','sensor_array','exhaust','beacon','hatch']) assert.ok(!bySite.has(id),id);
  assert.equal(new Set(spec.rotatingSites).size,spec.rotatingSites.length);
  for(const id of spec.rotatingSites) assert.ok(bySite.has(id),id);
});

test('carrier preserves the exact original hip ram lugs, drive face and fixed hose outlets', () => {
  const lugs = ps => ps.filter(p=>p.id.startsWith('hip_ram_lug_'));
  assert.deepEqual(lugs(body),lugs(pieces(rows.get('security_walker_hull'))));
  const structural = body.filter(p=>!p.id.startsWith('hip_ram_lug_'));
  for(const lug of lugs(body)) assert.ok(meeting([lug],structural,0.02).touches,`${lug.id} must be welded to carrier`);
  for (const z of [-1,1]) {
    for(const [x,y] of [[spec.base.hip[0],spec.base.hip[1]],[-0.5,3.72],[-0.42,3.76]]) {
      assert.ok(body.some(p=>solid(p).distance([x,y,z])<=1e-8),`missing drive/hose face at ${x},${y},${z}`);
    }
  }
});

test('existing CV9040 optical models are separate fittings seated on the roof, clear of each other and hatch', () => {
  const cvParts=new Set(data.cv.map(p=>p.part));
  const roof=pieces(rows.get('security_walker_sleek_hull')).filter(p=>p.id==='roof');
  const accessories=spec.optics.map(o=>({id:o.id,pieces:moved(o.part,o.at)}));
  accessories.push({id:'roof_hatch',pieces:pieces(rows.get('security_walker_sleek_roof_hatch'))});
  for(const o of spec.optics) {
    assert.ok(cvParts.has(o.part));
    assert.equal(bySite.get(o.id).part,o.part);
    assert.deepEqual(bySite.get(o.id).at,o.at);
  }
  assert.ok(!('finish' in bySite.get('rear_periscope')),'unpaintable periscope must retain its authored material');
  for(const [i,a] of accessories.entries()) {
    assert.ok(meeting(a.pieces,roof,0.01).touches,`${a.id} floats off roof`);
    for(const b of accessories.slice(i+1)) assert.ok(!meeting(a.pieces,b.pieces,0.01).overlaps,`${a.id} intersects ${b.id}`);
  }
});

test('each pod carries a separate cassette and continuous enclosed feed contacting the receiver without crossing its cradle', () => {
  assert.equal(spec.ammoSites.length,4);
  assert.deepEqual(new Set(spec.weaponModuleSites),new Set([...spec.weaponSites,...spec.ammoSites]));
  for(const id of spec.weaponModuleSites) assert.ok(spec.rotatingSites.includes(id),id);
  for(const side of ['near','far']) {
    const cassette=drawn(bySite.get(`ammo_cassette_${side}`));
    const feed=drawn(bySite.get(`ammo_feed_${side}`));
    const pod=drawn(bySite.get(`weapon_pod_${side}`));
    const gun=drawn(bySite.get(`pod_gun_${side}`));
    for(const mount of cassette.filter(p=>p.id.startsWith('mount_'))) {
      assert.ok(meeting([mount],pod.filter(p=>p.id.startsWith('housing')),0.004).touches,`${side}: cassette mount floats off pod`);
    }
    assert.ok(!meeting(cassette,pod,0.004).overlaps,`${side}: cassette intersects pod/raised stripe`);
    assert.ok(meeting(feed,cassette,0.004).touches,`${side}: feed detached from cassette`);
    assert.ok(meeting(feed,gun.filter(p=>p.id.startsWith('receiver')),0.002).touches,`${side}: feed detached from receiver`);
    assert.ok(!meeting(feed,gun,0.004).overlaps,`${side}: feed penetrates gun instead of meeting side face`);
    assert.ok(!meeting(feed,pod,0.004).overlaps,`${side}: feed passes through pod or cradle`);
    // Every cover, elbow, adapter and core must belong to one connected chute.
    const joined=[feed[0]], pending=feed.slice(1);
    while(pending.length) {
      const i=pending.findIndex(p=>meeting([p],joined,0.004).touches);
      assert.ok(i>=0,`${side}: disconnected feed solids: ${pending.map(p=>p.id)}`);
      joined.push(...pending.splice(i,1));
    }
  }
});

test('base flood/headlamps and additional turret headlamps face forward, attach to their correct hulls and remain separate', () => {
  for(const part of ['carrier','hull']) {
    const ps=pieces(rows.get(`security_walker_sleek_${part}`));
    const core=ps.filter(p=>!p.id.startsWith('headlamp_') && p.id!=='floodlight_plinth');
    const roots=ps.filter(p=>p.id.startsWith(part==='hull'?'headlamp_brace':'headlamp_backplate') || p.id==='floodlight_plinth');
    for(const p of roots) assert.ok(meeting([p],core,0.004).touches,`${part}: ${p.id} is not connected to the original shell`);
    if(part==='hull') for(const p of ps.filter(p=>p.id.startsWith('headlamp_backplate'))) {
      assert.ok(meeting([p],roots,0.004).touches,`${p.id} is detached from its brace`);
    }
  }
  const weapons=spec.weaponModuleSites.map(id=>drawn(bySite.get(id)));
  const fixed=['base_headlamp_near','base_headlamp_far','floodlight'];
  const rotating=['turret_headlamp_near','turret_headlamp_far'];
  for(const id of [...fixed,...rotating]) {
    const p=bySite.get(id), isFixed=fixed.includes(id), shapes=drawn(p);
    assert.equal(spec.rotatingSites.includes(id),!isFixed,id);
    const support=pieces(rows.get(isFixed?'security_walker_sleek_carrier':'security_walker_sleek_hull'));
    assert.ok(meeting(shapes,support,0.004).touches,`${id} floats off its hull`);
    assert.ok(!meeting(shapes,support,0.004).overlaps,`${id} penetrates hull`);
    const lens=shapes.filter(p=>p.id.startsWith('lens') && !p.id.startsWith('lens_divider'));
    assert.equal(lens.length,1,id);
    assert.ok(solid(lens[0]).min[0]>p.at[0],`${id} lens must face +x`);
    assert.ok(p.at[0]>0,`${id} must be on the fore hull`);
    if(id!=='floodlight') assert.equal(p.part,'headlamp_military');
    if(isFixed) assert.ok(Math.max(...shapes.map(p=>solid(p).max[1]))<spec.rotary.centre[1]);
    for(const module of weapons) assert.ok(!meeting(shapes,module,0.006).overlaps,`${id} intersects a weapon/ammo fitting`);
    for(const other of [...fixed,...rotating].filter(q=>q!==id)) {
      assert.ok(!meeting(shapes,drawn(bySite.get(other)),0.01).overlaps,`${id} intersects ${other}`);
    }
  }
});

test('new shell is shallow and swept back, with a distinct bearing instead of rotating leg mounts', () => {
  const old=spec.base.torso.profile.map(p=>p[1]);
  assert.ok(spec.hull.high-spec.hull.low < (Math.max(...old)-Math.min(...old))/2);
  assert.ok(Math.max(...spec.hull.roof.map(p=>p[1])) < Math.max(...spec.hull.bottom.map(p=>p[1]))-0.5);
  const rotor=pieces(rows.get('security_walker_sleek_rotor'));
  assert.equal(solid(rotor.find(p=>p.id==='bearing')).min[1],spec.rotary.centre[1]);
  assert.ok(spec.rotary.floor>spec.rotary.centre[1]);
});

test('production exports retain source geometry, mass/collision, canonical frames and all-angle rest-pose yaw clearance', async () => {
  const out=mkdtempSync(join(tmpdir(),'sleek-walker-'));
  try {
    const built=await buildWalkers(out);
    const clearance=rotaryClearance(built);
    assert.ok(clearance.passes,JSON.stringify(clearance));
    assert.ok(clearance.gapM>=0.04);
    for(const row of data.own) {
      const entry=built.metadata[row.id], part=entry.parts.body, ps=pieces(row);
      assert.ok(part.massKg>0 && part.centreOfMass.every(Number.isFinite));
      assert.equal(part.voxelGrain,spec.grain);
      assert.equal(part.collision.length,ps.length,'export must not retain stale generated source');
      for(const [i,p] of ps.entries()) {
        const b=solid(p), a=toModelFrame('+x',b.min), c=toModelFrame('+x',b.max);
        vectorClose(part.collision[i].min,a.map((v,j)=>Math.min(v,c[j])),spec.grain*2);
        vectorClose(part.collision[i].max,a.map((v,j)=>Math.max(v,c[j])),spec.grain*2);
      }
    }
    for(const id of ['base_headlamp_near','base_headlamp_far','floodlight','turret_headlamp_near','turret_headlamp_far']) {
      const lights=siteBoxes(bySite.get(id),built.metadata);
      for(const weapon of spec.weaponModuleSites) {
        assert.ok(!siteBoxes(bySite.get(weapon),built.metadata).some(a=>lights.some(b=>boxOverlap(a,b))),`${id}: exported light intersects ${weapon}`);
      }
    }
    // Baked per-solid bounds independently guard the new feed against pod/cradle intersections.
    for(const side of ['near','far']) {
      const feed=siteBoxes(bySite.get(`ammo_feed_${side}`),built.metadata);
      const pod=siteBoxes(bySite.get(`weapon_pod_${side}`),built.metadata);
      assert.ok(!feed.some(a=>pod.some(b=>boxOverlap(a,b))),`${side}: exported feed crosses pod/cradle`);
      const cassette=bySite.get(`ammo_cassette_${side}`);
      const caseIndex=pieces(rows.get(cassette.part)).findIndex(p=>p.id==='case');
      assert.ok(!pod.some(p=>boxOverlap(siteBoxes(cassette,built.metadata)[caseIndex],p)),`${side}: exported cassette crosses raised stripe`);
    }
    for(const id of Object.keys(placements)) {
      const exported=JSON.parse(readFileSync(join(out,'skelly.ground-vehicles','vehicles',`${id}.placements.json`),'utf8')).sites;
      assert.equal(exported.length,placements[id].sites.length);
      for(const [i,p] of placements[id].sites.entries()) assert.deepEqual(exported[i],{...p,at:toModelFrame('+x',p.at)});
    }
    // The borrowed feet must stay exactly as authored, including the baseline voxel overhang below the sole.
    for(const side of ['near','far']) {
      const b=siteBounds(bySite.get(`foot_${side}`),built.metadata);
      assert.ok(b.min[1]>=-0.032 && b.min[1]<=0);
    }
    // A failed geometry split must fail the certificate rather than merely produce a plausible image.
    const lowered=structuredClone(built);
    lowered.placements.security_walker_sleek.sites.find(p=>p.id==='hull').at[1]-=0.2;
    assert.equal(rotaryClearance(lowered).passes,false);
    const floating=structuredClone(built);
    floating.placements.security_walker_sleek.sites.find(p=>p.id==='rotor').at[1]+=0.10;
    assert.equal(rotaryClearance(floating).passes,false,'a floating/disconnected rotor is not a valid clearance result');
  } finally { rmSync(out,{recursive:true,force:true}); }
});
