import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Palette, User, ChevronLeft, Upload, Users, Settings, Plus, Check, Copy, RefreshCw, Calendar as CalendarIcon, Trash2, X } from 'lucide-react';
import { useAuth, useMySettings, useUsers } from '@/hooks';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { usersApi, calendarsApi, sharesApi } from '@/services/api';
import { CALENDAR_COLORS, TIMEZONES, LANGUAGES } from '@/utils/constants';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { User as UserType, UserSettings, ApiResponse } from '@/types';

type TabType = 'profile' | 'notifications' | 'appearance' | 'shared' | 'users';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const navigate = useNavigate();
  const { user } = useAuth();

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
        <SettingsSidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} />

        {/* Main Content */}
        <div className="md:col-span-3">
          <SettingsContent activeTab={activeTab} user={user} />
        </div>
      </div>
    </div>
  );
}

// Sidebar Navigation Component
interface SettingsSidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  user: UserType | null;
}

function SettingsSidebar({ activeTab, setActiveTab, user }: SettingsSidebarProps) {
  const navigate = useNavigate();

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
            onClick={() => setActiveTab('shared')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeTab === 'shared' ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50 text-gray-700'}`}
          >
            <CalendarIcon className="w-5 h-5" />
            <span>Gedeelde agenda's</span>
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeTab === 'users' ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              <Users className="w-5 h-5" />
              <span>Gebruikers</span>
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
  user: UserType | null;
}

function SettingsContent({ activeTab, user }: SettingsContentProps) {
  const { changePassword } = useAuth();
  const { data: settingsData, isLoading: isLoadingSettings, update } = useMySettings();
  const settings = settingsData;

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
          updateSettings={update as (data: Partial<UserSettings>) => Promise<ApiResponse<UserSettings>>}
          isUpdatingSettings={false}
        />
      )}
      {activeTab === 'appearance' && (
        <AppearanceTab
          settings={settings}
          updateSettings={update as (data: Partial<UserSettings>) => Promise<ApiResponse<UserSettings>>}
          isUpdatingSettings={false}
        />
      )}
      {activeTab === 'shared' && (
        <SharedTab />
      )}
      {activeTab === 'users' && user?.role === 'admin' && (
        <UsersTab />
      )}
    </>
  );
}

// Helper function for role badge
function getUserRoleBadge(role: string) {
  switch (role) {
    case 'admin':
      return <span className="badge bg-red-100 text-red-700">Admin</span>;
    case 'user':
      return <span className="badge bg-blue-100 text-blue-700">Gebruiker</span>;
    default:
      return <span className="badge bg-gray-100 text-gray-700">{role}</span>;
  }
}

// Users Tab Component
function UsersTab() {
  const queryClient = useQueryClient();
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  
  // Success notification state
  const [successNotification, setSuccessNotification] = useState<{
    username: string;
    password: string;
    message: string;
  } | null>(null);

  // Sync user_settings with Radicale users on tab open
  const syncMutation = useMutation({
    mutationFn: () => usersApi.syncWithRadicale(),
    onSuccess: () => {
      // Refresh users list after sync
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users-settings'] });
    },
    onError: (err) => {
      console.error('Error syncing users with Radicale:', err);
    }
  });

  // Sync on component mount (when tab is opened)
  useEffect(() => {
    syncMutation.mutate();
  }, []);

  // Get list of users with settings
  const { data: usersData, isLoading: isLoadingUsers, refetch: refetchUsers } = useUsers();

  // Also fetch OTP status for each user
  const { data: usersSettings } = useQuery({
    queryKey: ['users-settings'],
    queryFn: async () => {
      if (!usersData || usersData.length === 0) return [];
      const settingsPromises = usersData.map(user => 
        usersApi.getSettings(user.username).then(res => res.data).catch(() => null)
      );
      return Promise.all(settingsPromises);
    },
    enabled: !!usersData && usersData.length > 0,
  });

  // Merge user data with OTP status
  const users: UserType[] = (usersData || []).map((user, index) => ({
    ...user,
    must_change_password: usersSettings?.[index]?.otp || false
  }));

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (username: string) => usersApi.createUser(username),
    onSuccess: (response) => {
      setSuccessNotification({
        username: response.data.username,
        password: response.data.password,
        message: response.data.message
      });
      // Refresh users list
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users-settings'] });
    },
    onError: (err) => {
      alert(`Fout bij aanmaken gebruiker: ${err instanceof Error ? err.message : 'Onbekende fout'}`);
    }
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: (username: string) => usersApi.resetUserPassword(username),
    onSuccess: (response) => {
      setSuccessNotification({
        username: response.data.username,
        password: response.data.new_password,
        message: response.data.message
      });
      // Refresh users settings to show OTP flag
      queryClient.invalidateQueries({ queryKey: ['users-settings'] });
    },
    onError: (err) => {
      alert(`Fout bij resetten wachtwoord: ${err instanceof Error ? err.message : 'Onbekende fout'}`);
    }
  });

  const handleResetPassword = (username: string) => {
    if (confirm(`Weet je zeker dat je het wachtwoord voor ${username} wilt resetten?`)) {
      resetPasswordMutation.mutate(username);
    }
  };

  if (isLoadingUsers) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Gebruikers laden..." />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Gebruikersbeheer</h2>
        <button
          onClick={() => setIsAddUserModalOpen(true)}
          className="btn btn-primary p-2"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
      
      {/* Success Notification */}
      {successNotification && (
        <SuccessNotification
          username={successNotification.username}
          password={successNotification.password}
          message={successNotification.message}
          onDismiss={() => setSuccessNotification(null)}
        />
      )}

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Gebruikersnaam
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Rol
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Wachtwoord status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actie
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.length > 0 ? (
              users.map(user => (
                <tr key={user.username} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{user.username}</div>
                  </td>
                  <td className="px-4 py-3">{getUserRoleBadge(user.role)}</td>
                  <td className="px-4 py-3">
                    {user.must_change_password ? (
                      <span className="badge bg-yellow-100 text-yellow-700">Moet wachtwoord wijzigen</span>
                    ) : (
                      <span className="badge bg-green-100 text-green-700">OK</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleResetPassword(user.username)}
                      className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg"
                      title="Wachtwoord resetten"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  Geen gebruikers gevonden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onSuccess={(username, password) => {
          setSuccessNotification({
            username,
            password,
            message: `Gebruiker '${username}' is succesvol aangemaakt.`
          });
        }}
      />
    </div>
  );
}

// Shared Tab Component
function SharedTab() {
  const { data: sharedCalendars, isLoading, refetch } = useQuery({
    queryKey: ['my-shared-calendars'],
    queryFn: () => calendarsApi.getMySharedCalendars().then(res => res.data),
  });

  // Get all users for autocomplete
  const { data: allUsers, isLoading: isLoadingAllUsers } = useUsers();

  const queryClient = useQueryClient();
  
  // State for add share modal
  const [selectedCalendarId, setSelectedCalendarId] = useState<number | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [rightsInput, setRightsInput] = useState<'RW' | 'RO'>('RO');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Mutation for adding a share
  const addShareMutation = useMutation({
    mutationFn: ({ calendarId, username, rights }: { calendarId: number; username: string; rights: 'RW' | 'RO' }) => 
      sharesApi.addShare(calendarId, { user: username, rights }),
    onSuccess: () => {
      setIsAddModalOpen(false);
      setUsernameInput('');
      setRightsInput('RO');
      setAddError(null);
      queryClient.invalidateQueries({ queryKey: ['my-shared-calendars'] });
      queryClient.invalidateQueries({ queryKey: ['calendars', 'shared'] });
    },
    onError: (err) => {
      setAddError(err instanceof Error ? err.message : 'Fout bij toevoegen gebruiker');
    },
  });

  // Mutation for removing a share
  const removeShareMutation = useMutation({
    mutationFn: ({ calendarId, username }: { calendarId: number; username: string }) => 
      sharesApi.removeShare(calendarId, username),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shared-calendars'] });
      queryClient.invalidateQueries({ queryKey: ['calendars', 'shared'] });
    },
  });

  // Mutation for updating share rights
  const updateShareMutation = useMutation({
    mutationFn: ({ calendarId, username, rights }: { calendarId: number; username: string; rights: 'RW' | 'RO' }) => 
      sharesApi.updateShare(calendarId, username, { rights }),
    onMutate: async ({ calendarId, username, rights }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['my-shared-calendars'] });
      
      // Snapshot the previous value
      const previousCalendars = queryClient.getQueryData(['my-shared-calendars']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['my-shared-calendars'], (old: any) => {
        if (!old) return old;
        return old.map((cal: any) => {
          if (cal.id !== calendarId) return cal;
          return {
            ...cal,
            shares: cal.shares?.map((share: any) => 
              share.user === username ? { ...share, rights } : share
            )
          };
        });
      });
      
      // Return a context object with the snapshotted value
      return { previousCalendars };
    },
    onError: (_err, _variables, context: any) => {
      // Rollback to the previous value on error
      queryClient.setQueryData(['my-shared-calendars'], context.previousCalendars);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['my-shared-calendars'] });
      queryClient.invalidateQueries({ queryKey: ['calendars', 'shared'] });
    },
  });

  const handleRemoveShare = (calendarId: number, username: string) => {
    if (confirm(`Weet je zeker dat je de toegang voor ${username} wilt intrekken?`)) {
      removeShareMutation.mutate({ calendarId, username });
    }
  };

  const handleUpdateRights = (calendarId: number, username: string, currentRights: 'RW' | 'RO') => {
    const newRights = currentRights === 'RW' ? 'RO' : 'RW';
    updateShareMutation.mutate({ calendarId, username, rights: newRights });
  };

  const handleAddShare = (calendarId: number) => {
    setSelectedCalendarId(calendarId);
    setUsernameInput('');
    setRightsInput('RO');
    setAddError(null);
    setIsAddModalOpen(true);
  };

  const handleSubmitAddShare = () => {
    if (!usernameInput.trim()) {
      setAddError('Gebruikersnaam is verplicht');
      return;
    }
    
    if (selectedCalendarId === null) return;
    
    addShareMutation.mutate({
      calendarId: selectedCalendarId,
      username: usernameInput.trim(),
      rights: rightsInput
    });
  };

  // Fetch shares for each calendar
  const calendarsWithShares = useMemo(() => {
    if (!sharedCalendars) return [];
    return sharedCalendars;
  }, [sharedCalendars]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Gedeelde agenda's laden..." />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Gedeelde agenda's</h2>
      
      {calendarsWithShares.length === 0 ? (
        <p className="text-gray-500">Je hebt nog geen agenda's gedeeld.</p>
      ) : (
        <div className="space-y-6">
          {calendarsWithShares.map(calendar => (
            <div key={calendar.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-gray-900">{calendar.name}</h3>
                  <p className="text-sm text-gray-500">{calendar.description}</p>
                </div>
                <button
                  onClick={() => handleAddShare(calendar.id)}
                  className="btn btn-secondary btn-sm"
                >
                  Gebruiker toevoegen
                </button>
              </div>
              
              {/* Shares table for this calendar */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Gebruiker
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Rechten
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Acties
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {calendar.shares && calendar.shares.length > 0 ? (
                      calendar.shares.map((share: any) => (
                        <tr key={share.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <span className="font-medium text-gray-900">{share.user}</span>
                          </td>
                          <td className="px-4 py-2">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={share.rights === 'RW'}
                                onChange={() => handleUpdateRights(calendar.id, share.user, share.rights)}
                                disabled={updateShareMutation.isPending}
                                className="sr-only peer"
                              />
                              <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 ${updateShareMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                              <span className="ml-2 text-sm font-medium text-gray-700">
                                {share.rights}
                              </span>
                            </label>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button
                              onClick={() => handleRemoveShare(calendar.id, share.user)}
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                              title="Toegang intrekken"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-4 text-center text-gray-500 text-sm">
                          Geen gedeelde toegang
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Add Share Modal */}
      {isAddModalOpen && selectedCalendarId && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Gebruiker toevoegen</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {addError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
                {addError}
              </div>
            )}

            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gebruikersnaam
                </label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Voer gebruikersnaam in"
                />
                {showSuggestions && usernameInput.trim() && allUsers && allUsers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {allUsers
                      .filter(user => 
                        user.username.toLowerCase().includes(usernameInput.trim().toLowerCase()) &&
                        user.username.toLowerCase() !== usernameInput.trim().toLowerCase()
                      )
                      .slice(0, 5)
                      .map(user => (
                        <button
                          key={user.username}
                          onClick={() => {
                            setUsernameInput(user.username);
                            setShowSuggestions(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                        >
                          {user.username}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rechten
                </label>
                <select
                  value={rightsInput}
                  onChange={(e) => setRightsInput(e.target.value as 'RW' | 'RO')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="RO">Alleen lezen (RO)</option>
                  <option value="RW">Lezen & Schrijven (RW)</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={addShareMutation.isPending}
                >
                  Annuleren
                </button>
                <button
                  onClick={handleSubmitAddShare}
                  className="btn btn-primary"
                  disabled={addShareMutation.isPending || !usernameInput.trim()}
                >
                  {addShareMutation.isPending ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Toevoegen...</span>
                    </>
                  ) : (
                    'Gebruiker toevoegen'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Success Notification Component
interface SuccessNotificationProps {
  username: string;
  password: string;
  message: string;
  onDismiss: () => void;
}

function SuccessNotification({ username, password, message, onDismiss }: SuccessNotificationProps) {
  const [copied, setCopied] = useState(false);

  // Auto-dismiss after 30 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 30000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed top-4 right-4 bg-orange-100 border-2 border-orange-400 rounded-xl p-4 shadow-lg z-50 max-w-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Check className="w-6 h-6 text-orange-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-orange-800 truncate">{message}</h3>
          <p className="text-sm text-orange-700 mt-1">
            Gebruikersnaam: <span className="font-mono font-semibold">{username}</span>
          </p>
          <div className="mt-2 p-2 bg-white rounded border border-orange-200">
            <code className="text-sm font-mono break-all text-orange-800">{password}</code>
          </div>
          <button
            onClick={copyToClipboard}
            className="mt-2 flex items-center gap-1 text-sm text-orange-600 hover:text-orange-800 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Gekopieerd!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Kopieer wachtwoord</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Add User Modal Component
interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (username: string, password: string) => void;
}

function AddUserModal({ isOpen, onClose, onSuccess }: AddUserModalProps) {
  const [username, setUsername] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (username: string) => usersApi.createUser(username),
    onSuccess: (response) => {
      onSuccess(response.data.username, response.data.password);
      setUsername('');
      setError(null);
      onClose();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Onbekende fout bij aanmaken gebruiker');
      setIsCreating(false);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!username.trim()) {
      setError('Gebruikersnaam is verplicht');
      return;
    }
    
    if (username.toLowerCase() === 'admin') {
      setError('Gebruikersnaam "admin" is gereserveerd');
      return;
    }
    
    setIsCreating(true);
    createMutation.mutate(username);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Gebruiker toevoegen</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <span className="text-2xl text-gray-400">&times;</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gebruikersnaam
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Voer gebruikersnaam in"
              disabled={isCreating}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isCreating}
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isCreating || !username.trim()}
            >
              {isCreating ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Aanmaken...</span>
                </>
              ) : (
                'Gebruiker aanmaken'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
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
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Profiel</h2>
      
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 font-semibold text-xl">{user?.username?.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{user?.username}</p>
            <p className="text-sm text-gray-500">{user?.role === 'admin' ? 'Administrator' : 'Gebruiker'}</p>
          </div>
        </div>
      </div>
      
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
  updateSettings: (data: Partial<UserSettings>) => Promise<ApiResponse<UserSettings>>;
  isUpdatingSettings: boolean;
}

function NotificationsTab({ settings, updateSettings }: NotificationsTabProps) {
  const handleSave = async () => {
    try {
      await updateSettings({ notifications_enabled: !settings?.notifications_enabled });
    } catch (err) {
      // Error handling
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Meldingen</h2>

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
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
}

// Appearance Tab Component
function AppearanceTab({ settings, updateSettings }: NotificationsTabProps) {
  const [formData, setFormData] = useState({
    highlight_weekend: settings?.highlight_weekend || false,
    timezone: settings?.timezone || 'Europe/Amsterdam',
    default_duration: settings?.default_duration || 60,
    default_view: settings?.default_view || 'month',
  });

  const handleSave = async () => {
    try {
      await updateSettings(formData);
    } catch (err) {
      // Error handling
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Uiterlijk</h2>
      
      <div className="space-y-6 max-w-md">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Weekend gekleurd</h3>
            <p className="text-sm text-gray-500">Toon zaterdag/zondag met achtergrondkleur</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.highlight_weekend}
              onChange={(e) => setFormData({ ...formData, highlight_weekend: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

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
            Standaard duur afspraken
          </label>
          <select
            value={formData.default_duration}
            onChange={(e) => setFormData({ ...formData, default_duration: Number(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value={15}>15 minuten</option>
            <option value={30}>30 minuten</option>
            <option value={45}>45 minuten</option>
            <option value={60}>60 minuten</option>
            <option value={90}>90 minuten</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Standaardweergave
          </label>
          <select
            value={formData.default_view}
            onChange={(e) => setFormData({ ...formData, default_view: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="day">Dag</option>
            <option value="week">Week</option>
            <option value="month">Maand</option>
            <option value="list">Lijst</option>
          </select>
        </div>

        <div className="pt-4">
          <button
            onClick={handleSave}
            className="btn btn-primary"
          >
            Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}


