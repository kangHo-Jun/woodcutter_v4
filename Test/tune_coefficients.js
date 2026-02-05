#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const packerPath = path.resolve(__dirname, '../js/packer.js');
const packerSource = fs.readFileSync(packerPath, 'utf8');

global.window = global;
vm.runInThisContext(packerSource, { filename: 'packer.js' });

const outputPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : path.resolve(__dirname, 'tuning_results.json');

const scenarios = [
    {
        name: 'baseline',
        board: { width: 2440, height: 1220, kerf: 4.2 },
        parts: [
            { width: 1000, height: 500, qty: 10, rotatable: true },
            { width: 700, height: 500, qty: 10, rotatable: true },
            { width: 500, height: 400, qty: 35, rotatable: true }
        ],
        baseline: { bins: 7, cuts: 44, unplaced: 0 }
    },
    {
        name: 'long-parts-heavy',
        board: { width: 2440, height: 1220, kerf: 4.2 },
        parts: [
            { width: 2300, height: 280, qty: 10, rotatable: true },
            { width: 2100, height: 300, qty: 8, rotatable: true },
            { width: 1800, height: 420, qty: 6, rotatable: true }
        ],
        baseline: { bins: 7, cuts: 34, unplaced: 0 }
    },
    {
        name: 'many-small-parts',
        board: { width: 2440, height: 1220, kerf: 4.2 },
        parts: [
            { width: 120, height: 80, qty: 120, rotatable: true },
            { width: 95, height: 60, qty: 160, rotatable: true },
            { width: 70, height: 50, qty: 220, rotatable: true }
        ],
        baseline: { bins: 2, cuts: 179, unplaced: 0 }
    },
    {
        name: 'no-rotation-case',
        board: { width: 2440, height: 1220, kerf: 4.2 },
        parts: [
            { width: 900, height: 350, qty: 20, rotatable: false },
            { width: 600, height: 450, qty: 15, rotatable: false },
            { width: 300, height: 700, qty: 10, rotatable: false }
        ],
        baseline: { bins: 6, cuts: 50, unplaced: 0 }
    }
];

function runWithConfig(config) {
    AdaptiveGuillotineBin.prototype.computeSliverPenalty = function (freeRects) {
        let penalty = 0;
        freeRects.forEach(rect => {
            const widthSliver = rect.width < this.sliverThreshold;
            const heightSliver = rect.height < this.sliverThreshold;
            if (widthSliver && heightSliver) {
                penalty += config.sliverBoth;
            } else if (widthSliver || heightSliver) {
                penalty += config.sliverOne;
            }
        });
        return penalty;
    };

    AdaptiveGuillotineBin.prototype.computeDisconnectionPenalty = function (freeRects) {
        return Math.max(0, freeRects.length - 1) * config.disconnectionPerFragment;
    };

    const results = {};
    let totalCuts = 0;

    scenarios.forEach(scenario => {
        const packer = new global.GuillotinePacker(
            scenario.board.width,
            scenario.board.height,
            scenario.board.kerf
        );
        const result = packer.pack(scenario.parts, 'auto');
        const cuts = result.bins.reduce((sum, bin) => sum + (bin.cuttingCount || 0), 0);

        results[scenario.name] = {
            bins: result.bins.length,
            cuts,
            unplaced: result.unplaced.length
        };
        totalCuts += cuts;
    });

    results.totalCuts = totalCuts;
    return results;
}

function isFeasible(results) {
    return scenarios.every(scenario => {
        const actual = results[scenario.name];
        const base = scenario.baseline;
        const noPanelIncrease = actual.bins <= base.bins;
        const noUnplacedIncrease = actual.unplaced <= base.unplaced;
        const baselineGuard = scenario.name !== 'baseline' || (
            actual.bins === base.bins
            && actual.cuts <= base.cuts
            && actual.unplaced === base.unplaced
        );
        return noPanelIncrease && noUnplacedIncrease && baselineGuard;
    });
}

const configs = [];
for (const sliverOne of [20, 30, 40, 50, 60, 70]) {
    for (const ratio of [1.5, 2.0, 2.5]) {
        const sliverBoth = Math.round(sliverOne * ratio);
        for (const disconnectionPerFragment of [0, 1, 2, 3, 5, 8, 10]) {
            configs.push({ sliverOne, sliverBoth, disconnectionPerFragment });
        }
    }
}

const feasible = [];
configs.forEach(config => {
    const results = runWithConfig(config);
    if (isFeasible(results)) {
        feasible.push({ config, results });
    }
});

feasible.sort((a, b) => {
    const aBaseCuts = a.results.baseline.cuts;
    const bBaseCuts = b.results.baseline.cuts;
    if (aBaseCuts !== bBaseCuts) return aBaseCuts - bBaseCuts;
    if (a.results.totalCuts !== b.results.totalCuts) {
        return a.results.totalCuts - b.results.totalCuts;
    }
    if (a.config.sliverOne !== b.config.sliverOne) {
        return a.config.sliverOne - b.config.sliverOne;
    }
    if (a.config.sliverBoth !== b.config.sliverBoth) {
        return a.config.sliverBoth - b.config.sliverBoth;
    }
    return a.config.disconnectionPerFragment - b.config.disconnectionPerFragment;
});

const report = {
    formatVersion: 1,
    deterministic: true,
    scenarioBaselines: scenarios.map(s => ({
        name: s.name,
        baseline: s.baseline
    })),
    searchSpace: {
        sliverOne: [20, 30, 40, 50, 60, 70],
        ratio: [1.5, 2.0, 2.5],
        disconnectionPerFragment: [0, 1, 2, 3, 5, 8, 10]
    },
    totalConfigs: configs.length,
    feasibleConfigs: feasible.length,
    results: feasible
};

fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`saved=${outputPath}`);
console.log(`total_configs=${configs.length}`);
console.log(`feasible_configs=${feasible.length}`);
feasible.slice(0, 10).forEach(candidate => {
    console.log(JSON.stringify(candidate));
});
