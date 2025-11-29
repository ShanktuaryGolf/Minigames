# Home Run Derby Test Cases

## From ShotScope Data (fs.csv) - Updated with Spin Axis

### Test 1: Weak Contact - Pop Fly
- **Ball Speed**: 70 mph
- **VLA (Vertical Launch)**: 25°
- **HLA (Horizontal Launch)**: -3° (left)
- **Total Spin**: 8000 rpm
- **Spin Axis**: 5° (mostly backspin, slight hook)
- **Expected Carry**: 83.9 yards (251.7 feet)
- **Expected Result**: Pop Fly ⚾

### Test 2: Medium Contact - Long Fly Out
- **Ball Speed**: 100 mph
- **VLA**: 18°
- **HLA**: 4° (right)
- **Total Spin**: 5500 rpm
- **Spin Axis**: 8° (mostly backspin, slight fade)
- **Expected Carry**: 147.5 yards (442.5 feet)
- **Expected Result**: Monster Shot 🚀 (just over 450 ft threshold)

### Test 3: Good Contact - Monster Shot
- **Ball Speed**: 150 mph
- **VLA**: 12°
- **HLA**: -6° (left)
- **Total Spin**: 2700 rpm
- **Spin Axis**: 12° (good backspin, some hook)
- **Expected Carry**: 271.2 yards (813.6 feet)
- **Expected Result**: Monster Shot 🚀

### Test 4: Extreme Contact - Monster Shot
- **Ball Speed**: 212 mph
- **VLA**: 10°
- **HLA**: 7° (right)
- **Total Spin**: 2000 rpm
- **Spin Axis**: 15° (lower backspin, more fade)
- **Expected Carry**: 455.1 yards (1365.3 feet)
- **Expected Result**: Monster Shot 🚀

## Additional Test Cases

### Test 5: Just Below Home Run Threshold
- **Ball Speed**: 135 mph
- **VLA**: 20°
- **HLA**: 0°
- **Total Spin**: 3500 rpm
- **Spin Axis**: 0° (pure backspin)
- **Expected Carry**: ~120 yards (360 feet)
- **Expected Result**: Long Fly Out 🏃

### Test 6: Just Above Home Run Threshold
- **Ball Speed**: 145 mph
- **VLA**: 20°
- **HLA**: 0°
- **Total Spin**: 3500 rpm
- **Spin Axis**: 0° (pure backspin)
- **Expected Carry**: ~130 yards (390 feet)
- **Expected Result**: Home Run 💥

### Test 7: Foul Ball (Too Far Left)
- **Ball Speed**: 160 mph
- **VLA**: 15°
- **HLA**: -30° (way left)
- **Total Spin**: 3000 rpm
- **Spin Axis**: 20° (hook spin)
- **Expected Result**: Foul Ball ⚾

### Test 8: Foul Ball (Too Far Right)
- **Ball Speed**: 160 mph
- **VLA**: 15°
- **HLA**: 30° (way right)
- **Total Spin**: 3000 rpm
- **Spin Axis**: 25° (slice spin)
- **Expected Result**: Foul Ball ⚾

### Test 9: Too Weak (Below 140 mph threshold)
- **Ball Speed**: 130 mph
- **VLA**: 25°
- **HLA**: 0°
- **Total Spin**: 4000 rpm
- **Spin Axis**: 0° (pure backspin)
- **Expected Result**: "Too Weak! Need 140+ mph"

### Test 10: Perfect Center Shot
- **Ball Speed**: 180 mph
- **VLA**: 15°
- **HLA**: 0°
- **Total Spin**: 2500 rpm
- **Spin Axis**: 0° (pure backspin)
- **Expected Carry**: ~200 yards (600 feet)
- **Expected Result**: Monster Shot 🚀

### Test 11: High Launch, Lower Speed
- **Ball Speed**: 155 mph
- **VLA**: 30°
- **HLA**: 2°
- **Total Spin**: 4000 rpm
- **Spin Axis**: 10° (high backspin with slight fade)
- **Expected Carry**: ~145 yards (435 feet)
- **Expected Result**: Monster Shot 🚀

### Test 12: Low Launch, High Speed
- **Ball Speed**: 175 mph
- **VLA**: 8°
- **HLA**: -2°
- **Total Spin**: 2000 rpm
- **Spin Axis**: 18° (lower backspin, more hook)
- **Expected Carry**: ~165 yards (495 feet)
- **Expected Result**: Monster Shot 🚀

### Test 13: Draw Shot (Hook Spin)
- **Ball Speed**: 165 mph
- **VLA**: 14°
- **HLA**: -5° (left)
- **Total Spin**: 3200 rpm
- **Spin Axis**: 25° (significant hook)
- **Expected Carry**: ~180 yards (540 feet)
- **Expected Result**: Monster Shot 🚀 (curves left)

### Test 14: Fade Shot (Slice Spin)
- **Ball Speed**: 165 mph
- **VLA**: 14°
- **HLA**: 5° (right)
- **Total Spin**: 3200 rpm
- **Spin Axis**: 30° (significant fade)
- **Expected Carry**: ~180 yards (540 feet)
- **Expected Result**: Monster Shot 🚀 (curves right)

### Test 15: Maximum Spin Axis
- **Ball Speed**: 170 mph
- **VLA**: 16°
- **HLA**: 10° (right)
- **Total Spin**: 3500 rpm
- **Spin Axis**: 45° (equal backspin and sidespin)
- **Expected Carry**: ~190 yards (570 feet)
- **Expected Result**: Monster Shot 🚀 (heavy curve)

---

## Quick Reference

**Distance Thresholds:**
- Pop Fly: < 300 feet
- Long Fly Out: 300-379 feet (5 points)
- Home Run: 380-449 feet (20 points) 💥
- Monster Shot: 450+ feet (30 points) 🚀
- Foul: HLA > 25° or < -25°
- Too Weak: Ball Speed < 140 mph

**Conversions:**
- 1 yard = 3 feet
- 380 feet = 126.7 yards
- 450 feet = 150 yards

**Spin Axis Guide:**
- 0° = Pure backspin (straight flight, max carry)
- 10-15° = Slight curve, typical good contact
- 20-30° = Moderate curve (draw/fade)
- 35-45° = Heavy curve (hook/slice)
- Positive spin axis with right HLA = fade/slice
- Positive spin axis with left HLA = draw/hook
