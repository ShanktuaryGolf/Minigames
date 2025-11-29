// 3D Skee-Ball Putting Game - Clean Implementation with Correct Physics
// Ground plane at Y=0.8 (verified with model inspector)

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
        this.model = null;
        this.rampBodies = [];
        this.rampMeshes = [];
        this.dragController = null;
        this.isDragging = false;
        this.dragPlane = null;
        this.raycaster = null;
        this.mouse = null;

        // Debug ramp settings
        this.rampDebug = {
            startX: 0,
            startY: 0.8,
            startZ: -3.0,
            rotationY: 0, // Yaw rotation (left/right)
            rotationX: 0, // Pitch rotation (tilt up/down)
            rotationZ: 0, // Roll rotation (side tilt)
            enabled: true,
            snapToGrid: false,
            gridSize: 0.1
        };

        // Ramp curve control points (relative offsets from start)
        this.rampControlPoints = [
            { z: 0.0, y: 0.8, angle: 0, name: 'start' },      // Start of ramp (flat)
            { z: -0.5, y: 0.85, angle: 10, name: 'curve1' },    // Begin curve
            { z: -1.0, y: 1.0, angle: 20, name: 'mid' },        // Mid ramp
            { z: -1.5, y: 1.3, angle: 35, name: 'curve2' },     // Steeper section
            { z: -2.0, y: 1.7, angle: 45, name: 'steep' },      // Near vertical
            { z: -2.3, y: 2.1, angle: 60, name: 'end' }         // Backboard approach
        ];

        this.selectedControlPoint = 0;
        this.controlPointMarkers = [];
        this.trajectoryLine = null;
        this.showWireframes = true;
        this.showScoringZones = true;
        this.scoringZoneMeshes = [];
        this.collisionLog = [];

        // Stimp rating and physics calibration
        this.stimpRating = 10; // Default to Stimp 10 (medium speed green)
        this.stimpData = this.initStimpData();
        this.currentFriction = this.calculateFrictionFromStimp(10);

        // Scoring zones
        this.scoringZones = [
            { points: 10, radius: 0.5, color: 0x0000ff },
            { points: 20, radius: 0.4, color: 0xff0000 },
            { points: 30, radius: 0.3, color: 0x0000ff },
            { points: 40, radius: 0.2, color: 0xff0000 },
            { points: 50, radius: 0.15, color: 0xffff00 },
            { points: 100, radius: 0.1, color: 0xffd700 }
        ];
    }

    // Initialize Stimp data from real-world putting green measurements
    initStimpData() {
        return {
            8: {
                // Stimp 8 - Slower green
                speeds: [2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5],
                distances: [2.7, 4.2, 5.7, 7.2, 9.0, 10.8, 12.9, 15.3, 17.4, 19.9, 22.2, 24.9, 27.6, 30.3, 33.0, 36.0, 38.7, 41.7, 45.0, 48.0, 51.3, 54.3, 57.6, 60.9, 64.2, 67.8, 71.1, 74.7, 78.0]
            },
            9: {
                speeds: [2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5],
                distances: [3.0, 4.5, 6.3, 8.1, 10.2, 12.3, 14.7, 17.1, 19.5, 22.2, 24.6, 27.6, 30.3, 33.3, 36.3, 39.6, 42.6, 45.9, 49.2, 52.5, 56.7, 59.1, 62.7, 66.3, 69.9, 73.2, 77.1, 80.7, 84.3]
            },
            10: {
                speeds: [2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5],
                distances: [3.6, 5.1, 7.2, 9.0, 11.4, 13.8, 16.2, 18.6, 21.3, 24.3, 27.0, 30.0, 33.3, 36.3, 39.6, 42.9, 46.2, 49.5, 53.1, 56.4, 60.0, 63.6, 67.2, 71.1, 74.7, 78.6, 82.2, 86.1, 90.0]
            },
            11: {
                speeds: [2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5],
                distances: [3.9, 5.7, 7.8, 9.9, 12.3, 15.0, 17.4, 20.4, 23.1, 26.1, 29.1, 32.4, 35.7, 39.0, 42.3, 45.6, 49.2, 52.8, 56.4, 60.0, 63.6, 67.5, 71.4, 75.0, 78.9, 82.8, 87.0, 90.9, 94.8]
            },
            12: {
                speeds: [2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5],
                distances: [4.5, 6.3, 8.7, 11.1, 13.5, 16.2, 19.2, 22.2, 25.2, 28.5, 31.5, 35.1, 38.4, 42.0, 45.6, 49.2, 52.8, 56.4, 60.3, 64.2, 68.1, 72.0, 75.9, 79.8, 84.0, 87.9, 92.1, 96.3, 100.5]
            },
            13: {
                speeds: [2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5],
                distances: [5.1, 7.2, 9.6, 12.0, 15.0, 17.7, 20.7, 24.0, 27.0, 30.3, 33.9, 37.5, 40.8, 44.7, 48.3, 51.9, 55.8, 59.7, 63.6, 67.5, 71.7, 75.6, 79.8, 84.0, 87.9, 92.7, 96.3, 100.5, 105.0]
            }
        };
    }

    // Calculate friction coefficient from Stimp rating
    // Using physics formula: distance = v² / (2 × μ × g)
    // Where μ is friction coefficient, g is gravity (32.2 ft/s²)
    calculateFrictionFromStimp(stimpRating) {
        const data = this.stimpData[stimpRating];
        if (!data) return 0.03; // Default fallback

        // Use 10 MPH as reference point for calibration
        const refSpeedMph = 10;
        const refSpeedIdx = data.speeds.indexOf(refSpeedMph);
        if (refSpeedIdx === -1) return 0.03;

        const speedFtPerSec = refSpeedMph * 1.467; // Convert MPH to ft/s
        const distanceFt = data.distances[refSpeedIdx];

        // Solve for friction: μ = v² / (2 × g × d)
        const gravity = 32.2; // ft/s²
        const friction = (speedFtPerSec * speedFtPerSec) / (2 * gravity * distanceFt);

        console.log(`📊 Stimp ${stimpRating}: friction = ${friction.toFixed(4)} (${refSpeedMph} MPH → ${distanceFt} ft)`);
        return friction;
    }

    // Calculate expected roll distance for given speed and current Stimp
    calculateRollDistance(speedMph) {
        const data = this.stimpData[this.stimpRating];
        if (!data) return 0;

        // Find closest speed in our data
        let closestIdx = 0;
        let minDiff = Math.abs(data.speeds[0] - speedMph);

        for (let i = 1; i < data.speeds.length; i++) {
            const diff = Math.abs(data.speeds[i] - speedMph);
            if (diff < minDiff) {
                minDiff = diff;
                closestIdx = i;
            }
        }

        // Linear interpolation if between two points
        if (speedMph > data.speeds[closestIdx] && closestIdx < data.speeds.length - 1) {
            const s1 = data.speeds[closestIdx];
            const s2 = data.speeds[closestIdx + 1];
            const d1 = data.distances[closestIdx];
            const d2 = data.distances[closestIdx + 1];
            const ratio = (speedMph - s1) / (s2 - s1);
            return d1 + ratio * (d2 - d1);
        } else if (speedMph < data.speeds[closestIdx] && closestIdx > 0) {
            const s1 = data.speeds[closestIdx - 1];
            const s2 = data.speeds[closestIdx];
            const d1 = data.distances[closestIdx - 1];
            const d2 = data.distances[closestIdx];
            const ratio = (speedMph - s1) / (s2 - s1);
            return d1 + ratio * (d2 - d1);
        }

        return data.distances[closestIdx];
    }

    // Update Stimp rating and recalculate friction
    setStimpRating(rating) {
        this.stimpRating = rating;
        this.currentFriction = this.calculateFrictionFromStimp(rating);

        // Update contact material friction if physics world exists
        if (this.world && this.world.contactmaterials.length > 0) {
            // Find the ball-ground contact material (first one added)
            const ballGroundContact = this.world.contactmaterials[0];
            if (ballGroundContact) {
                ballGroundContact.friction = this.currentFriction;
                console.log(`🎯 Stimp rating set to ${rating}, friction updated to: ${this.currentFriction.toFixed(4)}`);
            }
        } else {
            console.log(`🎯 Stimp rating set to ${rating}, friction: ${this.currentFriction.toFixed(4)} (will apply on world creation)`);
        }
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
                <h2 style="text-align: center; margin-bottom: 30px;">🎱 Skee-Ball Setup</h2>

                <div style="background: rgba(0,0,0,0.3); padding: 30px; border-radius: 15px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0;">Select Number of Players</h3>
                    <div id="playerButtons" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
                        ${[1,2,3,4].map(n => `
                            <button class="player-count-btn" data-count="${n}"
                                    style="padding: 20px; font-size: 1.2em; background: rgba(34, 197, 94, 0.3);
                                           border: 2px solid #22c55e; color: white; border-radius: 8px; cursor: pointer;">
                                ${n} Player${n > 1 ? 's' : ''}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div id="playerNamesSection" style="background: rgba(0,0,0,0.3); padding: 30px;
                                                     border-radius: 15px; display: none;">
                    <h3 style="margin-top: 0;">Enter Player Names</h3>
                    <div id="playerNameInputs"></div>
                </div>
            </div>
        `;

        document.querySelectorAll('.player-count-btn').forEach(btn => {
            btn.onclick = () => this.setPlayerCount(parseInt(btn.dataset.count));
        });
    }

    setPlayerCount(count) {
        this.players = [];
        const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

        for (let i = 0; i < count; i++) {
            this.players.push({
                name: `Player ${i + 1}`,
                score: 0,
                balls: 9,
                color: colors[i]
            });
        }

        this.showPlayerNameInputs();
    }

    showPlayerNameInputs() {
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
        startButton.textContent = 'Start Skee-Ball!';
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
        this.players.forEach((p, i) => {
            const input = document.getElementById(`skeeBallPlayerName${i}`);
            if (input && input.value.trim()) {
                p.name = input.value.trim();
            }
        });

        this.gameActive = true;
        this.setupMode = false;
        this.currentPlayerIndex = 0;

        const gameContent = document.getElementById('gameContent');
        gameContent.innerHTML = '<canvas id="skeeBallCanvas"></canvas>';

        this.setupThreeJS();
        this.setupPhysics();
        this.loadModel();
        this.createHUD();
        this.createDragController();
        this.createControlPointMarkers();
        this.createScoringZoneVisuals();
        this.setupDragControls();
        this.setupKeyboardControls();
        this.createControlsUI();
        this.updateTrajectoryPreview();
        this.animate();
    }

    setupThreeJS() {
        // Scene with brick background
        this.scene = new THREE.Scene();

        const brickCanvas = document.createElement('canvas');
        brickCanvas.width = 512;
        brickCanvas.height = 512;
        const brickCtx = brickCanvas.getContext('2d');

        brickCtx.fillStyle = '#3a1a1a';
        brickCtx.fillRect(0, 0, 512, 512);

        const brickWidth = 64;
        const brickHeight = 32;

        for (let y = 0; y < 512; y += brickHeight) {
            for (let x = 0; x < 512; x += brickWidth) {
                const offset = (y / brickHeight) % 2 === 0 ? 0 : brickWidth / 2;
                brickCtx.fillStyle = '#6b3636';
                brickCtx.fillRect(x + offset, y, brickWidth - 2, brickHeight - 2);

                if (Math.random() > 0.5) {
                    brickCtx.fillStyle = '#5c2e2e';
                    brickCtx.fillRect(x + offset + 2, y + 2, brickWidth - 6, brickHeight - 6);
                }
            }
        }

        const brickTexture = new THREE.CanvasTexture(brickCanvas);
        brickTexture.wrapS = THREE.RepeatWrapping;
        brickTexture.wrapT = THREE.RepeatWrapping;
        brickTexture.repeat.set(4, 4);
        this.scene.background = brickTexture;
        this.scene.fog = new THREE.Fog(0x2a1616, 15, 35);

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
        const canvas = document.getElementById('skeeBallCanvas');
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
        mainLight.position.set(5, 10, 5);
        mainLight.castShadow = true;
        this.scene.add(mainLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
        fillLight.position.set(-5, 5, 5);
        this.scene.add(fillLight);

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

        // Create physics materials
        this.groundMaterial = new CANNON.Material('groundMaterial');
        this.ballMaterial = new CANNON.Material('ballMaterial');
        this.rampMaterial = new CANNON.Material('rampMaterial');

        // Create contact materials with Stimp-based friction
        const ballGroundContact = new CANNON.ContactMaterial(
            this.ballMaterial,
            this.groundMaterial,
            {
                friction: this.currentFriction,
                restitution: 0.3 // Slight bounce
            }
        );
        this.world.addContactMaterial(ballGroundContact);

        const ballRampContact = new CANNON.ContactMaterial(
            this.ballMaterial,
            this.rampMaterial,
            {
                friction: 0.15, // Less friction on ramp for ball to roll up
                restitution: 0.5
            }
        );
        this.world.addContactMaterial(ballRampContact);

        console.log(`✓ Physics materials created (ground friction: ${this.currentFriction.toFixed(4)})`);

        // Ground plane at Y=0.8 (verified with blue test ball)
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({
            mass: 0,
            material: this.groundMaterial
        });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        groundBody.position.set(0, 0.8, 0);
        this.world.addBody(groundBody);

        console.log('✓ Physics ground plane at Y=0.8');

        // Side walls
        const wallHeight = 0.3;
        const wallDepth = 6;

        const leftWallShape = new CANNON.Box(new CANNON.Vec3(0.1, wallHeight, wallDepth));
        const leftWallBody = new CANNON.Body({ mass: 0 });
        leftWallBody.addShape(leftWallShape);
        leftWallBody.position.set(-0.8, wallHeight + 0.8, 0);
        this.world.addBody(leftWallBody);

        const rightWallShape = new CANNON.Box(new CANNON.Vec3(0.1, wallHeight, wallDepth));
        const rightWallBody = new CANNON.Body({ mass: 0 });
        rightWallBody.addShape(rightWallShape);
        rightWallBody.position.set(0.8, wallHeight + 0.8, 0);
        this.world.addBody(rightWallBody);

        console.log('✓ Side walls added');

        this.createRampPhysics();
    }

    createRampPhysics() {
        // Clear existing ramp physics (but keep references to track visibility)
        this.rampBodies.forEach(body => this.world.remove(body));
        this.rampMeshes.forEach(mesh => this.scene.remove(mesh));
        this.rampBodies = [];
        this.rampMeshes = [];

        // Store current wireframe visibility state
        const currentWireframeState = this.showWireframes;

        if (!this.rampDebug.enabled) {
            console.log('✓ Ramp physics disabled');
            return;
        }

        // Use control points for ramp segments
        const rampSegments = this.rampControlPoints.map(cp => ({
            z: this.rampDebug.startZ + cp.z,
            y: cp.y,
            angle: cp.angle
        }));

        for (let i = 0; i < rampSegments.length; i++) {
            const segment = rampSegments[i];
            const rampWidth = 1.4; // Width between the walls
            const segmentLength = 0.5;

            const rampShape = new CANNON.Box(new CANNON.Vec3(rampWidth / 2, 0.05, segmentLength / 2));
            const rampBody = new CANNON.Body({
                mass: 0,
                material: this.rampMaterial
            });
            rampBody.addShape(rampShape);

            // Add metadata to identify this segment
            rampBody.segmentIndex = i;
            rampBody.segmentName = this.rampControlPoints[i].name;

            // Apply rotation to the segment position
            const rotatedPos = this.rotatePoint(
                segment.z - this.rampDebug.startZ,
                segment.y - this.rampDebug.startY,
                0,
                this.rampDebug.rotationY
            );

            rampBody.position.set(
                this.rampDebug.startX + rotatedPos.x,
                this.rampDebug.startY + rotatedPos.y,
                this.rampDebug.startZ + rotatedPos.z
            );

            // Combine ramp segment angle with overall rotation
            const segmentAngleRad = -segment.angle * Math.PI / 180;
            const yawRad = this.rampDebug.rotationY * Math.PI / 180;
            const pitchRad = this.rampDebug.rotationX * Math.PI / 180;
            const rollRad = this.rampDebug.rotationZ * Math.PI / 180;

            // Apply rotations in order: pitch (X), yaw (Y), roll (Z)
            rampBody.quaternion.setFromEuler(segmentAngleRad + pitchRad, yawRad, rollRad);

            this.world.addBody(rampBody);
            this.rampBodies.push(rampBody);

            // Add visual debug box to see the collider
            const debugGeometry = new THREE.BoxGeometry(rampWidth, 0.1, segmentLength);
            const debugMaterial = new THREE.MeshBasicMaterial({
                color: 0xff00ff,
                wireframe: true,
                transparent: true,
                opacity: 0.5
            });
            const debugMesh = new THREE.Mesh(debugGeometry, debugMaterial);
            debugMesh.position.copy(rampBody.position);
            debugMesh.quaternion.copy(rampBody.quaternion);
            debugMesh.visible = currentWireframeState;
            this.scene.add(debugMesh);
            this.rampMeshes.push(debugMesh);
        }

        console.log(`✓ Ramp physics added: X=${this.rampDebug.startX}, Y=${this.rampDebug.startY}, Z=${this.rampDebug.startZ}`);
    }

    rotatePoint(x, y, z, angleY) {
        // Rotate point around Y axis (yaw)
        const rad = angleY * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        return {
            x: x * cos - z * sin,
            y: y,
            z: x * sin + z * cos
        };
    }

    createDragController() {
        // Create a visible sphere that can be dragged to position the ramp
        const controllerGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        const controllerMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.7
        });
        this.dragController = new THREE.Mesh(controllerGeometry, controllerMaterial);
        this.dragController.position.set(
            this.rampDebug.startX,
            this.rampDebug.startY,
            this.rampDebug.startZ
        );
        this.scene.add(this.dragController);

        // Add a label ring around it
        const ringGeometry = new THREE.TorusGeometry(0.2, 0.02, 8, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        this.dragController.add(ring);

        console.log('✓ Drag controller created at ramp start position');
    }

    createControlPointMarkers() {
        // Create visual markers for each control point on the ramp curve
        this.controlPointMarkers = [];

        this.rampControlPoints.forEach((cp, index) => {
            const markerGeometry = new THREE.SphereGeometry(0.1, 16, 16);
            const markerMaterial = new THREE.MeshBasicMaterial({
                color: index === this.selectedControlPoint ? 0xffff00 : 0x00ffff,
                transparent: true,
                opacity: 0.6
            });
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.set(this.rampDebug.startX, cp.y, this.rampDebug.startZ + cp.z);
            marker.userData.controlPointIndex = index;
            this.scene.add(marker);
            this.controlPointMarkers.push(marker);
        });

        console.log('✓ Control point markers created');
    }

    createScoringZoneVisuals() {
        // Clear existing scoring zone meshes
        this.scoringZoneMeshes.forEach(mesh => this.scene.remove(mesh));
        this.scoringZoneMeshes = [];

        const targetZ = -5.5; // Backboard position
        const targetY = 2.0; // Height of scoring zones

        // Create visual rings for each scoring zone (from largest to smallest)
        const reversedZones = [...this.scoringZones].reverse();

        reversedZones.forEach((zone, index) => {
            const ringGeometry = new THREE.RingGeometry(
                index === 0 ? 0 : reversedZones[index - 1].radius, // Inner radius
                zone.radius, // Outer radius
                32
            );

            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ff00, // Green color
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.6,
                wireframe: false
            });

            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.set(0, targetY, targetZ);
            ring.rotation.x = -Math.PI / 2; // Lay flat
            ring.visible = this.showScoringZones;

            this.scene.add(ring);
            this.scoringZoneMeshes.push(ring);

            // Add a wireframe outline for the zone
            const outlineGeometry = new THREE.RingGeometry(zone.radius - 0.01, zone.radius, 32);
            const outlineMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 1.0,
                wireframe: false
            });
            const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
            outline.position.set(0, targetY + 0.02, targetZ);
            outline.rotation.x = -Math.PI / 2;
            outline.visible = this.showScoringZones;

            this.scene.add(outline);
            this.scoringZoneMeshes.push(outline);
        });

        console.log('✓ Scoring zone visuals created');
    }

    updateControlPointMarkers() {
        this.controlPointMarkers.forEach((marker, index) => {
            const cp = this.rampControlPoints[index];

            // Apply rotation to marker position
            const rotatedPos = this.rotatePoint(
                cp.z,
                cp.y - this.rampDebug.startY,
                0,
                this.rampDebug.rotationY
            );

            marker.position.set(
                this.rampDebug.startX + rotatedPos.x,
                this.rampDebug.startY + rotatedPos.y,
                this.rampDebug.startZ + rotatedPos.z
            );

            const isSelected = index === this.selectedControlPoint;
            marker.material.color.set(isSelected ? 0xffff00 : 0x00ffff);
            marker.material.opacity = isSelected ? 1.0 : 0.6;
        });
    }

    setupDragControls() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.draggedObject = null;

        const canvas = document.getElementById('skeeBallCanvas');

        canvas.addEventListener('mousedown', (event) => {
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);

            // Check for control point markers
            const markerIntersects = this.raycaster.intersectObjects(this.controlPointMarkers);
            if (markerIntersects.length > 0) {
                this.isDragging = true;
                this.draggedObject = markerIntersects[0].object;
                this.selectedControlPoint = this.draggedObject.userData.controlPointIndex;
                canvas.style.cursor = 'grabbing';

                // Create invisible plane for dragging
                const planeGeometry = new THREE.PlaneGeometry(20, 20);
                const planeMaterial = new THREE.MeshBasicMaterial({ visible: false });
                this.dragPlane = new THREE.Mesh(planeGeometry, planeMaterial);
                this.dragPlane.position.copy(this.draggedObject.position);
                this.dragPlane.lookAt(this.camera.position);
                this.scene.add(this.dragPlane);

                this.updateControlPointMarkers();
                return;
            }

            // Check for main controller
            const controllerIntersects = this.raycaster.intersectObject(this.dragController);
            if (controllerIntersects.length > 0) {
                this.isDragging = true;
                this.draggedObject = this.dragController;
                canvas.style.cursor = 'grabbing';

                const planeGeometry = new THREE.PlaneGeometry(20, 20);
                const planeMaterial = new THREE.MeshBasicMaterial({ visible: false });
                this.dragPlane = new THREE.Mesh(planeGeometry, planeMaterial);
                this.dragPlane.position.copy(this.dragController.position);
                this.dragPlane.lookAt(this.camera.position);
                this.scene.add(this.dragPlane);
            }
        });

        canvas.addEventListener('mousemove', (event) => {
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            // Highlight objects on hover
            if (!this.isDragging) {
                this.raycaster.setFromCamera(this.mouse, this.camera);
                const markerIntersects = this.raycaster.intersectObjects(this.controlPointMarkers);
                const controllerIntersects = this.raycaster.intersectObject(this.dragController);

                if (markerIntersects.length > 0 || controllerIntersects.length > 0) {
                    canvas.style.cursor = 'grab';
                    if (controllerIntersects.length > 0) {
                        this.dragController.material.opacity = 1.0;
                    }
                } else {
                    canvas.style.cursor = 'default';
                    this.dragController.material.opacity = 0.7;
                }
            }

            if (this.isDragging && this.dragPlane) {
                this.raycaster.setFromCamera(this.mouse, this.camera);
                const intersects = this.raycaster.intersectObject(this.dragPlane);

                if (intersects.length > 0) {
                    let point = intersects[0].point.clone();

                    // Apply snap to grid if enabled
                    if (this.rampDebug.snapToGrid) {
                        point.x = Math.round(point.x / this.rampDebug.gridSize) * this.rampDebug.gridSize;
                        point.y = Math.round(point.y / this.rampDebug.gridSize) * this.rampDebug.gridSize;
                        point.z = Math.round(point.z / this.rampDebug.gridSize) * this.rampDebug.gridSize;
                    }

                    if (this.draggedObject === this.dragController) {
                        // Moving main controller (entire ramp)
                        this.dragController.position.copy(point);
                        this.rampDebug.startX = point.x;
                        this.rampDebug.startY = point.y;
                        this.rampDebug.startZ = point.z;
                        this.updateControlPointMarkers();
                    } else {
                        // Moving individual control point
                        const cpIndex = this.draggedObject.userData.controlPointIndex;
                        this.rampControlPoints[cpIndex].y = point.y;
                        this.rampControlPoints[cpIndex].z = point.z - this.rampDebug.startZ;
                        this.draggedObject.position.copy(point);
                    }

                    this.createRampPhysics();
                    this.updateTrajectoryPreview();
                }
            }
        });

        canvas.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.draggedObject = null;
                canvas.style.cursor = 'default';

                if (this.dragPlane) {
                    this.scene.remove(this.dragPlane);
                    this.dragPlane = null;
                }

                console.log(`✓ Position updated`);
            }
        });

        console.log('✓ Drag controls enabled');
    }

    setupKeyboardControls() {
        const moveSpeed = 0.05;
        const fineSpeed = 0.01;

        document.addEventListener('keydown', (event) => {
            if (!this.gameActive) return;

            const speed = event.shiftKey ? fineSpeed : moveSpeed;
            const cp = this.rampControlPoints[this.selectedControlPoint];

            switch(event.key) {
                case 'ArrowUp':
                    event.preventDefault();
                    cp.y += speed;
                    this.updateControlPointMarkers();
                    this.createRampPhysics();
                    this.updateTrajectoryPreview();
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    cp.y -= speed;
                    this.updateControlPointMarkers();
                    this.createRampPhysics();
                    this.updateTrajectoryPreview();
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    cp.z -= speed;
                    this.updateControlPointMarkers();
                    this.createRampPhysics();
                    this.updateTrajectoryPreview();
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    cp.z += speed;
                    this.updateControlPointMarkers();
                    this.createRampPhysics();
                    this.updateTrajectoryPreview();
                    break;
                case 'w':
                case 'W':
                    this.rampDebug.startZ -= speed;
                    this.dragController.position.z = this.rampDebug.startZ;
                    this.updateControlPointMarkers();
                    this.createRampPhysics();
                    this.updateTrajectoryPreview();
                    break;
                case 's':
                case 'S':
                    this.rampDebug.startZ += speed;
                    this.dragController.position.z = this.rampDebug.startZ;
                    this.updateControlPointMarkers();
                    this.createRampPhysics();
                    this.updateTrajectoryPreview();
                    break;
                case 'a':
                case 'A':
                    this.rampDebug.startX -= speed;
                    this.dragController.position.x = this.rampDebug.startX;
                    this.updateControlPointMarkers();
                    this.createRampPhysics();
                    this.updateTrajectoryPreview();
                    break;
                case 'd':
                case 'D':
                    this.rampDebug.startX += speed;
                    this.dragController.position.x = this.rampDebug.startX;
                    this.updateControlPointMarkers();
                    this.createRampPhysics();
                    this.updateTrajectoryPreview();
                    break;
                case 'q':
                case 'Q':
                    this.rampDebug.startY += speed;
                    this.dragController.position.y = this.rampDebug.startY;
                    this.updateControlPointMarkers();
                    this.createRampPhysics();
                    this.updateTrajectoryPreview();
                    break;
                case 'e':
                case 'E':
                    this.rampDebug.startY -= speed;
                    this.dragController.position.y = this.rampDebug.startY;
                    this.updateControlPointMarkers();
                    this.createRampPhysics();
                    this.updateTrajectoryPreview();
                    break;
                case 'Tab':
                    event.preventDefault();
                    this.selectedControlPoint = (this.selectedControlPoint + 1) % this.rampControlPoints.length;
                    this.updateControlPointMarkers();
                    this.updateControlsUI();
                    break;
                case 'g':
                case 'G':
                    this.rampDebug.snapToGrid = !this.rampDebug.snapToGrid;
                    this.updateControlsUI();
                    console.log(`Snap to grid: ${this.rampDebug.snapToGrid ? 'ON' : 'OFF'}`);
                    break;
                case 'r':
                case 'R':
                    this.rampDebug.rotationY += event.shiftKey ? 1 : 5;
                    this.updateControlPointMarkers();
                    this.createRampPhysics();
                    this.updateTrajectoryPreview();
                    this.updateControlsUI();
                    break;
                case 'f':
                case 'F':
                    this.rampDebug.rotationY -= event.shiftKey ? 1 : 5;
                    this.updateControlPointMarkers();
                    this.createRampPhysics();
                    this.updateTrajectoryPreview();
                    this.updateControlsUI();
                    break;
                case 't':
                case 'T':
                    this.rampDebug.rotationX += event.shiftKey ? 1 : 5;
                    this.updateControlPointMarkers();
                    this.createRampPhysics();
                    this.updateTrajectoryPreview();
                    this.updateControlsUI();
                    break;
                case 'y':
                case 'Y':
                    this.rampDebug.rotationZ += event.shiftKey ? 1 : 5;
                    this.updateControlPointMarkers();
                    this.createRampPhysics();
                    this.updateTrajectoryPreview();
                    this.updateControlsUI();
                    break;
                case 'h':
                case 'H':
                    this.rampDebug.rotationZ -= event.shiftKey ? 1 : 5;
                    this.updateControlPointMarkers();
                    this.createRampPhysics();
                    this.updateTrajectoryPreview();
                    this.updateControlsUI();
                    break;
                case 'v':
                case 'V':
                    this.showWireframes = !this.showWireframes;
                    this.rampMeshes.forEach(mesh => mesh.visible = this.showWireframes);
                    console.log(`Wireframes: ${this.showWireframes ? 'ON' : 'OFF'}`);
                    break;
                case 'b':
                case 'B':
                    this.showScoringZones = !this.showScoringZones;
                    this.scoringZoneMeshes.forEach(mesh => mesh.visible = this.showScoringZones);
                    console.log(`Scoring zones: ${this.showScoringZones ? 'ON' : 'OFF'}`);
                    break;
            }
        });

        console.log('✓ Keyboard controls enabled');
    }

    createControlsUI() {
        const controlsDiv = document.createElement('div');
        controlsDiv.id = 'rampControls';
        controlsDiv.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 20px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 15px;
            border-radius: 10px;
            font-family: monospace;
            font-size: 0.85em;
            z-index: 1000;
            pointer-events: auto;
            max-width: 500px;
        `;

        controlsDiv.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold; font-size: 1.1em;">🎮 Ramp Controls</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 10px;">
                <div>WASD: Move ramp</div>
                <div>Q/E: Raise/Lower</div>
                <div>Arrows: Move point</div>
                <div>Shift: Fine control</div>
                <div>Tab: Next point</div>
                <div>G: Toggle grid</div>
                <div>R/F: Rotate yaw</div>
                <div>T/G: Rotate pitch</div>
                <div>Y/H: Rotate roll</div>
                <div>V: Toggle wireframes</div>
                <div>B: Toggle zones</div>
            </div>
            <div style="margin-top: 10px; padding: 10px; background: rgba(255,255,0,0.1); border-radius: 5px; font-size: 0.85em;">
                <strong>Collision Debug:</strong><br>
                Watch console & HUD for ball collisions with ramp segments
            </div>
            <div id="controlPointInfo" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #666;">
            </div>
            <div id="rotationControls" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #666;">
                <strong>Rotation (R/F for Yaw)</strong>
            </div>
            <div style="margin-top: 10px; display: flex; gap: 10px;">
                <button id="saveRampBtn" style="flex: 1; padding: 8px; background: #22c55e; border: none;
                                                  border-radius: 5px; color: white; cursor: pointer; font-weight: bold;">
                    💾 Save
                </button>
                <button id="loadRampBtn" style="flex: 1; padding: 8px; background: #3b82f6; border: none;
                                                  border-radius: 5px; color: white; cursor: pointer; font-weight: bold;">
                    📂 Load
                </button>
                <button id="resetRampBtn" style="flex: 1; padding: 8px; background: #ef4444; border: none;
                                                   border-radius: 5px; color: white; cursor: pointer; font-weight: bold;">
                    🔄 Reset
                </button>
            </div>
        `;

        document.body.appendChild(controlsDiv);

        // Button handlers
        document.getElementById('saveRampBtn').onclick = () => this.saveRampPosition();
        document.getElementById('loadRampBtn').onclick = () => this.loadRampPosition();
        document.getElementById('resetRampBtn').onclick = () => this.resetRampPosition();

        this.updateControlsUI();
        console.log('✓ Controls UI created');
    }

    updateControlsUI() {
        const infoDiv = document.getElementById('controlPointInfo');
        if (!infoDiv) return;

        const cp = this.rampControlPoints[this.selectedControlPoint];
        infoDiv.innerHTML = `
            <div><strong>Selected:</strong> ${cp.name} (${this.selectedControlPoint + 1}/${this.rampControlPoints.length})</div>
            <div><strong>Position:</strong> Y=${cp.y.toFixed(2)}, Z=${cp.z.toFixed(2)}</div>
            <div><strong>Grid Snap:</strong> ${this.rampDebug.snapToGrid ? '✓ ON' : '✗ OFF'} (${this.rampDebug.gridSize}m)</div>
        `;

        const rotationDiv = document.getElementById('rotationControls');
        if (rotationDiv) {
            rotationDiv.innerHTML = `
                <strong>Rotation</strong>
                <div style="margin-top: 5px;">Yaw: ${this.rampDebug.rotationY.toFixed(1)}° (R/F)</div>
                <div>Pitch: ${this.rampDebug.rotationX.toFixed(1)}° (T/G)</div>
                <div>Roll: ${this.rampDebug.rotationZ.toFixed(1)}° (Y/H)</div>
            `;
        }
    }

    saveRampPosition() {
        const rampData = {
            startX: this.rampDebug.startX,
            startY: this.rampDebug.startY,
            startZ: this.rampDebug.startZ,
            rotationY: this.rampDebug.rotationY,
            rotationX: this.rampDebug.rotationX,
            rotationZ: this.rampDebug.rotationZ,
            controlPoints: this.rampControlPoints.map(cp => ({ ...cp }))
        };

        localStorage.setItem('skeeball_ramp_position', JSON.stringify(rampData));
        console.log('✓ Ramp position saved');

        // Visual feedback
        const btn = document.getElementById('saveRampBtn');
        const originalText = btn.textContent;
        btn.textContent = '✓ Saved!';
        btn.style.background = '#16a34a';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '#22c55e';
        }, 1000);
    }

    loadRampPosition() {
        const savedData = localStorage.getItem('skeeball_ramp_position');
        if (!savedData) {
            console.log('No saved ramp position found');
            return;
        }

        const rampData = JSON.parse(savedData);
        this.rampDebug.startX = rampData.startX;
        this.rampDebug.startY = rampData.startY;
        this.rampDebug.startZ = rampData.startZ;
        this.rampDebug.rotationY = rampData.rotationY || 0;
        this.rampDebug.rotationX = rampData.rotationX || 0;
        this.rampDebug.rotationZ = rampData.rotationZ || 0;
        this.rampControlPoints = rampData.controlPoints.map(cp => ({ ...cp }));

        // Update visuals
        this.dragController.position.set(
            this.rampDebug.startX,
            this.rampDebug.startY,
            this.rampDebug.startZ
        );
        this.updateControlPointMarkers();
        this.createRampPhysics();
        this.updateTrajectoryPreview();
        this.updateControlsUI();

        console.log('✓ Ramp position loaded');

        // Visual feedback
        const btn = document.getElementById('loadRampBtn');
        const originalText = btn.textContent;
        btn.textContent = '✓ Loaded!';
        btn.style.background = '#2563eb';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '#3b82f6';
        }, 1000);
    }

    resetRampPosition() {
        this.rampDebug.startX = 0;
        this.rampDebug.startY = 0.8;
        this.rampDebug.startZ = -3.0;
        this.rampDebug.rotationY = 0;
        this.rampDebug.rotationX = 0;
        this.rampDebug.rotationZ = 0;

        this.rampControlPoints = [
            { z: 0.0, y: 0.8, angle: 0, name: 'start' },
            { z: -0.5, y: 0.85, angle: 10, name: 'curve1' },
            { z: -1.0, y: 1.0, angle: 20, name: 'mid' },
            { z: -1.5, y: 1.3, angle: 35, name: 'curve2' },
            { z: -2.0, y: 1.7, angle: 45, name: 'steep' },
            { z: -2.3, y: 2.1, angle: 60, name: 'end' }
        ];

        this.dragController.position.set(
            this.rampDebug.startX,
            this.rampDebug.startY,
            this.rampDebug.startZ
        );
        this.updateControlPointMarkers();
        this.createRampPhysics();
        this.updateTrajectoryPreview();
        this.updateControlsUI();

        console.log('✓ Ramp position reset to default');
    }

    updateTrajectoryPreview() {
        // Remove old trajectory line
        if (this.trajectoryLine) {
            this.scene.remove(this.trajectoryLine);
        }

        // Create a simple trajectory preview showing the ramp path
        const points = [];
        this.rampControlPoints.forEach(cp => {
            const rotatedPos = this.rotatePoint(
                cp.z,
                cp.y - this.rampDebug.startY,
                0,
                this.rampDebug.rotationY
            );

            points.push(new THREE.Vector3(
                this.rampDebug.startX + rotatedPos.x,
                this.rampDebug.startY + rotatedPos.y,
                this.rampDebug.startZ + rotatedPos.z
            ));
        });

        const curve = new THREE.CatmullRomCurve3(points);
        const curvePoints = curve.getPoints(50);

        const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
        const material = new THREE.LineBasicMaterial({
            color: 0xffff00,
            linewidth: 2,
            transparent: true,
            opacity: 0.6
        });

        this.trajectoryLine = new THREE.Line(geometry, material);
        this.scene.add(this.trajectoryLine);
    }

    loadModel() {
        const loader = new THREE.GLTFLoader();
        loader.load(
            './skeeball_model.glb',
            (gltf) => {
                this.model = gltf.scene;
                this.model.scale.set(3, 3, 3);
                this.model.position.set(0, 0, 0);
                this.scene.add(this.model);
                console.log('✓ Skee-ball model loaded');
            },
            (progress) => {
                console.log('Loading model:', (progress.loaded / progress.total * 100).toFixed(1) + '%');
            },
            (error) => {
                console.error('Error loading model:', error);
            }
        );
    }

    createHUD() {
        const hud = document.createElement('div');
        hud.id = 'skeeBallHUD';
        hud.style.cssText = `
            position: absolute; top: 20px; left: 20px; right: 20px;
            color: white; font-family: Arial, sans-serif; z-index: 1000;
            pointer-events: none;
        `;

        hud.innerHTML = `
            <div style="background: rgba(0,0,0,0.7); padding: 20px; border-radius: 10px;">
                <div id="currentPlayer" style="font-size: 1.5em; margin-bottom: 10px;"></div>
                <div id="scoreDisplay" style="font-size: 1.2em;"></div>
            </div>
            <div id="scoreboard" style="position: absolute; top: 20px; right: 20px;
                                        background: rgba(0,0,0,0.7); padding: 15px; border-radius: 10px;">
                <h3 style="margin: 0 0 10px 0;">Scoreboard</h3>
                <div id="scoreboardContent"></div>
            </div>
            <div id="rollCalculator" style="position: absolute; bottom: 20px; left: 20px;
                                           background: rgba(0,0,0,0.8); padding: 15px; border-radius: 10px;
                                           font-size: 0.9em;">
                <h4 style="margin: 0 0 10px 0; color: #22c55e;">Roll Distance Calculator</h4>
                <div id="calculatorContent" style="color: #aaa;">Stimp ${this.stimpRating} Green</div>
            </div>
        `;

        document.body.appendChild(hud);
        this.updateHUD();
    }

    updateHUD() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        document.getElementById('currentPlayer').innerHTML =
            `<span style="color: ${currentPlayer.color}">${currentPlayer.name}</span>`;

        const collisionInfo = this.collisionLog.length > 0
            ? `<div style="font-size: 0.9em; margin-top: 5px; color: #ffff00;">Collisions: ${this.collisionLog.join(' → ')}</div>`
            : '';

        document.getElementById('scoreDisplay').innerHTML =
            `Score: ${currentPlayer.score} | Balls: ${currentPlayer.balls}${collisionInfo}`;

        document.getElementById('scoreboardContent').innerHTML = this.players.map(p =>
            `<div style="margin: 5px 0; color: ${p.color};">${p.name}: ${p.score}</div>`
        ).join('');
    }

    updateRollCalculator(ballSpeedMph) {
        const calculatorDiv = document.getElementById('calculatorContent');
        if (!calculatorDiv) return;

        const expectedDistance = this.calculateRollDistance(ballSpeedMph);
        const expectedDistanceMeters = (expectedDistance * 0.3048).toFixed(2); // Convert feet to meters

        calculatorDiv.innerHTML = `
            <div style="margin-bottom: 5px; color: #fff;">
                <strong>Ball Speed:</strong> ${ballSpeedMph.toFixed(1)} MPH
            </div>
            <div style="margin-bottom: 5px; color: #22c55e;">
                <strong>Expected Roll:</strong> ${expectedDistance.toFixed(1)} ft (${expectedDistanceMeters} m)
            </div>
            <div style="color: #aaa; font-size: 0.85em;">
                Stimp ${this.stimpRating} Green (μ=${this.currentFriction.toFixed(4)})
            </div>
        `;
    }

    handleShot(shotData) {
        if (!this.gameActive) return;

        const { Speed, HLA, VLA } = shotData.BallData;

        console.log('Shot received:', { Speed, HLA, VLA });

        // Update roll calculator with shot speed
        this.updateRollCalculator(Speed);

        // Convert speed from mph to m/s
        const speedMps = Speed * 0.44704;

        // Calculate velocity components
        const velocityX = speedMps * Math.sin(HLA * Math.PI / 180);
        const velocityZ = -speedMps * Math.cos(VLA * Math.PI / 180);
        const velocityY = 0;

        this.createBall(velocityX, velocityY, velocityZ);
    }

    createBall(vx, vy, vz) {
        // Remove old ball
        if (this.ball) {
            this.scene.remove(this.ball);
            this.world.remove(this.ballBody);
        }

        // Ball size: 3.25 inches diameter = 0.08255 meters radius
        const ballRadius = 0.04;

        // Visual ball
        const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
        const ballMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.6,
            metalness: 0.1
        });
        this.ball = new THREE.Mesh(ballGeometry, ballMaterial);
        this.scene.add(this.ball);

        // Physics ball
        const ballShape = new CANNON.Sphere(ballRadius);
        this.ballBody = new CANNON.Body({
            mass: 0.045, // kg
            shape: ballShape,
            material: this.ballMaterial,
            linearDamping: 0.1, // Reduced air resistance for more realistic roll
            angularDamping: 0.1
        });

        // Clear collision log for new ball
        this.collisionLog = [];

        // Add collision event listener
        this.ballBody.addEventListener('collide', (event) => {
            const otherBody = event.body;

            // Check if it's a ramp segment
            if (otherBody.segmentName) {
                const segmentInfo = `Segment ${otherBody.segmentIndex}: ${otherBody.segmentName}`;

                // Only log if this segment hasn't been hit yet
                if (!this.collisionLog.includes(segmentInfo)) {
                    this.collisionLog.push(segmentInfo);
                    console.log(`🔴 Ball collision: ${segmentInfo}`);

                    // Flash the corresponding wireframe
                    this.flashWireframe(otherBody.segmentIndex);
                }
            } else if (otherBody === this.world.bodies[0]) {
                // Ground collision
                if (!this.collisionLog.includes('Ground')) {
                    this.collisionLog.push('Ground');
                    console.log('🔴 Ball collision: Ground');
                }
            } else {
                // Wall or other collision
                const wallInfo = 'Wall/Other';
                if (!this.collisionLog.includes(wallInfo)) {
                    this.collisionLog.push(wallInfo);
                    console.log('🔴 Ball collision: Wall/Other');
                }
            }
        });

        // Start position: slightly above ground plane, at player's end
        this.ballBody.position.set(0, 0.84, 5);
        this.ballBody.velocity.set(vx, vy, vz);
        this.world.addBody(this.ballBody);

        console.log('Ball created at Y=0.84, velocity:', { vx, vy, vz });
    }

    flashWireframe(segmentIndex) {
        // Flash the wireframe of the collided segment
        if (segmentIndex >= 0 && segmentIndex < this.rampMeshes.length) {
            const mesh = this.rampMeshes[segmentIndex];
            const originalColor = mesh.material.color.getHex();

            // Change to bright yellow
            mesh.material.color.setHex(0xffff00);
            mesh.material.opacity = 1.0;

            // Change back after 500ms
            setTimeout(() => {
                mesh.material.color.setHex(originalColor);
                mesh.material.opacity = 0.5;
            }, 500);
        }
    }

    animate() {
        if (!this.gameActive) return;

        this.animationId = requestAnimationFrame(() => this.animate());

        // Update physics
        if (this.world) {
            this.world.step(1/60);
        }

        // Sync visual ball with physics
        if (this.ball && this.ballBody) {
            this.ball.position.copy(this.ballBody.position);
            this.ball.quaternion.copy(this.ballBody.quaternion);

            // Debug: Log ball position periodically
            if (!this.lastLogTime || Date.now() - this.lastLogTime > 500) {
                console.log(`Ball position: Y=${this.ballBody.position.y.toFixed(2)}, Z=${this.ballBody.position.z.toFixed(2)}, velocity=${this.ballBody.velocity.length().toFixed(2)}`);
                this.lastLogTime = Date.now();
            }

            // Check for scoring when ball reaches backboard area
            if (this.ballBody.position.z < -4 && !this.ballBody.scored) {
                this.checkScoring();
                this.ballBody.scored = true;

                // Log collision summary
                console.log('📋 Collision Summary:', this.collisionLog.length > 0 ? this.collisionLog.join(' → ') : 'No collisions detected');
            }

            // Remove ball if it goes too far or stops moving
            const speed = this.ballBody.velocity.length();
            if (!this.ballBody.removing && (this.ballBody.position.z < -8 || (speed < 0.1 && this.ballBody.position.z < 0))) {
                this.ballBody.removing = true; // Prevent multiple removals
                setTimeout(() => {
                    this.removeBall();
                    this.nextPlayer();
                }, 1000);
            }
        }

        // Render
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    checkScoring() {
        const ballPos = this.ballBody.position;
        const ballX = ballPos.x;
        const ballZ = ballPos.z;
        const ballY = ballPos.y;

        // Calculate distance from center of backboard scoring area
        const targetZ = -5.5; // Backboard position
        const targetY = 2.0; // Height of scoring zones

        // Check if ball is at the right height (within scoring zone vertical range)
        if (Math.abs(ballY - targetY) > 0.5) {
            console.log(`Ball at wrong height: Y=${ballY.toFixed(2)}, expected ~${targetY}`);
            return;
        }

        const distanceFromCenter = Math.sqrt(ballX * ballX + (ballZ - targetZ) * (ballZ - targetZ));

        console.log(`Ball position: X=${ballX.toFixed(2)}, Y=${ballY.toFixed(2)}, Z=${ballZ.toFixed(2)}`);
        console.log(`Distance from center: ${distanceFromCenter.toFixed(2)}m`);

        // Check which scoring zone the ball landed in
        let scored = false;
        for (const zone of this.scoringZones) {
            if (distanceFromCenter <= zone.radius) {
                this.addScore(zone.points);
                console.log(`🎯 Scored ${zone.points} points! (within ${zone.radius}m radius)`);
                scored = true;
                break;
            }
        }

        if (!scored) {
            console.log(`❌ No score - distance ${distanceFromCenter.toFixed(2)}m > smallest zone ${this.scoringZones[this.scoringZones.length - 1].radius}m`);
        }
    }

    addScore(points) {
        const currentPlayer = this.players[this.currentPlayerIndex];
        currentPlayer.score += points;
        this.updateHUD();

        // Show score popup
        this.showScorePopup(points);
    }

    showScorePopup(points) {
        const popup = document.createElement('div');
        popup.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 4em;
            font-weight: bold;
            color: ${points >= 50 ? '#ffd700' : '#ffffff'};
            text-shadow: 0 0 20px rgba(255,255,255,0.8);
            z-index: 2000;
            pointer-events: none;
            animation: scorePopup 1s ease-out;
        `;
        popup.textContent = `+${points}`;
        document.body.appendChild(popup);

        setTimeout(() => popup.remove(), 1000);
    }

    removeBall() {
        if (this.ball) {
            this.scene.remove(this.ball);
            this.ball = null;
        }
        if (this.ballBody) {
            this.world.remove(this.ballBody);
            this.ballBody = null;
        }
    }

    nextPlayer() {
        // Safety check
        if (!this.gameActive || !this.players || this.players.length === 0) {
            return;
        }

        const currentPlayer = this.players[this.currentPlayerIndex];
        if (!currentPlayer) {
            console.error('No current player found');
            return;
        }

        currentPlayer.balls--;

        if (currentPlayer.balls <= 0) {
            // Move to next player
            this.currentPlayerIndex++;
            if (this.currentPlayerIndex >= this.players.length) {
                // Game over
                this.endGame();
                return;
            }
        }

        this.updateHUD();
    }

    endGame() {
        this.gameActive = false;

        // Sort players by score
        const sortedPlayers = [...this.players].sort((a, b) => b.score - a.score);

        const endScreen = document.createElement('div');
        endScreen.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.9);
            padding: 40px;
            border-radius: 20px;
            border: 3px solid #ffd700;
            z-index: 3000;
            text-align: center;
            color: white;
        `;

        endScreen.innerHTML = `
            <h2 style="margin: 0 0 20px 0; font-size: 2.5em;">Game Over!</h2>
            <h3 style="margin: 0 0 30px 0; color: #ffd700;">Winner: ${sortedPlayers[0].name}</h3>
            <div style="margin-bottom: 30px;">
                ${sortedPlayers.map((p, i) => `
                    <div style="margin: 10px 0; font-size: 1.3em;">
                        ${i + 1}. <span style="color: ${p.color}">${p.name}</span>: ${p.score} points
                    </div>
                `).join('')}
            </div>
            <button id="playAgainBtn" style="padding: 15px 40px; font-size: 1.2em; background: #22c55e;
                                             border: none; border-radius: 8px; color: white; cursor: pointer;">
                Play Again
            </button>
        `;

        document.body.appendChild(endScreen);

        document.getElementById('playAgainBtn').onclick = () => {
            endScreen.remove();
            this.cleanup();
            this.init();
        };
    }

    cleanup() {
        this.gameActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.renderer) {
            this.renderer.dispose();
        }
        const hud = document.getElementById('skeeBallHUD');
        if (hud) hud.remove();

        const controls = document.getElementById('rampControls');
        if (controls) controls.remove();

        // Clean up scoring zone meshes
        this.scoringZoneMeshes.forEach(mesh => this.scene.remove(mesh));
        this.scoringZoneMeshes = [];
    }
}
