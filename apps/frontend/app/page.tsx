'use client';

import { Film, Users, Calendar, TrendingUp, Star, Award } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { SkeletonCard } from '@/components/performance/skeleton-card';

// Dynamic imports for better performance
const LazyFeatureCard = dynamic(
  () =>
    import('@/components/performance/lazy-feature-card').then(mod => ({
      default: mod.LazyFeatureCard,
    })),
  {
    loading: () => <SkeletonCard />,
  }
);

export default function Home() {
  const stats = [
    { label: 'Active Actors', value: '10,000+', icon: Users },
    { label: 'Projects Posted', value: '500+', icon: Film },
    { label: 'Auditions This Month', value: '1,200+', icon: Calendar },
    { label: 'Success Rate', value: '85%', icon: TrendingUp },
  ];

  const features = [
    {
      title: 'For Casting Directors',
      description:
        'Find the perfect talent for your OTT projects with our advanced search and filtering system.',
      icon: Star,
      link: '/casting-directors',
    },
    {
      title: 'For Actors',
      description:
        'Build your portfolio, find auditions, and connect with top casting directors in Mumbai.',
      icon: Award,
      link: '/actors',
    },
    {
      title: 'For Producers',
      description:
        'Manage your productions, track casting progress, and collaborate with your team seamlessly.',
      icon: Film,
      link: '/producers',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="hero-section bg-gradient-to-r from-indigo-600 to-purple-600 text-white critical-above-fold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Mumbai&apos;s Premier Casting Platform
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-indigo-100">
              Connecting talent with opportunity in the OTT revolution
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="btn-primary inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 md:py-4 md:text-lg md:px-10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 touch-friendly"
                prefetch={false}
              >
                Get Started
              </Link>
              <Link
                href="/explore"
                className="inline-flex items-center justify-center px-8 py-3 border border-white text-base font-medium rounded-md text-white bg-transparent hover:bg-white hover:text-indigo-600 md:py-4 md:text-lg md:px-10 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600"
                prefetch={false}
              >
                Explore Talent
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="stats-container grid grid-cols-2 gap-5 md:grid-cols-4">
            {stats.map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="text-center">
                  <div className="flex justify-center mb-2 h-8">
                    <Icon className="h-8 w-8 text-indigo-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 h-12 flex items-center justify-center">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-600 h-5">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Your Gateway to Entertainment Industry
            </h2>
            <p className="text-xl text-gray-600">
              Whether you&apos;re casting or auditioning, we make the process seamless
            </p>
          </div>
          <div className="feature-cards-grid grid grid-cols-1 gap-8 md:grid-cols-3">
            <Suspense
              fallback={
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              }
            >
              {features.map(feature => (
                <LazyFeatureCard
                  key={feature.title}
                  title={feature.title}
                  description={feature.description}
                  icon={feature.icon}
                  link={feature.link}
                />
              ))}
            </Suspense>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Casting Experience?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Join thousands of industry professionals already using CastMatch
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 md:py-4 md:text-lg md:px-10"
          >
            Start Your Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white text-lg font-semibold mb-4">CastMatch</h3>
              <p className="text-sm">
                Mumbai&apos;s trusted platform for casting and talent discovery in the OTT era.
              </p>
            </div>
            <div>
              <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">
                Platform
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/actors" className="hover:text-white">
                    For Actors
                  </Link>
                </li>
                <li>
                  <Link href="/casting-directors" className="hover:text-white">
                    For Casting Directors
                  </Link>
                </li>
                <li>
                  <Link href="/producers" className="hover:text-white">
                    For Producers
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">
                Company
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="hover:text-white">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="hover:text-white">
                    Careers
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">
                Legal
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/privacy" className="hover:text-white">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm">
            <p>&copy; 2025 CastMatch. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
