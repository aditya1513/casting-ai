'use client';

import React from 'react';
import { Card, CardBody } from '@heroui/react';
import {
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  UserGroupIcon,
  ClockIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

const features = [
  {
    icon: MagnifyingGlassIcon,
    title: 'AI-Powered Talent Matching',
    description:
      'Advanced algorithms analyze scripts and find perfect talent matches based on character requirements, acting styles, and previous performances.',
  },
  {
    icon: CalendarDaysIcon,
    title: 'Intelligent Scheduling',
    description:
      'Automated audition scheduling with conflict detection, preference matching, and real-time updates for all stakeholders.',
  },
  {
    icon: ChartBarIcon,
    title: 'Analytics Dashboard',
    description:
      'Data-driven insights on casting decisions, talent performance, and project metrics to optimize your casting process.',
  },
  {
    icon: UserGroupIcon,
    title: 'Collaborative Workspace',
    description:
      'Seamless collaboration between directors, producers, and casting teams with shared notes and real-time feedback.',
  },
  {
    icon: ClockIcon,
    title: 'Time-Saving Automation',
    description:
      'Automate repetitive tasks like sending callback notifications, scheduling follow-ups, and managing talent databases.',
  },
  {
    icon: BoltIcon,
    title: 'Fast Performance',
    description:
      'Lightning-fast search and matching capabilities powered by cloud infrastructure and optimized algorithms.',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/5 to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-6">
            Powerful Features for
            <br />
            Modern Casting
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Streamline your casting process with cutting-edge AI technology, intelligent automation,
            and collaborative tools designed for Mumbai's entertainment industry.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="h-full"
            >
              <Card className="h-full bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 backdrop-blur-sm hover:border-gray-600/50 transition-all duration-300">
                <CardBody className="p-6">
                  {/* Icon */}
                  <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 mb-6">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Content */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                    <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <p className="text-gray-400 mb-6">Ready to revolutionize your casting process?</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold rounded-full shadow-lg shadow-teal-500/25 transition-all duration-300"
            >
              Start Your Free Trial
            </motion.button>
            <button className="px-8 py-3 text-gray-300 hover:text-white border border-gray-600 hover:border-gray-500 rounded-full transition-colors duration-300">
              Schedule Demo
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
