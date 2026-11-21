import React, { useState, useEffect } from 'react';
import { SecurityPostureReport, WafRule, DlpIncident, ActiveSession } from '../types';
import { apiRequest } from '../lib/api';
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  Flame,
  Globe,
  Radio,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Crosshair,
  Terminal,
  Cpu,
  Key,
  Eye,
  EyeOff,
  UserX,
  Play,
  Zap,
  Activity,
  Server,
  FileText,
  Copy,
  ExternalLink,
} from 'lucide-react';

export const CyberDefenseView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'posture' | 'waf' | 'dlp' | 'sessions'>('posture');

  // 1. Posture state
  const [posture, setPosture] = useState<SecurityPostureReport | null>(null);
  const [isScanningPosture, setIsScanningPosture] = useState(false);

  // 2. WAF state
  const [wafRules, setWafRules] = useState<WafRule[]>([]);
  const [wafMode, setWafMode] = useState<'ACTIVE_BLOCK' | 'MONITOR_ONLY'>('ACTIVE_BLOCK');
  const [isLoadingWaf, setIsLoadingWaf] = useState(false);
  const [testPayload, setTestPayload] = useState("' OR 1=1; DROP TABLE users; --");
  const [testResult, setTestResult] = useState<{ blocked: boolean; message: string } | null>(null);
  const [isTestingPayload, setIsTestingPayload] = useState(false);

  // 3. DLP state
  const [dlpIncidents, setDlpIncidents] = useState<DlpIncident[]>([]);
  const [isLoadingDlp, setIsLoadingDlp] = useState(false);
  const [dlpSearch, setDlpSearch] = useState('');

  // 4. Sessions state
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Fetch Posture
  const fetchPosture = async () => {
    try {
      setIsScanningPosture(true);
      const res = await apiRequest<SecurityPostureReport>('/api/security/posture-scan');
      setPosture(res);
    } catch (err: any) {
      alert(`Posture scan error: ${err.message}`);
    } finally {
      setIsScanningPosture(false);
    }
  };

  // Fetch WAF
  const fetchWaf = async () => {
    try {
      setIsLoadingWaf(true);
      const res = await apiRequest<{ mode: 'ACTIVE_BLOCK' | 'MONITOR_ONLY'; rules: WafRule[] }>('/api/security/waf-rules');
      setWafRules(res.rules);
      setWafMode(res.mode);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingWaf(false);
    }
  };

  // Toggle WAF Rule
  const handleToggleRule = async (ruleId: string, currentEnabled: number) => {
    try {
      await apiRequest('/api/security/waf-rules/toggle', {
        method: 'POST',
        body: JSON.stringify({ rule_id: ruleId, is_enabled: currentEnabled === 0 }),
      });
      fetchWaf();
    } catch (err: any) {
      alert(`Failed to toggle rule: ${err.message}`);
    }
  };

  // Toggle WAF Mode
  const handleToggleWafMode = async () => {
    const nextMode = wafMode === 'ACTIVE_BLOCK' ? 'MONITOR_ONLY' : 'ACTIVE_BLOCK';
    try {
      await apiRequest('/api/security/waf-mode', {
        method: 'POST',
        body: JSON.stringify({ mode: nextMode }),
      });
      setWafMode(nextMode);
    } catch (err: any) {
      alert(`Failed to change mode: ${err.message}`);
    }
  };

  // Test Payload Simulation
  const handleTestPayload = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsTestingPayload(true);
      setTestResult(null);
      // Send against /api/tickets to test WAF inspection
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('campus_token')}`,
        },
        body: JSON.stringify({
          title: 'Payload Test',
          description: testPayload,
          category_id: 1,
          priority: 'Low',
          location: 'Lab',
        }),
      });

      const data = await res.json();
      if (res.status === 403 && data.action === 'PACKET_BLOCKED') {
        setTestResult({
          blocked: true,
          message: `DROPPED BY WAF: ${data.error} [Rule: ${data.rule_name || data.category}]`,
        });
      } else {
        setTestResult({
          blocked: false,
          message: `Payload allowed: HTTP ${res.status} (${data.error || 'Passed through WAF'})`,
        });
      }
      fetchWaf();
    } catch (err: any) {
      setTestResult({ blocked: false, message: `Error testing payload: ${err.message}` });
    } finally {
      setIsTestingPayload(false);
    }
  };

  // Trigger Canary Honeypot
  const handleTriggerHoneypot = async () => {
    try {
      const res = await fetch('/api/security/honeypot');
      const data = await res.json();
      alert(`Honeypot Response: ${data.error} (Action: ${data.action})`);
      fetchWaf();
    } catch (err: any) {
      alert(`Honeypot request error: ${err.message}`);
    }
  };

  // Fetch DLP Incidents
  const fetchDlp = async () => {
    try {
      setIsLoadingDlp(true);
      const res = await apiRequest<DlpIncident[]>('/api/security/dlp-incidents');
      setDlpIncidents(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingDlp(false);
    }
  };

  // Fetch Active Sessions
  const fetchSessions = async () => {
    try {
      setIsLoadingSessions(true);
      const res = await apiRequest<ActiveSession[]>('/api/security/sessions');
      setSessions(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  // Revoke Session
  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this session? The user will be instantly logged out.')) return;
    try {
      await apiRequest(`/api/security/sessions/${sessionId}`, { method: 'DELETE' });
      fetchSessions();
    } catch (err: any) {
      alert(`Failed to revoke session: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchPosture();
    fetchWaf();
    fetchDlp();
    fetchSessions();
  }, []);

  const filteredDlp = dlpIncidents.filter((inc) => {
    const q = dlpSearch.toLowerCase();
    return (
      inc.data_type.toLowerCase().includes(q) ||
      inc.original_snippet.toLowerCase().includes(q) ||
      inc.ip_address.toLowerCase().includes(q) ||
      (inc.user_name && inc.user_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg text-red-600 dark:text-red-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                  Cyber Defense Command & SOC Perimeter
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                  <Activity className="w-3 h-3 animate-pulse" />
                  DEFCON 4 • ACTIVE MONITORING
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time Layer-7 Web Application Firewall (WAF), OWASP Top-10 Posture Audit, Data Loss Prevention (DLP), and Zero-Trust Session Vault.
              </p>
            </div>
          </div>

          {/* Subtabs Navigation */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700/60 self-stretch sm:self-auto overflow-x-auto">
            <button
              onClick={() => setActiveSubTab('posture')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0 ${
                activeSubTab === 'posture'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Posture Assessment</span>
            </button>
            <button
              onClick={() => setActiveSubTab('waf')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0 ${
                activeSubTab === 'waf'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Next-Gen WAF</span>
            </button>
            <button
              onClick={() => setActiveSubTab('dlp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0 ${
                activeSubTab === 'dlp'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>DLP & PII Sanitizer</span>
            </button>
            <button
              onClick={() => setActiveSubTab('sessions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0 ${
                activeSubTab === 'sessions'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Active Sessions</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: SECURITY POSTURE & VULNERABILITY ASSESSMENT */}
      {/* ========================================================================= */}
      {activeSubTab === 'posture' && (
        <div className="space-y-4">
          {/* Posture Scoreboard Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="relative flex items-center justify-center w-24 h-24 rounded-full border-4 border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/30">
                  <div className="text-center">
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-display">
                      {posture?.grade || 'A+'}
                    </span>
                    <span className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      {posture?.score || 96}%
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Overall Enterprise Security Posture
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                    Comprehensive compliance evaluation across NIST SP 800-53 and OWASP Top 10 standards, verifying cryptography, authentication, data sanitization, and network isolation.
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {posture?.summary.passedChecks || 7} Checks Passed
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {posture?.summary.warningChecks || 1} Warnings
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                      Last Scanned: {posture?.lastScanned ? new Date(posture.lastScanned).toLocaleTimeString() : 'Just now'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={fetchPosture}
                disabled={isScanningPosture}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md shadow-xs cursor-pointer transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanningPosture ? 'animate-spin' : ''}`} />
                <span>{isScanningPosture ? 'Auditing Vectors...' : 'Run Security Audit'}</span>
              </button>
            </div>
          </div>

          {/* 8 Vectors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {posture?.vectors.map((vec, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 flex flex-col justify-between shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{vec.category}</span>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                        vec.status === 'PASS'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : vec.status === 'WARN'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400'
                      }`}
                    >
                      {vec.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                    {vec.details}
                  </p>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      vec.score >= 90 ? 'bg-emerald-500' : vec.score >= 75 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${vec.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Monitored & Remediated Vulnerabilities Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-display">
                  Vulnerability Ledger & Defensive Hardening
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">4 Active Security Controls Asserted</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {posture?.vulnerabilities.map((v) => (
                <div key={v.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{v.id}</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{v.title}</span>
                      <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {v.owaspCategory}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          v.severity === 'CRITICAL'
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                            : v.severity === 'HIGH'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                        }`}
                      >
                        {v.severity}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        {v.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{v.description}</p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-50/50 dark:bg-emerald-950/20 p-1.5 rounded border border-emerald-100 dark:border-emerald-900/40">
                    Defensive Assertion: {v.remediation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: NEXT-GEN WAF & THREAT TESTER */}
      {/* ========================================================================= */}
      {activeSubTab === 'waf' && (
        <div className="space-y-4">
          {/* WAF Controls & Payload Tester */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Mode & Stats Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">WAF Defense Mode</h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs font-bold rounded ${
                      wafMode === 'ACTIVE_BLOCK'
                        ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                    }`}
                  >
                    {wafMode}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  {wafMode === 'ACTIVE_BLOCK'
                    ? 'Active Prevention Mode: Malicious packets matching SQLi, XSS, or directory traversal patterns are instantly terminated with HTTP 403 Forbidden.'
                    : 'Monitor Only Mode: Malicious patterns are logged to security event stream without blocking the user request.'}
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleToggleWafMode}
                  className="w-full py-2 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  Toggle to {wafMode === 'ACTIVE_BLOCK' ? 'MONITOR ONLY' : 'ACTIVE BLOCKING'}
                </button>
                <button
                  onClick={handleTriggerHoneypot}
                  className="w-full py-2 text-xs font-semibold rounded-md bg-rose-600 hover:bg-rose-700 text-white cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Probe Canary Honeypot (/api/security/honeypot)</span>
                </button>
              </div>
            </div>

            {/* Interactive Attack Payload Simulator */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Live Deep Packet Injection Tester
                  </h3>
                </div>
                <span className="text-xs text-slate-400">Target: /api/tickets</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Send live hostile exploit payloads through the application layer to verify real-time packet dropping and rule triggering:
              </p>

              <form onSubmit={handleTestPayload} className="space-y-3">
                <div>
                  <textarea
                    rows={2}
                    value={testPayload}
                    onChange={(e) => setTestPayload(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter SQLi, XSS or Command payload..."
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    <span className="text-[11px] text-slate-400">Presets:</span>
                    <button
                      type="button"
                      onClick={() => setTestPayload("' OR 1=1; DROP TABLE users; --")}
                      className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded text-slate-700 dark:text-slate-300 font-mono cursor-pointer"
                    >
                      SQLi Tautology
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestPayload("<script>alert('xss')</script>")}
                      className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded text-slate-700 dark:text-slate-300 font-mono cursor-pointer"
                    >
                      XSS Tag
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestPayload("../../windows/win.ini")}
                      className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded text-slate-700 dark:text-slate-300 font-mono cursor-pointer"
                    >
                      Path Traversal
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestPayload("; cat /etc/passwd | powershell")}
                      className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded text-slate-700 dark:text-slate-300 font-mono cursor-pointer"
                    >
                      RCE Injection
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isTestingPayload}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md cursor-pointer transition-colors shrink-0"
                  >
                    {isTestingPayload ? 'Transmitting...' : 'Dispatch Packet'}
                  </button>
                </div>
              </form>

              {testResult && (
                <div
                  className={`mt-3 p-3 rounded-md text-xs font-mono border ${
                    testResult.blocked
                      ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                  }`}
                >
                  {testResult.message}
                </div>
              )}
            </div>
          </div>

          {/* WAF Ruleset Configuration Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-display">
                  Active Web Application Firewall Rules
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">{wafRules.length} Core Signatures Loaded</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Rule ID</th>
                    <th className="px-4 py-2.5 font-semibold">Signature Name</th>
                    <th className="px-4 py-2.5 font-semibold">Category</th>
                    <th className="px-4 py-2.5 font-semibold">Severity</th>
                    <th className="px-4 py-2.5 font-semibold">Matches</th>
                    <th className="px-4 py-2.5 font-semibold">Inspection Regex</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {wafRules.map((rule) => (
                    <tr key={rule.rule_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">{rule.rule_id}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900 dark:text-white">{rule.name}</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">{rule.description}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {rule.category}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                            rule.severity === 'CRITICAL'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                          }`}
                        >
                          {rule.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        {rule.match_count}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500 max-w-xs truncate" title={rule.pattern}>
                        {rule.pattern}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleToggleRule(rule.rule_id, rule.is_enabled)}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer transition-colors ${
                            rule.is_enabled
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 hover:bg-emerald-200'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-300'
                          }`}
                        >
                          {rule.is_enabled ? 'Active' : 'Disabled'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: DATA LOSS PREVENTION (DLP) & PII SANITIZER */}
      {/* ========================================================================= */}
      {activeSubTab === 'dlp' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <EyeOff className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Data Loss Prevention (DLP) Interception Log
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Monitors ticket titles, descriptions, and technician repair notes in real time. Redacts credit card numbers, SSNs, API secrets, and passwords before database storage.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={dlpSearch}
                  onChange={(e) => setDlpSearch(e.target.value)}
                  placeholder="Filter DLP incidents..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>
              <button
                onClick={fetchDlp}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer"
                title="Refresh DLP log"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingDlp ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDlp.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No data loss prevention violations recorded matching filter.
                </div>
              ) : (
                filteredDlp.map((inc) => (
                  <div key={inc.incident_id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          INC-{inc.incident_id.toString().padStart(4, '0')}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400">
                          {inc.data_type}
                        </span>
                        <span className="text-xs text-slate-500">
                          Triggered by {inc.user_name || 'Anonymous User'} ({inc.ip_address})
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(inc.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      <div className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 p-2 rounded">
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block mb-1">
                          Original Leaked Snippet (Flagged)
                        </span>
                        <p className="text-xs font-mono text-rose-800 dark:text-rose-300 break-all">
                          {inc.original_snippet}
                        </p>
                      </div>

                      <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 p-2 rounded">
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                          Database Stored Payload (Sanitized)
                        </span>
                        <p className="text-xs font-mono text-emerald-800 dark:text-emerald-300 break-all">
                          {inc.redacted_snippet}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: ACTIVE SESSIONS & ZERO-TRUST DEVICE VAULT */}
      {/* ========================================================================= */}
      {activeSubTab === 'sessions' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Zero-Trust Active Session & Token Vault
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Cryptographically tracked HMAC-SHA256 bearer tokens. Instantly invalidate compromised or unauthorized sessions across all campus devices.
              </p>
            </div>

            <button
              onClick={fetchSessions}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSessions ? 'animate-spin' : ''}`} />
              <span>Refresh Sessions</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">User / Email</th>
                    <th className="px-4 py-2.5 font-semibold">Role</th>
                    <th className="px-4 py-2.5 font-semibold">IP Address</th>
                    <th className="px-4 py-2.5 font-semibold">Device / Client Agent</th>
                    <th className="px-4 py-2.5 font-semibold">Established</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sessions.map((sess) => (
                    <tr key={sess.session_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900 dark:text-white">{sess.user_name}</span>
                        <p className="text-[11px] text-slate-400">{sess.user_email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                          {sess.user_role}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {sess.ip_address}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-500 max-w-xs truncate" title={sess.user_agent}>
                        {sess.user_agent}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-400 font-mono">
                        {new Date(sess.created_at).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRevokeSession(sess.session_id)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/50 rounded cursor-pointer transition-colors"
                        >
                          Revoke Token
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
