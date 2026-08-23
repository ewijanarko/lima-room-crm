-- Three changes to the client record:
--   1. Record how each client first came in, so channel performance can be compared.
--   2. Merge clients.contact_name into the contacts table, which already supports
--      several people per client, and drop the duplicated column.
--   3. Stop hand-maintaining the one part of client status that is mechanical:
--      winning a deal means the relationship is live.

-- ============================================================================
-- 1. Lead source
-- ============================================================================

CREATE TYPE public.client_lead_source AS ENUM (
  'referral', 'partner', 'outreach', 'event', 'inbound', 'other'
);

ALTER TABLE public.clients ADD COLUMN lead_source public.client_lead_source;
ALTER TABLE public.clients ADD COLUMN lead_source_detail TEXT;

-- ============================================================================
-- 2. Fold contact_name into contacts
-- ============================================================================

-- Marked primary only when the client had no contacts yet; where one already
-- exists the two may be different people, so that call is left to the user.
INSERT INTO public.contacts (client_id, name, is_primary)
SELECT c.id,
       trim(c.contact_name),
       NOT EXISTS (SELECT 1 FROM public.contacts ex WHERE ex.client_id = c.id)
FROM public.clients c
WHERE c.contact_name IS NOT NULL
  AND trim(c.contact_name) <> '';

ALTER TABLE public.clients DROP COLUMN contact_name;

-- ============================================================================
-- 3. A won deal marks its client active
-- ============================================================================

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
        value = COALESCE(NEW.amount, value),
        lost_reason = CASE WHEN NEW.event_type = 'lost' THEN NEW.lost_reason ELSE NULL END
    WHERE id = NEW.deal_id;

    -- Only 'active' is derivable. prospect/inactive/churned stay a human call.
    IF NEW.event_type = 'won' THEN
      UPDATE public.clients
      SET status = 'active'
      WHERE id = (SELECT client_id FROM public.deals WHERE id = NEW.deal_id)
        AND status <> 'active';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill clients that already have a won deal.
UPDATE public.clients c
SET status = 'active'
WHERE status <> 'active'
  AND EXISTS (SELECT 1 FROM public.deals d WHERE d.client_id = c.id AND d.status = 'won');
