'use client';

import { Button } from '@heroui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

interface MobileMenuProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function MobileMenu({ isOpen, onToggle }: MobileMenuProps) {
  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        isIconOnly
        variant="light"
        size="sm"
        className="md:hidden fixed top-4 left-4 z-50 bg-white shadow-md"
        onClick={onToggle}
      >
        {isOpen ? (
          <XMarkIcon className="h-5 w-5 text-gray-700" />
        ) : (
          <Bars3Icon className="h-5 w-5 text-gray-700" />
        )}
      </Button>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={onToggle} />
      )}
    </>
  );
}
