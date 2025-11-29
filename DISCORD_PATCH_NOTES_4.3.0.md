# Shanktuary Golf Mini Games - Version 4.3.0

## What's New

### Advanced Ball Physics Calibration
The ball flight physics have been **further refined** using additional **FlightScope trajectory data** to handle different spin rates accurately:

- **Spin-Dependent Drag Coefficient** - High spin shots now fly farther due to Magnus lift reducing effective drag
- Calibrated with **two new FlightScope test shots**:
  - Mid-spin wedge (3389 RPM): Accuracy within **±1.9 yards**
  - High-spin approach (5493 RPM): Accuracy within **±0.6 yards**
- Both test cases passing within ±2 yard tolerance

### Refined Rollout Physics
Ball rollout after landing now properly accounts for spin:

- **High spin shots** (5000+ RPM): Ball grips the green and stops quickly
- **Mid spin shots** (3000-4000 RPM): Moderate rollout with graduated friction
- **Low spin shots** (<3000 RPM): Ball releases and rolls more freely
- Landing speed and spin now stored at first bounce for consistent rollout behavior

### Bounce Behavior Fix
Critical fix for how spin affects bounce:

- **High spin now REDUCES bounce** (ball checks and grips)
- **Low spin allows normal bounce** (ball skips and releases)
- Previously had this backwards - high spin shots are now much more realistic

---

**Download:** `Shanktuary Golf Mini Games Setup 4.3.0.exe` (194 MB)

Enjoy even more accurate golf physics!
