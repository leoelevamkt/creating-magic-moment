
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  action text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rate_limits_key_action_unique UNIQUE (key, action)
);

GRANT ALL ON public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated = fully locked to service_role only.

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _key text,
  _action text,
  _max integer,
  _window_seconds integer,
  _block_seconds integer DEFAULT 0,
  _increment integer DEFAULT 1
)
RETURNS TABLE(allowed boolean, retry_after integer, current_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.rate_limits%ROWTYPE;
  now_ts timestamptz := now();
  window_end timestamptz;
BEGIN
  INSERT INTO public.rate_limits (key, action, count, window_start, updated_at)
  VALUES (_key, _action, 0, now_ts, now_ts)
  ON CONFLICT (key, action) DO NOTHING;

  SELECT * INTO row FROM public.rate_limits WHERE key = _key AND action = _action FOR UPDATE;

  -- currently blocked?
  IF row.blocked_until IS NOT NULL AND row.blocked_until > now_ts THEN
    RETURN QUERY SELECT false, GREATEST(1, EXTRACT(EPOCH FROM (row.blocked_until - now_ts))::int), row.count;
    RETURN;
  END IF;

  -- reset window if expired
  IF row.window_start + make_interval(secs => _window_seconds) < now_ts THEN
    row.window_start := now_ts;
    row.count := 0;
    row.blocked_until := NULL;
  END IF;

  row.count := row.count + _increment;

  IF row.count > _max THEN
    IF _block_seconds > 0 THEN
      row.blocked_until := now_ts + make_interval(secs => _block_seconds);
    END IF;
    UPDATE public.rate_limits
      SET count = row.count, window_start = row.window_start,
          blocked_until = row.blocked_until, updated_at = now_ts
      WHERE id = row.id;
    window_end := COALESCE(row.blocked_until, row.window_start + make_interval(secs => _window_seconds));
    RETURN QUERY SELECT false, GREATEST(1, EXTRACT(EPOCH FROM (window_end - now_ts))::int), row.count;
    RETURN;
  END IF;

  UPDATE public.rate_limits
    SET count = row.count, window_start = row.window_start,
        blocked_until = NULL, updated_at = now_ts
    WHERE id = row.id;
  RETURN QUERY SELECT true, 0, row.count;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_rate_limit(_key text, _action text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limits WHERE key = _key AND action = _action;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limits
  WHERE updated_at < now() - interval '7 days'
    AND (blocked_until IS NULL OR blocked_until < now());
$$;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_rate_limit(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_rate_limit(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limits() TO service_role;
