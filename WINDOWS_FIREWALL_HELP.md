# Windows Firewall Configuration for Nova Darts

If your app shows "Listening on port 921 (No data yet)" and shots aren't appearing, Windows Firewall is likely blocking the connection.

## Quick Fix

### Method 1: Allow When Prompted (Easiest)

1. When you first launch Nova Darts, Windows may show a firewall prompt
2. **Check both boxes**: "Private networks" AND "Public networks"
3. Click "Allow access"

### Method 2: Manual Firewall Rule

If you missed the prompt or it didn't appear:

1. **Open Windows Defender Firewall**
   - Press `Windows + R`
   - Type: `wf.msc`
   - Press Enter

2. **Create Inbound Rule**
   - Click "Inbound Rules" in left panel
   - Click "New Rule..." in right panel

3. **Configure Rule**
   - Rule Type: **Port**
   - Click Next

   - Protocol: **UDP**
   - Specific local ports: **921**
   - Click Next

   - Action: **Allow the connection**
   - Click Next

   - Profile: Check **all three** (Domain, Private, Public)
   - Click Next

   - Name: **Nova Darts - GSPro**
   - Description: **Allow UDP port 921 for Nova Darts**
   - Click Finish

4. **Restart Nova Darts**

## Verify It's Working

After configuring the firewall:

1. Launch Nova Darts
2. Check the status indicator at the top
3. Hit a shot in GSPro
4. Status should change to: **"✓ Connected to GSPro (Receiving Data)"**
5. The Debug Panel should show "Total Shots" incrementing

## Still Not Working?

### Check GSPro Configuration

1. Open GSPro settings
2. Go to Launch Monitor settings
3. Verify it's sending data to:
   - **IP**: `127.0.0.1` (localhost)
   - **Port**: `921`

### Check Another App Isn't Using Port 921

1. Close Nova Darts
2. Open Command Prompt as Administrator
3. Run: `netstat -ano | findstr :921`
4. If you see output, another app is using port 921
5. Close that app and try again

### Run as Administrator (Last Resort)

1. Right-click Nova Darts
2. Select "Run as administrator"
3. This gives full network permissions

## Debug Info

When asking for help, provide:

1. Screenshot of the Debug Panel
2. Screenshot of the DevTools console (should open automatically)
3. Your GSPro launch monitor settings
4. Windows version (Win 10 or Win 11)

## Common Issues

**"No data yet" even with firewall rule:**
- GSPro might not be configured to send to port 921
- Check GSPro's launch monitor settings

**App won't start:**
- Try running as administrator
- Check antivirus isn't blocking it

**Shots work sometimes, not others:**
- Check if firewall rule is for "Public" networks too
- Your network type might switch between Private/Public

---

Need more help? Check the console logs (F12) for detailed diagnostics!
