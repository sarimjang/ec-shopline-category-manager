/**
 * Phase 1.4 Event Listener Cleanup Tests
 *
 * 測試事件監聽器清理機制確保：
 * 1. init.js 包含 EventListenerManager 類
 * 2. content.js 包含 ContentScriptEventListenerManager 類
 * 3. injected.js 包含 InjectedEventListenerManager 類
 * 4. 所有事件監聽器都有適當的清理機制
 * 5. 頁面卸載時監聽器被正確清理
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// 簡化版運行驗證（不需要 mocha）
function runTests() {
  console.log('\n[Test] Phase 1.4 Event Listener Cleanup Tests');
  console.log('==============================================\n');

  let passed = 0;
  let failed = 0;

  const tests = [
    {
      name: 'init.js contains EventListenerManager class',
      fn: () => {
        const initPath = path.join(__dirname, '../src/content/init.js');
        const content = fs.readFileSync(initPath, 'utf8');
        assert(content.includes('class EventListenerManager'), 'should define EventListenerManager');
        assert(content.includes('addEventListener(groupName, target, eventType, handler'), 'should have addEventListener method');
        assert(content.includes('removeListenersFor(groupName)'), 'should have removeListenersFor method');
        assert(content.includes('destroy()'), 'should have destroy method');
        assert(content.includes('getStats()'), 'should have getStats method');
      }
    },
    {
      name: 'init.js registers cleanup on beforeunload',
      fn: () => {
        const initPath = path.join(__dirname, '../src/content/init.js');
        const content = fs.readFileSync(initPath, 'utf8');
        assert(content.includes("window.addEventListener('beforeunload'"), 'should register beforeunload handler');
        assert(content.includes("eventManager.destroy()"), 'should call destroy on beforeunload');
      }
    },
    {
      name: 'init.js registers cleanup on pagehide',
      fn: () => {
        const initPath = path.join(__dirname, '../src/content/init.js');
        const content = fs.readFileSync(initPath, 'utf8');
        assert(content.includes("window.addEventListener('pagehide'"), 'should register pagehide handler');
      }
    },
    {
      name: 'init.js uses eventManager for DOMContentLoaded',
      fn: () => {
        const initPath = path.join(__dirname, '../src/content/init.js');
        const content = fs.readFileSync(initPath, 'utf8');
        assert(content.includes("eventManager.addEventListener('initialization-domReady'"), 'should use eventManager for DOMContentLoaded');
      }
    },
    {
      name: 'init.js uses eventManager for categoryManagerReady event',
      fn: () => {
        const initPath = path.join(__dirname, '../src/content/init.js');
        const content = fs.readFileSync(initPath, 'utf8');
        assert(content.includes("eventManager.addEventListener('initialization-categoryManagerReady'"), 'should use eventManager for categoryManagerReady');
        assert(content.includes("eventManager.removeListenersFor('initialization-categoryManagerReady')"), 'should clean up categoryManagerReady listeners');
      }
    },
    {
      name: 'init.js exposes event manager stats for debugging',
      fn: () => {
        const initPath = path.join(__dirname, '../src/content/init.js');
        const content = fs.readFileSync(initPath, 'utf8');
        assert(content.includes('window._scm_eventManagerStats'), 'should expose stats function');
      }
    },
    {
      name: 'content.js contains ContentScriptEventListenerManager class',
      fn: () => {
        const contentPath = path.join(__dirname, '../src/content/content.js');
        const content = fs.readFileSync(contentPath, 'utf8');
        assert(content.includes('class ContentScriptEventListenerManager'), 'should define ContentScriptEventListenerManager');
        assert(content.includes('addEventListener(groupName, target, eventType, handler'), 'should have addEventListener method');
        assert(content.includes('destroy()'), 'should have destroy method');
      }
    },
    {
      name: 'content.js registers cleanup handlers on initialization',
      fn: () => {
        const contentPath = path.join(__dirname, '../src/content/content.js');
        const content = fs.readFileSync(contentPath, 'utf8');
        assert(content.includes("window.addEventListener('beforeunload'"), 'should register beforeunload handler');
        assert(content.includes('contentEventManager.destroy()'), 'should call destroy on beforeunload');
      }
    },
    {
      name: 'content.js exposes event manager stats for debugging',
      fn: () => {
        const contentPath = path.join(__dirname, '../src/content/content.js');
        const content = fs.readFileSync(contentPath, 'utf8');
        assert(content.includes('window._scm_contentEventStats'), 'should expose stats function');
      }
    },
    {
      name: 'injected.js contains InjectedEventListenerManager class',
      fn: () => {
        const injectedPath = path.join(__dirname, '../src/content/injected.js');
        const content = fs.readFileSync(injectedPath, 'utf8');
        assert(content.includes('class InjectedEventListenerManager'), 'should define InjectedEventListenerManager');
        assert(content.includes('addEventListener(target, eventType, handler'), 'should have addEventListener method');
        assert(content.includes('cleanup()'), 'should have cleanup method');
      }
    },
    {
      name: 'injected.js registers cleanup handlers',
      fn: () => {
        const injectedPath = path.join(__dirname, '../src/content/injected.js');
        const content = fs.readFileSync(injectedPath, 'utf8');
        assert(content.includes("window.addEventListener('beforeunload'"), 'should register beforeunload handler');
        assert(content.includes("window.addEventListener('pagehide'"), 'should register pagehide handler');
        assert(content.includes('injectedEventManager.cleanup()'), 'should call cleanup on beforeunload');
      }
    },
    {
      name: 'injected.js uses event manager for DOMContentLoaded',
      fn: () => {
        const injectedPath = path.join(__dirname, '../src/content/injected.js');
        const content = fs.readFileSync(injectedPath, 'utf8');
        assert(content.includes('injectedEventManager.addEventListener(document, \'DOMContentLoaded\''), 'should use event manager for DOMContentLoaded');
      }
    }
  ];

  // Run all tests
  tests.forEach((test) => {
    try {
      test.fn();
      console.log(`✓ ${test.name}`);
      passed++;
    } catch (error) {
      console.error(`✗ ${test.name}`);
      console.error(`  Error: ${error.message}`);
      failed++;
    }
  });

  console.log('\n=========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('=========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests();
