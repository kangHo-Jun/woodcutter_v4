#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const packerPath = path.resolve(__dirname, '../js/packer.js');
const packerSource = fs.readFileSync(packerPath, 'utf8');

global.window = global;
vm.runInThisContext(packerSource, { filename: 'packer.js' });

if (!global.GuillotinePacker) {
    console.error('GuillotinePacker not found. Check js/packer.js export.');
    process.exit(1);
}

const scenarios = [
    {
        name: 'regression-baseline',
        board: { width: 2440, height: 1220, kerf: 4.2 },
        mode: 'auto',
        parts: [
            { width: 1000, height: 500, qty: 10, rotatable: true },
            { width: 700, height: 500, qty: 10, rotatable: true },
            { width: 500, height: 400, qty: 35, rotatable: true }
        ],
        expected: { bins: 7, cuts: 44, unplaced: 0 }
    },
    {
        name: 'long-parts-heavy',
        board: { width: 2440, height: 1220, kerf: 4.2 },
        mode: 'auto',
        parts: [
            { width: 2300, height: 280, qty: 10, rotatable: true },
            { width: 2100, height: 300, qty: 8, rotatable: true },
            { width: 1800, height: 420, qty: 6, rotatable: true }
        ]
    },
    {
        name: 'many-small-parts',
        board: { width: 2440, height: 1220, kerf: 4.2 },
        mode: 'auto',
        parts: [
            { width: 120, height: 80, qty: 120, rotatable: true },
            { width: 95, height: 60, qty: 160, rotatable: true },
            { width: 70, height: 50, qty: 220, rotatable: true }
        ]
    },
    {
        name: 'no-rotation-case',
        board: { width: 2440, height: 1220, kerf: 4.2 },
        mode: 'auto',
        parts: [
            { width: 900, height: 350, qty: 20, rotatable: false },
            { width: 600, height: 450, qty: 15, rotatable: false },
            { width: 300, height: 700, qty: 10, rotatable: false }
        ]
    }
];

function runScenario(scenario) {
    const packer = new global.GuillotinePacker(
        scenario.board.width,
        scenario.board.height,
        scenario.board.kerf
    );

    const result = packer.pack(scenario.parts, scenario.mode);
    const cuts = result.bins.reduce((sum, bin) => sum + (bin.cuttingCount || 0), 0);

    const summary = {
        name: scenario.name,
        bins: result.bins.length,
        cuts,
        unplaced: result.unplaced.length
    };

    if (scenario.expected) {
        const ok = summary.bins === scenario.expected.bins
            && summary.cuts === scenario.expected.cuts
            && summary.unplaced === scenario.expected.unplaced;

        if (!ok) {
            console.error(`REGRESSION FAILED: ${scenario.name}`);
            console.error(`expected bins=${scenario.expected.bins}, cuts=${scenario.expected.cuts}, unplaced=${scenario.expected.unplaced}`);
            console.error(`actual   bins=${summary.bins}, cuts=${summary.cuts}, unplaced=${summary.unplaced}`);
            process.exit(1);
        }
    }

    return summary;
}

const results = scenarios.map(runScenario);
results.forEach(r => {
    console.log(`${r.name}: 판재 ${r.bins}장 | 절단 ${r.cuts}회 | 미배치 ${r.unplaced}개`);
});
