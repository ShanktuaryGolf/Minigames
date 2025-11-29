#!/bin/bash
#
# FlightScope Quick Helper
# Calculates BackSpin/SideSpin and optionally opens FlightScope website
#
# Usage:
#   ./flightscope.sh <total_spin> <spin_axis>
#   ./flightscope.sh <total_spin> <spin_axis> --open
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Run the Python calculator
python3 "$SCRIPT_DIR/calc-spin.py" "$1" "$2"

# If --open flag is provided, open the browser
if [ "$3" = "--open" ]; then
    echo "🌐 Opening FlightScope in browser..."
    xdg-open "https://trajectory.flightscope.com/" 2>/dev/null || \
    sensible-browser "https://trajectory.flightscope.com/" 2>/dev/null || \
    firefox "https://trajectory.flightscope.com/" 2>/dev/null || \
    google-chrome "https://trajectory.flightscope.com/" 2>/dev/null || \
    echo "⚠ Could not open browser automatically. Please visit: https://trajectory.flightscope.com/"
fi
