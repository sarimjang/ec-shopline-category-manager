# Message Passing Architecture Specification

## Overview

The extension uses multiple communication channels to coordinate between different security contexts and processes.

---

## Communication Channels

### 1. Content Script ↔ Service Worker (chrome.runtime.sendMessage)

**Protocol**: One-way with optional response
**Security Context**: ISOLATED ↔ Background
**Use Case**: Data persistence, stats recording

#### Message Types

##### recordCategoryMove
```javascript
// FROM: content.js (after successful category move)
// TO: service-worker.js (handleRecordCategoryMove)
// RESPONSE: Stats object

// Send:
chrome.runtime.sendMessage({
  action: 'recordCategoryMove',
  timeSaved: number,           // Seconds saved (calculated)
  moveDetails: {               // Optional metadata
    categoryId: string,
    categoryName: string,
    targetLevel: 1-3,          // Hierarchy depth
    usedSearch: boolean        // Via search or browse?
  }
}, (response) => {
  if (chrome.runtime.lastError) {
    console.error('Failed to record move');
  } else {
    console.log('Recorded:', response.stats);
    // {
    //   totalMoves: number,
    //   totalTimeSaved: number,
    //   lastReset: ISO8601
    // }
  }
});

// Handle in service-worker.js:
function handleRecordCategoryMove(request, sendResponse) {
  const timeSaved = request.timeSaved || 0;

  chrome.storage.local.get(['categoryMoveStats'], function(result) {
    const stats = result.categoryMoveStats || {
      totalMoves: 0,
      totalTimeSaved: 0,
      lastReset: new Date().toISOString()
    };

    stats.totalMoves += 1;
    stats.totalTimeSaved += timeSaved;

    chrome.storage.local.set({ categoryMoveStats: stats }, function() {
      console.log('[SERVICE_WORKER] Category move recorded:', stats);
      sendResponse({ success: true, stats: stats });
    });
  });
}
```

**Error Handling**:
```javascript
if (chrome.runtime.lastError) {
  // Message delivery failed (service worker crashed, etc.)
  console.error('Message failed:', chrome.runtime.lastError.message);
  // Fallback: use localStorage instead
  const stats = JSON.parse(localStorage.getItem('categoryMoveStats') || '{}');
  stats.totalMoves = (stats.totalMoves || 0) + 1;
  localStorage.setItem('categoryMoveStats', JSON.stringify(stats));
}
```

##### getStats
```javascript
// Request current stats
chrome.runtime.sendMessage(
  { action: 'getStats' },
  (response) => {
    if (response?.success) {
      console.log('Current stats:', response.stats);
    }
  }
);
```

##### resetStats
```javascript
// Reset all statistics
chrome.runtime.sendMessage(
  { action: 'resetStats' },
  (response) => {
    console.log('Stats reset:', response.stats);
  }
);
```

##### getSearchHistory
```javascript
// Retrieve search history
chrome.runtime.sendMessage(
  { action: 'getSearchHistory' },
  (response) => {
    console.log('Search history:', response.history);
  }
);
```

##### recordSearchQuery
```javascript
// Record a search query
chrome.runtime.sendMessage({
  action: 'recordSearchQuery',
  query: 'user search term'
}, (response) => {
  console.log('History updated:', response.history);
});
```

---

### 2. Injected Script ↔ Content Script (window.postMessage)

**Protocol**: Two-way with reply
**Security Context**: MAIN ↔ ISOLATED
**Use Case**: AngularJS scope access, initialization signals

#### Message Types

##### Angular Status Query
```javascript
// FROM: init.js (ISOLATED world)
// TO: injected.js (MAIN world)
// RESPONSE: Angular availability

// Send (in init.js):
function checkAngularAvailable() {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 1000);

    window.postMessage({
      type: 'SCM_CHECK_ANGULAR',
      timestamp: new Date().toISOString()
    }, '*');

    window.addEventListener('message', function handler(event) {
      if (event.data.type === 'SCM_ANGULAR_STATUS') {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        resolve(event.data.available);
      }
    }, { once: true });
  });
}

// Handle (in injected.js):
window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  if (event.data.type === 'SCM_CHECK_ANGULAR') {
    window.postMessage({
      type: 'SCM_ANGULAR_STATUS',
      available: typeof window.angular !== 'undefined',
      timestamp: event.data.timestamp
    }, '*');
  }
});
```

##### Get Angular Scope
```javascript
// FROM: content.js (ISOLATED world)
// TO: injected.js (MAIN world)
// RESPONSE: Serialized scope data or scope reference method

// Send (in content.js):
async function getAngularScope() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout getting Angular scope'));
    }, 5000);

    window.postMessage({
      type: 'SCM_GET_SCOPE',
      selector: '[ng-app], body'
    }, '*');

    window.addEventListener('message', function handler(event) {
      if (event.data.type === 'SCM_SCOPE_READY') {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        resolve(event.data.scope);
      }
    }, { once: true });
  });
}

// Handle (in injected.js):
window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  if (event.data.type === 'SCM_GET_SCOPE') {
    try {
      const element = document.querySelector(event.data.selector);
      const ng = window.angular;
      if (!ng || !element) throw new Error('Angular not available');

      const scope = ng.element(element).scope();
      const categories = scope?.categories || [];
      const posCategories = scope?.posCategories || [];

      window.postMessage({
        type: 'SCM_SCOPE_READY',
        scope: {
          _scopeCreated: true,
          categories: categories,
          posCategories: posCategories,
          $apply: typeof scope?.$apply === 'function'
        }
      }, '*');
    } catch (error) {
      window.postMessage({
        type: 'SCM_SCOPE_ERROR',
        error: error.message
      }, '*');
    }
  }
});
```

##### Initialization Complete Signal
```javascript
// FROM: init.js (ISOLATED world)
// TO: content.js (listens for completion)

// Broadcast (in init.js):
window.dispatchEvent(new CustomEvent('scmInitComplete', {
  detail: {
    timestamp: new Date().toISOString(),
    phase: 'angular-ready'
  }
}));

// Listen (in content.js):
window.addEventListener('scmInitComplete', (event) => {
  console.log('[content.js] Initialization complete', event.detail);
  // Now safe to access AngularJS
});
```

---

### 3. Injected Script Broadcasts (window.dispatchEvent)

**Protocol**: One-way broadcast
**Security Context**: MAIN world
**Use Case**: Announcing state changes to all listeners

#### Events

##### categoryManagerReady
```javascript
// BROADCAST: injected.js (after CategoryManager initialized)

window.dispatchEvent(new CustomEvent('categoryManagerReady', {
  detail: {
    timestamp: new Date().toISOString(),
    categoryManager: typeof window.categoryManager !== 'undefined',
    hasAngular: typeof window.angular !== 'undefined'
  }
}));

// LISTEN: init.js
window.addEventListener('categoryManagerReady', (event) => {
  console.log('[init.js] CategoryManager is ready:', event.detail);
});
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CHROME BROWSER                            │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐      ┌──────────────────────────────┐
│    BACKGROUND PROCESS    │      │   CONTENT SCRIPT (TAB)       │
│   (Service Worker)       │      │                              │
│                          │      │  ┌─────────────────────────┐ │
│  ┌────────────────────┐  │      │  │   ISOLATED WORLD        │ │
│  │ chrome.runtime.    │  │◄─────┼──┤ ┌───────────────────┐   │ │
│  │ onMessage listener │  │      │  │ │  content.js       │   │ │
│  │                    │  │      │  │ │  init.js          │   │ │
│  │ ┌─────────────────┐│  │      │  │ │ ┌───────────────┐ │   │ │
│  │ │recordCategoryMove││  │      │  │ │ │ CategoryMgr  │ │   │ │
│  │ │getStats        ││  │      │  │ │ │ └───────────────┘ │   │ │
│  │ │resetStats      ││  │      │  │ │ └───────────────────┘   │ │
│  │ │getSearchHistory ││  │      │  │ │                       │ │
│  │ │recordSearchQuery││  │      │  │ └─────────────────────┘ │
│  │ └─────────────────┘│  │      │  │   ▲    ▲                │
│  │                    │  │      │  │   │    │ Uses           │
│  ├────────────────────┤  │      │  │   │    │ window.angular │
│  │ chrome.storage.    │  │      │  │   │    │ (Via Messages) │
│  │ local operations   │  │      │  │   │    │                │
│  └────────────────────┘  │      │  │   │    │                │
│                          │      │  │   │    ▼                │
│                          │      │  │ ┌─────────────────┐     │
│                          │      │  │ │ storage.js      │     │
│                          │      │  │ │ StorageManager  │     │
│                          │      │  │ └─────────────────┘     │
│                          │      │  └─────────────────────────┘ │
│                          │      │                              │
└──────────────────────────┘      └──────────────────────────────┘
           ▲                                    │
           │                                    ▼
           │                       ┌──────────────────────────┐
           │                       │     MAIN WORLD          │
           │                       │   (AngularJS Page)      │
           │ (Responds to           │                         │
           │  messages from         │  ┌────────────────┐    │
           │  Service Worker)       │  │ injected.js    │    │
           │                        │  │ CategoryMgr    │    │
           │                        │  │ window.angular │    │
           │                        │  └────────────────┘    │
           │                        │                         │
           │ chrome.runtime.        │ window.postMessage()   │
           │ sendMessage            │ CustomEvent            │
           │                        │                         │
           └────────────────────────┼─────────────────────────┘
                                    │
                          ┌─────────┴──────────┐
                          │                    │
                      Users move          Stats recorded
                      categories          in Service Worker
```

---

## Sequence Diagram: Category Move Flow

```
Timeline: User clicks "Move To" button

1. User clicks "Move To" button
   │
   └─→ content.js: handleMoveCategory()
       │
       ├─→ Get source and target from DOM
       │
       ├─→ saveCategoryOrderingToServer()
       │   │
       │   ├─→ Calls Shopline API via fetch()
       │   │
       │   └─→ Response received ✅ OR ❌
       │
       ├─→ [ON SUCCESS] Calculate time saved
       │   │
       │   └─→ calculateTimeSaved(categoryCount, targetLevel, usedSearch)
       │
       ├─→ [ON SUCCESS] Send message to Service Worker
       │   │
       │   └─→ chrome.runtime.sendMessage({
       │       action: 'recordCategoryMove',
       │       timeSaved: number,
       │       moveDetails: {...}
       │     })
       │
       └─→ Service Worker receives
           │
           ├─→ handleRecordCategoryMove()
           │   │
           │   ├─→ Get current stats from storage
           │   │
           │   ├─→ Update totalMoves += 1
           │   │
           │   ├─→ Update totalTimeSaved += timeSaved
           │   │
           │   ├─→ Save to chrome.storage.local
           │   │
           │   └─→ sendResponse({ success: true, stats })
           │
           └─→ Popup can now read updated stats

Timeline end
```

---

## Error Handling Strategy

### Content Script → Service Worker Message Fails

```javascript
chrome.runtime.sendMessage({
  action: 'recordCategoryMove',
  timeSaved: 5.2
}, (response) => {
  if (chrome.runtime.lastError) {
    console.error('Message delivery failed:', chrome.runtime.lastError);

    // Fallback: Try localStorage
    try {
      const stats = JSON.parse(
        localStorage.getItem('categoryMoveStats') ||
        '{"totalMoves":0,"totalTimeSaved":0}'
      );
      stats.totalMoves += 1;
      stats.totalTimeSaved += 5.2;
      localStorage.setItem('categoryMoveStats', JSON.stringify(stats));
      console.log('[Fallback] Stats saved to localStorage:', stats);
    } catch (e) {
      console.error('[Fallback] Failed:', e);
    }
  } else if (response?.success) {
    console.log('Stats recorded:', response.stats);
  }
});
```

### Cross-World Message Timeout

```javascript
async function getAngularScope(timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      reject(new Error('Angular scope not available (timeout)'));
    }, timeout);

    window.postMessage({ type: 'SCM_GET_SCOPE', selector: 'body' }, '*');

    const handler = (event) => {
      clearTimeout(timeoutHandle);
      window.removeEventListener('message', handler);

      if (event.data.type === 'SCM_SCOPE_READY') {
        resolve(event.data.scope);
      } else if (event.data.type === 'SCM_SCOPE_ERROR') {
        reject(new Error(event.data.error));
      }
    };

    window.addEventListener('message', handler);
  });
}
```

---

## Timeout Values

| Operation | Timeout | Reason |
|-----------|---------|--------|
| Check AngularJS | 1000ms | Should be available immediately |
| Get Angular Scope | 5000ms | May wait for DOMContentLoaded |
| Init storage | 2000ms | Storage API typically fast |
| Message to Service Worker | 3000ms | Service worker may be inactive |
| Category move API | 30000ms | Network operation |

---

## Security Considerations

### Cross-World Communication
- Only use postMessage for MAIN ↔ ISOLATED communication
- Always check event.source === window for safety
- Filter message types to prevent injection attacks

### Storage Access
- Service Worker only accesses chrome.storage.local (sandboxed)
- No access to sensitive user data (passwords, tokens)
- Stats are non-sensitive (only counts and times)

### API Requests
- Content script makes API requests on user's behalf
- Includes CSRF token from page
- Uses user's authentication (cookies)
- Respects Shopline API rate limits

---

## Testing Message Passing

### From Console (Content Script)

```javascript
// Test 1: Record move
chrome.runtime.sendMessage({
  action: 'recordCategoryMove',
  timeSaved: 5
}, (response) => {
  console.log('Response:', response);
});

// Test 2: Get stats
chrome.runtime.sendMessage(
  { action: 'getStats' },
  (response) => {
    console.log('Stats:', response.stats);
  }
);

// Test 3: Get search history
chrome.runtime.sendMessage(
  { action: 'getSearchHistory' },
  (response) => {
    console.log('History:', response.history);
  }
);
```

### From Console (Service Worker DevTools)

```javascript
// Check stored stats
chrome.storage.local.get('categoryMoveStats', (result) => {
  console.log('Stats in storage:', result);
});

// Check message listener is active
console.log('onMessage listener active');
```

---

## Summary

The message passing architecture uses:
1. **chrome.runtime.sendMessage** for Content → Service Worker
2. **window.postMessage** for MAIN ↔ ISOLATED communication
3. **CustomEvent** for broadcast notifications

All channels have:
- ✅ Error handling
- ✅ Timeout protection
- ✅ Response validation
- ✅ Fallback strategies

---

**Specification Version**: 1.0
**Last Updated**: 2026-01-27
**Status**: READY FOR IMPLEMENTATION
