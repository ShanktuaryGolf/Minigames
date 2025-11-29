#!/usr/bin/env python3
"""
FlightScope Spin Calculator

Converts Total Spin + Spin Axis to BackSpin + SideSpin
for use with FlightScope Trajectory Optimizer

Usage:
    python3 calc-spin.py <total_spin> <spin_axis_deg>

Example:
    python3 calc-spin.py 950 30.0
"""

import sys
import math

def calculate_spin(total_spin, spin_axis):
    """Calculate backspin and sidespin from total spin and spin axis."""
    spin_axis_rad = math.radians(spin_axis)
    backspin = round(total_spin * math.cos(spin_axis_rad))
    sidespin = round(total_spin * math.sin(spin_axis_rad))
    return backspin, sidespin

def main():
    if len(sys.argv) != 3:
        print("\n❌ Invalid arguments!")
        print("\nUsage:")
        print("    python3 calc-spin.py <total_spin> <spin_axis_deg>")
        print("\nExample:")
        print("    python3 calc-spin.py 950 30.0")
        print("\nThis will calculate the BackSpin and SideSpin components")
        print("for entering into the FlightScope Trajectory Optimizer.\n")
        sys.exit(1)

    try:
        total_spin = float(sys.argv[1])
        spin_axis = float(sys.argv[2])
    except ValueError:
        print("\n❌ Error: Arguments must be numbers!\n")
        sys.exit(1)

    backspin, sidespin = calculate_spin(total_spin, spin_axis)

    print("\n" + "="*50)
    print("🏌️  FlightScope Spin Calculator")
    print("="*50)
    print(f"\n📥 Input:")
    print(f"   Total Spin: {total_spin:.0f} rpm")
    print(f"   Spin Axis:  {spin_axis:.1f}°")
    print(f"\n📤 Output (for FlightScope):")
    print(f"   BackSpin:   {backspin} rpm")
    print(f"   SideSpin:   {sidespin} rpm")

    # Calculate percentages for reference
    if total_spin > 0:
        back_pct = abs(backspin / total_spin * 100)
        side_pct = abs(sidespin / total_spin * 100)
        print(f"\n📊 Breakdown:")
        print(f"   {back_pct:.1f}% backspin")
        print(f"   {side_pct:.1f}% sidespin")

    print(f"\n🌐 Now enter these values at:")
    print(f"   https://trajectory.flightscope.com/\n")

if __name__ == "__main__":
    main()
