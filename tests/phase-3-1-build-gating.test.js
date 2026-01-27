/**
 * Phase 3.1 Build-Time Gating Tests
 *
 * 測試構建時環境變數機制確保調試 API 在生產構建中被正確移除
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const buildConfig = require('../build-config.js');

// 簡化版運行驗證（不需要 mocha）
function runTests() {
  console.log('\n[Test] Phase 3.1 Build-Time Gating Tests');
  console.log('=========================================\n');

  let passed = 0;
  let failed = 0;

  const tests = [
    {
      name: 'Development config has DEBUG_APIS_ENABLED = true',
      fn: () => {
        const config = buildConfig.getEnvConfig('development');
        assert.strictEqual(config.DEBUG_APIS_ENABLED, true);
      }
    },
    {
      name: 'Production config has DEBUG_APIS_ENABLED = false',
      fn: () => {
        const config = buildConfig.getEnvConfig('production');
        assert.strictEqual(config.DEBUG_APIS_ENABLED, false);
      }
    },
    {
      name: 'env-config.js file exists',
      fn: () => {
        const envConfigPath = path.join(__dirname, '../src/shared/env-config.js');
        assert(fs.existsSync(envConfigPath), 'env-config.js should exist');
      }
    },
    {
      name: 'injected.js contains DEBUG_APIS_ENABLED check',
      fn: () => {
        const injectedPath = path.join(__dirname, '../src/content/injected.js');
        const content = fs.readFileSync(injectedPath, 'utf8');
        assert(content.includes('DEBUG_APIS_ENABLED'), 'should contain DEBUG_APIS_ENABLED');
        assert(content.includes('if (DEBUG_APIS_ENABLED)'), 'should have conditional check');
      }
    },
    {
      name: 'injected.js no longer exposes debugCategoryManager (Phase 3.2)',
      fn: () => {
        const injectedPath = path.join(__dirname, '../src/content/injected.js');
        const content = fs.readFileSync(injectedPath, 'utf8');
        // Phase 3.2: 移除了全局暴露，現在應該沒有 window.debugCategoryManager = ...
        const hasDebugExposure = /^\s*window\.debugCategoryManager\s*=/.test(content);
        assert(!hasDebugExposure, 'should NOT expose debugCategoryManager (Phase 3.2 removed it)');
      }
    },
    {
      name: 'injected.js has Phase 3.1 documentation',
      fn: () => {
        const injectedPath = path.join(__dirname, '../src/content/injected.js');
        const content = fs.readFileSync(injectedPath, 'utf8');
        assert(content.includes('Phase 3.1'), 'should document Phase 3.1');
      }
    },
    {
      name: 'build-config.js exists',
      fn: () => {
        const buildConfigPath = path.join(__dirname, '../build-config.js');
        assert(fs.existsSync(buildConfigPath), 'build-config.js should exist');
      }
    },
    {
      name: 'package.json has build:dev script',
      fn: () => {
        const packageJsonPath = path.join(__dirname, '../package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        assert(packageJson.scripts['build:dev'], 'should have build:dev script');
      }
    },
    {
      name: 'package.json has build:prod script',
      fn: () => {
        const packageJsonPath = path.join(__dirname, '../package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        assert(packageJson.scripts['build:prod'], 'should have build:prod script');
      }
    },
    {
      name: 'Development webpack config has source-maps',
      fn: () => {
        const config = buildConfig.getWebpackConfig('development');
        assert.strictEqual(config.mode, 'development');
        assert.strictEqual(config.devtool, 'source-map');
      }
    },
    {
      name: 'Production webpack config has minification',
      fn: () => {
        const config = buildConfig.getWebpackConfig('production');
        assert.strictEqual(config.mode, 'production');
        assert.strictEqual(config.optimization.minimize, true);
      }
    },
    {
      name: 'Tree-shaking configuration is correct',
      fn: () => {
        const config = buildConfig.getWebpackConfig('production');
        assert.strictEqual(config.optimization.usedExports, true);
        assert.strictEqual(config.optimization.sideEffects, false);
      }
    },
    {
      name: 'DefinePlugin config for production',
      fn: () => {
        const defineConfig = buildConfig.getDefinePluginConfig('production');
        assert.strictEqual(defineConfig['DEBUG_APIS_ENABLED'], 'false');
      }
    },
    {
      name: 'DefinePlugin config for development',
      fn: () => {
        const defineConfig = buildConfig.getDefinePluginConfig('development');
        assert.strictEqual(defineConfig['DEBUG_APIS_ENABLED'], 'true');
      }
    },
    {
      name: 'Build validation passes for production',
      fn: () => {
        assert.doesNotThrow(() => {
          buildConfig.validateBuildEnv('production');
        });
      }
    },
    {
      name: 'Build validation passes for development',
      fn: () => {
        assert.doesNotThrow(() => {
          buildConfig.validateBuildEnv('development');
        });
      }
    },
    {
      name: 'Phase 3.1 documentation exists',
      fn: () => {
        const docsPath = path.join(__dirname, '../docs/PHASE_3_1_BUILD_TIME_GATING.md');
        assert(fs.existsSync(docsPath), 'Phase 3.1 documentation should exist');
      }
    },
    {
      name: 'Phase 3.1 docs mentions tree-shaking',
      fn: () => {
        const docsPath = path.join(__dirname, '../docs/PHASE_3_1_BUILD_TIME_GATING.md');
        const content = fs.readFileSync(docsPath, 'utf8');
        assert(content.includes('tree-shaking') || content.includes('Tree-Shaking'),
          'should mention tree-shaking');
      }
    }
  ];

  tests.forEach(test => {
    try {
      test.fn();
      console.log(`✓ ${test.name}`);
      passed++;
    } catch (error) {
      console.log(`✗ ${test.name}`);
      console.log(`  Error: ${error.message}`);
      failed++;
    }
  });

  console.log(`\n結果: ${passed} 通過, ${failed} 失敗\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

// 執行測試
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests
};
