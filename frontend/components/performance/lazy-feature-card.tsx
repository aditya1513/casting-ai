"use client";

import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { memo, useRef } from "react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";

interface LazyFeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  link: string;
}

export const LazyFeatureCard = memo(function LazyFeatureCard({ 
  title, 
  description, 
  icon: Icon, 
  link 
}: LazyFeatureCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(cardRef, { 
    threshold: 0.1,
    rootMargin: '100px 0px'
  });

  return (
    <div
      ref={cardRef}
      className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all duration-300 transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{
        transition: 'opacity 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      }}
    >
      {isVisible && (
        <>
          <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-md mb-4">
            <Icon className="h-6 w-6 text-indigo-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {title}
          </h3>
          <p className="text-gray-600 mb-4">{description}</p>
          <Link
            href={link}
            className="text-indigo-600 font-medium hover:text-indigo-500 transition-colors"
            prefetch={false}
          >
            Learn more →
          </Link>
        </>
      )}
    </div>
  );
});