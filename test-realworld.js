// Test current calibration against real-world shots

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
    return carryMeters / 0.9144;
}

function applyCalibration(rawCarryYards, ballSpeedMph, launchAngleDeg, sideAngleDeg, totalSpinRpm, spinAxisDeg) {
    const calibrationData = [
        [58, 1.05],
        [60, 1.05],
        [65, 1.02],
        [70, 0.98],
        [100, 0.847],
        [150, 1.191],
        [212, 1.305]
    ];

    let baseMultiplier;

    if (ballSpeedMph <= calibrationData[0][0]) {
        baseMultiplier = calibrationData[0][1];
    } else if (ballSpeedMph >= calibrationData[calibrationData.length - 1][0]) {
        baseMultiplier = calibrationData[calibrationData.length - 1][1];
    } else {
        for (let i = 0; i < calibrationData.length - 1; i++) {
            const [speed1, mult1] = calibrationData[i];
            const [speed2, mult2] = calibrationData[i + 1];

            if (ballSpeedMph >= speed1 && ballSpeedMph <= speed2) {
                const speedRatio = (ballSpeedMph - speed1) / (speed2 - speed1);
                baseMultiplier = mult1 + speedRatio * (mult2 - mult1);
                break;
            }
        }
    }

    if (!baseMultiplier) {
        baseMultiplier = 1.0;
    }

    // Very low angle correction
    let angleFactor = 1.0;
    if (launchAngleDeg < 10) {
        const angleBoost = (10 - launchAngleDeg) * 0.155;
        angleFactor = 1.0 + angleBoost;
    }

    // High spin axis correction
    let spinAxisFactor = 1.0;
    const absSpinAxis = Math.abs(spinAxisDeg);
    if (absSpinAxis > 25) {
        const spinAxisReduction = (absSpinAxis - 25) / 7.5 * 0.13;
        spinAxisFactor = 1.0 - Math.min(spinAxisReduction, 0.13);
    }

    // HLA boost
    const absHLA = Math.abs(sideAngleDeg);
    const hlaBoost = 1 + (absHLA * 0.01);

    return rawCarryYards * baseMultiplier * angleFactor * spinAxisFactor * hlaBoost;
}

const shots = [
    { speed: 67.1, vla: 14.3, hla: 0, spin: 1797, spinAxis: 23.5, expected: 55.5, name: "Shot 1 - High SpinAxis" },
    { speed: 67.8, vla: 8.8, hla: 2.1, spin: 1023, spinAxis: -27.4, expected: 38.0, name: "Shot 2 - Low Angle + High SpinAxis" },
    { speed: 51.5, vla: 28, hla: -5.4, spin: 4223, spinAxis: 26.9, expected: 46.5, name: "Shot 3 - Very High Spin" },
    { speed: 72.6, vla: 21.6, hla: -6.9, spin: 1785, spinAxis: -7.2, expected: 82.8, name: "Shot 4 - Normal" },
    { speed: 72.2, vla: 7.7, hla: -3.6, spin: 1273, spinAxis: 23.1, expected: 40.6, name: "Shot 5 - Very Low Angle" },
    { speed: 55.6, vla: 20.4, hla: 13.5, spin: 2608, spinAxis: 16.7, expected: 47.9, name: "Shot 6 - Normal" },
    { speed: 67.9, vla: 18.1, hla: -5.7, spin: 1881, spinAxis: -6, expected: 67.2, name: "Shot 7 - Normal" },
    { speed: 66.7, vla: 12.4, hla: 19.5, spin: 4016, spinAxis: -3.6, expected: 55.3, name: "Shot 8 - Very High Spin" },
    { speed: 56.9, vla: 21.3, hla: -5.9, spin: 1101, spinAxis: -5.2, expected: 50.9, name: "Shot 9 - Very Low Spin" }
];

console.log('Current Calibration Breakdown:\n');
console.log('Shot | Name                            | Raw  | Base  | Angle | SpinAx | HLA   | Final | FS    | Error');
console.log('-----|----------------------------------|------|-------|-------|--------|-------|-------|-------|-------');

shots.forEach((test, i) => {
    const raw = simulateTrajectory(test.speed, test.vla, test.hla, test.spin, test.spinAxis);

    // Get base multiplier
    const calibrationData = [
        [58, 1.05], [60, 1.05], [65, 1.02], [70, 0.98],
        [100, 0.847], [150, 1.191], [212, 1.305]
    ];

    let baseMultiplier = 1.0;
    if (test.speed <= calibrationData[0][0]) {
        baseMultiplier = calibrationData[0][1];
    } else if (test.speed >= calibrationData[calibrationData.length - 1][0]) {
        baseMultiplier = calibrationData[calibrationData.length - 1][1];
    } else {
        for (let j = 0; j < calibrationData.length - 1; j++) {
            const [speed1, mult1] = calibrationData[j];
            const [speed2, mult2] = calibrationData[j + 1];
            if (test.speed >= speed1 && test.speed <= speed2) {
                const speedRatio = (test.speed - speed1) / (speed2 - speed1);
                baseMultiplier = mult1 + speedRatio * (mult2 - mult1);
                break;
            }
        }
    }

    let angleFactor = 1.0;
    if (test.vla < 10) {
        const angleBoost = (10 - test.vla) * 0.155;
        angleFactor = 1.0 + angleBoost;
    }

    let spinAxisFactor = 1.0;
    const absSpinAxis = Math.abs(test.spinAxis);
    if (absSpinAxis > 25) {
        const spinAxisReduction = (absSpinAxis - 25) / 7.5 * 0.13;
        spinAxisFactor = 1.0 - Math.min(spinAxisReduction, 0.13);
    }

    const absHLA = Math.abs(test.hla);
    const hlaBoost = 1 + (absHLA * 0.01);

    const calibrated = applyCalibration(raw, test.speed, test.vla, test.hla, test.spin, test.spinAxis);
    const error = ((calibrated - test.expected) / test.expected * 100);

    console.log(
        `${(i + 1).toString().padStart(4)} | ` +
        `${test.name.padEnd(32)} | ` +
        `${raw.toFixed(1).padStart(4)} | ` +
        `${baseMultiplier.toFixed(3).padStart(5)} | ` +
        `${angleFactor.toFixed(3).padStart(5)} | ` +
        `${spinAxisFactor.toFixed(3).padStart(6)} | ` +
        `${hlaBoost.toFixed(3).padStart(5)} | ` +
        `${calibrated.toFixed(1).padStart(5)} | ` +
        `${test.expected.toFixed(1).padStart(5)} | ` +
        `${error.toFixed(1).padStart(6)}%`
    );
});
