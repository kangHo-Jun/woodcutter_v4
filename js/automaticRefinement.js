/* Bounded post-packing selection. Ties and rejected candidates retain the exact baseline. */
(function(root){
 'use strict';
 const EPS=1e-6, close=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<EPS;
 const rectKeys=['x','y','width','height'];
 const sameRect=(a,b)=>a&&b&&rectKeys.every(k=>close(a[k],b[k]));
 const validRect=r=>r&&rectKeys.every(k=>Number.isFinite(r[k]))&&r.width>0&&r.height>0;
 const inside=(p,b)=>p.x>=-EPS&&p.y>=-EPS&&p.x+p.width<=b.width+EPS&&p.y+p.height<=b.height+EPS;
 const serial=x=>JSON.stringify(x);
 function inventory(result){
  const map=new Map();
  for(const b of result.bins){
   if(!Number.isFinite(b.width)||!Number.isFinite(b.height)||b.width<=0||b.height<=0||!Array.isArray(b.placed)||b.placed.length>128)throw Error('board');
   for(const p of b.placed){
    if(p.id==null||map.has(p.id)||!validRect(p)||!inside(p,b))throw Error('part');
    map.set(p.id,{p,b});
   }
  }
  return map;
 }
 // Replay cuts independently of the candidate planner. Every leaf is either a
 // requested part or recorded waste; kerf cannot intersect a requested part.
 function physical(bin,kerf){
  if(!Array.isArray(bin.cutDetails)||bin.cutDetails.length>512||bin.cuttingCount!==bin.cutDetails.length||!Array.isArray(bin.freeRects)||bin.freeRects.length>512)return false;
  const leaves=[{x:0,y:0,width:bin.width,height:bin.height}];
  for(const c of bin.cutDetails){
   if(!['X','Y'].includes(c.axis)||!Number.isFinite(c.pos))return false;
   const i=leaves.findIndex(r=>sameRect(r,c.sourceRect));if(i<0)return false;
   const r=leaves[i],axis=c.axis==='X'?'x':'y',size=c.axis==='X'?'width':'height',other=c.axis==='X'?'y':'x',span=c.axis==='X'?'height':'width';
   if(!close(c.spanStart,r[other])||!close(c.spanEnd,r[other]+r[span]))return false;
   const before=c.pos-r[axis],after=r[size]-before-kerf;
   if(before<=EPS||after<-EPS||c.pos>=r[axis]+r[size]-EPS)return false;
   leaves.splice(i,1,{...r,[size]:before});
   if(after>EPS)leaves.push({...r,[axis]:c.pos+kerf,[size]:after});
  }
  for(const p of [...bin.placed,...bin.freeRects]){
   if(!validRect(p))return false;
   const i=leaves.findIndex(r=>sameRect(r,p));if(i<0)return false;leaves.splice(i,1);
  }
  if(leaves.length)return false;
  const used=bin.placed.reduce((s,p)=>s+p.width*p.height,0),total=bin.width*bin.height;
  return close(bin.usedArea,used)&&close(bin.totalArea,total)&&close(bin.efficiency,used/total*100)&&
   (!bin.cutDetails.length||bin.firstCutDirection===(bin.cutDetails[0].axis==='X'?'V':'H'));
 }
 function validCandidate(base,next,kerf){
  if(!next||next.mode!==base.mode||!Array.isArray(next.bins)||!next.bins.length||next.bins.length>base.bins.length||!Array.isArray(next.unplaced)||next.unplaced.length)return false;
  const before=inventory(base),after=inventory(next);
  if(before.size!==after.size)return false;
  for(const [id,{p,b}] of after){
   const old=before.get(id);if(!old)return false;
   const o=old.p;
   if(['originalId','originalWidth','originalHeight','allowRotate'].some(k=>p[k]!==o[k]))return false;
   const normal=close(p.width,p.originalWidth)&&close(p.height,p.originalHeight);
   const rotated=p.allowRotate===true&&close(p.width,p.originalHeight)&&close(p.height,p.originalWidth);
   if(!normal&&!rotated)return false;
   if(p.allowRotate!==true&&(!close(p.width,o.width)||!close(p.height,o.height)||p.rotated!==o.rotated))return false;
   if(!close(b.width,old.b.width)||!close(b.height,old.b.height)||(base.mode==='vertical'&&b.firstCutDirection!=='V'))return false;
  }
  // Unchanged legacy bins retain their historical cut records. Every changed
  // bin, including its waste and counters, must pass the physical replay.
  const originals=new Set(base.bins.map(serial));
  return next.bins.every(b=>originals.has(serial(b))||physical(b,kerf));
 }
 function score(r,cost){
  const patterns=new Set(),sources=new Map();
  for(const b of r.bins){
   patterns.add(serial([b.width,b.height,b.placed.map(p=>[p.originalId,p.originalWidth,p.originalHeight,p.x,p.y,p.width,p.height]).sort((a,b)=>serial(a).localeCompare(serial(b)))]));
   for(const id of new Set(b.placed.map(p=>p.originalId)))sources.set(id,(sources.get(id)||0)+1);
  }
  return [r.bins.length,patterns.size,[...sources.values()].reduce((s,n)=>s+n,0),cost];
 }
 const better=(a,b)=>{for(let i=0;i<a.length;i++){if(a[i]!==b[i])return a[i]<b[i];}return false;};
 function choose(baseline,candidates,{kerf,cost}={}){
  try{
   if(!Number.isFinite(kerf)||kerf<0||!Array.isArray(baseline?.bins)||!baseline.bins.length||baseline.bins.length>64||baseline.unplaced?.length!==0)return baseline;
   inventory(baseline);
   const originalCost=cost(baseline);if(!Number.isFinite(originalCost)||originalCost<0)return baseline;
   let best=baseline,bestScore=score(baseline,originalCost);
   for(const next of candidates.slice(0,4)){
    try{
     if(next===baseline||!validCandidate(baseline,next,kerf))continue;
     const price=cost(next);if(!Number.isFinite(price)||price<0)continue;
     if(next.bins.length===baseline.bins.length&&price>originalCost+EPS)continue;
     const rank=score(next,price);
     if(better(rank,bestScore)){best=next;bestScore=rank;}
    }catch(_){/* A bad candidate must never discard the baseline. */}
   }
   return best===baseline?baseline:structuredClone(best);
  }catch(_){return baseline;}
 }
 function select(baseline,options={}){
  const grouping=root.IdenticalPartGrouping || (typeof require==='function'&&require('./groupIdenticalParts'));
  if(!grouping||!Number.isFinite(options.kerf)||options.kerf<0||!Array.isArray(baseline?.bins)||baseline.bins.length>64||baseline?.unplaced?.length!==0)return baseline;
  try{inventory(baseline);}catch(_){return baseline;}
  const run=(fn,input)=>{try{return fn(structuredClone(input),{enabled:true,kerf:options.kerf});}catch(_){return input;}};
  const grouped=run(grouping.refine,baseline),uniform=run(grouping.normalizePatterns,baseline);
  // Both orders are compared once; there is no improve-until-stable cycle.
  return choose(baseline,[grouped,uniform,run(grouping.normalizePatterns,grouped),run(grouping.refine,uniform)],options);
 }
 const api=Object.freeze({select,choose});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AutomaticRefinement=api;
})(typeof globalThis!=='undefined'?globalThis:this);
