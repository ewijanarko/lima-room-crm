
-- Create enum for deal phase types
CREATE TYPE public.deal_phase_type AS ENUM (
  'lead_creation', 'discovery', 'proposal', 'pitching',
  'won_deal', 'planning', 'kickoff', 'implementation', 'go_live'
);

-- Create deal_phases table
CREATE TABLE public.deal_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  phase deal_phase_type NOT NULL,
  phase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view deal phases" ON public.deal_phases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create deal phases" ON public.deal_phases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update deal phases" ON public.deal_phases FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete deal phases" ON public.deal_phases FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_deal_phases_updated_at BEFORE UPDATE ON public.deal_phases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create deal_phase_documents table
CREATE TABLE public.deal_phase_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_phase_id UUID NOT NULL REFERENCES public.deal_phases(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_phase_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view phase documents" ON public.deal_phase_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create phase documents" ON public.deal_phase_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete phase documents" ON public.deal_phase_documents FOR DELETE TO authenticated USING (true);

-- Create storage bucket for deal documents
INSERT INTO storage.buckets (id, name, public) VALUES ('deal-documents', 'deal-documents', false);

-- Storage policies
CREATE POLICY "Authenticated users can upload deal documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'deal-documents');
CREATE POLICY "Authenticated users can view deal documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'deal-documents');
CREATE POLICY "Authenticated users can delete deal documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'deal-documents');
