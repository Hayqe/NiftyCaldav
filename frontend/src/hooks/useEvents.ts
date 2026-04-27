import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/services/api';
import type { Event } from '@/types';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export function useEvents(calendarIds: number[], dateRange: { start: Date; end: Date }) {
  return useQuery({
    queryKey: ['events', calendarIds, dateRange.start, dateRange.end],
    queryFn: async () => {
      // Don't fetch if no calendars selected
      if (calendarIds.length === 0) {
        return [];
      }
      
      const start = format(dateRange.start, "yyyy-MM-dd'T'00:00:00");
      const end = format(dateRange.end, "yyyy-MM-dd'T'23:59:59");
      
      // Fetch events for each calendar
      const promises = calendarIds.map(calendarId => 
        eventsApi.getAll(calendarId, start, end)
      );
      
      const results = await Promise.all(promises);
      return results.flatMap(r => r.data);
    },
    staleTime: 5000, // 5 seconds
  });
}

export function useEvent(calendarId: number | null, eventId: string | null) {
  return useQuery({
    queryKey: ['events', calendarId, eventId],
    queryFn: () => eventsApi.getById(calendarId!, eventId!),
    enabled: !!calendarId && !!eventId,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ calendarId, event }: { calendarId: number; event: Omit<Event, 'id' | 'created_at' | 'updated_at'> }) =>
      eventsApi.create(calendarId, event),
    onSuccess: (_, { calendarId }) => {
      queryClient.invalidateQueries({ queryKey: ['events', calendarId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ calendarId, eventId, event }: { calendarId: number; eventId: string; event: Partial<Event> }) =>
      eventsApi.update(calendarId, eventId, event),
    onSuccess: (_, { calendarId }) => {
      queryClient.invalidateQueries({ queryKey: ['events', calendarId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ calendarId, eventId }: { calendarId: number; eventId: string }) =>
      eventsApi.delete(calendarId, eventId),
    onSuccess: (_, { calendarId }) => {
      queryClient.invalidateQueries({ queryKey: ['events', calendarId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

// Helper functions for date ranges
export function getDateRangeByView(view: string, date: Date) {
  switch (view) {
    case 'day':
      return { start: startOfDay(date), end: endOfDay(date) };
    case 'week':
      return { start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(date), end: endOfMonth(date) };
    default:
      return { start: startOfDay(date), end: endOfDay(date) };
  }
}
