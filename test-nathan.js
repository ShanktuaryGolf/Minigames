#!/usr/bin/env node

// Golf ball physics test script - Alan Nathan Model (from libshotscope)
// Tests against FlightScope data
// Run with: node test-nathan.js

const fs = require('fs');

// Physics constants
const GRAVITY = 32.174; // ft/s²
const BALL_MASS_OZ = 1.62;
const BALL_CIRC = 5.277; // inches
const BALL_RADIUS_FT = (BALL_CIRC / (2 * Math.PI)) / 12;
const BALL_RADIUS = BALL_RADIUS_FT * 0.3048; // meters
const AIR_DENSITY_SLUGS = 0.0748;
const MAGNUS_CONST = 0.00568249207;
const DRAG_CONST = 0.07182 * AIR_DENSITY_SLUGS * (5.125 / BALL_MASS_OZ) * Math.pow(BALL_CIRC / 9.125, 2);

// Alan Nathan Model Constants (from libshotscope / Washington State University study)
const CdS = 0.180;
const CdL = 0.500;  // Low Reynolds number (Re <= 0.5e5)
const CdH = 0.200;  // High Reynolds number (Re >= 1.0e5)

const coeff1 = 1.990;
const coeff2 = -3.250;
const Cl_default = 0.305;

// Calculate Reynolds number and atmospheric parameters
function calculateReynoldsNumber(speedMPH) {
    // Simplified Reynolds number calculation
    // Re = rho * v * d / mu
    // For golf ball at sea level, 70°F
    const tempC = 21.1; // 70°F
    const tempK = tempC + 273.15;
    const rhoMetric = 1.2929 * (273.0 / tempK) * (760.0 / 760.0); // kg/m³

    const speedMS = speedMPH * 0.44704;
    const diameter = BALL_CIRC / 39.37; // meters
    const viscosity = 0.000001512 * Math.pow(tempK, 1.5) / (tempK + 120); // kg/(m·s)

    const Re = (rhoMetric * speedMS * diameter) / viscosity;
    return Re * 0.00001; // Return Re × 10^-5
}

// Alan Nathan Drag Coefficient
function getCdNathan(speedMPH, totalSpinRadS) {
    const Re_x_e5 = calculateReynoldsNumber(speedMPH);
    const speed = speedMPH * 1.467; // Convert to ft/s
    const spinRatio = (BALL_RADIUS_FT * totalSpinRadS) / speed;

    let Cd;
    if (Re_x_e5 <= 0.5) {
        Cd = CdL;
    } else if (Re_x_e5 < 1.0) {
        // Transition region
        Cd = CdL - (CdL - CdH) * (Re_x_e5 - 0.5) / 0.5 + CdS * spinRatio;
    } else {
        Cd = CdH + CdS * spinRatio;
    }

    return Cd;
}

// Alan Nathan Lift Coefficient
function getClNathan(speed, totalSpinRadS) {
    const spinRatio = (BALL_RADIUS_FT * totalSpinRadS) / speed;

    if (spinRatio <= 0.3) {
        return coeff1 * spinRatio + coeff2 * Math.pow(spinRatio, 2);
    } else {
        return Cl_default;
    }
}

// Simulate golf shot
function simulateShot(speedMPH, vlaDegs, hlaDegs, totalSpinRPM, spinAxisDegs) {
    const deltaTime = 0.0016; // ~60 FPS
    const maxTime = 15; // seconds

    // Convert to SI and radians
    const speedMS = speedMPH * 0.44704;
    const vlaRad = vlaDegs * Math.PI / 180;
    const hlaRad = hlaDegs * Math.PI / 180;

    // Initial velocity
    let ballVelocity = {
        x: speedMS * Math.sin(hlaRad) * Math.cos(vlaRad),
        y: speedMS * Math.sin(vlaRad),
        z: -speedMS * Math.cos(hlaRad) * Math.cos(vlaRad)
    };

    // Initial position (tee at y=3.146m)
    let ballPosition = { x: 0, y: 3.146, z: 0 };

    // Spin setup
    const spinAxisRad = spinAxisDegs * Math.PI / 180;
    let totalSpinRadS = totalSpinRPM * Math.PI / 30;
    const wx = totalSpinRadS * Math.cos(spinAxisRad);
    const wy = -totalSpinRadS * Math.sin(spinAxisRad);

    let hasLanded = false;
    let carryDistance = 0;
    let ballInFlight = true;
    let time = 0;
    let landingSpeedMPH = 0;
    let landingSpinRPM = totalSpinRPM;

    while (ballInFlight && time < maxTime) {
        // Convert velocity to ft/s for physics calculations
        const vxFtS = ballVelocity.x * 3.28084;
        const vyFtS = -ballVelocity.z * 3.28084;
        const vzFtS = ballVelocity.y * 3.28084;
        const speed = Math.sqrt(vxFtS * vxFtS + vyFtS * vyFtS + vzFtS * vzFtS);

        if (speed < 0.1) break;

        const currentSpeedMPH = speed / 1.467;

        // Nathan Model Drag
        const Cd = getCdNathan(currentSpeedMPH, totalSpinRadS);
        const dragFactor = -DRAG_CONST * Cd * speed;
        const dragAccelX = dragFactor * vxFtS;
        const dragAccelY = dragFactor * vyFtS;
        const dragAccelZ = dragFactor * vzFtS;

        // Nathan Model Magnus Lift
        let magnusAccelX = 0, magnusAccelY = 0, magnusAccelZ = 0;
        if (speed > 0.1 && totalSpinRadS > 1) {
            const Cl = getClNathan(speed, totalSpinRadS);
            const magnusFactor = MAGNUS_CONST * (Cl / totalSpinRadS) * speed;

            const crossX = wy * vzFtS - 0 * vyFtS;
            const crossY = 0 * vxFtS - wx * vzFtS;
            const crossZ = wx * vyFtS - wy * vxFtS;

            magnusAccelX = magnusFactor * crossX;
            magnusAccelY = magnusFactor * crossY;
            magnusAccelZ = magnusFactor * crossZ;
        }

        // Total acceleration
        const totalAccelX = dragAccelX + magnusAccelX;
        const totalAccelY = dragAccelY + magnusAccelY;
        const totalAccelZ = dragAccelZ + magnusAccelZ - GRAVITY;

        // Update velocity
        ballVelocity.x += (totalAccelX / 3.28084) * deltaTime;
        ballVelocity.z += -(totalAccelY / 3.28084) * deltaTime;
        ballVelocity.y += (totalAccelZ / 3.28084) * deltaTime;

        // Spin decay (simplified - 4% per second like original)
        totalSpinRadS *= Math.exp(-deltaTime / 24.5);
        const currentSpinRPM = totalSpinRadS * 30 / Math.PI;

        // Update position
        ballPosition.x += ballVelocity.x * deltaTime;
        ballPosition.y += ballVelocity.y * deltaTime;
        ballPosition.z += ballVelocity.z * deltaTime;

        // Ground collision
        const groundY = 0;
        if (ballPosition.y - BALL_RADIUS <= groundY && ballVelocity.y < 0) {
            ballPosition.y = groundY + BALL_RADIUS;

            // First landing = carry
            if (!hasLanded) {
                hasLanded = true;
                carryDistance = Math.sqrt(ballPosition.x * ballPosition.x + ballPosition.z * ballPosition.z) * 1.09361;
                const horizontalSpeed = Math.sqrt(ballVelocity.x * ballVelocity.x + ballVelocity.z * ballVelocity.z);
                landingSpeedMPH = horizontalSpeed * 2.237;
                landingSpinRPM = currentSpinRPM;
            }

            // Bounce
            if (Math.abs(ballVelocity.y) > 0.5) {
                ballVelocity.y = -ballVelocity.y * 0.3;
                const horizontalSpeed = Math.sqrt(ballVelocity.x * ballVelocity.x + ballVelocity.z * ballVelocity.z);
                ballVelocity.x *= 0.5;
                ballVelocity.z *= 0.5;
            } else {
                ballVelocity.y = 0;

                // Rolling friction - using v4.4.1 calibration
                const horizontalSpeed = Math.sqrt(ballVelocity.x * ballVelocity.x + ballVelocity.z * ballVelocity.z);
                if (horizontalSpeed > 0.05) {
                    const GREEN_FRICTION = 8.0;

                    // Spin friction multiplier
                    let spinFrictionMultiplier;
                    if (currentSpinRPM >= 5500) {
                        spinFrictionMultiplier = 63.0;
                    } else if (currentSpinRPM >= 5000) {
                        const t = (currentSpinRPM - 5000) / (5500 - 5000);
                        spinFrictionMultiplier = 40.0 + t * (63.0 - 40.0);
                    } else if (currentSpinRPM >= 4000) {
                        const t = (currentSpinRPM - 4000) / (5000 - 4000);
                        spinFrictionMultiplier = 20.0 + t * (40.0 - 20.0);
                    } else if (currentSpinRPM >= 3000) {
                        const t = (currentSpinRPM - 3000) / (4000 - 3000);
                        spinFrictionMultiplier = 6.0 + t * (20.0 - 6.0);
                    } else if (currentSpinRPM >= 2500) {
                        const t = (currentSpinRPM - 2500) / (3000 - 2500);
                        spinFrictionMultiplier = 2.0 + t * (6.0 - 2.0);
                    } else if (currentSpinRPM >= 2000) {
                        const t = (currentSpinRPM - 2000) / (2500 - 2000);
                        spinFrictionMultiplier = 1.0 + t * (2.0 - 1.0);
                    } else if (currentSpinRPM >= 1500) {
                        const t = (currentSpinRPM - 1500) / (2000 - 1500);
                        spinFrictionMultiplier = 1.2 + t * (1.0 - 1.2);
                    } else if (currentSpinRPM >= 1000) {
                        const t = (currentSpinRPM - 1000) / (1500 - 1000);
                        spinFrictionMultiplier = 1.05 + t * (0.95 - 1.05);
                    } else {
                        spinFrictionMultiplier = 1.05;
                    }

                    // Landing speed factor
                    let baseLandingSpeedFactor;
                    if (landingSpeedMPH <= 35) {
                        baseLandingSpeedFactor = 0.42;
                    } else if (landingSpeedMPH <= 50) {
                        const t = (landingSpeedMPH - 35) / (50 - 35);
                        baseLandingSpeedFactor = 0.42 + t * (0.28 - 0.42);
                    } else if (landingSpeedMPH <= 70) {
                        const t = (landingSpeedMPH - 50) / (70 - 50);
                        baseLandingSpeedFactor = 0.25 + t * (0.28 - 0.25);
                    } else if (landingSpeedMPH <= 90) {
                        const t = (landingSpeedMPH - 70) / (90 - 70);
                        baseLandingSpeedFactor = 0.28 + t * (1.0 - 0.28);
                    } else {
                        baseLandingSpeedFactor = 1.0;
                    }

                    const landingSpeedFactor = baseLandingSpeedFactor;
                    const frictionDecel = GREEN_FRICTION * spinFrictionMultiplier * landingSpeedFactor;
                    const newSpeed = Math.max(0, horizontalSpeed - frictionDecel * deltaTime);
                    const scale = newSpeed / horizontalSpeed;

                    ballVelocity.x *= scale;
                    ballVelocity.z *= scale;
                } else {
                    ballInFlight = false;
                }
            }
        }

        time += deltaTime;
    }

    const totalDistance = Math.sqrt(ballPosition.x * ballPosition.x + ballPosition.z * ballPosition.z) * 1.09361;
    const rollDistance = totalDistance - carryDistance;

    return { carry: carryDistance, roll: rollDistance, total: totalDistance };
}

// Read and test FlightScope data
const csvData = fs.readFileSync('flightscope.csv', 'utf-8');
const lines = csvData.trim().split('\n');
const header = lines[0].split(',');

console.log('\n=== ALAN NATHAN MODEL TEST RESULTS ===\n');
console.log('Testing against FlightScope data...\n');

let totalCarryError = 0;
let totalRollError = 0;
let totalDistanceError = 0;
let passCount = 0;
let testCount = 0;

for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const testData = {};
    header.forEach((key, idx) => {
        testData[key.trim()] = parseFloat(values[idx]);
    });

    const ballSpeed = testData['Ball (mph)'];
    const launchV = testData['Launch V (deg)'];
    const launchH = parseFloat((testData['Launch H (deg)'] + '').replace(/[LR]/g, '')) || 0;
    const totalSpin = testData['Spin (rpm)'];
    const spinAxis = parseFloat((testData['Spin Axis (deg)'] + '').replace(/[LR]/g, '')) || 0;
    const carryYards = testData['Carry (yd)'];
    const rollYards = testData['Roll (yd)'];
    const totalYards = testData['Total (yd)'];

    const result = simulateShot(ballSpeed, launchV, launchH, totalSpin, spinAxis);

    const carryError = result.carry - carryYards;
    const rollError = result.roll - rollYards;
    const totalError = result.total - totalYards;

    totalCarryError += Math.abs(carryError);
    totalRollError += Math.abs(rollError);
    totalDistanceError += Math.abs(totalError);
    testCount++;

    const passed = Math.abs(totalError) <= 3.0;
    if (passed) passCount++;

    console.log(`Test ${i}: ${ballSpeed} mph, ${totalSpin} rpm`);
    console.log(`  FlightScope: ${carryYards.toFixed(1)} carry + ${rollYards.toFixed(1)} roll = ${totalYards.toFixed(1)} total`);
    console.log(`  Nathan:      ${result.carry.toFixed(1)} carry + ${result.roll.toFixed(1)} roll = ${result.total.toFixed(1)} total`);
    console.log(`  Error: ${carryError >= 0 ? '+' : ''}${carryError.toFixed(1)} carry, ${rollError >= 0 ? '+' : ''}${rollError.toFixed(1)} roll, ${totalError >= 0 ? '+' : ''}${totalError.toFixed(1)} total ${passed ? '✅' : '❌'}`);
    console.log('');
}

console.log('=== SUMMARY ===');
console.log(`Tests Passing (±3 yards): ${passCount}/${testCount}`);
console.log(`Average Carry Error: ${(totalCarryError / testCount).toFixed(1)} yards`);
console.log(`Average Roll Error: ${(totalRollError / testCount).toFixed(1)} yards`);
console.log(`Average Total Error: ${(totalDistanceError / testCount).toFixed(1)} yards`);
console.log('');
