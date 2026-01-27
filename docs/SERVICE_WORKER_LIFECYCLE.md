# Service Worker Lifecycle & Initialization

**Document Version**: 1.0
**Last Updated**: 2026-01-27
**Status**: Complete - Task 2-P1.5

---

## Overview

Chrome Manifest V3 requires service workers instead of persistent background pages. The Shopline Category Manager service worker has a well-defined lifecycle with clear initialization, messaging, and cleanup phases.

This document explains:
1. Service Worker lifecycle events
2. Initialization sequence
3. Message handling flow
4. Storage persistence
5. Debugging and monitoring

---

## Lifecycle Events

### Timeline

```
Browser Start
    ↓
Extension Installed/Updated? → YES → onInstalled
    ↓                                      ↓
Service Worker Spins Up                Initialize Storage
    ↓                                      ↓
onStartup (if applicable) ←─────────────→ Service Worker Ready
    ↓
Message Listeners Attached
    ↓
Content Scripts/Popup can send messages
    ↓
User Idles (≥5 minutes no activity) → Service Worker Terminates
    ↓
    └─ Storage persists (key-value pairs)
    └─ Service Worker terminates but can be restarted
```

---

## Installation Event (onInstalled)

### When It Fires
- **First install**: User installs extension from Chrome Web Store or loads unpacked
- **Update**: Extension updated to new version

### Handler Code
```javascript
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Initialize storage on first install
    chrome.storage.local.set({
      categoryMoveStats: {
        totalMoves: 0,
        totalTimeSaved: 0,
        lastReset: new Date().toISOString()
      }
    });
    logger.log('Extension installed, storage initialized');
  } else if (details.reason === 'update') {
    logger.log('Extension updated');
  }
});
```

### Storage Snapshot After Install
```javascript
{
  categoryMoveStats: {
    totalMoves: 0,
    totalTimeSaved: 0,
    lastReset: "2026-01-27T10:00:00.000Z"
  }
}
```

---

## Storage Persistence Guarantee

Chrome's `storage.local` API provides:
- **Persistent**: Data survives browser restarts
- **Encrypted**: Stored securely by Chrome
- **Quota**: ~10MB per extension
- **Atomic**: Operations complete fully or not at all

### Example: Data After Browser Restart
```javascript
// Before browser restart
chrome.storage.local.set({
  categoryMoveStats: { totalMoves: 100, ... }
});

// ↓ Browser shuts down completely

// After browser restart (service worker re-instantiates)
chrome.storage.local.get(['categoryMoveStats'], (result) => {
  console.log(result.categoryMoveStats);
  // Output: { totalMoves: 100, ... }
  // Data PERSISTS even though service worker was terminated!
});
```

---

## Message Handling Lifecycle

### Request from Content Script/Popup Flow
```
User triggers action
    ↓
chrome.runtime.sendMessage({
  action: 'getStats'
})
    ↓
Service Worker onMessage listener fires
    ↓
Try-catch wrapper
    ↓
Route to handler via switch statement
    ↓
Handler calls chrome.storage operations
    ↓
Handler calls sendResponse()
    ↓
Response sent back to sender
    ↓
Sender callback receives response
```

---

## Best Practices for Lifecycle Management

### 1. Always Return from Handlers
```javascript
// ✅ Good
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  handleMessage(request, sendResponse);
  return true;  // Indicate async response
});

// ❌ Bad - missing return statement
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  handleMessage(request, sendResponse);
  // Missing: return true;
});
```

### 2. Handle Storage Errors
```javascript
// ✅ Good
chrome.storage.local.set({ data: value }, function() {
  if (chrome.runtime.lastError) {
    console.error('Storage error:', chrome.runtime.lastError);
  } else {
    console.log('Storage set successfully');
  }
});

// ❌ Bad - ignores errors
chrome.storage.local.set({ data: value }, function() {
  console.log('Done');  // Might not be done if error occurred
});
```

### 3. Verify Data on Startup
```javascript
// ✅ Good - initialize if missing
function handleGetStats(request, sendResponse) {
  chrome.storage.local.get(['categoryMoveStats'], function(result) {
    const stats = result.categoryMoveStats || {
      totalMoves: 0,
      totalTimeSaved: 0,
      lastReset: new Date().toISOString()
    };
    sendResponse({ success: true, stats: stats });
  });
}

// ❌ Bad - assume data exists
function handleGetStats(request, sendResponse) {
  chrome.storage.local.get(['categoryMoveStats'], function(result) {
    sendResponse({ success: true, stats: result.categoryMoveStats });
    // Crashes if categoryMoveStats doesn't exist
  });
}
```

---

## Debugging Service Worker Lifecycle

### Monitor in DevTools

**Step 1**: Open DevTools
```
1. Go to chrome://extensions/
2. Toggle "Developer mode" ON
3. Find "Shopline Category Manager"
4. Click blue "Inspect" link
```

**Step 2**: View Startup Messages
```
Console shows:
[SERVICE_WORKER] Service Worker loaded
[SERVICE_WORKER] Context menu created successfully
```

**Step 3**: Monitor Storage Changes
```javascript
// In service worker console
chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log('Storage changed:', changes);
});
```

---

## Lifecycle Summary

| Phase | Event | Handler | Triggered By | Storage |
|-------|-------|---------|--------------|---------|
| Install | onInstalled | Initialize stats | First install | Write |
| Startup | (implicit) | Re-attach listeners | Browser start | Read |
| Runtime | onMessage | Route messages | Content script | Read/Write |
| Monitor | onChanged | Log changes | Storage ops | Read |
| Terminate | (implicit) | N/A | Idle timeout | N/A |

---

## Storage Lifecycle Data Rules

| Data Key | Initial | Max Size | Persistence | Reset By |
|----------|---------|----------|-------------|----------|
| categoryMoveStats | Install | 1KB | Permanent | resetStats() |
| moveHistory | First move | 500 records | Permanent | Manual delete |
| searchHistory | First search | 50 items | Permanent | Manual delete |
| errorLog | First error | 100 errors | Permanent | Manual delete |

---

## Next Steps (Phase 2+)

### Planned Enhancements
1. **Real-time sync (Phase 3)** - Use storage.onChanged for multi-tab sync
2. **Export/Import (Phase 2)** - Use existing handlers for data portability
3. **Health checks (Phase 2)** - Periodic storage validation
4. **Advanced analytics (Phase 3)** - Move pattern analysis

---

## Changelog

### Version 1.0 (2026-01-27)
- Complete lifecycle documentation
- Storage persistence explained
- Best practices established
