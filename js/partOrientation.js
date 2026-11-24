/* UI dimensions are width across grain, length along grain. Engine X is board length. */
(function (root) {
    'use strict';
    const INPUT_LENGTH = 'input-length-v2';
    const LEGACY = 'longest-side-v1';
    function toItems(parts, spec) {
        return parts.map(part => {
            const grain = spec.considerGrain === true;
            const legacy = spec.grainRule === LEGACY;
            return {
                id: part.id, qty: part.qty,
                width: grain ? (legacy ? Math.max(part.width, part.height) : part.height)
                    : (!part.allowRotate ? part.height : part.width),
                height: grain ? (legacy ? Math.min(part.width, part.height) : part.width)
                    : (!part.allowRotate ? part.width : part.height),
                allowRotate: !!part.allowRotate && !grain
            };
        });
    }
    function assertResult(items, result) {
        const remaining = items.map(p => p.qty);
        const close = (a,b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a-b)<1e-6;
        function consume(part, placed) {
            const sourceMatches = i => remaining[i]>0 &&
                close(part.originalWidth ?? part.width, items[i].width) &&
                close(part.originalHeight ?? part.height, items[i].height);
            let index = part.originalId;
            if (!Number.isInteger(index) || !items[index] || !sourceMatches(index)) {
                index = items.findIndex((_p,i)=>sourceMatches(i));
            }
            const item = items[index];
            const normal = item && close(part.width,item.width) && close(part.height,item.height);
            const rotated = item?.allowRotate && close(part.width,item.height) && close(part.height,item.width);
            if (!item || (placed && !normal && !rotated)) throw new Error('부품의 결 방향 또는 수량이 입력과 다릅니다.');
            remaining[index]--;
        }
        result.bins.forEach(bin=>bin.placed.forEach(p=>consume(p,true)));
        result.unplaced.forEach(p=>consume(p,false));
        if (remaining.some(n=>n!==0)) throw new Error('부품의 결 방향 또는 수량이 입력과 다릅니다.');
    }
    const api = { INPUT_LENGTH, LEGACY, toItems, assertResult };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.PartOrientation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
