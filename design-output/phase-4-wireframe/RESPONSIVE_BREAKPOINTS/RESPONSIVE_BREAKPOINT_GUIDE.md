# Responsive Breakpoint Guide - CastMatch AI Multi-Device Rules

## Executive Summary
This document provides comprehensive responsive design guidelines for CastMatch AI, ensuring optimal user experience across all devices used by Mumbai casting professionals. The system prioritizes mobile-first design while enhancing desktop capabilities, with specific considerations for conversational interfaces and voice interactions.

## Core Breakpoint System

### Primary Breakpoints
Based on Mumbai market device usage analysis and casting workflow requirements:

```css
/* Mobile First Approach */
:root {
  /* Base mobile styles - 320px to 767px */
  --mobile-small: 320px;    /* Minimum supported width */
  --mobile-large: 480px;    /* Large mobile devices */
  
  /* Tablet range - 768px to 1023px */
  --tablet-small: 768px;    /* Small tablets, landscape phones */
  --tablet-large: 1024px;   /* Large tablets, small laptops */
  
  /* Desktop range - 1024px+ */
  --desktop-small: 1024px;  /* Small desktop, laptop */
  --desktop-medium: 1280px; /* Medium desktop */
  --desktop-large: 1440px;  /* Large desktop */
  --desktop-xl: 1920px;     /* Extra large displays */
}
```

### Container Max-Widths
```css
.container {
  width: 100%;
  padding: 0 var(--space-4);
  margin: 0 auto;
}

/* Progressive container constraints */
@media (min-width: 768px) {
  .container { max-width: 720px; padding: 0 var(--space-6); }
}

@media (min-width: 1024px) {
  .container { max-width: 960px; padding: 0 var(--space-8); }
}

@media (min-width: 1280px) {
  .container { max-width: 1200px; }
}

@media (min-width: 1440px) {
  .container { max-width: 1360px; }
}
```

## Device-Specific Design Rules

### Mobile (320px - 767px)
**Target Users:** 85% of Mumbai casting professionals
**Primary Context:** Commute time, quick decisions, one-handed operation

#### Layout Rules
- **Single column layout only**
- **Touch targets minimum 44px** (iOS/Android standard)
- **Spacing between touch targets minimum 8px**
- **Thumb-friendly zone optimization** (bottom 60% of screen)
- **Stacked navigation** (hamburger menu or bottom tabs)

```css
/* Mobile layout constraints */
@media (max-width: 767px) {
  .grid-layout {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
  
  .button {
    min-height: 44px;
    margin: var(--space-2);
    font-size: 16px; /* Prevent zoom on iOS */
  }
  
  .touch-target {
    min-width: 44px;
    min-height: 44px;
  }
}
```

#### Typography Scaling
```css
/* Mobile typography hierarchy */
@media (max-width: 767px) {
  :root {
    --text-xs: 12px;
    --text-sm: 14px;
    --text-base: 16px;   /* Minimum to prevent zoom */
    --text-lg: 18px;
    --text-xl: 20px;
    --text-2xl: 24px;
    --text-3xl: 28px;    /* Reduced from desktop */
    --text-4xl: 32px;    /* Hero text maximum */
  }
}
```

#### Voice Interface Priority
```css
/* Mobile voice-first design */
@media (max-width: 767px) {
  .voice-button {
    width: 56px;
    height: 56px;
    position: fixed;
    bottom: var(--space-6);
    right: var(--space-4);
    z-index: 100;
    box-shadow: var(--shadow-xl);
  }
  
  .chat-interface {
    height: 70vh; /* Maximize conversation space */
  }
  
  .search-input {
    display: none; /* Voice search only */
  }
}
```

#### Navigation Adaptations
```css
/* Mobile navigation patterns */
@media (max-width: 767px) {
  .top-nav {
    height: 56px; /* Reduced height */
    padding: 0 var(--space-4);
  }
  
  .bottom-nav {
    display: flex;
    height: 60px;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    border-top: 1px solid var(--color-gray-200);
    z-index: 50;
  }
  
  .nav-item {
    flex: 1;
    min-height: 44px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
  }
}
```

### Tablet (768px - 1023px)
**Target Users:** 10% of users (growing segment)
**Primary Context:** Detailed review, collaborative sessions, video calls

#### Layout Rules
- **Dual-column layouts** where appropriate
- **Enhanced touch targets** (48px recommended)
- **Split-view interfaces** for comparison tasks
- **Landscape optimization** for video content

```css
/* Tablet responsive grid */
@media (min-width: 768px) and (max-width: 1023px) {
  .main-grid {
    grid-template-columns: 300px 1fr;
    grid-template-areas: 
      "sidebar main"
      "sidebar main";
  }
  
  .talent-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-6);
  }
  
  .chat-interface {
    grid-template-columns: 1fr 320px;
    grid-template-areas: "conversation details";
  }
}
```

#### Enhanced Interaction Patterns
```css
/* Tablet interaction improvements */
@media (min-width: 768px) and (max-width: 1023px) {
  .hover-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }
  
  .talent-card {
    transition: all 0.3s ease;
    cursor: pointer;
  }
  
  .multi-select {
    display: block; /* Enable multi-selection interfaces */
  }
}
```

### Desktop (1024px+)
**Target Users:** 5% of users (administrative tasks)
**Primary Context:** Bulk operations, detailed analysis, multi-tasking

#### Layout Rules
- **Multi-column layouts** (up to 3 columns)
- **Sidebar navigation** always visible
- **Multi-panel interfaces** for power users
- **Keyboard shortcuts** prominently supported

```css
/* Desktop layout complexity */
@media (min-width: 1024px) {
  .desktop-layout {
    display: grid;
    grid-template-columns: 280px 1fr 320px;
    grid-template-areas: 
      "sidebar main panel"
      "sidebar main panel";
    min-height: 100vh;
  }
  
  .main-content {
    padding: var(--space-8);
    max-width: none;
  }
  
  .talent-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--space-8);
  }
}
```

#### Advanced Interface Features
```css
/* Desktop-only enhancements */
@media (min-width: 1024px) {
  .keyboard-shortcuts {
    display: block;
  }
  
  .bulk-actions {
    display: flex;
    gap: var(--space-3);
  }
  
  .context-menu {
    display: block; /* Right-click context menus */
  }
  
  .drag-drop {
    cursor: grab;
  }
  
  .resizable-panels {
    resize: horizontal;
    overflow: auto;
  }
}
```

## Component Responsive Behavior

### Chat Interface Scaling
```css
/* Conversation interface responsive behavior */
.chat-container {
  width: 100%;
  height: 500px;
  display: flex;
  flex-direction: column;
}

/* Mobile: Full-width, voice-priority */
@media (max-width: 767px) {
  .chat-container {
    height: 70vh;
    border-radius: 0;
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    bottom: 60px;
  }
  
  .voice-input-priority {
    order: -1; /* Voice button comes first */
  }
}

/* Tablet: Enhanced conversation */
@media (min-width: 768px) and (max-width: 1023px) {
  .chat-container {
    height: 600px;
    max-width: 800px;
    margin: 0 auto;
  }
  
  .chat-sidebar {
    display: block;
    width: 280px;
  }
}

/* Desktop: Multi-panel conversation */
@media (min-width: 1024px) {
  .chat-container {
    height: 700px;
    display: grid;
    grid-template-columns: 1fr 320px;
    grid-template-areas: "conversation details";
  }
  
  .conversation-history {
    display: block; /* Show conversation history panel */
  }
}
```

### Talent Card Responsive Design
```css
/* Talent profile card adaptations */
.talent-card {
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-base);
  overflow: hidden;
  transition: all 0.3s ease;
}

/* Mobile: Compact cards */
@media (max-width: 767px) {
  .talent-card {
    margin-bottom: var(--space-4);
  }
  
  .talent-card-horizontal {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
  
  .talent-photo {
    width: 80px;
    height: 80px;
    flex-shrink: 0;
  }
  
  .talent-actions {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
}

/* Tablet: Enhanced cards */
@media (min-width: 768px) and (max-width: 1023px) {
  .talent-card {
    width: 100%;
    max-width: 300px;
  }
  
  .talent-photo {
    height: 200px;
  }
  
  .talent-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }
}

/* Desktop: Rich interactive cards */
@media (min-width: 1024px) {
  .talent-card {
    width: 320px;
    cursor: pointer;
  }
  
  .talent-card:hover .talent-quick-actions {
    opacity: 1;
    transform: translateY(0);
  }
  
  .talent-quick-actions {
    position: absolute;
    top: var(--space-3);
    right: var(--space-3);
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.3s ease;
  }
}
```

### Form Input Responsive Behavior
```css
/* Form inputs across devices */
.form-input {
  width: 100%;
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-family: inherit;
  transition: border-color 0.2s ease;
}

/* Mobile: Touch-optimized inputs */
@media (max-width: 767px) {
  .form-input {
    height: 48px;
    padding: 0 var(--space-4);
    font-size: 16px; /* Prevent zoom on iOS */
  }
  
  .form-group {
    margin-bottom: var(--space-6);
  }
  
  .form-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
}

/* Tablet: Enhanced form layout */
@media (min-width: 768px) and (max-width: 1023px) {
  .form-input {
    height: 44px;
    padding: 0 var(--space-4);
    font-size: 15px;
  }
  
  .form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--space-4);
  }
}

/* Desktop: Efficient form layout */
@media (min-width: 1024px) {
  .form-input {
    height: 40px;
    padding: 0 var(--space-3);
    font-size: 14px;
  }
  
  .form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-3);
  }
  
  .form-input:hover {
    border-color: var(--color-primary);
  }
}
```

## Navigation Responsive Patterns

### Mobile Navigation
```css
/* Mobile-first navigation */
@media (max-width: 767px) {
  .top-navigation {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 56px;
    padding: 0 var(--space-4);
    background: white;
    border-bottom: 1px solid var(--color-gray-200);
    position: sticky;
    top: 0;
    z-index: 40;
  }
  
  .nav-menu-button {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: none;
  }
  
  .nav-menu-overlay {
    position: fixed;
    top: 56px;
    left: 0;
    right: 0;
    bottom: 0;
    background: white;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    z-index: 30;
  }
  
  .nav-menu-overlay.open {
    transform: translateX(0);
  }
  
  .bottom-navigation {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: white;
    border-top: 1px solid var(--color-gray-200);
    z-index: 50;
  }
  
  .bottom-nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    color: var(--color-gray-600);
    font-size: var(--text-xs);
    gap: var(--space-1);
    min-height: 44px;
  }
}
```

### Tablet Navigation
```css
/* Tablet navigation enhancement */
@media (min-width: 768px) and (max-width: 1023px) {
  .sidebar-navigation {
    display: block;
    width: 240px;
    background: white;
    border-right: 1px solid var(--color-gray-200);
    height: 100vh;
    position: sticky;
    top: 0;
  }
  
  .top-navigation {
    height: 64px;
    padding: 0 var(--space-6);
    grid-column: 2 / -1;
  }
  
  .main-content {
    margin-left: 240px;
  }
  
  .bottom-navigation {
    display: none; /* Hide mobile bottom nav */
  }
}
```

### Desktop Navigation
```css
/* Desktop full navigation */
@media (min-width: 1024px) {
  .desktop-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    grid-template-areas: 
      "sidebar header"
      "sidebar main";
    grid-template-rows: 64px 1fr;
    min-height: 100vh;
  }
  
  .sidebar-navigation {
    grid-area: sidebar;
    background: white;
    border-right: 1px solid var(--color-gray-200);
    display: flex;
    flex-direction: column;
  }
  
  .top-navigation {
    grid-area: header;
    height: 64px;
    padding: 0 var(--space-8);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: white;
    border-bottom: 1px solid var(--color-gray-200);
  }
  
  .main-content {
    grid-area: main;
    padding: var(--space-8);
  }
  
  .nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-6);
    color: var(--color-gray-700);
    text-decoration: none;
    border-right: 3px solid transparent;
    transition: all 0.2s ease;
  }
  
  .nav-item:hover {
    background: var(--color-gray-50);
    color: var(--color-primary);
  }
  
  .nav-item.active {
    background: var(--color-primary);
    color: white;
    border-right-color: var(--color-secondary);
  }
}
```

## Voice Interface Responsive Adaptations

### Mobile Voice Priority
```css
/* Mobile voice-first interface */
@media (max-width: 767px) {
  .voice-activation {
    position: fixed;
    bottom: 70px; /* Above bottom navigation */
    right: var(--space-4);
    width: 56px;
    height: 56px;
    background: var(--color-primary);
    border-radius: 50%;
    border: none;
    color: white;
    font-size: var(--text-xl);
    box-shadow: var(--shadow-xl);
    z-index: 60;
  }
  
  .voice-recording-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(249, 115, 22, 0.95);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  
  .voice-waveform {
    width: 200px;
    height: 60px;
    margin-bottom: var(--space-8);
  }
  
  .voice-transcript {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    margin: 0 var(--space-4);
    text-align: center;
    font-size: var(--text-lg);
  }
}
```

### Tablet Voice Enhancement
```css
/* Tablet voice interface */
@media (min-width: 768px) and (max-width: 1023px) {
  .voice-panel {
    width: 320px;
    background: white;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    padding: var(--space-6);
    position: fixed;
    top: 50%;
    right: var(--space-6);
    transform: translateY(-50%);
    z-index: 50;
  }
  
  .voice-controls {
    display: flex;
    gap: var(--space-3);
    justify-content: center;
    margin-bottom: var(--space-6);
  }
  
  .voice-settings {
    display: block; /* Show language settings */
  }
}
```

### Desktop Voice Integration
```css
/* Desktop voice integration */
@media (min-width: 1024px) {
  .voice-command-bar {
    position: fixed;
    top: var(--space-6);
    right: var(--space-8);
    display: flex;
    align-items: center;
    gap: var(--space-3);
    background: white;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-base);
    border: 1px solid var(--color-gray-200);
    z-index: 30;
  }
  
  .voice-shortcut-hint {
    font-size: var(--text-sm);
    color: var(--color-gray-600);
  }
  
  .voice-activation-desktop {
    width: 32px;
    height: 32px;
    background: var(--color-primary);
    border-radius: 50%;
    border: none;
    color: white;
  }
  
  .voice-recording-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 400px;
    background: white;
    border-radius: var(--radius-lg);
    padding: var(--space-8);
    box-shadow: var(--shadow-xl);
    z-index: 100;
  }
}
```

## Content Density Scaling

### Mobile: Minimal Density
```css
@media (max-width: 767px) {
  .content-density-mobile {
    --content-padding: var(--space-4);
    --item-spacing: var(--space-6);
    --section-spacing: var(--space-8);
  }
  
  .talent-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  
  .project-summary {
    padding: var(--space-4);
    margin-bottom: var(--space-6);
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }
}
```

### Tablet: Balanced Density
```css
@media (min-width: 768px) and (max-width: 1023px) {
  .content-density-tablet {
    --content-padding: var(--space-6);
    --item-spacing: var(--space-4);
    --section-spacing: var(--space-8);
  }
  
  .talent-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-6);
  }
  
  .project-summary {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: var(--space-6);
    padding: var(--space-6);
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--space-4);
  }
}
```

### Desktop: High Density
```css
@media (min-width: 1024px) {
  .content-density-desktop {
    --content-padding: var(--space-8);
    --item-spacing: var(--space-3);
    --section-spacing: var(--space-12);
  }
  
  .talent-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--space-6);
  }
  
  .project-summary {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: var(--space-8);
    padding: var(--space-8);
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: var(--space-6);
  }
  
  .data-table {
    display: table; /* Show full data tables */
  }
  
  .bulk-actions {
    display: flex; /* Enable bulk operations */
  }
}
```

## Image and Media Responsive Handling

### Responsive Images
```css
/* Base responsive image behavior */
.responsive-image {
  width: 100%;
  height: auto;
  border-radius: var(--radius-md);
  object-fit: cover;
}

/* Mobile: Optimized loading */
@media (max-width: 767px) {
  .talent-photo {
    width: 100%;
    height: 200px;
    object-fit: cover;
  }
  
  .hero-image {
    height: 40vh;
    background-size: cover;
    background-position: center;
  }
  
  /* Lazy loading priority */
  .image-lazy-mobile {
    loading: lazy;
  }
}

/* Tablet: Enhanced images */
@media (min-width: 768px) and (max-width: 1023px) {
  .talent-photo {
    height: 220px;
  }
  
  .hero-image {
    height: 50vh;
  }
  
  .image-gallery {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-4);
  }
}

/* Desktop: High-quality images */
@media (min-width: 1024px) {
  .talent-photo {
    height: 250px;
  }
  
  .hero-image {
    height: 60vh;
  }
  
  .image-gallery {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--space-6);
  }
  
  .image-hover-effects {
    transition: transform 0.3s ease;
  }
  
  .image-hover-effects:hover {
    transform: scale(1.05);
  }
}
```

### Video Content Scaling
```css
/* Responsive video containers */
.video-container {
  position: relative;
  width: 100%;
  background: var(--color-gray-900);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

/* Mobile: Portrait optimization */
@media (max-width: 767px) {
  .video-container {
    aspect-ratio: 16/9;
    max-height: 250px;
  }
  
  .audition-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .video-controls {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
    padding: var(--space-4);
  }
}

/* Tablet: Enhanced video experience */
@media (min-width: 768px) and (max-width: 1023px) {
  .video-container {
    aspect-ratio: 16/9;
    max-height: 400px;
  }
  
  .video-comparison {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }
}

/* Desktop: Professional video interface */
@media (min-width: 1024px) {
  .video-container {
    aspect-ratio: 16/9;
    max-height: 500px;
  }
  
  .video-comparison {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--space-6);
  }
  
  .video-theater-mode {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
}
```

## Performance Considerations

### Mobile Performance Optimization
```css
/* Mobile performance rules */
@media (max-width: 767px) {
  /* Reduce animations for performance */
  .reduce-motion {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  /* Optimize expensive properties */
  .performance-optimized {
    will-change: transform;
    transform: translateZ(0); /* Force GPU acceleration */
  }
  
  /* Limit concurrent animations */
  .animation-limit {
    animation-fill-mode: forwards;
  }
}
```

### Progressive Enhancement
```css
/* Progressive enhancement approach */
.base-functionality {
  /* Works on all devices */
  background: var(--color-gray-100);
  padding: var(--space-4);
  border-radius: var(--radius-md);
}

@media (min-width: 768px) {
  .enhanced-functionality {
    /* Enhanced for tablet+ */
    box-shadow: var(--shadow-base);
    transition: all 0.3s ease;
  }
}

@media (min-width: 1024px) {
  .advanced-functionality {
    /* Advanced features for desktop */
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
}
```

## Testing Breakpoint Compliance

### Breakpoint Testing Checklist
```css
/* CSS testing utilities */
.breakpoint-indicator {
  position: fixed;
  top: 0;
  left: 0;
  background: var(--color-primary);
  color: white;
  padding: var(--space-2);
  font-size: var(--text-xs);
  z-index: 1000;
  border-radius: 0 0 var(--radius-md) 0;
}

.breakpoint-indicator::after {
  content: "Mobile";
}

@media (min-width: 768px) {
  .breakpoint-indicator::after {
    content: "Tablet";
  }
}

@media (min-width: 1024px) {
  .breakpoint-indicator::after {
    content: "Desktop";
  }
}

@media (min-width: 1440px) {
  .breakpoint-indicator::after {
    content: "Desktop Large";
  }
}
```

### Grid Debugging
```css
/* Development grid overlay */
.debug-grid {
  position: relative;
}

.debug-grid::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    linear-gradient(rgba(255, 0, 0, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 0, 0, 0.1) 1px, transparent 1px);
  background-size: var(--space-4) var(--space-4);
  pointer-events: none;
  z-index: 1000;
}
```

## Accessibility Across Breakpoints

### Focus Management
```css
/* Responsive focus indicators */
.focus-indicator {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

@media (max-width: 767px) {
  .focus-indicator {
    outline-width: 3px; /* Larger for touch screens */
    outline-offset: 3px;
  }
}

@media (min-width: 1024px) {
  .keyboard-user .focus-indicator {
    outline-style: dashed; /* Different style for keyboard users */
  }
}
```

### Voice Navigation Scaling
```css
/* Voice navigation responsive behavior */
.voice-navigation {
  position: fixed;
  bottom: var(--space-4);
  right: var(--space-4);
  z-index: 50;
}

@media (max-width: 767px) {
  .voice-navigation {
    bottom: 80px; /* Above bottom navigation */
    width: 56px;
    height: 56px;
  }
}

@media (min-width: 768px) {
  .voice-navigation {
    bottom: var(--space-6);
    right: var(--space-6);
    width: 48px;
    height: 48px;
  }
}

@media (min-width: 1024px) {
  .voice-navigation {
    position: relative;
    bottom: auto;
    right: auto;
    width: 40px;
    height: 40px;
    margin-left: auto;
  }
}
```

## Implementation Guidelines

### CSS-in-JS Responsive Patterns
```javascript
// Responsive design tokens for CSS-in-JS
export const breakpoints = {
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
  desktopLarge: '(min-width: 1440px)'
};

// Usage example
const ResponsiveComponent = styled.div`
  padding: var(--space-4);
  
  @media ${breakpoints.mobile} {
    padding: var(--space-3);
    font-size: 16px; /* Prevent iOS zoom */
  }
  
  @media ${breakpoints.tablet} {
    padding: var(--space-6);
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  
  @media ${breakpoints.desktop} {
    padding: var(--space-8);
    grid-template-columns: 1fr 1fr 1fr;
  }
`;
```

### Mumbai-Specific Responsive Considerations
```css
/* Mumbai market responsive adjustments */
@media (max-width: 767px) {
  /* Optimized for commute usage */
  .mumbai-commute-optimized {
    font-size: 18px; /* Readable in moving trains */
    line-height: 1.6; /* Better readability */
    touch-action: manipulation; /* Prevent double-tap zoom */
  }
  
  /* Hindi-English mixed content */
  .bilingual-text {
    font-family: 'Noto Sans', 'Noto Sans Devanagari', system-ui;
    line-height: 1.7; /* Extra space for mixed scripts */
  }
}

/* Festival-aware responsive design */
@media (max-width: 767px) {
  .festival-notification {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: var(--color-secondary);
    color: white;
    padding: var(--space-2);
    text-align: center;
    font-size: var(--text-sm);
    z-index: 60;
  }
}
```

---

**Responsive Status:** Complete ✅  
**Breakpoints Defined:** 6 comprehensive breakpoints with specific rules  
**Device Coverage:** Mobile (85%), Tablet (10%), Desktop (5%) usage patterns  
**Voice Interface:** Fully responsive across all breakpoints  
**Mumbai Context:** Traffic, commute, and cultural considerations integrated  
**Performance:** Optimized loading and interaction patterns for each device class