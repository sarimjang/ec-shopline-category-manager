#!/usr/bin/env node

/**
 * 測試時間計算算法（新算法 vs 舊算法）
 */

// 舊算法
function calculateTimeSavedOld(categoryCount, targetLevel, usedSearch) {
  const baseTime = 4;
  const scrollTimePerCategory = 0.5;
  const levelAdjustment = 1;

  const dragTime = baseTime +
                   (categoryCount / 10) * scrollTimePerCategory +
                   targetLevel * levelAdjustment;

  const toolTime = usedSearch ? 2.5 : 3.5;
  const timeSaved = Math.max(0, dragTime - toolTime);

  return {
    dragTime: Math.round(dragTime * 10) / 10,
    toolTime: Math.round(toolTime * 10) / 10,
    timeSaved: Math.round(timeSaved * 10) / 10
  };
}

// 新算法（非線性成長模型）
function calculateTimeSavedNew(categoryCount, targetLevel, usedSearch) {
  // 時間組成部分
  const baseTime = 2;                                    // 基礎操作時間
  const visualSearchTime = Math.sqrt(categoryCount) * 0.3; // 視覺搜尋時間（非線性）
  const scrollTime = categoryCount * 0.05;               // 捲動時間（線性）
  const alignmentTime = targetLevel * 1.5;               // 對齊時間（層級影響）

  const dragTime = baseTime + visualSearchTime + scrollTime + alignmentTime;

  const toolTime = usedSearch ? 2.5 : 3.5;
  const timeSaved = Math.max(0, dragTime - toolTime);

  return {
    dragTime: Math.round(dragTime * 10) / 10,
    toolTime: Math.round(toolTime * 10) / 10,
    timeSaved: Math.round(timeSaved * 10) / 10
  };
}

// 測試案例
const testCases = [
  { categoryCount: 10, targetLevel: 1, usedSearch: false, desc: '極小店家' },
  { categoryCount: 20, targetLevel: 2, usedSearch: false, desc: '小型店家' },
  { categoryCount: 50, targetLevel: 2, usedSearch: false, desc: '中型店家' },
  { categoryCount: 100, targetLevel: 2, usedSearch: false, desc: '大型店家' },
  { categoryCount: 200, targetLevel: 3, usedSearch: false, desc: '超大店家' },
  { categoryCount: 500, targetLevel: 3, usedSearch: false, desc: '極端案例' }
];

console.log('====================================================================');
console.log('時間計算算法對比測試');
console.log('====================================================================\n');

console.log('新算法測試結果：');
console.log('─────────────────────────────────────────────────────────────────');
console.log('分類數 | 層級 | 拖動時間 | 工具時間 | 節省時間 | 說明');
console.log('─────────────────────────────────────────────────────────────────');

testCases.forEach(tc => {
  const result = calculateTimeSavedNew(tc.categoryCount, tc.targetLevel, tc.usedSearch);
  console.log(
    `${tc.categoryCount.toString().padStart(4)} | ` +
    `${tc.targetLevel.toString().padStart(2)} | ` +
    `${result.dragTime.toString().padStart(6)}s | ` +
    `${result.toolTime.toString().padStart(6)}s | ` +
    `${result.timeSaved.toString().padStart(6)}s | ` +
    `${tc.desc}`
  );
});

console.log('\n');
console.log('對比分析（新算法 vs 舊算法）：');
console.log('─────────────────────────────────────────────────────────────────────────────');
console.log('分類數 | 層級 | 舊算法 | 新算法 | 差異 | 差異% | 說明');
console.log('─────────────────────────────────────────────────────────────────────────────');

testCases.forEach(tc => {
  const oldResult = calculateTimeSavedOld(tc.categoryCount, tc.targetLevel, tc.usedSearch);
  const newResult = calculateTimeSavedNew(tc.categoryCount, tc.targetLevel, tc.usedSearch);

  const diff = newResult.dragTime - oldResult.dragTime;
  const diffPercent = Math.round((diff / oldResult.dragTime) * 100);

  console.log(
    `${tc.categoryCount.toString().padStart(4)} | ` +
    `${tc.targetLevel.toString().padStart(2)} | ` +
    `${oldResult.dragTime.toString().padStart(4)}s | ` +
    `${newResult.dragTime.toString().padStart(4)}s | ` +
    `${(diff >= 0 ? '+' : '') + diff.toFixed(1)}s | ` +
    `${(diffPercent >= 0 ? '+' : '') + diffPercent.toString().padStart(3)}% | ` +
    `${tc.desc}`
  );
});

console.log('\n');
console.log('驗證結果：');
console.log('─────────────────────────────────────────────────────────────────');

// 驗證 1: 單調遞增（同層級下，分類數越多，時間越長）
let monotonic = true;
for (let i = 1; i < testCases.length; i++) {
  const prev = calculateTimeSavedNew(testCases[i-1].categoryCount, testCases[i-1].targetLevel, false);
  const curr = calculateTimeSavedNew(testCases[i].categoryCount, testCases[i].targetLevel, false);
  if (curr.dragTime < prev.dragTime) {
    monotonic = false;
    break;
  }
}
console.log(`✅ 單調遞增: ${monotonic ? 'PASS' : 'FAIL'}`);

// 驗證 2: 無負數或 NaN
let noNegative = true;
let noNaN = true;
testCases.forEach(tc => {
  const result = calculateTimeSavedNew(tc.categoryCount, tc.targetLevel, tc.usedSearch);
  if (result.dragTime < 0 || result.toolTime < 0 || result.timeSaved < 0) {
    noNegative = false;
  }
  if (isNaN(result.dragTime) || isNaN(result.toolTime) || isNaN(result.timeSaved)) {
    noNaN = false;
  }
});
console.log(`✅ 無負數: ${noNegative ? 'PASS' : 'FAIL'}`);
console.log(`✅ 無 NaN: ${noNaN ? 'PASS' : 'FAIL'}`);

// 驗證 3: 小型店家影響小（< 1 秒）
const smallStore = testCases[1]; // 20 分類
const oldSmall = calculateTimeSavedOld(smallStore.categoryCount, smallStore.targetLevel, false);
const newSmall = calculateTimeSavedNew(smallStore.categoryCount, smallStore.targetLevel, false);
const smallDiff = Math.abs(newSmall.dragTime - oldSmall.dragTime);
console.log(`✅ 小型店家影響 < 1 秒: ${smallDiff < 1 ? 'PASS' : 'FAIL'} (${smallDiff.toFixed(1)}s)`);

// 驗證 4: 大型店家影響顯著（> 2 秒）
const largeStore = testCases[3]; // 100 分類
const oldLarge = calculateTimeSavedOld(largeStore.categoryCount, largeStore.targetLevel, false);
const newLarge = calculateTimeSavedNew(largeStore.categoryCount, largeStore.targetLevel, false);
const largeDiff = newLarge.dragTime - oldLarge.dragTime;
console.log(`✅ 大型店家影響 > 2 秒: ${largeDiff > 2 ? 'PASS' : 'FAIL'} (${largeDiff.toFixed(1)}s)`);

// 驗證 5: 差異隨分類數增加而增大
let increasingDiff = true;
for (let i = 1; i < testCases.length; i++) {
  const prevOld = calculateTimeSavedOld(testCases[i-1].categoryCount, testCases[i-1].targetLevel, false);
  const prevNew = calculateTimeSavedNew(testCases[i-1].categoryCount, testCases[i-1].targetLevel, false);
  const currOld = calculateTimeSavedOld(testCases[i].categoryCount, testCases[i].targetLevel, false);
  const currNew = calculateTimeSavedNew(testCases[i].categoryCount, testCases[i].targetLevel, false);

  const prevDiff = Math.abs(prevNew.dragTime - prevOld.dragTime);
  const currDiff = Math.abs(currNew.dragTime - currOld.dragTime);

  // 允許小幅波動（由於層級變化）
  if (currDiff < prevDiff - 0.5) {
    increasingDiff = false;
    break;
  }
}
console.log(`✅ 差異隨分類數增加: ${increasingDiff ? 'PASS' : 'FAIL'}`);

console.log('\n');
console.log('====================================================================');
console.log(`總結: ${monotonic && noNegative && noNaN && smallDiff < 1 && largeDiff > 2 && increasingDiff ? '✅ 所有驗證通過' : '❌ 有驗證失敗'}`);
console.log('====================================================================');
