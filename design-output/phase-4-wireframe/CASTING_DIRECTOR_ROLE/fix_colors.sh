#!/bin/bash

# Script to fix all color violations in Casting Director wireframes

echo "Fixing color violations in Casting Director wireframes..."

FILES=(
    "PROJECT_MANAGEMENT_WIREFRAMES.html"
    "SHORTLIST_MANAGEMENT_WIREFRAMES.html"
    "AUDITION_SCHEDULING_WIREFRAMES.html"
    "CASTING_LANDING_WIREFRAMES.html"
    "ONBOARDING_CASTING_WIREFRAMES.html"
)

for file in "${FILES[@]}"; do
    echo "Processing $file..."
    
    # Replace hex colors
    sed -i '' 's/#000000/var(--gray-1000)/g' "$file"
    sed -i '' 's/#000/var(--gray-1000)/g' "$file"
    sed -i '' 's/#171717/var(--gray-900)/g' "$file"
    sed -i '' 's/#262626/var(--gray-800)/g' "$file"
    sed -i '' 's/#333333/var(--gray-700)/g' "$file"
    sed -i '' 's/#333/var(--gray-700)/g' "$file"
    sed -i '' 's/#404040/var(--gray-700)/g' "$file"
    sed -i '' 's/#525252/var(--gray-600)/g' "$file"
    sed -i '' 's/#666666/var(--gray-600)/g' "$file"
    sed -i '' 's/#666/var(--gray-600)/g' "$file"
    sed -i '' 's/#737373/var(--gray-500)/g' "$file"
    sed -i '' 's/#999999/var(--gray-500)/g' "$file"
    sed -i '' 's/#999/var(--gray-500)/g' "$file"
    sed -i '' 's/#a3a3a3/var(--gray-400)/g' "$file"
    sed -i '' 's/#aaa/var(--gray-400)/g' "$file"
    sed -i '' 's/#d4d4d4/var(--gray-300)/g' "$file"
    sed -i '' 's/#ddd/var(--gray-300)/g' "$file"
    sed -i '' 's/#e0e0e0/var(--gray-200)/g' "$file"
    sed -i '' 's/#e5e5e5/var(--gray-200)/g' "$file"
    sed -i '' 's/#eee/var(--gray-200)/g' "$file"
    sed -i '' 's/#f0f0f0/var(--gray-100)/g' "$file"
    sed -i '' 's/#f5f5f5/var(--gray-100)/g' "$file"
    sed -i '' 's/#f9f9f9/var(--gray-50)/g' "$file"
    sed -i '' 's/#fafafa/var(--gray-50)/g' "$file"
    sed -i '' 's/#ffffff/var(--gray-0)/g' "$file"
    sed -i '' 's/#fff/var(--gray-0)/g' "$file"
    sed -i '' 's/white/var(--gray-0)/g' "$file"
    
    # Remove colored backgrounds (reds, blues, greens, oranges)
    sed -i '' 's/#f44336/var(--gray-800)/g' "$file"
    sed -i '' 's/#e91e63/var(--gray-700)/g' "$file"
    sed -i '' 's/#9c27b0/var(--gray-700)/g' "$file"
    sed -i '' 's/#673ab7/var(--gray-700)/g' "$file"
    sed -i '' 's/#3f51b5/var(--gray-700)/g' "$file"
    sed -i '' 's/#2196f3/var(--gray-600)/g' "$file"
    sed -i '' 's/#03a9f4/var(--gray-600)/g' "$file"
    sed -i '' 's/#00bcd4/var(--gray-600)/g' "$file"
    sed -i '' 's/#009688/var(--gray-600)/g' "$file"
    sed -i '' 's/#4caf50/var(--gray-600)/g' "$file"
    sed -i '' 's/#8bc34a/var(--gray-500)/g' "$file"
    sed -i '' 's/#cddc39/var(--gray-400)/g' "$file"
    sed -i '' 's/#ffeb3b/var(--gray-300)/g' "$file"
    sed -i '' 's/#ffc107/var(--gray-400)/g' "$file"
    sed -i '' 's/#ff9800/var(--gray-500)/g' "$file"
    sed -i '' 's/#ff5722/var(--gray-600)/g' "$file"
    sed -i '' 's/#795548/var(--gray-700)/g' "$file"
    sed -i '' 's/#607d8b/var(--gray-600)/g' "$file"
    
    # Replace color tints
    sed -i '' 's/#ffebee/var(--gray-100)/g' "$file"
    sed -i '' 's/#fce4ec/var(--gray-100)/g' "$file"
    sed -i '' 's/#e8f5e9/var(--gray-50)/g' "$file"
    sed -i '' 's/#c8e6c9/var(--gray-100)/g' "$file"
    sed -i '' 's/#e3f2fd/var(--gray-50)/g' "$file"
    sed -i '' 's/#bbdefb/var(--gray-100)/g' "$file"
    sed -i '' 's/#fff3e0/var(--gray-50)/g' "$file"
    sed -i '' 's/#ffe0b2/var(--gray-100)/g' "$file"
    sed -i '' 's/#ffccbc/var(--gray-100)/g' "$file"
    
    # Remove gradients - replace with solid colors
    sed -i '' 's/linear-gradient([^)]*)/var(--gray-100)/g' "$file"
    sed -i '' 's/radial-gradient([^)]*)/var(--gray-100)/g' "$file"
    
    # Replace RGB/RGBA with CSS variables
    sed -i '' 's/rgba(0[, ]*0[, ]*0[, ]*[0-9.]*)/var(--gray-1000)/g' "$file"
    sed -i '' 's/rgb(0[, ]*0[, ]*0)/var(--gray-1000)/g' "$file"
    sed -i '' 's/rgba(255[, ]*255[, ]*255[, ]*[0-9.]*)/var(--gray-0)/g' "$file"
    sed -i '' 's/rgb(255[, ]*255[, ]*255)/var(--gray-0)/g' "$file"
    
    # Fix box-shadow with RGBA
    sed -i '' 's/box-shadow: 0[^;]*rgba([^)]*)[^;]*/box-shadow: var(--shadow-md)/g' "$file"
    
    # Replace hardcoded sizes with CSS variables
    sed -i '' 's/padding: 4px/padding: var(--spacing-xs)/g' "$file"
    sed -i '' 's/padding: 8px/padding: var(--spacing-sm)/g' "$file"
    sed -i '' 's/padding: 12px/padding: var(--spacing-sm)/g' "$file"
    sed -i '' 's/padding: 16px/padding: var(--spacing-md)/g' "$file"
    sed -i '' 's/padding: 24px/padding: var(--spacing-lg)/g' "$file"
    sed -i '' 's/padding: 32px/padding: var(--spacing-xl)/g' "$file"
    
    sed -i '' 's/margin: 4px/margin: var(--spacing-xs)/g' "$file"
    sed -i '' 's/margin: 8px/margin: var(--spacing-sm)/g' "$file"
    sed -i '' 's/margin: 12px/margin: var(--spacing-sm)/g' "$file"
    sed -i '' 's/margin: 16px/margin: var(--spacing-md)/g' "$file"
    sed -i '' 's/margin: 24px/margin: var(--spacing-lg)/g' "$file"
    
    sed -i '' 's/border-radius: 4px/border-radius: var(--radius-sm)/g' "$file"
    sed -i '' 's/border-radius: 8px/border-radius: var(--radius-md)/g' "$file"
    sed -i '' 's/border-radius: 12px/border-radius: var(--radius-lg)/g' "$file"
    sed -i '' 's/border-radius: 16px/border-radius: var(--radius-xl)/g' "$file"
    
    sed -i '' 's/font-size: 12px/font-size: var(--font-size-xs)/g' "$file"
    sed -i '' 's/font-size: 14px/font-size: var(--font-size-sm)/g' "$file"
    sed -i '' 's/font-size: 16px/font-size: var(--font-size-base)/g' "$file"
    sed -i '' 's/font-size: 18px/font-size: var(--font-size-lg)/g' "$file"
    sed -i '' 's/font-size: 20px/font-size: var(--font-size-xl)/g' "$file"
    sed -i '' 's/font-size: 24px/font-size: var(--font-size-2xl)/g' "$file"
    
    echo "✓ Processed $file"
done

echo "All files processed. Running validation..."

# Validation
for file in "${FILES[@]}"; do
    hex_count=$(grep -c "#[0-9a-fA-F]\{3,6\}" "$file" 2>/dev/null || echo 0)
    rgb_count=$(grep -c "rgb\|rgba" "$file" 2>/dev/null || echo 0)
    gradient_count=$(grep -c "gradient" "$file" 2>/dev/null || echo 0)
    
    total=$((hex_count + rgb_count + gradient_count))
    
    if [ $total -eq 0 ]; then
        echo "✓ $file: COMPLIANT (0 violations)"
    else
        echo "✗ $file: ${total} violations remaining"
    fi
done

echo "Color fix complete!"