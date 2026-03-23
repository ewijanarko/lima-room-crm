
-- Feature 1: Meetings table
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  meeting_date TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  location TEXT,
  related_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  related_deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view meetings" ON public.meetings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create meetings" ON public.meetings FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated users can update meetings" ON public.meetings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete meetings" ON public.meetings FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Feature 2: Partners
CREATE TYPE public.partner_type AS ENUM ('referral', 'reseller', 'technology');

CREATE TABLE public.partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  type public.partner_type NOT NULL DEFAULT 'referral',
  commission_rate NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view partners" ON public.partners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create partners" ON public.partners FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update partners" ON public.partners FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete partners" ON public.partners FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.deals ADD COLUMN partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL;

-- Feature 3: Implementations
CREATE TYPE public.implementation_status AS ENUM ('planning', 'in_progress', 'completed', 'on_hold');
CREATE TYPE public.milestone_status AS ENUM ('pending', 'completed');

CREATE TABLE public.implementations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status public.implementation_status NOT NULL DEFAULT 'planning',
  start_date DATE,
  target_date DATE,
  progress_percent INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.implementations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view implementations" ON public.implementations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create implementations" ON public.implementations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update implementations" ON public.implementations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete implementations" ON public.implementations FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_implementations_updated_at BEFORE UPDATE ON public.implementations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.implementation_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  implementation_id UUID NOT NULL REFERENCES public.implementations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status public.milestone_status NOT NULL DEFAULT 'pending',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.implementation_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view milestones" ON public.implementation_milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create milestones" ON public.implementation_milestones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update milestones" ON public.implementation_milestones FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete milestones" ON public.implementation_milestones FOR DELETE TO authenticated USING (true);

-- Feature 4: Client Documents
INSERT INTO storage.buckets (id, name, public) VALUES ('client-documents', 'client-documents', false);

CREATE POLICY "Authenticated users can upload client documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'client-documents');
CREATE POLICY "Authenticated users can view client documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'client-documents');
CREATE POLICY "Authenticated users can delete client documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'client-documents');

CREATE TABLE public.client_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view client documents" ON public.client_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create client documents" ON public.client_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete client documents" ON public.client_documents FOR DELETE TO authenticated USING (true);
