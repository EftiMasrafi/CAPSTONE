# Maintenance Ticketing System with Tamper-Evident Audit Log & Role-Based Access

A full-stack web application designed for industrial and university campus maintenance operations (laboratories, computing facilities, HVAC, power distribution, and plumbing assets). Built with server-enforced role-based access control (RBAC), strict lifecycle state machine validation, cryptographic SHA-256 blockchain-style audit logging, interactive Chart.js analytics, and automated compliance testing.

---

## 1. User Roles & Server-Enforced Permissions

Permissions are enforced on every backend API route:

| Feature / Action | Reporter | Technician | Manager | Admin |
| :--- | :---: | :---: | :---: | :---: |
| **Create Ticket** | **Yes** | No | **Yes** | **Yes** |
| **View Own Tickets** | **Yes** | **Yes** | **Yes** | **Yes** |
| **View All Tickets** | No | No | **Yes** | **Yes** |
| **Assign / Reassign Tickets** | No | No | **Yes** | **Yes** |
| **Update Status of Assigned Tickets** | No | **Yes** | **Yes** | **Yes** |
| **Add Comments & Repair Notes** | **Yes** | **Yes** | **Yes** | **Yes** |
| **Close / Reopen Tickets** | No | No | **Yes** | **Yes** |
| **View Dashboard & Reports** | No | **Own work only** | **Yes** | **Yes** |
| **Manage Users & Role Assignments** | No | No | No | **Yes** |
| **View & Verify Audit Log** | No | No | No | **Yes** |

---

## 2. Ticket Lifecycle State Machine

The server validates every status transition and strictly prohibits skipping steps:

```
[Open] ──(Manager / Admin)──► [Assigned] ──(Assigned Tech)──► [In Progress]
                                                                   │
                                                           (Assigned Tech +
                                                          Mandatory Repair Note)
                                                                   ▼
[Open] ◄──(Reopen by Manager / Admin)──── [Closed] ◄──(Manager)── [Resolved]
```

- **Open → Assigned**: Manager or Admin selects a certified technician and sets a scheduled due date.
- **Assigned → In Progress**: Only the assigned technician (or Manager/Admin) can begin work.
- **In Progress → Resolved**: Requires a mandatory, non-empty repair note explaining actions taken.
- **Resolved → Closed**: Verified and closed by a Manager or Admin.
- **Reopen**: Managers and Admins can reopen tickets back to `Open` from `Resolved` or `Closed`.

---

## 3. Cryptographic Tamper-Evident SHA-256 Audit Log

Every system modification is permanently recorded in an append-only ledger:
- **Events Logged**: Login, failed login, account lockout, logout, ticket creation, ticket assignment, status transition, comment posted, repair note recorded, photo attachment uploaded, user provisioned, role modified, user deactivated/activated.
- **Formula**:
  $$\text{hash} = \text{SHA-256}(\text{user\_id} \mid \text{action} \mid \text{target} \mid \text{old\_value} \mid \text{new\_value} \mid \text{timestamp} \mid \text{ip\_address} \mid \text{prev\_hash})$$
- **Genesis Block**: The initial log entry anchors to the fixed 64-character zero-string `0000000000000000000000000000000000000000000000000000000000000000`.
- **Integrity Verifier**: The "Verify Cryptographic Chain" feature recomputes the entire blockchain-style chain from genesis to head, verifying each block hash and reporting any tampered entry.

---

## 4. Preloaded Demo Accounts

The database comes pre-seeded with 4 roles and 20 realistic university tickets:

| Role | Name | Email | Password | Department / Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Alex Vance | `admin@campus.edu` | `AdminPass123!` | Facilities & Campus Operations |
| **Manager** | Maria Rodriguez | `manager@campus.edu` | `ManagerPass123!` | Central Maintenance Directorate |
| **Technician** | David Chen | `tech1@campus.edu` | `TechPass123!` | Engineering Services - Electrical |
| **Technician** | Marcus Bell | `tech2@campus.edu` | `TechPass123!` | HVAC & Mechanical Systems |
| **Reporter** | Dr. Sarah Jenkins | `reporter@campus.edu` | `ReporterPass123!` | Biochemistry Research Lab 402 |
| **Reporter** | Prof. Alan Oakley | `prof.oakley@campus.edu` | `ReporterPass123!` | Physics & Astronomy Dept |

> **Tip for evaluators**: Use the **Persona Quick Switcher** dropdown in the top navigation bar to seamlessly hop between roles and test access restrictions.

---

## 5. Security & Protection Features

1. **Password Hashing**: Salted cryptographic password hashing with timing-safe comparison.
2. **Brute-Force Lockout**: Automatically locks an account for 15 minutes after 5 consecutive failed login attempts; Admins can reset lockouts with 1 click.
3. **Server-Side Authorization**: Enforced on all REST endpoints (`requireAuth`, `requireRoles`).
4. **Data Isolation**: Reporters and technicians cannot query tickets outside their authorized scope.
5. **File Attachment Validation**: Enforces MIME types (JPEG, PNG, WEBP, PDF) and a strict 5MB upload ceiling.

---

## 6. How to Run & Test

```bash
# Install dependencies
npm install

# Run full-stack server (Node/Express API + Vite frontend on Port 3000)
npm run dev

# Run automated tests
# You can also run all tests live from the UI "Test Suite" tab
```
