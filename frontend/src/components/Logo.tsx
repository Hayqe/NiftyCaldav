import { Calendar } from 'lucide-react';

export default function Logo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Rotated square background */}
      <div className="absolute w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl logo-square shadow-lg" />
      {/* Calendar icon */}
      <Calendar className={`relative z-10 text-white ${className}`} />
    </div>
  );
}
