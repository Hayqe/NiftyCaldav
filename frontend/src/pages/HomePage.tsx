import { useState } from 'react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { MapPin } from 'lucide-react';
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

  const { data: settings } = useSettings();

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
      const dateKey = format(parseISO(event.start), 'yyyy-MM-dd');
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)?.push(event);
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
    const calendarId = activeCalendarIds.length > 0 ? activeCalendarIds[0] : null;
    if (calendarId) {
      setSelectedEventDate(date);
      setSelectedEventCalendarId(calendarId);
      setEventFormData({
        ...eventFormData,
        title: '',
        description: '',
        start: format(date, "yyyy-MM-dd'T'09:00:00"),
        end: format(date, "yyyy-MM-dd'T'10:00:00"),
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
      if (editingEvent) {
        // Update existing event
        await updateEventMutation.mutateAsync({
          calendarId: selectedEventCalendarId,
          eventId: editingEvent.id,
          event: {
            title: eventFormData.title,
            description: eventFormData.description || null,
            start: eventFormData.start,
            end: eventFormData.end,
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
            start: eventFormData.start,
            end: eventFormData.end,
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
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {WEEKDAYS.map(day => (
            <div key={day} className="bg-white p-3 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {calendarDays.map((date, index) => {
            const dayEvents = getEventsForDay(date);
            const isSelected = isSameDay(date, selectedDate);
            const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
            const isToday = isSameDay(date, today);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            
            return (
              <div
                key={index}
                className={cn(
                  'relative p-2 min-h-[120px] hover:bg-gray-50 cursor-pointer transition-colors',
                  isSelected ? 'bg-primary-50' : 'bg-white'
                )}
                style={
                  settings?.data?.highlight_weekend && isWeekend
                    ? { backgroundColor: '#FEF9C3' }
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
                        title={`${startTime} - ${format(parseISO(event.end), 'HH:mm')}: ${event.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditEvent(event);
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-white font-bold">{startTime} {event.title}</span>
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
            
            {/* Time slots column - Sticky to left */}
            <div className="bg-white sticky left-0 z-20 border-r border-gray-100">
              {(() => {
                const timeSlots = [];
                for (let hour = 0; hour < 24; hour++) {
                  timeSlots.push(
                    <div key={`${hour}-00`} className="p-3 text-right text-xs text-gray-500 border-b border-gray-200 flex items-center justify-end bg-white" style={{ height: '80px' }}>
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
              const dayEvents = eventsByDate.get(dayKey) || [];
              const isWeekend = dayIndex >= 5;

              // Sort events by start time
              const sortedEvents = [...dayEvents].sort((a, b) => 
                parseISO(a.start).getTime() - parseISO(b.start).getTime()
              );

              return (
                <div 
                  key={dayIndex} 
                  className={cn(
                    "relative border-b border-gray-200 min-h-[1920px]"
                  )} 
                  style={
                    settings?.data?.highlight_weekend && isWeekend
                      ? { backgroundColor: '#FEF9C3' }
                      : { backgroundColor: 'white' }
                  }
                  onClick={() => handleDateClick(day)}
                >                  {/* Horizontal hour lines */}
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="absolute left-0 right-0 border-b border-gray-100" style={{ top: `${i * 80}px`, height: '80px' }} />
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
                        const top = (eventStart.getHours() * 60 + eventStart.getMinutes()) / 60 * 80;
                        const height = Math.max(((endTime - startTime) / (1000 * 60 * 60)) * 80, 24);

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
            
            {/* Time slots column - Sticky to left */}
            <div className="bg-white sticky left-0 z-20 border-r border-gray-100">
              {(() => {
                const timeSlots = [];
                for (let hour = 0; hour < 24; hour++) {
                  timeSlots.push(
                    <div key={`${hour}-00`} className="p-3 text-right text-xs text-gray-500 border-b border-gray-200 flex items-center justify-end bg-white" style={{ height: '80px' }}>
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                  );
                }
                return timeSlots;
              })()}
            </div>
            
            {/* Events column with dynamic lanes */}
            <div 
              className="relative min-h-[1920px]" 
              style={
                settings?.data?.highlight_weekend && (selectedDate.getDay() === 0 || selectedDate.getDay() === 6)
                  ? { backgroundColor: '#FEF9C3' }
                  : { backgroundColor: 'white' }
              }
              onClick={() => handleDateClick(selectedDate)}
            >
              {/* Horizontal hour lines */}
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="absolute left-0 right-0 border-b border-gray-100" style={{ top: `${i * 80}px`, height: '80px' }} />
              ))}

              {(() => {
                // Sort events by start time
                const sortedEvents = [...events].sort((a, b) => 
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
                    const top = (eventStart.getHours() * 60 + eventStart.getMinutes()) / 60 * 80;
                    const height = Math.max(((endTime - startTime) / (1000 * 60 * 60)) * 80, 32);

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
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Agenda Lijst</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {events.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Geen events gevonden voor de geselecteerde periode
            </div>
          ) : (
            events.map((event, index) => {
              const calendar = [...myCalendars, ...sharedCalendars].find(
                c => c.id === event.calendar_id
              );
              const color = getCalendarColor(event.calendar_id);
              
              return (
                <div 
                  key={index} 
                  className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleEditEvent(event)}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color + '20' }}
                    >
                      <div
                        className="w-6 h-6 rounded-full mx-auto mt-2"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 truncate">{event.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span>
                          {format(parseISO(event.start), 'EEEE d MMMM yyyy', { locale: nl })}
                        </span>
                        <span className="text-gray-400">
                          {format(parseISO(event.start), 'HH:mm', { locale: nl })} - 
                          {format(parseISO(event.end), 'HH:mm', { locale: nl })}
                        </span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      {event.description && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{event.description}</p>
                      )}
                      {calendar && (
                        <div className="mt-2">
                          <span
                            className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: calendar.color ?
                                CALENDAR_COLORS.find(c => c.value === calendar.color)?.hex + '20' : '#e0f2fe',
                              color: calendar.color ?
                                CALENDAR_COLORS.find(c => c.value === calendar.color)?.hex : '#0ea5e9'
                            }}
                          >
                            {calendar.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
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
                    type="datetime-local"
                    value={eventFormData.start}
                    onChange={(e) => setEventFormData({ ...eventFormData, start: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Eindigt
                  </label>
                  <input
                    type="datetime-local"
                    value={eventFormData.end}
                    onChange={(e) => setEventFormData({ ...eventFormData, end: e.target.value })}
                    className="input"
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
