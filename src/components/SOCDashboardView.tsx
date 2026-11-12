import React, { useState, useEffect } from 'react';
import { SocData, SecurityEvent, BannedIp } from '../types';
import { apiRequest } from '../lib/api';
import {
  ShieldAlert,
  Flame,
  Globe,
  Radio,
  Ban,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Crosshair,
  Terminal,
  ShieldCheck,
  Plus,
} from 'lucide-react';

export const SOCDashboardView: React.FC = () => {
  const [data, setData] = useState<SocData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');

  // Manual Ban Modal
  const [showBanModal, setShowBanModal] = useState(false);
  const [banIpInput, setBanIpInput] = useState('');
  const [banReasonInput, setBanReasonInput] = useState('');
  const [isBanning, setIsBanning] = useState(false);

  // Attack simulation
  const [isSimulating, setIsSimulating] = useState(false);
  const [simNotification, setSimNotification] = useState<string | null>(null);

  const fetchSocData = async () => {
    try {
      setIsLoading(true);
      const res = await apiRequest<SocData>('/api/security/soc');
      setData(res);
    } catch (err: any) {
      alert(`Failed to load SOC threat intelligence: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSocData();
  }, []);

  const handleSimulateAttack = async () => {
    try {
      setIsSimulating(true);
      setSimNotification(null);
      const res = await apiRequest('/api/security/simulate-attack', { method: 'POST' });
      setSimNotification(res.message);
      await fetchSocData();
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleManualBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banIpInput.trim()) return;

    try {
      setIsBanning(true);
      await apiRequest('/api/security/ip/ban', {
        method: 'POST',
        body: JSON.stringify({ ip_address: banIpInput.trim(), reason: banReasonInput.trim() }),
      });
      setShowBanModal(false);
      setBanIpInput('');
      setBanReasonInput('');
      await fetchSocData();
    } catch (err: any) {
      alert(`Failed to ban IP: ${err.message}`);
    } finally {
      setIsBanning(false);
    }
  };

  const handleUnban = async (ip: string) => {
    try {
      await apiRequest('/api/security/ip/unban', {
        method: 'POST',
        body: JSON.stringify({ ip_address: ip }),
      });
      await fetchSocData();
    } catch (err: any) {
      alert(`Failed to unban IP: ${err.message}`);
    }
  };

  const filteredEvents = data
    ? data.events.filter((ev) => {
        if (severityFilter !== 'all' && ev.severity !== severityFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            ev.ip_address.includes(q) ||
            ev.event_type.toLowerCase().includes(q) ||
            ev.details.toLowerCase().includes(q)
          );
        }
        return true;
      })
    : [];

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* SOC Command Strip */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold font-display tracking-tight flex items-center gap-2">
                  <span>Security Operations Center (SOC) & Perimeter Firewall</span>
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-400 font-mono border border-emerald-500/30">
                    ACTIVE MONITORING
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live intrusion detection system (IDS), automated brute-force blacklisting, and stateful perimeter firewall controls.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSimulateAttack}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-200 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/80 rounded-md transition-colors cursor-pointer shadow-xs"
              title="Test intrusion detection by simulating a live credential spray attack"
            >
              <Crosshair className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Simulating Attack...' : 'Simulate Cyber Attack'}</span>
            </button>

            <button
              onClick={() => setShowBanModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Enact IP Ban</span>
            </button>

            <button
              onClick={fetchSocData}
              title="Refresh Threat Intelligence"
              className="p-2 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Attack Notification Banner */}
        {simNotification && (
          <div className="mt-4 p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-xs text-rose-200 flex items-start gap-2.5 animate-in fade-in">
            <Flame className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Automated Defense Response Triggered:</span>{' '}
              {simNotification}
            </div>
          </div>
        )}
      </div>

      {/* Threat KPI Cards Strip */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Security Events
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
              {data.summary.total_events}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
              Critical Alerts
            </span>
            <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
              {data.summary.critical_alerts}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
              Brute-Force Incidents
            </span>
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
              {data.summary.brute_force_incidents}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
              Perimeter Firewall Bans
            </span>
            <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1 tabular-nums">
              {data.summary.active_banned_ips}
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Live Events Stream + Active Firewall Bans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Live Security Events Stream (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Live Intrusion Telemetry Stream
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Filter telemetry..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-white"
              />
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-white cursor-pointer"
              >
                <option value="all">All Severities</option>
                <option value="CRITICAL">Critical Only</option>
                <option value="HIGH">High Only</option>
                <option value="MEDIUM">Medium Only</option>
                <option value="LOW">Low Only</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[460px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {filteredEvents.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No security alerts match active filters.
              </div>
            ) : (
              filteredEvents.map((ev) => (
                <div key={ev.event_id} className="p-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold border font-mono ${getSeverityStyle(
                          ev.severity
                        )}`}
                      >
                        {ev.severity}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white font-mono">
                        {ev.event_type}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        IP: {ev.ip_address}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 tabular-nums">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-mono text-[11px]">
                    {ev.details}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Active Firewall IP Blacklist (1 col) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs flex flex-col">
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Firewall IP Blacklist
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {data?.banned_ips.length || 0} Blocked
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[460px] divide-y divide-slate-100 dark:divide-slate-800 p-2">
            {data?.banned_ips.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No active IP bans enacted.
              </div>
            ) : (
              data?.banned_ips.map((b) => (
                <div key={b.ip_address} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs mb-1.5 border border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      {b.ip_address}
                    </span>
                    <button
                      onClick={() => handleUnban(b.ip_address)}
                      className="flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold cursor-pointer"
                      title="Remove firewall block"
                    >
                      <Unlock className="w-3 h-3" />
                      <span>Unban</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                    {b.reason}
                  </p>
                  <div className="mt-1.5 text-[10px] text-slate-400">
                    Enacted {new Date(b.banned_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Manual Ban Modal */}
      {showBanModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-500" />
              <span>Enact Manual IP Firewall Block</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Blacklisted IP addresses are dropped immediately by the HTTP security perimeter middleware before hitting application logic.
            </p>

            <form onSubmit={handleManualBan} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  IPv4 / IPv6 Address
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 198.51.100.99"
                  value={banIpInput}
                  onChange={(e) => setBanIpInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Security Reason / Incident Ticket
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hostile credential spray against admin accounts"
                  value={banReasonInput}
                  onChange={(e) => setBanReasonInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBanModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBanning || !banIpInput.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-md shadow-xs cursor-pointer"
                >
                  {isBanning ? 'Enacting Rule...' : 'Confirm Blacklist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
