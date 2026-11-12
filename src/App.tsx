import React, { useState, useEffect } from 'react';
import { User, Ticket, Category, Notification } from './types';
import { apiRequest, authStorage } from './lib/api';
import { Navbar } from './components/Navbar';
import { TicketList } from './components/TicketList';
import { TicketDetailModal } from './components/TicketDetailModal';
import { CreateTicketModal } from './components/CreateTicketModal';
import { DashboardView } from './components/DashboardView';
import { AuditLogView } from './components/AuditLogView';
import { UserManagementView } from './components/UserManagementView';
import { ReportsView } from './components/ReportsView';
import { TestRunnerView } from './components/TestRunnerView';
import { AuthModal } from './components/AuthModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Active view tab
  const [activeTab, setActiveTab] = useState<string>('tickets');

  // Core datasets
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

  // Modals
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Dark mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return (
      localStorage.getItem('campus_theme') === 'dark' ||
      (!localStorage.getItem('campus_theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('campus_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('campus_theme', 'light');
    }
  }, [isDarkMode]);

  // Load current user profile on app load
  const loadCurrentUser = async () => {
    const token = authStorage.getToken();
    if (!token) {
      setIsInitializing(false);
      return;
    }

    try {
      const res = await apiRequest<{ user: User; unread_notifications: number }>('/api/auth/me');
      setCurrentUser(res.user);
      setUnreadCount(res.unread_notifications || 0);

      // Default tab based on role
      if (res.user.role === 'reporter') {
        setActiveTab('tickets');
      } else {
        setActiveTab('dashboard');
      }
    } catch {
      authStorage.clearToken();
      setCurrentUser(null);
    } finally {
      setIsInitializing(false);
    }
  };

  // Fetch tickets & categories
  const fetchTickets = async () => {
    if (!currentUser) return;
    try {
      setIsLoadingTickets(true);
      const res = await apiRequest<Ticket[]>('/api/tickets');
      setTickets(res);
    } catch (err: any) {
      console.error('Failed to load tickets', err);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiRequest<Category[]>('/api/categories');
      setCategories(res);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await apiRequest<Notification[]>('/api/notifications');
      setNotifications(res);
      const unread = res.filter((n) => !n.is_read).length;
      setUnreadCount(unread);
    } catch {
      // ignore in background
    }
  };

  useEffect(() => {
    loadCurrentUser();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchTickets();
      fetchNotifications();
    }
  }, [currentUser]);

  // Quick Switch Persona handler for immediate role demonstration
  const handleQuickSwitchPersona = async (email: string) => {
    const passwords: Record<string, string> = {
      'admin@campus.edu': 'AdminPass123!',
      'manager@campus.edu': 'ManagerPass123!',
      'tech1@campus.edu': 'TechPass123!',
      'reporter@campus.edu': 'ReporterPass123!',
    };

    const pass = passwords[email] || 'TechPass123!';
    try {
      const res = await apiRequest<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: pass }),
      });
      authStorage.setToken(res.token);
      setCurrentUser(res.user);
      setSelectedTicketId(null);

      if (res.user.role === 'reporter') {
        setActiveTab('tickets');
      } else {
        setActiveTab('dashboard');
      }
    } catch (err: any) {
      alert(`Quick switch failed: ${err.message}`);
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } finally {
      authStorage.clearToken();
      setCurrentUser(null);
    }
  };

  const handleMarkNotificationRead = async (id: number) => {
    try {
      await apiRequest(`/api/notifications/${id}/read`, { method: 'PUT' });
      setNotifications((prev) =>
        prev.map((n) => (n.notif_id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await apiRequest('/api/notifications/read-all', { method: 'PUT' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch {}
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 text-xs">
        Initializing Campus Operations Engine...
      </div>
    );
  }

  // Not logged in -> Show Auth Modal
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
        <AuthModal
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            if (user.role === 'reporter') setActiveTab('tickets');
            else setActiveTab('dashboard');
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col font-sans">
      {/* Top Navbar adhering to Top Bar Contract */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkNotificationRead={handleMarkNotificationRead}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onQuickSwitchPersona={handleQuickSwitchPersona}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenCreateTicket={() => setIsCreateModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && ['technician', 'manager', 'admin'].includes(currentUser.role) && (
          <DashboardView currentRole={currentUser.role} isDarkMode={isDarkMode} />
        )}

        {activeTab === 'tickets' && (
          <TicketList
            tickets={tickets}
            categories={categories}
            currentRole={currentUser.role}
            isLoading={isLoadingTickets}
            onRefresh={fetchTickets}
            onSelectTicket={(ticket) => setSelectedTicketId(ticket.ticket_id)}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
          />
        )}

        {activeTab === 'reports' && ['manager', 'admin'].includes(currentUser.role) && (
          <ReportsView categories={categories} />
        )}

        {activeTab === 'users' && currentUser.role === 'admin' && <UserManagementView />}

        {activeTab === 'audit' && currentUser.role === 'admin' && <AuditLogView />}

        {activeTab === 'tests' && <TestRunnerView />}
      </main>

      {/* Ticket Detail Inspection & State Machine Modal */}
      {selectedTicketId !== null && (
        <TicketDetailModal
          ticketId={selectedTicketId}
          currentUser={currentUser}
          onClose={() => setSelectedTicketId(null)}
          onTicketUpdated={fetchTickets}
        />
      )}

      {/* Create Ticket Modal */}
      {isCreateModalOpen && (
        <CreateTicketModal
          categories={categories}
          onClose={() => setIsCreateModalOpen(false)}
          onTicketCreated={(newId) => {
            setIsCreateModalOpen(false);
            fetchTickets();
            setSelectedTicketId(newId);
          }}
        />
      )}
    </div>
  );
}
