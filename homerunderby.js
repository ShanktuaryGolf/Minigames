// Home Run Derby game implementation
class HomeRunDerbyGame {
    constructor() {
        this.score = 0;
        this.homeRuns = 0;
        this.swings = 0;
        this.maxSwings = 15;
        this.canvas = null;
        this.ctx = null;
        this.balls = [];
        this.animationId = null;

        // Game config
        this.STADIUM_WIDTH = 700;
        this.STADIUM_HEIGHT = 400;
        this.MIN_HR_SPEED = 140;  // mph
        this.IDEAL_ANGLE = 28;     // degrees
        this.MAX_DISTANCE = 500;   // feet
    }

    init() {
        const gameContent = document.getElementById('gameContent');
        gameContent.innerHTML = `
            <div class="score-display">
                <div class="score-item">
                    <div class="label">Home Runs</div>
                    <div class="value" id="hrdHomeRuns">0</div>
                </div>
                <div class="score-item">
                    <div class="label">Max Distance</div>
                    <div class="value" id="hrdMaxDist">0 ft</div>
                </div>
                <div class="score-item">
                    <div class="label">Swings</div>
                    <div class="value" id="hrdSwings">0 / ${this.maxSwings}</div>
                </div>
            </div>

            <div style="display: flex; justify-content: center; margin-top: 20px;">
                <canvas id="hrdCanvas" width="750" height="450" style="border-radius: 10px; background: #1a1a1a;"></canvas>
            </div>

            <div style="text-align: center; margin-top: 20px; opacity: 0.8;">
                <p>⚾ Launch: 140+ mph ball speed for home run power</p>
                <p>📐 Angle: 25-35° VLA for max distance | HLA for pull/center/oppo</p>
                <p>🏟️ Goal: Hit as many home runs as possible!</p>
            </div>
        `;

        this.canvas = document.getElementById('hrdCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.score = 0;
        this.homeRuns = 0;
        this.swings = 0;
        this.balls = [];
        this.maxDistance = 0;

        this.drawStadium();
        this.startAnimation();
    }

    drawStadium() {
        const ctx = this.ctx;

        // Clear
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Sky gradient
        const skyGradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        skyGradient.addColorStop(0, '#0ea5e9');
        skyGradient.addColorStop(1, '#38bdf8');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Field
        const fieldGradient = ctx.createLinearGradient(0, this.canvas.height - 150, 0, this.canvas.height);
        fieldGradient.addColorStop(0, '#16a34a');
        fieldGradient.addColorStop(1, '#15803d');
        ctx.fillStyle = fieldGradient;
        ctx.fillRect(0, this.canvas.height - 150, this.canvas.width, 150);

        // Home plate
        ctx.fillStyle = '#f3f4f6';
        ctx.beginPath();
        ctx.moveTo(50, this.canvas.height - 30);
        ctx.lineTo(35, this.canvas.height - 50);
        ctx.lineTo(50, this.canvas.height - 70);
        ctx.lineTo(65, this.canvas.height - 50);
        ctx.closePath();
        ctx.fill();

        // Outfield wall (arc)
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(50, this.canvas.height - 50, 400, -0.4, -2.7, true);
        ctx.stroke();

        // Foul lines
        ctx.strokeStyle = '#f3f4f6';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 10]);

        // Left foul line
        ctx.beginPath();
        ctx.moveTo(50, this.canvas.height - 50);
        ctx.lineTo(50 + Math.cos(0.7) * 450, this.canvas.height - 50 - Math.sin(0.7) * 450);
        ctx.stroke();

        // Right foul line
        ctx.beginPath();
        ctx.moveTo(50, this.canvas.height - 50);
        ctx.lineTo(50 + Math.cos(-0.7) * 450, this.canvas.height - 50 - Math.sin(-0.7) * 450);
        ctx.stroke();

        ctx.setLineDash([]);

        // Distance markers
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';

        const distances = [300, 350, 400, 450];
        distances.forEach(dist => {
            const scale = dist / 500;
            const x = 50 + scale * 300;
            const y = this.canvas.height - 50 - scale * 200;
            ctx.fillText(`${dist}'`, x, y);
        });

        // Draw flying balls
        this.balls.forEach(ball => {
            this.drawBall(ball);
        });
    }

    drawBall(ball) {
        const ctx = this.ctx;

        // Ball shadow on ground
        if (ball.groundY) {
            ctx.beginPath();
            ctx.ellipse(ball.groundX, ball.groundY, 10, 5, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fill();
        }

        // Ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#f3f4f6';
        ctx.fill();
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Ball shine
        ctx.beginPath();
        ctx.arc(ball.x - 2, ball.y - 2, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();

        // Trail
        if (ball.trail && ball.trail.length > 0) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(ball.trail[0].x, ball.trail[0].y);
            ball.trail.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
        }
    }

    startAnimation() {
        const animate = () => {
            this.updateBalls();
            this.drawStadium();
            this.animationId = requestAnimationFrame(animate);
        };
        animate();
    }

    updateBalls() {
        this.balls = this.balls.filter(ball => {
            ball.time += 0.03;

            // Physics
            const gravity = 0.5;
            ball.vy += gravity;
            ball.x += ball.vx;
            ball.y += ball.vy;

            // Ground projection
            ball.groundX = ball.x;
            ball.groundY = this.canvas.height - 50;

            // Trail
            if (!ball.trail) ball.trail = [];
            ball.trail.push({ x: ball.x, y: ball.y });
            if (ball.trail.length > 20) ball.trail.shift();

            // Remove if out of bounds or hit ground
            return ball.y < this.canvas.height && ball.x < this.canvas.width;
        });
    }

    handleShot(shotData) {
        if (this.swings >= this.maxSwings) {
            showShotFeedback(0, 'Game Over!');
            return;
        }

        this.swings++;

        const result = this.calculateHit(shotData);

        // Launch ball
        if (result.distance > 0) {
            const angle = result.angle * Math.PI / 180;
            const lateralAngle = result.lateral * Math.PI / 180;

            const ball = {
                x: 50,
                y: this.canvas.height - 50,
                vx: Math.cos(angle) * Math.cos(lateralAngle) * result.speed / 15,
                vy: -Math.sin(angle) * result.speed / 15,
                time: 0,
                trail: []
            };

            this.balls.push(ball);
        }

        // Update score
        if (result.isHomeRun) {
            this.homeRuns++;
            this.score += result.points;
        }

        if (result.distance > this.maxDistance) {
            this.maxDistance = Math.floor(result.distance);
        }

        this.updateUI();
        showShotFeedback(result.points, result.message);

        // Check game over
        if (this.swings >= this.maxSwings) {
            setTimeout(() => {
                alert(`Derby Complete!\n\nHome Runs: ${this.homeRuns}\nMax Distance: ${this.maxDistance} ft\nTotal Score: ${this.score}`);
            }, 2000);
        }
    }

    calculateHit(shotData) {
        const speed = shotData.ball_speed || 0;
        const vla = shotData.vla || 0;
        const hla = shotData.hla || 0;

        // Check minimum power
        if (speed < this.MIN_HR_SPEED) {
            return {
                isHomeRun: false,
                distance: 0,
                points: 0,
                message: `Too Weak! Need ${this.MIN_HR_SPEED}+ mph`,
                speed: 0,
                angle: 0,
                lateral: 0
            };
        }

        // Simulate ball flight with physics
        const totalSpin = shotData.total_spin || shotData.backspin || 2500;
        const spinAxis = shotData.spin_axis || 0; // 0 = pure backspin, 90 = pure sidespin
        const trajectory = this.simulateTrajectory(speed, vla, hla, totalSpin, spinAxis);
        const carryYards = trajectory.carry;
        const carryFeet = carryYards * 3; // Convert yards to feet

        // Check if foul (too far left or right)
        const isFoul = Math.abs(hla) > 25;

        // Determine result
        let isHomeRun = false;
        let points = 0;
        let message = '';

        if (isFoul) {
            message = '⚾ Foul Ball!';
        } else if (carryFeet >= 380) {
            isHomeRun = true;
            points = 20;
            message = `💥 HOME RUN! ${Math.floor(carryFeet)} ft`;

            if (carryFeet >= 450) {
                points = 30;
                message = `🚀 MONSTER SHOT! ${Math.floor(carryFeet)} ft`;
            }
        } else if (carryFeet >= 300) {
            points = 5;
            message = `🏃 Long Fly Out ${Math.floor(carryFeet)} ft`;
        } else {
            message = `⚾ Pop Fly ${Math.floor(carryFeet)} ft`;
        }

        return {
            isHomeRun,
            distance: carryFeet,
            points,
            message,
            speed: speed / 10,
            angle: vla,
            lateral: hla
        };
    }

    simulateTrajectory(ballSpeedMph, launchAngleDeg, sideAngleDeg, totalSpinRpm, spinAxisDeg) {
        // Physical constants
        const GRAVITY = 9.81; // m/s^2
        const AIR_DENSITY = 1.225; // kg/m^3
        const BALL_MASS = 0.0459; // kg
        const BALL_RADIUS = 0.02135; // m
        const BALL_AREA = Math.PI * BALL_RADIUS * BALL_RADIUS;

        // Convert inputs to SI units
        const initialVelocity = ballSpeedMph * 0.44704; // mph to m/s
        const launchAngleRad = launchAngleDeg * Math.PI / 180;
        const sideAngleRad = sideAngleDeg * Math.PI / 180;

        // Initial velocity components
        let vx = initialVelocity * Math.cos(launchAngleRad) * Math.sin(sideAngleRad); // lateral
        let vy = initialVelocity * Math.sin(launchAngleRad); // vertical
        let vz = initialVelocity * Math.cos(launchAngleRad) * Math.cos(sideAngleRad); // forward

        // Position
        let x = 0, y = 0, z = 0;

        // Decompose spin into backspin and sidespin components
        // Spin axis: 0° = pure backspin, 90° = pure sidespin
        const spinAxisRad = spinAxisDeg * Math.PI / 180;
        const backspinRpm = totalSpinRpm * Math.cos(spinAxisRad);
        const sidespinRpm = totalSpinRpm * Math.sin(spinAxisRad);

        // Convert to rad/s
        const backspinRadPerSec = backspinRpm * 2 * Math.PI / 60;
        const sidespinRadPerSec = sidespinRpm * 2 * Math.PI / 60;

        // Time step
        const dt = 0.001; // 1ms

        // Simulate until ball hits ground
        while (y >= 0) {
            const v = Math.sqrt(vx * vx + vy * vy + vz * vz);

            if (v > 0.1) {
                // Drag coefficient (simplified)
                const CD = 0.06;

                const q = 0.5 * AIR_DENSITY * v * v;

                // Drag force (opposes velocity)
                const dragMag = CD * q * BALL_AREA;
                const ax_drag = -(dragMag / BALL_MASS) * (vx / v);
                const ay_drag = -(dragMag / BALL_MASS) * (vy / v);
                const az_drag = -(dragMag / BALL_MASS) * (vz / v);

                // Magnus effect - lift from backspin (vertical lift)
                const S_back = (BALL_RADIUS * backspinRadPerSec) / v;
                const CL_back = 0.35 * S_back;
                const liftMag = CL_back * q * BALL_AREA;
                const ay_lift = liftMag / BALL_MASS;

                // Magnus effect - side force from sidespin (lateral curve)
                const S_side = (BALL_RADIUS * sidespinRadPerSec) / v;
                const CL_side = 0.35 * S_side;
                const sideForceMag = CL_side * q * BALL_AREA;
                // Positive sidespin (right spin) causes ball to curve right
                const ax_side = sideForceMag / BALL_MASS;

                // Update velocity
                vx += (ax_drag + ax_side) * dt;
                vy += (ay_drag + ay_lift - GRAVITY) * dt;
                vz += az_drag * dt;
            } else {
                vy -= GRAVITY * dt;
            }

            // Update position
            x += vx * dt;
            y += vy * dt;
            z += vz * dt;

            // Safety check
            if (y < -10) break;
        }

        // Calculate carry distance in meters
        const carryMeters = Math.sqrt(x * x + z * z);

        // Convert to yards
        const carryYards = carryMeters / 0.9144;

        // Apply calibration scaling based on ShotScope data
        const scaledCarry = this.applyCalibration(carryYards, ballSpeedMph, launchAngleDeg, sideAngleDeg, totalSpinRpm, spinAxisDeg);

        return {
            carry: scaledCarry,
            lateral: Math.abs(x) / 0.9144 // lateral distance in yards
        };
    }

    applyCalibration(rawCarryYards, ballSpeedMph, launchAngleDeg, sideAngleDeg, totalSpinRpm, spinAxisDeg) {
        // Calibration table: [speed, multiplier]
        // Based on both original ShotScope data and new FlightScope wedge data
        const calibrationData = [
            [58, 1.05],      // Wedge shots (58-65 mph)
            [60, 1.05],
            [65, 1.02],      // Short wedges/short irons (65-75 mph)
            [70, 0.98],
            [100, 0.847],    // Mid irons
            [150, 1.191],    // Driver
            [212, 1.305]     // Pro driver
        ];

        let baseMultiplier;

        if (ballSpeedMph <= calibrationData[0][0]) {
            baseMultiplier = calibrationData[0][1];
        } else if (ballSpeedMph >= calibrationData[calibrationData.length - 1][0]) {
            baseMultiplier = calibrationData[calibrationData.length - 1][1];
        } else {
            // Linear interpolation on speed
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

        // Very low angle correction (< 10°): physics severely underestimates
        // At 8°, need +31% boost; at 10°, no boost
        let angleFactor = 1.0;
        if (launchAngleDeg < 10) {
            const angleBoost = (10 - launchAngleDeg) * 0.155; // 15.5% per degree below 10°
            angleFactor = 1.0 + angleBoost;
        }

        // High spin correction (> 3800 rpm): physics overestimates high spin shots
        // But only when HLA is moderate (<15°) - extreme HLA changes the dynamics
        // At 4200 rpm, reduce by 12%; at 3800 rpm, no reduction
        let spinFactor = 1.0;
        const absHLA = Math.abs(sideAngleDeg);
        if (totalSpinRpm > 3800 && absHLA < 15) {
            const spinReduction = (totalSpinRpm - 3800) / 400 * 0.12; // 12% reduction at 4200 rpm
            spinFactor = 1.0 - Math.min(spinReduction, 0.12); // Cap at 12% reduction
        }

        // Low spin correction (< 1500 rpm): no correction needed
        // Tests show low spin shots are accurate with current calibration

        // High spin axis correction (> 25°): excessive sidespin reduces forward carry
        // At 32°, reduce by 8%; at 25°, no reduction
        let spinAxisFactor = 1.0;
        const absSpinAxis = Math.abs(spinAxisDeg);
        if (absSpinAxis > 25) {
            const spinAxisReduction = (absSpinAxis - 25) / 7 * 0.08; // 8% reduction at 32°
            spinAxisFactor = 1.0 - Math.min(spinAxisReduction, 0.10); // Cap at 10%
        }

        // Apply HLA boost (shots with side angle travel slightly farther due to geometry)
        // Reduced from 1% to 0.3% per degree based on real-world tests
        const hlaBoost = 1 + (absHLA * 0.003);

        return rawCarryYards * baseMultiplier * angleFactor * spinFactor * spinAxisFactor * hlaBoost;
    }

    updateUI() {
        document.getElementById('hrdHomeRuns').textContent = this.homeRuns;
        document.getElementById('hrdMaxDist').textContent = `${this.maxDistance} ft`;
        document.getElementById('hrdSwings').textContent = `${this.swings} / ${this.maxSwings}`;
    }

    cleanup() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.score = 0;
        this.homeRuns = 0;
        this.swings = 0;
        this.balls = [];
    }
}
