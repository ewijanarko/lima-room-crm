

# Phase 2 Implementation Plan (4 Features)

## Scope

Building 4 features (email notifications skipped):
1. **Meetings/Calendar** -- new table + full page
2. **Partners** -- new table + full page + deal linking
3. **Implementations** -- new tables + project tracking page
4. **Client Documents** -- storage bucket + upload UI in ClientDetail

---

## 1. Meetings/Calendar

**Database Migration:**
- Create `meetings` table: id, title, description, meeting_date (timestamptz), duration_minutes (int, default 60), location (text), related_client_id (FK clients), related_deal_id (FK deals), created_by (uuid), created_at, updated_at
- RLS: authenticated users can SELECT, INSERT, UPDATE, DELETE

**Frontend (`src/pages/Meetings.tsx`):**
- Monthly calendar grid showing meetings as dots/badges on dates
- List view of upcoming meetings below the calendar
- Create/edit meeting dialog with fields: title, date/time, duration, location, client select, deal select
- Delete meeting button

**Sidebar:** Enable the existing disabled "Rapat" nav item, point to `/meetings`

**Routing:** Add `/meetings` route in App.tsx

**Translations:** Add ~25 meeting keys (EN/ID)

---

## 2. Partners

**Database Migration:**
- Create enum `partner_type`: 'referral', 'reseller', 'technology'
- Create `partners` table: id, company_name, contact_name, email, phone, type (partner_type), commission_rate (numeric), is_active (boolean, default true), notes, created_by, created_at, updated_at
- Add `partner_id` (uuid, FK partners, nullable) column to `deals` table
- RLS: authenticated users can full CRUD

**Frontend (`src/pages/Partners.tsx`):**
- Table view with search, filter by type/status
- Create/edit partner dialog
- Partner detail showing referred deals
- Commission rate display

**Sidebar:** Add "Mitra" nav item in secondary nav group

**Routing:** Add `/partners` route in App.tsx

**Translations:** Add ~20 partner keys (EN/ID)

---

## 3. Implementations (Project Tracking)

**Database Migration:**
- Create enum `implementation_status`: 'planning', 'in_progress', 'completed', 'on_hold'
- Create enum `milestone_status`: 'pending', 'completed'
- Create `implementations` table: id, deal_id (FK deals), client_id (FK clients), title, status (implementation_status, default 'planning'), start_date, target_date, progress_percent (int, default 0), notes, created_by, created_at, updated_at
- Create `implementation_milestones` table: id, implementation_id (FK implementations ON DELETE CASCADE), title, status (milestone_status, default 'pending'), due_date, completed_at, created_at
- RLS: authenticated users can full CRUD on both tables

**Frontend (`src/pages/Implementations.tsx`):**
- Card/table view of implementations with progress bars
- Filter by status
- Create implementation dialog (select from won deals)
- Implementation detail view with milestone checklist
- Auto-calculate progress from milestone completion

**Sidebar:** Add "Implementasi" nav item in main nav group

**Routing:** Add `/implementations` route in App.tsx

**Translations:** Add ~25 implementation keys (EN/ID)

---

## 4. Client Documents (File Uploads)

**Database Migration:**
- Create storage bucket `client-documents` (private)
- Create `client_documents` table: id, client_id (FK clients ON DELETE CASCADE), file_name, file_path, file_size (bigint), mime_type, uploaded_by (uuid), created_at
- RLS: authenticated users can SELECT, INSERT, DELETE
- Storage policy: authenticated users can upload/download from `client-documents` bucket

**Frontend (add to `src/pages/ClientDetail.tsx`):**
- New "Dokumen" tab in the client detail tabs
- File upload dropzone (accepts PDF, DOCX, images, up to 10MB)
- File list with name, size, upload date, download button
- Delete button per file

**Translations:** Add ~10 document keys (EN/ID)

---

## Implementation Order

Execute in this sequence: Meetings → Partners → Implementations → Client Documents

## Files Modified/Created

- **New pages:** `Meetings.tsx`, `Partners.tsx`, `Implementations.tsx`
- **Modified:** `App.tsx` (3 new routes), `AppSidebar.tsx` (new nav items, enable Rapat), `ClientDetail.tsx` (documents tab), `Deals.tsx` (partner_id field), `translations.ts` (~80 new keys)
- **Migrations:** 4 separate SQL migrations for tables + storage

