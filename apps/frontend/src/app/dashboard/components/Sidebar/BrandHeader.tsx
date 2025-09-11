'use client';

import { FilmIcon } from '@heroicons/react/24/outline';

export default function BrandHeader() {
  return (
    <div className="h-16 px-6 border-b border-gray-200 flex items-center bg-white">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl flex items-center justify-center shadow-md">
          <FilmIcon className="w-5 h-5 text-white" />
        </div>
        <span className="font-semibold text-gray-900 text-lg tracking-tight">CastMatch</span>
      </div>
    </div>
  );
}
