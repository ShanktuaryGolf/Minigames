// Quick script to find the right angle correction factor

// Copy physics simulation
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

    return { rawCarry: carryYards };
}

// Test data
const tests = [
    { speed: 60.3, vla: 31, hla: 0.6, spin: 4487, spinAxis: 2.5, expected: 63.8 },
    { speed: 70, vla: 25, hla: -3, spin: 8000, spinAxis: 5, expected: 83.9 },
    { speed: 100, vla: 18, hla: 4, spin: 5500, spinAxis: 8, expected: 147.5 },
    { speed: 150, vla: 12, hla: -6, spin: 2700, spinAxis: 12, expected: 271.2 },
    { speed: 212, vla: 10, hla: 7, spin: 2000, spinAxis: 15, expected: 455.1 }
];

console.log('Finding needed multipliers for each shot:\n');
console.log('Speed | Angle | Raw Carry | Expected | Needed Multiplier');
console.log('------|-------|-----------|----------|------------------');

tests.forEach(test => {
    const result = simulateTrajectory(test.speed, test.vla, test.hla, test.spin, test.spinAxis);
    const neededMult = test.expected / result.rawCarry;

    console.log(
        `${test.speed.toString().padStart(5)} | ` +
        `${test.vla.toString().padStart(5)} | ` +
        `${result.rawCarry.toFixed(1).padStart(9)} | ` +
        `${test.expected.toFixed(1).padStart(8)} | ` +
        `${neededMult.toFixed(3).padStart(17)}`
    );
});
