import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Bell, Palette, User, ChevronLeft, Upload, Calendar, Trash2, Users, X, Plus, Edit2 } from 'lucide-react';
import { useAuth, useSettings, useUpdateSettings, useMyCalendars, useSharedCalendars, useCalendarShares, useDeleteCalendar, useAddShare, useUpdateShare, useRemoveShare } from '@/hooks';
import { CALENDAR_COLORS, TIMEZONES, LANGUAGES } from '@/utils/constants';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'appearance' | 'general' | 'calendars'>('profile');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { user, changePassword } = useAuth();
  const { data: settingsData, isLoading: isLoadingSettings } = useSettings();
  const { mutate: updateSettings, isPending: isUpdatingSettings } = useUpdateSettings();
  const { data: myCalendarsData, isLoading: isLoadingMyCalendars } = useMyCalendars();
  const { data: sharedCalendarsData, isLoading: isLoadingSharedCalendars } = useSharedCalendars();
  const { mutate: deleteCalendar, isPending: isDeletingCalendar } = useDeleteCalendar();
  const { mutate: addShare, isPending: isAddingShare } = useAddShare();
  const { mutate: updateShare, isPending: isUpdatingShare } = useUpdateShare();
  const { mutate: removeShare, isPending: isRemovingShare } = useRemoveShare();
  
  const myCalendars = myCalendarsData?.data || [];
  const sharedCalendars = sharedCalendarsData?.data || [];
  
  const navigate = useNavigate();

  const settings = settingsData?.data;

  const [formData, setFormData] = useState({
    timezone: settings?.timezone || 'Europe/Amsterdam',
    language: settings?.language || 'nl',
    notifications_enabled: settings?.notifications_enabled || false,
    calendar_colors: settings?.calendar_colors || '{}',
  });

  // Update form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        timezone: settings.timezone || 'Europe/Amsterdam',
        language: settings.language || 'nl',
        notifications_enabled: settings.notifications_enabled || false,
        calendar_colors: settings.calendar_colors || '{}',
      });
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    try {
      await updateSettings(formData);
      setSuccess('Instellingen opgeslagen');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Fout bij opslaan instellingen');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (newPassword !== confirmPassword) {
      setError('Nieuwe wachtwoorden komen niet overeen');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('Wachtwoord moet minstens 8 tekens bevat');
      return;
    }

    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword });
      setSuccess('Wachtwoord gewijzigd');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Huidige wachtwoord is onjuist of er is een fout opgetreden');
    }
  };

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Instellingen laden..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Instellingen</h1>
          <p className="text-gray-500">Pas je voorkeuren aan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeTab === 'profile' ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50 text-gray-700'}`}
              >
                <User className="w-5 h-5" />
                <span>Profiel</span>
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeTab === 'notifications' ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50 text-gray-700'}`}
              >
                <Bell className="w-5 h-5" />
                <span>Meldingen</span>
              </button>
              <button
                onClick={() => setActiveTab('appearance')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeTab === 'appearance' ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50 text-gray-700'}`}
              >
                <Palette className="w-5 h-5" />
                <span>Uiterlijk</span>
              </button>
              <button
                onClick={() => setActiveTab('general')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeTab === 'general' ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50 text-gray-700'}`}
              >
                <Settings className="w-5 h-5" />
                <span>Algemeen</span>
              </button>
              <button
                onClick={() => setActiveTab('calendars')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeTab === 'calendars' ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50 text-gray-700'}`}
              >
                <Calendar className="w-5 h-5" />
                <span>Agenda's</span>
              </button>
            </nav>
          </div>
          
          {/* ICS Import Option */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mt-4">
            <button
              onClick={() => navigate('/ics-import')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors text-left text-gray-700"
            >
              <Upload className="w-5 h-5" />
              <span>ICS Import</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="md:col-span-3">
          {activeTab === 'profile' && (
            <ProfileTab
              user={user}
              currentPassword={currentPassword}
              newPassword={newPassword}
              confirmPassword={confirmPassword}
              setCurrentPassword={setCurrentPassword}
              setNewPassword={setNewPassword}
              setConfirmPassword={setConfirmPassword}
              error={error}
              success={success}
              onSubmit={handleChangePassword}
              isSubmitting={false}
            />
          )}
          
          {activeTab === 'notifications' && (
            <NotificationsTab
              formData={formData}
              setFormData={setFormData}
              onSave={handleSaveSettings}
              isSaving={isUpdatingSettings}
              success={success}
            />
          )}
          
          {activeTab === 'appearance' && (
            <AppearanceTab
              formData={formData}
              setFormData={setFormData}
              onSave={handleSaveSettings}
              isSaving={isUpdatingSettings}
            />
          )}
          
          {activeTab === 'general' && (
            <GeneralTab
              formData={formData}
              setFormData={setFormData}
              onSave={handleSaveSettings}
              isSaving={isUpdatingSettings}
              timezoneOptions={TIMEZONES}
              languageOptions={LANGUAGES}
            />
          )}
          {activeTab === 'calendars' && (
            <CalendarTab
              myCalendars={myCalendars}
              sharedCalendars={sharedCalendars}
              onDeleteCalendar={deleteCalendar}
              isDeletingCalendar={isDeletingCalendar}
              onAddShare={addShare}
              onUpdateShare={updateShare}
              onRemoveShare={removeShare}
              isAddingShare={isAddingShare}
              isUpdatingShare={isUpdatingShare}
              isRemovingShare={isRemovingShare}
              isLoading={isLoadingMyCalendars || isLoadingSharedCalendars}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Profile Tab
interface ProfileTabProps {
  user: any;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  setCurrentPassword: (v: string) => void;
  setNewPassword: (v: string) => void;
  setConfirmPassword: (v: string) => void;
  error: string | null;
  success: string | null;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting: boolean;
}

function ProfileTab({
  currentPassword,
  newPassword,
  confirmPassword,
  setCurrentPassword,
  setNewPassword,
  setConfirmPassword,
  error,
  success,
  onSubmit,
  isSubmitting,
}: ProfileTabProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Wijzig wachtwoord</h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm mb-4">
          {success}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Huidige wachtwoord
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="input"
            placeholder="Huidige wachtwoord"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nieuwe wachtwoord
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input"
            placeholder="Nieuwe wachtwoord (min. 8 tekens)"
            required
            minLength={8}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bevestig nieuw wachtwoord
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input"
            placeholder="Bevestig nieuw wachtwoord"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting || !currentPassword || !newPassword || !confirmPassword}
          className="btn btn-primary"
        >
          {isSubmitting ? <LoadingSpinner size="sm" /> : 'Wijzigen'}
        </button>
      </form>
    </div>
  );
}

// Notifications Tab
interface NotificationsTabProps {
  formData: any;
  setFormData: (data: any) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  success: string | null;
}

function NotificationsTab({ formData, setFormData, onSave, isSaving, success }: NotificationsTabProps) {
  const handleToggle = () => {
    setFormData({ ...formData, notifications_enabled: !formData.notifications_enabled });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Meldingen</h2>
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm mb-4">
          {success}
        </div>
      )}

      <div className="space-y-6 max-w-md">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Bureaubladmeldingen</h3>
            <p className="text-sm text-gray-500">Ontvang meldingen voor aankomende events</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.notifications_enabled}
              onChange={handleToggle}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div className="pt-4">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="btn btn-primary"
          >
            {isSaving ? <LoadingSpinner size="sm" /> : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Calendar Tab
import type { Calendar as CalendarType, CalendarShare as CalendarShareType } from '@/types';

interface CalendarTabProps {
  myCalendars: CalendarType[];
  sharedCalendars: CalendarType[];
  onDeleteCalendar: (id: number) => Promise<void>;
  isDeletingCalendar: boolean;
  onAddShare: (data: { calendarId: number; data: { user_id: number; permission: 'read' | 'write' | 'admin' } }) => Promise<void>;
  onUpdateShare: (data: { calendarId: number; userId: number; data: { permission: 'read' | 'write' | 'admin' } }) => Promise<void>;
  onRemoveShare: (data: { calendarId: number; userId: number }) => Promise<void>;
  isAddingShare: boolean;
  isUpdatingShare: boolean;
  isRemovingShare: boolean;
  isLoading: boolean;
}

function CalendarTab({
  myCalendars,
  sharedCalendars,
  onDeleteCalendar,
  isDeletingCalendar,
  onAddShare,
  onUpdateShare,
  onRemoveShare,
  isAddingShare,
  isUpdatingShare,
  isRemovingShare,
  isLoading,
}: CalendarTabProps) {
  const [selectedCalendar, setSelectedCalendar] = useState<CalendarType | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [newShareUserId, setNewShareUserId] = useState('');
  const [newSharePermission, setNewSharePermission] = useState<'read' | 'write' | 'admin'>('read');
  const [shares, setShares] = useState<CalendarShareType[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // Fetch users for sharing
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true);
        // Import usersApi dynamically to avoid circular dependency
        const { usersApi } = await import('@/services/api');
        const response = await usersApi.getAllSimple();
        setUsers(response?.data || []);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);
  
  // Fetch shares for selected calendar
  useEffect(() => {
    if (!selectedCalendar) {
      setShares([]);
      return;
    }
    
    const fetchShares = async () => {
      try {
        const { sharesApi } = await import('@/services/api');
        const response = await sharesApi.getCalendarShares(selectedCalendar.id);
        setShares(response?.data || []);
      } catch (error) {
        console.error('Failed to fetch shares:', error);
      }
    };
    
    fetchShares();
  }, [selectedCalendar]);
  
  const handleDeleteCalendar = async (calendarId: number) => {
    if (window.confirm('Weet je zeker dat je deze agenda wilt verwijderen?')) {
      await onDeleteCalendar(calendarId);
    }
  };
  
  const handleAddShare = async () => {
    if (!selectedCalendar || !newShareUserId) return;
    
    try {
      await onAddShare({
        calendarId: selectedCalendar.id,
        data: { user_id: parseInt(newShareUserId), permission: newSharePermission }
      });
      setNewShareUserId('');
      setNewSharePermission('read');
      // Refresh shares
      const { sharesApi } = await import('@/services/api');
      const response = await sharesApi.getCalendarShares(selectedCalendar.id);
      setShares(response?.data || []);
    } catch (error) {
      console.error('Failed to add share:', error);
    }
  };
  
  const handleUpdateSharePermission = async (share: CalendarShareType, newPermission: 'read' | 'write' | 'admin') => {
    if (!selectedCalendar) return;
    
    try {
      await onUpdateShare({
        calendarId: selectedCalendar.id,
        userId: share.user_id,
        data: { permission: newPermission }
      });
      // Refresh shares
      const { sharesApi } = await import('@/services/api');
      const response = await sharesApi.getCalendarShares(selectedCalendar.id);
      setShares(response?.data || []);
    } catch (error) {
      console.error('Failed to update share:', error);
    }
  };
  
  const handleRemoveShare = async (share: CalendarShareType) => {
    if (!selectedCalendar) return;
    
    if (window.confirm(`Weet je zeker dat je de toegang voor deze gebruiker wilt verwijderen?`)) {
      try {
        await onRemoveShare({
          calendarId: selectedCalendar.id,
          userId: share.user_id
        });
        // Refresh shares
        const { sharesApi } = await import('@/services/api');
        const response = await sharesApi.getCalendarShares(selectedCalendar.id);
        setShares(response?.data || []);
      } catch (error) {
        console.error('Failed to remove share:', error);
      }
    }
  };
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <LoadingSpinner size="md" text="Agenda's laden..." />
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Agenda's beheer</h2>
      
      <div className="space-y-6">
        {/* My Calendars */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Mijn agenda's</h3>
          </div>
          
          {myCalendars.length === 0 ? (
            <p className="text-sm text-gray-500">Je hebt nog geen eigen agenda's.</p>
          ) : (
            <div className="space-y-3">
              {myCalendars.map(calendar => (
                <div
                  key={calendar.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: calendar.color || '#3b82f6' }}
                    />
                    <span className="font-medium text-gray-900">{calendar.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedCalendar(calendar);
                        setIsShareModalOpen(true);
                      }}
                      className="p-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-600"
                      title="Gebruikers delen"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCalendar(calendar.id)}
                      disabled={isDeletingCalendar}
                      className="p-2 rounded-lg hover:bg-red-100 transition-colors text-red-600 disabled:opacity-50"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Shared Calendars (owned by me) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Mijn gedeelde agenda's</h3>
          </div>
          
          {sharedCalendars.filter(cal => cal.is_owner).length === 0 ? (
            <p className="text-sm text-gray-500">Je hebt nog geen agenda's gedeeld met anderen.</p>
          ) : (
            <div className="space-y-3">
              {sharedCalendars.filter(cal => cal.is_owner).map(calendar => (
                <div
                  key={calendar.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: calendar.color || '#8b5cf6' }}
                    />
                    <span className="font-medium text-gray-900">{calendar.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedCalendar(calendar);
                        setIsShareModalOpen(true);
                      }}
                      className="p-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-600"
                      title="Gebruikers beheer"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCalendar(calendar.id)}
                      disabled={isDeletingCalendar}
                      className="p-2 rounded-lg hover:bg-red-100 transition-colors text-red-600 disabled:opacity-50"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Shared with me */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Met mij gedeeld</h3>
          </div>
          
          {sharedCalendars.filter(cal => !cal.is_owner).length === 0 ? (
            <p className="text-sm text-gray-500">Er zijn geen agenda's met jou gedeeld.</p>
          ) : (
            <div className="space-y-3">
              {sharedCalendars.filter(cal => !cal.is_owner).map(calendar => (
                <div
                  key={calendar.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: calendar.color || '#10b981' }}
                    />
                    <span className="font-medium text-gray-900">{calendar.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-gray-200 rounded text-xs text-gray-700">
                      {calendar.permission}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Share Modal */}
      {isShareModalOpen && selectedCalendar && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsShareModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Gebruikers beheer voor: {selectedCalendar.name}
              </h3>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Current shares */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Huidige toegang</h4>
                {shares.length === 0 ? (
                  <p className="text-sm text-gray-500">Geen gebruikers hebben toegang tot deze agenda.</p>
                ) : (
                  <div className="space-y-2">
                    {shares.map(share => (
                      <div
                        key={share.user_id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <span className="font-medium text-gray-900">
                            {share.user?.username || `Gebruiker #${share.user_id}`}
                          </span>
                          <span className="ml-2 px-2 py-1 bg-gray-200 rounded text-xs text-gray-700">
                            {share.permission}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={share.permission}
                            onChange={(e) => handleUpdateSharePermission(
                              share, 
                              e.target.value as 'read' | 'write' | 'admin'
                            )}
                            disabled={isUpdatingShare}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="read">Lezen</option>
                            <option value="write">Schrijven</option>
                            <option value="admin">Beheer</option>
                          </select>
                          <button
                            onClick={() => handleRemoveShare(share)}
                            disabled={isRemovingShare}
                            className="p-1.5 rounded-lg hover:bg-red-100 transition-colors text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Add new share */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-2">Voeg gebruiker toe</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gebruiker
                    </label>
                    <select
                      value={newShareUserId}
                      onChange={(e) => setNewShareUserId(e.target.value)}
                      disabled={isLoadingUsers || isAddingShare}
                      className="input"
                    >
                      <option value="">Selecteer gebruiker</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.username}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Toestemming
                    </label>
                    <select
                      value={newSharePermission}
                      onChange={(e) => setNewSharePermission(e.target.value as 'read' | 'write' | 'admin')}
                      disabled={isAddingShare}
                      className="input"
                    >
                      <option value="read">Lezen</option>
                      <option value="write">Schrijven</option>
                      <option value="admin">Beheer</option>
                    </select>
                  </div>
                  <button
                    onClick={handleAddShare}
                    disabled={!newShareUserId || isAddingShare}
                    className="btn btn-primary w-full"
                  >
                    {isAddingShare ? <LoadingSpinner size="sm" /> : 'Toevoegen'}
                  </button>
                </div>
              </div>
              
              <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setIsShareModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Sluiten
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Appearance Tab
interface AppearanceTabProps {
  formData: any;
  setFormData: (data: any) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

function AppearanceTab({ formData, setFormData, onSave, isSaving }: AppearanceTabProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Uiterlijk</h2>
      
      <div className="space-y-6 max-w-md">
        <div>
          <h3 className="font-medium text-gray-900 mb-2">Agenda kleuren</h3>
          <p className="text-sm text-gray-500 mb-4">Stel standaard kleuren in voor nieuwe agenda's</p>
          <div className="flex gap-2 flex-wrap">
            {CALENDAR_COLORS.map(color => (
              <button
                key={color.value}
                onClick={() => setFormData({ ...formData, calendar_colors: color.value })}
                className={`w-8 h-8 rounded-full transition-all ${formData.calendar_colors === color.value ? 'ring-2 ring-primary-500' : ''}`}
                style={{ backgroundColor: color.hex }}
              />
            ))}
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="btn btn-primary"
          >
            {isSaving ? <LoadingSpinner size="sm" /> : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// General Tab
interface GeneralTabProps {
  formData: any;
  setFormData: (data: any) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  timezoneOptions: { value: string; label: string }[];
  languageOptions: { value: string; label: string }[];
}

function GeneralTab({
  formData,
  setFormData,
  onSave,
  isSaving,
  timezoneOptions,
  languageOptions,
}: GeneralTabProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Algemeen</h2>
      
      <div className="space-y-6 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tijdzone
          </label>
          <select
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            className="input"
          >
            {timezoneOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Taal
          </label>
          <select
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            className="input"
          >
            {languageOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-4">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="btn btn-primary"
          >
            {isSaving ? <LoadingSpinner size="sm" /> : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  );
}
