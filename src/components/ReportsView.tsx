import React, { useState, useEffect } from 'react';
import { Category } from '../types';
import { apiRequest } from '../lib/api';
import { exportTicketsToPdf, exportTicketsToExcel, ReportTicketRow } from '../lib/reports';
import {
  FileSpreadsheet,
  FileDown,
  FileText,
  Calendar,
  Filter,
  CheckCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface ReportsViewProps {
  categories: Category[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ categories }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');

  const [rows, setRows] = useState<ReportTicketRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      if (categoryId !== 'all') params.set('category_id', categoryId);
      if (status !== 'all') params.set('status', status);
      if (priority !== 'all') params.set('priority', priority);

      const data = await apiRequest<ReportTicketRow[]>(`/api/reports/data?${params.toString()}`);
      setRows(data);
    } catch (err: any) {
      alert(`Failed to query report data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [categoryId, status, priority]);

  const handleExportPdf = () => {
    const selectedCat = categories.find((c) => String(c.category_id) === categoryId)?.name;
    exportTicketsToPdf(rows, {
      startDate,
      endDate,
      categoryName: selectedCat,
      statusName: status !== 'all' ? status : undefined,
    });
  };

  const handleExportExcel = () => {
    exportTicketsToExcel(rows);
  };

  const resolvedCount = rows.filter((r) => r.status === 'Resolved' || r.status === 'Closed').length;
  const avgResolutionTime =
    resolvedCount > 0
      ? (rows.reduce((sum, r) => sum + (Number(r.duration_hours) || 0), 0) / resolvedCount).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-4">
      {/* Configuration & Filter Studio */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                Maintenance Audit & Operations Reports
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Filter campus equipment service records and generate professional PDF work orders or Excel spreadsheets.
            </p>
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              disabled={rows.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-md shadow-xs cursor-pointer transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export PDF Report</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={rows.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-md shadow-xs cursor-pointer transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Filters Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Apply Filter
            </label>
            <button
              onClick={fetchReportData}
              className="w-full py-1.5 px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md transition-colors cursor-pointer"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </div>

      {/* Dataset Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <span className="text-[11px] text-slate-400 block uppercase">Matching Records</span>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
            {rows.length}
          </div>
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block uppercase">Resolved / Closed</span>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            {resolvedCount}
          </div>
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <span className="text-[11px] text-blue-600 dark:text-blue-400 block uppercase">Avg Turnaround</span>
          <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 tabular-nums">
            {avgResolutionTime} hrs
          </div>
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <span className="text-[11px] text-amber-600 dark:text-amber-400 block uppercase">Ready for Export</span>
          <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
            PDF & Excel
          </div>
        </div>
      </div>

      {/* Interactive Table Preview */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Export Dataset Preview ({rows.length} Rows)
          </span>
          <span className="text-[11px] text-slate-400">
            Formatted per university operational compliance standard
          </span>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr className="text-slate-500 dark:text-slate-400 font-medium">
                <th className="py-2 px-3 font-mono">ID</th>
                <th className="py-2 px-3 min-w-[200px]">Title</th>
                <th className="py-2 px-3">Category</th>
                <th className="py-2 px-3">Priority</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Location</th>
                <th className="py-2 px-3">Reporter</th>
                <th className="py-2 px-3">Technician</th>
                <th className="py-2 px-3 font-mono">Created</th>
                <th className="py-2 px-3 font-mono">Resolved</th>
                <th className="py-2 px-3 font-mono text-right">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r) => (
                <tr key={r.ticket_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-500 tabular-nums">
                    #{r.ticket_id}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                    {r.title}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{r.category}</td>
                  <td className="py-2.5 px-3">{r.priority}</td>
                  <td className="py-2.5 px-3">{r.status}</td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                    {r.location}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{r.reporter}</td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{r.technician}</td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 tabular-nums">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 tabular-nums">
                    {r.resolved_at !== 'N/A' ? new Date(r.resolved_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-right tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                    {r.duration_hours}h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
