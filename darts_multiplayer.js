// Enhanced Darts game with multiplayer and multiple game modes
class DartsGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;

        // Game state
        this.gameMode = null;
        this.players = [];
        this.currentPlayerIndex = 0;
        this.gameActive = false;

        // Dartboard configuration
        this.DARTBOARD_RADIUS = 200;
        this.BULLSEYE_RADIUS = 15;
        this.BULLS_RING_RADIUS = 40;
        this.TRIPLE_INNER = 100;
        this.TRIPLE_OUTER = 110;
        this.DOUBLE_INNER = 180;
        this.DOUBLE_OUTER = 200;
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

        this.PLAYER_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    }

    init() {
        this.showSetupScreen();
    }

    showSetupScreen() {
        const gameContent = document.getElementById('gameContent');
        gameContent.innerHTML = `
            <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
                <h2 style="text-align: center; margin-bottom: 30px;">🎯 Darts Setup</h2>

                <div style="background: rgba(0,0,0,0.3); padding: 30px; border-radius: 15px; margin-bottom: 20px;">
                    <h3 style="margin-bottom: 15px;">Number of Players</h3>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        ${[1,2,3,4,5,6].map(n => `
                            <button onclick="currentGame.setPlayerCount(${n})"
                                    style="flex: 1; min-width: 80px; padding: 15px; font-size: 1.2em;
                                           background: rgba(59, 130, 246, 0.3); border: 2px solid #3b82f6;
                                           color: white; border-radius: 8px; cursor: pointer;">
                                ${n} Player${n > 1 ? 's' : ''}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div id="playerNamesSection" style="display: none; background: rgba(0,0,0,0.3); padding: 30px; border-radius: 15px; margin-bottom: 20px;">
                    <h3 style="margin-bottom: 15px;">Player Names</h3>
                    <div id="playerNameInputs"></div>
                </div>

                <div id="gameModeSection" style="display: none; background: rgba(0,0,0,0.3); padding: 30px; border-radius: 15px;">
                    <h3 style="margin-bottom: 15px;">Game Mode</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px;">
                        <button onclick="currentGame.startGameMode('practice')"
                                style="padding: 20px; background: rgba(59, 130, 246, 0.3); border: 2px solid #3b82f6;
                                       color: white; border-radius: 8px; cursor: pointer;">
                            <div style="font-size: 2em; margin-bottom: 5px;">🎯</div>
                            <div style="font-weight: bold;">Practice</div>
                            <div style="font-size: 0.9em; opacity: 0.8;">Just throw darts</div>
                        </button>

                        <button onclick="currentGame.startGameMode('301')"
                                style="padding: 20px; background: rgba(239, 68, 68, 0.3); border: 2px solid #ef4444;
                                       color: white; border-radius: 8px; cursor: pointer;">
                            <div style="font-size: 2em; margin-bottom: 5px;">3️⃣</div>
                            <div style="font-weight: bold;">301</div>
                            <div style="font-size: 0.9em; opacity: 0.8;">Race to zero</div>
                        </button>

                        <button onclick="currentGame.startGameMode('501')"
                                style="padding: 20px; background: rgba(16, 185, 129, 0.3); border: 2px solid #10b981;
                                       color: white; border-radius: 8px; cursor: pointer;">
                            <div style="font-size: 2em; margin-bottom: 5px;">5️⃣</div>
                            <div style="font-weight: bold;">501</div>
                            <div style="font-size: 0.9em; opacity: 0.8;">Race to zero</div>
                        </button>

                        <button onclick="currentGame.startGameMode('cricket')"
                                style="padding: 20px; background: rgba(245, 158, 11, 0.3); border: 2px solid #f59e0b;
                                       color: white; border-radius: 8px; cursor: pointer;">
                            <div style="font-size: 2em; margin-bottom: 5px;">🦗</div>
                            <div style="font-weight: bold;">Cricket</div>
                            <div style="font-size: 0.9em; opacity: 0.8;">Close the numbers</div>
                        </button>

                        <button onclick="currentGame.startGameMode('killer')"
                                style="padding: 20px; background: rgba(139, 92, 246, 0.3); border: 2px solid #8b5cf6;
                                       color: white; border-radius: 8px; cursor: pointer;">
                            <div style="font-size: 2em; margin-bottom: 5px;">💀</div>
                            <div style="font-weight: bold;">Killer</div>
                            <div style="font-size: 0.9em; opacity: 0.8;">Eliminate opponents</div>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    setPlayerCount(count) {
        // Save current player data before resetting
        const oldPlayers = [...this.players];
        this.players = [];

        for (let i = 0; i < count; i++) {
            // Try to preserve existing player data if available
            if (oldPlayers[i]) {
                this.players.push({
                    name: oldPlayers[i].name,
                    color: oldPlayers[i].color,
                    score: 0,
                    dartsThrown: [],
                    powerMultiplier: oldPlayers[i].powerMultiplier || 1.0
                });
            } else {
                // New player - use defaults (avoid duplicate colors)
                const usedColors = this.players.map(p => p.color);
                const availableColor = this.PLAYER_COLORS.find(c => !usedColors.includes(c)) || this.PLAYER_COLORS[i];

                this.players.push({
                    name: `Player ${i + 1}`,
                    color: availableColor,
                    score: 0,
                    dartsThrown: [],
                    powerMultiplier: 1.0  // Default 1.0 = no boost
                });
            }
        }

        this.renderPlayerInputs();
    }

    renderPlayerInputs() {
        // Show player name inputs
        const namesSection = document.getElementById('playerNamesSection');
        const inputsContainer = document.getElementById('playerNameInputs');

        inputsContainer.innerHTML = this.players.map((p, i) => `
            <div style="margin-bottom: 25px; padding: 20px; background: rgba(0,0,0,0.2); border-radius: 10px; border-left: 4px solid ${p.color};">
                <label style="display: block; margin-bottom: 8px; font-weight: bold; color: ${p.color};">
                    Player ${i + 1}
                </label>
                <input type="text"
                       id="playerName${i}"
                       value="${p.name}"
                       placeholder="Enter name"
                       style="width: 100%; padding: 12px; font-size: 1em; margin-bottom: 12px;
                              background: rgba(0,0,0,0.3); border: 2px solid ${p.color};
                              color: white; border-radius: 8px;">

                <div style="margin-bottom: 5px; font-size: 0.9em; opacity: 0.8;">Choose Color:</div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 15px;">
                    ${this.PLAYER_COLORS.map((color, colorIndex) => `
                        <button onclick="currentGame.selectPlayerColor(${i}, '${color}')"
                                id="colorBtn${i}_${colorIndex}"
                                style="width: 40px; height: 40px; border-radius: 8px;
                                       background: ${color}; border: 3px solid ${p.color === color ? 'white' : 'rgba(255,255,255,0.3)'};
                                       cursor: pointer; transition: all 0.2s ease;
                                       ${p.color === color ? 'transform: scale(1.1); box-shadow: 0 0 10px ' + color + ';' : ''}">
                        </button>
                    `).join('')}
                </div>

                <div style="background: rgba(139, 92, 246, 0.2); padding: 12px; border-radius: 8px; border: 1px solid rgba(139, 92, 246, 0.4);">
                    <label style="display: block; margin-bottom: 8px; font-size: 0.9em; opacity: 0.9;">
                        👶 Power Boost (for kids/beginners):
                    </label>
                    <select id="powerMultiplier${i}"
                            onchange="currentGame.setPlayerPowerMultiplier(${i}, parseFloat(this.value))"
                            style="width: 100%; padding: 8px; font-size: 0.95em;
                                   background: rgba(0,0,0,0.3); border: 2px solid rgba(139, 92, 246, 0.6);
                                   color: white; border-radius: 6px; cursor: pointer;">
                        <option value="1.0" ${p.powerMultiplier === 1.0 ? 'selected' : ''}>None (1.0x)</option>
                        <option value="2.0" ${p.powerMultiplier === 2.0 ? 'selected' : ''}>2x Boost</option>
                        <option value="3.0" ${p.powerMultiplier === 3.0 ? 'selected' : ''}>3x Boost</option>
                        <option value="4.0" ${p.powerMultiplier === 4.0 ? 'selected' : ''}>4x Boost</option>
                        <option value="5.0" ${p.powerMultiplier === 5.0 ? 'selected' : ''}>5x Boost</option>
                    </select>
                    <div style="font-size: 0.75em; opacity: 0.7; margin-top: 5px; line-height: 1.3;">
                        Multiplies low-speed shots (< 40 mph) to help compete with adults
                    </div>
                </div>
            </div>
        `).join('');

        inputsContainer.innerHTML += `
            <button onclick="currentGame.confirmPlayerNames()"
                    style="width: 100%; padding: 15px; margin-top: 10px; font-size: 1.1em; font-weight: bold;
                           background: rgba(34, 197, 94, 0.3); border: 2px solid #22c55e;
                           color: white; border-radius: 8px; cursor: pointer;">
                Continue to Game Mode Selection
            </button>
        `;

        namesSection.style.display = 'block';
    }

    setPlayerPowerMultiplier(playerIndex, multiplier) {
        if (this.players[playerIndex]) {
            this.players[playerIndex].powerMultiplier = multiplier;
            console.log(`Player ${playerIndex + 1} power multiplier set to ${multiplier}x`);
        }
    }

    selectPlayerColor(playerIndex, color) {
        // Check if color is already taken by another player
        const colorTaken = this.players.some((p, i) => i !== playerIndex && p.color === color);

        if (colorTaken) {
            alert('This color is already taken by another player!');
            return;
        }

        // Save current names before updating
        this.players.forEach((p, i) => {
            const input = document.getElementById(`playerName${i}`);
            if (input) {
                p.name = input.value.trim() || p.name;
            }
        });

        // Update player color
        this.players[playerIndex].color = color;

        // Re-render with updated colors
        this.renderPlayerInputs();
    }

    confirmPlayerNames() {
        // Update player names from inputs
        this.players.forEach((p, i) => {
            const input = document.getElementById(`playerName${i}`);
            if (input && input.value.trim()) {
                p.name = input.value.trim();
            }
        });

        // Show game mode selection
        document.getElementById('gameModeSection').style.display = 'block';
        document.getElementById('gameModeSection').scrollIntoView({ behavior: 'smooth' });
    }

    startGameMode(mode) {
        this.gameMode = mode;
        this.currentPlayerIndex = 0;
        this.gameActive = true;

        // Initialize game-specific data
        switch(mode) {
            case 'practice':
                this.initPracticeMode();
                break;
            case '301':
                this.init301Mode();
                break;
            case '501':
                this.init501Mode();
                break;
            case 'cricket':
                this.initCricketMode();
                break;
            case 'killer':
                this.initKillerMode();
                break;
        }

        this.renderGame();
    }

    initPracticeMode() {
        this.players.forEach(p => {
            p.score = 0;
            p.dartsThrown = [];
            p.roundsComplete = 0;
        });
    }

    init301Mode() {
        this.players.forEach(p => {
            p.score = 301;
            p.dartsThrown = [];
            p.dartsInRound = 0;
        });
    }

    init501Mode() {
        this.players.forEach(p => {
            p.score = 501;
            p.dartsThrown = [];
            p.dartsInRound = 0;
        });
    }

    initCricketMode() {
        const cricketNumbers = [20, 19, 18, 17, 16, 15, 25]; // 25 is bull
        this.players.forEach(p => {
            p.cricketMarks = {};
            cricketNumbers.forEach(n => p.cricketMarks[n] = 0);
            p.score = 0;
            p.dartsThrown = [];
        });
    }

    initKillerMode() {
        this.players.forEach(p => {
            p.lives = 3;
            p.killerNumber = null;
            p.isKiller = false;
            p.dartsThrown = [];
        });
    }

    renderGame() {
        const gameContent = document.getElementById('gameContent');

        gameContent.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <canvas id="dartboard" width="600" height="600"
                        style="border-radius: 10px; background: #1a1a1a; display: inline-block; max-width: 100%;"></canvas>
            </div>

            <div id="gameInstructions" style="text-align: center; margin-bottom: 20px; font-size: 1.2em;"></div>
        `;

        this.canvas = document.getElementById('dartboard');
        this.ctx = this.canvas.getContext('2d');

        // Update dartboard radius for larger canvas
        this.DARTBOARD_RADIUS = 240;
        this.BULLSEYE_RADIUS = 18;
        this.BULLS_RING_RADIUS = 48;
        this.TRIPLE_INNER = 120;
        this.TRIPLE_OUTER = 132;
        this.DOUBLE_INNER = 216;
        this.DOUBLE_OUTER = 240;

        // Add scoreboard panel to data-panels
        this.createScoreboardPanel();

        this.updateScoreboard();
        this.updateInstructions();
        this.drawDartboard();
    }

    createScoreboardPanel() {
        const dataPanels = document.querySelector('.data-panels');

        // Create scoreboard panel if it doesn't exist
        let scoreboardPanel = document.getElementById('dartsScoreboardPanel');
        if (!scoreboardPanel) {
            scoreboardPanel = document.createElement('div');
            scoreboardPanel.id = 'dartsScoreboardPanel';
            scoreboardPanel.className = 'data-panel';
            dataPanels.appendChild(scoreboardPanel);
        }

        scoreboardPanel.innerHTML = `<h4>📊 Scoreboard</h4><div id="dartsScoreboard"></div>`;
        scoreboardPanel.style.display = 'block';
    }

    updateScoreboard() {
        const scoreboard = document.getElementById('dartsScoreboard');
        if (!scoreboard) return;

        const currentPlayer = this.players[this.currentPlayerIndex];

        let scoreboardHTML = '';

        // Special cricket scoreboard
        if (this.gameMode === 'cricket') {
            scoreboardHTML = this.renderCricketScoreboard();
        } else {
            // Regular scoreboard for other game modes
            this.players.forEach((p, i) => {
                const isActive = i === this.currentPlayerIndex;
                scoreboardHTML += `
                    <div class="data-row" style="background: ${isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent'};
                                                padding: 8px 5px; border-radius: 4px; margin-bottom: 5px;
                                                border-left: 4px solid ${p.color};">
                        <span class="data-label" style="color: ${p.color}; font-weight: bold;">
                            ${isActive ? '👉 ' : ''}${p.name}
                        </span>
                        <span class="data-value" style="color: white;">
                            ${this.getPlayerScoreDisplay(p)}
                        </span>
                    </div>
                `;
            });
        }

        scoreboard.innerHTML = scoreboardHTML;
    }

    renderCricketScoreboard() {
        const cricketNumbers = [20, 19, 18, 17, 16, 15, 25]; // 25 is bull

        let html = `
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
                    <thead>
                        <tr style="background: rgba(0,0,0,0.3);">
                            <th style="padding: 8px; text-align: left; border: 1px solid rgba(255,255,255,0.1);">Player</th>
        `;

        // Header with numbers
        cricketNumbers.forEach(num => {
            html += `<th style="padding: 8px; text-align: center; border: 1px solid rgba(255,255,255,0.1); font-weight: bold;">
                ${num === 25 ? 'Bull' : num}
            </th>`;
        });

        html += `<th style="padding: 8px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">Pts</th>
                        </tr>
                    </thead>
                    <tbody>`;

        // Each player row
        this.players.forEach((p, i) => {
            const isActive = i === this.currentPlayerIndex;
            html += `
                <tr style="background: ${isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent'};">
                    <td style="padding: 8px; border: 1px solid rgba(255,255,255,0.1); color: ${p.color}; font-weight: bold;">
                        ${isActive ? '👉 ' : ''}${p.name}
                    </td>
            `;

            // Marks for each number
            cricketNumbers.forEach(num => {
                const marks = p.cricketMarks[num] || 0;
                const marksSymbol = this.getCricketMarksSymbol(marks);
                const isClosed = marks >= 3;

                html += `<td style="padding: 8px; text-align: center; border: 1px solid rgba(255,255,255,0.1);
                                    background: ${isClosed ? 'rgba(34, 197, 94, 0.2)' : 'transparent'};
                                    font-size: 1.2em; font-weight: bold;">
                    ${marksSymbol}
                </td>`;
            });

            // Points column
            html += `<td style="padding: 8px; text-align: center; border: 1px solid rgba(255,255,255,0.1); font-weight: bold; color: #fbbf24;">
                ${p.score}
            </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        return html;
    }

    getCricketMarksSymbol(marks) {
        if (marks === 0) return '';
        if (marks === 1) return '/';
        if (marks === 2) return 'X';
        if (marks >= 3) return '⊗';
        return '';
    }

    getPlayerScoreDisplay(player) {
        switch(this.gameMode) {
            case 'practice':
                return player.score;
            case '301':
            case '501':
                return player.score;
            case 'cricket':
                return `${player.score} pts`;
            case 'killer':
                return '❤️'.repeat(player.lives) + (player.isKiller ? ' 💀' : '');
            default:
                return player.score;
        }
    }


    updateInstructions() {
        const instructions = document.getElementById('gameInstructions');
        const currentPlayer = this.players[this.currentPlayerIndex];

        let text = `<p><strong>${currentPlayer.name}'s Turn</strong></p>`;

        switch(this.gameMode) {
            case 'practice':
                text += '<p>Throw darts and rack up points!</p>';
                break;
            case '301':
            case '501':
                text += '<p>Reduce your score to exactly zero. Must finish on a double!</p>';
                break;
            case 'cricket':
                text += '<p>Close numbers 15-20 and Bull. Score points on closed numbers!</p>';
                break;
            case 'killer':
                text += '<p>Hit doubles to become killer, then eliminate opponents!</p>';
                break;
        }

        instructions.innerHTML = text;
    }

    // Dartboard drawing (reuse from original)
    drawDartboard() {
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Draw dartboard segments
        for (let i = 0; i < 20; i++) {
            const angle1 = (i * 18 - 9) * Math.PI / 180;
            const angle2 = ((i + 1) * 18 - 9) * Math.PI / 180;
            const isBlack = i % 2 === 0;
            const segmentColor1 = isBlack ? this.COLORS.black : this.COLORS.white;
            const segmentColor2 = isBlack ? this.COLORS.green : this.COLORS.red;

            this.drawSegment(ctx, centerX, centerY, this.DOUBLE_OUTER, this.DOUBLE_INNER, angle1, angle2, segmentColor2);
            this.drawSegment(ctx, centerX, centerY, this.TRIPLE_OUTER, this.TRIPLE_INNER, angle1, angle2, segmentColor2);
            this.drawSegment(ctx, centerX, centerY, this.DOUBLE_INNER, this.TRIPLE_OUTER, angle1, angle2, segmentColor1);
            this.drawSegment(ctx, centerX, centerY, this.TRIPLE_INNER, this.BULLS_RING_RADIUS, angle1, angle2, segmentColor1);

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

        ctx.beginPath();
        ctx.arc(centerX, centerY, this.BULLS_RING_RADIUS, 0, 2 * Math.PI);
        ctx.fillStyle = this.COLORS.bullRing;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerX, centerY, this.BULLSEYE_RADIUS, 0, 2 * Math.PI);
        ctx.fillStyle = this.COLORS.bullseye;
        ctx.fill();

        // Draw all players' darts
        this.players.forEach(p => {
            p.dartsThrown.forEach(dart => this.drawDart(dart.x, dart.y, p.color));
        });

        // Broadcast to projector if in projector mode
        if (window.projectorMode && window.projectorChannel) {
            try {
                const dataUrl = this.canvas.toDataURL();
                window.projectorChannel.postMessage({
                    type: 'game_update',
                    data: {
                        canvasData: dataUrl,
                        width: this.canvas.width,
                        height: this.canvas.height
                    }
                });
            } catch (err) {
                console.warn('Failed to broadcast to projector:', err);
            }
        }
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

    drawDart(x, y, color) {
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const canvasX = centerX + x;
        const canvasY = centerY + y;

        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 6, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    handleShot(shotData) {
        if (!this.gameActive) return;

        const currentPlayer = this.players[this.currentPlayerIndex];
        let speed = shotData.ball_speed || 0;

        // Apply power multiplier for low-speed shots (kids/beginners)
        const BOOST_THRESHOLD = 40; // mph - shots below this get boosted
        const powerMultiplier = currentPlayer.powerMultiplier || 1.0;

        if (speed < BOOST_THRESHOLD && powerMultiplier > 1.0) {
            const originalSpeed = speed;
            speed = speed * powerMultiplier;
            console.log(`👶 Power boost applied: ${originalSpeed.toFixed(1)} mph → ${speed.toFixed(1)} mph (${powerMultiplier}x)`);

            // Also boost the angles proportionally to simulate harder throw
            shotData.hla = shotData.hla * powerMultiplier;
            shotData.vla = shotData.vla * powerMultiplier;
        }

        const dartPos = this.shotToPosition(shotData);

        const result = this.calculateScore(dartPos);

        // Calculate distance from center (in pixels, convert to inches)
        const distancePixels = Math.sqrt(dartPos.x * dartPos.x + dartPos.y * dartPos.y);
        const distanceInches = (distancePixels / this.DARTBOARD_RADIUS) * 9; // Standard dartboard is 18" diameter (9" radius)

        // Add dart to player's throws
        currentPlayer.dartsThrown.push({ x: dartPos.x, y: dartPos.y });

        // DEBUG: Log dart throw details
        console.log(`[DART ${currentPlayer.dartsThrown.length}] Player: ${currentPlayer.name}, Hit: ${result.message}, Number: ${result.number}, Zone: ${result.zone}, Darts Thrown: ${currentPlayer.dartsThrown.length}`);

        // Process based on game mode
        this.processGameMode(currentPlayer, result);

        this.drawDartboard();
        this.updateScoreboard();
        showShotFeedback(result.points, result.message, distanceInches);
    }

    processGameMode(player, result) {
        switch(this.gameMode) {
            case 'practice':
                this.processPractice(player, result);
                break;
            case '301':
            case '501':
                this.processX01(player, result);
                break;
            case 'cricket':
                this.processCricket(player, result);
                break;
            case 'killer':
                this.processKiller(player, result);
                break;
        }
    }

    processPractice(player, result) {
        player.score += result.points;
        if (player.dartsThrown.length % 3 === 0) {
            player.roundsComplete = Math.floor(player.dartsThrown.length / 3);
            this.nextPlayer();
        }
    }

    processX01(player, result) {
        const newScore = player.score - result.points;

        if (newScore === 0 && result.zone === 'double') {
            player.score = 0;
            this.endGame(player);
        } else if (newScore > 0 && newScore !== 1) {
            player.score = newScore;
        } else {
            showShotFeedback(0, 'Bust!');
        }

        player.dartsInRound = (player.dartsInRound || 0) + 1;
        if (player.dartsInRound >= 3) {
            player.dartsInRound = 0;
            this.nextPlayer();
        }
    }

    processCricket(player, result) {
        // Get the number hit (25 for bullseye/bull's ring)
        let num = result.number;
        if (result.zone === 'bullseye' || result.zone === 'bull_ring') {
            num = 25;
        }

        // Only process cricket numbers (15-20 and bull)
        if (num && [15,16,17,18,19,20,25].includes(num)) {
            // Calculate marks based on zone hit
            let marksToAdd = 1;
            if (result.zone === 'triple') marksToAdd = 3;
            else if (result.zone === 'double') marksToAdd = 2;
            else if (result.zone === 'bullseye') marksToAdd = 2; // Bullseye counts as 2 marks
            else if (result.zone === 'bull_ring') marksToAdd = 1; // Bull's ring counts as 1 mark

            const currentMarks = player.cricketMarks[num] || 0;
            const newMarks = currentMarks + marksToAdd;

            // Check if all opponents have closed this number
            const allOpponentsClosed = this.players
                .filter(p => p !== player)
                .every(p => (p.cricketMarks[num] || 0) >= 3);

            // If not closed yet, add marks up to 3
            if (currentMarks < 3) {
                player.cricketMarks[num] = Math.min(newMarks, 3);
            }

            // If we already had 3 marks (number is closed) and opponents haven't all closed it, score points
            if (currentMarks >= 3 && !allOpponentsClosed) {
                player.score += num * marksToAdd;
            }
            // If we just closed it (went from <3 to >=3) and have extra marks, score those
            else if (currentMarks < 3 && newMarks > 3 && !allOpponentsClosed) {
                const extraMarks = newMarks - 3;
                player.score += num * extraMarks;
            }

            // Check for win condition: all numbers closed and highest score
            this.checkCricketWin();
        }

        // Only advance to next player after 3 darts
        if (player.dartsThrown.length % 3 === 0) {
            console.log(`[TURN END] ${player.name} finished turn with ${player.dartsThrown.length} darts. Switching to next player.`);
            this.nextPlayer();
        } else {
            console.log(`[TURN CONTINUES] ${player.name} has thrown ${player.dartsThrown.length} darts, needs ${3 - (player.dartsThrown.length % 3)} more.`);
        }
    }

    checkCricketWin() {
        const cricketNumbers = [20, 19, 18, 17, 16, 15, 25];

        // Find players who have closed all numbers
        const playersWithAllClosed = this.players.filter(p => {
            return cricketNumbers.every(num => (p.cricketMarks[num] || 0) >= 3);
        });

        if (playersWithAllClosed.length === 0) return;

        // Find the highest score among those who closed all numbers
        const maxScore = Math.max(...playersWithAllClosed.map(p => p.score));

        // Find winner (closed all and has highest score)
        const winner = playersWithAllClosed.find(p => p.score === maxScore);

        if (winner) {
            this.endGame(winner);
        }
    }

    processKiller(player, result) {
        // Simplified killer - hit doubles to become killer, then eliminate
        if (result.zone === 'double' && !player.isKiller) {
            player.isKiller = true;
            showShotFeedback(0, 'You are now a KILLER!');
        } else if (player.isKiller && result.zone === 'double') {
            // Find other player who owns this number
            const victim = this.players.find(p => p !== player && p.killerNumber === result.number);
            if (victim) {
                victim.lives--;
                if (victim.lives === 0) {
                    showShotFeedback(0, `${victim.name} eliminated!`);
                }
            }
        }

        this.nextPlayer();
    }

    nextPlayer() {
        const oldPlayer = this.players[this.currentPlayerIndex];
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        const newPlayer = this.players[this.currentPlayerIndex];
        console.log(`[PLAYER SWITCH] Switched from ${oldPlayer.name} to ${newPlayer.name} (index ${this.currentPlayerIndex})`);
        this.updateScoreboard();
        this.updateInstructions();
    }

    endGame(winner) {
        this.gameActive = false;
        setTimeout(() => {
            alert(`🎉 ${winner.name} WINS! 🎉\n\nClick "🔄 New Game" to play again!`);
        }, 1000);
    }

    // Reuse calculation methods from original
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

            // Use canvas dimensions for full-canvas dart placement
            const canvasRadius = Math.min(this.canvas.width, this.canvas.height) / 2;
            const x = normalizedX * canvasRadius;
            const y = normalizedY * canvasRadius;

            return { x, y };
        } else {
            // FALLBACK: Old system (hardcoded assumptions)
            // Use canvas dimensions for full-canvas dart placement
            const canvasRadius = Math.min(this.canvas.width, this.canvas.height) / 2;
            const x = (hla / 15.0) * canvasRadius;
            const y = -((vla - 15.0) / 10.0) * canvasRadius;
            return { x, y };
        }
    }

    calculateScore(pos) {
        const distance = Math.sqrt(pos.x * pos.x + pos.y * pos.y);

        if (distance > this.DARTBOARD_RADIUS) {
            return { points: 0, message: 'Missed!' };
        }

        if (distance <= this.BULLSEYE_RADIUS) {
            return { points: 50, message: 'BULLSEYE! 🎯', zone: 'bullseye' };
        }

        if (distance <= this.BULLS_RING_RADIUS) {
            return { points: 25, message: "Bull's Ring!", zone: 'bull_ring' };
        }

        const angle = Math.atan2(pos.x, -pos.y);
        const segment = this.getDartboardNumber(angle);

        if (distance >= this.TRIPLE_INNER && distance <= this.TRIPLE_OUTER) {
            return { points: segment * 3, message: `TRIPLE ${segment}! ⚡`, zone: 'triple', number: segment };
        }

        if (distance >= this.DOUBLE_INNER && distance <= this.DOUBLE_OUTER) {
            return { points: segment * 2, message: `DOUBLE ${segment}! 💥`, zone: 'double', number: segment };
        }

        return { points: segment, message: `Hit ${segment}`, zone: 'single', number: segment };
    }

    getDartboardNumber(angleRad) {
        let angleDeg = angleRad * 180 / Math.PI;
        if (angleDeg < 0) angleDeg += 360;
        angleDeg += 9;
        if (angleDeg >= 360) angleDeg -= 360;
        const segmentIndex = Math.floor(angleDeg / 18) % 20;
        return this.NUMBERS[segmentIndex];
    }

    restartGame() {
        // Save current settings
        const savedPlayers = this.players.map(p => ({
            name: p.name,
            color: p.color
        }));
        const savedGameMode = this.gameMode;

        // Cleanup current game
        this.gameActive = false;
        this.currentPlayerIndex = 0;

        // Restore players with fresh state
        this.players = savedPlayers.map(p => ({
            name: p.name,
            color: p.color,
            score: 0,
            dartsThrown: []
        }));

        // Restart with same mode
        this.gameMode = savedGameMode;
        this.gameActive = true;

        // Reinitialize game-specific data
        switch(this.gameMode) {
            case 'practice':
                this.initPracticeMode();
                break;
            case '301':
                this.init301Mode();
                break;
            case '501':
                this.init501Mode();
                break;
            case 'cricket':
                this.initCricketMode();
                break;
            case 'killer':
                this.initKillerMode();
                break;
        }

        // Re-render game
        this.renderGame();
    }

    cleanup() {
        this.gameActive = false;
        this.players = [];
        this.currentPlayerIndex = 0;

        // Remove scoreboard panel
        const scoreboardPanel = document.getElementById('dartsScoreboardPanel');
        if (scoreboardPanel) {
            scoreboardPanel.remove();
        }
    }
}
