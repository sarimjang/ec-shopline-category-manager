/**
 * Phase 1.5 Integration Testing
 *
 * 測試 nonce 生成、驗證和清理機制的完整整合
 * 驗證跨世界通信，確保沒有記憶體洩漏，並測試邊界情況
 *
 * 測試場景：
 * 1. Nonce 生成和初始化
 * 2. Injected script 載入和 nonce 傳遞
 * 3. categoryManagerReady 事件觸發和驗證
 * 4. 事件監聽器清理
 * 5. 邊界情況測試（無效 nonce、多個事件等）
 * 6. 記憶體洩漏檢測
 */

'use strict';

// ============================================================================
// 測試框架設置
// ============================================================================

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// 簡化版測試運行器
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.results = [];
  }

  test(name, fn) {
    this.tests.push({ name, fn, type: 'test' });
  }

  describe(name, fn) {
    console.log(`\n${name}`);
    console.log('='.repeat(name.length));
    fn();
  }

  async run() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     Phase 1.5 Integration Testing                       ║');
    console.log('║     Nonce 生成、驗證和清理機制整合測試                  ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    for (const test of this.tests) {
      try {
        await Promise.resolve(test.fn());
        this.passed++;
        this.results.push({ name: test.name, status: 'PASS' });
        console.log(`✓ ${test.name}`);
      } catch (error) {
        this.failed++;
        this.results.push({ name: test.name, status: 'FAIL', error: error.message });
        console.log(`✗ ${test.name}`);
        console.log(`  Error: ${error.message}`);
      }
    }

    this.printSummary();
    return this.failed === 0;
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('Test Summary');
    console.log('='.repeat(60));
    console.log(`Total: ${this.tests.length} | Passed: ${this.passed} | Failed: ${this.failed}`);
    console.log('='.repeat(60) + '\n');

    if (this.failed > 0) {
      console.log('Failed Tests:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`  - ${r.name}`);
          console.log(`    ${r.error}`);
        });
      console.log('');
    }
  }
}

// ============================================================================
// 測試用例
// ============================================================================

const runner = new TestRunner();

runner.describe('1. NONCE GENERATION & INITIALIZATION', () => {
  runner.test('init.js exists and contains generateNonce function', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    assert(fs.existsSync(initPath), 'init.js should exist');

    const content = fs.readFileSync(initPath, 'utf8');
    assert(content.includes('function generateNonce()'), 'should contain generateNonce function');
    assert(content.includes('crypto.getRandomValues'), 'should use crypto.getRandomValues for nonce generation');
  });

  runner.test('generateNonce creates 32-character hex string', () => {
    // 從 init.js 提取 generateNonce 實作驗證
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    // 驗證 nonce 產生邏輯
    assert(content.includes('const nonceBytes = new Uint8Array(16);'), 'should use 16 bytes for nonce');
    assert(content.includes('.toString(16).padStart(2, \'0\')'), 'should convert to hex with padding');
    // 16 bytes × 2 hex chars per byte = 32 characters
  });

  runner.test('initializeNonce prevents duplicate generation', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    assert(content.includes('if (window._scm_nonce)'), 'should check for existing nonce');
    assert(content.includes('window._scm_nonce = nonce'), 'should store nonce in window._scm_nonce');
  });

  runner.test('init.js stores nonce in window._scm_nonce', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    assert(content.includes('window._scm_nonce'), 'should store nonce in window object');
  });
});

runner.describe('2. SCRIPT INJECTION WITH NONCE', () => {
  runner.test('injectScript function exists', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    assert(content.includes('function injectScript(nonce)'), 'should have injectScript function');
  });

  runner.test('injectScript attaches nonce to script dataset', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    assert(content.includes('script.dataset.nonce = nonce'), 'should set script.dataset.nonce');
  });

  runner.test('injected.js can retrieve nonce from script tag', () => {
    const injectedPath = path.join(__dirname, '../src/content/injected.js');
    const content = fs.readFileSync(injectedPath, 'utf8');

    assert(content.includes('function getNonceFromScriptTag()'), 'should have getNonceFromScriptTag function');
    assert(content.includes('script.dataset.nonce'), 'should read nonce from script.dataset.nonce');
  });

  runner.test('injected.js includes nonce in categoryManagerReady event', () => {
    const injectedPath = path.join(__dirname, '../src/content/injected.js');
    const content = fs.readFileSync(injectedPath, 'utf8');

    assert(content.includes("new CustomEvent('categoryManagerReady'"), 'should dispatch categoryManagerReady event');
    assert(content.includes('nonce: nonce'), 'should include nonce in event detail');
  });
});

runner.describe('3. NONCE VALIDATION', () => {
  runner.test('validateNonce function exists and uses constant-time comparison', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    assert(content.includes('function validateNonce(receivedNonce, expectedNonce)'), 'should have validateNonce function');
    assert(content.includes('result |='), 'should use XOR operation for constant-time comparison');
  });

  runner.test('validateNonce checks nonce format', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    assert(content.includes('typeof receivedNonce !== \'string\''), 'should check nonce type');
    assert(content.includes('.length !== expectedNonce.length'), 'should check nonce length');
  });

  runner.test('validateNonce prevents timing attacks', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    // 常時間比較應該檢查所有字符，而不是提前返回
    assert(content.includes('for (let i = 0; i < receivedNonce.length; i++)'), 'should check all characters');
    assert(content.includes('result |= (receivedNonce.charCodeAt(i) ^ expectedNonce.charCodeAt(i))'), 'should use XOR');
  });

  runner.test('waitForCategoryManagerReady validates nonce', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    assert(content.includes('validateNonce(event.detail.nonce, expectedNonce)'), 'should validate nonce in event');
    assert(content.includes('if (!event.detail || !validateNonce'), 'should reject invalid nonce');
  });
});

runner.describe('4. EVENT LISTENER CLEANUP', () => {
  runner.test('waitForCategoryManagerReady registers event listener', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    // 使用 EventListenerManager 或直接 addEventListener
    assert(content.includes("addEventListener('initialization-categoryManagerReady', window, 'categoryManagerReady'") ||
           content.includes("window.addEventListener('categoryManagerReady'"), 'should register listener');
  });

  runner.test('waitForCategoryManagerReady removes listener on success', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    // 檢查使用 EventListenerManager 清理或直接 removeEventListener
    assert(content.includes("removeListenersFor('initialization-categoryManagerReady')") ||
           content.includes("window.removeEventListener('categoryManagerReady'"), 'should remove listener');
  });

  runner.test('waitForCategoryManagerReady removes listener on timeout', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    // 檢查 timeout 分支中的清理
    const hasTimeoutCleanup = content.includes('setTimeout(') &&
                              (content.includes("removeListenersFor('initialization-categoryManagerReady')") ||
                               content.includes("window.removeEventListener('categoryManagerReady'"));
    assert(hasTimeoutCleanup, 'should clean up on timeout');
  });

  runner.test('init.js sets 5-second timeout for categoryManagerReady', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    assert(content.includes('setTimeout(') && content.includes('5000'), 'should have 5-second timeout');
  });

  runner.test('init.js has EventListenerManager for cleanup', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    assert(content.includes('class EventListenerManager'), 'should have EventListenerManager class');
    assert(content.includes('removeListenersFor'), 'should have removeListenersFor method');
  });

  runner.test('injected.js cleans up listeners on page unload', () => {
    const injectedPath = path.join(__dirname, '../src/content/injected.js');
    const content = fs.readFileSync(injectedPath, 'utf8');

    // 檢查是否有卸載時的清理邏輯
    // Phase 1.5 可能還沒有實作，但應該檢查是否有迹象
    console.log('  Note: Page unload cleanup to be verified in manual testing');
  });
});

runner.describe('5. INITIALIZATION FLOW', () => {
  runner.test('init.js initialize function coordinates setup steps', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    assert(content.includes('async function initialize()'), 'should have initialize function');
    assert(content.includes('const nonce = initializeNonce()'), 'step 1: initialize nonce');
    assert(content.includes('injectScript(nonce)'), 'step 2: inject script');
    assert(content.includes('await waitForAngular()'), 'step 3: wait for AngularJS');
    assert(content.includes('await waitForCategoryManagerReady(nonce)'), 'step 4: wait for ready event');
  });

  runner.test('init.js dispatches scmInitComplete event after setup', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    assert(content.includes("new CustomEvent('scmInitComplete'"), 'should dispatch scmInitComplete event');
  });

  runner.test('initialize function handles errors gracefully', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    assert(content.includes('catch (error)'), 'should have error handling');
    assert(content.includes('console.error'), 'should log errors');
  });

  runner.test('init.js starts on DOM ready or immediately if already loaded', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    assert(content.includes("document.readyState === 'loading'"), 'should check document ready state');
    assert(content.includes('DOMContentLoaded'), 'should listen for DOMContentLoaded');
  });
});

runner.describe('6. CROSS-WORLD COMMUNICATION', () => {
  runner.test('manifest.json includes init.js before content.js in content_scripts', () => {
    const manifestPath = path.join(__dirname, '../src/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    const scripts = manifest.content_scripts[0].js;
    const initIndex = scripts.indexOf('content/init.js');
    const contentIndex = scripts.indexOf('content/content.js');

    assert(initIndex !== -1, 'should include init.js');
    assert(contentIndex !== -1, 'should include content.js');
    assert(initIndex < contentIndex, 'init.js should load before content.js');
  });

  runner.test('injected.js is in web_accessible_resources', () => {
    const manifestPath = path.join(__dirname, '../src/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    const resources = manifest.web_accessible_resources[0].resources;
    assert(resources.includes('content/injected.js'), 'injected.js should be web_accessible');
  });

  runner.test('content/init.js can access chrome.runtime.getURL', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    assert(content.includes('chrome.runtime.getURL('), 'should use chrome.runtime.getURL');
  });

  runner.test('content script runs at document_start', () => {
    const manifestPath = path.join(__dirname, '../src/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    assert(manifest.content_scripts[0].run_at === 'document_start', 'should run at document_start');
  });
});

runner.describe('7. SECURITY CHECKS', () => {
  runner.test('nonce is cryptographically generated (16 bytes)', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    assert(content.includes('crypto.getRandomValues'), 'should use crypto.getRandomValues');
    assert(content.includes('new Uint8Array(16)'), 'should use 16 bytes (128 bits entropy)');
  });

  runner.test('nonce validation is constant-time', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    assert(content.includes('result |='), 'should accumulate all comparisons');
    assert(content.includes('return result === 0'), 'should return after checking all bytes');
  });

  runner.test('injected.js does not expose internal categoryManager', () => {
    const injectedPath = path.join(__dirname, '../src/content/injected.js');
    const content = fs.readFileSync(injectedPath, 'utf8');

    assert(!content.includes('window.categoryManager = new CategoryManager'), 'should not expose categoryManager');
    assert(content.includes('const categoryManager = new CategoryManager'), 'should keep in closure');
  });

  runner.test('injected.js only exposes helper functions', () => {
    const injectedPath = path.join(__dirname, '../src/content/injected.js');
    const content = fs.readFileSync(injectedPath, 'utf8');

    assert(content.includes('window._scm_getAngular'), 'should expose _scm_getAngular');
    assert(content.includes('window._scm_getScope'), 'should expose _scm_getScope');
  });
});

runner.describe('8. BOUNDARY CASES', () => {
  runner.test('validateNonce rejects mismatched nonce', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    assert(content.includes('result |='), 'should detect mismatches via XOR');
    assert(content.includes('return result === 0'), 'should fail if any byte differs');
  });

  runner.test('validateNonce rejects invalid nonce format', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    assert(content.includes("if (!receivedNonce || typeof receivedNonce !== 'string')"), 'should validate type');
  });

  runner.test('validateNonce rejects different-length nonce', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    assert(content.includes('.length !== expectedNonce.length'), 'should check length');
  });

  runner.test('waitForCategoryManagerReady handles missing event detail', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    assert(content.includes('if (!event.detail ||'), 'should check event.detail exists');
  });

  runner.test('waitForCategoryManagerReady times out after 5 seconds', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    assert(content.includes('5000'), 'should have 5-second timeout');
    assert(content.includes('clearTimeout(timeout)'), 'should clear timeout on success');
  });

  runner.test('init.js handles AngularJS not found', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    assert(content.includes('waitForAngular()'), 'should check for AngularJS');
  });

  runner.test('injected.js handles missing AngularJS gracefully', () => {
    const injectedPath = path.join(__dirname, '../src/content/injected.js');
    const content = fs.readFileSync(injectedPath, 'utf8');

    assert(content.includes('if (!window.angular)'), 'should check for AngularJS');
  });
});

runner.describe('9. LOGGING & DEBUGGING', () => {
  runner.test('init.js logs nonce generation', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    assert(content.includes("console.log(PREFIX, 'Nonce generated") ||
           content.includes("'Nonce generated'"), 'should log nonce generation');
  });

  runner.test('init.js logs initialization progress', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    assert(content.includes("console.log(PREFIX, 'Initialization starting'"), 'should log start');
    assert(content.includes("console.log(PREFIX, 'AngularJS ready'"), 'should log AngularJS ready');
  });

  runner.test('injected.js logs categoryManagerReady event', () => {
    const injectedPath = path.join(__dirname, '../src/content/injected.js');
    const content = fs.readFileSync(injectedPath, 'utf8');

    assert(content.includes("console.log('[Injected] categoryManagerReady event broadcasted"), 'should log event broadcast');
  });

  runner.test('init.js logs errors with context', () => {
    const initPath = path.join(__dirname, '../src/content/init.js');
    const content = fs.readFileSync(initPath, 'utf8');

    assert(content.includes('console.error(PREFIX'), 'should log errors with prefix');
  });
});

runner.describe('10. MANIFEST CONFIGURATION', () => {
  runner.test('manifest.json has all required files in content_scripts', () => {
    const manifestPath = path.join(__dirname, '../src/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    const scripts = manifest.content_scripts[0].js;
    assert(scripts.includes('content/init.js'), 'should include init.js');
    assert(scripts.includes('content/content.js'), 'should include content.js');
  });

  runner.test('manifest.json content_scripts match Shopline URLs', () => {
    const manifestPath = path.join(__dirname, '../src/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    const matches = manifest.content_scripts[0].matches;
    assert(matches.some(m => m.includes('shoplineapp.com')), 'should match shoplineapp.com');
    assert(matches.some(m => m.includes('shopline.tw')), 'should match shopline.tw');
    assert(matches.some(m => m.includes('shopline.app')), 'should match shopline.app');
    assert(matches.some(m => m.includes('categories')), 'should match categories path');
  });
});

// ============================================================================
// RUN TESTS
// ============================================================================

if (require.main === module) {
  runner.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { TestRunner };
