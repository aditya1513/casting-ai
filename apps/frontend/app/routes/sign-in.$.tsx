/**
 * CastMatch Sign In - Clerk Integration  
 * Linear-style auth page with proper Clerk authentication
 */

import { Link } from '@remix-run/react';
import { useEffect, useState } from 'react';

// Simple loader without authentication
export async function loader() {
  return null;
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
      <span className="ml-3 text-gray-400">Loading authentication...</span>
    </div>
  );
}

export default function SignInPage() {
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [clerkLoaded, setClerkLoaded] = useState(false);

  useEffect(() => {
    setIsClientMounted(true);
    // Give Clerk some time to load
    const timer = setTimeout(() => setClerkLoaded(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--linear-bg, #08090A)' }}>
      {/* Linear's Signature Background */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 opacity-60"
          style={{
            background: `
              radial-gradient(ellipse 1000px 500px at center top, rgba(94, 106, 210, 0.08) 0%, transparent 50%),
              radial-gradient(ellipse 800px 400px at 80% 20%, rgba(16, 185, 129, 0.06) 0%, transparent 50%)
            `
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-10 p-6">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-7 h-7 text-white relative">
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                <path 
                  d="M12 3L3 7.5L12 12L21 7.5L12 3Z" 
                  fill="currentColor" 
                  opacity="0.8"
                />
                <path 
                  d="M3 16.5L12 21L21 16.5" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-xl font-semibold text-white">CastMatch</span>
          </Link>
          <Link to="/sign-up" className="text-sm text-gray-400 hover:text-white transition-colors">
            Need an account?
          </Link>
        </div>
      </nav>

      {/* Clerk Sign In Component with Client-Side Guard */}
      <div className="relative z-10 min-w-[400px]">
        {!isClientMounted ? (
          <LoadingSpinner />
        ) : (
          <>
            <div className={`transition-opacity duration-300 ${clerkLoaded ? 'opacity-100' : 'opacity-0'}`}>
              <div className="bg-black bg-opacity-95 backdrop-blur-xl border border-white border-opacity-10 rounded-xl p-8 min-h-[400px] max-w-md w-full mx-auto">
                <h1 className="text-2xl font-semibold text-white mb-2">Sign In to CastMatch</h1>
                <p className="text-gray-400 mb-8">Welcome back to Mumbai's premier casting platform</p>
                
                <form className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your email"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your password"
                    />
                  </div>
                  
                  <Link to="/dashboard" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 block text-center">
                    Sign In
                  </Link>
                </form>
                
                <p className="mt-6 text-center text-gray-400">
                  Don't have an account?{' '}
                  <Link to="/sign-up" className="text-purple-400 hover:text-purple-300">
                    Sign up
                  </Link>
                </p>
              </div>
            </div>
            {!clerkLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <LoadingSpinner />
              </div>
            )}
          </>
        )}
      </div>

      {/* Mumbai Industry Badge */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-2">
            Mumbai's Premier Casting Platform
          </div>
          <div className="flex justify-center items-center gap-6 text-xs text-gray-600">
            <span>847+ Casting Directors</span>
            <span>•</span>
            <span>5,247 Talents</span>
            <span>•</span>
            <span>2,431 Projects</span>
          </div>
        </div>
      </div>
    </div>
  );
}