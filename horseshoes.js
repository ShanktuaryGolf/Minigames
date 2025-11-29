// Horseshoes/Cornhole game implementation
class HorseshoesGame {
    constructor() {
        this.score = 0;
        this.shotCount = 0;
        this.maxShots = 15;
        this.canvas = null;
        this.ctx = null;
        this.throws = [];

        // Game configuration
        this.TARGET_DISTANCE = 300; // pixels
        this.STAKE_RADIUS = 15;
        this.RINGER_RADIUS = 60;
        this.POINTS_RINGER = 3;
        this.POINTS_CLOSE = 1;
    }

    init() {
        const gameContent = document.getElementById('gameContent');
        gameContent.innerHTML = `
            <div class="score-display">
                <div class="score-item">
                    <div class="label">Score</div>
                    <div class="value" id="hsScore">0</div>
                </div>
                <div class="score-item">
                    <div class="label">Ringers</div>
                    <div class="value" id="hsRingers">0</div>
                </div>
                <div class="score-item">
                    <div class="label">Throws</div>
                    <div class="value" id="hsShots">0 / ${this.maxShots}</div>
                </div>
            </div>

            <div style="display: flex; justify-content: center; margin-top: 20px;">
                <canvas id="horseshoesCanvas" width="800" height="500" style="border-radius: 10px; background: #1a1a1a;"></canvas>
            </div>

            <div style="text-align: center; margin-top: 20px; opacity: 0.8;">
                <p>🥾 Distance: Speed controls how far horseshoe flies</p>
                <p>🎯 Aim: VLA ~20-30° for best arc | HLA for left/right</p>
                <p>⭐ Ringer (3pts): Land around stake | Close (1pt): Within 12 inches</p>
            </div>
        `;

        this.canvas = document.getElementById('horseshoesCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ringerCount = 0;
        this.drawField();
    }

    drawField() {
        const ctx = this.ctx;
        const canvas = this.canvas;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw ground
        const groundGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        groundGradient.addColorStop(0, '#2d5016');
        groundGradient.addColorStop(1, '#1a2e0a');
        ctx.fillStyle = groundGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw grass texture
        ctx.strokeStyle = 'rgba(100, 150, 50, 0.3)';
        for (let i = 0; i < 100; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.stroke();
        }

        // Draw throwing line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height - 50);
        ctx.lineTo(canvas.width, canvas.height - 50);
        ctx.stroke();

        // Draw stake platform (sand pit)
        const stakeX = canvas.width / 2;
        const stakeY = 100;

        ctx.fillStyle = '#d4a574';
        ctx.fillRect(stakeX - 80, stakeY - 80, 160, 160);

        // Draw stake shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(stakeX - 5, stakeY, 10, 80);

        // Draw stake
        const stakeGradient = ctx.createLinearGradient(stakeX - 10, 0, stakeX + 10, 0);
        stakeGradient.addColorStop(0, '#8b7355');
        stakeGradient.addColorStop(0.5, '#a0826d');
        stakeGradient.addColorStop(1, '#8b7355');
        ctx.fillStyle = stakeGradient;
        ctx.fillRect(stakeX - 10, stakeY - 60, 20, 120);

        // Draw stake top
        ctx.beginPath();
        ctx.arc(stakeX, stakeY - 60, 10, 0, Math.PI * 2);
        ctx.fill();

        // Draw ringer zone circle
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(stakeX, stakeY, this.RINGER_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw distance markers
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('STAKE', stakeX, stakeY + 100);
        ctx.fillText('40 ft', stakeX, canvas.height - 60);

        // Draw thrown horseshoes
        this.throws.forEach(t => {
            this.drawHorseshoe(t.x, t.y, t.isRinger, t.isClose);
        });
    }

    drawHorseshoe(x, y, isRinger, isClose) {
        const ctx = this.ctx;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(x + 3, y + 3, 20, 0, Math.PI * 2);
        ctx.fill();

        // Horseshoe body
        const color = isRinger ? '#ffd700' : (isClose ? '#c0c0c0' : '#696969');
        ctx.strokeStyle = color;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0.3 * Math.PI, 1.7 * Math.PI);
        ctx.stroke();

        // Horseshoe ends
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x - 15, y + 12, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 15, y + 12, 5, 0, Math.PI * 2);
        ctx.fill();

        // Highlight if ringer
        if (isRinger) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(x, y, 30, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    handleShot(shotData) {
        if (this.shotCount >= this.maxShots) {
            showShotFeedback(0, 'Game Over!');
            return;
        }

        this.shotCount++;

        // Calculate throw result
        const result = this.calculateThrow(shotData);

        // Add to throws
        this.throws.push({
            x: result.x,
            y: result.y,
            isRinger: result.isRinger,
            isClose: result.isClose
        });

        // Update score
        this.score += result.points;
        if (result.isRinger) this.ringerCount++;

        // Redraw
        this.drawField();
        this.updateUI();

        // Show feedback
        showShotFeedback(result.points, result.message);

        // Check if game over
        if (this.shotCount >= this.maxShots) {
            setTimeout(() => {
                alert(`Game Over!\n\nFinal Score: ${this.score}\nRingers: ${this.ringerCount}\nAccuracy: ${((this.ringerCount / this.shotCount) * 100).toFixed(1)}%`);
            }, 2000);
        }
    }

    calculateThrow(shotData) {
        const speed = shotData.ball_speed || 0;
        const vla = shotData.vla || 0;
        const hla = shotData.hla || 0;

        const stakeX = this.canvas.width / 2;
        const stakeY = 100;

        // Calculate distance based on speed and angle
        const speedFactor = Math.min(speed / 120.0, 1.5);
        const angleFactor = Math.max(0, 1.0 - Math.abs(vla - 25) / 25);
        const distance = speedFactor * angleFactor * this.TARGET_DISTANCE;

        // Calculate lateral offset from HLA
        const lateralOffset = (hla / 10.0) * 150;

        // Calculate landing position
        const landingX = stakeX + lateralOffset;
        const landingY = this.canvas.height - 50 - distance;

        // Clamp to canvas
        const finalX = Math.max(50, Math.min(this.canvas.width - 50, landingX));
        const finalY = Math.max(80, Math.min(this.canvas.height - 100, landingY));

        // Calculate distance to stake
        const dx = finalX - stakeX;
        const dy = finalY - stakeY;
        const distToStake = Math.sqrt(dx * dx + dy * dy);

        // Determine result
        let isRinger = false;
        let isClose = false;
        let points = 0;
        let message = '';

        if (distToStake <= this.RINGER_RADIUS) {
            isRinger = true;
            points = this.POINTS_RINGER;
            message = '⭐ RINGER! +3pts';
        } else if (distToStake <= 150) {
            isClose = true;
            points = this.POINTS_CLOSE;
            message = '✓ Close! +1pt';
        } else {
            message = 'Too Far!';
        }

        return {
            x: finalX,
            y: finalY,
            isRinger,
            isClose,
            points,
            message
        };
    }

    updateUI() {
        document.getElementById('hsScore').textContent = this.score;
        document.getElementById('hsRingers').textContent = this.ringerCount;
        document.getElementById('hsShots').textContent = `${this.shotCount} / ${this.maxShots}`;
    }

    cleanup() {
        this.score = 0;
        this.shotCount = 0;
        this.ringerCount = 0;
        this.throws = [];
    }
}
