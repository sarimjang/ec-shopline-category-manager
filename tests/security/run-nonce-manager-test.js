/**
 * Simple test runner for NonceManager
 * Executes the test suite without external dependencies
 */

'use strict';

const assert = require('assert');

// Global test framework
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  suites: []
};

let currentSuite = null;

global.describe = function(name, fn) {
  currentSuite = { name, tests: [] };
  testResults.suites.push(currentSuite);
  fn();
};

global.test = function(name, fn) {
  if (!currentSuite) {
    throw new Error('test() called outside describe()');
  }

  testResults.total++;
  const testCase = { name, passed: false, error: null };

  try {
    // Run beforeEach hooks
    if (currentSuite.beforeEach) {
      for (const hook of currentSuite.beforeEach) {
        hook();
      }
    }

    // Handle async tests
    const result = fn((err) => {
      if (err) {
        testCase.passed = false;
        testCase.error = err;
        testResults.failed++;
      } else {
        testCase.passed = true;
        testResults.passed++;
      }
    });

    // If function returns a promise, handle it
    if (result && typeof result.then === 'function') {
      result
        .then(() => {
          testCase.passed = true;
          testResults.passed++;
        })
        .catch((err) => {
          testCase.passed = false;
          testCase.error = err;
          testResults.failed++;
        });
    } else if (!fn.length) {
      // Synchronous test (no callback parameter)
      testCase.passed = true;
      testResults.passed++;
    }
  } catch (err) {
    testCase.passed = false;
    testCase.error = err;
    testResults.failed++;
  }

  currentSuite.tests.push(testCase);
};

global.beforeEach = function(fn) {
  if (!currentSuite) {
    throw new Error('beforeEach() called outside describe()');
  }
  if (!currentSuite.beforeEach) {
    currentSuite.beforeEach = [];
  }
  currentSuite.beforeEach.push(fn);
};

// Mock crypto for testing
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    getRandomValues: (buffer) => {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = Math.floor(Math.random() * 256);
      }
      return buffer;
    }
  };
}

// Simple expect implementation
global.expect = function(value) {
  return {
    toBe: (expected) => {
      assert.strictEqual(value, expected, `Expected ${JSON.stringify(value)} to be ${JSON.stringify(expected)}`);
    },
    toMatch: (regex) => {
      assert(regex.test(value), `Expected ${JSON.stringify(value)} to match ${regex}`);
    },
    toEqual: (expected) => {
      assert.deepStrictEqual(value, expected, `Expected ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`);
    },
    not: {
      toBe: (expected) => {
        assert.notStrictEqual(value, expected, `Expected ${JSON.stringify(value)} not to be ${JSON.stringify(expected)}`);
      },
      toMatch: (regex) => {
        assert(!regex.test(value), `Expected ${JSON.stringify(value)} not to match ${regex}`);
      }
    },
    toBeGreaterThan: (expected) => {
      assert(value > expected, `Expected ${value} to be greater than ${expected}`);
    },
    toBeLessThan: (expected) => {
      assert(value < expected, `Expected ${value} to be less than ${expected}`);
    },
    toThrow: () => {
      try {
        value();
        throw new AssertionError('Expected function to throw');
      } catch (err) {
        // Expected
      }
    }
  };
};

// Load the module
const { NonceManager, nonceManager } = require('../../src/shared/security/nonce-manager.js');

// Run the tests
console.log('\n🧪 Running NonceManager Tests\n');
console.log('═'.repeat(60));

// Execute the test file
require('./nonce-manager.test.js');

// Wait a bit for async tests to complete
setTimeout(() => {
  console.log('\n' + '═'.repeat(60));
  console.log(`\n📊 Test Results:`);
  console.log(`   Total:  ${testResults.total}`);
  console.log(`   Passed: ${testResults.passed}`);
  console.log(`   Failed: ${testResults.failed}`);

  // Print detailed results
  testResults.suites.forEach((suite) => {
    const passedTests = suite.tests.filter(t => t.passed).length;
    const failedTests = suite.tests.filter(t => !t.passed).length;

    const status = failedTests === 0 ? '✅' : '❌';
    console.log(`\n${status} ${suite.name}`);
    console.log(`   ${passedTests}/${suite.tests.length} tests passed`);

    suite.tests.forEach((test) => {
      const icon = test.passed ? '  ✓' : '  ✗';
      console.log(`${icon} ${test.name}`);
      if (test.error) {
        const errorMsg = test.error.message || String(test.error);
        console.log(`      Error: ${errorMsg}`);
      }
    });
  });

  console.log('\n' + '═'.repeat(60));

  if (testResults.failed > 0) {
    console.log(`\n❌ ${testResults.failed} test(s) failed`);
    process.exit(1);
  } else {
    console.log(`\n✅ All tests passed!`);
    process.exit(0);
  }
}, 500);
