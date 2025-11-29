#!/usr/bin/env node

/**
 * FlightScope Trajectory Optimizer Query Script
 *
 * This script automates querying the FlightScope trajectory optimizer
 * by launching a headless browser and filling in the form.
 *
 * Usage:
 *   node flightscope-query.js <speed> <vla> <hla> <totalSpin> <spinAxis>
 *
 * Example:
 *   node flightscope-query.js 25.0 3.0 -0.0 950 30.0
 */

const puppeteer = require('puppeteer');

async function queryFlightScope(ballSpeed, vla, hla, totalSpin, spinAxis) {
    console.log('\n🏌️  FlightScope Trajectory Query');
    console.log('================================\n');
    console.log('Input Parameters:');
    console.log(`  Ball Speed:  ${ballSpeed} mph`);
    console.log(`  VLA:         ${vla}°`);
    console.log(`  HLA:         ${hla}°`);
    console.log(`  Total Spin:  ${totalSpin} rpm`);
    console.log(`  Spin Axis:   ${spinAxis}°`);
    console.log('\nLaunching browser...\n');

    const browser = await puppeteer.launch({
        headless: false, // Set to true for background operation
        defaultViewport: { width: 1280, height: 800 }
    });

    try {
        const page = await browser.newPage();

        // Navigate to FlightScope Trajectory Optimizer
        console.log('📡 Navigating to FlightScope...');
        await page.goto('https://trajectory.flightscope.com/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait for the page to fully load
        await page.waitForTimeout(2000);

        // Try to find and fill in the form fields
        // Note: These selectors may need to be updated based on the actual page structure
        console.log('📝 Filling in form...');

        // Calculate backspin and sidespin from total spin and spin axis
        const spinAxisRad = (spinAxis * Math.PI) / 180;
        const backSpin = Math.round(totalSpin * Math.cos(spinAxisRad));
        const sideSpin = Math.round(totalSpin * Math.sin(spinAxisRad));

        // Common field names/IDs for golf trajectory calculators
        // We'll try multiple selectors
        const fieldMappings = [
            { value: ballSpeed, selectors: ['#ballSpeed', 'input[name="ballSpeed"]', 'input[name="speed"]', 'input[placeholder*="Ball Speed"]'] },
            { value: vla, selectors: ['#launchAngle', '#vla', 'input[name="launchAngle"]', 'input[name="vla"]', 'input[placeholder*="Launch Angle"]'] },
            { value: hla, selectors: ['#launchDirection', '#hla', 'input[name="launchDirection"]', 'input[name="hla"]', 'input[placeholder*="Launch Direction"]'] },
            { value: backSpin, selectors: ['#backSpin', 'input[name="backSpin"]', 'input[name="backspin"]', 'input[placeholder*="Back Spin"]'] },
            { value: sideSpin, selectors: ['#sideSpin', 'input[name="sideSpin"]', 'input[name="sidespin"]', 'input[placeholder*="Side Spin"]'] },
        ];

        console.log(`  BackSpin (calculated): ${backSpin} rpm`);
        console.log(`  SideSpin (calculated): ${sideSpin} rpm\n`);

        // Try to fill each field
        for (const field of fieldMappings) {
            let filled = false;
            for (const selector of field.selectors) {
                try {
                    const element = await page.$(selector);
                    if (element) {
                        await element.click({ clickCount: 3 }); // Select all
                        await element.type(field.value.toString());
                        filled = true;
                        console.log(`  ✓ Filled ${selector}: ${field.value}`);
                        break;
                    }
                } catch (err) {
                    // Try next selector
                }
            }
            if (!filled) {
                console.log(`  ⚠ Could not find field for value: ${field.value}`);
            }
        }

        // Look for submit/calculate button
        console.log('\n🔍 Looking for calculate button...');
        const buttonSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Calculate")',
            'button:has-text("Submit")',
            'button:has-text("Go")',
            '#calculate',
            '#submit'
        ];

        let submitted = false;
        for (const selector of buttonSelectors) {
            try {
                const button = await page.$(selector);
                if (button) {
                    console.log(`  ✓ Found button: ${selector}`);
                    await button.click();
                    submitted = true;
                    break;
                }
            } catch (err) {
                // Try next selector
            }
        }

        if (submitted) {
            console.log('\n⏳ Waiting for results...\n');
            await page.waitForTimeout(3000);

            // Try to extract results
            console.log('📊 Results:');
            console.log('  (Results will be visible in the browser window)');
            console.log('\n  Press Ctrl+C to close the browser when done.\n');

            // Keep browser open so user can see results
            await new Promise(() => {}); // Keep alive indefinitely
        } else {
            console.log('\n⚠ Could not find submit button. Leaving browser open for manual interaction.');
            console.log('  Press Ctrl+C to close the browser when done.\n');
            await new Promise(() => {}); // Keep alive indefinitely
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.log('\nThe browser will stay open so you can complete the form manually.');
        console.log('Press Ctrl+C to close when done.\n');
        await new Promise(() => {}); // Keep alive on error
    }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length !== 5) {
    console.error('\n❌ Invalid arguments!');
    console.error('\nUsage:');
    console.error('  node flightscope-query.js <speed> <vla> <hla> <totalSpin> <spinAxis>');
    console.error('\nExample:');
    console.error('  node flightscope-query.js 25.0 3.0 -0.0 950 30.0');
    console.error('\nParameters:');
    console.error('  speed      - Ball speed in mph (e.g., 25.0)');
    console.error('  vla        - Vertical launch angle in degrees (e.g., 3.0)');
    console.error('  hla        - Horizontal launch angle in degrees (e.g., -0.0)');
    console.error('  totalSpin  - Total spin in rpm (e.g., 950)');
    console.error('  spinAxis   - Spin axis in degrees (e.g., 30.0)\n');
    process.exit(1);
}

const [ballSpeed, vla, hla, totalSpin, spinAxis] = args.map(parseFloat);

// Validate inputs
if ([ballSpeed, vla, hla, totalSpin, spinAxis].some(isNaN)) {
    console.error('\n❌ All arguments must be valid numbers!\n');
    process.exit(1);
}

// Run the query
queryFlightScope(ballSpeed, vla, hla, totalSpin, spinAxis).catch(err => {
    console.error('\n❌ Fatal error:', err.message);
    process.exit(1);
});
