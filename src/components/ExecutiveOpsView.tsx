import React, { useState, useEffect } from 'react';
import {
  PredictiveMaintenanceData,
  PreventiveAsset,
  SlaMatrixData,
  SlaTicket,
  CampusFacility,
  EmergencyBroadcast,
  Role,
} from '../types';
import { apiRequest } from '../lib/api';
import {
  TrendingUp,
  Clock,
  Building2,
  Megaphone,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  Play,
  ArrowUpRight,
  Flame,
  Zap,
  Activity,
  Layers,
  Thermometer,
  Cpu,
  Radio,
  Sliders,
  ShieldAlert,
} from 'lucide-react';

interface ExecutiveOpsViewProps {
  currentRole: Role;
  onRefreshTickets?: () => void;
  onViewTicket?: (ticketId: number) => void;
}

export const ExecutiveOpsView: React.FC<ExecutiveOpsViewProps> = ({
  currentRole,
  onRefreshTickets,
  onViewTicket,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'predictive' | 'sla' | 'facilities' | 'emergency'>('predictive');

  // 1. Predictive State
  const [predictive, setPredictive] = useState<PredictiveMaintenanceData | null>(null);
  const [isLoadingPredictive, setIsLoadingPredictive] = useState(false);
  const [isDispatchingOrder, setIsDispatchingOrder] = useState<string | null>(null);

  // 2. SLA Matrix State
  const [slaData, setSlaData] = useState<SlaMatrixData | null>(null);
  const [isLoadingSla, setIsLoadingSla] = useState(false);
  const [isEscalatingId, setIsEscalatingId] = useState<number | null>(null);

  // 3. Campus Facilities State
  const [facilities, setFacilities] = useState<CampusFacility[]>([]);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(false);

  // 4. Emergency Broadcast State
  const [broadcast, setBroadcast] = useState<EmergencyBroadcast | null>(null);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSeverity, setBroadcastSeverity] = useState<'INFO' | 'WARNING' | 'CRITICAL' | 'LOCKDOWN'>('WARNING');
  const [broadcastFacility, setBroadcastFacility] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Fetch Predictive Data
  const fetchPredictive = async () => {
    try {
      setIsPredictiveLoading(true);
      const res = await apiRequest<PredictiveMaintenanceData>('/api/executive/predictive-maintenance');
      setPredictive(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsPredictiveLoading(false);
    }
  };

  const setIsPredictiveLoading = (loading: boolean) => setIsLoadingPredictive(loading);

  // Fetch SLA Data
  const fetchSla = async () => {
    try {
      setIsLoadingSla(true);
      const res = await apiRequest<SlaMatrixData>('/api/executive/sla-matrix');
      setSlaData(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingSla(false);
    }
  };

  // Fetch Facilities Data
  const fetchFacilities = async () => {
    try {
      setIsLoadingFacilities(true);
      const res = await apiRequest<CampusFacility[]>('/api/executive/facilities');
      setFacilities(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingFacilities(false);
    }
  };

  // Fetch Emergency Broadcast
  const fetchBroadcast = async () => {
    try {
      const res = await apiRequest<{ active_broadcast: EmergencyBroadcast | null }>('/api/executive/emergency-broadcast');
      setBroadcast(res.active_broadcast);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPredictive();
    fetchSla();
    fetchFacilities();
    fetchBroadcast();

    const interval = setInterval(() => {
      fetchSla();
    }, 30000); // Live countdown refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Dispatch Proactive Preventive Work Order
  const handleDispatchPreventive = async (assetId: string) => {
    try {
      setIsDispatchingOrder(assetId);
      const res = await apiRequest<{ success: boolean; message: string; ticket_id: number }>('/api/executive/preventive-order', {
        method: 'POST',
        body: JSON.stringify({ asset_id: assetId }),
      });
      alert(res.message);
      fetchPredictive();
      if (onRefreshTickets) onRefreshTickets();
    } catch (err: any) {
      alert(`Failed to dispatch order: ${err.message}`);
    } finally {
      setIsDispatchingOrder(null);
    }
  };

  // Escalate Ticket to Executive Leadership
  const handleEscalateTicket = async (ticketId: number) => {
    try {
      setIsEscalatingId(ticketId);
      const res = await apiRequest<{ success: boolean; message: string }>(`/api/executive/escalate/${ticketId}`, {
        method: 'POST',
      });
      alert(res.message);
      fetchSla();
      if (onRefreshTickets) onRefreshTickets();
    } catch (err: any) {
      alert(`Failed to escalate: ${err.message}`);
    } finally {
      setIsEscalatingId(null);
    }
  };

  // Broadcast Emergency
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) return;

    try {
      setIsBroadcasting(true);
      await apiRequest('/api/executive/emergency-broadcast', {
        method: 'POST',
        body: JSON.stringify({
          title: broadcastTitle,
          message: broadcastMessage,
          severity: broadcastSeverity,
          facility_code: broadcastFacility || null,
        }),
      });
      setBroadcastTitle('');
      setBroadcastMessage('');
      fetchBroadcast();
      alert('Emergency Alert broadcast to all campus terminals.');
    } catch (err: any) {
      alert(`Broadcast failed: ${err.message}`);
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Clear Emergency Broadcast
  const handleClearBroadcast = async () => {
    if (!confirm('Are you sure you want to resolve and clear the active emergency alert?')) return;
    try {
      await apiRequest('/api/executive/emergency-broadcast/clear', { method: 'POST' });
      setBroadcast(null);
      alert('Campus emergency status resolved.');
    } catch (err: any) {
      alert(`Failed to clear: ${err.message}`);
    }
  };

  const formatMinutes = (totalMins: number) => {
    if (totalMins <= 0) return '0m';
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="space-y-4">
      {/* Executive Command Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                  Executive Operations & Asset Intelligence
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-300 dark:border-blue-800">
                  Campus Facilities Division
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Predictive AI equipment maintenance, live SLA breach timers, campus digital twin telemetry, and emergency incident broadcasting.
              </p>
            </div>
          </div>

          {/* Subtab Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700/60 self-stretch sm:self-auto overflow-x-auto">
            <button
              onClick={() => setActiveSubTab('predictive')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0 ${
                activeSubTab === 'predictive'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Predictive Maintenance</span>
            </button>
            <button
              onClick={() => setActiveSubTab('sla')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0 ${
                activeSubTab === 'sla'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>SLA Breach Matrix</span>
            </button>
            <button
              onClick={() => setActiveSubTab('facilities')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0 ${
                activeSubTab === 'facilities'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Digital Twin Map</span>
            </button>
            <button
              onClick={() => setActiveSubTab('emergency')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0 ${
                activeSubTab === 'emergency'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Incident Command</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: PREDICTIVE MAINTENANCE & ASSET DEGRADATION */}
      {/* ========================================================================= */}
      {activeSubTab === 'predictive' && (
        <div className="space-y-4">
          {/* Key KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Critical Equipment Monitored</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {predictive?.summary.total_assets || 5}
                </span>
                <span className="text-xs text-emerald-600">Active Sensors Online</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">High Breakdown Risk (&gt;70%)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {predictive?.summary.high_risk_assets || 2}
                </span>
                <span className="text-xs text-rose-500 font-semibold">Immediate Action Urged</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Mean Time Between Failures</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {predictive?.summary.avg_mtbf_days || 163}
                </span>
                <span className="text-xs text-slate-400">Days MTBF Average</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Campus Asset Health Index</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {predictive?.summary.avg_health_index || 69}/100
                </span>
                <span className="text-xs text-blue-500 font-semibold">Target: &gt;80</span>
              </div>
            </div>
          </div>

          {/* Predictive Assets Ledger */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-display">
                  Telemetry Risk Engine & Proactive Maintenance Dispatch
                </h4>
              </div>
              <button
                onClick={fetchPredictive}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                title="Refresh Asset Models"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPredictive ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {predictive?.assets.map((asset) => (
                <div key={asset.asset_id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          {asset.asset_id}
                        </span>
                        <h5 className="text-sm font-bold text-slate-900 dark:text-white">{asset.asset_name}</h5>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {asset.category}
                        </span>
                        <span className="text-xs text-slate-400">
                          • {asset.facility_name} ({asset.facility_location})
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-slate-900 dark:text-white">Prescribed Action:</span>{' '}
                        {asset.recommended_action}
                      </p>
                      <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                        <span>Last Serviced: {asset.last_serviced_at}</span>
                        <span>MTBF: {asset.mtbf_days} days</span>
                        <span>MTTR: {asset.mttr_hours} hrs</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 shrink-0 self-end lg:self-center">
                      {/* Risk & Health Bars */}
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-xs text-slate-400">Failure Risk (30d):</span>
                          <span
                            className={`font-bold font-mono text-xs ${
                              asset.failure_risk_pct >= 70
                                ? 'text-rose-600 dark:text-rose-400'
                                : asset.failure_risk_pct >= 40
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {asset.failure_risk_pct}%
                          </span>
                        </div>
                        <div className="w-32 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full ${
                              asset.failure_risk_pct >= 70
                                ? 'bg-rose-500'
                                : asset.failure_risk_pct >= 40
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${asset.failure_risk_pct}%` }}
                          />
                        </div>
                      </div>

                      {/* 1-Click Order Button */}
                      {['manager', 'admin'].includes(currentRole) && (
                        <button
                          onClick={() => handleDispatchPreventive(asset.asset_id)}
                          disabled={isDispatchingOrder === asset.asset_id}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md shadow-xs cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>
                            {isDispatchingOrder === asset.asset_id ? 'Dispatching...' : 'Generate Work Order'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: REAL-TIME SLA BREACH & ESCALATION MATRIX */}
      {/* ========================================================================= */}
      {activeSubTab === 'sla' && (
        <div className="space-y-4">
          {/* SLA Performance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">SLA Compliance Rate</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {slaData?.summary.sla_compliance_rate || 90}%
                </span>
                <span className="text-xs text-emerald-600 font-semibold">Campus Standard: &gt;85%</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active Work Orders Monitored</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {slaData?.summary.total_active || 0}
                </span>
                <span className="text-xs text-slate-400">Open / Assigned / Progress</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Approaching Breach (&lt;25% Left)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {slaData?.summary.approaching_count || 0}
                </span>
                <span className="text-xs text-amber-500 font-semibold">Priority Escalation Watch</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Breached SLA Threshold</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {slaData?.summary.breached_count || 0}
                </span>
                <span className="text-xs text-rose-500 font-semibold">Contractual Penalty Risk</span>
              </div>
            </div>
          </div>

          {/* Active SLA Countdown Board */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-display">
                  Live Ticket SLA Timers & Escalation Pipeline
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">
                Critical: 2h | High: 8h | Medium: 24h | Low: 72h
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Ticket ID</th>
                    <th className="px-4 py-2.5 font-semibold">Title & Location</th>
                    <th className="px-4 py-2.5 font-semibold">Priority</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold">Assigned Tech</th>
                    <th className="px-4 py-2.5 font-semibold">SLA Target</th>
                    <th className="px-4 py-2.5 font-semibold">Time Remaining</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Escalation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {slaData?.tickets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No active work orders pending SLA resolution.
                      </td>
                    </tr>
                  ) : (
                    slaData?.tickets.map((t) => (
                      <tr key={t.ticket_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                          #{t.ticket_id}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => onViewTicket && onViewTicket(t.ticket_id)}
                            className="font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left cursor-pointer"
                          >
                            {t.title}
                          </button>
                          <p className="text-[11px] text-slate-400 mt-0.5">{t.location}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                              t.priority === 'Critical'
                                ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400'
                                : t.priority === 'High'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
                            }`}
                          >
                            {t.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium">{t.status}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {t.assignee_name || <span className="text-slate-400 italic">Unassigned</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500">
                          {formatMinutes(t.sla_limit_minutes)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-mono font-bold text-xs ${
                                t.health === 'BREACHED'
                                  ? 'text-rose-600 dark:text-rose-400 animate-pulse'
                                  : t.health === 'APPROACHING_BREACH'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {t.health === 'BREACHED'
                                ? `BREACHED (+${formatMinutes(t.elapsed_minutes - t.sla_limit_minutes)})`
                                : formatMinutes(t.remaining_minutes)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {['manager', 'admin'].includes(currentRole) ? (
                            <button
                              onClick={() => handleEscalateTicket(t.ticket_id)}
                              disabled={isEscalatingId === t.ticket_id || t.priority === 'Critical'}
                              className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/50 rounded cursor-pointer transition-colors disabled:opacity-40"
                              title="Escalate to Executive Leadership"
                            >
                              {t.priority === 'Critical' ? 'Escalated' : 'Escalate'}
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: CAMPUS FACILITY DIGITAL TWIN & TELEMETRY */}
      {/* ========================================================================= */}
      {activeSubTab === 'facilities' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {facilities.map((fac) => (
              <div
                key={fac.facility_code}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-slate-500">{fac.facility_code}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        fac.status === 'OPTIMAL'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : fac.status === 'WARNING'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400'
                      }`}
                    >
                      {fac.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{fac.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{fac.location}</p>
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-1">{fac.type}</p>

                  <div className="grid grid-cols-3 gap-2 my-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
                    <div>
                      <span className="block text-[10px] text-slate-400">Health</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                        {fac.health_score}%
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">Power Load</span>
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono">
                        {fac.power_kw} kW
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">Temperature</span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">
                        {fac.temp_c}°C
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Protected Campus Assets:
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      {fac.critical_assets}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Uptime: {fac.uptime_pct}%</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {fac.active_incidents} Active Work Orders
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: CAMPUS EMERGENCY INCIDENT COMMAND & LOCKDOWN */}
      {/* ========================================================================= */}
      {activeSubTab === 'emergency' && (
        <div className="space-y-4">
          {/* Active Emergency Alert Banner Card */}
          {broadcast ? (
            <div
              className={`p-5 rounded-lg border shadow-sm ${
                broadcast.severity === 'LOCKDOWN' || broadcast.severity === 'CRITICAL'
                  ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-900 text-red-900 dark:text-red-100'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900 text-amber-900 dark:text-amber-100'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-black rounded bg-red-600 text-white uppercase tracking-wider">
                        {broadcast.severity} ALERT ACTIVE
                      </span>
                      <h3 className="text-base font-bold">{broadcast.title}</h3>
                    </div>
                    <p className="text-xs mt-1.5 opacity-90">{broadcast.message}</p>
                    <div className="flex items-center gap-4 text-[11px] mt-2 opacity-75">
                      <span>Broadcast by: {broadcast.broadcaster_name}</span>
                      <span>Target: {broadcast.facility_name || 'All Campus Grounds'}</span>
                      <span>Enacted: {new Date(broadcast.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                {['manager', 'admin'].includes(currentRole) && (
                  <button
                    onClick={handleClearBroadcast}
                    className="px-4 py-2 text-xs font-bold bg-white dark:bg-slate-900 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800 hover:bg-red-100 rounded-md cursor-pointer transition-colors shrink-0"
                  >
                    Resolve & Clear Broadcast
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Campus Perimeter Status: ALL CLEAR
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  No active facility emergency broadcasts or building lockdowns in effect.
                </p>
              </div>
            </div>
          )}

          {/* Incident Broadcast Creator */}
          {['manager', 'admin'].includes(currentRole) && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <Megaphone className="w-5 h-5 text-red-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                  Enact Campus-Wide Emergency Broadcast
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Transmits high-priority alerts to every connected university session and logs an immutable record in the SHA-256 security audit ledger.
              </p>

              <form onSubmit={handleSendBroadcast} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Alert Headline
                    </label>
                    <input
                      type="text"
                      required
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      placeholder="e.g. Hazardous Materials Containment in Science Center"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Alert Level
                    </label>
                    <select
                      value={broadcastSeverity}
                      onChange={(e) => setBroadcastSeverity(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-hidden"
                    >
                      <option value="INFO">Informational Advisory</option>
                      <option value="WARNING">Operational Warning</option>
                      <option value="CRITICAL">Critical Incident</option>
                      <option value="LOCKDOWN">FACILITY LOCKDOWN</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Emergency Directive & Instructions
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Specify safety precautions, muster points, or evacuation steps..."
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Affected Facility Complex
                    </label>
                    <select
                      value={broadcastFacility}
                      onChange={(e) => setBroadcastFacility(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-hidden"
                    >
                      <option value="">All Campus Facilities (Ground-wide)</option>
                      {facilities.map((fac) => (
                        <option key={fac.facility_code} value={fac.facility_code}>
                          {fac.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isBroadcasting}
                    className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-md shadow-xs cursor-pointer transition-colors"
                  >
                    <Megaphone className="w-4 h-4" />
                    <span>{isBroadcasting ? 'Broadcasting Alert...' : 'Transmit Emergency Alert'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
