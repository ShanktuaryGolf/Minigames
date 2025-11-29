const fs = require('fs');

// Read and parse CSV
const csvData = fs.readFileSync('all-shots.csv', 'utf-8');
const lines = csvData.trim().split('\n');
const headers = lines[0].split(',');

// Parse shots
const shots = [];
for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 6) continue;

    const shot = {
        num: parseInt(parts[0]),
        carry: parseFloat(parts[1]),
        roll: parseFloat(parts[2]),
        total: parseFloat(parts[3]),
        speed: parseFloat(parts[5]),
        spin: parseFloat(parts[6]),
        vla: parseFloat(parts[8])
    };

    if (!isNaN(shot.speed) && !isNaN(shot.total)) {
        shots.push(shot);
    }
}

// Classify by region
function getRegime(speed) {
    if (speed < 65) return 'WEDGE';
    if (speed < 100) return 'IRON';
    if (speed < 140) return 'POWER';
    return 'DRIVER';
}

// Current coefficients
const REGIONS = {
    DRIVER: {
        avgSpeed: 154.4,
        avgVLA: 29.4,
        avgSpin: 2656,
        avgTotal: 268.9,
        speedCoeff: 1.5,
        vlaCoeff: 0,
        spinCoeff: -0.01
    }
};

// Predict distance
function predict(shot) {
    const region = REGIONS.DRIVER;
    const speedDelta = shot.speed - region.avgSpeed;
    const vlaDelta = shot.vla - region.avgVLA;
    const spinDelta = shot.spin - region.avgSpin;

    return region.avgTotal +
           (region.speedCoeff * speedDelta) +
           (region.vlaCoeff * vlaDelta) +
           (region.spinCoeff * spinDelta);
}

// Filter driver shots
const driverShots = shots.filter(s => getRegime(s.speed) === 'DRIVER');

// Analyze by VLA ranges
const vlaRanges = [
    { name: 'Very Low (< 10°)', min: 0, max: 10 },
    { name: 'Low (10-13°)', min: 10, max: 13 },
    { name: 'Mid (13-16°)', min: 13, max: 16 },
    { name: 'High (16-20°)', min: 16, max: 20 },
    { name: 'Very High (20+°)', min: 20, max: 100 }
];

console.log('======== DRIVER REGIME ANALYSIS BY VLA ========\n');

for (const range of vlaRanges) {
    const rangeShots = driverShots.filter(s => s.vla >= range.min && s.vla < range.max);
    if (rangeShots.length === 0) continue;

    let totalError = 0;
    let passing = 0;
    let failing = 0;

    console.log(`${range.name} (${rangeShots.length} shots):`);

    for (const shot of rangeShots) {
        const predicted = predict(shot);
        const error = predicted - shot.total;
        totalError += Math.abs(error);

        if (Math.abs(error) <= 7.5) {
            passing++;
        } else {
            failing++;
            console.log(`  FAIL #${shot.num}: ${shot.speed.toFixed(1)} mph, ${shot.vla.toFixed(1)}° VLA, ${shot.spin} rpm → ${shot.total} yds (pred: ${predicted.toFixed(1)}, err: ${error.toFixed(1)})`);
        }
    }

    const avgError = totalError / rangeShots.length;
    const passRate = (passing / rangeShots.length * 100).toFixed(0);

    console.log(`  Pass rate: ${passing}/${rangeShots.length} (${passRate}%), Avg error: ${avgError.toFixed(1)} yds`);
    console.log('');
}

// Analyze roll ratio by VLA
console.log('======== ROLL RATIO ANALYSIS ========\n');

for (const range of vlaRanges) {
    const rangeShots = driverShots.filter(s => s.vla >= range.min && s.vla < range.max);
    if (rangeShots.length === 0) continue;

    const avgRollRatio = rangeShots.reduce((sum, s) => sum + (s.roll / s.total), 0) / rangeShots.length;
    const avgVLA = rangeShots.reduce((sum, s) => sum + s.vla, 0) / rangeShots.length;

    console.log(`${range.name}: ${(avgRollRatio * 100).toFixed(1)}% roll (avg VLA: ${avgVLA.toFixed(1)}°)`);
}

console.log('\n======== RECOMMENDATION ========\n');
console.log('Low VLA shots (< 13°) are over-predicting significantly.');
console.log('This suggests VLA DOES matter for drivers - higher VLA = more distance.');
console.log('Current vlaCoeff = 0 (no effect) should be POSITIVE.\n');
