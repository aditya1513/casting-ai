'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import usePerformanceMonitoring from '@/hooks/usePerformanceMonitoring';

// Dynamic imports for code splitting demonstration
const VirtualTalentList = dynamic(() => import('@/components/VirtualTalentList'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />,
  ssr: false
});

const LazyImage = dynamic(() => import('@/components/LazyImage'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-32 w-32 rounded-lg" />
});

// Generate mock talent data
const generateMockTalents = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `talent-${i}`,
    name: `Talent ${i + 1}`,
    photo: `https://picsum.photos/64/64?random=${i}`,
    age: 20 + Math.floor(Math.random() * 40),
    location: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata'][Math.floor(Math.random() * 5)],
    skills: ['Acting', 'Dancing', 'Singing', 'Modeling', 'Voice Acting', 'Comedy'].slice(0, 2 + Math.floor(Math.random() * 3)),
    experience: `${1 + Math.floor(Math.random() * 10)} years`,
    rating: 3 + Math.random() * 2,
    availability: ['available', 'busy', 'booked'][Math.floor(Math.random() * 3)] as 'available' | 'busy' | 'booked'
  }));
};

const PerformanceDemoPage: React.FC = () => {
  const [talents, setTalents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemCount, setItemCount] = useState(1000);
  const [isLoading, setIsLoading] = useState(false);

  const { 
    reportMetric, 
    measureComponentRender,
    measureAsyncOperation,
    metrics 
  } = usePerformanceMonitoring({
    reportWebVitals: true,
    logToConsole: true
  });

  useEffect(() => {
    const endRender = measureComponentRender('PerformanceDemoPage');
    
    const loadTalents = async () => {
      setIsLoading(true);
      
      await measureAsyncOperation('loadTalentData', async () => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 100));
        setTalents(generateMockTalents(itemCount));
      });
      
      setIsLoading(false);
    };

    loadTalents();
    
    return endRender;
  }, [itemCount, measureComponentRender, measureAsyncOperation]);

  const handleItemCountChange = (newCount: number) => {
    const startTime = performance.now();
    setItemCount(newCount);
    
    requestAnimationFrame(() => {
      const endTime = performance.now();
      reportMetric('ui_update_time', endTime - startTime, {
        operation: 'itemCountChange',
        newCount
      });
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            CastMatch Performance Demo
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Demonstrating our frontend optimization features: virtual scrolling, 
            lazy loading, code splitting, and performance monitoring.
          </p>
        </motion.div>

        {/* Performance Metrics */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: 'FCP', value: metrics.fcp ? `${metrics.fcp.toFixed(0)}ms` : 'Measuring...' },
            { label: 'LCP', value: metrics.lcp ? `${metrics.lcp.toFixed(0)}ms` : 'Measuring...' },
            { label: 'CLS', value: metrics.cls ? metrics.cls.toFixed(3) : 'Measuring...' },
            { label: 'TTFB', value: metrics.ttfb ? `${metrics.ttfb.toFixed(0)}ms` : 'Measuring...' }
          ].map((metric, index) => (
            <div key={metric.label} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                {metric.label}
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metric.value}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Talents
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, location, or skills..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
                         focus:outline-none focus:ring-purple-500 focus:border-purple-500
                         dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Item Count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number of Items ({itemCount.toLocaleString()})
              </label>
              <div className="flex space-x-2">
                {[100, 500, 1000, 5000].map(count => (
                  <button
                    key={count}
                    onClick={() => handleItemCountChange(count)}
                    disabled={isLoading}
                    className={`px-3 py-2 text-sm rounded-md font-medium transition-colors
                      ${itemCount === count 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      }
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {count >= 1000 ? `${count/1000}K` : count}
                  </button>
                ))}
              </div>
            </div>

            {/* Performance Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Optimization Features
              </label>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <div>✅ Virtual Scrolling</div>
                <div>✅ Lazy Image Loading</div>
                <div>✅ Code Splitting</div>
                <div>✅ Performance Monitoring</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Optimized Images Demo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Lazy Loaded Images with WebP Support
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }, (_, i) => (
              <LazyImage
                key={i}
                src={`https://picsum.photos/128/128?random=${i + 20}`}
                alt={`Demo image ${i + 1}`}
                width={128}
                height={128}
                className="rounded-lg"
                quality={75}
              />
            ))}
          </div>
        </motion.div>

        {/* Virtual Scrolling Demo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Virtual Scrolling Demo - High Performance List
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Efficiently rendering {itemCount.toLocaleString()} items with virtual scrolling.
              Only visible items are rendered in the DOM.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <VirtualTalentList
              talents={talents}
              searchTerm={searchTerm}
              containerHeight={600}
              itemHeight={120}
              onTalentClick={(talent) => {
                reportMetric('talent_click', 1, {
                  talentId: talent.id,
                  talentName: talent.name
                });
                console.log('Clicked talent:', talent.name);
              }}
            />
          )}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="text-center mt-12 py-8"
        >
          <div className="text-gray-600 dark:text-gray-400">
            <p className="mb-4">
              This demo showcases the performance optimizations implemented in CastMatch:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <strong>Bundle Splitting:</strong> Route-based code splitting reduces initial load time
              </div>
              <div>
                <strong>Virtual Scrolling:</strong> Efficiently handles thousands of list items
              </div>
              <div>
                <strong>Image Optimization:</strong> Lazy loading with WebP format support
              </div>
              <div>
                <strong>Performance Monitoring:</strong> Real-time Web Vitals tracking
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PerformanceDemoPage;