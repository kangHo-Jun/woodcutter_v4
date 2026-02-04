/**
 * Guillotine Bin Packing Algorithm
 * 두 가지 모드 지원:
 * - horizontal: Strip-based (절단 편리)
 * - auto: 가로우선 vs 스트립효율 비교 후 최적 선택
 */

class GuillotinePacker {
    constructor(width, height, kerf = 0) {
        this.binWidth = width;
        this.binHeight = height;
        this.kerf = kerf;
    }

    /**
     * 메인 패킹 메서드
     * @param {Array} items - [{width, height, qty, rotatable}]
     * @param {string} mode - 'horizontal' | 'auto'
     */
    pack(items, mode = 'auto') {
        if (mode === 'horizontal') {
            return this.packHorizontal(items);
        }

        // auto: 2단계 리핑-재적용 전략
        const result = this.packRipReapply(items);
        result.mode = 'rip-reapply';
        return result;
    }

    /**
     * 가로 우선 (Strip-based) - 절단 편리
     */
    packHorizontal(items) {
        const expandedItems = this.expandItems(items, false);

        const bins = [];
        let remainingItems = [...expandedItems];

        while (remainingItems.length > 0) {
            const bin = new WidthStripBin(this.binWidth, this.binHeight, this.kerf);
            const result = bin.packWidthStrips(remainingItems);

            if (result.placed.length === 0) break;

            bins.push(result);
            remainingItems = result.unplaced;
        }

        return {
            bins,
            unplaced: remainingItems,
            totalEfficiency: this.calculateTotalEfficiency(bins),
            mode: 'horizontal'
        };
    }

    /**
     * 2단계 리핑-재적용 (Auto)
     * - 1단계: 전체 판재에 폭 스트립 배치
     * - 2단계: 남은 직사각형 잔여에 동일 로직 재적용
     */
    packRipReapply(items) {
        const expandedItems = this.expandItems(items, false);
        const bins = [];
        let remainingItems = [...expandedItems];

        while (remainingItems.length > 0) {
            const bin = new RipReapplyBin(this.binWidth, this.binHeight, this.kerf);
            const result = bin.pack(remainingItems);

            if (result.placed.length === 0) break;

            bins.push(result);
            remainingItems = result.unplaced;
        }

        return {
            bins,
            unplaced: remainingItems,
            totalEfficiency: this.calculateTotalEfficiency(bins),
            mode: 'rip-reapply'
        };
    }

    /**
     * 스트립 효율 (Strip-Enhanced Efficiency)
     * - 비슷한 높이 그룹화 (허용 오차 내)
     * - 같은 크기 부품은 같은 방향으로 정규화
     * - 스트립 우선 배치 + 남은 공간 활용
     */
    packStripEfficiency(items) {
        const expandedItems = this.expandItems(items, false);

        // 회전 가능한 부품은 높이 작게 정규화 (스트립 효율을 위해)
        expandedItems.forEach(item => {
            if (item.rotatable && item.width < item.height) {
                [item.width, item.height] = [item.height, item.width];
                item.rotated = !item.rotated;
            }
        });

        // 높이 그룹화 (10% 허용 오차)
        const heightGroups = this.groupByHeight(expandedItems, 0.1);

        // 그룹별 면적 합계 계산 후 내림차순 정렬
        const sortedGroups = Object.entries(heightGroups)
            .map(([height, items]) => ({
                height: parseFloat(height),
                items: items,
                totalArea: items.reduce((sum, i) => sum + i.width * i.height, 0)
            }))
            .sort((a, b) => b.height - a.height); // 높이 큰 순

        const bins = [];
        let allItems = sortedGroups.flatMap(g => g.items);

        while (allItems.length > 0) {
            const bin = new StripEfficiencyBin(this.binWidth, this.binHeight, this.kerf);
            const result = bin.packWithStrips(allItems);

            if (result.placed.length === 0) break;

            bins.push(result);
            allItems = result.unplaced;
        }

        return {
            bins,
            unplaced: allItems,
            totalEfficiency: this.calculateTotalEfficiency(bins),
            mode: 'strip-efficiency'
        };
    }

    /**
     * 높이별 그룹화 (허용 오차 적용)
     */
    groupByHeight(items, tolerance) {
        const groups = {};
        const sortedItems = [...items].sort((a, b) => b.height - a.height);

        for (const item of sortedItems) {
            let foundGroup = false;

            // 기존 그룹에서 허용 오차 내 높이 찾기
            for (const groupHeight of Object.keys(groups)) {
                const gh = parseFloat(groupHeight);
                const diff = Math.abs(item.height - gh) / Math.max(item.height, gh);

                if (diff <= tolerance) {
                    groups[groupHeight].push(item);
                    foundGroup = true;
                    break;
                }
            }

            if (!foundGroup) {
                groups[item.height] = [item];
            }
        }

        return groups;
    }

    /**
     * 부품을 수량만큼 펼치기
     */
    expandItems(items, normalizeHeight) {
        const expandedItems = [];
        items.forEach((item, idx) => {
            for (let i = 0; i < item.qty; i++) {
                let w = item.width;
                let h = item.height;
                let rotated = false;

                // normalizeHeight: Strip용 - 높이 작게 정규화
                if (normalizeHeight && item.rotatable && w < h) {
                    [w, h] = [h, w];
                    rotated = true;
                }

                expandedItems.push({
                    width: w,
                    height: h,
                    id: `${idx}-${i}`,
                    originalId: idx,
                    originalWidth: item.width,
                    originalHeight: item.height,
                    rotatable: item.rotatable !== false,
                    rotated: rotated
                });
            }
        });
        return expandedItems;
    }

    calculateTotalEfficiency(bins) {
        if (bins.length === 0) return 0;
        const totalUsed = bins.reduce((sum, b) => sum + b.usedArea, 0);
        const totalArea = bins.reduce((sum, b) => sum + b.totalArea, 0);
        return (totalUsed / totalArea) * 100;
    }
}

/**
 * Width-based Strip Bin (가로우선: 동일 폭 스트립)
 * 높이 방향(짧은 쪽)으로 리핑 후 크로스컷
 */
class WidthStripBin {
    constructor(width, height, kerf) {
        this.width = width;
        this.height = height;
        this.kerf = kerf;
        this.placed = [];
        this.cutLinesX = new Set();
        this.cutLinesY = new Set();
    }

    packWidthStrips(items) {
        const unplaced = [];

        // 폭별 그룹화 (동일 폭만 같은 스트립)
        const widthGroups = {};
        items.forEach(original => {
            const item = { ...original };
            if (item.rotatable) {
                const fits = item.width <= this.width && item.height <= this.height;
                const fitsRotated = item.height <= this.width && item.width <= this.height;
                if (!fits && fitsRotated) {
                    [item.width, item.height] = [item.height, item.width];
                    item.rotated = !item.rotated;
                }
            }
            if (item.width > this.width || item.height > this.height) {
                unplaced.push({ ...original });
                return;
            }
            const w = item.width;
            if (!widthGroups[w]) widthGroups[w] = [];
            widthGroups[w].push(item);
        });

        // 폭 빈도 내림차순, 동일 빈도면 폭 큰 순
        const sortedWidths = Object.entries(widthGroups)
            .map(([width, itemsForWidth]) => ({
                width: parseFloat(width),
                items: itemsForWidth,
                count: itemsForWidth.length
            }))
            .sort((a, b) => (b.count - a.count) || (b.width - a.width));

        let currentX = 0;

        for (const group of sortedWidths) {
            const stripWidth = group.width;
            const groupItems = group.items;

            // 높이 큰 순 정렬 (배치는 작은 것부터)
            groupItems.sort((a, b) => b.height - a.height);

            while (groupItems.length > 0) {
                const neededWidth = currentX === 0 ? stripWidth : stripWidth + this.kerf;
                if (currentX + neededWidth > this.width) break;

                const stripX = currentX === 0 ? 0 : currentX + this.kerf;
                let currentY = 0;
                const placedInStrip = [];

                for (let i = groupItems.length - 1; i >= 0; i--) {
                    const item = groupItems[i];
                    const neededHeight = currentY === 0 ? item.height : item.height + this.kerf;

                    if (currentY + neededHeight <= this.height) {
                        const y = currentY === 0 ? 0 : currentY + this.kerf;

                        this.placed.push({
                            ...item,
                            x: stripX,
                            y: y,
                            width: item.width,
                            height: item.height
                        });

                        if (y + item.height < this.height) {
                            this.cutLinesY.add(y + item.height);
                        }

                        currentY = y + item.height;
                        placedInStrip.push(i);
                    }
                }

                if (placedInStrip.length === 0) break;

                for (let i = 0; i < placedInStrip.length; i++) {
                    groupItems.splice(placedInStrip[i], 1);
                }

                if (stripX + stripWidth < this.width) {
                    this.cutLinesX.add(stripX + stripWidth);
                }

                currentX = stripX + stripWidth;
            }

            if (groupItems.length > 0) {
                unplaced.push(...groupItems);
            }
        }

        const usedArea = this.placed.reduce((sum, p) => sum + p.width * p.height, 0);
        const totalArea = this.width * this.height;

        return {
            placed: this.placed,
            unplaced,
            efficiency: (usedArea / totalArea) * 100,
            usedArea,
            totalArea,
            cuttingCount: this.cutLinesX.size + this.cutLinesY.size
        };
    }
}

/**
 * 2단계 리핑-재적용 Bin
 */
class RipReapplyBin {
    constructor(width, height, kerf) {
        this.width = width;
        this.height = height;
        this.kerf = kerf;
        this.placed = [];
        this.cutLinesX = new Set();
        this.cutLinesY = new Set();
    }

    pack(items) {
        let remaining = items.map(i => ({ ...i }));
        const rootRect = { x: 0, y: 0, width: this.width, height: this.height };

        // 1단계: 전체 판재에 1차 배치
        let result = this.packInRect(rootRect, remaining, { allowAllGroups: false, pairSameWidth: true });
        this.placed.push(...result.placed);
        this.mergeCutLines(result.cutLinesX, result.cutLinesY);
        remaining = result.unplaced;

        let freeRects = result.freeRects;

        // 2단계: 잔여 영역에 재적용 (추가 배치가 없으면 중단)
        while (true) {
            let placedAny = false;
            const nextFreeRects = [];

            freeRects.sort((a, b) => (b.width * b.height) - (a.width * a.height));

            for (const rect of freeRects) {
                if (remaining.length === 0) {
                    nextFreeRects.push(rect);
                    continue;
                }

                result = this.packInRect(rect, remaining, { allowAllGroups: true, pairSameWidth: false });

                if (result.placed.length > 0) {
                    placedAny = true;
                    this.placed.push(...result.placed);
                    this.mergeCutLines(result.cutLinesX, result.cutLinesY);
                    remaining = result.unplaced;
                    nextFreeRects.push(...result.freeRects);
                } else {
                    nextFreeRects.push(rect);
                }
            }

            freeRects = nextFreeRects;

            if (!placedAny) break;
        }

        const usedArea = this.placed.reduce((sum, p) => sum + p.width * p.height, 0);
        const totalArea = this.width * this.height;

        return {
            placed: this.placed,
            unplaced: remaining,
            efficiency: (usedArea / totalArea) * 100,
            usedArea,
            totalArea,
            cuttingCount: this.cutLinesX.size + this.cutLinesY.size
        };
    }

    mergeCutLines(xLines, yLines) {
        xLines.forEach(v => this.cutLinesX.add(v));
        yLines.forEach(v => this.cutLinesY.add(v));
    }

    packInRect(rect, items, options = {}) {
        // 리핑 방향: 짧은 축(높이)이 기준일 때 폭 스트립 사용
        const useWidthAxis = rect.height <= rect.width;
        if (useWidthAxis) {
            return this.packInRectByWidth(rect, items, options);
        }
        return this.packInRectByHeight(rect, items, options);
    }

    packInRectByWidth(rect, items, options = {}) {
        const placed = [];
        const cutLinesX = new Set();
        const cutLinesY = new Set();
        const freeRects = [];
        const placedIds = new Set();

        const widthGroups = {};

        items.forEach(original => {
            const item = { ...original };
            if (item.rotatable) {
                const fits = item.width <= rect.width && item.height <= rect.height;
                const fitsRotated = item.height <= rect.width && item.width <= rect.height;
                if (!fits && fitsRotated) {
                    [item.width, item.height] = [item.height, item.width];
                    item.rotated = !item.rotated;
                }
            }
            if (item.width > rect.width || item.height > rect.height) return;
            const w = item.width;
            if (!widthGroups[w]) widthGroups[w] = [];
            widthGroups[w].push(item);
        });

        const sortedWidths = Object.entries(widthGroups)
            .map(([width, groupItems]) => ({
                width: parseFloat(width),
                items: groupItems,
                count: groupItems.length
            }))
            .sort((a, b) => (b.count - a.count) || (b.width - a.width));

        const allowAllGroups = options.allowAllGroups !== false;
        const pairSameWidth = options.pairSameWidth === true;
        const effectiveWidths = allowAllGroups ? sortedWidths : sortedWidths.slice(0, 2);

        let currentX = rect.x;

        for (const group of effectiveWidths) {
            const baseWidth = group.width;
            const groupItems = group.items;
            const canPair = pairSameWidth
                && groupItems.length >= 2
                && baseWidth * 2 <= rect.width;
            const stripWidth = canPair ? baseWidth * 2 : baseWidth;

            groupItems.sort((a, b) => b.height - a.height);

            while (groupItems.length > 0) {
                const neededWidth = currentX === rect.x ? stripWidth : stripWidth + this.kerf;
                if (currentX + neededWidth > rect.x + rect.width) break;

                const stripX = currentX === rect.x ? rect.x : currentX + this.kerf;
                let currentY = rect.y;
                const placedInStrip = [];

                if (canPair) {
                    const takePair = () => {
                        for (let i = groupItems.length - 1; i >= 0; i--) {
                            const first = groupItems[i];
                            for (let j = i - 1; j >= 0; j--) {
                                const second = groupItems[j];
                                if (second.height === first.height) {
                                    return { first, second, i, j };
                                }
                            }
                        }
                        return null;
                    };

                    while (groupItems.length > 1) {
                        const pair = takePair();
                        if (!pair) break;

                        const itemA = pair.first;
                        const itemB = pair.second;
                        const neededHeight = currentY === rect.y ? itemA.height : itemA.height + this.kerf;

                        if (currentY + neededHeight > rect.y + rect.height) break;

                        const y = currentY === rect.y ? rect.y : currentY + this.kerf;

                        placed.push({
                            ...itemA,
                            x: stripX,
                            y: y,
                            width: itemA.width,
                            height: itemA.height
                        });
                        placed.push({
                            ...itemB,
                            x: stripX + itemA.width,
                            y: y,
                            width: itemB.width,
                            height: itemB.height
                        });

                        placedIds.add(itemA.id);
                        placedIds.add(itemB.id);

                        if (y + itemA.height < rect.y + rect.height) {
                            cutLinesY.add(y + itemA.height);
                        }

                        currentY = y + itemA.height;
                        placedInStrip.push(pair.i, pair.j);
                    }
                } else {
                    for (let i = groupItems.length - 1; i >= 0; i--) {
                        const item = groupItems[i];
                        const neededHeight = currentY === rect.y ? item.height : item.height + this.kerf;

                        if (currentY + neededHeight <= rect.y + rect.height) {
                            const y = currentY === rect.y ? rect.y : currentY + this.kerf;

                            placed.push({
                                ...item,
                                x: stripX,
                                y: y,
                                width: item.width,
                                height: item.height
                            });
                            placedIds.add(item.id);

                            if (y + item.height < rect.y + rect.height) {
                                cutLinesY.add(y + item.height);
                            }

                            currentY = y + item.height;
                            placedInStrip.push(i);
                        }
                    }
                }

                if (placedInStrip.length === 0) break;
                const beforeCount = groupItems.length;
                groupItems = groupItems.filter(item => !placedIds.has(item.id));
                if (groupItems.length === beforeCount) break;

                if (stripX + stripWidth < rect.x + rect.width) {
                    cutLinesX.add(stripX + stripWidth);
                }

                const bottomY = currentY + this.kerf;
                const bottomHeight = rect.y + rect.height - bottomY;
                if (bottomHeight > 0) {
                    freeRects.push({
                        x: stripX,
                        y: bottomY,
                        width: stripWidth,
                        height: bottomHeight
                    });
                }

                currentX = stripX + stripWidth;
            }

        }

        const rightX = currentX === rect.x ? rect.x : currentX + this.kerf;
        const rightWidth = rect.x + rect.width - rightX;
        if (rightWidth > 0) {
            freeRects.push({
                x: rightX,
                y: rect.y,
                width: rightWidth,
                height: rect.height
            });
        }

        const unplaced = items.filter(item => !placedIds.has(item.id));

        return {
            placed,
            unplaced,
            freeRects,
            cutLinesX,
            cutLinesY
        };
    }

    packInRectByHeight(rect, items, options = {}) {
        const placed = [];
        const cutLinesX = new Set();
        const cutLinesY = new Set();
        const freeRects = [];
        const placedIds = new Set();

        const heightGroups = {};

        items.forEach(original => {
            const item = { ...original };
            if (item.rotatable) {
                const fits = item.width <= rect.width && item.height <= rect.height;
                const fitsRotated = item.height <= rect.width && item.width <= rect.height;
                if (!fits && fitsRotated) {
                    [item.width, item.height] = [item.height, item.width];
                    item.rotated = !item.rotated;
                }
            }
            if (item.width > rect.width || item.height > rect.height) return;
            const h = item.height;
            if (!heightGroups[h]) heightGroups[h] = [];
            heightGroups[h].push(item);
        });

        const sortedHeights = Object.entries(heightGroups)
            .map(([height, groupItems]) => ({
                height: parseFloat(height),
                items: groupItems,
                count: groupItems.length
            }))
            .sort((a, b) => (b.count - a.count) || (b.height - a.height));

        const allowAllGroups = options.allowAllGroups !== false;
        const effectiveHeights = allowAllGroups ? sortedHeights : sortedHeights.slice(0, 2);

        let currentY = rect.y;

        for (const group of effectiveHeights) {
            const stripHeight = group.height;
            const groupItems = group.items;

            groupItems.sort((a, b) => b.width - a.width);

            while (groupItems.length > 0) {
                const neededHeight = currentY === rect.y ? stripHeight : stripHeight + this.kerf;
                if (currentY + neededHeight > rect.y + rect.height) break;

                const stripY = currentY === rect.y ? rect.y : currentY + this.kerf;
                let currentX = rect.x;
                const placedInStrip = [];

                for (let i = groupItems.length - 1; i >= 0; i--) {
                    const item = groupItems[i];
                    const neededWidth = currentX === rect.x ? item.width : item.width + this.kerf;

                    if (currentX + neededWidth <= rect.x + rect.width) {
                        const x = currentX === rect.x ? rect.x : currentX + this.kerf;

                        placed.push({
                            ...item,
                            x: x,
                            y: stripY,
                            width: item.width,
                            height: item.height
                        });
                        placedIds.add(item.id);

                        if (x + item.width < rect.x + rect.width) {
                            cutLinesX.add(x + item.width);
                        }

                        currentX = x + item.width;
                        placedInStrip.push(i);
                    }
                }

                if (placedInStrip.length === 0) break;

                for (let i = 0; i < placedInStrip.length; i++) {
                    groupItems.splice(placedInStrip[i], 1);
                }

                if (stripY + stripHeight < rect.y + rect.height) {
                    cutLinesY.add(stripY + stripHeight);
                }

                const rightX = currentX === rect.x ? rect.x : currentX + this.kerf;
                const rightWidth = rect.x + rect.width - rightX;
                if (rightWidth > 0) {
                    freeRects.push({
                        x: rightX,
                        y: stripY,
                        width: rightWidth,
                        height: stripHeight
                    });
                }

                currentY = stripY + stripHeight;
            }

        }

        const bottomY = currentY === rect.y ? rect.y : currentY + this.kerf;
        const bottomHeight = rect.y + rect.height - bottomY;
        if (bottomHeight > 0) {
            freeRects.push({
                x: rect.x,
                y: bottomY,
                width: rect.width,
                height: bottomHeight
            });
        }

        const unplaced = items.filter(item => !placedIds.has(item.id));

        return {
            placed,
            unplaced,
            freeRects,
            cutLinesX,
            cutLinesY
        };
    }
}

/**
 * Strip-based Bin (가로 우선)
 */
class StripBin {
    constructor(width, height, kerf) {
        this.width = width;
        this.height = height;
        this.kerf = kerf;
        this.placed = [];
        this.currentY = 0;
        this.cutLinesX = new Set();
        this.cutLinesY = new Set();
    }

    packStrips(items) {
        const unplaced = [];

        // 높이별 그룹화
        const heightGroups = {};
        items.forEach(item => {
            const h = item.height;
            if (!heightGroups[h]) heightGroups[h] = [];
            heightGroups[h].push({ ...item });
        });

        // 높이 내림차순
        const sortedHeights = Object.keys(heightGroups)
            .map(Number)
            .sort((a, b) => b - a);

        for (const stripHeight of sortedHeights) {
            const groupItems = heightGroups[stripHeight];
            groupItems.sort((a, b) => b.width - a.width);

            while (groupItems.length > 0) {
                const spaceNeeded = this.currentY === 0 ? stripHeight : stripHeight + this.kerf;
                const canFitStrip = this.currentY + spaceNeeded <= this.height;

                if (!canFitStrip) {
                    unplaced.push(...groupItems);
                    break;
                }

                const stripY = this.currentY === 0 ? 0 : this.currentY + this.kerf;
                let currentX = 0;
                const placedInStrip = [];

                for (let i = groupItems.length - 1; i >= 0; i--) {
                    const item = groupItems[i];
                    const neededWidth = currentX === 0 ? item.width : item.width + this.kerf;

                    if (currentX + neededWidth <= this.width) {
                        const x = currentX === 0 ? 0 : currentX + this.kerf;

                        this.placed.push({
                            ...item,
                            x: x,
                            y: stripY,
                            width: item.width,
                            height: item.height
                        });

                        if (x + item.width < this.width) {
                            this.cutLinesX.add(x + item.width);
                        }

                        currentX = x + item.width;
                        placedInStrip.push(i);
                    }
                }

                for (let i = 0; i < placedInStrip.length; i++) {
                    groupItems.splice(placedInStrip[i], 1);
                }

                if (placedInStrip.length === 0) {
                    unplaced.push(...groupItems);
                    break;
                }

                if (stripY + stripHeight < this.height) {
                    this.cutLinesY.add(stripY + stripHeight);
                }
                this.currentY = stripY + stripHeight;
            }
        }

        const usedArea = this.placed.reduce((sum, p) => sum + p.width * p.height, 0);
        const totalArea = this.width * this.height;

        return {
            placed: this.placed,
            unplaced,
            efficiency: (usedArea / totalArea) * 100,
            usedArea,
            totalArea,
            cuttingCount: this.cutLinesX.size + this.cutLinesY.size
        };
    }
}

/**
 * Strip-Enhanced Efficiency Bin (스트립 효율)
 * 스트립 구조 유지하면서 남은 공간 활용
 */
class StripEfficiencyBin {
    constructor(width, height, kerf) {
        this.width = width;
        this.height = height;
        this.kerf = kerf;
        this.placed = [];
        this.freeRects = []; // 남은 공간 목록
        this.cutLinesX = new Set();
        this.cutLinesY = new Set();
    }

    packWithStrips(items) {
        const unplaced = [];
        const itemsCopy = items.map(i => ({ ...i }));

        // 1단계: 높이별 그룹화 (정확한 높이 기준)
        const heightGroups = {};
        itemsCopy.forEach(item => {
            const h = item.height;
            if (!heightGroups[h]) heightGroups[h] = [];
            heightGroups[h].push(item);
        });

        // 높이 내림차순 정렬
        const sortedHeights = Object.keys(heightGroups)
            .map(Number)
            .sort((a, b) => b - a);

        let currentY = 0;

        // 2단계: 스트립 배치
        for (const stripHeight of sortedHeights) {
            const groupItems = heightGroups[stripHeight];
            // 너비 내림차순 정렬
            groupItems.sort((a, b) => b.width - a.width);

            while (groupItems.length > 0) {
                const spaceNeeded = currentY === 0 ? stripHeight : stripHeight + this.kerf;
                const canFitStrip = currentY + spaceNeeded <= this.height;

                if (!canFitStrip) break;

                const stripY = currentY === 0 ? 0 : currentY + this.kerf;
                let currentX = 0;
                const placedInStrip = [];
                let stripMaxWidth = 0;

                // 같은 높이 부품을 스트립에 배치
                for (let i = groupItems.length - 1; i >= 0; i--) {
                    const item = groupItems[i];
                    const neededWidth = currentX === 0 ? item.width : item.width + this.kerf;

                    if (currentX + neededWidth <= this.width) {
                        const x = currentX === 0 ? 0 : currentX + this.kerf;

                        this.placed.push({
                            ...item,
                            x: x,
                            y: stripY,
                            width: item.width,
                            height: item.height
                        });

                        if (x + item.width < this.width) {
                            this.cutLinesX.add(x + item.width);
                        }

                        currentX = x + item.width;
                        stripMaxWidth = Math.max(stripMaxWidth, currentX);
                        placedInStrip.push(i);
                    }
                }

                // 배치된 항목 제거
                for (let i = 0; i < placedInStrip.length; i++) {
                    groupItems.splice(placedInStrip[i], 1);
                }

                if (placedInStrip.length === 0) break;

                // 스트립 우측 남은 공간 기록
                if (stripMaxWidth < this.width) {
                    const rightSpace = {
                        x: stripMaxWidth + this.kerf,
                        y: stripY,
                        width: this.width - stripMaxWidth - this.kerf,
                        height: stripHeight
                    };
                    if (rightSpace.width > 0) {
                        this.freeRects.push(rightSpace);
                    }
                }

                if (stripY + stripHeight < this.height) {
                    this.cutLinesY.add(stripY + stripHeight);
                }
                currentY = stripY + stripHeight;
            }
        }

        // 3단계: 남은 부품들을 unplaced에 모으기
        for (const height of sortedHeights) {
            const remaining = heightGroups[height];
            if (remaining.length > 0) {
                unplaced.push(...remaining);
            }
        }

        // 4단계: 남은 공간에 작은 부품 배치 시도 (같은 방향 유지)
        // 면적 작은 순으로 정렬하여 작은 공간에 맞추기
        const sortedFreeRects = [...this.freeRects].sort((a, b) =>
            (a.width * a.height) - (b.width * b.height)
        );

        for (const freeRect of sortedFreeRects) {
            if (freeRect.width <= 0 || freeRect.height <= 0) continue;

            // unplaced에서 이 공간에 맞는 부품 찾기
            for (let i = unplaced.length - 1; i >= 0; i--) {
                const item = unplaced[i];

                // 정방향으로만 시도 (회전 없이)
                const canFitW = freeRect.width >= item.width;
                const canFitH = freeRect.height >= item.height;

                if (canFitW && canFitH) {
                    this.placed.push({
                        ...item,
                        x: freeRect.x,
                        y: freeRect.y,
                        width: item.width,
                        height: item.height
                    });

                    // 공간 분할 (수평 분할 우선)
                    const rightWidth = freeRect.width - item.width - this.kerf;
                    const bottomHeight = freeRect.height - item.height - this.kerf;

                    if (rightWidth > 0) {
                        this.freeRects.push({
                            x: freeRect.x + item.width + this.kerf,
                            y: freeRect.y,
                            width: rightWidth,
                            height: item.height
                        });
                        this.cutLinesX.add(freeRect.x + item.width + this.kerf);
                    }
                    if (bottomHeight > 0) {
                        this.freeRects.push({
                            x: freeRect.x,
                            y: freeRect.y + item.height + this.kerf,
                            width: freeRect.width,
                            height: bottomHeight
                        });
                        this.cutLinesY.add(freeRect.y + item.height + this.kerf);
                    }

                    unplaced.splice(i, 1);
                    break; // 이 공간에는 하나만 배치
                }
            }
        }

        // 5단계: 하단 남은 공간에 추가 배치 시도
        const bottomY = currentY === 0 ? 0 : currentY + this.kerf;
        const bottomHeight = this.height - bottomY;

        if (bottomHeight > 0 && unplaced.length > 0) {
            // 남은 부품 중 이 공간에 맞는 것들 배치
            let bottomX = 0;

            for (let i = unplaced.length - 1; i >= 0; i--) {
                const item = unplaced[i];

                // 정방향 시도
                const canFitW = bottomX === 0
                    ? item.width <= this.width
                    : bottomX + item.width + this.kerf <= this.width;
                const canFitH = item.height <= bottomHeight;

                if (canFitW && canFitH) {
                    const x = bottomX === 0 ? 0 : bottomX + this.kerf;

                    this.placed.push({
                        ...item,
                        x: x,
                        y: bottomY,
                        width: item.width,
                        height: item.height
                    });

                    if (x + item.width < this.width) {
                        this.cutLinesX.add(x + item.width);
                    }

                    bottomX = x + item.width;
                    unplaced.splice(i, 1);
                }
            }

            // 각 부품의 하단 경계면 절단 (기존 stripY+stripHeight 로직과 중복을 피하기 위해 Set이 자동 처리)
            this.placed.filter(p => p.y === bottomY).forEach(p => {
                if (p.y + p.height < this.height) {
                    this.cutLinesY.add(p.y + p.height);
                }
            });
        }

        const usedArea = this.placed.reduce((sum, p) => sum + p.width * p.height, 0);
        const totalArea = this.width * this.height;

        return {
            placed: this.placed,
            unplaced,
            efficiency: (usedArea / totalArea) * 100,
            usedArea,
            totalArea,
            cuttingCount: this.cutLinesX.size + this.cutLinesY.size
        };
    }
}

// 전역 노출
window.GuillotinePacker = GuillotinePacker;
