import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { initDb } from './server/db.js';
import { apiRouter } from './server/routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Increase payload limit for base64 photo attachments
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize SQLite database and seed initial data
initDb();

// Security Perimeter Middleware: IP Firewall & Security Headers
import { isIpBanned, inspectRequestWaf, banIpAddress } from './server/cybersecurity.js';

// Honeypot Canary Traps (catches automated scanners)
app.all(['/wp-admin*', '/.env', '/api/security/honeypot', '/id_rsa'], (req, res) => {
  const ip = String(req.ip || req.socket.remoteAddress || '127.0.0.1');
  banIpAddress(ip, `Canary Trap: Automated intrusion attempt against decoy ${req.originalUrl}`, 1);
  res.status(403).json({
    error: 'SECURITY HONEYPOT TRIGGERED: Intrusion scan detected. Offending IP address quarantined.',
    ip_address: ip,
    action: 'IMMEDIATE_QUARANTINE',
  });
});

app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  const ip = String(req.ip || req.socket.remoteAddress || '127.0.0.1');

  // Check IP firewall blacklist for API routes
  if (req.path.startsWith('/api') && isIpBanned(ip)) {
    res.status(403).json({
      error: 'ACCESS FORBIDDEN: Your IP address has been blacklisted by the University Cyber Defense Firewall.',
      ip_address: ip,
      firewall_action: 'DROP_CONNECTION',
    });
    return;
  }

  // Next-Gen WAF Deep Packet Inspection
  if (req.path.startsWith('/api') && !req.path.startsWith('/api/security') && !req.path.startsWith('/api/tests')) {
    const payloadStr = JSON.stringify(req.body || {}) + ' ' + JSON.stringify(req.query || {});
    const wafResult = inspectRequestWaf(req.path, req.method, payloadStr, ip);
    if (wafResult.blocked) {
      res.status(403).json({
        error: wafResult.reason,
        rule_name: wafResult.ruleName,
        category: wafResult.category,
        action: 'PACKET_BLOCKED',
      });
      return;
    }
  }

  next();
});

// Mount REST API
app.use('/api', apiRouter);

// Set up Vite middleware for development or serve dist in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Maintenance Ticketing System running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SERVER ERROR]', err);
  process.exit(1);
});
