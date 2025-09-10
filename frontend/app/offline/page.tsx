'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, Home, Database } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [cachedPages, setCachedPages] = useState<string[]>([]);

  useEffect(() => {
    // Check online status
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    updateOnlineStatus();

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Get cached pages from service worker
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        Promise.all(
          cacheNames.map(cacheName => 
            caches.open(cacheName).then(cache => cache.keys())
          )
        ).then(responses => {
          const urls = responses.flat().map(req => new URL(req.url).pathname);
          const uniqueUrls = [...new Set(urls)].filter(url => 
            !url.includes('_next') && 
            !url.includes('.') &&
            url !== '/offline'
          );
          setCachedPages(uniqueUrls);
        });
      });
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    }
  };

  if (isOnline) {
    // Redirect to home if online
    window.location.href = '/';
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-white text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex items-center justify-center w-20 h-20 bg-red-500/20 rounded-full mb-6"
          >
            <WifiOff className="w-10 h-10 text-red-400" />
          </motion.div>

          <h1 className="text-3xl font-bold mb-4">You're Offline</h1>
          
          <p className="text-gray-300 mb-8">
            It looks like you've lost your internet connection. 
            Don't worry, you can still access some cached content below.
          </p>

          <div className="space-y-3 mb-8">
            <button
              onClick={handleRetry}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>

            <Link
              href="/"
              className="w-full bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 inline-block"
            >
              <Home className="w-5 h-5" />
              Go to Home
            </Link>
          </div>

          {cachedPages.length > 0 && (
            <div className="border-t border-white/20 pt-6">
              <h2 className="text-lg font-semibold mb-3 flex items-center justify-center gap-2">
                <Database className="w-5 h-5" />
                Available Offline
              </h2>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {cachedPages.map((page, index) => (
                  <Link
                    key={index}
                    href={page}
                    className="block text-sm text-purple-300 hover:text-purple-200 transition-colors"
                  >
                    {page === '/' ? 'Home' : page.slice(1).replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 text-xs text-gray-400">
            <p>CastMatch works offline too!</p>
            <p>Your data will sync when you're back online.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}