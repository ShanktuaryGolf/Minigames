// 3D Skee-Ball Putting Game - Realistic Skee-Ball Machine
// Note: THREE and CANNON are loaded globally

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

        // Scoring zones - concentric circles at the top
        this.scoringZones = [
            { points: 10, radius: 0.5, color: 0x0000ff },   // Blue outer ring
            { points: 20, radius: 0.4, color: 0xff0000 },   // Red
            { points: 30, radius: 0.3, color: 0x0000ff },   // Blue
            { points: 40, radius: 0.2, color: 0xff0000 },   // Red
            { points: 50, radius: 0.15, color: 0xffff00 },  // Yellow
            { points: 100, radius: 0.1, color: 0xffd700 }   // Gold center (jackpot!)
        ];
    }

    init() {
        this.hideDartsUI();
        this.showSetupScreen();
    }

    hideDartsUI() {
        const dataPanels = document.querySelector('.data-panels');
        if (dataPanels) dataPanels.style.display = 'none';

        const testButtons = document.querySelectorAll('.test-button');
        testButtons.forEach(btn => btn.style.display = 'none');

        const backButton = document.querySelector('.back-button');
        if (backButton) backButton.style.display = 'none';

        const fullscreenDropdown = document.getElementById('fullscreenDropdown');
        if (fullscreenDropdown) fullscreenDropdown.style.display = 'none';
    }

    showSetupScreen() {
        const gameContent = document.getElementById('gameContent');
        gameContent.style.display = 'block';
        gameContent.style.visibility = 'visible';
        gameContent.style.position = 'relative';
        gameContent.style.zIndex = '10';
        gameContent.style.width = '100%';

        gameContent.innerHTML = `
            <div style="max-width: 800px; margin: 0 auto; padding: 20px; position: relative; z-index: 10;">
                <h2 style="text-align: center; margin-bottom: 30px;">🎱 Skee-Ball Putting Setup</h2>

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

        const startButton = document.createElement('button');
        startButton.textContent = 'Start Skee-Ball! 🎱';
        startButton.style.cssText = `
            width: 100%; padding: 15px; margin-top: 10px; font-size: 1.1em; font-weight: bold;
            background: rgba(34, 197, 94, 0.3); border: 2px solid #22c55e;
            color: white; border-radius: 8px; cursor: pointer;
        `;
        startButton.onclick = () => this.startGame();
        inputsContainer.appendChild(startButton);

        namesSection.style.display = 'block';
    }

    startGame() {
        // Update player names
        this.players.forEach((p, i) => {
            const input = document.getElementById(`skeeBallPlayerName${i}`);
            if (input && input.value.trim()) {
                p.name = input.value.trim();
            }
        });

        this.gameActive = true;
        this.setupMode = false;
        this.currentPlayerIndex = 0;

        // Clear setup UI and create game canvas
        const gameContent = document.getElementById('gameContent');
        gameContent.innerHTML = '<canvas id="skeeBallCanvas"></canvas>';

        this.setupThreeJS();
        this.setupPhysics();
        this.createSkeeBallMachine();
        this.createHUD();
        this.animate();
    }

    setupThreeJS() {
        const canvas = document.getElementById('skeeBallCanvas');

        // Scene with brick wall background (arcade environment)
        this.scene = new THREE.Scene();

        // Create brick wall texture
        const brickCanvas = document.createElement('canvas');
        brickCanvas.width = 512;
        brickCanvas.height = 512;
        const brickCtx = brickCanvas.getContext('2d');

        // Dark red brick background
        brickCtx.fillStyle = '#5c2e2e';
        brickCtx.fillRect(0, 0, 512, 512);

        // Draw brick pattern
        const brickWidth = 64;
        const brickHeight = 32;
        const mortarColor = '#2a1616';

        for (let y = 0; y < 512; y += brickHeight) {
            for (let x = 0; x < 512; x += brickWidth) {
                const offset = (y / brickHeight) % 2 === 0 ? 0 : brickWidth / 2;

                // Brick
                brickCtx.fillStyle = '#6b3636';
                brickCtx.fillRect(x + offset, y, brickWidth - 2, brickHeight - 2);

                // Slight variation in brick color
                if (Math.random() > 0.5) {
                    brickCtx.fillStyle = '#5c2e2e';
                    brickCtx.fillRect(x + offset + 2, y + 2, brickWidth - 6, brickHeight - 6);
                }

                // Mortar lines
                brickCtx.fillStyle = mortarColor;
                brickCtx.fillRect(x + offset, y + brickHeight - 2, brickWidth, 2);
                brickCtx.fillRect(x + offset + brickWidth - 2, y, 2, brickHeight);
            }
        }

        const brickTexture = new THREE.CanvasTexture(brickCanvas);
        brickTexture.wrapS = THREE.RepeatWrapping;
        brickTexture.wrapT = THREE.RepeatWrapping;
        brickTexture.repeat.set(4, 4);

        this.scene.background = brickTexture;
        this.scene.fog = new THREE.Fog(0x2a1616, 15, 35);

        // Camera - positioned to see the entire skee-ball machine
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        // Position camera behind and above at player perspective
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

        // Lights - bright ambient to see the model clearly
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        this.scene.add(ambientLight);

        // Directional light from above
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
        mainLight.position.set(5, 10, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        this.scene.add(mainLight);

        // Fill light from the side
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
        fillLight.position.set(-5, 5, 5);
        this.scene.add(fillLight);

        // Back light
        const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
        backLight.position.set(0, 5, -5);
        this.scene.add(backLight);

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
        this.world.gravity.set(0, -9.82, 0);

        // Ground plane at lane height - matches the visible lane in the 3D model
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0 });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Rotate to be horizontal
        groundBody.position.set(0, 0.9, 0); // Lane surface height
        this.world.addBody(groundBody);

        console.log('✓ Physics ground plane added at y=0.9');

        // Curved ramp physics (approximate with angled plane)
        const rampShape = new CANNON.Box(new CANNON.Vec3(0.7, 0.05, 2));
        const rampBody = new CANNON.Body({ mass: 0 });
        rampBody.addShape(rampShape);
        rampBody.position.set(0, 1.8, 7.5);
        rampBody.quaternion.setFromEuler(-Math.PI / 4, 0, 0); // 45 degree angle to match visual
        this.world.addBody(rampBody);

        // Side walls physics (left and right)
        const wallHeight = 0.3;
        const wallDepth = 6;

        const leftWallShape = new CANNON.Box(new CANNON.Vec3(0.1, wallHeight, wallDepth));
        const leftWallBody = new CANNON.Body({ mass: 0 });
        leftWallBody.addShape(leftWallShape);
        leftWallBody.position.set(-0.8, wallHeight, 0);
        this.world.addBody(leftWallBody);

        const rightWallShape = new CANNON.Box(new CANNON.Vec3(0.1, wallHeight, wallDepth));
        const rightWallBody = new CANNON.Body({ mass: 0 });
        rightWallBody.addShape(rightWallShape);
        rightWallBody.position.set(0.8, wallHeight, 0);
        this.world.addBody(rightWallBody);
    }

    createSkeeBallMachine() {
        // Load the 3D model
        const loader = new THREE.GLTFLoader();

        loader.load(
            './skeeball_model.glb',
            (gltf) => {
                const model = gltf.scene;

                // Scale up the model significantly and position it
                model.scale.set(3, 3, 3); // Make it 3x bigger
                model.position.set(0, 0, 0);
                model.rotation.y = 0; // Adjust rotation if needed

                // Enable shadows on all meshes in the model
                model.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });

                this.scene.add(model);
                this.skeeBallModel = model;

                console.log('✅ Skee-ball 3D model loaded successfully');

                // After model loads, add the scoring holes as invisible collision targets
                this.createScoringHoles();
            },
            (progress) => {
                console.log('Loading model:', (progress.loaded / progress.total * 100).toFixed(2) + '%');
            },
            (error) => {
                console.error('❌ Error loading skee-ball model:', error);
                // Fallback to basic geometry if model fails to load
                this.createBasicSkeeBall();
            }
        );
    }

    createScoringHoles() {
        // Define hole positions for scoring (invisible collision targets)
        // These will need to be adjusted based on where the holes are in the actual 3D model
        const holeLayout = [
            // 10 points - bottom
            { points: 10, x: 0, y: 1, z: 5, radius: 0.2 },

            // 20 points
            { points: 20, x: -0.3, y: 1.5, z: 5, radius: 0.15 },
            { points: 20, x: 0, y: 1.5, z: 5, radius: 0.15 },
            { points: 20, x: 0.3, y: 1.5, z: 5, radius: 0.15 },

            // 30 points
            { points: 30, x: -0.25, y: 2, z: 5, radius: 0.13 },
            { points: 30, x: 0, y: 2, z: 5, radius: 0.13 },
            { points: 30, x: 0.25, y: 2, z: 5, radius: 0.13 },

            // 40 points
            { points: 40, x: -0.18, y: 2.5, z: 5, radius: 0.12 },
            { points: 40, x: 0.18, y: 2.5, z: 5, radius: 0.12 },

            // 50 points
            { points: 50, x: 0, y: 3, z: 5, radius: 0.11 },

            // 100 points
            { points: 100, x: -0.5, y: 3.2, z: 5, radius: 0.1 },
            { points: 100, x: 0.5, y: 3.2, z: 5, radius: 0.1 },
        ];

        this.holeLayout = holeLayout;

        // Optional: Create visual markers for debugging hole positions
        if (false) { // Set to true to see hole positions
            const markerMaterial = new THREE.MeshBasicMaterial({
                color: 0xff00ff,
                transparent: true,
                opacity: 0.5
            });

            holeLayout.forEach(hole => {
                const marker = new THREE.Mesh(
                    new THREE.SphereGeometry(hole.radius, 8, 8),
                    markerMaterial
                );
                marker.position.set(hole.x, hole.y, hole.z);
                this.scene.add(marker);
            });
        }
    }

    createBasicSkeeBall() {
        // Fallback: Create basic skee-ball geometry if model fails to load
        console.log('⚠️ Using basic geometry fallback');

        // Simple lane
        const laneGeometry = new THREE.BoxGeometry(1.5, 0.1, 10);
        const laneMaterial = new THREE.MeshStandardMaterial({ color: 0x8B6914 });
        const lane = new THREE.Mesh(laneGeometry, laneMaterial);
        lane.position.set(0, 0, 0);
        lane.receiveShadow = true;
        this.scene.add(lane);

        // Simple backboard
        const backboardGeometry = new THREE.BoxGeometry(1.6, 2, 0.2);
        const backboardMaterial = new THREE.MeshStandardMaterial({ color: 0xcc5555 });
        const backboard = new THREE.Mesh(backboardGeometry, backboardMaterial);
        backboard.position.set(0, 2, 5);
        this.scene.add(backboard);

        this.createScoringHoles();
    }

    createHUD() {
        const body = document.body;
        const hud = document.createElement('div');
        hud.id = 'skeeBallHUD';
        hud.style.cssText = `
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            pointer-events: none; z-index: 1000;
        `;

        // Player instructions (top-left)
        const currentPlayer = this.players[this.currentPlayerIndex];
        const instructions = document.createElement('div');
        instructions.id = 'playerInstructions';
        instructions.style.cssText = `
            position: absolute; top: 20px; left: 20px;
            background: rgba(0,0,0,0.8); color: white;
            padding: 20px; border-radius: 10px; border: 2px solid ${currentPlayer.color};
            min-width: 250px; backdrop-filter: blur(10px);
        `;
        instructions.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: ${currentPlayer.color};">${currentPlayer.name}'s Turn</h3>
            <p style="margin: 5px 0;">Hit your putt to roll the ball up the ramp!</p>
            <div style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 5px;">
                <div style="font-weight: bold; margin-bottom: 5px;">Scoring:</div>
                <div style="font-size: 0.9em;">🔵 10-30 pts (Blue holes)</div>
                <div style="font-size: 0.9em;">🔴 20-40 pts (Red holes)</div>
                <div style="font-size: 0.9em;">🟡 50 pts (Yellow)</div>
                <div style="font-size: 0.9em;">🟠 100 pts (Gold jackpot!)</div>
            </div>
        `;
        hud.appendChild(instructions);

        // Scoreboard (top-right)
        const scoreboard = document.createElement('div');
        scoreboard.id = 'skeeBallScoreboard';
        scoreboard.style.cssText = `
            position: absolute; top: 20px; right: 20px;
            background: rgba(0,0,0,0.8); color: white;
            padding: 20px; border-radius: 10px;
            min-width: 200px; backdrop-filter: blur(10px);
        `;
        scoreboard.innerHTML = `
            <h3 style="margin: 0 0 10px 0;">🏆 Scoreboard</h3>
            ${this.players.map(p => `
                <div style="margin: 8px 0; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 5px; border-left: 4px solid ${p.color};">
                    <div style="font-weight: bold;">${p.name}</div>
                    <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                        <span>Score: <strong>${p.score}</strong></span>
                        <span>Balls: ${p.balls}</span>
                    </div>
                </div>
            `).join('')}
        `;
        hud.appendChild(scoreboard);

        // Exit button (bottom-right)
        const exitBtn = document.createElement('button');
        exitBtn.textContent = 'Exit Game';
        exitBtn.style.cssText = `
            position: absolute; bottom: 20px; right: 20px;
            padding: 15px 30px; font-size: 1em; font-weight: bold;
            background: #ef4444; border: none; color: white;
            border-radius: 8px; cursor: pointer; pointer-events: auto;
            transition: background 0.3s;
        `;
        exitBtn.onmouseover = () => exitBtn.style.background = '#dc2626';
        exitBtn.onmouseout = () => exitBtn.style.background = '#ef4444';
        exitBtn.onclick = () => this.cleanup();
        hud.appendChild(exitBtn);

        body.appendChild(hud);
    }

    handleShot(shotData) {
        if (!this.gameActive) return;

        const ballData = shotData.BallData;
        const speed = ballData.Speed; // mph
        const hla = ballData.HLA; // horizontal launch angle
        const vla = ballData.VLA; // vertical launch angle

        console.log(`Shot received: ${speed} mph, HLA: ${hla}°, VLA: ${vla}°`);

        // Convert to physics velocity - ball rolls from positive Z to negative Z (toward backboard)
        const speedMps = speed * 0.44704; // mph to m/s
        const velocityX = speedMps * Math.sin(hla * Math.PI / 180) * 0.3;
        const velocityZ = -speedMps * Math.cos(vla * Math.PI / 180) * 0.3; // NEGATIVE Z = toward backboard
        const velocityY = 0; // No upward velocity, let it roll on the floor

        console.log('Ball velocity:', {vx: velocityX, vy: velocityY, vz: velocityZ});
        this.createBall(velocityX, velocityY, velocityZ);
    }

    createBall(vx, vy, vz) {
        // Remove previous ball if exists
        if (this.ball) {
            this.scene.remove(this.ball);
            this.world.removeBody(this.ballBody);
        }

        // Create ball mesh - realistic skee-ball size (3.25 inches = 0.08255 meters diameter)
        const ballRadius = 0.04; // About 8cm diameter, scaled to match the 3x model scale
        const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
        const ballMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff, // White skee-ball
            roughness: 0.6,
            metalness: 0.1
        });
        this.ball = new THREE.Mesh(ballGeometry, ballMaterial);
        this.ball.castShadow = true;
        this.scene.add(this.ball);

        console.log('🎾 Ball mesh added to scene at:', this.ball.position);

        // Create ball physics body
        const ballShape = new CANNON.Sphere(ballRadius);
        this.ballBody = new CANNON.Body({
            mass: 0.045, // Golf ball mass in kg
            shape: ballShape,
            linearDamping: 0.3,
            angularDamping: 0.3
        });
        // Start at POSITIVE Z (near camera/player) and roll toward NEGATIVE Z (backboard)
        // Start ON the lane surface at y=1.35 (just above ground collision at y=0.04)
        this.ballBody.position.set(0, 1.35, 5); // Start near player at positive Z, on lane surface
        this.ballBody.velocity.set(vx, vy, vz); // Apply actual velocity (should be negative Z)
        this.world.addBody(this.ballBody);

        console.log('🎾 Ball created at:', this.ballBody.position, 'velocity:', {vx, vy, vz});
    }

    animate() {
        if (!this.gameActive) return;

        this.animationId = requestAnimationFrame(() => this.animate());

        // Update physics
        this.world.step(1 / 60);

        // Update ball position
        if (this.ball && this.ballBody) {
            this.ball.position.copy(this.ballBody.position);
            this.ball.quaternion.copy(this.ballBody.quaternion);

            // Debug log ball position every few frames
            if (Math.random() < 0.01) {
                console.log('Ball pos:', this.ballBody.position, 'vel:', this.ballBody.velocity.length());
            }

            // Check for scoring
            if (this.ballBody.position.z > 9 && this.ballBody.velocity.length() < 0.5) {
                this.checkScoring();
            }

            // Remove ball if it falls off or goes too far
            if (this.ballBody.position.y < -2 || this.ballBody.position.z > 15) {
                console.log('❌ Ball removed - fell off or went too far');
                this.nextPlayer();
            }
        }

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    checkScoring() {
        if (!this.ballBody) return;

        const ballPos = this.ballBody.position;

        let scored = false;
        let scoredPoints = 0;

        // Check if ball is in any hole
        for (const hole of this.holeLayout) {
            const distance = Math.sqrt(
                Math.pow(ballPos.x - hole.x, 2) +
                Math.pow(ballPos.y - hole.y, 2) +
                Math.pow(ballPos.z - hole.z, 2)
            );

            // Ball must be very close to hole center
            if (distance <= hole.radius) {
                const currentPlayer = this.players[this.currentPlayerIndex];
                currentPlayer.score += hole.points;
                currentPlayer.balls++;
                scoredPoints = hole.points;

                console.log(`⭐ ${currentPlayer.name} scored ${hole.points} points!`);
                this.updateScoreboard();
                scored = true;
                break;
            }
        }

        if (!scored) {
            this.players[this.currentPlayerIndex].balls++;
            console.log(`❌ Miss - no score`);
        }

        setTimeout(() => this.nextPlayer(), 1500);
    }

    nextPlayer() {
        // Remove ball
        if (this.ball) {
            this.scene.remove(this.ball);
            this.world.removeBody(this.ballBody);
            this.ball = null;
            this.ballBody = null;
        }

        // Move to next player
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.updateInstructions();
    }

    updateInstructions() {
        const instructions = document.getElementById('playerInstructions');
        const currentPlayer = this.players[this.currentPlayerIndex];

        if (instructions) {
            instructions.style.borderColor = currentPlayer.color;
            instructions.innerHTML = `
                <h3 style="margin: 0 0 10px 0; color: ${currentPlayer.color};">${currentPlayer.name}'s Turn</h3>
                <p style="margin: 5px 0;">Hit your putt to roll the ball up the ramp!</p>
                <div style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 5px;">
                    <div style="font-weight: bold; margin-bottom: 5px;">Scoring:</div>
                    <div style="font-size: 0.9em;">🔵 10-30 pts (Blue holes)</div>
                    <div style="font-size: 0.9em;">🔴 20-40 pts (Red holes)</div>
                    <div style="font-size: 0.9em;">🟡 50 pts (Yellow)</div>
                    <div style="font-size: 0.9em;">🟠 100 pts (Gold jackpot!)</div>
                </div>
            `;
        }
    }

    updateScoreboard() {
        const scoreboard = document.getElementById('skeeBallScoreboard');
        if (scoreboard) {
            scoreboard.innerHTML = `
                <h3 style="margin: 0 0 10px 0;">🏆 Scoreboard</h3>
                ${this.players.map(p => `
                    <div style="margin: 8px 0; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 5px; border-left: 4px solid ${p.color};">
                        <div style="font-weight: bold;">${p.name}</div>
                        <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                            <span>Score: <strong>${p.score}</strong></span>
                            <span>Balls: ${p.balls}</span>
                        </div>
                    </div>
                `).join('')}
            `;
        }
    }

    cleanup() {
        this.gameActive = false;

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        const hud = document.getElementById('skeeBallHUD');
        if (hud) hud.remove();

        // Check if we're in Electron
        if (window.location.href.includes('electron-index.html')) {
            // Restore darts UI
            const dataPanels = document.querySelector('.data-panels');
            if (dataPanels) dataPanels.style.display = '';

            const testButtons = document.querySelectorAll('.test-button');
            testButtons.forEach(btn => btn.style.display = '');

            const backButton = document.querySelector('.back-button');
            if (backButton) backButton.style.display = '';

            const fullscreenDropdown = document.getElementById('fullscreenDropdown');
            if (fullscreenDropdown) fullscreenDropdown.style.display = '';

            // Return to menu
            if (typeof backToMenu === 'function') {
                backToMenu();
            }
        } else {
            // Standalone mode - reload page
            location.reload();
        }
    }
}

// Make available globally
window.SkeeBallGame = SkeeBallGame;
window.currentSkeeBallGame = null;
