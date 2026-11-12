import React, { useState } from 'react';
import { Ticket, Category, Role } from '../types';
import {
  Search,
  Filter,
  AlertCircle,
  Clock,
  CheckCircle2,
  Lock,
  User as UserIcon,
  MapPin,
  MessageSquare,
  Paperclip,
  Plus,
  RefreshCw,
} from 'lucide-react';

interface TicketListProps {
  tickets: Ticket[];
  categories: Category[];
  currentRole: Role;
  isLoading: boolean;
  onRefresh: () => void;
  onSelectTicket: (ticket: Ticket) => void;
  onOpenCreateModal: () => void;
}

export const TicketList: React.FC<TicketListProps> = ({
  tickets,
  categories,
  currentRole,
  isLoading,
  onRefresh,
  onSelectTicket,
  onOpenCreateModal,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const filteredTickets = tickets.filter((t) => {
    if (selectedCategory !== 'all' && String(t.category_id) !== selectedCategory) return false;
    if (selectedPriority !== 'all' && t.priority !== selectedPriority) return false;
    if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchLoc = t.location.toLowerCase().includes(q);
      const matchId = String(t.ticket_id).includes(q);
      if (!matchTitle && !matchDesc && !matchLoc && !matchId) return false;
    }
    return true;
  });

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900';
      case 'High':
        return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900';
      case 'Medium':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900';
      default:
        return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
      case 'Assigned':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
      case 'In Progress':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300';
      case 'Resolved':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
      case 'Closed':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const hasActiveFilters =
    search !== '' || selectedCategory !== 'all' || selectedPriority !== 'all' || selectedStatus !== 'all';

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedPriority('all');
    setSelectedStatus('all');
  };

  return (
    <div className="space-y-4">
      {/* Top Controls & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ticket ID, equipment title, lab location, keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-2.5 py-2 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:underline cursor-pointer"
              >
                Reset
              </button>
            )}

            <button
              onClick={onRefresh}
              title="Refresh Ticket Feed"
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            {['reporter', 'manager', 'admin'].includes(currentRole) && (
              <button
                onClick={onOpenCreateModal}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Ticket</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* High-Density Data Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              {currentRole === 'technician' ? 'My Assigned Work Orders' : 'Maintenance Tickets'}
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              ({filteredTickets.length} of {tickets.length})
            </span>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Click any row to inspect details, workflow gates, or add comments
          </div>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="py-16 text-center">
            <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">No tickets found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              {hasActiveFilters
                ? 'Try adjusting your search query or removing active category/status filters.'
                : 'No work orders match your current role permissions.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                  <th className="py-2.5 px-3 w-16 font-mono text-center">ID</th>
                  <th className="py-2.5 px-3 min-w-[280px]">Work Order & Location</th>
                  <th className="py-2.5 px-3 w-28">Category</th>
                  <th className="py-2.5 px-3 w-24">Priority</th>
                  <th className="py-2.5 px-3 w-28">Status</th>
                  <th className="py-2.5 px-3 w-40">Assigned Technician</th>
                  <th className="py-2.5 px-3 w-28">Reported</th>
                  <th className="py-2.5 px-3 w-20 text-center">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTickets.map((t) => (
                  <tr
                    key={t.ticket_id}
                    onClick={() => onSelectTicket(t)}
                    className="hover:bg-blue-50/40 dark:hover:bg-slate-800/60 cursor-pointer transition-colors group"
                  >
                    {/* ID */}
                    <td className="py-3 px-3 font-mono font-semibold text-slate-600 dark:text-slate-400 text-center tabular-nums">
                      #{t.ticket_id}
                    </td>

                    {/* Title & Location */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-1">
                        {t.title}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{t.location}</span>
                        <span aria-hidden="true">·</span>
                        <span>By {t.creator_name || 'Staff'}</span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">
                      {t.category_name}
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-md border ${getPriorityStyle(
                          t.priority
                        )}`}
                      >
                        {t.priority}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${getStatusStyle(
                          t.status
                        )}`}
                      >
                        {t.status}
                      </span>
                    </td>

                    {/* Assignee */}
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      {t.assignee_name ? (
                        <div className="flex items-center gap-1.5">
                          <UserIcon className="w-3 h-3 text-slate-400" />
                          <span className="font-medium truncate">{t.assignee_name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400 tabular-nums text-[11px]">
                      {new Date(t.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    {/* Comments & Attachments count */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-400">
                        {(t.comment_count || 0) > 0 && (
                          <span className="flex items-center gap-0.5 text-[11px]" title={`${t.comment_count} comments`}>
                            <MessageSquare className="w-3 h-3" />
                            <span className="tabular-nums">{t.comment_count}</span>
                          </span>
                        )}
                        {(t.attachment_count || 0) > 0 && (
                          <span className="flex items-center gap-0.5 text-[11px]" title={`${t.attachment_count} attachments`}>
                            <Paperclip className="w-3 h-3" />
                            <span className="tabular-nums">{t.attachment_count}</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
