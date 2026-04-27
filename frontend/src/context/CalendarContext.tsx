import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useMyCalendars, useSharedCalendars } from '@/hooks';
import type { Calendar, CalendarView } from '@/types';

interface CalendarContextType {
  // Calendars
  myCalendars: Calendar[];
  sharedCalendars: Calendar[];
  isLoadingCalendars: boolean;
  
  // Active calendars
  activeCalendars: Set<number>;
  toggleCalendar: (calendarId: number) => void;
  isCalendarActive: (calendarId: number) => boolean;
  
  // View
  view: CalendarView;
  setView: (view: CalendarView) => void;
  
  // Selected date
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  
  // Selected calendar for events
  selectedCalendarId: number | null;
  setSelectedCalendarId: (id: number | null) => void;
  
  // Get all active calendar IDs
  getActiveCalendarIds: () => number[];
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

interface CalendarProviderProps {
  children: ReactNode;
}

export function CalendarProvider({ children }: CalendarProviderProps) {
  const { data: myCalendarsData, isLoading: isLoadingMy } = useMyCalendars();
  const { data: sharedCalendarsData, isLoading: isLoadingShared } = useSharedCalendars();
  
  const myCalendars = myCalendarsData?.data || [];
  const sharedCalendars = sharedCalendarsData?.data || [];
  const allCalendars = [...myCalendars, ...sharedCalendars];
  const allCalendarIds = new Set(allCalendars.map(c => c.id));
  
  // Load active calendars from localStorage, filtering out non-existent IDs
  const [activeCalendars, setActiveCalendars] = useState<Set<number>>(new Set());
  
  // Initialize active calendars once calendars are loaded
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    if (!isLoadingMy && !isLoadingShared) {
      const allIds = allCalendars.map(c => c.id);
      if (allIds.length > 0) {
        if (!isInitialized) {
          // First load: initialize with all calendars
          setActiveCalendars(new Set(allIds));
          setIsInitialized(true);
        } else {
          // Sub-sequent loads: ensure newly added calendars are also active
          setActiveCalendars(prev => {
            const newSet = new Set(prev);
            let changed = false;
            allIds.forEach(id => {
              if (!newSet.has(id)) {
                newSet.add(id);
                changed = true;
              }
            });
            return changed ? newSet : prev;
          });
        }
      }
    }
  }, [isLoadingMy, isLoadingShared, isInitialized, allCalendars]);

  const [view, setView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCalendarId, setSelectedCalendarId] = useState<number | null>(null);

  const toggleCalendar = useCallback((calendarId: number) => {
    setActiveCalendars(prev => {
      const newSet = new Set(prev);
      const hadIt = newSet.has(calendarId);
      if (hadIt) {
        newSet.delete(calendarId);
      } else {
        newSet.add(calendarId);
      }
      // Save to localStorage
      const arr = Array.from(newSet);
      localStorage.setItem('activeCalendars', JSON.stringify(arr));
      console.log(`Toggled calendar ${calendarId}. Active:`, arr);
      return newSet;
    });
  }, []);

  const isCalendarActive = useCallback((calendarId: number) => {
    return activeCalendars.has(calendarId);
  }, [activeCalendars]);

  const getActiveCalendarIds = useCallback(() => {
    return Array.from(activeCalendars);
  }, [activeCalendars]);

  return (
    <CalendarContext.Provider value={{
      myCalendars,
      sharedCalendars,
      isLoadingCalendars: isLoadingMy || isLoadingShared,
      activeCalendars,
      toggleCalendar,
      isCalendarActive,
      view,
      setView,
      selectedDate,
      setSelectedDate,
      selectedCalendarId,
      setSelectedCalendarId,
      getActiveCalendarIds,
    }}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendarContext() {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendarContext must be used within a CalendarProvider');
  }
  return context;
}
