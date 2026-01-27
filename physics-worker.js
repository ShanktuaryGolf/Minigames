// physics-worker.js

// Physics constants
const GRAVITY = 32.174; // ft/s²
const BALL_MASS_OZ = 1.62;
const BALL_MASS_SLUGS = BALL_MASS_OZ / 514.78;
const BALL_CIRC = 5.277;
const BALL_RADIUS_FT = (BALL_CIRC / (2 * Math.PI)) / 12;
const BALL_RADIUS = BALL_RADIUS_FT * 0.3048;

const AIR_DENSITY_SLUGS_DEFAULT = 0.0748;

const QUINTAVALLA_DRAG_A = 0.171;
const QUINTAVALLA_DRAG_B = 0.62;
const QUINTAVALLA_LIFT_C = 0.083;
const QUINTAVALLA_LIFT_D = 0.885;
const QUINTAVALLA_MOMENT_E = 0.0125;

const MAGNUS_CONST = 0.00568249207;

const GRAVITY_MS2 = 9.81;

// State variables to be updated from main thread
let ballPosition, ballVelocity, ballSpin;
let isPutting, physicsRegime, initialShotSpeedMPH;
let puttingFriction;
let DRAG_CONST;

const LIE_TYPES = {
    TEE: { name: 'Tee', friction: 15.0, rollFactor: 0.9, bounceRetention: 0.3 },
    FAIRWAY: { name: 'Fairway', friction: 15.0, rollFactor: 0.7, bounceRetention: 0.3 },
    LIGHT_ROUGH: { name: 'Light Rough', friction: 25.0, rollFactor: 0.4, bounceRetention: 0.2 },
    HEAVY_ROUGH: { name: 'Heavy Rough', friction: 40.0, rollFactor: 0.2, bounceRetention: 0.15 },
    BUNKER: { name: 'Bunker', friction: 50.0, rollFactor: 0.1, bounceRetention: 0.1 },
    GREEN: { name: 'Green', friction: 8.0, rollFactor: 0.95, bounceRetention: 0.3 }
};
let currentLie = LIE_TYPES.TEE;


function getDragConstant(airDensitySlugs) {
    return 0.07182 * airDensitySlugs * (5.125 / BALL_MASS_OZ) * Math.pow(BALL_CIRC / 9.125, 2);
}

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

let physicsCoefficients = {};

function setPhysicsCoefficients(regime, initialShotSpeedMPH) {
    // --- Pre-calculate Cd function ---
    physicsCoefficients.getCd = function(speedMPH, vlaDegs) {
        let Cd;
        if (vlaDegs < 10) {
            if (speedMPH <= 60) {
                Cd = 0.60;
            } else if (speedMPH <= 85) {
                const t = (speedMPH - 60) / (85 - 60);
                Cd = 0.60 - t * (0.60 - 0.55);
            } else {
                Cd = 0.55;
            }
        } else {
            switch (regime) {
                case 'WEDGE':
                    if (speedMPH <= 55) {
                        Cd = 0.85;
                    } else if (speedMPH <= 75) {
                        const t = (speedMPH - 55) / (75 - 55);
                        Cd = 0.85 - t * (0.85 - 0.31);
                    } else if (speedMPH <= 100) {
                        const t = (speedMPH - 75) / (100 - 75);
                        Cd = 0.31 - t * (0.31 - 0.22);
                    } else {
                        Cd = 0.22;
                    }
                    break;
                case 'POWER_SHOT':
                    if (speedMPH <= 55) {
                        Cd = 0.78;
                    } else if (speedMPH <= 75) {
                        const t = (speedMPH - 55) / (75 - 55);
                        Cd = 0.78 - t * (0.78 - 0.30);
                    } else if (speedMPH <= 100) {
                        const t = (speedMPH - 75) / (100 - 75);
                        Cd = 0.30 - t * (0.30 - 0.22);
                    } else if (speedMPH <= 126) {
                        const t = (speedMPH - 100) / (126 - 100);
                        Cd = 0.22 - t * (0.22 - 0.18);
                    } else {
                        Cd = 0.18;
                    }
                    break;
                default: // MID_IRON, HIGH_IRON, LOW_TRAJECTORY
                    const isHighIron = regime === 'HIGH_IRON';
                    const isMidIron = regime === 'MID_IRON';

                    let baseDragBoost = 1.0;
                    if (isHighIron) {
                        baseDragBoost = 1.08;
                    } else if (isMidIron && initialShotSpeedMPH >= 80) {
                        baseDragBoost = 1.06;
                    }

                    if (speedMPH <= 55) {
                        Cd = 0.75 * baseDragBoost;
                    } else if (speedMPH <= 75) {
                        const t = (speedMPH - 55) / (75 - 55);
                        Cd = (0.75 - t * (0.75 - 0.25)) * baseDragBoost;
                    } else if (speedMPH <= 100) {
                        const t = (speedMPH - 75) / (100 - 75);
                        Cd = (0.25 - t * (0.25 - 0.18)) * baseDragBoost;
                    } else if (speedMPH <= 126) {
                        const t = (speedMPH - 100) / (126 - 100);
                        Cd = (0.18 - t * (0.18 - 0.14)) * baseDragBoost;
                    } else if (speedMPH <= 150) {
                        const t = (speedMPH - 126) / (150 - 126);
                        Cd = (0.14 - t * (0.14 - 0.10)) * baseDragBoost;
                    } else {
                        Cd = 0.10 * baseDragBoost;
                    }
                    break;
            }
        }
        return Cd;
    };

    // --- Pre-calculate spinDragMultiplier function ---
    physicsCoefficients.getSpinDragMultiplier = function(currentSpinRPM) {
        let spinDragMultiplier = 1.0;
        switch (regime) {
            case 'WEDGE':
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
                break;
            case 'POWER_SHOT':
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
                    spinDragMultiplier = 1.00;
                }
                break;
            default: // MID_IRON, HIGH_IRON, LOW_TRAJECTORY
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
                break;
        }
        return spinDragMultiplier;
    };

    // --- Pre-calculate highLoftDragMultiplier function ---
    physicsCoefficients.getHighLoftDragMultiplier = function(speedMPH, vlaDegs) {
        let highLoftDragMultiplier = 1.0;
        if (vlaDegs >= 20) {
            if (regime === 'WEDGE') {
                if (speedMPH >= 50) {
                    highLoftDragMultiplier = 0.80;
                } else if (speedMPH >= 30) {
                    const t = (speedMPH - 30) / (50 - 30);
                    highLoftDragMultiplier = 0.90 + t * (0.80 - 0.90);
                } else {
                    highLoftDragMultiplier = 0.95;
                }
            } else {
                if (speedMPH >= 50) {
                    highLoftDragMultiplier = 0.82;
                } else if (speedMPH >= 30) {
                    const t = (speedMPH - 30) / (50 - 30);
                    highLoftDragMultiplier = 0.90 + t * (0.82 - 0.90);
                } else {
                    highLoftDragMultiplier = 0.95;
                }
            }
        }
        return highLoftDragMultiplier;
    };
}

function updateBallPhysics(deltaTime) {
    if (!ballInFlight) return;
    let vlaDegs = 0;

    // Use Stimpmeter physics for putts
    if (isPutting) {
        updatePuttingPhysics(deltaTime);
        return;
    }

    // PERFORMANCE OPTIMIZATION: Calculate velocity magnitude ONCE in m/s, then convert
    const speedMS = Math.sqrt(
        ballVelocity.x * ballVelocity.x +
        ballVelocity.y * ballVelocity.y +
        ballVelocity.z * ballVelocity.z
    );
    const speed = speedMS * 3.28084; // Convert to ft/s
    const speedMPH = speed / 1.467; // Convert ft/s to mph

    // Pre-calculate horizontal speed for efficiency
    const horizontalSpeedMS = Math.sqrt(ballVelocity.x * ballVelocity.x + ballVelocity.z * ballVelocity.z);
    const horizontalSpeedMPH = horizontalSpeedMS * 2.237; // m/s to mph

    // Convert velocity from m/s to ft/s for Excel formulas
    const vxFtS = ballVelocity.x * 3.28084;
    const vyFtS = -ballVelocity.z * 3.28084;
    const vzFtS = ballVelocity.y * 3.28084;

    // Convert spin from RPM to rad/s, then to components
    const spinAxisRad = ballSpin.spinAxis * Math.PI / 180;
    let totalSpinRadS = ballSpin.totalSpin * Math.PI / 30;

    const wx = totalSpinRadS * Math.cos(spinAxisRad);
    const wy = -totalSpinRadS * Math.sin(spinAxisRad);
    const wz = 0;

    const spinRatio = speed > 0.1 ? (BALL_RADIUS * totalSpinRadS) / speedMS : 0;

    // Drag force
    let dragAccelX = 0, dragAccelY = 0, dragAccelZ = 0;
    if (speed > 0.1) {
        vlaDegs = Math.asin(ballVelocity.y / speedMS) * 180 / Math.PI;

        const Cd = physicsCoefficients.getCd(speedMPH, vlaDegs);
        const spinDragMultiplier = physicsCoefficients.getSpinDragMultiplier(ballSpin.totalSpin);
        const highLoftDragMultiplier = physicsCoefficients.getHighLoftDragMultiplier(speedMPH, vlaDegs);

        const quintavallaDragAdjustment = QUINTAVALLA_DRAG_B * spinRatio;
        const finalCd = Cd + quintavallaDragAdjustment;

        const dragFactor = -DRAG_CONST * finalCd * speed * spinDragMultiplier * highLoftDragMultiplier;
        dragAccelX = dragFactor * vxFtS;
        dragAccelY = dragFactor * vyFtS;
        dragAccelZ = dragFactor * vzFtS;
    }

    // Magnus force
    let magnusAccelX = 0, magnusAccelY = 0, magnusAccelZ = 0;
    if (speed > 0.1 && totalSpinRadS > 1) {
        const crossX = wy * vzFtS - wz * vyFtS;
        const crossY = wz * vxFtS - wx * vzFtS;
        const crossZ = wx * vyFtS - wy * vxFtS;

        let liftCoeff = QUINTAVALLA_LIFT_C + QUINTAVALLA_LIFT_D * spinRatio;

        const speedMPH_magnus = speed / 1.467;

        if (speedMPH_magnus < 60) {
            const speedFactor = speedMPH_magnus / 60;
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

    // Total acceleration
    const totalAccelX = dragAccelX + magnusAccelX;
    const totalAccelY = dragAccelY + magnusAccelY;
    const totalAccelZ = dragAccelZ + magnusAccelZ - GRAVITY;

    // Update velocity
    const velDeltaX = (totalAccelX / 3.28084) * deltaTime;
    const velDeltaZ = -(totalAccelY / 3.28084) * deltaTime;
    const velDeltaY = (totalAccelZ / 3.28084) * deltaTime;

    ballVelocity.x += velDeltaX;
    ballVelocity.z += velDeltaZ;
    ballVelocity.y += velDeltaY;

    // Spin decay
    if (totalSpinRadS > 0) {
        totalSpinRadS *= Math.exp(-deltaTime / 24.5);
        ballSpin.totalSpin = totalSpinRadS * 30 / Math.PI;
    }

    // Update position
    ballPosition.x += ballVelocity.x * deltaTime;
    ballPosition.y += ballVelocity.y * deltaTime;
    ballPosition.z += ballVelocity.z * deltaTime;
}

function updatePuttingPhysics(deltaTime) {
    // Apply Stimpmeter-based friction
    const speed = Math.sqrt(ballVelocity.x * ballVelocity.x + ballVelocity.y * ballVelocity.y + ballVelocity.z * ballVelocity.z);
    if (speed > 0.001) {
        const frictionForce = puttingFriction * GRAVITY_MS2 * deltaTime;
        const frictionDecel = Math.min(frictionForce / speed, 1);
        ballVelocity.x *= (1 - frictionDecel);
        ballVelocity.y *= (1 - frictionDecel);
        ballVelocity.z *= (1 - frictionDecel);
    } else {
        // Ball stopped
        ballVelocity.x = 0;
        ballVelocity.y = 0;
        ballVelocity.z = 0;
    }

    // Update position
    ballPosition.x += ballVelocity.x * deltaTime;
    ballPosition.y += ballVelocity.y * deltaTime;
    ballPosition.z += ballVelocity.z * deltaTime;
}


self.onmessage = function(e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'init':
            // Initialize the physics state
            ballPosition = payload.ballPosition;
            ballVelocity = payload.ballVelocity;
            ballSpin = payload.ballSpin;
            isPutting = payload.isPutting;
            physicsRegime = payload.physicsRegime;
            initialShotSpeedMPH = payload.initialShotSpeedMPH;
            puttingFriction = payload.puttingFriction;
            DRAG_CONST = getDragConstant(payload.currentAirDensity);

            setPhysicsCoefficients(physicsRegime, initialShotSpeedMPH);
            break;

        case 'update':
            // Update the physics
            if (isPutting) {
                updatePuttingPhysics(payload.deltaTime);
            } else {
                updateBallPhysics(payload.deltaTime);
            }

            // Post the updated state back to the main thread
            self.postMessage({
                type: 'update',
                payload: {
                    ballPosition: ballPosition,
                    ballVelocity: ballVelocity,
                    ballSpin: ballSpin
                }
            });
            break;
    }
};