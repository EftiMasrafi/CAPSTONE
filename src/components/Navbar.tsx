import React, { useState } from 'react';
import { User, Notification } from '../types';
import {
  Wrench,
  Bell,
  CheckCheck,
  LogOut,
  ChevronDown,
  UserCheck,
  Moon,
  Sun,
  LayoutDashboard,
  Ticket as TicketIcon,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  FlaskConical,
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications: Notification[];
  unreadCount: number;
  onMarkNotificationRead: (id: number) => void;
  onMarkAllNotificationsRead: () => void;
  onQuickSwitchPersona: (email: string) => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenCreateTicket: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  notifications,
  unreadCount,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onQuickSwitchPersona,
  onLogout,
  isDarkMode,
  onToggleDarkMode,
  onOpenCreateTicket,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  const role = currentUser?.role || 'reporter';

  // Available tabs based on server RBAC capabilities
  const tabs = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      visible: ['technician', 'manager', 'admin'].includes(role),
    },
    {
      id: 'tickets',
      label: role === 'technician' ? 'My Assigned Tickets' : role === 'reporter' ? 'My Tickets' : 'Campus Tickets',
      icon: TicketIcon,
      visible: true,
    },
    {
      id: 'reports',
      label: 'Reports & Export',
      icon: FileSpreadsheet,
      visible: ['manager', 'admin'].includes(role),
    },
    {
      id: 'users',
      label: 'User Directory',
      icon: Users,
      visible: role === 'admin',
    },
    {
      id: 'audit',
      label: 'Audit Log & Chain',
      icon: ShieldCheck,
      visible: role === 'admin',
    },
    {
      id: 'tests',
      label: 'Test Suite',
      icon: FlaskConical,
      visible: true,
    },
  ].filter((t) => t.visible);

  const personas = [
    { name: 'Alex Vance', role: 'admin', email: 'admin@campus.edu', title: 'System Administrator' },
    { name: 'Maria Rodriguez', role: 'manager', email: 'manager@campus.edu', title: 'Maintenance Directorate' },
    { name: 'David Chen', role: 'technician', email: 'tech1@campus.edu', title: 'Electrical Specialist' },
    { name: 'Dr. Sarah Jenkins', role: 'reporter', email: 'reporter@campus.edu', title: 'Biochemistry Researcher' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-8">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 text-white shadow-xs">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-display font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                Campus Maintenance OS
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans tracking-wide">
                Role-Based Work Orders & Audit
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Actions & Profile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Dark Mode Switcher */}
            <button
              onClick={onToggleDarkMode}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Quick Persona Switcher for Academic Demo */}
            <div className="relative">
              <button
                onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors cursor-pointer"
                title="Switch Demo Persona to test RBAC"
              >
                <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                <span className="capitalize font-semibold">{currentUser?.role || 'Guest'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showPersonaMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Demo Persona Switcher
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Instantly test different role access policies:
                    </p>
                  </div>
                  {personas.map((p) => (
                    <button
                      key={p.email}
                      onClick={() => {
                        setShowPersonaMenu(false);
                        onQuickSwitchPersona(p.email);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${
                        currentUser?.email === p.email
                          ? 'bg-blue-50/70 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{p.title}</div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        {p.role}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white tabular-nums">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 max-h-[420px] flex flex-col">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Notifications & Alerts
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={onMarkAllNotificationsRead}
                        className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.notif_id}
                          onClick={() => onMarkNotificationRead(n.notif_id)}
                          className={`p-3 text-xs transition-colors cursor-pointer ${
                            n.is_read
                              ? 'bg-transparent text-slate-600 dark:text-slate-400'
                              : 'bg-blue-50/40 dark:bg-blue-950/20 text-slate-900 dark:text-slate-100 font-medium'
                          } hover:bg-slate-50 dark:hover:bg-slate-800/80`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 leading-relaxed">{n.message}</p>
                            {!n.is_read && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1" />
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.created_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Create Ticket CTA (for Reporter, Manager, Admin) */}
            {['reporter', 'manager', 'admin'].includes(role) && (
              <button
                onClick={onOpenCreateTicket}
                className="hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-xs whitespace-nowrap cursor-pointer"
              >
                + New Ticket
              </button>
            )}

            {/* Logout button */}
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-2 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Nav strip */}
        <div className="md:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-100 dark:border-slate-800">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-md whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
