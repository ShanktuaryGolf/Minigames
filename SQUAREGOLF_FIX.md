# SquareGolf Launch Monitor Integration Fix

**Date:** November 30, 2025
**Issue:** SquareGolf connector shows "LM Ready: No" and "Ball: No"
**Status:** ⚠️ Fix Applied - Awaiting Tester Verification

---

## Problem Description

When using the SquareGolf launch monitor with the Shanktuary Mini Games app via the SquareGolf-GSPro connector, the launch monitor status shows:
- **LM Ready: No**
- **Ball: No**

The connector is connected and sending status packets, but the launch monitor is not being activated into ball detection mode.

---

## Root Cause Analysis

### Research Conducted

Analyzed two SquareGolf connector implementations:
1. `/home/shreen/squaregolf-connector-main/` (Go implementation)
2. `/home/shreen/springbok/` (Binary only)

### Key Findings from SquareGolf Connector Source Code

**File:** `/home/shreen/squaregolf-connector-main/internal/core/gspro/messages.go`

```go
// Line 19-21: When GSPro sends "GSPro ready", activate ball detection
case "GSPro ready":
    g.handleGSProReadyMessage()

// Line 42-51: Handler activates ball detection on the device
func (g *Integration) handleGSProReadyMessage() {
    // Activate ball detection using the launch monitor
    // This will send the appropriate commands to the device to enter ball detection mode
    // The device will then wait for a ball to be placed, become ready, and be hit
    err := g.launchMonitor.ActivateBallDetection()
    if err != nil {
        log.Printf("Failed to activate ball detection: %v", err)
        return
    }
}
```

**File:** `/home/shreen/squaregolf-connector-main/internal/core/launch_monitor.go`

```go
// Line 246-289: ActivateBallDetection sends bluetooth commands to device
func (lm *LaunchMonitor) ActivateBallDetection() error {
    // Get current club, handedness, and spin mode from state
    club := lm.stateManager.GetClub()
    handedness := lm.stateManager.GetHandedness()
    spinMode := lm.stateManager.GetSpinMode()

    // ... defaults if not set ...

    // Send club command
    seq := lm.getNextSequence()
    clubCommand := ClubCommand(seq, *club, *handedness)
    err := lm.SendCommand(clubCommand)

    // Send detect ball command
    seq = lm.getNextSequence()
    detectCommand := DetectBallCommand(seq, Activate, *spinMode)
    err = lm.SendCommand(detectCommand)

    return nil
}
```

### Critical Handshake Sequence

The SquareGolf connector expects this exact handshake:

1. **SquareGolf connector connects** to GSPro API on port 921 (TCP)
2. **GSPro immediately sends** `{"Message": "GSPro ready"}`
3. **SquareGolf receives** this message and calls `ActivateBallDetection()`
4. **Bluetooth commands sent** to the physical launch monitor device
5. **Launch monitor activates** ball detection mode
6. **Status updates** to LaunchMonitorIsReady: true
7. **When ball placed** → LaunchMonitorBallDetected: true

### Previous Implementation (WRONG)

The app was only sending "GSPro ready" in **response to status packets**:

```javascript
// This was TOO LATE - connector already expects ready message on connection
if (parsed.ShotDataOptions?.LaunchMonitorIsReady !== undefined) {
    const readyResponse = { Message: "GSPro ready" };
    socket.write(JSON.stringify(readyResponse));
}
```

---

## Solution Applied

### File Modified
- **electron-main.js** (lines 266-273)

### Change Made

Added immediate "GSPro ready" message when SquareGolf connector connects:

```javascript
gspro_server = net.createServer((socket) => {
    console.log('✓ Launch monitor connected!');
    console.log(`  From: ${socket.remoteAddress}:${socket.remotePort}\n`);

    launchMonitorSocket = socket;
    let socketBuffer = '';

    // CRITICAL: Send "GSPro ready" immediately upon connection
    // This tells SquareGolf connector to activate ball detection mode
    const readyMessage = {
        Message: "GSPro ready"
    };
    socket.write(JSON.stringify(readyMessage) + '\n');
    console.log('🚀 Sent initial "GSPro ready" to activate launch monitor');
    console.log('   This tells SquareGolf to enter ball detection mode\n');

    // ... rest of socket handlers ...
});
```

### Why This Fix Works

1. SquareGolf connector connects and immediately receives "GSPro ready"
2. Connector's message handler (messages.go:20) detects this message
3. Calls `handleGSProReadyMessage()` (messages.go:42)
4. Executes `ActivateBallDetection()` (launch_monitor.go:246)
5. Sends bluetooth commands to physical device
6. Launch monitor enters ball detection mode
7. Status should update to LaunchMonitorIsReady: true

---

## Testing Instructions

### Prerequisites
1. SquareGolf launch monitor powered on and bluetooth connected to computer
2. SquareGolf-GSPro connector app running
3. Connector configured to connect to `localhost:921`
4. Shanktuary Mini Games app running

### Test Steps

1. **Start the apps in order:**
   ```
   1. Start Shanktuary Mini Games
   2. Start SquareGolf connector
   3. Connect SquareGolf connector to GSPro (localhost:921)
   ```

2. **Check console logs in Shanktuary app:**
   - Look for: `"🚀 Sent initial "GSPro ready" to activate launch monitor"`
   - This should appear immediately after connection

3. **Check SquareGolf connector logs:**
   - Look for bluetooth commands being sent
   - Look for device activation messages

4. **Check status indicators:**
   - Open Dev Tools (F12) in Shanktuary app
   - Watch for status updates showing:
     - `LaunchMonitorIsReady: true`
     - `LaunchMonitorBallDetected: false` (until ball placed)

5. **Place a ball on the launch monitor:**
   - Status should update to `LaunchMonitorBallDetected: true`

6. **Hit the ball:**
   - Shot data should be received and processed
   - Game should register the shot

### Expected Behavior After Fix

**Console Output (Shanktuary App):**
```
✓ Launch monitor connected!
  From: 127.0.0.1:xxxxx

🚀 Sent initial "GSPro ready" to activate launch monitor
   This tells SquareGolf to enter ball detection mode

📡 Launch Monitor Status:
  IsReady: true
  BallDetected: false

[after placing ball]
📡 Launch Monitor Status:
  IsReady: true
  BallDetected: true
```

**SquareGolf Connector Output:**
```
Received "GSPro ready" from simulator
Activating ball detection mode...
Sent club command to device
Sent detect ball command to device
Launch monitor ready
```

---

## Troubleshooting

### If still showing "LM Ready: No"

1. **Check connection order:**
   - Shanktuary app must start FIRST
   - Then connect SquareGolf connector

2. **Check console for "GSPro ready" message:**
   - Should appear immediately after connector connects
   - If not, restart both apps

3. **Check SquareGolf connector logs:**
   - Look for "Received GSPro ready" message
   - Look for bluetooth command errors

4. **Verify bluetooth connection:**
   - SquareGolf device must be bluetooth-paired with computer
   - Check Windows bluetooth settings
   - SquareGolf connector must show device connected

5. **Try reconnecting:**
   - Disconnect SquareGolf connector from GSPro
   - Wait 2 seconds
   - Reconnect to localhost:921

### If "LM Ready: Yes" but "Ball: No" forever

This means:
- The fix worked! Launch monitor is activated
- Ball detection is active but no ball detected
- **Solution:** Make sure ball is properly placed on the tee/mat
- Check SquareGolf device is in correct mode (not putting mode, etc.)

---

## Additional Notes

### Why We Send "GSPro ready" Twice

The code now sends "GSPro ready" in TWO places:

1. **On connection** (NEW FIX) - Line 271
   - Activates the device immediately

2. **On status packets** (EXISTING) - Line 406
   - Reactivates if connection drops/restarts
   - Safety net for reconnection scenarios

This is intentional and safe - the connector handles duplicate messages gracefully.

### Compatibility with Other Launch Monitors

This fix is **SquareGolf-specific** and should not affect other launch monitors:
- Other monitors don't send LaunchMonitorIsReady status packets
- Other monitors will ignore the "GSPro ready" message
- The generic 200 response is still sent for all other messages

### Related Files

- **electron-main.js**: Main fix location (line 266-273)
- **preload.js**: No changes needed
- **electron-index.html**: Status display (already working)

---

## Next Steps

1. **Test with actual SquareGolf device** when tester is available
2. **Verify status changes** from No → Yes
3. **Test shot capture** works properly
4. **Document any additional findings**
5. **Update PROJECT_STATUS.md** after successful test

---

## References

- SquareGolf Connector Source: `/home/shreen/squaregolf-connector-main/`
- GSPro Connect API v1 Documentation
- Messages handler: `internal/core/gspro/messages.go`
- Launch monitor: `internal/core/launch_monitor.go`

---

**Author:** Claude
**Tester:** [Pending]
**Version:** 4.10.1 (pending)
