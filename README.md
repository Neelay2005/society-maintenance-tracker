# Society Maintenance Tracker

A modern web platform for apartment societies to manage maintenance complaints end-to-end. 
Residents can raise complaints with photos and track their status in real time, while 
admins manage the complaint lifecycle through a structured workflow — setting priorities, 
updating statuses, and flagging overdue issues. The platform also includes a notice board 
for society-wide announcements and sends email updates to residents on status changes and 
important notices.

---

## 🚀 Tech Stack

- **Frontend & Backend**: Next.js 14+ (App Router, Server Actions, API Routes)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & Glassmorphism Aesthetics
- **Database**: PostgreSQL
- **ORM**: Prisma ORM
- **Authentication**: Auth.js / NextAuth v5 (Credentials Provider, JWT Session with Role Management)
- **Password Hashing**: bcryptjs
- **Validation**: Zod (Server-side & API validation)
- **Charts / Analytics**: Recharts
- **Storage**: Cloudinary (Production Photo Storage URLs)
- **Email Notifications**: Resend

---

## 🗄️ Database Design & ER Diagram

The database uses PostgreSQL managed via Prisma. 

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
        enum category "PLUMBING | ELECTRICAL | ELEVATOR | SECURITY | CLEANLINESS | OTHER"
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

### Key Architectural Decisions
1. **ComplaintStatusHistory**: Stored in a separate table (`ComplaintStatusHistory`), never as a JSON string, providing immutable audit records.
2. **Photos**: Stored as external photo URLs (e.g. Cloudinary), not database blobs.
3. **Settings**: Configurable overdue threshold days (`overdueThresholdDays`), updated by Admins.
4. **Timestamps**: Every primary model includes `createdAt` and `updatedAt`.
5. **Admin Seed**: Admin accounts are created strictly via `npx prisma db seed`. There is no public admin registration form.

---

## 🔑 Environment Variables Structure

Create a `.env` file in the root directory:

```env
# Database Connection
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/society_maintenance?schema=public"

# Auth.js Secrets & URL
AUTH_SECRET="society-maintenance-tracker-secret-key-32-chars-long!"
NEXTAUTH_URL="http://localhost:3000"

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# Resend Email Service
RESEND_API_KEY=""
```

---

## 🛠️ Getting Started

### 1. Local Database Setup (Docker)
Start local PostgreSQL database:
```bash
docker compose up -d
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Migration & Seed
Run Prisma migrations and seed the initial Admin user:
```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

**Default Admin Credentials (Seeded):**
- **Email:** `admin@society.com`
- **Password:** `Admin@123456`

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Security & Authorization Policies

- **RESIDENT Role**:
  - ✓ Register and login
  - ✓ View own complaints and status timeline
  - ✓ Create complaints
  - ✗ Cannot view other residents' complaints
  - ✗ Cannot change complaint status
  - ✗ Cannot create notices or change settings

- **ADMIN Role**:
  - ✓ Login via seeded admin credentials
  - ✓ View all complaints across society
  - ✓ Update complaint status with timestamped audit notes
  - ✓ Flag overdue complaints automatically based on threshold
  - ✓ Post society notices & update overdue threshold settings

---

## 📊 Status
- ✅ **Phase 0 — Setup & Planning**: Architecture locked, PostgreSQL/Prisma ER diagram finalized, Docker Compose, Env structure & README completed.
- ✅ **Phase 1 — Foundation (Auth + Database)**: Next.js + Auth.js v5 + Bcrypt + Zod + Prisma models + Admin seed + Role Authorization implemented.
