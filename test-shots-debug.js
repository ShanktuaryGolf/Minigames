#!/usr/bin/env node

// Debug script to analyze high-loft shot physics
// Run with: node test-shots-debug.js

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

// v4.4.1 Drag Coefficient
function getCd(speedMPH) {
    if (speedMPH <= 55) {
        return 0.85;
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

// Detailed simulation with debug output
function simulateShot(speedMPH, vlaDegs, hlaDegs, backspinRPM, sidespinRPM, shotName) {
    console.log(`\n=== ${shotName} DEBUG ===`);
    console.log(`Input: ${speedMPH.toFixed(1)} mph, ${vlaDegs.toFixed(1)}° VLA, ${backspinRPM.toFixed(0)} RPM backspin, ${sidespinRPM.toFixed(0)} RPM sidespin`);

    const deltaTime = 0.0016;
    const maxTime = 15;

    const speedMS = speedMPH * 0.44704;
    const vlaRad = vlaDegs * Math.PI / 180;
    const hlaRad = hlaDegs * Math.PI / 180;

    const totalSpinRPM = Math.sqrt(backspinRPM * backspinRPM + sidespinRPM * sidespinRPM);
    const spinAxisDegs = Math.atan2(sidespinRPM, backspinRPM) * 180 / Math.PI;

    // Calculate velocity components
    const vx = speedMS * Math.sin(hlaRad) * Math.cos(vlaRad);
    const vy = speedMS * Math.sin(vlaRad);
    const vz = -speedMS * Math.cos(hlaRad) * Math.cos(vlaRad);

    console.log(`Velocity components: vx=${vx.toFixed(2)} m/s, vy=${vy.toFixed(2)} m/s (up), vz=${vz.toFixed(2)} m/s (forward)`);
    console.log(`Horizontal speed: ${Math.sqrt(vx*vx + vz*vz).toFixed(2)} m/s (${(Math.sqrt(vx*vx + vz*vz) * 2.237).toFixed(1)} mph)`);
    console.log(`Vertical speed: ${vy.toFixed(2)} m/s (${(vy * 2.237).toFixed(1)} mph)`);

    let ballVelocity = { x: vx, y: vy, z: vz };
    let ballPosition = { x: 0, y: 3.146, z: 0 };

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
    let maxHeight = 3.146;
    let descentAngle = 0;

    while (ballInFlight && time < maxTime) {
        const vxFtS = ballVelocity.x * 3.28084;
        const vyFtS = -ballVelocity.z * 3.28084;
        const vzFtS = ballVelocity.y * 3.28084;
        const speed = Math.sqrt(vxFtS * vxFtS + vyFtS * vyFtS + vzFtS * vzFtS);

        if (speed < 0.1) break;

        const currentSpeedMPH = speed / 1.467;

        // Drag
        const Cd = getCd(currentSpeedMPH);
        const dragFactor = -DRAG_CONST * Cd * speed;
        const dragAccelX = dragFactor * vxFtS;
        const dragAccelY = dragFactor * vyFtS;
        const dragAccelZ = dragFactor * vzFtS;

        // Magnus
        let magnusAccelX = 0, magnusAccelY = 0, magnusAccelZ = 0;
        if (speed > 0.1 && totalSpinRadS > 1) {
            const S = totalSpinRadS / speed;
            const ClAmp = 0.217;
            let liftCoeff = ClAmp * Math.pow(S, 0.4);

            if (currentSpeedMPH < 60) {
                const speedFactor = currentSpeedMPH / 60;
                liftCoeff *= (0.3 + 0.7 * speedFactor);
            }

            const magnusFactor = MAGNUS_CONST * (liftCoeff / totalSpinRadS) * speed;

            const crossX = wy * vzFtS - 0 * vyFtS;
            const crossY = 0 * vxFtS - wx * vzFtS;
            const crossZ = wx * vyFtS - wy * vxFtS;

            magnusAccelX = magnusFactor * crossX;
            magnusAccelY = magnusFactor * crossY;
            magnusAccelZ = magnusFactor * crossZ;
        }

        const totalAccelX = dragAccelX + magnusAccelX;
        const totalAccelY = dragAccelY + magnusAccelY;
        const totalAccelZ = dragAccelZ + magnusAccelZ - GRAVITY;

        ballVelocity.x += (totalAccelX / 3.28084) * deltaTime;
        ballVelocity.z += -(totalAccelY / 3.28084) * deltaTime;
        ballVelocity.y += (totalAccelZ / 3.28084) * deltaTime;

        totalSpinRadS *= Math.exp(-deltaTime / 24.5);
        const currentSpinRPM = totalSpinRadS * 30 / Math.PI;

        ballPosition.x += ballVelocity.x * deltaTime;
        ballPosition.y += ballVelocity.y * deltaTime;
        ballPosition.z += ballVelocity.z * deltaTime;

        if (ballPosition.y > maxHeight) {
            maxHeight = ballPosition.y;
        }

        const groundY = 0;
        if (ballPosition.y - BALL_RADIUS <= groundY && ballVelocity.y < 0) {
            ballPosition.y = groundY + BALL_RADIUS;

            if (!hasLanded) {
                hasLanded = true;
                carryDistance = Math.sqrt(ballPosition.x * ballPosition.x + ballPosition.z * ballPosition.z) * 1.09361;
                const horizontalSpeed = Math.sqrt(ballVelocity.x * ballVelocity.x + ballVelocity.z * ballVelocity.z);
                landingSpeedMPH = horizontalSpeed * 2.237;
                landingSpinRPM = currentSpinRPM;

                // Calculate descent angle
                const verticalSpeed = Math.abs(ballVelocity.y);
                descentAngle = Math.atan2(verticalSpeed, horizontalSpeed) * 180 / Math.PI;

                console.log(`\nLANDING:`);
                console.log(`  Carry: ${carryDistance.toFixed(1)} yards`);
                console.log(`  Max height: ${(maxHeight * 3.28084).toFixed(1)} feet`);
                console.log(`  Landing horizontal speed: ${landingSpeedMPH.toFixed(1)} mph`);
                console.log(`  Landing vertical speed: ${(verticalSpeed * 2.237).toFixed(1)} mph`);
                console.log(`  Descent angle: ${descentAngle.toFixed(1)}°`);
                console.log(`  Landing spin: ${landingSpinRPM.toFixed(0)} RPM`);
            }

            if (Math.abs(ballVelocity.y) > 0.5) {
                ballVelocity.y = -ballVelocity.y * 0.3;
                const horizontalSpeed = Math.sqrt(ballVelocity.x * ballVelocity.x + ballVelocity.z * ballVelocity.z);
                ballVelocity.x *= 0.5;
                ballVelocity.z *= 0.5;
            } else {
                ballVelocity.y = 0;

                const horizontalSpeed = Math.sqrt(ballVelocity.x * ballVelocity.x + ballVelocity.z * ballVelocity.z);
                if (horizontalSpeed > 0.05) {
                    const GREEN_FRICTION = 8.0;

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

    console.log(`\nFINAL:`);
    console.log(`  Carry: ${carryDistance.toFixed(1)} yards`);
    console.log(`  Roll: ${rollDistance.toFixed(1)} yards`);
    console.log(`  Total: ${totalDistance.toFixed(1)} yards`);
    console.log(`  Descent angle: ${descentAngle.toFixed(1)}°`);

    return { carry: carryDistance, roll: rollDistance, total: totalDistance, descentAngle: descentAngle };
}

// Read shots.csv
const csvData = fs.readFileSync('/home/shreen/Documents/shots.csv', 'utf-8');
const lines = csvData.trim().split('\n').filter(line => line.trim() !== '');
const header = lines[0].split(',');

console.log('\n=== HIGH-LOFT SHOT PHYSICS DEBUG ===');

// Test first 3 shots only (skip shot 4 - bad data)
for (let i = 1; i <= 3; i++) {
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
    const rollYards = totalYards - carryYards;

    const result = simulateShot(ballSpeed, vla, hla, backspin, sidespin, `Shot ${i}`);

    console.log(`\nACTUAL vs SIMULATED:`);
    console.log(`  Actual:     ${carryYards.toFixed(1)} carry + ${rollYards.toFixed(1)} roll = ${totalYards.toFixed(1)} total`);
    console.log(`  Simulated:  ${result.carry.toFixed(1)} carry + ${result.roll.toFixed(1)} roll = ${result.total.toFixed(1)} total`);
    console.log(`  Error: ${(result.carry - carryYards).toFixed(1)} carry, ${(result.roll - rollYards).toFixed(1)} roll, ${(result.total - totalYards).toFixed(1)} total`);
    console.log('\n' + '='.repeat(80));
}
