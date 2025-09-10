# CastMatch Grid System v1 - Implementation Guide

## Quick Start

### 1. Include the Grid System CSS
```html
<link rel="stylesheet" href="Grid_System_v1/Implementation.css">
```

### 2. Basic Grid Structure
```html
<div class="grid-container">
  <div class="col-4">Column 1</div>
  <div class="col-4">Column 2</div>
  <div class="col-4">Column 3</div>
</div>
```

## Grid Patterns

### Hero Section (Full Width)
```html
<section class="grid-container">
  <div class="col-6">
    <h1>Hero Title</h1>
    <p>Hero description text</p>
    <button>Call to Action</button>
  </div>
  <div class="col-6">
    <img src="hero-image.jpg" alt="Hero">
  </div>
</section>
```

### Dashboard Layout
```html
<div class="grid-container">
  <!-- Sidebar -->
  <aside class="col-3">
    <!-- Navigation -->
  </aside>
  
  <!-- Main Content -->
  <main class="col-9">
    <!-- Metrics Row -->
    <div class="grid-container">
      <div class="col-3">Metric 1</div>
      <div class="col-3">Metric 2</div>
      <div class="col-3">Metric 3</div>
      <div class="col-3">Metric 4</div>
    </div>
  </main>
</div>
```

### Card Grid Pattern
```html
<div class="grid-container">
  <!-- 3 cards per row on desktop -->
  <article class="col-4 col-lg-6 col-md-6 col-xs-12">
    <!-- Talent Card 1 -->
  </article>
  <article class="col-4 col-lg-6 col-md-6 col-xs-12">
    <!-- Talent Card 2 -->
  </article>
  <article class="col-4 col-lg-6 col-md-6 col-xs-12">
    <!-- Talent Card 3 -->
  </article>
</div>
```

### Form Layout
```html
<form class="grid-container">
  <!-- Full width input -->
  <div class="col-12">
    <label>Full Name</label>
    <input type="text">
  </div>
  
  <!-- Two columns -->
  <div class="col-6">
    <label>Email</label>
    <input type="email">
  </div>
  <div class="col-6">
    <label>Phone</label>
    <input type="tel">
  </div>
  
  <!-- Three columns -->
  <div class="col-4">
    <label>City</label>
    <input type="text">
  </div>
  <div class="col-4">
    <label>State</label>
    <select>...</select>
  </div>
  <div class="col-4">
    <label>Zip</label>
    <input type="text">
  </div>
</form>
```

## Component-Specific Implementations

### Navigation Header
```html
<header class="grid-container">
  <div class="col-2">
    <!-- Logo -->
  </div>
  <nav class="col-8">
    <!-- Navigation Links -->
  </nav>
  <div class="col-2">
    <!-- User Actions -->
  </div>
</header>
```

### Footer
```html
<footer class="grid-container">
  <div class="col-3">
    <!-- Company Info -->
  </div>
  <div class="col-2">
    <!-- Product Links -->
  </div>
  <div class="col-2">
    <!-- Resources -->
  </div>
  <div class="col-2">
    <!-- Support -->
  </div>
  <div class="col-3">
    <!-- Newsletter -->
  </div>
</footer>
```

### Search Results
```html
<div class="grid-container">
  <!-- Filters Sidebar -->
  <aside class="col-3 col-lg-4 col-md-12">
    <!-- Filter Controls -->
  </aside>
  
  <!-- Results Grid -->
  <main class="col-9 col-lg-8 col-md-12">
    <div class="grid-container">
      <!-- Result Cards -->
    </div>
  </main>
</div>
```

## Responsive Patterns

### Desktop First Approach
```html
<!-- Default: 4 columns, Tablet: 2 columns, Mobile: 1 column -->
<div class="grid-container">
  <div class="col-3 col-lg-6 col-md-12">Item 1</div>
  <div class="col-3 col-lg-6 col-md-12">Item 2</div>
  <div class="col-3 col-lg-6 col-md-12">Item 3</div>
  <div class="col-3 col-lg-6 col-md-12">Item 4</div>
</div>
```

### Mobile First Approach
```html
<!-- Mobile: Full width, grows to columns on larger screens -->
<div class="grid-container">
  <div class="col-xs-12 col-md-6 col-lg-4 col-3">Item</div>
</div>
```

## Advanced Techniques

### Subgrid Usage
```html
<div class="grid-container">
  <div class="col-6 subgrid">
    <!-- Inherits parent grid -->
    <div class="col-3">Sub-item 1</div>
    <div class="col-3">Sub-item 2</div>
  </div>
</div>
```

### Offset Columns
```html
<div class="grid-container">
  <div class="col-8 col-start-3">
    <!-- Centered content with offset -->
  </div>
</div>
```

### Variable Gaps
```html
<!-- Tight spacing -->
<div class="grid-container gap-sm">
  <!-- Components with 12px gaps -->
</div>

<!-- Standard spacing -->
<div class="grid-container gap-lg">
  <!-- Components with 24px gaps -->
</div>

<!-- Wide spacing -->
<div class="grid-container gap-2xl">
  <!-- Components with 48px gaps -->
</div>
```

## Migration Guide

### From Current Implementation
```html
<!-- OLD: Inconsistent gaps -->
<div style="display: grid; gap: 15px;">

<!-- NEW: Standardized gaps -->
<div class="grid-container gap-md">
```

```html
<!-- OLD: Arbitrary columns -->
<div style="grid-template-columns: repeat(5, 1fr);">

<!-- NEW: 12-column system -->
<div class="grid-container">
  <div class="col-2">...</div> <!-- ~20% width -->
  <div class="col-2">...</div>
  <div class="col-3">...</div> <!-- ~25% width -->
  <div class="col-3">...</div>
  <div class="col-2">...</div>
</div>
```

```html
<!-- OLD: Fixed padding -->
<div style="padding: 20px;">

<!-- NEW: Responsive padding -->
<div style="padding: var(--space-lg);">
```

## Performance Best Practices

### 1. Use CSS Grid Native Features
```css
/* Good: Native grid */
.grid-container {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
}

/* Avoid: Flexbox for grids */
.flex-grid {
  display: flex;
  flex-wrap: wrap;
}
```

### 2. Minimize DOM Depth
```html
<!-- Good: Flat structure -->
<div class="grid-container">
  <div class="col-4">Content</div>
</div>

<!-- Avoid: Nested wrappers -->
<div class="wrapper">
  <div class="container">
    <div class="grid">
      <div class="column">
        <div class="content">Content</div>
      </div>
    </div>
  </div>
</div>
```

### 3. Use Logical Properties
```css
/* Good: Logical properties */
.component {
  padding-inline: var(--space-lg);
  margin-block: var(--space-xl);
}

/* Traditional (still supported) */
.component {
  padding-left: var(--space-lg);
  padding-right: var(--space-lg);
}
```

## Debugging

### Enable Grid Overlay
```html
<!-- Add grid-debug class to visualize grid -->
<div class="grid-container grid-debug">
  <!-- Grid lines will be visible -->
</div>
```

### Check Responsive Behavior
```javascript
// Console helper to check current breakpoint
function getCurrentBreakpoint() {
  const width = window.innerWidth;
  if (width < 375) return 'xs';
  if (width < 425) return 'sm';
  if (width < 768) return 'md';
  if (width < 1024) return 'lg';
  if (width < 1440) return 'xl';
  if (width < 1920) return '2xl';
  if (width < 2560) return '3xl';
  return '4xl';
}
```

## Common Issues & Solutions

### Issue: Content Overflowing Grid
```css
/* Solution: Add min-width: 0 */
.grid-item {
  min-width: 0;
  overflow: hidden;
}
```

### Issue: Unequal Heights
```css
/* Solution: Use align-items */
.grid-container {
  align-items: stretch; /* Default */
}
```

### Issue: Grid Breaking on Small Screens
```css
/* Solution: Use responsive columns */
.responsive-item {
  grid-column: span 12; /* Mobile */
}

@media (min-width: 768px) {
  .responsive-item {
    grid-column: span 6; /* Tablet+ */
  }
}
```