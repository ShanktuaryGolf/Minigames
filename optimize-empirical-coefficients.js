#!/usr/bin/env node

// Find optimal empirical coefficients using least-squares regression
// This will give us the mathematically best coefficients per region

const fs = require('fs');

// Load all data
function loadAllData() {
    const datasets = [
        '/home/shreen/minigames/web/jlag1.csv',
        '/home/shreen/minigames/web/jlag2.csv',
        '/home/shreen/Documents/driver.csv'
    ];

    let allShots = [];
    datasets.forEach(file => {
        const data = fs.readFileSync(file, 'utf-8').replace(/^\uFEFF/, '');
        const lines = data.trim().split('\n');
        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(',');
            allShots.push({
                speed: parseFloat(parts[5]),
                vla: parseFloat(parts[8]),
                spin: parseFloat(parts[6]),
                total: parseFloat(parts[3])
            });
        }
    });
    return allShots;
}

// Simple grid search to find best coefficients
function optimizeCoefficients(shots, regionName) {
    if (shots.length === 0) {
        console.log(`${regionName}: No data, skipping`);
        return null;
    }

    console.log(`\n=== Optimizing ${regionName} (${shots.length} shots) ===`);

    // Calculate averages
    const avgSpeed = shots.reduce((sum, s) => sum + s.speed, 0) / shots.length;
    const avgVLA = shots.reduce((sum, s) => sum + s.vla, 0) / shots.length;
    const avgSpin = shots.reduce((sum, s) => sum + s.spin, 0) / shots.length;
    const avgTotal = shots.reduce((sum, s) => sum + s.total, 0) / shots.length;

    console.log(`Avg: ${avgSpeed.toFixed(0)} mph, ${avgVLA.toFixed(1)}° VLA, ${avgSpin.toFixed(0)} rpm → ${avgTotal.toFixed(0)} yds`);

    // Grid search over coefficient ranges
    let bestError = Infinity;
    let bestCoeffs = { speed: 1.5, vla: 5.0, spin: 0.01 };

    const speedRange = [-2, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3];
    const vlaRange = [-5, -3, -1, 0, 1, 3, 5, 8, 10, 12, 15];
    const spinRange = [-0.02, -0.01, -0.005, 0, 0.001, 0.005, 0.01, 0.02];

    for (let speedCoeff of speedRange) {
        for (let vlaCoeff of vlaRange) {
            for (let spinCoeff of spinRange) {
                let totalError = 0;

                for (let shot of shots) {
                    const speedDelta = shot.speed - avgSpeed;
                    const vlaDelta = shot.vla - avgVLA;
                    const spinDelta = shot.spin - avgSpin;

                    const predicted = avgTotal + speedCoeff * speedDelta + vlaCoeff * vlaDelta + spinCoeff * spinDelta;
                    totalError += Math.abs(predicted - shot.total);
                }

                const avgError = totalError / shots.length;
                if (avgError < bestError) {
                    bestError = avgError;
                    bestCoeffs = { speed: speedCoeff, vla: vlaCoeff, spin: spinCoeff };
                }
            }
        }
    }

    console.log(`Best coefficients: speed=${bestCoeffs.speed}, vla=${bestCoeffs.vla}, spin=${bestCoeffs.spin}`);
    console.log(`Average error: ${bestError.toFixed(1)} yds`);

    return {
        avgSpeed, avgVLA, avgSpin, avgTotal,
        speedCoeff: bestCoeffs.speed,
        vlaCoeff: bestCoeffs.vla,
        spinCoeff: bestCoeffs.spin
    };
}

// Main
const allShots = loadAllData();

// Group by region
const regions = {
    WEDGE: allShots.filter(s => s.speed < 65),
    IRON: allShots.filter(s => s.speed >= 65 && s.speed < 100),
    POWER: allShots.filter(s => s.speed >= 100 && s.speed < 140),
    DRIVER: allShots.filter(s => s.speed >= 140)
};

console.log('======================================================');
console.log('  EMPIRICAL COEFFICIENT OPTIMIZATION');
console.log('  Using Least-Squares Grid Search');
console.log('======================================================');

const optimized = {};
Object.keys(regions).forEach(name => {
    optimized[name] = optimizeCoefficients(regions[name], name);
});

console.log('\n======================================================');
console.log('  OPTIMAL COEFFICIENTS SUMMARY');
console.log('======================================================\n');

Object.keys(optimized).forEach(name => {
    const c = optimized[name];
    if (!c) return;
    console.log(`${name}:`);
    console.log(`  avgSpeed: ${c.avgSpeed.toFixed(1)}, avgVLA: ${c.avgVLA.toFixed(1)}, avgSpin: ${c.avgSpin.toFixed(0)}, avgTotal: ${c.avgTotal.toFixed(1)}`);
    console.log(`  speedCoeff: ${c.speedCoeff}, vlaCoeff: ${c.vlaCoeff}, spinCoeff: ${c.spinCoeff}`);
    console.log();
});
