/**
 * Build Configuration - Environment Setup for Chrome Extension
 *
 * 此文件展示如何在不同環境中配置構建，用於激活或禁用調試 API。
 *
 * 使用示例：
 * 開發構建：NODE_ENV=development npm run build
 * 生產構建：NODE_ENV=production npm run build:prod
 */

const path = require('path');

/**
 * 取得當前環境
 */
const getEnvironment = () => {
  return process.env.NODE_ENV || 'production';
};

/**
 * 取得環境特定的配置
 */
const getEnvConfig = (env) => {
  const configs = {
    development: {
      NODE_ENV: 'development',
      DEBUG_APIS_ENABLED: true,
      VERBOSE_LOGGING: true,
      EXPOSE_INTERNAL_STATE: true,
      SOURCE_MAPS: true,
      MINIFY: false
    },
    production: {
      NODE_ENV: 'production',
      DEBUG_APIS_ENABLED: false,
      VERBOSE_LOGGING: false,
      EXPOSE_INTERNAL_STATE: false,
      SOURCE_MAPS: false,
      MINIFY: true
    }
  };

  return configs[env] || configs.production;
};

/**
 * 生成 webpack DefinePlugin 配置
 * 用於在編譯時注入環境變數
 */
const getDefinePluginConfig = (env) => {
  const envConfig = getEnvConfig(env);
  return {
    'process.env.NODE_ENV': JSON.stringify(envConfig.NODE_ENV),
    'DEBUG_APIS_ENABLED': JSON.stringify(envConfig.DEBUG_APIS_ENABLED),
    'VERBOSE_LOGGING': JSON.stringify(envConfig.VERBOSE_LOGGING),
    'EXPOSE_INTERNAL_STATE': JSON.stringify(envConfig.EXPOSE_INTERNAL_STATE)
  };
};

/**
 * 生成 Webpack 配置（示例）
 *
 * 實際使用：
 * const webpackConfig = getWebpackConfig('development');
 */
const getWebpackConfig = (env = getEnvironment()) => {
  const envConfig = getEnvConfig(env);

  // 注意：webpack 可能未安裝，此處提供配置結構
  let webpack = null;
  try {
    webpack = require('webpack');
  } catch (e) {
    // webpack 未安裝時，仍返回配置結構
  }

  return {
    mode: env === 'production' ? 'production' : 'development',
    devtool: envConfig.SOURCE_MAPS ? 'source-map' : false,
    optimization: {
      minimize: envConfig.MINIFY,
      usedExports: true, // 啟用 tree-shaking
      sideEffects: false
    },
    plugins: webpack ? [
      // 定義全局常數 - 在編譯時注入環境變數
      new webpack.DefinePlugin(getDefinePluginConfig(env)),

      // 啟用調試消息 tree-shaking
      // 生產構建中，所有 if (DEBUG_APIS_ENABLED) 的代碼被移除
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 1
      })
    ] : [
      // webpack 未安裝時，返回配置結構但不實例化插件
      { type: 'DefinePlugin' },
      { type: 'LimitChunkCountPlugin' }
    ]
  };
};

/**
 * 驗證構建環境
 * 確保調試 API 在生產構建中被正確禁用
 */
const validateBuildEnv = (env) => {
  const envConfig = getEnvConfig(env);

  console.log(`\n[Build Config] Environment: ${env}`);
  console.log(`[Build Config] Debug APIs: ${envConfig.DEBUG_APIS_ENABLED ? 'ENABLED' : 'DISABLED'}`);
  console.log(`[Build Config] Verbose Logging: ${envConfig.VERBOSE_LOGGING}`);
  console.log(`[Build Config] Minify: ${envConfig.MINIFY}\n`);

  if (env === 'production' && envConfig.DEBUG_APIS_ENABLED) {
    throw new Error('ERROR: Debug APIs should be disabled in production builds!');
  }

  return true;
};

/**
 * NPM Script Integration
 *
 * 在 package.json 中使用：
 *
 * {
 *   "scripts": {
 *     "build:dev": "NODE_ENV=development node build.js",
 *     "build:prod": "NODE_ENV=production node build.js",
 *     "build": "npm run build:prod"
 *   }
 * }
 */

// 如果直接運行此檔案
if (require.main === module) {
  const env = getEnvironment();
  validateBuildEnv(env);
  console.log('[Build Config] Configuration ready:', getEnvConfig(env));
}

module.exports = {
  getEnvironment,
  getEnvConfig,
  getDefinePluginConfig,
  getWebpackConfig,
  validateBuildEnv
};
