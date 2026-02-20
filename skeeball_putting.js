// 3D Skee-Ball Putting Game - Full-screen rendering like driving range
// Note: THREE and CANNON are loaded globally from electron-index.html

class SkeeBallGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null;
        this.ball = null;
        this.ballBody = null;
        this.gameActive = false;
        this.players = [];
        this.currentPlayerIndex = 0;
        this.animationId = null;
        this.setupMode = true;

        // Scoring zones (from bottom to top of ramp)
        this.scoringZones = [
            { points: 10, radius: 0.4, y: 3.0 },
            { points: 20, radius: 0.35, y: 3.2 },
            { points: 30, radius: 0.3, y: 3.4 },
            { points: 40, radius: 0.25, y: 3.6 },
            { points: 50, radius: 0.2, y: 3.8 },
            { points: 100, radius: 0.15, y: 4.0 } // Top hole - jackpot!
        ];
    }

    init() {
        // Hide darts-specific UI elements
        this.hideDartsUI();
        this.showSetupScreen();
    }

    hideDartsUI() {
        // Hide darts buttons and panels
        const dataPanels = document.querySelector('.data-panels');
        if (dataPanels) dataPanels.style.display = 'none';

        // Hide all test buttons
        const testButtons = document.querySelectorAll('.test-button');
        testButtons.forEach(btn => btn.style.display = 'none');

        const backButton = document.querySelector('.back-button');
        if (backButton) backButton.style.display = 'none';

        const fullscreenDropdown = document.getElementById('fullscreenDropdown');
        if (fullscreenDropdown) fullscreenDropdown.style.display = 'none';
    }

    showSetupScreen() {
        const gameContent = document.getElementById('gameContent');
        console.log('🎱 Skee-Ball showSetupScreen() - gameContent element:', gameContent);

        // Make sure gameContent is visible and properly positioned
        gameContent.style.display = 'block';
        gameContent.style.visibility = 'visible';
        gameContent.style.position = 'relative';
        gameContent.style.zIndex = '10';
        gameContent.style.width = '100%';

        gameContent.innerHTML = `
            <div style="max-width: 800px; margin: 0 auto; padding: 20px; position: relative; z-index: 10;">
                <h2 style="text-align: center; margin-bottom: 30px;">⛳ Skee-Ball Putting Setup</h2>

                <div style="background: rgba(0,0,0,0.3); padding: 30px; border-radius: 15px; margin-bottom: 20px;">
                    <h3 style="margin-bottom: 15px;">Number of Players</h3>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        ${[1,2,3,4].map(n => `
                            <button onclick="currentSkeeBallGame.setPlayerCount(${n})"
                                    style="flex: 1; min-width: 80px; padding: 15px; font-size: 1.2em;
                                           background: rgba(34, 197, 94, 0.3); border: 2px solid #22c55e;
                                           color: white; border-radius: 8px; cursor: pointer;">
                                ${n} Player${n > 1 ? 's' : ''}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div id="playerNamesSection" style="display: none; background: rgba(0,0,0,0.3); padding: 30px; border-radius: 15px; margin-bottom: 20px;">
                    <h3 style="margin-bottom: 20px;">Player Names</h3>
                    <div id="playerNameInputs"></div>
                </div>
            </div>
        `;
    }

    setPlayerCount(count) {
        this.players = [];
        const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

        for (let i = 0; i < count; i++) {
            this.players.push({
                name: `Player ${i + 1}`,
                color: colors[i],
                score: 0,
                balls: 0
            });
        }

        this.renderPlayerInputs();
    }

    renderPlayerInputs() {
        const namesSection = document.getElementById('playerNamesSection');
        const inputsContainer = document.getElementById('playerNameInputs');

        inputsContainer.innerHTML = this.players.map((p, i) => `
            <div style="margin-bottom: 15px;">
                <input type="text"
                       id="skeeBallPlayerName${i}"
                       value="${p.name}"
                       placeholder="Enter name"
                       style="width: 100%; padding: 12px; font-size: 1em;
                              background: rgba(0,0,0,0.3); border: 2px solid ${p.color};
                              color: white; border-radius: 8px;">
            </div>
        `).join('');

        inputsContainer.innerHTML += `
            <button onclick="currentSkeeBallGame.startGame()"
                    style="width: 100%; padding: 15px; margin-top: 10px; font-size: 1.1em; font-weight: bold;
                           background: rgba(34, 197, 94, 0.3); border: 2px solid #22c55e;
                           color: white; border-radius: 8px; cursor: pointer;">
                Start Skee-Ball! 🎱
            </button>
        `;

        namesSection.style.display = 'block';
    }

    startGame() {
        // Save player names
        this.players.forEach((p, i) => {
            const input = document.getElementById(`skeeBallPlayerName${i}`);
            if (input) p.name = input.value || `Player ${i + 1}`;
        });

        this.setupMode = false;
        this.gameActive = true;
        this.currentPlayerIndex = 0;

        // Hide normal UI chrome
        const gameContent = document.getElementById('gameContent');
        gameContent.style.display = 'none';

        this.setupFullScreenUI();
        this.setupThreeJS();
        this.setupPhysics();
        this.createRamp();
        this.createScoringHoles();
        this.animate();
        this.updateInstructions();
    }

    setupFullScreenUI() {
        // Create full-screen canvas and HUD overlays
        const body = document.body;

        // Canvas
        const canvas = document.createElement('canvas');
        canvas.id = 'skeeBallCanvas';
        canvas.style.display = 'block';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '1000';
        body.appendChild(canvas);

        // HUD container
        const hud = document.createElement('div');
        hud.id = 'skeeBallHUD';
        hud.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 1001;';

        // Current player instructions (top-left)
        const instructions = document.createElement('div');
        instructions.id = 'skeeBallInstructions';
        instructions.style.cssText = `
            position: absolute;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            min-width: 300px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;
        hud.appendChild(instructions);

        // Scoreboard (top-right)
        const scoreboard = document.createElement('div');
        scoreboard.id = 'skeeBallScoreboard';
        scoreboard.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            min-width: 250px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;
        scoreboard.innerHTML = '<h3 style="margin-top: 0; color: #22c55e; font-size: 1.5em; text-align: center;">🎱 Scoreboard</h3><div id="skeeBallScoreList"></div>';
        hud.appendChild(scoreboard);

        // Exit button (bottom-right)
        const exitBtn = document.createElement('button');
        exitBtn.id = 'skeeBallExitBtn';
        exitBtn.textContent = 'Exit Game';
        exitBtn.style.cssText = `
            position: absolute;
            bottom: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            pointer-events: all;
            transition: all 0.3s;
        `;
        exitBtn.onmouseover = () => exitBtn.style.background = '#dc2626';
        exitBtn.onmouseout = () => exitBtn.style.background = '#ef4444';
        exitBtn.onclick = () => this.cleanup();
        hud.appendChild(exitBtn);

        body.appendChild(hud);
    }

    setupThreeJS() {
        const canvas = document.getElementById('skeeBallCanvas');

        // Scene
        this.scene = new THREE.Scene();

        // Sky gradient background
        const skyCanvas = document.createElement('canvas');
        skyCanvas.width = 1;
        skyCanvas.height = 128;
        const skyContext = skyCanvas.getContext('2d');
        const gradient = skyContext.createLinearGradient(0, 0, 0, 128);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.5, '#98D8E8');
        gradient.addColorStop(1, '#F0E68C');
        skyContext.fillStyle = gradient;
        skyContext.fillRect(0, 0, 1, 128);
        const skyTexture = new THREE.CanvasTexture(skyCanvas);
        this.scene.background = skyTexture;

        this.scene.fog = new THREE.Fog(0x98D8E8, 10, 50);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 3, 8);
        this.camera.lookAt(0, 2, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xFDB813, 1.2);
        sunLight.position.set(10, 15, 10);
        sunLight.castShadow = true;
        sunLight.shadow.camera.left = -20;
        sunLight.shadow.camera.right = 20;
        sunLight.shadow.camera.top = 20;
        sunLight.shadow.camera.bottom = -20;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        this.scene.add(sunLight);

        // Ground
        const groundGeometry = new THREE.PlaneGeometry(30, 30);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 }); // Green
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Window resize handler
        window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    setupPhysics() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0); // Earth gravity

        // Ground plane
        const groundBody = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Plane()
        });
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.world.addBody(groundBody);
    }

    createRamp() {
        // Main ramp - angled upward
        const rampLength = 4;
        const rampWidth = 1.5;
        const rampAngle = Math.PI / 6; // 30 degrees

        const rampGeometry = new THREE.BoxGeometry(rampWidth, 0.1, rampLength);
        const rampMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 }); // Brown wood
        const ramp = new THREE.Mesh(rampGeometry, rampMaterial);

        ramp.position.set(0, 1, -1);
        ramp.rotation.x = rampAngle;
        ramp.receiveShadow = true;
        ramp.castShadow = true;
        this.scene.add(ramp);

        // Physics body for ramp
        const rampShape = new CANNON.Box(new CANNON.Vec3(rampWidth / 2, 0.05, rampLength / 2));
        const rampBody = new CANNON.Body({ mass: 0 });
        rampBody.addShape(rampShape);
        rampBody.position.set(0, 1, -1);
        rampBody.quaternion.setFromEuler(rampAngle, 0, 0);
        this.world.addBody(rampBody);

        // Side rails
        this.createRail(-rampWidth / 2, rampLength, rampAngle);
        this.createRail(rampWidth / 2, rampLength, rampAngle);
    }

    createRail(x, length, angle) {
        const railGeometry = new THREE.BoxGeometry(0.05, 0.2, length);
        const railMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
        const rail = new THREE.Mesh(railGeometry, railMaterial);

        rail.position.set(x, 1.1, -1);
        rail.rotation.x = angle;
        this.scene.add(rail);
    }

    createScoringHoles() {
        this.scoringZones.forEach((zone, index) => {
            const holeGeometry = new THREE.CylinderGeometry(zone.radius, zone.radius, 0.1, 32);
            const holeColor = index === 5 ? 0xffd700 : // Gold for jackpot
                              index >= 3 ? 0xff0000 : // Red for high scores
                              0x0000ff; // Blue for low scores
            const holeMaterial = new THREE.MeshStandardMaterial({ color: holeColor });
            const hole = new THREE.Mesh(holeGeometry, holeMaterial);

            hole.position.set(0, zone.y, -3);
            hole.receiveShadow = true;
            this.scene.add(hole);

            // Add point label
            this.createScoreLabel(zone.points, 0, zone.y + 0.2, -3);
        });
    }

    createScoreLabel(points, x, y, z) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;

        context.fillStyle = 'white';
        context.font = 'bold 60px Arial';
        context.textAlign = 'center';
        context.fillText(points.toString(), 128, 80);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.set(x, y, z);
        sprite.scale.set(0.5, 0.25, 1);
        this.scene.add(sprite);
    }

    createBall(speed, hla, vla) {
        // Remove existing ball if any
        if (this.ball) {
            this.scene.remove(this.ball);
            this.world.removeBody(this.ballBody);
        }

        // Create ball mesh
        const ballGeometry = new THREE.SphereGeometry(0.05, 32, 32);
        const ballMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.05,
            shininess: 100
        });
        this.ball = new THREE.Mesh(ballGeometry, ballMaterial);
        this.ball.castShadow = true;
        this.scene.add(this.ball);

        // Create ball physics body
        const ballShape = new CANNON.Sphere(0.05);
        this.ballBody = new CANNON.Body({
            mass: 0.045, // Golf ball mass in kg
            shape: ballShape,
            material: new CANNON.Material({ friction: 0.3, restitution: 0.6 })
        });

        this.ballBody.position.set(0, 0.1, 2);

        // Convert launch monitor data to velocity
        // Speed is in mph, convert to m/s and scale down for playability
        const velocityScale = 0.05;
        const vx = (speed * 0.44704) * Math.sin(hla * Math.PI / 180) * velocityScale;
        const vy = (speed * 0.44704) * Math.sin(vla * Math.PI / 180) * velocityScale;
        const vz = -(speed * 0.44704) * Math.cos(hla * Math.PI / 180) * velocityScale;

        this.ballBody.velocity.set(vx, vy, vz);
        this.world.addBody(this.ballBody);

        console.log(`Ball launched: Speed=${speed} mph, HLA=${hla}°, VLA=${vla}°`);
        console.log(`Velocity: vx=${vx.toFixed(2)}, vy=${vy.toFixed(2)}, vz=${vz.toFixed(2)}`);

        // Check scoring after ball settles
        setTimeout(() => this.checkScoring(), 5000);
    }

    checkScoring() {
        if (!this.ballBody) return;

        const ballPos = this.ballBody.position;
        let scored = false;

        for (const zone of this.scoringZones) {
            const distance = Math.sqrt(
                Math.pow(ballPos.x - 0, 2) +
                Math.pow(ballPos.z - (-3), 2)
            );

            if (distance < zone.radius && Math.abs(ballPos.y - zone.y) < 0.2) {
                this.scorePoints(zone.points);
                scored = true;
                break;
            }
        }

        if (!scored) {
            this.showFeedback('Miss! Try again!');
        }

        this.nextPlayer();
    }

    scorePoints(points) {
        const currentPlayer = this.players[this.currentPlayerIndex];
        currentPlayer.score += points;
        currentPlayer.balls++;

        this.showFeedback(points === 100 ? 'JACKPOT! 🎉' : `${points} Points!`);
        this.updateScoreboard();
    }

    showFeedback(message) {
        // Create temporary feedback message
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: #22c55e;
            padding: 30px 60px;
            border-radius: 15px;
            font-size: 2em;
            font-weight: bold;
            z-index: 1002;
            border: 3px solid #22c55e;
            box-shadow: 0 0 30px rgba(34, 197, 94, 0.5);
        `;
        feedback.textContent = message;
        document.body.appendChild(feedback);

        setTimeout(() => {
            document.body.removeChild(feedback);
        }, 2000);
    }

    nextPlayer() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.updateInstructions();
    }

    updateInstructions() {
        const instructions = document.getElementById('skeeBallInstructions');
        const currentPlayer = this.players[this.currentPlayerIndex];
        if (instructions) {
            instructions.innerHTML = `
                <h3 style="margin-top: 0; color: ${currentPlayer.color}; font-size: 1.8em; text-align: center;">
                    ${currentPlayer.name}'s Turn
                </h3>
                <div style="font-size: 1.1em; opacity: 0.9; margin-top: 15px; text-align: center; color: white;">
                    Hit your putt to roll the ball up the ramp!
                </div>
                <div style="margin-top: 20px; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
                    <div style="font-size: 0.9em; opacity: 0.7; margin-bottom: 8px;">Scoring:</div>
                    <div style="font-size: 0.85em; opacity: 0.8; line-height: 1.6;">
                        🔵 10-30 pts (Blue holes)<br>
                        🔴 40-50 pts (Red holes)<br>
                        🟡 100 pts (Gold jackpot!)
                    </div>
                </div>
            `;
        }
    }

    updateScoreboard() {
        const scoreList = document.getElementById('skeeBallScoreList');
        if (!scoreList) return;

        let html = '';
        this.players.forEach((p, i) => {
            const isActive = i === this.currentPlayerIndex;
            html += `
                <div style="background: ${isActive ? 'rgba(34, 197, 94, 0.2)' : 'transparent'};
                            padding: 12px 8px; border-radius: 6px; margin-bottom: 8px;
                            border-left: 4px solid ${p.color};">
                    <div style="color: ${p.color}; font-weight: bold; font-size: 1.1em; margin-bottom: 4px;">
                        ${isActive ? '👉 ' : ''}${p.name}
                    </div>
                    <div style="color: white; font-size: 1.3em; font-weight: bold;">
                        ${p.score} pts
                    </div>
                    <div style="color: rgba(255, 255, 255, 0.6); font-size: 0.9em;">
                        ${p.balls} balls
                    </div>
                </div>
            `;
        });

        scoreList.innerHTML = html;
    }

    handleShot(shotData) {
        if (!this.gameActive) return;

        const speed = shotData.ball_speed || 0;
        const hla = shotData.hla || 0;
        const vla = shotData.vla || 0;

        if (speed < 5) {
            this.showFeedback('Too soft! Hit it harder!');
            return;
        }

        this.createBall(speed, hla, vla);
    }

    animate() {
        if (!this.gameActive) return;

        this.animationId = requestAnimationFrame(() => this.animate());

        // Update physics
        this.world.step(1 / 60);

        // Update ball position from physics
        if (this.ball && this.ballBody) {
            this.ball.position.copy(this.ballBody.position);
            this.ball.quaternion.copy(this.ballBody.quaternion);
        }

        this.renderer.render(this.scene, this.camera);
    }

    cleanup() {
        this.gameActive = false;

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        // Remove canvas and HUD
        const canvas = document.getElementById('skeeBallCanvas');
        const hud = document.getElementById('skeeBallHUD');
        if (canvas) canvas.remove();
        if (hud) hud.remove();

        // Show normal UI
        const gameContent = document.getElementById('gameContent');
        gameContent.style.display = 'block';

        // Return to menu
        if (typeof showMenu === 'function') {
            showMenu();
        }
    }
}

// Export for use in main app
window.SkeeBallGame = SkeeBallGame;
