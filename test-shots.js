#!/usr/bin/env node

// Golf ball physics test script - Testing against shots.csv
// Run with: node test-shots.js

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

// v4.4.1 Drag Coefficient (speed-based with low-speed fix)
function getCd(speedMPH) {
    if (speedMPH <= 55) {
        return 0.85; // Higher drag for low-speed chips/putts
    } else if (speedMPH <= 75) {
        const t = (speedMPH - 55) / (75 - 55);
        return 0.85 - t * (0.85 - 0.31);
    } else if (speedMPH <= 100) {
        const t = (speedMPH - 75) / (100 - 75);
        return 0.31 - t * (0.31 - 0.22);
    } else if (speedMPH <= 126) {
        const t = (speedMPH - 100) / (126 - 100);
        return 0.22 - t * (0.22 - 0.17);
    } else if (speedMPH <= 150) {
        const t = (speedMPH - 126) / (150 - 126);
        return 0.17 - t * (0.17 - 0.10);
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

        // v4.4.1 Drag (with high-loft adjustment)
        let Cd = getCd(currentSpeedMPH);

        // High-loft shots (22-26° VLA) have better lift-to-drag ratio
        // Reduce drag coefficient for these shots, less reduction at low speeds
        if (vlaDegs >= 20) {
            let dragReduction;
            if (currentSpeedMPH >= 50) {
                dragReduction = 0.80; // 20% less drag at full speed
            } else if (currentSpeedMPH >= 30) {
                const t = (currentSpeedMPH - 30) / (50 - 30);
                dragReduction = 0.90 + t * (0.80 - 0.90); // 10% at 30 mph → 20% at 50 mph
            } else {
                dragReduction = 0.95; // Minimal reduction below 30 mph
            }
            Cd *= dragReduction;
        }

        const dragFactor = -DRAG_CONST * Cd * speed;
        const dragAccelX = dragFactor * vxFtS;
        const dragAccelY = dragFactor * vyFtS;
        const dragAccelZ = dragFactor * vzFtS;

        // v4.4.1 Magnus Lift
        let magnusAccelX = 0, magnusAccelY = 0, magnusAccelZ = 0;
        if (speed > 0.1 && totalSpinRadS > 1) {
            const S = totalSpinRadS / speed;
            const ClAmp = 0.217;
            let liftCoeff = ClAmp * Math.pow(S, 0.4);

            // Low-speed Magnus reduction
            if (currentSpeedMPH < 60) {
                const speedFactor = currentSpeedMPH / 60;
                liftCoeff *= (0.3 + 0.7 * speedFactor);
            }

            // High-loft shot Magnus boost (steeper angles generate more effective lift)
            if (vlaDegs >= 20) {
                liftCoeff *= 1.22; // 22% more lift for high-loft shots
            }

            const magnusFactor = MAGNUS_CONST * (liftCoeff / totalSpinRadS) * speed;

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

        // Spin decay
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

                // Calculate descent angle
                const verticalSpeed = Math.abs(ballVelocity.y);
                descentAngle = Math.atan2(verticalSpeed, horizontalSpeed) * 180 / Math.PI;
            }

            // Bounce
            if (Math.abs(ballVelocity.y) > 0.5) {
                ballVelocity.y = -ballVelocity.y * 0.3;
                const horizontalSpeed = Math.sqrt(ballVelocity.x * ballVelocity.x + ballVelocity.z * ballVelocity.z);

                // Base bounce factor is 0.5, but add descent angle bonus for high-loft shots
                let baseBounce = 0.5;
                let descentBonus = 0;
                if (descentAngle >= 40) {
                    descentBonus = 0.35; // Very steep (wedge shots) - significant forward energy
                } else if (descentAngle >= 30) {
                    const t = (descentAngle - 30) / (40 - 30);
                    descentBonus = 0.0 + t * 0.35;
                }
                const bounceFactor = Math.min(0.95, baseBounce + descentBonus);

                ballVelocity.x *= bounceFactor;
                ballVelocity.z *= bounceFactor;
            } else {
                ballVelocity.y = 0;

                // Rolling friction - v4.4.1 calibration
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

                    // High-loft shot adjustment: Steep descent angles reduce friction (ball has more forward energy)
                    let descentFrictionReduction = 1.0;
                    if (descentAngle >= 40) {
                        descentFrictionReduction = 0.50; // Very steep - less friction (was 0.25, too much roll)
                    } else if (descentAngle >= 30) {
                        const t = (descentAngle - 30) / (40 - 30);
                        descentFrictionReduction = 1.0 - t * (1.0 - 0.50);
                    }

                    const frictionDecel = GREEN_FRICTION * spinFrictionMultiplier * landingSpeedFactor * descentFrictionReduction;
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

// Read and test shots.csv data
const csvData = fs.readFileSync('/home/shreen/Documents/shots.csv', 'utf-8');
const lines = csvData.trim().split('\n').filter(line => line.trim() !== '');
const header = lines[0].split(',');

console.log('\n=== SHOTS.CSV TEST RESULTS (v4.4.1 Physics) ===\n');
console.log('Testing against your shot data...\n');

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

    const ballSpeed = parseFloat(testData['BallSpeed']);
    const vla = parseFloat(testData['VLA']);
    const hla = parseFloat(testData['HLA']);
    const backspin = parseFloat(testData['BackSpin']);
    const sidespin = parseFloat(testData['SideSpin']);
    const carryYards = parseFloat(testData['Carry']);
    const totalYards = parseFloat(testData['TotalDistance']);

    // Skip invalid data
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

    const totalSpin = Math.sqrt(backspin * backspin + sidespin * sidespin);

    console.log(`Shot ${i}: ${ballSpeed.toFixed(1)} mph, ${totalSpin.toFixed(0)} rpm`);
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
