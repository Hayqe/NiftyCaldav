import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Users, Settings, LogOut, X, Eye, EyeOff } from 'lucide-react';
import { useAuth, useCreateCalendar } from '@/hooks';
import { useCalendarContext } from '@/context/CalendarContext';
import { cn, CALENDAR_COLORS } from '@/utils';
import type { Calendar } from '@/types';
import Logo from './Logo';
import LoadingSpinner from './LoadingSpinner';
import SettingsModal from './SettingsModal';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCreatingCalendar, setIsCreatingCalendar] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
      await createCalendar({
        name: newCalendarName,
        color: newCalendarColor,
        description: ''
      });
      setIsCreatingCalendar(false);
      setNewCalendarName('');
      setNewCalendarColor('blue');
    } catch (error) {
      console.error('Failed to create calendar:', error);
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
              let colorHex = calendar.color;
              if (colorHex && !colorHex.startsWith('#')) {
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
    <>
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar text-[#f9f8f6] border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <Logo className="w-10 h-10" />
            <h1 className="font-bold text-xl tracking-tight text-[#f9f8f6]">NiftyCalDAV</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3 px-2">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mijn agenda's</h2>
              <button
                onClick={() => setIsCreatingCalendar(true)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Plus className="w-4 h-4 text-gray-300" />
              </button>
            </div>
            
            {isLoadingCalendars ? (
              <LoadingSpinner size="sm" text="Agenda's laden..." />
            ) : (
              <div className="space-y-1">
                {myCalendars.map((calendar: Calendar) => {
                  let colorHex = calendar.color;
                  if (colorHex && !colorHex.startsWith('#')) {
                    const color = CALENDAR_COLORS.find(c => c.value === calendar.color) || CALENDAR_COLORS[0];
                    colorHex = color.hex;
                  }
                  return (
                    <div
                      key={calendar.id}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all hover:bg-white/10',
                        isCalendarActive(calendar.id) ? 'text-white' : 'text-gray-300'
                      )}
                      onClick={() => toggleCalendar(calendar.id)}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: colorHex }}
                      />
                      <span className="flex-1 text-sm truncate">{calendar.name}</span>
                      {isCalendarActive(calendar.id) ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4 opacity-50" />
                      )}
                    </div>

                  );
                })}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-800">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">Gedeeld</h2>
            <div className="space-y-1">
              {sharedCalendars.map((calendar: Calendar) => {
                let colorHex = calendar.color;
                if (colorHex && !colorHex.startsWith('#')) {
                  const color = CALENDAR_COLORS.find(c => c.value === calendar.color) || CALENDAR_COLORS[2];
                  colorHex = color.hex;
                }
                return (
                  <div
                    key={calendar.id}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all hover:bg-white/10',
                      isCalendarActive(calendar.id) ? 'text-white' : 'text-gray-300'
                    )}
                    onClick={() => toggleCalendar(calendar.id)}
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0 border border-white/20" style={{ backgroundColor: colorHex }} />
                    <span className="flex-1 text-sm truncate">{calendar.name}</span>
                  </div>

                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-800 space-y-1">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm text-gray-300"
          >
            <Settings className="w-4 h-4" />
            <span>Instellingen</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-900/20 transition-colors text-sm text-red-400"
          >
            <LogOut className="w-4 h-4" />
            <span>Uitloggen</span>
          </button>
        </div>

        <button
          onClick={() => setIsCollapsed(true)}
          className="absolute top-1/2 -translate-y-1/2 -right-3 bg-sidebar border border-gray-800 rounded-full w-6 h-6 flex items-center justify-center shadow-sm hover:bg-gray-800 text-gray-300"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </aside>

      {isCreatingCalendar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsCreatingCalendar(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Nieuwe agenda</h3>
              <button onClick={() => setIsCreatingCalendar(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <input type="text" value={newCalendarName} onChange={(e) => setNewCalendarName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Mijn agenda" />
              <div className="flex items-center gap-2">
                <input type="color" value={newCalendarColor.startsWith('#') ? newCalendarColor : '#3b82f6'} onChange={(e) => setNewCalendarColor(e.target.value)} className="w-10 h-10 p-1 rounded cursor-pointer border-none" />
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {CALENDAR_COLORS.map(color => (
                    <button key={color.value} onClick={() => setNewCalendarColor(color.hex)} className={cn('w-6 h-6 rounded-full transition-all flex-shrink-0', newCalendarColor === color.hex ? 'ring-2 ring-gray-400' : '')} style={{ backgroundColor: color.hex }} />
                  ))}
                </div>
              </div>
              <button onClick={handleCreateCalendar} disabled={!newCalendarName.trim() || isCreating} className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">{isCreating ? 'Aanmaken...' : 'Aanmaken'}</button>
            </div>
          </div>
        </div>
      )}

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
