export type Role = 'reporter' | 'technician' | 'manager' | 'admin';

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TicketStatus = 'Open' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed';

export interface User {
  user_id: number;
  name: string;
  email: string;
  role: Role;
  department: string;
  is_active: number;
  failed_attempts?: number;
  locked_until?: string | null;
  created_at?: string;
  tickets_created?: number;
  tickets_assigned?: number;
}

export interface Category {
  category_id: number;
  name: string;
  description?: string;
}

export interface Comment {
  comment_id: number;
  ticket_id: number;
  user_id: number;
  user_name?: string;
  user_role?: Role;
  message: string;
  is_repair_note: number;
  timestamp: string;
}

export interface Attachment {
  attachment_id: number;
  ticket_id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  file_data?: string;
  file_hash?: string;
  scan_status?: 'CLEAN' | 'REJECTED' | 'PENDING';
  timestamp: string;
}

export interface TicketSignature {
  signature_id: number;
  ticket_id: number;
  user_id: number;
  signer_name?: string;
  signer_role?: Role;
  signer_dept?: string;
  action: 'RESOLVED' | 'CLOSED';
  signature_hash: string;
  timestamp: string;
}

export interface Notification {
  notif_id: number;
  user_id: number;
  ticket_id: number | null;
  message: string;
  is_read: number;
  created_at: string;
}

export interface AuditLog {
  log_id: number;
  user_id: number | null;
  user_name?: string;
  user_email?: string;
  user_role?: Role;
  action: string;
  target: string;
  old_value: string | null;
  new_value: string | null;
  timestamp: string;
  ip_address: string;
  prev_hash: string;
  hash: string;
}

export interface Ticket {
  ticket_id: number;
  title: string;
  description: string;
  category_id: number;
  category_name?: string;
  priority: TicketPriority;
  status: TicketStatus;
  location: string;
  created_by: number;
  creator_name?: string;
  creator_email?: string;
  assigned_to: number | null;
  assignee_name?: string | null;
  assignee_email?: string | null;
  due_date: string | null;
  created_at: string;
  resolved_at: string | null;
  comment_count?: number;
  attachment_count?: number;
  comments?: Comment[];
  attachments?: Attachment[];
  signatures?: TicketSignature[];
  audit_logs?: AuditLog[];
}

export interface DashboardData {
  summary: {
    total_tickets: number;
    open_tickets: number;
    in_progress_tickets: number;
    resolved_tickets: number;
    closed_tickets: number;
    critical_active: number;
  };
  by_status: Array<{ status: string; count: number }>;
  by_priority: Array<{ priority: string; count: number }>;
  by_category: Array<{ name: string; count: number }>;
  resolution_time: Array<{
    technician_name: string;
    resolved_count: number;
    avg_resolution_hours: number | null;
  }>;
  is_personal_scope: boolean;
}

export interface SecurityEvent {
  event_id: number;
  event_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ip_address: string;
  details: string;
  timestamp: string;
}

export interface BannedIp {
  ip_address: string;
  reason: string;
  banned_at: string;
  banned_by: number | null;
  banned_by_name?: string;
}

export interface SocData {
  summary: {
    total_events: number;
    critical_alerts: number;
    brute_force_incidents: number;
    active_banned_ips: number;
  };
  events: SecurityEvent[];
  banned_ips: BannedIp[];
}

export interface MfaStatus {
  is_enabled: boolean;
  enabled_at: string | null;
  remaining_recovery_codes: number;
}

export interface TestSuiteResult {
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
  tests: Array<{
    name: string;
    category: string;
    passed: boolean;
    message: string;
    duration_ms: number;
  }>;
}
