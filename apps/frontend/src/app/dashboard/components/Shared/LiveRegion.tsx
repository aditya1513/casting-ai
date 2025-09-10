"use client";

import { useEffect, useRef } from 'react';

interface LiveRegionProps {
  message: string;
  priority?: 'polite' | 'assertive';
  clear?: boolean;
}

export default function LiveRegion({ 
  message, 
  priority = 'polite',
  clear = false 
}: LiveRegionProps) {
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (regionRef.current) {
      if (clear) {
        regionRef.current.textContent = '';
      } else if (message) {
        regionRef.current.textContent = message;
      }
    }
  }, [message, clear]);

  return (
    <div
      ref={regionRef}
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
      role="status"
    />
  );
}