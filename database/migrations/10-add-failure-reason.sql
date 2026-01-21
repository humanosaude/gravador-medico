-- =============================================
-- Migration: add failure_reason columns
-- =============================================

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_sales_failure_reason
  ON public.sales(failure_reason);

ALTER TABLE public.checkout_attempts
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_checkout_attempts_failure_reason
  ON public.checkout_attempts(failure_reason);

-- Backfill failure_reason from metadata when available
UPDATE public.checkout_attempts
SET failure_reason = COALESCE(failure_reason, metadata->>'failure_reason')
WHERE (failure_reason IS NULL OR failure_reason = '')
  AND metadata ? 'failure_reason';

UPDATE public.sales s
SET failure_reason = COALESCE(s.failure_reason, ca.failure_reason, ca.metadata->>'failure_reason')
FROM public.checkout_attempts ca
WHERE s.appmax_order_id = ca.appmax_order_id
  AND (s.failure_reason IS NULL OR s.failure_reason = '')
  AND (
    ca.failure_reason IS NOT NULL OR
    (ca.metadata ? 'failure_reason')
  );
