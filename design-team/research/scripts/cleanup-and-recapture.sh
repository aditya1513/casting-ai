#!/bin/bash

# Screenshot Cleanup and Re-capture Script
# Purpose: Remove low-quality/misattributed screenshots and prepare for fresh capture
# Version: 1.0

echo "================================================"
echo "Screenshot Cleanup & Re-capture Preparation"
echo "================================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base directory
SCREENSHOT_DIR="./screenshots"
BACKUP_DIR="./screenshots/_backup_$(date +%Y%m%d_%H%M%S)"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Step 1: Create backup of existing screenshots
echo "Step 1: Creating backup of existing screenshots..."
if [ -d "$SCREENSHOT_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    cp -r "$SCREENSHOT_DIR"/* "$BACKUP_DIR" 2>/dev/null || true
    print_status "Backup created at: $BACKUP_DIR"
else
    print_warning "No existing screenshots directory found"
fi

# Step 2: Identify problematic screenshots
echo ""
echo "Step 2: Identifying problematic screenshots..."

# Create directories for organization
mkdir -p "$SCREENSHOT_DIR/_rejected/loading_states"
mkdir -p "$SCREENSHOT_DIR/_rejected/wrong_attribution"
mkdir -p "$SCREENSHOT_DIR/_rejected/low_quality"

# Function to check if image shows loading state (simplified check based on file size)
check_loading_state() {
    local file="$1"
    local filesize=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
    
    # If file is suspiciously small (< 50KB), might be loading state
    if [ "$filesize" -lt 51200 ]; then
        return 0  # Likely loading state
    fi
    return 1  # Probably okay
}

# Step 3: Move problematic files
echo ""
echo "Step 3: Moving problematic files to _rejected folder..."

# Counter variables
total_files=0
rejected_files=0
kept_files=0

# Process each profile directory
for profile_dir in "$SCREENSHOT_DIR"/*/; do
    if [[ ! "$profile_dir" == *"_"* ]]; then  # Skip special folders starting with _
        profile_name=$(basename "$profile_dir")
        echo ""
        echo "Processing profile: $profile_name"
        
        # Check each screenshot
        for screenshot in "$profile_dir"*.png; do
            if [ -f "$screenshot" ]; then
                ((total_files++))
                filename=$(basename "$screenshot")
                
                # Check for common issues
                issue_found=false
                
                # Check 1: File size (potential loading state)
                if check_loading_state "$screenshot"; then
                    print_warning "Small file size detected: $filename"
                    mv "$screenshot" "$SCREENSHOT_DIR/_rejected/loading_states/"
                    ((rejected_files++))
                    issue_found=true
                fi
                
                # Check 2: Filename pattern (should contain profile name)
                if [ "$issue_found" = false ]; then
                    if [[ ! "$filename" == *"$profile_name"* ]]; then
                        print_warning "Filename doesn't match profile: $filename"
                        mv "$screenshot" "$SCREENSHOT_DIR/_rejected/wrong_attribution/"
                        ((rejected_files++))
                        issue_found=true
                    fi
                fi
                
                if [ "$issue_found" = false ]; then
                    ((kept_files++))
                fi
            fi
        done
    fi
done

# Step 4: Clean up empty directories
echo ""
echo "Step 4: Cleaning up empty directories..."
find "$SCREENSHOT_DIR" -type d -empty -delete 2>/dev/null || true
print_status "Empty directories removed"

# Step 5: Prepare for fresh capture
echo ""
echo "Step 5: Preparing for fresh capture..."

# Create fresh directory structure
mkdir -p "$SCREENSHOT_DIR/glebich/$(date +%Y-%m-%d)"
mkdir -p "$SCREENSHOT_DIR/uxerflow/$(date +%Y-%m-%d)"
mkdir -p "$SCREENSHOT_DIR/_metadata"
mkdir -p "$SCREENSHOT_DIR/_rejected"

print_status "Fresh directory structure created"

# Step 6: Install/Update dependencies
echo ""
echo "Step 6: Checking dependencies..."

# Check if Node.js is installed
if command -v node &> /dev/null; then
    print_status "Node.js installed: $(node --version)"
else
    print_error "Node.js not installed. Please install Node.js first."
    exit 1
fi

# Check if Playwright is installed
if [ -f "package.json" ]; then
    if grep -q "playwright" package.json; then
        print_status "Playwright found in package.json"
    else
        print_warning "Installing Playwright..."
        npm install playwright @playwright/test
    fi
else
    print_warning "No package.json found. Initializing npm and installing Playwright..."
    npm init -y
    npm install playwright @playwright/test
fi

# Install Chromium browser
echo ""
echo "Installing/Updating Chromium browser..."
npx playwright install chromium
print_status "Chromium browser ready"

# Step 7: Generate summary report
echo ""
echo "Step 7: Generating cleanup report..."

REPORT_FILE="$SCREENSHOT_DIR/_metadata/cleanup_report_$(date +%Y%m%d_%H%M%S).txt"

cat > "$REPORT_FILE" << EOF
Screenshot Cleanup Report
Generated: $(date)
================================================

Summary:
- Total files processed: $total_files
- Files rejected: $rejected_files
- Files kept: $kept_files
- Rejection rate: $(echo "scale=1; $rejected_files * 100 / $total_files" | bc 2>/dev/null || echo "N/A")%

Backup Location: $BACKUP_DIR

Rejected Files Location:
- Loading states: $SCREENSHOT_DIR/_rejected/loading_states/
- Wrong attribution: $SCREENSHOT_DIR/_rejected/wrong_attribution/
- Low quality: $SCREENSHOT_DIR/_rejected/low_quality/

Next Steps:
1. Review rejected files to confirm they should be discarded
2. Run improved capture script: node capture-dribbble-improved.js all
3. Validate new captures using the validation checklist

================================================
EOF

print_status "Cleanup report saved to: $REPORT_FILE"

# Step 8: Display summary
echo ""
echo "================================================"
echo "CLEANUP COMPLETE"
echo "================================================"
echo "Total files processed: $total_files"
echo "Files rejected: $rejected_files"
echo "Files kept: $kept_files"
echo ""
echo "Ready for fresh capture!"
echo ""
echo "To start capturing with improved script:"
echo -e "${GREEN}node design-research/scripts/capture-dribbble-improved.js all${NC}"
echo ""
echo "To capture specific profile:"
echo -e "${GREEN}node design-research/scripts/capture-dribbble-improved.js glebich${NC}"
echo -e "${GREEN}node design-research/scripts/capture-dribbble-improved.js uxerflow${NC}"
echo ""
echo "================================================"

# Make script executable
chmod +x "$0"

exit 0