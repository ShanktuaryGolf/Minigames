# Projector Mode - Dual Window Setup

New feature that splits the game view into two windows for optimal projector + screen setup!

## 🎯 What It Does

Instead of one fullscreen, you now get **two display options**:

### 💻 Computer Fullscreen
- Standard fullscreen mode
- Everything in one window
- Good for single-screen play

### 📽️ Projector Mode (NEW!)
- Opens a **separate window** for the projector
- **Window 1 (Projector)**: Just the game (dartboard, etc.)
- **Window 2 (Main)**: Controls, data panels, scoreboard
- Perfect for launch monitor setups!

## How It Works

### Accessing Projector Mode

1. Start a game (e.g., Darts)
2. Hover over "🖥️ Fullscreen ▼" button
3. Select "📽️ Projector Mode"
4. A new window opens automatically

### What You See

**Main Window (Your Screen):**
- ← Back to Menu
- 🔄 New Game
- 🧪 Test Shot
- 🖥️ Fullscreen dropdown
- ⛳ Ball Data panel
- 📊 Scoreboard panel (Darts Cricket table, etc.)

**Projector Window (Big Screen):**
- 🎯 Just the dartboard (or game canvas)
- 🎯 Shot feedback (points/message)
- NO controls or data panels
- Maximized for visibility

## Real-Time Sync

The two windows stay perfectly synced:
- ✅ **Shot updates** → Both windows update instantly
- ✅ **Score changes** → Reflected everywhere
- ✅ **Darts thrown** → Appear on both dartboards
- ✅ **Feedback messages** → Show on projector
- ✅ **New game** → Both reset together

## Technical Details

### BroadcastChannel API
Uses browser's BroadcastChannel to communicate between windows:
- No server needed
- Instant updates
- Works offline

### Messages Sent
```javascript
// Game starts
{ type: 'game_start', data: { gameType: 'darts' } }

// Game updates (DOM changes)
{ type: 'game_update', data: { html: '...' } }

// Shot feedback
{ type: 'shot_feedback', data: { points: 50, message: 'BULLSEYE!' } }

// Game ends
{ type: 'game_end' }
```

### Auto-Sync
- MutationObserver watches for DOM changes
- Automatically syncs game content
- No manual refresh needed

## Setup for Launch Monitors

### Ideal Setup
```
┌─────────────────────┐        ┌─────────────────────┐
│   Your Monitor      │        │   Projector Screen  │
│                     │        │                     │
│  [Controls]         │        │                     │
│  [Ball Data]        │        │     [Dartboard]     │
│  [Scoreboard]       │        │     (Big & Clear)   │
│  [Test Shot]        │        │                     │
│                     │        │                     │
└─────────────────────┘        └─────────────────────┘
      Main Window                 Projector Window
```

### Steps
1. Connect projector as second display
2. Open Nova Minigames
3. Start Darts (or any game)
4. Click "📽️ Projector Mode"
5. Drag projector window to projector screen
6. Press F11 on projector window for fullscreen
7. Play! 🎯

## Supported Games

Currently works with:
- ✅ Darts (all modes)
- ✅ All other games (dartboard becomes game canvas)

Each game shows its main play area on the projector, with controls on your screen.

## Browser Compatibility

Works in all modern browsers:
- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari
- ⚠️ Requires popup permissions

### If Popups Are Blocked

You'll see: "Could not open projector window. Please allow popups for this site."

**To fix:**
1. Click the popup icon in address bar
2. Allow popups for this site
3. Try Projector Mode again

## Keyboard Shortcuts

In Projector Window:
- `F11` - Enter/exit fullscreen on projector
- `Ctrl+W` / `Cmd+W` - Close projector window

In Main Window:
- Click "📽️ Projector Mode" again to close projector

## Advantages Over Single Screen

| Feature | Single Screen | Projector Mode |
|---------|--------------|----------------|
| Game visibility | Medium | Excellent |
| Control access | Yes | Yes |
| Data viewing | Shared space | Dedicated panel |
| Professional look | Good | Excellent |
| Multi-monitor | Manual setup | Automatic |

## Troubleshooting

### Projector window is blank
- Wait 1-2 seconds for sync
- Click "🔄 New Game" to refresh
- Check browser console for errors

### Windows out of sync
- Close projector window
- Reopen Projector Mode
- Auto-sync should restore

### Can't see projector window
- Check if it opened on another monitor
- Use Alt+Tab (Windows) or Cmd+Tab (Mac) to find it
- Try closing and reopening

### Performance issues
- BroadcastChannel is very efficient
- No network latency (local only)
- Should run smoothly on any PC

## Future Enhancements

Potential additions:
- [ ] Custom projector layouts per game
- [ ] Picture-in-picture mode
- [ ] Multi-projector support
- [ ] Recording/replay on projector
- [ ] Custom overlays and branding

## Files Added

```
web/
├── projector.html           # Projector window page
└── index.html              # Updated with dropdown + sync
```

## Code Example

Opening projector mode:
```javascript
projectorWindow = window.open(
    'projector.html',
    'ProjectorView',
    'width=1920,height=1080,toolbar=no,menubar=no'
);
```

Syncing game state:
```javascript
projectorChannel.postMessage({
    type: 'game_update',
    data: { html: gameContent.innerHTML }
});
```

## Summary

✅ **Two Windows**: Projector + Control screen
✅ **Real-Time Sync**: BroadcastChannel API
✅ **Auto-Updates**: MutationObserver watches DOM
✅ **Easy Access**: Dropdown menu
✅ **Professional**: Perfect for launch monitor setups

Perfect for showing games on a projector while keeping controls on your screen! 📽️🎮🏌️
