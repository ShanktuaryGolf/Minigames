// Tic-Tac-Toe game implementation (vs AI)
class TicTacToeGame {
    constructor() {
        this.score = 0;
        this.wins = 0;
        this.losses = 0;
        this.ties = 0;
        this.canvas = null;
        this.ctx = null;
        this.board = Array(9).fill(null);
        this.isPlayerTurn = true;
        this.gameActive = true;
        this.playerSymbol = 'X';
        this.aiSymbol = 'O';

        // Game configuration
        this.GRID_SIZE = 3;
        this.CELL_SIZE = 120;
    }

    init() {
        const gameContent = document.getElementById('gameContent');
        gameContent.innerHTML = `
            <div class="score-display">
                <div class="score-item">
                    <div class="label">Wins</div>
                    <div class="value" id="tttWins">0</div>
                </div>
                <div class="score-item">
                    <div class="label">Losses</div>
                    <div class="value" id="tttLosses">0</div>
                </div>
                <div class="score-item">
                    <div class="label">Ties</div>
                    <div class="value" id="tttTies">0</div>
                </div>
            </div>

            <div style="display: flex; justify-content: center; margin-top: 20px;">
                <canvas id="tttCanvas" width="400" height="400" style="border-radius: 10px; background: #1a1a1a;"></canvas>
            </div>

            <div id="gameStatus" style="text-align: center; margin-top: 20px; font-size: 1.5em; font-weight: bold;">
                Your Turn (X)
            </div>

            <div style="text-align: center; margin-top: 10px; opacity: 0.8;">
                <p>🎯 Aim: Use HLA and VLA to select grid position</p>
                <p>📐 HLA: -10° to +10° (left to right) | VLA: 5° to 25° (bottom to top)</p>
            </div>
        `;

        this.canvas = document.getElementById('tttCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.board = Array(9).fill(null);
        this.isPlayerTurn = true;
        this.gameActive = true;
        this.drawBoard();
    }

    drawBoard() {
        const ctx = this.ctx;
        const canvas = this.canvas;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw grid lines
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 4;

        // Vertical lines
        for (let i = 1; i < this.GRID_SIZE; i++) {
            ctx.beginPath();
            ctx.moveTo(i * this.CELL_SIZE + 20, 20);
            ctx.lineTo(i * this.CELL_SIZE + 20, canvas.height - 20);
            ctx.stroke();
        }

        // Horizontal lines
        for (let i = 1; i < this.GRID_SIZE; i++) {
            ctx.beginPath();
            ctx.moveTo(20, i * this.CELL_SIZE + 20);
            ctx.lineTo(canvas.width - 20, i * this.CELL_SIZE + 20);
            ctx.stroke();
        }

        // Draw symbols
        for (let i = 0; i < 9; i++) {
            if (this.board[i]) {
                const row = Math.floor(i / 3);
                const col = i % 3;
                const x = col * this.CELL_SIZE + 20 + this.CELL_SIZE / 2;
                const y = row * this.CELL_SIZE + 20 + this.CELL_SIZE / 2;

                if (this.board[i] === 'X') {
                    this.drawX(x, y);
                } else {
                    this.drawO(x, y);
                }
            }
        }

        // Draw winning line if game over
        const winner = this.checkWinner();
        if (winner) {
            this.drawWinningLine(winner.line);
        }
    }

    drawX(x, y) {
        const ctx = this.ctx;
        const size = 35;

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(x - size, y - size);
        ctx.lineTo(x + size, y + size);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + size, y - size);
        ctx.lineTo(x - size, y + size);
        ctx.stroke();
    }

    drawO(x, y) {
        const ctx = this.ctx;
        const radius = 35;

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
    }

    drawWinningLine(line) {
        const ctx = this.ctx;
        const [a, b, c] = line;

        const getCenter = (index) => {
            const row = Math.floor(index / 3);
            const col = index % 3;
            return {
                x: col * this.CELL_SIZE + 20 + this.CELL_SIZE / 2,
                y: row * this.CELL_SIZE + 20 + this.CELL_SIZE / 2
            };
        };

        const start = getCenter(a);
        const end = getCenter(c);

        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
    }

    handleShot(shotData) {
        if (!this.gameActive || !this.isPlayerTurn) {
            showShotFeedback(0, 'Wait for AI turn!');
            return;
        }

        // Map shot to grid position
        const position = this.shotToGridPosition(shotData);

        if (this.board[position] !== null) {
            showShotFeedback(0, 'Cell Taken! Try Again');
            return;
        }

        // Player move
        this.board[position] = this.playerSymbol;
        this.drawBoard();
        this.isPlayerTurn = false;

        // Check for win
        const result = this.checkWinner();
        if (result) {
            this.endGame(result.winner);
            return;
        }

        // Check for tie
        if (this.board.every(cell => cell !== null)) {
            this.endGame('tie');
            return;
        }

        // AI turn
        document.getElementById('gameStatus').textContent = 'AI Thinking...';
        setTimeout(() => {
            this.aiMove();
        }, 500);
    }

    shotToGridPosition(shotData) {
        const hla = shotData.hla || 0;
        const vla = shotData.vla || 0;

        // Map HLA to column: -10 to 10 -> 0 to 2
        const col = Math.floor(((hla + 10) / 20) * 3);
        const clampedCol = Math.max(0, Math.min(2, col));

        // Map VLA to row: 5 to 25 -> 2 to 0 (inverted)
        const row = 2 - Math.floor(((vla - 5) / 20) * 3);
        const clampedRow = Math.max(0, Math.min(2, row));

        return clampedRow * 3 + clampedCol;
    }

    aiMove() {
        // Simple AI: minimax or random
        const availableMoves = this.board.map((cell, index) => cell === null ? index : null).filter(i => i !== null);

        if (availableMoves.length === 0) return;

        // Try to win
        for (let move of availableMoves) {
            this.board[move] = this.aiSymbol;
            if (this.checkWinner()?.winner === this.aiSymbol) {
                this.drawBoard();
                this.endGame(this.aiSymbol);
                return;
            }
            this.board[move] = null;
        }

        // Block player win
        for (let move of availableMoves) {
            this.board[move] = this.playerSymbol;
            if (this.checkWinner()?.winner === this.playerSymbol) {
                this.board[move] = this.aiSymbol;
                this.drawBoard();
                this.checkGameState();
                return;
            }
            this.board[move] = null;
        }

        // Take center if available
        if (this.board[4] === null) {
            this.board[4] = this.aiSymbol;
        } else {
            // Random move
            const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
            this.board[randomMove] = this.aiSymbol;
        }

        this.drawBoard();
        this.checkGameState();
    }

    checkGameState() {
        const result = this.checkWinner();
        if (result) {
            this.endGame(result.winner);
            return;
        }

        if (this.board.every(cell => cell !== null)) {
            this.endGame('tie');
            return;
        }

        this.isPlayerTurn = true;
        document.getElementById('gameStatus').textContent = 'Your Turn (X)';
    }

    checkWinner() {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6]             // Diagonals
        ];

        for (let pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
                return { winner: this.board[a], line: pattern };
            }
        }

        return null;
    }

    endGame(result) {
        this.gameActive = false;
        let message = '';

        if (result === this.playerSymbol) {
            this.wins++;
            this.score += 10;
            message = '🎉 You Win!';
            document.getElementById('gameStatus').textContent = '🎉 You Win!';
        } else if (result === this.aiSymbol) {
            this.losses++;
            message = '😞 AI Wins!';
            document.getElementById('gameStatus').textContent = '😞 AI Wins!';
        } else {
            this.ties++;
            this.score += 3;
            message = '🤝 Tie Game!';
            document.getElementById('gameStatus').textContent = '🤝 Tie Game!';
        }

        this.updateUI();
        showShotFeedback(result === this.playerSymbol ? 10 : (result === 'tie' ? 3 : 0), message);

        // Auto restart after 3 seconds
        setTimeout(() => {
            this.init();
        }, 3000);
    }

    updateUI() {
        document.getElementById('tttWins').textContent = this.wins;
        document.getElementById('tttLosses').textContent = this.losses;
        document.getElementById('tttTies').textContent = this.ties;
    }

    cleanup() {
        this.wins = 0;
        this.losses = 0;
        this.ties = 0;
        this.score = 0;
    }
}
