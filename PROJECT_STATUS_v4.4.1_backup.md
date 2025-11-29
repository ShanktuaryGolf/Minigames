# Shanktuary Golf Mini Games - Project Status

**Date:** November 19, 2025
**Version:** 4.4.1
**Status:** ✅ Production Ready
**Location:** `/home/shreen/minigames/web/`

---

## 📋 Recent Updates (November 19, 2025)

### Version 4.4.1 (Current)
**Date:** 2025-11-19

#### Changes in this version:

**Ball Flight Physics - Critical Low-Speed Bug Fixes** 🐛⛳

- **FIXED: Infinite Roll Bug on Low-Speed Shots**
  - Bug reported: Shots <55 mph with low VLA were rolling forever
  - Root cause: Friction multiplier of 0.001 was nearly zero for soft landings
  - Fixed minimum `baseLandingSpeedFactor` from 0.001 → 0.42 (420x increase)
  - Low-speed shots now stop within realistic distances
  - Location: golf-par3.html:2438

- **Low-Speed Drag Coefficient Calibration (<55 mph)**
  - Increased Cd from 0.70 → 0.85 for chips/putts
  - Low-speed shots need higher drag due to different Reynolds number regime
  - Test case: 55 mph, 5° VLA, 1200 RPM
    - Target: 14.4 carry + 23.1 roll = 37.5 total
    - Result: 13.3 carry + 25.2 roll = 38.5 total ✓ (within 2.5 yards)
  - Location: golf-par3.html:2107

- **Magnus Lift Reduction for Low Speeds**
  - Added speed-dependent Magnus lift scaling for shots <60 mph
  - At low speeds, even modest spin creates excessive lift due to high spin-to-speed ratio
  - Lift coefficient scales from 30% (0 mph) to 100% (60 mph)
  - Prevents low-speed chips from staying airborne too long
  - Location: golf-par3.html:2160-2166

- **Low-Spin Friction Adjustments (1000-2000 RPM)**
  - Increased `spinFrictionMultiplier` for very low spin shots:
    - 1000-1500 RPM: 1.05-1.2 (was 0.7)
    - 1500-2000 RPM: 0.95-1.0 (was 0.7-1.0)
  - Low spin shots now have realistic friction (ball doesn't grip turf, more tumbling)
  - Prevents excessive roll on low-spin chips
  - Location: golf-par3.html:2418-2426

- **Debug Shot Controls Enabled**
  - Added demo shot panel for testing physics (press 'D' key)
  - Adjustable parameters: ball speed, VLA, HLA, total spin, spin axis
  - Pre-configured with bug reproduction values (55 mph, 5° VLA, 1200 RPM)
  - Enables rapid physics validation against FlightScope data
  - Location: golf-par3.html:208-221, 623-641

- **Why This Matters**
  - Low-speed shots (chips, pitches, bump-and-runs) now behave realistically
  - Ball stops within expected distances instead of rolling forever
  - Physics accurate across full speed range (55-150 mph)
  - Game now playable for all shot types, not just full swings

---

### Version 4.4.0
**Date:** 2025-11-17

#### Changes in this version:

**Ball Flight Physics - FlightScope Calibration to 8/10 Tests Passing** ⛳

- **Tuned Drag Coefficients (Cd) for Realistic Carry Distances**
  - Reduced low speed drag: 0.70 at 55 mph (was 0.72)
  - Optimized 55-75 mph transition: 0.70 → 0.31 (smoother curve)
  - Adjusted mid-speed range: 0.31 at 75 mph, 0.22 at 100 mph
  - Fine-tuned high speeds: 0.17 at 126 mph, 0.10 at 150+ mph
  - **Result: 8/10 FlightScope tests now passing (within ±3 yard tolerance)**
  - Average carry error reduced to 4.3 yards (was 15+ yards)
  - Location: golf-par3.html:2097-2113, test-physics.js:130-146

- **Updated Bounce Physics for Realistic Roll-Out**
  - Increased base bounce factors across all speeds:
    - 30 mph: 0.80 (was 0.50)
    - 60 mph: 0.45 (was 0.30)
    - 80+ mph: 0.35 (was 0.22)
  - Enhanced spin adjustment for high-spin shots:
    - 5500+ RPM: -0.70 adjustment (was -0.45) - very high spin kills roll
    - 4000-5000 RPM: -0.25 to -0.55 (graduated adjustment)
    - 2000-3000 RPM: +0.0 to +0.30 (low spin promotes roll)
  - More realistic check-up on high-spin wedge shots
  - Location: golf-par3.html:2295-2334

- **Refined Roll Friction Multipliers**
  - Reduced friction for high-spin shots (better roll accuracy):
    - 5500+ RPM: 63.0 multiplier (was 120.0)
    - 5000 RPM: 40.0 multiplier (was 90.0)
    - 4000 RPM: 20.0 multiplier (was 35.0)
  - Added 2500 RPM threshold: 2.0 multiplier
  - Added 1500 RPM threshold: 0.7 multiplier (low spin = more roll)
  - **Result: High-spin shots now stop within 2.7-8.5 yards of FlightScope data**
  - Location: golf-par3.html:2354-2376

- **FlightScope Test Results (8/10 Passing)**
  - ✅ Test 1 (126 mph, 5500 rpm): +1.0 yd total
  - ❌ Test 2 (75 mph, 5500 rpm): -7.7 yd total (roll issue)
  - ✅ Test 3 (100 mph, 5500 rpm): +0.7 yd total
  - ✅ Test 4 (150 mph, 5500 rpm): -3.3 yd total
  - ✅ Test 5 (55 mph, 2201 rpm): +2.5 yd total
  - ❌ Test 6 (67.2 mph, 22.4° VLA, 4113 rpm): -5.6 yd total
  - ✅ Test 7 (74.9 mph, 1872 rpm): +1.4 yd total
  - ✅ Test 8 (74.9 mph, 1872 rpm): +1.4 yd total
  - ✅ Test 9 (61.9 mph, 23.4° VLA, 2601 rpm): -2.4 yd total
  - ✅ Test 10 (71.6 mph, 1518 rpm): -0.4 yd total
  - Average carry error: 4.3 yards
  - Average roll error: 3.0 yards
  - Location: test-physics.js (test script)

- **Why This Matters**
  - Physics now calibrated against real FlightScope trajectory data
  - Accurate carry distances across all club speeds (55-150 mph)
  - Realistic spin effects on ball flight and roll
  - High-spin wedge shots check up properly on the green
  - Low-spin shots roll out naturally as expected
  - Game feel significantly improved for realistic golf simulation

---

### Version 4.3.0
**Date:** 2025-11-16

#### Changes in this version:

**Ball Flight Physics - Advanced Spin-Dependent Drag Calibration**

- **Spin-Dependent Drag Coefficient**
  - High spin (5000+ RPM): 15% less drag (ball stays aloft longer with more lift)
  - Mid spin (3000-4000 RPM): Gradual transition from 5% more to baseline drag
  - Low spin (<3000 RPM): 5% more drag (less lift, more air resistance)
  - Properly accounts for Magnus lift effect reducing effective forward drag
  - Location: golf-par3.html:2022-2038

- **FlightScope Calibration - Two Test Cases**
  - **3389 RPM Test** (mid-spin wedge):
    - Input: 69.5 mph, 15.1° VLA, 3389 RPM
    - Target: 61.1 carry + 17.4 roll = 78.5 total
    - Result: 64.5 carry + 15.9 roll = 80.4 total ✓ (within ±2 yards)
  - **5493 RPM Test** (high-spin approach):
    - Input: 70.7 mph, 23.1° VLA, 5493 RPM
    - Target: 77.6 carry + 4.1 roll = 81.7 total
    - Result: 77.2 carry + 3.8 roll = 81.1 total ✓ (within ±2 yards)
  - Both tests passing within ±2 yard tolerance
  - Location: golf-par3.html:671-788 (test system - disabled for production)

- **Refined Rollout Physics**
  - Spin friction multiplier calibrated per spin range:
    - 5500+ RPM: 120.0 multiplier (very high stopping power)
    - 3000-4000 RPM: 1.5-35.0 (graduated friction)
    - <2500 RPM: 0.01 (minimal friction, more roll)
  - Spin adjustment multiplier scales landing speed factor:
    - 5500+ RPM: 20x multiplier (soft landing, minimal roll)
    - 2500-3500 RPM: 1-5x (graduated adjustment)
  - Landing speed and spin stored on first bounce (not recalculated)
  - Location: golf-par3.html:2146-2268

- **Bounce Factor with Spin**
  - High spin REDUCES bounce (ball grips and checks):
    - 5500+ RPM: -0.45 bounce adjustment (aggressive check)
    - 3500-4500 RPM: -0.10 to -0.32 (graduated grip)
    - <2500 RPM: 0.0 (neutral bounce)
  - Previously had this backwards (high spin increased bounce)
  - Critical fix for realistic high-spin wedge shots
  - Location: golf-par3.html:2170-2192

- **Production Cleanup**
  - Demo shot controls panel disabled
  - Automated testing system disabled (preserved in code for future calibration)
  - 'D' key demo shots disabled
  - 'T' key automated tests disabled
  - Clean UI ready for production release
  - Location: golf-par3.html:211-224, 633-636, 671-788

---

### Version 4.2.0
**Date:** 2025-11-16

#### Changes in this version:

**Shanktuary Hills Golf Club - 4-Hole Course Complete ⛳**

- **Added Hole 4: Par 4 Dogleg Right (395 yards)**
  - Mitten-shaped fairway that bulges left in the middle section
  - Water hazard on left side with proper 3D rendering
  - 400x700m terrain for long par 4 layout
  - Oval green (15m wide x 10m deep)
  - Out of bounds detection matching fairway shape
  - Location: golf-par3.html:285-294, 905-926

- **Water Hazard System**
  - Fixed ShapeGeometry using local coordinates instead of world coordinates
  - Visible blue water mesh with proper transparency
  - Point-in-polygon detection for water penalties
  - Water positioned to leave fairway strip on right side
  - Location: golf-par3.html:1077-1095, 1189-1228

- **Ball Flight Physics - FlightScope Calibrated**
  - Calibrated against real FlightScope trajectory data
  - Multi-speed drag coefficient system (55-175+ mph)
  - Spin-dependent friction (high spin = more stopping power)
  - Landing speed affects rollout (soft landings roll more)
  - Test results within ±2 yards of FlightScope data:
    - 55 mph: 59.7 total (target 57.7)
    - 130 mph: 220.7 total (target 220.0)
    - 175 mph: 312.9 total (target 310.6)
  - Location: golf-par3.html:1975-1991, 2120-2263

- **Green Slope Physics**
  - 3D sloped greens with realistic elevation changes
  - Each hole has unique slope configuration:
    - Hole 1: 2% downhill (toward player)
    - Hole 2: 1.5% left-to-right slope
    - Hole 3: 2.5% right-to-left slope
    - Hole 4: 2% uphill (away from player)
  - Gravity-based slope force during putting
  - Ball curves realistically based on green slope
  - PlaneGeometry with 64x64 segments for smooth slopes
  - Location: golf-par3.html:253-294, 1134-1178, 2244-2263

- **Automated Testing System (Development)**
  - Built-in FlightScope calibration test suite
  - Tests 3 ball speeds automatically (55, 130, 175 mph)
  - Compares carry, roll, and total distance to FlightScope data
  - Pass/fail criteria (±2 yard tolerance)
  - Disabled in production, preserved in code for future calibration
  - Location: golf-par3.html:671-789 (commented out)

- **Production Cleanup**
  - Disabled demo shot controls panel
  - Disabled 'D' key demo shots
  - Disabled 'T' key automated tests
  - Disabled 'F' key free camera mode
  - Disabled WASD camera movement
  - Clean UI for production release
  - Location: golf-par3.html:211-224, 613-667

---

### Version 4.1.0
**Date:** 2025-11-15

#### Changes in this version:

**Shanktuary Hills Golf Club - 2-Hole Course ⛳**
- **Added Par 4 Dogleg Left (Hole 2)**
  - 320-yard dogleg left par 4
  - Smooth S-curve fairway with easing function
  - Trees lining both edges following the curve
  - 500x500m terrain for full par 4 layout
  - Strategic bunkers and green complex
  - Location: golf-par3.html:233-267

- **Multi-Hole Course System**
  - HOLES array configuration for 2-hole course
  - setupHole() function for dynamic hole switching
  - Adaptive terrain sizing (200x300m for Par 3, 500x500m for Par 4)
  - Automatic hole progression after all players hole out
  - Per-hole score tracking with individual and total scores
  - Location: golf-par3.html:407-435

- **3D Overhead Minimap**
  - Real-time drone view of the hole in bottom right corner
  - Separate WebGL renderer with orthographic camera
  - Automatically centers on ball and pin
  - Dynamic zoom based on distance to hole
  - Fog temporarily disabled for clearer minimap view
  - Location: golf-par3.html:462-475, 2278-2315

- **Out of Bounds Detection**
  - 5 yards beyond tree lines triggers OB penalty
  - Water (outside terrain bounds) triggers OB
  - Stroke and distance penalty applied
  - Only checks after ball lands (allows flight over OB areas)
  - Location: golf-par3.html:1834-1873

- **Smooth Dogleg Curve**
  - S-curve easing function for natural fairway shape
  - Formula: `progress * progress * (3 - 2 * progress)`
  - Trees positioned along curved fairway edges
  - 45 trees each side following the curve
  - Location: golf-par3.html:706-718, 871-920

- **UI Cleanup**
  - Removed demo shot controls panel for production release
  - Cleaner interface focused on gameplay
  - Demo controls were at lines 211-221 (now removed)

---

### Version 4.0.0 (MAJOR RELEASE)
**Date:** 2025-11-14

#### Changes in this version:

**Shanktuary Hills Par 3 Golf - MAJOR UPDATE ⛳**
- **Game Rebranded to "Shanktuary Hills Golf Club - Hole 1"**
  - Updated all UI references from "Par 3 Golf" to "Shanktuary Hills"
  - Main menu button now reads "⛳ Shanktuary Hills Par 3"
  - Setup screen titled "Shanktuary Hills Par 3 Setup"
  - Window title: "Shanktuary Hills Par 3"
  - Location: golf-par3.html:165, electron-index.html:426, 3662, 3796

- **Complete Multiplayer System with Automatic Player Switching**
  - **Player Setup Screen** (like bowling/putting)
    - Choose 1-4 players with custom names and colors
    - Color picker with 6 golf-themed colors
    - Setup screen shows before game launches
    - Player data saved to localStorage
    - Location: electron-index.html:3658-3807

  - **Automatic Player Switching Based on Distance**
    - After each shot, switches to player farthest from hole
    - Implements real golf "away player shoots first" rule
    - 2-second pause before switching (smooth transition)
    - No manual "Next Player" button needed
    - Location: golf-par3.html:1607-1639, 1410-1413, 1058-1062

  - **Per-Player State Management**
    - Each player tracks their own ball position and strokes
    - Players marked as "holed" when they finish the hole
    - State saved/loaded when switching players
    - Camera and aim reset for each player
    - Location: golf-par3.html:1574-1598, 1740-1761, 881-903

  - **Final Scores & Hole Reset**
    - Shows all players' scores when everyone holes out
    - Automatic hole reset for new round
    - Scorecard with birdie/par/bogey labels
    - Location: golf-par3.html:1687-1707

- **Enhanced UI/UX**
  - **Top-Left Player Info Display**
    - Shows current player name with their custom color
    - "Shot: X" - current shot number they're about to take
    - "Strokes: X" - total strokes taken so far
    - Colored border matching player's color
    - Location: golf-par3.html:88-119, 1705-1735

  - **Dynamic Floating Yardage Marker**
    - Floats above flagstick at all times
    - Height adjusts based on distance (5m when far, 2.5m when close)
    - Always stays above flagstick top (~1.9m)
    - Shows distance in **YARDS** from tee/fairway/rough
    - Shows distance in **FEET** when on the green
    - 3D-to-2D projection follows pin on screen
    - Compact square design (60px) with gold border
    - Location: golf-par3.html:121-143, 1984-2039

  - **Cleaned Up Right Panel**
    - Removed duplicate player indicator
    - Removed distance/lie/strokes (now in top-left and floating marker)
    - Removed demo shot controls (production ready)
    - Removed low speed practice toggle
    - Removed aim adjustment display
    - Only shows: Last Shot stats, Change View, Toggle Grid, Reset Hole
    - Location: golf-par3.html:164-210

- **Putting Improvements**
  - **Flagstick Collision Detection**
    - Ball bounces off flagstick on fast putts (>2.0 m/s)
    - Slow putts (<2.0 m/s) can drop after hitting flagstick
    - 40% energy loss on flagstick bounce
    - More realistic putting physics
    - Location: golf-par3.html:1117-1158

  - **Distance Units on Green**
    - Yardage marker shows FEET instead of YARDS on green
    - Automatically switches based on lie type
    - More intuitive for putting distances
    - Location: golf-par3.html:2027-2037

- **Bug Fixes**
  - **Fixed Ball Visibility on Tee**
    - Ball now properly sits on tee box at correct height (3.146m)
    - Player initialization uses proper tee height calculation
    - Fixed issue where ball appeared underground
    - Location: golf-par3.html:882-889, 1665-1670

  - **Fixed Reset Hole Functionality**
    - Camera resets to behind-ball view when resetting
    - Player state properly updated with tee position
    - Yardage marker shows correct distance (130 yards)
    - Location: golf-par3.html:1683-1703

  - **Fixed Roll Distance Bug**
    - Roll no longer shows negative values
    - Putts show carry=0, roll=total distance
    - Added Math.max(0, ...) safeguard
    - Location: golf-par3.html:1387-1406

  - **Fixed Carry/Total Showing Zero**
    - Stats calculated BEFORE switching players
    - Uses correct shotStartPos and carryDistance
    - Total and roll now display correctly
    - Location: golf-par3.html:1387-1413

  - **Fixed Lie Type When Switching Players**
    - Lie type (Tee/Fairway/Green/etc) updates when loading player state
    - Ball stays where it landed (no reset to tee)
    - Location: golf-par3.html:1640-1641

  - **Removed Missing UI Element Errors**
    - Fixed updateUI() trying to update removed elements
    - Fixed updateAimIndicator() errors
    - Fixed missing lowSpeedToggle checkbox
    - Location: golf-par3.html:1674-1677, 2050-2053, 982-983

  - **Fixed Launch Monitor Integration**
    - Changed `window.api` to `window.electronAPI` (correct IPC bridge)
    - Removed `setupDemoShotControls()` function that was trying to access removed elements
    - Fixed shot data handling to support both `ball_speed` (Electron) and `speed` (demo) formats
    - Added validation for shot data to prevent undefined errors
    - **Fixed putt validation** - Putts with VLA=0 now accepted (was rejecting due to falsy check)
    - Added debug logging for shot data received from launch monitor
    - Game now properly receives and processes shot data from GSPro launch monitor including putts
    - Location: golf-par3.html:420-425, 937-957, 972-973

#### Why This is Version 4.0.0 (Major Release):
- **Complete multiplayer system** - fundamentally changes gameplay
- **Automatic player switching** - major UX improvement
- **Production-ready** - demo controls removed, clean UI
- **Brand identity** - "Shanktuary Hills" name established
- This is the first **fully playable multiplayer golf game** in the suite

---

### Version 3.7.3 (Skipped - rolled into 4.0.0)

---

### Version 3.7.2

**Par 3 Golf Hole - NEW GAME! ⛳ (IN DEVELOPMENT)**
- **Complete Par 3 Golf Course Implementation**
  - 130-yard par 3 hole with realistic terrain
  - Tee box elevated 3 meters above fairway
  - Procedurally generated terrain with organic undulations (sine/cosine waves)
  - Fairway, light rough, heavy rough with realistic color transitions
  - Kidney bean-shaped bunkers left and right of green
  - Bright green to distinguish from fairway
  - Location: golf-par3.html

- **Ball Physics & Raycasting**
  - Raycasting for accurate terrain collision detection
  - Ball sits properly on terrain surface (no sinking underground)
  - Velocity vectors for ball flight
  - Spin physics (backspin/sidespin)
  - Lie-dependent friction (fairway vs rough vs sand)
  - Location: golf-par3.html:951-969, 800-950

- **Camera System (7 Views)**
  - Behind-ball: Rotates with aim adjustment, eye-level view
  - Tee-box: Fixed view from tee box
  - Auto-follow: Automatically follows ball in flight
  - Follow: Manual follow camera
  - Green: View of green from fairway
  - Overhead: Bird's eye view
  - Drone: Cinematic angle
  - Auto-resets to behind-ball after shot completes
  - Location: golf-par3.html:1194-1280

- **Aim Adjustment System**
  - Arrow keys adjust aim in 1-degree increments
  - Left/Right arrows rotate aim
  - Up arrow resets to 0°
  - Base direction automatically points toward pin after each shot
  - Total aim = base direction + aim adjustment
  - Behind-ball camera rotates with aim
  - Location: golf-par3.html:250-252, 321-338, 913-921

- **Demo Shot Controls**
  - Speed slider: 0-212 mph
  - Launch angle: 5-45°
  - Direction: -180° to +180°
  - Backspin: 0-10,000 rpm
  - Sidespin: -3,000 to +3,000 rpm
  - Low speed practice mode (50% reduction)
  - Location: golf-par3.html

- **Grid Overlay**
  - Toggle grid button
  - Shows grids on tee box, fairway, and green
  - Helps with distance visualization
  - Location: golf-par3.html:1395-1425

- **Trees & Environment**
  - 72 trees total: 30 left side, 30 right side, 12 behind green
  - Collision detection prevents ball from passing through trees
  - Random heights (8-14 meters) and positions
  - 3-layer foliage for depth
  - **CURRENT ISSUE:** Trees sinking underground due to raycasting returning -0.20
    - Problem: `getGroundHeightRaycast()` called during tree creation but terrain mesh not ready
    - Trees positioned at groundY=-0.20 (fallback value)
    - Attempted fixes: trunk.position.y offsets (0, trunkHeight/2, trunkHeight/2 + 0.2)
    - Current status: Trees still partially underground despite +0.2 offset
  - Location: golf-par3.html:628-709

**KNOWN ISSUES:**
- Trees are positioned underground because raycasting fails during tree creation
- Raycasting returns -0.20 (fallback from `getGroundHeight()`) instead of actual terrain height
- Need to either:
  1. Delay tree creation until after terrain is fully in scene, OR
  2. Use actual terrain geometry for positioning instead of raycasting, OR
  3. Add sufficient offset to compensate for -0.20 baseline (current attempt: +0.2 not enough)

---

### Version 3.7.2
**Date:** 2025-11-11

#### Changes in this version:

**UI/UX Improvements:**
- **Global Control Panel Standardization**
  - Standardized all game control panels to compact size (240px fixed width)
  - Reduced padding from 20px to 12px across all games
  - Reduced button padding from 10px 20px to 8px 12px
  - Reduced font sizes: H3 (24px→18px), buttons (16px→13px), stat labels (14px→12px), stat values (16px→13px)
  - Reduced margins and gaps throughout all control panels
  - Fixed width prevents panels from expanding when sections collapse
  - Affected files:
    - homerun-derby.html
    - soccer-penalty.html
    - putting-green.html
    - bowling.html
    - darts-3d.html
    - billiards-game.html
    - drivingrange.html
    - skeeball-simple.html

- **Putting Practice - Collapseable Game Mode Selection**
  - Added collapseable section for game mode selection
  - Toggle button shows "🎮 Game Modes ▼/▶" to expand/collapse
  - Saves screen space when modes are not being changed
  - Matches design pattern used in baseball game
  - Location: putting-green.html:170-182, 195-205, 1881-1892

---

### Version 3.7.1
**Date:** 2025-11-10

#### Changes in this version:

**Bug Fixes:**
- **Soccer Penalty - Fixed Wild Shots Always Tracking to Goal**
  - Removed angle clamping that prevented shots from missing wide
  - HLA beyond ±15° now properly misses left/right of goal
  - VLA beyond 0-30° now properly misses over bar or into ground
  - Wild shots can now miss the target realistically
  - Location: soccer-penalty.html:744, 753

- **Putting Practice - Added Gate Post Collisions**
  - Gate posts now have physical collision detection
  - Ball bounces off posts instead of passing through
  - Collision uses reflection physics with 80% energy retention
  - Prevents ball from sticking to posts
  - Location: putting-green.html:806-808, 1444-1482

---

### Version 3.7.0
**Date:** 2025-11-10

#### Changes in this version:

**Soccer Penalty Kick - NEW GAME! ⚽ (BETA)**
- **Complete 3D Soccer Penalty Kick Game**
  - Full 3D soccer field with regulation-sized goal (7.32m x 2.44m)
  - Realistic stadium environment with tiered seating (15 rows behind goal, 12 rows on sides)
  - Floodlight towers with illumination
  - Advertising boards (ADIDAS, NIKE, PEPSI, COCA-COLA)
  - Corner flags and penalty spot
  - Location: soccer-penalty.html

- **Shot Physics Using HLA/VLA**
  - Direct angle-to-position mapping (no calibration needed, like baseball)
  - HLA controls horizontal placement (-15° to +15° maps to left/right)
  - VLA controls shot height (0° to 30° maps to ground level to top of goal)
  - Ball speed affects goalkeeper reaction time
  - Location: soccer-penalty.html:698-723

- **Goalkeeper AI**
  - Animated goalkeeper in yellow jersey with diving mechanics
  - Reaction time based on ball speed (faster shots = less time to react)
  - Save probability based on shot difficulty (corners harder to save)
  - Dives toward shot location with rotation animation
  - Only active in Shootout and Competition modes
  - Location: soccer-penalty.html:602-641, 752-787

- **4 Game Modes**
  - **Practice Mode:** No goalkeeper - practice shot placement
  - **Target Practice:** Hit 5 targets for bonus points (corners = 5 pts, center = 3 pts, regular goal = 1 pt)
  - **Shootout:** 5 kicks vs AI goalkeeper
  - **Competition:** Multiplayer tournament with goalkeeper
  - Location: soccer-penalty.html:996-1020

- **Multiplayer Support (1-4 Players)**
  - Player setup wizard with customizable names and colors
  - Turn-based gameplay with automatic player switching
  - Scoreboard showing score, goals, accuracy
  - Player color indicators
  - Location: soccer-penalty.html:1010-1063

- **Stadium Seating & Environment**
  - Individual seats with backrests in 3 shades of blue
  - Tiered seating: 15 rows of 60 seats behind goal, 12 rows of 40 seats on each side
  - Seats rise up like real stadium bleachers
  - 4 advertising boards positioned around field perimeter
  - Procedurally generated soccer ball texture with classic pentagon pattern
  - Location: soccer-penalty.html:493-574, 644-695

- **Target System**
  - 5 circular targets in goal (4 corners + 1 center)
  - Semi-transparent with colored rings (red corners, yellow center)
  - Hit detection awards bonus points
  - Only visible in Target Practice mode
  - Location: soccer-penalty.html:904-972

**Main Menu Integration**
- Added Soccer Penalty button to Driving column (marked as Beta)
- Green-themed button matching soccer colors
- Opens in new window like other games
- Location: electron-index.html:422-424

**Bug Fixes & Improvements**
- **Bowling - Disabled Test Shot Panel**
  - Test shot panel now hidden by default (`display: none`)
  - Cleaner production UI while preserving code for debugging
  - Location: bowling.html:222

- **Bowling - Fixed Cannon.js Import Path**
  - Copied cannon-es.js from node_modules to web directory
  - Updated import path from `./node_modules/cannon-es/dist/cannon-es.js` to `./cannon-es.js`
  - Fixes ERR_FILE_NOT_FOUND error in packaged builds
  - Location: bowling.html:324, cannon-es.js (new file)

- **Putting Practice - Added 4 New Drills**
  - **Clock Drill:** 12 putts around hole at 30° intervals (blue theme)
  - **Gate Drill:** Alignment gates with accuracy tracking (purple theme)
  - **Circle Drill:** 10 putts each at 3ft, 6ft, 9ft, 12ft (pink theme)
  - **Star Drill:** 5 putts from different angles 72° apart (orange theme)
  - Each drill has dedicated stats tracking and color themes
  - Default camera view changed to "follow" mode
  - Green size increased to 15m radius to accommodate 40ft putts
  - Location: putting-green.html:167-172, 198-298, 361-442, 1198-1275, 1347-1494, 1617-1764

- **Putting Practice - Player Setup Screen**
  - Added player selection screen matching bowling setup style
  - Predefined color palette (6 colors as clickable swatches)
  - Player count selection (1-4 players)
  - Multiplayer support for all drills
  - Location: electron-index.html:3240-3367, electron-main.js:418-423

---

### Version 3.6.0
**Date:** 2025-11-09

#### Changes in this version:

**Bowling - MAJOR PHYSICS UPGRADE: Cannon.js Integration 🎳**
- **Replaced Manual Physics with Cannon.js Physics Engine**
  - Integrated cannon-es physics library for realistic pin collisions
  - Proper momentum transfer between ball and pins
  - Pin-to-pin collisions with realistic ricocheting
  - Pins now cascade and interact naturally when hit
  - Location: bowling.html:323-432, 1105-1120, 1232-1299

- **Added Per-Player Bumpers Mode**
  - Each player can enable/disable bumpers individually (for kids)
  - Visual orange bumpers appear above gutters when active
  - Gutters change to orange color when bumpers enabled
  - Ball bounces back onto lane with 0.6 restitution
  - Location: electron-index.html (player setup), bowling.html:1386-1397

- **Added Per-Player Power Boost**
  - Multiplier options: 1.0x, 2.0x, 3.0x, 4.0x, 5.0x
  - Applied to shots under 70 mph
  - Helps players with lower swing speeds
  - Location: electron-index.html (player setup), bowling.html:1720-1726

- **Cannon.js Physics Configuration**
  - Created physics world with realistic gravity (9.82 m/s²)
  - Ground plane for ball/pin collisions
  - Contact materials for ball-ground, pin-ground, ball-pin, pin-pin
  - Ball: 7.26 kg mass, very low friction (0.08) for bowling lane
  - Pins: 1.5 kg mass, positioned at center of mass (pinHeight/2)
  - Ball-pin restitution: 0.1 (prevents backward bouncing)
  - Location: bowling.html:383-432

- **Pin Camera View**
  - Automatically switches to side view of pins when ball gets close
  - Shows collision and pin action in detail
  - Pauses for 3 seconds after ball stops to watch pins fall
  - Returns to original camera view before resetting
  - Location: bowling.html:1303-1339, 1396-1400, 1435-1460

- **Physics Body Synchronization**
  - Real-time sync between THREE.js meshes and Cannon.js bodies
  - Pin standing detection based on tilt angle (>45°) or height
  - Ball and pin positions/rotations updated every frame
  - Location: bowling.html:2088-2119

- **Gutter Ball Scoring Fix**
  - Gutter balls now count pins knocked before entering gutter
  - Previously scored as 0 pins even if pins were hit first
  - Timeout increased to 3 seconds for pin camera pause
  - Location: bowling.html:1399-1428

- **Arrow Key Ball Movement**
  - Fixed ball position controls to update physics body
  - Left/right arrows now properly move ball laterally
  - Both THREE.js mesh and Cannon.js body positions updated
  - Location: bowling.html:505-530

- **Pin Ground Contact Fix**
  - Pins now properly touch the lane surface
  - THREE.js mesh pivot adjusted to center of mass
  - Pin meshes offset by -pinHeight/2 from group origin
  - Group positioned at pinHeight/2 above ground
  - Location: bowling.html:1239-1264

- **Prevented Backward Ball Rolling**
  - Added velocity damping for backward motion
  - Ball velocity.z capped when rolling back up lane
  - Prevents ball from rolling back toward bowler after pin collision
  - Location: bowling.html:1379-1382

- **ES6 Module Integration**
  - Converted to ES6 module for Cannon.js import
  - Made functions globally available for onclick handlers
  - Functions exposed: sendTestShot, toggleTestPanel, cycleView, resetBall, nextPlayer, newGame
  - Location: bowling.html:322-324, 2135-2141

- **Backup Files Created**
  - bowling_backup.html - Original version
  - bowling_v1_improved.html - Manual physics with improvements
  - bowling_v1_improved_backup.html - Backup before Cannon.js
  - bowling_v2_cannonjs.html - Placeholder for Cannon.js (replaced bowling.html)

---

### Version 3.5.2
**Date:** 2025-11-08

**Darts - Cricket Bug Fixes 🐛**
- **Fixed 3D Darts Cricket Turn System**
  - Fixed bug where players only got 1 dart per turn in Cricket mode
  - `processCricket()` was calling `nextPlayer()` after every dart instead of after 3 darts
  - Now properly checks `player.dartsThrown.length % 3 === 0` before switching players
  - Location: darts-3d.html:877-916

- **Fixed 2D Darts Cricket Turn System**
  - Fixed same bug in 2D darts where Cricket turns were ending after 1 dart
  - Removed invalid number early exit that called `nextPlayer()` immediately
  - Now only switches players after 3 darts regardless of hits/misses
  - Location: darts_multiplayer.js:701-754

- **Removed Speed Limits in 2D Darts**
  - Removed "Too Hard" (>140 mph) and "Too Soft" (<10 mph) shot rejections
  - All shots now register as dart throws and count toward 3-dart turn limit
  - Prevents confusion where rejected shots didn't count as throws
  - Location: darts_multiplayer.js:632-634

- **Fixed 3D Dartboard Number Layout**
  - Corrected dartboard to match standard layout with 20 at top
  - Changed segments to go clockwise: 20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5
  - Fixed segment angles by negating direction for clockwise rotation
  - Fixed scoring calculation to match new clockwise layout
  - Location: darts-3d.html:399-402, 492-493, 683-687

- **Added Debug Logging for 2D Darts**
  - Console logs show each dart throw with player, hit result, number, zone, and dart count
  - Shows turn continuation/end messages
  - Shows player switch messages
  - Helps diagnose turn-switching issues
  - Location: darts_multiplayer.js:648-653, 747-753, 796-803

---

### Version 3.5.1
**Date:** 2025-11-08

#### Changes in this version:

**Bowling - Environment Enhancements 🎨**
- **Bowling Alley Atmosphere Improvements**
  - Added brick texture walls for realistic bowling alley look
  - Widened alley spacing (8m walls) for open, spacious feel instead of cramped
  - Added retro 90s bowling alley carpet pattern on sides (neon geometric shapes on black)
  - Carpet properly tiled and sharpened with NearestFilter for crisp appearance
  - Random texture offsets per carpet section to avoid repetitive patterns
  - White baseboard trim along walls
  - Light gray acoustic tile ceiling
  - Location: bowling.html:622-738

- **Adjacent Bowling Lanes**
  - Added left and right adjacent lanes for busy bowling alley atmosphere
  - Animated balls on adjacent lanes with random shot timing (4-12 second intervals)
  - Random ball speeds (8-12 m/s) and slight position variations
  - Pins visible on adjacent lanes
  - Creates immersive, live bowling alley environment
  - Location: bowling.html:551-691

- **Carpet Texture System**
  - Created procedural carpet texture with circles, triangles, squares, zigzags, spirals
  - Neon colors (magenta, cyan, yellow, red, green, orange) on black background
  - Texture repeat: 8x20 for proper tiling without stretching
  - NearestFilter for sharp, crisp pixel rendering at all angles
  - Anisotropic filtering (16x) for better quality at viewing angles
  - Location: bowling.html:622-738

---

### Version 3.5.0
**Date:** 2025-11-08

#### Changes in this version:

**Bowling - Bug Fixes 🐛**
- **Fixed Player Color Selection**
  - Color selection now properly updates when clicking color buttons
  - Fixed issue where colors weren't being saved in player setup
  - Created `refreshBowlingPlayerInputs()` function to update UI without recreating player data
  - Location: electron-index.html:3361-3398

- **Removed Test Shot Panel from Production**
  - Test shot panel commented out for cleaner UI
  - Functions preserved in code for debugging purposes
  - Can be re-enabled by uncommenting HTML (lines 221-249) and JS (lines 1131-1157)
  - Location: bowling.html:221-249, 1131-1157

---

### Version 3.4.9
**Date:** 2025-11-07

#### Changes in this version:

**Bowling - NEW GAME! 🎳**
- **Complete Bowling Game Implementation**
  - Full 10-frame bowling with strikes, spares, and proper scoring
  - Regulation 60-foot lane with 3.5-foot width
  - Gutters on both sides with gutter ball detection
  - 10 pins in proper inverted triangle formation
  - Location: bowling.html

- **Realistic Bowling Physics**
  - Very low friction (0.02) for slick bowling lane surface
  - Ball hook physics using Magnus effect from sidespin
  - HLA (Horizontal Launch Angle) controls ball direction
  - Pin collision physics (ball-to-pin and pin-to-pin)
  - Proper pin knockdown and clearing after first ball
  - Location: bowling.html:610-730

- **Bowling Scoring System**
  - Accurate 10-frame scoring with strikes (X) and spares (/)
  - Automatic cumulative score calculation
  - 10th frame special rules (bonus balls for strikes/spares)
  - Visual scorecard at top center of screen
  - Frame-by-frame score tracking
  - Location: bowling.html:960-1020

- **Multiplayer Support (1-4 Players)**
  - Player setup wizard with customizable names and colors
  - Each player bowls complete 10-frame game
  - Ball color changes per player
  - Player indicator with color-coded names
  - Next Player button for switching between players
  - Location: electron-index.html:3258-3386, bowling.html:1176-1225

- **UI/UX Design**
  - Scorecard positioned at top center (like real bowling alley)
  - Compact side control panel (280px width)
  - Test shot panel for testing ball speed, HLA, and sidespin
  - Current frame info display
  - 4 camera views: Behind, Overhead, Side, Follow
  - Location: bowling.html:26-200

- **Lane Environment**
  - 60-foot regulation bowling lane
  - Wood lane texture with realistic grain
  - Red foul line at start
  - Approach area for bowler
  - Overhead lights for bowling alley ambiance
  - Location: bowling.html:400-450

- **Input Support**
  - Works with putter shots (low speed, precision)
  - Works with iron shots (higher speed, more power)
  - Ball speed controls velocity down lane
  - HLA controls angle/direction
  - Sidespin creates hook effect
  - Location: bowling.html:1190-1192

- **Pin Formation & Reset**
  - Inverted triangle: Head pin closest to bowler
  - Proper 12-inch spacing between pins
  - Pins reset to original positions after each frame
  - Knocked pins cleared after first ball (like real bowling)
  - All pins visible again when new frame starts
  - Location: bowling.html:470-545, 813-833

**Main Menu Integration**
- Added Bowling to Putting column on main menu
- Orange-themed button matching bowling colors
- Player setup screen before launching game
- Location: electron-index.html:400-402

---

### Version 3.4.8
**Date:** 2025-11-02

#### Changes in this version:

**Baseball - Percentage-Based Hit Outcomes ⚾**
- **Added Realistic Outcome Variability**
  - Each yardage range now has percentage-based chances for different outcomes
  - Same distance can produce different results (adds realism and excitement)
  - Location: homerun-derby.html:2676-2742

- **Outcome Percentages by Range:**
  - **Outs Range (< 75 yards):** 85% out, 15% single
  - **Singles Range (75-125 yards):** 15% out, 70% single, 15% double
  - **Doubles Range (126-175 yards):** 5% out, 20% single, 65% double, 10% triple
  - **Triples Range (176+ yards):** 5% out, 5% single, 35% double, 55% triple
  - **Home Runs:** 100% guaranteed when ball clears wall (unchanged)

- **Why This Change?**
  - More realistic baseball gameplay - defense matters
  - Adds excitement and unpredictability
  - Weak contact can still result in bloop singles
  - Deep fly balls have small chance of being caught at the wall
  - Better reflects real baseball statistics

---

### Version 3.4.7
**Date:** 2025-10-26

#### Changes in this version:

**Baseball - Rebalanced Hit Distances ⚾**
- **Adjusted Hit Classification for Better Gameplay**
  - Outs: < 75 yards (was < 150 yards)
  - Singles: 75-125 yards (was 150-250 yards)
  - Doubles: 126-175 yards (was 250-350 yards)
  - Triples: 176+ yards (was 350-400 yards)
  - Home Runs: ONLY if cleared the wall (removed distance-only home runs)
  - Ground-Rule Doubles: Still hit wall but don't clear
  - Location: homerun-derby.html:2677-2713

- **Why This Change?**
  - Previous distances were too far for most players
  - Singles and doubles now achievable at realistic distances
  - Home runs truly special - must clear the wall
  - Makes baseball mode more balanced and fun
  - Better progression from singles → doubles → triples → home runs

---

### Version 3.4.6
**Date:** 2025-10-26

#### Changes in this version:

**3D Darts - Full Game Implementation 🎯**
- **Complete Game Modes**
  - Practice Mode: Free throw practice with score accumulation
  - 301 Mode: Race to zero from 301, must finish on double
  - 501 Mode: Race to zero from 501, must finish on double
  - Cricket Mode: Close numbers 15-20 and Bull, score on closed numbers
  - Killer Mode: Hit doubles to become killer, eliminate opponents
  - Location: darts-3d.html:703-1054

- **Multiplayer Support (1-4 Players)**
  - Player setup wizard with customizable names and colors
  - Turn-based gameplay (3 darts per turn)
  - Dynamic scoreboard adapting to each game mode
  - Cricket scoreboard with marks display (/, X, ⊗)
  - Player color indicators and active player highlighting
  - Location: darts-3d.html:210-263, 715-782

- **Shared Calibration System**
  - Uses same calibration profiles as 2D Darts (computer/projector)
  - Supports linear and polynomial regression from calibration wizard
  - Automatic profile switching based on projector mode
  - Removed separate 3D calibration wizard
  - Location: darts-3d.html:605-644, 149-155

- **Enhanced Dartboard Display**
  - Scaled up 30x for projector-like visibility
  - Maintains accurate scoring with real-world dartboard dimensions
  - Camera positioned for optimal viewing
  - Location: darts-3d.html:283-291, 301-309

**Baseball (formerly Home Run Derby) ⚾**
- **Main Menu Rename**
  - Changed "⚾ Home Run Derby" to "⚾ Baseball" in main menu
  - Better reflects that it has multiple modes (Practice, Derby, Baseball)
  - Location: electron-index.html:417

- **Collapseable UI Sections**
  - Game Modes section (Practice/Derby/Baseball) now collapseable
  - Controls section (Change View/Next Player/Export CSV) now collapseable
  - Click toggle buttons with ▼/▶ arrows to expand/collapse
  - Cleaner, more organized interface
  - Location: homerun-derby.html:202-210, 261-270, 2331-2343

- **Debug Mode Toggle**
  - Debug test shot panel hidden in production builds
  - Set `DEBUG_MODE = true` in code to enable for testing
  - Keeps release version clean while maintaining dev tools
  - Location: homerun-derby.html:370, 277-309, 3007-3011

**Putting Green Improvements ⛳**
- **Ladder Mode UI Cleanup**
  - Score box now hidden in Ladder Mode (info duplicated in Ladder Progress)
  - Score box visible in Practice Mode
  - Reduces UI clutter and duplication
  - Location: putting-green.html:889, 900

---

### Version 3.4.5
**Date:** 2025-10-25

#### Changes in this version:

**Home Run Derby - NEW: Baseball Mode ⚾**
- **Full 9-Inning Baseball Game**
  - Complete baseball game simulation with singles, doubles, triples, and home runs
  - 3 outs per side, top/bottom of inning tracking
  - Automatic score tracking (Away vs Home)
  - Base runner advancement with proper baseball rules
  - Game ends after 9 innings with winner announcement
  - Location: homerun-derby.html:393-403, 2405-2836

- **Hit Classification System**
  - Singles: 150-250 yards
  - Doubles: 250-350 yards
  - Triples: 350-400 yards
  - Home Runs: Clears the outfield wall
  - Ground-Rule Doubles: Hits wall but doesn't clear it
  - Outs: < 150 yards or swing and miss (< 20 mph)
  - Foul Balls: Outside fair territory (-45° to 45°)
  - Location: homerun-derby.html:2699-2740

- **Base Runner Logic**
  - Single: Batter to 1st, runners advance 1 base, runner on 3rd scores
  - Double: Batter to 2nd, runners on 2nd/3rd score, runner on 1st to 3rd
  - Triple: Batter to 3rd, all runners score
  - Home Run: Everyone scores including batter
  - Ground-Rule Double: Same as regular double
  - Location: homerun-derby.html:2742-2774

- **Baseball Diamond UI**
  - Visual diamond display with bases that light up gold when occupied
  - Shows 1st, 2nd, and 3rd base in proper diamond formation
  - Real-time updates as runners advance
  - Location: homerun-derby.html:250-264

- **Baseball Scoreboard Display**
  - Shows current inning with ordinals (TOP 1ST, BOTTOM 2ND, etc.)
  - Score display (Away - Home)
  - Outs counter (0-3)
  - Base indicators on scoreboard
  - Location: homerun-derby.html:2470-2533

- **Inning Transitions**
  - 3 outs → switch sides (top to bottom, or next inning)
  - Automatic base clearing between half-innings
  - Notifications for inning changes
  - Location: homerun-derby.html:2809-2833

**Home Run Derby - Enhanced Derby Mode 🏆**
- **Longest Drive Tracking (replaced High Score)**
  - Tracks longest drive in yards with player name
  - Saves to localStorage across sessions
  - Shows on both stats panel and stadium scoreboard
  - "NEW RECORD!" notification when beaten
  - Location: homerun-derby.html:357, 2437-2455

- **Strike System**
  - 10 strikes and you're out
  - Strikes for: foul balls, didn't clear wall, swing and miss
  - Real-time strike counter (X/10)
  - Game over screen with final stats
  - Location: homerun-derby.html:2420-2438

- **Visual Feedback**
  - "⚾ HOME RUN! XXX yds ⚾" notifications
  - "🏆 NEW RECORD! XXX yds by PlayerName! 🏆" for records
  - "❌ STRIKE! [reason]" notifications
  - "GAME OVER" screen with home runs and longest drive
  - Location: homerun-derby.html:2441-2472, 2466-2497

**Putting Green Improvements ⛳**
- **Fixed Flagstick Blocking Putts**
  - Moved flagstick to back edge of hole (instead of center)
  - Ball no longer bounces off flagstick when rolling toward hole
  - Flagstick positioned at z + 0.054 meters
  - Location: putting-green.html:471

- **Improved Hole Detection**
  - Added ball radius to detection area for more forgiving holing
  - Increased velocity threshold from 0.5 to 2.0 m/s (allows faster putts to drop)
  - Ball now drops more reliably when near the hole
  - Location: putting-green.html:719

**UI/UX Improvements**
- **Mode Selection**
  - Three modes: Practice, Derby, Baseball
  - Clean mode toggle buttons with color coding
  - Practice = Green, Derby = Red, Baseball = Blue
  - Location: homerun-derby.html:210-215

- **Ordinal Inning Display**
  - Shows "Top 1st", "Bottom 2nd", "Top 3rd", etc.
  - Helper function converts numbers to ordinals (1st, 2nd, 3rd, 4th-9th)
  - Applied to both UI panel and stadium scoreboard
  - Location: homerun-derby.html:405-410, 2450-2452, 2481-2483

- **Removed Wind Indicator**
  - Removed wind arrow overlay (wind wasn't affecting gameplay)
  - Cleaned up all wind indicator code and styling
  - Wind variables still exist but not displayed
  - Location: Removed from homerun-derby.html

**Bug Fixes**
- Fixed duplicate shot result checking in Derby Mode
- Fixed game restart functionality for both Derby and Baseball modes
- Fixed updateWeatherDisplay() error after wind indicator removal
- Location: homerun-derby.html:2830-2836, 2201-2203

---

### Version 3.4.4
**Date:** 2025-10-24

#### Changes in this version:

**Putting Practice - NEW: Ladder Mode 🎯**
- **Progressive Distance Training**
  - Start at 2ft, advance through 20 levels up to 40ft
  - 2ft increments: 2→4→6→8...→40ft
  - Requires 2 consecutive makes to advance to next level
  - Miss = drop back one level (minimum level 1)
  - Location: putting-green.html:165-194, 301-308, 857-954

- **Ladder Stats Display**
  - Current Level and Distance
  - Makes at Level (X/2)
  - Total Putts
  - Make Percentage
  - Personal Best (farthest distance reached)
  - Real-time notifications for makes, misses, level ups

- **Mode Toggle UI**
  - Switch between Practice Mode and Ladder Mode
  - Distance slider disabled in Ladder Mode
  - All settings (Stimp, Break, Elevation) available in both modes

**Performance Improvements:**
- **Upgraded to THREE.js r134**
  - Better compatibility with Linux/Mesa drivers
  - Improved rendering performance
  - Eliminated WebGL shader errors
  - Location: three.min.js (602KB)

- **Native OpenGL Rendering**
  - Removed ANGLE/Vulkan flags for faster performance
  - Direct GPU acceleration on AMD/Mesa
  - Location: electron-main.js:350-352

**Home Run Derby:**
- **Fixed Camera View Cycling**
  - All 4 views now accessible: First Person, Auto Follow, Manual Follow, Overhead
  - Improved camera positioning for better visibility
  - Fixed auto-revert logic for auto-follow mode
  - Location: homerun-derby.html:1579-1656

---

### Version 3.4.3
**Date:** 2025-10-24

#### Changes in this version:

**Bug Fixes:**
- **Fixed Home Run Derby and Putting Practice not loading in Electron**
  - Replaced `window.open()` with proper Electron IPC calls
  - Added `openGameWindow` IPC handler in electron-main.js
  - Both games now open correctly in separate windows
  - Location: electron-main.js:390-429, preload.js:23, electron-index.html:3217-3250

- **Fixed WebGL shader errors causing black screen on Linux**
  - Switched to local THREE.js r128 file (590KB) instead of CDN
  - Added ANGLE/Vulkan backend flags to work around Mesa OpenGL shader bugs
  - Games now render correctly on Linux with AMD GPUs
  - Location: electron-main.js:350-354, homerun-derby.html:306, putting-green.html:258

**Technical Changes:**
- Added `three.min.js` to project root (THREE.js r128)
- Configured Electron to use ANGLE with Vulkan backend for better WebGL compatibility
- Added GPU flags: `ignore-gpu-blacklist`, `enable-gpu-rasterization`, `use-angle=vulkan`
- Updated package.json to exclude logs directory from builds

---

### Version 3.4.2
**Date:** 2025-10-20

#### Changes in this version:

**Home Run Derby / Physics Engine:**
- **Real-World Calibration Refinement**
  - Achieved 100% accuracy on real-world test shots (9/9 within ±10%, average 5.4% error)
  - Tested against actual FlightScope measurements from driving range
  - Calibration now handles extreme conditions accurately
  - Location: homerunderby.js:458-482

- **High Spin Correction (>3800 rpm)**
  - Added reduction for very high spin shots (wedges with 4000+ rpm)
  - Only applies when HLA is moderate (<15°) to avoid over-correction
  - At 4200 rpm: 12% reduction
  - Location: homerunderby.js:458-466

- **Spin Axis Threshold Adjustment**
  - Lowered threshold from 25° to 20° for better edge case coverage
  - Reduced maximum correction from 13% to 10%
  - More gradual reduction curve (10% at 27° spin axis)
  - Location: homerunderby.js:469-478

- **HLA Boost Refinement**
  - Reduced from 1% to 0.3% per degree based on real-world data
  - Prevents over-prediction on shots with extreme side angles
  - 13.5° HLA now gives 4% boost instead of 13.5%
  - Location: homerunderby.js:480-482

**Test Coverage:**
- Validated against 9 real FlightScope shots including:
  - High spin wedges: up to 4223 rpm
  - Extreme HLA: up to 19.5°
  - Low launch angles: down to 7.7°
  - High spin axis: up to 27.4°
  - Various speeds: 51.5-72.6 mph
- Test scripts: test-updated-calibration.js, analyze-real-shots.js

---

### Version 3.4.1
**Date:** 2025-10-20

#### Changes in this version:

**Home Run Derby / Physics Engine:**
- **Edge Case Calibration for All Club Types**
  - Achieved 100% accuracy (11/11 shots within ±10%, average 4.1% error)
  - Added corrections for extreme shot conditions:
    - Very low launch angles (<10°): +15.5% boost per degree
    - High spin axis (>25°): up to 13% reduction for extreme sidespin
    - Punch shots (8° launch angle): now accurate (47.4 yd → 46.1 yd, -2.7% error)
  - Location: homerunderby.js:450-471

- **Wedge Shot Calibration**
  - Speed-based calibration refined for wedges (58-75 mph)
  - Handles low-spin wedges (1059-1609 rpm) accurately
  - Calibration points added at 58, 60, 65, 70 mph
  - Location: homerunderby.js:416-424

- **High Spin Axis Handling**
  - Fixed extreme spin axis calculations (up to 32.5°)
  - Properly reduces forward carry for high sidespin shots
  - Progressive reduction from 25° to 32.5° (up to 13% reduction)
  - Location: homerunderby.js:458-465

**Test Coverage:**
- Validated against 11 FlightScope test shots including:
  - Wedges: 58-65 mph with varying spin/angles
  - Short irons: 65-75 mph
  - Low spin shots: down to 1088 rpm
  - High spin axis: up to 32.5°
  - Low launch angles: down to 8.3°
- Test scripts: test-final.js, test-edgecases.js, analyze-edgecases.js, recalibrate.js

---

### Version 3.4.0
**Date:** 2025-10-20

#### Changes in this version:

**Home Run Derby:**
- **Fixed CSV Export to Include Total Spin & Spin Axis**
  - CSV now exports `Total Spin (rpm)` and `Spin Axis (°)` instead of calculated BackSpin/SideSpin
  - This matches what FlightScope Trajectory Optimizer requires as input
  - Launch monitor sends TotalSpin and SpinAxis, not BackSpin/SideSpin directly
  - BackSpin and SideSpin are calculated internally from TotalSpin × cos/sin(SpinAxis)
  - Location: homerun-derby.html:1729-1743, 1803-1817, 1822-1839

- **Added Spin Axis to Ball Object**
  - Ball now stores spinAxis for proper CSV export
  - All data paths updated (Electron IPC, WebSocket, Debug panel)
  - Demo shots updated to include spinAxis values
  - Location: homerun-derby.html:1168, 1925, 1867, 1998, 2018

---

### Version 3.3.9
**Date:** 2025-10-20

#### Changes in this version:

**Home Run Derby / Physics Engine:**
- **Fixed Spin Calculation from Launch Monitor**
  - Launch monitor was sending incorrect BackSpin/SideSpin values
  - Now correctly calculates: `BackSpin = TotalSpin × cos(SpinAxis)` and `SideSpin = TotalSpin × sin(SpinAxis)`
  - Example: 4314 rpm @ 14.7° → 4173 rpm backspin, 1095 rpm sidespin (previously: 1668, 6)
  - Location: electron-main.js:186-200

- **Implemented Physics-Based Trajectory Simulation**
  - Replaced simple formula with full physics simulation (drag, Magnus effect, gravity)
  - Time-step integration at 1ms intervals
  - Accurate modeling of:
    - Drag force: F = 0.5 × ρ × A × CD × v²
    - Magnus lift: F = CL × q × A (from backspin)
    - Side force: F = CL × q × A (from sidespin)
  - Location: homerunderby.js:318-398

- **Multi-Angle Calibration System**
  - Calibrated against 5 FlightScope data points across full launch angle range:
    - 60.3 mph @ 31° → 63.8 yards (±0.5% error)
    - 70 mph @ 25° → 83.9 yards (±3.0% error)
    - 100 mph @ 18° → 147.5 yards (±4.0% error)
    - 150 mph @ 12° → 271.2 yards (±6.0% error)
    - 212 mph @ 10° → 455.1 yards (±7.0% error)
  - Speed-based interpolation with angle effects "baked in"
  - Works accurately for driving range use (10°-31° typical golf shots)
  - Location: homerunderby.js:413-453

- **Added Spin Axis Support**
  - Now accepts `total_spin` and `spin_axis` from launch monitors
  - Properly decomposes into backspin/sidespin components for physics
  - Supports 0-45° spin axis range (0° = pure backspin, 45° = heavy curve)
  - Location: homerunderby.js:275-277, 339-347

**Test Cases Added:**
- Created comprehensive test suite with 15 scenarios covering:
  - Speed range: 54-212 mph
  - Launch angles: 8-31°
  - Spin axis: 0-45°
- Location: test-cases.md, test-cases.json, test-trajectory.js

---

### Version 3.3.8
**Date:** 2025-10-20

#### Changes in this version:
- Initial physics implementation attempt
- Intermediate calibration testing

---

### Version 3.3.7
**Date:** 2025-10-18

#### Changes in this version:

**Putting Green:**
- **Fixed HLA Direction (was reversed)**
  - Flipped sign on horizontal launch angle
  - Negative HLA now correctly goes left, Positive HLA goes right
  - Example: -0.8° (left) now makes ball go left as expected
  - Location: putting-green.html:935

---

### Version 3.3.6
**Date:** 2025-10-18

#### Changes in this version:

**Putting Green:**
- **Added Horizontal Launch Angle Support**
  - Ball now responds to horizontal launch angle (HLA) from launch monitor
  - Positive HLA = ball goes right, Negative HLA = ball goes left
  - Example: 0.8° left makes ball travel slightly left from center line
  - Integrated with GSPro/FlightScope launch monitor data
  - Location: putting-green.html:911-952, 967-985

---

### Version 3.3.5
**Date:** 2025-10-18

#### Changes in this version:

**Putting Green:**
- **Fixed Grid Disappearing Bug**
  - Grid now always visible when toggled on
  - Previously: grid disappeared when break or elevation was applied
  - Now: base grid always shows, with colored topographical lines overlaid when slope is applied
  - Location: putting-green.html:832-902

---

### Version 3.3.4
**Date:** 2025-10-17

#### Changes in this version:

**Putting Green:**
- **Added Topographical Grid Visualization**
  - Press 'Y' key to toggle grid lines on/off
  - Lines show the slope direction visually
  - Color-coded based on slope type:
    - Orange lines for right break
    - Blue lines for left break
    - Red lines for uphill
    - Green lines for downhill
    - Gray grid when flat
  - Every 5th line is highlighted and colored
  - Lines update in real-time when adjusting break/elevation sliders
  - Location: putting-green.html:815-908

---

### Version 3.3.3
**Date:** 2025-10-17

#### Changes in this version:

**Putting Green:**
- **Fixed Uphill/Downhill Direction (was reversed)**
  - Uphill now correctly slows the ball down
  - Downhill now correctly speeds the ball up
  - Reversed force application for proper physics
  - Location: putting-green.html:567

- **Fixed Infinite Roll Bug with Break**
  - Ball now stops properly when speed drops below threshold
  - Added final speed check after all forces applied
  - Prevents ball from rolling forever with break enabled
  - Location: putting-green.html:617-623

---

### Version 3.3.2
**Date:** 2025-10-17

#### Changes in this version:

**Putting Green:**
- **Added Uphill/Downhill Elevation Control**
  - New slider: -10 (downhill) to +10 (uphill)
  - Each point = 0.5° of grade
  - Uphill: slows ball down (works against forward velocity)
  - Downhill: speeds ball up (assists forward velocity)
  - Grade angle display with color coding:
    - Red for uphill
    - Blue for downhill
    - Green for flat
  - Physics applies gravity component along slope
  - Location: putting-green.html:197-210, 557-566, 718-739

---

### Version 3.3.1
**Date:** 2025-10-17

#### Changes in this version:

**Putting Green:**
- **Added Slope Angle Display for Break**
  - Shows calculated slope angle in degrees below break slider
  - Each break point = 0.5° of slope
  - Color coded: Green when straight, Orange when breaking
  - Displays "Slope: X.X° Left/Right"
  - Helps visualize how much the green is sloped
  - Location: putting-green.html:192-194, 670-691

---

### Version 3.3.0
**Date:** 2025-10-17

#### Changes in this version:

**Putting Green:**
- **Implemented Stanford Physics Model for Putting**
  - Based on Kolkowitz 2007 research paper
  - Proper deceleration formula: `a = -(5/7) × ρ_g × g`
  - ρ_g ranges from 0.065 (fast, Stimp 14) to 0.196 (slow, Stimp 7)
  - Linear interpolation between Stimp values
  - **Fixed:** Ball was only rolling 3.6 ft at 5.9 mph (should be ~20-30 ft)
  - Now uses physics-accurate friction based on real golf ball rolling research
  - Location: putting-green.html:679-702

---

### Version 3.2.9
**Date:** 2025-10-17

#### Changes in this version:

**Putting Green:**
- **Added Distance to Hole Display**
  - Real-time display showing distance remaining to hole
  - Shows feet for distances > 1 ft
  - Shows inches for distances < 1 ft
  - Shows "< 6"" for very close putts
  - Gold color when very close (< 6 inches)
  - Updates continuously while ball is rolling
  - Location: putting-green.html:195-200, 593-609

---

### Version 3.2.8
**Date:** 2025-10-17

#### Changes in this version:

**Home Run Derby:**
- **Further Reduced Drag Coefficients for FlightScope Accuracy**
  - First test showed only 74.8 yards (should be 248.8 yards)
  - Reduced drag: `CD = 0.15 + 0.08 * S` (was 0.22 + 0.12)
  - Increased lift: `CL = 0.20 + 0.28 * S` (was 0.15 + 0.35)
  - Should give ~3x more distance
  - Location: homerun-derby.html:1299-1303

- **Added Realistic Rollout Physics**
  - Ball no longer "sticks" on landing
  - Spin-dependent bounce: high backspin = less bounce (ball digs in)
  - Grass friction coefficient: 0.97 (realistic rollout distance)
  - Keeps 80% forward momentum on landing (was 70%)
  - Gradual spin decay during rollout
  - Target: 8.5 yards of roll (FlightScope data)
  - Location: homerun-derby.html:1345-1385

---

### Version 3.2.7
**Date:** 2025-10-17

#### Changes in this version:

**Home Run Derby:**
- **Added Debug Test Shot Panel**
  - Manual input fields for ball speed, launch angle, side angle, back spin, and side spin
  - Allows testing specific shot parameters to validate physics accuracy
  - Collapsible panel with orange theme
  - Location: homerun-derby.html:215-243

- **Updated Ball Flight Physics (FlightScope Calibration)**
  - Adjusted aerodynamic coefficients to match FlightScope Trajectory Optimizer
  - New lift coefficient: `CL = 0.15 + 0.35 * S` (increased Magnus effect)
  - New drag coefficient: `CD = 0.22 + 0.12 * S` (reduced drag for realistic distances)
  - Reduced spin moment coefficient: `CM = 0.003 * S`
  - **Target:** Match FlightScope distances (e.g., 155mph, 12°, 2850rpm → 248.8 yards carry)
  - Location: homerun-derby.html:1269-1273

**Putting Green:**
- **Reduced Rolling Friction (70% reduction)**
  - Applied 0.3 scaling factor to Stimp-based friction calculation
  - Ball now rolls approximately 3x farther for same stroke power
  - Fixes "rolling in mud" feel - more realistic putting physics
  - Location: putting-green.html:666

#### FlightScope Test Cases (for validation):
1. 155 mph, 12°, 2850 rpm → Expected: 248.8 yd carry, 91.6 ft height, 6.7s
2. 170 mph, 10°, 2200 rpm → Expected: 274.5 yd carry, 83.6 ft height, 6.6s
3. 140 mph, 14°, 3500 rpm → Expected: 218.6 yd carry, 93.3 ft height, 6.5s
4. 165 mph, 11°, 2600 rpm, -2° left, -10° spin axis → Expected: 265.1 yd carry, 89.8 ft height, 6.7s

---

### Version 3.2.6
**Date:** 2025-10-17

**Changes:**
- Replaced Billiards with Putt-Practice on main menu
- Added distance slider (1-40 ft) to putting green
- Added Stimp slider (7-14) for green speed control
- Added break slider (-10 to +10) for curved putts
- Implemented behind and follow camera views for putting
- Fixed billiards ball rack spacing (tabled for future development)

---

### Version 3.2.3 - Logo, UI Improvements & Color Selection ⚾
**New features:**
- ✅ **Shanktuary Mini Games logo on building**
  - 90x90 logo on tallest building face
  - Centered at height 120 on front face
  - Uses modified logo: shanktuaryminigames-modified.png
- ✅ **Color picker for players**
  - Added color selection buttons (6 colors)
  - Prevents duplicate colors between players
  - Matches Darts implementation
  - Visual feedback with scale/glow on selected color
- ✅ **UI improvements**
  - Removed "Home Run Derby" title and green dot
  - Current Player now top element in control panel
  - Larger, bold player name (1.5em)

**Technical Changes:**
- homerun-derby.html:992-1009 - Added logo to building
- homerun-derby.html:205-208 - Removed title, promoted player indicator
- electron-index.html:3093-3106 - Added color picker buttons
- electron-index.html:3133-3147 - Added selectHomeRunDerbyPlayerColor() function

### Version 3.2.2 - UI Cleanup & Collapsible Stats ⚾
**UI improvements:**
- ✅ **Removed lower left and right boxes**
  - Hidden trajectory graph (lower left)
  - Hidden minimap (lower right)
  - Cleaner, less cluttered view
- ✅ **Collapsible shot details panel**
  - Added "▼ Shot Details" toggle button
  - Click to collapse/expand stats
  - Icon changes: ▼ (expanded) / ▶ (collapsed)
  - Smooth animation with fade effect

**Technical Changes:**
- homerun-derby.html:142-156 - Hidden minimap and shotTrajectory with `display: none`
- homerun-derby.html:97-116 - Added collapse styles and animations
- homerun-derby.html:216-218 - Added collapse toggle button
- homerun-derby.html:1535-1544 - Added toggleStats() function

### Version 3.2.1 - COMPLETE PHYSICS REWRITE: McNally et al. Model ⚾
**Major improvement:**
- ✅ **Replaced physics with proven NOVA extension implementation**
  - Using McNally et al. research paper aerodynamic model
  - Proper spin ratio: `S = R*ω/v`
  - Research-based coefficients (later updated in 3.2.7)
  - Correct Magnus force via cross product: `velocity × spin`
  - Spin decay with moment coefficient
  - Should completely eliminate tornado spinning

### Version 3.2.0 - MAJOR FIX: Magnus Force & Infinite Flight ⚾
**Critical fixes:**
- ✅ **Fixed tornado spinning and 50,000 ft distances**
  - Problem: Magnus force coefficient was WAY too high
  - Ball was spiraling endlessly in the air, never landing
  - Reduced Magnus coefficient significantly
  - Changed force calculation for more realistic behavior
- ✅ **Added maximum flight time safety**
  - Force ball to land after 15 seconds to prevent infinite flight
  - Prevents impossible distances

### Version 3.1.0 - NEW GAME: Home Run Derby! ⚾
**Major new feature:**
- ✅ **Home Run Derby game added!**
  - Full 3D baseball stadium with MLB-accurate Progressive Field dimensions
  - Outfield wall: 325-370-405-375-325 feet (left to right)
  - Smooth curved outfield wall with distance markers
  - City skyline backdrop with stadium lights
  - NOVA billboard with blue gradient and logo
  - Scoreboard displays: Player Name, Distance (FT), Carry (YDS), Apex (FT)
  - Real-time shot tracking with GSPro launch monitor integration
  - Player name automatically displayed on scoreboard
  - Support poles for billboards and scoreboard
  - Baseball diamond with accurate base positions (90-foot basepaths)
  - Pitcher's mound at regulation distance (60'6")

---

## 🎮 Active Games

### 1. Skee-Ball ✅
- Full game implementation with realistic ball physics
- Stimp-based green speed system
- Score tracking and multiplayer support

### 2. Home Run Derby 🔧
- Baseball stadium environment with realistic dimensions
- Ball flight physics using McNally aerodynamic model
- **NEW: Debug test shot panel for physics validation**
- **NEW: FlightScope-calibrated aerodynamic coefficients**
- Multi-player support with color-coded ball trails
- Real-time scoreboard display

### 3. Putt-Practice ✅
- Practice putting from 1-40 feet
- Stimp speed control (7-14)
- Break simulation (-10 to +10)
- **NEW: Reduced friction for realistic ball roll**
- Multiple camera views (Overhead, Behind, Follow, Side)

### 4. Bowling 🎳
- **UPGRADED: Cannon.js Physics Engine**
- Complete 10-frame bowling game with realistic physics
- Realistic 60-foot lane with gutters
- Proper bowling scoring (strikes, spares, cumulative)
- **NEW: Cannon.js physics for realistic pin collisions and momentum transfer**
- **NEW: Per-player bumpers mode (visual bumpers, orange gutters)**
- **NEW: Per-player power boost (1x-5x multipliers)**
- **NEW: Pin camera view with 3-second pause after collision**
- Pin-to-pin collisions with realistic ricocheting
- Multiplayer support (1-4 players)
- Ball hook physics from sidespin
- Works with putter or iron shots
- Test shot panel for debugging

### 5. Darts 🎯
- Full multiplayer darts game (Practice, 301, 501, Cricket, Killer)
- Projector mode support
- Calibration wizard
- Per-player power boost
- 1-6 players with custom colors

### 6. Soccer Penalty Kick ⚽ (BETA)
- Complete 3D penalty kick game with 4 modes
- Realistic stadium environment with tiered seating
- AI goalkeeper with diving mechanics
- Target practice mode with bonus points
- Multiplayer support (1-4 players)
- No calibration needed (uses HLA/VLA like baseball)

### 7. Billiards/Pool ⏸️
- Tabled for future development
- Basic physics implemented but needs refinement

---

## 🔧 Technical Notes

### Physics Systems
- **Golf Ball Aerodynamics:** McNally et al. model with spin-dependent lift/drag
- **Putting Friction:** Stimp-based calculation with 0.3 scaling factor
- **Bowling Physics:** Cannon.js physics engine with realistic collisions
  - Ball: 7.26 kg, friction 0.08 (oiled lane)
  - Pins: 1.5 kg, ground friction 0.4
  - Ball-pin restitution: 0.1 (minimal bounce)
  - Pin-pin restitution: 0.4 (realistic ricocheting)
- **Magnus Effect:** Proper lift force implementation for ball curve and hook
- **Pin Collision:** Full 3D physics with Cannon.js engine

### Known Issues
- Home run derby distances need validation against FlightScope data (use debug panel)
- Putting friction may need further tuning based on user feedback

### Next Steps
- Validate home run derby physics using debug panel with FlightScope test cases
- Collect user feedback on putting green friction levels
- Consider re-implementing billiards with improved collision detection

---

## 📁 Project Files

### Core Electron Files
```
/home/shreen/minigames/web/
├── package.json                  # Dependencies and build config
├── electron-main.js              # Main process (GSPro listener)
├── preload.js                    # IPC bridge for security
├── electron-index.html           # App UI (main menu)
├── darts_multiplayer.js          # Darts game logic
├── skeeball_putting.js           # Skee-Ball game logic
├── homerun-derby.html            # Home Run Derby game
├── putting-green.html            # Putting practice game
└── bowling.html                  # Bowling game
```

### Support Files
```
├── projector.html                # Projector window
├── ELECTRON_README.md            # User documentation
├── WINDOWS_FIREWALL_HELP.md      # Firewall troubleshooting
└── PROJECT_STATUS.md             # This file
```

### Built Apps
```
dist/
├── Shanktuary Golf Mini Games Setup 3.5.0.exe    # Windows installer
├── win-unpacked/                                  # Windows dev build
└── linux-unpacked/                                # Linux dev build (when built)
```

---

## 🚀 How to Rebuild

### Prerequisites
```bash
cd /home/shreen/minigames/web
npm install  # Only needed once
```

### Build Commands
```bash
# Build for Windows
npm run build:win

# Build for Linux
npm run build:linux

# Run in development mode
npm start
```

**Build time:** ~30-60 seconds per platform
**Output:** `dist/` directory

---

## 📊 Version History Summary

- **3.7.1** - Bug fixes: Soccer penalty wild shots now miss properly (removed angle clamping); Added gate post collisions to putting practice
- **3.7.0** - NEW GAME: Soccer Penalty Kick (BETA) with 4 game modes, AI goalkeeper, stadium environment, multiplayer support; Added 4 putting drills (Clock, Gate, Circle, Star); Fixed bowling test shot panel and Cannon.js import; Added putting player setup
- **3.6.0** - MAJOR: Integrated Cannon.js physics engine for bowling, added per-player bumpers and power boost, pin camera view, gutter ball scoring fix
- **3.5.2** - Fixed Cricket turn system bugs in both 2D and 3D darts, removed speed limits, fixed dartboard layout
- **3.5.1** - Added bowling alley atmosphere enhancements, adjacent lanes, retro carpet textures
- **3.5.0** - Fixed bowling player color selection bug, removed test shot panel from production
- **3.4.9** - Added complete Bowling game with 10-frame scoring, multiplayer support, realistic physics, and proper pin collision
- **3.4.8** - Added percentage-based hit outcomes for Baseball mode (realistic variability in results)
- **3.4.7** - Rebalanced Baseball hit distances for better gameplay
- **3.4.6** - Added 3D Darts full implementation, Baseball UI improvements, Putting Green Ladder Mode UI cleanup
- **3.4.5** - Added Baseball Mode (9-inning game with base runners), enhanced Derby Mode with longest drive tracking, fixed putting flagstick blocking, improved hole detection, removed wind indicator
- **3.4.4** - Added Ladder Mode to Putting Practice, upgraded to THREE.js r134, fixed camera view cycling
- **3.4.3** - Fixed Home Run Derby/Putting Practice loading in Electron, fixed WebGL shader errors on Linux
- **3.4.2** - Real-world calibration refinement, high spin correction, spin axis adjustments
- **3.4.1** - Edge case calibration for all club types, wedge shot improvements
- **3.4.0** - Fixed CSV export to include total spin & spin axis
- **3.3.9** - Fixed spin calculation from launch monitor, physics-based trajectory
- **3.3.8** - Initial physics implementation
- **3.3.7** - Fixed HLA direction (was reversed - left/right flipped)
- **3.3.6** - Added horizontal launch angle (HLA) support for putting
- **3.3.5** - Fixed grid disappearing when break/elevation applied
- **3.3.4** - Added topographical grid visualization (toggle with Y key)
- **3.3.3** - Fixed uphill/downhill direction, fixed infinite roll bug
- **3.3.2** - Added uphill/downhill elevation control with physics
- **3.3.1** - Added slope angle display for break visualization
- **3.3.0** - Implemented Stanford physics model for putting (proper deceleration)
- **3.2.9** - Added distance to hole display for putting green
- **3.2.8** - Further reduced drag, added realistic rollout physics (iteration 2)
- **3.2.7** - FlightScope calibration, debug panel, reduced putting friction
- **3.2.6** - Putt-Practice menu integration, Stimp/break controls
- **3.2.3** - Logo on building, color picker, UI improvements
- **3.2.1** - McNally physics model implementation
- **3.1.0** - Home Run Derby game added
- **3.0.9** - Skee-Ball library bundling fix
- **3.0.0** - Skee-Ball game added
- **2.3.0** - Per-player power boost for Darts
- **2.2.0** - Calibration wizard improvements
- **2.1.0** - Calibration features and fixes

---

## 🛠️ Development Notes

### Recent Session Work (Nov 8, 2025)
1. Fixed bowling player color selection bug in setup wizard
2. Removed test shot panel from production (kept in code as comments)
3. Improved UI cleanup for cleaner player experience

### Files Modified This Session
- electron-index.html (fixed color selection with refreshBowlingPlayerInputs function)
- bowling.html (commented out test shot panel and functions)
- package.json (version bump to 3.5.0)
- PROJECT_STATUS.md (updated with bug fixes)

---

**Last updated:** November 17, 2025
**Current Build:** Shanktuary Golf Mini Games Setup 4.4.0.exe
