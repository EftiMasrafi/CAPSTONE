import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { apiRequest } from '../lib/api';
import {
  Users,
  UserPlus,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  RefreshCw,
  Search,
} from 'lucide-react';

export const UserManagementView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add User Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<Role>('technician');
  const [newDept, setNewDept] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await apiRequest<User[]>('/api/users');
      setUsers(res);
    } catch (err: any) {
      alert(`Failed to load users: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: number, newRoleVal: Role) => {
    try {
      await apiRequest(`/api/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRoleVal }),
      });
      await fetchUsers();
    } catch (err: any) {
      alert(`Role change failed: ${err.message}`);
    }
  };

  const handleToggleActive = async (userId: number) => {
    try {
      await apiRequest(`/api/users/${userId}/toggle-active`, {
        method: 'PUT',
      });
      await fetchUsers();
    } catch (err: any) {
      alert(`Status toggle failed: ${err.message}`);
    }
  };

  const handleResetLockout = async (userId: number) => {
    try {
      await apiRequest(`/api/users/${userId}/reset-lockout`, {
        method: 'PUT',
      });
      await fetchUsers();
    } catch (err: any) {
      alert(`Lockout reset failed: ${err.message}`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          password: newPassword,
          role: newRole,
          department: newDept.trim(),
        }),
      });
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewDept('');
      await fetchUsers();
    } catch (err: any) {
      alert(`User creation failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.department.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                Campus User & Role Directory
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Admin-level control to dispatch roles, manage credential lockouts, and activate/deactivate accounts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Provision User</span>
            </button>
            <button
              onClick={fetchUsers}
              title="Refresh User List"
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by name, email, department, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                <th className="py-2.5 px-3 w-14 font-mono text-center">ID</th>
                <th className="py-2.5 px-3 min-w-[200px]">User & Department</th>
                <th className="py-2.5 px-3 min-w-[180px]">Email Address</th>
                <th className="py-2.5 px-3 w-36">Assigned Role</th>
                <th className="py-2.5 px-3 w-28 text-center">Work Orders</th>
                <th className="py-2.5 px-3 w-28 text-center">Security Status</th>
                <th className="py-2.5 px-3 w-36 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((u) => (
                <tr key={u.user_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 text-center font-mono font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                    #{u.user_id}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900 dark:text-white">{u.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{u.department}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                    {u.email}
                  </td>
                  <td className="py-3 px-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.user_id, e.target.value as Role)}
                      className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-medium capitalize text-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      <option value="reporter">Reporter</option>
                      <option value="technician">Technician</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="py-3 px-3 text-center tabular-nums text-slate-600 dark:text-slate-400">
                    <span title="Created">{u.tickets_created || 0} created</span> ·{' '}
                    <span title="Assigned">{u.tickets_assigned || 0} assigned</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {u.locked_until && new Date(u.locked_until).getTime() > Date.now() ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    ) : u.is_active ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {u.locked_until && new Date(u.locked_until).getTime() > Date.now() && (
                        <button
                          onClick={() => handleResetLockout(u.user_id)}
                          className="px-2 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded hover:bg-amber-100 cursor-pointer"
                          title="Clear failed attempts & unlock account"
                        >
                          Unlock
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleActive(u.user_id)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                          u.is_active
                            ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                            : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Provision New Campus User
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Robert Vance"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  University Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. r.vance@campus.edu"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Password (min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Role Permission Tier
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as Role)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                >
                  <option value="reporter">Reporter (Can submit faults & track own)</option>
                  <option value="technician">Technician (Receives assignments & repairs)</option>
                  <option value="manager">Manager (Assigns technicians & verifies)</option>
                  <option value="admin">Admin (Full administrative & audit supervisor)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department / Lab Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Laser Optics Division, HVAC Plant..."
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md cursor-pointer"
                >
                  {isSubmitting ? 'Provisioning...' : 'Provision User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
