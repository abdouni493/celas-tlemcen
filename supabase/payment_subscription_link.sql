-- =============================================================================
--  Link payments → student_subscriptions
--  Run in Supabase SQL Editor
-- =============================================================================

-- Add optional FK so each payment can reference the subscription it was made for
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS subscription_id uuid
    REFERENCES public.student_subscriptions(id) ON DELETE SET NULL;
