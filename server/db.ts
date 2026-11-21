import Database from 'better-sqlite3';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'maintenance.db');
export const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Initialize SQLite tables
 */
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('reporter', 'technician', 'manager', 'admin')),
      department TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT DEFAULT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      category_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS tickets (
      ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(category_id),
      priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
      status TEXT NOT NULL CHECK (status IN ('Open', 'Assigned', 'In Progress', 'Resolved', 'Closed')),
      location TEXT NOT NULL,
      created_by INTEGER NOT NULL REFERENCES users(user_id),
      assigned_to INTEGER REFERENCES users(user_id),
      due_date TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS comments (
      comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(user_id),
      message TEXT NOT NULL,
      is_repair_note INTEGER NOT NULL DEFAULT 0,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attachments (
      attachment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_data TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      notif_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      ticket_id INTEGER REFERENCES tickets(ticket_id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(user_id),
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      timestamp TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      prev_hash TEXT NOT NULL,
      hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS email_dispatches (
      email_id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      sent_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS banned_ips (
      ip_address TEXT PRIMARY KEY,
      reason TEXT NOT NULL,
      banned_at TEXT NOT NULL,
      banned_by INTEGER REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS security_events (
      event_id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      ip_address TEXT NOT NULL,
      details TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_mfa (
      user_id INTEGER PRIMARY KEY REFERENCES users(user_id),
      totp_secret TEXT NOT NULL,
      is_enabled INTEGER NOT NULL DEFAULT 0,
      backup_codes TEXT NOT NULL,
      enabled_at TEXT
    );

    CREATE TABLE IF NOT EXISTS ticket_signatures (
      signature_id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(user_id),
      action TEXT NOT NULL,
      signature_hash TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      session_id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      ip_address TEXT NOT NULL,
      user_agent TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_active TEXT NOT NULL,
      is_revoked INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS waf_rules (
      rule_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      pattern TEXT NOT NULL,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      match_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS waf_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dlp_incidents (
      incident_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(user_id),
      ticket_id INTEGER REFERENCES tickets(ticket_id),
      data_type TEXT NOT NULL,
      original_snippet TEXT NOT NULL,
      redacted_snippet TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      ip_address TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS campus_facilities (
      facility_code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      location TEXT NOT NULL,
      health_score INTEGER NOT NULL DEFAULT 100,
      uptime_pct REAL NOT NULL DEFAULT 99.9,
      status TEXT NOT NULL DEFAULT 'OPTIMAL',
      power_kw REAL NOT NULL,
      temp_c REAL NOT NULL,
      active_incidents INTEGER NOT NULL DEFAULT 0,
      critical_assets TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS preventive_assets (
      asset_id TEXT PRIMARY KEY,
      facility_code TEXT NOT NULL REFERENCES campus_facilities(facility_code),
      asset_name TEXT NOT NULL,
      category TEXT NOT NULL,
      health_index INTEGER NOT NULL,
      mtbf_days INTEGER NOT NULL,
      mttr_hours REAL NOT NULL,
      failure_risk_pct INTEGER NOT NULL,
      last_serviced_at TEXT NOT NULL,
      recommended_action TEXT NOT NULL,
      priority TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS emergency_broadcasts (
      broadcast_id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL', 'LOCKDOWN')),
      facility_code TEXT,
      created_by INTEGER NOT NULL REFERENCES users(user_id),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      cleared_at TEXT
    );
  `);

  try {
    db.exec("ALTER TABLE attachments ADD COLUMN file_hash TEXT DEFAULT ''");
  } catch {}
  try {
    db.exec("ALTER TABLE attachments ADD COLUMN scan_status TEXT DEFAULT 'CLEAN'");
  } catch {}

  // Run seed data if empty
  seedDatabaseIfEmpty();
  seedCybersecurityData();
  seedAdvancedFeatures();
}

/**
 * SHA-256 Audit Log Hash Computation
 */
export function computeAuditHash(entry: {
  user_id: number | null | string;
  action: string;
  target: string;
  old_value: string | null;
  new_value: string | null;
  timestamp: string;
  ip_address: string;
  prev_hash: string;
}): string {
  const content = [
    String(entry.user_id ?? 'ANONYMOUS'),
    entry.action,
    entry.target,
    entry.old_value ?? '',
    entry.new_value ?? '',
    entry.timestamp,
    entry.ip_address,
    entry.prev_hash,
  ].join('|');

  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Append an entry to the tamper-evident audit log
 */
export function logAuditEvent(
  userId: number | null,
  action: string,
  target: string,
  oldValue: string | null,
  newValue: string | null,
  ipAddress: string = '127.0.0.1'
): { log_id: number; hash: string } {
  const latestLog = db
    .prepare('SELECT hash FROM audit_logs ORDER BY log_id DESC LIMIT 1')
    .get() as { hash: string } | undefined;

  const prevHash = latestLog ? latestLog.hash : GENESIS_HASH;
  const timestamp = new Date().toISOString();

  const hash = computeAuditHash({
    user_id: userId,
    action,
    target,
    old_value: oldValue,
    new_value: newValue,
    timestamp,
    ip_address: ipAddress,
    prev_hash: prevHash,
  });

  const insert = db.prepare(`
    INSERT INTO audit_logs (user_id, action, target, old_value, new_value, timestamp, ip_address, prev_hash, hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insert.run(
    userId,
    action,
    target,
    oldValue,
    newValue,
    timestamp,
    ipAddress,
    prevHash,
    hash
  );

  return { log_id: Number(result.lastInsertRowid), hash };
}

/**
 * Verify entire SHA-256 audit log chain
 */
export function verifyAuditChain(): {
  valid: boolean;
  total_logs: number;
  broken_log_id?: number;
  expected_hash?: string;
  actual_hash?: string;
  error?: string;
  head_hash?: string;
} {
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY log_id ASC').all() as Array<{
    log_id: number;
    user_id: number | null;
    action: string;
    target: string;
    old_value: string | null;
    new_value: string | null;
    timestamp: string;
    ip_address: string;
    prev_hash: string;
    hash: string;
  }>;

  if (logs.length === 0) {
    return { valid: true, total_logs: 0, head_hash: GENESIS_HASH };
  }

  let expectedPrevHash = GENESIS_HASH;

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];

    // Check prev_hash link
    if (log.prev_hash !== expectedPrevHash) {
      return {
        valid: false,
        total_logs: logs.length,
        broken_log_id: log.log_id,
        expected_hash: expectedPrevHash,
        actual_hash: log.prev_hash,
        error: `Broken chain link at Log #${log.log_id}: prev_hash does not match preceding block hash.`,
      };
    }

    // Recompute current entry hash
    const recomputed = computeAuditHash({
      user_id: log.user_id,
      action: log.action,
      target: log.target,
      old_value: log.old_value,
      new_value: log.new_value,
      timestamp: log.timestamp,
      ip_address: log.ip_address,
      prev_hash: log.prev_hash,
    });

    if (recomputed !== log.hash) {
      return {
        valid: false,
        total_logs: logs.length,
        broken_log_id: log.log_id,
        expected_hash: recomputed,
        actual_hash: log.hash,
        error: `Tampered payload detected at Log #${log.log_id}: computed hash ${recomputed} differs from stored ${log.hash}.`,
      };
    }

    expectedPrevHash = log.hash;
  }

  return {
    valid: true,
    total_logs: logs.length,
    head_hash: expectedPrevHash,
  };
}

/**
 * Password Hashing Helper
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const computedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(computedKey, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Dispatch simulated email & create in-app notification
 */
export function sendNotificationAndEmail(
  userId: number,
  ticketId: number | null,
  message: string,
  emailSubject?: string
) {
  // 1. In-app notification
  const insertNotif = db.prepare(`
    INSERT INTO notifications (user_id, ticket_id, message, is_read, created_at)
    VALUES (?, ?, ?, 0, ?)
  `);
  insertNotif.run(userId, ticketId, message, new Date().toISOString());

  // 2. Simulated email record
  const user = db.prepare('SELECT email, name FROM users WHERE user_id = ?').get(userId) as
    | { email: string; name: string }
    | undefined;

  if (user) {
    const subject = emailSubject || `Campus Maintenance Alert: Update on Ticket #${ticketId || 'System'}`;
    const body = `Hello ${user.name},\n\n${message}\n\nCampus Maintenance Directorate\nUniversity Facilities & Engineering Management`;
    db.prepare(`
      INSERT INTO email_dispatches (recipient_email, subject, body, sent_at)
      VALUES (?, ?, ?, ?)
    `).run(user.email, subject, body, new Date().toISOString());
  }
}

/**
 * Seed Database with University Campus Data
 */
function seedDatabaseIfEmpty() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) return;

  console.log('[DB] Seeding university campus maintenance database...');

  // 1. Categories
  const categories = [
    { name: 'Electrical', description: 'Laboratory power grids, high-voltage breakers, UPS systems, backup generators, and wiring' },
    { name: 'Mechanical', description: 'Centrifuges, autoclaves, ventilation blowers, HVAC chillers, and compressor units' },
    { name: 'Plumbing', description: 'Reverse osmosis purification lines, emergency eyewash stations, cryogenic drainage, and valves' },
    { name: 'IT', description: 'Server rack cooling, campus fiber switches, lab workstations, access control badges, and projectors' },
  ];

  const insertCat = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
  for (const cat of categories) {
    insertCat.run(cat.name, cat.description);
  }

  // 2. Sample Users
  const seedUsers = [
    {
      name: 'Alex Vance',
      email: 'admin@campus.edu',
      password: 'AdminPass123!',
      role: 'admin',
      department: 'Facilities & Campus Operations',
    },
    {
      name: 'Maria Rodriguez',
      email: 'manager@campus.edu',
      password: 'ManagerPass123!',
      role: 'manager',
      department: 'Central Maintenance Directorate',
    },
    {
      name: 'David Chen',
      email: 'tech1@campus.edu',
      password: 'TechPass123!',
      role: 'technician',
      department: 'Engineering Services - Electrical',
    },
    {
      name: 'Marcus Bell',
      email: 'tech2@campus.edu',
      password: 'TechPass123!',
      role: 'technician',
      department: 'HVAC & Mechanical Systems',
    },
    {
      name: 'Dr. Sarah Jenkins',
      email: 'reporter@campus.edu',
      password: 'ReporterPass123!',
      role: 'reporter',
      department: 'Biochemistry Research Lab',
    },
    {
      name: 'Prof. Alan Oakley',
      email: 'prof.oakley@campus.edu',
      password: 'ReporterPass123!',
      role: 'reporter',
      department: 'Physics & Astronomy Dept',
    },
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, department, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `);

  const userIds: Record<string, number> = {};
  for (const u of seedUsers) {
    const res = insertUser.run(
      u.name,
      u.email,
      hashPassword(u.password),
      u.role,
      u.department,
      new Date().toISOString()
    );
    userIds[u.email] = Number(res.lastInsertRowid);
    // Audit log user creation
    logAuditEvent(
      1,
      'USER_CREATED',
      `User #${res.lastInsertRowid}`,
      null,
      `Created user ${u.name} (${u.role})`,
      '127.0.0.1'
    );
  }

  // 3. 20 Realistic University Tickets
  const ticketData = [
    {
      title: 'Centrifuge 4B High-Speed Rotor Imbalance & Vibration',
      description: 'During high-speed RNA extraction run (14,000 RPM), Beckman ultracentrifuge exhibited violent resonance vibration and emergency braking triggered.',
      category_id: 2, // Mechanical
      priority: 'Critical',
      status: 'In Progress',
      location: 'Science Complex - Molecular Biology Lab 402',
      created_by: userIds['reporter@campus.edu'],
      assigned_to: userIds['tech2@campus.edu'],
      due_date: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0],
      comments: [
        { user: userIds['reporter@campus.edu'], msg: 'Samples are safely stored in -80C freezer, but lab protocol is halted.' },
        { user: userIds['manager@campus.edu'], msg: 'Marcus, please inspect dynamic balancing rings and spindle mounts immediately.' },
        { user: userIds['tech2@campus.edu'], msg: 'Disassembled rotor assembly. Spindle rubber collar is degraded; replacement ordered from stockroom.' },
      ],
    },
    {
      title: 'Emergency Eyewash Station Pressure Fluctuation & Discoloration',
      description: 'Routine weekly safety flush revealed rust particles in line and water pressure drops to less than 12 PSI after 5 seconds of continuous flow.',
      category_id: 3, // Plumbing
      priority: 'High',
      status: 'Assigned',
      location: 'Chemistry Pavilion - Organic Synthesis Lab 210',
      created_by: userIds['reporter@campus.edu'],
      assigned_to: userIds['tech2@campus.edu'],
      due_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      comments: [
        { user: userIds['manager@campus.edu'], msg: 'High priority OSHA safety station. Assigned to Marcus.' },
      ],
    },
    {
      title: 'Substation B Transformer Breaker Tripping on Load Surge',
      description: 'Main 480V distribution breaker tripped twice during evening peak computation hours in the Physics Cluster. Suspected harmonic resonance.',
      category_id: 1, // Electrical
      priority: 'Critical',
      status: 'In Progress',
      location: 'East Campus Utility Plant - Substation B Switchgear',
      created_by: userIds['prof.oakley@campus.edu'],
      assigned_to: userIds['tech1@campus.edu'],
      due_date: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0],
      comments: [
        { user: userIds['manager@campus.edu'], msg: 'David, monitor thermal imaging across Phase B feeder bus.' },
        { user: userIds['tech1@campus.edu'], msg: 'Thermal scan confirms lug heating at 78C. Torqued bus connections to 55 ft-lb.' },
      ],
    },
    {
      title: 'Optical Fiber Patch Switch Error in HPC Supercomputing Rack 7',
      description: 'Core 100GbE Mellanox switch reporting cyclic redundancy check (CRC) packet loss on port 24 connecting the astrophysics array.',
      category_id: 4, // IT
      priority: 'High',
      status: 'Resolved',
      location: 'Turing Computer Science Building - Server Bay 3',
      created_by: userIds['prof.oakley@campus.edu'],
      assigned_to: userIds['tech1@campus.edu'],
      due_date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
      resolved_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      comments: [
        { user: userIds['tech1@campus.edu'], msg: 'Inspected LC fiber connector under 400x scope. Found ceramic dust contamination. Cleaned with isopropyl clicker pen. CRC error count reset to zero.', is_repair_note: 1 },
      ],
    },
    {
      title: 'Fume Hood Air Velocity Alarm Constantly Triggering',
      description: 'Sash face velocity monitor alarms whenever sash is elevated above 12 inches. Face velocity drops to 45 FPM (safety minimum is 100 FPM).',
      category_id: 2, // Mechanical
      priority: 'High',
      status: 'Closed',
      location: 'Engineering Hall - Materials Testing Lab 115',
      created_by: userIds['reporter@campus.edu'],
      assigned_to: userIds['tech2@campus.edu'],
      due_date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0],
      resolved_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      comments: [
        { user: userIds['tech2@campus.edu'], msg: 'Exhaust damper actuator linkage had slipped. Re-calibrated pneumatic actuator and verified 105 FPM face velocity across entire sash travel.', is_repair_note: 1 },
        { user: userIds['manager@campus.edu'], msg: 'Airflow certified with anemometer and inspected. Closed ticket.' },
      ],
    },
    {
      title: 'Reverse Osmosis Water Purification Filtration Leak',
      description: 'Slow continuous drip from pre-carbon canister housing fitting. Puddle forming under the deionized water polishing manifold.',
      category_id: 3, // Plumbing
      priority: 'Medium',
      status: 'Open',
      location: 'Biomedical Annex - Cell Culture Prep Room 102',
      created_by: userIds['reporter@campus.edu'],
      assigned_to: null,
      due_date: null,
      comments: [],
    },
    {
      title: 'Lecture Hall 101 Ceiling 4K Laser Projector Failure',
      description: 'Projector powers off with warning light after 8 minutes of lecture operation. Internal cooling fan error displayed on remote management console.',
      category_id: 4, // IT
      priority: 'Medium',
      status: 'Assigned',
      location: 'Auditorium Quad - Franklin Lecture Hall 101',
      created_by: userIds['prof.oakley@campus.edu'],
      assigned_to: userIds['tech1@campus.edu'],
      due_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      comments: [
        { user: userIds['manager@campus.edu'], msg: 'David, Franklin 101 has midterm lectures tomorrow at 10 AM. Please replace filter intake.' },
      ],
    },
    {
      title: 'Uninterruptible Power Supply (UPS) Battery Bank Degradation Alarm',
      description: 'APC Symmetra 40kVA UPS unit self-test reported internal resistance warning across Battery Module String #3. Runtime decreased from 45 min to 14 min.',
      category_id: 1, // Electrical
      priority: 'High',
      status: 'In Progress',
      location: 'Turing Computer Science Building - UPS Power Room 004',
      created_by: userIds['admin@campus.edu'],
      assigned_to: userIds['tech1@campus.edu'],
      due_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      comments: [
        { user: userIds['tech1@campus.edu'], msg: 'Identified 2 swollen AGM cells in tray 3. Switched unit to maintenance bypass mode and isolated string.' },
      ],
    },
    {
      title: 'Cryogenic Liquid Nitrogen Tank Pressure Relief Valve Hissing',
      description: 'Excessive venting sound from primary 240L dewar regulator. Frost ring expanding around manifold flange.',
      category_id: 2, // Mechanical
      priority: 'Critical',
      status: 'Resolved',
      location: 'Science Complex - Cryo Storage Facility B14',
      created_by: userIds['prof.oakley@campus.edu'],
      assigned_to: userIds['tech2@campus.edu'],
      due_date: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0],
      resolved_at: new Date(Date.now() - 86400000 * 0.5).toISOString(),
      comments: [
        { user: userIds['tech2@campus.edu'], msg: 'Replaced frozen relief poppet valve with cryogenic-rated Teflon seal. Pressure stabilized at nominal 22 PSI.', is_repair_note: 1 },
      ],
    },
    {
      title: 'Basement Mechanical Room Sump Pump Float Switch Stuck',
      description: 'Primary stormwater drainage sump pump not engaging automatically. Sump pit water level is 4 inches below overflow pipe.',
      category_id: 3, // Plumbing
      priority: 'Medium',
      status: 'Open',
      location: 'Library Annex - Basement Utility Vault',
      created_by: userIds['reporter@campus.edu'],
      assigned_to: null,
      due_date: null,
      comments: [],
    },
    {
      title: 'Smart Card Access Reader Intermittent at Lab Cleanroom Door',
      description: 'RFID reader beeps red 60% of the time for authorized student credentials, requiring multiple badge taps to release magnetic lock.',
      category_id: 4, // IT
      priority: 'Low',
      status: 'Assigned',
      location: 'Nanotechnology Cleanroom - Air Shower Portal',
      created_by: userIds['reporter@campus.edu'],
      assigned_to: userIds['tech1@campus.edu'],
      due_date: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
      comments: [],
    },
    {
      title: 'Overhead LED Luminaire Array Flickering in Optics Darkroom',
      description: 'Dimmable electronic ballast in Darkroom 2B produces noticeable 120Hz strobe effect when dimmed below 30%, interfering with photodiode calibration.',
      category_id: 1, // Electrical
      priority: 'Low',
      status: 'Closed',
      location: 'Physics & Astronomy - Laser Darkroom 2B',
      created_by: userIds['prof.oakley@campus.edu'],
      assigned_to: userIds['tech1@campus.edu'],
      due_date: new Date(Date.now() - 86400000 * 7).toISOString().split('T')[0],
      resolved_at: new Date(Date.now() - 86400000 * 6).toISOString(),
      comments: [
        { user: userIds['tech1@campus.edu'], msg: 'Replaced phase-cut dimmer with dedicated 0-10V low-voltage pulse-width modulator. Checked with photodiode: 0% flicker detected.', is_repair_note: 1 },
        { user: userIds['manager@campus.edu'], msg: 'Professor Oakley confirmed clean baseline. Closed ticket.' },
      ],
    },
    {
      title: 'Chilled Water Circulation Pump 2 Bearing Whine',
      description: 'Acoustic monitoring picked up 3.2 kHz high-frequency pitch from 15HP Bell & Gossett pump motor bearings. Temperature on drive end is 68C.',
      category_id: 2, // Mechanical
      priority: 'Medium',
      status: 'In Progress',
      location: 'Central Plant - Secondary Chilled Water Loop',
      created_by: userIds['admin@campus.edu'],
      assigned_to: userIds['tech2@campus.edu'],
      due_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      comments: [
        { user: userIds['tech2@campus.edu'], msg: 'Greased bearings with synthetic polyurea lubricant. Vibration dampened slightly; monitoring over 24h.' },
      ],
    },
    {
      title: 'Autoclave Steam Exhaust Condensation Drain Line Clogged',
      description: 'Getinge sterilizer steam condensate backing up into lower collection trough, leaving mineral crust and causing cycle abort error E-04.',
      category_id: 3, // Plumbing
      priority: 'High',
      status: 'Resolved',
      location: 'Biomedical Sciences - Glassware Washing Facility',
      created_by: userIds['reporter@campus.edu'],
      assigned_to: userIds['tech2@campus.edu'],
      due_date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
      resolved_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      comments: [
        { user: userIds['tech2@campus.edu'], msg: 'Cleared lime scale blockage using sulfuric acid descale solution and installed brass cleanout strainer.', is_repair_note: 1 },
      ],
    },
    {
      title: 'Conference Room 302 Ceiling Mic Array VoIP Static',
      description: 'Dante audio gateway introducing intermittent clicks and loud white noise bursts into Zoom web conferencing sessions.',
      category_id: 4, // IT
      priority: 'Low',
      status: 'Open',
      location: 'Administration Tower - Executive Conference Room 302',
      created_by: userIds['manager@campus.edu'],
      assigned_to: null,
      due_date: null,
      comments: [],
    },
    {
      title: 'High-Field NMR Magnet Cryo-Chiller Water Pressure Low',
      description: 'Bruker 600MHz NMR cooling loop pressure dropped to 1.1 bar (nominal 2.5 bar). Chiller interlock warning illuminated.',
      category_id: 2, // Mechanical
      priority: 'Critical',
      status: 'Assigned',
      location: 'Chemistry Complex - NMR Spectroscopy Suite',
      created_by: userIds['prof.oakley@campus.edu'],
      assigned_to: userIds['tech2@campus.edu'],
      due_date: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0],
      comments: [
        { user: userIds['manager@campus.edu'], msg: 'CRITICAL: NMR magnet quench risk if temperature exceeds threshold. Marcus dispatched on priority.' },
      ],
    },
    {
      title: 'Outdoor Perimeter Pathway Security Lighting Ground Fault',
      description: 'Branch circuit GFCI breaker for North Quad perimeter bollard lights trips immediately upon dusk sensor photocell activation.',
      category_id: 1, // Electrical
      priority: 'Medium',
      status: 'Assigned',
      location: 'North Quadrangle - Pathway between Physics and Library',
      created_by: userIds['admin@campus.edu'],
      assigned_to: userIds['tech1@campus.edu'],
      due_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      comments: [],
    },
    {
      title: 'Deionized Water Loop Resistivity Monitor Sensor Calibration Drift',
      description: 'Water quality meter displays 14.2 Megohm-cm, but handheld conductivity meter measures 18.1 Megohm-cm at dispensing point.',
      category_id: 3, // Plumbing
      priority: 'Low',
      status: 'Closed',
      location: 'Nanotechnology Building - Ultrapure Water Core',
      created_by: userIds['reporter@campus.edu'],
      assigned_to: userIds['tech2@campus.edu'],
      due_date: new Date(Date.now() - 86400000 * 8).toISOString().split('T')[0],
      resolved_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      comments: [
        { user: userIds['tech2@campus.edu'], msg: 'Cleaned platinum electrode with dilute nitric acid and recalibrated using NIST traceable 0.05 uS/cm standard.', is_repair_note: 1 },
        { user: userIds['manager@campus.edu'], msg: 'Recalibration logged in facility compliance ledger. Closed.' },
      ],
    },
    {
      title: 'Biochemistry Cold Room Door Gasket Seal Failure',
      description: 'Frost accumulation around magnetic perimeter seal of walk-in cold room (+4C). Internal temperature fluctuating up to +8.5C.',
      category_id: 2, // Mechanical
      priority: 'High',
      status: 'In Progress',
      location: 'Life Sciences Wing - Walk-in Cold Room 120-C',
      created_by: userIds['reporter@campus.edu'],
      assigned_to: userIds['tech2@campus.edu'],
      due_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      comments: [
        { user: userIds['tech2@campus.edu'], msg: 'Bottom sweep gasket torn. Temporary silicone barrier applied while ordering custom 36x84 inch vinyl gasket.' },
      ],
    },
    {
      title: 'Main Computing Lab Cisco Catalyst Switch Power Supply 2 Failed',
      description: 'Redundant power supply PSU-B failed with amber fault LED. Core switch running on single supply PSU-A without redundancy.',
      category_id: 4, // IT
      priority: 'Medium',
      status: 'Resolved',
      location: 'Mathematics & Computing Center - Telecomm Room 205',
      created_by: userIds['admin@campus.edu'],
      assigned_to: userIds['tech1@campus.edu'],
      due_date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
      resolved_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      comments: [
        { user: userIds['tech1@campus.edu'], msg: 'Hot-swapped defective 750W Cisco AC power supply module with unit from spares cabinet. Dual redundancy verified.', is_repair_note: 1 },
      ],
    },
  ];

  const insertTicket = db.prepare(`
    INSERT INTO tickets (title, description, category_id, priority, status, location, created_by, assigned_to, due_date, created_at, resolved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertComment = db.prepare(`
    INSERT INTO comments (ticket_id, user_id, message, is_repair_note, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < ticketData.length; i++) {
    const t = ticketData[i];
    const createdAt = new Date(Date.now() - (ticketData.length - i) * 3600000 * 12).toISOString();

    const res = insertTicket.run(
      t.title,
      t.description,
      t.category_id,
      t.priority,
      t.status,
      t.location,
      t.created_by,
      t.assigned_to,
      t.due_date,
      createdAt,
      t.resolved_at || null
    );

    const ticketId = Number(res.lastInsertRowid);

    // Initial audit log for ticket creation
    logAuditEvent(
      t.created_by,
      'TICKET_CREATED',
      `Ticket #${ticketId}`,
      null,
      `Created: "${t.title}" [Priority: ${t.priority}]`,
      '127.0.0.1'
    );

    // If assigned, log assignment
    if (t.assigned_to) {
      logAuditEvent(
        userIds['manager@campus.edu'],
        'TICKET_ASSIGNED',
        `Ticket #${ticketId}`,
        'Unassigned',
        `Assigned to user #${t.assigned_to}`,
        '127.0.0.1'
      );
    }

    // If status != Open, log status transition
    if (t.status !== 'Open') {
      logAuditEvent(
        t.assigned_to || userIds['manager@campus.edu'],
        'TICKET_STATUS_CHANGED',
        `Ticket #${ticketId}`,
        'Open',
        t.status,
        '127.0.0.1'
      );
    }

    // Insert comments
    for (const c of t.comments) {
      insertComment.run(
        ticketId,
        c.user,
        c.msg,
        (c as any).is_repair_note ? 1 : 0,
        new Date().toISOString()
      );

      logAuditEvent(
        c.user,
        (c as any).is_repair_note ? 'REPAIR_NOTE_ADDED' : 'COMMENT_ADDED',
        `Ticket #${ticketId}`,
        null,
        c.msg.slice(0, 80),
        '127.0.0.1'
      );
    }
  }

  // Create notifications for demo users
  const insertNotif = db.prepare(`
    INSERT INTO notifications (user_id, ticket_id, message, is_read, created_at)
    VALUES (?, ?, ?, 0, ?)
  `);

  insertNotif.run(
    userIds['tech1@campus.edu'],
    3,
    'You have been assigned to Substation B Transformer Breaker Tripping on Load Surge.',
    new Date().toISOString()
  );
  insertNotif.run(
    userIds['tech2@campus.edu'],
    1,
    'Critical ticket assigned: Centrifuge 4B High-Speed Rotor Imbalance & Vibration.',
    new Date().toISOString()
  );
  insertNotif.run(
    userIds['reporter@campus.edu'],
    4,
    'Ticket #4 (Optical Fiber Patch Switch Error) has been marked Resolved by David Chen.',
    new Date().toISOString()
  );
  insertNotif.run(
    userIds['manager@campus.edu'],
    9,
    'Repair note submitted by Marcus Bell on Ticket #9: Cryogenic Liquid Nitrogen Relief Valve.',
    new Date().toISOString()
  );

  console.log('[DB] Seeding completed with 20 tickets and cryptographically verified audit log.');
}

/**
 * Seed initial cybersecurity events, firewall rules, and digital signatures
 */
function seedCybersecurityData() {
  const eventCount = db.prepare('SELECT COUNT(*) as count FROM security_events').get() as { count: number };
  if (eventCount.count > 0) return;

  console.log('[DB] Seeding cybersecurity threat intelligence and firewall data...');

  // 1. Seed Banned IP
  db.prepare(`
    INSERT OR IGNORE INTO banned_ips (ip_address, reason, banned_at, banned_by)
    VALUES (?, ?, ?, 1)
  `).run('198.51.100.42', 'Automated credential stuffing botnet detected across 14 failed attempts', new Date(Date.now() - 3600000 * 3).toISOString());

  // 2. Seed Security Events
  const events = [
    {
      type: 'BRUTE_FORCE_ATTEMPT',
      severity: 'HIGH',
      ip: '198.51.100.42',
      details: '14 rapid consecutive failed login requests targeting user administrative endpoints.',
      timeOffset: 3600000 * 3.2,
    },
    {
      type: 'FIREWALL_IP_BANNED',
      severity: 'CRITICAL',
      ip: '198.51.100.42',
      details: 'Perimeter firewall enacted block on 198.51.100.42. All inbound traffic dropped.',
      timeOffset: 3600000 * 3.0,
    },
    {
      type: 'SUSPICIOUS_PROBE',
      severity: 'MEDIUM',
      ip: '203.0.113.19',
      details: 'Unauthenticated query attempted against restricted /api/audit ledger.',
      timeOffset: 3600000 * 1.5,
    },
    {
      type: 'MFA_CHALLENGE_SUCCESS',
      severity: 'LOW',
      ip: '10.0.4.15',
      details: 'RFC 6238 TOTP two-factor challenge completed for Admin Alex Vance.',
      timeOffset: 3600000 * 0.8,
    },
    {
      type: 'DIGITAL_SIGNATURE_VERIFIED',
      severity: 'LOW',
      ip: '10.0.4.88',
      details: 'Work Order #4 signed with HMAC-SHA256 non-repudiation certificate by David Chen.',
      timeOffset: 3600000 * 0.5,
    },
  ];

  const insertEvent = db.prepare(`
    INSERT INTO security_events (event_type, severity, ip_address, details, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const ev of events) {
    insertEvent.run(
      ev.type,
      ev.severity,
      ev.ip,
      ev.details,
      new Date(Date.now() - ev.timeOffset).toISOString()
    );
  }

  // 3. Seed Digital Signatures for Tickets #4 and #5
  const adminUser = db.prepare('SELECT user_id FROM users WHERE role = ? LIMIT 1').get('admin') as any;
  const techUser = db.prepare('SELECT user_id FROM users WHERE email = ?').get('tech1@campus.edu') as any;

  if (techUser) {
    const sigHash4 = crypto.createHmac('sha256', 'campus-facility-digital-signature-key-2026')
      .update(`TICKET_VERIFIED|4|${techUser.user_id}|RESOLVED|${new Date().toISOString()}`)
      .digest('hex');

    db.prepare(`
      INSERT OR IGNORE INTO ticket_signatures (ticket_id, user_id, action, signature_hash, timestamp)
      VALUES (4, ?, 'RESOLVED', ?, ?)
    `).run(techUser.user_id, sigHash4, new Date(Date.now() - 3600000 * 12).toISOString());
  }

  if (adminUser) {
    const sigHash5 = crypto.createHmac('sha256', 'campus-facility-digital-signature-key-2026')
      .update(`TICKET_VERIFIED|5|${adminUser.user_id}|CLOSED|${new Date().toISOString()}`)
      .digest('hex');

    db.prepare(`
      INSERT OR IGNORE INTO ticket_signatures (ticket_id, user_id, action, signature_hash, timestamp)
      VALUES (5, ?, 'CLOSED', ?, ?)
    `).run(adminUser.user_id, sigHash5, new Date(Date.now() - 3600000 * 24).toISOString());
  }

  console.log('[DB] Cybersecurity threat intelligence and firewall seed completed.');
}

export function seedAdvancedFeatures() {
  // 1. Seed WAF Settings & Rules
  const existingWafRules = db.prepare('SELECT COUNT(*) as count FROM waf_rules').get() as { count: number };
  if (existingWafRules.count === 0) {
    db.prepare('INSERT OR REPLACE INTO waf_settings (key, value) VALUES (?, ?)').run('mode', 'ACTIVE_BLOCK');
    db.prepare('INSERT OR REPLACE INTO waf_settings (key, value) VALUES (?, ?)').run('honeypot_auto_ban', 'true');

    const rules = [
      {
        id: 'WAF-SQLI-01',
        name: 'SQL Injection - Union / Tautology',
        desc: 'Detects unauthorized UNION SELECT, OR 1=1, and DROP TABLE SQL injection payloads.',
        pattern: '\\b(union\\s+select|or\\s+1\\s*=\\s*1|drop\\s+table|exec\\s*\\(|benchmark\\s*\\()\\b',
        cat: 'SQL_INJECTION',
        sev: 'CRITICAL',
      },
      {
        id: 'WAF-XSS-02',
        name: 'Cross-Site Scripting (XSS) Sanitizer',
        desc: 'Intercepts script tags, eval constructs, and inline javascript event handlers.',
        pattern: '(<script|javascript:|onerror\\s*=|onload\\s*=|eval\\(|document\\.cookie)',
        cat: 'XSS',
        sev: 'HIGH',
      },
      {
        id: 'WAF-LFI-03',
        name: 'Path Traversal & System File Access',
        desc: 'Detects directory traversal sequences (../) and attempts to query /etc/passwd or win.ini.',
        pattern: '(\\.\\.[\\/\\\\]|[\\/\\\\]etc[\\/\\\\]passwd|[\\/\\\\]windows[\\/\\\\]win\\.ini|boot\\.ini)',
        cat: 'PATH_TRAVERSAL',
        sev: 'CRITICAL',
      },
      {
        id: 'WAF-POT-04',
        name: 'Canary & Honeypot Recon Trap',
        desc: 'Catches automated bot crawlers scanning for .env, wp-admin, or hidden honeytraps.',
        pattern: '(/api/security/honeypot|\\.env|wp-admin|phpmyadmin|id_rsa|\\.git\\/)',
        cat: 'RECONNAISSANCE',
        sev: 'CRITICAL',
      },
      {
        id: 'WAF-RCE-05',
        name: 'Remote Command Execution (RCE) Guard',
        desc: 'Blocks shell pipe operators and execution commands (cat, whoami, powershell, curl).',
        pattern: '(;\\s*(rm|cat|whoami|curl|wget|bash|sh|powershell)\\b|\\|\\s*(bash|sh|powershell))',
        cat: 'COMMAND_INJECTION',
        sev: 'CRITICAL',
      },
    ];

    const insertRule = db.prepare(`
      INSERT INTO waf_rules (rule_id, name, description, pattern, category, severity, is_enabled, match_count)
      VALUES (?, ?, ?, ?, ?, ?, 1, 0)
    `);

    for (const r of rules) {
      insertRule.run(r.id, r.name, r.desc, r.pattern, r.cat, r.sev);
    }
  }

  // 2. Seed Campus Facilities & Asset Digital Twins
  const existingFacilities = db.prepare('SELECT COUNT(*) as count FROM campus_facilities').get() as { count: number };
  if (existingFacilities.count === 0) {
    const facilities = [
      {
        code: 'FAC-01',
        name: 'Ada Lovelace Engineering Complex',
        type: 'Research & High-Performance Computing',
        location: 'North Campus Zone A',
        health: 94,
        uptime: 99.8,
        status: 'OPTIMAL',
        power: 412.5,
        temp: 21.4,
        incidents: 2,
        assets: 'High-Density GPU Cluster, Clean Energy Microgrid, Robotics Prototyping Bay',
      },
      {
        code: 'FAC-02',
        name: 'Rosalind Franklin Bio-Sciences Center',
        type: 'Cleanrooms & Biological Containment',
        location: 'Medical & Bio Hub - Wing C',
        health: 76,
        uptime: 98.4,
        status: 'WARNING',
        power: 285.0,
        temp: 20.1,
        incidents: 4,
        assets: 'Cryo-Storage -80C Freezers, Fume Hood Exhaust Bank, Bio-Safety Autoclaves',
      },
      {
        code: 'FAC-03',
        name: 'Turing Central Computing & Data Center',
        type: 'Mission-Critical Campus Core',
        location: 'Sub-Ground Sector B',
        health: 89,
        uptime: 99.99,
        status: 'OPTIMAL',
        power: 650.0,
        temp: 19.5,
        incidents: 1,
        assets: 'Modular UPS Battery Arrays, Dual CRAC Precision Chillers, Fiber Edge Gateways',
      },
      {
        code: 'FAC-04',
        name: 'Central Energy Substation & Steam Plant',
        type: 'Power Distribution & Cogeneration',
        location: 'South Utility Yard',
        health: 68,
        uptime: 97.2,
        status: 'CRITICAL',
        power: 890.0,
        temp: 31.8,
        incidents: 5,
        assets: 'Step-Down Transformers 33kV, High-Pressure Steam Boilers, Backup Turbines',
      },
      {
        code: 'FAC-05',
        name: 'Newton Academic & Lecture Tower',
        type: 'Classrooms, Auditorium & Laboratories',
        location: 'Central Quadrangle',
        health: 91,
        uptime: 99.5,
        status: 'OPTIMAL',
        power: 195.0,
        temp: 22.0,
        incidents: 1,
        assets: 'High-Speed Traction Elevators, Multi-Zone Variable Air Volume Units (VAV)',
      },
    ];

    const insertFacility = db.prepare(`
      INSERT INTO campus_facilities (facility_code, name, type, location, health_score, uptime_pct, status, power_kw, temp_c, active_incidents, critical_assets)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const f of facilities) {
      insertFacility.run(f.code, f.name, f.type, f.location, f.health, f.uptime, f.status, f.power, f.temp, f.incidents, f.assets);
    }

    // Seed Predictive Maintenance Assets
    const assets = [
      {
        id: 'AST-101',
        facility: 'FAC-02',
        name: 'Cryo-Freezer #3 (-80°C Ultra-Low)',
        cat: 'Refrigeration',
        health: 62,
        mtbf: 120,
        mttr: 3.5,
        risk: 78,
        lastServiced: '2026-08-15',
        action: 'Compressor thermal cycling exceeds baseline standard by 34%. Overhaul secondary expansion valve.',
        prio: 'High',
      },
      {
        id: 'AST-102',
        facility: 'FAC-04',
        name: 'Substation 33kV Step-Down Transformer #2',
        cat: 'Power Distribution',
        health: 55,
        mtbf: 90,
        mttr: 6.0,
        risk: 84,
        lastServiced: '2026-07-10',
        action: 'Dielectric insulation degradation detected. Immediate oil flush and gas chromatography required.',
        prio: 'Critical',
      },
      {
        id: 'AST-103',
        facility: 'FAC-03',
        name: 'Data Center Precision CRAC Unit #1',
        cat: 'HVAC / Environmental',
        health: 74,
        mtbf: 180,
        mttr: 2.0,
        risk: 42,
        lastServiced: '2026-09-01',
        action: 'Dual compressor fan belt tension approaching 9,000h service life limit; swap drive belt.',
        prio: 'Medium',
      },
      {
        id: 'AST-104',
        facility: 'FAC-02',
        name: 'Cleanroom ISO-5 HEPA Air Handling Filter Bank',
        cat: 'Air Filtration',
        health: 66,
        mtbf: 60,
        mttr: 1.5,
        risk: 65,
        lastServiced: '2026-10-05',
        action: 'Differential pressure gauge reading 280 Pa; HEPA filter replacement mandatory.',
        prio: 'High',
      },
      {
        id: 'AST-105',
        facility: 'FAC-05',
        name: 'Newton Tower Passenger Elevator #4 Governor',
        cat: 'Vertical Transport',
        health: 88,
        mtbf: 365,
        mttr: 4.0,
        risk: 29,
        lastServiced: '2026-06-20',
        action: 'Annual statutory safety brake and counterweight drop calibration due.',
        prio: 'Medium',
      },
    ];

    const insertAsset = db.prepare(`
      INSERT INTO preventive_assets (asset_id, facility_code, asset_name, category, health_index, mtbf_days, mttr_hours, failure_risk_pct, last_serviced_at, recommended_action, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const a of assets) {
      insertAsset.run(a.id, a.facility, a.name, a.cat, a.health, a.mtbf, a.mttr, a.risk, a.lastServiced, a.action, a.prio);
    }
  }

  // 3. Seed Emergency Broadcast demo record (inactive)
  const existingBroadcasts = db.prepare('SELECT COUNT(*) as count FROM emergency_broadcasts').get() as { count: number };
  if (existingBroadcasts.count === 0) {
    const adminUser = db.prepare('SELECT user_id FROM users WHERE role = ? LIMIT 1').get('admin') as any;
    if (adminUser) {
      db.prepare(`
        INSERT INTO emergency_broadcasts (title, message, severity, facility_code, created_by, is_active, created_at, cleared_at)
        VALUES (?, ?, 'INFO', 'FAC-04', ?, 0, ?, ?)
      `).run(
        'Central Substation Scheduled Maintenance Window',
        'Routine electrical switchgear testing completed successfully. All campus power circuits nominal.',
        adminUser.user_id,
        new Date(Date.now() - 3600000 * 48).toISOString(),
        new Date(Date.now() - 3600000 * 46).toISOString()
      );
    }
  }

  // 4. Seed initial DLP incident demonstration
  const existingDlp = db.prepare('SELECT COUNT(*) as count FROM dlp_incidents').get() as { count: number };
  if (existingDlp.count === 0) {
    db.prepare(`
      INSERT INTO dlp_incidents (user_id, ticket_id, data_type, original_snippet, redacted_snippet, timestamp, ip_address)
      VALUES (NULL, NULL, 'CREDIT_CARD', 'Card 4532-****-****-9821 submitted in laboratory equipment invoice', 'Card [REDACTED-CREDIT-CARD] submitted in laboratory equipment invoice', ?, '192.168.1.45')
    `).run(new Date(Date.now() - 3600000 * 5).toISOString());
  }

  console.log('[DB] High-level executive and cybersecurity advanced features initialized.');
}
