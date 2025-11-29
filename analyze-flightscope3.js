#!/usr/bin/env node

// Analyze FlightScope3.csv data to find physics calibration patterns

const fs = require('fs');

// Read FlightScope data
const csvData = fs.readFileSync('/home/shreen/Documents/flightscope3.csv', 'utf-8');
const lines = csvData.trim().split('\n').filter(line => line.trim() !== '');
const header = lines[0].split(',');

console.log('\n=== FLIGHTSCOPE3.CSV DATA ANALYSIS ===\n');

// Parse all shots
const shots = [];
for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const testData = {};
    header.forEach((key, idx) => {
        testData[key.trim()] = values[idx];
    });

    const ballSpeed = parseFloat(testData['Ball (mph)']);
    const vla = parseFloat(testData['Launch V (deg)']);

    let hlaStr = testData['Launch H (deg)'] || '0';
    let hla = parseFloat(hlaStr);
    if (hlaStr.includes('L')) hla = -Math.abs(hla);
    if (hlaStr.includes('R')) hla = Math.abs(hla);

    const totalSpin = parseFloat(testData['Spin (rpm)']);

    let spinAxisStr = testData['Spin Axis (deg)'] || '0';
    let spinAxis = parseFloat(spinAxisStr);
    if (spinAxisStr.includes('L')) spinAxis = -Math.abs(spinAxis);
    if (spinAxisStr.includes('R')) spinAxis = Math.abs(spinAxis);

    const carryYards = parseFloat(testData['Carry (yd)']);
    const rollYards = parseFloat(testData['Roll (yd)']);
    const totalYards = parseFloat(testData['Total (yd)']);
    const flightTime = parseFloat(testData['Time (s)']);
    const apexFeet = parseFloat(testData['Height (ft)']);

    if (isNaN(ballSpeed) || ballSpeed === 0) continue;

    // Calculate efficiency metrics
    const carryPerMPH = carryYards / ballSpeed;
    const rollPercentage = (rollYards / carryYards) * 100;
    const apexPerVLA = apexFeet / vla;

    shots.push({
        num: i,
        ballSpeed,
        vla,
        hla,
        totalSpin,
        spinAxis,
        carryYards,
        rollYards,
        totalYards,
        flightTime,
        apexFeet,
        carryPerMPH,
        rollPercentage,
        apexPerVLA
    });
}

console.log(`Total shots: ${shots.length}\n`);

// Group by speed ranges
console.log('=== SPEED-BASED ANALYSIS ===\n');

const speedRanges = [
    { min: 0, max: 50, label: '< 50 mph (Chips)' },
    { min: 50, max: 70, label: '50-70 mph (Short irons)' },
    { min: 70, max: 80, label: '70-80 mph (Mid irons)' },
    { min: 80, max: 90, label: '80-90 mph (Long irons)' }
];

speedRanges.forEach(range => {
    const rangeShots = shots.filter(s => s.ballSpeed >= range.min && s.ballSpeed < range.max);
    if (rangeShots.length === 0) return;

    const avgCarryPerMPH = rangeShots.reduce((sum, s) => sum + s.carryPerMPH, 0) / rangeShots.length;
    const avgRollPct = rangeShots.reduce((sum, s) => sum + s.rollPercentage, 0) / rangeShots.length;
    const avgSpin = rangeShots.reduce((sum, s) => sum + s.totalSpin, 0) / rangeShots.length;

    console.log(`${range.label}:`);
    console.log(`  Count: ${rangeShots.length}`);
    console.log(`  Avg Carry/mph: ${avgCarryPerMPH.toFixed(2)} yds/mph`);
    console.log(`  Avg Roll %: ${avgRollPct.toFixed(1)}%`);
    console.log(`  Avg Spin: ${avgSpin.toFixed(0)} rpm`);
    console.log('');
});

// VLA analysis
console.log('=== LAUNCH ANGLE ANALYSIS ===\n');

const vlaRanges = [
    { min: 0, max: 10, label: 'Low (< 10°)' },
    { min: 10, max: 17, label: 'Medium (10-17°)' },
    { min: 17, max: 20, label: 'Medium-High (17-20°)' },
    { min: 20, max: 30, label: 'High (20°+)' }
];

vlaRanges.forEach(range => {
    const rangeShots = shots.filter(s => s.vla >= range.min && s.vla < range.max);
    if (rangeShots.length === 0) return;

    const avgApexPerVLA = rangeShots.reduce((sum, s) => sum + s.apexPerVLA, 0) / rangeShots.length;
    const avgCarry = rangeShots.reduce((sum, s) => sum + s.carryYards, 0) / rangeShots.length;
    const avgRollPct = rangeShots.reduce((sum, s) => sum + s.rollPercentage, 0) / rangeShots.length;

    console.log(`${range.label}:`);
    console.log(`  Count: ${rangeShots.length}`);
    console.log(`  Avg Apex/VLA: ${avgApexPerVLA.toFixed(1)} ft/degree`);
    console.log(`  Avg Carry: ${avgCarry.toFixed(1)} yds`);
    console.log(`  Avg Roll %: ${avgRollPct.toFixed(1)}%`);
    console.log('');
});

// Spin analysis
console.log('=== SPIN ANALYSIS ===\n');

const spinRanges = [
    { min: 0, max: 2000, label: 'Low spin (< 2000 rpm)' },
    { min: 2000, max: 3000, label: 'Medium spin (2000-3000 rpm)' },
    { min: 3000, max: 4000, label: 'High spin (3000-4000 rpm)' },
    { min: 4000, max: 10000, label: 'Very high spin (4000+ rpm)' }
];

spinRanges.forEach(range => {
    const rangeShots = shots.filter(s => s.totalSpin >= range.min && s.totalSpin < range.max);
    if (rangeShots.length === 0) return;

    const avgCarry = rangeShots.reduce((sum, s) => sum + s.carryYards, 0) / rangeShots.length;
    const avgRollPct = rangeShots.reduce((sum, s) => sum + s.rollPercentage, 0) / rangeShots.length;
    const avgSpeed = rangeShots.reduce((sum, s) => sum + s.ballSpeed, 0) / rangeShots.length;

    console.log(`${range.label}:`);
    console.log(`  Count: ${rangeShots.length}`);
    console.log(`  Avg Speed: ${avgSpeed.toFixed(1)} mph`);
    console.log(`  Avg Carry: ${avgCarry.toFixed(1)} yds`);
    console.log(`  Avg Roll %: ${avgRollPct.toFixed(1)}%`);
    console.log('');
});

// Detailed shot-by-shot analysis
console.log('=== DETAILED SHOT ANALYSIS ===\n');
console.log('Shot | Speed | VLA  | Spin | Carry | Roll | Roll% | Apex | Time');
console.log('-----|-------|------|------|-------|------|-------|------|-----');

shots.forEach(shot => {
    console.log(
        `#${shot.num.toString().padStart(2)}  | ` +
        `${shot.ballSpeed.toFixed(1).padStart(5)} | ` +
        `${shot.vla.toFixed(1).padStart(4)} | ` +
        `${shot.totalSpin.toFixed(0).padStart(4)} | ` +
        `${shot.carryYards.toFixed(1).padStart(5)} | ` +
        `${shot.rollYards.toFixed(1).padStart(4)} | ` +
        `${shot.rollPercentage.toFixed(0).padStart(4)}% | ` +
        `${shot.apexFeet.toFixed(0).padStart(4)} | ` +
        `${shot.flightTime.toFixed(1)}`
    );
});

console.log('\n');

// Problem shots identification
console.log('=== PROBLEM PATTERNS ===\n');

// Low VLA shots
const lowVLA = shots.filter(s => s.vla < 10);
if (lowVLA.length > 0) {
    console.log(`Low VLA shots (< 10°): ${lowVLA.length} shots`);
    lowVLA.forEach(s => {
        console.log(`  Shot #${s.num}: ${s.ballSpeed.toFixed(1)} mph, ${s.vla.toFixed(1)}° VLA → ${s.carryYards.toFixed(1)} carry, ${s.rollYards.toFixed(1)} roll (${s.rollPercentage.toFixed(0)}%)`);
    });
    console.log('  Issue: Low trajectory shots have different aerodynamics\n');
}

// High spin shots
const highSpin = shots.filter(s => s.totalSpin > 4000);
if (highSpin.length > 0) {
    console.log(`High spin shots (> 4000 rpm): ${highSpin.length} shots`);
    highSpin.forEach(s => {
        console.log(`  Shot #${s.num}: ${s.totalSpin.toFixed(0)} rpm, ${s.ballSpeed.toFixed(1)} mph → ${s.carryYards.toFixed(1)} carry, ${s.rollYards.toFixed(1)} roll (${s.rollPercentage.toFixed(0)}%)`);
    });
    console.log('  Issue: High spin reduces drag but increases Magnus lift\n');
}

// Low spin shots
const lowSpin = shots.filter(s => s.totalSpin < 2000);
if (lowSpin.length > 0) {
    console.log(`Low spin shots (< 2000 rpm): ${lowSpin.length} shots`);
    lowSpin.forEach(s => {
        console.log(`  Shot #${s.num}: ${s.totalSpin.toFixed(0)} rpm, ${s.ballSpeed.toFixed(1)} mph, ${s.vla.toFixed(1)}° VLA → ${s.carryYards.toFixed(1)} carry, ${s.rollYards.toFixed(1)} roll (${s.rollPercentage.toFixed(0)}%)`);
    });
    console.log('  Issue: Low spin = less lift, more roll\n');
}

console.log('=== CALIBRATION RECOMMENDATIONS ===\n');

// Calculate average errors by category
const avgCarryPerMPH_all = shots.reduce((sum, s) => sum + s.carryPerMPH, 0) / shots.length;
console.log(`Overall avg carry efficiency: ${avgCarryPerMPH_all.toFixed(2)} yds/mph`);
console.log(`  (70-80 mph should carry ~${(avgCarryPerMPH_all * 75).toFixed(1)} yds at 75 mph)`);
console.log('');

console.log('Current physics issues:');
console.log('  1. Carry distances too short (avg -8.1 yds)');
console.log('  2. Roll distances too long (avg +9.0 yds)');
console.log('  3. Low VLA shots (<10°) particularly problematic');
console.log('  4. Need less drag OR more Magnus lift for 70-85 mph range');
console.log('');
