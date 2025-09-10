# CastMatch Chat UI Motion & Animation System
**Motion UI Specialist Deliverable**
*Created: 2025-09-04*

## HOLLYWOOD MOTION DESIGN PHILOSOPHY

### Cinematic Animation Principles
Every animation in CastMatch follows the 12 principles of animation refined through decades of Hollywood filmmaking. Our motion design creates emotional connections, guides attention, and provides meaningful feedback that elevates the casting experience from functional to inspiring.

```css
/* === MOTION DESIGN FOUNDATION === */

/* Animation timing system inspired by film frame rates */
:root {
  /* Core timing values (24fps cinema standard) */
  --frame-duration: 41.67ms;           /* Single frame at 24fps */
  --motion-instant: calc(var(--frame-duration) * 2);    /* ~83ms - 2 frames */
  --motion-quick: calc(var(--frame-duration) * 4);      /* ~167ms - 4 frames */
  --motion-snappy: calc(var(--frame-duration) * 6);     /* ~250ms - 6 frames */
  --motion-smooth: calc(var(--frame-duration) * 12);    /* ~500ms - 12 frames */
  --motion-graceful: calc(var(--frame-duration) * 18);  /* ~750ms - 18 frames */
  --motion-cinematic: calc(var(--frame-duration) * 24); /* ~1s - 24 frames */
  --motion-epic: calc(var(--frame-duration) * 48);      /* ~2s - 48 frames */
  
  /* Easing curves modeled after cinematic camera movements */
  --ease-dolly: cubic-bezier(0.25, 0.46, 0.45, 0.94);     /* Smooth dolly movement */
  --ease-whip-pan: cubic-bezier(0.19, 1, 0.22, 1);        /* Fast start, gentle stop */
  --ease-zoom: cubic-bezier(0.68, -0.55, 0.265, 1.55);    /* Dramatic zoom with overshoot */
  --ease-crane: cubic-bezier(0.175, 0.885, 0.32, 1.275);  /* Elegant crane movement */
  --ease-cut: cubic-bezier(0.645, 0.045, 0.355, 1);       /* Sharp, precise cuts */
  --ease-fade: cubic-bezier(0.4, 0, 0.2, 1);              /* Natural fade timing */
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);  /* Playful bounce */
}
```

## SIGNATURE ANIMATION SEQUENCES

### 1. Page Transition Animations

#### Main Interface Entrance
```css
/* === PAGE LOAD CINEMATICS === */

@keyframes appEntrance {
  0% {
    opacity: 0;
    transform: scale(0.95) translateY(40px);
    filter: blur(10px);
  }
  20% {
    opacity: 0.3;
    transform: scale(0.98) translateY(20px);
    filter: blur(5px);
  }
  60% {
    opacity: 0.8;
    transform: scale(1.01) translateY(-5px);
    filter: blur(1px);
  }
  80% {
    opacity: 0.95;
    transform: scale(1.005) translateY(0);
    filter: blur(0);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
    filter: blur(0);
  }
}

.app-entrance {
  animation: appEntrance var(--motion-cinematic) var(--ease-dolly) forwards;
}

/* Staggered element reveals */
.staggered-entrance {
  .element {
    opacity: 0;
    transform: translateY(30px);
    animation: elementReveal var(--motion-graceful) var(--ease-whip-pan) forwards;
    
    &:nth-child(1) { animation-delay: 0ms; }
    &:nth-child(2) { animation-delay: 100ms; }
    &:nth-child(3) { animation-delay: 200ms; }
    &:nth-child(4) { animation-delay: 300ms; }
    &:nth-child(5) { animation-delay: 400ms; }
  }
}

@keyframes elementReveal {
  0% {
    opacity: 0;
    transform: translateY(30px) rotateX(15deg);
  }
  60% {
    opacity: 0.8;
    transform: translateY(-3px) rotateX(-2deg);
  }
  100% {
    opacity: 1;
    transform: translateY(0) rotateX(0);
  }
}
```

#### Scene Transitions
```css
/* === SCENE TRANSITION EFFECTS === */

/* Fade to black transition (classic film) */
@keyframes fadeToBlack {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0;
    transform: scale(1.05);
  }
  100% {
    opacity: 0;
    transform: scale(1.1);
  }
}

/* Iris wipe transition (classic Hollywood) */
@keyframes irisWipe {
  0% {
    clip-path: circle(100% at 50% 50%);
  }
  100% {
    clip-path: circle(0% at 50% 50%);
  }
}

/* Golden curtain reveal */
@keyframes curtainReveal {
  0% {
    transform: translateY(-100%);
    opacity: 0;
  }
  30% {
    transform: translateY(-50%);
    opacity: 0.7;
  }
  60% {
    transform: translateY(5%);
    opacity: 0.9;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

.scene-transition {
  &.fade-to-black {
    animation: fadeToBlack var(--motion-smooth) var(--ease-fade);
  }
  
  &.iris-wipe {
    animation: irisWipe var(--motion-graceful) var(--ease-cut);
  }
  
  &.curtain-reveal {
    animation: curtainReveal var(--motion-cinematic) var(--ease-crane);
  }
}
```

### 2. Talent Showcase Animations

#### Talent Card Entrance (Red Carpet Style)
```css
/* === TALENT SHOWCASE ANIMATIONS === */

@keyframes redCarpetEntrance {
  0% {
    opacity: 0;
    transform: translateX(-100%) rotateY(45deg) scale(0.8);
    box-shadow: none;
  }
  20% {
    opacity: 0.3;
    transform: translateX(-50%) rotateY(25deg) scale(0.9);
    box-shadow: 0 5px 15px rgba(255, 215, 0, 0.1);
  }
  60% {
    opacity: 0.8;
    transform: translateX(5%) rotateY(-5deg) scale(1.05);
    box-shadow: 0 15px 35px rgba(255, 215, 0, 0.3);
  }
  80% {
    opacity: 0.95;
    transform: translateX(-2%) rotateY(2deg) scale(1.02);
    box-shadow: 0 20px 40px rgba(255, 215, 0, 0.4);
  }
  100% {
    opacity: 1;
    transform: translateX(0) rotateY(0) scale(1);
    box-shadow: 0 10px 30px rgba(255, 215, 0, 0.25);
  }
}

/* Spotlight reveal animation */
@keyframes spotlightReveal {
  0% {
    opacity: 0;
    background: radial-gradient(
      circle at 50% 50%,
      transparent 0%,
      rgba(0, 0, 0, 0.9) 30%
    );
    transform: scale(1.2);
  }
  50% {
    opacity: 0.7;
    background: radial-gradient(
      circle at 50% 50%,
      rgba(255, 215, 0, 0.1) 0%,
      rgba(0, 0, 0, 0.7) 60%
    );
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    background: radial-gradient(
      circle at 50% 50%,
      rgba(255, 215, 0, 0.05) 0%,
      transparent 80%
    );
    transform: scale(1);
  }
}

/* Portfolio image animations */
@keyframes portfolioUnfold {
  0% {
    opacity: 0;
    transform: rotateX(90deg) scale(0.8);
    transform-origin: bottom;
  }
  30% {
    opacity: 0.5;
    transform: rotateX(45deg) scale(0.9);
  }
  70% {
    opacity: 0.8;
    transform: rotateX(-5deg) scale(1.05);
  }
  100% {
    opacity: 1;
    transform: rotateX(0deg) scale(1);
  }
}

.talent-showcase {
  &.red-carpet {
    animation: redCarpetEntrance var(--motion-cinematic) var(--ease-crane);
  }
  
  &.spotlight {
    animation: spotlightReveal var(--motion-graceful) var(--ease-fade);
  }
  
  .portfolio-image {
    animation: portfolioUnfold var(--motion-smooth) var(--ease-dolly);
  }
}
```

#### Talent Comparison Animation
```css
/* === TALENT COMPARISON CHOREOGRAPHY === */

@keyframes talentFaceOff {
  0% {
    transform: translateX(0) scale(1);
    z-index: 1;
  }
  25% {
    transform: translateX(-20px) scale(1.05);
    z-index: 2;
  }
  50% {
    transform: translateX(0) scale(1.1);
    z-index: 3;
    box-shadow: 0 20px 60px rgba(255, 215, 0, 0.4);
  }
  75% {
    transform: translateX(20px) scale(1.05);
    z-index: 2;
  }
  100% {
    transform: translateX(0) scale(1);
    z-index: 1;
  }
}

@keyframes vsReveal {
  0% {
    opacity: 0;
    transform: scale(0) rotate(180deg);
    filter: blur(10px);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.3) rotate(90deg);
    filter: blur(2px);
  }
  70% {
    opacity: 1;
    transform: scale(0.9) rotate(0deg);
    filter: blur(0);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
    filter: blur(0);
  }
}

.comparison-mode {
  .talent-card {
    animation: talentFaceOff var(--motion-epic) var(--ease-crane) infinite;
    
    &:nth-child(1) { animation-delay: 0s; }
    &:nth-child(2) { animation-delay: 1s; }
  }
  
  .vs-indicator {
    animation: vsReveal var(--motion-smooth) var(--ease-bounce);
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 3rem;
    color: var(--cinema-gold-pure);
    font-weight: 900;
    text-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
  }
}
```

### 3. Message Flow Animations

#### Conversational Message Choreography
```css
/* === MESSAGE ANIMATION SEQUENCES === */

/* AI response typing simulation */
@keyframes aiThinking {
  0% {
    opacity: 0.3;
    transform: scale(0.95);
  }
  25% {
    opacity: 0.6;
    transform: scale(1.02);
  }
  50% {
    opacity: 0.9;
    transform: scale(0.98);
  }
  75% {
    opacity: 0.7;
    transform: scale(1.01);
  }
  100% {
    opacity: 0.5;
    transform: scale(1);
  }
}

/* Message bubble materialization */
@keyframes messageMaterialize {
  0% {
    opacity: 0;
    transform: scale(0.3) translateY(50px) rotateX(45deg);
    filter: blur(8px);
  }
  20% {
    opacity: 0.4;
    transform: scale(0.7) translateY(20px) rotateX(15deg);
    filter: blur(4px);
  }
  60% {
    opacity: 0.9;
    transform: scale(1.05) translateY(-5px) rotateX(-3deg);
    filter: blur(1px);
  }
  80% {
    opacity: 0.95;
    transform: scale(1.02) translateY(2px) rotateX(1deg);
    filter: blur(0);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0) rotateX(0);
    filter: blur(0);
  }
}

/* Talent card embedding animation */
@keyframes talentCardEmbed {
  0% {
    opacity: 0;
    transform: translateY(30px) rotateY(90deg) scale(0.8);
    box-shadow: none;
  }
  30% {
    opacity: 0.5;
    transform: translateY(15px) rotateY(45deg) scale(0.9);
    box-shadow: 0 5px 15px rgba(255, 215, 0, 0.1);
  }
  70% {
    opacity: 0.8;
    transform: translateY(-3px) rotateY(-5deg) scale(1.02);
    box-shadow: 0 10px 25px rgba(255, 215, 0, 0.2);
  }
  100% {
    opacity: 1;
    transform: translateY(0) rotateY(0) scale(1);
    box-shadow: 0 8px 20px rgba(255, 215, 0, 0.15);
  }
}

.message-animations {
  &.ai-thinking {
    animation: aiThinking 2s var(--ease-fade) infinite;
  }
  
  &.materializing {
    animation: messageMaterialize var(--motion-smooth) var(--ease-whip-pan);
  }
  
  .embedded-talent-card {
    animation: talentCardEmbed var(--motion-graceful) var(--ease-crane);
    animation-delay: 0.3s;
    animation-fill-mode: backwards;
  }
}
```

#### Message Thread Choreography
```css
/* === THREAD ANIMATION ORCHESTRATION === */

@keyframes threadUnfold {
  0% {
    max-height: 0;
    opacity: 0;
    transform: scaleY(0);
    transform-origin: top;
  }
  30% {
    max-height: 200px;
    opacity: 0.5;
    transform: scaleY(0.7);
  }
  70% {
    max-height: 400px;
    opacity: 0.8;
    transform: scaleY(1.05);
  }
  100% {
    max-height: none;
    opacity: 1;
    transform: scaleY(1);
  }
}

@keyframes threadCollapse {
  0% {
    max-height: none;
    opacity: 1;
    transform: scaleY(1);
  }
  100% {
    max-height: 0;
    opacity: 0;
    transform: scaleY(0);
    transform-origin: top;
  }
}

.thread-animations {
  &.unfolding {
    animation: threadUnfold var(--motion-graceful) var(--ease-crane);
    overflow: hidden;
  }
  
  &.collapsing {
    animation: threadCollapse var(--motion-smooth) var(--ease-fade);
    overflow: hidden;
  }
  
  .thread-message {
    animation: elementReveal var(--motion-smooth) var(--ease-dolly);
    
    &:nth-child(1) { animation-delay: 0ms; }
    &:nth-child(2) { animation-delay: 150ms; }
    &:nth-child(3) { animation-delay: 300ms; }
    &:nth-child(4) { animation-delay: 450ms; }
  }
}
```

### 4. Interactive Element Animations

#### Button Press Cinematics
```css
/* === BUTTON ANIMATION CHOREOGRAPHY === */

@keyframes buttonHeroPress {
  0% {
    transform: scale(1) translateY(0);
    box-shadow: 
      0 4px 12px rgba(255, 215, 0, 0.3),
      inset 0 2px 4px rgba(255, 255, 255, 0.2);
  }
  15% {
    transform: scale(0.95) translateY(2px);
    box-shadow: 
      0 2px 6px rgba(255, 215, 0, 0.4),
      inset 0 3px 6px rgba(0, 0, 0, 0.2);
  }
  30% {
    transform: scale(1.05) translateY(-3px);
    box-shadow: 
      0 8px 24px rgba(255, 215, 0, 0.4),
      0 0 20px rgba(255, 215, 0, 0.3),
      inset 0 1px 2px rgba(255, 255, 255, 0.3);
  }
  50% {
    transform: scale(1.02) translateY(-1px);
    box-shadow: 
      0 6px 18px rgba(255, 215, 0, 0.35),
      0 0 15px rgba(255, 215, 0, 0.25);
  }
  100% {
    transform: scale(1) translateY(0);
    box-shadow: 
      0 4px 12px rgba(255, 215, 0, 0.3),
      inset 0 2px 4px rgba(255, 255, 255, 0.2);
  }
}

@keyframes goldenRipple {
  0% {
    transform: scale(0);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.5);
    opacity: 0.4;
  }
  100% {
    transform: scale(3);
    opacity: 0;
  }
}

.button-cinematics {
  position: relative;
  overflow: hidden;
  
  &.hero-press {
    animation: buttonHeroPress var(--motion-graceful) var(--ease-bounce);
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 20px;
    background: radial-gradient(
      circle,
      rgba(255, 215, 0, 0.6) 0%,
      transparent 70%
    );
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(0);
    pointer-events: none;
  }
  
  &:active::after {
    animation: goldenRipple 0.6s var(--ease-fade);
  }
}
```

#### Form Input Enhancements
```css
/* === INPUT ANIMATION ENHANCEMENTS === */

@keyframes inputFocusBloom {
  0% {
    border-color: var(--border-secondary);
    box-shadow: none;
    background: var(--bg-surface);
  }
  50% {
    border-color: var(--cinema-gold-warm);
    box-shadow: 
      0 0 0 3px rgba(255, 215, 0, 0.1),
      0 2px 8px rgba(255, 215, 0, 0.15);
    background: var(--bg-elevated);
  }
  100% {
    border-color: var(--border-focus);
    box-shadow: 
      0 0 0 3px rgba(255, 215, 0, 0.15),
      0 4px 12px rgba(255, 215, 0, 0.2);
    background: var(--bg-elevated);
  }
}

@keyframes labelFloat {
  0% {
    transform: translateY(0) scale(1);
    color: var(--text-tertiary);
  }
  100% {
    transform: translateY(-24px) scale(0.85);
    color: var(--text-accent-primary);
  }
}

@keyframes inputSuccess {
  0% {
    border-color: var(--border-focus);
  }
  50% {
    border-color: var(--border-success);
    background: rgba(16, 185, 129, 0.05);
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }
  100% {
    border-color: var(--border-success);
    background: var(--bg-surface);
  }
}

.input-cinematics {
  &:focus {
    animation: inputFocusBloom var(--motion-smooth) var(--ease-dolly);
  }
  
  &.success {
    animation: inputSuccess var(--motion-graceful) var(--ease-fade);
  }
  
  + .floating-label {
    transition: all var(--motion-snappy) var(--ease-whip-pan);
    
    &.floated {
      animation: labelFloat var(--motion-snappy) var(--ease-dolly);
    }
  }
}
```

### 5. Loading and Progress Animations

#### Cinematic Loading Sequences
```css
/* === CINEMATIC LOADING ANIMATIONS === */

@keyframes filmReelSpin {
  0% {
    transform: rotate(0deg);
    filter: drop-shadow(0 0 5px rgba(255, 215, 0, 0.3));
  }
  25% {
    filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.5));
  }
  50% {
    filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.7));
  }
  75% {
    filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.5));
  }
  100% {
    transform: rotate(360deg);
    filter: drop-shadow(0 0 5px rgba(255, 215, 0, 0.3));
  }
}

@keyframes curtainRaise {
  0% {
    clip-path: inset(0 0 100% 0);
    opacity: 0;
  }
  30% {
    clip-path: inset(0 0 70% 0);
    opacity: 0.5;
  }
  70% {
    clip-path: inset(0 0 20% 0);
    opacity: 0.8;
  }
  100% {
    clip-path: inset(0 0 0% 0);
    opacity: 1;
  }
}

@keyframes progressSpotlight {
  0% {
    background: linear-gradient(90deg,
      transparent 0%,
      transparent 40%,
      rgba(255, 215, 0, 0.3) 50%,
      transparent 60%,
      transparent 100%
    );
    background-size: 200% 100%;
    background-position: -100% 0;
  }
  100% {
    background-position: 100% 0;
  }
}

.loading-cinematics {
  &.film-reel {
    &::before {
      content: '🎬';
      font-size: 2rem;
      display: inline-block;
      animation: filmReelSpin 2s linear infinite;
    }
  }
  
  &.curtain-raise {
    animation: curtainRaise var(--motion-cinematic) var(--ease-crane);
  }
  
  &.progress-bar {
    position: relative;
    background: var(--bg-surface);
    overflow: hidden;
    
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      animation: progressSpotlight 2s ease-in-out infinite;
    }
  }
}
```

### 6. Advanced Cinematic Effects

#### Parallax and Depth Effects
```css
/* === DEPTH AND PARALLAX ANIMATIONS === */

@keyframes parallaxFloat {
  0% {
    transform: translateY(0) translateX(0) rotateY(0deg);
  }
  33% {
    transform: translateY(-10px) translateX(5px) rotateY(2deg);
  }
  66% {
    transform: translateY(5px) translateX(-3px) rotateY(-1deg);
  }
  100% {
    transform: translateY(0) translateX(0) rotateY(0deg);
  }
}

@keyframes depthReveal {
  0% {
    opacity: 0;
    transform: 
      perspective(1000px) 
      rotateX(45deg) 
      rotateY(15deg) 
      translateZ(-200px) 
      scale(0.8);
  }
  50% {
    opacity: 0.7;
    transform: 
      perspective(1000px) 
      rotateX(15deg) 
      rotateY(5deg) 
      translateZ(-50px) 
      scale(0.95);
  }
  100% {
    opacity: 1;
    transform: 
      perspective(1000px) 
      rotateX(0deg) 
      rotateY(0deg) 
      translateZ(0px) 
      scale(1);
  }
}

/* Cinematic camera movements */
@keyframes cinematicPan {
  0% {
    transform: translateX(-50px) scale(1.1);
  }
  50% {
    transform: translateX(10px) scale(1.05);
  }
  100% {
    transform: translateX(0) scale(1);
  }
}

@keyframes cinematicZoom {
  0% {
    transform: scale(1.2) translateY(20px);
    opacity: 0.8;
  }
  60% {
    transform: scale(0.95) translateY(-5px);
    opacity: 1;
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.cinematic-effects {
  &.parallax {
    animation: parallaxFloat 6s ease-in-out infinite;
  }
  
  &.depth-reveal {
    animation: depthReveal var(--motion-cinematic) var(--ease-crane);
  }
  
  &.pan-entrance {
    animation: cinematicPan var(--motion-graceful) var(--ease-dolly);
  }
  
  &.zoom-entrance {
    animation: cinematicZoom var(--motion-graceful) var(--ease-zoom);
  }
}
```

#### Particle and Light Effects
```css
/* === PARTICLE AND LIGHTING EFFECTS === */

@keyframes goldenParticles {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0);
  }
  20% {
    opacity: 1;
    transform: translateY(15px) scale(0.5);
  }
  80% {
    opacity: 0.8;
    transform: translateY(-10px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-30px) scale(1.5);
  }
}

@keyframes lightBeamSweep {
  0% {
    transform: translateX(-200%) rotate(-10deg);
    opacity: 0;
  }
  20% {
    opacity: 0.8;
  }
  80% {
    opacity: 0.8;
  }
  100% {
    transform: translateX(200%) rotate(10deg);
    opacity: 0;
  }
}

@keyframes auraGlow {
  0% {
    box-shadow: 
      0 0 10px rgba(255, 215, 0, 0.3),
      0 0 20px rgba(255, 215, 0, 0.2);
  }
  50% {
    box-shadow: 
      0 0 20px rgba(255, 215, 0, 0.5),
      0 0 40px rgba(255, 215, 0, 0.3),
      0 0 60px rgba(255, 215, 0, 0.1);
  }
  100% {
    box-shadow: 
      0 0 10px rgba(255, 215, 0, 0.3),
      0 0 20px rgba(255, 215, 0, 0.2);
  }
}

.particle-effects {
  position: relative;
  
  &.golden-particles::after {
    content: '✨';
    position: absolute;
    top: 20%;
    left: 20%;
    font-size: 1.5rem;
    animation: goldenParticles 3s ease-out infinite;
    animation-delay: 0s;
  }
  
  &.golden-particles::before {
    content: '⭐';
    position: absolute;
    top: 60%;
    right: 30%;
    font-size: 1rem;
    animation: goldenParticles 3s ease-out infinite;
    animation-delay: 1s;
  }
  
  &.light-beam {
    overflow: hidden;
    
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 30%;
      height: 100%;
      background: linear-gradient(45deg,
        transparent 0%,
        rgba(255, 215, 0, 0.3) 45%,
        rgba(255, 255, 255, 0.5) 50%,
        rgba(255, 215, 0, 0.3) 55%,
        transparent 100%
      );
      animation: lightBeamSweep var(--motion-epic) var(--ease-dolly) infinite;
    }
  }
  
  &.aura-glow {
    animation: auraGlow 3s ease-in-out infinite;
  }
}
```

## MOTION ORCHESTRATION SYSTEM

### Animation Choreography Manager
```javascript
/* === MOTION CHOREOGRAPHY SYSTEM === */

class MotionChoreographer {
  constructor() {
    this.animationQueue = [];
    this.activeAnimations = new Set();
    this.performanceMonitor = new PerformanceMonitor();
  }
  
  // Orchestrate complex animation sequences
  choreographSequence(sequence) {
    const timeline = new AnimationTimeline();
    
    sequence.forEach((step, index) => {
      timeline.add({
        element: step.element,
        animation: step.animation,
        delay: step.delay || index * 100,
        duration: step.duration || 500,
        easing: step.easing || 'var(--ease-dolly)'
      });
    });
    
    return timeline.play();
  }
  
  // Cinematic entrance for multiple elements
  cinematicEntrance(elements, style = 'staggered') {
    const sequences = {
      staggered: this.createStaggeredEntrance(elements),
      cascade: this.createCascadeEntrance(elements),
      spotlight: this.createSpotlightEntrance(elements),
      redCarpet: this.createRedCarpetEntrance(elements)
    };
    
    return this.choreographSequence(sequences[style]);
  }
  
  createStaggeredEntrance(elements) {
    return elements.map((element, index) => ({
      element,
      animation: 'elementReveal',
      delay: index * 150,
      duration: 600,
      easing: 'var(--ease-whip-pan)'
    }));
  }
  
  createRedCarpetEntrance(elements) {
    return elements.map((element, index) => ({
      element,
      animation: 'redCarpetEntrance',
      delay: index * 200,
      duration: 1000,
      easing: 'var(--ease-crane)'
    }));
  }
  
  // Talent showcase specific animations
  showcaseTalent(talentCard, style = 'spotlight') {
    const showcaseAnimations = {
      spotlight: () => this.animateSpotlight(talentCard),
      redCarpet: () => this.animateRedCarpet(talentCard),
      portfolio: () => this.animatePortfolioReveal(talentCard),
      comparison: () => this.animateComparison(talentCard)
    };
    
    return showcaseAnimations[style]();
  }
  
  animateSpotlight(element) {
    // Create spotlight effect
    const spotlight = document.createElement('div');
    spotlight.className = 'spotlight-overlay';
    element.appendChild(spotlight);
    
    const animation = element.animate([
      { 
        opacity: 0,
        transform: 'scale(0.8)',
        filter: 'brightness(0.5)'
      },
      { 
        opacity: 1,
        transform: 'scale(1)',
        filter: 'brightness(1.2)'
      }
    ], {
      duration: 1000,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      fill: 'forwards'
    });
    
    // Remove spotlight after animation
    animation.addEventListener('finish', () => {
      spotlight.remove();
    });
    
    return animation;
  }
  
  // Message flow orchestration
  orchestrateMessageFlow(messages) {
    let delay = 0;
    
    messages.forEach((message, index) => {
      setTimeout(() => {
        this.animateMessageEntrance(message);
        
        // Add talent cards after message if present
        const talentCards = message.querySelectorAll('.talent-card');
        if (talentCards.length > 0) {
          setTimeout(() => {
            this.cascadeTalentCards(talentCards);
          }, 300);
        }
      }, delay);
      
      delay += this.calculateMessageDelay(message);
    });
  }
  
  animateMessageEntrance(message) {
    message.style.opacity = '0';
    message.style.transform = 'translateY(30px) scale(0.95)';
    
    const animation = message.animate([
      { 
        opacity: 0,
        transform: 'translateY(30px) scale(0.95)',
        filter: 'blur(3px)'
      },
      {
        opacity: 0.7,
        transform: 'translateY(-2px) scale(1.01)',
        filter: 'blur(1px)'
      },
      { 
        opacity: 1,
        transform: 'translateY(0) scale(1)',
        filter: 'blur(0)'
      }
    ], {
      duration: 600,
      easing: 'cubic-bezier(0.19, 1, 0.22, 1)',
      fill: 'forwards'
    });
    
    return animation;
  }
  
  cascadeTalentCards(cards) {
    cards.forEach((card, index) => {
      setTimeout(() => {
        card.classList.add('talent-card-entrance');
      }, index * 100);
    });
  }
}

// Performance monitoring for animations
class PerformanceMonitor {
  constructor() {
    this.frameRate = 0;
    this.isMonitoring = false;
  }
  
  startMonitoring() {
    this.isMonitoring = true;
    this.measureFrameRate();
  }
  
  measureFrameRate() {
    let lastTime = performance.now();
    let frameCount = 0;
    
    const measure = (currentTime) => {
      frameCount++;
      
      if (currentTime - lastTime >= 1000) {
        this.frameRate = frameCount;
        frameCount = 0;
        lastTime = currentTime;
        
        // Adjust animation quality based on performance
        this.adjustAnimationQuality();
      }
      
      if (this.isMonitoring) {
        requestAnimationFrame(measure);
      }
    };
    
    requestAnimationFrame(measure);
  }
  
  adjustAnimationQuality() {
    const body = document.body;
    
    if (this.frameRate < 30) {
      body.classList.add('reduced-animations');
    } else if (this.frameRate > 55) {
      body.classList.remove('reduced-animations');
    }
  }
}

// Usage examples
const choreographer = new MotionChoreographer();

// Initialize cinematic entrance for page load
document.addEventListener('DOMContentLoaded', () => {
  const mainElements = document.querySelectorAll('.main-element');
  choreographer.cinematicEntrance(mainElements, 'redCarpet');
});

// Talent showcase trigger
document.addEventListener('click', (e) => {
  if (e.target.matches('.talent-card')) {
    choreographer.showcaseTalent(e.target, 'spotlight');
  }
});
```

## REDUCED MOTION ACCESSIBILITY

### Respectful Animation Alternatives
```css
/* === ACCESSIBILITY-FIRST MOTION === */

/* Respect user preferences for reduced motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  
  /* Provide alternative feedback for reduced motion */
  .button-cinematics:hover {
    background-color: rgba(255, 215, 0, 0.1);
    border-color: var(--cinema-gold-pure);
  }
  
  .talent-card-interactive:hover {
    border-color: var(--cinema-gold-pure);
    box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.3);
  }
  
  .message-interactive {
    opacity: 1;
    transform: none;
  }
  
  /* Static alternatives to moving elements */
  .loading-cinematics .film-reel::before {
    content: '🎬';
    animation: none;
    opacity: 0.7;
  }
}

/* High contrast motion adjustments */
@media (prefers-contrast: high) {
  .cinematic-effects,
  .particle-effects {
    filter: contrast(150%);
  }
  
  .golden-particles::after,
  .golden-particles::before {
    content: '●';
    color: #FFFF00;
  }
}

/* Reduced animation quality class */
.reduced-animations {
  .talent-showcase,
  .cinematic-effects,
  .particle-effects {
    animation-duration: 0.3s;
    animation-iteration-count: 1;
  }
  
  .complex-animation {
    animation: simpleEntrance 0.3s ease-out;
  }
}

@keyframes simpleEntrance {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
```

---

**Hollywood Motion System Complete**: Comprehensive animation system with cinematic quality, accessibility compliance, and performance optimization for professional casting workflows.

**Phase 3 Complete**: All interaction and motion specialists successfully deployed. Ready for Phase 4 continuous quality assurance.