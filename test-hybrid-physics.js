#!/usr/bin/env node

// Golf ball physics test script - THREE-REGIME PHYSICS (v4.4.4)
// Uses three regimes: Wedge (< 65 mph), Low-VLA Iron (65+ mph, VLA < 15°), Normal Iron (65+ mph, VLA ≥ 15°)
// Run with: node test-hybrid-physics-v4.4.4.js

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

// HYBRID Drag Coefficient - switches regime based on initial ball speed
function getCd(speedMPH, vlaDegs, initialSpeedMPH) {
    // Determine physics regime based on INITIAL shot speed
    const isWedgeShot = initialSpeedMPH < 65; // < 65 mph = wedge physics

    // Low VLA shots (< 10°) need special handling regardless of speed
    if (vlaDegs < 10) {
        if (speedMPH <= 60) {
            return 0.65;
        } else if (speedMPH <= 85) {
            const t = (speedMPH - 60) / (85 - 60);
            return 0.65 - t * (0.65 - 0.55);
        } else {
            return 0.55;
        }
    }

    // WEDGE REGIME (< 65 mph initial) - v4.4.1 calibration
    if (isWedgeShot) {
        if (speedMPH <= 55) {
            return 0.85; // Higher drag for chips/wedges
        } else if (speedMPH <= 75) {
            const t = (speedMPH - 55) / (75 - 55);
            return 0.85 - t * (0.85 - 0.31);
        } else if (speedMPH <= 100) {
            const t = (speedMPH - 75) / (100 - 75);
            return 0.31 - t * (0.31 - 0.22);
        } else {
            return 0.22;
        }
    }

    // IRON REGIME (65+ mph initial) - v4.4.2 calibration
    if (speedMPH <= 55) {
        return 0.75; // Reduced drag for irons
    } else if (speedMPH <= 75) {
        const t = (speedMPH - 55) / (75 - 55);
        return 0.75 - t * (0.75 - 0.25);
    } else if (speedMPH <= 100) {
        const t = (speedMPH - 75) / (100 - 75);
        return 0.25 - t * (0.25 - 0.18);
    } else if (speedMPH <= 126) {
        const t = (speedMPH - 100) / (126 - 100);
        return 0.18 - t * (0.18 - 0.14);
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
    const initialSpeedMPH = speedMPH; // Store initial speed for regime detection
    const initialVLADegs = vlaDegs; // Store initial VLA for regime detection

    // Determine physics regime (THREE REGIMES in v4.4.4)
    let physicsRegime;
    if (initialSpeedMPH < 65) {
        physicsRegime = 'WEDGE'; // Wedge/chip shots
    } else if (initialVLADegs < 15) {
        physicsRegime = 'LOW_VLA_IRON'; // Punch shots, low irons
    } else {
        physicsRegime = 'NORMAL_IRON'; // Standard iron shots
    }

    const isWedgeShot = physicsRegime === 'WEDGE';
    const isLowVLAIron = physicsRegime === 'LOW_VLA_IRON';

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

    while (ballInFlight && time < maxTime) {
        // Convert velocity to ft/s for physics calculations
        const vxFtS = ballVelocity.x * 3.28084;
        const vyFtS = -ballVelocity.z * 3.28084;
        const vzFtS = ballVelocity.y * 3.28084;
        const speed = Math.sqrt(vxFtS * vxFtS + vyFtS * vyFtS + vzFtS * vzFtS);

        if (speed < 0.1) break;

        const currentSpeedMPH = speed / 1.467;

        // HYBRID Drag coefficient
        let Cd = getCd(currentSpeedMPH, vlaDegs, initialSpeedMPH);

        // Spin-dependent drag adjustment
        const currentSpinRPM = totalSpinRadS * 30 / Math.PI;
        let spinDragMultiplier = 1.0;

        if (isWedgeShot) {
            // Wedge regime spin adjustment (v4.4.1)
            if (currentSpinRPM >= 5000) {
                spinDragMultiplier = 0.85;
            } else if (currentSpinRPM >= 4000) {
                const t = (currentSpinRPM - 4000) / (5000 - 4000);
                spinDragMultiplier = 1.0 - t * 0.15;
            } else if (currentSpinRPM >= 3000) {
                const t = (currentSpinRPM - 3000) / (4000 - 3000);
                spinDragMultiplier = 1.05 - t * 0.05;
            } else {
                spinDragMultiplier = 1.05;
            }
        } else {
            // Iron regime spin adjustment - tuned for more distance on low-spin
            if (currentSpinRPM >= 5000) {
                spinDragMultiplier = 0.88;
            } else if (currentSpinRPM >= 4000) {
                const t = (currentSpinRPM - 4000) / (5000 - 4000);
                spinDragMultiplier = 1.01 - t * 0.13;
            } else if (currentSpinRPM >= 3000) {
                const t = (currentSpinRPM - 3000) / (4000 - 3000);
                spinDragMultiplier = 1.01 - t * 0.00; // Slight increase for med-low spin
            } else if (currentSpinRPM >= 2000) {
                const t = (currentSpinRPM - 2000) / (3000 - 2000);
                spinDragMultiplier = 0.98 + t * 0.03; // Slight drag reduction
            } else {
                spinDragMultiplier = 0.95; // Moderate drag reduction for very low spin (< 2000 rpm)
            }
        }

        // High-loft drag reduction (20°+ VLA)
        let highLoftDragMultiplier = 1.0;
        if (vlaDegs >= 20) {
            if (isWedgeShot) {
                // v4.4.1 high-loft adjustment
                if (currentSpeedMPH >= 50) {
                    highLoftDragMultiplier = 0.80;
                } else if (currentSpeedMPH >= 30) {
                    const t = (currentSpeedMPH - 30) / (50 - 30);
                    highLoftDragMultiplier = 0.90 + t * (0.80 - 0.90);
                } else {
                    highLoftDragMultiplier = 0.95;
                }
            } else {
                // v4.4.2 high-loft adjustment
                if (currentSpeedMPH >= 50) {
                    highLoftDragMultiplier = 0.82;
                } else if (currentSpeedMPH >= 30) {
                    const t = (currentSpeedMPH - 30) / (50 - 30);
                    highLoftDragMultiplier = 0.90 + t * (0.82 - 0.90);
                } else {
                    highLoftDragMultiplier = 0.95;
                }
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

            // Low-speed Magnus penalty
            if (currentSpeedMPH < 60) {
                const speedFactor = currentSpeedMPH / 60;
                if (isWedgeShot) {
                    liftCoeff *= (0.3 + 0.7 * speedFactor); // v4.4.1
                } else {
                    liftCoeff *= (0.4 + 0.6 * speedFactor); // v4.4.2
                }
            }

            // High-loft Magnus boost (regime-specific)
            if (vlaDegs >= 20) {
                if (isWedgeShot) {
                    liftCoeff *= 1.22; // Wedge regime
                } else if (isLowVLAIron) {
                    liftCoeff *= 1.05; // Low-VLA irons rarely reach 20° but if they do, minimal boost
                } else {
                    liftCoeff *= 1.20; // Normal iron regime - moderate boost for high-loft irons
                }
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
            }

            ballPosition.y = 0.021336;

            // Bounce
            if (Math.abs(ballVelocity.y) > 0.5) {
                ballVelocity.y = -ballVelocity.y * 0.5;

                const horizontalSpeed = Math.sqrt(ballVelocity.x * ballVelocity.x + ballVelocity.z * ballVelocity.z);
                const currentLandingSpeed = horizontalSpeed * 2.237;

                // Bounce retention based on landing speed AND shot regime
                let baseBounce;
                if (isWedgeShot) {
                    // Wedge regime - normal bounces (v4.4.1)
                    if (currentLandingSpeed <= 30) {
                        baseBounce = 0.80;
                    } else if (currentLandingSpeed <= 40) {
                        const t = (currentLandingSpeed - 30) / (40 - 30);
                        baseBounce = 0.80 - t * (0.80 - 0.65);
                    } else if (currentLandingSpeed <= 60) {
                        const t = (currentLandingSpeed - 40) / (60 - 40);
                        baseBounce = 0.65 - t * (0.65 - 0.45);
                    } else {
                        baseBounce = 0.45;
                    }
                } else if (isLowVLAIron) {
                    // Low-VLA Iron regime - MUCH MORE bounce (shallow angle = skipping stone effect)
                    if (currentLandingSpeed <= 30) {
                        baseBounce = 0.90; // Very high bounce for low-VLA shots
                    } else if (currentLandingSpeed <= 40) {
                        const t = (currentLandingSpeed - 30) / (40 - 30);
                        baseBounce = 0.90 - t * (0.90 - 0.78);
                    } else if (currentLandingSpeed <= 60) {
                        const t = (currentLandingSpeed - 40) / (60 - 40);
                        baseBounce = 0.78 - t * (0.78 - 0.65);
                    } else if (currentLandingSpeed <= 80) {
                        const t = (currentLandingSpeed - 60) / (80 - 60);
                        baseBounce = 0.65 - t * (0.65 - 0.55);
                    } else {
                        baseBounce = 0.55; // Still high bounce even at high speed
                    }
                } else {
                    // Normal Iron regime - Moderately reduced bounce
                    if (currentLandingSpeed <= 30) {
                        baseBounce = 0.72;
                    } else if (currentLandingSpeed <= 40) {
                        const t = (currentLandingSpeed - 30) / (40 - 30);
                        baseBounce = 0.72 - t * (0.72 - 0.57);
                    } else if (currentLandingSpeed <= 60) {
                        const t = (currentLandingSpeed - 40) / (60 - 40);
                        baseBounce = 0.57 - t * (0.57 - 0.40);
                    } else if (currentLandingSpeed <= 80) {
                        const t = (currentLandingSpeed - 60) / (80 - 60);
                        baseBounce = 0.40 - t * (0.40 - 0.30);
                    } else {
                        baseBounce = 0.30;
                    }
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
                // Rolling friction - regime-specific
                const currentRollSpinRPM = totalSpinRadS * 30 / Math.PI;
                let baseFriction;

                if (isWedgeShot) {
                    // Wedge regime rolling (v4.4.1 - calibrated for shots.csv)
                    baseFriction = 0.025;
                    if (currentRollSpinRPM >= 4000) {
                        baseFriction = 0.040;
                    } else if (currentRollSpinRPM >= 3000) {
                        const t = (currentRollSpinRPM - 3000) / (4000 - 3000);
                        baseFriction = 0.025 + t * (0.040 - 0.025);
                    }
                } else if (isLowVLAIron) {
                    // Low-VLA Iron regime - VERY LOW friction (skipping stone effect)
                    baseFriction = 0.015; // Even lower base friction for more distance
                    if (currentRollSpinRPM >= 4000) {
                        baseFriction = 0.035; // Reduced from 0.040
                    } else if (currentRollSpinRPM >= 3000) {
                        const t = (currentRollSpinRPM - 3000) / (4000 - 3000);
                        baseFriction = 0.022 + t * (0.035 - 0.022);
                    } else if (currentRollSpinRPM >= 2000) {
                        const t = (currentRollSpinRPM - 2000) / (3000 - 2000);
                        baseFriction = 0.015 + t * (0.022 - 0.015);
                    }
                } else {
                    // Normal Iron regime rolling
                    baseFriction = 0.045; // Reduced from 0.050 for more distance on low-spin
                    if (currentRollSpinRPM >= 4000) {
                        baseFriction = 0.078; // Keep high-spin friction same
                    } else if (currentRollSpinRPM >= 3000) {
                        const t = (currentRollSpinRPM - 3000) / (4000 - 3000);
                        baseFriction = 0.056 + t * (0.078 - 0.056);
                    } else if (currentRollSpinRPM >= 2000) {
                        const t = (currentRollSpinRPM - 2000) / (3000 - 2000);
                        baseFriction = 0.045 + t * (0.056 - 0.045);
                    } else if (currentRollSpinRPM < 2000) {
                        // Extra low friction for very low spin (like shot #10 at 1492 rpm)
                        baseFriction = 0.038;
                    }
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

// Test against shots.csv (wedges)
console.log('\n=== HYBRID PHYSICS TEST - WEDGES (shots.csv) ===\n');

const shotsData = fs.readFileSync('/home/shreen/Documents/shots.csv', 'utf-8');
const shotsLines = shotsData.trim().split('\n').filter(line => line.trim() !== '');
const shotsHeader = shotsLines[0].split(',');

let wedgeTotalError = 0;
let wedgePassCount = 0;
let wedgeTestCount = 0;

for (let i = 1; i < shotsLines.length; i++) {
    const values = shotsLines[i].split(',');
    const testData = {};
    shotsHeader.forEach((key, idx) => {
        testData[key.trim()] = values[idx];
    });

    const ballSpeed = parseFloat(testData['BallSpeed']);
    const vla = parseFloat(testData['VLA']);
    const hla = parseFloat(testData['HLA']);
    const backspin = parseFloat(testData['BackSpin']);
    const sidespin = parseFloat(testData['SideSpin']);
    const totalYards = parseFloat(testData['TotalDistance']);

    if (isNaN(ballSpeed) || isNaN(vla) || ballSpeed === 0) continue;

    const result = simulateShot(ballSpeed, vla, hla, backspin, sidespin);
    const totalError = result.total - totalYards;

    wedgeTotalError += Math.abs(totalError);
    wedgeTestCount++;

    const passed = Math.abs(totalError) <= 3.0;
    if (passed) wedgePassCount++;

    console.log(`Shot ${i}: ${ballSpeed.toFixed(1)} mph → ${totalYards.toFixed(1)} actual, ${result.total.toFixed(1)} sim (${totalError >= 0 ? '+' : ''}${totalError.toFixed(1)}) ${passed ? '✅' : '❌'}`);
}

console.log(`\nWedges: ${wedgePassCount}/${wedgeTestCount} passing, Avg error: ${(wedgeTotalError / wedgeTestCount).toFixed(1)} yds\n`);

// Test against flightscope3.csv (irons)
console.log('=== HYBRID PHYSICS TEST - IRONS (flightscope3.csv) ===\n');

const fsData = fs.readFileSync('/home/shreen/Documents/flightscope3.csv', 'utf-8');
const fsLines = fsData.trim().split('\n').filter(line => line.trim() !== '');
const fsHeader = fsLines[0].split(',');

let ironTotalError = 0;
let ironPassCount = 0;
let ironTestCount = 0;

for (let i = 1; i < fsLines.length; i++) {
    const values = fsLines[i].split(',');
    const testData = {};
    fsHeader.forEach((key, idx) => {
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

    const totalYards = parseFloat(testData['Total (yd)']);

    const spinAxisRad = spinAxis * Math.PI / 180;
    const backspin = totalSpin * Math.cos(spinAxisRad);
    const sidespin = totalSpin * Math.sin(spinAxisRad);

    if (isNaN(ballSpeed) || isNaN(vla) || ballSpeed === 0) continue;

    const result = simulateShot(ballSpeed, vla, hla, backspin, sidespin);
    const totalError = result.total - totalYards;

    ironTotalError += Math.abs(totalError);
    ironTestCount++;

    const passed = Math.abs(totalError) <= 3.0;
    if (passed) ironPassCount++;

    console.log(`Shot ${i}: ${ballSpeed.toFixed(1)} mph → ${totalYards.toFixed(1)} actual, ${result.total.toFixed(1)} sim (${totalError >= 0 ? '+' : ''}${totalError.toFixed(1)}) ${passed ? '✅' : '❌'}`);
}

console.log(`\nIrons: ${ironPassCount}/${ironTestCount} passing, Avg error: ${(ironTotalError / ironTestCount).toFixed(1)} yds\n`);

console.log('=== OVERALL SUMMARY ===');
console.log(`Wedges (<65 mph): ${wedgePassCount}/${wedgeTestCount} passing (${((wedgePassCount/wedgeTestCount)*100).toFixed(0)}%)`);
console.log(`Irons (65+ mph): ${ironPassCount}/${ironTestCount} passing (${((ironPassCount/ironTestCount)*100).toFixed(0)}%)`);
console.log(`Combined: ${wedgePassCount + ironPassCount}/${wedgeTestCount + ironTestCount} passing (${(((wedgePassCount + ironPassCount)/(wedgeTestCount + ironTestCount))*100).toFixed(0)}%)`);
console.log('');
