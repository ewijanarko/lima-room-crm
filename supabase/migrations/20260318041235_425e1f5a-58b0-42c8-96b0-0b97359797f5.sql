
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user');
CREATE TYPE public.client_status AS ENUM ('active', 'inactive', 'prospect', 'churned');
CREATE TYPE public.deal_stage AS ENUM ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost');
CREATE TYPE public.communication_type AS ENUM ('call', 'email', 'meeting', 'whatsapp', 'other');
CREATE TYPE public.communication_direction AS ENUM ('inbound', 'outbound');

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- First user becomes admin
CREATE OR REPLACE FUNCTION public.assign_admin_to_first_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.profiles) = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_first_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_admin_to_first_user();

-- Clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  industry TEXT,
  status public.client_status NOT NULL DEFAULT 'prospect',
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Contacts table
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Deals table
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  stage public.deal_stage NOT NULL DEFAULT 'lead',
  value BIGINT DEFAULT 0,
  product TEXT,
  description TEXT,
  expected_close_date DATE,
  is_partner_deal BOOLEAN DEFAULT false,
  stage_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Deal assignees
CREATE TABLE public.deal_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(deal_id, user_id)
);
ALTER TABLE public.deal_assignees ENABLE ROW LEVEL SECURITY;

-- Communications table
CREATE TABLE public.communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  type public.communication_type NOT NULL,
  direction public.communication_direction NOT NULL DEFAULT 'outbound',
  subject TEXT,
  summary TEXT,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  logged_by UUID NOT NULL REFERENCES auth.users(id),
  communication_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

-- Activities table
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: users can read all profiles, update own
CREATE POLICY "Anyone authenticated can view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles: admins can manage, users can read own
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Clients: all authenticated users can CRUD
CREATE POLICY "Authenticated users can view clients" ON public.clients
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create clients" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update clients" ON public.clients
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete clients" ON public.clients
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Contacts: all authenticated
CREATE POLICY "Authenticated users can view contacts" ON public.contacts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create contacts" ON public.contacts
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update contacts" ON public.contacts
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete contacts" ON public.contacts
  FOR DELETE TO authenticated USING (true);

-- Deals: all authenticated
CREATE POLICY "Authenticated users can view deals" ON public.deals
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create deals" ON public.deals
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update deals" ON public.deals
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete deals" ON public.deals
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Deal assignees
CREATE POLICY "Authenticated users can view deal assignees" ON public.deal_assignees
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage deal assignees" ON public.deal_assignees
  FOR ALL TO authenticated USING (true);

-- Communications
CREATE POLICY "Authenticated users can view communications" ON public.communications
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create communications" ON public.communications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = logged_by);
CREATE POLICY "Users can update own communications" ON public.communications
  FOR UPDATE TO authenticated USING (auth.uid() = logged_by);

-- Activities
CREATE POLICY "Authenticated users can view activities" ON public.activities
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create activities" ON public.activities
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
