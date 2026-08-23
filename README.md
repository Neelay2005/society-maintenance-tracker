# Society Maintenance Tracker

A modern web platform for apartment societies to manage maintenance complaints end-to-end. Residents can raise complaints with photos, track progress in real time with an immutable status history timeline, and view society-wide notices. Admins manage the complaint lifecycle — setting priorities, updating statuses inside atomic database transactions, monitoring overdue SLA metrics with interactive Recharts analytics, and broadcasting Resend email notifications.

---

## 🚀 Tech Stack

- **Framework**: Next.js 14+ (App Router, Server Actions & API Routes)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & Modern Dark Mode Glassmorphism
- **Database**: PostgreSQL
- **ORM**: Prisma ORM
- **Authentication**: Auth.js / NextAuth v5 (Credentials Provider, JWT Session with Role Management)
- **Password Hashing**: `bcryptjs`
- **Validation**: Zod (Client-side & Server-side API validation)
- **Charts / Analytics**: Recharts
- **Photo Storage**: Cloudinary (Production Photo Storage URLs) & Local Fallback
- **Email Service**: Resend

---

## 🗄️ Database Design & ER Diagram

```mermaid
erDiagram
    USER ||--o{ COMPLAINT : "raises"
    USER ||--o{ COMPLAINT_STATUS_HISTORY : "changes status"
    USER ||--o{ NOTICE : "creates"
    USER ||--o{ SETTINGS : "updates"
    COMPLAINT ||--o{ COMPLAINT_STATUS_HISTORY : "has history"

    USER {
        string id PK
        string name
        string email UK
        string password
        enum role "RESIDENT | ADMIN"
        string unitNumber
        string phone
        datetime createdAt
        datetime updatedAt
    }

    COMPLAINT {
        string id PK
        string title
        string description
        enum category "PLUMBING | ELECTRICAL | CLEANING | SECURITY | NOISE | MAINTENANCE | OTHER"
        enum priority "LOW | MEDIUM | HIGH"
        enum status "OPEN | IN_PROGRESS | RESOLVED | CLOSED"
        string photoUrl
        string residentId FK
        datetime createdAt
        datetime updatedAt
    }

    COMPLAINT_STATUS_HISTORY {
        string id PK
        string complaintId FK
        string changedById FK
        enum previousStatus
        enum newStatus
        string notes
        datetime createdAt
    }

    NOTICE {
        string id PK
        string title
        string content
        boolean isImportant
        boolean isPinned
        string createdById FK
        datetime createdAt
        datetime updatedAt
    }

    SETTINGS {
        string id PK
        int overdueThresholdDays
        string updatedById FK
        datetime createdAt
        datetime updatedAt
    }
```

---

## 🛠️ Local Setup & Getting Started

### 1. Prerequisites
- Node.js v18+ & npm
- PostgreSQL database (or Docker Compose)

### 2. Docker Database Setup
Start a local PostgreSQL database container:
```bash
docker compose up -d
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Setup (`prisma db push` & `prisma seed`)
Apply the Prisma schema to PostgreSQL and seed initial default users:
```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```
- `npx prisma db push`: Synchronizes the database schema directly with `prisma/schema.prisma`.
- `npx prisma db seed`: Executes `prisma/seed.ts` to populate the database with default Admin and Resident accounts.

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Environment Variables

Create a `.env` file in the root directory:

```env
# Database Connection
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/society_maintenance?schema=public"

# Auth.js / NextAuth Secrets & URL
AUTH_SECRET="society-maintenance-tracker-secret-key-32-chars-long!"
NEXTAUTH_URL="http://localhost:3000"

# Production Photo Storage (Cloudinary)
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

# Email Notifications (Resend)
RESEND_API_KEY="re_123456789_your_resend_api_key"
EMAIL_FROM="Society Tracker <onboarding@resend.dev>"
```

### Environment Variables Explanation:
- **`DATABASE_URL`**: Connection URI for PostgreSQL database.
- **`AUTH_SECRET`**: Cryptographic secret key used by NextAuth v5 to sign and encrypt JWT session cookies.
- **`NEXTAUTH_URL`**: Base URL of the web application used for authentication callbacks and email links.
- **`CLOUDINARY_CLOUD_NAME`**: Cloudinary account cloud name for production photo hosting.
- **`CLOUDINARY_API_KEY`**: Cloudinary API key for secure file uploads.
- **`CLOUDINARY_API_SECRET`**: Cloudinary API secret key.
- **`RESEND_API_KEY`**: API key for dispatching transactional email notifications via Resend.
- **`EMAIL_FROM`**: Verified email address identity for outgoing system notifications.

---

## 🔐 Test / Demo Credentials

Seeded demo credentials for testing and evaluation:

| Role | Email | Password | Access Rights & Features |
| --- | --- | --- | --- |
| **Admin** | `admin@society.com` | `Admin@123456` | Full Admin Desk, Complaint status & priority management, Overdue SLA settings, Notice CRUD, Recharts analytics |
| **Resident** | `resident@society.com` | `Resident@123456` | Resident Portal, Raise new complaints with photo attachments, View personal status timeline, Read society notice board |

---

## 📡 API Documentation

| Method | Endpoint | Purpose | Authorization |
| --- | --- | --- | --- |
| `POST` | `/api/complaints` | Create a complaint & initial history entry inside a Prisma transaction | Resident |
| `GET` | `/api/complaints/mine` | Fetch logged-in resident's complaints with full status history | Resident |
| `GET` | `/api/complaints/:id` | Fetch single complaint details & audit timeline (Strict privacy check) | Resident (Owner) / Admin |
| `GET` | `/api/complaints` | Fetch all complaints with bookmarkable URL query parameters (`status`, `category`, `priority`) | Admin |
| `PATCH` | `/api/complaints/:id/status` | Update complaint status & priority (Prisma transaction + Resend email notification) | Admin |
| `GET` | `/api/notices` | Fetch society notices sorted by `isImportant DESC`, `createdAt DESC` | Authenticated |
| `POST` | `/api/notices` | Create notice (Triggers email broadcast to residents if marked `isImportant`) | Admin |
| `PATCH` | `/api/notices/:id` | Update existing society notice | Admin |
| `DELETE` | `/api/notices/:id` | Delete society notice | Admin |
| `GET` | `/api/settings` | Fetch overdue threshold settings | Authenticated |
| `PATCH` | `/api/settings` | Update `overdueThresholdDays` setting in DB | Admin |
| `GET` | `/api/admin/analytics` | Fetch database aggregated category and status metrics for Recharts | Admin |
| `POST` | `/api/upload` | Server-validated photo upload (Cloudinary in prod, Local fallback in dev) | Authenticated |

---

## 🏛️ System Design Write-Up (Word Count: ≤800 words)

### 1. Architecture
The system is built on Next.js 14 App Router using TypeScript. Server Actions and API Routes communicate with PostgreSQL via Prisma ORM. The interface features a dark-mode glassmorphic design system built using Tailwind CSS and Lucide icons.

### 2. Authentication
Authentication is implemented via Auth.js (NextAuth v5) using a JWT session strategy and Credentials Provider. Passwords are hashed with `bcryptjs`. JWT tokens securely convey `userId`, `role`, and `unitNumber` without maintaining server session state.

### 3. Database Design & Immutable Audit History
Data models include `User`, `Complaint`, `ComplaintStatusHistory`, `Notice`, and `Settings`. Status changes are never recorded merely as mutable string fields; every status transition inserts a immutable record into `ComplaintStatusHistory` inside an atomic Prisma `$transaction`.

### 4. Authorization & Security
Role-based authorization (RBAC) enforces strict boundaries:
- **Resident Role**: Residents can only create complaints and read their own complaints (`GET /api/complaints/:id` returns `403 Forbidden` if a resident attempts to access another resident's complaint).
- **Admin Role**: Admins possess full access to manage complaints across all residents, update priorities, adjust overdue threshold settings, post notices, and view society-wide analytics.

### 5. Overdue Calculation
Overdue status is calculated dynamically at query/response time: `Age in Days >= overdueThresholdDays` and `Status NOT IN (RESOLVED, CLOSED)`. No cron jobs or polling daemons are required. Overdue complaints automatically sort at the top of the Admin dashboard.

### 6. Photo Storage
Photos submitted via `POST /api/upload` undergo server-side validation for MIME type (JPEG/PNG/WEBP/GIF) and file size ($\le 5\text{MB}$). Uploads return a `photoUrl` string (Cloudinary in production, local `/uploads/` directory in development). Database models store only the image URL string.

### 7. Non-Blocking Email Notifications
Transactional emails are handled by Resend. Email triggers execute in a non-blocking `try/catch` block *after* database transactions succeed. If email dispatch fails, the error is logged without failing the HTTP response or rolling back database state.

### 8. Deployment
The application is stateless and designed for Vercel deployment with managed PostgreSQL (Neon/Supabase) and Cloudinary media hosting.

---

## 📝 Phase Architectural Decisions & Notes

- **Phase 0 — Setup & Planning**: Defined Prisma schema with separate `ComplaintStatusHistory` table for immutable audit tracking. Configured Docker Compose for reproducible local PostgreSQL development.
- **Phase 1 — Foundation (Auth + Database)**: Selected NextAuth v5 JWT session strategy to eliminate server memory state. Implemented Zod validation schemas and seeded initial admin/resident test credentials via `npx prisma db seed`.
- **Phase 2 — Complaints Core (Resident Side)**: Enforced server-side photo MIME & size validation. Wrapped complaint creation and initial status history inside a single `prisma.$transaction`. Enforced strict owner authorization on complaint detail routes.
- **Phase 3 — Admin Complaint Workflow**: Implemented bookmarkable URL query parameters (`?status=open&category=plumbing`). Enforced status transition rules to block modifications on resolved complaints.
- **Phase 4 — Overdue Detection + Settings**: Stored overdue threshold in DB `Settings` table. Implemented real-time query overdue calculation and priority sorting to display overdue items first.
- **Phase 5 — Notice Board**: Implemented priority sorting (`isImportant DESC`, `createdAt DESC`). Enforced admin-only CRUD actions and resident read-only permissions.
- **Phase 6 — Email Notifications**: Isolated Resend helpers in `src/lib/email.ts`. Wrapped email dispatchers in non-blocking try/catch blocks following database transactions.
- **Phase 7 — Admin Dashboard & Analytics**: Implemented Prisma `groupBy` database aggregations in `/api/admin/analytics`. Rendered category BarChart and status PieChart via Recharts.
- **Phase 8 — Testing, Documentation & Deployment**: Created `.env.example` documenting all secrets. Verified clean Next.js build compilation and pushed final repository changes to GitHub.
