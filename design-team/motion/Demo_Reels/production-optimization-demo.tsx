/**
 * Production Optimization Demo
 * Comprehensive showcase of all motion performance enhancements and accessibility features
 */

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { gpuAcceleration } from '../Animation_Library/core/gpu-acceleration-config';
import { 
  MotionAccessibilityProvider, 
  MotionAccessibilityControls,
  useMotionAccessibility 
} from '../Animation_Library/core/motion-accessibility-controls';
import { 
  PageTransitionProvider, 
  pageTransitions, 
  TransitionPage, 
  SharedElement 
} from '../Animation_Library/transitions/page-transitions-optimized';
import { 
  SkeletonProvider, 
  SkeletonCard, 
  SkeletonText, 
  SkeletonAvatar,
  SkeletonTable 
} from '../Animation_Library/core/skeleton-loading-system';
import { performanceMonitor } from '../Performance_Reports/performance-monitor';

// Demo Components
const CastingProfileCard = React.memo(({ actor, isLoading = false }: { 
  actor: any; 
  isLoading?: boolean; 
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { preferences, utils } = useMotionAccessibility();

  useEffect(() => {
    if (cardRef.current && !preferences.reducedMotion) {
      // Optimize element for animation
      gpuAcceleration.optimizeElementForAnimation(
        cardRef.current, 
        'transform', 
        'medium'
      );

      // Cleanup on unmount
      return () => {
        if (cardRef.current) {
          gpuAcceleration.cleanupElementOptimization(cardRef.current);
        }
      };
    }
  }, [preferences.reducedMotion]);

  if (isLoading) {
    return (
      <div className="casting-card loading">
        <SkeletonCard
          hasImage={true}
          imageHeight="200px"
          textLines={3}
          hasButton={true}
        />
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={`casting-card ${utils.getMotionSafeClasses()}`}
      style={{
        transform: 'translateZ(0)', // GPU acceleration
        willChange: preferences.reducedMotion ? 'auto' : 'transform, opacity',
        transition: preferences.reducedMotion 
          ? 'none' 
          : 'transform 0.3s ease-out, opacity 0.3s ease-out'
      }}
    >
      <SharedElement id={`actor-${actor.id}`}>
        <img 
          src={actor.photo} 
          alt={actor.name}
          className="actor-photo"
          loading="lazy"
        />
      </SharedElement>
      
      <div className="card-content">
        <h3>{actor.name}</h3>
        <p className="experience">{actor.experience} years experience</p>
        <p className="specialties">{actor.specialties.join(', ')}</p>
        
        <div className="stats">
          <span>Rating: {actor.rating}/5</span>
          <span>Projects: {actor.projectCount}</span>
        </div>
        
        <button 
          className="view-profile-btn"
          onClick={() => handleProfileView(actor)}
          style={{
            transform: 'translateZ(0)', // GPU acceleration for button
            transition: preferences.reducedMotion ? 'none' : 'all 0.2s ease'
          }}
        >
          View Profile
        </button>
      </div>
    </div>
  );
});

const CastingGrid = ({ actors, isLoading }: { actors: any[]; isLoading: boolean }) => {
  const { preferences } = useMotionAccessibility();
  
  const containerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px',
    padding: '24px',
    // Optimize container for child animations
    contain: 'layout',
    transform: 'translateZ(0)'
  };

  return (
    <div className="casting-grid" style={containerStyle}>
      {isLoading 
        ? Array.from({ length: 12 }, (_, index) => (
            <CastingProfileCard 
              key={`skeleton-${index}`} 
              actor={{}} 
              isLoading={true} 
            />
          ))
        : actors.map((actor, index) => (
            <CastingProfileCard
              key={actor.id}
              actor={actor}
              style={{
                animationDelay: preferences.reducedMotion 
                  ? '0ms' 
                  : `${index * 50}ms` // Staggered entrance
              }}
            />
          ))
      }
    </div>
  );
};

const PerformanceMetricsDisplay = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [config, setConfig] = useState(gpuAcceleration.getConfiguration());

  useEffect(() => {
    const unsubscribe = performanceMonitor.subscribe((report) => {
      setMetrics(report);
    });

    performanceMonitor.startMonitoring(1000);

    return () => {
      unsubscribe();
      performanceMonitor.stopMonitoring();
    };
  }, []);

  const gpuMetrics = gpuAcceleration.getPerformanceMetrics();

  return (
    <div className="performance-metrics">
      <h4>Real-time Performance Metrics</h4>
      
      <div className="metrics-grid">
        <div className="metric-card">
          <h5>Frame Rate</h5>
          <span className="value">{metrics?.metrics?.frameRate?.current || '--'} FPS</span>
          <small>Target: 60 FPS</small>
        </div>

        <div className="metric-card">
          <h5>GPU Memory</h5>
          <span className="value">{gpuMetrics.memoryUsageMB.toFixed(1)} MB</span>
          <small>Budget: 50 MB</small>
        </div>

        <div className="metric-card">
          <h5>Active Animations</h5>
          <span className="value">{gpuMetrics.activeAnimations}</span>
          <small>Max: {config.maxConcurrentAnimations}</small>
        </div>

        <div className="metric-card">
          <h5>Performance Score</h5>
          <span className={`value score-${getScoreClass(metrics?.score || 100)}`}>
            {metrics?.score || 100}/100
          </span>
          <small>Excellent: 80+</small>
        </div>

        <div className="metric-card">
          <h5>Quality Level</h5>
          <span className="value">{config.quality}</span>
          <small>Auto-adjusted</small>
        </div>

        <div className="metric-card">
          <h5>GPU Acceleration</h5>
          <span className={`value ${config.enableGPUAcceleration ? 'enabled' : 'disabled'}`}>
            {config.enableGPUAcceleration ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      {metrics?.issues && metrics.issues.length > 0 && (
        <div className="performance-issues">
          <h5>Performance Issues</h5>
          {metrics.issues.map((issue: any, index: number) => (
            <div key={index} className={`issue ${issue.severity}`}>
              <strong>{issue.message}</strong>
              <p>{issue.impact}</p>
            </div>
          ))}
        </div>
      )}

      {metrics?.recommendations && metrics.recommendations.length > 0 && (
        <div className="performance-recommendations">
          <h5>Recommendations</h5>
          {metrics.recommendations.map((rec: any, index: number) => (
            <div key={index} className={`recommendation ${rec.impact}`}>
              <strong>{rec.action}</strong>
              <small>Impact: {rec.impact} | Difficulty: {rec.difficulty}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const NavigationDemo = () => {
  const [currentPage, setCurrentPage] = useState('discover');
  const pages = ['discover', 'auditions', 'profile', 'messages'];

  const handlePageTransition = async (newPage: string) => {
    if (currentPage === newPage) return;

    await pageTransitions.startTransition(
      currentPage,
      newPage,
      {
        type: 'slide',
        direction: 'right',
        duration: 400,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        priority: 'medium',
        sharedElements: ['nav-logo', 'user-avatar']
      }
    );

    setCurrentPage(newPage);
  };

  return (
    <div className="navigation-demo">
      <nav className="demo-nav">
        <SharedElement id="nav-logo">
          <div className="nav-logo">CastMatch</div>
        </SharedElement>
        
        <div className="nav-items">
          {pages.map(page => (
            <button
              key={page}
              className={`nav-item ${currentPage === page ? 'active' : ''}`}
              onClick={() => handlePageTransition(page)}
              disabled={currentPage === page}
            >
              {page.charAt(0).toUpperCase() + page.slice(1)}
            </button>
          ))}
        </div>

        <SharedElement id="user-avatar">
          <SkeletonAvatar size="32px" shape="circle" />
        </SharedElement>
      </nav>

      <div className="page-container">
        <TransitionPage 
          route={currentPage} 
          isActive={true}
        >
          <DemoPageContent page={currentPage} />
        </TransitionPage>
      </div>
    </div>
  );
};

const DemoPageContent = ({ page }: { page: string }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [actors] = useState(generateMockActors(12));

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, [page]);

  switch (page) {
    case 'discover':
      return (
        <div className="discover-page">
          <h1>Discover Talent</h1>
          <p>Find the perfect actors for your next project</p>
          <CastingGrid actors={actors} isLoading={isLoading} />
        </div>
      );
    
    case 'auditions':
      return (
        <div className="auditions-page">
          <h1>Active Auditions</h1>
          {isLoading ? (
            <SkeletonTable rows={8} columns={5} hasHeader={true} />
          ) : (
            <div className="auditions-table">
              <p>Your active auditions and submissions</p>
            </div>
          )}
        </div>
      );
    
    case 'profile':
      return (
        <div className="profile-page">
          <h1>Your Profile</h1>
          {isLoading ? (
            <div className="profile-skeleton">
              <SkeletonAvatar size="120px" shape="circle" />
              <SkeletonText lines={4} />
            </div>
          ) : (
            <div className="profile-content">
              <p>Manage your actor profile and portfolio</p>
            </div>
          )}
        </div>
      );
    
    case 'messages':
      return (
        <div className="messages-page">
          <h1>Messages</h1>
          {isLoading ? (
            <SkeletonText lines={6} />
          ) : (
            <div className="messages-content">
              <p>Your messages and notifications</p>
            </div>
          )}
        </div>
      );
    
    default:
      return <div>Page not found</div>;
  }
};

// Main Demo Component
const ProductionOptimizationDemo = () => {
  const [demoMode, setDemoMode] = useState<'normal' | 'stress-test' | 'low-performance'>('normal');
  const [showMetrics, setShowMetrics] = useState(true);

  useEffect(() => {
    // Adjust GPU acceleration settings based on demo mode
    switch (demoMode) {
      case 'stress-test':
        gpuAcceleration.updateConfiguration({
          maxConcurrentAnimations: 20,
          quality: 'ultra'
        });
        break;
      case 'low-performance':
        gpuAcceleration.updateConfiguration({
          enableGPUAcceleration: false,
          maxConcurrentAnimations: 3,
          quality: 'low'
        });
        break;
      default:
        gpuAcceleration.updateConfiguration({
          enableGPUAcceleration: true,
          maxConcurrentAnimations: 10,
          quality: 'high'
        });
    }
  }, [demoMode]);

  return (
    <MotionAccessibilityProvider 
      showControls={true}
      controlsPosition="top-right"
      controlsCompact={false}
    >
      <SkeletonProvider>
        <PageTransitionProvider>
          <div className="production-demo">
            <header className="demo-header">
              <h1>CastMatch Motion Optimization Demo</h1>
              <p>Showcasing 60fps performance, accessibility compliance, and adaptive quality</p>
              
              <div className="demo-controls">
                <label>Demo Mode:</label>
                <select 
                  value={demoMode} 
                  onChange={(e) => setDemoMode(e.target.value as any)}
                >
                  <option value="normal">Normal Performance</option>
                  <option value="stress-test">Stress Test</option>
                  <option value="low-performance">Low Performance Device</option>
                </select>
                
                <label>
                  <input
                    type="checkbox"
                    checked={showMetrics}
                    onChange={(e) => setShowMetrics(e.target.checked)}
                  />
                  Show Metrics
                </label>
              </div>
            </header>

            <main className="demo-content">
              <NavigationDemo />
              
              <Suspense fallback={
                <div className="loading-fallback">
                  <SkeletonCard hasImage={true} textLines={3} />
                </div>
              }>
                {showMetrics && (
                  <aside className="metrics-sidebar">
                    <PerformanceMetricsDisplay />
                  </aside>
                )}
              </Suspense>
            </main>

            <footer className="demo-footer">
              <div className="optimization-features">
                <h3>Optimization Features Demonstrated:</h3>
                <ul>
                  <li>✅ GPU Hardware Acceleration</li>
                  <li>✅ Adaptive Quality Based on Performance</li>
                  <li>✅ WCAG 2.1 AA Motion Accessibility</li>
                  <li>✅ Smart Loading Skeletons</li>
                  <li>✅ Seamless Page Transitions</li>
                  <li>✅ Real-time Performance Monitoring</li>
                  <li>✅ Memory Usage Optimization</li>
                  <li>✅ 60fps Target Performance</li>
                  <li>✅ Reduced Motion Compliance</li>
                  <li>✅ Device Capability Detection</li>
                </ul>
              </div>
            </footer>
          </div>
        </PageTransitionProvider>
      </SkeletonProvider>
    </MotionAccessibilityProvider>
  );
};

// Helper Functions
function handleProfileView(actor: any) {
  console.log('Viewing profile for:', actor.name);
  // This would typically trigger a page transition
}

function generateMockActors(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `Actor ${index + 1}`,
    experience: Math.floor(Math.random() * 20) + 1,
    specialties: ['Drama', 'Comedy', 'Action'].slice(0, Math.floor(Math.random() * 3) + 1),
    rating: (Math.random() * 2 + 3).toFixed(1),
    projectCount: Math.floor(Math.random() * 50) + 5,
    photo: `https://picsum.photos/300/200?random=${index}`
  }));
}

function getScoreClass(score: number): string {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

export default ProductionOptimizationDemo;

// Styles (in production, these would be in a CSS file)
const styles = `
  .production-demo {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #333;
    font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .demo-header {
    padding: 40px 24px;
    text-align: center;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }

  .demo-header h1 {
    margin: 0;
    font-size: 2.5rem;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .demo-controls {
    margin-top: 20px;
    display: flex;
    gap: 20px;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
  }

  .demo-content {
    display: flex;
    min-height: calc(100vh - 200px);
  }

  .navigation-demo {
    flex: 1;
  }

  .demo-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }

  .nav-logo {
    font-size: 1.5rem;
    font-weight: 700;
    color: #667eea;
  }

  .nav-items {
    display: flex;
    gap: 12px;
  }

  .nav-item {
    padding: 8px 16px;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .nav-item:hover {
    background: rgba(102, 126, 234, 0.1);
  }

  .nav-item.active {
    background: #667eea;
    color: white;
  }

  .casting-grid {
    animation: fadeIn 0.6s ease-out;
  }

  .casting-card {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    animation: slideInUp 0.6s ease-out;
  }

  .casting-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  }

  .actor-photo {
    width: 100%;
    height: 200px;
    object-fit: cover;
  }

  .card-content {
    padding: 20px;
  }

  .view-profile-btn {
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 16px;
  }

  .metrics-sidebar {
    width: 350px;
    padding: 24px;
    background: rgba(255, 255, 255, 0.95);
    border-left: 1px solid rgba(0, 0, 0, 0.1);
    overflow-y: auto;
  }

  .performance-metrics h4 {
    margin: 0 0 20px 0;
    color: #333;
  }

  .metrics-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: 1fr 1fr;
  }

  .metric-card {
    padding: 12px;
    background: #f8f9fa;
    border-radius: 8px;
    text-align: center;
  }

  .metric-card h5 {
    margin: 0 0 8px 0;
    font-size: 0.8rem;
    color: #666;
    text-transform: uppercase;
  }

  .metric-card .value {
    display: block;
    font-size: 1.2rem;
    font-weight: 700;
    color: #333;
  }

  .value.score-excellent { color: #22c55e; }
  .value.score-good { color: #3b82f6; }
  .value.score-fair { color: #f59e0b; }
  .value.score-poor { color: #ef4444; }

  .value.enabled { color: #22c55e; }
  .value.disabled { color: #ef4444; }

  .performance-issues,
  .performance-recommendations {
    margin-top: 20px;
  }

  .issue,
  .recommendation {
    padding: 8px 12px;
    margin: 8px 0;
    border-radius: 6px;
    font-size: 0.9rem;
  }

  .issue.critical { background: #fee2e2; border-left: 4px solid #ef4444; }
  .issue.high { background: #fef3c7; border-left: 4px solid #f59e0b; }
  .issue.medium { background: #e0f2fe; border-left: 4px solid #3b82f6; }

  .demo-footer {
    padding: 40px 24px;
    background: rgba(255, 255, 255, 0.95);
    border-top: 1px solid rgba(0, 0, 0, 0.1);
  }

  .optimization-features ul {
    list-style: none;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 8px;
  }

  .optimization-features li {
    padding: 4px 0;
    font-weight: 500;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideInUp {
    from { 
      opacity: 0; 
      transform: translateY(40px); 
    }
    to { 
      opacity: 1; 
      transform: translateY(0); 
    }
  }

  @media (prefers-reduced-motion: reduce) {
    * {
      animation: none !important;
      transition: none !important;
    }
  }

  @media (max-width: 768px) {
    .demo-content {
      flex-direction: column;
    }
    
    .metrics-sidebar {
      width: 100%;
      border-left: none;
      border-top: 1px solid rgba(0, 0, 0, 0.1);
    }
    
    .casting-grid {
      grid-template-columns: 1fr;
    }
  }
`;

// Inject styles (in production, this would be handled by your build system)
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}