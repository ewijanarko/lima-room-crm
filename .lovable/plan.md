

## Lima Ruang CRM — Phase 1: Core Foundation

### Overview
Build the essential CRM foundation: authentication, dashboard, clients, and deals/pipeline — fully wired to Supabase with the design brief's dark, architectural aesthetic.

---

### 1. Design System & Layout Shell
- Apply dark mode palette from the design brief (deep charcoal backgrounds, Blueprint Blue accents, teal/gold brand colors)
- Set up the "Five Spaces" panel layout: 64px icon sidebar → 240px nav panel → flexible main content
- Logo (`Logo_Lima_Ruang_Baru_Transparent.png`) in the sidebar header with "Transformasi & Integrasi" tagline
- Sidebar navigation with icons: Dashboard, Clients, Deals, Meetings, Communications (admin sections grayed out for Phase 2)
- Fonts: Geist Sans for UI, IBM Plex Mono for numbers/currency

### 2. Supabase Backend Setup
- **Database tables (Phase 1):** profiles, user_roles, clients, contacts, deals, deal_assignees, communications, activities
- **Enums:** app_role, client_status, deal_stage, communication_type, communication_direction
- **Auth:** Email/password login with profiles trigger (auto-create on signup)
- **RLS policies:** Using `has_role()` security definer function per the role architecture guidelines
- **First user becomes admin** via trigger

### 3. Authentication
- Login page with Lima Ruang branding (logo centered, dark theme)
- Email/password sign-in and sign-up
- Protected routes — redirect to login if not authenticated
- Profile auto-creation on signup

### 4. Dashboard (`/dashboard`)
- 4 KPI cards: Total Revenue Realized, Pipeline Value, Active Clients, Open Deals
- Revenue trend chart (Recharts bar/line chart, last 12 months)
- Deal stage funnel visualization
- Widgets: Upcoming meetings, recent communications, dormant clients (30+ days no contact)

### 5. Clients (`/clients`)
- **List view:** Searchable, filterable table (status, industry) with status badges
- **Add/Edit client** modal with company details
- **Client detail page** (`/clients/:id`) with tabs: Overview, Contacts, Deals, Communications, Activity Log
- Contacts CRUD within client detail
- "Last Contact" indicator with color coding (green/yellow/red)

### 6. Deals / Pipeline (`/deals`)
- **Kanban view** (default): Columns for Lead → Qualified → Proposal → Negotiation → Won → Lost
- Deal cards showing: title, client, product, value (IDR formatted), days in stage, 2px left border color by stage
- **List view** toggle: full detail table
- **Deal detail** slide-over: stage selector, value, assignees, partner toggle, communications tab, activity log
- Drag-and-drop stage changes on kanban

### 7. Communications Log
- Quick-log form from client detail or deal detail: type, direction, subject, summary
- Timeline view of communication history per client/deal
- Feeds into the dashboard's "recent communications" widget

---

### What's deferred to Phase 2
Meetings/calendar, Implementations, Revenue dashboard, Products, Partners, Reports, User Management, Proposals/file uploads, Google OAuth, email notifications

