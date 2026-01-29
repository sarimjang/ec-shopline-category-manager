#!/bin/bash

# Deployment Readiness Verification Script
# Phase 1.9 Pre-deployment checks

echo "🔍 Extension Deployment Readiness Check"
echo "════════════════════════════════════════════════════════"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

checks_passed=0
checks_failed=0

# Check function
check() {
  local name=$1
  local command=$2

  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} $name"
    ((checks_passed++))
  else
    echo -e "${RED}✗${NC} $name"
    ((checks_failed++))
  fi
}

echo ""
echo "📋 Build Configuration Checks"
echo "─────────────────────────────────────────────────────────"

check "Manifest exists" "test -f src/manifest.json"
check "Manifest is valid JSON" "cat src/manifest.json | node -e 'const fs=require(\"fs\"); const d=JSON.parse(require(\"fs\").readFileSync(0)); process.exit(0)'"
check "Manifest MV3" "grep -q '\"manifest_version\": 3' src/manifest.json"
check "Extension name defined" "grep -q '\"name\"' src/manifest.json"
check "Extension version defined" "grep -q '\"version\"' src/manifest.json"

echo ""
echo "🔐 Security Modules Checks"
echo "─────────────────────────────────────────────────────────"

check "Nonce manager exists" "test -f src/shared/security/nonce-manager.js"
check "Message validator exists" "test -f src/shared/security/message-validator.js"
check "Message signer exists" "test -f src/shared/security/message-signer.js"
check "Cross-world validator exists" "test -f src/shared/security/cross-world-validator.js"
check "Security logger exists" "test -f src/shared/security/security-logger.js"

echo ""
echo "📦 Web Accessible Resources Checks"
echo "─────────────────────────────────────────────────────────"

check "Nonce manager in WAR" "grep -q '\"shared/security/nonce-manager.js\"' src/manifest.json"
check "Message validator in WAR" "grep -q '\"shared/security/message-validator.js\"' src/manifest.json"
check "Message signer in WAR" "grep -q '\"shared/security/message-signer.js\"' src/manifest.json"
check "Cross-world validator in WAR" "grep -q '\"shared/security/cross-world-validator.js\"' src/manifest.json"
check "Security logger in WAR" "grep -q '\"shared/security/security-logger.js\"' src/manifest.json"

echo ""
echo "🎯 Content Scripts Checks"
echo "─────────────────────────────────────────────────────────"

check "Init script exists" "test -f src/content/init.js"
check "Injected script exists" "test -f src/content/injected.js"
check "Content script exists" "test -f src/content/content.js"
check "Init script has nonce logic" "grep -q 'generateNonce\|_scm_nonce' src/content/init.js"
check "Init script validates nonce" "grep -q 'validateNonce' src/content/init.js"

echo ""
echo "🧪 Test Suite Checks"
echo "─────────────────────────────────────────────────────────"

check "Handshake tests exist" "test -f tests/integration/cross-world-handshake.test.js"
check "Tampering detection tests exist" "test -f tests/integration/tampering-detection.test.js"
check "Attack scenario tests exist" "test -f tests/integration/attack-scenarios.test.js"
check "Performance tests exist" "test -f tests/integration/performance-benchmark.test.js"
check "Memory tests exist" "test -f tests/integration/memory-leak-detection.test.js"

echo ""
echo "📄 Documentation Checks"
echo "─────────────────────────────────────────────────────────"

check "Message schema documented" "test -f docs/MESSAGE_SCHEMA.md"
check "Verification guide exists" "test -f docs/PHASE_1.9_VERIFICATION.md"
check "OpenSpec specifications exist" "test -f openspec/changes/harden-api-isolation/specs/cross-world-communication/spec.md"

echo ""
echo "🏗️  Project Structure Checks"
echo "─────────────────────────────────────────────────────────"

check "src directory exists" "test -d src"
check "src/content exists" "test -d src/content"
check "src/shared exists" "test -d src/shared"
check "src/shared/security exists" "test -d src/shared/security"
check "tests directory exists" "test -d tests"
check "docs directory exists" "test -d docs"

echo ""
echo "════════════════════════════════════════════════════════"
echo ""
echo "📊 Summary"
echo "────────────────────────────────────────────────────────"
echo -e "Checks passed: ${GREEN}$checks_passed${NC}"
echo -e "Checks failed: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✅ Extension is READY for deployment${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Run automated tests: npm test"
  echo "2. Load in Chrome: chrome://extensions (Dev mode)"
  echo "3. Test on Shopline.com"
  echo "4. Follow PHASE_1.9_VERIFICATION.md checklist"
  exit 0
else
  echo ""
  echo -e "${RED}❌ Extension has $checks_failed issue(s) to fix${NC}"
  exit 1
fi
