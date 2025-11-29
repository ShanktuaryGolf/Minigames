#!/usr/bin/env python3
"""
FlightScope Trajectory Optimizer Automation

Automatically queries FlightScope with your shot data and returns the results.

Usage:
    python3 flightscope-auto.py <ball_speed> <vla> <hla> <spin> <spin_axis>

Example:
    python3 flightscope-auto.py 25.0 3.0 -0.5 950 30.0

Requirements:
    pip install selenium
"""

import sys
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
from selenium.webdriver.firefox.options import Options

def query_flightscope(ball_speed, vla, hla, spin, spin_axis):
    """
    Query FlightScope Trajectory Optimizer with shot parameters.

    Args:
        ball_speed: Ball speed in mph
        vla: Vertical launch angle in degrees
        hla: Horizontal launch angle in degrees
        spin: Total spin in rpm
        spin_axis: Spin axis in degrees (0 = straight back, positive = right)
    """

    print("\n" + "="*60)
    print("🏌️  FlightScope Trajectory Optimizer Query")
    print("="*60)
    print(f"\n📥 Input Parameters:")
    print(f"   Ball Speed:  {ball_speed} mph")
    print(f"   Launch V:    {vla}°")
    print(f"   Launch H:    {hla}°")
    print(f"   Spin:        {spin} rpm")
    print(f"   Spin Axis:   {spin_axis}°")

    # Determine direction based on HLA
    direction = "Left" if hla < 0 else "Right" if hla > 0 else "Straight"
    spin_direction = "Left" if spin_axis < 0 else "Right" if spin_axis > 0 else "Straight"

    print(f"\n🎯 Calculated:")
    print(f"   Direction:      {direction}")
    print(f"   Spin Direction: {spin_direction}")

    print("\n🌐 Launching browser...")

    # Set up Firefox options
    options = Options()
    # options.add_argument('--headless')  # Uncomment to run without GUI

    # Create driver
    driver = webdriver.Firefox(options=options)

    try:
        # Navigate to FlightScope
        print("📡 Connecting to FlightScope...")
        driver.get("https://trajectory.flightscope.com/")

        # Wait for page to load
        wait = WebDriverWait(driver, 10)

        # Wait for form to be present
        print("⏳ Waiting for form to load...")
        time.sleep(2)  # Give it time to fully initialize

        # Fill in the form fields
        print("📝 Filling in form fields...")

        # Launch V (deg)
        launch_v = wait.until(EC.presence_of_element_located((By.XPATH, "//input[contains(@class, 'form-control') and preceding-sibling::label[contains(text(), 'Launch V')]]")))
        launch_v.clear()
        launch_v.send_keys(str(vla))
        print(f"   ✓ Launch V: {vla}°")

        # Ball (mph)
        ball_mph = driver.find_element(By.XPATH, "//input[contains(@class, 'form-control') and preceding-sibling::label[contains(text(), 'Ball')]]")
        ball_mph.clear()
        ball_mph.send_keys(str(ball_speed))
        print(f"   ✓ Ball Speed: {ball_speed} mph")

        # Launch H (deg)
        launch_h = driver.find_element(By.XPATH, "//input[contains(@class, 'form-control') and preceding-sibling::label[contains(text(), 'Launch H')]]")
        launch_h.clear()
        launch_h.send_keys(str(abs(hla)))  # Use absolute value
        print(f"   ✓ Launch H: {abs(hla)}°")

        # Launch H Direction dropdown
        direction_select = Select(driver.find_element(By.XPATH, "//select[preceding-sibling::label[contains(text(), 'Launch H')]]"))
        direction_select.select_by_visible_text(direction)
        print(f"   ✓ Direction: {direction}")

        # Spin (rpm)
        spin_input = driver.find_element(By.XPATH, "//input[contains(@class, 'form-control') and preceding-sibling::label[contains(text(), 'Spin')]]")
        spin_input.clear()
        spin_input.send_keys(str(spin))
        print(f"   ✓ Spin: {spin} rpm")

        # Spin Axis (deg)
        spin_axis_input = driver.find_element(By.XPATH, "//input[contains(@class, 'form-control') and preceding-sibling::label[contains(text(), 'Spin Axis')]]")
        spin_axis_input.clear()
        spin_axis_input.send_keys(str(abs(spin_axis)))  # Use absolute value
        print(f"   ✓ Spin Axis: {abs(spin_axis)}°")

        # Spin Axis Direction dropdown
        spin_direction_select = Select(driver.find_element(By.XPATH, "//select[preceding-sibling::label[contains(text(), 'Spin Axis')]]"))
        spin_direction_select.select_by_visible_text(spin_direction)
        print(f"   ✓ Spin Direction: {spin_direction}")

        print("\n⏳ Calculating trajectory...")
        time.sleep(2)  # Wait for calculation to complete

        # Try to extract results
        print("\n📊 Results:")
        try:
            # Look for result elements (these selectors may need adjustment)
            carry_distance = driver.find_element(By.XPATH, "//div[contains(text(), 'Carry')]").text
            total_distance = driver.find_element(By.XPATH, "//div[contains(text(), 'Total')]").text
            max_height = driver.find_element(By.XPATH, "//div[contains(text(), 'Height')]").text

            print(f"   {carry_distance}")
            print(f"   {total_distance}")
            print(f"   {max_height}")
        except:
            print("   ⚠ Could not automatically extract results")
            print("   📺 Please view results in browser window")

        print("\n✅ Complete! Browser will stay open so you can view detailed results.")
        print("   Press Ctrl+C to close the browser when done.\n")

        # Keep browser open
        input("\nPress Enter to close browser...")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\n📺 Browser will stay open for manual review.")
        input("\nPress Enter to close browser...")

    finally:
        driver.quit()

def main():
    if len(sys.argv) != 6:
        print("\n❌ Invalid arguments!")
        print("\nUsage:")
        print("    python3 flightscope-auto.py <ball_speed> <vla> <hla> <spin> <spin_axis>")
        print("\nExample:")
        print("    python3 flightscope-auto.py 25.0 3.0 -0.5 950 30.0")
        print("\nParameters:")
        print("    ball_speed  - Ball speed in mph (e.g., 25.0)")
        print("    vla         - Vertical launch angle in degrees (e.g., 3.0)")
        print("    hla         - Horizontal launch angle in degrees (e.g., -0.5)")
        print("    spin        - Total spin in rpm (e.g., 950)")
        print("    spin_axis   - Spin axis in degrees (e.g., 30.0)")
        print("\nNote: Negative HLA = left, Positive = right")
        print("      Negative Spin Axis = left, Positive = right\n")
        sys.exit(1)

    try:
        ball_speed = float(sys.argv[1])
        vla = float(sys.argv[2])
        hla = float(sys.argv[3])
        spin = float(sys.argv[4])
        spin_axis = float(sys.argv[5])
    except ValueError:
        print("\n❌ All arguments must be valid numbers!\n")
        sys.exit(1)

    query_flightscope(ball_speed, vla, hla, spin, spin_axis)

if __name__ == "__main__":
    main()
