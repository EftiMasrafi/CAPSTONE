import React, { useState } from 'react';
import { User } from '../types';
import { apiRequest, authStorage } from '../lib/api';
import {
  Wrench,
  Shield,
  Lock,
  User as UserIcon,
  Mail,
  AlertCircle,
  Building,
  CheckCircle2,
} from 'lucide-react';

interface AuthModalProps {
  onLoginSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  const demoAccounts = [
    {
      role: 'Admin',
      name: 'Alex Vance',
      email: 'admin@campus.edu',
      password: 'AdminPass123!',
      desc: 'Full supervisor privileges, user directory & SHA-256 audit log',
      color: 'border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300',
    },
    {
      role: 'Manager',
      name: 'Maria Rodriguez',
      email: 'manager@campus.edu',
      password: 'ManagerPass123!',
      desc: 'All tickets overview, dispatch technicians, verify repairs & export',
      color: 'border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300',
    },
    {
      role: 'Technician',
      name: 'David Chen',
      email: 'tech1@campus.edu',
      password: 'TechPass123!',
      desc: 'Receives work orders, moves to In Progress & submits repair notes',
      color: 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300',
    },
    {
      role: 'Reporter',
      name: 'Dr. Sarah Jenkins',
      email: 'reporter@campus.edu',
      password: 'ReporterPass123!',
      desc: 'Submits laboratory equipment faults & tracks personal tickets',
      color: 'border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300',
    },
  ];

  const handleDemoLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    try {
      setIsLoading(true);
      const res = await apiRequest<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: demoEmail, password: demoPass }),
      });
      authStorage.setToken(res.token);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRemainingAttempts(null);

    try {
      setIsLoading(true);
      if (mode === 'login') {
        const res = await apiRequest<{ token: string; user: User }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: email.trim(), password }),
        });
        authStorage.setToken(res.token);
        onLoginSuccess(res.user);
      } else {
        const res = await apiRequest<{ token: string; user: User }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
            department: department.trim(),
          }),
        });
        authStorage.setToken(res.token);
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
      if (err.data?.remainingAttempts !== undefined) {
        setRemainingAttempts(err.data.remainingAttempts);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Banner Header */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white shadow-sm mb-3">
            <Wrench className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold font-display text-slate-900 dark:text-white">
            Campus Maintenance Operations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Role-Based Work Orders with Cryptographic SHA-256 Audit Trail
          </p>
        </div>

        {/* 1-Click Academic Demo Persona Picker */}
        <div className="p-6 pb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Instant 1-Click Role Sign In
            </span>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
              Academic Presentation Mode
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {demoAccounts.map((acc) => (
              <button
                key={acc.role}
                onClick={() => handleDemoLogin(acc.email, acc.password)}
                disabled={isLoading}
                className={`p-2.5 rounded-lg border text-left hover:scale-[1.01] transition-all cursor-pointer ${acc.color}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">{acc.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/60 dark:bg-slate-900/60 uppercase font-mono font-semibold">
                    {acc.role}
                  </span>
                </div>
                <p className="text-[11px] opacity-80 mt-1 line-clamp-1">{acc.desc}</p>
              </button>
            ))}
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-medium">
                Or enter credentials
              </span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="px-6 pb-6">
          {/* Tab Switcher */}
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 mb-4">
            <button
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Register Campus Account
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p>{error}</p>
                {remainingAttempts !== null && remainingAttempts > 0 && (
                  <p className="mt-1 font-semibold">
                    Warning: {remainingAttempts} attempts remaining before temporary account lockout.
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Jane Miller"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                University Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="e.g. username@campus.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Department / Academic Unit
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. Chemical Engineering, Physics Lab 202..."
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 py-2 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md shadow-xs cursor-pointer transition-colors"
            >
              {isLoading
                ? 'Authenticating...'
                : mode === 'login'
                ? 'Sign In to Portal'
                : 'Create Reporter Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
