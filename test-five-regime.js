#!/usr/bin/env node

// Golf ball physics test script - FIVE-REGIME PHYSICS
// Regimes:
//   1. WEDGE: speed < 65 mph (3 shots, 35.6% roll)
//   2. LOW_TRAJECTORY: speed >= 65 AND vla < 10 (3 shots, 42.8% roll)
//   3. MID_IRON: speed >= 65 AND vla >= 10 AND vla < 20 (13 shots, 17.5% roll)
//   4. HIGH_IRON: speed >= 65 AND speed < 85 AND vla >= 20 (11 shots, 9.5% roll)
//   5. POWER_SHOT: speed >= 85 (4 shots, 18.0% roll)
//
// Tests against: flightscope3.csv (12 shots), shots.csv (4 wedge shots), flightscope4.csv (18 shots)
// Total: 34 shots
//
// Run with: node test-five-regime.js

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

// Five-regime drag coefficient function
function getCd(speedMPH, vlaDegs, physicsRegime, initialSpeedMPH) {
    // Special handling for LOW_TRAJECTORY shots (VLA < 10°) - regardless of regime
    if (vlaDegs < 10) {
        if (speedMPH <= 60) {
            return 0.60;
        } else if (speedMPH <= 85) {
            const t = (speedMPH - 60) / (85 - 60);
            return 0.60 - t * (0.60 - 0.55);
        } else {
            return 0.55;
        }
    }

    // WEDGE REGIME (< 65 mph initial) - v4.4.1 calibration (already 100% accurate)
    if (physicsRegime === 'WEDGE') {
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

    // POWER_SHOT REGIME (85+ mph initial) - Balanced drag for fast shots
    if (physicsRegime === 'POWER_SHOT') {
        if (speedMPH <= 55) {
            return 0.78; // Moderate drag at low speeds
        } else if (speedMPH <= 75) {
            const t = (speedMPH - 55) / (75 - 55);
            return 0.78 - t * (0.78 - 0.30);
        } else if (speedMPH <= 100) {
            const t = (speedMPH - 75) / (100 - 75);
            return 0.30 - t * (0.30 - 0.22);
        } else if (speedMPH <= 126) {
            const t = (speedMPH - 100) / (126 - 100);
            return 0.22 - t * (0.22 - 0.18);
        } else {
            return 0.18;
        }
    }

    // MID_IRON REGIME - Standard iron drag curve with speed boost for 80+ mph
    // HIGH_IRON REGIME - Higher drag curve for high loft
    const isHighIron = physicsRegime === 'HIGH_IRON';
    const isMidIron = physicsRegime === 'MID_IRON';

    let baseDragBoost = 1.0;
    if (isHighIron) {
        baseDragBoost = 1.08;
    } else if (isMidIron && initialSpeedMPH >= 80) {
        baseDragBoost = 1.06; // Extra drag for fast mid-iron shots
    }

    if (speedMPH <= 55) {
        return 0.75 * baseDragBoost;
    } else if (speedMPH <= 75) {
        const t = (speedMPH - 55) / (75 - 55);
        return (0.75 - t * (0.75 - 0.25)) * baseDragBoost;
    } else if (speedMPH <= 100) {
        const t = (speedMPH - 75) / (100 - 75);
        return (0.25 - t * (0.25 - 0.18)) * baseDragBoost;
    } else if (speedMPH <= 126) {
        const t = (speedMPH - 100) / (126 - 100);
        return (0.18 - t * (0.18 - 0.14)) * baseDragBoost;
    } else if (speedMPH <= 150) {
        const t = (speedMPH - 126) / (150 - 126);
        return (0.14 - t * (0.14 - 0.10)) * baseDragBoost;
    } else {
        return 0.10 * baseDragBoost;
    }
}

// Determine physics regime based on initial shot parameters
function determineRegime(initialSpeedMPH, initialVLADegs) {
    // Priority 1: WEDGE regime (< 65 mph)
    if (initialSpeedMPH < 65) {
        return 'WEDGE';
    }

    // Priority 2: POWER_SHOT regime (>= 85 mph) - check speed BEFORE VLA
    if (initialSpeedMPH >= 85) {
        return 'POWER_SHOT';
    }

    // Priority 3: LOW_TRAJECTORY (65-85 mph with VLA < 10°)
    if (initialVLADegs < 10) {
        return 'LOW_TRAJECTORY';
    }

    // Priority 4: MID_IRON (65-85 mph with 10° <= VLA < 20°)
    if (initialVLADegs < 20) {
        return 'MID_IRON';
    }

    // Priority 5: HIGH_IRON (65-85 mph with VLA >= 20°)
    return 'HIGH_IRON';
}

// Get regime-specific friction multiplier
function getRegimeFrictionMultiplier(physicsRegime, spinRPM) {
    switch (physicsRegime) {
        case 'WEDGE':
            return 1.0;

        case 'LOW_TRAJECTORY':
            return 0.70; // Lower friction for more roll (42.8% roll observed)

        case 'MID_IRON':
            // Spin-dependent friction for mid irons
            if (spinRPM >= 2000) {
                return 1.4;
            } else {
                return 1.0;
            }

        case 'HIGH_IRON':
            // Moderate friction with spin adjustment
            if (spinRPM >= 2000) {
                return 1.3;
            } else {
                return 1.1;
            }

        case 'POWER_SHOT':
            return 1.1;

        default:
            return 1.0;
    }
}

// Get regime-specific bounce retention
function getRegimeBounceRetention(physicsRegime) {
    switch (physicsRegime) {
        case 'WEDGE':
            return 0.72;
        case 'LOW_TRAJECTORY':
            return 0.78; // Moderate bounce for shallow trajectory
        case 'MID_IRON':
            return 0.75;
        case 'HIGH_IRON':
            return 0.70; // Sticky landings
        case 'POWER_SHOT':
            return 0.75;
        default:
            return 0.75;
    }
}

// Get regime-specific magnus lift boost
function getMagnusLiftBoost(physicsRegime, vlaDegs) {
    switch (physicsRegime) {
        case 'WEDGE':
            return vlaDegs >= 20 ? 1.22 : 1.0;

        case 'LOW_TRAJECTORY':
            return vlaDegs >= 20 ? 1.05 : 1.0; // Minimal boost

        case 'MID_IRON':
            return vlaDegs >= 15 ? 1.15 : 1.0;

        case 'HIGH_IRON':
            return vlaDegs >= 20 ? 1.05 : 1.0; // Minimal boost for high loft

        case 'POWER_SHOT':
            return vlaDegs >= 15 ? 1.10 : 1.0;

        default:
            return 1.0;
    }
}

// Simulate golf shot
function simulateShot(speedMPH, vlaDegs, hlaDegs, backspinRPM, sidespinRPM) {
    const deltaTime = 0.0016; // ~60 FPS
    const maxTime = 15; // seconds
    const initialSpeedMPH = speedMPH;
    const initialVLADegs = vlaDegs;

    // Determine physics regime (FIVE REGIMES)
    const physicsRegime = determineRegime(initialSpeedMPH, initialVLADegs);

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

        // Five-regime drag coefficient
        let Cd = getCd(currentSpeedMPH, vlaDegs, physicsRegime, initialSpeedMPH);

        // Spin-dependent drag adjustment
        const currentSpinRPM = totalSpinRadS * 30 / Math.PI;
        let spinDragMultiplier = 1.0;

        if (physicsRegime === 'WEDGE') {
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
        } else if (physicsRegime === 'POWER_SHOT') {
            // Power shot spin adjustment - extra drag for low-spin high-speed
            if (currentSpinRPM >= 5000) {
                spinDragMultiplier = 0.90;
            } else if (currentSpinRPM >= 4000) {
                const t = (currentSpinRPM - 4000) / (5000 - 4000);
                spinDragMultiplier = 1.05 - t * 0.15;
            } else if (currentSpinRPM >= 3000) {
                const t = (currentSpinRPM - 3000) / (4000 - 3000);
                spinDragMultiplier = 1.05 - t * 0.00;
            } else if (currentSpinRPM >= 2000) {
                const t = (currentSpinRPM - 2000) / (3000 - 2000);
                spinDragMultiplier = 1.00 + t * 0.05;
            } else {
                spinDragMultiplier = 1.00; // Neutral for very low spin
            }
        } else {
            // MID_IRON, HIGH_IRON, LOW_TRAJECTORY spin adjustment
            if (currentSpinRPM >= 5000) {
                spinDragMultiplier = 0.88;
            } else if (currentSpinRPM >= 4000) {
                const t = (currentSpinRPM - 4000) / (5000 - 4000);
                spinDragMultiplier = 1.01 - t * 0.13;
            } else if (currentSpinRPM >= 3000) {
                const t = (currentSpinRPM - 3000) / (4000 - 3000);
                spinDragMultiplier = 1.01 - t * 0.00;
            } else if (currentSpinRPM >= 2000) {
                const t = (currentSpinRPM - 2000) / (3000 - 2000);
                spinDragMultiplier = 0.98 + t * 0.03;
            } else {
                spinDragMultiplier = 0.95;
            }
        }

        // High-loft drag reduction (20°+ VLA) - regime-specific
        let highLoftDragMultiplier = 1.0;
        if (vlaDegs >= 20) {
            if (physicsRegime === 'WEDGE') {
                // Wedge high-loft adjustment (v4.4.1)
                if (currentSpeedMPH >= 50) {
                    highLoftDragMultiplier = 0.80;
                } else if (currentSpeedMPH >= 30) {
                    const t = (currentSpeedMPH - 30) / (50 - 30);
                    highLoftDragMultiplier = 0.90 + t * (0.80 - 0.90);
                } else {
                    highLoftDragMultiplier = 0.95;
                }
            } else {
                // All other regimes
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

        // Magnus force with regime-specific boost
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
                if (physicsRegime === 'WEDGE') {
                    liftCoeff *= (0.3 + 0.7 * speedFactor);
                } else {
                    liftCoeff *= (0.4 + 0.6 * speedFactor);
                }
            }

            // Regime-specific Magnus boost
            const magnusBoost = getMagnusLiftBoost(physicsRegime, vlaDegs);
            liftCoeff *= magnusBoost;

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

                // Regime-specific base bounce
                const regimeBounce = getRegimeBounceRetention(physicsRegime);

                // Speed-dependent bounce adjustment
                let baseBounce;
                if (currentLandingSpeed <= 30) {
                    baseBounce = regimeBounce + 0.08;
                } else if (currentLandingSpeed <= 40) {
                    const t = (currentLandingSpeed - 30) / (40 - 30);
                    baseBounce = (regimeBounce + 0.08) - t * 0.15;
                } else if (currentLandingSpeed <= 60) {
                    const t = (currentLandingSpeed - 40) / (60 - 40);
                    baseBounce = (regimeBounce - 0.07) - t * 0.20;
                } else if (currentLandingSpeed <= 80) {
                    const t = (currentLandingSpeed - 60) / (80 - 60);
                    baseBounce = (regimeBounce - 0.27) - t * 0.10;
                } else {
                    baseBounce = regimeBounce - 0.37;
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

                if (physicsRegime === 'WEDGE') {
                    // Wedge regime rolling (v4.4.1)
                    baseFriction = 0.025;
                    if (currentRollSpinRPM >= 4000) {
                        baseFriction = 0.040;
                    } else if (currentRollSpinRPM >= 3000) {
                        const t = (currentRollSpinRPM - 3000) / (4000 - 3000);
                        baseFriction = 0.025 + t * (0.040 - 0.025);
                    }
                } else if (physicsRegime === 'LOW_TRAJECTORY') {
                    // Low trajectory - apply regime friction multiplier
                    const regimeFrictionMult = getRegimeFrictionMultiplier(physicsRegime, currentRollSpinRPM);

                    baseFriction = 0.025 * regimeFrictionMult;
                    if (currentRollSpinRPM >= 4000) {
                        baseFriction = 0.060 * regimeFrictionMult;
                    } else if (currentRollSpinRPM >= 3000) {
                        const t = (currentRollSpinRPM - 3000) / (4000 - 3000);
                        baseFriction = (0.040 + t * (0.060 - 0.040)) * regimeFrictionMult;
                    } else if (currentRollSpinRPM >= 2000) {
                        const t = (currentRollSpinRPM - 2000) / (3000 - 2000);
                        baseFriction = (0.030 + t * (0.040 - 0.030)) * regimeFrictionMult;
                    }
                } else {
                    // MID_IRON, HIGH_IRON, POWER_SHOT - base friction with regime multiplier
                    const regimeFrictionMult = getRegimeFrictionMultiplier(physicsRegime, currentRollSpinRPM);

                    baseFriction = 0.025 * regimeFrictionMult;
                    if (currentRollSpinRPM >= 4000) {
                        baseFriction = 0.078 * regimeFrictionMult;
                    } else if (currentRollSpinRPM >= 3000) {
                        const t = (currentRollSpinRPM - 3000) / (4000 - 3000);
                        baseFriction = (0.056 + t * (0.078 - 0.056)) * regimeFrictionMult;
                    } else if (currentRollSpinRPM >= 2000) {
                        const t = (currentRollSpinRPM - 2000) / (3000 - 2000);
                        baseFriction = (0.045 + t * (0.056 - 0.045)) * regimeFrictionMult;
                    } else if (currentRollSpinRPM < 2000) {
                        baseFriction = 0.038 * regimeFrictionMult;
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

    return { carry: carryDistance, roll: rollDistance, total: totalDistance, regime: physicsRegime };
}

// Parse CSV helper
function parseCSV(filePath, skipBOM = false) {
    let data = fs.readFileSync(filePath, 'utf-8');

    // Remove BOM if present
    if (skipBOM && data.charCodeAt(0) === 0xFEFF) {
        data = data.slice(1);
    }

    const lines = data.trim().split('\n').filter(line => line.trim() !== '');
    const header = lines[0].split(',');
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row = {};
        header.forEach((key, idx) => {
            row[key.trim()] = values[idx];
        });
        rows.push(row);
    }

    return rows;
}

// Test results storage
const allResults = [];
const regimeStats = {
    WEDGE: { count: 0, passed: 0, totalError: 0 },
    LOW_TRAJECTORY: { count: 0, passed: 0, totalError: 0 },
    MID_IRON: { count: 0, passed: 0, totalError: 0 },
    HIGH_IRON: { count: 0, passed: 0, totalError: 0 },
    POWER_SHOT: { count: 0, passed: 0, totalError: 0 }
};

console.log('\n======================================================');
console.log('     FIVE-REGIME GOLF PHYSICS TEST - ALL DATASETS    ');
console.log('======================================================\n');

// Test 1: shots.csv (wedges)
console.log('=== DATASET 1: shots.csv (Wedge shots) ===\n');
const shotsData = parseCSV('/home/shreen/minigames/web/shots.csv');
shotsData.forEach((row, idx) => {
    const ballSpeed = parseFloat(row['Ball (mph)']);
    const vla = parseFloat(row['Launch V (deg)']);

    let hlaStr = row['Launch H (deg)'] || '0';
    let hla = parseFloat(hlaStr);
    if (hlaStr.includes('L')) hla = -Math.abs(hla);
    if (hlaStr.includes('R')) hla = Math.abs(hla);

    const totalSpin = parseFloat(row['Spin (rpm)']);

    let spinAxisStr = row['Spin Axis (deg)'] || '0';
    let spinAxis = parseFloat(spinAxisStr);
    if (spinAxisStr.includes('L')) spinAxis = -Math.abs(spinAxis);
    if (spinAxisStr.includes('R')) spinAxis = Math.abs(spinAxis);

    const totalYards = parseFloat(row['Total (yd)']);

    const spinAxisRad = spinAxis * Math.PI / 180;
    const backspin = totalSpin * Math.cos(spinAxisRad);
    const sidespin = totalSpin * Math.sin(spinAxisRad);

    if (isNaN(ballSpeed) || isNaN(vla) || ballSpeed === 0) return;

    const result = simulateShot(ballSpeed, vla, hla, backspin, sidespin);
    const totalError = result.total - totalYards;
    const passed = Math.abs(totalError) <= 3.0;

    regimeStats[result.regime].count++;
    regimeStats[result.regime].totalError += Math.abs(totalError);
    if (passed) regimeStats[result.regime].passed++;

    console.log(`Shot ${idx + 1} [${result.regime}]: ${ballSpeed.toFixed(1)} mph, VLA ${vla.toFixed(1)}° → ${totalYards.toFixed(1)} actual, ${result.total.toFixed(1)} sim (${totalError >= 0 ? '+' : ''}${totalError.toFixed(1)}) ${passed ? 'PASS' : 'FAIL'}`);

    allResults.push({ dataset: 'shots.csv', shot: idx + 1, regime: result.regime, actual: totalYards, sim: result.total, error: totalError, passed });
});

// Test 2: flightscope3.csv (irons)
console.log('\n=== DATASET 2: flightscope3.csv (Iron shots) ===\n');
const fs3Data = parseCSV('/home/shreen/Documents/flightscope3.csv', true);
fs3Data.forEach((row, idx) => {
    const ballSpeed = parseFloat(row['Ball (mph)']);
    const vla = parseFloat(row['Launch V (deg)']);

    let hlaStr = row['Launch H (deg)'] || '0';
    let hla = parseFloat(hlaStr);
    if (hlaStr.includes('L')) hla = -Math.abs(hla);
    if (hlaStr.includes('R')) hla = Math.abs(hla);

    const totalSpin = parseFloat(row['Spin (rpm)']);

    let spinAxisStr = row['Spin Axis (deg)'] || '0';
    let spinAxis = parseFloat(spinAxisStr);
    if (spinAxisStr.includes('L')) spinAxis = -Math.abs(spinAxis);
    if (spinAxisStr.includes('R')) spinAxis = Math.abs(spinAxis);

    const totalYards = parseFloat(row['Total (yd)']);

    const spinAxisRad = spinAxis * Math.PI / 180;
    const backspin = totalSpin * Math.cos(spinAxisRad);
    const sidespin = totalSpin * Math.sin(spinAxisRad);

    if (isNaN(ballSpeed) || isNaN(vla) || ballSpeed === 0) return;

    const result = simulateShot(ballSpeed, vla, hla, backspin, sidespin);
    const totalError = result.total - totalYards;
    const passed = Math.abs(totalError) <= 3.0;

    regimeStats[result.regime].count++;
    regimeStats[result.regime].totalError += Math.abs(totalError);
    if (passed) regimeStats[result.regime].passed++;

    console.log(`Shot ${idx + 1} [${result.regime}]: ${ballSpeed.toFixed(1)} mph, VLA ${vla.toFixed(1)}° → ${totalYards.toFixed(1)} actual, ${result.total.toFixed(1)} sim (${totalError >= 0 ? '+' : ''}${totalError.toFixed(1)}) ${passed ? 'PASS' : 'FAIL'}`);

    allResults.push({ dataset: 'flightscope3.csv', shot: idx + 1, regime: result.regime, actual: totalYards, sim: result.total, error: totalError, passed });
});

// Test 3: flightscope4.csv (mixed)
console.log('\n=== DATASET 3: flightscope4.csv (Mixed shots) ===\n');
const fs4Data = parseCSV('/home/shreen/Documents/flightscope4.csv', true);
fs4Data.forEach((row, idx) => {
    const ballSpeed = parseFloat(row['Ball (mph)']);
    const vla = parseFloat(row['Launch V (deg)']);

    let hlaStr = row['Launch H (deg)'] || '0';
    let hla = parseFloat(hlaStr);
    if (hlaStr.includes('L')) hla = -Math.abs(hla);
    if (hlaStr.includes('R')) hla = Math.abs(hla);

    const totalSpin = parseFloat(row['Spin (rpm)']);

    let spinAxisStr = row['Spin Axis (deg)'] || '0';
    let spinAxis = parseFloat(spinAxisStr);
    if (spinAxisStr.includes('L')) spinAxis = -Math.abs(spinAxis);
    if (spinAxisStr.includes('R')) spinAxis = Math.abs(spinAxis);

    const totalYards = parseFloat(row['Total (yd)']);

    const spinAxisRad = spinAxis * Math.PI / 180;
    const backspin = totalSpin * Math.cos(spinAxisRad);
    const sidespin = totalSpin * Math.sin(spinAxisRad);

    if (isNaN(ballSpeed) || isNaN(vla) || ballSpeed === 0) return;

    const result = simulateShot(ballSpeed, vla, hla, backspin, sidespin);
    const totalError = result.total - totalYards;
    const passed = Math.abs(totalError) <= 3.0;

    regimeStats[result.regime].count++;
    regimeStats[result.regime].totalError += Math.abs(totalError);
    if (passed) regimeStats[result.regime].passed++;

    console.log(`Shot ${idx + 1} [${result.regime}]: ${ballSpeed.toFixed(1)} mph, VLA ${vla.toFixed(1)}° → ${totalYards.toFixed(1)} actual, ${result.total.toFixed(1)} sim (${totalError >= 0 ? '+' : ''}${totalError.toFixed(1)}) ${passed ? 'PASS' : 'FAIL'}`);

    allResults.push({ dataset: 'flightscope4.csv', shot: idx + 1, regime: result.regime, actual: totalYards, sim: result.total, error: totalError, passed });
});

// Summary statistics
console.log('\n======================================================');
console.log('                  REGIME BREAKDOWN                    ');
console.log('======================================================\n');

Object.keys(regimeStats).forEach(regime => {
    const stats = regimeStats[regime];
    if (stats.count > 0) {
        const avgError = stats.totalError / stats.count;
        const passRate = (stats.passed / stats.count * 100).toFixed(0);
        console.log(`${regime.padEnd(16)} : ${stats.passed}/${stats.count} passing (${passRate}%), Avg error: ${avgError.toFixed(1)} yds`);
    } else {
        console.log(`${regime.padEnd(16)} : No shots in this regime`);
    }
});

console.log('\n======================================================');
console.log('                  OVERALL SUMMARY                     ');
console.log('======================================================\n');

const totalShots = allResults.length;
const totalPassed = allResults.filter(r => r.passed).length;
const totalError = allResults.reduce((sum, r) => sum + Math.abs(r.error), 0);
const avgError = totalError / totalShots;

console.log(`Total shots tested: ${totalShots}`);
console.log(`Passed (≤3.0 yds): ${totalPassed}/${totalShots} (${(totalPassed/totalShots*100).toFixed(0)}%)`);
console.log(`Average error: ${avgError.toFixed(1)} yards`);
console.log('');
