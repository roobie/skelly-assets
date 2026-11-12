// Build and review the original and sleek security walker from production recipes.
// node tools/security-walker-review.mjs [--built built/security-walker-review] [--out look/security-walker-sleek]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { evaluateJsonnet } from './jsonnet/index.mjs';
import { installJsonnetSources } from './sources.mjs';
import { exportPool, exportRecipes, withTaxonomy } from './build.mjs';
import { DEFAULT_CACHE } from './generation.mjs';
import { exportPlacements } from './placements.mjs';
import { buildManifest, manifestJson, readCredits } from './manifest.mjs';
import { modelTaxonomies } from './check-taxonomy.mjs';
import { readVocabulary } from './taxonomy.mjs';
import { buildSite, launchBrowser, openPage, serveSite } from './reviewSite.mjs';

const root = resolve(import.meta.dirname, '..');
export const walkerIds = ['security_walker', 'security_walker_sleek'];
export function walkerSources() {
  return JSON.parse(evaluateJsonnet(`{
    placements: { [id]: (import 'models/vehicles/placements.libsonnet')[id] for id in ${JSON.stringify(walkerIds)} },
    rows: { [id]: [r.id for r in (import 'models/vehicles/index.libsonnet')[id]] for id in ${JSON.stringify(walkerIds)} },
    spec: import 'models/vehicles/security_walker_sleek.spec.libsonnet',
  }`, root));
}

export async function buildWalkers(built) {
  await installJsonnetSources();
  // Generated inputs must be refreshed BEFORE loading Node's cached catalogue modules.
  const [{ catalogue }, { finishLibrary }] = await Promise.all([
    import('./packages/thing-authoring-tool/src/content.ts'),
    import('./packages/thing-authoring-tool/src/exports.ts'),
  ]);
  const sources = walkerSources();
  const ids = new Set([...Object.values(sources.rows).flat(), ...Object.values(sources.placements).flatMap(p => p.sites.map(s => s.part))]);
  const pool = exportPool(DEFAULT_CACHE);
  let generated;
  try { generated = await exportRecipes({ out: built, tools: ['thing'], pool, ids }); }
  finally { await pool.close(); }
  const keys = new Set(generated.models.map(m => `${m.pack}/${m.id}`));
  const taxonomies = (await modelTaxonomies(root)).filter(m => keys.has(`${m.pack}/${m.id}`));
  const models = withTaxonomy(generated.models, taxonomies);
  const placed = exportPlacements({ placements: sources.placements, models, vehicleRows: sources.rows, dependsOn: {}, vocabulary: readVocabulary(root), out: built });
  writeFileSync(join(built, 'manifest.json'), manifestJson(buildManifest({ models, vehicles: placed.vehicles, files: [...generated.files, ...placed.files], credit: readCredits(root), finishes: finishLibrary(catalogue) })));
  const metadata = Object.fromEntries(models.map(m => [m.id, JSON.parse(readFileSync(join(built, m.pack, 'things', `${m.id}.model.json`), 'utf8'))]));
  return { ...sources, models, metadata };
}

// Baked boxes are conservative per-solid exported bounds, not the smooth source approximation.
export function siteBoxes(site, metadata) {
  const model = metadata[site.part];
  const boxes = model.parts ? Object.values(model.parts).flatMap(p => p.collision ?? []) : model.collision;
  if (!boxes?.length) throw new Error(`No baked collision for ${site.part}`);
  // Inputs are SOURCE sites; boxes are already in the exported glTF frame.
  const offset = [-site.at[2], site.at[1], site.at[0]];
  return boxes.map(b => ({
    min: b.min.map((v, i) => offset[i] + (site.mirror && i === 0 ? -b.max[i] : v)),
    max: b.max.map((v, i) => offset[i] + (site.mirror && i === 0 ? -b.min[i] : v)),
  }));
}

export function siteBounds(site, metadata) {
  const boxes = siteBoxes(site, metadata);
  return { min: [0,1,2].map(i => Math.min(...boxes.map(b => b.min[i]))), max: [0,1,2].map(i => Math.max(...boxes.map(b => b.max[i]))) };
}

export function rotaryClearance({ placements, metadata, spec }) {
  const sites = placements.security_walker_sleek.sites;
  const fixed = sites.filter(p => !spec.rotatingSites.includes(p.id));
  const moving = sites.filter(p => spec.rotatingSites.includes(p.id) && p.id !== 'rotor');
  const fixedTopM = Math.max(...fixed.map(p => siteBounds(p, metadata).max[1]));
  const upperBottomM = Math.min(...moving.map(p => siteBounds(p, metadata).min[1]));
  const gapM = upperBottomM - fixedTopM;
  const rotor = siteBounds(sites.find(p => p.id === 'rotor'), metadata);
  const hull = siteBounds(sites.find(p => p.id === 'hull'), metadata);
  const bearingGapM = rotor.min[1] - fixedTopM;
  const floorContactGapM = hull.min[1] - rotor.max[1];
  return {
    fixedTopM, upperBottomM, gapM, bearingGapM, floorContactGapM,
    passes: gapM >= 0.04 && bearingGapM >= -1e-6 && bearingGapM <= spec.grain && Math.abs(floorContactGapM) <= spec.grain,
    certificate: 'Vertical separation of conservative EXPORTED boxes guarantees upper-body yaw clearance at every angle in this fixed rest pose. Intentional stator/rotor bearing contact excluded.',
    limitations: 'Not a gait, terrain, gun-elevation, structural-load or balance validation. Review transforms only; no runtime articulation added.',
  };
}

export async function reviewWalkers({ built = 'built/security-walker-review', out = 'look/security-walker-sleek' } = {}) {
  built = resolve(built); out = resolve(out); mkdirSync(out, { recursive: true });
  const result = await buildWalkers(built);
  const clearance = rotaryClearance(result);
  const site = join(out, 'site'); buildSite(built, site);
  const server = await serveSite(site, built);
  let browser, images;
  try {
    browser = await launchBrowser();
    const { page, errors } = await openPage(browser, server.origin, 'look.html', 'look');
    images = await page.evaluate(async ({ ids, spec }) => {
      const THREE = await import('three');
      const { registerModels, loadEntry, stillInstance } = await import('./render.mjs');
      const { makeDrawer, groundGrid, startTile, drawView } = await import('./tile.mjs');
      const { models, vehicles } = await fetch('models.json').then(r => r.json()); registerModels(models);
      const drawer = makeDrawer(), scene = new THREE.Group(); drawer.stage.add(scene);
      const objects = {};
      for (const id of ids) { const e = vehicles.find(v => v.id === id); objects[id] = stillInstance(await loadEntry(e), e); scene.add(objects[id]); }
      const box = new THREE.Box3().setFromObject(scene), grid = groundGrid(box, 0.5), files = {};
      const views = [['front',[0,0,1]],['side',[-1,0,0]],['three-quarter',[-1,0.55,1.4]],['rear-quarter',[1,0.5,-1.4]],['top',[0,1,0.001]]];
      const render = (name, direction, subject) => {
        for (const [id,o] of Object.entries(objects)) o.visible = id === subject;
        const { tile, g } = startTile(1000,1,1);
        drawView(drawer,g,scene,grid,[name,new THREE.Vector3(...direction).normalize()],0,0,1000);
        return tile.toDataURL();
      };
      for (const id of ids) for (const [name,d] of views) files[`${id === ids[0] ? 'original-' : ''}${name}`] = render(name,d,id);
      const obj = objects.security_walker_sleek;
      for (const p of obj.children) if (spec.weaponModuleSites.includes(p.name)) p.visible = false;
      files['without-weapons'] = render('weapon modules and ammo removed',views[2][1],ids[1]);
      for (const p of obj.children) p.visible = true;
      const pivot = new THREE.Vector3(-spec.rotary.centre[2],spec.rotary.centre[1],spec.rotary.centre[0]);
      const homes = obj.children.map(p => ({ p:p.position.clone(), q:p.quaternion.clone() }));
      for (const degrees of spec.reviewYawDegrees) {
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),degrees*Math.PI/180);
        obj.children.forEach((p,i) => { if (!spec.rotatingSites.includes(p.name)) return; p.position.copy(homes[i].p).sub(pivot).applyQuaternion(q).add(pivot); p.quaternion.copy(q).multiply(homes[i].q); });
        files[`yaw-${degrees}`] = render(`review-only upper-hull yaw ${degrees}°`,views[2][1],ids[1]);
      }
      obj.children.forEach((p,i) => { p.position.copy(homes[i].p); p.quaternion.copy(homes[i].q); });
      // Detail cameras inspect the real fitted GLBs, not source proxies or a schematic belt.
      const detail = (name, ids, direction, focusIds=ids) => {
        for(const o of Object.values(objects)) o.visible=false;
        const group=new THREE.Group(), focus=new THREE.Group();
        for(const p of obj.children) if(ids.includes(p.name)) group.add(p.clone());
        for(const p of group.children) if(focusIds.includes(p.name)) focus.add(p.clone());
        drawer.stage.add(group);
        const grid=groundGrid(new THREE.Box3().setFromObject(focus),0.1);
        const {tile,g}=startTile(1000,1,1);
        drawView(drawer,g,focus,grid,[name,new THREE.Vector3(...direction).normalize()],0,0,1000);
        drawer.stage.remove(group);
        return tile.toDataURL();
      };
      const nearModule=spec.weaponModuleSites.filter(id=>id.endsWith('_near'));
      files['weapon-module']=detail('detachable weapon module',nearModule,[-1,-0.3,1]);
      files['ammo-feed-close-up']=detail('pod ammo feed',nearModule,[-1,-0.3,1],['ammo_cassette_near','ammo_feed_near','weapon_pod_near']);
      files['fore-lighting']=detail('fixed and turret lighting',['carrier','hull','rotor','floodlight','base_headlamp_near','base_headlamp_far','turret_headlamp_near','turret_headlamp_far'],[0,0.12,1]);
      const bounds = Object.fromEntries(Object.entries(objects).map(([id,o]) => { const b=new THREE.Box3().setFromObject(o); return [id,{min:b.min.toArray(),max:b.max.toArray(),sites:o.children.length}]; }));
      drawer.renderer.dispose(); return {files,bounds};
    }, { ids: walkerIds, spec: result.spec });
    for (const id of walkerIds) {
      const { png } = await page.evaluate(id => window.look(id,512,{views:'review',sites:[]}), id);
      images.files[id === walkerIds[0] ? 'original-assembly' : 'assembly'] = png;
    }
    if (errors.length) throw new Error(errors.join('\n'));
  } finally { if (browser) await browser.close(); server.close(); }
  for (const [name,url] of Object.entries(images.files)) writeFileSync(join(out,`${name}.png`),Buffer.from(url.split(',')[1],'base64'));
  const report = { clearance, bounds: images.bounds, sources: result.placements, rotatingSites: result.spec.rotatingSites, sourceFrame:'+x forward, +y up, +z near; exported [-z,y,x]', buildModels:result.models.length };
  writeFileSync(join(out,'review.json'),`${JSON.stringify(report,null,2)}\n`);
  writeFileSync(join(out,'review.md'),`# Sleek security-walker variant\n\nOriginal leg assembly and weapon modules reused, CV9040 optics fitted separately. Each pod now carries a detachable ammo cassette and enclosed segmented feed to its receiver. Fixed fore-hull floodlight and guarded headlamp pair; an additional headlamp pair turns with the turret. Original vehicle unchanged. Fittings are static geometry, without simulated illumination, ammunition transport or firing.\n\nFixed exported ceiling: ${clearance.fixedTopM.toFixed(3)} m; non-bearing upper-body floor: ${clearance.upperBottomM.toFixed(3)} m; vertical yaw clearance: ${(clearance.gapM*1000).toFixed(0)} mm.\n\n${clearance.certificate}\n\n${clearance.limitations}\n\nCompare original/new front, side and quarter views at common rest-pose framing. Weaponless and turned-upper-hull images demonstrate boundaries, not implemented animation.\n`);
  const names=['three-quarter','ammo-feed-close-up','weapon-module','fore-lighting','original-three-quarter','front','original-front','side','original-side','rear-quarter','top','without-weapons','yaw-45','yaw-90','yaw-180','assembly'];
  writeFileSync(join(out,'index.html'),`<!doctype html><meta charset="utf-8"><title>Sleek security walker</title><style>body{font:16px system-ui;background:#e8e6e1;margin:24px;max-width:1500px}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:16px}figure{margin:0}img{width:100%;height:auto}</style><h1>Security walker — sleek upper-hull variant</h1><p>Existing legs and modular weapons, now with pod-mounted ammo cassettes and enclosed feeds. Fixed front floodlight/headlamps plus turret headlamps. CV9040 optics, recessed rotary interface and rear cooling pack.</p><p><a href="review.md">Review notes</a> · <a href="review.json">Build and clearance facts</a></p><p>Upper-hull turns are review transforms, not runtime animation. Rest-pose yaw clearance: ${(clearance.gapM*1000).toFixed(0)} mm; gait/elevation/load checks remain out of scope.</p><section>${names.map(n=>`<figure><h2>${n}</h2><a href="${n}.png"><img src="${n}.png" alt="${n}"></a></figure>`).join('')}</section>`);
  if (!clearance.passes) throw new Error(`Upper-body yaw clearance failed: ${JSON.stringify(clearance)}`);
  console.log(`Walker review -> ${out}\n${JSON.stringify({clearance,bounds:images.bounds},null,2)}`);
  return report;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const { values } = parseArgs({ options: { built:{type:'string'}, out:{type:'string'} } });
  await reviewWalkers(values);
}
