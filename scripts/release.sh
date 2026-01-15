#!/bin/bash

# GitHub Release 發布腳本
# 使用方式: ./scripts/release.sh 0.2.2 "版本更新說明"

set -e

if [ $# -lt 2 ]; then
    echo "使用方式: $0 <version> <changelog>"
    echo "範例: $0 0.2.2 \"修復時間計算 bug\""
    exit 1
fi

VERSION=$1
CHANGELOG=$2
TAG="v${VERSION}"

echo "================================================"
echo "準備發布版本: ${VERSION}"
echo "================================================"

# 1. 檢查 git 狀態
echo "→ 檢查 git 狀態..."
if [[ -n $(git status -s) ]]; then
    echo "❌ 有未提交的變更，請先提交"
    git status -s
    exit 1
fi

# 2. 確認版本號已更新
echo "→ 檢查版本號..."
CURRENT_VERSION=$(grep -m1 "@version" src/shopline-category-manager.prod.user.js | awk '{print $3}')
if [ "$CURRENT_VERSION" != "$VERSION" ]; then
    echo "❌ prod.user.js 中的版本號 ($CURRENT_VERSION) 與目標版本 ($VERSION) 不符"
    echo "請先更新 @version 標記"
    exit 1
fi

# 3. 更新 updates.json
echo "→ 更新 .releases/updates.json..."
cat > .releases/updates.json <<EOF
{
  "versions": [
    {
      "version": "${VERSION}",
      "updateURL": "https://raw.githubusercontent.com/sarimjang/shopline-category-manager/main/.releases/updates.json",
      "downloadURL": "https://github.com/sarimjang/shopline-category-manager/releases/download/${TAG}/shopline-category-manager.prod.user.js",
      "changelog": "${CHANGELOG}",
      "released": "$(date +%Y-%m-%d)"
    }
  ],
  "lastUpdated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

# 4. 提交 updates.json
echo "→ 提交 updates.json..."
git add .releases/updates.json
git commit -m "chore: update version metadata for v${VERSION}"

# 5. 建立 git tag
echo "→ 建立 git tag ${TAG}..."
git tag -a "${TAG}" -m "Release ${VERSION}: ${CHANGELOG}"

# 6. 推送到 GitHub
echo "→ 推送到 GitHub..."
git push origin main
git push origin "${TAG}"

# 7. 建立 GitHub Release
echo "→ 建立 GitHub Release..."
gh release create "${TAG}" \
    --title "v${VERSION}" \
    --notes "${CHANGELOG}" \
    src/shopline-category-manager.prod.user.js#shopline-category-manager.prod.user.js

echo ""
echo "================================================"
echo "✅ 發布完成！"
echo "================================================"
echo "版本: ${VERSION}"
echo "Release URL: https://github.com/sarimjang/shopline-category-manager/releases/tag/${TAG}"
echo "下載 URL: https://github.com/sarimjang/shopline-category-manager/releases/download/${TAG}/shopline-category-manager.prod.user.js"
echo ""
echo "用戶將在 24 小時內自動收到更新通知"
echo "================================================"
