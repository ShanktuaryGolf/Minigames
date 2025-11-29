const fs = require('fs');

// Read both datasets
const fs3 = fs.readFileSync('/home/shreen/Documents/flightscope3.csv', 'utf-8').split('\n');
const fs4 = fs.readFileSync('/home/shreen/Documents/flightscope4.csv', 'utf-8').split('\n');

const shots = [];

// Parse flightscope3 (skip header)
for (let i = 1; i < fs3.length; i++) {
    if (!fs3[i].trim()) continue;
    const parts = fs3[i].split(',');
    shots.push({
        dataset: 'FS3',
        id: parts[0],
        carry: parseFloat(parts[1]),
        roll: parseFloat(parts[2]),
        total: parseFloat(parts[3]),
        speed: parseFloat(parts[5]),
        spin: parseFloat(parts[6]),
        vla: parseFloat(parts[8]),
        hla: parseFloat(parts[9])
    });
}

// Parse flightscope4 (skip header, skip BOM)
for (let i = 1; i < fs4.length; i++) {
    if (!fs4[i].trim()) continue;
    const parts = fs4[i].replace(/^\uFEFF/, '').split(',');
    shots.push({
        dataset: 'FS4',
        id: parts[0],
        carry: parseFloat(parts[1]),
        roll: parseFloat(parts[2]),
        total: parseFloat(parts[3]),
        speed: parseFloat(parts[5]),
        spin: parseFloat(parts[6]),
        vla: parseFloat(parts[8]),
        hla: parseFloat(parts[9])
    });
}

console.log('=== COMBINED DATASET ANALYSIS (30 shots) ===\n');

// Group by speed ranges
const speedGroups = {
    'Under 65 mph': shots.filter(s => s.speed < 65),
    '65-75 mph': shots.filter(s => s.speed >= 65 && s.speed < 75),
    '75-85 mph': shots.filter(s => s.speed >= 75 && s.speed < 85),
    '85+ mph': shots.filter(s => s.speed >= 85)
};

console.log('SPEED DISTRIBUTION:');
for (let [range, group] of Object.entries(speedGroups)) {
    console.log(`${range}: ${group.length} shots`);
}

// Group by VLA ranges
const vlaGroups = {
    'Low VLA (< 10°)': shots.filter(s => s.vla < 10),
    'Medium VLA (10-15°)': shots.filter(s => s.vla >= 10 && s.vla < 15),
    'High VLA (15-20°)': shots.filter(s => s.vla >= 15 && s.vla < 20),
    'Very High VLA (20-25°)': shots.filter(s => s.vla >= 20 && s.vla < 25),
    'Ultra High VLA (25+°)': shots.filter(s => s.vla >= 25)
};

console.log('\nVLA DISTRIBUTION:');
for (let [range, group] of Object.entries(vlaGroups)) {
    console.log(`${range}: ${group.length} shots`);
}

// Group by spin ranges
const spinGroups = {
    'Very Low Spin (< 1500)': shots.filter(s => s.spin < 1500),
    'Low Spin (1500-2500)': shots.filter(s => s.spin >= 1500 && s.spin < 2500),
    'Medium Spin (2500-3500)': shots.filter(s => s.spin >= 2500 && s.spin < 3500),
    'High Spin (3500-5000)': shots.filter(s => s.spin >= 3500 && s.spin < 5000),
    'Very High Spin (5000+)': shots.filter(s => s.spin >= 5000)
};

console.log('\nSPIN DISTRIBUTION:');
for (let [range, group] of Object.entries(spinGroups)) {
    console.log(`${range}: ${group.length} shots`);
}

// Analyze carry vs roll patterns
console.log('\n=== CARRY/ROLL ANALYSIS ===');
const lowVLA = shots.filter(s => s.vla < 10);
const medVLA = shots.filter(s => s.vla >= 10 && s.vla < 20);
const highVLA = shots.filter(s => s.vla >= 20);

console.log(`\nLow VLA (< 10°): ${lowVLA.length} shots`);
if (lowVLA.length > 0) {
    const avgCarry = lowVLA.reduce((sum, s) => sum + s.carry, 0) / lowVLA.length;
    const avgRoll = lowVLA.reduce((sum, s) => sum + s.roll, 0) / lowVLA.length;
    const rollPct = (avgRoll / (avgCarry + avgRoll)) * 100;
    console.log(`  Avg carry: ${avgCarry.toFixed(1)} yd, roll: ${avgRoll.toFixed(1)} yd (${rollPct.toFixed(1)}% roll)`);
}

console.log(`\nMedium VLA (10-20°): ${medVLA.length} shots`);
if (medVLA.length > 0) {
    const avgCarry = medVLA.reduce((sum, s) => sum + s.carry, 0) / medVLA.length;
    const avgRoll = medVLA.reduce((sum, s) => sum + s.roll, 0) / medVLA.length;
    const rollPct = (avgRoll / (avgCarry + avgRoll)) * 100;
    console.log(`  Avg carry: ${avgCarry.toFixed(1)} yd, roll: ${avgRoll.toFixed(1)} yd (${rollPct.toFixed(1)}% roll)`);
}

console.log(`\nHigh VLA (20+°): ${highVLA.length} shots`);
if (highVLA.length > 0) {
    const avgCarry = highVLA.reduce((sum, s) => sum + s.carry, 0) / highVLA.length;
    const avgRoll = highVLA.reduce((sum, s) => sum + s.roll, 0) / highVLA.length;
    const rollPct = (avgRoll / (avgCarry + avgRoll)) * 100;
    console.log(`  Avg carry: ${avgCarry.toFixed(1)} yd, roll: ${avgRoll.toFixed(1)} yd (${rollPct.toFixed(1)}% roll)`);
}

// Propose regime boundaries
console.log('\n=== PROPOSED REGIME SYSTEM ===\n');

// Cluster analysis - find natural groupings
const regimes = [
    {
        name: 'WEDGE',
        condition: 'speed < 65',
        shots: shots.filter(s => s.speed < 65),
        description: 'Short game, chips, pitches'
    },
    {
        name: 'LOW_TRAJECTORY',
        condition: 'speed >= 65 AND vla < 10',
        shots: shots.filter(s => s.speed >= 65 && s.vla < 10),
        description: 'Punch shots, knockdowns, low runners'
    },
    {
        name: 'MID_IRON',
        condition: 'speed >= 65 AND vla >= 10 AND vla < 20',
        shots: shots.filter(s => s.speed >= 65 && s.vla >= 10 && s.vla < 20),
        description: 'Standard iron shots'
    },
    {
        name: 'HIGH_IRON',
        condition: 'speed >= 65 AND speed < 85 AND vla >= 20',
        shots: shots.filter(s => s.speed >= 65 && s.speed < 85 && s.vla >= 20),
        description: 'High-lofted irons (8i, 9i, PW)'
    },
    {
        name: 'POWER_SHOT',
        condition: 'speed >= 85',
        shots: shots.filter(s => s.speed >= 85),
        description: 'Fast swings (long irons, hybrids)'
    }
];

for (let regime of regimes) {
    console.log(`${regime.name} (${regime.shots.length} shots)`);
    console.log(`  Condition: ${regime.condition}`);
    console.log(`  Description: ${regime.description}`);
    
    if (regime.shots.length > 0) {
        const avgSpeed = regime.shots.reduce((sum, s) => sum + s.speed, 0) / regime.shots.length;
        const avgVLA = regime.shots.reduce((sum, s) => sum + s.vla, 0) / regime.shots.length;
        const avgSpin = regime.shots.reduce((sum, s) => sum + s.spin, 0) / regime.shots.length;
        const avgCarry = regime.shots.reduce((sum, s) => sum + s.carry, 0) / regime.shots.length;
        const avgRoll = regime.shots.reduce((sum, s) => sum + s.roll, 0) / regime.shots.length;
        const rollPct = (avgRoll / (avgCarry + avgRoll)) * 100;
        
        console.log(`  Averages: ${avgSpeed.toFixed(1)} mph, ${avgVLA.toFixed(1)}° VLA, ${avgSpin.toFixed(0)} rpm`);
        console.log(`  Carry/Roll: ${avgCarry.toFixed(1)} yd / ${avgRoll.toFixed(1)} yd (${rollPct.toFixed(1)}% roll)`);
        
        // Show which shots belong to this regime
        const fs3count = regime.shots.filter(s => s.dataset === 'FS3').length;
        const fs4count = regime.shots.filter(s => s.dataset === 'FS4').length;
        console.log(`  Dataset split: FS3=${fs3count}, FS4=${fs4count}\n`);
    } else {
        console.log('  (No shots in this regime)\n');
    }
}
