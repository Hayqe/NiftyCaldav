import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export default function LoadingSpinner({
  size = 'md',
  className,
  text,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <Loader2 
        className={cn(
          'animate-spin text-primary-600',
          sizeClasses[size],
          className
        )}
      />
      {text && <p className="text-sm text-gray-600">{text}</p>}
    </div>
  );
}
