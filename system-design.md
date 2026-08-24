# System Design Document

## 1. System Architecture

The **Society Maintenance Tracker** is built as a unified, full-stack Next.js application using TypeScript. The presentation layer utilizes React Server Components and Tailwind CSS with glassmorphism UI design. Authentication and identity management are powered by Auth.js (NextAuth v5) using JWT session tokens, eliminating server-side session memory overhead. Data persistence is managed via Prisma ORM connected to PostgreSQL (Neon in production, Docker Compose locally). Transactional email dispatch is decoupled using Resend, while media storage supports Cloudinary with local storage fallback.

```
+-----------------------------------------------------------------------+
|                             CLIENT / BROWSER                           |
|       Resident Dashboard  |  Admin Dashboard  |  Notice Board          |
+-----------------------------------------------------------------------+
                                   | HTTP / REST
                                   v
+-----------------------------------------------------------------------+
|                         NEXT.JS APP ROUTER ENGINE                     |
|  [Middleware RBAC] -> [API Route Handlers] -> [Zod Input Validation]   |
+-----------------------------------------------------------------------+
           |                              |                       |
           v                              v                       v
+-----------------------+     +-----------------------+     +---------------+
|   PRISMA ORM / PG     |     |   RESEND EMAIL API    |     |  CLOUDINARY   |
| (Transactions & DB)   |     | (Non-blocking Queue)  |     | (Photo Hosting|
+-----------------------+     +-----------------------+     +---------------+
```

---

## 2. Immutable Complaint History & Audit Model

To ensure complete accountability, complaint status modifications are stored using an immutable audit trail. Rather than overwriting a status field in place, status updates execute inside an atomic Prisma database transaction (`prisma.$transaction`).

```
[Resident creates complaint] ---> status: OPEN ---> inserts initial ComplaintStatusHistory
                                                          |
[Admin updates status] -------> status: IN_PROGRESS ---> inserts ComplaintStatusHistory (with note)
                                                          |
[Admin resolves complaint] ---> status: RESOLVED ----> inserts ComplaintStatusHistory (read-only)
```

1. **Atomicity**: The `Complaint` record update and `ComplaintStatusHistory` creation succeed or fail together.
2. **Immutability**: Historical records are never updated or deleted.
3. **Lifecycle Control**: Once a complaint reaches `RESOLVED` or `CLOSED`, state transitions are locked at the API handler level, returning `400 Bad Request` if reopening is attempted.

---

## 3. Real-Time Overdue Detection Logic

Instead of relying on background cron daemons or scheduled polling scripts, overdue calculation is computed dynamically at query execution time:

$$\text{IsOverdue} = (\text{Status} \notin \{\text{RESOLVED}, \text{CLOSED}\}) \land (\text{AgeInDays} \ge \text{OverdueThresholdDays})$$

- **Configurable Threshold**: Stored in the `Settings` table (`overdueThresholdDays`, default `3` days). Admin can adjust this value dynamically via `/api/settings`.
- **Query Pipeline**: During `GET /api/complaints`, complaint age is calculated via `(Date.now() - createdAt) / (1000 * 60 * 60 * 24)`.
- **Dashboard Priority**: Overdue complaints are dynamically sorted to the top of the Admin dashboard view and flagged with an **OVERDUE** badge.

---

## 4. Multi-Tier Photo Upload Strategy

Media uploads submitted via `POST /api/upload` undergo strict server-side validation before storage:

1. **Validation Layer**: Validates file MIME type (`image/jpeg`, `image/png`, `image/webp`, `image/gif`) and enforces a maximum file size limit of $5\text{MB}$.
2. **Production Mode (Cloudinary)**: If `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` are configured, the server uploads the file directly to Cloudinary and returns a CDN HTTPS URL.
3. **Development Mode (Local Fallback)**: In local environments lacking Cloudinary credentials, the file is written to `public/uploads/` using a unique timestamped filename, returning a relative static path `/uploads/...`.

---

## 5. Non-Blocking Event Notification Engine

System notifications (complaint updates and important society notices) execute asynchronously after database operations conclude:

1. **Transaction Isolation**: Database operations (`prisma.$transaction`) complete cleanly first.
2. **Error Boundary Wrapping**: Resend email functions are wrapped in explicit `try/catch` blocks.
3. **Resilience**: If email dispatch fails (e.g., API rate limit or invalid address), the error is logged to standard error output without aborting the HTTP response or rolling back the database transaction.

---

## 6. Security & Role-Based Access Control (RBAC)

- **JWT Session Payload**: User role (`RESIDENT` or `ADMIN`) is signed within the NextAuth v5 JWT cookie.
- **Middleware Guarding**: `middleware.ts` intercepts requests, blocking unauthorized users from `/admin/*` routes.
- **Data Boundary Protection**: `GET /api/complaints/[id]` verifies `complaint.residentId === session.user.id` or `session.user.role === 'ADMIN'`, returning `403 Forbidden` for unauthorized attempts.
