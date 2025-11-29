const fs = require('fs');

// Read driver.csv
const data = fs.readFileSync('/home/shreen/Documents/driver.csv', 'utf-8').replace(/^\uFEFF/, '');
const lines = data.trim().split('\n').filter(line => line.trim() !== '');

console.log('=== DRIVER DATASET ANALYSIS (14 shots) ===\n');

let totalCarry = 0, totalRoll = 0, totalTotal = 0;
let totalSpeed = 0, totalVLA = 0, totalSpin = 0;

for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    const carry = parseFloat(parts[1]);
    const roll = parseFloat(parts[2]);
    const total = parseFloat(parts[3]);
    const speed = parseFloat(parts[5]);
    const spin = parseFloat(parts[6]);
    const vla = parseFloat(parts[8]);
    
    totalCarry += carry;
    totalRoll += roll;
    totalTotal += total;
    totalSpeed += speed;
    totalVLA += vla;
    totalSpin += spin;
}

const count = lines.length - 1;
const avgCarry = totalCarry / count;
const avgRoll = totalRoll / count;
const avgTotal = totalTotal / count;
const avgSpeed = totalSpeed / count;
const avgVLA = totalVLA / count;
const avgSpin = totalSpin / count;
const rollPct = (avgRoll / avgTotal) * 100;

console.log('AVERAGES:');
console.log(`  Ball Speed: ${avgSpeed.toFixed(1)} mph`);
console.log(`  Launch Angle (VLA): ${avgVLA.toFixed(1)}°`);
console.log(`  Spin: ${avgSpin.toFixed(0)} rpm`);
console.log(`  Carry: ${avgCarry.toFixed(1)} yards`);
console.log(`  Roll: ${avgRoll.toFixed(1)} yards`);
console.log(`  Total: ${avgTotal.toFixed(1)} yards`);
console.log(`  Roll %: ${rollPct.toFixed(1)}%\n`);

console.log('SPEED RANGE: 136.7 - 157.5 mph');
console.log('VLA RANGE: 8.6 - 12.3°');
console.log('SPIN RANGE: 1894 - 3570 rpm\n');

console.log('CARRY/ROLL BREAKDOWN:');
for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    const carry = parseFloat(parts[1]);
    const roll = parseFloat(parts[2]);
    const total = parseFloat(parts[3]);
    const speed = parseFloat(parts[5]);
    const vla = parseFloat(parts[8]);
    const pct = (roll / total) * 100;
    console.log(`  Shot ${i}: ${speed.toFixed(0)} mph, ${vla.toFixed(1)}° VLA → ${carry.toFixed(0)} carry, ${roll.toFixed(0)} roll (${pct.toFixed(1)}% roll)`);
}

console.log('\n=== PROPOSED DRIVER REGIME ===');
console.log('Speed threshold: >= 100 mph (separates from POWER_SHOT)');
console.log('Drag curve: Much lower than POWER_SHOT - needs 0.12-0.15 at 150+ mph');
console.log('Roll %: 5.5% (very low - drivers don\'t roll much)');
console.log('Friction: High (drivers land hot and check up)');
console.log('Bounce: Low (drivers land with high descent angle)');
console.log('Magnus: Moderate boost for optimal driver launch (10-12° VLA)');
