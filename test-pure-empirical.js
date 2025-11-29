#!/usr/bin/env node

// PURE EMPIRICAL GOLF BALL MODEL
// No physics simulation - just regression-based predictions
// Mimics how TrackMan/FlightScope/GSPro actually work
//
// Four regions with separate coefficients:
//   WEDGE: < 65 mph
//   IRON: 65-100 mph
//   POWER: 100-140 mph
//   DRIVER: 140+ mph

const fs = require('fs');

// Load all datasets and combine
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
                file: file.split('/').pop(),
                speed: parseFloat(parts[5]),
                vla: parseFloat(parts[8]),
                spin: parseFloat(parts[6]),
                carry: parseFloat(parts[1]),
                roll: parseFloat(parts[2]),
                total: parseFloat(parts[3])
            });
        }
    });

    return allShots;
}

// Determine region
function getRegion(speed) {
    if (speed < 65) return 'WEDGE';
    if (speed < 100) return 'IRON';
    if (speed < 140) return 'POWER';
    return 'DRIVER';
}

// Calculate region statistics for calibration
function calibrateRegions(allShots) {
    const regions = {
        'WEDGE': { shots: [], avgSpeed: 0, avgVLA: 0, avgSpin: 0, avgTotal: 0 },
        'IRON': { shots: [], avgSpeed: 0, avgVLA: 0, avgSpin: 0, avgTotal: 0 },
        'POWER': { shots: [], avgSpeed: 0, avgVLA: 0, avgSpin: 0, avgTotal: 0 },
        'DRIVER': { shots: [], avgSpeed: 0, avgVLA: 0, avgSpin: 0, avgTotal: 0 }
    };

    // Group shots by region
    allShots.forEach(shot => {
        const region = getRegion(shot.speed);
        regions[region].shots.push(shot);
    });

    // Calculate averages for each region
    Object.keys(regions).forEach(name => {
        const r = regions[name];
        if (r.shots.length === 0) return;

        r.avgSpeed = r.shots.reduce((sum, s) => sum + s.speed, 0) / r.shots.length;
        r.avgVLA = r.shots.reduce((sum, s) => sum + s.vla, 0) / r.shots.length;
        r.avgSpin = r.shots.reduce((sum, s) => sum + s.spin, 0) / r.shots.length;
        r.avgTotal = r.shots.reduce((sum, s) => sum + s.total, 0) / r.shots.length;
    });

    return regions;
}

// Empirical prediction model
function predictDistance(speed, vla, spin, regions) {
    const region = getRegion(speed);
    const r = regions[region];

    if (r.shots.length === 0) {
        // Fallback if no data for this region
        return speed * 1.8; // rough estimate
    }

    // OPTIMIZED COEFFICIENTS (from least-squares grid search)
    let speedCoeff, vlaCoeff, spinCoeff;

    if (region === 'WEDGE') {
        speedCoeff = 1.0;
        vlaCoeff = 0.0;
        spinCoeff = 0.005;
    } else if (region === 'IRON') {
        speedCoeff = 1.5;
        vlaCoeff = -3.0;
        spinCoeff = 0.0;
    } else if (region === 'POWER') {
        speedCoeff = 2.5;
        vlaCoeff = -1.0;
        spinCoeff = 0.0;
    } else { // DRIVER
        speedCoeff = 2.5;
        vlaCoeff = 1.0;
        spinCoeff = -0.005;
    }

    // Delta from region average
    const speedDelta = speed - r.avgSpeed;
    const vlaDelta = vla - r.avgVLA;
    const spinDelta = spin - r.avgSpin;

    // Predict total distance
    let total = r.avgTotal;
    total += speedCoeff * speedDelta;
    total += vlaCoeff * vlaDelta;
    total += spinCoeff * spinDelta;

    return total;
}

// Test the model
function testModel() {
    const allShots = loadAllData();
    const regions = calibrateRegions(allShots);

    console.log('======================================================');
    console.log('         PURE EMPIRICAL MODEL TEST');
    console.log('    Multi-Region Regression (No Physics!)');
    console.log('======================================================\n');

    // Display calibration info
    console.log('=== REGION CALIBRATION ===\n');
    Object.keys(regions).forEach(name => {
        const r = regions[name];
        if (r.shots.length === 0) {
            console.log(`${name}: No data`);
            return;
        }
        console.log(`${name}: ${r.shots.length} shots`);
        console.log(`  Avg: ${r.avgSpeed.toFixed(0)} mph, ${r.avgVLA.toFixed(1)}° VLA, ${r.avgSpin.toFixed(0)} rpm → ${r.avgTotal.toFixed(0)} yds`);
    });

    console.log('\n======================================================');
    console.log('                  TEST RESULTS');
    console.log('======================================================\n');

    // Test each shot
    let totalError = 0;
    let passing = 0;
    const tolerance = 10.0;
    const regionStats = {};

    allShots.forEach((shot, i) => {
        const predicted = predictDistance(shot.speed, shot.vla, shot.spin, regions);
        const error = predicted - shot.total;
        const absError = Math.abs(error);
        const status = absError <= tolerance ? 'PASS' : 'FAIL';
        const region = getRegion(shot.speed);

        if (!regionStats[region]) {
            regionStats[region] = { passing: 0, total: 0, totalError: 0 };
        }
        regionStats[region].total++;
        regionStats[region].totalError += absError;
        if (absError <= tolerance) {
            regionStats[region].passing++;
            passing++;
        }

        totalError += absError;

        console.log(`Shot ${i+1} [${region}]: ${shot.speed.toFixed(0)} mph, ${shot.vla.toFixed(1)}° VLA → ${shot.total.toFixed(0)} actual, ${predicted.toFixed(1)} pred (${error >= 0 ? '+' : ''}${error.toFixed(1)}) ${status}`);
    });

    const avgError = totalError / allShots.length;

    console.log('\n======================================================');
    console.log('              REGION BREAKDOWN');
    console.log('======================================================\n');

    Object.keys(regionStats).sort().forEach(region => {
        const stats = regionStats[region];
        const avgRegionError = stats.totalError / stats.total;
        const passPct = (stats.passing / stats.total * 100).toFixed(0);
        console.log(`${region}: ${stats.passing}/${stats.total} passing (${passPct}%), Avg error: ${avgRegionError.toFixed(1)} yds`);
    });

    console.log('\n======================================================');
    console.log('              OVERALL SUMMARY');
    console.log('======================================================\n');

    console.log(`Total shots tested: ${allShots.length}`);
    console.log(`Passed (≤${tolerance.toFixed(1)} yds): ${passing}/${allShots.length} (${(passing/allShots.length*100).toFixed(0)}%)`);
    console.log(`Average error: ${avgError.toFixed(1)} yards`);

    console.log('\n--- KEY INSIGHT ---');
    console.log('This pure empirical model matches how professional');
    console.log('simulators (TrackMan, GSPro) actually work - they use');
    console.log('regression on thousands of shots, not physics equations.');
}

testModel();
