'use client';

import React from 'react';
import { Card, CardBody } from '@heroui/react';
import { 
  DocumentTextIcon, 
  MagnifyingGlassIcon, 
  CalendarDaysIcon,
  CheckCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

const steps = [
  {
    step: '01',
    icon: DocumentTextIcon,
    title: 'Upload Your Script',
    description: 'Simply upload your script and let our AI analyze character requirements, mood, and casting needs.',
    details: [
      'AI-powered script analysis',
      'Character requirement extraction',
      'Mood and tone identification'
    ]
  },
  {
    step: '02',
    icon: MagnifyingGlassIcon,
    title: 'AI Matches Talent',
    description: 'Our intelligent system searches through thousands of profiles to find the perfect matches for each role.',
    details: [
      'Smart talent matching',
      'Portfolio analysis',
      'Previous work evaluation'
    ]
  },
  {
    step: '03',
    icon: CalendarDaysIcon,
    title: 'Schedule & Manage',
    description: 'Seamlessly schedule auditions, manage callbacks, and collaborate with your team in real-time.',
    details: [
      'Automated scheduling',
      'Real-time collaboration',
      'Progress tracking'
    ]
  }
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/5" />
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
            How It Works
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            From script to screen in three simple steps. 
            Our AI-powered platform streamlines every aspect of the casting process.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="space-y-12">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${
                index % 2 === 1 ? 'lg:flex-row-reverse' : ''
              }`}>
                {/* Content */}
                <div className={`space-y-6 ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="text-6xl font-bold text-gray-800">
                      {step.step}
                    </div>
                    <div className="w-px h-16 bg-gradient-to-b from-teal-500 to-transparent" />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-3xl font-bold text-white">
                      {step.title}
                    </h3>
                    <p className="text-xl text-gray-400 leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {step.details.map((detail, detailIndex) => (
                      <motion.div
                        key={detailIndex}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.5 + detailIndex * 0.1 }}
                        viewport={{ once: true }}
                        className="flex items-center gap-3"
                      >
                        <CheckCircleIcon className="w-5 h-5 text-teal-500 flex-shrink-0" />
                        <span className="text-gray-300">{detail}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Visual */}
                <div className={`${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                  <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 backdrop-blur-sm hover:border-gray-600/50 transition-all duration-300 p-8">
                    <CardBody className="flex items-center justify-center">
                      <div className="relative">
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="w-32 h-32 bg-gradient-to-br from-teal-500 to-teal-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-teal-500/30"
                        >
                          <step.icon className="w-16 h-16 text-white" />
                        </motion.div>
                        
                        {/* Connecting Line */}
                        {index < steps.length - 1 && (
                          <div className="hidden lg:block absolute top-1/2 -right-24 w-16 h-px bg-gradient-to-r from-teal-500 to-transparent">
                            <ArrowRightIcon className="w-4 h-4 text-teal-500 absolute -top-2 right-0" />
                          </div>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                </div>
              </div>

              {/* Mobile Connecting Line */}
              {index < steps.length - 1 && (
                <div className="lg:hidden flex justify-center mt-8">
                  <div className="w-px h-8 bg-gradient-to-b from-teal-500 to-transparent" />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          viewport={{ once: true }}
          className="text-center mt-20"
        >
          <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-2xl p-8 backdrop-blur-sm">
            <h3 className="text-2xl font-bold text-white mb-4">
              Ready to Get Started?
            </h3>
            <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
              Join hundreds of casting directors who have already transformed their workflow with CastMatch.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 transition-all duration-300"
            >
              Start Your Free Trial
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}