#!/usr/bin/env node

// Test driver.csv using libshotscope's Reynolds-number-based aerodynamics
// Based on Prof. Alan Nathan's model and WSU study by Bin Lyu et al.

const fs = require('fs');

// Physics constants
const GRAVITY = 32.174; // ft/s²
const BALL_MASS_OZ = 1.62;
const BALL_CIRC = 5.277; // inches
const BALL_RADIUS_FT = (BALL_CIRC / (2 * Math.PI)) / 12;
const BALL_DIAMETER_FT = 2 * BALL_RADIUS_FT;
const AIR_DENSITY_SLUGS = 0.0748;
const KINEMATIC_VISCOSITY = 0.00015; // ft²/s (approx for air at sea level)

// Aerodynamic constants from libshotscope (WSU study)
const CdS = 0.180; // Spin-dependent drag adjustment
const CdL = 0.500; // Low Reynolds number drag
const CdH = 0.200; // High Reynolds number drag
const Cl_coeff1 = 1.990; // Lift coefficient term 1
const Cl_coeff2 = -3.250; // Lift coefficient term 2
const Cl_default = 0.305; // Max lift coefficient

// C0 constant for drag/lift force calculation
const C0 = 0.5 * AIR_DENSITY_SLUGS * Math.PI * Math.pow(BALL_RADIUS_FT, 2) / (BALL_MASS_OZ / 32.174);

// Get drag coefficient based on Reynolds number and spin
function getCd(Re, spinFactor) {
    const Re_x_e5 = Re * 0.00001;

    let Cd;
    if (Re_x_e5 <= 0.5) {
        Cd = CdL;
    } else if (Re_x_e5 < 1.0) {
        Cd = CdL - (CdL - CdH) * (Re_x_e5 - 0.5) / 0.5;
    } else {
        Cd = CdH;
    }

    // Add spin-dependent drag
    Cd += CdS * spinFactor;

    return Cd;
}

// Get lift coefficient based on spin factor
function getCl(spinFactor) {
    if (spinFactor <= 0.3) {
        return Cl_coeff1 * spinFactor + Cl_coeff2 * Math.pow(spinFactor, 2);
    } else {
        return Cl_default;
    }
}

// Simulate golf shot
function simulateShot(speedMPH, vlaDegs, hlaDegs, backspinRPM, sidespinRPM) {
    const deltaTime = 0.0016; // ~60 FPS
    const maxTime = 15.0;
    const tolerance = 0.001;

    // Convert inputs
    const speedFtS = speedMPH * 1.467;
    const vlaRad = vlaDegs * Math.PI / 180;
    const hlaRad = hlaDegs * Math.PI / 180;
    const totalSpinRadS = (backspinRPM * 2 * Math.PI / 60);

    // Initial velocity components
    let vx = speedFtS * Math.cos(vlaRad) * Math.sin(hlaRad);
    let vy = speedFtS * Math.sin(vlaRad);
    let vz = speedFtS * Math.cos(vlaRad) * Math.cos(hlaRad);

    // Spin components (backspin only for now)
    const wx = 0;
    const wy = totalSpinRadS;
    const wz = 0;
    const omega = Math.sqrt(wx*wx + wy*wy + wz*wz);

    // Initial position
    let x = 0, y = 0, z = 0;
    let time = 0;

    // Spin decay time constant (from libshotscope)
    const tau = 1 / (0.00002 * speedFtS / BALL_RADIUS_FT);

    while (y >= -tolerance && time < maxTime) {
        // Current speed
        const v = Math.sqrt(vx*vx + vy*vy + vz*vz);
        const vMph = v / 1.467;

        // Reynolds number
        const Re = v * BALL_DIAMETER_FT / KINEMATIC_VISCOSITY;

        // Spin decay
        const currentOmega = omega * Math.exp(-time / tau);
        const rw = currentOmega * BALL_RADIUS_FT;

        // Spin factor
        const spinFactor = rw / v;

        // Drag coefficient
        const Cd = getCd(Re, spinFactor);

        // Lift coefficient
        const Cl = getCl(spinFactor);

        // Drag force
        const dragAccelX = -C0 * Cd * v * vx;
        const dragAccelY = -C0 * Cd * v * vy;
        const dragAccelZ = -C0 * Cd * v * vz;

        // Magnus force (cross product of spin and velocity)
        const crossX = wy * vz - wz * vy;
        const crossY = wz * vx - wx * vz;
        const crossZ = wx * vy - wy * vx;

        const crossMag = Math.sqrt(crossX*crossX + crossY*crossY + crossZ*crossZ);
        const w_perp_div_w = crossMag > 0 ? crossMag / currentOmega : 0;

        let magnusAccelX = 0, magnusAccelY = 0, magnusAccelZ = 0;
        if (w_perp_div_w > 0 && currentOmega > 1) {
            magnusAccelX = C0 * (Cl / currentOmega) * v * crossX / w_perp_div_w;
            magnusAccelY = C0 * (Cl / currentOmega) * v * crossY / w_perp_div_w;
            magnusAccelZ = C0 * (Cl / currentOmega) * v * crossZ / w_perp_div_w;
        }

        // Total acceleration
        const totalAccelX = dragAccelX + magnusAccelX;
        const totalAccelY = dragAccelY + magnusAccelY - GRAVITY;
        const totalAccelZ = dragAccelZ + magnusAccelZ;

        // Update position
        x += vx * deltaTime + 0.5 * totalAccelX * deltaTime * deltaTime;
        y += vy * deltaTime + 0.5 * totalAccelY * deltaTime * deltaTime;
        z += vz * deltaTime + 0.5 * totalAccelZ * deltaTime * deltaTime;

        // Update velocity
        vx += totalAccelX * deltaTime;
        vy += totalAccelY * deltaTime;
        vz += totalAccelZ * deltaTime;

        time += deltaTime;
    }

    // Convert to yards
    const carryYards = z / 3;
    return carryYards;
}

// Test driver.csv
const data = fs.readFileSync('/home/shreen/Documents/driver.csv', 'utf-8').replace(/^\uFEFF/, '');
const lines = data.trim().split('\n').filter(line => line.trim() !== '');

console.log('======================================================');
console.log('  LIBSHOTSCOPE MODEL TEST - driver.csv (14 shots)');
console.log('  Using Reynolds-number-based aerodynamics');
console.log('  (Prof. Alan Nathan / WSU Bin Lyu et al.)');
console.log('======================================================\n');

let totalError = 0;
let passing = 0;
const tolerance = 10.0;

for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    const carry = parseFloat(parts[1]);
    const total = parseFloat(parts[3]);
    const speed = parseFloat(parts[5]);
    const spin = parseFloat(parts[6]);
    const vla = parseFloat(parts[8]);
    const hla = parseFloat(parts[9]);

    const simCarry = simulateShot(speed, vla, hla, spin, 0);
    const error = simCarry - total;
    const absError = Math.abs(error);
    const status = absError <= tolerance ? 'PASS' : 'FAIL';

    if (absError <= tolerance) passing++;
    totalError += absError;

    console.log(`Shot ${i}: ${speed.toFixed(0)} mph, VLA ${vla.toFixed(1)}° → ${total.toFixed(0)} actual, ${simCarry.toFixed(1)} sim (${error >= 0 ? '+' : ''}${error.toFixed(1)}) ${status}`);
}

const avgError = totalError / (lines.length - 1);

console.log('\n======================================================');
console.log('                  SUMMARY                            ');
console.log('======================================================\n');
console.log(`Total shots tested: ${lines.length - 1}`);
console.log(`Passed (≤${tolerance.toFixed(1)} yds): ${passing}/${lines.length - 1} (${(passing/(lines.length - 1)*100).toFixed(0)}%)`);
console.log(`Average error: ${avgError.toFixed(1)} yards`);
