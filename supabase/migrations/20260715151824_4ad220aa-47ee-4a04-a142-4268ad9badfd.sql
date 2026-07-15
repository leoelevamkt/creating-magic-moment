
-- agenda_blocks
CREATE TABLE public.agenda_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'other', -- lunch | supervision | off | other
  recurrence TEXT NOT NULL DEFAULT 'weekly', -- weekly | once
  weekday SMALLINT, -- 0=Sun .. 6=Sat, when recurrence=weekly
  block_date DATE, -- when recurrence=once
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_blocks TO authenticated;
GRANT ALL ON public.agenda_blocks TO service_role;

ALTER TABLE public.agenda_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agenda_blocks select own or admin"
  ON public.agenda_blocks FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "agenda_blocks insert own"
  ON public.agenda_blocks FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "agenda_blocks update own or admin"
  ON public.agenda_blocks FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "agenda_blocks delete own or admin"
  ON public.agenda_blocks FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER agenda_blocks_set_updated_at
  BEFORE UPDATE ON public.agenda_blocks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX agenda_blocks_owner_idx ON public.agenda_blocks (owner_id);
CREATE INDEX agenda_blocks_date_idx ON public.agenda_blocks (block_date);
CREATE INDEX agenda_blocks_weekday_idx ON public.agenda_blocks (weekday);

-- waitlist (clinic-wide, all staff)
CREATE TABLE public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name TEXT, -- allow entry before a patient record exists
  contact_phone TEXT,
  contact_email TEXT,
  session_type TEXT, -- e.g. avaliacao, terapia, devolutiva
  preferred_weekdays SMALLINT[] DEFAULT '{}', -- 0..6
  preferred_start_time TIME,
  preferred_end_time TIME,
  modality TEXT DEFAULT 'presencial', -- presencial | online | any
  priority SMALLINT NOT NULL DEFAULT 3, -- 1 highest .. 5 lowest
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active | scheduled | archived
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.waitlist TO authenticated;
GRANT ALL ON public.waitlist TO service_role;

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waitlist all authenticated"
  ON public.waitlist FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER waitlist_set_updated_at
  BEFORE UPDATE ON public.waitlist
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX waitlist_status_idx ON public.waitlist (status);
CREATE INDEX waitlist_priority_idx ON public.waitlist (priority);
