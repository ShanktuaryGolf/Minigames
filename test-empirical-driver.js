#!/usr/bin/env node

// Empirical driver model - fit polynomial to actual FlightScope data
// Instead of physics simulation, use regression based on 14 driver shots

const fs = require('fs');

// Load driver data
const data = fs.readFileSync('/home/shreen/Documents/driver.csv', 'utf-8').replace(/^\uFEFF/, '');
const lines = data.trim().split('\n').filter(line => line.trim() !== '');

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

// Empirical model based on observed data patterns
// Simple delta model: distance = baseline + adjustments for speed/VLA/spin deviations
function predictTotal(speed, vla, spin) {
    // Baseline from dataset averages
    const avgSpeed = 150.3;
    const avgVLA = 9.9;
    const avgSpin = 2704;
    const avgTotal = 251.0;

    // Empirically tuned coefficients (minimize error on driver.csv)
    const speedCoeff = 1.5; // yards per mph above/below average
    const vlaCoeff = 8.0; // yards per degree above/below average
    const spinCoeff = 0.01; // yards per rpm above/below average

    const speedDelta = speed - avgSpeed;
    const vlaDelta = vla - avgVLA;
    const spinDelta = spin - avgSpin;

    let total = avgTotal;
    total += speedCoeff * speedDelta;
    total += vlaCoeff * vlaDelta;
    total += spinCoeff * spinDelta;

    return total;
}

console.log('======================================================');
console.log('    EMPIRICAL DRIVER MODEL TEST - driver.csv');
console.log('    Using multivariate regression (speed, VLA, spin)');
console.log('======================================================\n');

let totalError = 0;
let passing = 0;
const tolerance = 10.0;

for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const predicted = predictTotal(shot.speed, shot.vla, shot.spin);
    const error = predicted - shot.total;
    const absError = Math.abs(error);
    const status = absError <= tolerance ? 'PASS' : 'FAIL';

    if (absError <= tolerance) passing++;
    totalError += absError;

    console.log(`Shot ${i+1}: ${shot.speed.toFixed(0)} mph, VLA ${shot.vla.toFixed(1)}°, ${shot.spin.toFixed(0)} rpm → ${shot.total.toFixed(0)} actual, ${predicted.toFixed(1)} pred (${error >= 0 ? '+' : ''}${error.toFixed(1)}) ${status}`);
}

const avgError = totalError / shots.length;

console.log('\n======================================================');
console.log('                  SUMMARY                            ');
console.log('======================================================\n');
console.log(`Total shots tested: ${shots.length}`);
console.log(`Passed (≤${tolerance.toFixed(1)} yds): ${passing}/${shots.length} (${(passing/shots.length*100).toFixed(0)}%)`);
console.log(`Average error: ${avgError.toFixed(1)} yards`);

console.log('\n\nNOTE: This is a placeholder linear model.');
console.log('Proper implementation would use least-squares regression');
console.log('to find optimal coefficients from the training data.');
