-- =============================================================================
--  student_subscriptions — full subscription assignment history per student
--  Run once in Supabase SQL editor (Dashboard → SQL Editor → New query)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.student_subscriptions (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id    uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  sub_type_id   uuid REFERENCES public.subscription_types(id) ON DELETE SET NULL,
  sub_type_name text NOT NULL DEFAULT '',
  plan_id       uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  plan_name     text DEFAULT '',
  class_id      uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  class_name    text DEFAULT '',
  group_name    text DEFAULT '',
  teacher_name  text DEFAULT '',
  total_price   numeric NOT NULL DEFAULT 0,
  seances_total integer NOT NULL DEFAULT 0,
  start_date    date,
  expiry_date   date,
  expiry_enabled boolean NOT NULL DEFAULT false,
  -- ACTIVE | EXPIRED | REMOVED
  status        text NOT NULL DEFAULT 'ACTIVE',
  assigned_at   timestamptz NOT NULL DEFAULT now(),
  ended_at      timestamptz
);

-- RLS: allow all operations (same policy as other tables in this project)
ALTER TABLE public.student_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_student_subscriptions" ON public.student_subscriptions;
CREATE POLICY "allow_all_student_subscriptions"
  ON public.student_subscriptions FOR ALL
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.student_subscriptions TO anon, authenticated;
