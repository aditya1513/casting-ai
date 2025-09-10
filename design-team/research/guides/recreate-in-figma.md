# UXerflow AI Platform - Figma Recreation Guide

## Setup & Configuration

### 1. Document Structure
```
📁 CastMatch AI Platform Design System
  ├── 📄 Cover
  ├── 📄 Design Tokens
  ├── 📄 Components
  │   ├── Atoms
  │   ├── Molecules
  │   ├── Organisms
  │   └── Templates
  ├── 📄 Screens
  │   ├── Chat Interface
  │   ├── Dashboard
  │   ├── Agent Gallery
  │   └── Command Palette
  └── 📄 Prototypes
```

### 2. Grid & Layout Settings
- **Frame Size**: 1440×900 (Desktop), 375×812 (Mobile)
- **Layout Grid**: 
  - Columns: 12
  - Margin: 80px (desktop), 16px (mobile)
  - Gutter: 24px (desktop), 12px (mobile)
- **Baseline Grid**: 8px with 4px subdivisions

## Color System Setup

### Step 1: Create Color Styles
1. Navigate to Local Styles panel
2. Create following color styles:

```
Primary/
├── 50: #EEF2FF
├── 100: #E0E7FF
├── 200: #C7D2FE
├── 300: #A5B4FC
├── 400: #818CF8
├── 500: #6366F1 (Main)
├── 600: #4F46E5
├── 700: #4338CA
├── 800: #3730A3
├── 900: #312E81
└── 950: #1E1B4B

Neutral/
├── 50: #FAFAFA
├── 100: #F4F4F5
├── 200: #E4E4E7
├── 300: #D4D4D8
├── 400: #A1A1AA
├── 500: #71717A
├── 600: #52525B
├── 700: #3F3F46
├── 800: #27272A
├── 900: #18181B
└── 950: #0A0A0B

Semantic/
├── Success: #10B981
├── Warning: #F59E0B
├── Error: #EF4444
└── Info: #3B82F6

AI States/
├── Thinking: #A78BFA
├── Active: #34D399
├── Idle: #94A3B8
└── Glow: rgba(139, 92, 246, 0.3)
```

### Step 2: Create Gradient Styles
```
AI Gradient: Linear → 135° → #6366F1 0% → #8B5CF6 100%
User Gradient: Linear → 135° → #4F46E5 0% → #6366F1 100%
Surface Gradient: Linear → 180° → #0A0A0B 0% → #18181B 100%
```

## Typography System

### Font Setup
1. Install **Inter** font family
2. Install **JetBrains Mono** for code blocks
3. Create text styles:

```
Display/
├── 5xl: Inter, 48px, Bold, 1.2 line height
├── 4xl: Inter, 36px, Bold, 1.25 line height
├── 3xl: Inter, 30px, Semibold, 1.3 line height
├── 2xl: Inter, 24px, Semibold, 1.35 line height
└── xl: Inter, 20px, Semibold, 1.4 line height

Body/
├── lg: Inter, 18px, Regular, 1.75 line height
├── base: Inter, 16px, Regular, 1.5 line height
├── sm: Inter, 14px, Regular, 1.5 line height
└── xs: Inter, 12px, Regular, 1.5 line height

Label/
├── lg: Inter, 14px, Medium, 1.2 line height
├── md: Inter, 12px, Medium, 1.2 line height
└── sm: Inter, 11px, Medium, 1.2 line height

Code/
├── lg: JetBrains Mono, 16px, Regular, 1.5 line height
├── md: JetBrains Mono, 14px, Regular, 1.5 line height
└── sm: JetBrains Mono, 12px, Regular, 1.5 line height
```

## Component Creation Guide

### 1. Button Component

#### Base Structure
1. Create rectangle: 40px height
2. Apply corner radius: 8px
3. Add horizontal padding: 20px
4. Add text: Center aligned, Body/base

#### Variants
Create component set with properties:
- **Type**: Primary, Secondary, Ghost, AI Glow
- **Size**: Small (32px), Medium (40px), Large (48px)
- **State**: Default, Hover, Active, Disabled

#### Auto Layout Settings
- Direction: Horizontal
- Padding: 10px 20px (medium)
- Gap: 8px
- Alignment: Center

### 2. AI Message Bubble

#### Structure
```
Frame (Auto Layout) [Horizontal, Gap: 12px]
├── Avatar [40×40px, Corner radius: 20px]
└── Content Frame (Auto Layout) [Vertical, Gap: 4px]
    ├── Message Bubble [Max width: 70%, Corner radius: 16px]
    │   ├── Text [Body/base, Padding: 12px 16px]
    │   └── Thinking Dots (if applicable)
    └── Timestamp [Label/sm, Neutral/500]
```

#### Variants
- **Role**: User, Assistant, System
- **State**: Default, Streaming, Thinking

#### Special Effects
1. **AI Glow**: 
   - Duplicate bubble
   - Apply blur: 24px
   - Set opacity: 30%
   - Color: Primary/500
   - Position behind main bubble

2. **Thinking Dots**:
   - 3 circles, 8px diameter
   - Gap: 4px
   - Animate with Smart Animate

### 3. Agent Card

#### Structure (320×400px)
```
Frame (Corner radius: 16px, Clip content)
├── Background [Neutral/900, 60% opacity]
├── Glass Effect [White, 5% opacity, Blur: 20px]
├── Border [Neutral/800, 1px]
├── Content (Auto Layout, Vertical, Padding: 24px)
    ├── Header (Auto Layout, Horizontal)
    │   ├── Avatar [64×64px]
    │   └── Title Section
    ├── Description [Body/sm, Neutral/400]
    ├── Capabilities (Auto Layout, Wrap)
    ├── Metrics Grid (3 columns)
    └── CTA Button [Full width]
```

#### Interactive States
1. **Hover**: Lift shadow, Scale 1.02
2. **Active**: Scale 0.98
3. **Status Indicator**: Absolute positioned dot

### 4. Command Palette

#### Structure
```
Modal Container [640×480px max]
├── Backdrop [Black, 80% opacity, Blur: 8px]
└── Panel (Corner radius: 16px)
    ├── Search Header [Height: 64px]
    │   ├── Icon [20×20px]
    │   ├── Input Field
    │   └── ESC Key hint
    ├── Results List (Scrollable)
    │   └── Command Items (Grouped)
    └── Footer [Height: 48px]
```

#### Interaction Design
1. Set up interactive components
2. Add keyboard shortcuts as text
3. Create hover states for each item
4. Use Smart Animate for transitions

### 5. Dashboard Layout

#### Grid Structure
```
Frame [1440×900px]
├── Sidebar [320px fixed]
├── Main Content [Flexible]
│   ├── Header [64px]
│   ├── KPI Row [120px]
│   ├── Charts Section
│   └── Table Section
└── Right Panel [384px fixed]
```

#### Responsive Behavior
- **Desktop**: 12 columns
- **Tablet**: 8 columns, hide right panel
- **Mobile**: 4 columns, stack all sections

## Effects & Animations

### 1. Glassmorphism Effect
1. Background: Dark color with 60% opacity
2. Add rectangle above: White, 5% opacity
3. Apply background blur: 20px
4. Add border: 1px, 10% white opacity

### 2. Gradient Animation (Prototype)
1. Create 3 frames with gradient at different positions
2. Set up Smart Animate between frames
3. Duration: 3000ms
4. Easing: Ease in-out

### 3. Micro-interactions
- **Button Hover**: Opacity 90%, Lift shadow
- **Card Hover**: Y: -4px, Scale: 1.02
- **Input Focus**: Border color change + Glow

## Prototyping Instructions

### 1. Chat Flow
1. Link "Send" button to new frame with message
2. Add "Thinking" state frame
3. Transition to "AI Response" frame
4. Use Smart Animate, 300ms ease-out

### 2. Command Palette
1. Set keyboard shortcut: Cmd+K
2. Overlay modal with backdrop
3. Close on ESC or backdrop click
4. Navigate with arrow keys (optional)

### 3. Agent Selection
1. Click agent card → Highlight state
2. Show loading indicator
3. Transition to chat interface
4. Display welcome message

## Export Settings

### Components for Development
1. Export at 1x, 2x, 3x for all assets
2. Use PNG for complex graphics
3. SVG for icons and simple shapes
4. Include padding in exports

### Design Tokens
Export as JSON:
```json
{
  "colors": {
    "primary": {
      "500": "#6366F1"
    }
  },
  "spacing": {
    "md": "16px"
  },
  "borderRadius": {
    "lg": "12px"
  }
}
```

## Handoff Checklist

### For Developers
- [ ] All components have clear naming
- [ ] Spacing values follow 8px grid
- [ ] Colors use design tokens
- [ ] Interactive states documented
- [ ] Animations specs provided
- [ ] Responsive behaviors defined

### Quality Assurance
- [ ] Consistent use of styles
- [ ] All text is selectable
- [ ] Components are detached from libraries
- [ ] Prototype flows are complete
- [ ] Accessibility considerations noted

## Advanced Tips

### 1. Component Properties
Use Figma's component properties for:
- Text overrides
- Boolean visibility
- Instance swapping
- Variant switching

### 2. Auto Layout Best Practices
- Always use Auto Layout for responsive components
- Set minimum and maximum widths
- Use "Fill container" for flexible elements
- Apply consistent padding

### 3. Performance Optimization
- Limit blur effects in prototypes
- Use instances instead of detached components
- Optimize images before importing
- Group complex selections

### 4. Collaboration
- Use branching for experimental designs
- Leave comments for clarification
- Version control with meaningful names
- Regular library updates

## Resources & Plugins

### Recommended Plugins
1. **Tokens Studio**: Design token management
2. **Stark**: Accessibility checking
3. **Content Reel**: Realistic data
4. **Figmotion**: Advanced animations
5. **Design Lint**: Consistency checking

### Icon Libraries
- Heroicons
- Phosphor Icons
- Feather Icons
- Custom AI-themed icons

### Image Resources
- Unsplash for avatars
- UI Faces for user photos
- Mesh Gradients generator
- Glass morphism generators

## Final Notes

This guide provides the foundation for recreating UXerflow's AI platform design system in Figma. The key is maintaining consistency across all components while allowing for flexibility in implementation. Remember to:

1. Start with the design tokens
2. Build atoms before molecules
3. Test all interactive states
4. Document edge cases
5. Maintain the design system as a living document

The goal is to create a scalable, maintainable design system that can evolve with CastMatch's needs while maintaining the sophisticated, AI-forward aesthetic that sets the platform apart in the entertainment industry.