import React, { useState } from 'react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMinutes, getWeek } from 'date-fns';
import { nl } from 'date-fns/locale';
import { MapPin, Plus } from 'lucide-react';
import { useCalendarContext } from '@/context/CalendarContext';
import { useEvents, useCreateEvent, useUpdateEvent, useSettings } from '@/hooks';
import type { Event } from '@/types';
import { CALENDAR_COLORS, WEEKDAYS } from '@/utils/constants';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function HomePage() {
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEventDate, setSelectedEventDate] = useState<Date | null>(null);
  const [selectedEventCalendarId, setSelectedEventCalendarId] = useState<number | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [eventFormData, setEventFormData] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    all_day: false,
    location: '',
  });
  
  const {
    myCalendars,
    sharedCalendars,
    view,
    selectedDate,
    getActiveCalendarIds,
  } = useCalendarContext();

  const { data: settingsResponse } = useSettings();
  const settings = settingsResponse?.data;

  const activeCalendarIds = getActiveCalendarIds();
  
  // Get date range based on view
  const getDateRange = () => {
    switch (view) {
      case 'day':
        return { start: startOfDay(selectedDate), end: endOfDay(selectedDate) };
      case 'week':
        return { start: startOfWeek(selectedDate, { weekStartsOn: 1 }), end: endOfWeek(selectedDate, { weekStartsOn: 1 }) };
      case 'month':
        return { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) };
      default:
        return { start: startOfDay(selectedDate), end: endOfDay(selectedDate) };
    }
  };
  
  const dateRange = getDateRange();
  
  // Fetch events for active calendars
  const { data: eventsData, isLoading: isLoadingEvents } = useEvents(
    activeCalendarIds.length > 0 ? activeCalendarIds : [],
    dateRange
  );
  const events = eventsData || [];
  
  const createEventMutation = useCreateEvent();
  const updateEventMutation = useUpdateEvent();

  // Group events by date for month/week view
  const groupEventsByDate = () => {
    const grouped = new Map<string, typeof events>();
    
    events.forEach(event => {
      const startDate = parseISO(event.start);
      const endDate = parseISO(event.end);
      
      // Get all days between start and end
      const days = eachDayOfInterval({
        start: startOfDay(startDate),
        end: startOfDay(endDate)
      });
      
      days.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        if (!grouped.has(dateKey)) {
          grouped.set(dateKey, []);
        }
        // Avoid duplicates if the interval logic is overlapping
        if (!grouped.get(dateKey)?.find(e => e.id === event.id)) {
          grouped.get(dateKey)?.push(event);
        }
      });
    });
    
    return grouped;
  };

  const eventsByDate = groupEventsByDate();

  // Get calendar color - supports both hex colors (e.g., #a97671ff) and color names (e.g., 'blue')
  const getCalendarColor = (calendarId: number) => {
    const allCalendars = [...myCalendars, ...sharedCalendars];
    const calendar = allCalendars.find(c => c.id === calendarId);
    const calendarIndex = allCalendars.findIndex(c => c.id === calendarId);
    
    // If calendar has a color stored, use it
    if (calendar?.color) {
      // Check if it's already a hex color
      if (calendar.color.startsWith('#')) {
        return calendar.color;
      }
      // Look up color name in CALENDAR_COLORS
      const colorObj = CALENDAR_COLORS.find(c => c.value === calendar.color);
      if (colorObj) return colorObj.hex;
    }
    
    // Fallback: use color based on calendar index for consistent colors
    return CALENDAR_COLORS[calendarIndex % CALENDAR_COLORS.length]?.hex || CALENDAR_COLORS[0].hex;
  };

  // Handle cell click for event creation
  const handleDateClick = (date: Date) => {
    const defaultCalId = settings?.default_calendar_id;
    const calendarId = (defaultCalId && [...myCalendars, ...sharedCalendars].find(c => c.id === defaultCalId)) 
      ? defaultCalId 
      : (activeCalendarIds.length > 0 ? activeCalendarIds[0] : null);
      
    if (calendarId) {
      const duration = settings?.default_duration || 60;
      const startDateTime = new Date(date);
      startDateTime.setHours(9, 0, 0, 0);
      const endDateTime = addMinutes(startDateTime, duration);

      setSelectedEventDate(date);
      setSelectedEventCalendarId(calendarId);
      setEventFormData({
        ...eventFormData,
        title: '',
        description: '',
        start: format(startDateTime, "yyyy-MM-dd'T'HH:mm:00"),
        end: format(endDateTime, "yyyy-MM-dd'T'HH:mm:00"),
        all_day: false,
        location: '',
      });
      setIsEventModalOpen(true);
    }
  };

  // Handle creating or updating an event
  const handleSaveEvent = async () => {
    if (!selectedEventCalendarId || !eventFormData?.title?.trim()) return;

    try {
      let start = eventFormData.start;
      let end = eventFormData.end;

      if (eventFormData.all_day) {
        // For all-day events, use only the date part (YYYY-MM-DD)
        // This ensures the backend/CalDAV treats it as a true DATE value without time
        start = eventFormData.start.split('T')[0];
        end = eventFormData.end.split('T')[0];
      }

      if (editingEvent) {
        // Update existing event
        await updateEventMutation.mutateAsync({
          calendarId: selectedEventCalendarId,
          eventId: editingEvent.id,
          event: {
            title: eventFormData.title,
            description: eventFormData.description || null,
            start: start,
            end: end,
            all_day: eventFormData.all_day,
            location: eventFormData.location || null,
          },
        });
      } else {
        // Create new event
        await createEventMutation.mutateAsync({
          calendarId: selectedEventCalendarId,
          event: {
            title: eventFormData.title,
            description: eventFormData.description || null,
            start: start,
            end: end,
            all_day: eventFormData.all_day,
            location: eventFormData.location || null,
            recurring: false,
            recurrence_rule: null,
            color: null,
          },
        });
      }
      
      // Reset form and close modal
      setIsEventModalOpen(false);
      setEditingEvent(null);
      setEventFormData({
        title: '',
        description: '',
        start: '',
        end: '',
        all_day: false,
        location: '',
      });
    } catch (error) {
      console.error(editingEvent ? 'Failed to update event:' : 'Failed to create event:', error);
    }
  };

  // Handle clicking on an existing event to edit
  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setSelectedEventCalendarId(event.calendar_id);
    setEventFormData({
      title: event.title || '',
      description: event.description || '',
      start: event.start || '',
      end: event.end || '',
      all_day: event.all_day || false,
      location: event.location || '',
    });
    setIsEventModalOpen(true);
  };

  // Helper for class names
  function cn(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
  }

  // Render different calendar views
  const renderView = () => {
    switch (view) {
      case 'month':
        return renderMonthView();
      case 'week':
        return renderWeekView();
      case 'day':
        return renderDayView();
      case 'list':
        return renderListView();
      default:
        return renderMonthView();
    }
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    const calendarDays = eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd,
    });

    const today = new Date();

    // Get events for each day
    const getEventsForDay = (date: Date) => {
      const dateKey = format(date, 'yyyy-MM-dd');
      return eventsByDate.get(dateKey) || [];
    };

    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Month header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {format(selectedDate, 'MMMM yyyy', { locale: nl })}
          </h2>
        </div>
        
        {/* Weekday headers */}
        <div className={cn("grid gap-px bg-gray-200", settings?.show_week_numbers ? "grid-cols-[40px_repeat(7,1fr)]" : "grid-cols-7")}>
          {settings?.show_week_numbers && (
            <div className="bg-gray-50 p-3 text-center text-[10px] font-bold text-gray-400 uppercase flex items-center justify-center">
              Wk
            </div>
          )}
          {WEEKDAYS.map(day => (
            <div key={day} className="bg-white p-3 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className={cn("grid gap-px bg-gray-200", settings?.show_week_numbers ? "grid-cols-[40px_repeat(7,1fr)]" : "grid-cols-7")}>
          {calendarDays.map((date, index) => {
            const dayEvents = getEventsForDay(date);
            const isSelected = isSameDay(date, selectedDate);
            const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
            const isToday = isSameDay(date, today);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const showWeekNum = settings?.show_week_numbers && (index % 7 === 0);
            
            return (
              <React.Fragment key={index}>
                {showWeekNum && (
                  <div className="bg-gray-50 flex items-center justify-center text-[11px] font-bold text-gray-400 border-r border-gray-100">
                    {getWeek(date, { weekStartsOn: 1 })}
                  </div>
                )}
                <div
                  className={cn(
                    'relative p-2 min-h-[120px] hover:bg-gray-50 cursor-pointer transition-colors',
                    isSelected ? 'bg-primary-50' : 'bg-white'
                  )}
                  style={
                    settings?.highlight_weekend && isWeekend
                      ? { backgroundColor: '#FFF7ED' }
                      : undefined
                  }
                  onClick={() => handleDateClick(date)}
                >
                  {/* Day number */}
                  <div className="mb-1">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isToday && !isSelected ? 'bg-primary-600 text-white px-2 py-0.5 rounded' : '',
                        isCurrentMonth ? 'text-gray-700' : 'text-gray-400'
                      )}
                    >
                      {date.getDate()}
                    </span>
                  </div>
                  
                  {/* Events */}
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event, eventIndex) => {
                      const color = getCalendarColor(event.calendar_id);
                      const startTime = format(parseISO(event.start), 'HH:mm');
                      return (
                        <div
                          key={eventIndex}
                          className="px-1 py-0.5 rounded text-xs cursor-pointer"
                          style={{ backgroundColor: color }}
                          title={event.all_day ? `Hele dag: ${event.title}` : `${startTime} - ${format(parseISO(event.end), 'HH:mm')}: ${event.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditEvent(event);
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <span className="text-white font-bold">
                              {event.all_day ? '' : `${startTime} `}{event.title}
                            </span>
                            {event.location && <MapPin className="w-3 h-3 text-white/80" />}
                          </div>
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="px-1 py-0.5 rounded text-xs text-gray-500 bg-gray-100">
                        +{dayEvents.length - 3} meer
                      </div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
    });

    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col max-h-[calc(100vh-140px)]">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 sticky top-0 z-30">
          <h2 className="text-lg font-semibold text-gray-900">
            {format(weekStart, 'd MMMM yyyy', { locale: nl })} - {
              format(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000), 'd MMMM yyyy', { locale: nl })
            }
          </h2>
        </div>
        
        <div className="overflow-auto flex-1">
          <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-px bg-gray-200">
            {/* Time header - Sticky to both top and left */}
            <div className="bg-gray-50 p-3 text-right text-sm font-medium text-gray-500 sticky top-0 left-0 z-40 border-b border-gray-200">
              Tijd
            </div>
            {weekDays.map((day, index) => (
              <div
                key={index}
                className={cn(
                  'bg-gray-50 p-3 text-center text-sm font-medium sticky top-0 z-30 border-b border-gray-200',
                  isSameDay(day, selectedDate) ? 'bg-primary-50' : ''
                )}
              >
                <div>{WEEKDAYS[index]}</div>
                <div className={cn(
                  'text-xs mt-1',
                  isSameDay(day, new Date()) ? 'bg-primary-600 text-white px-2 py-0.5 rounded inline-block' : 'block'
                )}>
                  {day.getDate()}
                </div>
              </div>
            ))}
            
            {/* All-day events row */}
            <div className="bg-gray-50 p-2 text-right text-[10px] font-bold text-gray-400 border-b border-gray-200 sticky top-[70px] left-0 z-40">
              Hele dag
            </div>
            {weekDays.map((day, dayIndex) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDate.get(dayKey) || [];
              const allDayEvents = dayEvents.filter(e => e.all_day);
              
              return (
                <div key={`allday-${dayIndex}`} className="bg-white p-1 border-b border-gray-200 sticky top-[70px] z-30 min-h-[40px]">
                  {allDayEvents.map(event => (
                    <div
                      key={event.id}
                      className="mb-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-white truncate cursor-pointer shadow-sm"
                      style={{ backgroundColor: getCalendarColor(event.calendar_id) }}
                      onClick={() => handleEditEvent(event)}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Time slots column - Sticky to left */}
            <div className="bg-white sticky left-0 z-20 border-r border-gray-100">
              {(() => {
                const timeSlots = [];
                for (let hour = 0; hour < 24; hour++) {
                  timeSlots.push(
                    <div key={`${hour}-00`} className="p-3 text-right text-xs text-gray-500 border-b border-gray-200 flex items-center justify-end bg-white" style={{ height: '60px' }}>
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                  );
                }
                return timeSlots;
              })()}
            </div>

            {/* Days columns with events as blocks in multiple lanes */}
            {weekDays.map((day, dayIndex) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayEvents = (eventsByDate.get(dayKey) || []).filter(e => !e.all_day);
              const isWeekend = dayIndex >= 5;

              // Sort events by start time
              const sortedEvents = [...dayEvents].sort((a, b) => 
                parseISO(a.start).getTime() - parseISO(b.start).getTime()
              );

              return (
                <div 
                  key={dayIndex} 
                  className={cn(
                    "relative border-b border-gray-200 min-h-[1440px]"
                  )} 
                  style={
                    settings?.highlight_weekend && isWeekend
                      ? { backgroundColor: '#FFF7ED' }
                      : { backgroundColor: 'white' }
                  }
                  onClick={() => handleDateClick(day)}
                >                  {/* Horizontal hour lines */}
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="absolute left-0 right-0 border-b border-gray-100" style={{ top: `${i * 60}px`, height: '60px' }} />
                  ))}

                  {(() => {
                    if (sortedEvents.length === 0) return null;

                    // Group events into clusters of overlapping events
                    const clusters: (typeof sortedEvents)[] = [];
                    let currentCluster: typeof sortedEvents = [];
                    let clusterEnd = 0;

                    sortedEvents.forEach(event => {
                      const start = parseISO(event.start).getTime();
                      const end = parseISO(event.end).getTime();

                      if (start >= clusterEnd) {
                        if (currentCluster.length > 0) clusters.push(currentCluster);
                        currentCluster = [event];
                        clusterEnd = end;
                      } else {
                        currentCluster.push(event);
                        clusterEnd = Math.max(clusterEnd, end);
                      }
                    });
                    if (currentCluster.length > 0) clusters.push(currentCluster);

                    // Render each cluster
                    return clusters.map(cluster => {
                      const timePoints = cluster.flatMap(event => [
                        { time: parseISO(event.start).getTime(), type: 'start', id: event.id },
                        { time: parseISO(event.end).getTime(), type: 'end', id: event.id }
                      ]).sort((a, b) => {
                        if (a.time !== b.time) return a.time - b.time;
                        return a.type === 'end' ? -1 : 1;
                      });

                      let clusterMax = 0;
                      let current = 0;
                      timePoints.forEach(p => {
                        if (p.type === 'start') current++;
                        else current--;
                        clusterMax = Math.max(clusterMax, current);
                      });

                      const numColumns = Math.max(clusterMax, 1);
                      const colWidth = 100 / numColumns;

                      const columns: string[][] = Array.from({ length: numColumns }, () => []);

                      return cluster.map((event) => {
                        const eventStart = parseISO(event.start);
                        const eventEnd = parseISO(event.end);
                        const startTime = eventStart.getTime();
                        const endTime = eventEnd.getTime();

                        let colIndex = 0;
                        for (let i = 0; i < numColumns; i++) {
                          const hasOverlap = columns[i].some(id => {
                            const other = cluster.find(e => e.id === id);
                            if (!other) return false;
                            const otherStart = parseISO(other.start).getTime();
                            const otherEnd = parseISO(other.end).getTime();
                            return startTime < otherEnd && otherStart < endTime;
                          });
                          if (!hasOverlap) {
                            colIndex = i;
                            columns[i].push(event.id);
                            break;
                          }
                        }

                        const color = getCalendarColor(event.calendar_id);
                        const top = (eventStart.getHours() * 60 + eventStart.getMinutes()) / 60 * 60;
                        const height = Math.max(((endTime - startTime) / (1000 * 60 * 60)) * 60, 30);

                        return (
                          <div
                            key={event.id}
                            className="absolute rounded text-[10px] sm:text-xs px-1.5 py-1 cursor-pointer shadow-sm border border-white/20 overflow-hidden"
                            style={{
                              top: `${top}px`,
                              left: `${colIndex * colWidth}%`,
                              width: `${colWidth - 0.5}%`,
                              height: `${height}px`,
                              backgroundColor: color,
                              zIndex: 10,
                            }}
                            title={`${format(eventStart, 'HH:mm')} - ${format(eventEnd, 'HH:mm')}: ${event.title}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditEvent(event);
                            }}
                          >
                            <div className="flex flex-col h-full">
                              <span className="text-white font-bold truncate leading-tight">{event.title}</span>
                              <span className="text-white/90 text-[10px] truncate">{format(eventStart, 'HH:mm')}</span>
                            </div>
                          </div>
                        );
                      });
                    });
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col max-h-[calc(100vh-140px)]">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 sticky top-0 z-30">
          <h2 className="text-lg font-semibold text-gray-900">
            {format(selectedDate, 'EEEE d MMMM yyyy', { locale: nl })}
          </h2>
        </div>
        
        <div className="overflow-auto flex-1">
          <div className="grid grid-cols-[80px_1fr] gap-px bg-gray-200">
            <div className="bg-gray-50 p-3 text-right text-sm font-medium text-gray-500 sticky top-0 left-0 z-40 border-b border-gray-200">
              Tijd
            </div>
            <div className="bg-gray-50 p-3 text-center text-sm font-medium sticky top-0 z-30 border-b border-gray-200">
              {format(selectedDate, 'EEEE d MMMM', { locale: nl })}
            </div>
            
            {/* All-day section */}
            <div className="bg-gray-50 p-2 text-right text-[10px] font-bold text-gray-400 border-b border-gray-200 sticky top-[70px] left-0 z-40">
              Hele dag
            </div>
            <div className="bg-white p-2 border-b border-gray-200 sticky top-[70px] z-30 min-h-[40px]">
              {events.filter(e => e.all_day).map(event => (
                <div
                  key={event.id}
                  className="mb-1 px-3 py-1 rounded text-xs font-bold text-white cursor-pointer shadow-sm inline-block mr-2"
                  style={{ backgroundColor: getCalendarColor(event.calendar_id) }}
                  onClick={() => handleEditEvent(event)}
                >
                  {event.title}
                </div>
              ))}
            </div>

            {/* Time slots column - Sticky to left */}
            <div className="bg-white sticky left-0 z-20 border-r border-gray-100">
              {(() => {
                const timeSlots = [];
                for (let hour = 0; hour < 24; hour++) {
                  timeSlots.push(
                    <div key={`${hour}-00`} className="p-3 text-right text-xs text-gray-500 border-b border-gray-200 flex items-center justify-end bg-white" style={{ height: '60px' }}>
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                  );
                }
                return timeSlots;
              })()}
            </div>
            
            {/* Events column with dynamic lanes */}
            <div 
              className="relative min-h-[1440px]" 
              style={
                settings?.highlight_weekend && (selectedDate.getDay() === 0 || selectedDate.getDay() === 6)
                  ? { backgroundColor: '#FFF7ED' }
                  : { backgroundColor: 'white' }
              }
              onClick={() => handleDateClick(selectedDate)}
            >
              {/* Horizontal hour lines */}
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="absolute left-0 right-0 border-b border-gray-100" style={{ top: `${i * 60}px`, height: '60px' }} />
              ))}

              {(() => {
                // Sort events by start time
                const sortedEvents = events.filter(e => !e.all_day).sort((a, b) => 
                  parseISO(a.start).getTime() - parseISO(b.start).getTime()
                );
                
                if (sortedEvents.length === 0) return null;
                
                // Group events into clusters of overlapping events
                const clusters: (typeof sortedEvents)[] = [];
                let currentCluster: typeof sortedEvents = [];
                let clusterEnd = 0;

                sortedEvents.forEach(event => {
                  const start = parseISO(event.start).getTime();
                  const end = parseISO(event.end).getTime();

                  if (start >= clusterEnd) {
                    if (currentCluster.length > 0) clusters.push(currentCluster);
                    currentCluster = [event];
                    clusterEnd = end;
                  } else {
                    currentCluster.push(event);
                    clusterEnd = Math.max(clusterEnd, end);
                  }
                });
                if (currentCluster.length > 0) clusters.push(currentCluster);

                // Render each cluster
                return clusters.map((cluster, cIdx) => {
                  // Calculate max concurrency within THIS cluster
                  const timePoints = cluster.flatMap(event => [
                    { time: parseISO(event.start).getTime(), type: 'start', id: event.id },
                    { time: parseISO(event.end).getTime(), type: 'end', id: event.id }
                  ]).sort((a, b) => {
                    if (a.time !== b.time) return a.time - b.time;
                    return a.type === 'end' ? -1 : 1;
                  });

                  let clusterMax = 0;
                  let current = 0;
                  timePoints.forEach(p => {
                    if (p.type === 'start') current++;
                    else current--;
                    clusterMax = Math.max(clusterMax, current);
                  });

                  const numColumns = Math.max(clusterMax, 1);
                  const colWidth = 100 / numColumns;

                  // Assign columns within cluster using greedy
                  const columns: string[][] = Array.from({ length: numColumns }, () => []);
                  
                  return cluster.map((event) => {
                    const eventStart = parseISO(event.start);
                    const eventEnd = parseISO(event.end);
                    const startTime = eventStart.getTime();
                    const endTime = eventEnd.getTime();
                    
                    // Find first available column
                    let colIndex = 0;
                    for (let i = 0; i < numColumns; i++) {
                      const hasOverlap = columns[i].some(id => {
                        const other = cluster.find(e => e.id === id);
                        if (!other) return false;
                        const otherStart = parseISO(other.start).getTime();
                        const otherEnd = parseISO(other.end).getTime();
                        return startTime < otherEnd && otherStart < endTime;
                      });
                      if (!hasOverlap) {
                        colIndex = i;
                        columns[i].push(event.id);
                        break;
                      }
                    }

                    const color = getCalendarColor(event.calendar_id);
                    const top = (eventStart.getHours() * 60 + eventStart.getMinutes()) / 60 * 60;
                    const height = Math.max(((endTime - startTime) / (1000 * 60 * 60)) * 60, 30);

                    return (
                      <div
                        key={event.id}
                        className="absolute rounded text-sm px-2 py-1 cursor-pointer shadow-sm border border-white/20 overflow-hidden"
                        style={{
                          top: `${top}px`,
                          left: `${colIndex * colWidth}%`,
                          width: `${colWidth - 0.5}%`,
                          height: `${height}px`,
                          backgroundColor: color,
                          zIndex: 10,
                        }}
                        title={`${format(eventStart, 'HH:mm')} - ${format(eventEnd, 'HH:mm')}: ${event.title}${event.location ? ` - ${event.location}` : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditEvent(event);
                        }}
                      >
                        <div className="flex flex-col h-full">
                          <span className="text-white font-bold truncate block leading-tight">{event.title}</span>
                          <span className="text-white/90 text-xs">{format(eventStart, 'HH:mm')}</span>
                          {event.location && (
                            <div className="flex items-center gap-1 text-white/80 text-[10px] mt-0.5">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                });
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderListView = () => {
    // Group events by day and sort dates
    const sortedDates = Array.from(eventsByDate.keys()).sort();
    
    if (sortedDates.length === 0) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-4">Geen events gevonden voor de geselecteerde periode</p>
          <button 
            onClick={() => handleDateClick(new Date())}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nieuw event</span>
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-12 pb-12">
        {sortedDates.map((dateKey) => {
          const date = parseISO(dateKey);
          const dayEvents = eventsByDate.get(dateKey) || [];
          const sortedDayEvents = [...dayEvents].sort((a, b) => 
            parseISO(a.start).getTime() - parseISO(b.start).getTime()
          );

          return (
            <div key={dateKey} className="flex gap-8 md:gap-16">
              {/* Left column: Date and Add button */}
              <div className="w-24 md:w-32 flex flex-col items-center pt-2 shrink-0">
                <div className="text-5xl font-black text-gray-900 tracking-tighter">
                  {format(date, 'dd')}
                </div>
                <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">
                  {format(date, 'EEEE', { locale: nl })}
                </div>
                
                <button
                  onClick={() => handleDateClick(date)}
                  className="mt-6 p-3 rounded-full bg-gray-50 text-gray-400 hover:bg-primary-50 hover:text-primary-600 transition-all group border border-gray-100 hover:border-primary-100 shadow-sm"
                  title="Event toevoegen"
                >
                  <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
              </div>

              {/* Right column: Timeline and Events */}
              <div className="flex-1 relative">
                {/* Vertical timeline line */}
                <div className="absolute left-2 top-4 bottom-0 w-px bg-gradient-to-b from-gray-200 via-gray-200 to-transparent" />

                <div className="space-y-8 pt-4">
                  {sortedDayEvents
                    .filter(event => isSameDay(parseISO(event.start), date))
                    .map((event, idx) => {
                    const color = getCalendarColor(event.calendar_id);
                    const isPast = parseISO(event.end) < new Date();
                    const startTime = format(parseISO(event.start), 'HH:mm');
                    const endTime = format(parseISO(event.end), 'HH:mm');
                    const startDateLabel = format(parseISO(event.start), 'd MMM', { locale: nl });
                    const endDateLabel = format(parseISO(event.end), 'd MMM', { locale: nl });
                    const isMultiDay = !isSameDay(parseISO(event.start), parseISO(event.end));
                    const calendar = [...myCalendars, ...sharedCalendars].find(
                      c => c.id === event.calendar_id
                    );

                    return (
                      <div key={event.id} className={cn("relative pl-10 group", isPast ? "opacity-50" : "")}>
                        {/* Timeline Bullet */}
                        <div 
                          className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 transition-transform group-hover:scale-125"
                          style={{ backgroundColor: isPast ? '#9ca3af' : color }}
                        />

                        <div 
                          className={cn(
                            "bg-white rounded-2xl p-5 border transition-all cursor-pointer",
                            isPast 
                              ? "border-gray-100 shadow-none grayscale" 
                              : "border-gray-100 shadow-sm hover:shadow-md group-hover:border-gray-200"
                          )}
                          onClick={() => handleEditEvent(event)}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <span className={cn("text-sm font-bold", isPast ? "text-gray-400" : "text-gray-400")}>
                                  {event.all_day 
                                    ? (isMultiDay ? `${startDateLabel} — ${endDateLabel}` : 'Hele dag') 
                                    : `${startTime} — ${endTime}`}
                                </span>
                                {calendar && (
                                  <span 
                                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                                    style={{ 
                                      backgroundColor: isPast ? '#f3f4f6' : color + '15',
                                      color: isPast ? '#6b7280' : color 
                                    }}
                                  >
                                    {calendar.name}
                                  </span>
                                )}
                              </div>
                              <h3 className={cn(
                                "text-lg font-bold transition-colors",
                                isPast ? "text-gray-500" : "text-gray-900 group-hover:text-primary-600"
                              )}>
                                {event.title}
                              </h3>
                              {event.location && (
                                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span>{event.location}</span>
                                </div>
                              )}
                            </div>
                            
                            {event.description && (
                              <p className="text-sm text-gray-400 line-clamp-1 md:max-w-xs italic">
                                "{event.description}"
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {isLoadingEvents ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" text="Events laden..." />
        </div>
      ) : (
        <div className="space-y-6">
          {renderView()}
          
          {/* Empty state for no calendars */}
          {myCalendars.length === 0 && sharedCalendars.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Je hebt nog geen agenda's</p>
            </div>
          )}
        </div>
      )}

      {/* Event Creation/Edit Modal */}
      {isEventModalOpen && (editingEvent || (selectedEventDate && selectedEventCalendarId)) && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsEventModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingEvent ? 'Event bewerken' : 'Nieuw event'}
              </h3>
              <button
                onClick={() => {
                  setIsEventModalOpen(false);
                  setEditingEvent(null);
                }}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <span className="text-2xl text-gray-400">&times;</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titel *
                </label>
                <input
                  type="text"
                  value={eventFormData.title}
                  onChange={(e) => setEventFormData({ ...eventFormData, title: e.target.value })}
                  className="input"
                  placeholder="Event titel"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agenda *
                </label>
                <select
                  value={selectedEventCalendarId || ''}
                  onChange={(e) => setSelectedEventCalendarId(Number(e.target.value))}
                  className="input"
                >
                  {myCalendars.map(calendar => (
                    <option key={calendar.id} value={calendar.id}>
                      {calendar.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Begint
                  </label>
                  <input
                    type={eventFormData.all_day ? "date" : "datetime-local"}
                    value={eventFormData.all_day ? eventFormData.start.split('T')[0] : eventFormData.start}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEventFormData({ 
                        ...eventFormData, 
                        start: eventFormData.all_day ? `${val}T00:00:00` : val 
                      });
                    }}
                    className={cn("input", eventFormData.all_day ? "bg-gray-50 text-gray-500" : "")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Eindigt
                  </label>
                  <input
                    type={eventFormData.all_day ? "date" : "datetime-local"}
                    value={eventFormData.all_day ? eventFormData.end.split('T')[0] : eventFormData.end}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEventFormData({ 
                        ...eventFormData, 
                        end: eventFormData.all_day ? `${val}T23:59:59` : val 
                      });
                    }}
                    className={cn("input", eventFormData.all_day ? "bg-gray-50 text-gray-500" : "")}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eventFormData.all_day}
                    onChange={(e) => setEventFormData({ ...eventFormData, all_day: e.target.checked })}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Hele dag</span>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Locatie
                </label>
                <input
                  type="text"
                  value={eventFormData.location}
                  onChange={(e) => setEventFormData({ ...eventFormData, location: e.target.value })}
                  className="input"
                  placeholder="Locatie"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beschrijving
                </label>
                <textarea
                  value={eventFormData.description}
                  onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })}
                  className="input min-h-[100px] resize-none"
                  placeholder="Event beschrijving"
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setIsEventModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleSaveEvent}
                  disabled={!eventFormData?.title?.trim()}
                  className="btn btn-primary"
                >
                  Opslaan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
