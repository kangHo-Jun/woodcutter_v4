/**
 * 원가 계산 모듈
 * 재료비, 재단비, 사용률 자동 계산
 */

class CostCalculator {
    /**
     * 원가 계산
     * @param {Array} bins - 최적화 결과 (판재 배열)
     * @param {Object} settings - 설정 정보
     * @returns {Object} - {totalCuttingCost, totalCuts, usageRate}
     */
    static calculate(bins, settings) {
        if (!bins || bins.length === 0) {
            return {
                totalCuttingCost: 0,
                totalCuts: 0,
                usageRate: 0
            };
        }

        // 판재 수
        const panelCount = bins.length;

        // 총 절단 횟수 계산
        const totalCuts = bins.reduce((sum, bin) => sum + (bin.cuttingCount || 0), 0);

        // 트리밍 절단 횟수 (트리밍 사용 시 판재당 4회)
        const trimCuts = settings.enableTrim ? panelCount * 4 : 0;

        // 청구 가능한 절단 횟수 (트리밍 제외)
        const billableCuts = Math.max(0, totalCuts - trimCuts);

        // 총 재단비 = 청구 가능한 절단 횟수 × 절단 단가
        const totalCuttingCost = billableCuts * settings.cutPrice;

        // 사용 면적 및 전체 면적
        const usedArea = bins.reduce((sum, bin) => sum + (bin.usedArea || 0), 0);
        const totalArea = bins.reduce((sum, bin) => sum + (bin.totalArea || 0), 0);

        // 재료 사용률 (%)
        const usageRate = totalArea > 0 ? (usedArea / totalArea) * 100 : 0;

        return {
            totalCuttingCost,
            totalCuts,
            billableCuts,
            usageRate: parseFloat(usageRate.toFixed(2)),
            panelCount,
            trimCuts
        };
    }

    /**
     * 원가 정보를 포맷팅하여 반환
     * @param {Object} costInfo - 원가 정보
     * @returns {Object} - 포맷팅된 원가 정보
     */
    static format(costInfo) {
        return {
            totalCuttingCost: this.formatCurrency(costInfo.totalCuttingCost),
            totalCuts: `${costInfo.totalCuts}회`,
            usageRate: `${costInfo.usageRate}%`,
            billableCuts: `${costInfo.billableCuts}회`
        };
    }

    /**
     * 통화 포맷팅
     * @param {number} amount - 금액
     * @returns {string} - 포맷팅된 금액
     */
    static formatCurrency(amount) {
        return `${amount.toLocaleString('ko-KR')}원`;
    }

    /**
     * 원가 정보를 UI에 표시
     * @param {Object} costInfo - 원가 정보
     */
    static displayCostInfo(costInfo) {
        const formatted = this.format(costInfo);

        const elements = {
            totalCuttingCost: document.getElementById('totalCuttingCost'),
            totalCutCount: document.getElementById('totalCutCount'),
            materialUsageRate: document.getElementById('materialUsageRate')
        };

        if (elements.totalCuttingCost) {
            elements.totalCuttingCost.textContent = formatted.totalCuttingCost;
        }
        if (elements.totalCutCount) {
            elements.totalCutCount.textContent = formatted.totalCuts;
        }
        if (elements.materialUsageRate) {
            elements.materialUsageRate.textContent = formatted.usageRate;
        }
    }

    /**
     * 원가 정보 초기화
     */
    static clearCostInfo() {
        const elements = {
            totalCuttingCost: document.getElementById('totalCuttingCost'),
            totalCutCount: document.getElementById('totalCutCount'),
            materialUsageRate: document.getElementById('materialUsageRate')
        };

        Object.values(elements).forEach(el => {
            if (el) el.textContent = '-';
        });
    }

    /**
     * 두께에 따른 절단 단가 계산
     * @param {number} thickness - 두께 (mm)
     * @returns {number} - 절단 단가 (원)
     */
    static getCutPriceByThickness(thickness) {
        if (thickness <= 12) {
            return 1000;
        } else if (thickness >= 14.5 && thickness <= 23) {
            return 1500;
        } else if (thickness >= 24) {
            return 2000;
        }
        return 1500; // 기본값
    }
}

// 전역 노출
window.CostCalculator = CostCalculator;
