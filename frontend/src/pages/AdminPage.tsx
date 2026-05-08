import { useState } from 'react';
import { Search, Trash2, Users, Calendar as CalendarIcon, Settings } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, calendarsApi, sharesApi } from '@/services/api';
import type { User, UserSettings } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useUsers } from '@/hooks/useUsers';

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

// User Settings Table
interface UserSettingsTableProps {
  users: User[];
  selectedItems: Set<string>;
  toggleSelectItem: (username: string) => void;
  toggleSelectAll: () => void;
  openSettingsModal: (username: string) => void;
}

function UserSettingsTable({ users, selectedItems, toggleSelectItem, toggleSelectAll, openSettingsModal }: UserSettingsTableProps) {
  if (users.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        Geen gebruikers gevonden
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              <input
                type="checkbox"
                checked={selectedItems.size === users.length}
                onChange={() => toggleSelectAll()}
                className="w-4 h-4"
              />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gebruikersnaam</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">OTP Status</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map(user => (
            <tr key={user.username} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedItems.has(user.username)}
                  onChange={() => toggleSelectItem(user.username)}
                  className="w-4 h-4"
                />
              </td>
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
                  onClick={() => openSettingsModal(user.username)}
                  className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Shared Calendars Table
interface SharedCalendarsTableProps {
  calendars: any[];
  selectedItems: Set<number>;
  toggleSelectItem: (id: number) => void;
  toggleSelectAll: () => void;
  openDeleteModal: (id: number) => void;
  openSharesModal: (calendar: any) => void;
}

function SharedCalendarsTable({ calendars, selectedItems, toggleSelectItem, toggleSelectAll, openDeleteModal, openSharesModal }: SharedCalendarsTableProps) {
  if (calendars.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        Geen gedeelde agenda's gevonden
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              <input
                type="checkbox"
                checked={selectedItems.size === calendars.length}
                onChange={() => toggleSelectAll()}
                className="w-4 h-4"
              />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Naam</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Eigenaar</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gebruikersnaam</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {calendars.map(calendar => (
            <tr key={calendar.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedItems.has(calendar.id)}
                  onChange={() => toggleSelectItem(calendar.id)}
                  className="w-4 h-4"
                />
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{calendar.name}</div>
                {calendar.description && (
                  <div className="text-sm text-gray-500">{calendar.description}</div>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">{calendar.owner}</td>
              <td className="px-4 py-3 text-sm text-gray-500 font-mono">{calendar.radicale_username}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                  <button
                    onClick={() => openSharesModal(calendar)}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openDeleteModal(calendar.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Settings Modal
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string | null;
}

function SettingsModal({ isOpen, onClose, username }: SettingsModalProps) {
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ['user-settings', username],
    queryFn: () => usersApi.getSettings(username!).then(res => res.data),
    enabled: !!username && isOpen,
  });
  
  const mutation = useMutation({
    mutationFn: (data: Partial<UserSettings>) => usersApi.updateSettings(username!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      onClose();
    },
  });
  
  const [otp, setOtp] = useState(settings?.otp || false);
  const [timezone, setTimezone] = useState(settings?.timezone || 'Europe/Amsterdam');
  const [language, setLanguage] = useState(settings?.language || 'nl');
  
  useEffect(() => {
    if (settings) {
      setOtp(settings.otp || false);
      setTimezone(settings.timezone || 'Europe/Amsterdam');
      setLanguage(settings.language || 'nl');
    }
  }, [settings]);
  
  const handleSave = () => {
    mutation.mutate({ otp, timezone, language });
  };
  
  if (!isOpen || !username) return null;
  
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
          <h3 className="text-lg font-semibold text-gray-900">
            Instellingen voor {username}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <span className="text-2xl text-gray-400">&times;</span>
          </button>
        </div>
        
        {isLoading ? (
          <LoadingSpinner size="md" />
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={otp}
                  onChange={(e) => setOtp(e.target.checked)}
                  className="mr-2 w-4 h-4"
                />
                Moet wachtwoord wijzigen (OTP)
              </label>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Tijdzone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="Europe/Amsterdam">Europe/Amsterdam</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Taal
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="nl">Nederlands</option>
                <option value="en">English</option>
              </select>
            </div>
            
            <div className="flex gap-2 justify-end pt-4">
              <button onClick={onClose} className="btn btn-secondary">
                Annuleren
              </button>
              <button
                onClick={handleSave}
                className="btn btn-primary"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? <LoadingSpinner size="sm" /> : 'Opslaan'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Shares Modal
interface SharesModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendar: any | null;
}

function SharesModal({ isOpen, onClose, calendar }: SharesModalProps) {
  const queryClient = useQueryClient();
  
  const { data: shares, isLoading, refetch } = useQuery({
    queryKey: ['calendar-shares', calendar?.id],
    queryFn: () => sharesApi.getCalendarShares(calendar!.id).then(res => res.data),
    enabled: !!calendar && isOpen,
  });
  
  const [newShareUser, setNewShareUser] = useState('');
  const [newShareRights, setNewShareRights] = useState<'RW' | 'RO'>('RO');
  
  const addShareMutation = useMutation({
    mutationFn: () => sharesApi.addShare(calendar!.id, { user: newShareUser, rights: newShareRights }),
    onSuccess: () => {
      setNewShareUser('');
      refetch();
    },
  });
  
  const removeShareMutation = useMutation({
    mutationFn: (username: string) => sharesApi.removeShare(calendar!.id, username),
    onSuccess: () => {
      refetch();
    },
  });
  
  const handleAddShare = () => {
    if (!newShareUser) return;
    addShareMutation.mutate();
  };
  
  const handleRemoveShare = (username: string) => {
    removeShareMutation.mutate(username);
  };
  
  if (!isOpen || !calendar) return null;
  
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
          <h3 className="text-lg font-semibold text-gray-900">
            Delingen voor {calendar.name}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <span className="text-2xl text-gray-400">&times;</span>
          </button>
        </div>
        
        {isLoading ? (
          <LoadingSpinner size="md" />
        ) : (
          <div className="space-y-4">
            {/* Existing shares */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Huidige delingen</h4>
              {shares && shares.length > 0 ? (
                <ul className="space-y-2">
                  {shares.map(share => (
                    <li key={share.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="font-medium">{share.user}</span>
                      <span className={`badge ${share.rights === 'RW' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                        {share.rights}
                      </span>
                      <button
                        onClick={() => handleRemoveShare(share.user)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Geen delingen</p>
              )}
            </div>
            
            {/* Add new share */}
            <div className="space-y-2 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700">Nieuwe deling toevoegen</h4>
              <input
                type="text"
                value={newShareUser}
                onChange={(e) => setNewShareUser(e.target.value)}
                placeholder="Gebruikersnaam"
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
              <div className="flex gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={newShareRights === 'RO'}
                    onChange={() => setNewShareRights('RO')}
                    className="w-4 h-4"
                  />
                  Alleen lezen
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={newShareRights === 'RW'}
                    onChange={() => setNewShareRights('RW')}
                    className="w-4 h-4"
                  />
                  Lezen & Schrijven
                </label>
              </div>
              <button
                onClick={handleAddShare}
                className="btn btn-primary w-full"
                disabled={!newShareUser || addShareMutation.isPending}
              >
                {addShareMutation.isPending ? <LoadingSpinner size="sm" /> : 'Toevoegen'}
              </button>
            </div>
            
            <div className="flex gap-2 justify-end pt-4">
              <button onClick={onClose} className="btn btn-secondary">
                Sluiten
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect } from 'react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'calendars'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string | number>>(new Set());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsUsername, setSettingsUsername] = useState<string | null>(null);
  const [isSharesModalOpen, setIsSharesModalOpen] = useState(false);
  const [sharesCalendar, setSharesCalendar] = useState<any | null>(null);

  const queryClient = useQueryClient();

  // Get list of users with settings (from database, not Radicale)
  const { data: usersData, isLoading: isLoadingUsers } = useUsers();

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
  const users: User[] = (usersData || []).map((user, index) => ({
    ...user,
    must_change_password: usersSettings?.[index]?.otp || false
  }));

  // Shared calendars data
  const { data: sharedCalendarsData, isLoading: isLoadingSharedCalendars } = useQuery({
    queryKey: ['calendars', 'shared'],
    queryFn: () => calendarsApi.getSharedCalendars().then(res => res.data),
  });

  const sharedCalendars: any[] = sharedCalendarsData || [];

  // Delete shared calendar mutation
  const deleteCalendarMutation = useMutation({
    mutationFn: calendarsApi.deleteShared,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars', 'shared'] });
      setIsDeleteModalOpen(false);
      setDeleteId(null);
    },
  });

  const filteredItems = activeTab === 'users'
    ? users.filter(u => 
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sharedCalendars.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      );

  const toggleSelectItem = (id: string | number) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    const allIds = filteredItems.map(item => activeTab === 'users' ? item.username : item.id);
    if (selectedItems.size === allIds.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(allIds));
    }
  };

  const openSettingsModal = (username: string) => {
    setSettingsUsername(username);
    setIsSettingsModalOpen(true);
  };

  const openSharesModal = (calendar: any) => {
    setSharesCalendar(calendar);
    setIsSharesModalOpen(true);
  };

  const openDeleteModal = (id: number) => {
    setDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId === null) return;

    try {
      await deleteCalendarMutation.mutateAsync(deleteId);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  if (isLoadingUsers || isLoadingSharedCalendars) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Gegevens laden..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500">Beheer gebruikersinstellingen en gedeelde agenda's</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-4 px-1 border-b-2 ${activeTab === 'users' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span>Gebruikers</span>
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{users.length}</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('calendars')}
            className={`pb-4 px-1 border-b-2 ${activeTab === 'calendars' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              <span>Gedeelde Agenda's</span>
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{sharedCalendars.length}</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Zoeken ${activeTab === 'users' ? 'gebruikers' : 'gedeelde agenda\'s'}...`}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleSelectAll}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            {selectedItems.size === filteredItems.length ? 'Alles deselecteren' : 'Alles selecteren'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {activeTab === 'users' ? (
          <UserSettingsTable
            users={filteredItems as User[]}
            selectedItems={selectedItems as Set<string>}
            toggleSelectItem={toggleSelectItem}
            toggleSelectAll={toggleSelectAll}
            openSettingsModal={openSettingsModal}
          />
        ) : (
          <SharedCalendarsTable
            calendars={filteredItems as any[]}
            selectedItems={selectedItems as Set<number>}
            toggleSelectItem={toggleSelectItem}
            toggleSelectAll={toggleSelectAll}
            openDeleteModal={openDeleteModal}
            openSharesModal={openSharesModal}
          />
        )}
      </div>

      {/* Empty state */}
      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Geen resultaten gevonden</p>
        </div>
      )}

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        username={settingsUsername}
      />
      
      <SharesModal
        isOpen={isSharesModalOpen}
        onClose={() => setIsSharesModalOpen(false)}
        calendar={sharesCalendar}
      />

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsDeleteModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Gedeelde agenda verwijderen
              </h3>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <span className="text-2xl text-gray-400">&times;</span>
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Weet je zeker dat je deze gedeelde agenda wilt verwijderen?
              Deze actie kan niet ongedaan worden gemaakt.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="btn btn-secondary"
              >
                Annuleren
              </button>
              <button
                onClick={handleDelete}
                className="btn btn-danger"
                disabled={deleteCalendarMutation.isPending}
              >
                {deleteCalendarMutation.isPending ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  'Verwijderen'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
