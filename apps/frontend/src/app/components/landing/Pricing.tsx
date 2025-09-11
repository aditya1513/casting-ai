'use client';

import React, { useState } from 'react';
import { Card, CardBody, Button, Switch } from '@heroui/react';
import { CheckIcon, StarIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import Link from 'next/link';

const plans = [
  {
    name: 'Starter',
    description: 'Perfect for indie filmmakers and small productions',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      'Up to 5 casting projects',
      'Basic AI talent matching',
      '50 talent profiles access',
      'Email support',
      'Basic analytics',
    ],
    buttonText: 'Get Started Free',
    buttonVariant: 'bordered' as const,
    popular: false,
  },
  {
    name: 'Professional',
    description: 'Ideal for casting directors and production houses',
    monthlyPrice: 99,
    yearlyPrice: 79,
    features: [
      'Unlimited casting projects',
      'Advanced AI matching',
      '10,000+ talent profiles',
      'Priority support',
      'Advanced analytics dashboard',
      'Team collaboration tools',
      'Calendar integration',
      'Custom workflows',
    ],
    buttonText: 'Start Free Trial',
    buttonVariant: 'solid' as const,
    popular: true,
  },
  {
    name: 'Enterprise',
    description: 'For large studios and production companies',
    monthlyPrice: 299,
    yearlyPrice: 249,
    features: [
      'Everything in Professional',
      'White-label solution',
      'API access',
      'Custom integrations',
      'Dedicated account manager',
      'Advanced security features',
      'Custom reporting',
      'SLA guarantee',
    ],
    buttonText: 'Contact Sales',
    buttonVariant: 'bordered' as const,
    popular: false,
  },
];

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
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
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
            Choose the perfect plan for your casting needs. All plans include our core AI features
            with no hidden fees.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm font-medium ${!isYearly ? 'text-white' : 'text-gray-400'}`}>
              Monthly
            </span>
            <Switch
              isSelected={isYearly}
              onValueChange={setIsYearly}
              classNames={{
                wrapper: 'bg-gray-700 group-data-[selected=true]:bg-teal-600',
              }}
            />
            <span className={`text-sm font-medium ${isYearly ? 'text-white' : 'text-gray-400'}`}>
              Yearly
            </span>
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white text-xs px-2 py-1 rounded-full">
              Save 20%
            </div>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className={`h-full ${plan.popular ? 'relative' : ''}`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1">
                    <StarIcon className="w-4 h-4" />
                    Most Popular
                  </div>
                </div>
              )}

              <Card
                className={`h-full relative overflow-hidden ${
                  plan.popular
                    ? 'bg-gradient-to-br from-teal-900/20 to-gray-900/50 border-2 border-teal-500/50'
                    : 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50'
                } backdrop-blur-sm hover:border-gray-600/50 transition-all duration-300`}
              >
                {plan.popular && (
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-transparent pointer-events-none" />
                )}

                <CardBody className="p-8 relative z-10">
                  {/* Plan Header */}
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <p className="text-gray-400 text-sm mb-6">{plan.description}</p>

                    {/* Price */}
                    <div className="space-y-2">
                      <div className="flex items-end justify-center gap-1">
                        <span className="text-5xl font-bold text-white">
                          ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                        </span>
                        <span className="text-gray-400 text-lg mb-2">
                          /{isYearly ? 'mo' : 'mo'}
                        </span>
                      </div>
                      {isYearly && plan.monthlyPrice > 0 && (
                        <div className="text-sm text-gray-500">
                          Billed annually (${plan.yearlyPrice * 12}/year)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <motion.div
                        key={featureIndex}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 + featureIndex * 0.05 }}
                        viewport={{ once: true }}
                        className="flex items-center gap-3"
                      >
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                            plan.popular ? 'bg-teal-500' : 'bg-gray-600'
                          }`}
                        >
                          <CheckIcon className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <Button
                    as={plan.buttonText === 'Start Free Trial' ? Link : undefined}
                    href={plan.buttonText === 'Start Free Trial' ? '/register' : undefined}
                    size="lg"
                    radius="full"
                    className={`w-full font-semibold ${
                      plan.popular
                        ? 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-lg shadow-teal-500/25'
                        : 'border-gray-600 text-gray-300 hover:bg-white/5'
                    }`}
                    variant={plan.buttonVariant}
                  >
                    {plan.buttonText}
                  </Button>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-20 text-center"
        >
          <h3 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                q: 'Can I change my plan anytime?',
                a: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.',
              },
              {
                q: 'Is there a free trial?',
                a: 'Yes! Professional and Enterprise plans come with a 14-day free trial. No credit card required.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards, PayPal, and bank transfers for Enterprise customers.',
              },
              {
                q: 'Do you offer custom enterprise solutions?',
                a: 'Absolutely! Contact our sales team to discuss custom features and pricing for large organizations.',
              },
            ].map((faq, index) => (
              <div key={index} className="text-left">
                <h4 className="font-semibold text-white mb-2">{faq.q}</h4>
                <p className="text-gray-400 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
