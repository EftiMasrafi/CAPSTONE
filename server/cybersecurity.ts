import crypto from 'crypto';
import { db, logAuditEvent } from './db';

// ==========================================
// 1. RFC 6238 TOTP ENGINE (Zero External Dependencies)
// ==========================================

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateBase32Secret(length = 20): string {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    result += BASE32_ALPHABET[bytes[i] % 32];
  }
  return result;
}

function base32Decode(base32: string): Buffer {
  const cleaned = base32.toUpperCase().replace(/=+$/, '');
  let bits = '';
  for (let i = 0; i < cleaned.length; i++) {
    const val = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateTotpCode(secret: string, timeStepWindow = 0): string {
  const timeStep = Math.floor(Date.now() / 1000 / 30) + timeStepWindow;
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(timeStep));

  const keyBuffer = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', keyBuffer).update(timeBuffer).digest();

  // Dynamic truncation as per RFC 4226
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

export function verifyTotpCode(secret: string, code: string): boolean {
  if (!code || code.length !== 6) return false;
  // Allow ±1 time step tolerance (prev 30s, current 30s, next 30s)
  for (let window = -1; window <= 1; window++) {
    if (generateTotpCode(secret, window) === code) {
      return true;
    }
  }
  return false;
}

export function generateRecoveryCodes(count = 6): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const p1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const p2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    codes.push(`${p1}-${p2}`);
  }
  return codes;
}

// ==========================================
// 2. ATTACHMENT MALWARE & MAGIC-BYTE SCANNER
// ==========================================

export interface ScanResult {
  isClean: boolean;
  detectedMime: string;
  sha256Hash: string;
  threatDetails?: string;
}

export function scanAttachmentPayload(base64Data: string, originalFileName: string): ScanResult {
  // Strip data URL scheme if present
  const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const buffer = Buffer.from(base64Content, 'base64');

  // 1. Calculate SHA-256 Checksum for forensics
  const sha256Hash = crypto.createHash('sha256').update(buffer).digest('hex');

  // 2. Magic byte verification
  // JPEG: FF D8 FF
  // PNG: 89 50 4E 47
  // WEBP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
  // PDF: 25 50 44 46 (%PDF)
  // Windows EXE / DLL: 4D 5A (MZ)
  // Linux ELF: 7F 45 4C 46 (.ELF)
  const hexHeader = buffer.subarray(0, 8).toString('hex').toLowerCase();

  // Executable Detection
  if (hexHeader.startsWith('4d5a')) {
    return {
      isClean: false,
      detectedMime: 'application/x-msdownload',
      sha256Hash,
      threatDetails: 'Malware signature detected: Windows PE Executable (MZ header) disguised as media.',
    };
  }

  if (hexHeader.startsWith('7f454c46')) {
    return {
      isClean: false,
      detectedMime: 'application/x-executable',
      sha256Hash,
      threatDetails: 'Malware signature detected: Linux ELF Binary executable.',
    };
  }

  // Script Injection / Polyglot Check
  const textSample = buffer.subarray(0, 1024).toString('utf-8').toLowerCase();
  if (textSample.includes('<script') || textSample.includes('<?php') || textSample.includes('#!/bin/bash')) {
    return {
      isClean: false,
      detectedMime: 'text/html-script',
      sha256Hash,
      threatDetails: 'Polyglot payload detected: Embedded script tags found in file header.',
    };
  }

  let detectedMime = 'application/octet-stream';
  if (hexHeader.startsWith('ffd8ff')) {
    detectedMime = 'image/jpeg';
  } else if (hexHeader.startsWith('89504e47')) {
    detectedMime = 'image/png';
  } else if (hexHeader.startsWith('52494646')) {
    detectedMime = 'image/webp';
  } else if (hexHeader.startsWith('25504446')) {
    detectedMime = 'application/pdf';
  }

  return {
    isClean: true,
    detectedMime,
    sha256Hash,
  };
}

// ==========================================
// 3. CRYPTOGRAPHIC DIGITAL SIGNATURES
// ==========================================

export function computeDigitalSignature(
  ticketId: number,
  userId: number,
  action: string,
  timestamp: string,
  secretKey: string = 'campus-facility-digital-signature-key-2026'
): string {
  const payload = `TICKET_VERIFIED|${ticketId}|${userId}|${action}|${timestamp}`;
  return crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
}

// ==========================================
// 4. SECURITY LOGGING & THREAT MONITORING
// ==========================================

export function recordSecurityEvent(
  eventType: string,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  ipAddress: string,
  details: string
) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO security_events (event_type, severity, ip_address, details, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(eventType, severity, ipAddress, details, now);

  logAuditEvent(
    null,
    `SECURITY_ALERT_${eventType}`,
    `IP ${ipAddress}`,
    null,
    `[${severity}] ${details}`,
    ipAddress
  );
}

export function isIpBanned(ipAddress: string): boolean {
  const banned = db.prepare('SELECT ip_address FROM banned_ips WHERE ip_address = ?').get(ipAddress);
  return Boolean(banned);
}

export function banIpAddress(ipAddress: string, reason: string, adminUserId: number) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR REPLACE INTO banned_ips (ip_address, reason, banned_at, banned_by)
    VALUES (?, ?, ?, ?)
  `).run(ipAddress, reason, now, adminUserId);

  recordSecurityEvent('IP_BANNED', 'HIGH', ipAddress, `Firewall rule enacted: ${reason}`);
}

export function unbanIpAddress(ipAddress: string) {
  db.prepare('DELETE FROM banned_ips WHERE ip_address = ?').run(ipAddress);
  recordSecurityEvent('IP_UNBANNED', 'LOW', ipAddress, 'Firewall ban removed by administrator');
}
