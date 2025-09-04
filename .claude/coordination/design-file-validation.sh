#!/bin/bash

# Design Agent File Creation Validation Script
# CRITICAL: Ensures design agents create actual files, not just descriptions

echo "=== DESIGN AGENT FILE CREATION VALIDATOR ==="
echo "Checking for actual files created by design agents..."

# Set project root
PROJECT_ROOT="/Users/Aditya/Desktop/casting-ai"

# Initialize counters
TOTAL_FILES=0
MISSING_FILES=0

# Check design system files
echo ""
echo "🎨 DESIGN SYSTEM FILES:"
EXPECTED_DESIGN_FILES=(
    "design-system/tokens/colors.json"
    "design-system/tokens/spacing.json" 
    "design-system/tokens/typography.json"
    "design-system/components/Button.tsx"
    "design-system/components/Card.tsx"
    "design-system/css/utilities.css"
)

for file in "${EXPECTED_DESIGN_FILES[@]}"; do
    TOTAL_FILES=$((TOTAL_FILES + 1))
    if [[ -f "$PROJECT_ROOT/$file" ]]; then
        echo "✅ $file"
    else
        echo "❌ MISSING: $file"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

# Check wireframe files
echo ""
echo "📐 WIREFRAME FILES:"
EXPECTED_WIREFRAME_FILES=(
    "wireframes/talent-search/mobile/search-page.html"
    "wireframes/talent-search/desktop/search-page.html"
    "wireframes/talent-search/flows/search-flow.md"
    "wireframes/profile-creation/mobile/profile-form.html"
)

for file in "${EXPECTED_WIREFRAME_FILES[@]}"; do
    TOTAL_FILES=$((TOTAL_FILES + 1))
    if [[ -f "$PROJECT_ROOT/$file" ]]; then
        echo "✅ $file"
    else
        echo "❌ MISSING: $file"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

# Check interaction files
echo ""
echo "🎭 INTERACTION FILES:"
EXPECTED_INTERACTION_FILES=(
    "frontend/lib/animations/spring-configs.ts"
    "frontend/components/interactive/AnimatedButton.tsx"
    "frontend/lib/animations/gestures.ts"
)

for file in "${EXPECTED_INTERACTION_FILES[@]}"; do
    TOTAL_FILES=$((TOTAL_FILES + 1))
    if [[ -f "$PROJECT_ROOT/$file" ]]; then
        echo "✅ $file"
    else
        echo "❌ MISSING: $file"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

# Check typography files
echo ""
echo "📝 TYPOGRAPHY FILES:"
EXPECTED_TYPOGRAPHY_FILES=(
    "design-system/typography/scale.css"
    "design-system/typography/components.css"
    "design-system/content/microcopy.json"
)

for file in "${EXPECTED_TYPOGRAPHY_FILES[@]}"; do
    TOTAL_FILES=$((TOTAL_FILES + 1))
    if [[ -f "$PROJECT_ROOT/$file" ]]; then
        echo "✅ $file"
    else
        echo "❌ MISSING: $file"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

# Check design vision files
echo ""
echo "🎯 DESIGN VISION FILES:"
EXPECTED_VISION_FILES=(
    "Design_Vision_Q1/principles.md"
    "Design_Vision_Q1/okrs.md"
    "design-reviews/review-$(date +%Y-%m-%d).md"
)

for file in "${EXPECTED_VISION_FILES[@]}"; do
    TOTAL_FILES=$((TOTAL_FILES + 1))
    if [[ -f "$PROJECT_ROOT/$file" ]]; then
        echo "✅ $file"
    else
        echo "❌ MISSING: $file"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

# Calculate success rate
SUCCESS_RATE=$(( (TOTAL_FILES - MISSING_FILES) * 100 / TOTAL_FILES ))

echo ""
echo "=== VALIDATION RESULTS ==="
echo "Total Expected Files: $TOTAL_FILES"
echo "Missing Files: $MISSING_FILES"
echo "Success Rate: $SUCCESS_RATE%"

# Set exit code based on success rate
if [[ $SUCCESS_RATE -ge 80 ]]; then
    echo "🎉 PASS: Design agents creating actual files"
    exit 0
else
    echo "🚨 FAIL: Design agents providing descriptions instead of files"
    echo ""
    echo "CORRECTIVE ACTION REQUIRED:"
    echo "1. Re-run design agents with file creation enforcement"
    echo "2. Verify agents use Write/MultiEdit tools, not descriptions"
    echo "3. Check agent configurations include mandatory file creation"
    exit 1
fi