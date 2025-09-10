# CastMatch Design Patterns & Best Practices

## Version 1.0.0

### Table of Contents
1. [Layout Patterns](#layout-patterns)
2. [Interaction Patterns](#interaction-patterns)
3. [Navigation Patterns](#navigation-patterns)
4. [Form Patterns](#form-patterns)
5. [Data Visualization Patterns](#data-visualization-patterns)
6. [Responsive Patterns](#responsive-patterns)
7. [Animation Patterns](#animation-patterns)
8. [Mumbai Entertainment Patterns](#mumbai-entertainment-patterns)

---

## Layout Patterns

### Bento Grid Layout

**Purpose**: Modern, asymmetric grid system for dashboard and content organization

**Implementation**:
```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  padding: 24px;
}

.bento-item {
  border-radius: 16px;
  background: oklch(98.5% 0.002 110);
  padding: 24px;
  box-shadow: 0 4px 6px -1px oklch(0% 0 0 / 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.bento-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px oklch(0% 0 0 / 0.1);
}

/* Feature sizes */
.bento-item--large { grid-column: span 2; grid-row: span 2; }
.bento-item--wide { grid-column: span 2; }
.bento-item--tall { grid-row: span 2; }
```

**React Implementation**:
```tsx
const BentoGrid: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 auto-rows-[200px]">
      {React.Children.map(children, (child, index) => {
        const sizes = ['', 'lg:col-span-2 lg:row-span-2', 'lg:col-span-2', 'lg:row-span-2'];
        const size = sizes[index % sizes.length];
        return (
          <div className={`rounded-2xl bg-white p-6 shadow-md hover:shadow-xl transition-all ${size}`}>
            {child}
          </div>
        );
      })}
    </div>
  );
};
```

### Holy Grail Layout

**Purpose**: Classic layout with header, footer, main content, and sidebars

**Implementation**:
```tsx
const HolyGrailLayout: React.FC = ({ header, footer, sidebar, aside, main }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-16 bg-white border-b sticky top-0 z-40">
        {header}
      </header>
      <div className="flex-1 flex">
        <aside className="w-64 bg-[oklch(96.8%_0.003_110)] border-r hidden lg:block">
          {sidebar}
        </aside>
        <main className="flex-1 p-6 overflow-auto">
          {main}
        </main>
        <aside className="w-80 bg-[oklch(96.8%_0.003_110)] border-l hidden xl:block">
          {aside}
        </aside>
      </div>
      <footer className="h-20 bg-[oklch(18.2%_0.024_110)] text-white">
        {footer}
      </footer>
    </div>
  );
};
```

### Magazine Layout

**Purpose**: Content-heavy pages with featured articles and grid structure

**Implementation**:
```tsx
const MagazineLayout: React.FC = ({ featured, articles }) => {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Featured Article */}
      <div className="mb-12 relative rounded-2xl overflow-hidden h-[500px]">
        <img src={featured.image} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 p-8 text-white">
          <span className="text-[oklch(68.5%_0.175_96)] font-semibold mb-2 block">
            {featured.category}
          </span>
          <h1 className="text-5xl font-['Playfair_Display'] mb-4">{featured.title}</h1>
          <p className="text-xl opacity-90 max-w-3xl">{featured.excerpt}</p>
        </div>
      </div>

      {/* Article Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {articles.map((article, index) => (
          <article key={index} className="group cursor-pointer">
            <div className="aspect-video rounded-lg overflow-hidden mb-4">
              <img 
                src={article.image} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <span className="text-[oklch(68.5%_0.175_96)] text-sm font-semibold">
              {article.category}
            </span>
            <h3 className="text-xl font-['Playfair_Display'] mt-2 mb-2 group-hover:text-[oklch(68.5%_0.175_96)] transition-colors">
              {article.title}
            </h3>
            <p className="text-[oklch(62.8%_0.015_110)]">{article.excerpt}</p>
          </article>
        ))}
      </div>
    </div>
  );
};
```

---

## Interaction Patterns

### Progressive Disclosure

**Purpose**: Reveal information gradually to reduce cognitive load

**Implementation**:
```tsx
const ProgressiveDisclosure: React.FC = ({ summary, details, advanced }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-4">
      <div className="p-4 bg-white rounded-lg">
        <p>{summary}</p>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-[oklch(68.5%_0.175_96)] hover:text-[oklch(61.2%_0.165_96)] mt-2"
        >
          {showDetails ? 'Show Less' : 'Show More'}
        </button>
      </div>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-[oklch(96.8%_0.003_110)] rounded-lg">
              <p>{details}</p>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[oklch(58.8%_0.195_25)] hover:text-[oklch(48.5%_0.185_25)] mt-2"
              >
                Advanced Options
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-[oklch(93.5%_0.005_110)] rounded-lg border-l-4 border-[oklch(58.8%_0.195_25)]"
          >
            {advanced}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
```

### Optimistic UI Updates

**Purpose**: Immediate feedback for better perceived performance

**Implementation**:
```tsx
const useOptimisticUpdate = <T,>(
  initialData: T,
  updateFn: (data: T) => Promise<T>
) => {
  const [data, setData] = useState(initialData);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(async (newData: T) => {
    setIsUpdating(true);
    setError(null);
    
    // Optimistic update
    const previousData = data;
    setData(newData);

    try {
      const result = await updateFn(newData);
      setData(result);
    } catch (err) {
      // Rollback on error
      setData(previousData);
      setError(err as Error);
      toast.error('Update failed. Changes have been reverted.');
    } finally {
      setIsUpdating(false);
    }
  }, [data, updateFn]);

  return { data, update, isUpdating, error };
};

// Usage example
const TalentProfile: React.FC = () => {
  const { data: profile, update } = useOptimisticUpdate(
    initialProfile,
    async (data) => api.updateProfile(data)
  );

  return (
    <div className="space-y-4">
      <input
        value={profile.name}
        onChange={(e) => update({ ...profile, name: e.target.value })}
        className="w-full p-2 border rounded"
      />
      {/* Instant UI update with background save */}
    </div>
  );
};
```

### Skeleton Loading

**Purpose**: Provide visual feedback during data loading

**Implementation**:
```tsx
const SkeletonCard: React.FC = () => {
  return (
    <div className="animate-pulse">
      <div className="h-48 bg-[oklch(93.5%_0.005_110)] rounded-t-lg" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-[oklch(93.5%_0.005_110)] rounded w-3/4" />
        <div className="h-4 bg-[oklch(93.5%_0.005_110)] rounded" />
        <div className="h-4 bg-[oklch(93.5%_0.005_110)] rounded w-5/6" />
      </div>
    </div>
  );
};

const ContentLoader: React.FC<{ loading: boolean; children: ReactNode }> = ({
  loading,
  children
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }
  return <>{children}</>;
};
```

---

## Navigation Patterns

### Breadcrumb Navigation

**Purpose**: Show user's location in site hierarchy

**Implementation**:
```tsx
interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactNode;
}

const Breadcrumbs: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-sm">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span className="text-[oklch(62.8%_0.015_110)]">/</span>
          )}
          {item.href && index < items.length - 1 ? (
            <a
              href={item.href}
              className="text-[oklch(68.5%_0.175_96)] hover:text-[oklch(61.2%_0.165_96)] transition-colors flex items-center gap-1"
            >
              {item.icon}
              {item.label}
            </a>
          ) : (
            <span className="text-[oklch(28.5%_0.022_110)] font-medium flex items-center gap-1">
              {item.icon}
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
```

### Tab Navigation with Indicators

**Purpose**: Switch between related content sections

**Implementation**:
```tsx
const TabNavigation: React.FC = ({ tabs, activeTab, onChange }) => {
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const activeTabElement = tabRefs.current[activeTab];
    if (activeTabElement) {
      setIndicatorStyle({
        width: activeTabElement.offsetWidth,
        transform: `translateX(${activeTabElement.offsetLeft}px)`
      });
    }
  }, [activeTab]);

  return (
    <div className="relative">
      <div className="flex space-x-1 border-b border-[oklch(88.2%_0.008_110)]">
        {tabs.map((tab, index) => (
          <button
            key={index}
            ref={(el) => (tabRefs.current[index] = el)}
            onClick={() => onChange(index)}
            className={cn(
              'px-4 py-2 font-medium transition-colors relative z-10',
              activeTab === index
                ? 'text-[oklch(68.5%_0.175_96)]'
                : 'text-[oklch(62.8%_0.015_110)] hover:text-[oklch(28.5%_0.022_110)]'
            )}
          >
            {tab.label}
            {tab.badge && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-[oklch(68.5%_0.175_96)] text-white rounded-full">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      <div
        className="absolute bottom-0 h-0.5 bg-[oklch(68.5%_0.175_96)] transition-all duration-300"
        style={indicatorStyle}
      />
    </div>
  );
};
```

---

## Form Patterns

### Multi-Step Form Wizard

**Purpose**: Break complex forms into manageable steps

**Implementation**:
```tsx
interface FormStep {
  id: string;
  title: string;
  component: React.ComponentType<any>;
  validation?: (data: any) => boolean;
}

const FormWizard: React.FC<{ steps: FormStep[] }> = ({ steps }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const handleNext = () => {
    const step = steps[currentStep];
    if (step.validation && !step.validation(formData)) {
      toast.error('Please complete all required fields');
      return;
    }
    
    setCompletedSteps([...completedSteps, currentStep]);
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step Indicator */}
      <div className="flex justify-between mb-8">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors',
                index === currentStep
                  ? 'bg-[oklch(68.5%_0.175_96)] text-white'
                  : completedSteps.includes(index)
                  ? 'bg-[oklch(68.5%_0.165_142)] text-white'
                  : 'bg-[oklch(93.5%_0.005_110)] text-[oklch(62.8%_0.015_110)]'
              )}
            >
              {completedSteps.includes(index) ? '✓' : index + 1}
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'w-24 h-0.5 transition-colors',
                  completedSteps.includes(index)
                    ? 'bg-[oklch(68.5%_0.165_142)]'
                    : 'bg-[oklch(93.5%_0.005_110)]'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl p-8 shadow-lg">
        <h2 className="text-2xl font-['Playfair_Display'] mb-6">
          {steps[currentStep].title}
        </h2>
        <CurrentStepComponent
          data={formData}
          onChange={(data: any) => setFormData({ ...formData, ...data })}
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          className={cn(
            'px-6 py-2 rounded-lg transition-colors',
            currentStep === 0
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-white border border-[oklch(88.2%_0.008_110)] hover:bg-[oklch(96.8%_0.003_110)]'
          )}
        >
          Previous
        </button>
        <button
          onClick={handleNext}
          className="px-6 py-2 bg-[oklch(68.5%_0.175_96)] text-white rounded-lg hover:bg-[oklch(61.2%_0.165_96)] transition-colors"
        >
          {currentStep === steps.length - 1 ? 'Submit' : 'Next'}
        </button>
      </div>
    </div>
  );
};
```

### Inline Validation

**Purpose**: Provide immediate feedback on form input

**Implementation**:
```tsx
const useFieldValidation = (value: string, rules: ValidationRule[]) => {
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validate = useCallback(async () => {
    setIsValidating(true);
    
    for (const rule of rules) {
      const result = await rule.validate(value);
      if (!result.valid) {
        setError(result.message);
        setIsValidating(false);
        return false;
      }
    }
    
    setError(null);
    setIsValidating(false);
    return true;
  }, [value, rules]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (value) validate();
    }, 500); // Debounce validation

    return () => clearTimeout(timer);
  }, [value, validate]);

  return { error, isValidating };
};

const ValidatedInput: React.FC<{ rules: ValidationRule[] }> = ({ rules, ...props }) => {
  const [value, setValue] = useState('');
  const { error, isValidating } = useFieldValidation(value, rules);

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={cn(
          'w-full px-4 py-2 pr-10 border rounded-lg transition-colors',
          error ? 'border-[oklch(58.5%_0.195_25)]' : 'border-[oklch(88.2%_0.008_110)]'
        )}
        {...props}
      />
      <div className="absolute right-3 top-3">
        {isValidating && <Spinner size="sm" />}
        {!isValidating && value && !error && (
          <span className="text-[oklch(68.5%_0.165_142)]">✓</span>
        )}
        {!isValidating && error && (
          <span className="text-[oklch(58.5%_0.195_25)]">✗</span>
        )}
      </div>
      {error && (
        <p className="text-sm text-[oklch(58.5%_0.195_25)] mt-1">{error}</p>
      )}
    </div>
  );
};
```

---

## Data Visualization Patterns

### Stat Cards with Trends

**Purpose**: Display key metrics with visual indicators

**Implementation**:
```tsx
interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  trend: number[]; // Array of values for sparkline
  icon: ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, trend, icon }) => {
  const isPositive = change >= 0;
  
  return (
    <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-[oklch(68.5%_0.175_96)]/10 rounded-lg">
          {icon}
        </div>
        <span className={cn(
          'text-sm font-semibold px-2 py-1 rounded',
          isPositive
            ? 'bg-[oklch(68.5%_0.165_142)]/10 text-[oklch(68.5%_0.165_142)]'
            : 'bg-[oklch(58.5%_0.195_25)]/10 text-[oklch(58.5%_0.195_25)]'
        )}>
          {isPositive ? '↑' : '↓'} {Math.abs(change)}%
        </span>
      </div>
      <h3 className="text-[oklch(62.8%_0.015_110)] text-sm mb-1">{title}</h3>
      <p className="text-3xl font-bold text-[oklch(28.5%_0.022_110)] mb-4">{value}</p>
      <Sparkline data={trend} color={isPositive ? '#22c55e' : '#ef4444'} />
    </div>
  );
};
```

### Progress Indicators

**Purpose**: Show completion status of tasks or processes

**Implementation**:
```tsx
const CircularProgress: React.FC<{ value: number; size?: number }> = ({ 
  value, 
  size = 120 
}) => {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="oklch(93.5% 0.005 110)"
          strokeWidth="10"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#gradient)"
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
        <defs>
          <linearGradient id="gradient">
            <stop offset="0%" stopColor="oklch(68.5% 0.175 96)" />
            <stop offset="100%" stopColor="oklch(58.8% 0.195 25)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold">{value}%</span>
      </div>
    </div>
  );
};
```

---

## Responsive Patterns

### Mobile-First Grid

**Purpose**: Responsive grid that adapts to screen size

**Implementation**:
```tsx
const ResponsiveGrid: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
      {children}
    </div>
  );
};
```

### Drawer Navigation for Mobile

**Purpose**: Off-canvas navigation for mobile devices

**Implementation**:
```tsx
const MobileDrawer: React.FC<{ open: boolean; onClose: () => void }> = ({ 
  open, 
  onClose, 
  children 
}) => {
  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: open ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed left-0 top-0 h-full w-80 bg-white shadow-2xl z-50 lg:hidden"
      >
        <div className="p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100"
          >
            ×
          </button>
          {children}
        </div>
      </motion.div>
    </>
  );
};
```

---

## Animation Patterns

### Stagger Animation

**Purpose**: Sequential reveal of list items

**Implementation**:
```tsx
const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const StaggerList: React.FC<{ items: any[] }> = ({ items }) => {
  return (
    <motion.div
      variants={staggerChildren}
      initial="initial"
      animate="animate"
      className="space-y-4"
    >
      {items.map((item, index) => (
        <motion.div
          key={index}
          variants={fadeInUp}
          className="p-4 bg-white rounded-lg shadow"
        >
          {item}
        </motion.div>
      ))}
    </motion.div>
  );
};
```

### Parallax Scrolling

**Purpose**: Create depth with scroll-based animation

**Implementation**:
```tsx
const useParallax = (offset = 50) => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return scrollY * (offset / 100);
};

const ParallaxHero: React.FC = ({ backgroundImage, title, subtitle }) => {
  const parallaxOffset = useParallax(30);

  return (
    <div className="relative h-[600px] overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          transform: `translateY(${parallaxOffset}px)`
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/30" />
      <div className="relative h-full flex items-center justify-center text-white text-center">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-6xl font-['Playfair_Display'] mb-4"
          >
            {title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-xl"
          >
            {subtitle}
          </motion.p>
        </div>
      </div>
    </div>
  );
};
```

---

## Mumbai Entertainment Patterns

### Film Reel Carousel

**Purpose**: Showcase talent or projects in film reel style

**Implementation**:
```tsx
const FilmReelCarousel: React.FC<{ items: any[] }> = ({ items }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  
  return (
    <div className="relative">
      {/* Film strip decoration */}
      <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none">
        <div className="h-full border-t-8 border-b-8 border-black">
          <div className="h-full flex">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="flex-1 border-l-2 border-black" />
            ))}
          </div>
        </div>
      </div>

      {/* Carousel content */}
      <div className="relative py-12 px-8">
        <div className="flex overflow-hidden">
          <motion.div
            className="flex"
            animate={{ x: `-${activeIndex * 100}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {items.map((item, index) => (
              <div key={index} className="w-full flex-shrink-0 px-4">
                <div className="aspect-[16/9] bg-black rounded-lg overflow-hidden">
                  <img src={item.image} className="w-full h-full object-cover" />
                </div>
                <h3 className="text-xl font-['Playfair_Display'] mt-4">{item.title}</h3>
                <p className="text-[oklch(62.8%_0.015_110)]">{item.description}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-center space-x-2 mt-6">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              index === activeIndex
                ? 'w-8 bg-[oklch(68.5%_0.175_96)]'
                : 'bg-[oklch(88.2%_0.008_110)]'
            )}
          />
        ))}
      </div>
    </div>
  );
};
```

### Spotlight Card

**Purpose**: Highlight featured talent with cinematic effect

**Implementation**:
```tsx
const SpotlightCard: React.FC<{ talent: any }> = ({ talent }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-[oklch(18.2%_0.024_110)] p-8"
      onMouseMove={handleMouseMove}
    >
      {/* Spotlight effect */}
      <div
        className="absolute pointer-events-none"
        style={{
          background: `radial-gradient(600px at ${mousePosition.x}px ${mousePosition.y}px, oklch(68.5% 0.175 96 / 0.15), transparent)`,
          left: 0,
          top: 0,
          right: 0,
          bottom: 0
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-white">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-3xl font-['Playfair_Display'] mb-2">{talent.name}</h3>
            <p className="text-[oklch(68.5%_0.175_96)]">{talent.role}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{talent.rating}</div>
            <div className="text-sm opacity-70">Rating</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <div className="text-sm opacity-70 mb-1">Experience</div>
            <div className="font-semibold">{talent.experience}</div>
          </div>
          <div>
            <div className="text-sm opacity-70 mb-1">Projects</div>
            <div className="font-semibold">{talent.projects}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {talent.skills.map((skill: string, index: number) => (
            <span
              key={index}
              className="px-3 py-1 bg-white/10 backdrop-blur rounded-full text-sm"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
```

### Award Badge

**Purpose**: Display awards and achievements

**Implementation**:
```tsx
const AwardBadge: React.FC<{ award: any }> = ({ award }) => {
  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-[oklch(68.5%_0.175_96)] to-[oklch(58.8%_0.195_25)] rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
      <div className="relative bg-white rounded-full p-4 shadow-xl">
        <div className="w-16 h-16 flex items-center justify-center">
          <span className="text-3xl">🏆</span>
        </div>
      </div>
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-[oklch(68.5%_0.175_96)] text-white px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
        {award.name}
      </div>
    </div>
  );
};
```

---

## Performance Optimization Patterns

### Virtual Scrolling

**Purpose**: Efficiently render large lists

**Implementation**:
```tsx
import { VariableSizeList } from 'react-window';

const VirtualList: React.FC<{ items: any[] }> = ({ items }) => {
  const getItemSize = (index: number) => {
    // Dynamic height based on content
    return items[index].expanded ? 200 : 80;
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style} className="p-4 border-b">
      {items[index].content}
    </div>
  );

  return (
    <VariableSizeList
      height={600}
      itemCount={items.length}
      itemSize={getItemSize}
      width="100%"
    >
      {Row}
    </VariableSizeList>
  );
};
```

### Lazy Loading Images

**Purpose**: Load images only when needed

**Implementation**:
```tsx
const LazyImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageRef, isIntersecting] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px'
  });

  useEffect(() => {
    if (isIntersecting && !imageSrc) {
      const img = new Image();
      img.src = src;
      img.onload = () => setImageSrc(src);
    }
  }, [isIntersecting, src, imageSrc]);

  return (
    <div ref={imageRef} className="relative bg-[oklch(93.5%_0.005_110)]">
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={alt}
          className="w-full h-full object-cover animate-fade-in"
        />
      ) : (
        <div className="animate-pulse w-full h-full" />
      )}
    </div>
  );
};
```

---

## Accessibility Patterns

### Focus Management

**Purpose**: Proper keyboard navigation

**Implementation**:
```tsx
const useFocusTrap = (ref: React.RefObject<HTMLElement>) => {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const focusableElements = element.querySelectorAll(
      'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus();
          e.preventDefault();
        }
      }
    };

    element.addEventListener('keydown', handleTabKey);
    firstFocusable?.focus();

    return () => {
      element.removeEventListener('keydown', handleTabKey);
    };
  }, [ref]);
};
```

### Screen Reader Announcements

**Purpose**: Provide context for screen reader users

**Implementation**:
```tsx
const useAnnouncement = () => {
  const [announcement, setAnnouncement] = useState('');

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement('');
    setTimeout(() => setAnnouncement(message), 100);
  };

  return {
    announcement,
    announce,
    AriaLive: () => (
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    )
  };
};