import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { useMyCalendars, useSharedCalendars, useSettings } from '@/hooks';
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
  const { data: settings } = useSettings();
  
  const myCalendars = myCalendarsData?.data || [];
  const sharedCalendars = sharedCalendarsData?.data || [];
  const allCalendars = [...myCalendars, ...sharedCalendars];
  
  // Load active calendars from localStorage
  const [activeCalendars, setActiveCalendars] = useState<Set<number>>(new Set());
  
  // Track calendars we've seen to detect truly new ones
  const seenCalendarIds = useRef<Set<number>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isViewInitialized, setIsViewInitialized] = useState(false);
  
  useEffect(() => {
    if (!isLoadingMy && !isLoadingShared && allCalendars.length > 0) {
      const allIds = allCalendars.map(c => c.id);
      
      if (!isInitialized) {
        // First load: initialize from localStorage or default to all active
        const saved = localStorage.getItem('activeCalendars');
        if (saved) {
          try {
            const savedIds = JSON.parse(saved) as number[];
            // Filter out IDs that no longer exist
            const validSavedIds = savedIds.filter(id => allIds.includes(id));
            setActiveCalendars(new Set(validSavedIds));
          } catch (e) {
            console.error('Failed to parse activeCalendars from localStorage', e);
            setActiveCalendars(new Set(allIds));
          }
        } else {
          setActiveCalendars(new Set(allIds));
        }
        
        // Mark all current calendars as seen
        allIds.forEach(id => seenCalendarIds.current.add(id));
        setIsInitialized(true);
      } else {
        // Sub-sequent loads: only auto-activate TRULY new calendars
        const newCalendarIds = allIds.filter(id => !seenCalendarIds.current.has(id));
        
        if (newCalendarIds.length > 0) {
          setActiveCalendars(prev => {
            const newSet = new Set(prev);
            newCalendarIds.forEach(id => {
              newSet.add(id);
              seenCalendarIds.current.add(id);
            });
            // Save updated state to localStorage
            localStorage.setItem('activeCalendars', JSON.stringify(Array.from(newSet)));
            return newSet;
          });
        }
      }
    }
  }, [isLoadingMy, isLoadingShared, isInitialized, allCalendars]);

  const [view, setView] = useState<CalendarView>('month');

  // Initialize view from settings
  useEffect(() => {
    if (settings?.data?.default_view && !isViewInitialized) {
      setView(settings.data.default_view as CalendarView);
      setIsViewInitialized(true);
    }
  }, [settings, isViewInitialized]);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCalendarId, setSelectedCalendarId] = useState<number | null>(null);

  const toggleCalendar = useCallback((calendarId: number) => {
    setActiveCalendars(prev => {
      const newSet = new Set(prev);
      if (newSet.has(calendarId)) {
        newSet.delete(calendarId);
      } else {
        newSet.add(calendarId);
      }
      // Save to localStorage
      localStorage.setItem('activeCalendars', JSON.stringify(Array.from(newSet)));
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
