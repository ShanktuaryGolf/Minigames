const fs = require('fs');

// Read and parse CSV
const csvData = fs.readFileSync('all-shots.csv', 'utf-8');
const lines = csvData.trim().split('\n');

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

    if (!isNaN(shot.speed) && !isNaN(shot.total) && !isNaN(shot.vla) && shot.speed >= 140) {
        shots.push(shot);
    }
}

console.log(`Loaded ${shots.length} driver shots (>= 140 mph)\n`);

// Split into low and normal VLA
const lowVLA = shots.filter(s => s.vla < 13);
const normalVLA = shots.filter(s => s.vla >= 13);

console.log(`Low VLA (<13°): ${lowVLA.length} shots`);
console.log(`Normal VLA (>=13°): ${normalVLA.length} shots\n`);

// Calculate averages
function calcAvg(shots) {
    return {
        speed: shots.reduce((sum, s) => sum + s.speed, 0) / shots.length,
        vla: shots.reduce((sum, s) => sum + s.vla, 0) / shots.length,
        spin: shots.reduce((sum, s) => sum + s.spin, 0) / shots.length,
        total: shots.reduce((sum, s) => sum + s.total, 0) / shots.length
    };
}

// Test coefficient combinations
function testCoeffs(shots, avg, speedCoeff, vlaCoeff, spinCoeff) {
    let totalError = 0;
    let passing = 0;

    for (const shot of shots) {
        const speedDelta = shot.speed - avg.speed;
        const vlaDelta = shot.vla - avg.vla;
        const spinDelta = shot.spin - avg.spin;

        const predicted = avg.total +
                        (speedCoeff * speedDelta) +
                        (vlaCoeff * vlaDelta) +
                        (spinCoeff * spinDelta);

        const error = Math.abs(predicted - shot.total);
        totalError += error;
        if (error <= 7.5) passing++;
    }

    return {
        avgError: totalError / shots.length,
        passing: passing,
        passRate: passing / shots.length
    };
}

// Optimize each sub-regime separately
function optimize(shots, name) {
    const avg = calcAvg(shots);
    console.log(`\n======== OPTIMIZING ${name} ========`);
    console.log(`Average: ${avg.speed.toFixed(1)} mph, ${avg.vla.toFixed(1)}° VLA, ${avg.spin.toFixed(0)} rpm → ${avg.total.toFixed(1)} yds`);

    let bestResult = null;
    let bestCoeffs = null;

    // Grid search
    for (let speedCoeff = 1.0; speedCoeff <= 2.5; speedCoeff += 0.25) {
        for (let vlaCoeff = -2; vlaCoeff <= 4; vlaCoeff += 0.5) {
            for (let spinCoeff = -0.02; spinCoeff <= 0.01; spinCoeff += 0.005) {
                const result = testCoeffs(shots, avg, speedCoeff, vlaCoeff, spinCoeff);

                if (!bestResult || result.avgError < bestResult.avgError) {
                    bestResult = result;
                    bestCoeffs = { speedCoeff, vlaCoeff, spinCoeff };
                }
            }
        }
    }

    console.log(`Best coefficients: speed=${bestCoeffs.speedCoeff}, vla=${bestCoeffs.vlaCoeff}, spin=${bestCoeffs.spinCoeff}`);
    console.log(`Pass rate: ${bestResult.passing}/${shots.length} (${(bestResult.passRate * 100).toFixed(0)}%)`);
    console.log(`Average error: ${bestResult.avgError.toFixed(1)} yds`);

    return { avg, coeffs: bestCoeffs, result: bestResult };
}

const lowResult = optimize(lowVLA, 'DRIVER_LOW_VLA (<13°)');
const normalResult = optimize(normalVLA, 'DRIVER_NORMAL (>=13°)');

// Test combined approach
console.log('\n======== TESTING SPLIT REGIME APPROACH ========\n');

let totalPassing = 0;
let totalError = 0;

for (const shot of shots) {
    const isLowVLA = shot.vla < 13;
    const { avg, coeffs } = isLowVLA ? lowResult : normalResult;

    const speedDelta = shot.speed - avg.speed;
    const vlaDelta = shot.vla - avg.vla;
    const spinDelta = shot.spin - avg.spin;

    const predicted = avg.total +
                    (coeffs.speedCoeff * speedDelta) +
                    (coeffs.vlaCoeff * vlaDelta) +
                    (coeffs.spinCoeff * spinDelta);

    const error = Math.abs(predicted - shot.total);
    totalError += error;
    if (error <= 7.5) totalPassing++;
}

console.log(`Total driver shots: ${shots.length}`);
console.log(`Passing: ${totalPassing}/${shots.length} (${(totalPassing / shots.length * 100).toFixed(0)}%)`);
console.log(`Average error: ${(totalError / shots.length).toFixed(1)} yds`);

console.log('\n======== PROPOSED DRIVER SUB-REGIMES ========\n');
console.log('DRIVER_LOW_VLA (speed >= 140 mph, VLA < 13°):');
console.log(`  avgSpeed: ${lowResult.avg.speed.toFixed(1)}`);
console.log(`  avgVLA: ${lowResult.avg.vla.toFixed(1)}`);
console.log(`  avgSpin: ${lowResult.avg.spin.toFixed(0)}`);
console.log(`  avgTotal: ${lowResult.avg.total.toFixed(1)}`);
console.log(`  speedCoeff: ${lowResult.coeffs.speedCoeff}`);
console.log(`  vlaCoeff: ${lowResult.coeffs.vlaCoeff}`);
console.log(`  spinCoeff: ${lowResult.coeffs.spinCoeff}`);

console.log('\nDRIVER (speed >= 140 mph, VLA >= 13°):');
console.log(`  avgSpeed: ${normalResult.avg.speed.toFixed(1)}`);
console.log(`  avgVLA: ${normalResult.avg.vla.toFixed(1)}`);
console.log(`  avgSpin: ${normalResult.avg.spin.toFixed(0)}`);
console.log(`  avgTotal: ${normalResult.avg.total.toFixed(1)}`);
console.log(`  speedCoeff: ${normalResult.coeffs.speedCoeff}`);
console.log(`  vlaCoeff: ${normalResult.coeffs.vlaCoeff}`);
console.log(`  spinCoeff: ${normalResult.coeffs.spinCoeff}`);
