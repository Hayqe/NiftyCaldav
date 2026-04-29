import { Calendar } from 'lucide-react';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "w-8 h-8" }: LogoProps) {
  return (
    <div className={`relative flex items-center justify-center bg-[#c26321] rounded-lg rotate-[5deg] ${className}`}>
      <Calendar className="w-[60%] h-[60%] text-white" strokeWidth={2.5} />
    </div>
  );
}
