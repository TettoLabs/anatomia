#!/bin/bash
set -e

echo "E2E Test: ana init flow"
echo ""

# Get CLI path
CLI_PATH="$(cd "$(dirname "$0")/../../dist" && pwd)/index.js"

# Create temp project
TMP=$(mktemp -d)
echo "Test directory: $TMP"
cd "$TMP"

# Create minimal package.json
echo '{"name":"test-project","version":"1.0.0"}' > package.json

# Run ana init
echo "Running: ana init --skip-analysis"
node "$CLI_PATH" init --skip-analysis

# Count files
COUNT=$(find .ana -type f | wc -l | tr -d ' ')
echo "Files created: $COUNT"

# Test 1: File count
if [ "$COUNT" -eq "34" ]; then
  echo "✓ PASS: 34 files created (expected 34)"
else
  echo "✗ FAIL: $COUNT files created (expected 34)"
  exit 1
fi

# Test 2: ENTRY.md NOT created
if [ ! -f .ana/ENTRY.md ]; then
  echo "✓ PASS: ENTRY.md not created (correct - setup complete creates it)"
else
  echo "✗ FAIL: ENTRY.md exists (should not be created by init)"
  exit 1
fi

# Test 3: .meta.json has setupStatus: pending
if grep -q '"setupStatus": "pending"' .ana/.meta.json; then
  echo "✓ PASS: .meta.json has setupStatus: pending"
else
  echo "✗ FAIL: .meta.json missing setupStatus: pending"
  exit 1
fi

# Test 4: snapshot.json exists
if [ -f .ana/.state/snapshot.json ]; then
  echo "✓ PASS: snapshot.json exists"
else
  echo "✗ FAIL: snapshot.json missing"
  exit 1
fi

# Test 5: All 7 mode files exist
for mode in architect code debug docs test general setup; do
  if [ -f ".ana/modes/$mode.md" ]; then
    echo "✓ Mode: $mode.md exists"
  else
    echo "✗ FAIL: modes/$mode.md missing"
    exit 1
  fi
done

# Test 6: --force preserves .state/
echo ""
echo "Test: --force preserves .state/"
echo '{"test":"data"}' > .ana/.state/test.json
node "$CLI_PATH" init --force --skip-analysis

if [ -f .ana/.state/test.json ] && grep -q '"test":"data"' .ana/.state/test.json; then
  echo "✓ PASS: --force preserved .state/test.json"
else
  echo "✗ FAIL: --force did not preserve .state/"
  exit 1
fi

# Cleanup
cd /
rm -rf "$TMP"

echo ""
echo "═══════════════════════════════"
echo "All E2E tests PASSED"
echo "═══════════════════════════════"
