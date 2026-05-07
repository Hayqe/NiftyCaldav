import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Bell, Palette, User, ChevronLeft, Upload, Calendar, Trash2, Users, Key } from 'lucide-react';
import { useAuth, useSettings, useUpdateSettings, useMyCalendars, useSharedCalendars, useCalendarShares, useDeleteCalendar, useAddShare, useUpdateShare, useRemoveShare, useCreateUserWithOTP, useResetUserPassword, useDeleteUser } from '@/hooks';
import { CALENDAR_COLORS, TIMEZONES, LANGUAGES } from '@/utils/constants';
import LoadingSpinner from '@/components/LoadingSpinner';

type TabType = 'profile' | 'notifications' | 'appearance' | 'general' | 'calendars' | 'users';

export default function SettingsPage() {
  // Check if current user is admin (username === 'admin')
  const userFromStorage = localStorage.getItem('user');
  const cachedUser = userFromStorage ? JSON.parse(userFromStorage) : null;
  const isAdmin = cachedUser?.username === 'admin';
  
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const navigate = useNavigate();

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
        <SettingsSidebar activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin} />
        
        {/* Main Content */}
        <div className="md:col-span-3">
          <SettingsContent activeTab={activeTab} isAdmin={isAdmin} />
        </div>
      </div>
    </div>
  );
}

// Sidebar Navigation Component
interface SettingsSidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isAdmin: boolean;
}

function SettingsSidebar({ activeTab, setActiveTab, isAdmin }: SettingsSidebarProps) {
  return (
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
          {isAdmin && (
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeTab === 'users' ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              <Users className="w-5 h-5" />
              <span>Gebruikers beheren</span>
            </button>
          )}
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
  );
}

// Main Content Component
interface SettingsContentProps {
  activeTab: TabType;
  isAdmin: boolean;
}

function SettingsContent({ activeTab, isAdmin }: SettingsContentProps) {
  const { user, changePassword } = useAuth();
  const { data: settingsData, isLoading: isLoadingSettings } = useSettings();
  const { mutate: updateSettings, isPending: isUpdatingSettings } = useUpdateSettings();
  const { data: myCalendarsData, isLoading: isLoadingMyCalendars } = useMyCalendars();
  const { data: sharedCalendarsData, isLoading: isLoadingSharedCalendars } = useSharedCalendars();
  const { mutate: deleteCalendar, isPending: isDeletingCalendar } = useDeleteCalendar();
  const { mutate: addShare, isPending: isAddingShare } = useAddShare();
  const { mutate: updateShare, isPending: isUpdatingShare } = useUpdateShare();
  const { mutate: removeShare, isPending: isRemovingShare } = useRemoveShare();
  const { mutate: createUserWithOTP, isPending: isCreatingUser } = useCreateUserWithOTP();
  const { mutate: resetUserPassword, isPending: isResettingPassword } = useResetUserPassword();
  const { mutate: deleteUser, isPending: isDeletingUser } = useDeleteUser();

  const myCalendars = myCalendarsData?.data || [];
  const sharedCalendars = sharedCalendarsData?.data || [];
  const settings = settingsData?.data;

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Instellingen laden..." />
      </div>
    );
  }

  return (
    <>
      {activeTab === 'profile' && (
        <ProfileTab
          user={user}
          changePassword={changePassword}
        />
      )}
      {activeTab === 'notifications' && (
        <NotificationsTab
          settings={settings}
          updateSettings={updateSettings}
          isUpdatingSettings={isUpdatingSettings}
        />
      )}
      {activeTab === 'appearance' && (
        <AppearanceTab
          settings={settings}
          updateSettings={updateSettings}
          isUpdatingSettings={isUpdatingSettings}
        />
      )}
      {activeTab === 'general' && (
        <GeneralTab
          settings={settings}
          updateSettings={updateSettings}
          isUpdatingSettings={isUpdatingSettings}
        />
      )}
      {activeTab === 'calendars' && (
        <CalendarTab
          myCalendars={myCalendars}
          sharedCalendars={sharedCalendars}
          deleteCalendar={deleteCalendar}
          isDeletingCalendar={isDeletingCalendar}
          addShare={addShare}
          updateShare={updateShare}
          removeShare={removeShare}
          isAddingShare={isAddingShare}
          isUpdatingShare={isUpdatingShare}
          isRemovingShare={isRemovingShare}
          isLoading={isLoadingMyCalendars || isLoadingSharedCalendars}
        />
      )}
      {activeTab === 'users' && isAdmin && (
        <UsersTab />
      )}
    </>
  );
}

// Profile Tab Component
interface ProfileTabProps {
  user: any;
  changePassword: (data: { current_password?: string; new_password: string }) => Promise<void>;
}

function ProfileTab({ user, changePassword }: ProfileTabProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (newPassword !== confirmPassword) {
      setError('Nieuwe wachtwoorden komen niet overeen');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('Wachtwoord moet minstens 8 tekens bevatten');
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

      <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Huidige wachtwoord
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Bevestig nieuw wachtwoord"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={!currentPassword || !newPassword || !confirmPassword}
          className="btn btn-primary"
        >
          Wijzigen
        </button>
      </form>
    </div>
  );
}

// Notifications Tab Component
interface NotificationsTabProps {
  settings: any;
  updateSettings: (data: any) => Promise<void>;
  isUpdatingSettings: boolean;
}

function NotificationsTab({ settings, updateSettings, isUpdatingSettings }: NotificationsTabProps) {
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      await updateSettings({ notifications_enabled: !settings?.notifications_enabled });
      setSuccess('Instellingen opgeslagen');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      // Error handling
    }
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
              checked={settings?.notifications_enabled || false}
              onChange={handleSave}
              className="sr-only peer"
              disabled={isUpdatingSettings}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
}

// Appearance Tab Component
function AppearanceTab({ settings, updateSettings, isUpdatingSettings }: NotificationsTabProps) {
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async () => {
    // Save appearance settings
  };

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
                className={`w-8 h-8 rounded-full transition-all ${settings?.calendar_colors === color.value ? 'ring-2 ring-primary-500' : ''}`}
                style={{ backgroundColor: color.hex }}
              />
            ))}
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={isUpdatingSettings}
            className="btn btn-primary"
          >
            Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}

// General Tab Component
function GeneralTab({ settings, updateSettings, isUpdatingSettings }: NotificationsTabProps) {
  const [formData, setFormData] = useState({
    timezone: settings?.timezone || 'Europe/Amsterdam',
    language: settings?.language || 'nl',
  });
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      await updateSettings(formData);
      setSuccess('Instellingen opgeslagen');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      // Error
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Algemeen</h2>
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm mb-4">
          {success}
        </div>
      )}

      <div className="space-y-6 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tijdzone
          </label>
          <select
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {TIMEZONES.map(option => (
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {LANGUAGES.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={isUpdatingSettings}
            className="btn btn-primary"
          >
            Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}

// Calendar Tab Component (simplified - keep existing for now)
function CalendarTab({ myCalendars, sharedCalendars, deleteCalendar, isDeletingCalendar, addShare, updateShare, removeShare, isAddingShare, isUpdatingShare, isRemovingShare, isLoading }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Agenda's beheer</h2>
      <p className="text-gray-500">Agenda beheer functionaliteit (bestaande implementatie)</p>
    </div>
  );
}

// Users Tab Component (Admin only)
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');

  // Load users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      setUserError(null);
      try {
        const { usersApi } = await import('@/services/api');
        const response = await usersApi.getAll();
        setUsers(response?.data || []);
      } catch (err) {
        setUserError('Fout bij laden gebruikers');
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  // SIMPLE: Direct API call without React Query
  const handleCreateUser = async () => {
    if (!newUsername.trim()) {
      setUserError('Gebruikersnaam is verplicht');
      return;
    }
    
    if (newUsername.length < 3) {
      setUserError('Gebruikersnaam moet minimaal 3 tekens bevatten');
      return;
    }

    try {
      setUserError(null);
      setUserSuccess(null);
      setIsCreatingUser(true);
      
      const { default: api } = await import('@/services/api');
      const response = await api.post('/users/create-with-otp', null, { 
        params: { username: newUsername, role: newUserRole } 
      });
      
      console.log('Create user response:', response);
      console.log('Create user OTP:', response.data.one_time_password);
      
      setGeneratedPassword(response.data.one_time_password || '');
      setNewUsername('');
      setNewUserRole('user');
      setUserSuccess('Gebruiker aangemaakt! One-time wachtwoord gegenereerd.');
      
      // Refresh users list
      const { usersApi } = await import('@/services/api');
      const result = await usersApi.getAll();
      setUsers(result?.data || []);
      
    } catch (err: any) {
      console.error('Create user error:', err);
      console.error('Error response:', err.response);
      setUserError(err.response?.data?.detail || err.message || 'Fout bij aanmaken gebruiker');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleResetPassword = async (userId: number, username: string) => {
    try {
      setUserError(null);
      setUserSuccess(null);
      setIsResettingPassword(true);
      
      // Direct axios call - no React Query
      const { default: api } = await import('@/services/api');
      const response = await api.post(`/users/${userId}/reset-password`);
      
      console.log('Direct API response:', response);
      console.log('Direct response.data:', response.data);
      console.log('Direct OTP:', response.data.one_time_password);
      
      setGeneratedPassword(`${username}: ${response.data.one_time_password || ''}`);
      setUserSuccess(`Wachtwoord voor ${username} gereset!`);
      
      // Refresh users list
      const { usersApi } = await import('@/services/api');
      const result = await usersApi.getAll();
      setUsers(result?.data || []);
      
    } catch (err: any) {
      console.error('Reset password error:', err);
      console.error('Error response:', err.response);
      setUserError(err.response?.data?.detail || err.message || 'Fout bij resetten wachtwoord');
    } finally {
      setTimeout(() => {
        setUserSuccess(null);
        setGeneratedPassword(null);
      }, 10000);
      setIsResettingPassword(false);
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!window.confirm(`Weet je zeker dat je ${username} wilt verwijderen?`)) {
      return;
    }
    
    try {
      setUserError(null);
      setIsDeletingUser(true);
      const { default: api } = await import('@/services/api');
      await api.delete(`/users/${userId}`);
      setUserSuccess(`Gebruiker ${username} verwijderd`);
      
      // Refresh users list
      const { usersApi } = await import('@/services/api');
      const result = await usersApi.getAll();
      setUsers(result?.data || []);
    } catch (err: any) {
      setUserError(err.response?.data?.detail || 'Fout bij verwijderen gebruiker');
    } finally {
      setTimeout(() => setUserSuccess(null), 3000);
      setIsDeletingUser(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setUserSuccess('One-time wachtwoord gekopieerd!');
    setTimeout(() => setUserSuccess(null), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Gebruikers beheren</h2>
      </div>

      {userError && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
          {userError}
        </div>
      )}

      {userSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm mb-4">
          {userSuccess}
        </div>
      )}

      {generatedPassword && (
        <div className="bg-primary-600 text-white px-6 py-4 rounded-lg mb-4 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-medium mb-1">Wachtwoord voor {generatedPassword.split(':')[0]} gereset</p>
              <p className="text-xl font-bold">One-time wachtwoord: <span className="font-mono">{generatedPassword.split(':')[1]}</span></p>
            </div>
            <button
              onClick={() => copyToClipboard(generatedPassword.split(':')[1])}
              className="px-4 py-2 bg-white text-primary-600 rounded-lg font-medium hover:bg-gray-100 transition-colors whitespace-nowrap"
            >
              Kopiëren
            </button>
          </div>
        </div>
      )}

      {/* Create new user */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Nieuwe gebruiker toevoegen</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gebruikersnaam
            </label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Gebruikersnaam"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isCreatingUser}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol
            </label>
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as 'user' | 'admin')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isCreatingUser}
            >
              <option value="user">Gebruiker</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <button
            onClick={handleCreateUser}
            disabled={isCreatingUser || !newUsername.trim()}
            className="btn btn-primary"
          >
            {isCreatingUser ? <LoadingSpinner size="sm" /> : 'Gebruiker aanmaken'}
          </button>
        </div>
      </div>

      {/* Users list */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Huidige gebruikers</h3>
        
        {isLoadingUsers ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" text="Gebruikers laden..." />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Geen gebruikers gevonden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Gebruiker</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Rol</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 text-sm">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(userItem => (
                  <tr key={userItem.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{userItem.username}</p>
                        {userItem.must_change_password && (
                          <p className="text-xs text-amber-600">Moet wachtwoord wijzigen</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        userItem.role === 'admin' 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {userItem.role === 'admin' ? 'Administrator' : 'Gebruiker'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleResetPassword(userItem.id, userItem.username)}
                          disabled={isResettingPassword}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors disabled:opacity-50"
                          title="Wachtwoord resetten"
                        >
                          <Key className="w-4 h-4 inline" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(userItem.id, userItem.username)}
                          disabled={isDeletingUser}
                          className="px-3 py-1.5 bg-red-100 hover:bg-red-200 rounded-lg text-sm text-red-700 transition-colors disabled:opacity-50"
                          title="Verwijderen"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
