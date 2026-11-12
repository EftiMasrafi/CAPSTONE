import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db, hashPassword, verifyPassword, logAuditEvent } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'maintenance-ticketing-system-super-secret-key-2026';
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export interface AuthenticatedUser {
  user_id: number;
  name: string;
  email: string;
  role: 'reporter' | 'technician' | 'manager' | 'admin';
  department: string;
  is_active: number;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Generate HMAC-SHA256 signed session token
 */
export function createSessionToken(user: AuthenticatedUser): string {
  const payload = {
    user_id: user.user_id,
    email: user.email,
    role: user.role,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payloadStr).digest('base64url');
  return `${payloadStr}.${signature}`;
}

/**
 * Verify HMAC-SHA256 signed session token
 */
export function verifySessionToken(token: string): { user_id: number; email: string; role: string } | null {
  try {
    const [payloadStr, signature] = token.split('.');
    if (!payloadStr || !signature) return null;

    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(payloadStr).digest('base64url');
    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8'));
    if (Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Express Middleware: Require Authentication
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const token = authHeader.substring(7);
  const tokenData = verifySessionToken(token);

  if (!tokenData) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }

  const user = db
    .prepare('SELECT user_id, name, email, role, department, is_active FROM users WHERE user_id = ?')
    .get(tokenData.user_id) as AuthenticatedUser | undefined;

  if (!user) {
    res.status(401).json({ error: 'User account not found.' });
    return;
  }

  if (!user.is_active) {
    res.status(403).json({ error: 'Your account has been deactivated by an administrator.' });
    return;
  }

  req.user = user;
  next();
}

/**
 * Express Middleware: Require Specific Role(s)
 */
export function requireRoles(allowedRoles: Array<'reporter' | 'technician' | 'manager' | 'admin'>) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Role "${req.user.role}" does not have permission for this action. Allowed: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
}

/**
 * Process Login with Lockout Handling
 */
export function handleLogin(email: string, password: string, ipAddress: string = '127.0.0.1') {
  const user = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email.toLowerCase().trim()) as any;

  if (!user) {
    logAuditEvent(null, 'FAILED_LOGIN', email, null, 'User email not found', ipAddress);
    return { success: false, error: 'Invalid email or password.' };
  }

  // Check lockout
  if (user.locked_until) {
    const lockedTime = new Date(user.locked_until).getTime();
    if (Date.now() < lockedTime) {
      const remainingMin = Math.ceil((lockedTime - Date.now()) / (60 * 1000));
      return {
        success: false,
        error: `Account is temporarily locked due to repeated failed logins. Please try again in ${remainingMin} minute(s).`,
      };
    } else {
      // Lockout expired, reset failed attempts
      db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE user_id = ?').run(user.user_id);
      user.failed_attempts = 0;
    }
  }

  if (!user.is_active) {
    return { success: false, error: 'Account has been deactivated. Please contact an administrator.' };
  }

  const passwordMatches = verifyPassword(password, user.password_hash);

  if (!passwordMatches) {
    const newFailed = (user.failed_attempts || 0) + 1;
    let lockedUntil: string | null = null;
    let errorMsg = 'Invalid email or password.';

    if (newFailed >= LOCKOUT_THRESHOLD) {
      lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString();
      errorMsg = `Account locked for ${LOCKOUT_DURATION_MINUTES} minutes due to ${LOCKOUT_THRESHOLD} consecutive failed login attempts.`;
      db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE user_id = ?').run(
        newFailed,
        lockedUntil,
        user.user_id
      );
      logAuditEvent(user.user_id, 'ACCOUNT_LOCKED', `User #${user.user_id}`, `${newFailed} failed attempts`, `Locked until ${lockedUntil}`, ipAddress);
    } else {
      db.prepare('UPDATE users SET failed_attempts = ? WHERE user_id = ?').run(newFailed, user.user_id);
      logAuditEvent(user.user_id, 'FAILED_LOGIN', `User #${user.user_id}`, null, `Attempt ${newFailed}/${LOCKOUT_THRESHOLD}`, ipAddress);
    }

    return { success: false, error: errorMsg, remainingAttempts: Math.max(0, LOCKOUT_THRESHOLD - newFailed) };
  }

  // Success: reset failed attempts
  db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE user_id = ?').run(user.user_id);

  const authUser: AuthenticatedUser = {
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    is_active: user.is_active,
  };

  const token = createSessionToken(authUser);
  logAuditEvent(user.user_id, 'LOGIN', `User #${user.user_id}`, null, 'Successful session established', ipAddress);

  return { success: true, token, user: authUser };
}
