/**
 * Simple test runner for MessageSigner
 * Executes the test suite without external dependencies
 * Handles async tests properly
 */

'use strict';

// Global test framework with async support
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  suites: [],
  pendingTests: 0
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
  testResults.pendingTests++;
  const testCase = { name, passed: false, error: null };

  try {
    // Run beforeEach hooks
    if (currentSuite.beforeEach) {
      for (const hook of currentSuite.beforeEach) {
        hook();
      }
    }

    // Call the test with done callback
    const result = fn((err) => {
      testResults.pendingTests--;
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
          testResults.pendingTests--;
          testCase.passed = true;
          testResults.passed++;
        })
        .catch((err) => {
          testResults.pendingTests--;
          testCase.passed = false;
          testCase.error = err;
          testResults.failed++;
        });
    }
  } catch (err) {
    testResults.pendingTests--;
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

// Simple expect implementation
global.expect = function(value) {
  return {
    toBe: (expected) => {
      if (value !== expected) {
        throw new Error(`Expected ${JSON.stringify(value)} to be ${JSON.stringify(expected)}`);
      }
    },
    toMatch: (regex) => {
      if (!regex.test(value)) {
        throw new Error(`Expected ${JSON.stringify(value)} to match ${regex}`);
      }
    },
    toEqual: (expected) => {
      if (JSON.stringify(value) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`);
      }
    },
    toBeDefined: () => {
      if (value === undefined) {
        throw new Error('Expected value to be defined');
      }
    },
    not: {
      toBe: (expected) => {
        if (value === expected) {
          throw new Error(`Expected ${JSON.stringify(value)} not to be ${JSON.stringify(expected)}`);
        }
      }
    },
    toBeGreaterThan: (expected) => {
      if (!(value > expected)) {
        throw new Error(`Expected ${value} to be greater than ${expected}`);
      }
    }
  };
};

// Load the module
const { MessageSigner, messageSigner } = require('../../src/shared/security/message-signer.js');

// Run the tests
console.log('\n🧪 Running MessageSigner Tests\n');
console.log('═'.repeat(60));

// Execute the test file
require('./message-signer.test.js');

// Wait for all pending async tests to complete
const checkCompletion = () => {
  if (testResults.pendingTests > 0) {
    // Still have pending tests, check again in 100ms
    setTimeout(checkCompletion, 100);
  } else {
    // All tests completed, print results
    printResults();
  }
};

function printResults() {
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
}

// Start checking for completion
setTimeout(checkCompletion, 500);
