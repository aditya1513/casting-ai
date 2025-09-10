/**
 * Touch Gesture Interactions for CastMatch Mobile Platform
 * Comprehensive gesture recognition and handling system
 */

import { hapticFeedback } from './haptic-feedback-system';

export interface GestureConfig {
  threshold: number;
  timeout: number;
  sensitivity: number;
  requiresMultiTouch?: boolean;
  preventScrolling?: boolean;
}

export interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
  identifier: number;
}

export interface GestureState {
  isActive: boolean;
  startPoints: TouchPoint[];
  currentPoints: TouchPoint[];
  gestureType: string | null;
  startTime: number;
  element: HTMLElement | null;
}

export interface SwipeGestureData {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
  duration: number;
  element: HTMLElement;
}

export interface PinchGestureData {
  scale: number;
  center: { x: number; y: number };
  initialDistance: number;
  currentDistance: number;
  element: HTMLElement;
}

export interface LongPressGestureData {
  point: TouchPoint;
  duration: number;
  element: HTMLElement;
}

class TouchGestureSystem {
  private gestureState: GestureState;
  private config: { [key: string]: GestureConfig };
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();
  private rafId: number | null = null;

  constructor() {
    this.gestureState = {
      isActive: false,
      startPoints: [],
      currentPoints: [],
      gestureType: null,
      startTime: 0,
      element: null
    };

    this.config = {
      swipe: {
        threshold: 50, // minimum distance in pixels
        timeout: 300, // maximum duration in ms
        sensitivity: 0.3, // velocity threshold
        preventScrolling: false
      },
      pinch: {
        threshold: 10, // minimum scale change
        timeout: 5000,
        sensitivity: 0.1,
        requiresMultiTouch: true,
        preventScrolling: true
      },
      longPress: {
        threshold: 10, // maximum movement allowed
        timeout: 500, // duration to trigger
        sensitivity: 1.0,
        preventScrolling: true
      },
      pan: {
        threshold: 5,
        timeout: 10000,
        sensitivity: 0.5,
        preventScrolling: true
      },
      doubleTap: {
        threshold: 30, // maximum distance between taps
        timeout: 300, // maximum time between taps
        sensitivity: 1.0
      },
      pullToRefresh: {
        threshold: 80, // minimum pull distance
        timeout: 2000,
        sensitivity: 0.5,
        preventScrolling: false
      }
    };

    this.bindEventListeners();
  }

  private bindEventListeners(): void {
    // Touch events
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    document.addEventListener('touchcancel', this.handleTouchCancel.bind(this));

    // Pointer events for broader device support
    if ('PointerEvent' in window) {
      document.addEventListener('pointerdown', this.handlePointerDown.bind(this));
      document.addEventListener('pointermove', this.handlePointerMove.bind(this));
      document.addEventListener('pointerup', this.handlePointerUp.bind(this));
      document.addEventListener('pointercancel', this.handlePointerCancel.bind(this));
    }

    // Prevent context menu on long press for better UX
    document.addEventListener('contextmenu', this.preventContextMenu.bind(this));
  }

  private handleTouchStart(event: TouchEvent): void {
    const touches = Array.from(event.touches);
    this.gestureState.startPoints = touches.map(touch => ({
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
      identifier: touch.identifier
    }));
    
    this.gestureState.currentPoints = [...this.gestureState.startPoints];
    this.gestureState.isActive = true;
    this.gestureState.startTime = Date.now();
    this.gestureState.element = event.target as HTMLElement;

    // Detect potential long press
    setTimeout(() => {
      if (this.gestureState.isActive && this.isLongPress()) {
        this.handleLongPress();
      }
    }, this.config.longPress.timeout);

    // Start gesture tracking
    this.startGestureTracking();
  }

  private handleTouchMove(event: TouchEvent): void {
    if (!this.gestureState.isActive) return;

    const touches = Array.from(event.touches);
    this.gestureState.currentPoints = touches.map(touch => ({
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
      identifier: touch.identifier
    }));

    // Detect gesture type based on touch patterns
    if (touches.length === 1) {
      this.detectSingleTouchGestures(event);
    } else if (touches.length === 2) {
      this.detectMultiTouchGestures(event);
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    if (!this.gestureState.isActive) return;

    const duration = Date.now() - this.gestureState.startTime;
    
    // Handle swipe gestures
    if (this.gestureState.startPoints.length === 1 && !this.gestureState.gestureType) {
      this.handleSwipeEnd(duration);
    }

    // Handle tap gestures
    if (duration < 200 && this.isStationary()) {
      this.handleTap();
    }

    this.resetGestureState();
  }

  private handleTouchCancel(event: TouchEvent): void {
    this.resetGestureState();
  }

  // SINGLE TOUCH GESTURE DETECTION
  private detectSingleTouchGestures(event: TouchEvent): void {
    const startPoint = this.gestureState.startPoints[0];
    const currentPoint = this.gestureState.currentPoints[0];
    
    if (!startPoint || !currentPoint) return;

    const deltaX = currentPoint.x - startPoint.x;
    const deltaY = currentPoint.y - startPoint.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Detect swipe
    if (distance > this.config.swipe.threshold) {
      const swipeData = this.calculateSwipeData(startPoint, currentPoint);
      if (swipeData) {
        this.handleSwipe(swipeData, event);
      }
    }

    // Detect pan/drag
    if (distance > this.config.pan.threshold && !this.gestureState.gestureType) {
      this.handlePan(deltaX, deltaY, event);
    }

    // Handle pull-to-refresh
    if (this.isPullToRefreshContext(event.target as HTMLElement)) {
      this.handlePullToRefresh(deltaY, event);
    }
  }

  // MULTI-TOUCH GESTURE DETECTION
  private detectMultiTouchGestures(event: TouchEvent): void {
    if (this.gestureState.startPoints.length !== 2 || this.gestureState.currentPoints.length !== 2) {
      return;
    }

    const startDistance = this.calculateDistance(
      this.gestureState.startPoints[0],
      this.gestureState.startPoints[1]
    );
    
    const currentDistance = this.calculateDistance(
      this.gestureState.currentPoints[0],
      this.gestureState.currentPoints[1]
    );

    const scale = currentDistance / startDistance;

    if (Math.abs(scale - 1) > this.config.pinch.sensitivity) {
      const pinchData: PinchGestureData = {
        scale,
        center: this.calculateCenter(this.gestureState.currentPoints),
        initialDistance: startDistance,
        currentDistance,
        element: this.gestureState.element!
      };

      this.handlePinch(pinchData, event);
    }
  }

  // GESTURE HANDLERS
  private handleSwipe(swipeData: SwipeGestureData, event: TouchEvent): void {
    this.gestureState.gestureType = 'swipe';
    
    if (this.config.swipe.preventScrolling) {
      event.preventDefault();
    }

    // Context-specific swipe handling
    const element = swipeData.element;
    const context = this.getGestureContext(element);

    switch (context) {
      case 'talent-card':
        this.handleTalentCardSwipe(swipeData);
        break;
      case 'media-gallery':
        this.handleMediaGallerySwipe(swipeData);
        break;
      case 'chat-message':
        this.handleChatMessageSwipe(swipeData);
        break;
      default:
        this.emitGesture('swipe', swipeData);
    }

    hapticFeedback.swipeAction();
  }

  private handlePinch(pinchData: PinchGestureData, event: TouchEvent): void {
    this.gestureState.gestureType = 'pinch';
    
    if (this.config.pinch.preventScrolling) {
      event.preventDefault();
    }

    const element = pinchData.element;
    const context = this.getGestureContext(element);

    switch (context) {
      case 'headshot-viewer':
        this.handleHeadshotPinch(pinchData);
        break;
      case 'media-viewer':
        this.handleMediaPinch(pinchData);
        break;
      default:
        this.emitGesture('pinch', pinchData);
    }

    hapticFeedback.photoZoom();
  }

  private handleLongPress(): void {
    if (!this.gestureState.element) return;

    const longPressData: LongPressGestureData = {
      point: this.gestureState.startPoints[0],
      duration: Date.now() - this.gestureState.startTime,
      element: this.gestureState.element
    };

    const context = this.getGestureContext(this.gestureState.element);

    switch (context) {
      case 'talent-card':
        this.showTalentCardMenu(longPressData);
        break;
      case 'chat-message':
        this.showMessageOptions(longPressData);
        break;
      case 'media-item':
        this.showMediaOptions(longPressData);
        break;
      default:
        this.emitGesture('longPress', longPressData);
    }

    hapticFeedback.longPress();
  }

  private handleTap(): void {
    const tapData = {
      point: this.gestureState.startPoints[0],
      element: this.gestureState.element!,
      timestamp: Date.now()
    };

    // Check for double tap
    const lastTap = (window as any).__lastTap;
    if (lastTap && 
        Date.now() - lastTap.timestamp < this.config.doubleTap.timeout &&
        this.calculateDistance(tapData.point, lastTap.point) < this.config.doubleTap.threshold) {
      
      this.handleDoubleTap(tapData);
      (window as any).__lastTap = null;
    } else {
      (window as any).__lastTap = tapData;
      setTimeout(() => {
        if ((window as any).__lastTap === tapData) {
          this.emitGesture('tap', tapData);
          (window as any).__lastTap = null;
        }
      }, this.config.doubleTap.timeout);
    }

    hapticFeedback.buttonTap();
  }

  private handleDoubleTap(tapData: any): void {
    const context = this.getGestureContext(tapData.element);

    switch (context) {
      case 'talent-card':
        this.openTalentProfile(tapData);
        break;
      case 'media-item':
        this.toggleMediaFullscreen(tapData);
        break;
      default:
        this.emitGesture('doubleTap', tapData);
    }

    hapticFeedback.buttonTap();
  }

  private handlePan(deltaX: number, deltaY: number, event: TouchEvent): void {
    this.gestureState.gestureType = 'pan';

    if (this.config.pan.preventScrolling) {
      event.preventDefault();
    }

    const panData = {
      deltaX,
      deltaY,
      element: this.gestureState.element!,
      velocity: this.calculateVelocity()
    };

    this.emitGesture('pan', panData);
  }

  private handlePullToRefresh(deltaY: number, event: TouchEvent): void {
    if (deltaY > this.config.pullToRefresh.threshold && window.scrollY === 0) {
      this.gestureState.gestureType = 'pullToRefresh';
      
      const refreshData = {
        distance: deltaY,
        threshold: this.config.pullToRefresh.threshold,
        element: this.gestureState.element!
      };

      this.emitGesture('pullToRefresh', refreshData);
      event.preventDefault();
    }
  }

  // CONTEXT-SPECIFIC HANDLERS
  private handleTalentCardSwipe(swipeData: SwipeGestureData): void {
    switch (swipeData.direction) {
      case 'right':
        this.emitGesture('talent:shortlist', { element: swipeData.element });
        hapticFeedback.talentShortlisted();
        break;
      case 'left':
        this.emitGesture('talent:pass', { element: swipeData.element });
        hapticFeedback.swipeAction();
        break;
      case 'up':
        this.emitGesture('talent:quickView', { element: swipeData.element });
        break;
    }
  }

  private handleMediaGallerySwipe(swipeData: SwipeGestureData): void {
    switch (swipeData.direction) {
      case 'left':
        this.emitGesture('media:next', { element: swipeData.element });
        hapticFeedback.gallerySwipe();
        break;
      case 'right':
        this.emitGesture('media:previous', { element: swipeData.element });
        hapticFeedback.gallerySwipe();
        break;
    }
  }

  private handleChatMessageSwipe(swipeData: SwipeGestureData): void {
    if (swipeData.direction === 'left') {
      this.emitGesture('chat:reply', { element: swipeData.element });
    } else if (swipeData.direction === 'right') {
      this.emitGesture('chat:options', { element: swipeData.element });
    }
  }

  private handleHeadshotPinch(pinchData: PinchGestureData): void {
    this.emitGesture('headshot:zoom', {
      ...pinchData,
      action: pinchData.scale > 1 ? 'zoomIn' : 'zoomOut'
    });
  }

  private handleMediaPinch(pinchData: PinchGestureData): void {
    this.emitGesture('media:zoom', {
      ...pinchData,
      action: pinchData.scale > 1 ? 'zoomIn' : 'zoomOut'
    });
  }

  private showTalentCardMenu(longPressData: LongPressGestureData): void {
    this.emitGesture('talent:showMenu', {
      element: longPressData.element,
      point: longPressData.point,
      options: ['View Profile', 'Start Chat', 'Schedule Audition', 'Add Note']
    });
  }

  private showMessageOptions(longPressData: LongPressGestureData): void {
    this.emitGesture('chat:showOptions', {
      element: longPressData.element,
      point: longPressData.point,
      options: ['Reply', 'Forward', 'Copy', 'Delete']
    });
  }

  private showMediaOptions(longPressData: LongPressGestureData): void {
    this.emitGesture('media:showOptions', {
      element: longPressData.element,
      point: longPressData.point,
      options: ['Download', 'Share', 'View Full Size', 'Add to Portfolio']
    });
  }

  private openTalentProfile(tapData: any): void {
    this.emitGesture('talent:openProfile', { element: tapData.element });
  }

  private toggleMediaFullscreen(tapData: any): void {
    this.emitGesture('media:toggleFullscreen', { element: tapData.element });
  }

  // UTILITY METHODS
  private calculateSwipeData(startPoint: TouchPoint, endPoint: TouchPoint): SwipeGestureData | null {
    const deltaX = endPoint.x - startPoint.x;
    const deltaY = endPoint.y - startPoint.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = endPoint.timestamp - startPoint.timestamp;
    
    if (distance < this.config.swipe.threshold || duration > this.config.swipe.timeout) {
      return null;
    }

    const velocity = distance / duration;
    const angle = Math.atan2(Math.abs(deltaY), Math.abs(deltaX)) * (180 / Math.PI);
    
    let direction: 'left' | 'right' | 'up' | 'down';
    
    if (angle < 45) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    return {
      direction,
      distance,
      velocity,
      duration,
      element: this.gestureState.element!
    };
  }

  private calculateDistance(point1: TouchPoint, point2: TouchPoint): number {
    const deltaX = point1.x - point2.x;
    const deltaY = point1.y - point2.y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }

  private calculateCenter(points: TouchPoint[]): { x: number; y: number } {
    const sum = points.reduce((acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y
    }), { x: 0, y: 0 });

    return {
      x: sum.x / points.length,
      y: sum.y / points.length
    };
  }

  private calculateVelocity(): number {
    if (this.gestureState.startPoints.length === 0 || this.gestureState.currentPoints.length === 0) {
      return 0;
    }

    const startPoint = this.gestureState.startPoints[0];
    const currentPoint = this.gestureState.currentPoints[0];
    const distance = this.calculateDistance(startPoint, currentPoint);
    const duration = currentPoint.timestamp - startPoint.timestamp;

    return duration > 0 ? distance / duration : 0;
  }

  private isLongPress(): boolean {
    if (this.gestureState.startPoints.length === 0 || this.gestureState.currentPoints.length === 0) {
      return false;
    }

    const distance = this.calculateDistance(
      this.gestureState.startPoints[0],
      this.gestureState.currentPoints[0]
    );

    return distance < this.config.longPress.threshold;
  }

  private isStationary(): boolean {
    if (this.gestureState.startPoints.length === 0 || this.gestureState.currentPoints.length === 0) {
      return true;
    }

    const distance = this.calculateDistance(
      this.gestureState.startPoints[0],
      this.gestureState.currentPoints[0]
    );

    return distance < 10; // 10px threshold for tap
  }

  private getGestureContext(element: HTMLElement): string {
    // Check data attributes
    const context = element.getAttribute('data-gesture-context');
    if (context) return context;

    // Check class names
    if (element.classList.contains('talent-card')) return 'talent-card';
    if (element.classList.contains('media-gallery')) return 'media-gallery';
    if (element.classList.contains('chat-message')) return 'chat-message';
    if (element.classList.contains('headshot-viewer')) return 'headshot-viewer';
    if (element.classList.contains('media-viewer')) return 'media-viewer';
    if (element.classList.contains('media-item')) return 'media-item';

    // Check parent elements
    const parentContext = element.closest('[data-gesture-context]');
    if (parentContext) {
      return parentContext.getAttribute('data-gesture-context')!;
    }

    return 'default';
  }

  private isPullToRefreshContext(element: HTMLElement): boolean {
    return element.closest('[data-pull-to-refresh="true"]') !== null ||
           element.classList.contains('pull-to-refresh-container');
  }

  private startGestureTracking(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    const track = () => {
      if (this.gestureState.isActive) {
        // Continuous gesture tracking logic here
        this.rafId = requestAnimationFrame(track);
      }
    };

    this.rafId = requestAnimationFrame(track);
  }

  private resetGestureState(): void {
    this.gestureState = {
      isActive: false,
      startPoints: [],
      currentPoints: [],
      gestureType: null,
      startTime: 0,
      element: null
    };

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private preventContextMenu(event: Event): void {
    if (this.gestureState.gestureType === 'longPress') {
      event.preventDefault();
    }
  }

  // POINTER EVENT HANDLERS (for broader device support)
  private handlePointerDown(event: PointerEvent): void {
    // Convert to touch-like event and delegate
    const touchEvent = this.pointerToTouchEvent(event, 'touchstart');
    this.handleTouchStart(touchEvent);
  }

  private handlePointerMove(event: PointerEvent): void {
    const touchEvent = this.pointerToTouchEvent(event, 'touchmove');
    this.handleTouchMove(touchEvent);
  }

  private handlePointerUp(event: PointerEvent): void {
    const touchEvent = this.pointerToTouchEvent(event, 'touchend');
    this.handleTouchEnd(touchEvent);
  }

  private handlePointerCancel(event: PointerEvent): void {
    this.resetGestureState();
  }

  private pointerToTouchEvent(pointerEvent: PointerEvent, type: string): TouchEvent {
    const touch = {
      clientX: pointerEvent.clientX,
      clientY: pointerEvent.clientY,
      identifier: pointerEvent.pointerId
    };

    return {
      ...pointerEvent,
      type,
      touches: [touch],
      targetTouches: [touch],
      changedTouches: [touch]
    } as any;
  }

  // EVENT SYSTEM
  private emitGesture(type: string, data: any): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }

    // Also emit as DOM event
    document.dispatchEvent(new CustomEvent(`castmatch:gesture:${type}`, {
      detail: data
    }));
  }

  // PUBLIC API
  public on(gestureType: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(gestureType)) {
      this.eventListeners.set(gestureType, new Set());
    }
    this.eventListeners.get(gestureType)!.add(callback);
  }

  public off(gestureType: string, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(gestureType);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  public updateConfig(gestureType: string, config: Partial<GestureConfig>): void {
    if (this.config[gestureType]) {
      this.config[gestureType] = { ...this.config[gestureType], ...config };
    }
  }

  public getConfig(gestureType: string): GestureConfig | undefined {
    return this.config[gestureType];
  }

  public isGestureActive(): boolean {
    return this.gestureState.isActive;
  }

  public getCurrentGesture(): string | null {
    return this.gestureState.gestureType;
  }
}

// Export singleton instance
export const touchGestures = new TouchGestureSystem();

// Export React hook
export function useTouchGestures() {
  return {
    gestures: touchGestures,
    isActive: touchGestures.isGestureActive(),
    currentGesture: touchGestures.getCurrentGesture(),
    on: (type: string, callback: (data: any) => void) => touchGestures.on(type, callback),
    off: (type: string, callback: (data: any) => void) => touchGestures.off(type, callback),
    updateConfig: (type: string, config: Partial<GestureConfig>) => touchGestures.updateConfig(type, config)
  };
}