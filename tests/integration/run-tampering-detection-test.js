/**
 * Test runner for Tampering Detection
 */

'use strict';

// Global test framework
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

// Simple expect implementation
global.expect = function(value) {
  return {
    toBe: (expected) => {
      if (value !== expected) {
        throw new Error(`Expected ${JSON.stringify(value)} to be ${JSON.stringify(expected)}`);
      }
    },
    toBeDefined: () => {
      if (value === undefined) {
        throw new Error('Expected value to be defined');
      }
    }
  };
};

console.log('\n🧪 Running Tampering Detection Tests (Phase 1.8.2)\n');
console.log('═'.repeat(60));

require('./tampering-detection.test.js');

const checkCompletion = () => {
  if (testResults.pendingTests > 0) {
    setTimeout(checkCompletion, 100);
  } else {
    printResults();
  }
};

function printResults() {
  console.log('\n' + '═'.repeat(60));
  console.log(`\n📊 Test Results:`);
  console.log(`   Total:  ${testResults.total}`);
  console.log(`   Passed: ${testResults.passed}`);
  console.log(`   Failed: ${testResults.failed}`);

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

setTimeout(checkCompletion, 500);
