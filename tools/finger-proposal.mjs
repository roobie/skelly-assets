// Reproduce proposal PNGs without changing any production model or schema.
// node tools/finger-proposal.mjs <output-dir>
import {cpSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {buildSite,serveSite,launchBrowser,openPage} from './reviewSite.mjs';
import {samples,lengths,cylinder} from '../site/fingerProposalMath.mjs';
const repo=resolve(import.meta.dirname,'..');
const out=resolve(process.argv[2]);mkdirSync(out,{recursive:true});
const site=join(repo,'.prototype-site/site'),built=join(repo,'built');
buildSite(built,site);
for(const f of ['fingerProposal.mjs','fingerProposalMath.mjs'])cpSync(join(repo,'site',f),join(site,f));
const server=await serveSite(site,built),browser=await launchBrowser();
const reports=[];
try {
 const {page}=await openPage(browser,server.origin,'pose.html','posed');
 await page.evaluate(async()=>{window.proposal=await import('./fingerProposal.mjs');});
 for(const variant of ['current','A','B','C'])for(const pose of ['open','fist','point','grip','grip-context','cast','gloved',...(variant==='C'?['motion-0','motion-0.25','motion-0.5','motion-0.75','motion-1']:[])]){
  const {png,reports:stats,frame}=await page.evaluate(async({variant,pose})=>window.proposal.renderProposal(variant,pose),{variant,pose});
  writeFileSync(join(out,`${variant}-${pose}.png`),Buffer.from(png.split(',')[1],'base64'));
  reports.push({variant,pose,stats,...(pose.startsWith('motion-')?{frame}:{})});console.log(`${variant}-${pose}`);
 }
 writeFileSync(join(out,'prototype-results.json'),JSON.stringify(reports,null,2));
 const frames=reports.filter(r=>r.pose.startsWith('motion-')).map(r=>r.frame);
 if(frames.some(f=>Object.values(f.rotations).some(q=>Math.abs(Math.hypot(...q)-1)>1e-6)))throw new Error('non-unit clip rotation');
 writeFileSync(join(out,'C-prototype-clip.json'),JSON.stringify({kind:'pose',loop:false,durationRealSeconds:0.4,frames},null,2));
 const metrics=[];
 for(const variant of ['B','C'])for(const s of reports.find(r=>r.variant===variant&&r.pose==='grip').stats.filter(s=>s.side==='R')){
  const ls=lengths([0.0752,0.08,0.0736,0.0624][s.finger],variant);
  const gaps=samples(ls,s.angles).map(p=>Math.hypot(p.x+p.nx*0.0128-cylinder.x,p.y+p.ny*0.0128-cylinder.y)-cylinder.radius);
  metrics.push(`${variant} finger ${s.finger}: angles ${s.angles.join('/')} deg; cost ${s.initial.toFixed(6)} -> ${s.final.toFixed(6)}; pad surface gaps ${gaps.map(g=>(g*1000).toFixed(2)).join('/')} mm`);
 }
 writeFileSync(join(out,'contact-metrics.txt'),metrics.join('\n')+'\n');
}finally{await browser.close();server.close();}
