#!/usr/bin/env node

/**
 * 自動更新 .releases/updates.json 版本檢查端點
 * 從 CHANGELOG.md 提取最新版本信息
 * 維護歷史版本列表（最多 10 個）
 */

const fs = require('fs');
const path = require('path');

const UPDATES_FILE = path.join(__dirname, '../.releases/updates.json');
const CHANGELOG_FILE = path.join(__dirname, '../CHANGELOG.md');
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'sarimjang';
const REPO_NAME = 'shopline-category-manager';

function extractVersionsFromChangelog() {
  if (!fs.existsSync(CHANGELOG_FILE)) {
    console.warn('⚠️  CHANGELOG.md 不存在，跳過提取');
    return [];
  }

  const changelogContent = fs.readFileSync(CHANGELOG_FILE, 'utf-8');
  const versions = [];

  const versionPattern = /## \[(\d+\.\d+\.\d+)\]\s*-\s*(\d{4}-\d{2}-\d{2})/g;
  let match;

  while ((match = versionPattern.exec(changelogContent)) !== null) {
    const version = match[1];
    const date = match[2];

    const nextVersionIndex = changelogContent.indexOf(
      '## [',
      match.index + 10
    );
    const endIndex = nextVersionIndex !== -1 ? nextVersionIndex : changelogContent.length;
    const versionContent = changelogContent.substring(match.index, endIndex);

    const changelog = versionContent
      .split('\n')
      .slice(1)
      .filter(line => line.trim() && !line.match(/^##/))
      .map(line => line.replace(/^\s*[-*]\s*/, '').trim())
      .filter(line => line.length > 0)
      .join('\n');

    versions.push({
      version,
      date,
      changelog: changelog.substring(0, 500),
    });
  }

  return versions;
}

function createVersionEntry(version, changelogData) {
  return {
    version,
    updateURL: `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/main/.releases/updates.json`,
    downloadURL: `https://github.com/${GITHUB_USERNAME}/${REPO_NAME}/releases/download/v${version}/shopline-category-manager.prod.user.js`,
    minDownloadURL: `https://github.com/${GITHUB_USERNAME}/${REPO_NAME}/releases/download/v${version}/shopline-category-manager.min.user.js`,
    changelog: changelogData.changelog || `Release v${version}`,
    released: changelogData.date || new Date().toISOString().split('T')[0],
    minVersion: version,
  };
}

function updateReleases() {
  try {
    const versions = extractVersionsFromChangelog();

    if (versions.length === 0) {
      console.log('⚠️  沒有找到版本信息');
      return;
    }

    let updatesData = {
      versions: [],
      lastUpdated: new Date().toISOString(),
    };

    if (fs.existsSync(UPDATES_FILE)) {
      updatesData = JSON.parse(fs.readFileSync(UPDATES_FILE, 'utf-8'));
    }

    for (const versionData of versions) {
      const existingIndex = updatesData.versions.findIndex(
        v => v.version === versionData.version
      );

      const entry = createVersionEntry(versionData.version, versionData);

      if (existingIndex !== -1) {
        updatesData.versions[existingIndex] = entry;
      } else {
        updatesData.versions.unshift(entry);
      }
    }

    updatesData.versions = updatesData.versions.slice(0, 10);
    updatesData.lastUpdated = new Date().toISOString();

    fs.writeFileSync(UPDATES_FILE, JSON.stringify(updatesData, null, 2), 'utf-8');

    console.log('✅ 已更新版本檢查端點！');
    console.log(`   版本數量: ${updatesData.versions.length}`);
    console.log(`   最新版本: ${updatesData.versions[0]?.version}`);
    console.log(`   檔案: ${UPDATES_FILE}`);
  } catch (error) {
    console.error('❌ 更新失敗:', error.message);
    process.exit(1);
  }
}

updateReleases();
