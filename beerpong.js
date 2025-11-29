// Beer Pong game implementation
class BeerPongGame {
    constructor() {
        this.score = 0;
        this.shotCount = 0;
        this.maxShots = 20;
        this.cupsRemaining = 10;
        this.cups = [];
        this.canvas = null;
        this.ctx = null;

        // Game configuration
        this.CUP_RADIUS = 30;
        this.TABLE_WIDTH = 600;
        this.TABLE_HEIGHT = 400;

        // Cup positions (triangle formation)
        this.cupPositions = [
            // Back row (4 cups)
            { x: 300, y: 100, active: true },
            { x: 340, y: 100, active: true },
            { x: 380, y: 100, active: true },
            { x: 420, y: 100, active: true },
            // Third row (3 cups)
            { x: 320, y: 145, active: true },
            { x: 360, y: 145, active: true },
            { x: 400, y: 145, active: true },
            // Second row (2 cups)
            { x: 340, y: 190, active: true },
            { x: 380, y: 190, active: true },
            // Front row (1 cup)
            { x: 360, y: 235, active: true }
        ];
    }

    init() {
        const gameContent = document.getElementById('gameContent');
        gameContent.innerHTML = `
            <div class="score-display">
                <div class="score-item">
                    <div class="label">Score</div>
                    <div class="value" id="bpScore">0</div>
                </div>
                <div class="score-item">
                    <div class="label">Cups Left</div>
                    <div class="value" id="bpCups">10</div>
                </div>
                <div class="score-item">
                    <div class="label">Shots</div>
                    <div class="value" id="bpShots">0 / ${this.maxShots}</div>
                </div>
            </div>

            <div style="display: flex; justify-content: center; margin-top: 20px;">
                <canvas id="beerPongTable" width="700" height="500" style="border-radius: 10px; background: #1a1a1a;"></canvas>
            </div>

            <div style="text-align: center; margin-top: 20px; opacity: 0.8;">
                <p>🍺 Perfect Arc: 25° VLA (vertical launch angle)</p>
                <p>🎯 Aim: Use HLA to target cups left/right</p>
                <p>💪 Power: 80-120 mph for best results</p>
            </div>
        `;

        this.canvas = document.getElementById('beerPongTable');
        this.ctx = this.canvas.getContext('2d');
        this.cups = JSON.parse(JSON.stringify(this.cupPositions)); // Deep copy
        this.drawTable();
    }

    drawTable() {
        const ctx = this.ctx;
        const canvas = this.canvas;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw table
        const tableX = 50;
        const tableY = 50;
        ctx.fillStyle = '#1e40af';
        ctx.fillRect(tableX, tableY, this.TABLE_WIDTH, this.TABLE_HEIGHT);

        // Draw table edge
        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = 8;
        ctx.strokeRect(tableX, tableY, this.TABLE_WIDTH, this.TABLE_HEIGHT);

        // Draw center line
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tableX + this.TABLE_WIDTH / 2, tableY);
        ctx.lineTo(tableX + this.TABLE_WIDTH / 2, tableY + this.TABLE_HEIGHT);
        ctx.stroke();

        // Draw cups
        this.cups.forEach((cup, index) => {
            if (cup.active) {
                this.drawCup(tableX + cup.x, tableY + cup.y, true);
            } else {
                // Draw faint outline for removed cups
                this.drawCup(tableX + cup.x, tableY + cup.y, false);
            }
        });

        // Draw water cup labels
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🍺 BEER PONG', canvas.width / 2, 30);
    }

    drawCup(x, y, active) {
        const ctx = this.ctx;

        if (active) {
            // Draw cup shadow
            ctx.beginPath();
            ctx.arc(x, y + 5, this.CUP_RADIUS, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fill();

            // Draw cup
            ctx.beginPath();
            ctx.arc(x, y, this.CUP_RADIUS, 0, 2 * Math.PI);
            ctx.fillStyle = '#ef4444';
            ctx.fill();
            ctx.strokeStyle = '#dc2626';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Draw beer/liquid
            ctx.beginPath();
            ctx.arc(x, y, this.CUP_RADIUS - 5, 0, 2 * Math.PI);
            ctx.fillStyle = '#fbbf24';
            ctx.fill();
        } else {
            // Faint outline
            ctx.beginPath();
            ctx.arc(x, y, this.CUP_RADIUS, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    drawBallTrajectory(startX, startY, endX, endY, hitCup) {
        const ctx = this.ctx;

        // Draw arc trajectory
        ctx.beginPath();
        ctx.moveTo(startX, startY);

        // Calculate control point for arc
        const controlY = Math.min(startY, endY) - 100;
        ctx.quadraticCurveTo(
            (startX + endX) / 2,
            controlY,
            endX,
            endY
        );

        ctx.strokeStyle = hitCup ? '#22c55e' : '#ef4444';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw ball at end position
        ctx.beginPath();
        ctx.arc(endX, endY, 8, 0, 2 * Math.PI);
        ctx.fillStyle = hitCup ? '#22c55e' : '#f97316';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Clear trajectory after animation
        setTimeout(() => {
            this.drawTable();
        }, 1500);
    }

    handleShot(shotData) {
        if (this.shotCount >= this.maxShots) {
            showShotFeedback(0, 'Game Over!');
            return;
        }

        this.shotCount++;

        // Calculate trajectory
        const result = this.calculateTrajectory(shotData);

        // Find target cup position
        const tableX = 50;
        const tableY = 50;
        const targetX = tableX + result.targetX;
        const targetY = tableY + result.targetY;

        // Draw ball trajectory
        const startX = this.canvas.width / 2;
        const startY = this.canvas.height - 20;
        this.drawBallTrajectory(startX, startY, targetX, targetY, result.hit);

        // Update game state
        if (result.hit) {
            this.score += result.points;
            this.cupsRemaining--;
        }

        this.updateUI();

        // Show feedback
        showShotFeedback(result.points, result.message);

        // Check win condition
        if (this.cupsRemaining === 0) {
            setTimeout(() => {
                alert(`🎉 YOU WIN! 🎉\n\nFinal Score: ${this.score}\nShots Used: ${this.shotCount}/${this.maxShots}`);
            }, 2000);
        } else if (this.shotCount >= this.maxShots && this.cupsRemaining > 0) {
            setTimeout(() => {
                alert(`Game Over!\n\nFinal Score: ${this.score}\nCups Remaining: ${this.cupsRemaining}`);
            }, 2000);
        }
    }

    calculateTrajectory(shotData) {
        const speed = shotData.ball_speed || 0;
        const vla = shotData.vla || 0;  // Vertical launch angle
        const hla = shotData.hla || 0;  // Horizontal launch angle

        // Ideal shot: VLA around 25°, speed 80-120 mph
        const idealVLA = 25.0;
        const arcQuality = 1.0 - Math.abs(vla - idealVLA) / idealVLA;

        // Check speed range
        const goodSpeed = speed >= 80 && speed <= 120;

        // Calculate horizontal position based on HLA
        const horizontalOffset = (hla / 15.0) * (this.TABLE_WIDTH / 2);
        const targetX = this.TABLE_WIDTH / 2 + horizontalOffset;

        // Calculate depth based on arc quality
        const targetY = this.TABLE_HEIGHT / 2 - (arcQuality * 100);

        // Check if hit a cup
        let hitCupIndex = -1;
        const hitRadius = 40; // Tolerance for hitting cup

        for (let i = 0; i < this.cups.length; i++) {
            if (!this.cups[i].active) continue;

            const cup = this.cups[i];
            const dx = targetX - cup.x;
            const dy = targetY - cup.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < hitRadius) {
                hitCupIndex = i;
                break;
            }
        }

        // Determine result
        let result = {
            targetX: targetX,
            targetY: targetY,
            hit: false,
            points: 0,
            message: ''
        };

        if (!goodSpeed) {
            result.message = speed > 120 ? 'Too Fast! Ball Bounced Out' : 'Too Slow! Ball Fell Short';
        } else if (arcQuality < 0.3) {
            result.message = 'Poor Arc! Try 25° VLA';
        } else if (hitCupIndex >= 0) {
            // Hit!
            this.cups[hitCupIndex].active = false;
            result.hit = true;
            result.points = 10;
            result.message = '🎯 SPLASH! Cup Down!';

            // Bonus for special shots
            if (arcQuality > 0.9) {
                result.points = 15;
                result.message = '🌟 PERFECT ARC! +15pts';
            }
        } else {
            result.message = 'Miss! Adjust Your Aim';
        }

        return result;
    }

    updateUI() {
        document.getElementById('bpScore').textContent = this.score;
        document.getElementById('bpCups').textContent = this.cupsRemaining;
        document.getElementById('bpShots').textContent = `${this.shotCount} / ${this.maxShots}`;
    }

    cleanup() {
        this.score = 0;
        this.shotCount = 0;
        this.cupsRemaining = 10;
        this.cups = JSON.parse(JSON.stringify(this.cupPositions));
    }
}
