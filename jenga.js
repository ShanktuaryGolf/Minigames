// Jenga game implementation
class JengaGame {
    constructor() {
        this.score = 0;
        this.shotCount = 0;
        this.maxShots = 30;
        this.canvas = null;
        this.ctx = null;
        this.tower = [];
        this.removedBlocks = 0;
        this.gameOver = false;

        // Game configuration
        this.BLOCK_WIDTH = 80;
        this.BLOCK_HEIGHT = 25;
        this.BLOCKS_PER_LAYER = 3;
        this.LAYERS = 18;
        this.BASE_X = 350;
        this.BASE_Y = 400;
    }

    init() {
        const gameContent = document.getElementById('gameContent');
        gameContent.innerHTML = `
            <div class="score-display">
                <div class="score-item">
                    <div class="label">Score</div>
                    <div class="value" id="jengaScore">0</div>
                </div>
                <div class="score-item">
                    <div class="label">Blocks Removed</div>
                    <div class="value" id="jengaBlocks">0</div>
                </div>
                <div class="score-item">
                    <div class="label">Tower Height</div>
                    <div class="value" id="jengaHeight">18</div>
                </div>
            </div>

            <div style="display: flex; justify-content: center; margin-top: 20px;">
                <canvas id="jengaCanvas" width="800" height="600" style="border-radius: 10px; background: #1a1a1a;"></canvas>
            </div>

            <div style="text-align: center; margin-top: 20px; opacity: 0.8;">
                <p>🎯 Gentle Tap: 30-60 mph to remove block safely</p>
                <p>📐 Aim: HLA selects left/middle/right block | VLA selects layer</p>
                <p>⚠️ Too Hard: Tower falls! | Too Soft: Block won't budge</p>
            </div>
        `;

        this.canvas = document.getElementById('jengaCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.buildTower();
        this.drawTower();
    }

    buildTower() {
        this.tower = [];
        for (let layer = 0; layer < this.LAYERS; layer++) {
            const isHorizontal = layer % 2 === 0;
            for (let i = 0; i < this.BLOCKS_PER_LAYER; i++) {
                this.tower.push({
                    layer: layer,
                    position: i,
                    isHorizontal: isHorizontal,
                    removed: false,
                    wobbling: false,
                    wobbleAmount: 0
                });
            }
        }
    }

    drawTower() {
        const ctx = this.ctx;
        const canvas = this.canvas;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background
        const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGradient.addColorStop(0, '#1a1a2e');
        bgGradient.addColorStop(1, '#0f0f1e');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw floor
        ctx.fillStyle = '#2a2a3e';
        ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

        // Draw blocks
        this.tower.forEach((block, index) => {
            if (block.removed) return;

            const y = this.BASE_Y - (block.layer * this.BLOCK_HEIGHT);
            let x;

            if (block.isHorizontal) {
                x = this.BASE_X + (block.position - 1) * this.BLOCK_WIDTH;
                this.drawBlock(x + block.wobbleAmount, y, this.BLOCK_WIDTH, this.BLOCK_HEIGHT, block.wobbling);
            } else {
                x = this.BASE_X;
                const offsetY = (block.position - 1) * (this.BLOCK_WIDTH);
                this.drawBlock(x + block.wobbleAmount, y - offsetY, this.BLOCK_HEIGHT, this.BLOCK_WIDTH, block.wobbling);
            }
        });

        // Draw stability indicator
        const stability = this.calculateStability();
        this.drawStabilityMeter(stability);
    }

    drawBlock(x, y, width, height, wobbling) {
        const ctx = this.ctx;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x + 3, y + 3, width, height);

        // Block
        const blockGradient = ctx.createLinearGradient(x, y, x + width, y);
        if (wobbling) {
            blockGradient.addColorStop(0, '#ef4444');
            blockGradient.addColorStop(0.5, '#f87171');
            blockGradient.addColorStop(1, '#ef4444');
        } else {
            blockGradient.addColorStop(0, '#d4a574');
            blockGradient.addColorStop(0.5, '#ddb892');
            blockGradient.addColorStop(1, '#d4a574');
        }

        ctx.fillStyle = blockGradient;
        ctx.fillRect(x, y, width, height);

        // Outline
        ctx.strokeStyle = wobbling ? '#dc2626' : '#8b7355';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // Wood grain texture
        ctx.strokeStyle = 'rgba(139, 115, 85, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(x + (i * width / 5), y);
            ctx.lineTo(x + (i * width / 5), y + height);
            ctx.stroke();
        }
    }

    drawStabilityMeter(stability) {
        const ctx = this.ctx;
        const x = 50;
        const y = 50;
        const width = 200;
        const height = 20;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, y, width, height);

        // Stability bar
        const fillWidth = (stability / 100) * width;
        const color = stability > 70 ? '#22c55e' : stability > 40 ? '#f59e0b' : '#ef4444';
        ctx.fillStyle = color;
        ctx.fillRect(x, y, fillWidth, height);

        // Border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // Label
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Stability: ${stability.toFixed(0)}%`, x, y - 5);
    }

    calculateStability() {
        // Calculate tower stability based on removed blocks
        const criticalLayers = this.tower.filter(b => !b.removed).reduce((acc, block) => {
            if (!acc[block.layer]) acc[block.layer] = 0;
            acc[block.layer]++;
            return acc;
        }, {});

        let stability = 100;
        Object.values(criticalLayers).forEach(count => {
            if (count < 3) {
                stability -= (3 - count) * 15;
            }
        });

        return Math.max(0, stability - (this.removedBlocks * 2));
    }

    handleShot(shotData) {
        if (this.gameOver || this.shotCount >= this.maxShots) {
            showShotFeedback(0, 'Game Over!');
            return;
        }

        this.shotCount++;

        const result = this.processShot(shotData);

        if (result.towerFell) {
            this.gameOver = true;
            this.drawTower();
            showShotFeedback(0, '💥 TOWER FELL!');
            setTimeout(() => {
                alert(`Tower Collapsed!\n\nFinal Score: ${this.score}\nBlocks Removed: ${this.removedBlocks}`);
            }, 2000);
            return;
        }

        if (result.removed) {
            this.score += result.points;
            this.removedBlocks++;
        }

        this.updateUI();
        this.drawTower();
        showShotFeedback(result.points, result.message);
    }

    processShot(shotData) {
        const speed = shotData.ball_speed || 0;
        const vla = shotData.vla || 0;
        const hla = shotData.hla || 0;

        // Check speed - must be gentle
        if (speed > 80) {
            // Too hard - tower falls
            return {
                removed: false,
                towerFell: true,
                points: 0,
                message: '💥 Too Hard! Tower Fell!'
            };
        }

        if (speed < 30) {
            return {
                removed: false,
                towerFell: false,
                points: 0,
                message: 'Too Soft! Try 30-60 mph'
            };
        }

        // Map VLA to layer (higher angle = higher layer)
        const targetLayer = Math.floor((vla / 45) * this.LAYERS);
        const clampedLayer = Math.max(0, Math.min(this.LAYERS - 1, targetLayer));

        // Map HLA to position (left/middle/right)
        let position;
        if (hla < -3) position = 0; // Left
        else if (hla > 3) position = 2; // Right
        else position = 1; // Middle

        // Find target block
        const targetBlock = this.tower.find(b =>
            b.layer === clampedLayer &&
            b.position === position &&
            !b.removed
        );

        if (!targetBlock) {
            return {
                removed: false,
                towerFell: false,
                points: 0,
                message: 'Block Already Removed!'
            };
        }

        // Check if it's safe to remove (not from bottom 3 layers, or if supported)
        if (clampedLayer < 3) {
            // Wobble tower
            this.wobbleTower();
            return {
                removed: false,
                towerFell: Math.random() > 0.6,
                points: 0,
                message: 'Too Risky! Near Bottom!'
            };
        }

        // Remove block
        targetBlock.removed = true;

        // Check stability
        const stability = this.calculateStability();
        if (stability < 30 && Math.random() > 0.5) {
            return {
                removed: true,
                towerFell: true,
                points: clampedLayer * 5,
                message: 'Block Removed but Tower Fell!'
            };
        }

        // Success
        const points = 10 + (clampedLayer * 2);
        return {
            removed: true,
            towerFell: false,
            points: points,
            message: `✓ Block Removed! Layer ${clampedLayer + 1}`
        };
    }

    wobbleTower() {
        // Make remaining blocks wobble
        this.tower.forEach(block => {
            if (!block.removed) {
                block.wobbling = true;
                block.wobbleAmount = (Math.random() - 0.5) * 10;
            }
        });

        setTimeout(() => {
            this.tower.forEach(block => {
                block.wobbling = false;
                block.wobbleAmount = 0;
            });
            this.drawTower();
        }, 500);
    }

    updateUI() {
        document.getElementById('jengaScore').textContent = this.score;
        document.getElementById('jengaBlocks').textContent = this.removedBlocks;
        const remainingLayers = new Set(this.tower.filter(b => !b.removed).map(b => b.layer)).size;
        document.getElementById('jengaHeight').textContent = remainingLayers;
    }

    cleanup() {
        this.score = 0;
        this.shotCount = 0;
        this.removedBlocks = 0;
        this.gameOver = false;
        this.tower = [];
    }
}
