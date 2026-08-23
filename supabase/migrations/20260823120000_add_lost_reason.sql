-- Capture why a deal was lost as structured data instead of free text, so the
-- reasons can be counted and compared. Follows the existing pattern: the value
-- is recorded on the timeline event and synced onto deals by the same trigger
-- that already syncs status, closed_at, and value.

CREATE TYPE public.deal_lost_reason AS ENUM (
  'price', 'competitor', 'timing', 'no_budget', 'no_decision', 'other'
);

ALTER TABLE public.deal_events ADD COLUMN lost_reason public.deal_lost_reason;
ALTER TABLE public.deals ADD COLUMN lost_reason public.deal_lost_reason;

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
  END IF;
  RETURN NEW;
END;
$$;
