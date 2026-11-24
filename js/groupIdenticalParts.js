/* Optional, bounded refinement of a completed layout. Never mutates its input. */
(function (root) {
    'use strict';
    const EPS = 1e-6;
    const close = (a, b) => Math.abs(a - b) < EPS;
    const inside = (p, r) => p.x >= r.x - EPS && p.y >= r.y - EPS &&
        p.x + p.width <= r.x + r.width + EPS && p.y + p.height <= r.y + r.height + EPS;
    const sameRect = (a, b) => ['x', 'y', 'width', 'height'].every(k => close(a[k], b[k]));

    // Reconstruct a physical guillotine plan from fixed part rectangles. Each
    // cut consumes kerf and references an actual remaining workpiece. No search
    // or change to the shared packing engine and its scoring is involved.
    function plan(bin, parts, kerf) {
        let budget = 4096;
        const cuts = [], free = [];
        const axes = [['y', 'height', 'x', 'width', 'Y'], ['x', 'width', 'y', 'height', 'X']];
        if (bin.firstCutDirection === 'V') axes.reverse();
        function divide(rect, subset, depth) {
            if (--budget < 0 || depth > 128) return false;
            if (!subset.length) { free.push(rect); return true; }
            if (subset.length === 1 && sameRect(rect, subset[0])) return true;
            for (const [axis, size, span, spanSize, label] of axes) {
                const positions = [...new Set(subset.flatMap(p => [p[axis] + p[size], p[axis] - kerf]))].sort((a,b)=>a-b);
                for (const pos of positions) {
                    if (--budget < 0) return false;
                    const before = pos - rect[axis], after = rect[size] - before - kerf;
                    if (before <= EPS || after < -EPS || pos >= rect[axis] + rect[size] - EPS) continue;
                    const left = subset.filter(p => p[axis] + p[size] <= pos + EPS);
                    const right = subset.filter(p => p[axis] >= pos + kerf - EPS);
                    if (left.length + right.length !== subset.length) continue;
                    cuts.push({axis:label, pos, spanStart:rect[span], spanEnd:rect[span]+rect[spanSize], sourceRect:{...rect}});
                    // A valid separating cut cannot destroy another guillotine
                    // separation. If a child cannot be separated, reject safely.
                    return divide({...rect, [size]:before},left,depth+1) &&
                        (after > EPS ? divide({...rect,[axis]:pos+kerf,[size]:after},right,depth+1) : right.length === 0);
                }
            }
            return false;
        }
        if (!parts.every(p=>inside(p,{x:0,y:0,width:bin.width,height:bin.height}))) return null;
        if (!divide({x:0,y:0,width:bin.width,height:bin.height},parts,0)) return null;
        const usedArea = parts.reduce((sum,p)=>sum+p.width*p.height,0);
        const totalArea = bin.width*bin.height;
        return {...bin, placed:parts, freeRects:free, cutDetails:cuts, usedArea, totalArea, efficiency:usedArea/totalArea*100,
            cuttingCount:cuts.length, firstCutDirection:cuts[0]?.axis === 'Y' ? 'H' : 'V'};
    }

    function refineBin(bin, kerf) {
        if (!Array.isArray(bin.placed) || !Array.isArray(bin.freeRects) || bin.placed.length > 128) return null;
        if (!bin.placed.every(p => ['x','y','width','height'].every(k => Number.isFinite(p[k])) && p.width>0 && p.height>0)) return null;
        const groups = new Map();
        for (const p of bin.placed) {
            // Source identity is required: never merge different input rows,
            // reversed grain dimensions, or differently rotated pieces.
            if (!Number.isInteger(p.originalId)) continue;
            const key = JSON.stringify([p.originalId,p.width,p.height,p.rotated,p.originalWidth,p.originalHeight]);
            if (!groups.has(key)) groups.set(key,[]);
            groups.get(key).push(p);
        }
        let attempts = 0;
        const tried = new Set();
        for (const group of groups.values()) {
            if (group.length < 3) continue;
            for (const [axis, size, cross] of [['x','width','y'],['y','height','x']]) {
                for (const first of group) {
                    const line = group.filter(p=>close(p[cross],first[cross])).sort((a,b)=>a[axis]-b[axis]);
                    // Initial scope: one isolated piece joins an existing run
                    // containing every other piece of this group on this board.
                    if (line.length !== group.length-1 || line.length < 2) continue;
                    if (!line.every((p,i)=>i===0 || close(p[axis],line[i-1][axis]+line[i-1][size]+kerf))) continue;
                    const lone = group.find(p=>!line.includes(p));
                    const last = line[line.length-1];
                    const moved = {...lone,[axis]:last[axis]+last[size]+kerf,[cross]:first[cross]};
                    if (!bin.freeRects.some(r=>inside(moved,r))) continue;
                    const moveKey = JSON.stringify([lone.id,moved.x,moved.y]);
                    if (tried.has(moveKey)) continue;
                    tried.add(moveKey);
                    if (++attempts > 16) return null;
                    const parts = bin.placed.map(p=>p===lone ? moved : {...p});
                    const candidate = plan(bin,parts,kerf);
                    if (candidate && candidate.cuttingCount <= bin.cuttingCount &&
                        (!['H','V'].includes(bin.firstCutDirection) || candidate.firstCutDirection === bin.firstCutDirection)) return candidate;
                }
            }
        }
        return null;
    }

    const groupKey = p => Number.isInteger(p.originalId)
        ? JSON.stringify([p.originalId,p.width,p.height,p.rotated,p.originalWidth,p.originalHeight]) : null;
    const directionKept = (before, after) => !['H','V'].includes(before.firstCutDirection) ||
        before.firstCutDirection === after.firstCutDirection;

    // Consolidate into existing boards only. Every accepted move strictly
    // increases concentration, so equal-sized groups cannot bounce back.
    function crossBoards(input, kerf) {
        let bins = input, movedCount = 0, attempts = 0, scans = 0;
        const better = (a,b) => a.some((v,i)=>v>b[i] && a.slice(0,i).every((n,j)=>n===b[j]));
        for (let pass=0; pass<32 && attempts<128 && scans<50000; pass++) {
            let best = null;
            const groups = bins.map(bin=>{
                const map=new Map();
                for (const p of bin.placed) {
                    const key=groupKey(p); if (!key) continue;
                    if (!map.has(key)) map.set(key,[]);
                    map.get(key).push(p);
                }
                return map;
            });
            search: for (let from=0; from<bins.length; from++) {
                const source=bins[from];
                for (const [key,parts] of groups[from]) {
                    for (let to=0; to<bins.length; to++) {
                        if (++scans>50000) break search;
                        if (to===from) continue;
                        const target=bins[to], mates=groups[to].get(key);
                        if (!mates?.length || !close(source.width,target.width) || !close(source.height,target.height)) continue;
                        let dest=target;
                        const movedIds=new Set();
                        // Evaluate prefixes as well as a whole group. A temporary
                        // reduction in concentration is allowed only inside this
                        // private candidate, never published to the caller.
                        for (const part of parts) {
                            if (dest.placed.length>=128) break;
                            const aligned=dest.placed.filter(p=>groupKey(p)===key);
                            const alongX=aligned.map(p=>({x:p.x+p.width+kerf,y:p.y}));
                            const alongY=aligned.map(p=>({x:p.x,y:p.y+p.height+kerf}));
                            const positions=(target.firstCutDirection==='H' ? alongY.concat(alongX) : alongX.concat(alongY))
                                .concat(dest.freeRects.map(r=>({x:r.x,y:r.y})));
                            let placed=null;
                            const seen=new Set();
                            for (const pos of positions) {
                                if (++scans>50000) break search;
                                const posKey=JSON.stringify(pos); if (seen.has(posKey)) continue; seen.add(posKey);
                                const moved={...part,...pos};
                                if (!dest.freeRects.some(r=>inside(moved,r))) continue;
                                if (++attempts>128) break search;
                                const candidate=plan(dest,[...dest.placed,moved],kerf);
                                if (candidate && directionKept(target,candidate)) {placed=candidate;break;}
                            }
                            if (!placed) break;
                            dest=placed; movedIds.add(part.id);
                            const n=movedIds.size;
                            const rest=source.placed.filter(p=>!movedIds.has(p.id));
                            const gain=2*n*(mates.length-parts.length+n);
                            if (gain<=0 && rest.length) continue;
                            if (++attempts>128) break search;
                            const src=rest.length ? plan(source,rest,kerf) : null;
                            if (rest.length && (!src || !directionKept(source,src))) continue;
                            const rank=[src ? 0:1,n===parts.length ? 1:0,gain,-n,-(dest.cuttingCount+(src?.cuttingCount||0))];
                            if (!best || better(rank,best.rank)) best={from,to,src,dest,rank,n};
                        }
                    }
                }
            }
            if (!best) break;
            bins=bins.map((b,i)=>i===best.from ? best.src : i===best.to ? best.dest : b).filter(Boolean);
            movedCount+=best.n;
        }
        return {bins,movedCount};
    }

    function refine(baseline, {enabled = false, kerf} = {}) {
        if (enabled !== true || !Number.isFinite(kerf) || kerf < 0 ||
            !baseline?.bins?.length || baseline.bins.length > 64 || baseline.unplaced?.length !== 0) return baseline;
        // A malformed/oversized input is never partially refined.
        if (baseline.bins.some(b=>!Array.isArray(b.placed) || !Array.isArray(b.freeRects) || b.placed.length>128 || b.freeRects.length>512 ||
            !b.placed.every(p=>['x','y','width','height'].every(k=>Number.isFinite(p[k])) && p.width>0 && p.height>0))) return baseline;
        if (baseline.bins.some(b=>b.freeRects.some(r=>
            !['x','y','width','height'].every(k=>Number.isFinite(r[k])) || r.width<=0 || r.height<=0 ||
            !inside(r,{x:0,y:0,width:b.width,height:b.height}) ||
            b.placed.some(p=>Math.min(p.x+p.width,r.x+r.width)-Math.max(p.x,r.x)>EPS &&
                Math.min(p.y+p.height,r.y+r.height)-Math.max(p.y,r.y)>EPS)))) return baseline;
        let movedCount = 0;
        const localBins = baseline.bins.map(bin => {
            const next = refineBin(bin,kerf);
            if (next) movedCount++;
            return next || bin;
        });
        const cross = crossBoards(localBins,kerf);
        movedCount += cross.movedCount;
        if (!movedCount) return baseline;
        const bins=cross.bins;
        const used=bins.reduce((sum,b)=>sum+b.usedArea,0), area=bins.reduce((sum,b)=>sum+b.totalArea,0);
        return structuredClone({...baseline,bins,
            totalEfficiency:cross.movedCount ? used/area*100 : baseline.totalEfficiency,
            partGrouping:{applied:true,movedCount,crossBoardMoves:cross.movedCount}});
    }
    // Reuse a proven layout only among boards with exactly the same input
    // parts/counts/rotation permissions. This never transfers parts between boards.
    function normalizePatterns(baseline, {enabled=false, kerf}={}) {
        if (enabled!==true || !Number.isFinite(kerf) || kerf<0 || !baseline?.bins?.length ||
            baseline.bins.length>64 || baseline.unplaced?.length!==0) return baseline;
        const identity=p=>JSON.stringify([p.originalId,p.originalWidth,p.originalHeight,p.allowRotate===true]);
        const geometry=b=>JSON.stringify(b.placed.map(p=>[identity(p),p.x,p.y,p.width,p.height]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
        const groups=new Map();
        for(let i=0;i<baseline.bins.length;i++) {
            const b=baseline.bins[i];
            if (!Array.isArray(b.placed) || !b.placed.length || b.placed.length>128 ||
                !b.placed.every(p=>Number.isInteger(p.originalId) &&
                    ['x','y','width','height','originalWidth','originalHeight'].every(k=>Number.isFinite(p[k])) &&
                    p.width>0 && p.height>0 && p.originalWidth>0 && p.originalHeight>0)) continue;
            const key=JSON.stringify([b.width,b.height,b.placed.map(identity).sort()]);
            if(!groups.has(key)) groups.set(key,[]);
            groups.get(key).push(i);
        }
        const bins=[...baseline.bins];let changedBoards=0,plans=0;
        for(const indexes of groups.values()) {
            if(indexes.length<2 || new Set(indexes.map(i=>geometry(bins[i]))).size===1) continue;
            const choices=[];const seen=new Set();
            for(const i of indexes) {
                const b=bins[i],key=geometry(b);if(seen.has(key))continue;seen.add(key);
                if(++plans>128) break;
                const candidate=plan(b,b.placed,kerf);
                if(candidate && indexes.every(j=>candidate.cuttingCount<=bins[j].cuttingCount)) choices.push(candidate);
            }
            choices.sort((a,b)=>a.cuttingCount-b.cuttingCount ||
                a.placed.filter(p=>p.rotated).length-b.placed.filter(p=>p.rotated).length);
            let replacements=null;
            for(const template of choices) {
                const pending=[];let valid=true;
                for(const i of indexes) {
                    const source=bins[i];const pool=new Map();
                    for(const p of source.placed){const key=identity(p);if(!pool.has(key))pool.set(key,[]);pool.get(key).push(p);}
                    const parts=template.placed.map(slot=>{
                        const p=pool.get(identity(slot))?.shift();
                        if(!p)return null;
                        const normal=close(slot.width,p.originalWidth)&&close(slot.height,p.originalHeight);
                        const rotated=p.allowRotate===true&&close(slot.width,p.originalHeight)&&close(slot.height,p.originalWidth);
                        if(!normal&&!rotated)return null;
                        return {...p,x:slot.x,y:slot.y,width:slot.width,height:slot.height,rotated:!normal};
                    });
                    if(parts.some(p=>!p)){valid=false;break;}
                    pending.push(structuredClone({...source,placed:parts,cutDetails:template.cutDetails,freeRects:template.freeRects,
                        cuttingCount:template.cuttingCount,firstCutDirection:template.firstCutDirection,
                        usedArea:template.usedArea,totalArea:template.totalArea,efficiency:template.efficiency}));
                }
                if(valid){replacements=pending;break;}
            }
            if(replacements) indexes.forEach((i,n)=>{if(geometry(bins[i])!==geometry(replacements[n]))changedBoards++;bins[i]=replacements[n];});
        }
        return changedBoards ? structuredClone({...baseline,bins,patternNormalization:{applied:true,changedBoards}}) : baseline;
    }
    const api = Object.freeze({refine,normalizePatterns});
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.IdenticalPartGrouping = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
