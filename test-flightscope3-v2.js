#!/usr/bin/env node

// Golf ball physics test script - v4.4.2 IMPROVED for FlightScope data
// Run with: node test-flightscope3-v2.js

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

// v4.4.2 IMPROVED Drag Coefficient - Reduced drag for 70-90 mph range
function getCd(speedMPH, vlaDegs) {
    // Low VLA shots (< 10°) need special handling - much higher drag
    if (vlaDegs < 10) {
        if (speedMPH <= 60) {
            return 0.65;
        } else if (speedMPH <= 85) {
            const t = (speedMPH - 60) / (85 - 60);
            return 0.65 - t * (0.65 - 0.55); // 0.65 → 0.55
        } else {
            return 0.55;
        }
    }

    // Normal shots - REDUCED drag for better carry
    if (speedMPH <= 55) {
        return 0.75; // Reduced from 0.85
    } else if (speedMPH <= 75) {
        const t = (speedMPH - 55) / (75 - 55);
        return 0.75 - t * (0.75 - 0.25); // 0.75 → 0.25
    } else if (speedMPH <= 100) {
        const t = (speedMPH - 75) / (100 - 75);
        return 0.25 - t * (0.25 - 0.18); // 0.25 → 0.18
    } else if (speedMPH <= 126) {
        const t = (speedMPH - 100) / (126 - 100);
        return 0.18 - t * (0.18 - 0.14); // 0.18 → 0.14
    } else if (speedMPH <= 150) {
        const t = (speedMPH - 126) / (150 - 126);
        return 0.14 - t * (0.14 - 0.10);
    } else {
        return 0.10;
    }
}

// Simulate golf shot
function simulateShot(speedMPH, vlaDegs, hlaDegs, backspinRPM, sidespinRPM) {
    const deltaTime = 0.0016; // ~60 FPS
    const maxTime = 15; // seconds

    // Convert to SI and radians
    const speedMS = speedMPH * 0.44704;
    const vlaRad = vlaDegs * Math.PI / 180;
    const hlaRad = hlaDegs * Math.PI / 180;

    // Calculate total spin and spin axis from backspin/sidespin
    const totalSpinRPM = Math.sqrt(backspinRPM * backspinRPM + sidespinRPM * sidespinRPM);
    const spinAxisDegs = Math.atan2(sidespinRPM, backspinRPM) * 180 / Math.PI;

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
    let descentAngle = 0;

    while (ballInFlight && time < maxTime) {
        // Convert velocity to ft/s for physics calculations
        const vxFtS = ballVelocity.x * 3.28084;
        const vyFtS = -ballVelocity.z * 3.28084;
        const vzFtS = ballVelocity.y * 3.28084;
        const speed = Math.sqrt(vxFtS * vxFtS + vyFtS * vyFtS + vzFtS * vzFtS);

        if (speed < 0.1) break;

        const currentSpeedMPH = speed / 1.467;
        const currentVLA = Math.asin(ballVelocity.y / Math.sqrt(
            ballVelocity.x * ballVelocity.x +
            ballVelocity.y * ballVelocity.y +
            ballVelocity.z * ballVelocity.z
        )) * 180 / Math.PI;

        // v4.4.2 IMPROVED Drag (VLA-aware)
        let Cd = getCd(currentSpeedMPH, vlaDegs);

        // Spin-dependent drag adjustment
        const currentSpinRPM = totalSpinRadS * 30 / Math.PI;
        let spinDragMultiplier = 1.0;
        if (currentSpinRPM >= 5000) {
            spinDragMultiplier = 0.88; // Reduced from 0.85
        } else if (currentSpinRPM >= 4000) {
            const t = (currentSpinRPM - 4000) / (5000 - 4000);
            spinDragMultiplier = 1.0 - t * 0.12;
        } else if (currentSpinRPM >= 3000) {
            const t = (currentSpinRPM - 3000) / (4000 - 3000);
            spinDragMultiplier = 1.03 - t * 0.03;
        } else {
            spinDragMultiplier = 1.03;
        }

        // High-loft drag reduction (20°+ VLA)
        let highLoftDragMultiplier = 1.0;
        if (vlaDegs >= 20) {
            if (currentSpeedMPH >= 50) {
                highLoftDragMultiplier = 0.82; // Slightly increased from 0.80
            } else if (currentSpeedMPH >= 30) {
                const t = (currentSpeedMPH - 30) / (50 - 30);
                highLoftDragMultiplier = 0.90 + t * (0.82 - 0.90);
            } else {
                highLoftDragMultiplier = 0.95;
            }
        }

        const dragFactor = -DRAG_CONST * Cd * speed * spinDragMultiplier * highLoftDragMultiplier;
        const dragAccelX = dragFactor * vxFtS;
        const dragAccelY = dragFactor * vyFtS;
        const dragAccelZ = dragFactor * vzFtS;

        // Magnus force
        let magnusAccelX = 0, magnusAccelY = 0, magnusAccelZ = 0;
        if (speed > 0.1 && totalSpinRadS > 1) {
            const crossX = wy * vzFtS - 0 * vyFtS;
            const crossY = 0 * vxFtS - wx * vzFtS;
            const crossZ = wx * vyFtS - wy * vxFtS;

            const S = totalSpinRadS / speed;
            const ClAmp = 0.217;
            let liftCoeff = ClAmp * Math.pow(S, 0.4);

            // Reduced low-speed Magnus penalty
            if (currentSpeedMPH < 60) {
                const speedFactor = currentSpeedMPH / 60;
                liftCoeff *= (0.4 + 0.6 * speedFactor); // Changed from 0.3 + 0.7
            }

            // High-loft Magnus boost
            if (vlaDegs >= 20) {
                liftCoeff *= 1.25; // Increased from 1.22
            }

            const magnusFactor = MAGNUS_CONST * (liftCoeff / totalSpinRadS) * speed;
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

        // Spin decay
        totalSpinRadS *= Math.exp(-deltaTime / 24.5);

        // Update position
        ballPosition.x += ballVelocity.x * deltaTime;
        ballPosition.y += ballVelocity.y * deltaTime;
        ballPosition.z += ballVelocity.z * deltaTime;

        // Ground collision
        if (ballPosition.y <= 0.021336 && ballVelocity.y < 0) {
            if (!hasLanded) {
                hasLanded = true;
                carryDistance = Math.sqrt(ballPosition.x * ballPosition.x + ballPosition.z * ballPosition.z) * 1.09361;

                const horizontalSpeed = Math.sqrt(ballVelocity.x * ballVelocity.x + ballVelocity.z * ballVelocity.z);
                landingSpeedMPH = horizontalSpeed * 2.237;
                landingSpinRPM = totalSpinRadS * 30 / Math.PI;
                const verticalSpeed = Math.abs(ballVelocity.y);
                descentAngle = Math.atan2(verticalSpeed, horizontalSpeed) * 180 / Math.PI;
            }

            ballPosition.y = 0.021336;

            // Bounce
            if (Math.abs(ballVelocity.y) > 0.5) {
                ballVelocity.y = -ballVelocity.y * 0.5;

                const horizontalSpeed = Math.sqrt(ballVelocity.x * ballVelocity.x + ballVelocity.z * ballVelocity.z);
                const currentLandingSpeed = horizontalSpeed * 2.237;

                // Bounce retention based on landing speed
                let baseBounce;
                if (currentLandingSpeed <= 30) {
                    baseBounce = 0.80;
                } else if (currentLandingSpeed <= 40) {
                    const t = (currentLandingSpeed - 30) / (40 - 30);
                    baseBounce = 0.80 - t * (0.80 - 0.65);
                } else if (currentLandingSpeed <= 60) {
                    const t = (currentLandingSpeed - 40) / (60 - 40);
                    baseBounce = 0.65 - t * (0.65 - 0.45);
                } else if (currentLandingSpeed <= 80) {
                    const t = (currentLandingSpeed - 60) / (80 - 60);
                    baseBounce = 0.45 - t * (0.45 - 0.35);
                } else {
                    baseBounce = 0.35;
                }

                // Spin effect on bounce
                const currentBounceSpinRPM = totalSpinRadS * 30 / Math.PI;
                let spinBounce = 1.0;
                if (currentBounceSpinRPM >= 5000) {
                    spinBounce = 0.70;
                } else if (currentBounceSpinRPM >= 3000) {
                    const t = (currentBounceSpinRPM - 3000) / (5000 - 3000);
                    spinBounce = 0.90 - t * (0.90 - 0.70);
                } else if (currentBounceSpinRPM >= 2000) {
                    const t = (currentBounceSpinRPM - 2000) / (3000 - 2000);
                    spinBounce = 1.0 - t * (1.0 - 0.90);
                }

                const bounceRetention = baseBounce * spinBounce;
                ballVelocity.x *= bounceRetention;
                ballVelocity.z *= bounceRetention;
            } else {
                // Rolling - MUCH HIGHER friction for less roll
                const currentRollSpinRPM = totalSpinRadS * 30 / Math.PI;

                // Base friction - SIGNIFICANTLY INCREASED
                let baseFriction = 0.055; // Increased from 0.035

                // High spin = much more friction (stops faster)
                if (currentRollSpinRPM >= 4000) {
                    baseFriction = 0.085; // Very high friction for high spin
                } else if (currentRollSpinRPM >= 3000) {
                    const t = (currentRollSpinRPM - 3000) / (4000 - 3000);
                    baseFriction = 0.065 + t * (0.085 - 0.065);
                } else if (currentRollSpinRPM >= 2000) {
                    const t = (currentRollSpinRPM - 2000) / (3000 - 2000);
                    baseFriction = 0.055 + t * (0.065 - 0.055);
                } else if (currentRollSpinRPM >= 1500) {
                    const t = (currentRollSpinRPM - 1500) / (2000 - 1500);
                    baseFriction = 0.040 + t * (0.055 - 0.040);
                } else {
                    baseFriction = 0.040; // Low spin still rolls more
                }

                const speed = Math.sqrt(ballVelocity.x * ballVelocity.x + ballVelocity.z * ballVelocity.z);
                if (speed > 0.01) {
                    const frictionDecel = Math.min(baseFriction * 9.81 * deltaTime / speed, 1);
                    ballVelocity.x *= (1 - frictionDecel);
                    ballVelocity.z *= (1 - frictionDecel);
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

// Read and test flightscope3.csv data
const csvData = fs.readFileSync('/home/shreen/Documents/flightscope3.csv', 'utf-8');
const lines = csvData.trim().split('\n').filter(line => line.trim() !== '');
const header = lines[0].split(',');

console.log('\n=== FLIGHTSCOPE3.CSV TEST RESULTS (v4.4.2 IMPROVED Physics) ===\n');
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
    const totalYards = parseFloat(testData['Total (yd)']);

    const spinAxisRad = spinAxis * Math.PI / 180;
    const backspin = totalSpin * Math.cos(spinAxisRad);
    const sidespin = totalSpin * Math.sin(spinAxisRad);

    if (isNaN(ballSpeed) || isNaN(vla) || ballSpeed === 0) {
        continue;
    }

    const rollYards = totalYards - carryYards;

    const result = simulateShot(ballSpeed, vla, hla, backspin, sidespin);

    const carryError = result.carry - carryYards;
    const rollError = result.roll - rollYards;
    const totalError = result.total - totalYards;

    totalCarryError += Math.abs(carryError);
    totalRollError += Math.abs(rollError);
    totalDistanceError += Math.abs(totalError);
    testCount++;

    const passed = Math.abs(totalError) <= 3.0;
    if (passed) passCount++;

    console.log(`Shot ${i}: ${ballSpeed.toFixed(1)} mph, ${totalSpin.toFixed(0)} rpm, ${vla.toFixed(1)}° VLA`);
    console.log(`  Actual:     ${carryYards.toFixed(1)} carry + ${rollYards.toFixed(1)} roll = ${totalYards.toFixed(1)} total`);
    console.log(`  Simulated:  ${result.carry.toFixed(1)} carry + ${result.roll.toFixed(1)} roll = ${result.total.toFixed(1)} total`);
    console.log(`  Error: ${carryError >= 0 ? '+' : ''}${carryError.toFixed(1)} carry, ${rollError >= 0 ? '+' : ''}${rollError.toFixed(1)} roll, ${totalError >= 0 ? '+' : ''}${totalError.toFixed(1)} total ${passed ? '✅' : '❌'}`);
    console.log('');
}

console.log('=== SUMMARY ===');
console.log(`Tests Passing (±3 yards): ${passCount}/${testCount}`);
console.log(`Average Carry Error: ${(totalCarryError / testCount).toFixed(1)} yards`);
console.log(`Average Roll Error: ${(totalRollError / testCount).toFixed(1)} yards`);
console.log(`Average Total Error: ${(totalDistanceError / testCount).toFixed(1)} yards`);
console.log('');
