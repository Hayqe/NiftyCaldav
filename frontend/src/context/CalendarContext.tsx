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
    if (!isLoadingMy && !isLoadingShared && !isInitialized) {
      const saved = localStorage.getItem('activeCalendars');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as number[];
          const allIds = new Set(allCalendars.map(c => c.id));
          const filtered = new Set(parsed.filter(id => allIds.has(id)));
          setActiveCalendars(filtered);
        } catch {
          // Fallback to all calendars
          setActiveCalendars(new Set(allCalendars.map(c => c.id)));
        }
      } else {
        // No saved state, initialize with all calendars
        setActiveCalendars(new Set(allCalendars.map(c => c.id)));
      }
      setIsInitialized(true);
    }
  }, [isLoadingMy, isLoadingShared, isInitialized, allCalendars]);
  
  // Keep active calendars in sync when calendars list changes (e.g., new calendar added)
  useEffect(() => {
    if (isInitialized && !isLoadingMy && !isLoadingShared) {
      setActiveCalendars(prev => {
        const allIds = new Set(allCalendars.map(c => c.id));
        // Only keep IDs that still exist
        const filtered = new Set([...prev].filter(id => allIds.has(id)));
        return filtered;
      });
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
