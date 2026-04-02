

# Deal Phase Timeline Tracker

## What You Get

A vertical timeline inside each deal's detail sheet showing all phases of the deal lifecycle. Each phase entry has a date, description, and document attachments. Phases are:

**Lead Creation → Discovery → Proposal → Pitching → Won Deal → Planning → Kickoff → Implementation → Go Live**

## Database Changes (1 migration)

### New enum `deal_phase_type`
Values: `lead_creation`, `discovery`, `proposal`, `pitching`, `won_deal`, `planning`, `kickoff`, `implementation`, `go_live`

### New table `deal_phases`
- `id` (uuid PK), `deal_id` (FK deals), `phase` (deal_phase_type), `phase_date` (date), `description` (text), `created_by` (uuid), `created_at`, `updated_at`
- RLS: authenticated users can full CRUD

### New table `deal_phase_documents`
- `id` (uuid PK), `deal_phase_id` (FK deal_phases ON DELETE CASCADE), `file_name`, `file_path`, `file_size` (bigint), `mime_type`, `uploaded_by` (uuid), `created_at`
- RLS: authenticated users can SELECT, INSERT, DELETE

### New storage bucket `deal-documents` (private)
- Storage policies for authenticated upload/download

## Frontend Changes

### `src/pages/Deals.tsx` -- DealSheet
- Add a **"Timeline"** tab alongside the existing "Communication" tab
- Timeline displays phases vertically with dots/lines, ordered chronologically
- Each phase card shows: phase name (translated), date, description, document count
- **"Add Phase" button** opens dialog: select phase type, date, description (large textarea), upload documents
- Per-phase document list with download and delete
- Visual indicator showing completed phases vs upcoming

### `src/lib/translations.ts`
- Add ~30 keys for phase names and timeline UI labels (EN/ID)

## Files

- **1 SQL migration**: enum + 2 tables + storage bucket + RLS + storage policies
- **Modified**: `Deals.tsx` (Timeline tab + phase components), `translations.ts`
- **Fix**: Reinstall `lucide-react` (missing dependency causing current build errors)

