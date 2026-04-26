import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Bell, Palette, User, ChevronLeft, Upload } from 'lucide-react';
import { useAuth, useSettings, useUpdateSettings } from '@/hooks';
import { CALENDAR_COLORS, TIMEZONES, LANGUAGES } from '@/utils/constants';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'appearance' | 'general'>('profile');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { user, changePassword } = useAuth();
  const { data: settingsData, isLoading: isLoadingSettings } = useSettings();
  const { mutate: updateSettings, isPending: isUpdatingSettings } = useUpdateSettings();
  
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
