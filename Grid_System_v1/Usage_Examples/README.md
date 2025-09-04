# CastMatch Grid System Usage Examples

## Quick Start

1. Import the grid system CSS:
```html
<link rel="stylesheet" href="Grid_System_v1/Implementation.css">
```

2. Create a basic grid container:
```html
<div class="castmatch-grid">
  <div class="col-4">Full width on mobile</div>
  <div class="col-2">Half width on mobile</div>
  <div class="col-2">Half width on mobile</div>
</div>
```

## Component Examples

### Talent Card Grid
```html
<div class="talent-grid">
  <div class="talent-card">
    <img class="talent-card-image" src="..." alt="...">
    <div class="p-3">
      <h3>Talent Name</h3>
      <p>Role Type</p>
    </div>
  </div>
  <!-- More cards... -->
</div>
```

### Dashboard Layout
```html
<div class="dashboard-grid">
  <header style="grid-area: header;">Header</header>
  <nav style="grid-area: nav;">Navigation</nav>
  <main style="grid-area: main;">Main Content</main>
  <aside style="grid-area: sidebar;">Sidebar</aside>
  <footer style="grid-area: footer;">Footer</footer>
</div>
```

## Responsive Behavior

- **Mobile (320px+)**: 4-column grid, stacked layouts
- **Tablet (768px+)**: 8-column grid, side-by-side components
- **Desktop (1024px+)**: 12-column grid, full dashboard layouts
- **Large Desktop (1440px+)**: 16-column grid, enhanced spacing

## Performance Tips

1. Use container queries for component-level responsiveness
2. Apply `contain: layout style paint` for performance
3. Leverage CSS custom properties for easy theming
4. Use `aspect-ratio` for consistent media dimensions

For detailed implementation, see the Grid_Templates/ folder.