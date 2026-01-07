/**
 * Shopline Category Manager - 單元測試
 *
 * 測試核心函數的層級計算和子孫搜尋功能
 *
 * 使用方法：
 * 1. 在瀏覽器控制台複製 shopline-category-manager.user.js 的測試函數
 * 2. 或在 Node.js 環境中運行此測試
 */

// ============================================================================
// 測試資料結構
// ============================================================================

/**
 * 創建測試資料：3 層分類結構
 *
 * 結構：
 * - 根目錄 (Level 0)
 *   - 母分類 1 (Level 1)
 *     - 子分類 1-1 (Level 2)
 *       - 孫分類 1-1-1 (Level 3)
 *     - 子分類 1-2 (Level 2)
 *   - 母分類 2 (Level 1)
 *     - 子分類 2-1 (Level 2)
 *   - 母分類 3 (Level 1)
 */
function createTestCategories() {
  const categories = [
    {
      id: 1,
      name: '母分類 1',
      children: [
        {
          id: 1.1,
          name: '子分類 1-1',
          children: [
            {
              id: 1.1.1,
              name: '孫分類 1-1-1',
              children: [],
            },
          ],
        },
        {
          id: 1.2,
          name: '子分類 1-2',
          children: [],
        },
      ],
    },
    {
      id: 2,
      name: '母分類 2',
      children: [
        {
          id: 2.1,
          name: '子分類 2-1',
          children: [],
        },
      ],
    },
    {
      id: 3,
      name: '母分類 3',
      children: [],
    },
  ];

  return categories;
}

// ============================================================================
// 輔助函數（從 userscript 複製）
// ============================================================================

/**
 * 遞迴計算分類的層級
 */
function getCategoryLevel(categories, targetCategory, currentLevel = 1) {
  if (!categories || !Array.isArray(categories)) {
    return -1;
  }

  for (const category of categories) {
    if (category === targetCategory) {
      return currentLevel;
    }

    if (category.children && Array.isArray(category.children)) {
      const level = getCategoryLevel(
        category.children,
        targetCategory,
        currentLevel + 1
      );
      if (level !== -1) {
        return level;
      }
    }
  }

  return -1;
}

/**
 * 取得分類的所有子孫（遞迴）
 */
function getCategoryDescendants(category) {
  const descendants = [category];

  if (category.children && Array.isArray(category.children)) {
    category.children.forEach((child) => {
      descendants.push(...getCategoryDescendants(child));
    });
  }

  return descendants;
}

/**
 * 檢查一個分類是否為另一個分類的子孫
 */
function isDescendant(potentialAncestor, potentialDescendant) {
  const descendants = getCategoryDescendants(potentialAncestor);
  return descendants.some((category) => category === potentialDescendant);
}

// ============================================================================
// 測試套件
// ============================================================================

function runTests() {
  const categories = createTestCategories();
  let passCount = 0;
  let failCount = 0;

  // 便捷存取測試資料
  const level1_1 = categories[0];
  const level2_1_1 = categories[0].children[0];
  const level3_1_1_1 = categories[0].children[0].children[0];
  const level2_1_2 = categories[0].children[1];
  const level1_2 = categories[1];
  const level1_3 = categories[2];

  console.log('========================================');
  console.log('  Shopline Category Manager - 測試開始');
  console.log('========================================\n');

  // ========================================
  // 測試 1: getLevel - 層級計算
  // ========================================
  console.log('TEST SUITE 1: getCategoryLevel()\n');

  function testLevel(name, targetCategory, expectedLevel) {
    const level = getCategoryLevel(categories, targetCategory);
    const pass = level === expectedLevel;

    if (pass) {
      console.log(`✓ ${name}`);
      console.log(`  分類: ${targetCategory.name}, 層級: ${level}`);
      passCount++;
    } else {
      console.log(`✗ ${name}`);
      console.log(`  分類: ${targetCategory.name}`);
      console.log(`  期望層級: ${expectedLevel}, 實際層級: ${level}`);
      failCount++;
    }
    console.log();
  }

  testLevel('Level 1: 根陣列的分類', level1_1, 1);
  testLevel('Level 1: 另一個根分類', level1_2, 1);
  testLevel('Level 2: 第1層分類的子分類', level2_1_1, 2);
  testLevel('Level 2: 另一個第1層的子分類', level2_1_2, 2);
  testLevel('Level 3: 第2層分類的子分類', level3_1_1_1, 3);

  // ========================================
  // 測試 2: getAllDescendants - 子孫搜尋
  // ========================================
  console.log('TEST SUITE 2: getCategoryDescendants()\n');

  function testDescendants(name, sourceCategory, expectedCount) {
    const descendants = getCategoryDescendants(sourceCategory);
    const pass = descendants.length === expectedCount;

    if (pass) {
      console.log(`✓ ${name}`);
      console.log(`  分類: ${sourceCategory.name}`);
      console.log(`  子孫數量: ${descendants.length} (包括自己)`);
      passCount++;
    } else {
      console.log(`✗ ${name}`);
      console.log(`  分類: ${sourceCategory.name}`);
      console.log(`  期望子孫數: ${expectedCount}, 實際: ${descendants.length}`);
      failCount++;
    }
    console.log();
  }

  // 母分類 1 有 2 個子分類，其中第 1 個有 1 個孫分類
  // 總計：母分類 1 + 2 個子分類 + 1 個孫分類 = 4 個
  testDescendants('Level 1 分類的所有子孫', level1_1, 4);

  // 子分類 1-1 有 1 個孫分類
  // 總計：子分類 1-1 + 1 個孫分類 = 2 個
  testDescendants('Level 2 分類的所有子孫', level2_1_1, 2);

  // 子分類 1-2 無子分類
  // 總計：只有自己 = 1 個
  testDescendants('Level 2 分類無子分類', level2_1_2, 1);

  // 孫分類無子分類
  // 總計：只有自己 = 1 個
  testDescendants('Level 3 分類無子分類', level3_1_1_1, 1);

  // 母分類 3 無子分類
  testDescendants('Level 1 分類無子分類', level1_3, 1);

  // ========================================
  // 測試 3: isDescendant - 子孫關係檢查
  // ========================================
  console.log('TEST SUITE 3: isDescendant()\n');

  function testIsDescendant(name, ancestor, target, expected) {
    const result = isDescendant(ancestor, target);
    const pass = result === expected;

    if (pass) {
      console.log(`✓ ${name}`);
      console.log(`  祖先: ${ancestor.name}, 檢查: ${target.name}, 結果: ${result}`);
      passCount++;
    } else {
      console.log(`✗ ${name}`);
      console.log(`  祖先: ${ancestor.name}, 檢查: ${target.name}`);
      console.log(`  期望: ${expected}, 實際: ${result}`);
      failCount++;
    }
    console.log();
  }

  // 自己不是自己的子孫（但會被包含在 descendants 中）
  testIsDescendant('分類本身包含在子孫中', level1_1, level1_1, true);

  // 直接子分類是子孫
  testIsDescendant('直接子分類是子孫', level1_1, level2_1_1, true);

  // 孫分類也是子孫
  testIsDescendant('孫分類是子孫', level1_1, level3_1_1_1, true);

  // 兄弟分類不是子孫
  testIsDescendant('兄弟分類不是子孫', level2_1_1, level2_1_2, false);

  // 完全不同的分類樹不是子孫
  testIsDescendant('不同分類樹的分類不是子孫', level1_1, level1_2, false);

  // ========================================
  // 測試摘要
  // ========================================
  console.log('========================================');
  console.log('  測試摘要');
  console.log('========================================');
  console.log(`✓ 通過: ${passCount}`);
  console.log(`✗ 失敗: ${failCount}`);
  console.log(`總計: ${passCount + failCount}`);

  if (failCount === 0) {
    console.log('\n🎉 所有測試通過！');
  } else {
    console.log(`\n❌ 有 ${failCount} 個測試失敗`);
  }
  console.log('========================================\n');

  return failCount === 0;
}

// 如果在 Node.js 環境中，直接運行測試
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTests, createTestCategories };

  // 如果直接執行此檔案
  if (require.main === module) {
    runTests();
  }
}
