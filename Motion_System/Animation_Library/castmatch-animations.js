/**
 * CastMatch Motion System JavaScript Library
 * Advanced animations and micro-interactions
 * Performance-optimized for 60fps
 */

class CastMatchMotion {
  constructor() {
    this.fps = 60;
    this.frameTime = 1000 / this.fps;
    this.lastFrameTime = 0;
    this.animationQueue = [];
    this.observers = new Map();
    this.performanceMode = this.detectPerformanceMode();
    
    this.init();
  }

  init() {
    this.setupRAF();
    this.setupScrollListener();
    this.setupIntersectionObservers();
    this.setupMouseTracking();
    this.checkReducedMotion();
  }

  // Performance detection
  detectPerformanceMode() {
    const fps = this.measureFPS();
    if (fps < 30) return 'low';
    if (fps < 50) return 'medium';
    return 'high';
  }

  measureFPS() {
    // Simple FPS measurement
    let frames = 0;
    const start = performance.now();
    
    const measure = () => {
      frames++;
      if (performance.now() - start < 1000) {
        requestAnimationFrame(measure);
      }
    };
    
    requestAnimationFrame(measure);
    return frames;
  }

  // Animation frame management
  setupRAF() {
    const animate = (timestamp) => {
      if (timestamp - this.lastFrameTime >= this.frameTime) {
        this.processAnimationQueue();
        this.lastFrameTime = timestamp;
      }
      requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
  }

  processAnimationQueue() {
    this.animationQueue = this.animationQueue.filter(animation => {
      const progress = animation.update();
      return progress < 1;
    });
  }

  // Reduced motion check
  checkReducedMotion() {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = mediaQuery.matches;
    
    mediaQuery.addEventListener('change', (e) => {
      this.reducedMotion = e.matches;
    });
  }

  // ========================
  // ENTRANCE ANIMATIONS
  // ========================

  fadeIn(element, options = {}) {
    const defaults = {
      duration: 350,
      delay: 0,
      easing: 'easeOut',
      from: 0,
      to: 1
    };
    
    const config = { ...defaults, ...options };
    
    if (this.reducedMotion) {
      element.style.opacity = config.to;
      return Promise.resolve();
    }
    
    return this.animate(element, {
      opacity: [config.from, config.to]
    }, config);
  }

  slideIn(element, direction = 'left', options = {}) {
    const defaults = {
      duration: 500,
      delay: 0,
      easing: 'easeOutCubic',
      distance: 100
    };
    
    const config = { ...defaults, ...options };
    
    const transforms = {
      left: `translateX(-${config.distance}px)`,
      right: `translateX(${config.distance}px)`,
      up: `translateY(${config.distance}px)`,
      down: `translateY(-${config.distance}px)`
    };
    
    if (this.reducedMotion) {
      element.style.transform = 'none';
      element.style.opacity = 1;
      return Promise.resolve();
    }
    
    element.style.transform = transforms[direction];
    element.style.opacity = 0;
    
    return this.animate(element, {
      transform: [transforms[direction], 'translateX(0)'],
      opacity: [0, 1]
    }, config);
  }

  cinematicReveal(element, options = {}) {
    const defaults = {
      duration: 750,
      delay: 0,
      scale: 0.8,
      blur: 10,
      easing: 'easeOutQuart'
    };
    
    const config = { ...defaults, ...options };
    
    if (this.reducedMotion) {
      element.style.opacity = 1;
      return Promise.resolve();
    }
    
    return this.animate(element, {
      transform: [`scale(${config.scale})`, 'scale(1)'],
      filter: [`blur(${config.blur}px)`, 'blur(0)'],
      opacity: [0, 1]
    }, config);
  }

  // ========================
  // MICRO-INTERACTIONS
  // ========================

  buttonPress(element) {
    if (this.reducedMotion) return;
    
    element.addEventListener('mousedown', () => {
      this.animate(element, {
        transform: ['scale(1)', 'scale(0.95)']
      }, { duration: 100, easing: 'easeOut' });
    });
    
    element.addEventListener('mouseup', () => {
      this.animate(element, {
        transform: ['scale(0.95)', 'scale(1.02)', 'scale(1)']
      }, { duration: 300, easing: 'easeOutBack' });
    });
  }

  magneticButton(element, strength = 0.3) {
    if (this.reducedMotion) return;
    
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    element.addEventListener('mousemove', (e) => {
      const deltaX = (e.clientX - centerX) * strength;
      const deltaY = (e.clientY - centerY) * strength;
      
      element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    });
    
    element.addEventListener('mouseleave', () => {
      element.style.transform = 'translate(0, 0)';
    });
  }

  rippleEffect(element) {
    if (this.reducedMotion) return;
    
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    
    element.addEventListener('click', (e) => {
      const ripple = document.createElement('span');
      const rect = element.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: rgba(139, 92, 246, 0.3);
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        left: ${x}px;
        top: ${y}px;
        pointer-events: none;
      `;
      
      element.appendChild(ripple);
      
      setTimeout(() => ripple.remove(), 600);
    });
  }

  // ========================
  // SCROLL ANIMATIONS
  // ========================

  setupScrollListener() {
    let ticking = false;
    
    const updateScrollAnimations = () => {
      const scrollY = window.scrollY;
      document.documentElement.style.setProperty('--scroll-y', `${scrollY}px`);
      
      // Update parallax layers
      this.updateParallax(scrollY);
      
      ticking = false;
    };
    
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollAnimations);
        ticking = true;
      }
    });
  }

  updateParallax(scrollY) {
    if (this.reducedMotion) return;
    
    document.querySelectorAll('.parallax-layer').forEach(layer => {
      const speed = layer.dataset.speed || 0.5;
      const yPos = -(scrollY * speed);
      layer.style.transform = `translateY(${yPos}px)`;
    });
  }

  setupIntersectionObservers() {
    const options = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          
          // Stagger children animations
          const children = entry.target.querySelectorAll('.stagger-child');
          children.forEach((child, index) => {
            setTimeout(() => {
              child.classList.add('revealed');
            }, index * 100);
          });
        }
      });
    }, options);
    
    // Observe scroll reveal elements
    document.querySelectorAll('.scroll-reveal').forEach(el => {
      observer.observe(el);
    });
    
    this.observers.set('scroll', observer);
  }

  // ========================
  // SPECIAL EFFECTS
  // ========================

  particleExplosion(x, y, options = {}) {
    const defaults = {
      particleCount: 30,
      spread: 100,
      duration: 1000,
      colors: ['#8B5CF6', '#A855F7', '#6366F1']
    };
    
    const config = { ...defaults, ...options };
    
    if (this.reducedMotion) return;
    
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      pointer-events: none;
      z-index: 9999;
    `;
    
    document.body.appendChild(container);
    
    for (let i = 0; i < config.particleCount; i++) {
      const particle = document.createElement('div');
      const angle = (Math.PI * 2 * i) / config.particleCount;
      const velocity = config.spread * (0.5 + Math.random() * 0.5);
      const color = config.colors[Math.floor(Math.random() * config.colors.length)];
      
      particle.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        background: ${color};
        border-radius: 50%;
        box-shadow: 0 0 6px ${color};
      `;
      
      container.appendChild(particle);
      
      this.animate(particle, {
        transform: [
          'translate(0, 0) scale(1)',
          `translate(${Math.cos(angle) * velocity}px, ${Math.sin(angle) * velocity}px) scale(0)`
        ],
        opacity: [1, 0]
      }, {
        duration: config.duration,
        easing: 'easeOutCubic'
      });
    }
    
    setTimeout(() => container.remove(), config.duration);
  }

  glitchText(element, duration = 300) {
    if (this.reducedMotion) return;
    
    const originalText = element.textContent;
    const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    let iterations = 0;
    
    const interval = setInterval(() => {
      element.textContent = originalText
        .split('')
        .map((char, index) => {
          if (index < iterations) {
            return originalText[index];
          }
          return glitchChars[Math.floor(Math.random() * glitchChars.length)];
        })
        .join('');
      
      iterations += 1;
      
      if (iterations > originalText.length) {
        clearInterval(interval);
      }
    }, duration / originalText.length);
  }

  // ========================
  // LOADING ANIMATIONS
  // ========================

  skeletonPulse(element) {
    if (this.reducedMotion) {
      element.style.opacity = 0.5;
      return;
    }
    
    element.classList.add('skeleton-loader');
  }

  progressBar(element, progress, options = {}) {
    const defaults = {
      duration: 500,
      easing: 'easeOutCubic',
      showPercentage: true
    };
    
    const config = { ...defaults, ...options };
    
    const bar = element.querySelector('.progress-bar') || element;
    const percentage = Math.min(100, Math.max(0, progress));
    
    this.animate(bar, {
      width: [`${bar.style.width || '0%'}`, `${percentage}%`]
    }, config);
    
    if (config.showPercentage) {
      const label = element.querySelector('.progress-label');
      if (label) {
        this.countUp(label, percentage);
      }
    }
  }

  // ========================
  // UTILITY FUNCTIONS
  // ========================

  animate(element, properties, options = {}) {
    const defaults = {
      duration: 350,
      delay: 0,
      easing: 'ease',
      fill: 'forwards'
    };
    
    const config = { ...defaults, ...options };
    
    // Convert easing to cubic-bezier if needed
    const easingFunctions = {
      easeOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      easeOutCubic: 'cubic-bezier(0.215, 0.610, 0.355, 1.000)',
      easeOutQuart: 'cubic-bezier(0.165, 0.840, 0.440, 1.000)',
      easeOutBack: 'cubic-bezier(0.175, 0.885, 0.320, 1.275)'
    };
    
    if (easingFunctions[config.easing]) {
      config.easing = easingFunctions[config.easing];
    }
    
    return new Promise((resolve) => {
      const animation = element.animate(properties, {
        duration: config.duration,
        delay: config.delay,
        easing: config.easing,
        fill: config.fill
      });
      
      animation.onfinish = resolve;
    });
  }

  countUp(element, target, duration = 1000) {
    const start = parseInt(element.textContent) || 0;
    const range = target - start;
    const startTime = performance.now();
    
    const update = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const value = Math.floor(start + range * this.easeOutCubic(progress));
      element.textContent = value;
      
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };
    
    requestAnimationFrame(update);
  }

  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // ========================
  // MOUSE TRACKING
  // ========================

  setupMouseTracking() {
    let mouseX = 0;
    let mouseY = 0;
    
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      
      // Update CSS variables for mouse position
      document.documentElement.style.setProperty('--mouse-x', `${mouseX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${mouseY}px`);
      
      // Update spotlight effect
      this.updateSpotlight(mouseX, mouseY);
    });
  }

  updateSpotlight(x, y) {
    const spotlight = document.querySelector('.spotlight-effect');
    if (spotlight && !this.reducedMotion) {
      spotlight.style.background = `
        radial-gradient(
          circle at ${x}px ${y}px,
          rgba(139, 92, 246, 0.1) 0%,
          transparent 50%
        )
      `;
    }
  }

  // ========================
  // PAGE TRANSITIONS
  // ========================

  pageTransition(type = 'fade', options = {}) {
    const defaults = {
      duration: 500,
      easing: 'easeInOut'
    };
    
    const config = { ...defaults, ...options };
    
    const overlay = document.createElement('div');
    overlay.className = 'page-transition-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #0a0a0a;
      z-index: 10000;
      pointer-events: none;
    `;
    
    document.body.appendChild(overlay);
    
    const transitions = {
      fade: () => this.animate(overlay, {
        opacity: [0, 1, 1, 0]
      }, config),
      
      slide: () => this.animate(overlay, {
        transform: ['translateX(-100%)', 'translateX(0)', 'translateX(0)', 'translateX(100%)']
      }, config),
      
      morph: () => {
        overlay.style.clipPath = 'circle(0% at 50% 50%)';
        return this.animate(overlay, {
          clipPath: ['circle(0% at 50% 50%)', 'circle(150% at 50% 50%)']
        }, config);
      }
    };
    
    const transition = transitions[type] || transitions.fade;
    
    return transition().then(() => {
      overlay.remove();
    });
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.castMatchMotion = new CastMatchMotion();
  });
} else {
  window.castMatchMotion = new CastMatchMotion();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CastMatchMotion;
}