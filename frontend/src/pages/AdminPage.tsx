import { useState } from 'react';
import { Plus, Search, Trash2, Edit2, Users, Shield } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, calendarsApi } from '@/services/api';
import type { User, Calendar } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';

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

interface UsersTableProps {
  users: User[];
  selectedItems: Set<number>;
  toggleSelectItem: (id: number) => void;
  toggleSelectAll: () => void;
  openDeleteModal: (type: 'user' | 'calendar', id: number) => void;
}

function UsersTable({ users, selectedItems, toggleSelectItem, toggleSelectAll, openDeleteModal }: UsersTableProps) {
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
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aangemaakt</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map(user => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedItems.has(user.id)}
                  onChange={() => toggleSelectItem(user.id)}
                  className="w-4 h-4"
                />
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{user.username}</div>
              </td>
              <td className="px-4 py-3">{getUserRoleBadge(user.role)}</td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {new Date(user.created_at).toLocaleDateString('nl-NL')}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => openDeleteModal('user', user.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface CalendarsTableProps {
  calendars: Calendar[];
  selectedItems: Set<number>;
  toggleSelectItem: (id: number) => void;
  toggleSelectAll: () => void;
  openDeleteModal: (type: 'user' | 'calendar', id: number) => void;
}

function CalendarsTable({ calendars, selectedItems, toggleSelectItem, toggleSelectAll, openDeleteModal }: CalendarsTableProps) {
  if (calendars.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        Geen agenda's gevonden
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
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aangemaakt</th>
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
              <td className="px-4 py-3 text-sm text-gray-500">
                {calendar.owner?.username || `ID: ${calendar.owner_id}`}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {new Date(calendar.created_at).toLocaleDateString('nl-NL')}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                  <button className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openDeleteModal('calendar', calendar.id)}
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

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'calendars'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'user' | 'calendar' | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const queryClient = useQueryClient();

  // Users data
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => usersApi.getAll(1, 100),
  });

  const users: User[] = usersData?.data || [];

  // Calendars data
  const { data: calendarsData, isLoading: isLoadingCalendars } = useQuery({
    queryKey: ['admin', 'calendars'],
    queryFn: () => calendarsApi.getAll(),
  });

  const calendars: Calendar[] = calendarsData?.data || [];

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setIsDeleteModalOpen(false);
      setDeleteId(null);
    },
  });

  // Delete calendar mutation
  const deleteCalendarMutation = useMutation({
    mutationFn: calendarsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'calendars'] });
      setIsDeleteModalOpen(false);
      setDeleteId(null);
    },
  });

  const filteredItems = activeTab === 'users'
    ? users.filter(u => 
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : calendars.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      );

  const toggleSelectItem = (id: number) => {
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
    const allIds = filteredItems.map(item => item.id);
    if (selectedItems.size === allIds.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(allIds));
    }
  };

  const openDeleteModal = (type: 'user' | 'calendar', id: number) => {
    setDeleteType(type);
    setDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId === null) return;

    try {
      if (deleteType === 'user') {
        await deleteUserMutation.mutateAsync(deleteId);
      } else if (deleteType === 'calendar') {
        await deleteCalendarMutation.mutateAsync(deleteId);
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleBulkDelete = async () => {
    console.log('Bulk delete not implemented yet');
  };

  if (isLoadingUsers || isLoadingCalendars) {
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
          <p className="text-gray-500">Beheer gebruikers en agenda's</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'users' && (
            <button className="btn btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Gebruiker toevoegen
            </button>
          )}
          {activeTab === 'calendars' && (
            <button className="btn btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Agenda toevoegen
            </button>
          )}
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
              <Shield className="w-5 h-5" />
              <span>Agenda's</span>
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{calendars.length}</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Search and bulk actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Zoeken ${activeTab === 'users' ? 'gebruikers' : 'agendas'}...`}
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
          {selectedItems.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Verwijderen ({selectedItems.size})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {activeTab === 'users' ? (
          <UsersTable
            users={filteredItems as User[]}
            selectedItems={selectedItems}
            toggleSelectItem={toggleSelectItem}
            toggleSelectAll={toggleSelectAll}
            openDeleteModal={openDeleteModal}
          />
        ) : (
          <CalendarsTable
            calendars={filteredItems as Calendar[]}
            selectedItems={selectedItems}
            toggleSelectItem={toggleSelectItem}
            toggleSelectAll={toggleSelectAll}
            openDeleteModal={openDeleteModal}
          />
        )}
      </div>

      {/* Empty state */}
      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Geen resultaten gevonden</p>
        </div>
      )}

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
                {deleteType === 'user' ? 'Gebruiker' : 'Agenda'} verwijderen
              </h3>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <span className="text-2xl text-gray-400">&times;</span>
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Weet je zeker dat je dit {deleteType === 'user' ? 'gebruiker' : 'agenda'} wilt verwijderen? 
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
                disabled={deleteUserMutation.isPending || deleteCalendarMutation.isPending}
              >
                {deleteUserMutation.isPending || deleteCalendarMutation.isPending ? (
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
