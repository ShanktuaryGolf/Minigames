# FlightScope Trajectory Query Helper

This document provides tools to quickly query the FlightScope Trajectory Optimizer with your shot data.

## Quick Copy-Paste Template

When you have shot data from the game, use this template to organize it:

```
Ball Speed: ____ mph
VLA: ____ °
HLA: ____ °
Total Spin: ____ rpm
Spin Axis: ____ °

BackSpin (calculated): ____ rpm
SideSpin (calculated): ____ rpm
```

## Method 1: Manual Browser Query (Fastest)

1. Open https://trajectory.flightscope.com/ in your browser
2. Convert your values:
   - **BackSpin** = Total Spin × cos(Spin Axis)
   - **SideSpin** = Total Spin × sin(Spin Axis)
3. Enter the values and click Calculate

### Example from your bug report:
```
Ball Speed: 25.0 mph
VLA: 3.0°
HLA: -0.0°
Total Spin: 950 rpm
Spin Axis: 30.0°

BackSpin = 950 × cos(30°) = 950 × 0.866 = 822 rpm
SideSpin = 950 × sin(30°) = 950 × 0.5 = 475 rpm
```

## Method 2: JavaScript Calculator (In Browser Console)

Open the browser console on the FlightScope page and paste this:

```javascript
function calculateSpin(totalSpin, spinAxis) {
    const spinAxisRad = (spinAxis * Math.PI) / 180;
    const backSpin = Math.round(totalSpin * Math.cos(spinAxisRad));
    const sideSpin = Math.round(totalSpin * Math.sin(spinAxisRad));

    console.log(`Total Spin: ${totalSpin} rpm`);
    console.log(`Spin Axis: ${spinAxis}°`);
    console.log(`→ BackSpin: ${backSpin} rpm`);
    console.log(`→ SideSpin: ${sideSpin} rpm`);

    return { backSpin, sideSpin };
}

// Example usage:
calculateSpin(950, 30.0);
```

## Method 3: Command Line Calculator

Create this bash script as `calc-spin.sh`:

```bash
#!/bin/bash

if [ $# -ne 2 ]; then
    echo "Usage: ./calc-spin.sh <total_spin> <spin_axis_deg>"
    echo "Example: ./calc-spin.sh 950 30.0"
    exit 1
fi

TOTAL_SPIN=$1
SPIN_AXIS=$2

# Calculate using bc (basic calculator)
BACKSPIN=$(echo "scale=0; $TOTAL_SPIN * c($SPIN_AXIS * 3.14159265359 / 180)" | bc -l)
SIDESPIN=$(echo "scale=0; $TOTAL_SPIN * s($SPIN_AXIS * 3.14159265359 / 180)" | bc -l)

echo "Total Spin: $TOTAL_SPIN rpm"
echo "Spin Axis: $SPIN_AXIS°"
echo "→ BackSpin: ${BACKSPIN%.*} rpm"
echo "→ SideSpin: ${SIDESPIN%.*} rpm"
```

Make it executable:
```bash
chmod +x calc-spin.sh
./calc-spin.sh 950 30.0
```

## Method 4: Python Calculator

Create `calc-spin.py`:

```python
#!/usr/bin/env python3
import sys
import math

if len(sys.argv) != 3:
    print("Usage: python3 calc-spin.py <total_spin> <spin_axis_deg>")
    print("Example: python3 calc-spin.py 950 30.0")
    sys.exit(1)

total_spin = float(sys.argv[1])
spin_axis = float(sys.argv[2])

spin_axis_rad = math.radians(spin_axis)
backspin = round(total_spin * math.cos(spin_axis_rad))
sidespin = round(total_spin * math.sin(spin_axis_rad))

print(f"Total Spin: {total_spin:.0f} rpm")
print(f"Spin Axis: {spin_axis:.1f}°")
print(f"→ BackSpin: {backspin} rpm")
print(f"→ SideSpin: {sidespin} rpm")
```

Usage:
```bash
python3 calc-spin.py 950 30.0
```

## Quick Reference: Common Spin Axis Angles

| Spin Axis | BackSpin % | SideSpin % | Description |
|-----------|------------|------------|-------------|
| 0°        | 100%       | 0%         | Pure backspin |
| 15°       | 96.6%      | 25.9%      | Slight curve |
| 30°       | 86.6%      | 50.0%      | Moderate curve |
| 45°       | 70.7%      | 70.7%      | Equal back/side |
| 60°       | 50.0%      | 86.6%      | Heavy curve |
| 90°       | 0%         | 100%       | Pure sidespin |

## Automated Script (Advanced)

If puppeteer installation completes, you can use:

```bash
npm run flightscope 25.0 3.0 -0.0 950 30.0
```

Or directly:
```bash
node flightscope-query.js 25.0 3.0 -0.0 950 30.0
```

This will:
1. Launch a browser window
2. Navigate to FlightScope
3. Fill in the form automatically
4. Calculate BackSpin/SideSpin from Total Spin and Spin Axis
5. Submit the form
6. Leave the browser open so you can see results

Note: This requires puppeteer to be installed (`npm install puppeteer`)
