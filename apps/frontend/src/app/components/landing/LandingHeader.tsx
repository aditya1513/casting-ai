'use client';

import React, { useState, useEffect } from 'react';
import { Button, Navbar, NavbarBrand, NavbarContent, NavbarItem, NavbarMenuToggle, NavbarMenu, NavbarMenuItem } from '@heroui/react';
import { FilmIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Features', href: '#features' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-black/80 backdrop-blur-lg border-b border-white/10'
          : 'bg-transparent'
      }`}
    >
      <Navbar
        isMenuOpen={isMenuOpen}
        onMenuOpenChange={setIsMenuOpen}
        className="max-w-7xl mx-auto bg-transparent"
        maxWidth="full"
      >
        {/* Brand */}
        <NavbarBrand>
          <Link href="/" className="flex items-center gap-3 text-white hover:text-teal-400 transition-colors">
            <div className="relative">
              <FilmIcon className="h-8 w-8" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-teal-500 rounded-full animate-pulse" />
            </div>
            <span className="font-bold text-xl">CastMatch</span>
          </Link>
        </NavbarBrand>

        {/* Desktop Navigation */}
        <NavbarContent className="hidden md:flex gap-8" justify="center">
          {navItems.map((item) => (
            <NavbarItem key={item.name}>
              <Link
                href={item.href}
                className="text-gray-300 hover:text-white transition-colors duration-200 font-medium"
              >
                {item.name}
              </Link>
            </NavbarItem>
          ))}
        </NavbarContent>

        {/* Desktop CTA Buttons */}
        <NavbarContent className="hidden md:flex gap-3" justify="end">
          <NavbarItem>
            <Button
              as={Link}
              href="/login"
              variant="ghost"
              className="text-gray-300 hover:text-white hover:bg-white/5"
            >
              Sign In
            </Button>
          </NavbarItem>
          <NavbarItem>
            <Button
              as={Link}
              href="/register"
              className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-lg shadow-teal-500/25"
            >
              Get Started
            </Button>
          </NavbarItem>
        </NavbarContent>

        {/* Mobile Menu Toggle */}
        <NavbarMenuToggle
          className="md:hidden text-white"
          icon={isMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
        />

        {/* Mobile Menu */}
        <NavbarMenu className="bg-black/95 backdrop-blur-lg border-t border-white/10 pt-6">
          {navItems.map((item, index) => (
            <NavbarMenuItem key={item.name}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={item.href}
                  className="block py-3 text-gray-300 hover:text-white text-lg font-medium transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              </motion.div>
            </NavbarMenuItem>
          ))}
          
          <div className="pt-4 space-y-3">
            <Button
              as={Link}
              href="/login"
              variant="bordered"
              className="w-full border-gray-600 text-gray-300 hover:bg-white/5"
              onClick={() => setIsMenuOpen(false)}
            >
              Sign In
            </Button>
            <Button
              as={Link}
              href="/register"
              className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white"
              onClick={() => setIsMenuOpen(false)}
            >
              Get Started
            </Button>
          </div>
        </NavbarMenu>
      </Navbar>
    </motion.header>
  );
}