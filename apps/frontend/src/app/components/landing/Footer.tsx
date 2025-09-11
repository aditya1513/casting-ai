'use client';

import React from 'react';
import { FilmIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function Footer() {
  const footerLinks = {
    product: [
      { name: 'Features', href: '#features' },
      { name: 'Pricing', href: '#pricing' },
      { name: 'API', href: '/api' },
      { name: 'Integrations', href: '/integrations' },
    ],
    company: [
      { name: 'About', href: '/about' },
      { name: 'Blog', href: '/blog' },
      { name: 'Careers', href: '/careers' },
      { name: 'Press', href: '/press' },
    ],
    resources: [
      { name: 'Help Center', href: '/help' },
      { name: 'Tutorials', href: '/tutorials' },
      { name: 'Case Studies', href: '/case-studies' },
      { name: 'Contact', href: '/contact' },
    ],
    legal: [
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Cookie Policy', href: '/cookies' },
      { name: 'GDPR', href: '/gdpr' },
    ],
  };

  return (
    <footer className="relative bg-black border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-2 space-y-4">
            <Link
              href="/"
              className="flex items-center gap-3 text-white hover:text-teal-400 transition-colors"
            >
              <div className="relative">
                <FilmIcon className="h-8 w-8" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-teal-500 rounded-full animate-pulse" />
              </div>
              <span className="font-bold text-xl">CastMatch</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
              Revolutionizing casting for Mumbai's entertainment industry with AI-powered talent
              matching and intelligent workflow automation.
            </p>
            <div className="flex space-x-4">
              {/* Social Media Icons */}
              <a
                href="https://twitter.com/castmatch"
                className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors"
                aria-label="Twitter"
              >
                <svg
                  className="w-5 h-5 text-gray-400 hover:text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://linkedin.com/company/castmatch"
                className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors"
                aria-label="LinkedIn"
              >
                <svg
                  className="w-5 h-5 text-gray-400 hover:text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href="https://instagram.com/castmatch"
                className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <svg
                  className="w-5 h-5 text-gray-400 hover:text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.618 5.367 11.986 11.988 11.986s11.987-5.368 11.987-11.986C24.004 5.367 18.635.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.329-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.412-3.329c.881-.807 2.032-1.297 3.329-1.297s2.448.49 3.329 1.297c.922.881 1.412 2.032 1.412 3.329s-.49 2.448-1.412 3.244c-.881.807-2.032 1.297-3.329 1.297zm7.83-9.629h-1.587V5.772h1.587v1.587zm-.49 5.088c0 .881-.49 1.587-1.297 1.587s-1.297-.706-1.297-1.587.49-1.587 1.297-1.587 1.297.706 1.297 1.587z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Links Sections */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-semibold text-white mb-4 capitalize">{category}</h3>
              <ul className="space-y-3">
                {links.map(link => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-gray-400 hover:text-white text-sm transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter Signup */}
        <div className="border-t border-gray-800 pt-8 mb-8">
          <div className="max-w-md">
            <h3 className="font-semibold text-white mb-2">Stay Updated</h3>
            <p className="text-gray-400 text-sm mb-4">
              Get the latest updates on new features and industry insights.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <button className="px-6 py-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-full font-medium transition-all duration-300">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <span>© 2024 CastMatch. All rights reserved.</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>All systems operational</span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-400">
              <span>Made with ❤️ in Mumbai</span>
              <div className="flex items-center gap-2">
                <span>🇮🇳</span>
                <span>India</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
