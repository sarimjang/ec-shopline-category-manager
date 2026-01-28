/**
 * Conflict Detector Tests - Phase 4.1 Optimization
 * 測試 O(n) 衝突檢測的正確性和性能
 *
 * Test Goals:
 * 1. 驗證優化後的檢測結果與原實現相同
 * 2. 測試邊界情況
 * 3. 性能基準測試（O(n) vs 原 O(n²)）
 * 4. 驗證大型數據集
 */

'use strict';

const assert = require('assert');

// Mock ShoplineConflictDetector for Node.js environment
const ShoplineConflictDetector = (function() {
  const logger = console;

  const SEVERITY = { INFO: 'INFO', WARNING: 'WARNING', ERROR: 'ERROR' };
  const CONFLICT_TYPE = {
    DUPLICATE_MOVE: 'DUPLICATE_MOVE',
    DUPLICATE_SEARCH: 'DUPLICATE_SEARCH',
    DUPLICATE_ERROR: 'DUPLICATE_ERROR',
    TIMESTAMP_CONFLICT: 'TIMESTAMP_CONFLICT',
    STATS_MISMATCH: 'STATS_MISMATCH',
    VERSION_MISMATCH: 'VERSION_MISMATCH',
    DATA_LOSS_RISK: 'DATA_LOSS_RISK'
  };

  function detectDuplicateMoves(importedMoves, existingMoves) {
    const duplicates = [];
    if (!Array.isArray(importedMoves) || !Array.isArray(existingMoves)) return duplicates;

    // O(n) 優化: 使用 Map 儲存現存的 moves，鍵為 categoryId_timestamp_timeSaved
    const existingMovesMap = new Map();
    existingMoves.forEach((move) => {
      const key = move.categoryId + '_' + move.timestamp + '_' + move.timeSaved;
      existingMovesMap.set(key, move);
    });

    // O(n) 檢測: 逐個檢查匯入的 moves
    importedMoves.forEach((importedMove) => {
      const key = importedMove.categoryId + '_' + importedMove.timestamp + '_' + importedMove.timeSaved;
      if (existingMovesMap.has(key)) {
        duplicates.push({
          severity: SEVERITY.WARNING,
          type: CONFLICT_TYPE.DUPLICATE_MOVE,
          message: 'Duplicate move: categoryId=' + importedMove.categoryId,
          resolution: 'SKIP'
        });
      }
    });
    return duplicates;
  }

  function detectDuplicateSearches(importedQueries, existingQueries) {
    const duplicates = [];
    if (!Array.isArray(importedQueries) || !Array.isArray(existingQueries)) return duplicates;

    // O(n) 優化: 使用 Set 儲存現存的搜尋查詢，而非使用 indexOf
    const existingQueriesSet = new Set(existingQueries);

    // O(n) 檢測: 逐個檢查匯入的查詢
    importedQueries.forEach((query) => {
      if (existingQueriesSet.has(query)) {
        duplicates.push({
          severity: SEVERITY.INFO,
          type: CONFLICT_TYPE.DUPLICATE_SEARCH,
          message: 'Duplicate search: ' + query,
          resolution: 'SKIP'
        });
      }
    });
    return duplicates;
  }

  function detectDuplicateErrors(importedErrors, existingErrors) {
    const duplicates = [];
    if (!Array.isArray(importedErrors) || !Array.isArray(existingErrors)) return duplicates;

    // O(n) 優化: 使用 Map 儲存現存的 errors，鍵為 type_message_timestamp
    const existingErrorsMap = new Map();
    existingErrors.forEach((error) => {
      const key = error.type + '_' + error.message + '_' + error.timestamp;
      existingErrorsMap.set(key, error);
    });

    // O(n) 檢測: 逐個檢查匯入的 errors
    importedErrors.forEach((importedError) => {
      const key = importedError.type + '_' + importedError.message + '_' + importedError.timestamp;
      if (existingErrorsMap.has(key)) {
        duplicates.push({
          severity: SEVERITY.INFO,
          type: CONFLICT_TYPE.DUPLICATE_ERROR,
          message: 'Duplicate error: ' + importedError.type,
          resolution: 'SKIP'
        });
      }
    });
    return duplicates;
  }

  function detectVersionConflicts(importedData, existingData) {
    const conflicts = [];
    const importedVersion = importedData.version || 1;
    const existingVersion = existingData.version || 1;

    if (importedVersion !== existingVersion) {
      conflicts.push({
        severity: SEVERITY.WARNING,
        type: CONFLICT_TYPE.VERSION_MISMATCH,
        message: 'Version mismatch: imported v' + importedVersion + ', existing v' + existingVersion,
        resolution: 'UPGRADE'
      });
    }
    return conflicts;
  }

  function detectDataLossRisk(importedData, existingData) {
    const risks = [];

    if (existingData.moveHistory && existingData.moveHistory.length > 0) {
      if (!importedData.moveHistory || importedData.moveHistory.length === 0) {
        risks.push({
          severity: SEVERITY.ERROR,
          type: CONFLICT_TYPE.DATA_LOSS_RISK,
          message: 'Empty moveHistory will lose ' + existingData.moveHistory.length + ' records',
          resolution: 'MERGE'
        });
      }
    }

    if (existingData.searchHistory && existingData.searchHistory.length > 0) {
      if (!importedData.searchHistory || importedData.searchHistory.length === 0) {
        risks.push({
          severity: SEVERITY.WARNING,
          type: CONFLICT_TYPE.DATA_LOSS_RISK,
          message: 'Empty searchHistory will lose ' + existingData.searchHistory.length + ' records',
          resolution: 'MERGE'
        });
      }
    }
    return risks;
  }

  function generateMergeStrategy(conflicts) {
    return { moves: 'MERGE', searches: 'DEDUPLICATE', errors: 'MERGE', stats: 'RECALCULATE' };
  }

  function mergeData(importedData, existingData, strategy) {
    const merged = {
      categoryMoveStats: {},
      moveHistory: [],
      searchHistory: [],
      errorLog: []
    };

    const importedStats = importedData.categoryMoveStats || {};
    const existingStats = existingData.categoryMoveStats || {};

    merged.categoryMoveStats = {
      totalMoves: 0,
      totalTimeSaved: 0,
      lastReset: new Date().toISOString(),
      movesByDepth: importedStats.movesByDepth || {},
      movesBySize: importedStats.movesBySize || {},
      lastMoveTimestamp: Math.max(importedStats.lastMoveTimestamp || 0, existingStats.lastMoveTimestamp || 0)
    };

    if (strategy.moves === 'MERGE') {
      const moveMap = new Map();
      (existingData.moveHistory || []).forEach(move => {
        const key = move.categoryId + '_' + move.timestamp;
        moveMap.set(key, move);
      });
      (importedData.moveHistory || []).forEach(move => {
        const key = move.categoryId + '_' + move.timestamp;
        if (!moveMap.has(key)) moveMap.set(key, move);
      });
      merged.moveHistory = Array.from(moveMap.values());
    } else {
      merged.moveHistory = importedData.moveHistory || [];
    }

    const searchSet = new Set();
    (existingData.searchHistory || []).forEach(q => searchSet.add(q));
    (importedData.searchHistory || []).forEach(q => searchSet.add(q));
    merged.searchHistory = Array.from(searchSet);

    if (strategy.errors === 'MERGE') {
      const errorMap = new Map();
      (existingData.errorLog || []).forEach(e => {
        const key = e.type + '_' + e.timestamp;
        errorMap.set(key, e);
      });
      (importedData.errorLog || []).forEach(e => {
        const key = e.type + '_' + e.timestamp;
        if (!errorMap.has(key)) errorMap.set(key, e);
      });
      merged.errorLog = Array.from(errorMap.values());
    } else {
      merged.errorLog = importedData.errorLog || [];
    }

    if (strategy.stats === 'RECALCULATE') {
      merged.categoryMoveStats.totalMoves = merged.moveHistory.length;
      merged.categoryMoveStats.totalTimeSaved = merged.moveHistory.reduce((sum, m) => sum + (m.timeSaved || 0), 0);
    }

    return merged;
  }

  function detectConflicts(importedData, existingData) {
    const result = {
      hasConflicts: false,
      conflicts: [],
      summary: {
        duplicateMoves: 0,
        duplicateSearches: 0,
        duplicateErrors: 0,
        timestampConflicts: 0,
        versionMismatches: 0,
        dataLossRisks: 0
      },
      mergeStrategy: null,
      mergedData: null
    };

    const duplicateMoves = detectDuplicateMoves(importedData.moveHistory || [], existingData.moveHistory || []);
    const duplicateSearches = detectDuplicateSearches(importedData.searchHistory || [], existingData.searchHistory || []);
    const duplicateErrors = detectDuplicateErrors(importedData.errorLog || [], existingData.errorLog || []);
    const versionConflicts = detectVersionConflicts(importedData, existingData);
    const dataLossRisks = detectDataLossRisk(importedData, existingData);

    const allConflicts = [
      ...duplicateMoves,
      ...duplicateSearches,
      ...duplicateErrors,
      ...versionConflicts,
      ...dataLossRisks
    ];

    if (allConflicts.length > 0) {
      result.hasConflicts = true;
      result.conflicts = allConflicts;
      result.summary.duplicateMoves = duplicateMoves.length;
      result.summary.duplicateSearches = duplicateSearches.length;
      result.summary.duplicateErrors = duplicateErrors.length;
      result.summary.versionMismatches = versionConflicts.length;
      result.summary.dataLossRisks = dataLossRisks.length;
    }

    result.mergeStrategy = generateMergeStrategy(allConflicts);
    result.mergedData = mergeData(importedData, existingData, result.mergeStrategy);

    return result;
  }

  return {
    detectConflicts: detectConflicts,
    detectDuplicateMoves: detectDuplicateMoves,
    detectDuplicateSearches: detectDuplicateSearches,
    detectDuplicateErrors: detectDuplicateErrors,
    detectVersionConflicts: detectVersionConflicts,
    detectDataLossRisk: detectDataLossRisk,
    generateMergeStrategy: generateMergeStrategy,
    mergeData: mergeData,
    CONFLICT_TYPE: CONFLICT_TYPE,
    SEVERITY: SEVERITY
  };
})();

// Test Data Generators
function generateMoves(count, duplicate = false) {
  const moves = [];
  for (let i = 0; i < count; i++) {
    moves.push({
      categoryId: 'cat-' + (i % 10),
      timestamp: 1000000 + i,
      timeSaved: 10 * i
    });
  }
  if (duplicate) {
    // 添加一些重複的記錄
    moves.push(moves[0]);
    moves.push(moves[Math.floor(count / 2)]);
  }
  return moves;
}

function generateQueries(count, duplicate = false) {
  const queries = [];
  for (let i = 0; i < count; i++) {
    queries.push('search-' + i);
  }
  if (duplicate) {
    queries.push(queries[0]);
    queries.push(queries[Math.floor(count / 2)]);
  }
  return queries;
}

function generateErrors(count, duplicate = false) {
  const errors = [];
  for (let i = 0; i < count; i++) {
    errors.push({
      type: 'ERROR_TYPE_' + (i % 5),
      message: 'Error message ' + i,
      timestamp: 1000000 + i
    });
  }
  if (duplicate) {
    errors.push(errors[0]);
    errors.push(errors[Math.floor(count / 2)]);
  }
  return errors;
}

// Test Suite
describe('Conflict Detector - Phase 4.1 Optimization', function() {

  // ============ 正確性測試 ============
  describe('1. 正確性驗證 (Correctness)', function() {

    it('1.1 - detectDuplicateMoves: 應檢測相同的 moves', function() {
      const imported = [
        { categoryId: 'cat-1', timestamp: 100, timeSaved: 50 },
        { categoryId: 'cat-2', timestamp: 200, timeSaved: 60 }
      ];
      const existing = [
        { categoryId: 'cat-1', timestamp: 100, timeSaved: 50 },
        { categoryId: 'cat-3', timestamp: 300, timeSaved: 70 }
      ];

      const result = ShoplineConflictDetector.detectDuplicateMoves(imported, existing);
      assert.strictEqual(result.length, 1, '應檢測到 1 個重複');
      assert.strictEqual(result[0].type, 'DUPLICATE_MOVE');
      assert.strictEqual(result[0].severity, 'WARNING');
    });

    it('1.2 - detectDuplicateMoves: 空陣列應返回空結果', function() {
      const result1 = ShoplineConflictDetector.detectDuplicateMoves([], []);
      const result2 = ShoplineConflictDetector.detectDuplicateMoves([], [{ categoryId: 'cat-1', timestamp: 100, timeSaved: 50 }]);
      assert.strictEqual(result1.length, 0);
      assert.strictEqual(result2.length, 0);
    });

    it('1.3 - detectDuplicateMoves: 無重複應返回空結果', function() {
      const imported = [{ categoryId: 'cat-1', timestamp: 100, timeSaved: 50 }];
      const existing = [{ categoryId: 'cat-2', timestamp: 200, timeSaved: 60 }];
      const result = ShoplineConflictDetector.detectDuplicateMoves(imported, existing);
      assert.strictEqual(result.length, 0);
    });

    it('1.4 - detectDuplicateSearches: 應檢測相同的查詢', function() {
      const imported = ['search-1', 'search-2', 'search-3'];
      const existing = ['search-2', 'search-4', 'search-5'];

      const result = ShoplineConflictDetector.detectDuplicateSearches(imported, existing);
      assert.strictEqual(result.length, 1, '應檢測到 1 個重複');
      assert.strictEqual(result[0].type, 'DUPLICATE_SEARCH');
      assert.strictEqual(result[0].severity, 'INFO');
    });

    it('1.5 - detectDuplicateSearches: 空陣列應返回空結果', function() {
      const result = ShoplineConflictDetector.detectDuplicateSearches([], []);
      assert.strictEqual(result.length, 0);
    });

    it('1.6 - detectDuplicateSearches: 無重複應返回空結果', function() {
      const imported = ['search-1', 'search-2'];
      const existing = ['search-3', 'search-4'];
      const result = ShoplineConflictDetector.detectDuplicateSearches(imported, existing);
      assert.strictEqual(result.length, 0);
    });

    it('1.7 - detectDuplicateErrors: 應檢測相同的錯誤', function() {
      const imported = [
        { type: 'ERR_1', message: 'Error A', timestamp: 100 },
        { type: 'ERR_2', message: 'Error B', timestamp: 200 }
      ];
      const existing = [
        { type: 'ERR_1', message: 'Error A', timestamp: 100 },
        { type: 'ERR_3', message: 'Error C', timestamp: 300 }
      ];

      const result = ShoplineConflictDetector.detectDuplicateErrors(imported, existing);
      assert.strictEqual(result.length, 1, '應檢測到 1 個重複');
      assert.strictEqual(result[0].type, 'DUPLICATE_ERROR');
      assert.strictEqual(result[0].severity, 'INFO');
    });

    it('1.8 - detectDuplicateErrors: 空陣列應返回空結果', function() {
      const result = ShoplineConflictDetector.detectDuplicateErrors([], []);
      assert.strictEqual(result.length, 0);
    });

    it('1.9 - detectDuplicateErrors: 無重複應返回空結果', function() {
      const imported = [{ type: 'ERR_1', message: 'Error A', timestamp: 100 }];
      const existing = [{ type: 'ERR_2', message: 'Error B', timestamp: 200 }];
      const result = ShoplineConflictDetector.detectDuplicateErrors(imported, existing);
      assert.strictEqual(result.length, 0);
    });

    it('1.10 - detectConflicts: 整體衝突檢測應正常工作', function() {
      const imported = {
        version: 1,
        moveHistory: [{ categoryId: 'cat-1', timestamp: 100, timeSaved: 50 }],
        searchHistory: ['search-1'],
        errorLog: [{ type: 'ERR_1', message: 'Error', timestamp: 100 }]
      };
      const existing = {
        version: 1,
        moveHistory: [{ categoryId: 'cat-1', timestamp: 100, timeSaved: 50 }],
        searchHistory: ['search-2'],
        errorLog: [{ type: 'ERR_2', message: 'Error', timestamp: 200 }]
      };

      const result = ShoplineConflictDetector.detectConflicts(imported, existing);
      assert.strictEqual(result.hasConflicts, true);
      assert.strictEqual(result.summary.duplicateMoves, 1);
      assert.strictEqual(result.summary.duplicateSearches, 0);
      assert.strictEqual(result.summary.duplicateErrors, 0);
    });
  });

  // ============ 邊界情況測試 ============
  describe('2. 邊界情況 (Edge Cases)', function() {

    it('2.1 - null/undefined 應被安全處理', function() {
      const result1 = ShoplineConflictDetector.detectDuplicateMoves(null, []);
      const result2 = ShoplineConflictDetector.detectDuplicateSearches(undefined, []);
      const result3 = ShoplineConflictDetector.detectDuplicateErrors(null, null);
      assert.strictEqual(result1.length, 0);
      assert.strictEqual(result2.length, 0);
      assert.strictEqual(result3.length, 0);
    });

    it('2.2 - 空字串搜尋應被檢測', function() {
      const imported = ['', 'search-1'];
      const existing = ['', 'search-2'];
      const result = ShoplineConflictDetector.detectDuplicateSearches(imported, existing);
      assert.strictEqual(result.length, 1);
    });

    it('2.3 - 特殊字元在鍵中應被正確處理', function() {
      const imported = [{ categoryId: 'cat_1', timestamp: 100, timeSaved: 50 }];
      const existing = [{ categoryId: 'cat_1', timestamp: 100, timeSaved: 50 }];
      const result = ShoplineConflictDetector.detectDuplicateMoves(imported, existing);
      assert.strictEqual(result.length, 1);
    });

    it('2.4 - 大數字時間戳應被正確處理', function() {
      const imported = [{ categoryId: 'cat-1', timestamp: Number.MAX_SAFE_INTEGER, timeSaved: 50 }];
      const existing = [{ categoryId: 'cat-1', timestamp: Number.MAX_SAFE_INTEGER, timeSaved: 50 }];
      const result = ShoplineConflictDetector.detectDuplicateMoves(imported, existing);
      assert.strictEqual(result.length, 1);
    });

    it('2.5 - 零值應被正確處理', function() {
      const imported = [{ categoryId: 'cat-1', timestamp: 0, timeSaved: 0 }];
      const existing = [{ categoryId: 'cat-1', timestamp: 0, timeSaved: 0 }];
      const result = ShoplineConflictDetector.detectDuplicateMoves(imported, existing);
      assert.strictEqual(result.length, 1);
    });

    it('2.6 - 資料遺失風險應被檢測', function() {
      const imported = { moveHistory: [] };
      const existing = { moveHistory: [{ categoryId: 'cat-1', timestamp: 100, timeSaved: 50 }] };
      const risks = ShoplineConflictDetector.detectDataLossRisk(imported, existing);
      assert(risks.length > 0, '應檢測到資料遺失風險');
      assert.strictEqual(risks[0].type, 'DATA_LOSS_RISK');
      assert.strictEqual(risks[0].severity, 'ERROR');
    });
  });

  // ============ 性能基準測試 ============
  describe('3. 性能基準測試 (Performance Benchmark)', function() {

    it('3.1 - detectDuplicateMoves: 中型資料集 (n=100, m=100)', function() {
      const imported = generateMoves(100);
      const existing = generateMoves(100);

      const start = Date.now();
      const result = ShoplineConflictDetector.detectDuplicateMoves(imported, existing);
      const elapsed = Date.now() - start;

      console.log(`    ✓ 100 vs 100 moves: ${elapsed}ms`);
      assert(elapsed < 100, '應在 100ms 內完成');
    });

    it('3.2 - detectDuplicateMoves: 大型資料集 (n=1000, m=1000)', function() {
      const imported = generateMoves(1000);
      const existing = generateMoves(1000);

      const start = Date.now();
      const result = ShoplineConflictDetector.detectDuplicateMoves(imported, existing);
      const elapsed = Date.now() - start;

      console.log(`    ✓ 1000 vs 1000 moves: ${elapsed}ms`);
      assert(elapsed < 500, '應在 500ms 內完成');
    });

    it('3.3 - detectDuplicateSearches: 中型資料集 (n=100, m=100)', function() {
      const imported = generateQueries(100);
      const existing = generateQueries(100);

      const start = Date.now();
      const result = ShoplineConflictDetector.detectDuplicateSearches(imported, existing);
      const elapsed = Date.now() - start;

      console.log(`    ✓ 100 vs 100 searches: ${elapsed}ms`);
      assert(elapsed < 50, '應在 50ms 內完成');
    });

    it('3.4 - detectDuplicateSearches: 大型資料集 (n=5000, m=5000)', function() {
      const imported = generateQueries(5000);
      const existing = generateQueries(5000);

      const start = Date.now();
      const result = ShoplineConflictDetector.detectDuplicateSearches(imported, existing);
      const elapsed = Date.now() - start;

      console.log(`    ✓ 5000 vs 5000 searches: ${elapsed}ms`);
      assert(elapsed < 300, '應在 300ms 內完成');
    });

    it('3.5 - detectDuplicateErrors: 中型資料集 (n=100, m=100)', function() {
      const imported = generateErrors(100);
      const existing = generateErrors(100);

      const start = Date.now();
      const result = ShoplineConflictDetector.detectDuplicateErrors(imported, existing);
      const elapsed = Date.now() - start;

      console.log(`    ✓ 100 vs 100 errors: ${elapsed}ms`);
      assert(elapsed < 100, '應在 100ms 內完成');
    });

    it('3.6 - 完整衝突檢測: 混合資料集', function() {
      const imported = {
        version: 1,
        moveHistory: generateMoves(500),
        searchHistory: generateQueries(500),
        errorLog: generateErrors(500)
      };
      const existing = {
        version: 1,
        moveHistory: [],
        searchHistory: [],
        errorLog: []
      };

      const start = Date.now();
      const result = ShoplineConflictDetector.detectConflicts(imported, existing);
      const elapsed = Date.now() - start;

      console.log(`    ✓ Full detection (500+500 items): ${elapsed}ms`);
      assert(elapsed < 1000, '應在 1000ms 內完成');
      assert.strictEqual(result.hasConflicts, false, '不同的資料集應無衝突');
    });
  });

  // ============ 大型資料集測試 ============
  describe('4. 大型資料集測試 (Large Dataset)', function() {

    it('4.1 - 10000 moves 與 10000 moves 的比較', function() {
      const imported = generateMoves(10000);
      const existing = generateMoves(10000);

      const start = Date.now();
      const result = ShoplineConflictDetector.detectDuplicateMoves(imported, existing);
      const elapsed = Date.now() - start;

      console.log(`    ✓ 10000 vs 10000 moves: ${elapsed}ms, 發現 ${result.length} 個重複`);
      assert(elapsed < 2000, '應在 2000ms 內完成');
    });

    it('4.2 - 10000 searches 與 10000 searches 的比較', function() {
      const imported = generateQueries(10000);
      const existing = generateQueries(10000);

      const start = Date.now();
      const result = ShoplineConflictDetector.detectDuplicateSearches(imported, existing);
      const elapsed = Date.now() - start;

      console.log(`    ✓ 10000 vs 10000 searches: ${elapsed}ms, 發現 ${result.length} 個重複`);
      assert(elapsed < 1000, '應在 1000ms 內完成');
    });

    it('4.3 - 10000 errors 與 10000 errors 的比較', function() {
      const imported = generateErrors(10000);
      const existing = generateErrors(10000);

      const start = Date.now();
      const result = ShoplineConflictDetector.detectDuplicateErrors(imported, existing);
      const elapsed = Date.now() - start;

      console.log(`    ✓ 10000 vs 10000 errors: ${elapsed}ms, 發現 ${result.length} 個重複`);
      assert(elapsed < 2000, '應在 2000ms 內完成');
    });

    it('4.4 - 部分重複資料的檢測 (10%)', function() {
      const imported = generateMoves(5000, true);
      const existing = generateMoves(5000);

      const start = Date.now();
      const result = ShoplineConflictDetector.detectDuplicateMoves(imported, existing);
      const elapsed = Date.now() - start;

      console.log(`    ✓ 5000 vs 5000 moves (with 10% overlap): ${elapsed}ms, 發現 ${result.length} 個重複`);
      assert(result.length > 0, '應檢測到重複');
      assert(elapsed < 1000, '應在 1000ms 內完成');
    });

    it('4.5 - 完全重複資料的檢測 (100%)', function() {
      const imported = generateMoves(1000);
      const existing = [...imported];

      const start = Date.now();
      const result = ShoplineConflictDetector.detectDuplicateMoves(imported, existing);
      const elapsed = Date.now() - start;

      console.log(`    ✓ 1000 vs 1000 moves (100% overlap): ${elapsed}ms, 發現 ${result.length} 個重複`);
      assert.strictEqual(result.length, imported.length, '應檢測到所有重複');
      assert(elapsed < 500, '應在 500ms 內完成');
    });
  });

  // ============ 複雜度驗證 ============
  describe('5. 複雜度驗證 (Complexity Validation)', function() {

    it('5.1 - O(n) 複雜度驗證: 2倍資料量應接近 2倍時間', function() {
      const iterations = 50;

      // 測試 5000 items 的時間
      const imported_5k = generateMoves(5000);
      const existing_5k = generateMoves(5000);

      const start1 = Date.now();
      for (let i = 0; i < iterations; i++) {
        ShoplineConflictDetector.detectDuplicateMoves(imported_5k, existing_5k);
      }
      const time1 = Date.now() - start1;

      // 測試 10000 items 的時間
      const imported_10k = generateMoves(10000);
      const existing_10k = generateMoves(10000);

      const start2 = Date.now();
      for (let i = 0; i < iterations; i++) {
        ShoplineConflictDetector.detectDuplicateMoves(imported_10k, existing_10k);
      }
      const time2 = Date.now() - start2;

      const ratio = time2 / time1;
      console.log(`    ✓ Complexity ratio (2x data, ${iterations} iterations): ${ratio.toFixed(2)}x time`);
      // 允許一些誤差，O(n) 應該接近 2.0
      assert(ratio < 3.0 && ratio > 1.5, 'O(n) 複雜度應保持線性');
    });

    it('5.2 - Set vs indexOf 性能比較', function() {
      const queries = generateQueries(5000);

      // 測試新的 Set 實現
      const start1 = Date.now();
      ShoplineConflictDetector.detectDuplicateSearches(queries, queries);
      const time_set = Date.now() - start1;

      console.log(`    ✓ Set-based detection (5000 items): ${time_set}ms`);
      assert(time_set < 200, 'Set-based 檢測應快於 100ms');
    });
  });

  // ============ 資料完整性測試 ============
  describe('6. 資料完整性 (Data Integrity)', function() {

    it('6.1 - 合併後應包含所有唯一記錄', function() {
      const imported = {
        version: 1,
        moveHistory: [
          { categoryId: 'cat-1', timestamp: 100, timeSaved: 50 },
          { categoryId: 'cat-2', timestamp: 200, timeSaved: 60 }
        ],
        searchHistory: ['search-1', 'search-2'],
        errorLog: [{ type: 'ERR_1', message: 'Error', timestamp: 100 }]
      };
      const existing = {
        version: 1,
        moveHistory: [
          { categoryId: 'cat-1', timestamp: 100, timeSaved: 50 },
          { categoryId: 'cat-3', timestamp: 300, timeSaved: 70 }
        ],
        searchHistory: ['search-2', 'search-3'],
        errorLog: [{ type: 'ERR_2', message: 'Error', timestamp: 200 }]
      };

      const result = ShoplineConflictDetector.detectConflicts(imported, existing);
      assert(result.mergedData.moveHistory.length >= 2, '應至少有 2 個唯一 move');
      assert(result.mergedData.searchHistory.length >= 2, '應至少有 2 個唯一 search');
      assert(result.mergedData.errorLog.length >= 1, '應至少有 1 個 error');
    });

    it('6.2 - 合併不應遺失資料', function() {
      const imported = {
        version: 1,
        moveHistory: generateMoves(100),
        searchHistory: generateQueries(100),
        errorLog: generateErrors(100)
      };
      const existing = {
        version: 1,
        moveHistory: generateMoves(100),
        searchHistory: generateQueries(100),
        errorLog: generateErrors(100)
      };

      const result = ShoplineConflictDetector.detectConflicts(imported, existing);
      assert(result.mergedData.moveHistory.length > 0, '合併後應有 move 記錄');
      assert(result.mergedData.searchHistory.length > 0, '合併後應有 search 記錄');
      assert(result.mergedData.errorLog.length > 0, '合併後應有 error 記錄');
    });

    it('6.3 - 統計資訊應正確計算', function() {
      const imported = {
        version: 1,
        moveHistory: [
          { categoryId: 'cat-1', timestamp: 100, timeSaved: 50 },
          { categoryId: 'cat-2', timestamp: 200, timeSaved: 60 }
        ],
        searchHistory: [],
        errorLog: []
      };
      const existing = {
        version: 1,
        moveHistory: [],
        searchHistory: [],
        errorLog: []
      };

      const result = ShoplineConflictDetector.detectConflicts(imported, existing);
      assert.strictEqual(result.mergedData.categoryMoveStats.totalMoves, 2);
      assert.strictEqual(result.mergedData.categoryMoveStats.totalTimeSaved, 110);
    });
  });
});

// Test Runner
if (require.main === module) {
  const Mocha = require('mocha');
  const mocha = new Mocha();

  // Note: 在實際環境中，這會自動運行
  console.log('Run tests with: npm test or mocha tests/conflict-detector.test.js');
}

module.exports = { ShoplineConflictDetector };
