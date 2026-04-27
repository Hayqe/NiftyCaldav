import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Users, Settings, LogOut, X, Eye, EyeOff } from 'lucide-react';
import { useAuth, useCreateCalendar } from '@/hooks';
import { useCalendarContext } from '@/context/CalendarContext';
import { cn, CALENDAR_COLORS } from '@/utils';
import type { Calendar } from '@/types';
import Logo from './Logo';
import LoadingSpinner from './LoadingSpinner';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCreatingCalendar, setIsCreatingCalendar] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState('');
  const [newCalendarColor, setNewCalendarColor] = useState('blue');
  
  const { logout, user } = useAuth();
  const { mutateAsync: createCalendar, isPending: isCreating } = useCreateCalendar();
  const {
    myCalendars,
    sharedCalendars,
    isLoadingCalendars,
    toggleCalendar,
    isCalendarActive,
  } = useCalendarContext();

  const handleCreateCalendar = async () => {
    if (!newCalendarName.trim()) return;
    
    try {
      // Call create calendar API with selected color
      await createCalendar({
        name: newCalendarName,
        color: newCalendarColor,
        description: ''
      });
      
      // Close the form and reset
      setIsCreatingCalendar(false);
      setNewCalendarName('');
      setNewCalendarColor('blue');
    } catch (error) {
      console.error('Failed to create calendar:', error);
      // Could add error toast here
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (isCollapsed) {
    return (
      <aside className="fixed left-0 top-0 z-40 h-screen w-16 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4">
          <Logo className="w-6 h-6" />
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-2 space-y-1">
            {myCalendars.map((calendar: Calendar) => {
              // Support both hex colors (e.g., #a97671ff) and color names (e.g., 'blue')
              let colorHex = calendar.color;
              if (!colorHex.startsWith('#')) {
                const color = CALENDAR_COLORS.find(c => c.value === calendar.color) || CALENDAR_COLORS[0];
                colorHex = color.hex;
              }
              return (
                <div
                  key={calendar.id}
                  className="w-10 h-10 rounded-lg cursor-pointer transition-all hover:scale-105 flex items-center justify-center"
                  style={{ backgroundColor: colorHex }}
                  onClick={() => toggleCalendar(calendar.id)}
                >
                  {isCalendarActive(calendar.id) ? (
                    <Eye className="w-4 h-4 text-white" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-white" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="p-2">
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-full p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4 mx-auto text-gray-500" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Logo className="w-6 h-6" />
          <div>
            <h1 className="font-semibold text-gray-900">Nifty CalDAV</h1>
            {user && (
              <p className="text-xs text-gray-500">{user.username}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* My Calendars Section */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-700 uppercase tracking-wider">Mijn agenda's</h2>
            <button
              onClick={() => setIsCreatingCalendar(true)}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Plus className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          
          {isLoadingCalendars ? (
            <LoadingSpinner size="sm" text="Agenda's laden..." />
          ) : (
            <div className="space-y-2">
              {myCalendars.length === 0 ? (
                <p className="text-sm text-gray-500">Geen agenda's gevonden</p>
              ) : (
                myCalendars.map((calendar: Calendar) => {
                  // Support both hex colors (e.g., #a97671ff) and color names (e.g., 'blue')
                  let colorHex = calendar.color;
                  if (!colorHex.startsWith('#')) {
                    const color = CALENDAR_COLORS.find(c => c.value === calendar.color) || CALENDAR_COLORS[0];
                    colorHex = color.hex;
                  }
                  return (
                    <div
                      key={calendar.id}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50',
                        isCalendarActive(calendar.id) ? 'bg-primary-50' : ''
                      )}
                      onClick={() => toggleCalendar(calendar.id)}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: colorHex }}
                      />
                      <span className="flex-1 text-sm truncate">{calendar.name}</span>
                      {isCalendarActive(calendar.id) ? (
                        <Eye className="w-4 h-4 text-gray-500" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Shared Calendars Section */}
        <div className="p-4 border-t border-gray-200">
          <h2 className="text-sm font-medium text-gray-700 uppercase tracking-wider mb-3">Gedeeld</h2>
          
          {isLoadingCalendars ? (
            <LoadingSpinner size="sm" />
          ) : (
            <div className="space-y-2">
              {sharedCalendars.length === 0 ? (
                <p className="text-sm text-gray-500">Geen gedeelde agenda's</p>
              ) : (
                sharedCalendars.map((calendar: Calendar) => {
                  // Support both hex colors (e.g., #a97671ff) and color names (e.g., 'blue')
                  let colorHex = calendar.color;
                  if (!colorHex.startsWith('#')) {
                    const color = CALENDAR_COLORS.find(c => c.value === calendar.color) || CALENDAR_COLORS[2];
                    colorHex = color.hex;
                  }
                  return (
                    <div
                      key={calendar.id}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50',
                        isCalendarActive(calendar.id) ? 'bg-primary-50' : ''
                      )}
                      onClick={() => toggleCalendar(calendar.id)}
                    >
                      <div
                        className="w-3 h-3 rounded-full border-2 border-white"
                        style={{ backgroundColor: colorHex }}
                      />
                      <span className="flex-1 text-sm truncate">{calendar.name}</span>
                      {isCalendarActive(calendar.id) ? (
                        <Eye className="w-4 h-4 text-gray-500" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        <button
          onClick={() => { /* TODO: Navigate to settings */ }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-700"
        >
          <Settings className="w-4 h-4" />
          <span>Instellingen</span>
        </button>
        {user?.role === 'admin' && (
          <button
            onClick={() => { /* TODO: Navigate to admin */ }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-700"
          >
            <Users className="w-4 h-4" />
            <span>Admin</span>
          </button>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors text-sm text-red-600"
        >
          <LogOut className="w-4 h-4" />
          <span>Uitloggen</span>
        </button>
      </div>

      {/* Collapse Button */}
      <button
        onClick={() => setIsCollapsed(true)}
        className="absolute top-1/2 -translate-y-1/2 -right-3 bg-white border border-gray-200 rounded-full w-6 h-6 flex items-center justify-center shadow-sm hover:bg-gray-50"
      >
        <ChevronLeft className="w-4 h-4 text-gray-500" />
      </button>

      {/* Create Calendar Modal */}
      {isCreatingCalendar && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsCreatingCalendar(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Nieuwe agenda</h3>
              <button
                onClick={() => setIsCreatingCalendar(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
                <input
                  type="text"
                  value={newCalendarName}
                  onChange={(e) => setNewCalendarName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Mijn agenda"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kleur</label>
                <div className="flex gap-2">
                  {CALENDAR_COLORS.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setNewCalendarColor(color.value)}
                      className={cn(
                        'w-6 h-6 rounded-full transition-all',
                        newCalendarColor === color.value ? 'ring-2 ring-gray-400' : ''
                      )}
                      style={{ backgroundColor: color.hex }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setIsCreatingCalendar(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleCreateCalendar}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  disabled={!newCalendarName.trim() || isCreating}
                >
                  {isCreating ? 'Aanmaken...' : 'Aanmaken'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
