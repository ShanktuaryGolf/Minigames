// Match Cards (Memory) game implementation
class MatchCardsGame {
    constructor() {
        this.score = 0;
        this.moves = 0;
        this.matches = 0;
        this.canvas = null;
        this.ctx = null;
        this.cards = [];
        this.flippedCards = [];
        this.matchedCards = new Set();
        this.canFlip = true;

        // Config
        this.ROWS = 4;
        this.COLS = 4;
        this.CARD_WIDTH = 80;
        this.CARD_HEIGHT = 100;
        this.PADDING = 10;
        this.OFFSET = 50;

        // Card symbols
        this.SYMBOLS = ['🎯', '⛳', '🏌️', '🏆', '⭐', '🎪', '🎨', '🎭'];
    }

    init() {
        const gameContent = document.getElementById('gameContent');
        gameContent.innerHTML = `
            <div class="score-display">
                <div class="score-item">
                    <div class="label">Matches</div>
                    <div class="value" id="mcMatches">0 / 8</div>
                </div>
                <div class="score-item">
                    <div class="label">Moves</div>
                    <div class="value" id="mcMoves">0</div>
                </div>
                <div class="score-item">
                    <div class="label">Best</div>
                    <div class="value" id="mcBest">--</div>
                </div>
            </div>

            <div style="display: flex; justify-content: center; margin-top: 20px;">
                <canvas id="mcCanvas" width="450" height="550" style="border-radius: 10px; background: #1a1a1a;"></canvas>
            </div>

            <div style="text-align: center; margin-top: 20px; opacity: 0.8;">
                <p>🎯 Select Card: Use HLA/VLA to aim at cards</p>
                <p>🧠 Memory: Match pairs of identical symbols</p>
                <p>🏆 Goal: Match all 8 pairs in fewest moves</p>
            </div>
        `;

        this.canvas = document.getElementById('mcCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.initializeCards();
        this.score = 0;
        this.moves = 0;
        this.matches = 0;
        this.flippedCards = [];
        this.matchedCards = new Set();
        this.canFlip = true;

        this.drawBoard();
    }

    initializeCards() {
        // Create pairs
        const symbols = [...this.SYMBOLS, ...this.SYMBOLS];

        // Shuffle
        for (let i = symbols.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [symbols[i], symbols[j]] = [symbols[j], symbols[i]];
        }

        // Create card objects
        this.cards = [];
        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                const index = row * this.COLS + col;
                this.cards.push({
                    symbol: symbols[index],
                    row,
                    col,
                    index,
                    flipped: false
                });
            }
        }
    }

    drawBoard() {
        const ctx = this.ctx;

        // Clear
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw cards
        this.cards.forEach(card => {
            const x = this.OFFSET + card.col * (this.CARD_WIDTH + this.PADDING);
            const y = this.OFFSET + card.row * (this.CARD_HEIGHT + this.PADDING);

            const isFlipped = this.flippedCards.includes(card.index) || this.matchedCards.has(card.index);
            const isMatched = this.matchedCards.has(card.index);

            this.drawCard(x, y, card.symbol, isFlipped, isMatched);
        });
    }

    drawCard(x, y, symbol, flipped, matched) {
        const ctx = this.ctx;

        // Card shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x + 3, y + 3, this.CARD_WIDTH, this.CARD_HEIGHT);

        // Card background
        if (matched) {
            ctx.fillStyle = '#22c55e';
        } else if (flipped) {
            ctx.fillStyle = '#3b82f6';
        } else {
            const gradient = ctx.createLinearGradient(x, y, x + this.CARD_WIDTH, y + this.CARD_HEIGHT);
            gradient.addColorStop(0, '#6366f1');
            gradient.addColorStop(1, '#4f46e5');
            ctx.fillStyle = gradient;
        }

        ctx.fillRect(x, y, this.CARD_WIDTH, this.CARD_HEIGHT);

        // Card border
        ctx.strokeStyle = matched ? '#16a34a' : (flipped ? '#2563eb' : '#4338ca');
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, this.CARD_WIDTH, this.CARD_HEIGHT);

        // Card content
        if (flipped || matched) {
            // Show symbol
            ctx.font = '36px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(symbol, x + this.CARD_WIDTH / 2, y + this.CARD_HEIGHT / 2);
        } else {
            // Show back pattern
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(x + 15, y + 25 + i * 25);
                ctx.lineTo(x + this.CARD_WIDTH - 15, y + 25 + i * 25);
                ctx.stroke();
            }

            // Question mark
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', x + this.CARD_WIDTH / 2, y + this.CARD_HEIGHT / 2);
        }
    }

    handleShot(shotData) {
        if (!this.canFlip) {
            showShotFeedback(0, 'Wait...');
            return;
        }

        const cardIndex = this.shotToCardIndex(shotData);

        if (cardIndex === -1) {
            showShotFeedback(0, 'Invalid position!');
            return;
        }

        // Check if already flipped or matched
        if (this.flippedCards.includes(cardIndex) || this.matchedCards.has(cardIndex)) {
            showShotFeedback(0, 'Already revealed!');
            return;
        }

        // Flip the card
        this.flippedCards.push(cardIndex);
        this.drawBoard();

        // Check if we have 2 flipped cards
        if (this.flippedCards.length === 2) {
            this.moves++;
            this.canFlip = false;

            const [first, second] = this.flippedCards;
            const firstCard = this.cards[first];
            const secondCard = this.cards[second];

            if (firstCard.symbol === secondCard.symbol) {
                // Match!
                setTimeout(() => {
                    this.matchedCards.add(first);
                    this.matchedCards.add(second);
                    this.matches++;
                    this.score += 10;
                    this.flippedCards = [];
                    this.canFlip = true;

                    this.drawBoard();
                    this.updateUI();

                    showShotFeedback(10, '✨ Match!');
                    this.checkGameOver();
                }, 500);
            } else {
                // No match
                setTimeout(() => {
                    this.flippedCards = [];
                    this.canFlip = true;
                    this.drawBoard();
                    showShotFeedback(0, 'No match');
                }, 1000);
            }

            this.updateUI();
        }
    }

    shotToCardIndex(shotData) {
        const hla = shotData.hla || 0;
        const vla = shotData.vla || 0;

        // Map to grid
        const col = Math.floor(((hla + 10) / 20) * this.COLS);
        const row = Math.floor(((vla - 5) / 20) * this.ROWS);

        const clampedCol = Math.max(0, Math.min(this.COLS - 1, col));
        const clampedRow = Math.max(0, Math.min(this.ROWS - 1, row));

        return clampedRow * this.COLS + clampedCol;
    }

    checkGameOver() {
        if (this.matches === 8) {
            const best = localStorage.getItem('matchCardsBest');
            const newBest = !best || this.moves < parseInt(best);

            if (newBest) {
                localStorage.setItem('matchCardsBest', this.moves.toString());
                document.getElementById('mcBest').textContent = this.moves;
            }

            setTimeout(() => {
                const message = newBest ?
                    `🎉 NEW RECORD!\n\nCompleted in ${this.moves} moves!` :
                    `Game Complete!\n\nMoves: ${this.moves}\nBest: ${best}`;
                alert(message);
            }, 1000);
        }
    }

    updateUI() {
        document.getElementById('mcMatches').textContent = `${this.matches} / 8`;
        document.getElementById('mcMoves').textContent = this.moves;

        const best = localStorage.getItem('matchCardsBest');
        document.getElementById('mcBest').textContent = best || '--';
    }

    cleanup() {
        this.score = 0;
        this.moves = 0;
        this.matches = 0;
    }
}
