-- Simplify CRM: drop scope-creep modules, consolidate deal stage-tracking into a single
-- flexible timeline (deal_events) that replaces both the Kanban `deals.stage` and the
-- fixed 9-phase `deal_phases`. Database has no production data yet - safe to reset.

-- ============================================================================
-- 1. Drop modules no longer needed
-- ============================================================================

DROP TABLE IF EXISTS public.implementation_milestones CASCADE;
DROP TABLE IF EXISTS public.implementations CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.meetings CASCADE;
DROP TABLE IF EXISTS public.communications CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.deal_assignees CASCADE;
DROP TABLE IF EXISTS public.deal_phase_documents CASCADE;
DROP TABLE IF EXISTS public.deal_phases CASCADE;

ALTER TABLE public.deals DROP COLUMN IF EXISTS partner_id;
DROP TABLE IF EXISTS public.partners CASCADE;

DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.assign_admin_to_first_user() CASCADE;

DROP TYPE IF EXISTS public.implementation_status;
DROP TYPE IF EXISTS public.milestone_status;
DROP TYPE IF EXISTS public.task_status;
DROP TYPE IF EXISTS public.task_priority;
DROP TYPE IF EXISTS public.partner_type;
DROP TYPE IF EXISTS public.communication_type;
DROP TYPE IF EXISTS public.communication_direction;
DROP TYPE IF EXISTS public.deal_phase_type;
DROP TYPE IF EXISTS public.app_role;

-- ============================================================================
-- 2. Rework `deals`: drop Kanban stage tracking, add computed status
-- ============================================================================

ALTER TABLE public.deals DROP COLUMN IF EXISTS stage;
ALTER TABLE public.deals DROP COLUMN IF EXISTS stage_changed_at;
ALTER TABLE public.deals DROP COLUMN IF EXISTS product;
ALTER TABLE public.deals DROP COLUMN IF EXISTS is_partner_deal;

DROP TYPE IF EXISTS public.deal_stage;

CREATE TYPE public.deal_status AS ENUM ('open', 'won', 'lost');

ALTER TABLE public.deals ADD COLUMN status public.deal_status NOT NULL DEFAULT 'open';
ALTER TABLE public.deals ADD COLUMN closed_at TIMESTAMPTZ;

-- ============================================================================
-- 3. deal_events - single source of truth for a deal's journey
-- ============================================================================

CREATE TYPE public.deal_event_type AS ENUM (
  'lead_created', 'meeting', 'discussion', 'proposal_sent',
  'negotiation', 'document', 'note', 'won', 'lost'
);

CREATE TABLE public.deal_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  event_type public.deal_event_type NOT NULL,
  event_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT,
  description TEXT,
  amount BIGINT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view deal events" ON public.deal_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create deal events" ON public.deal_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update deal events" ON public.deal_events FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete deal events" ON public.deal_events FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_deal_events_updated_at BEFORE UPDATE ON public.deal_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Keep deals.status/closed_at/value in sync whenever a closing event is logged
CREATE OR REPLACE FUNCTION public.sync_deal_status_from_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.event_type IN ('won', 'lost') THEN
    UPDATE public.deals
    SET status = NEW.event_type::text::public.deal_status,
        closed_at = NEW.event_date,
        value = COALESCE(NEW.amount, value)
    WHERE id = NEW.deal_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_deal_event_created
  AFTER INSERT ON public.deal_events
  FOR EACH ROW EXECUTE FUNCTION public.sync_deal_status_from_event();

-- ============================================================================
-- 4. deal_documents - attachments per timeline event
-- ============================================================================

CREATE TABLE public.deal_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_event_id UUID NOT NULL REFERENCES public.deal_events(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view deal documents" ON public.deal_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create deal documents" ON public.deal_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete deal documents" ON public.deal_documents FOR DELETE TO authenticated USING (true);

-- Reuse the existing `deal-documents` storage bucket (created by a previous migration);
-- path scheme becomes {dealId}/{eventId}/{timestamp}_{filename}.
