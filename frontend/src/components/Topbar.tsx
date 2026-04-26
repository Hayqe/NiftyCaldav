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
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
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

  const formatDateLabel = () => {
    switch (view) {
      case 'day':
        return format(selectedDate, 'EEEE d MMMM yyyy', { locale: nl });
      case 'week':
        const weekStart = new Date(selectedDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return `${format(weekStart, 'd MMM', { locale: nl })} - ${format(weekEnd, 'd MMM yyyy', { locale: nl })}`;
      case 'month':
        return format(selectedDate, 'MMMM yyyy', { locale: nl });
      case 'list':
        return 'Agenda lijst';
      default:
        return format(selectedDate, 'MMMM yyyy', { locale: nl });
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 pl-64">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left side - Date navigation */}
        <div className="flex items-center gap-4">
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
          
          <button
            onClick={goToToday}
            className="px-3 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <TodayIcon className="w-4 h-4" />
            <span>Vandaag</span>
          </button>
          
          <button
            onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
            className="px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="font-medium text-gray-900">{formatDateLabel()}</span>
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
      {isDatePickerOpen && (
        <div className="absolute left-64 top-16 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-80">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => {
                const newDate = new Date(selectedDate);
                newDate.setMonth(newDate.getMonth() - 1);
                setSelectedDate(newDate);
              }}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="font-medium">
              {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
            </h3>
            <button
              onClick={() => {
                const newDate = new Date(selectedDate);
                newDate.setMonth(newDate.getMonth() + 1);
                setSelectedDate(newDate);
              }}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {WEEKDAYS.map(day => (
              <div key={day} className="font-medium text-gray-500 py-1">
                {day}
              </div>
            ))}
            
            {/* Calendar grid */}
            {(() => {
              const year = selectedDate.getFullYear();
              const month = selectedDate.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const daysInPrevMonth = new Date(year, month, 0).getDate();
              
              const days: { day: number; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean }[] = [];
              
              // Previous month days
              for (let i = firstDay - 1; i >= 0; i--) {
                days.push({
                  day: daysInPrevMonth - i,
                  isCurrentMonth: false,
                  isToday: false,
                  isSelected: false,
                });
              }
              
              // Current month days
              const today = new Date();
              for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                days.push({
                  day,
                  isCurrentMonth: true,
                  isToday: date.toDateString() === today.toDateString(),
                  isSelected: date.toDateString() === selectedDate.toDateString(),
                });
              }
              
              // Next month days
              const remainingDays = 42 - days.length;
              for (let day = 1; day <= remainingDays; day++) {
                days.push({
                  day,
                  isCurrentMonth: false,
                  isToday: false,
                  isSelected: false,
                });
              }
              
              return days.slice(0, 42).map((day, index) => (
                <button
                  key={index}
                  onClick={() => {
                    const newDate = new Date(year, month, day.day);
                    setSelectedDate(newDate);
                    setIsDatePickerOpen(false);
                  }}
                  className={cn(
                    'py-2 rounded-lg transition-colors aspect-square',
                    day.isSelected ? 'bg-primary-600 text-white' : '',
                    day.isToday && !day.isSelected ? 'bg-primary-50 text-primary-700' : '',
                    !day.isCurrentMonth ? 'text-gray-400 hover:bg-gray-100' : 'hover:bg-gray-100 text-gray-700'
                  )}
                >
                  {day.day}
                </button>
              ));
            })()}
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setIsDatePickerOpen(false)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Selecteren
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

// Helper function for class names
function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
