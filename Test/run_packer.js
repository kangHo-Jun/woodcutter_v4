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

const defaultScenarios = [
    {
        name: 'case-1-400x300-35-horizontal',
        board: { width: 1220, height: 2440, kerf: 4.2 },
        mode: 'horizontal',
        parts: [{ width: 400, height: 300, qty: 35, rotatable: true }]
    },
    {
        name: 'case-2-400x300-35-auto',
        board: { width: 1220, height: 2440, kerf: 4.2 },
        mode: 'auto',
        parts: [{ width: 400, height: 300, qty: 35, rotatable: true }]
    },
    {
        name: 'case-3-mixed-auto',
        board: { width: 1220, height: 2440, kerf: 4.2 },
        mode: 'auto',
        parts: [
            { width: 1000, height: 800, qty: 9, rotatable: true },
            { width: 910, height: 650, qty: 9, rotatable: true },
            { width: 530, height: 450, qty: 9, rotatable: true }
        ]
    }
];

function summarizePlaced(bins) {
    const counts = new Map();
    let placedTotal = 0;

    bins.forEach(bin => {
        bin.placed.forEach(p => {
            const ow = p.originalWidth ?? p.width;
            const oh = p.originalHeight ?? p.height;
            const key = `${ow}x${oh}`;
            counts.set(key, (counts.get(key) || 0) + 1);
            placedTotal += 1;
        });
    });

    return { counts, placedTotal };
}

function printScenarioResult(name, result) {
    const { counts, placedTotal } = summarizePlaced(result.bins);

    console.log(`\n=== ${name} ===`);
    console.log(`mode: ${result.mode}`);
    console.log(`bins: ${result.bins.length}`);
    console.log(`placed: ${placedTotal}`);
    console.log(`unplaced: ${result.unplaced.length}`);
    console.log(`efficiency: ${result.totalEfficiency.toFixed(2)}%`);

    console.log('placed counts:');
    for (const [key, value] of counts.entries()) {
        console.log(`- ${key}: ${value}`);
    }

    console.log('bins detail:');
    result.bins.forEach((bin, idx) => {
        console.log(
            `- bin ${idx + 1}: placed ${bin.placed.length}, ` +
            `cuts ${bin.cuttingCount}, efficiency ${bin.efficiency.toFixed(2)}%`
        );
    });
}

function runScenario(scenario) {
    const packer = new global.GuillotinePacker(
        scenario.board.width,
        scenario.board.height,
        scenario.board.kerf
    );
    const result = packer.pack(scenario.parts, scenario.mode);
    printScenarioResult(scenario.name, result);
}

const inputPath = process.argv[2];
if (inputPath) {
    const raw = fs.readFileSync(path.resolve(process.cwd(), inputPath), 'utf8');
    const scenario = JSON.parse(raw);
    scenario.name = scenario.name || path.basename(inputPath);
    runScenario(scenario);
} else {
    defaultScenarios.forEach(runScenario);
}
