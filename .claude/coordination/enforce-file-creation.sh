#!/bin/bash

# DESIGN WORKFLOW FILE CREATION ENFORCER
# Prevents design agents from providing descriptions without creating actual files

echo "🚨 CRITICAL WORKFLOW ENFORCEMENT ACTIVE"
echo "======================================"

PROJECT_ROOT="/Users/Aditya/Desktop/casting-ai"

# Pre-flight check: Ensure required directories exist
echo "📁 Creating required directory structure..."

# Design system directories
mkdir -p "$PROJECT_ROOT/design-system/tokens"
mkdir -p "$PROJECT_ROOT/design-system/components"  
mkdir -p "$PROJECT_ROOT/design-system/typography"
mkdir -p "$PROJECT_ROOT/design-system/css"

# Wireframe directories
mkdir -p "$PROJECT_ROOT/wireframes/talent-search/mobile"
mkdir -p "$PROJECT_ROOT/wireframes/talent-search/desktop"
mkdir -p "$PROJECT_ROOT/wireframes/talent-search/flows"

# Interaction directories
mkdir -p "$PROJECT_ROOT/frontend/lib/animations"
mkdir -p "$PROJECT_ROOT/frontend/components/interactive"

# Research directories
mkdir -p "$PROJECT_ROOT/design-research/trends"
mkdir -p "$PROJECT_ROOT/design-research/competitors" 
mkdir -p "$PROJECT_ROOT/design-research/reports"
mkdir -p "$PROJECT_ROOT/design-research/data"

# QA directories
mkdir -p "$PROJECT_ROOT/design-qa/audits"
mkdir -p "$PROJECT_ROOT/design-qa/accessibility"
mkdir -p "$PROJECT_ROOT/design-qa/performance"
mkdir -p "$PROJECT_ROOT/design-qa/reports"
mkdir -p "$PROJECT_ROOT/design-qa/data"

# Vision directories
mkdir -p "$PROJECT_ROOT/Design_Vision_Q1"
mkdir -p "$PROJECT_ROOT/design-reviews"

echo "✅ Directory structure created"

# Create baseline marker file for tracking new files
touch /tmp/design_baseline_$(date +%s)
BASELINE_FILE="/tmp/design_baseline_$(date +%s)"

echo "📋 DESIGN AGENT FILE CREATION RULES:"
echo "1. ✅ REQUIRED: Create actual files using Write/MultiEdit tools"
echo "2. ✅ REQUIRED: Use mkdir commands for directory structure"  
echo "3. ✅ REQUIRED: Generate working code (HTML/CSS/JS/TS/JSON)"
echo "4. ✅ REQUIRED: Validate creation with ls/find commands"
echo "5. ❌ PROHIBITED: Symbolic folder trees without files"
echo "6. ❌ PROHIBITED: Descriptions like 'Created design system'"
echo "7. ❌ PROHIBITED: Hypothetical outputs like 'Would create...'"

echo ""
echo "🔍 FILE CREATION VALIDATION COMMANDS:"
echo "# Check for new design files:"
echo "find $PROJECT_ROOT -newer $BASELINE_FILE -name '*.json' -o -name '*.css' -o -name '*.tsx' -o -name '*.html' -o -name '*.md' | wc -l"

echo ""
echo "🎯 SUCCESS CRITERIA:"
echo "- Each design task must create minimum 2 actual files"
echo "- All files must contain real content (not placeholder text)"
echo "- Directory structure must be validated with ls commands"
echo "- Working code must be importable/executable"

echo ""
echo "⚠️  ESCALATION PROTOCOL:"
echo "If design agents provide descriptions instead of files:"
echo "1. Re-run with explicit file creation requirements"
echo "2. Verify agent configurations include mandatory creation rules"
echo "3. Check agent tool usage (must use Write/MultiEdit, not descriptions)"
echo "4. Report non-compliance for agent configuration updates"

# Function to validate design agent output
validate_design_output() {
    local agent_name="$1"
    local expected_min_files="$2"
    
    echo "🔍 Validating $agent_name output..."
    
    # Count files created after baseline
    local file_count=$(find "$PROJECT_ROOT" -newer "$BASELINE_FILE" \( -name "*.json" -o -name "*.css" -o -name "*.tsx" -o -name "*.html" -o -name "*.md" \) | wc -l)
    
    if [[ $file_count -ge $expected_min_files ]]; then
        echo "✅ $agent_name: Created $file_count files (minimum: $expected_min_files)"
        return 0
    else
        echo "❌ $agent_name: Only created $file_count files (minimum: $expected_min_files)"
        echo "🚨 VIOLATION: Agent provided descriptions instead of actual files"
        return 1
    fi
}

echo ""
echo "📝 AGENT-SPECIFIC MINIMUM FILE REQUIREMENTS:"
echo "- visual-systems-architect: 5+ files (tokens, components, CSS)"
echo "- ux-wireframe-architect: 4+ files (HTML wireframes, flows, annotations)"
echo "- interaction-design-specialist: 3+ files (animation configs, components)"
echo "- typography-designer: 3+ files (CSS scales, components, content)"
echo "- design-research-analyst: 4+ files (reports, data, analyses)"
echo "- design-review-qa: 4+ files (audits, metrics, compliance reports)"
echo "- chief-design-officer: 3+ files (vision docs, reviews, OKRs)"

echo ""
echo "🚀 FILE CREATION ENFORCEMENT READY"
echo "Run design agents and use validate_design_output function to verify compliance"