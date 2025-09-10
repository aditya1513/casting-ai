# CastMatch Motion Design System - Component API Reference

## Core Animation Components

### EnhancedMessageBubble

Professional chat interface with cinematic animations and interactive elements.

```tsx
interface EnhancedMessageBubbleProps {
  message: {
    id: string
    content: string
    sender: {
      id: string
      name: string
      avatar?: string
      role?: string
    }
    createdAt: string
    read: boolean
    type: 'user' | 'ai' | 'system'
    metadata?: any
    isStreaming?: boolean
  }
  index: number
  isLatest?: boolean
}

<EnhancedMessageBubble
  message={message}
  index={0}
  isLatest={true}
/>
```

**Features:**
- Staggered entrance animations based on index
- Avatar animations with role-based styling
- Sparkle effects for AI messages
- Streaming text support
- Hover interactions with enhanced status display

---

### CinematicTypingIndicator

Advanced typing indicator with multiple visual variants and particle effects.

```tsx
interface CinematicTypingIndicatorProps {
  users: Array<{
    userId: string
    userName: string
    conversationId: string
    type?: 'user' | 'ai'
    avatar?: string
  }>
  variant?: 'standard' | 'cinematic' | 'minimal'
  showParticles?: boolean
}

<CinematicTypingIndicator
  users={typingUsers}
  variant="cinematic"
  showParticles={true}
/>
```

**Variants:**
- `standard`: Clean bubble with animated dots
- `cinematic`: Full theatrical experience with effects
- `minimal`: Subtle indicator for space-constrained areas

---

### StreamingTextAnimation

Realistic typewriter effect with natural timing and sound support.

```tsx
interface StreamingTextAnimationProps {
  text: string
  speed?: number // Characters per second
  onComplete?: () => void
  showCursor?: boolean
  variant?: 'typewriter' | 'fade-in' | 'slide-in' | 'cinematic'
  enableSound?: boolean
}

<StreamingTextAnimation
  text="Finding perfect talent matches..."
  speed={30}
  variant="cinematic"
  showCursor={true}
  enableSound={false}
  onComplete={() => console.log('Animation complete')}
/>
```

**Hook Alternative:**
```tsx
const {
  streamedText,
  isStreaming,
  isComplete,
  startStreaming,
  stopStreaming,
  resetStreaming,
  progress
} = useStreamingText(fullText, {
  speed: 30,
  pauseOnPunctuation: true,
  enableSound: false,
  onWordComplete: (word, index) => console.log(`Word ${index}: ${word}`)
})
```

## Page Transition Components

### PageTransition

Smooth page transitions with multiple cinematic variants.

```tsx
interface PageTransitionProps {
  children: ReactNode
  variant?: TransitionVariant
  duration?: number
  easing?: string
  className?: string
}

type TransitionVariant = 
  | 'fade' | 'slide' | 'scale' | 'rotate' 
  | 'curtain' | 'morph' | 'cinema' | 'spotlight'
  | 'iris' | 'filmStrip'

<PageTransition variant="cinema" className="min-h-screen">
  {children}
</PageTransition>
```

**Pre-built Variants:**
```tsx
// Quick access components
<FadePageTransition>{children}</FadePageTransition>
<SlidePageTransition>{children}</SlidePageTransition>
<CinemaPageTransition>{children}</CinemaPageTransition>
<SpotlightPageTransition>{children}</SpotlightPageTransition>
```

---

### AdvancedPageTransition

Enhanced transition wrapper with loading states and progress tracking.

```tsx
interface AdvancedPageTransitionProps {
  children: ReactNode
  variant?: TransitionVariant
  showLoadingState?: boolean
  loadingComponent?: ReactNode
  isLoading?: boolean
  onTransitionComplete?: () => void
  className?: string
}

<AdvancedPageTransition
  variant="cinema"
  showLoadingState={true}
  isLoading={pageLoading}
  onTransitionComplete={() => console.log('Transition complete')}
>
  {children}
</AdvancedPageTransition>
```

---

### CinematicModal

Professional modal system with theatrical entrance effects.

```tsx
interface CinematicModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  variant?: ModalVariant
  overlay?: boolean
  closeOnOverlayClick?: boolean
  showCloseButton?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

type ModalVariant = 
  | 'scale' | 'slide' | 'curtain' | 'iris' 
  | 'spotlight' | 'theater' | 'dissolve' | 'zoom'

<CinematicModal
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  variant="theater"
  size="lg"
>
  <div className="p-6">
    <h2>Modal Content</h2>
    <p>Your content here...</p>
  </div>
</CinematicModal>
```

**Pre-built Modal Types:**
```tsx
// Alert Modal
<CinematicAlert
  isOpen={alertOpen}
  onClose={() => setAlertOpen(false)}
  title="Success!"
  message="Your application has been submitted."
  variant="scale"
/>

// Confirmation Modal
<CinematicConfirm
  isOpen={confirmOpen}
  onClose={() => setConfirmOpen(false)}
  onConfirm={handleConfirm}
  title="Delete Item?"
  message="This action cannot be undone."
  variant="theater"
  confirmText="Delete"
  cancelText="Cancel"
/>
```

## Interactive Components

### InteractiveButton

Premium button component with advanced hover effects and animations.

```tsx
interface InteractiveButtonProps {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  effect?: ButtonEffect
  loading?: boolean
  disabled?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  className?: string
  onClick?: () => void
}

type ButtonVariant = 
  | 'primary' | 'secondary' | 'outline' | 'ghost' 
  | 'destructive' | 'premium' | 'cinematic'

type ButtonEffect = 
  | 'none' | 'ripple' | 'glow' | 'particles' 
  | 'magnetic' | 'premium' | 'cinematic'

<InteractiveButton
  variant="premium"
  effect="particles"
  size="lg"
  icon={<Star />}
  iconPosition="left"
  loading={isSubmitting}
  onClick={handleSubmit}
>
  Submit Application
</InteractiveButton>
```

**Pre-built Button Variants:**
```tsx
<PrimaryButton onClick={handleClick}>Primary Action</PrimaryButton>
<SecondaryButton onClick={handleClick}>Secondary</SecondaryButton>
<PremiumButton onClick={handleClick}>Premium Feature</PremiumButton>
<CinematicButton onClick={handleClick}>Cinematic</CinematicButton>
<MagneticButton onClick={handleClick}>Magnetic Hover</MagneticButton>
```

---

### AnimatedInput

Enhanced input field with floating labels and validation animations.

```tsx
interface AnimatedInputProps {
  label: string
  type?: 'text' | 'email' | 'password' | 'search' | 'number'
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  success?: boolean
  disabled?: boolean
  required?: boolean
  icon?: ReactNode
  className?: string
}

<AnimatedInput
  label="Email Address"
  type="email"
  value={email}
  onChange={setEmail}
  error={emailError}
  success={emailValid}
  required={true}
  icon={<Mail />}
/>
```

---

### AnimatedSelect

Dropdown selector with smooth animations and search functionality.

```tsx
interface AnimatedSelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{
    value: string
    label: string
    icon?: ReactNode
  }>
  placeholder?: string
  error?: string
  disabled?: boolean
  className?: string
}

<AnimatedSelect
  label="Select Role"
  value={selectedRole}
  onChange={setSelectedRole}
  options={[
    { value: 'actor', label: 'Actor', icon: <User /> },
    { value: 'director', label: 'Director', icon: <Camera /> },
    { value: 'producer', label: 'Producer', icon: <Film /> }
  ]}
  error={roleError}
/>
```

---

### AnimatedSearch

Advanced search component with suggestions and real-time filtering.

```tsx
interface AnimatedSearchProps {
  value: string
  onChange: (value: string) => void
  onSearch?: (value: string) => void
  placeholder?: string
  suggestions?: string[]
  loading?: boolean
  className?: string
}

<AnimatedSearch
  value={searchQuery}
  onChange={setSearchQuery}
  onSearch={performSearch}
  placeholder="Search for talent..."
  suggestions={searchSuggestions}
  loading={isSearching}
/>
```

## Advanced Effects

### ParticleSystem

Configurable particle system with multiple effect types.

```tsx
interface ParticleSystemProps {
  type?: ParticleType
  count?: number
  continuous?: boolean
  trigger?: boolean
  width?: number
  height?: number
  colors?: string[]
  speed?: number
  size?: { min: number; max: number }
  life?: { min: number; max: number }
  gravity?: number
  wind?: number
  className?: string
}

type ParticleType = 
  | 'sparkles' | 'confetti' | 'stars' | 'magic'
  | 'smoke' | 'fire' | 'snow' | 'bubbles'

<ParticleSystem
  type="magic"
  count={30}
  continuous={true}
  colors={['#8B5CF6', '#A855F7', '#C084FC']}
  size={{ min: 2, max: 6 }}
  life={{ min: 1500, max: 3000 }}
/>
```

**Pre-built Effects:**
```tsx
<SparkleEffect trigger={showSparkles} />
<ConfettiEffect trigger={celebrate} />
<MagicEffect continuous={true} />
<BubbleEffect continuous={true} />

// Hook for triggering effects
const { trigger, triggerEffect } = useParticleEffect('sparkles')
```

---

### CinematicLoader

Professional loading animations with multiple variants.

```tsx
interface CinematicLoaderProps {
  variant?: LoaderVariant
  message?: string
  progress?: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showProgress?: boolean
  className?: string
}

type LoaderVariant = 
  | 'filmReel' | 'spotlight' | 'cameraShutter' | 'countdown'
  | 'premiere' | 'director' | 'redCarpet' | 'actionClap'

<CinematicLoader
  variant="filmReel"
  message="Loading your cinematic experience..."
  progress={loadingProgress}
  size="lg"
  showProgress={true}
/>
```

**Full-screen Loading:**
```tsx
<CinematicLoadingOverlay
  isLoading={pageLoading}
  variant="spotlight"
  message="Discovering perfect talent matches..."
  progress={loadingProgress}
  showProgress={true}
/>
```

**Loading State Hook:**
```tsx
const {
  isLoading,
  message,
  progress,
  startLoading,
  updateProgress,
  finishLoading,
  setMessage,
} = useCinematicLoading('Initial message...')

// Usage
startLoading('Searching for talent...')
updateProgress(50, 'Analyzing profiles...')
finishLoading(500) // 500ms delay before hiding
```

## Performance and Monitoring

### Performance Monitoring

```tsx
import { 
  performanceMonitor, 
  useAnimationPerformance,
  getDevicePerformanceLevel 
} from '@/components/motion/Performance_Reports/performance-monitor'

// Component-level monitoring
function AnimatedComponent() {
  const { startProfiling, stopProfiling, getReport } = 
    useAnimationPerformance('ComponentName', 'AnimationType')
  
  useEffect(() => {
    const profileId = startProfiling()
    return () => {
      stopProfiling()
      const report = getReport()
      console.log('Performance Report:', report)
    }
  }, [])
}

// Device optimization
const performanceLevel = getDevicePerformanceLevel() // 'low' | 'medium' | 'high'

// Global performance summary
const summary = performanceMonitor.getPerformanceSummary()
```

### Animation Tokens

Core animation system with consistent timing and easing.

```tsx
import { 
  duration, 
  easing, 
  spring, 
  variants, 
  colors 
} from '@/components/motion/Animation_Library/core/animation-tokens'

// Duration tokens (milliseconds)
duration.instant  // 0ms
duration.micro    // 50ms
duration.fast     // 150ms
duration.base     // 250ms
duration.smooth   // 350ms
duration.cinematic // 500ms
duration.dramatic // 750ms
duration.epic     // 1000ms

// Easing curves
easing.entrance   // Smooth entrance
easing.exit      // Quick exit
easing.bounce    // Playful bounce
easing.dramatic  // Dramatic ease
easing.cinematic // Cinema-like
easing.organic   // Organic motion

// Spring configurations
spring.gentle    // Gentle spring
spring.bouncy    // Bouncy spring
spring.snappy    // Snappy response
spring.dramatic  // Dramatic spring
spring.cinematic // Cinematic spring

// Pre-built variants
variants.fadeIn
variants.fadeInUp
variants.scaleIn
variants.slideInLeft
variants.container
variants.listItem
```

## Utility Functions and Hooks

### Animation Utilities

```tsx
import { 
  createStaggeredAnimation,
  createScrollTrigger,
  createGestureHandler,
  createKeyframes,
  createParticleSystem,
  getAdaptiveConfig,
  useAdaptiveAnimation
} from '@/components/motion/Animation_Library/core/animation-utils'

// Staggered animations
const staggeredItems = createStaggeredAnimation(
  itemCount, 
  100, // base delay
  'center' // direction: 'forward' | 'reverse' | 'center'
)

// Scroll-triggered animations
const scrollObserver = createScrollTrigger(
  (entry) => {
    if (entry.isIntersecting) {
      // Trigger animation
    }
  },
  { threshold: 0.1, rootMargin: '0px 0px -10% 0px' }
)

// Gesture handling
const gestureHandler = createGestureHandler()

// Adaptive animation based on device
const { shouldReduceMotion, enableComplexAnimations } = useAdaptiveAnimation()
```

### Route Transitions

```tsx
import { useRouteTransition } from '@/components/motion/Animation_Library/transitions/page-transitions'

function Navigation() {
  const { isTransitioning, navigateWithTransition } = useRouteTransition('cinema')
  
  const handleNavigation = (href: string) => {
    navigateWithTransition(href, 300) // 300ms delay
  }
  
  return (
    <nav>
      <button onClick={() => handleNavigation('/dashboard')}>
        Dashboard
      </button>
    </nav>
  )
}
```

## Integration Patterns

### Complete Chat Interface

```tsx
import { 
  EnhancedMessageBubble,
  CinematicTypingIndicator,
  StreamingTextAnimation,
  AnimatedInput,
  InteractiveButton
} from '@/components/motion/Animation_Library'

function ChatInterface() {
  return (
    <div className="chat-container">
      {/* Messages */}
      <AnimatePresence mode="wait">
        {messages.map((message, index) => (
          <EnhancedMessageBubble
            key={message.id}
            message={message}
            index={index}
            isLatest={index === messages.length - 1}
          />
        ))}
      </AnimatePresence>
      
      {/* Typing Indicator */}
      <CinematicTypingIndicator
        users={typingUsers}
        variant="cinematic"
        showParticles={true}
      />
      
      {/* Input Area */}
      <div className="flex gap-2">
        <AnimatedInput
          label="Type your message..."
          value={inputValue}
          onChange={setInputValue}
          className="flex-1"
        />
        <InteractiveButton
          variant="primary"
          effect="glow"
          onClick={sendMessage}
          disabled={!inputValue.trim()}
        >
          Send
        </InteractiveButton>
      </div>
    </div>
  )
}
```

### Form with Validation

```tsx
function ContactForm() {
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  
  return (
    <form onSubmit={handleSubmit}>
      <AnimatedInput
        label="Full Name"
        value={formData.name}
        onChange={(value) => updateField('name', value)}
        error={errors.name}
        required
      />
      
      <AnimatedSelect
        label="Role"
        value={formData.role}
        onChange={(value) => updateField('role', value)}
        options={roleOptions}
        error={errors.role}
      />
      
      <InteractiveButton
        type="submit"
        variant="premium"
        effect="particles"
        loading={loading}
        fullWidth
      >
        Submit Application
      </InteractiveButton>
    </form>
  )
}
```

## Customization Guide

### Creating Custom Variants

```tsx
// Custom page transition
const customTransitionVariants = {
  initial: { 
    opacity: 0,
    scale: 0.8,
    rotateY: 90
  },
  in: { 
    opacity: 1,
    scale: 1,
    rotateY: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20
    }
  },
  out: { 
    opacity: 0,
    scale: 1.1,
    rotateY: -90,
    transition: {
      duration: 0.3,
      ease: "easeInOut"
    }
  }
}

// Custom button effect
const customButtonEffect = {
  hover: {
    scale: 1.05,
    boxShadow: "0 0 25px rgba(139, 92, 246, 0.5)",
    background: "linear-gradient(45deg, #8B5CF6, #EC4899)",
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  }
}
```

### Extending Animation Tokens

```tsx
// custom-tokens.ts
import { duration, easing } from '@/components/motion/Animation_Library/core/animation-tokens'

export const customDuration = {
  ...duration,
  brandSlow: 800,
  brandFast: 120,
}

export const customEasing = {
  ...easing,
  brandEnter: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  brandExit: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
}

export const brandColors = {
  primary: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)',
  secondary: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  accent: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
}
```

This comprehensive API reference provides detailed information about all components, their props, usage patterns, and customization options in the CastMatch Motion Design System.