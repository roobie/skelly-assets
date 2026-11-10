// Isolated visual proposal; uses the actual pose-page figure, palm, tool and cast pose.
import * as T from 'three';
import {buildFigure,applyFrame} from './pose.mjs';
import {registerModels,loadEntry,makeStage,setupRenderer} from './render.mjs';
import {compilePose} from './poseFile.mjs';
import {lengths,solveContact,cylinder} from './fingerProposalMath.mjs';
const rad=T.MathUtils.degToRad;
const skin=new T.MeshStandardMaterial({color:0xb77e5b,roughness:0.9});
const leather=new T.MeshStandardMaterial({color:0x44352c,roughness:0.85});
const seam=new T.MeshStandardMaterial({color:0x997c56,roughness:1});
const mesh=(x,y,z,material)=>new T.Mesh(new T.BoxGeometry(x,y,z),material);
const fetched=await fetch('models.json').then(r=>r.json()); registerModels(fetched.models);
const data={models:new Map(fetched.models.map(m=>[m.id,m])),rig:await fetch('rig.json').then(r=>r.json())};
const cast=await fetch('poses/cast.json').then(r=>r.json());
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}); setupRenderer(renderer);renderer.setSize(650,650);
const stage=makeStage(renderer);stage.background=new T.Color(0xeae6dd);
function segment(parent,length,width,depth,mat,glove=false) {
  const joint=new T.Group(); parent.add(joint);
  const body=mesh(depth,length+0.001,width,mat);body.position.y=-length/2;joint.add(body);
  // Rounded joint caps hide the open wedge without changing the outer width.
  const cap=new T.Mesh(new T.SphereGeometry(1,12,8),mat);cap.scale.set(depth/2,depth/2,width/2);joint.add(cap);
  if(glove) {const stitch=mesh(0.001,length*0.62,0.0015,seam);stitch.position.set(-depth/2-0.0006,-length/2,0);joint.add(stitch);}
  return joint;
}
function newHand(parent,variant,pose,glove,side) {
  const group=new T.Group();parent.add(group);if(side==='L')group.scale.x=-1;
  const mat=glove?leather:skin, g=glove?0.003:0;
  const report=[];
  if(glove) {const cover=mesh(0.032+2*g,0.105,0.085+2*g,mat);cover.position.y=-0.0475;group.add(cover);const cuff=mesh(0.067,0.035,0.075,mat);cuff.position.y=0.012;group.add(cuff);}
  const width=(0.085*0.95-3*0.0035)/4;
  [0.94,1,0.92,0.78].forEach((share,i)=>{
    const ls=lengths(0.08*share,variant);
    const root=new T.Group();root.position.set(0,-0.1,0.085/2*0.9-i*(width+0.0035)-width/2);group.add(root);
    let angles=pose==='open'?[0,0,0]:pose==='point' && i===0 ? [0,0,0] : [75,95,60];
    if(pose==='cast') angles=i===0?[12,5,3]:i===1?[20,12,8]:[65,80,53];
    if(variant==='A') angles=[angles[0],angles[1]];
    if(variant==='C' && angles.length===3)angles[2]=angles[1]*0.67;
    if(pose==='grip' || pose==='gloved') {
      if(variant==='A')angles=[65,105];
      else {const solved=solveContact(ls,[45,65,45],{coupled:variant==='C',radius:cylinder.radius+g});angles=solved.angles;report.push({finger:i,...solved});}
    }
    // Spread is a base-joint degree of freedom, not a lateral shift of each phalanx.
    root.rotation.x=rad(pose==='open'?(1.5-i)*5:pose==='cast'?(1.5-i)*8:0);
    let parent=root;
    ls.forEach((l,j)=>{const joint=segment(parent,l,width+0.7*g,0.0256+2*g,mat,glove);if(j)joint.position.y=-ls[j-1];joint.rotation.z=rad(angles[j]);joint.name=`${['index','middle','ring','little'][i]}.${j+1}.${side}`;parent=joint;});
  });
  // Thumb has its own base orientation. Opposition rolls its flex plane across the palm.
  const thumb=new T.Group();thumb.position.set(0,-0.03,0.0385);group.add(thumb);
  const closed=!['open','cast'].includes(pose);
  thumb.rotation.set(rad(closed?30:pose==='cast'?-18:-12),rad(closed?-20:-10),rad(closed?25:8));thumb.name=`thumb.base.${side}`;
  const a=segment(thumb,0.036,0.018,0.0224+2*g,mat,glove);a.name=`thumb.1.${side}`;
  const b=segment(a,0.024,0.015,0.019+2*g,mat,glove);b.name=`thumb.2.${side}`;b.position.y=-0.036;b.rotation.z=rad(closed?40:8);
  return {group,report};
}
async function hammer(parent) {
  const loaded=await loadEntry(data.models.get('hammer'));const tool=loaded.scene.clone(true);
  // Exported hammer handle lies on z. Its real handling grip is z=-0.185.
  tool.position.set(cylinder.x,cylinder.y,0.185);parent.add(tool);return tool;
}
function draw(obj,title,{castView=false,grip=false,current=false,context=false}={}) {
  stage.add(obj);obj.updateMatrixWorld(true);
  const canvas=document.createElement('canvas');canvas.width=1300;canvas.height=750;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#eae6dd';ctx.fillRect(0,0,1300,750);
  ctx.fillStyle='#272b2c';ctx.font='bold 28px sans-serif';ctx.fillText(title,28,39);
  ctx.font='17px sans-serif';ctx.fillText(current?'Existing exported geometry and rig. No independent finger bend.':'Local prototype • actual doll palm / cast rig • proposed rigid finger parts',28,67);
  const dirs=castView?[[1,0.4,1],[-1,0.3,1]]:[[1,0.3,0.65],[-1,0.2,0.55]];
  dirs.forEach((dir,i)=>{
    let target=new T.Vector3(0,-0.08,0),height=0.25;
    if(castView||context){const box=new T.Box3().setFromObject(obj);target=box.getCenter(new T.Vector3());height=Math.max(...box.getSize(new T.Vector3()).toArray())*1.18;}
    const cam=new T.OrthographicCamera(-height/2,height/2,height/2,-height/2,0.001,100);
    cam.position.copy(target).addScaledVector(new T.Vector3(...dir).normalize(),3);cam.lookAt(target);renderer.render(stage,cam);ctx.drawImage(renderer.domElement,i*650,90);
  });
  ctx.fillStyle='#454a4a';ctx.font='16px sans-serif';ctx.fillText(castView?'Same cast fixture; hand gesture added':grip?'Catalogue hammer; grip crop intentionally keeps the hand large (head extends out of crop).':'Palm-side / back-side views; same camera and metre scale',28,737);
  stage.remove(obj);return canvas.toDataURL('image/png');
}
export async function renderProposal(variant,pose) {
  const label=pose,context=pose==='grip-context';if(context)pose='grip';
  const motion=pose.startsWith('motion-')?Number(pose.slice(7)):null;if(motion!==null)pose='fist';
  const glove=pose==='gloved';
  const figure=await buildFigure(data,variant==='current' && glove?['leather_gloves']:[]);
  const current=variant==='current',castView=pose==='cast',grip=pose==='grip'||glove;
  let file=castView?structuredClone(cast):{rig:{id:'doll',revision:1},ground:true};
  if(current && !['open','cast'].includes(pose))file.angles={...file.angles,'fingers.R':[pose==='point'?0:75,0,0],'thumb.R':[35,0,20]};
  const {frame}=compilePose(data.rig,file);applyFrame(figure,frame);
  let reports=[];
  if(!current)for(const side of ['R','L']) {
    figure.bones.get(`fingers.${side}`).part.visible=false;figure.bones.get(`thumb.${side}`).part.visible=false;
    const hand=figure.bones.get(`hand.${side}`);
    const result=newHand(hand.joint,variant,pose,glove,side);reports.push(...result.report.map(r=>({side,...r})));
    if(motion!==null)result.group.traverse(n=>{if(n.name)n.quaternion.slerp(new T.Quaternion(),1-motion);});
  }
  let obj=figure.root;
  if(!castView) {
    // Detach only the actual hand hierarchy, then remove its world pose for a fixed close-up.
    const joint=figure.bones.get('hand.R').joint;joint.removeFromParent();joint.position.set(0,0,0);joint.quaternion.identity();obj=joint;
    if(grip)await hammer(obj);
  }
  const rotations={};obj.traverse(n=>{if(n.name && /\.[RL]$/.test(n.name))rotations[n.name]=n.quaternion.toArray();});
  const title=`${variant} / ${label}${current&&pose==='point'?' — point unavailable':current&&pose==='fist'?' — rigid fan, not a fist':''}`;
  return {png:draw(obj,title,{castView,grip:grip&&!context,current,context}),reports,frame:{root:[0,0,0],rotations}};
}
