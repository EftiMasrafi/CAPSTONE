import React, { useState, useEffect } from 'react';
import { AuditLog } from '../types';
import { apiRequest } from '../lib/api';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Hash,
  Copy,
  ExternalLink,
  Lock,
} from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');

  // Verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    total_logs: number;
    head_hash?: string;
    broken_log_id?: number;
    error?: string;
  } | null>(null);

  // Modal inspection of block
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams();
      if (selectedAction !== 'all') queryParams.set('action', selectedAction);
      if (search) queryParams.set('search', search);

      const res = await apiRequest<AuditLog[]>(`/api/audit?${queryParams.toString()}`);
      setLogs(res);
    } catch (err: any) {
      alert(`Failed to load audit logs: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyChain = async () => {
    try {
      setIsVerifying(true);
      const res = await apiRequest('/api/audit/verify', { method: 'POST' });
      setVerificationResult(res);
    } catch (err: any) {
      alert(`Verification check failed: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedAction]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const actionTypes = [
    'all',
    'LOGIN',
    'FAILED_LOGIN',
    'ACCOUNT_LOCKED',
    'PASSWORD_CHANGED',
    'TICKET_CREATED',
    'TICKET_ASSIGNED',
    'TICKET_STATUS_CHANGED',
    'REPAIR_NOTE_ADDED',
    'COMMENT_ADDED',
    'ATTACHMENT_UPLOADED',
    'USER_CREATED',
    'USER_ROLE_CHANGED',
    'USER_DEACTIVATED',
    'USER_ACTIVATED',
  ];

  return (
    <div className="space-y-4">
      {/* Top Controls & Chain Verifier Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                Tamper-Evident SHA-256 Audit Ledger
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cryptographically chained blocks linking users, operations, state shifts, and repair certifications. Write-only ledger.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleVerifyChain}
              disabled={isVerifying}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md shadow-xs cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>{isVerifying ? 'Recomputing Hash Chain...' : 'Verify Cryptographic Chain'}</span>
            </button>
          </div>
        </div>

        {/* Verification Result Notification Banner */}
        {verificationResult && (
          <div
            className={`mt-4 p-3.5 rounded-lg border text-xs flex items-start gap-3 transition-all ${
              verificationResult.valid
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
            }`}
          >
            {verificationResult.valid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-bold text-sm">
                {verificationResult.valid
                  ? 'SHA-256 Hash Chain 100% Valid & Untampered'
                  : `Integrity Failure Detected at Log #${verificationResult.broken_log_id}`}
              </div>
              <p className="mt-0.5 leading-relaxed">
                {verificationResult.valid
                  ? `All ${verificationResult.total_logs} audit entries were successfully verified against genesis hash. Head hash: ${verificationResult.head_hash}`
                  : verificationResult.error}
              </p>
            </div>
          </div>
        )}

        {/* Search & Action Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search target, actor, new value, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-hidden text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              {actionTypes.map((act) => (
                <option key={act} value={act}>
                  {act === 'all' ? 'All Event Types' : act}
                </option>
              ))}
            </select>

            <button
              onClick={fetchLogs}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md cursor-pointer"
            >
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                <th className="py-2.5 px-3 w-16 text-center font-mono">Block</th>
                <th className="py-2.5 px-3 w-36">Timestamp</th>
                <th className="py-2.5 px-3 w-40">Actor (Role)</th>
                <th className="py-2.5 px-3 w-44">Action</th>
                <th className="py-2.5 px-3 w-32">Target</th>
                <th className="py-2.5 px-3 min-w-[200px]">Audit Delta (Old → New)</th>
                <th className="py-2.5 px-3 w-48 font-mono">SHA-256 Digest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((log) => (
                <tr
                  key={log.log_id}
                  onClick={() => setSelectedLog(log)}
                  className="hover:bg-blue-50/30 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3 text-center font-mono text-slate-500 dark:text-slate-400 tabular-nums font-semibold">
                    #{log.log_id}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 tabular-nums">
                    {new Date(log.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {log.user_name || 'System / Unauth'}
                    </span>
                    {log.user_role && (
                      <span className="text-[10px] ml-1.5 px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase font-mono">
                        {log.user_role}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-medium">
                    {log.target}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                    <div className="line-clamp-1">
                      {log.old_value && (
                        <span className="line-through text-slate-400 mr-1.5">{log.old_value}</span>
                      )}
                      <span>{log.new_value || '—'}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                    <span title={log.hash}>{log.hash.substring(0, 16)}...</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Block Inspection Lightbox */}
      {selectedLog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Audit Block #{selectedLog.log_id} Cryptographic Payload
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Event Action & Target:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedLog.action} on {selectedLog.target}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Recorded Actor:</span>
                <span className="text-slate-800 dark:text-slate-200">
                  {selectedLog.user_name} ({selectedLog.user_email || 'System Action'}) · IP: {selectedLog.ip_address}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Payload Value:</span>
                <pre className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 font-mono text-[11px] overflow-x-auto text-slate-800 dark:text-slate-200">
                  {selectedLog.new_value}
                </pre>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Preceding Block Hash (prev_hash):</span>
                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded font-mono text-[11px] break-all text-slate-600 dark:text-slate-400">
                  {selectedLog.prev_hash}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-slate-400">Current Computed SHA-256 Digest (hash):</span>
                  <button
                    onClick={() => copyToClipboard(selectedLog.hash)}
                    className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedHash === selectedLog.hash ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-2 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded font-mono text-[11px] break-all text-blue-700 dark:text-blue-300 font-bold">
                  {selectedLog.hash}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
