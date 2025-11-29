// Test trajectory simulation against ShotScope data

// Copy the simulation functions from homerunderby.js
function simulateTrajectory(ballSpeedMph, launchAngleDeg, sideAngleDeg, totalSpinRpm, spinAxisDeg) {
    // Physical constants
    const GRAVITY = 9.81; // m/s^2
    const AIR_DENSITY = 1.225; // kg/m^3
    const BALL_MASS = 0.0459; // kg
    const BALL_RADIUS = 0.02135; // m
    const BALL_AREA = Math.PI * BALL_RADIUS * BALL_RADIUS;

    // Convert inputs to SI units
    const initialVelocity = ballSpeedMph * 0.44704; // mph to m/s
    const launchAngleRad = launchAngleDeg * Math.PI / 180;
    const sideAngleRad = sideAngleDeg * Math.PI / 180;

    // Initial velocity components
    let vx = initialVelocity * Math.cos(launchAngleRad) * Math.sin(sideAngleRad); // lateral
    let vy = initialVelocity * Math.sin(launchAngleRad); // vertical
    let vz = initialVelocity * Math.cos(launchAngleRad) * Math.cos(sideAngleRad); // forward

    // Position
    let x = 0, y = 0, z = 0;

    // Decompose spin into backspin and sidespin components
    // Spin axis: 0° = pure backspin, 90° = pure sidespin
    const spinAxisRad = spinAxisDeg * Math.PI / 180;
    const backspinRpm = totalSpinRpm * Math.cos(spinAxisRad);
    const sidespinRpm = totalSpinRpm * Math.sin(spinAxisRad);

    // Convert to rad/s
    const backspinRadPerSec = backspinRpm * 2 * Math.PI / 60;
    const sidespinRadPerSec = sidespinRpm * 2 * Math.PI / 60;

    // Time step
    const dt = 0.001; // 1ms

    // Simulate until ball hits ground
    while (y >= 0) {
        const v = Math.sqrt(vx * vx + vy * vy + vz * vz);

        if (v > 0.1) {
            // Drag coefficient (simplified)
            const CD = 0.06;

            const q = 0.5 * AIR_DENSITY * v * v;

            // Drag force (opposes velocity)
            const dragMag = CD * q * BALL_AREA;
            const ax_drag = -(dragMag / BALL_MASS) * (vx / v);
            const ay_drag = -(dragMag / BALL_MASS) * (vy / v);
            const az_drag = -(dragMag / BALL_MASS) * (vz / v);

            // Magnus effect - lift from backspin (vertical lift)
            const S_back = (BALL_RADIUS * backspinRadPerSec) / v;
            const CL_back = 0.35 * S_back;
            const liftMag = CL_back * q * BALL_AREA;
            const ay_lift = liftMag / BALL_MASS;

            // Magnus effect - side force from sidespin (lateral curve)
            const S_side = (BALL_RADIUS * sidespinRadPerSec) / v;
            const CL_side = 0.35 * S_side;
            const sideForceMag = CL_side * q * BALL_AREA;
            // Positive sidespin (right spin) causes ball to curve right
            const ax_side = sideForceMag / BALL_MASS;

            // Update velocity
            vx += (ax_drag + ax_side) * dt;
            vy += (ay_drag + ay_lift - GRAVITY) * dt;
            vz += az_drag * dt;
        } else {
            vy -= GRAVITY * dt;
        }

        // Update position
        x += vx * dt;
        y += vy * dt;
        z += vz * dt;

        // Safety check
        if (y < -10) break;
    }

    // Calculate carry distance in meters
    const carryMeters = Math.sqrt(x * x + z * z);

    // Convert to yards
    const carryYards = carryMeters / 0.9144;

    // Apply calibration scaling based on ShotScope data
    const scaledCarry = applyCalibration(carryYards, ballSpeedMph, launchAngleDeg, sideAngleDeg);

    return {
        rawCarry: carryYards,
        carry: scaledCarry,
        lateral: Math.abs(x) / 0.9144 // lateral distance in yards
    };
}

function applyCalibration(rawCarryYards, ballSpeedMph, launchAngleDeg, sideAngleDeg) {
    const calibrationData = [
        [60.3, 0.794],
        [70, 0.721],
        [100, 0.847],
        [150, 1.191],
        [212, 1.305]
    ];

    let multiplier;

    if (ballSpeedMph <= calibrationData[0][0]) {
        multiplier = calibrationData[0][1];
    } else if (ballSpeedMph >= calibrationData[calibrationData.length - 1][0]) {
        multiplier = calibrationData[calibrationData.length - 1][1];
    } else {
        for (let i = 0; i < calibrationData.length - 1; i++) {
            const [speed1, mult1] = calibrationData[i];
            const [speed2, mult2] = calibrationData[i + 1];

            if (ballSpeedMph >= speed1 && ballSpeedMph <= speed2) {
                const speedRatio = (ballSpeedMph - speed1) / (speed2 - speed1);
                multiplier = mult1 + speedRatio * (mult2 - mult1);
                break;
            }
        }
    }

    if (!multiplier) {
        multiplier = 1.0;
    }

    const absHLA = Math.abs(sideAngleDeg);
    const hlaBoost = 1 + (absHLA * 0.01);

    return rawCarryYards * multiplier * hlaBoost;
}

// Test cases from FlightScope/ShotScope with spin axis
const testCases = [
    { speed: 60.3, vla: 31, hla: 0.6, spin: 4487, spinAxis: 2.5, expected: 63.8, name: "New 31° shot" },
    { speed: 70, vla: 25, hla: -3, spin: 8000, spinAxis: 5, expected: 83.9, name: "70mph 25°" },
    { speed: 100, vla: 18, hla: 4, spin: 5500, spinAxis: 8, expected: 147.5, name: "100mph 18°" },
    { speed: 150, vla: 12, hla: -6, spin: 2700, spinAxis: 12, expected: 271.2, name: "150mph 12°" },
    { speed: 212, vla: 10, hla: 7, spin: 2000, spinAxis: 15, expected: 455.1, name: "212mph 10°" }
];

console.log('Testing trajectory simulation with angle-dependent calibration:\n');
console.log('Test Name          | Speed | VLA | Expected | Simulated | Error');
console.log('-------------------|-------|-----|----------|-----------|-------');

testCases.forEach(test => {
    const result = simulateTrajectory(test.speed, test.vla, test.hla, test.spin, test.spinAxis);
    const error = ((result.carry - test.expected) / test.expected * 100).toFixed(1);

    console.log(
        `${test.name.padEnd(18)} | ` +
        `${test.speed.toString().padStart(5)} | ` +
        `${test.vla.toString().padStart(3)} | ` +
        `${test.expected.toFixed(1).padStart(8)} | ` +
        `${result.carry.toFixed(1).padStart(9)} | ` +
        `${error.padStart(6)}%`
    );
});
