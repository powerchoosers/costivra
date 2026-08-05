-- Migration: 20260804180000_cloudmersive_rate_budget.sql
-- Description: External provider request budgets table and atomic slot reservation RPC function.

CREATE TABLE IF NOT EXISTS public.external_provider_request_budgets (
  provider TEXT PRIMARY KEY,
  period_start DATE NOT NULL,
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  next_allowed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.external_provider_request_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS external_provider_budgets_deny_all ON public.external_provider_request_budgets;

CREATE POLICY external_provider_budgets_deny_all ON public.external_provider_request_budgets
  FOR ALL TO authenticated USING (false);

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
  v_max_allowed INTEGER := p_monthly_limit - p_monthly_reserve;
  v_sched TIMESTAMPTZ;
  v_wait INTEGER;
BEGIN
  IF p_provider IS NULL OR LENGTH(p_provider) = 0 THEN
    RETURN QUERY SELECT false, v_now, 0, 0, 0, 'invalid_provider'::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_budget
  FROM public.external_provider_request_budgets
  WHERE provider = p_provider
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.external_provider_request_budgets (
      provider, period_start, used_count, next_allowed_at, updated_at
    ) VALUES (
      p_provider, v_month_start, 1, v_now + (p_min_interval_ms || ' milliseconds')::INTERVAL, v_now
    )
    RETURNING * INTO v_budget;

    RETURN QUERY SELECT
      true,
      v_now,
      0,
      1,
      GREATEST(0, v_max_allowed - 1),
      'ok'::TEXT;
    RETURN;
  END IF;

  IF v_budget.period_start < v_month_start THEN
    v_budget.used_count := 0;
    v_budget.period_start := v_month_start;
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
  WHERE provider = p_provider;

  RETURN QUERY SELECT
    true,
    v_sched,
    v_wait,
    v_budget.used_count + 1,
    GREATEST(0, v_max_allowed - (v_budget.used_count + 1)),
    'ok'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_provider_request_slot FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_provider_request_slot TO service_role;
