/**
 * Conflict Detector - Detects conflicts between imported and existing data
 * 檢測匯入資料和現有資料之間的衝突
 */

'use strict';

const ShoplineConflictDetector = (function() {
  const logger = window.ShoplineLogger || console;

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

if (typeof window !== 'undefined') {
  window.ShoplineConflictDetector = ShoplineConflictDetector;
}
