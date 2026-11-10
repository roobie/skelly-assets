// Proposal-only planar contact experiment. Metres/degrees; not a production grip solver.
export const limits = [[0, 95], [0, 110], [0, 80]];
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lengths = (length, variant) => (variant === 'A' ? [0.55, 0.45] : [0.45, 0.32, 0.23]).map(x => x * length);
export function samples(ls, angles) {
  let x = 0, y = -0.1, a = 0;
  return ls.map((l, i) => {
    a += angles[i] * Math.PI / 180;
    const dx = Math.sin(a), dy = -Math.cos(a);
    const p = { x: x + dx*l/2, y: y + dy*l/2, nx: Math.cos(a), ny: Math.sin(a), a };
    x += dx*l; y += dy*l;
    return { ...p, end: [x,y], length:l };
  });
}
export const cylinder = { x: 0.034, y: -0.09, radius: 0.017 };
export function cost(ls, angles, radius = cylinder.radius) {
  const points = samples(ls, angles);
  let error = 0;
  for (const p of points) {
    // Several shaft samples discourage a segment cutting through the handle even when its pad is outside.
    for (const t of [-0.4, 0, 0.4]) {
      const x = p.x + Math.sin(p.a)*p.length*t, y = p.y - Math.cos(p.a)*p.length*t;
      const gap = Math.hypot(x-cylinder.x,y-cylinder.y)-radius-0.0128;
      error += 30*Math.min(0,gap)**2;
    }
    const px = p.x + p.nx*0.0128, py=p.y+p.ny*0.0128;
    const dx=cylinder.x-px,dy=cylinder.y-py,d=Math.hypot(dx,dy);
    error += (d-radius)**2;
    // The contact side must face the handle, not its back.
    error += 0.00015*(1-(p.nx*dx+p.ny*dy)/(d||1))**2;
  }
  return error;
}
export function solveContact(ls, seed, {coupled=false, radius=cylinder.radius}={}) {
  let angles = [...seed];
  const project = a => a.map((v,i)=>clamp(i===2 && coupled ? a[1]*0.67 : v,...limits[i]));
  angles=project(angles);
  const initial=cost(ls,angles,radius);
  // Cyclic coordinate descent over hinge angles; bounds are projected before EVERY trial.
  let trials=0;
  for(const step of [16,8,4,2,1,0.5]) for(let pass=0;pass<12;pass++) {
    let changed=false;
    for(let i=angles.length-1;i>=0;i--) {
      if(coupled && i===2) continue;
      let best=cost(ls,angles,radius), next=angles;
      for(const sign of [-1,1]) {
        const candidate=project(angles.map((a,j)=>a+(i===j?sign*step:0)));
        const c=cost(ls,candidate,radius); trials++;
        if(c<best-1e-12) {best=c;next=candidate;changed=true;}
      }
      angles=next;
    }
    if(!changed) break;
  }
  return {angles,initial,final:cost(ls,angles,radius),trials};
}
