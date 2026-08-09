-- Packet 03: make the scanner budget reservation fail closed and safe under
-- concurrent first use. No browser role may inspect or mutate this ledger.

-- A scan can finish before a document row exists (for example, an infected
-- forwarded attachment). Preserve that attempt without creating an available
-- document record.
ALTER TABLE public.document_security_scan_attempts
  ALTER COLUMN document_id DROP NOT NULL;

REVOKE ALL ON TABLE public.external_provider_request_budgets FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS external_provider_budgets_deny_all ON public.external_provider_request_budgets;
CREATE POLICY external_provider_budgets_deny_all
  ON public.external_provider_request_budgets
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);

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
  v_today DATE := CURRENT_DATE;
  v_month_start DATE := date_trunc('month', v_today)::date;
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

  -- Insert without racing. The unique provider key means one concurrent
  -- caller wins the insert and every caller then locks the same row below.
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
    RETURN QUERY SELECT
      false,
      v_now,
      0,
      v_budget.used_count,
      0,
      'monthly_quota_reserved'::TEXT;
    RETURN;
  END IF;

  v_sched := GREATEST(v_now, v_budget.next_allowed_at);
  v_wait := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_sched - v_now)) * 1000)::INTEGER);

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
