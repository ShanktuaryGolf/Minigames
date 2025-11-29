// Recalculate calibration from FlightScope data

function simulateTrajectory(ballSpeedMph, launchAngleDeg, sideAngleDeg, totalSpinRpm, spinAxisDeg) {
    const GRAVITY = 9.81;
    const AIR_DENSITY = 1.225;
    const BALL_MASS = 0.0459;
    const BALL_RADIUS = 0.02135;
    const BALL_AREA = Math.PI * BALL_RADIUS * BALL_RADIUS;

    const initialVelocity = ballSpeedMph * 0.44704;
    const launchAngleRad = launchAngleDeg * Math.PI / 180;
    const sideAngleRad = sideAngleDeg * Math.PI / 180;

    let vx = initialVelocity * Math.cos(launchAngleRad) * Math.sin(sideAngleRad);
    let vy = initialVelocity * Math.sin(launchAngleRad);
    let vz = initialVelocity * Math.cos(launchAngleRad) * Math.cos(sideAngleRad);

    let x = 0, y = 0, z = 0;

    const spinAxisRad = spinAxisDeg * Math.PI / 180;
    const backspinRpm = totalSpinRpm * Math.cos(spinAxisRad);
    const sidespinRpm = totalSpinRpm * Math.sin(spinAxisRad);
    const backspinRadPerSec = backspinRpm * 2 * Math.PI / 60;
    const sidespinRadPerSec = sidespinRpm * 2 * Math.PI / 60;

    const dt = 0.001;

    while (y >= 0) {
        const v = Math.sqrt(vx * vx + vy * vy + vz * vz);

        if (v > 0.1) {
            const CD = 0.06;
            const q = 0.5 * AIR_DENSITY * v * v;

            const dragMag = CD * q * BALL_AREA;
            const ax_drag = -(dragMag / BALL_MASS) * (vx / v);
            const ay_drag = -(dragMag / BALL_MASS) * (vy / v);
            const az_drag = -(dragMag / BALL_MASS) * (vz / v);

            const S_back = (BALL_RADIUS * backspinRadPerSec) / v;
            const CL_back = 0.35 * S_back;
            const liftMag = CL_back * q * BALL_AREA;
            const ay_lift = liftMag / BALL_MASS;

            const S_side = (BALL_RADIUS * sidespinRadPerSec) / v;
            const CL_side = 0.35 * S_side;
            const sideForceMag = CL_side * q * BALL_AREA;
            const ax_side = sideForceMag / BALL_MASS;

            vx += (ax_drag + ax_side) * dt;
            vy += (ay_drag + ay_lift - GRAVITY) * dt;
            vz += az_drag * dt;
        } else {
            vy -= GRAVITY * dt;
        }

        x += vx * dt;
        y += vy * dt;
        z += vz * dt;

        if (y < -10) break;
    }

    const carryMeters = Math.sqrt(x * x + z * z);
    const carryYards = carryMeters / 0.9144;

    return carryYards;
}

// All FlightScope test data
const tests = [
    { speed: 61.4, vla: 14.3, hla: 1.4, spin: 1059, spinAxis: 24.1, expected: 45.0 },
    { speed: 58.6, vla: 21.6, hla: -7.5, spin: 1393, spinAxis: -32.5, expected: 52.7 },
    { speed: 63.0, vla: 23.7, hla: 2.0, spin: 1494, spinAxis: 5.0, expected: 65.7 },
    { speed: 62.1, vla: 18.3, hla: -5.3, spin: 1609, spinAxis: 7.4, expected: 56.1 },
    { speed: 64.6, vla: 17.5, hla: -1.5, spin: 1938, spinAxis: 14.1, expected: 59.3 },
    { speed: 63.5, vla: 20.6, hla: -6.9, spin: 2030, spinAxis: 4.3, expected: 62.9 },
    { speed: 70.8, vla: 23.3, hla: -3.7, spin: 2101, spinAxis: 0.1, expected: 81.5 },
    { speed: 67.1, vla: 20.9, hla: -6.7, spin: 2077, spinAxis: 12.6, expected: 70.1 },
    { speed: 68.5, vla: 24.7, hla: -0.7, spin: 1957, spinAxis: 10.8, expected: 77.8 },
    { speed: 69.3, vla: 23.0, hla: -5.8, spin: 1088, spinAxis: -3.9, expected: 77.4 },
    { speed: 74.0, vla: 8.3, hla: -4.7, spin: 1276, spinAxis: -1.4, expected: 47.4 }
];

console.log('Recalibration Analysis:\n');
console.log('Shot | Speed | Angle | Spin | SpinAxis | Raw Carry | FS Carry | Multiplier');
console.log('-----|-------|-------|------|----------|-----------|----------|------------');

const multipliers = [];

tests.forEach((test, i) => {
    const rawCarry = simulateTrajectory(test.speed, test.vla, test.hla, test.spin, test.spinAxis);
    const multiplier = test.expected / rawCarry;
    multipliers.push({ ...test, rawCarry, multiplier });

    console.log(
        `${(i + 1).toString().padStart(4)} | ` +
        `${test.speed.toFixed(1).padStart(5)} | ` +
        `${test.vla.toFixed(1).padStart(5)} | ` +
        `${test.spin.toString().padStart(4)} | ` +
        `${test.spinAxis.toFixed(1).padStart(8)} | ` +
        `${rawCarry.toFixed(1).padStart(9)} | ` +
        `${test.expected.toFixed(1).padStart(8)} | ` +
        `${multiplier.toFixed(3).padStart(11)}`
    );
});

// Calculate average multiplier by speed range
console.log('\n\nAverage multipliers by speed range:');
const ranges = [
    [55, 65],
    [65, 75]
];

ranges.forEach(([min, max]) => {
    const inRange = multipliers.filter(m => m.speed >= min && m.speed < max);
    const avg = inRange.reduce((sum, m) => sum + m.multiplier, 0) / inRange.length;
    console.log(`  ${min}-${max} mph: ${avg.toFixed(3)} (${inRange.length} shots)`);
});

console.log(`\nOverall average multiplier: ${(multipliers.reduce((sum, m) => sum + m.multiplier, 0) / multipliers.length).toFixed(3)}`);
