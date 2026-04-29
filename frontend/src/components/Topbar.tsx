import { useState } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCalendarContext } from '@/context/CalendarContext';
import { CALENDAR_VIEWS, WEEKDAYS, MONTHS } from '@/utils/constants';

// Import icons from lucide-react
import { CalendarDays, Calendar as CalendarIcon, List } from 'lucide-react';

const viewIcons: Record<string, React.ReactNode> = {
  day: <CalendarDays className="w-4 h-4" />,
  week: <CalendarIcon className="w-4 h-4" />,
  month: <CalendarIcon className="w-4 h-4" />,
  list: <List className="w-4 h-4" />,
};

// Custom Today icon component since it's not in lucide-react
function TodayIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x={3} y={4} width={18} height={18} rx={2} ry={2} />
      <line x1={16} y1={2} x2={16} y2={6} />
      <line x1={8} y1={2} x2={8} y2={6} />
      <line x1={3} y1={10} x2={21} y2={10} />
      <circle cx={12} cy={14} r={3} />
    </svg>
  );
}

export default function Topbar() {
  
  const {
    view,
    setView,
    selectedDate,
    setSelectedDate,
  } = useCalendarContext();

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    
    if (view === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left side - Date navigation */}
        <div className="flex items-center gap-4">
          <button
            onClick={goToToday}
            className="px-3 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <TodayIcon className="w-4 h-4" />
            <span>Vandaag</span>
          </button>

          <button
            onClick={() => navigateDate('prev')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <button
            onClick={() => navigateDate('next')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Right side - View selection */}
        <div className="flex items-center gap-2">
          {CALENDAR_VIEWS.map(viewOption => (
            <button
              key={viewOption.id}
              onClick={() => setView(viewOption.id)}
              className={cn(
                'p-2 rounded-lg transition-colors flex items-center gap-2',
                view === viewOption.id
                  ? 'bg-primary-100 text-primary-700'
                  : 'hover:bg-gray-100 text-gray-600'
              )}
              title={viewOption.label}
            >
              {viewIcons[viewOption.id]}
              <span className="hidden md:inline text-sm">{viewOption.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Date Picker Dropdown */}
    </header>
  );
}

// Helper function for class names
function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
