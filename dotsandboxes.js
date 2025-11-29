// Dots and Boxes game implementation (vs AI)
class DotsAndBoxesGame {
    constructor() {
        this.score = 0;
        this.playerScore = 0;
        this.aiScore = 0;
        this.canvas = null;
        this.ctx = null;
        this.gridSize = 5;
        this.lines = {
            horizontal: [],
            vertical: []
        };
        this.boxes = [];
        this.isPlayerTurn = true;
        this.gameActive = true;

        // Visual config
        this.DOT_RADIUS = 8;
        this.CELL_SIZE = 80;
        this.OFFSET = 60;
    }

    init() {
        const gameContent = document.getElementById('gameContent');
        gameContent.innerHTML = `
            <div class="score-display">
                <div class="score-item">
                    <div class="label">You</div>
                    <div class="value" id="dabPlayerScore">0</div>
                </div>
                <div class="score-item">
                    <div class="label">AI</div>
                    <div class="value" id="dabAIScore">0</div>
                </div>
                <div class="score-item">
                    <div class="label">Turn</div>
                    <div class="value" id="dabTurn">Player</div>
                </div>
            </div>

            <div style="display: flex; justify-content: center; margin-top: 20px;">
                <canvas id="dabCanvas" width="500" height="500" style="border-radius: 10px; background: #1a1a1a;"></canvas>
            </div>

            <div style="text-align: center; margin-top: 20px; opacity: 0.8;">
                <p>🎯 Draw Lines: HLA/VLA selects position and direction</p>
                <p>📦 Complete boxes to score | Chain boxes for extra turns!</p>
            </div>
        `;

        this.canvas = document.getElementById('dabCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Initialize grid
        this.lines.horizontal = Array(this.gridSize).fill(null).map(() => Array(this.gridSize - 1).fill(false));
        this.lines.vertical = Array(this.gridSize - 1).fill(null).map(() => Array(this.gridSize).fill(false));
        this.boxes = Array(this.gridSize - 1).fill(null).map(() => Array(this.gridSize - 1).fill(null));

        this.playerScore = 0;
        this.aiScore = 0;
        this.isPlayerTurn = true;
        this.gameActive = true;

        this.drawBoard();
    }

    drawBoard() {
        const ctx = this.ctx;

        // Clear
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw dots
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const x = this.OFFSET + col * this.CELL_SIZE;
                const y = this.OFFSET + row * this.CELL_SIZE;

                ctx.beginPath();
                ctx.arc(x, y, this.DOT_RADIUS, 0, Math.PI * 2);
                ctx.fillStyle = '#64748b';
                ctx.fill();
            }
        }

        // Draw horizontal lines
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize - 1; col++) {
                if (this.lines.horizontal[row][col]) {
                    const x1 = this.OFFSET + col * this.CELL_SIZE;
                    const y1 = this.OFFSET + row * this.CELL_SIZE;
                    const x2 = this.OFFSET + (col + 1) * this.CELL_SIZE;
                    const y2 = y1;

                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.strokeStyle = '#3b82f6';
                    ctx.lineWidth = 4;
                    ctx.stroke();
                }
            }
        }

        // Draw vertical lines
        for (let row = 0; row < this.gridSize - 1; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                if (this.lines.vertical[row][col]) {
                    const x1 = this.OFFSET + col * this.CELL_SIZE;
                    const y1 = this.OFFSET + row * this.CELL_SIZE;
                    const x2 = x1;
                    const y2 = this.OFFSET + (row + 1) * this.CELL_SIZE;

                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.strokeStyle = '#3b82f6';
                    ctx.lineWidth = 4;
                    ctx.stroke();
                }
            }
        }

        // Draw completed boxes
        for (let row = 0; row < this.gridSize - 1; row++) {
            for (let col = 0; col < this.gridSize - 1; col++) {
                if (this.boxes[row][col]) {
                    const x = this.OFFSET + col * this.CELL_SIZE;
                    const y = this.OFFSET + row * this.CELL_SIZE;

                    ctx.fillStyle = this.boxes[row][col] === 'player' ?
                        'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)';
                    ctx.fillRect(x, y, this.CELL_SIZE, this.CELL_SIZE);

                    // Draw initial
                    ctx.fillStyle = this.boxes[row][col] === 'player' ? '#3b82f6' : '#ef4444';
                    ctx.font = 'bold 24px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(
                        this.boxes[row][col] === 'player' ? 'P' : 'A',
                        x + this.CELL_SIZE / 2,
                        y + this.CELL_SIZE / 2
                    );
                }
            }
        }
    }

    handleShot(shotData) {
        if (!this.gameActive || !this.isPlayerTurn) {
            showShotFeedback(0, 'Wait for AI turn!');
            return;
        }

        const line = this.shotToLine(shotData);

        if (!line) {
            showShotFeedback(0, 'Invalid position!');
            return;
        }

        const { type, row, col } = line;

        // Check if line already drawn
        if (type === 'horizontal' && this.lines.horizontal[row][col]) {
            showShotFeedback(0, 'Line already drawn!');
            return;
        }
        if (type === 'vertical' && this.lines.vertical[row][col]) {
            showShotFeedback(0, 'Line already drawn!');
            return;
        }

        // Draw the line
        if (type === 'horizontal') {
            this.lines.horizontal[row][col] = true;
        } else {
            this.lines.vertical[row][col] = true;
        }

        // Check for completed boxes
        const boxesCompleted = this.checkCompletedBoxes('player');

        this.drawBoard();

        if (boxesCompleted > 0) {
            this.playerScore += boxesCompleted;
            showShotFeedback(boxesCompleted, `+${boxesCompleted} Box${boxesCompleted > 1 ? 'es' : ''}!`);
            // Player gets another turn
        } else {
            this.isPlayerTurn = false;
            showShotFeedback(0, 'Line drawn');
            setTimeout(() => this.aiMove(), 800);
        }

        this.updateUI();
        this.checkGameOver();
    }

    shotToLine(shotData) {
        const hla = shotData.hla || 0;
        const vla = shotData.vla || 0;
        const speed = shotData.ball_speed || 0;

        // Determine if horizontal or vertical based on speed
        const isHorizontal = speed > 100;

        if (isHorizontal) {
            // Map to horizontal line
            const row = Math.floor(((vla - 5) / 20) * this.gridSize);
            const col = Math.floor(((hla + 10) / 20) * (this.gridSize - 1));

            const clampedRow = Math.max(0, Math.min(this.gridSize - 1, row));
            const clampedCol = Math.max(0, Math.min(this.gridSize - 2, col));

            return { type: 'horizontal', row: clampedRow, col: clampedCol };
        } else {
            // Map to vertical line
            const row = Math.floor(((vla - 5) / 20) * (this.gridSize - 1));
            const col = Math.floor(((hla + 10) / 20) * this.gridSize);

            const clampedRow = Math.max(0, Math.min(this.gridSize - 2, row));
            const clampedCol = Math.max(0, Math.min(this.gridSize - 1, col));

            return { type: 'vertical', row: clampedRow, col: clampedCol };
        }
    }

    checkCompletedBoxes(player) {
        let count = 0;

        for (let row = 0; row < this.gridSize - 1; row++) {
            for (let col = 0; col < this.gridSize - 1; col++) {
                if (this.boxes[row][col] === null) {
                    // Check if all 4 sides are drawn
                    if (this.lines.horizontal[row][col] &&
                        this.lines.horizontal[row + 1][col] &&
                        this.lines.vertical[row][col] &&
                        this.lines.vertical[row][col + 1]) {
                        this.boxes[row][col] = player;
                        count++;
                    }
                }
            }
        }

        return count;
    }

    aiMove() {
        if (!this.gameActive) return;

        // Simple AI: Try to complete a box, otherwise random
        let moveMade = false;

        // Try to complete a box
        for (let row = 0; row < this.gridSize - 1; row++) {
            for (let col = 0; col < this.gridSize - 1; col++) {
                if (this.boxes[row][col] === null) {
                    const sides = [
                        { type: 'horizontal', r: row, c: col, drawn: this.lines.horizontal[row][col] },
                        { type: 'horizontal', r: row + 1, c: col, drawn: this.lines.horizontal[row + 1][col] },
                        { type: 'vertical', r: row, c: col, drawn: this.lines.vertical[row][col] },
                        { type: 'vertical', r: row, c: col + 1, drawn: this.lines.vertical[row][col + 1] }
                    ];

                    const undrawn = sides.filter(s => !s.drawn);
                    if (undrawn.length === 1) {
                        const side = undrawn[0];
                        if (side.type === 'horizontal') {
                            this.lines.horizontal[side.r][side.c] = true;
                        } else {
                            this.lines.vertical[side.r][side.c] = true;
                        }
                        moveMade = true;
                        break;
                    }
                }
            }
            if (moveMade) break;
        }

        // Random move if no box to complete
        if (!moveMade) {
            const availableH = [];
            const availableV = [];

            for (let r = 0; r < this.gridSize; r++) {
                for (let c = 0; c < this.gridSize - 1; c++) {
                    if (!this.lines.horizontal[r][c]) availableH.push({ r, c });
                }
            }

            for (let r = 0; r < this.gridSize - 1; r++) {
                for (let c = 0; c < this.gridSize; c++) {
                    if (!this.lines.vertical[r][c]) availableV.push({ r, c });
                }
            }

            const allAvailable = [...availableH.map(m => ({ ...m, type: 'h' })), ...availableV.map(m => ({ ...m, type: 'v' }))];

            if (allAvailable.length > 0) {
                const move = allAvailable[Math.floor(Math.random() * allAvailable.length)];
                if (move.type === 'h') {
                    this.lines.horizontal[move.r][move.c] = true;
                } else {
                    this.lines.vertical[move.r][move.c] = true;
                }
            }
        }

        // Check for completed boxes
        const boxesCompleted = this.checkCompletedBoxes('ai');
        this.aiScore += boxesCompleted;

        this.drawBoard();
        this.updateUI();

        if (boxesCompleted > 0) {
            // AI gets another turn
            setTimeout(() => this.aiMove(), 500);
        } else {
            this.isPlayerTurn = true;
            this.checkGameOver();
        }
    }

    checkGameOver() {
        const totalBoxes = (this.gridSize - 1) * (this.gridSize - 1);
        const filledBoxes = this.boxes.flat().filter(b => b !== null).length;

        if (filledBoxes === totalBoxes) {
            this.gameActive = false;
            let message = '';

            if (this.playerScore > this.aiScore) {
                message = `🎉 You Win ${this.playerScore}-${this.aiScore}!`;
            } else if (this.aiScore > this.playerScore) {
                message = `😞 AI Wins ${this.aiScore}-${this.playerScore}!`;
            } else {
                message = `🤝 Tie ${this.playerScore}-${this.aiScore}!`;
            }

            setTimeout(() => {
                alert(`Game Over!\n\n${message}`);
            }, 1000);
        }
    }

    updateUI() {
        document.getElementById('dabPlayerScore').textContent = this.playerScore;
        document.getElementById('dabAIScore').textContent = this.aiScore;
        document.getElementById('dabTurn').textContent = this.isPlayerTurn ? 'Player' : 'AI';
    }

    cleanup() {
        this.playerScore = 0;
        this.aiScore = 0;
    }
}
