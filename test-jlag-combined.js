#!/usr/bin/env node

// Test jlag1 + jlag2 with both physics and empirical models

const fs = require('fs');

// Load both datasets
function loadDataset(file) {
    const data = fs.readFileSync(file, 'utf-8').replace(/^\uFEFF/, '');
    const lines = data.trim().split('\n');
    const shots = [];
    
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        shots.push({
            carry: parseFloat(parts[1]),
            roll: parseFloat(parts[2]),
            total: parseFloat(parts[3]),
            speed: parseFloat(parts[5]),
            spin: parseFloat(parts[6]),
            vla: parseFloat(parts[8]),
        });
    }
    return shots;
}

const jlag1 = loadDataset('/home/shreen/minigames/web/jlag1.csv');
const jlag2 = loadDataset('/home/shreen/minigames/web/jlag2.csv');
const allShots = [...jlag1, ...jlag2];

// Empirical model (simple linear)
function predictEmpiricalTotal(speed, vla, spin) {
    // Calculate averages from combined dataset
    let sumSpeed = 0, sumVLA = 0, sumSpin = 0, sumTotal = 0;
    allShots.forEach(s => {
        sumSpeed += s.speed;
        sumVLA += s.vla;
        sumSpin += s.spin;
        sumTotal += s.total;
    });
    
    const avgSpeed = sumSpeed / allShots.length;
    const avgVLA = sumVLA / allShots.length;
    const avgSpin = sumSpin / allShots.length;
    const avgTotal = sumTotal / allShots.length;
    
    // Empirical coefficients (would be tuned)
    const speedCoeff = 1.8;
    const vlaCoeff = 3.0;
    const spinCoeff = 0.005;
    
    let total = avgTotal;
    total += speedCoeff * (speed - avgSpeed);
    total += vlaCoeff * (vla - avgVLA);
    total += spinCoeff * (spin - avgSpin);
    
    return total;
}

console.log('======================================================');
console.log('  EMPIRICAL MODEL TEST - jlag1 + jlag2 (31 shots)');
console.log('======================================================\n');

let totalError = 0;
let passing = 0;
const tolerance = 10.0;

allShots.forEach((shot, i) => {
    const predicted = predictEmpiricalTotal(shot.speed, shot.vla, shot.spin);
    const error = predicted - shot.total;
    const absError = Math.abs(error);
    const status = absError <= tolerance ? 'PASS' : 'FAIL';
    
    if (absError <= tolerance) passing++;
    totalError += absError;
    
    console.log(`Shot ${i+1}: ${shot.speed.toFixed(0)} mph, ${shot.vla.toFixed(1)}° → ${shot.total.toFixed(0)} actual, ${predicted.toFixed(1)} pred (${error >= 0 ? '+' : ''}${error.toFixed(1)}) ${status}`);
});

const avgError = totalError / allShots.length;

console.log('\n======================================================');
console.log('                  SUMMARY                            ');
console.log('======================================================\n');
console.log(`Total shots tested: ${allShots.length}`);
console.log(`Passed (≤${tolerance.toFixed(1)} yds): ${passing}/${allShots.length} (${(passing/allShots.length*100).toFixed(0)}%)`);
console.log(`Average error: ${avgError.toFixed(1)} yards`);
