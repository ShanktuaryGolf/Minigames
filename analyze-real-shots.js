// Analyze real test shots from v3.4.1

const shots = [
    { speed: 67.1, vla: 14.3, hla: 0, spin: 1797, spinAxis: 23.5, fs: 55.5, hrd: 49.0 },
    { speed: 67.8, vla: 8.8, hla: 2.1, spin: 1023, spinAxis: -27.4, fs: 38.0, hrd: 34.9 },
    { speed: 51.5, vla: 28, hla: -5.4, spin: 4223, spinAxis: 26.9, fs: 46.5, hrd: 49.2 },
    { speed: 72.6, vla: 21.6, hla: -6.9, spin: 1785, spinAxis: -7.2, fs: 82.8, hrd: 88.3 },
    { speed: 72.2, vla: 7.7, hla: -3.6, spin: 1273, spinAxis: 23.1, fs: 40.6, hrd: 33.8 },
    { speed: 55.6, vla: 20.4, hla: 13.5, spin: 2608, spinAxis: 16.7, fs: 47.9, hrd: 51.2 },
    { speed: 67.9, vla: 18.1, hla: -5.7, spin: 1881, spinAxis: -6, fs: 67.2, hrd: 65.2 },
    { speed: 66.7, vla: 12.4, hla: 19.5, spin: 4016, spinAxis: -3.6, fs: 55.3, hrd: 42.2 },
    { speed: 56.9, vla: 21.3, hla: -5.9, spin: 1101, spinAxis: -5.2, fs: 50.9, hrd: 57.5 }
];

console.log('Real Test Shot Analysis (v3.4.1):\n');
console.log('Shot | Speed | Angle | Spin | SpinAxis | FS Carry | HRD Carry | Error    | Status');
console.log('-----|-------|-------|------|----------|----------|-----------|----------|--------');

let goodCount = 0;
let totalError = 0;

shots.forEach((shot, i) => {
    const error = ((shot.hrd - shot.fs) / shot.fs * 100);
    const status = Math.abs(error) <= 10 ? '✓ GOOD' : '❌ BAD';

    if (Math.abs(error) <= 10) goodCount++;
    totalError += Math.abs(error);

    console.log(
        `${(i + 1).toString().padStart(4)} | ` +
        `${shot.speed.toFixed(1).padStart(5)} | ` +
        `${shot.vla.toFixed(1).padStart(5)} | ` +
        `${shot.spin.toString().padStart(4)} | ` +
        `${shot.spinAxis.toFixed(1).padStart(8)} | ` +
        `${shot.fs.toFixed(1).padStart(8)} | ` +
        `${shot.hrd.toFixed(1).padStart(9)} | ` +
        `${error.toFixed(1).padStart(7)}% | ` +
        status
    );
});

const avgError = (totalError / shots.length).toFixed(1);
const accuracy = ((goodCount / shots.length) * 100).toFixed(0);

console.log('\n');
console.log(`Summary: ${goodCount}/${shots.length} shots within ±10% (${accuracy}% accuracy)`);
console.log(`Average error: ${avgError}%`);

console.log('\n\nProblem Shots Analysis:');
console.log('---');

const bad = shots.filter((s, i) => {
    const error = Math.abs((s.hrd - s.fs) / s.fs * 100);
    return error > 10;
});

bad.forEach((s, i) => {
    const error = ((s.hrd - s.fs) / s.fs * 100);
    console.log(`Shot: ${s.speed.toFixed(1)} mph @ ${s.vla.toFixed(1)}°, ${s.spin} rpm, SpinAxis ${s.spinAxis.toFixed(1)}°`);
    console.log(`  FS: ${s.fs.toFixed(1)} yds  |  HRD: ${s.hrd.toFixed(1)} yds  |  Error: ${error.toFixed(1)}%`);

    let issues = [];
    if (s.vla < 10) issues.push('Very low angle');
    if (s.spin > 3500) issues.push('Very high spin');
    if (s.spin < 1200) issues.push('Very low spin');
    if (Math.abs(s.spinAxis) > 25) issues.push('High spin axis');

    console.log(`  Issues: ${issues.join(', ')}`);
    console.log('');
});
