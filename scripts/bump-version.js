#!/usr/bin/env node

/**
 * 自動更新版本號
 * 支持 patch, minor, major 三種版本遞增方式
 * 更新所有 UserScript 檔案和 package.json 中的版本號
 */

const fs = require('fs');
const path = require('path');

const FILES_TO_UPDATE = [
  path.join(__dirname, '../package.json'),
  path.join(__dirname, '../src/shopline-category-manager.user.js'),
  path.join(__dirname, '../src/shopline-category-manager.prod.user.js'),
];

const DEFAULT_BUMP_TYPE = 'patch';

function parseVersion(versionString) {
  const match = versionString.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    throw new Error(`無效的版本格式: ${versionString}`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

function bumpVersion(version, bumpType = 'patch') {
  const v = parseVersion(version);

  switch (bumpType.toLowerCase()) {
    case 'major':
      v.major += 1;
      v.minor = 0;
      v.patch = 0;
      break;
    case 'minor':
      v.minor += 1;
      v.patch = 0;
      break;
    case 'patch':
    default:
      v.patch += 1;
      break;
  }

  return `${v.major}.${v.minor}.${v.patch}`;
}

function getCurrentVersion() {
  const packageJson = JSON.parse(fs.readFileSync(FILES_TO_UPDATE[0], 'utf-8'));
  return packageJson.version;
}

function updateVersionInFile(filePath, oldVersion, newVersion) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // 針對 package.json 的特殊處理
  if (filePath.includes('package.json')) {
    const updated = content.replace(
      `"version": "${oldVersion}"`,
      `"version": "${newVersion}"`
    );
    fs.writeFileSync(filePath, updated, 'utf-8');
    return;
  }

  // 對 UserScript 檔案的處理
  const updated = content.replace(
    new RegExp(`// @version\\s+${oldVersion.replace(/\./g, '\\.')}`, 'g'),
    `// @version      ${newVersion}`
  );

  fs.writeFileSync(filePath, updated, 'utf-8');
}

async function bumpVersionNumber() {
  try {
    const bumpType = process.argv[2] || DEFAULT_BUMP_TYPE;
    const oldVersion = getCurrentVersion();
    const newVersion = bumpVersion(oldVersion, bumpType);

    console.log(`🚀 版本遞增: ${oldVersion} → ${newVersion} (${bumpType})`);

    // 更新所有檔案
    for (const filePath of FILES_TO_UPDATE) {
      if (fs.existsSync(filePath)) {
        updateVersionInFile(filePath, oldVersion, newVersion);
        console.log(`   ✓ 已更新: ${path.relative('.', filePath)}`);
      }
    }

    console.log('✅ 版本遞增完成！');
  } catch (error) {
    console.error('❌ 版本遞增失敗:', error.message);
    process.exit(1);
  }
}

bumpVersionNumber();
