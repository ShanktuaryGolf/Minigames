// Darts game implementation
class DartsGame {
    constructor() {
        this.score = 0;
        this.shotCount = 0;
        this.maxShots = 10;
        this.darts = [];
        this.canvas = null;
        this.ctx = null;

        // Dartboard configuration
        this.DARTBOARD_RADIUS = 200;
        this.BULLSEYE_RADIUS = 15;
        this.BULLS_RING_RADIUS = 40;
        this.TRIPLE_INNER = 100;
        this.TRIPLE_OUTER = 110;
        this.DOUBLE_INNER = 180;
        this.DOUBLE_OUTER = 200;

        // Dartboard numbers (clockwise from top)
        this.NUMBERS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

        // Color scheme
        this.COLORS = {
            black: '#000000',
            white: '#f5f5f5',
            red: '#dc2626',
            green: '#16a34a',
            bullseye: '#dc2626',
            bullRing: '#16a34a'
        };
    }

    init() {
        const gameContent = document.getElementById('gameContent');
        gameContent.innerHTML = `
            <div class="score-display">
                <div class="score-item">
                    <div class="label">Score</div>
                    <div class="value" id="dartScore">0</div>
                </div>
                <div class="score-item">
                    <div class="label">Shots</div>
                    <div class="value" id="dartShots">0 / ${this.maxShots}</div>
                </div>
                <div class="score-item">
                    <div class="label">Average</div>
                    <div class="value" id="dartAvg">0.0</div>
                </div>
            </div>

            <div style="display: flex; justify-content: center; margin-top: 20px;">
                <canvas id="dartboard" width="500" height="500" style="border-radius: 10px; background: #1a1a1a;"></canvas>
            </div>

            <div style="text-align: center; margin-top: 20px; opacity: 0.8;">
                <p>🎯 Aim: Use HLA/VLA to position dart on board</p>
                <p>💨 Speed: 10-140 mph for dart to stick</p>
            </div>
        `;

        this.canvas = document.getElementById('dartboard');
        this.ctx = this.canvas.getContext('2d');
        this.drawDartboard();
    }

    drawDartboard() {
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Draw dartboard segments
        for (let i = 0; i < 20; i++) {
            const angle1 = (i * 18 - 9) * Math.PI / 180;
            const angle2 = ((i + 1) * 18 - 9) * Math.PI / 180;

            // Alternate colors for segments
            const isBlack = i % 2 === 0;
            const segmentColor1 = isBlack ? this.COLORS.black : this.COLORS.white;
            const segmentColor2 = isBlack ? this.COLORS.green : this.COLORS.red;

            // Draw outer single
            this.drawSegment(ctx, centerX, centerY, this.DOUBLE_OUTER, this.DOUBLE_INNER, angle1, angle2, segmentColor2);

            // Draw triple ring
            this.drawSegment(ctx, centerX, centerY, this.TRIPLE_OUTER, this.TRIPLE_INNER, angle1, angle2, segmentColor2);

            // Draw inner single (larger area)
            this.drawSegment(ctx, centerX, centerY, this.DOUBLE_INNER, this.TRIPLE_OUTER, angle1, angle2, segmentColor1);
            this.drawSegment(ctx, centerX, centerY, this.TRIPLE_INNER, this.BULLS_RING_RADIUS, angle1, angle2, segmentColor1);

            // Draw number
            const numberAngle = i * 18 * Math.PI / 180;
            const numberRadius = this.DARTBOARD_RADIUS + 20;
            const numX = centerX + Math.sin(numberAngle) * numberRadius;
            const numY = centerY - Math.cos(numberAngle) * numberRadius;

            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.NUMBERS[i], numX, numY);
        }

        // Draw bull's ring
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.BULLS_RING_RADIUS, 0, 2 * Math.PI);
        ctx.fillStyle = this.COLORS.bullRing;
        ctx.fill();

        // Draw bullseye
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.BULLSEYE_RADIUS, 0, 2 * Math.PI);
        ctx.fillStyle = this.COLORS.bullseye;
        ctx.fill();

        // Draw existing darts
        this.darts.forEach(dart => this.drawDart(dart.x, dart.y));
    }

    drawSegment(ctx, centerX, centerY, outerRadius, innerRadius, angle1, angle2, color) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, angle1, angle2);
        ctx.arc(centerX, centerY, innerRadius, angle2, angle1, true);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    drawDart(x, y) {
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Convert game coordinates to canvas coordinates
        const canvasX = centerX + x;
        const canvasY = centerY + y;

        // Draw dart
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    handleShot(shotData) {
        if (this.shotCount >= this.maxShots) {
            showShotFeedback(0, 'Game Over!');
            return;
        }

        this.shotCount++;

        // Map shot to dart position
        const dartPos = this.shotToPosition(shotData);

        // Check speed
        const speed = shotData.ball_speed || 0;
        if (speed > 140) {
            this.updateUI();
            showShotFeedback(0, 'Too Hard! Dart Bounced');
            return;
        }
        if (speed < 10) {
            this.updateUI();
            showShotFeedback(0, 'Too Soft! Dart Fell Short');
            return;
        }

        // Calculate score
        const result = this.calculateScore(dartPos);

        // Calculate distance from center (in pixels, convert to inches)
        const distancePixels = Math.sqrt(dartPos.x * dartPos.x + dartPos.y * dartPos.y);
        const distanceInches = (distancePixels / this.DARTBOARD_RADIUS) * 9; // Standard dartboard is 18" diameter (9" radius)

        // Add dart to board
        this.darts.push(dartPos);
        this.drawDartboard();

        // Update score
        this.score += result.points;
        this.updateUI();

        // Show feedback with distance from center
        showShotFeedback(result.points, result.message, distanceInches);

        // Check if game over
        if (this.shotCount >= this.maxShots) {
            setTimeout(() => {
                alert(`Game Over!\n\nFinal Score: ${this.score}\nAverage: ${(this.score / this.shotCount).toFixed(1)} per dart\n\nClick "🔄 New Game" to play again!`);
            }, 2000);
        }
    }

    shotToPosition(shotData) {
        const hla = shotData.hla || 0;
        const vla = shotData.vla || 0;

        // Get active calibration profile (set by main app based on projector mode)
        const profile = window.calibrationProfiles ? window.calibrationProfiles[window.activeCalibrationProfile || 'computer'] : null;

        if (profile && profile.hla_scale !== undefined) {
            let normalizedX, normalizedY;

            // Check if polynomial regression is available and should be used
            if (profile.usePolynomial && profile.hla_poly && profile.usePolynomial.hla) {
                // POLYNOMIAL (quadratic): x = a*hla² + b*hla + c
                const poly = profile.hla_poly;
                normalizedX = poly.a * hla * hla + poly.b * hla + poly.c;
            } else {
                // LINEAR: x = hla * scale + offset
                normalizedX = hla * profile.hla_scale + profile.hla_offset;
            }

            if (profile.usePolynomial && profile.vla_poly && profile.usePolynomial.vla) {
                // POLYNOMIAL (quadratic): y = a*vla² + b*vla + c
                const poly = profile.vla_poly;
                normalizedY = poly.a * vla * vla + poly.b * vla + poly.c;
            } else {
                // LINEAR: y = vla * scale + offset
                normalizedY = vla * profile.vla_scale + profile.vla_offset;
            }

            const x = normalizedX * this.DARTBOARD_RADIUS;
            const y = normalizedY * this.DARTBOARD_RADIUS;

            return { x, y };
        } else {
            // FALLBACK: Old system (hardcoded assumptions)
            const x = (hla / 15.0) * this.DARTBOARD_RADIUS;
            const y = -((vla - 15.0) / 10.0) * this.DARTBOARD_RADIUS;
            return { x, y };
        }
    }

    calculateScore(pos) {
        const distance = Math.sqrt(pos.x * pos.x + pos.y * pos.y);

        // Check if missed
        if (distance > this.DARTBOARD_RADIUS) {
            return { points: 0, message: 'Missed!' };
        }

        // Bullseye
        if (distance <= this.BULLSEYE_RADIUS) {
            return { points: 50, message: 'BULLSEYE! 🎯' };
        }

        // Bull's ring
        if (distance <= this.BULLS_RING_RADIUS) {
            return { points: 25, message: "Bull's Ring!" };
        }

        // Get number segment
        const angle = Math.atan2(pos.x, -pos.y);
        const segment = this.getDartboardNumber(angle);

        // Triple
        if (distance >= this.TRIPLE_INNER && distance <= this.TRIPLE_OUTER) {
            return { points: segment * 3, message: `TRIPLE ${segment}! ⚡` };
        }

        // Double
        if (distance >= this.DOUBLE_INNER && distance <= this.DOUBLE_OUTER) {
            return { points: segment * 2, message: `DOUBLE ${segment}! 💥` };
        }

        // Single
        return { points: segment, message: `Hit ${segment}` };
    }

    getDartboardNumber(angleRad) {
        let angleDeg = angleRad * 180 / Math.PI;
        if (angleDeg < 0) angleDeg += 360;

        // Add half segment to align
        angleDeg += 9;
        if (angleDeg >= 360) angleDeg -= 360;

        const segmentIndex = Math.floor(angleDeg / 18) % 20;
        return this.NUMBERS[segmentIndex];
    }

    updateUI() {
        document.getElementById('dartScore').textContent = this.score;
        document.getElementById('dartShots').textContent = `${this.shotCount} / ${this.maxShots}`;
        const avg = this.shotCount > 0 ? (this.score / this.shotCount).toFixed(1) : '0.0';
        document.getElementById('dartAvg').textContent = avg;
    }

    restartGame() {
        // Reset game state
        this.score = 0;
        this.shotCount = 0;
        this.darts = [];

        // Re-render
        this.init();
    }

    cleanup() {
        // Reset game state
        this.score = 0;
        this.shotCount = 0;
        this.darts = [];
    }
}
