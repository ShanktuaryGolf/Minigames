// Analyze edge case failures from FlightScope data

const fs = require('fs');

// Read the FlightScope and HRD CSV files
const fsData = `61.4,14.3,1.4,1059,24.1,45.0
58.6,21.6,-7.5,1393,-32.5,52.7
63.0,23.7,2.0,1494,5.0,65.7
62.1,18.3,-5.3,1609,7.4,56.1
64.6,17.5,-1.5,1938,14.1,59.3
63.5,20.6,-6.9,2030,4.3,62.9
70.8,23.3,-3.7,2101,0.1,81.5
67.1,20.9,-6.7,2077,12.6,70.1
68.5,24.7,-0.7,1957,10.8,77.8
69.3,23.0,-5.8,1088,-3.9,77.4
74.0,8.3,-4.7,1276,-1.4,47.4`;

const hrdData = `61.4,14.3,1.4,1059,24.1,45.4
58.6,21.6,-7.5,1393,-32.5,61.1
63.0,23.7,2.0,1494,5.0,71.0
62.1,18.3,-5.3,1609,7.4,57.1
64.6,17.5,-1.5,1938,14.1,55.0
63.5,20.6,-6.9,2030,4.3,64.6
70.8,23.3,-3.7,2101,0.1,84.1
67.1,20.9,-6.7,2077,12.6,71.7
68.5,24.7,-0.7,1957,10.8,81.1
69.3,23.0,-5.8,1088,-3.9,88.0
74.0,8.3,-4.7,1276,-1.4,38.9`;

const fsLines = fsData.split('\n').map(line => {
    const [speed, vla, hla, spin, spinAxis, carry] = line.split(',').map(Number);
    return { speed, vla, hla, spin, spinAxis, carry };
});

const hrdLines = hrdData.split('\n').map(line => {
    const [speed, vla, hla, spin, spinAxis, carry] = line.split(',').map(Number);
    return { speed, vla, hla, spin, spinAxis, carry };
});

console.log('Edge Case Analysis:\n');
console.log('Shot | Speed | Angle | Spin | SpinAxis | FS Carry | HRD Carry | Error %  | Category');
console.log('-----|-------|-------|------|----------|----------|-----------|----------|----------');

fsLines.forEach((fs, i) => {
    const hrd = hrdLines[i];
    const error = ((hrd.carry - fs.carry) / fs.carry * 100);

    let category = 'Normal';
    if (Math.abs(fs.spinAxis) > 20) category = 'High SpinAxis';
    if (fs.spin < 1500) category = 'Low Spin';
    if (fs.vla < 15) category = 'Low Angle';
    if (fs.vla > 24) category = 'High Angle';

    const errorFlag = Math.abs(error) > 10 ? '❌' : '✓';

    console.log(
        `${(i + 1).toString().padStart(4)} | ` +
        `${fs.speed.toFixed(1).padStart(5)} | ` +
        `${fs.vla.toFixed(1).padStart(5)} | ` +
        `${fs.spin.toString().padStart(4)} | ` +
        `${fs.spinAxis.toFixed(1).padStart(8)} | ` +
        `${fs.carry.toFixed(1).padStart(8)} | ` +
        `${hrd.carry.toFixed(1).padStart(9)} | ` +
        `${error.toFixed(1).padStart(7)}% ${errorFlag} | ` +
        category
    );
});

console.log('\n\nPattern Analysis:');
console.log('Low Angle (< 15°):');
fsLines.filter(s => s.vla < 15).forEach((s, i) => {
    const hrd = hrdLines[fsLines.indexOf(s)];
    const mult = s.carry / hrd.carry;
    console.log(`  ${s.speed.toFixed(1)} mph @ ${s.vla.toFixed(1)}° → multiplier needed: ${mult.toFixed(3)}`);
});

console.log('\nLow Spin (< 1500 rpm):');
fsLines.filter(s => s.spin < 1500).forEach((s, i) => {
    const hrd = hrdLines[fsLines.indexOf(s)];
    const mult = s.carry / hrd.carry;
    console.log(`  ${s.speed.toFixed(1)} mph, ${s.spin} rpm @ ${s.vla.toFixed(1)}° → multiplier needed: ${mult.toFixed(3)}`);
});

console.log('\nHigh Spin Axis (> 20°):');
fsLines.filter(s => Math.abs(s.spinAxis) > 20).forEach((s, i) => {
    const hrd = hrdLines[fsLines.indexOf(s)];
    const mult = s.carry / hrd.carry;
    console.log(`  ${s.speed.toFixed(1)} mph, SpinAxis ${s.spinAxis.toFixed(1)}° @ ${s.vla.toFixed(1)}° → multiplier needed: ${mult.toFixed(3)}`);
});
