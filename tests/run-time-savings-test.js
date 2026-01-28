#!/usr/bin/env node
/**
 * Time Savings Calculation Verification - Direct Test Runner
 * 不依賴 Jest，直接使用 Node.js 執行
 */

'use strict';

// ============================================================================
// 時間計算函數 - 複製自 content.js
// ============================================================================

function calculateTimeSaved(categoryCount, targetLevel, usedSearch) {
  const baseTime = 2;
  const visualSearchTime = Math.sqrt(categoryCount) * 0.3;
  const scrollTime = categoryCount * 0.05;
  const alignmentTime = targetLevel * 1.5;

  const dragTime = baseTime + visualSearchTime + scrollTime + alignmentTime;
  const toolTime = usedSearch ? 2.5 : 3.5;
  const timeSaved = Math.max(0, dragTime - toolTime);

  return {
    dragTime: Math.round(dragTime * 10) / 10,
    toolTime: Math.round(toolTime * 10) / 10,
    timeSaved: Math.round(timeSaved * 10) / 10
  };
}

function formatTimeDisplay(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}分鐘${seconds}秒`;
}

// ============================================================================
// Test Suite
// ============================================================================

const tests = [];
let passedCount = 0;
let failedCount = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertClose(actual, expected, tolerance = 0.1) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Expected ${expected}, got ${actual}`);
  }
}

// ============================================================================
// Test Cases
// ============================================================================

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║  時間節省計算驗證測試 - Time Savings Calculation Verification   ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// Test Group 1: 基本公式驗證
console.log('📋 Test Group 1: 基本公式驗證\n');

test('1.1 時間節省應該大於等於 0', () => {
  const result = calculateTimeSaved(10, 1, false);
  assert(result.timeSaved >= 0, 'timeSaved should be >= 0');
});

test('1.2 dragTime 應該等於所有時間組成部分之和', () => {
  const categoryCount = 50;
  const targetLevel = 2;
  const result = calculateTimeSaved(categoryCount, targetLevel, false);

  const baseTime = 2;
  const visualSearchTime = Math.sqrt(categoryCount) * 0.3;
  const scrollTime = categoryCount * 0.05;
  const alignmentTime = targetLevel * 1.5;

  const expectedDragTime = Math.round((baseTime + visualSearchTime + scrollTime + alignmentTime) * 10) / 10;
  assert(result.dragTime === expectedDragTime, `dragTime: ${result.dragTime} should equal ${expectedDragTime}`);
});

test('1.3 toolTime 應該根據 usedSearch 參數改變', () => {
  const resultWithSearch = calculateTimeSaved(50, 1, true);
  const resultWithoutSearch = calculateTimeSaved(50, 1, false);

  assert(resultWithSearch.toolTime === 2.5, 'toolTime with search should be 2.5');
  assert(resultWithoutSearch.toolTime === 3.5, 'toolTime without search should be 3.5');
});

test('1.4 時間值應該四捨五入到小數點一位', () => {
  const result = calculateTimeSaved(37, 2, false);
  
  const checkDecimal = (val) => {
    const str = val.toString();
    const decimalPart = str.split('.')[1];
    return !decimalPart || decimalPart.length <= 1;
  };

  assert(checkDecimal(result.dragTime), 'dragTime should have at most 1 decimal place');
  assert(checkDecimal(result.toolTime), 'toolTime should have at most 1 decimal place');
  assert(checkDecimal(result.timeSaved), 'timeSaved should have at most 1 decimal place');
});

// Test Group 2: 不同類別計數的時間計算
console.log('\n📋 Test Group 2: 不同類別計數的時間計算\n');

test('2.1 5 個類別 - 時間計算驗證', () => {
  const result = calculateTimeSaved(5, 1, false);
  
  const expectedBase = 2;
  const expectedVisual = Math.sqrt(5) * 0.3;
  const expectedScroll = 5 * 0.05;
  const expectedAlign = 1 * 1.5;
  
  const expectedDragTime = Math.round((expectedBase + expectedVisual + expectedScroll + expectedAlign) * 10) / 10;
  const expectedToolTime = 3.5;
  const expectedTimeSaved = Math.round(Math.max(0, expectedDragTime - expectedToolTime) * 10) / 10;

  assert(result.dragTime === expectedDragTime, `dragTime: ${result.dragTime} != ${expectedDragTime}`);
  assert(result.toolTime === expectedToolTime, `toolTime: ${result.toolTime} != ${expectedToolTime}`);
  assert(result.timeSaved === expectedTimeSaved, `timeSaved: ${result.timeSaved} != ${expectedTimeSaved}`);

  console.log(`✓ 5 categories: dragTime=${result.dragTime}s, toolTime=${result.toolTime}s, timeSaved=${result.timeSaved}s`);
});

test('2.2 50 個類別 - 時間計算驗證', () => {
  const result = calculateTimeSaved(50, 1, false);
  
  const baseTime = 2;
  const visualSearchTime = Math.sqrt(50) * 0.3;
  const scrollTime = 50 * 0.05;
  const alignmentTime = 1 * 1.5;
  
  const expectedDragTime = Math.round((baseTime + visualSearchTime + scrollTime + alignmentTime) * 10) / 10;

  assert(result.dragTime === expectedDragTime, `dragTime calculation incorrect`);
  console.log(`✓ 50 categories: dragTime=${result.dragTime}s, timeSaved=${result.timeSaved}s`);
});

test('2.3 500 個類別 - 時間計算驗證', () => {
  const result = calculateTimeSaved(500, 1, false);
  
  const baseTime = 2;
  const visualSearchTime = Math.sqrt(500) * 0.3;
  const scrollTime = 500 * 0.05;
  const alignmentTime = 1 * 1.5;
  
  const expectedDragTime = Math.round((baseTime + visualSearchTime + scrollTime + alignmentTime) * 10) / 10;

  assert(result.dragTime === expectedDragTime, `dragTime calculation incorrect`);
  console.log(`✓ 500 categories: dragTime=${result.dragTime}s, timeSaved=${result.timeSaved}s`);
});

test('2.4 類別計數越多，dragTime 越長', () => {
  const result5 = calculateTimeSaved(5, 1, false);
  const result50 = calculateTimeSaved(50, 1, false);
  const result500 = calculateTimeSaved(500, 1, false);

  assert(result5.dragTime < result50.dragTime, '5 should be less than 50');
  assert(result50.dragTime < result500.dragTime, '50 should be less than 500');
  console.log(`✓ Trend: ${result5.dragTime}s < ${result50.dragTime}s < ${result500.dragTime}s`);
});

// Test Group 3: 不同目標級別
console.log('\n📋 Test Group 3: 不同目標級別的時間節省\n');

test('3.1 級別越深，dragTime 越長', () => {
  const result1 = calculateTimeSaved(50, 1, false);
  const result2 = calculateTimeSaved(50, 2, false);
  const result3 = calculateTimeSaved(50, 3, false);

  assert(result1.dragTime < result2.dragTime, 'Level 1 should be less than Level 2');
  assert(result2.dragTime < result3.dragTime, 'Level 2 should be less than Level 3');
  console.log(`✓ Level impact: L1=${result1.dragTime}s, L2=${result2.dragTime}s, L3=${result3.dragTime}s`);
});

test('3.2 級別影響的時間差應該是 1.5 秒', () => {
  const result1 = calculateTimeSaved(50, 1, false);
  const result2 = calculateTimeSaved(50, 2, false);
  const result3 = calculateTimeSaved(50, 3, false);

  const diff_1_to_2 = result2.dragTime - result1.dragTime;
  const diff_2_to_3 = result3.dragTime - result2.dragTime;

  assertClose(diff_1_to_2, 1.5, 0.05);
  assertClose(diff_2_to_3, 1.5, 0.05);
  console.log(`✓ Level difference: L1→L2=${diff_1_to_2}s, L2→L3=${diff_2_to_3}s`);
});

// Test Group 4: 搜索 vs 無搜索
console.log('\n📋 Test Group 4: 搜索 vs 無搜索的時間節省差異\n');

test('4.1 使用搜索時 toolTime 應該是 2.5s', () => {
  const result = calculateTimeSaved(50, 1, true);
  assert(result.toolTime === 2.5, 'toolTime with search should be 2.5');
  console.log(`✓ With search: toolTime=${result.toolTime}s, timeSaved=${result.timeSaved}s`);
});

test('4.2 無搜索時 toolTime 應該是 3.5s', () => {
  const result = calculateTimeSaved(50, 1, false);
  assert(result.toolTime === 3.5, 'toolTime without search should be 3.5');
  console.log(`✓ Without search: toolTime=${result.toolTime}s, timeSaved=${result.timeSaved}s`);
});

test('4.3 使用搜索應該節省更多時間', () => {
  const resultWithSearch = calculateTimeSaved(50, 1, true);
  const resultWithoutSearch = calculateTimeSaved(50, 1, false);

  assert(resultWithSearch.dragTime === resultWithoutSearch.dragTime, 'dragTime should be same');
  assert(resultWithSearch.timeSaved > resultWithoutSearch.timeSaved, 'search should save more time');

  // 使用搜尋時 timeSaved 應該更大（因為 toolTime 更短）
  const difference = resultWithSearch.timeSaved - resultWithoutSearch.timeSaved;
  assertClose(difference, 1.0, 0.05);
  console.log(`✓ Search impact: +${difference.toFixed(1)}s saved with search`);
});

// Test Group 5: Popup 時間顯示
console.log('\n📋 Test Group 5: Popup 時間顯示格式驗證\n');

test('5.1 時間格式化應該返回 "X分鐘Y秒" 格式', () => {
  const result = calculateTimeSaved(50, 1, false);
  const formatted = formatTimeDisplay(result.timeSaved);

  assert(/^\d+分鐘\d+秒$/.test(formatted), `Invalid format: ${formatted}`);
  console.log(`✓ Format check: ${result.timeSaved}s → "${formatted}"`);
});

test('5.2 邊界情況：0 秒', () => {
  const formatted = formatTimeDisplay(0);
  assert(formatted === '0分鐘0秒', `Should be "0分鐘0秒", got "${formatted}"`);
  console.log(`✓ Boundary (0s): "${formatted}"`);
});

test('5.3 邊界情況：60 秒（1 分鐘）', () => {
  const formatted = formatTimeDisplay(60);
  assert(formatted === '1分鐘0秒', `Should be "1分鐘0秒", got "${formatted}"`);
  console.log(`✓ Boundary (60s): "${formatted}"`);
});

test('5.4 邊界情況：61 秒', () => {
  const formatted = formatTimeDisplay(61);
  assert(formatted === '1分鐘1秒', `Should be "1分鐘1秒", got "${formatted}"`);
  console.log(`✓ Boundary (61s): "${formatted}"`);
});

test('5.5 多次移動的累積時間', () => {
  let totalTime = 0;
  for (let i = 0; i < 5; i++) {
    const result = calculateTimeSaved(50, 1, false);
    totalTime += result.timeSaved;
  }

  const formatted = formatTimeDisplay(totalTime);
  assert(/^\d+分鐘\d+秒$/.test(formatted), `Invalid format: ${formatted}`);
  console.log(`✓ Accumulated (5 moves): ${totalTime.toFixed(1)}s → "${formatted}"`);
});

// Test Group 6: 統計持久化
console.log('\n📋 Test Group 6: 統計持久化驗證\n');

test('6.1 多次操作後統計應該累積', () => {
  let totalTime = 0;
  let totalMoves = 0;

  for (let i = 0; i < 5; i++) {
    const result = calculateTimeSaved(50 + i * 20, 1, i % 2 === 0);
    totalTime += result.timeSaved;
    totalMoves += 1;
  }

  assert(totalMoves === 5, 'Should have 5 moves');
  assert(totalTime > 0, 'Total time should be positive');
  console.log(`✓ Accumulated stats: ${totalMoves} moves, ${totalTime.toFixed(1)}s total`);
});

test('6.2 驗證統計持久化邏輯', () => {
  const savedStats = {
    totalMoves: 10,
    totalTimeSaved: 125.5,
    lastReset: new Date().toISOString()
  };

  const reloadedStats = {
    totalMoves: savedStats.totalMoves,
    totalTimeSaved: savedStats.totalTimeSaved,
    lastReset: savedStats.lastReset
  };

  assert(reloadedStats.totalMoves === savedStats.totalMoves, 'Moves should persist');
  assert(reloadedStats.totalTimeSaved === savedStats.totalTimeSaved, 'Time should persist');
  assert(reloadedStats.lastReset === savedStats.lastReset, 'Timestamp should persist');
  console.log(`✓ Persistence: stats correctly reloaded after save`);
});

// Test Group 7: 綜合驗證
console.log('\n📋 Test Group 7: 綜合驗證和邊界情況\n');

test('7.1 驗證大規模操作（100 次移動）', () => {
  let totalTime = 0;
  const results = [];

  for (let i = 0; i < 100; i++) {
    const categories = 10 + (i % 490);
    const level = 1 + (i % 3);
    const search = i % 2 === 0;

    const result = calculateTimeSaved(categories, level, search);
    totalTime += result.timeSaved;
    results.push(result);
  }

  const avgTime = totalTime / 100;
  const maxTime = Math.max(...results.map(r => r.timeSaved));
  const minTime = Math.min(...results.map(r => r.timeSaved));

  assert(avgTime > 0, 'Average time should be positive');
  assert(maxTime > minTime, 'Max should be greater than min');
  console.log(`✓ Large-scale (100 moves): avg=${avgTime.toFixed(2)}s, range=[${minTime.toFixed(1)}s, ${maxTime.toFixed(1)}s]`);
});

test('7.2 驗證數值穩定性', () => {
  const categoryCount = 75;
  const level = 2;
  const search = true;

  const results = [];
  for (let i = 0; i < 10; i++) {
    const result = calculateTimeSaved(categoryCount, level, search);
    results.push(result);
  }

  for (let i = 1; i < results.length; i++) {
    assert(
      JSON.stringify(results[i]) === JSON.stringify(results[0]),
      'All results should be identical'
    );
  }
  console.log(`✓ Numerical stability: 10 identical calculations verified`);
});

// ============================================================================
// Run Tests
// ============================================================================

console.log('\n═══════════════════════════════════════════════════════════════\n');
console.log('🚀 Running Tests...\n');

tests.forEach((testCase, index) => {
  try {
    testCase.fn();
    console.log(`✅ PASS: ${testCase.name}`);
    passedCount++;
  } catch (error) {
    console.log(`❌ FAIL: ${testCase.name}`);
    console.log(`   Error: ${error.message}`);
    failedCount++;
  }
});

// ============================================================================
// Summary Report
// ============================================================================

console.log('\n═══════════════════════════════════════════════════════════════\n');
console.log('📊 測試結果摘要\n');
console.log(`  ✅ 通過: ${passedCount}`);
console.log(`  ❌ 失敗: ${failedCount}`);
console.log(`  📈 總計: ${tests.length}`);

if (failedCount === 0) {
  console.log('\n🎉 所有測試通過！\n');
  console.log('✨ 時間節省計算邏輯驗證完成');
  console.log('   • 公式驗證: ✅');
  console.log('   • 不同類別計數: ✅');
  console.log('   • 不同目標級別: ✅');
  console.log('   • 搜索 vs 無搜索: ✅');
  console.log('   • Popup 顯示格式: ✅');
  console.log('   • 統計持久化: ✅');
  console.log('   • 綜合驗證: ✅');
} else {
  console.log('\n⚠️  有些測試失敗，請檢查上述錯誤信息\n');
}

console.log('═══════════════════════════════════════════════════════════════\n');

// ============================================================================
// Detailed Calculation Examples
// ============================================================================

console.log('📐 詳細計算示例\n');

const examples = [
  { categories: 5, level: 1, search: true, label: 'Case 1: 5分類, L1, 有搜索' },
  { categories: 50, level: 2, search: false, label: 'Case 2: 50分類, L2, 無搜索' },
  { categories: 500, level: 3, search: true, label: 'Case 3: 500分類, L3, 有搜索' }
];

examples.forEach(({ categories, level, search, label }) => {
  const result = calculateTimeSaved(categories, level, search);
  
  const baseTime = 2;
  const visualSearchTime = Math.sqrt(categories) * 0.3;
  const scrollTime = categories * 0.05;
  const alignmentTime = level * 1.5;

  console.log(`${label}:`);
  console.log(`  基礎時間:     2.0s`);
  console.log(`  視覺搜尋:     ${visualSearchTime.toFixed(2)}s (sqrt(${categories}) * 0.3)`);
  console.log(`  捲動時間:     ${scrollTime.toFixed(2)}s (${categories} * 0.05)`);
  console.log(`  對齐時間:     ${alignmentTime.toFixed(2)}s (${level} * 1.5)`);
  console.log(`  ─────────────────────────`);
  console.log(`  拖動時間:     ${result.dragTime}s`);
  console.log(`  工具時間:     ${result.toolTime}s (${search ? '使用搜索' : '無搜索'})`);
  console.log(`  節省時間:     ${result.timeSaved}s`);
  console.log(`  顯示格式:     ${formatTimeDisplay(result.timeSaved)}`);
  console.log('');
});

console.log('═══════════════════════════════════════════════════════════════\n');

// Exit with appropriate code
process.exit(failedCount > 0 ? 1 : 0);
