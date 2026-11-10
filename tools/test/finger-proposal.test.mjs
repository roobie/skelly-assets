import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lengths,limits,samples,solveContact} from '../../site/fingerProposalMath.mjs';
for(const coupled of [false,true])test(`contact decreases error and projects limits (${coupled?'coupled':'free'})`,()=>{
 for(const length of [0.0624,0.0736,0.0752,0.08])for(const radius of [0.014,0.017,0.02]){
  const ls=lengths(length,'B'),result=solveContact(ls,[45,65,45],{coupled,radius});
  assert.ok(result.final<result.initial);
  result.angles.forEach((a,i)=>assert.ok(a>=limits[i][0]&&a<=limits[i][1]));
  if(coupled)assert.ok(Math.abs(result.angles[2]-result.angles[1]*0.67)<1e-8);
  const points=samples(ls,result.angles);let previous=[0,-0.1];
  points.forEach((p,i)=>{assert.ok(Math.abs(Math.hypot(p.end[0]-previous[0],p.end[1]-previous[1])-ls[i])<1e-10);previous=p.end;});
 }
});
test('out-of-range seed returns finite constrained result',()=>{
 const r=solveContact(lengths(0.08,'B'),[1000,-300,999]);
 assert.ok(Number.isFinite(r.final));r.angles.forEach((a,i)=>assert.ok(a>=limits[i][0]&&a<=limits[i][1]));
});
