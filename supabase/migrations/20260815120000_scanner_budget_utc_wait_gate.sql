-- Packet 01: keep scanner budget accounting UTC-based and fail closed before
-- reserving a request that cannot be served within the worker wait ceiling.

CREATE OR REPLACE FUNCTION public.reserve_provider_request_slot(
  p_provider TEXT,
  p_monthly_limit INTEGER,
  p_monthly_reserve INTEGER,
  p_min_interval_ms INTEGER
)
RETURNS TABLE (
  allowed BOOLEAN,
  scheduled_at TIMESTAMPTZ,
  wait_ms INTEGER,
  used_count INTEGER,
  remaining_count INTEGER,
  code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_today DATE := (clock_timestamp() AT TIME ZONE 'UTC')::date;
  v_month_start DATE := date_trunc('month', v_today::timestamp)::date;
  v_now TIMESTAMPTZ := clock_timestamp();
  v_budget public.external_provider_request_budgets%ROWTYPE;
  v_max_allowed INTEGER;
  v_sched TIMESTAMPTZ;
  v_wait INTEGER;
BEGIN
  IF p_provider IS NULL
     OR length(trim(p_provider)) = 0
     OR p_monthly_limit IS NULL
     OR p_monthly_limit < 1
     OR p_monthly_reserve IS NULL
     OR p_monthly_reserve < 0
     OR p_monthly_reserve >= p_monthly_limit
     OR p_min_interval_ms IS NULL
     OR p_min_interval_ms < 1100
     OR p_min_interval_ms > 3600000 THEN
    RETURN QUERY SELECT false, v_now, 0, 0, 0, 'invalid_configuration'::TEXT;
    RETURN;
  END IF;

  v_max_allowed := p_monthly_limit - p_monthly_reserve;

  INSERT INTO public.external_provider_request_budgets (
    provider, period_start, used_count, next_allowed_at, updated_at
  ) VALUES (
    trim(p_provider), v_month_start, 0, v_now, v_now
  )
  ON CONFLICT (provider) DO NOTHING;

  SELECT * INTO v_budget
  FROM public.external_provider_request_budgets
  WHERE provider = trim(p_provider)
  FOR UPDATE;

  IF v_budget.period_start <> v_month_start THEN
    v_budget.used_count := 0;
    v_budget.period_start := v_month_start;
    v_budget.next_allowed_at := v_now;
  END IF;

  IF v_budget.used_count >= v_max_allowed THEN
    RETURN QUERY SELECT false, v_now, 0, v_budget.used_count, 0, 'monthly_quota_reserved'::TEXT;
    RETURN;
  END IF;

  v_sched := GREATEST(v_now, v_budget.next_allowed_at);
  v_wait := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_sched - v_now)) * 1000)::INTEGER);

  -- The application will not wait longer than 15 seconds in a request.
  -- Reject before incrementing used_count so deferred work does not consume
  -- the monthly allowance merely by reaching the queue.
  IF v_wait > 15000 THEN
    RETURN QUERY SELECT false, v_sched, v_wait, v_budget.used_count,
      GREATEST(0, v_max_allowed - v_budget.used_count),
      'rate_limit_wait_exceeded'::TEXT;
    RETURN;
  END IF;

  UPDATE public.external_provider_request_budgets
  SET
    used_count = v_budget.used_count + 1,
    period_start = v_budget.period_start,
    next_allowed_at = v_sched + (p_min_interval_ms || ' milliseconds')::INTERVAL,
    updated_at = v_now
  WHERE provider = trim(p_provider);

  RETURN QUERY SELECT
    true,
    v_sched,
    v_wait,
    v_budget.used_count + 1,
    GREATEST(0, v_max_allowed - (v_budget.used_count + 1)),
    'ok'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_provider_request_slot(TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_provider_request_slot(TEXT, INTEGER, INTEGER, INTEGER) TO service_role;
