# Gmail Email Follow-up Automation System

A production-ready full-stack application that uploads an Excel lead list, checks each email address against a connected Gmail mailbox, and automatically sends either a **Follow-up** (previous communication exists) or a **New Email** (no previous communication) using the correct **weekday template** (Monday–Friday). Every send is recorded in permanent **Email Logs**.

> This version is **Gmail-only**. There is no Outlook / Microsoft Graph integration anywhere in the codebase, and there is **no separate "Email Processing" page** — automation is triggered from the Dashboard.

---

## 1. Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React 18 (Vite), JavaScript, Tailwind CSS, Axios, React Router |
| Backend   | Node.js, Express.js, REST APIs, Googleapis (Gmail API + OAuth 2.0), ExcelJS (+ SheetJS for legacy `.xls`), Multer, Helmet, CORS, express-rate-limit |
| Database  | MySQL (mysql2 driver, parameterized queries, transactions) |

## 2. Architecture

```
React (Vite)  ──Axios──▶  Node.js / Express REST API
                              │
                 Controller ─▶ Service ─▶ Gmail API (googleapis)
                              │                       │
                              ▼                       ▼
                          MySQL (mysql2)        Gmail mailbox (OAuth 2.0)
```

- Google client secret lives **only** in the backend `.env`. It is never exposed to React.
- Gmail OAuth **access + refresh tokens** are stored encrypted (AES-256-GCM, key derived from `SESSION_SECRET`) in the `gmail_connections` table.
- Gmail API code lives exclusively in `src/services/gmailService.js` (Controller → Service → Gmail API). No Gmail code in routes or React components.

## 3. Core Decision Logic (backend-enforced)

```
For every record in the ACTIVE Excel file:

  Email + Name
      ↓
  Search Gmail:  from:(email) OR to:(email)
      ↓
  Previous email found?
      ├── YES → today's FOLLOW_UP template   → send follow-up
      └── NO  → today's NEW_EMAIL template   → send new email
      ↓
  Save Email Log (message id, thread id, status)
```

- The weekday is detected **server-side** using `APP_TIMEZONE` (default `Asia/Kolkata`).
- Monday → Monday templates, Tuesday → Tuesday templates, … Friday → Friday templates.
- **Saturday/Sunday:** automation refuses to run and returns `Automation is not configured for weekends.` No email is sent.

## 4. Database Schema (MySQL)

Tables: `uploaded_file`, `email_records`, `email_templates`, `email_logs`, `gmail_connections`.

- `uploaded_file` – one active file at a time (`is_active = 1`); uploading a new file deactivates the previous one inside a transaction. Historical email logs are **never** deleted.
- `email_records` – parsed rows (indexed on `email` and `file_id`, unique per file).
- `email_templates` – `FOLLOW_UP` + `NEW_EMAIL` × Monday–Friday (unique `template_type + day_of_week`). Seeded with defaults.
- `email_logs` – permanent history: `mail_found`, `email_type`, `template_type` (weekday), `subject`, `gmail_message_id`, `gmail_thread_id`, `status` (`SUCCESS | FAILED | SKIPPED`), `error_message`, `sent_at`.
- **Duplicate-send protection:** unique index `(email_record_id, process_date)` — only one `SUCCESS` per record per day is physically possible, plus an application-level check before sending. Failed sends have `process_date = NULL` so they can be retried.

Schema: [`backend/sql/schema.sql`](backend/sql/schema.sql) · Seed data: [`backend/sql/seed.sql`](backend/sql/seed.sql)

## 5. API Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/excel/upload` | Upload + validate `.xlsx/.xls`, replace active list (transaction) |
| GET | `/api/excel/active` | Current active file + record count |
| GET | `/api/excel/history` | Upload history |
| GET | `/api/gmail/connect` | Start Google OAuth (302 → Google consent) |
| GET | `api/gmail/callback` | OAuth callback → stores encrypted tokens |
| GET | `/api/gmail/status` | Connection status / account / scopes |
| POST | `/api/gmail/disconnect` | Revoke + clear tokens |
| GET | `/api/templates` | All 10 templates grouped by type |
| GET | `/api/templates/:type/:day` | One template (`FOLLOW_UP|NEW_EMAIL`, `Monday…Friday`) |
| PUT | `/api/templates/:type/:day` | Update subject/body |
| POST | `/api/automation/run` | Run the automation for the active list (weekday-checked) |
| GET | `/api/dashboard` | Aggregated dashboard data |
| GET | `/api/email-logs` | Logs + search/filters/pagination |
| GET | `/api/email-logs/:id` | Single log detail |
| GET | `/api/health` | Liveness/DB check |

## 6. Prerequisites

1. **Node.js 18+**
2. **MySQL 8+** (or MariaDB 10.6+)
3. A **Google Cloud project** with the Gmail API enabled (steps below)

## 7. Google Cloud / Gmail API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create/select a project.
2. **APIs & Services → Library** → search **Gmail API** → **Enable**.
3. **APIs & Services → OAuth consent screen**:
   - User type: **External** (or Internal if you have Workspace).
   - Add your Gmail address as a **Test user** (required while in testing mode).
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URI: `http://localhost:5000/api/gmail/callback` (must match `GOOGLE_REDIRECT_URI` exactly)
5. Copy the **Client ID** and **Client Secret** into `backend/.env`.

Scopes requested: `gmail.readonly` (read/search) and `gmail.send` (send). **No password is ever requested or stored.**

## 8. Installation

```bash
# 1. Database (any of these, or import manually later)
mysql -u root -p < backend/sql/schema.sql
mysql -u root -p < backend/sql/seed.sql

# 2. Backend
cd backend
cp .env.example .env          # then edit values
npm install
npm run dev                   # http://localhost:5000  (schema auto-syncs on boot)

# 3. Frontend (new terminal)
cd frontend
cp .env.example .env          # optional overrides
npm install
npm run dev                   # http://localhost:5173
```

Production build (Express serves the built React app):

```bash
cd frontend && npm run build
cd ../backend && NODE_ENV=production npm start
```

## 9. Environment Variables (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Backend port (default 5000) |
| `NODE_ENV` | development / production |
| `APP_BASE_URL` | Public backend URL (used for OAuth redirect fallback) |
| `FRONTEND_URL` | Frontend origin (CORS + OAuth redirect back to UI) |
| `APP_TIMEZONE` | IANA timezone used to detect the weekday (default `Asia/Kolkata`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth credentials (backend only, never in React) |
| `GOOGLE_REDIRECT_URI` | Must match Google Console exactly |
| `MYSQL_HOST/PORT/USERNAME/PASSWORD/DATABASE` | MySQL connection |
| `SESSION_SECRET` | Long random string; also encrypts Gmail tokens at rest |
| `ADMIN_API_TOKEN` | *Optional.* If set, all `/api` routes (except Gmail OAuth redirect/callback + health) require `Authorization: Bearer <token>`; set `VITE_ADMIN_API_TOKEN` in the frontend to match |
| `MAX_UPLOAD_SIZE_MB` | Excel upload size cap (default 5) |
| `MAX_EXCEL_ROWS` | Max valid rows per file (default 10000) |
| `GMAIL_SEND_DELAY_MS` | Pacing delay between sends (default 400) |
| `DB_AUTO_SYNC` | `true` (default) auto-creates schema + default templates on boot |

`.env` is git-ignored — never commit credentials.

## 10. Running the Automation

- Click **Run Automation** on the **Dashboard** (no separate processing page exists).
- Or headless/CI/cron: `cd backend && npm run automation:run` (same service, same safety rules).
- The run is guarded: valid weekday → Gmail connected → active file exists → today's templates exist → then per-record: duplicate check → Gmail search → render template (`{{name}}`, `{{email}}`) → send → log.

## 11. Project Structure

```
backend/
  server.js
  sql/ (schema.sql, seed.sql)
  src/
    config/    database.js, gmail.js
    controllers/ excelController.js gmailController.js templateController.js
                 automationController.js dashboardController.js emailLogController.js
    services/  excelService.js gmailService.js templateService.js
               emailAutomationService.js emailLogService.js
    routes/    excelRoutes.js gmailRoutes.js templateRoutes.js
               automationRoutes.js dashboardRoutes.js emailLogRoutes.js
    middleware/ errorHandler.js authMiddleware.js validation.js
    utils/     apiError.js asyncHandler.js crypto.js emailValidator.js
               templateRenderer.js dateUtils.js constants.js
    scripts/   migrate.js seed.js runAutomation.js makeSampleExcel.js
frontend/
  src/
    components/ Sidebar.jsx Header.jsx StatCard.jsx TemplateCard.jsx
                TemplateEditor.jsx ConfirmModal.jsx Modal.jsx DataTable.jsx Icons.jsx
    pages/      Dashboard.jsx ExcelManagement.jsx GmailConnection.jsx
                Templates.jsx EmailLogs.jsx
    services/   api.js excelApi.js gmailApi.js templateApi.js automationApi.js logApi.js
    layouts/    DashboardLayout.jsx
```

## 12. Troubleshooting

| Problem | Fix |
|---------|-----|
| `Google OAuth is not configured` | Fill `GOOGLE_CLIENT_ID/SECRET` in backend `.env`, restart |
| `redirect_uri_mismatch` on Google | `GOOGLE_REDIRECT_URI` must exactly match the Console value |
| `Gmail is not connected` on run | Open **Gmail Connection** page → Connect Gmail |
| `Automation is not configured for weekends.` | Expected Sat/Sun behavior |
| DB `ECONNREFUSED` | MySQL not running or wrong `MYSQL_*` values |
| Emails not arriving | Check **Email Logs** page — every attempt is recorded with an error message |

## 13. Sample Excel

`samples/sample_leads.xlsx` — columns exactly `Email` and `Name` (includes one invalid row + one duplicate to demonstrate validation). Regenerate: `cd backend && node src/scripts/makeSampleExcel.js`.
