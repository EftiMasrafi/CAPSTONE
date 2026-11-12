import React, { useState, useEffect } from 'react';
import { Ticket, User, Role } from '../types';
import { apiRequest } from '../lib/api';
import {
  X,
  MapPin,
  Calendar,
  User as UserIcon,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Paperclip,
  Upload,
  ArrowRight,
  RotateCcw,
  FileText,
  Lock,
} from 'lucide-react';

interface TicketDetailModalProps {
  ticketId: number;
  currentUser: User;
  onClose: () => void;
  onTicketUpdated: () => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticketId,
  currentUser,
  onClose,
  onTicketUpdated,
}) => {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & form state
  const [activeTab, setActiveTab] = useState<'timeline' | 'attachments' | 'audit'>('timeline');
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [technicians, setTechnicians] = useState<Array<{ user_id: number; name: string; department: string }>>([]);
  const [selectedTechId, setSelectedTechId] = useState<number | ''>('');
  const [dueDateInput, setDueDateInput] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Repair note modal (required when resolving)
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [repairNoteText, setRepairNoteText] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  // Attachment upload
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);

  const fetchTicket = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiRequest<Ticket>(`/api/tickets/${ticketId}`);
      setTicket(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load ticket details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  // Load technician list if manager/admin
  useEffect(() => {
    if (['manager', 'admin'].includes(currentUser.role)) {
      apiRequest('/api/technicians')
        .then((techs) => setTechnicians(techs))
        .catch(() => {});
    }
  }, [currentUser.role]);

  // Post comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setIsSubmittingComment(true);
      await apiRequest(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ message: commentText }),
      });
      setCommentText('');
      await fetchTicket();
      onTicketUpdated();
    } catch (err: any) {
      alert(`Error adding comment: ${err.message}`);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Assign Technician
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTechId) return;

    try {
      setIsAssigning(true);
      await apiRequest(`/api/tickets/${ticketId}/assign`, {
        method: 'POST',
        body: JSON.stringify({
          assigned_to: selectedTechId,
          due_date: dueDateInput || null,
        }),
      });
      setShowAssignModal(false);
      await fetchTicket();
      onTicketUpdated();
    } catch (err: any) {
      alert(`Assignment failed: ${err.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  // Status transition helper
  const handleTransition = async (newStatus: string, note?: string) => {
    try {
      await apiRequest(`/api/tickets/${ticketId}/transition`, {
        method: 'POST',
        body: JSON.stringify({
          new_status: newStatus,
          repair_note: note,
        }),
      });
      setShowResolveModal(false);
      setRepairNoteText('');
      await fetchTicket();
      onTicketUpdated();
    } catch (err: any) {
      alert(`Transition error: ${err.message}`);
    }
  };

  // Upload file attachment
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setIsUploadingPhoto(true);
        await apiRequest(`/api/tickets/${ticketId}/attachments`, {
          method: 'POST',
          body: JSON.stringify({
            file_name: file.name,
            file_type: file.type || 'image/jpeg',
            file_size: file.size,
            file_data: reader.result as string,
          }),
        });
        await fetchTicket();
        onTicketUpdated();
      } catch (err: any) {
        alert(`Upload failed: ${err.message}`);
      } finally {
        setIsUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const steps = ['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
  const currentStepIdx = ticket ? steps.indexOf(ticket.status) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-slate-500 dark:text-slate-400 tabular-nums">
              #{ticketId}
            </span>
            <span
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                ticket?.status === 'Open'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                  : ticket?.status === 'Assigned'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                  : ticket?.status === 'In Progress'
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                  : ticket?.status === 'Resolved'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {ticket?.status || 'Loading'}
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {ticket?.category_name}
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span
              className={`text-xs font-semibold ${
                ticket?.priority === 'Critical'
                  ? 'text-rose-600 dark:text-rose-400'
                  : ticket?.priority === 'High'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-blue-600 dark:text-blue-400'
              }`}
            >
              {ticket?.priority} Priority
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading work order details...</div>
        ) : error || !ticket ? (
          <div className="p-8 text-center text-rose-500 text-xs">{error || 'Work order not found.'}</div>
        ) : (
          <div className="overflow-y-auto flex-1 p-6 space-y-6">
            {/* Title & Metadata Strip */}
            <div>
              <h1 className="text-xl font-bold font-display text-slate-900 dark:text-white">
                {ticket.title}
              </h1>
              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-500 dark:text-slate-400 mt-2">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {ticket.location}
                </span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  Reported by {ticket.creator_name} ({ticket.creator_email})
                </span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(ticket.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
            </div>

            {/* Strict Lifecycle Transition Stepper Bar */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                <span>Verified Ticket Lifecycle Pipeline</span>
                <span className="font-mono text-[11px]">Step {currentStepIdx + 1} of 5</span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {steps.map((step, idx) => {
                  const isDone = idx < currentStepIdx;
                  const isCurrent = idx === currentStepIdx;
                  return (
                    <div
                      key={step}
                      className={`py-2 px-2.5 rounded-md text-center text-xs font-medium transition-all ${
                        isCurrent
                          ? 'bg-blue-600 text-white font-semibold shadow-xs ring-2 ring-blue-500/20'
                          : isDone
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="truncate">{step}</div>
                    </div>
                  );
                })}
              </div>

              {/* Action Controls for Status Workflow */}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-500" />
                  <span>
                    Assigned: <strong className="text-slate-800 dark:text-slate-200">{ticket.assignee_name || 'Unassigned'}</strong>
                    {ticket.due_date && ` · Due: ${ticket.due_date}`}
                  </span>
                </div>

                {/* Dynamic Role-Based Lifecycle Action Buttons */}
                <div className="flex items-center gap-2">
                  {/* Step 1: Open -> Assigned (Manager/Admin only) */}
                  {ticket.status === 'Open' && ['manager', 'admin'].includes(currentUser.role) && (
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer shadow-xs"
                    >
                      Assign Technician & Schedule
                    </button>
                  )}

                  {/* Step 2: Assigned -> In Progress (Assigned Technician or Manager/Admin) */}
                  {ticket.status === 'Assigned' &&
                    (ticket.assigned_to === currentUser.user_id || ['manager', 'admin'].includes(currentUser.role)) && (
                      <button
                        onClick={() => handleTransition('In Progress')}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors cursor-pointer shadow-xs"
                      >
                        Start Work (Move to In Progress)
                      </button>
                    )}

                  {/* Reassign (Manager/Admin can reassign at any point before resolution) */}
                  {['Assigned', 'In Progress'].includes(ticket.status) && ['manager', 'admin'].includes(currentUser.role) && (
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                    >
                      Reassign
                    </button>
                  )}

                  {/* Step 3: In Progress -> Resolved (Requires Repair Note!) */}
                  {ticket.status === 'In Progress' &&
                    (ticket.assigned_to === currentUser.user_id || ['manager', 'admin'].includes(currentUser.role)) && (
                      <button
                        onClick={() => setShowResolveModal(true)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors cursor-pointer shadow-xs"
                      >
                        Resolve Ticket (Submit Repair Note)
                      </button>
                    )}

                  {/* Step 4: Resolved -> Closed (Manager/Admin only) */}
                  {ticket.status === 'Resolved' && ['manager', 'admin'].includes(currentUser.role) && (
                    <button
                      onClick={() => handleTransition('Closed')}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-md transition-colors cursor-pointer shadow-xs"
                    >
                      Verify & Close Ticket
                    </button>
                  )}

                  {/* Reopen to Open (from Resolved or Closed, Manager/Admin only) */}
                  {['Resolved', 'Closed'].includes(ticket.status) && ['manager', 'admin'].includes(currentUser.role) && (
                    <button
                      onClick={() => handleTransition('Open')}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 dark:text-amber-300 dark:bg-amber-950/40 rounded-md border border-amber-200 dark:border-amber-900 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reopen Ticket
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Description Box */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Problem Description & Operational Symptoms
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {ticket.description}
              </p>
            </div>

            {/* Navigation Tabs for Timeline / Attachments / Audit */}
            <div className="border-b border-slate-200 dark:border-slate-800">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`pb-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                    activeTab === 'timeline'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  Activity & Repair Timeline ({ticket.comments?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('attachments')}
                  className={`pb-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                    activeTab === 'attachments'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  Attachments & Photos ({ticket.attachments?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`pb-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                    activeTab === 'audit'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  Cryptographic Audit Trail ({ticket.audit_logs?.length || 0})
                </button>
              </div>
            </div>

            {/* TAB 1: Timeline & Comments */}
            {activeTab === 'timeline' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  {ticket.comments?.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No comments or repair notes posted yet.
                    </div>
                  ) : (
                    ticket.comments?.map((c) => (
                      <div
                        key={c.comment_id}
                        className={`p-3.5 rounded-lg border text-xs ${
                          c.is_repair_note
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
                            : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {c.user_name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-mono">
                              {c.user_role}
                            </span>
                            {c.is_repair_note === 1 && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-600 text-white font-bold uppercase tracking-wider">
                                Official Repair Note
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {new Date(c.timestamp).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {c.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add comment input */}
                <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Add an update, test result, or note..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white placeholder-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !commentText.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md shadow-xs cursor-pointer transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Post</span>
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: Attachments */}
            {activeTab === 'attachments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Uploaded Photos & Diagnostic Documents
                  </h4>
                  <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 rounded-md border border-blue-200 dark:border-blue-900 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingPhoto ? 'Uploading...' : 'Upload Attachment'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploadingPhoto}
                    />
                  </label>
                </div>

                {ticket.attachments?.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                    No attachments uploaded for this ticket.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {ticket.attachments?.map((att) => (
                      <div
                        key={att.attachment_id}
                        className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Paperclip className="w-4 h-4 text-blue-500 shrink-0" />
                            <span className="font-medium text-slate-900 dark:text-white truncate">
                              {att.file_name}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {(att.file_size / 1024).toFixed(1)} KB · {att.file_type}
                          </div>
                        </div>

                        <button
                          onClick={async () => {
                            try {
                              const fullAtt = await apiRequest(`/api/attachments/${att.attachment_id}/download`);
                              if (fullAtt.file_data?.startsWith('data:image')) {
                                setSelectedImagePreview(fullAtt.file_data);
                              } else if (fullAtt.file_data) {
                                const link = document.createElement('a');
                                link.href = fullAtt.file_data;
                                link.download = fullAtt.file_name;
                                link.click();
                              }
                            } catch (e: any) {
                              alert(`Failed to open: ${e.message}`);
                            }
                          }}
                          className="mt-3 text-left text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          View / Download
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Cryptographic Audit Trail */}
            {activeTab === 'audit' && (
              <div className="space-y-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Immutable record of state transitions, technician assignments, and repair notes linked by SHA-256 hashes.
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  {ticket.audit_logs?.map((log) => (
                    <div key={log.log_id} className="p-3 bg-white dark:bg-slate-900 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {log.action}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Log #{log.log_id} · {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-300">
                        {log.new_value}
                      </div>
                      <div className="mt-1 text-[10px] font-mono text-slate-400 truncate">
                        Hash: {log.hash}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 rounded-md cursor-pointer"
          >
            Close Window
          </button>
        </div>

        {/* SUB-MODAL 1: Assign Technician (Manager/Admin) */}
        {showAssignModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                Assign Work Order to Technician
              </h3>
              <form onSubmit={handleAssignSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Select Certified Technician
                  </label>
                  <select
                    value={selectedTechId}
                    onChange={(e) => setSelectedTechId(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                  >
                    <option value="">-- Choose Technician --</option>
                    {technicians.map((t) => (
                      <option key={t.user_id} value={t.user_id}>
                        {t.name} ({t.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Scheduled Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDateInput}
                    onChange={(e) => setDueDateInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-md cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAssigning || !selectedTechId}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md cursor-pointer"
                  >
                    {isAssigning ? 'Dispatching...' : 'Confirm Assignment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SUB-MODAL 2: Repair Note (Required when Resolving Ticket) */}
        {showResolveModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Submit Required Repair Note & Resolve
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                In compliance with facility protocol, technicians must provide diagnostic actions taken and verification results before resolving a work order.
              </p>

              <textarea
                rows={4}
                required
                placeholder="Describe parts replaced, adjustments made, safety tests run, and operational readings..."
                value={repairNoteText}
                onChange={(e) => setRepairNoteText(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              />

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleTransition('Resolved', repairNoteText)}
                  disabled={repairNoteText.trim().length < 5}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-md cursor-pointer"
                >
                  Confirm & Resolve Ticket
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Viewer Lightbox */}
        {selectedImagePreview && (
          <div
            className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 cursor-pointer"
            onClick={() => setSelectedImagePreview(null)}
          >
            <div className="max-w-3xl max-h-[85vh] p-2 bg-white dark:bg-slate-900 rounded-lg overflow-hidden">
              <img
                src={selectedImagePreview}
                alt="Ticket Attachment"
                className="max-h-[80vh] w-auto object-contain mx-auto"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
