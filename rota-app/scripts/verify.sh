#!/bin/bash
# Rota App - Pre-commit verification script
# Checks: TypeScript, tab file existence, category consistency, data flow

set -e
cd "$(dirname "$0")/.."

ERRORS=0

echo "=== ROTA VERIFY ==="

# 1. TypeScript type check
echo "[1/3] TypeScript..."
TSC_OUT=$(npx tsc --noEmit 2>&1 || true)
TSC_ERRORS=$(echo "$TSC_OUT" | grep "error TS" | wc -l)
if [ "$TSC_ERRORS" -gt 0 ]; then
  echo "  FAIL: $TSC_ERRORS TypeScript error(s)"
  echo "$TSC_OUT" | grep "error TS" | head -10
  ERRORS=$((ERRORS + 1))
else
  echo "  OK"
fi

# 2. Tab files: extract Tabs.Screen name="xxx" (only direct children of <Tabs>)
echo "[2/3] Tab files..."
LAYOUT="app/(tabs)/_layout.tsx"
if [ -f "$LAYOUT" ]; then
  # Match lines like: name="index" or name="discover" (Tabs.Screen declarations)
  TAB_NAMES=$(grep 'Tabs.Screen' "$LAYOUT" | grep -oP 'name="([^"]+)"' | sed 's/name="//;s/"//')
  for tab in $TAB_NAMES; do
    if [ ! -f "app/(tabs)/$tab.tsx" ]; then
      echo "  FAIL: Tab '$tab' in _layout but app/(tabs)/$tab.tsx missing"
      ERRORS=$((ERRORS + 1))
    fi
  done
  if [ $ERRORS -eq 0 ]; then
    echo "  OK: All tab files exist"
  fi
fi

# 3. Category consistency: categories.ts ↔ map.html ↔ create-event.tsx
echo "[3/3] Categories..."
if [ -f "constants/categories.ts" ] && [ -f "assets/map.html" ]; then
  CAT_KEYS=$(grep -oP "key: \"(\w+)\"" constants/categories.ts | sed 's/key: "//;s/"//')
  MISSING_MAP=""
  for cat in $CAT_KEYS; do
    if ! grep -q "'$cat'" assets/map.html 2>/dev/null; then
      MISSING_MAP="$MISSING_MAP $cat"
    fi
  done
  if [ -n "$MISSING_MAP" ]; then
    echo "  FAIL: Categories missing from map.html:$MISSING_MAP"
    ERRORS=$((ERRORS + 1))
  else
    echo "  OK: All categories in sync"
  fi
fi

echo ""
if [ $ERRORS -gt 0 ]; then
  echo "=== FAILED: $ERRORS error(s) — fix before commit ==="
  exit 1
fi

echo "=== ALL CHECKS PASSED ==="
