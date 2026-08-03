
-- Fix remaining SECURITY DEFINER functions executable by authenticated users
-- The linter specifically highlighted these.

REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer, integer, integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.reset_rate_limit(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_rate_limit(text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limits() TO service_role;

-- Identify tables with RLS enabled but no policies (Info findings)
-- Based on the linter, there are two such tables.
-- Looking at migrations, rate_limits is one (intentional, service_role only).
-- Let's check if there are others or if we should add explicit service_role policies.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rate_limits') THEN
        DROP POLICY IF EXISTS "service_role_all" ON public.rate_limits;
        CREATE POLICY "service_role_all" ON public.rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;
