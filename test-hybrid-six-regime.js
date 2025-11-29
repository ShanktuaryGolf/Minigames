#!/usr/bin/env node

// HYBRID SIX-REGIME GOLF BALL PHYSICS
// Regimes:
//   1. WEDGE: speed < 65 mph (physics-based)
//   2. LOW_TRAJECTORY: 65-85 mph AND vla < 10 (physics-based)
//   3. MID_IRON: 65-85 mph AND 10° <= vla < 20 (physics-based)
//   4. HIGH_IRON: 65-85 mph AND vla >= 20 (physics-based)
//   5. POWER_SHOT: 85 <= speed < 100 mph (physics-based)
//   6. DRIVER: speed >= 100 mph (EMPIRICAL model)

const fs = require('fs');

// Physics constants
const GRAVITY = 32.174; // ft/s²
const BALL_MASS_OZ = 1.62;
const BALL_CIRC = 5.277; // inches
const BALL_RADIUS_FT = (BALL_CIRC / (2 * Math.PI)) / 12;
const AIR_DENSITY_SLUGS = 0.0748;
const MAGNUS_CONST = 0.00568249207;
const DRAG_CONST = 0.07182 * AIR_DENSITY_SLUGS * (5.125 / BALL_MASS_OZ) * Math.pow(BALL_CIRC / 9.125, 2);

// Empirical driver model coefficients (calibrated on driver.csv)
const DRIVER_AVG_SPEED = 150.3;
const DRIVER_AVG_VLA = 9.9;
const DRIVER_AVG_SPIN = 2704;
const DRIVER_AVG_TOTAL = 251.0;
const DRIVER_SPEED_COEFF = 1.5;
const DRIVER_VLA_COEFF = 8.0;
const DRIVER_SPIN_COEFF = 0.01;

// Determine physics regime
function getPhysicsRegime(initialSpeedMPH, vlaDegs) {
    // DRIVER empirical model only for typical driver shots (140+ mph, low VLA)
    if (initialSpeedMPH >= 140 && vlaDegs < 20) {
        return 'DRIVER'; // Empirical model
    }
    if (initialSpeedMPH < 65) {
        return 'WEDGE';
    }
    if (initialSpeedMPH >= 85) {
        return 'POWER_SHOT';
    }
    // 65-85 mph range - check VLA
    if (vlaDegs < 10) {
        return 'LOW_TRAJECTORY';
    } else if (vlaDegs < 20) {
        return 'MID_IRON';
    } else {
        return 'HIGH_IRON';
    }
}

// Empirical driver prediction (no physics simulation)
function predictDriverDistance(speedMPH, vlaDegs, spinRPM) {
    const speedDelta = speedMPH - DRIVER_AVG_SPEED;
    const vlaDelta = vlaDegs - DRIVER_AVG_VLA;
    const spinDelta = spinRPM - DRIVER_AVG_SPIN;

    let total = DRIVER_AVG_TOTAL;
    total += DRIVER_SPEED_COEFF * speedDelta;
    total += DRIVER_VLA_COEFF * vlaDelta;
    total += DRIVER_SPIN_COEFF * spinDelta;

    return total;
}

// Six-regime drag coefficient function (for physics-based regimes only)
function getCd(speedMPH, vlaDegs, physicsRegime) {
    // Special handling for LOW_TRAJECTORY shots
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

    // WEDGE REGIME
    if (physicsRegime === 'WEDGE') {
        if (speedMPH <= 55) {
            return 0.85;
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

    // POWER_SHOT REGIME
    if (physicsRegime === 'POWER_SHOT') {
        if (speedMPH <= 55) {
            return 0.78;
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

    // MID_IRON REGIME
    if (physicsRegime === 'MID_IRON') {
        let baseCd;
        if (speedMPH <= 55) {
            baseCd = 0.85;
        } else if (speedMPH <= 75) {
            const t = (speedMPH - 55) / (75 - 55);
            baseCd = 0.85 - t * (0.85 - 0.31);
        } else if (speedMPH <= 100) {
            const t = (speedMPH - 75) / (100 - 75);
            baseCd = 0.31 - t * (0.31 - 0.22);
        } else {
            baseCd = 0.22;
        }

        // Speed boost for fast mid-irons
        if (speedMPH >= 80) {
            baseCd *= 1.06;
        }

        return baseCd;
    }

    // HIGH_IRON REGIME
    if (physicsRegime === 'HIGH_IRON') {
        let baseCd;
        if (speedMPH <= 55) {
            baseCd = 0.85;
        } else if (speedMPH <= 75) {
            const t = (speedMPH - 55) / (75 - 55);
            baseCd = 0.85 - t * (0.85 - 0.31);
        } else if (speedMPH <= 100) {
            const t = (speedMPH - 75) / (100 - 75);
            baseCd = 0.31 - t * (0.31 - 0.22);
        } else {
            baseCd = 0.22;
        }

        // Higher drag for high-lofted irons
        baseCd *= 1.08;

        return baseCd;
    }

    // Default fallback
    return 0.22;
}

// Spin drag multiplier
function getSpinDragMultiplier(currentSpeedMPH, spinRPM, physicsRegime) {
    let spinDragMultiplier = 1.0;

    if (physicsRegime === 'WEDGE' && spinRPM > 5000 && currentSpeedMPH < 60) {
        const excessSpin = spinRPM - 5000;
        const spinEffect = Math.min(excessSpin / 3000, 1.0);
        spinDragMultiplier = 1.0 + spinEffect * 0.15;
    } else if (physicsRegime === 'HIGH_IRON' && spinRPM > 4000) {
        const excessSpin = spinRPM - 4000;
        const spinEffect = Math.min(excessSpin / 4000, 1.0);
        spinDragMultiplier = 1.0 + spinEffect * 0.10;
    }

    return spinDragMultiplier;
}

// Regime-specific friction multiplier
function getRegimeFrictionMultiplier(regime, spinRPM) {
    switch (regime) {
        case 'WEDGE':
            return 1.0;
        case 'LOW_TRAJECTORY':
            return 0.70; // Less friction, more roll
        case 'MID_IRON':
            if (spinRPM < 2000) {
                return 0.85; // Low spin = more roll
            } else if (spinRPM > 4000) {
                return 1.4; // High spin = quick stop
            } else {
                return 1.0;
            }
        case 'HIGH_IRON':
            if (spinRPM > 5000) {
                return 1.3; // Very high spin = sticky
            } else if (spinRPM > 3000) {
                return 1.1;
            } else {
                return 1.0;
            }
        case 'POWER_SHOT':
            return 1.1; // Moderate friction
        default:
            return 1.0;
    }
}

// Regime-specific bounce retention
function getRegimeBounceRetention(regime) {
    switch (regime) {
        case 'WEDGE':
            return 0.72;
        case 'LOW_TRAJECTORY':
            return 0.78;
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

// Regime-specific magnus lift boost
function getMagnusLiftBoost(regime, vlaDegs) {
    switch (regime) {
        case 'WEDGE':
            return vlaDegs >= 20 ? 1.22 : 1.0;
        case 'LOW_TRAJECTORY':
            return vlaDegs >= 20 ? 1.05 : 1.0;
        case 'MID_IRON':
            return vlaDegs >= 15 ? 1.15 : 1.0;
        case 'HIGH_IRON':
            return vlaDegs >= 20 ? 1.05 : 1.0;
        case 'POWER_SHOT':
            return vlaDegs >= 15 ? 1.10 : 1.0;
        default:
            return 1.0;
    }
}

// Physics-based simulation (for non-DRIVER regimes)
function simulateShot(speedMPH, vlaDegs, hlaDegs, backspinRPM, sidespinRPM) {
    const physicsRegime = getPhysicsRegime(speedMPH, vlaDegs);

    // DRIVER regime uses empirical model
    if (physicsRegime === 'DRIVER') {
        return predictDriverDistance(speedMPH, vlaDegs, backspinRPM);
    }

    // All other regimes use physics simulation
    const deltaTime = 0.0016;
    const maxTime = 15.0;
    const tolerance = 0.001;

    const speedFtS = speedMPH * 1.467;
    const vlaRad = vlaDegs * Math.PI / 180;
    const hlaRad = hlaDegs * Math.PI / 180;
    const totalSpinRadS = (backspinRPM * 2 * Math.PI / 60);

    let vx = speedFtS * Math.cos(vlaRad) * Math.sin(hlaRad);
    let vy = speedFtS * Math.sin(vlaRad);
    let vz = speedFtS * Math.cos(vlaRad) * Math.cos(hlaRad);

    const wx = 0;
    const wy = totalSpinRadS;
    const wz = 0;

    let x = 0, y = 0, z = 0;
    let time = 0;
    let bounceCount = 0;
    const maxBounces = 20;

    const bounceRetention = getRegimeBounceRetention(physicsRegime);
    const frictionMultiplier = getRegimeFrictionMultiplier(physicsRegime, backspinRPM);

    while (time < maxTime && bounceCount < maxBounces) {
        const vxFtS = vx * 3.28084;
        const vyFtS = vy * 3.28084;
        const vzFtS = vz * 3.28084;

        const speed = Math.sqrt(vxFtS*vxFtS + vyFtS*vyFtS + vzFtS*vzFtS);
        const currentSpeedMPH = speed / 1.467;

        const Cd = getCd(currentSpeedMPH, vlaDegs, physicsRegime);
        const spinDragMultiplier = getSpinDragMultiplier(currentSpeedMPH, backspinRPM, physicsRegime);

        const dragFactor = -DRAG_CONST * Cd * speed * spinDragMultiplier;
        const dragAccelX = dragFactor * vxFtS;
        const dragAccelY = dragFactor * vyFtS;
        const dragAccelZ = dragFactor * vzFtS;

        let magnusAccelX = 0, magnusAccelY = 0, magnusAccelZ = 0;
        if (speed > 0.1 && totalSpinRadS > 1) {
            const crossX = wy * vzFtS - 0 * vyFtS;
            const crossY = 0 * vxFtS - wx * vzFtS;
            const crossZ = wx * vyFtS - wy * vxFtS;

            const S = totalSpinRadS / speed;
            const ClAmp = 0.217;
            let liftCoeff = ClAmp * Math.pow(S, 0.4);

            if (currentSpeedMPH < 60) {
                const speedFactor = currentSpeedMPH / 60;
                if (physicsRegime === 'WEDGE') {
                    liftCoeff *= (0.3 + 0.7 * speedFactor);
                } else {
                    liftCoeff *= (0.4 + 0.6 * speedFactor);
                }
            }

            const magnusBoost = getMagnusLiftBoost(physicsRegime, vlaDegs);
            liftCoeff *= magnusBoost;

            const magnusFactor = MAGNUS_CONST * (liftCoeff / totalSpinRadS) * speed;
            magnusAccelX = magnusFactor * crossX;
            magnusAccelY = magnusFactor * crossY;
            magnusAccelZ = magnusFactor * crossZ;
        }

        const totalAccelX = dragAccelX + magnusAccelX;
        const totalAccelY = dragAccelY + magnusAccelY;
        const totalAccelZ = dragAccelZ + magnusAccelZ - GRAVITY;

        x += vx * deltaTime + 0.5 * (totalAccelX / 3.28084) * deltaTime * deltaTime;
        y += vy * deltaTime + 0.5 * (totalAccelZ / 3.28084) * deltaTime * deltaTime;
        z += vz * deltaTime + 0.5 * (totalAccelY / 3.28084) * deltaTime * deltaTime;

        vx += (totalAccelX / 3.28084) * deltaTime;
        vy += (totalAccelZ / 3.28084) * deltaTime;
        vz += (totalAccelY / 3.28084) * deltaTime;

        if (y <= tolerance && vy < 0) {
            y = 0;
            vy = -vy * bounceRetention;
            vx *= (1.0 - 0.15 * frictionMultiplier);
            vz *= (1.0 - 0.15 * frictionMultiplier);
            bounceCount++;

            if (Math.abs(vy) < 0.5) {
                const rollDistance = Math.sqrt(vx*vx + vz*vz) * 3.28084 * 0.5 / (0.20 * frictionMultiplier);
                z += rollDistance / 3;
                break;
            }
        }

        if (y < -tolerance) {
            break;
        }

        time += deltaTime;
    }

    return z / 3;
}

// Test against all datasets
function testDataset(file, label) {
    const data = fs.readFileSync(file, 'utf-8').replace(/^\uFEFF/, '');
    const lines = data.trim().split('\n').filter(line => line.trim() !== '');

    console.log(`\n=== ${label} ===\n`);

    let totalError = 0;
    let passing = 0;
    const tolerance = 10.0;
    const regimeStats = {};

    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        const total = parseFloat(parts[3]);
        const speed = parseFloat(parts[5]);
        const spin = parseFloat(parts[6]);
        const vla = parseFloat(parts[8]);
        const hla = parseFloat(parts[9]);

        const regime = getPhysicsRegime(speed, vla);
        const simTotal = simulateShot(speed, vla, hla, spin, 0);
        const error = simTotal - total;
        const absError = Math.abs(error);
        const status = absError <= tolerance ? 'PASS' : 'FAIL';

        if (!regimeStats[regime]) {
            regimeStats[regime] = { count: 0, passing: 0, totalError: 0 };
        }
        regimeStats[regime].count++;
        regimeStats[regime].totalError += absError;
        if (absError <= tolerance) {
            regimeStats[regime].passing++;
            passing++;
        }

        totalError += absError;

        const modelType = regime === 'DRIVER' ? 'EMPIRICAL' : 'PHYSICS';
        console.log(`Shot ${i} [${regime}/${modelType}]: ${speed.toFixed(0)} mph, VLA ${vla.toFixed(1)}° → ${total.toFixed(0)} actual, ${simTotal.toFixed(1)} sim (${error >= 0 ? '+' : ''}${error.toFixed(1)}) ${status}`);
    }

    const avgError = totalError / (lines.length - 1);

    console.log('\n--- Regime Breakdown ---');
    Object.keys(regimeStats).sort().forEach(regime => {
        const stats = regimeStats[regime];
        const avgRegimeError = stats.totalError / stats.count;
        console.log(`${regime}: ${stats.passing}/${stats.count} passing (${(stats.passing/stats.count*100).toFixed(0)}%), Avg error: ${avgRegimeError.toFixed(1)} yds`);
    });

    console.log(`\nTotal: ${passing}/${lines.length - 1} passing (${(passing/(lines.length - 1)*100).toFixed(0)}%)`);
    console.log(`Average error: ${avgError.toFixed(1)} yards`);

    return { passing, total: lines.length - 1, avgError };
}

console.log('======================================================');
console.log('   HYBRID SIX-REGIME SYSTEM TEST');
console.log('   Physics: WEDGE, LOW/MID/HIGH_IRON, POWER_SHOT');
console.log('   Empirical: DRIVER (100+ mph)');
console.log('======================================================');

const results = [];
results.push(testDataset('/home/shreen/minigames/web/jlag1.csv', 'jlag1.csv (16 shots)'));
results.push(testDataset('/home/shreen/minigames/web/jlag2.csv', 'jlag2.csv (15 shots)'));
results.push(testDataset('/home/shreen/Documents/driver.csv', 'driver.csv (14 shots)'));

console.log('\n======================================================');
console.log('              OVERALL SUMMARY');
console.log('======================================================\n');

let totalPassing = 0, totalShots = 0, totalErrorSum = 0;
results.forEach(r => {
    totalPassing += r.passing;
    totalShots += r.total;
    totalErrorSum += r.avgError * r.total;
});

console.log(`Combined: ${totalPassing}/${totalShots} passing (${(totalPassing/totalShots*100).toFixed(0)}%)`);
console.log(`Overall average error: ${(totalErrorSum/totalShots).toFixed(1)} yards`);
