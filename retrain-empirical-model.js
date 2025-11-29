#!/usr/bin/env node

/**
 * EMPIRICAL MODEL RETRAINING SCRIPT
 *
 * This script retrains the empirical golf ball flight model using all-shots.csv
 *
 * Usage:
 *   node retrain-empirical-model.js
 *
 * The script will:
 * 1. Load all shots from all-shots.csv
 * 2. Group shots by region (WEDGE, IRON, POWER, DRIVER)
 * 3. Optimize coefficients via least-squares grid search
 * 4. Test the model and report accuracy
 * 5. Display the new coefficients to copy into the game files
 *
 * After running this script, update these files with the new coefficients:
 *   - empirical-golf-model.js
 *   - golf-par3.html (EMPIRICAL_REGIONS constant)
 *   - homerun-derby.html (EMPIRICAL_REGIONS constant)
 */

const fs = require('fs');

// ============================================================================
// STEP 1: LOAD DATA
// ============================================================================

function loadAllShots() {
    const csvPath = '/home/shreen/minigames/web/all-shots.csv';

    if (!fs.existsSync(csvPath)) {
        console.error(`ERROR: ${csvPath} not found!`);
        process.exit(1);
    }

    const data = fs.readFileSync(csvPath, 'utf-8').replace(/^\uFEFF/, '');
    const lines = data.trim().split('\n');

    let allShots = [];

    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length < 9) continue;

        const speed = parseFloat(parts[5]);
        const vla = parseFloat(parts[8]);
        const spin = parseFloat(parts[6]);
        const total = parseFloat(parts[3]);

        if (isNaN(speed) || isNaN(vla) || isNaN(spin) || isNaN(total)) continue;

        allShots.push({ speed, vla, spin, total });
    }

    return allShots;
}

// ============================================================================
// STEP 2: REGION CLASSIFICATION
// ============================================================================

function getRegion(speed, vla) {
    if (speed < 65) return 'WEDGE';
    if (speed < 100) return 'IRON';
    if (speed < 140) return 'POWER';
    if (speed >= 140 && vla < 13) return 'DRIVER_LOW_VLA';
    return 'DRIVER';
}

function groupByRegion(allShots) {
    return {
        WEDGE: allShots.filter(s => getRegion(s.speed, s.vla) === 'WEDGE'),
        IRON: allShots.filter(s => getRegion(s.speed, s.vla) === 'IRON'),
        POWER: allShots.filter(s => getRegion(s.speed, s.vla) === 'POWER'),
        DRIVER_LOW_VLA: allShots.filter(s => getRegion(s.speed, s.vla) === 'DRIVER_LOW_VLA'),
        DRIVER: allShots.filter(s => getRegion(s.speed, s.vla) === 'DRIVER')
    };
}

// ============================================================================
// STEP 3: COEFFICIENT OPTIMIZATION
// ============================================================================

function optimizeCoefficients(shots, regionName) {
    if (shots.length === 0) {
        console.log(`${regionName}: No data, skipping\n`);
        return null;
    }

    console.log(`=== ${regionName} (${shots.length} shots) ===`);

    // Calculate region averages
    const avgSpeed = shots.reduce((sum, s) => sum + s.speed, 0) / shots.length;
    const avgVLA = shots.reduce((sum, s) => sum + s.vla, 0) / shots.length;
    const avgSpin = shots.reduce((sum, s) => sum + s.spin, 0) / shots.length;
    const avgTotal = shots.reduce((sum, s) => sum + s.total, 0) / shots.length;

    console.log(`Avg: ${avgSpeed.toFixed(1)} mph, ${avgVLA.toFixed(1)}° VLA, ${avgSpin.toFixed(0)} rpm → ${avgTotal.toFixed(1)} yds`);

    // Grid search for optimal coefficients
    let bestError = Infinity;
    let bestCoeffs = { speed: 1.5, vla: 5.0, spin: 0.01 };

    const speedRange = [-2, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];
    const vlaRange = [-10, -8, -5, -3, -1, 0, 1, 2, 3, 5, 8, 10];
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
    console.log(`Average error: ${bestError.toFixed(1)} yds\n`);

    return {
        avgSpeed, avgVLA, avgSpin, avgTotal,
        speedCoeff: bestCoeffs.speed,
        vlaCoeff: bestCoeffs.vla,
        spinCoeff: bestCoeffs.spin,
        avgError: bestError
    };
}

// ============================================================================
// STEP 4: MODEL TESTING
// ============================================================================

function testModel(allShots, optimizedRegions) {
    function predictDistance(speedMPH, vlaDegs, spinRPM) {
        const region = getRegion(speedMPH, vlaDegs);
        const r = optimizedRegions[region];
        if (!r) return 0;

        const speedDelta = speedMPH - r.avgSpeed;
        const vlaDelta = vlaDegs - r.avgVLA;
        const spinDelta = spinRPM - r.avgSpin;

        return r.avgTotal + r.speedCoeff * speedDelta + r.vlaCoeff * vlaDelta + r.spinCoeff * spinDelta;
    }

    let totalError = 0;
    let passing = 0;
    const tolerance = 7.5;
    const regionStats = {};
    const detailedResults = [];

    allShots.forEach((shot, index) => {
        const predicted = predictDistance(shot.speed, shot.vla, shot.spin);
        const error = predicted - shot.total;
        const absError = Math.abs(error);
        const region = getRegion(shot.speed, shot.vla);
        const pass = absError <= tolerance;

        if (!regionStats[region]) {
            regionStats[region] = { passing: 0, total: 0, totalError: 0 };
        }
        regionStats[region].total++;
        regionStats[region].totalError += absError;
        if (pass) {
            regionStats[region].passing++;
            passing++;
        }

        detailedResults.push({
            num: index + 1,
            region,
            speed: shot.speed,
            vla: shot.vla,
            spin: shot.spin,
            actual: shot.total,
            predicted: predicted,
            error: error,
            absError: absError,
            pass: pass
        });

        totalError += absError;
    });

    const avgError = totalError / allShots.length;

    console.log('======== REGION BREAKDOWN ========\n');
    Object.keys(regionStats).sort().forEach(region => {
        const stats = regionStats[region];
        const avgRegionError = stats.totalError / stats.total;
        const passPct = (stats.passing / stats.total * 100).toFixed(0);
        console.log(`${region}: ${stats.passing}/${stats.total} passing (${passPct}%), Avg error: ${avgRegionError.toFixed(1)} yds`);
    });

    console.log(`\n======== OVERALL SUMMARY ========`);
    console.log(`Total shots: ${allShots.length}`);
    console.log(`Passed (≤${tolerance.toFixed(1)} yds): ${passing}/${allShots.length} (${(passing/allShots.length*100).toFixed(0)}%)`);
    console.log(`Average error: ${avgError.toFixed(1)} yards`);

    console.log(`\n======== DETAILED RESULTS ========\n`);
    console.log('Shot | Region | Speed | VLA  | Spin | Actual | Predicted | Error | Pass');
    console.log('-----|--------|-------|------|------|--------|-----------|-------|-----');
    detailedResults.forEach(r => {
        const passStr = r.pass ? 'PASS' : 'FAIL';
        console.log(
            `${String(r.num).padStart(4)} | ` +
            `${r.region.padEnd(6)} | ` +
            `${r.speed.toFixed(1).padStart(5)} | ` +
            `${r.vla.toFixed(1).padStart(4)} | ` +
            `${r.spin.toFixed(0).padStart(4)} | ` +
            `${r.actual.toFixed(1).padStart(6)} | ` +
            `${r.predicted.toFixed(1).padStart(9)} | ` +
            `${r.error.toFixed(1).padStart(5)} | ${passStr}`
        );
    });
}

// ============================================================================
// STEP 5: OUTPUT FORMATTED COEFFICIENTS
// ============================================================================

function outputCoefficients(optimized) {
    console.log('\n\n======== COPY THESE COEFFICIENTS ========\n');
    console.log('// Region calibration data (optimized on all-shots.csv)');
    console.log('const REGIONS = {');

    Object.keys(optimized).forEach(name => {
        const c = optimized[name];
        if (!c) return;

        console.log(`    ${name}: {`);
        console.log(`        avgSpeed: ${c.avgSpeed.toFixed(1)},`);
        console.log(`        avgVLA: ${c.avgVLA.toFixed(1)},`);
        console.log(`        avgSpin: ${c.avgSpin.toFixed(0)},`);
        console.log(`        avgTotal: ${c.avgTotal.toFixed(1)},`);
        console.log(`        speedCoeff: ${c.speedCoeff},`);
        console.log(`        vlaCoeff: ${c.vlaCoeff},`);
        console.log(`        spinCoeff: ${c.spinCoeff}`);
        console.log(`    },`);
    });

    console.log('};');

    console.log('\n\nUpdate these files with the new coefficients:');
    console.log('  1. empirical-golf-model.js (REGIONS constant, lines 28-66)');
    console.log('  2. golf-par3.html (EMPIRICAL_REGIONS constant, lines 346-384)');
    console.log('  3. homerun-derby.html (EMPIRICAL_REGIONS constant, lines 400-438)');
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
    console.log('======================================================');
    console.log('  EMPIRICAL MODEL RETRAINING');
    console.log('  Using all-shots.csv');
    console.log('======================================================\n');

    // Load data
    const allShots = loadAllShots();
    console.log(`Loaded ${allShots.length} shots from all-shots.csv\n`);

    // Group by region
    const regions = groupByRegion(allShots);

    console.log('Region breakdown:');
    Object.keys(regions).forEach(name => {
        console.log(`  ${name}: ${regions[name].length} shots`);
    });
    console.log();

    // Optimize coefficients
    console.log('======== OPTIMIZING COEFFICIENTS ========\n');
    const optimized = {};
    Object.keys(regions).forEach(name => {
        optimized[name] = optimizeCoefficients(regions[name], name);
    });

    // Test model
    console.log('\n======== TESTING MODEL ========\n');
    testModel(allShots, optimized);

    // Output coefficients
    outputCoefficients(optimized);
}

main();
