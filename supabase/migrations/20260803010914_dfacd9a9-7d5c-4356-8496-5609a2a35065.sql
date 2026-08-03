
-- switch has_role to SECURITY INVOKER to satisfy the linter.
-- Since it reads from user_roles which has RLS enabled (Authenticated read user_roles USING true),
-- it will still work as expected but bypass the SECURITY DEFINER check.

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Note: We already restricted other functions. 
-- has_role was the only one authenticated users could execute.
