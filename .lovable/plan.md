

# Phase 2: CRM Feature Expansion

This is a large scope covering 4 major features. I recommend implementing them incrementally across multiple prompts. Here's the full plan:

---

## 1. Manajemen Produk/Layanan

**Database**: New `products` table with columns: id, name, description, category, price, is_active, created_by, created_at, updated_at. RLS: authenticated users can CRUD.

**Frontend**: New `/products` page with table view, search/filter, create/edit dialog. Link products to deals (deals already have a `product` text field -- we'll convert it to reference the products table via a new `product_id` column).

**Sidebar**: Add "Produk" nav item under "Utama" group.

---

## 2. Laporan & Analitik

**Frontend**: New `/reports` page with multiple report views:
- Revenue by month (bar chart)
- Deal conversion funnel (win rate by stage)
- Top clients by deal value
- Sales performance by user
- Date range filter

Uses existing data from `deals`, `clients`, `communications` tables. No new tables needed. Uses Recharts (already installed).

**Sidebar**: Add "Laporan" nav item.

---

## 3. Manajemen Tugas/Aktivitas

**Database**: New `tasks` table: id, title, description, status (enum: todo/in_progress/done), priority (enum: low/medium/high), due_date, assigned_to (uuid), related_client_id, related_deal_id, created_by, created_at, updated_at. RLS: authenticated users can view all, create/update own or assigned tasks.

**Frontend**: New `/tasks` page with:
- List/board view of tasks
- Create task dialog with client/deal linking
- Status updates, priority badges
- Filter by status, assignee, due date
- Tasks tab in ClientDetail and DealSheet

**Sidebar**: Add "Tugas" nav item (replace the disabled "Rapat" placeholder).

---

## 4. Manajemen Tim/Pengguna

**Frontend**: New `/team` page (admin-only):
- List all users from `profiles` table with their roles
- Change user roles (admin/manager/user) via `user_roles` table
- View user activity summary
- Invite users (link to sign-up)

Uses existing `profiles`, `user_roles` tables and `has_role` function. Add role-based UI guards (admin-only access to team page).

**Sidebar**: Replace disabled "Pengaturan" with "Tim" nav item. Show only if user is admin.

---

## Implementation Order

Due to the size, I recommend building these one at a time in this order:

1. **Manajemen Produk** -- foundational, enhances deals
2. **Manajemen Tugas** -- new table + full CRUD
3. **Laporan & Analitik** -- reads existing data, no new tables
4. **Manajemen Tim** -- admin features last

## Technical Notes

- All new tables get RLS policies for authenticated users
- All text in Bahasa Indonesia
- Dark theme consistent with existing UI
- New routes added to App.tsx inside the ProtectedRoute layout
- Database migrations for new tables and enums

---

Shall I start with **Manajemen Produk/Layanan** first?

