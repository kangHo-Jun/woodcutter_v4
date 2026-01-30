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

        // auto: 두 알고리즘 비교
        const resultA = this.packHorizontal(items);
        const resultB = this.packStripEfficiency(items);

        // 판재 수 비교: 스트립효율이 적으면 스트립효율, 아니면 가로우선
        if (resultB.bins.length < resultA.bins.length) {
            resultB.mode = 'strip-efficiency';
            return resultB;
        }
        resultA.mode = 'horizontal';
        return resultA;
    }

    /**
     * 가로 우선 (Strip-based) - 절단 편리
     */
    packHorizontal(items) {
        const expandedItems = this.expandItems(items, true);

        const bins = [];
        let remainingItems = [...expandedItems];

        while (remainingItems.length > 0) {
            const bin = new StripBin(this.binWidth, this.binHeight, this.kerf);
            const result = bin.packStrips(remainingItems);

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

                        if (currentX > 0) {
                            this.cutLinesX.add(x);
                        }

                        currentX = x + item.width;
                        placedInStrip.push(i);
                    }
                }

                for (let i = placedInStrip.length - 1; i >= 0; i--) {
                    groupItems.splice(placedInStrip[i], 1);
                }

                if (placedInStrip.length === 0) {
                    unplaced.push(...groupItems);
                    break;
                }

                if (stripY > 0) {
                    this.cutLinesY.add(stripY);
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

                        if (currentX > 0) {
                            this.cutLinesX.add(x);
                        }

                        currentX = x + item.width;
                        stripMaxWidth = Math.max(stripMaxWidth, currentX);
                        placedInStrip.push(i);
                    }
                }

                // 배치된 항목 제거
                for (let i = placedInStrip.length - 1; i >= 0; i--) {
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

                if (stripY > 0) {
                    this.cutLinesY.add(stripY);
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

                    if (bottomX > 0) {
                        this.cutLinesX.add(x);
                    }

                    bottomX = x + item.width;
                    unplaced.splice(i, 1);
                }
            }

            if (bottomY > 0 && this.placed.some(p => p.y === bottomY)) {
                this.cutLinesY.add(bottomY);
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

// 전역 노출
window.GuillotinePacker = GuillotinePacker;
