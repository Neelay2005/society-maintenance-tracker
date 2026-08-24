# Production Deployment Guide

This guide provides step-by-step instructions for deploying the **Society Maintenance Tracker** to cloud infrastructure.

---

## 1. Database Deployment (Neon / Supabase PostgreSQL)

### Step 1: Create PostgreSQL Database
1. Sign up or log into [Neon](https://neon.tech) or [Supabase](https://supabase.com).
2. Create a new PostgreSQL database named `society_maintenance`.
3. Copy the pooled Connection String URI (`postgresql://neondb_owner:...@ep-....tech/neondb?sslmode=require`).

### Step 2: Push Schema & Seed Initial Accounts
From your local terminal:
```bash
# Set temporary DATABASE_URL or pass directly in command
npx prisma db push
npx tsx prisma/seed.ts
```
*Note: This creates all tables (`User`, `Complaint`, `ComplaintStatusHistory`, `Notice`, `Settings`) and seeds default Admin and Resident accounts.*

---

## 2. Frontend & API Deployment (Vercel)

### Step 1: Push Code to GitHub
Ensure your latest codebase is pushed to your main branch on GitHub:
```bash
git add .
git commit -m "Ready for production deploy"
git push origin main
```

### Step 2: Import Project to Vercel
1. Log into [Vercel](https://vercel.com).
2. Click **Add New** $\rightarrow$ **Project**.
3. Select your repository `society-maintenance-tracker`.
4. Framework Preset: **Next.js**.

### Step 3: Configure Production Environment Variables
In the Vercel **Environment Variables** panel, add:

| Key | Value Description | Example |
| --- | --- | --- |
| `DATABASE_URL` | Live PostgreSQL connection URI from Neon/Supabase | `postgresql://user:pass@ep-pooler.tech/neondb?sslmode=require` |
| `AUTH_SECRET` | 32+ byte random base64 string (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`) | `Iddzp2s8w+A32+D+j6UqOn7q588L5HEKRyy2ryNZs3E=` |
| `NEXTAUTH_URL` | Production URL of your app | `https://your-app.vercel.app` |
| `CLOUDINARY_CLOUD_NAME` | *(Optional)* Cloudinary account cloud name | `my_cloud` |
| `CLOUDINARY_API_KEY` | *(Optional)* Cloudinary API key | `1234567890` |
| `CLOUDINARY_API_SECRET` | *(Optional)* Cloudinary API secret | `abcdef12345` |
| `RESEND_API_KEY` | *(Optional)* Resend API Key for live email dispatch | `re_123456789_key` |
| `EMAIL_FROM` | *(Optional)* Verified sender email | `Society Tracker <onboarding@resend.dev>` |

### Step 4: Deploy
Click **Deploy**. Vercel will run `npm install`, execute `prisma generate` during `postinstall`, compile Next.js static and dynamic pages, and provide a live production URL.

---

## 3. Alternative Deployment (Railway / Render)

If deploying to **Railway** or **Render**:
1. Connect your GitHub repository.
2. Build Command: `npm run build` (`prisma generate && next build --webpack`).
3. Start Command: `npm run start`.
4. Add all environment variables listed above.

---

## 4. Post-Deployment Health Verification

After deployment succeeds:
1. Navigate to `https://your-app.vercel.app/login`.
2. Test Login with Admin Credentials:
   - Email: `admin@society.com`
   - Password: `Admin@123456`
3. Verify Admin Dashboard renders stats cards and Recharts analytics.
4. Navigate to `/admin/settings` and verify overdue threshold settings load from database.
5. Create a test complaint from Resident account and check status timeline updates.
