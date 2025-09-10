# CastMatch Component Library Specifications

## Version 1.0.0

### Table of Contents
1. [Foundation Components](#foundation-components)
2. [Form Components](#form-components)
3. [Navigation Components](#navigation-components)
4. [Feedback Components](#feedback-components)
5. [Data Display Components](#data-display-components)
6. [Entertainment Industry Components](#entertainment-industry-components)

---

## Foundation Components

### Button Component

**Purpose**: Primary interactive element for user actions

**Variants**:
- `primary`: Main CTA actions (Bollywood gold accent)
- `secondary`: Secondary actions (Crimson accent)
- `ghost`: Subtle actions
- `danger`: Destructive actions
- `success`: Confirmation actions

**Sizes**: `xs`, `sm`, `md`, `lg`, `xl`

**States**: `default`, `hover`, `active`, `focus`, `disabled`, `loading`

**Performance Budget**: <50ms render, <5KB gzipped

**API Specification**:
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onClick?: (event: MouseEvent) => void;
  children: ReactNode;
  ariaLabel?: string;
}
```

**Implementation Example**:
```tsx
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-[oklch(68.5%_0.175_96)] text-white hover:bg-[oklch(61.2%_0.165_96)] focus:ring-[oklch(68.5%_0.175_96)]',
        secondary: 'bg-[oklch(58.8%_0.195_25)] text-white hover:bg-[oklch(48.5%_0.185_25)] focus:ring-[oklch(58.8%_0.195_25)]',
        ghost: 'hover:bg-[oklch(93.5%_0.005_110)] text-[oklch(28.5%_0.022_110)]',
        danger: 'bg-[oklch(58.5%_0.195_25)] text-white hover:bg-[oklch(48.5%_0.185_25)]',
        success: 'bg-[oklch(68.5%_0.165_142)] text-white hover:bg-[oklch(58.5%_0.155_142)]'
      },
      size: {
        xs: 'px-2 py-1 text-xs',
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
        xl: 'px-8 py-4 text-xl'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md'
    }
  }
);

export const Button: React.FC<ButtonProps & VariantProps<typeof buttonVariants>> = ({
  variant,
  size,
  disabled,
  loading,
  fullWidth,
  leftIcon,
  rightIcon,
  onClick,
  children,
  ariaLabel,
  className,
  ...props
}) => {
  return (
    <button
      className={cn(
        buttonVariants({ variant, size }),
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      onClick={onClick}
      aria-label={ariaLabel}
      {...props}
    >
      {loading && <Spinner className="mr-2" />}
      {leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};
```

---

### Card Component

**Purpose**: Container for grouped content with elevation

**Variants**:
- `flat`: No elevation
- `raised`: Default elevation
- `outlined`: Border only
- `interactive`: Hover effects

**API Specification**:
```typescript
interface CardProps {
  variant?: 'flat' | 'raised' | 'outlined' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}
```

**Implementation Example**:
```tsx
const cardVariants = cva(
  'rounded-lg transition-all duration-300',
  {
    variants: {
      variant: {
        flat: 'bg-[oklch(98.5%_0.002_110)]',
        raised: 'bg-[oklch(98.5%_0.002_110)] shadow-md hover:shadow-lg',
        outlined: 'border border-[oklch(88.2%_0.008_110)]',
        interactive: 'bg-[oklch(98.5%_0.002_110)] shadow-md hover:shadow-xl hover:scale-[1.02] cursor-pointer'
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8'
      }
    },
    defaultVariants: {
      variant: 'raised',
      padding: 'md'
    }
  }
);
```

---

## Form Components

### Input Component

**Types**: `text`, `email`, `password`, `number`, `tel`, `search`, `url`

**States**: `default`, `focus`, `error`, `success`, `disabled`

**API Specification**:
```typescript
interface InputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: boolean;
  errorMessage?: string;
  success?: boolean;
  successMessage?: string;
  disabled?: boolean;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
  label?: string;
  helperText?: string;
  required?: boolean;
}
```

**Implementation Example**:
```tsx
export const Input: React.FC<InputProps> = ({
  type = 'text',
  error,
  errorMessage,
  success,
  successMessage,
  label,
  required,
  ...props
}) => {
  const inputClasses = cn(
    'w-full px-3 py-2 rounded-lg border transition-all duration-300',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    {
      'border-[oklch(88.2%_0.008_110)] focus:border-[oklch(68.5%_0.175_96)] focus:ring-[oklch(68.5%_0.175_96)]': !error && !success,
      'border-[oklch(58.5%_0.195_25)] focus:ring-[oklch(58.5%_0.195_25)]': error,
      'border-[oklch(68.5%_0.165_142)] focus:ring-[oklch(68.5%_0.165_142)]': success,
      'opacity-50 cursor-not-allowed': props.disabled
    }
  );

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-[oklch(28.5%_0.022_110)]">
          {label} {required && <span className="text-[oklch(58.5%_0.195_25)]">*</span>}
        </label>
      )}
      <input
        type={type}
        className={inputClasses}
        {...props}
      />
      {errorMessage && (
        <p className="text-sm text-[oklch(58.5%_0.195_25)]">{errorMessage}</p>
      )}
      {successMessage && (
        <p className="text-sm text-[oklch(68.5%_0.165_142)]">{successMessage}</p>
      )}
    </div>
  );
};
```

---

### Select Component

**Variants**: `default`, `searchable`, `multi`, `async`

**API Specification**:
```typescript
interface SelectProps<T> {
  options: Array<{ value: T; label: string; disabled?: boolean }>;
  value?: T | T[];
  onChange?: (value: T | T[]) => void;
  placeholder?: string;
  searchable?: boolean;
  multi?: boolean;
  async?: boolean;
  loadOptions?: (query: string) => Promise<Option<T>[]>;
  disabled?: boolean;
  error?: boolean;
  label?: string;
}
```

---

## Navigation Components

### Navigation Bar

**Variants**: `fixed`, `sticky`, `static`

**API Specification**:
```typescript
interface NavBarProps {
  variant?: 'fixed' | 'sticky' | 'static';
  transparent?: boolean;
  logo: ReactNode;
  items: NavItem[];
  actions?: ReactNode;
  mobileMenuEnabled?: boolean;
}

interface NavItem {
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  badge?: string | number;
  children?: NavItem[];
}
```

**Implementation Example**:
```tsx
export const NavBar: React.FC<NavBarProps> = ({
  variant = 'sticky',
  transparent = false,
  logo,
  items,
  actions
}) => {
  const navClasses = cn(
    'w-full h-16 px-6 flex items-center justify-between transition-all duration-300',
    {
      'fixed top-0 z-50': variant === 'fixed',
      'sticky top-0 z-40': variant === 'sticky',
      'relative': variant === 'static',
      'bg-[oklch(98.5%_0.002_110)]/95 backdrop-blur-lg shadow-sm': !transparent,
      'bg-transparent': transparent
    }
  );

  return (
    <nav className={navClasses}>
      <div className="flex items-center">{logo}</div>
      <div className="hidden md:flex items-center space-x-8">
        {items.map((item, index) => (
          <NavItem key={index} {...item} />
        ))}
      </div>
      <div className="flex items-center space-x-4">{actions}</div>
    </nav>
  );
};
```

---

### Tabs Component

**Variants**: `default`, `pills`, `underline`

**API Specification**:
```typescript
interface TabsProps {
  variant?: 'default' | 'pills' | 'underline';
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  orientation?: 'horizontal' | 'vertical';
}

interface TabItem {
  key: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
}
```

---

## Feedback Components

### Modal Component

**Sizes**: `xs`, `sm`, `md`, `lg`, `xl`, `full`

**API Specification**:
```typescript
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: ReactNode;
  footer?: ReactNode;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  centered?: boolean;
}
```

**Implementation Example**:
```tsx
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  size = 'md',
  children,
  footer,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  centered = true
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) onClose();
    };
    if (open) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, closeOnEscape, onClose]);

  if (!open) return null;

  const sizeClasses = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4'
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      <div className={cn(
        'relative bg-white rounded-xl shadow-2xl p-8',
        sizeClasses[size],
        centered && 'my-auto'
      )}>
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
        {title && (
          <h2 className="text-2xl font-bold mb-4 font-['Playfair_Display']">{title}</h2>
        )}
        <div className="mb-6">{children}</div>
        {footer && (
          <div className="flex justify-end space-x-4 pt-4 border-t">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
```

---

### Toast Notification

**Types**: `info`, `success`, `warning`, `error`

**Positions**: `top-left`, `top-center`, `top-right`, `bottom-left`, `bottom-center`, `bottom-right`

**API Specification**:
```typescript
interface ToastProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number; // milliseconds
  position?: Position;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
}
```

---

## Data Display Components

### Table Component

**Features**:
- Sorting
- Filtering
- Pagination
- Row selection
- Column resizing
- Virtual scrolling for large datasets

**API Specification**:
```typescript
interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  pagination?: PaginationConfig;
  sorting?: SortingConfig;
  filtering?: FilteringConfig;
  selection?: SelectionConfig;
  loading?: boolean;
  emptyMessage?: string;
  virtualScroll?: boolean;
  rowHeight?: number;
}

interface Column<T> {
  key: keyof T;
  title: string;
  width?: number | string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: T[keyof T], record: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
}
```

---

### Badge Component

**Variants**: `solid`, `outline`, `ghost`

**Colors**: `default`, `primary`, `success`, `warning`, `error`, `info`

**API Specification**:
```typescript
interface BadgeProps {
  variant?: 'solid' | 'outline' | 'ghost';
  color?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'xs' | 'sm' | 'md';
  children: ReactNode;
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}
```

---

## Entertainment Industry Components

### TalentCard Component

**Purpose**: Display talent/actor information in a visually appealing card

**API Specification**:
```typescript
interface TalentCardProps {
  name: string;
  role: string;
  imageUrl: string;
  rating?: number;
  skills?: string[];
  experience?: string;
  availability?: 'available' | 'busy' | 'unavailable';
  verified?: boolean;
  featured?: boolean;
  onClick?: () => void;
}
```

**Implementation Example**:
```tsx
export const TalentCard: React.FC<TalentCardProps> = ({
  name,
  role,
  imageUrl,
  rating,
  skills = [],
  availability = 'available',
  verified,
  featured,
  onClick
}) => {
  const availabilityColors = {
    available: 'bg-[oklch(68.5%_0.165_142)]',
    busy: 'bg-[oklch(72.5%_0.165_85)]',
    unavailable: 'bg-[oklch(62.8%_0.015_110)]'
  };

  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer',
        featured && 'ring-2 ring-[oklch(68.5%_0.175_96)]'
      )}
      onClick={onClick}
    >
      {featured && (
        <div className="absolute top-2 right-2 z-10 bg-[oklch(68.5%_0.175_96)] text-white px-2 py-1 rounded-full text-xs font-semibold">
          Featured
        </div>
      )}
      <div className="aspect-[3/4] relative">
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <h3 className="text-white text-xl font-bold flex items-center gap-2">
            {name}
            {verified && (
              <span className="text-[oklch(68.5%_0.175_96)]">✓</span>
            )}
          </h3>
          <p className="text-white/80">{role}</p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {rating && (
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className={i < Math.floor(rating) ? 'text-[oklch(68.5%_0.175_96)]' : 'text-gray-300'}
              >
                ★
              </span>
            ))}
            <span className="ml-2 text-sm text-gray-600">{rating.toFixed(1)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className={cn('w-2 h-2 rounded-full', availabilityColors[availability])} />
          <span className="text-sm capitalize">{availability}</span>
        </div>
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {skills.slice(0, 3).map((skill, index) => (
              <Badge key={index} size="xs" variant="outline">
                {skill}
              </Badge>
            ))}
            {skills.length > 3 && (
              <Badge size="xs" variant="ghost">
                +{skills.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
```

---

### AuditionScheduler Component

**Purpose**: Schedule and manage auditions with calendar integration

**API Specification**:
```typescript
interface AuditionSchedulerProps {
  availableSlots: TimeSlot[];
  bookedSlots: TimeSlot[];
  onSlotSelect: (slot: TimeSlot) => void;
  onSlotBook: (slot: TimeSlot, details: BookingDetails) => void;
  viewMode?: 'day' | 'week' | 'month';
  timezone?: string;
}

interface TimeSlot {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  available: boolean;
  location?: string;
  type?: 'in-person' | 'virtual' | 'self-tape';
}
```

---

### ProjectTimeline Component

**Purpose**: Visual timeline for film/show production phases

**API Specification**:
```typescript
interface ProjectTimelineProps {
  phases: Phase[];
  currentPhase?: string;
  orientation?: 'horizontal' | 'vertical';
  showMilestones?: boolean;
}

interface Phase {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: 'completed' | 'in-progress' | 'upcoming';
  milestones?: Milestone[];
  color?: string;
}
```

---

## Component Performance Metrics

### Bundle Size Budget
- Individual component: <10KB gzipped
- Total library: <100KB gzipped
- Tree-shakeable exports

### Render Performance
- First paint: <16ms
- Interaction response: <100ms
- Animation frame rate: 60fps

### Accessibility Compliance
- WCAG 2.1 AA minimum
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- ARIA attributes

### Browser Support
- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- Mobile browsers: iOS 13+, Android 8+

---

## Implementation Guidelines

### CSS-in-JS Setup
```typescript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Import from tokens.json
      },
      fontFamily: {
        heading: ['Playfair Display', 'Noto Serif Devanagari', 'serif'],
        body: ['Inter', 'Noto Sans Devanagari', 'sans-serif'],
      }
    }
  }
};
```

### Component Export Pattern
```typescript
// index.ts
export { Button } from './components/Button';
export { Card } from './components/Card';
export { Input } from './components/Input';
// ... other exports

export type { ButtonProps } from './components/Button';
export type { CardProps } from './components/Card';
// ... other type exports
```

### Testing Requirements
- Unit tests: >90% coverage
- Visual regression tests
- Accessibility audits
- Performance benchmarks
- Cross-browser testing