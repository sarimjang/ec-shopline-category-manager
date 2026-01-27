#!/bin/bash

echo "═══════════════════════════════════════════════════════════"
echo "Chrome Extension MV3 Structure Verification"
echo "═══════════════════════════════════════════════════════════"
echo ""

ERRORS=0

# Check manifest.json
echo "✓ Checking manifest.json..."
if [ -f "src/manifest.json" ]; then
  if node -e "require('./src/manifest.json')" 2>/dev/null; then
    echo "  └─ Valid JSON format ✓"
  else
    echo "  └─ Invalid JSON format ✗"
    ERRORS=$((ERRORS+1))
  fi
else
  echo "  └─ File not found ✗"
  ERRORS=$((ERRORS+1))
fi

# Check required files
FILES=(
  "src/background/service-worker.js"
  "src/content/init.js"
  "src/content/injected.js"
  "src/content/content.js"
  "src/shared/storage.js"
  "src/shared/logger.js"
  "src/shared/constants.js"
  "src/popup/popup.html"
  "src/popup/popup.js"
  "src/popup/popup.css"
  "src/assets/icon-16.png"
  "src/assets/icon-48.png"
  "src/assets/icon-128.png"
)

echo ""
echo "✓ Checking required files..."
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    size=$(wc -c < "$file")
    printf "  %-40s %6d bytes ✓\n" "$(basename "$file")" "$size"
  else
    echo "  └─ $file NOT FOUND ✗"
    ERRORS=$((ERRORS+1))
  fi
done

echo ""
echo "✓ Checking manifest references..."

# Verify manifest references are correct
echo "  Checking content scripts..."
if grep -q '"js".*"content/init.js"' src/manifest.json; then
  echo "    └─ init.js reference ✓"
else
  echo "    └─ init.js reference ✗"
  ERRORS=$((ERRORS+1))
fi

if grep -q '"default_popup".*"popup/popup.html"' src/manifest.json; then
  echo "    └─ popup.html reference ✓"
else
  echo "    └─ popup.html reference ✗"
  ERRORS=$((ERRORS+1))
fi

if grep -q '"service_worker".*"background/service-worker.js"' src/manifest.json; then
  echo "    └─ service-worker.js reference ✓"
else
  echo "    └─ service-worker.js reference ✗"
  ERRORS=$((ERRORS+1))
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
  echo "✓ ALL CHECKS PASSED"
else
  echo "✗ $ERRORS ERROR(S) FOUND"
fi
echo "═══════════════════════════════════════════════════════════"

exit $ERRORS
