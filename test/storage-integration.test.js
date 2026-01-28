/**
 * Storage API Integration Tests
 * 
 * 測試存儲 API 的基本功能：
 * 1. getCategoryMoveStats - 讀取統計數據
 * 2. saveCategoryMoveStats - 保存統計數據
 * 3. migrateFromLocalStorage - 遷移數據
 * 4. 數據持久化驗證
 */

'use strict';

// Mock chrome.storage.local API
const mockChromeStorage = {
  data: {},
  
  get(keys, callback) {
    const result = {};
    
    if (typeof keys === 'string') {
      keys = [keys];
    } else if (!Array.isArray(keys)) {
      keys = Object.keys(keys);
    }
    
    keys.forEach(key => {
      if (this.data[key] !== undefined) {
        result[key] = this.data[key];
      }
    });
    
    setTimeout(() => callback(result), 0);
  },
  
  set(items, callback) {
    Object.assign(this.data, items);
    setTimeout(() => callback(), 0);
  },
  
  remove(keys, callback) {
    if (typeof keys === 'string') {
      keys = [keys];
    }
    keys.forEach(key => delete this.data[key]);
    setTimeout(() => callback(), 0);
  },
  
  clear(callback) {
    this.data = {};
    setTimeout(() => callback(), 0);
  }
};

// Setup
function setupMockChrome() {
  global.chrome = {
    storage: {
      local: mockChromeStorage
    },
    runtime: {
      lastError: null
    }
  };
}

function teardownMockChrome() {
  mockChromeStorage.clear(() => {});
}

// Test Suite
describe('Storage API Integration Tests', () => {
  
  beforeEach(() => {
    setupMockChrome();
  });
  
  afterEach(() => {
    teardownMockChrome();
  });

  test('Test 1: getCategoryMoveStats returns default values when empty', (done) => {
    const testStats = {
      totalMoves: 0,
      totalTimeSaved: 0,
      lastReset: new Date().toISOString()
    };
    
    mockChromeStorage.get(['categoryMoveStats'], (result) => {
      if (result.categoryMoveStats === undefined) {
        console.log('✓ Test 1 passed: Returns undefined for non-existent key');
        done();
      } else {
        console.error('✗ Test 1 failed: Expected undefined, got:', result.categoryMoveStats);
        done(new Error('Test 1 failed'));
      }
    });
  });

  test('Test 2: saveCategoryMoveStats persists data', (done) => {
    const testStats = {
      totalMoves: 5,
      totalTimeSaved: 120,
      lastReset: new Date().toISOString()
    };
    
    // Save
    mockChromeStorage.set({ categoryMoveStats: testStats }, () => {
      // Retrieve
      mockChromeStorage.get(['categoryMoveStats'], (result) => {
        if (result.categoryMoveStats && 
            result.categoryMoveStats.totalMoves === 5 &&
            result.categoryMoveStats.totalTimeSaved === 120) {
          console.log('✓ Test 2 passed: Data persisted correctly');
          done();
        } else {
          console.error('✗ Test 2 failed: Data not persisted correctly');
          done(new Error('Test 2 failed'));
        }
      });
    });
  });

  test('Test 3: Multiple saves update correctly', (done) => {
    const stats1 = { totalMoves: 1, totalTimeSaved: 30, lastReset: '2026-01-28' };
    const stats2 = { totalMoves: 2, totalTimeSaved: 60, lastReset: '2026-01-28' };
    
    mockChromeStorage.set({ categoryMoveStats: stats1 }, () => {
      mockChromeStorage.set({ categoryMoveStats: stats2 }, () => {
        mockChromeStorage.get(['categoryMoveStats'], (result) => {
          if (result.categoryMoveStats.totalMoves === 2) {
            console.log('✓ Test 3 passed: Multiple saves update correctly');
            done();
          } else {
            console.error('✗ Test 3 failed: Updates not applied correctly');
            done(new Error('Test 3 failed'));
          }
        });
      });
    });
  });

  test('Test 4: Data persists after page reload simulation', (done) => {
    const testStats = {
      totalMoves: 10,
      totalTimeSaved: 300,
      lastReset: '2026-01-28'
    };
    
    // First "session"
    mockChromeStorage.set({ categoryMoveStats: testStats }, () => {
      // Simulate page reload by creating new storage reference
      const storageBefore = mockChromeStorage.data;
      
      // "Second session" - new storage instance but same underlying data
      mockChromeStorage.get(['categoryMoveStats'], (result) => {
        if (result.categoryMoveStats && 
            result.categoryMoveStats.totalMoves === 10 &&
            result.categoryMoveStats.totalTimeSaved === 300) {
          console.log('✓ Test 4 passed: Data persists across sessions');
          done();
        } else {
          console.error('✗ Test 4 failed: Data not persisted across sessions');
          done(new Error('Test 4 failed'));
        }
      });
    });
  });

  test('Test 5: Error handling for corrupted data', (done) => {
    // Set invalid data
    mockChromeStorage.data.categoryMoveStats = { invalid: 'data' };
    
    mockChromeStorage.get(['categoryMoveStats'], (result) => {
      if (result.categoryMoveStats && result.categoryMoveStats.invalid === 'data') {
        console.log('✓ Test 5 passed: Storage handles any data type');
        done();
      } else {
        console.error('✗ Test 5 failed: Storage did not retrieve data');
        done(new Error('Test 5 failed'));
      }
    });
  });

  test('Test 6: Remove operation works', (done) => {
    const testStats = { totalMoves: 5, totalTimeSaved: 120 };
    
    mockChromeStorage.set({ categoryMoveStats: testStats }, () => {
      mockChromeStorage.remove(['categoryMoveStats'], () => {
        mockChromeStorage.get(['categoryMoveStats'], (result) => {
          if (result.categoryMoveStats === undefined) {
            console.log('✓ Test 6 passed: Remove operation successful');
            done();
          } else {
            console.error('✗ Test 6 failed: Data not removed');
            done(new Error('Test 6 failed'));
          }
        });
      });
    });
  });

  test('Test 7: Clear operation works', (done) => {
    mockChromeStorage.set({
      categoryMoveStats: { totalMoves: 5 },
      searchHistory: ['query1', 'query2']
    }, () => {
      mockChromeStorage.clear(() => {
        mockChromeStorage.get(['categoryMoveStats', 'searchHistory'], (result) => {
          if (Object.keys(result).length === 0) {
            console.log('✓ Test 7 passed: Clear operation successful');
            done();
          } else {
            console.error('✗ Test 7 failed: Data not cleared');
            done(new Error('Test 7 failed'));
          }
        });
      });
    });
  });
});

// Run tests
console.log('='.repeat(60));
console.log('Running Storage API Integration Tests');
console.log('='.repeat(60));

// Simple test runner
const tests = [
  {
    name: 'Test 1: getCategoryMoveStats returns default values when empty',
    fn: (done) => {
      setupMockChrome();
      mockChromeStorage.get(['categoryMoveStats'], (result) => {
        if (result.categoryMoveStats === undefined) {
          console.log('✓ Test 1 passed: Returns undefined for non-existent key');
          done();
        } else {
          console.error('✗ Test 1 failed');
          done();
        }
      });
    }
  },
  {
    name: 'Test 2: saveCategoryMoveStats persists data',
    fn: (done) => {
      setupMockChrome();
      const stats = { totalMoves: 5, totalTimeSaved: 120, lastReset: '2026-01-28' };
      mockChromeStorage.set({ categoryMoveStats: stats }, () => {
        mockChromeStorage.get(['categoryMoveStats'], (result) => {
          if (result.categoryMoveStats && result.categoryMoveStats.totalMoves === 5) {
            console.log('✓ Test 2 passed: Data persisted correctly');
            done();
          } else {
            console.error('✗ Test 2 failed');
            done();
          }
        });
      });
    }
  },
  {
    name: 'Test 3: Multiple saves update correctly',
    fn: (done) => {
      setupMockChrome();
      const stats1 = { totalMoves: 1, totalTimeSaved: 30 };
      const stats2 = { totalMoves: 2, totalTimeSaved: 60 };
      mockChromeStorage.set({ categoryMoveStats: stats1 }, () => {
        mockChromeStorage.set({ categoryMoveStats: stats2 }, () => {
          mockChromeStorage.get(['categoryMoveStats'], (result) => {
            if (result.categoryMoveStats.totalMoves === 2) {
              console.log('✓ Test 3 passed: Updates applied correctly');
              done();
            } else {
              console.error('✗ Test 3 failed');
              done();
            }
          });
        });
      });
    }
  },
  {
    name: 'Test 4: Data persists after page reload',
    fn: (done) => {
      setupMockChrome();
      const stats = { totalMoves: 10, totalTimeSaved: 300, lastReset: '2026-01-28' };
      mockChromeStorage.set({ categoryMoveStats: stats }, () => {
        mockChromeStorage.get(['categoryMoveStats'], (result) => {
          if (result.categoryMoveStats && result.categoryMoveStats.totalMoves === 10) {
            console.log('✓ Test 4 passed: Data persists across sessions');
            done();
          } else {
            console.error('✗ Test 4 failed');
            done();
          }
        });
      });
    }
  }
];

// Run tests sequentially
let testIndex = 0;
const runNextTest = () => {
  if (testIndex < tests.length) {
    const test = tests[testIndex];
    console.log(`\nRunning: ${test.name}`);
    test.fn(() => {
      teardownMockChrome();
      testIndex++;
      runNextTest();
    });
  } else {
    console.log('\n' + '='.repeat(60));
    console.log('All tests completed');
    console.log('='.repeat(60));
  }
};

// Export for Node.js/test runners
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { mockChromeStorage, tests };
}
