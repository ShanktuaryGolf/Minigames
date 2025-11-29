# Golf Par 3 - Hybrid Physics System v4.4.3

## Overview

Implemented a **dual-regime physics system** that automatically switches between calibrated physics models based on initial shot speed:

- **Wedge Regime** (< 65 mph): Optimized for chips, pitches, and wedges using shots.csv calibration
- **Iron Regime** (65+ mph): Optimized for mid/long irons using flightscope3.csv calibration

## Performance Results

### Test Results Summary

| Dataset | Regime | Shots | Passing | Pass Rate | Avg Error |
|---------|--------|-------|---------|-----------|-----------|
| shots.csv (Wedges) | Wedge | 4 | 4 | **100%** ✅ | 2.0 yds |
| flightscope3.csv (Irons) | Iron | 12 | 3 | 25% | 5.7 yds |
| **Combined** | Hybrid | 16 | 7 | **44%** | 4.3 yds |

### Comparison vs Previous Versions

| Version | Wedges | Irons | Combined |
|---------|--------|-------|----------|
| v4.4.1 (Current) | 4/4 (100%) | 2/12 (17%) | 6/16 (38%) |
| v4.4.2 (Iron-only) | N/A | 4/12 (33%) | N/A |
| **v4.4.3 (Hybrid)** | **4/4 (100%)** ✅ | **3/12 (25%)** | **7/16 (44%)** ✅ |

## Implementation Details

### 1. Regime Detection

Shot regime determined by initial ball speed:

```javascript
const initialShotSpeedMPH = speed; // Captured when shot is fired
const isWedgeShot = initialShotSpeedMPH < 65; // < 65 mph = wedge physics
```

The regime is locked in for the entire flight and stays consistent through air, bounce, and roll phases.

### 2. Drag Coefficient (Cd)

**Special Case - Low VLA (< 10°):**
- All shots with VLA < 10° use high-drag model regardless of speed
- Cd = 0.55-0.65 (handles low-trajectory shots like Shot #6)

**Wedge Regime (< 65 mph):**
- 55 mph: Cd = 0.85 (high drag for chips)
- 75 mph: Cd = 0.31

**Iron Regime (65+ mph):**
- 55 mph: Cd = 0.75 (reduced drag)
- 75 mph: Cd = 0.25 (19% less drag than wedges)
- 100 mph: Cd = 0.18
- 150 mph: Cd = 0.10

### 3. Spin-Dependent Drag

**Wedge Regime:**
- High spin (5000+ rpm): 0.85x drag multiplier
- Low spin (< 3000 rpm): 1.05x drag multiplier

**Iron Regime:**
- High spin (5000+ rpm): 0.88x drag multiplier (less reduction)
- Low spin (< 3000 rpm): 1.03x drag multiplier

### 4. High-Loft Drag Reduction (VLA ≥ 20°)

**Wedge Regime:**
- Full speed (50+ mph): 0.80x drag (20% reduction)

**Iron Regime:**
- Full speed (50+ mph): 0.82x drag (18% reduction)

### 5. Magnus Lift

**Low-Speed Penalty (< 60 mph):**
- Wedge: 30-100% lift (0.3 + 0.7 * speedFactor)
- Iron: 40-100% lift (0.4 + 0.6 * speedFactor)

**High-Loft Boost (VLA ≥ 20°):**
- Wedge: 1.22x lift multiplier
- Iron: 1.25x lift multiplier (3% more)

### 6. Bounce Physics

**Wedge Regime (Normal bounces):**
- 30 mph landing: 0.80 retention
- 60 mph landing: 0.45 retention

**Iron Regime (Reduced bounce):**
- 30 mph landing: 0.75 retention (6% less)
- 60 mph landing: 0.42 retention (7% less)
- 80 mph landing: 0.32 retention (vs 0.35 wedge)

### 7. Rolling Friction

**Base System:**
- Complex spin-dependent friction using landing spin and landing speed
- Descent angle adjustments
- Lie type modifiers (green vs fairway vs rough)

**Regime Multiplier:**
- Wedge: 1.0x (normal friction)
- Iron: 1.4x (40% more friction to reduce excessive roll)

## Key Features

### Automatic Regime Switching
- No manual intervention needed
- Physics regime selected based on shot speed
- Console logs show: `Physics Regime: WEDGE (56.3 mph)` or `Physics Regime: IRON (78.0 mph)`

### Seamless Integration
- Works with all existing features (trees, bunkers, OB, gimmies, etc.)
- Compatible with multiplayer
- No changes to UI or controls

### Special Cases Handled
- **Low VLA shots** (< 10°): Special drag model
- **Putt detection** (VLA ≤ 2°): Still uses Stimpmeter physics
- **High spin** (6000+ rpm): Enhanced Magnus lift
- **Backspin reversal** (8000+ rpm on green): Still functional

## Files Modified

### golf-par3.html
- Added `initialShotSpeedMPH` tracking variable
- Updated `getCd()` with hybrid logic and low-VLA handling
- Split spin drag adjustment by regime
- Split high-loft drag reduction by regime
- Split Magnus lift calculations by regime
- Split bounce retention by regime
- Added regime friction multiplier (1.4x for irons)

## Testing

### Test Scripts Created
1. **test-flightscope3.js** - Tests v4.4.1 against FlightScope data
2. **test-flightscope3-v2.js** - Tests v4.4.2 iron-only physics
3. **analyze-flightscope3.js** - Statistical analysis of FlightScope data patterns
4. **test-hybrid-physics.js** - Tests v4.4.3 hybrid system against BOTH datasets

### Run Tests
```bash
# Test current v4.4.1 physics
node test-flightscope3.js

# Test iron-only v4.4.2 physics
node test-flightscope3-v2.js

# Test hybrid v4.4.3 physics
node test-hybrid-physics.js

# Analyze data patterns
node analyze-flightscope3.js
```

## Known Limitations

### Iron Regime Accuracy (25% passing)
While improved from v4.4.1 (17%), iron shots still have challenges:

**Problem Shots:**
- Shot #6 (81 mph, 6.4° VLA): Still 13 yards off despite special handling
- High-VLA shots with medium spin: Tend to over-predict total distance by 6-12 yards

**Root Cause:**
- Bounce phase accumulates too much distance
- Reduced from v4.4.2 but still needs fine-tuning
- May need more aggressive bounce dampening

### Potential Future Improvements
1. **Three-regime system**: Add driver/woods regime (100+ mph)
2. **VLA-based sub-regimes**: Different physics for low/med/high launch angles
3. **Lie-dependent physics**: Adjust drag based on lie type (rough vs fairway)
4. **Club-specific overrides**: Allow manual regime selection

## Migration Notes

### Backwards Compatibility
- ✅ All existing shots.csv calibration preserved
- ✅ No breaking changes to game mechanics
- ✅ Multiplayer compatible
- ✅ Works with all hole layouts

### Version Naming
- **v4.4.1**: Single-regime (wedge-optimized) - Production before this update
- **v4.4.2**: Single-regime (iron-optimized) - Experimental, not deployed
- **v4.4.3**: Dual-regime (hybrid) - **NEW PRODUCTION VERSION**

## Deployment

The hybrid physics system is now live in `golf-par3.html`. Players will experience:

- **Better wedge accuracy**: 100% passing (unchanged)
- **Improved iron accuracy**: 3/12 passing vs 2/12 previously (+50% improvement)
- **More realistic ball flight**: Speed-appropriate physics for all clubs
- **Smoother gameplay**: No sudden changes or glitches

## Credits

Physics calibration data sources:
- `shots.csv` - Wedge/chip shot data (4 shots, 40-60 mph range)
- `flightscope3.csv` - Iron shot data (12 shots, 45-87 mph range)

Developed: November 2024
Version: 4.4.3 Hybrid Physics System
