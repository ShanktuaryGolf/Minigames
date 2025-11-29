// Connect 4 game implementation (vs AI)
class Connect4Game {
    constructor() {
        this.score = 0;
        this.wins = 0;
        this.losses = 0;
        this.ties = 0;
        this.canvas = null;
        this.ctx = null;
        this.board = [];
        this.isPlayerTurn = true;
        this.gameActive = true;

        // Config
        this.ROWS = 6;
        this.COLS = 7;
        this.CELL_SIZE = 70;
        this.OFFSET = 30;
        this.PLAYER_COLOR = '#3b82f6';
        this.AI_COLOR = '#ef4444';
    }

    init() {
        const gameContent = document.getElementById('gameContent');
        gameContent.innerHTML = `
            <div class="score-display">
                <div class="score-item">
                    <div class="label">Wins</div>
                    <div class="value" id="c4Wins">0</div>
                </div>
                <div class="score-item">
                    <div class="label">Losses</div>
                    <div class="value" id="c4Losses">0</div>
                </div>
                <div class="score-item">
                    <div class="label">Ties</div>
                    <div class="value" id="c4Ties">0</div>
                </div>
            </div>

            <div style="display: flex; justify-content: center; margin-top: 20px;">
                <canvas id="c4Canvas" width="550" height="500" style="border-radius: 10px; background: #1a1a1a;"></canvas>
            </div>

            <div id="c4Status" style="text-align: center; margin-top: 20px; font-size: 1.5em; font-weight: bold;">
                Your Turn (Blue)
            </div>

            <div style="text-align: center; margin-top: 10px; opacity: 0.8;">
                <p>🎯 Drop Disc: HLA selects column (-10° to +10°)</p>
                <p>🎮 Connect 4 in a row (horizontal, vertical, or diagonal) to win!</p>
            </div>
        `;

        this.canvas = document.getElementById('c4Canvas');
        this.ctx = this.canvas.getContext('2d');

        // Initialize empty board
        this.board = Array(this.ROWS).fill(null).map(() => Array(this.COLS).fill(null));
        this.isPlayerTurn = true;
        this.gameActive = true;

        this.drawBoard();
    }

    drawBoard() {
        const ctx = this.ctx;

        // Clear
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw board background
        const boardGradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        boardGradient.addColorStop(0, '#1e3a8a');
        boardGradient.addColorStop(1, '#1e40af');
        ctx.fillStyle = boardGradient;
        ctx.fillRect(
            this.OFFSET - 10,
            this.OFFSET - 10,
            this.COLS * this.CELL_SIZE + 20,
            this.ROWS * this.CELL_SIZE + 20
        );

        // Draw cells and discs
        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                const x = this.OFFSET + col * this.CELL_SIZE + this.CELL_SIZE / 2;
                const y = this.OFFSET + row * this.CELL_SIZE + this.CELL_SIZE / 2;

                // Draw cell hole
                ctx.beginPath();
                ctx.arc(x, y, this.CELL_SIZE / 2 - 8, 0, Math.PI * 2);
                ctx.fillStyle = '#0f172a';
                ctx.fill();

                // Draw disc if present
                if (this.board[row][col]) {
                    ctx.beginPath();
                    ctx.arc(x, y, this.CELL_SIZE / 2 - 10, 0, Math.PI * 2);
                    ctx.fillStyle = this.board[row][col] === 'player' ? this.PLAYER_COLOR : this.AI_COLOR;
                    ctx.fill();

                    // Add shine effect
                    ctx.beginPath();
                    ctx.arc(x - 8, y - 8, 8, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                    ctx.fill();
                }
            }
        }

        // Draw column indicators (for aiming)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        for (let col = 0; col < this.COLS; col++) {
            const x = this.OFFSET + col * this.CELL_SIZE + this.CELL_SIZE / 2;
            ctx.fillText((col + 1).toString(), x, 20);
        }
    }

    handleShot(shotData) {
        if (!this.gameActive || !this.isPlayerTurn) {
            showShotFeedback(0, 'Wait for AI!');
            return;
        }

        const col = this.shotToColumn(shotData);

        // Check if column is full
        if (this.board[0][col] !== null) {
            showShotFeedback(0, 'Column Full!');
            return;
        }

        // Drop disc
        const row = this.dropDisc(col, 'player');

        this.drawBoard();
        this.isPlayerTurn = false;

        // Check for win
        if (this.checkWin(row, col, 'player')) {
            this.endGame('player');
            return;
        }

        // Check for tie
        if (this.isBoardFull()) {
            this.endGame('tie');
            return;
        }

        // AI turn
        document.getElementById('c4Status').textContent = 'AI Thinking...';
        setTimeout(() => this.aiMove(), 600);
    }

    shotToColumn(shotData) {
        const hla = shotData.hla || 0;

        // Map HLA to column: -10 to 10 -> 0 to 6
        const col = Math.floor(((hla + 10) / 20) * this.COLS);
        return Math.max(0, Math.min(this.COLS - 1, col));
    }

    dropDisc(col, player) {
        // Find lowest empty row
        for (let row = this.ROWS - 1; row >= 0; row--) {
            if (this.board[row][col] === null) {
                this.board[row][col] = player;
                return row;
            }
        }
        return -1;
    }

    aiMove() {
        if (!this.gameActive) return;

        // AI strategy: Try to win, block player, then random
        let moveCol = -1;

        // Try to win
        for (let col = 0; col < this.COLS; col++) {
            if (this.board[0][col] === null) {
                const row = this.simulateMove(col, 'ai');
                if (row !== -1 && this.checkWin(row, col, 'ai', true)) {
                    moveCol = col;
                    break;
                }
                this.undoSimulateMove(row, col);
            }
        }

        // Block player
        if (moveCol === -1) {
            for (let col = 0; col < this.COLS; col++) {
                if (this.board[0][col] === null) {
                    const row = this.simulateMove(col, 'player');
                    if (row !== -1 && this.checkWin(row, col, 'player', true)) {
                        moveCol = col;
                        this.undoSimulateMove(row, col);
                        break;
                    }
                    this.undoSimulateMove(row, col);
                }
            }
        }

        // Random move
        if (moveCol === -1) {
            const available = [];
            for (let col = 0; col < this.COLS; col++) {
                if (this.board[0][col] === null) available.push(col);
            }
            if (available.length > 0) {
                moveCol = available[Math.floor(Math.random() * available.length)];
            }
        }

        if (moveCol !== -1) {
            const row = this.dropDisc(moveCol, 'ai');
            this.drawBoard();

            if (this.checkWin(row, moveCol, 'ai')) {
                this.endGame('ai');
                return;
            }

            if (this.isBoardFull()) {
                this.endGame('tie');
                return;
            }

            this.isPlayerTurn = true;
            document.getElementById('c4Status').textContent = 'Your Turn (Blue)';
        }
    }

    simulateMove(col, player) {
        for (let row = this.ROWS - 1; row >= 0; row--) {
            if (this.board[row][col] === null) {
                this.board[row][col] = player;
                return row;
            }
        }
        return -1;
    }

    undoSimulateMove(row, col) {
        if (row !== -1) {
            this.board[row][col] = null;
        }
    }

    checkWin(row, col, player, simulate = false) {
        const directions = [
            [0, 1],   // Horizontal
            [1, 0],   // Vertical
            [1, 1],   // Diagonal \
            [1, -1]   // Diagonal /
        ];

        for (let [dr, dc] of directions) {
            let count = 1;

            // Check positive direction
            for (let i = 1; i < 4; i++) {
                const r = row + dr * i;
                const c = col + dc * i;
                if (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS && this.board[r][c] === player) {
                    count++;
                } else {
                    break;
                }
            }

            // Check negative direction
            for (let i = 1; i < 4; i++) {
                const r = row - dr * i;
                const c = col - dc * i;
                if (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS && this.board[r][c] === player) {
                    count++;
                } else {
                    break;
                }
            }

            if (count >= 4) return true;
        }

        return false;
    }

    isBoardFull() {
        return this.board[0].every(cell => cell !== null);
    }

    endGame(result) {
        this.gameActive = false;
        let message = '';

        if (result === 'player') {
            this.wins++;
            this.score += 15;
            message = '🎉 You Win!';
            document.getElementById('c4Status').textContent = '🎉 You Win!';
        } else if (result === 'ai') {
            this.losses++;
            message = '😞 AI Wins!';
            document.getElementById('c4Status').textContent = '😞 AI Wins!';
        } else {
            this.ties++;
            this.score += 5;
            message = '🤝 Tie Game!';
            document.getElementById('c4Status').textContent = '🤝 Tie Game!';
        }

        this.updateUI();
        showShotFeedback(result === 'player' ? 15 : (result === 'tie' ? 5 : 0), message);

        setTimeout(() => this.init(), 3000);
    }

    updateUI() {
        document.getElementById('c4Wins').textContent = this.wins;
        document.getElementById('c4Losses').textContent = this.losses;
        document.getElementById('c4Ties').textContent = this.ties;
    }

    cleanup() {
        this.wins = 0;
        this.losses = 0;
        this.ties = 0;
        this.score = 0;
    }
}
