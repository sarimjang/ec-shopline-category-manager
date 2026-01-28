# Quick Test Reference Card

**Print this or keep open while testing**

---

## 🚀 Quick Start (5 minutes)

### Build & Load
```bash
# 1. Build
cd ~/My\ Projects/app_develop/lab/lab_20260107_chrome-extension-shopline-category
npm run build:dev

# 2. Load in Chrome
chrome://extensions/
→ Toggle "Developer mode"
→ Click "Load unpacked"
→ Select ./src folder

# 3. Verify extension loaded
✓ Icon appears in toolbar
✓ Shows "Shopline Category Manager"
```

### Open Test Page
```
1. Click extension icon
2. Should see popup with stats
3. Navigate to: https://app.shopline.tw/admin/*/categories
4. Should see "📁 移動到 ▼" button on each category
```

---

## ✅ Test Matrix (Print & Checkoff)

```
┌─────────────────────────────────────────────────┐
│ CRITICAL TESTS (MUST PASS)                      │
├─────────────────────────────────────────────────┤
│ □ Button appears on all categories              │
│ □ Clicking button opens dropdown                │
│ □ Category selection works                      │
│ □ Popup shows statistics                        │
│ □ Stats increase after move                     │
│ □ No console errors (red X)                     │
├─────────────────────────────────────────────────┤
│ IMPORTANT TESTS (SHOULD PASS)                   │
├─────────────────────────────────────────────────┤
│ □ Search field filters results                  │
│ □ Multiple moves work consecutively             │
│ □ Dropdown closes when clicking outside         │
│ □ Stats update within 2 seconds                 │
├─────────────────────────────────────────────────┤
│ PERFORMANCE TESTS (NICE TO HAVE)                │
├─────────────────────────────────────────────────┤
│ □ No performance lag (smooth animations)        │
│ □ Memory stable (no unbounded growth)           │
└─────────────────────────────────────────────────┘
```

---

## 🔍 Console Filter Commands

```javascript
// Copy & paste in Chrome DevTools console:

// Show all content script logs
[Shopline Category Manager]

// Show only errors
error

// Show only popup logs
[Popup]

// Show everything
(leave empty)
```

---

## 📊 Expected Stats Display

```
┌─────────────────────────────────┐
│ 總移動次數:        0 → N        │
│ 總節省時間:   0 分鐘 → X 分鐘   │
│ 平均每次:        0 秒 → X 秒    │
│ 最後重置:      未重置 → 剛剛    │
└─────────────────────────────────┘

Formula:
- Total Moves: Increments by 1 per move
- Time Saved: Increases by calculated amount (non-linear)
- Average: Total / Moves
- Last Reset: Relative time ("剛剛", "X 分鐘前", "X 小時前")
```

---

## 🐛 Troubleshooting Quick Guide

| Issue | Check | Fix |
|-------|-------|-----|
| **Button doesn't appear** | Console: "UI 注入完成" | Reload page (F5) |
| **Dropdown doesn't open** | Click logs in console | Check JavaScript errors |
| **Search doesn't work** | Type in search field | Should filter within 300ms |
| **Stats don't update** | Click extension icon | May need to wait 2 seconds |
| **Red errors in console** | Note exact error message | Document and report |
| **Page lags/stutters** | DevTools > Performance | May indicate inefficiency |

---

## 🎯 Test Sequence (15 minutes)

### Test 1-2 (3 min): UI Basics
1. Navigate to categories page
2. Verify button appears on first category
3. Click button → dropdown opens

### Test 3-4 (4 min): Search & Select
1. In dropdown, type search keyword
2. Results filter in real-time
3. Click target category
4. Click "確認移動" button
5. Category moves to new location

### Test 5-6 (4 min): Statistics
1. Open extension popup
2. Check if Move Count increased
3. Check if Time Saved shows positive value
4. Perform 2-3 more moves
5. Verify stats keep increasing

### Test 7-8 (4 min): Final Checks
1. Open DevTools console (F12)
2. Filter by `[Shopline Category Manager]`
3. Perform a move operation
4. Verify all logs appear with ✓ or ✅
5. Check for ❌ or red errors

---

## 📋 Quick Test Form

```
Test Date: _____________
Tester: _________________
Browser: Chrome _____ (version)

PASS/FAIL Results:
1. Button appears:           PASS □  FAIL □
2. Dropdown opens:           PASS □  FAIL □
3. Search filters:           PASS □  FAIL □
4. Move completes:           PASS □  FAIL □
5. Stats display:            PASS □  FAIL □
6. Stats update:             PASS □  FAIL □
7. Multiple moves work:      PASS □  FAIL □
8. No console errors:        PASS □  FAIL □

Issues Found:
_________________________________
_________________________________
_________________________________

Overall: PASS □  FAIL □  PARTIAL □
```

---

## 🛠️ DevTools Shortcuts

```
F12                 Open DevTools
Ctrl+Shift+I       Open DevTools (alternative)
Ctrl+Shift+C       Inspect element
Ctrl+L             Clear console
Ctrl+K             Clear console (Mac)
```

---

## 📊 Console Log Cheat Sheet

### Good Logs (Look for these ✅)
```
[Shopline Category Manager] 初始化分類管理器
[Shopline Category Manager] UI 注入完成
[Shopline Category Manager] 找到 XX 個分類節點
[Shopline Category Manager] ✓ [Priority 0] SUCCESS
[Shopline Category Manager] recordMove: totalMoves: X
[Popup] 彈出窗口初始化完成
[Popup] 自動更新完成
```

### Bad Logs (Report if you see these ❌)
```
Uncaught TypeError
Uncaught ReferenceError
Cannot read property 'x' of null
Failed to load content script
Service Worker crashed
```

### Warning Logs (May indicate issues ⚠️)
```
[Shopline Category Manager] ⚠️ Scope misalignment detected
[Shopline Category Manager] Dataset had ID but category not found
[Popup] Failed to load stats
```

---

## 🎬 Video of Test (If Available)

Optionally record test execution:
1. Open screen recorder
2. Navigate to categories page
3. Perform one full move operation
4. Show popup stats update
5. Show console logs
6. Stop recording

This helps identify UI issues that are hard to describe in words.

---

## 📞 Report Template

**If you find an issue:**

```markdown
## Issue: [Title]

**Steps to Reproduce:**
1. [First step]
2. [Second step]
3. [Result]

**Expected:**
[What should happen]

**Actual:**
[What actually happens]

**Console Error:**
[Copy exact error from DevTools]

**Severity:** Critical / High / Medium / Low

**Attachments:**
- [ ] Console screenshot
- [ ] Network screenshot
- [ ] Video recording
```

---

## ✨ Success Criteria

### Minimum (MUST have)
- ✅ Button appears on every category
- ✅ Dropdown opens when button clicked
- ✅ Category can be selected and moved
- ✅ Extension popup shows statistics
- ✅ No red console errors

### Excellent (SHOULD have)
- ✅ Search filters in real-time (no lag)
- ✅ Multiple moves work without issues
- ✅ Stats update automatically
- ✅ Smooth animations, no stuttering
- ✅ Console shows clean, organized logs

### Perfect (NICE to have)
- ✅ Performance is excellent
- ✅ No memory leaks detected
- ✅ Works on slow network
- ✅ Mobile-responsive design
- ✅ Keyboard shortcuts work

---

## 🎓 Learning Resources

If code doesn't work as expected:

1. **Check logs first**: DevTools console has all answers
2. **Review code comments**: Look for "FIX #N" or "CHANGE N" annotations
3. **Read MANUAL_UI_TEST_GUIDE.md**: Detailed test procedure
4. **Check snapshots**: `snapshot.md` shows project architecture
5. **Review error messages**: Usually point to exact issue location

---

## ⏱️ Time Budget

```
Prep & Setup:        5 minutes
Core Tests (1-6):   15 minutes
Edge Cases (7-9):   10 minutes
Performance (10):    5 minutes
Memory (11):         5 minutes
Documentation:       5 minutes
─────────────────────────
TOTAL:              45 minutes
```

---

## 💡 Pro Tips

1. **Tab Organization**: Keep console tab open while testing
2. **Focus**: Disable other extensions to avoid interference
3. **Incognito**: Test in Incognito mode to eliminate cache issues
4. **Clear Storage**: DevTools → Application → Clear site data
5. **Device Emulation**: Test on mobile viewport (Ctrl+Shift+M)

---

## 🚀 Ready to Test?

**Pre-flight Checklist:**
- [ ] Extension built with `npm run build:dev`
- [ ] Extension loaded in Chrome (chrome://extensions)
- [ ] Logged into Shopline test account
- [ ] Chrome DevTools open (F12)
- [ ] Console filter set to `[Shopline Category Manager]`
- [ ] This reference card printed or displayed

**✅ All set! Begin testing →**

---

**Version**: 1.0
**Last Updated**: 2026-01-28
**Status**: Ready for Testing
