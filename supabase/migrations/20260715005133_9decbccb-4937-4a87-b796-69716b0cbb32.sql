-- ===== TASKS (sem vínculo com paciente) =====
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  color text NOT NULL DEFAULT 'slate',
  due_date date,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','doing','done')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR created_by = auth.uid() OR assigned_to = auth.uid());
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR created_by = auth.uid() OR assigned_to = auth.uid());
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR created_by = auth.uid());

CREATE TRIGGER tasks_set_updated BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== SUPERVISION =====
CREATE TABLE public.supervision_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  title text NOT NULL,
  hypothesis text,
  evolution text,
  questions text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_supervision','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supervision_cases TO authenticated;
GRANT ALL ON public.supervision_cases TO service_role;
ALTER TABLE public.supervision_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sup_cases_select" ON public.supervision_cases FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR owner_id = auth.uid());
CREATE POLICY "sup_cases_insert" ON public.supervision_cases FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());
CREATE POLICY "sup_cases_update" ON public.supervision_cases FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR owner_id = auth.uid());
CREATE POLICY "sup_cases_delete" ON public.supervision_cases FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR owner_id = auth.uid());

CREATE TRIGGER sup_cases_set_updated BEFORE UPDATE ON public.supervision_cases
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.supervision_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.supervision_cases(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supervision_notes TO authenticated;
GRANT ALL ON public.supervision_notes TO service_role;
ALTER TABLE public.supervision_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sup_notes_select" ON public.supervision_notes FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR EXISTS (SELECT 1 FROM public.supervision_cases c WHERE c.id = case_id AND c.owner_id = auth.uid())
);
CREATE POLICY "sup_notes_insert" ON public.supervision_notes FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid() AND (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.supervision_cases c WHERE c.id = case_id AND c.owner_id = auth.uid())
  )
);
CREATE POLICY "sup_notes_delete" ON public.supervision_notes FOR DELETE TO authenticated
USING (author_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ===== MATERIALS =====
CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'geral',
  unit text NOT NULL DEFAULT 'un',
  quantity integer NOT NULL DEFAULT 0,
  min_quantity integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT ALL ON public.materials TO service_role;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "materials_select" ON public.materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "materials_write_admin" ON public.materials FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER materials_set_updated BEFORE UPDATE ON public.materials
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.material_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('in','out','adjust')),
  quantity integer NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_movements TO authenticated;
GRANT ALL ON public.material_movements TO service_role;
ALTER TABLE public.material_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mov_select" ON public.material_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "mov_insert" ON public.material_movements FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid());
CREATE POLICY "mov_delete_admin" ON public.material_movements FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin'));

-- Auto-update material stock via trigger
CREATE OR REPLACE FUNCTION public.apply_material_movement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.kind = 'in' THEN
    UPDATE public.materials SET quantity = quantity + NEW.quantity WHERE id = NEW.material_id;
  ELSIF NEW.kind = 'out' THEN
    UPDATE public.materials SET quantity = GREATEST(0, quantity - NEW.quantity) WHERE id = NEW.material_id;
  ELSIF NEW.kind = 'adjust' THEN
    UPDATE public.materials SET quantity = NEW.quantity WHERE id = NEW.material_id;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER mov_apply AFTER INSERT ON public.material_movements
FOR EACH ROW EXECUTE FUNCTION public.apply_material_movement();