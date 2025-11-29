// Othello/Reversi game implementation (vs AI)
class OthelloGame {
    constructor() {
        this.score = 0;
        this.playerScore = 0;
        this.aiScore = 0;
        this.canvas = null;
        this.ctx = null;
        this.board = [];
        this.isPlayerTurn = true;
        this.gameActive = true;

        // Config
        this.SIZE = 8;
        this.CELL_SIZE = 60;
        this.OFFSET = 20;
        this.PLAYER_COLOR = '#000000';  // Black
        this.AI_COLOR = '#ffffff';      // White
    }

    init() {
        const gameContent = document.getElementById('gameContent');
        gameContent.innerHTML = `
            <div class="score-display">
                <div class="score-item">
                    <div class="label">You (Black)</div>
                    <div class="value" id="othelloPlayer">2</div>
                </div>
                <div class="score-item">
                    <div class="label">AI (White)</div>
                    <div class="value" id="othelloAI">2</div>
                </div>
                <div class="score-item">
                    <div class="label">Turn</div>
                    <div class="value" id="othelloTurn">Player</div>
                </div>
            </div>

            <div style="display: flex; justify-content: center; margin-top: 20px;">
                <canvas id="othelloCanvas" width="520" height="520" style="border-radius: 10px; background: #1a1a1a;"></canvas>
            </div>

            <div style="text-align: center; margin-top: 20px; opacity: 0.8;">
                <p>🎯 Place Disc: HLA/VLA selects board position</p>
                <p>🔄 Flip opponent discs by surrounding them</p>
                <p>🏆 Most discs at end wins!</p>
            </div>
        `;

        this.canvas = document.getElementById('othelloCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Initialize board
        this.board = Array(this.SIZE).fill(null).map(() => Array(this.SIZE).fill(null));

        // Starting position
        const mid = this.SIZE / 2;
        this.board[mid - 1][mid - 1] = 'white';
        this.board[mid][mid] = 'white';
        this.board[mid - 1][mid] = 'black';
        this.board[mid][mid - 1] = 'black';

        this.isPlayerTurn = true;
        this.gameActive = true;

        this.drawBoard();
        this.updateScore();
    }

    drawBoard() {
        const ctx = this.ctx;

        // Clear
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw board
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(this.OFFSET, this.OFFSET, this.SIZE * this.CELL_SIZE, this.SIZE * this.CELL_SIZE);

        // Draw grid
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 2;

        for (let i = 0; i <= this.SIZE; i++) {
            // Vertical lines
            ctx.beginPath();
            ctx.moveTo(this.OFFSET + i * this.CELL_SIZE, this.OFFSET);
            ctx.lineTo(this.OFFSET + i * this.CELL_SIZE, this.OFFSET + this.SIZE * this.CELL_SIZE);
            ctx.stroke();

            // Horizontal lines
            ctx.beginPath();
            ctx.moveTo(this.OFFSET, this.OFFSET + i * this.CELL_SIZE);
            ctx.lineTo(this.OFFSET + this.SIZE * this.CELL_SIZE, this.OFFSET + i * this.CELL_SIZE);
            ctx.stroke();
        }

        // Draw discs
        for (let row = 0; row < this.SIZE; row++) {
            for (let col = 0; col < this.SIZE; col++) {
                if (this.board[row][col]) {
                    this.drawDisc(row, col, this.board[row][col]);
                }
            }
        }

        // Show valid moves for player
        if (this.isPlayerTurn && this.gameActive) {
            const validMoves = this.getValidMoves('black');
            validMoves.forEach(([row, col]) => {
                const x = this.OFFSET + col * this.CELL_SIZE + this.CELL_SIZE / 2;
                const y = this.OFFSET + row * this.CELL_SIZE + this.CELL_SIZE / 2;

                ctx.beginPath();
                ctx.arc(x, y, 8, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fill();
            });
        }
    }

    drawDisc(row, col, color) {
        const ctx = this.ctx;
        const x = this.OFFSET + col * this.CELL_SIZE + this.CELL_SIZE / 2;
        const y = this.OFFSET + row * this.CELL_SIZE + this.CELL_SIZE / 2;
        const radius = this.CELL_SIZE / 2 - 5;

        // Shadow
        ctx.beginPath();
        ctx.arc(x + 2, y + 2, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();

        // Disc
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color === 'black' ? '#1f2937' : '#f3f4f6';
        ctx.fill();

        // Border
        ctx.strokeStyle = color === 'black' ? '#000000' : '#e5e7eb';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Shine
        ctx.beginPath();
        ctx.arc(x - 8, y - 8, 6, 0, Math.PI * 2);
        ctx.fillStyle = color === 'black' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
    }

    handleShot(shotData) {
        if (!this.gameActive || !this.isPlayerTurn) {
            showShotFeedback(0, 'Wait for AI!');
            return;
        }

        const [row, col] = this.shotToPosition(shotData);
        const validMoves = this.getValidMoves('black');

        // Check if valid move
        if (!validMoves.some(([r, c]) => r === row && c === col)) {
            showShotFeedback(0, 'Invalid move!');
            return;
        }

        // Make move
        this.makeMove(row, col, 'black');
        this.drawBoard();
        this.updateScore();

        this.isPlayerTurn = false;

        // Check if AI can move
        if (this.getValidMoves('white').length > 0) {
            document.getElementById('othelloTurn').textContent = 'AI';
            setTimeout(() => this.aiMove(), 800);
        } else {
            // AI has no moves, player goes again
            this.isPlayerTurn = true;
            showShotFeedback(0, 'AI has no moves!');

            if (this.getValidMoves('black').length === 0) {
                this.endGame();
            }
        }
    }

    shotToPosition(shotData) {
        const hla = shotData.hla || 0;
        const vla = shotData.vla || 0;

        const col = Math.floor(((hla + 10) / 20) * this.SIZE);
        const row = Math.floor(((vla - 5) / 20) * this.SIZE);

        return [
            Math.max(0, Math.min(this.SIZE - 1, row)),
            Math.max(0, Math.min(this.SIZE - 1, col))
        ];
    }

    getValidMoves(player) {
        const validMoves = [];
        const opponent = player === 'black' ? 'white' : 'black';
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (let row = 0; row < this.SIZE; row++) {
            for (let col = 0; col < this.SIZE; col++) {
                if (this.board[row][col] !== null) continue;

                // Check each direction
                for (let [dr, dc] of directions) {
                    let r = row + dr;
                    let c = col + dc;
                    let hasOpponent = false;

                    while (r >= 0 && r < this.SIZE && c >= 0 && c < this.SIZE) {
                        if (this.board[r][c] === opponent) {
                            hasOpponent = true;
                        } else if (this.board[r][c] === player && hasOpponent) {
                            validMoves.push([row, col]);
                            break;
                        } else {
                            break;
                        }
                        r += dr;
                        c += dc;
                    }
                    if (validMoves.some(([mr, mc]) => mr === row && mc === col)) break;
                }
            }
        }

        return validMoves;
    }

    makeMove(row, col, player) {
        this.board[row][col] = player;
        const opponent = player === 'black' ? 'white' : 'black';
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (let [dr, dc] of directions) {
            const toFlip = [];
            let r = row + dr;
            let c = col + dc;

            while (r >= 0 && r < this.SIZE && c >= 0 && c < this.SIZE) {
                if (this.board[r][c] === opponent) {
                    toFlip.push([r, c]);
                } else if (this.board[r][c] === player && toFlip.length > 0) {
                    toFlip.forEach(([fr, fc]) => {
                        this.board[fr][fc] = player;
                    });
                    break;
                } else {
                    break;
                }
                r += dr;
                c += dc;
            }
        }
    }

    aiMove() {
        if (!this.gameActive) return;

        const validMoves = this.getValidMoves('white');

        if (validMoves.length === 0) {
            this.isPlayerTurn = true;
            document.getElementById('othelloTurn').textContent = 'Player';
            return;
        }

        // Simple AI: prefer corners, edges, then maximize flips
        let bestMove = null;
        let bestScore = -1;

        for (let [row, col] of validMoves) {
            let score = 0;

            // Corner bonus
            if ((row === 0 || row === this.SIZE - 1) && (col === 0 || col === this.SIZE - 1)) {
                score += 100;
            }
            // Edge bonus
            else if (row === 0 || row === this.SIZE - 1 || col === 0 || col === this.SIZE - 1) {
                score += 10;
            }

            // Count flips
            const tempBoard = JSON.parse(JSON.stringify(this.board));
            this.board[row][col] = 'white';
            const flips = this.countFlips(row, col, 'white');
            this.board = tempBoard;
            score += flips;

            if (score > bestScore) {
                bestScore = score;
                bestMove = [row, col];
            }
        }

        if (bestMove) {
            this.makeMove(bestMove[0], bestMove[1], 'white');
            this.drawBoard();
            this.updateScore();
        }

        this.isPlayerTurn = true;
        document.getElementById('othelloTurn').textContent = 'Player';

        // Check for end game
        if (this.getValidMoves('black').length === 0 && this.getValidMoves('white').length === 0) {
            this.endGame();
        }
    }

    countFlips(row, col, player) {
        let count = 0;
        const opponent = player === 'black' ? 'white' : 'black';
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (let [dr, dc] of directions) {
            let r = row + dr;
            let c = col + dc;
            let tempCount = 0;

            while (r >= 0 && r < this.SIZE && c >= 0 && c < this.SIZE) {
                if (this.board[r][c] === opponent) {
                    tempCount++;
                } else if (this.board[r][c] === player) {
                    count += tempCount;
                    break;
                } else {
                    break;
                }
                r += dr;
                c += dc;
            }
        }
        return count;
    }

    updateScore() {
        let black = 0;
        let white = 0;

        for (let row = 0; row < this.SIZE; row++) {
            for (let col = 0; col < this.SIZE; col++) {
                if (this.board[row][col] === 'black') black++;
                if (this.board[row][col] === 'white') white++;
            }
        }

        this.playerScore = black;
        this.aiScore = white;

        document.getElementById('othelloPlayer').textContent = black;
        document.getElementById('othelloAI').textContent = white;
    }

    endGame() {
        this.gameActive = false;
        let message = '';

        if (this.playerScore > this.aiScore) {
            message = `🎉 You Win ${this.playerScore}-${this.aiScore}!`;
            this.score += 20;
        } else if (this.aiScore > this.playerScore) {
            message = `😞 AI Wins ${this.aiScore}-${this.playerScore}!`;
        } else {
            message = `🤝 Tie ${this.playerScore}-${this.aiScore}!`;
            this.score += 10;
        }

        setTimeout(() => {
            alert(`Game Over!\n\n${message}`);
        }, 1000);
    }

    cleanup() {
        this.score = 0;
        this.playerScore = 0;
        this.aiScore = 0;
    }
}
