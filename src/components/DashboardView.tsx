import React, { useEffect, useState } from 'react';
import { DashboardData, Role } from '../types';
import { apiRequest } from '../lib/api';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderSync,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface DashboardViewProps {
  currentRole: Role;
  isDarkMode: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ currentRole, isDarkMode }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiRequest<DashboardData>('/api/dashboard');
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [currentRole]);

  if (isLoading) {
    return (
      <div className="p-16 text-center text-xs text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
        Loading facility metrics & Chart.js visualizations...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-rose-500 text-xs">
        {error || 'Unable to display dashboard metrics.'}
      </div>
    );
  }

  const textColor = isDarkMode ? '#94A3B8' : '#64748B';
  const gridColor = isDarkMode ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.8)';

  // Chart 1: Status (Doughnut)
  const statusLabels = data.by_status.map((s) => s.status);
  const statusCounts = data.by_status.map((s) => s.count);
  const statusColors = statusLabels.map((s) => {
    switch (s) {
      case 'Open':
        return '#F59E0B'; // Amber
      case 'Assigned':
        return '#3B82F6'; // Blue
      case 'In Progress':
        return '#8B5CF6'; // Purple
      case 'Resolved':
        return '#10B981'; // Emerald
      case 'Closed':
        return '#64748B'; // Slate
      default:
        return '#94A3B8';
    }
  });

  const statusChartData = {
    labels: statusLabels,
    datasets: [
      {
        data: statusCounts,
        backgroundColor: statusColors,
        borderWidth: 2,
        borderColor: isDarkMode ? '#0F172A' : '#FFFFFF',
      },
    ],
  };

  // Chart 2: Priority (Bar)
  const priorityOrder = ['Low', 'Medium', 'High', 'Critical'];
  const priorityCountsMap: Record<string, number> = {};
  data.by_priority.forEach((p) => {
    priorityCountsMap[p.priority] = p.count;
  });

  const priorityChartData = {
    labels: priorityOrder,
    datasets: [
      {
        label: 'Tickets',
        data: priorityOrder.map((p) => priorityCountsMap[p] || 0),
        backgroundColor: ['#94A3B8', '#3B82F6', '#F59E0B', '#F43F5E'],
        borderRadius: 4,
      },
    ],
  };

  // Chart 3: Category (Bar)
  const categoryChartData = {
    labels: data.by_category.map((c) => c.name),
    datasets: [
      {
        label: 'Work Orders',
        data: data.by_category.map((c) => c.count),
        backgroundColor: '#2563EB',
        borderRadius: 4,
      },
    ],
  };

  // Chart 4: Resolution Times per Technician
  const techNames = data.resolution_time.map((r) => r.technician_name);
  const techHours = data.resolution_time.map((r) => Number(r.avg_resolution_hours?.toFixed(1) || 0));

  const techChartData = {
    labels: techNames.length > 0 ? techNames : ['No resolved data'],
    datasets: [
      {
        label: 'Avg Hours to Resolution',
        data: techHours.length > 0 ? techHours : [0],
        backgroundColor: '#059669',
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: textColor, font: { size: 11 } },
      },
    },
    scales: {
      x: {
        ticks: { color: textColor, font: { size: 10 } },
        grid: { color: gridColor },
      },
      y: {
        ticks: { color: textColor, font: { size: 10 } },
        grid: { color: gridColor },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Scope Banner if Technician */}
      {data.is_personal_scope && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 shrink-0 text-blue-600" />
            <span>
              <strong>Personal Technician View:</strong> Metrics reflect work orders assigned directly to your account.
            </span>
          </div>
          <button
            onClick={fetchDashboard}
            className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Refresh Data
          </button>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Total Work Orders
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
            {data.summary.total_tickets}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-xs">
          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
            Awaiting Assignment
          </span>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
            {data.summary.open_tickets}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-xs">
          <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
            Active in Progress
          </span>
          <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1 tabular-nums">
            {data.summary.in_progress_tickets}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-xs">
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            Resolved / Repaired
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {data.summary.resolved_tickets}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-xs">
          <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
            Critical Active
          </span>
          <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
            {data.summary.critical_active}
          </div>
        </div>
      </div>

      {/* 4 Interactive Chart.js Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Status Doughnut */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs">
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-3">
            Tickets by Status (Chart.js Doughnut)
          </h3>
          <div className="h-64 flex items-center justify-center">
            <Doughnut
              data={statusChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: textColor, font: { size: 11 } },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Chart 2: Priority Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs">
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-3">
            Tickets by Priority Level (Chart.js Bar)
          </h3>
          <div className="h-64">
            <Bar data={priorityChartData} options={chartOptions} />
          </div>
        </div>

        {/* Chart 3: Category Distribution */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs">
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-3">
            Tickets by Facility Category (Chart.js Bar)
          </h3>
          <div className="h-64">
            <Bar data={categoryChartData} options={chartOptions} />
          </div>
        </div>

        {/* Chart 4: Resolution Times */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs">
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-3">
            Average Resolution Time per Technician (Hours)
          </h3>
          <div className="h-64">
            <Bar data={techChartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};
