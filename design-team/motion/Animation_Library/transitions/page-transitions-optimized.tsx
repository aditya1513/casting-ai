/**
 * Optimized Page Transition Choreography System
 * Seamless route transitions with shared element animations and performance optimization
 */

import React, { useRef, useEffect, useState, createContext, useContext } from 'react';
import { gpuAcceleration } from '../core/gpu-acceleration-config';
import { motionAccessibility } from '../core/accessibility-motion';

export interface TransitionConfig {
  type: 'slide' | 'fade' | 'morph' | 'curtain' | 'iris' | 'lift' | 'push';
  direction?: 'left' | 'right' | 'up' | 'down';
  duration: number;
  easing: string;
  stagger?: number;
  sharedElements?: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface SharedElement {
  id: string;
  element: HTMLElement;
  bounds: DOMRect;
  styles: CSSStyleDeclaration;
  timestamp: number;
}

interface TransitionState {
  isTransitioning: boolean;
  currentRoute: string;
  nextRoute: string | null;
  progress: number;
  sharedElements: Map<string, SharedElement>;
}

class PageTransitionOrchestrator {
  private state: TransitionState = {
    isTransitioning: false,
    currentRoute: '',
    nextRoute: null,
    progress: 0,
    sharedElements: new Map()
  };

  private observers: Set<(state: TransitionState) => void> = new Set();
  private transitionContainer: HTMLElement | null = null;
  private currentAnimation: Animation | null = null;
  private performanceMetrics = {
    transitionTimes: [] as number[],
    averageTime: 0,
    frameDrops: 0,
    memoryUsage: 0
  };

  constructor() {
    this.initializeTransitionContainer();
  }

  private initializeTransitionContainer(): void {
    if (typeof window === 'undefined') return;

    this.transitionContainer = document.createElement('div');
    this.transitionContainer.id = 'page-transition-container';
    this.transitionContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 9999;
      overflow: hidden;
    `;
    
    document.body.appendChild(this.transitionContainer);
  }

  /**
   * Registers a shared element for transition continuity
   */
  registerSharedElement(id: string, element: HTMLElement): void {
    if (!element) return;

    const bounds = element.getBoundingClientRect();
    const styles = window.getComputedStyle(element);
    
    this.state.sharedElements.set(id, {
      id,
      element: element.cloneNode(true) as HTMLElement,
      bounds,
      styles,
      timestamp: Date.now()
    });
  }

  /**
   * Unregisters a shared element
   */
  unregisterSharedElement(id: string): void {
    this.state.sharedElements.delete(id);
  }

  /**
   * Starts a page transition with specified configuration
   */
  async startTransition(
    fromRoute: string,
    toRoute: string,
    config: TransitionConfig
  ): Promise<void> {
    if (this.state.isTransitioning) {
      await this.cancelCurrentTransition();
    }

    const startTime = performance.now();
    
    // Check if transition should be allowed based on accessibility preferences
    if (!motionAccessibility.shouldAnimate(config.priority === 'high' ? 'essential' : 'decorative')) {
      await this.performStaticTransition(fromRoute, toRoute);
      return;
    }

    // Check performance budget
    if (!gpuAcceleration.canExecuteAnimation(`transition_${toRoute}`, 'complex')) {
      await this.performFallbackTransition(fromRoute, toRoute);
      return;
    }

    try {
      this.updateState({
        isTransitioning: true,
        currentRoute: fromRoute,
        nextRoute: toRoute,
        progress: 0
      });

      // Register animation with GPU acceleration manager
      gpuAcceleration.registerAnimation(`transition_${toRoute}`, 'complex');

      // Perform the transition
      await this.executeTransition(config);

      // Record performance metrics
      const duration = performance.now() - startTime;
      this.recordPerformanceMetrics(duration);

    } catch (error) {
      console.error('Transition failed:', error);
      await this.performFallbackTransition(fromRoute, toRoute);
    } finally {
      // Cleanup
      gpuAcceleration.unregisterAnimation(`transition_${toRoute}`, 'complex');
      this.updateState({
        isTransitioning: false,
        currentRoute: toRoute,
        nextRoute: null,
        progress: 1
      });
    }
  }

  private async executeTransition(config: TransitionConfig): Promise<void> {
    const { type, direction = 'right', duration, easing, sharedElements = [] } = config;

    // Prepare transition elements
    const fromPage = document.querySelector('[data-transition-page="current"]') as HTMLElement;
    const toPage = document.querySelector('[data-transition-page="next"]') as HTMLElement;

    if (!fromPage || !toPage) {
      throw new Error('Transition pages not found');
    }

    // Setup GPU optimization
    gpuAcceleration.optimizeElementForAnimation(fromPage, 'transform', 'high');
    gpuAcceleration.optimizeElementForAnimation(toPage, 'transform', 'high');

    // Handle shared elements
    await this.animateSharedElements(sharedElements, duration, easing);

    // Execute main transition
    switch (type) {
      case 'slide':
        await this.performSlideTransition(fromPage, toPage, direction, duration, easing);
        break;
      case 'fade':
        await this.performFadeTransition(fromPage, toPage, duration, easing);
        break;
      case 'morph':
        await this.performMorphTransition(fromPage, toPage, duration, easing);
        break;
      case 'curtain':
        await this.performCurtainTransition(fromPage, toPage, direction, duration, easing);
        break;
      case 'iris':
        await this.performIrisTransition(fromPage, toPage, duration, easing);
        break;
      case 'lift':
        await this.performLiftTransition(fromPage, toPage, duration, easing);
        break;
      case 'push':
        await this.performPushTransition(fromPage, toPage, direction, duration, easing);
        break;
      default:
        await this.performSlideTransition(fromPage, toPage, direction, duration, easing);
    }

    // Cleanup optimizations
    gpuAcceleration.cleanupElementOptimization(fromPage);
    gpuAcceleration.cleanupElementOptimization(toPage);
  }

  private async performSlideTransition(
    fromPage: HTMLElement,
    toPage: HTMLElement,
    direction: string,
    duration: number,
    easing: string
  ): Promise<void> {
    const translateValue = direction === 'left' || direction === 'up' ? '-100%' : '100%';
    const property = direction === 'left' || direction === 'right' ? 'translateX' : 'translateY';

    // Set initial positions
    toPage.style.transform = `${property}(${direction === 'left' || direction === 'up' ? '100%' : '-100%'})`;
    toPage.style.opacity = '1';

    const animations = [
      fromPage.animate([
        { transform: 'translateX(0) translateY(0)', opacity: '1' },
        { transform: `${property}(${translateValue})`, opacity: '0.8' }
      ], { duration, easing, fill: 'forwards' }),

      toPage.animate([
        { transform: `${property}(${direction === 'left' || direction === 'up' ? '100%' : '-100%'})`, opacity: '1' },
        { transform: 'translateX(0) translateY(0)', opacity: '1' }
      ], { duration, easing, fill: 'forwards' })
    ];

    this.currentAnimation = animations[0];
    
    // Track progress
    animations[0].addEventListener('finish', () => {
      this.updateState({ progress: 1 });
    });

    await Promise.all(animations.map(anim => anim.finished));
  }

  private async performFadeTransition(
    fromPage: HTMLElement,
    toPage: HTMLElement,
    duration: number,
    easing: string
  ): Promise<void> {
    toPage.style.opacity = '0';
    toPage.style.transform = 'scale(1.05)';

    const animations = [
      fromPage.animate([
        { opacity: '1', transform: 'scale(1)' },
        { opacity: '0', transform: 'scale(0.95)' }
      ], { duration: duration * 0.6, easing, fill: 'forwards' }),

      toPage.animate([
        { opacity: '0', transform: 'scale(1.05)' },
        { opacity: '1', transform: 'scale(1)' }
      ], { duration, easing: easing, fill: 'forwards', delay: duration * 0.2 })
    ];

    this.currentAnimation = animations[1];
    await Promise.all(animations.map(anim => anim.finished));
  }

  private async performMorphTransition(
    fromPage: HTMLElement,
    toPage: HTMLElement,
    duration: number,
    easing: string
  ): Promise<void> {
    const morphContainer = document.createElement('div');
    morphContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
      clip-path: circle(0% at 50% 50%);
      z-index: 10000;
    `;

    this.transitionContainer?.appendChild(morphContainer);

    // Expand morph
    const expandAnimation = morphContainer.animate([
      { clipPath: 'circle(0% at 50% 50%)' },
      { clipPath: 'circle(150% at 50% 50%)' }
    ], { duration: duration * 0.5, easing, fill: 'forwards' });

    await expandAnimation.finished;

    // Switch content
    fromPage.style.opacity = '0';
    toPage.style.opacity = '1';

    // Contract morph
    const contractAnimation = morphContainer.animate([
      { clipPath: 'circle(150% at 50% 50%)' },
      { clipPath: 'circle(0% at 50% 50%)' }
    ], { duration: duration * 0.5, easing, fill: 'forwards' });

    this.currentAnimation = contractAnimation;
    await contractAnimation.finished;

    morphContainer.remove();
  }

  private async performCurtainTransition(
    fromPage: HTMLElement,
    toPage: HTMLElement,
    direction: string,
    duration: number,
    easing: string
  ): Promise<void> {
    const curtain = document.createElement('div');
    curtain.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: #000;
      transform: translateX(${direction === 'left' ? '-100%' : '100%'});
      z-index: 10000;
    `;

    this.transitionContainer?.appendChild(curtain);

    // Close curtain
    const closeAnimation = curtain.animate([
      { transform: `translateX(${direction === 'left' ? '-100%' : '100%'})` },
      { transform: 'translateX(0)' }
    ], { duration: duration * 0.5, easing, fill: 'forwards' });

    await closeAnimation.finished;

    // Switch content
    fromPage.style.opacity = '0';
    toPage.style.opacity = '1';

    // Open curtain
    const openAnimation = curtain.animate([
      { transform: 'translateX(0)' },
      { transform: `translateX(${direction === 'left' ? '100%' : '-100%'})` }
    ], { duration: duration * 0.5, easing, fill: 'forwards' });

    this.currentAnimation = openAnimation;
    await openAnimation.finished;

    curtain.remove();
  }

  private async performIrisTransition(
    fromPage: HTMLElement,
    toPage: HTMLElement,
    duration: number,
    easing: string
  ): Promise<void> {
    const iris = document.createElement('div');
    iris.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: radial-gradient(circle, transparent 0%, #000 70%);
      z-index: 10000;
      opacity: 0;
    `;

    this.transitionContainer?.appendChild(iris);

    // Close iris
    const closeAnimation = iris.animate([
      { opacity: '0' },
      { opacity: '1' }
    ], { duration: duration * 0.5, easing, fill: 'forwards' });

    await closeAnimation.finished;

    // Switch content
    fromPage.style.opacity = '0';
    toPage.style.opacity = '1';

    // Open iris
    const openAnimation = iris.animate([
      { opacity: '1' },
      { opacity: '0' }
    ], { duration: duration * 0.5, easing, fill: 'forwards' });

    this.currentAnimation = openAnimation;
    await openAnimation.finished;

    iris.remove();
  }

  private async performLiftTransition(
    fromPage: HTMLElement,
    toPage: HTMLElement,
    duration: number,
    easing: string
  ): Promise<void> {
    toPage.style.transform = 'translateY(100%) rotateX(-15deg)';
    toPage.style.transformOrigin = 'center bottom';

    const animations = [
      fromPage.animate([
        { transform: 'translateY(0) rotateX(0)', opacity: '1' },
        { transform: 'translateY(-100%) rotateX(15deg)', opacity: '0' }
      ], { duration, easing, fill: 'forwards' }),

      toPage.animate([
        { transform: 'translateY(100%) rotateX(-15deg)', opacity: '1' },
        { transform: 'translateY(0) rotateX(0)', opacity: '1' }
      ], { duration, easing, fill: 'forwards' })
    ];

    this.currentAnimation = animations[1];
    await Promise.all(animations.map(anim => anim.finished));
  }

  private async performPushTransition(
    fromPage: HTMLElement,
    toPage: HTMLElement,
    direction: string,
    duration: number,
    easing: string
  ): Promise<void> {
    const translateValue = direction === 'left' || direction === 'up' ? '-100%' : '100%';
    const property = direction === 'left' || direction === 'right' ? 'translateX' : 'translateY';

    toPage.style.transform = `${property}(${direction === 'left' || direction === 'up' ? '100%' : '-100%'})`;
    toPage.style.zIndex = '1';
    fromPage.style.zIndex = '0';

    const animation = toPage.animate([
      { transform: `${property}(${direction === 'left' || direction === 'up' ? '100%' : '-100%'})` },
      { transform: 'translateX(0) translateY(0)' }
    ], { duration, easing, fill: 'forwards' });

    this.currentAnimation = animation;
    await animation.finished;
  }

  private async animateSharedElements(
    sharedElements: string[],
    duration: number,
    easing: string
  ): Promise<void> {
    const animations: Promise<void>[] = [];

    sharedElements.forEach(elementId => {
      const fromElement = this.state.sharedElements.get(`from_${elementId}`);
      const toElement = this.state.sharedElements.get(`to_${elementId}`);

      if (fromElement && toElement) {
        animations.push(this.animateSharedElement(fromElement, toElement, duration, easing));
      }
    });

    await Promise.all(animations);
  }

  private async animateSharedElement(
    from: SharedElement,
    to: SharedElement,
    duration: number,
    easing: string
  ): Promise<void> {
    const ghost = from.element.cloneNode(true) as HTMLElement;
    
    // Position ghost at from location
    ghost.style.cssText = `
      position: fixed;
      top: ${from.bounds.top}px;
      left: ${from.bounds.left}px;
      width: ${from.bounds.width}px;
      height: ${from.bounds.height}px;
      margin: 0;
      z-index: 10001;
    `;

    this.transitionContainer?.appendChild(ghost);

    // Animate to target location
    const animation = ghost.animate([
      {
        top: `${from.bounds.top}px`,
        left: `${from.bounds.left}px`,
        width: `${from.bounds.width}px`,
        height: `${from.bounds.height}px`
      },
      {
        top: `${to.bounds.top}px`,
        left: `${to.bounds.left}px`,
        width: `${to.bounds.width}px`,
        height: `${to.bounds.height}px`
      }
    ], { duration, easing, fill: 'forwards' });

    await animation.finished;
    ghost.remove();
  }

  private async performStaticTransition(fromRoute: string, toRoute: string): Promise<void> {
    // Instant transition for reduced motion users
    const fromPage = document.querySelector('[data-transition-page="current"]') as HTMLElement;
    const toPage = document.querySelector('[data-transition-page="next"]') as HTMLElement;

    if (fromPage) fromPage.style.opacity = '0';
    if (toPage) toPage.style.opacity = '1';

    this.updateState({
      isTransitioning: false,
      currentRoute: toRoute,
      nextRoute: null,
      progress: 1
    });
  }

  private async performFallbackTransition(fromRoute: string, toRoute: string): Promise<void> {
    // Simple fade for low-performance devices
    const fromPage = document.querySelector('[data-transition-page="current"]') as HTMLElement;
    const toPage = document.querySelector('[data-transition-page="next"]') as HTMLElement;

    if (fromPage && toPage) {
      await this.performFadeTransition(fromPage, toPage, 300, 'ease-in-out');
    }

    this.updateState({
      currentRoute: toRoute,
      nextRoute: null,
      isTransitioning: false,
      progress: 1
    });
  }

  private async cancelCurrentTransition(): Promise<void> {
    if (this.currentAnimation) {
      this.currentAnimation.cancel();
      this.currentAnimation = null;
    }

    this.updateState({
      isTransitioning: false,
      progress: 0
    });
  }

  private updateState(updates: Partial<TransitionState>): void {
    this.state = { ...this.state, ...updates };
    this.observers.forEach(callback => callback(this.state));
  }

  private recordPerformanceMetrics(duration: number): void {
    this.performanceMetrics.transitionTimes.push(duration);
    
    // Keep only last 10 measurements
    if (this.performanceMetrics.transitionTimes.length > 10) {
      this.performanceMetrics.transitionTimes.shift();
    }

    this.performanceMetrics.averageTime = 
      this.performanceMetrics.transitionTimes.reduce((a, b) => a + b, 0) / 
      this.performanceMetrics.transitionTimes.length;
  }

  /**
   * Subscribe to transition state changes
   */
  subscribe(callback: (state: TransitionState) => void): () => void {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  /**
   * Get current transition state
   */
  getState(): TransitionState {
    return { ...this.state };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }
}

// Singleton instance
export const pageTransitions = new PageTransitionOrchestrator();

// React Context
const PageTransitionContext = createContext<TransitionState | null>(null);

export const usePageTransition = () => {
  const context = useContext(PageTransitionContext);
  if (!context) {
    throw new Error('usePageTransition must be used within PageTransitionProvider');
  }
  return context;
};

// Provider component
interface PageTransitionProviderProps {
  children: React.ReactNode;
}

export const PageTransitionProvider: React.FC<PageTransitionProviderProps> = ({ children }) => {
  const [state, setState] = useState<TransitionState>(pageTransitions.getState());

  useEffect(() => {
    const unsubscribe = pageTransitions.subscribe(setState);
    return unsubscribe;
  }, []);

  return (
    <PageTransitionContext.Provider value={state}>
      {children}
    </PageTransitionContext.Provider>
  );
};

// Utility components
interface TransitionPageProps {
  children: React.ReactNode;
  route: string;
  isActive: boolean;
}

export const TransitionPage: React.FC<TransitionPageProps> = ({ 
  children, 
  route, 
  isActive 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.setAttribute(
        'data-transition-page', 
        isActive ? 'current' : 'next'
      );
    }
  }, [isActive]);

  return (
    <div
      ref={containerRef}
      data-route={route}
      style={{
        width: '100%',
        height: '100%',
        opacity: isActive ? 1 : 0,
        pointerEvents: isActive ? 'auto' : 'none'
      }}
    >
      {children}
    </div>
  );
};

interface SharedElementProps {
  children: React.ReactNode;
  id: string;
  transition?: boolean;
}

export const SharedElement: React.FC<SharedElementProps> = ({ 
  children, 
  id, 
  transition = true 
}) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (transition && elementRef.current) {
      pageTransitions.registerSharedElement(id, elementRef.current);
      
      return () => {
        pageTransitions.unregisterSharedElement(id);
      };
    }
  }, [id, transition]);

  return (
    <div ref={elementRef} data-shared-element={id}>
      {children}
    </div>
  );
};