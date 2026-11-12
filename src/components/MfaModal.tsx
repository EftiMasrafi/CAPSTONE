import React, { useState, useEffect } from 'react';
import { MfaStatus } from '../types';
import { apiRequest } from '../lib/api';
import {
  ShieldCheck,
  ShieldAlert,
  Key,
  Copy,
  Check,
  Smartphone,
  FileText,
  X,
  AlertTriangle,
  Lock,
} from 'lucide-react';

interface MfaModalProps {
  onClose: () => void;
}

export const MfaModal: React.FC<MfaModalProps> = ({ onClose }) => {
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Setup state
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupData, setSetupData] = useState<{
    secret: string;
    recovery_codes: string[];
    demo_current_code: string;
    otpauth_url: string;
  } | null>(null);

  const [verifyCodeInput, setVerifyCodeInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const res = await apiRequest<MfaStatus>('/api/security/mfa/status');
      setStatus(res);
    } catch (err: any) {
      alert(`Failed to load MFA status: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleStartSetup = async () => {
    try {
      setIsSettingUp(true);
      setError(null);
      const res = await apiRequest('/api/security/mfa/setup', { method: 'POST' });
      setSetupData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to initiate 2FA setup.');
    }
  };

  const handleConfirmMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCodeInput.trim()) return;

    try {
      setIsVerifying(true);
      setError(null);
      await apiRequest('/api/security/mfa/confirm', {
        method: 'POST',
        body: JSON.stringify({ code: verifyCodeInput.trim() }),
      });
      setIsSettingUp(false);
      setSetupData(null);
      setVerifyCodeInput('');
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || 'Verification code invalid.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!window.confirm('Are you sure you want to disable Two-Factor Authentication? Your account will only be protected by your password.')) {
      return;
    }

    try {
      await apiRequest('/api/security/mfa/disable', { method: 'POST' });
      await fetchStatus();
    } catch (err: any) {
      alert(`Failed to disable 2FA: ${err.message}`);
    }
  };

  const copySecret = () => {
    if (setupData) {
      navigator.clipboard.writeText(setupData.secret);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                Two-Factor Authentication (RFC 6238 TOTP)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Time-based one-time passwords compatible with Google Authenticator and Microsoft Authenticator.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading security parameters...</div>
        ) : (
          <div className="py-4 space-y-4">
            {/* Current Status Badge */}
            <div className="p-3.5 rounded-lg border flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                {status?.is_enabled ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                )}
                <div>
                  <div className="font-semibold text-xs text-slate-900 dark:text-white">
                    {status?.is_enabled
                      ? 'Two-Factor Authentication is ACTIVE'
                      : 'Two-Factor Authentication is DISABLED'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {status?.is_enabled
                      ? `Enrolled ${new Date(status.enabled_at!).toLocaleDateString()} · ${status.remaining_recovery_codes} backup recovery keys available`
                      : 'Add an additional cryptographic verification layer to prevent unauthorized access.'}
                  </div>
                </div>
              </div>

              {status?.is_enabled ? (
                <button
                  onClick={handleDisableMfa}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors cursor-pointer"
                >
                  Disable
                </button>
              ) : !isSettingUp ? (
                <button
                  onClick={handleStartSetup}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs cursor-pointer"
                >
                  Configure 2FA
                </button>
              ) : null}
            </div>

            {/* Setup Workflow */}
            {isSettingUp && setupData && (
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                {error && (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded text-xs border border-rose-200 dark:border-rose-900">
                    {error}
                  </div>
                )}

                {/* Secret Key Display */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    1. Authenticator Base32 Secret Key
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-2 bg-slate-100 dark:bg-slate-800 rounded font-mono text-xs font-bold tracking-widest text-blue-600 dark:text-blue-400 select-all">
                      {setupData.secret}
                    </div>
                    <button
                      type="button"
                      onClick={copySecret}
                      className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded cursor-pointer"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Recovery Backup Codes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    2. Emergency Single-Use Recovery Keys (Save These)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-center font-bold text-slate-700 dark:text-slate-300">
                    {setupData.recovery_codes.map((c) => (
                      <div key={c} className="py-1 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                        {c}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verification Form */}
                <form onSubmit={handleConfirmMfa} className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        3. Enter 6-Digit Code from Authenticator
                      </label>
                      <button
                        type="button"
                        onClick={() => setVerifyCodeInput(setupData.demo_current_code)}
                        className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Use Current Demo Code ({setupData.demo_current_code})
                      </button>
                    </div>

                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="e.g. 492015"
                      value={verifyCodeInput}
                      onChange={(e) => setVerifyCodeInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center tracking-widest text-lg font-mono font-bold py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingUp(false);
                        setSetupData(null);
                      }}
                      className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-md cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isVerifying || verifyCodeInput.length !== 6}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md shadow-xs cursor-pointer"
                    >
                      {isVerifying ? 'Verifying...' : 'Verify & Enable 2FA'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
