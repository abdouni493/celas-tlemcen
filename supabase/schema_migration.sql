-- ============================================================
--  Académie Noor — Full Schema Migration
--  Run once in Supabase Dashboard → SQL Editor → New query
--  Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE
-- ============================================================


-- ============================================================
-- 1. MISSING TABLE: formation_levels
-- ============================================================
CREATE TABLE IF NOT EXISTS public.formation_levels (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.formation_levels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_formation_levels" ON public.formation_levels;
CREATE POLICY "allow_all_formation_levels"
  ON public.formation_levels FOR ALL USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formation_levels TO anon, authenticated;


-- ============================================================
-- 2. MISSING TABLE: student_subscriptions (history)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.student_subscriptions (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id     uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  sub_type_id    uuid REFERENCES public.subscription_types(id) ON DELETE SET NULL,
  sub_type_name  text NOT NULL DEFAULT '',
  plan_id        uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  plan_name      text DEFAULT '',
  class_id       uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  class_name     text DEFAULT '',
  group_name     text DEFAULT '',
  teacher_name   text DEFAULT '',
  total_price    numeric NOT NULL DEFAULT 0,
  seances_total  integer NOT NULL DEFAULT 0,
  start_date     date,
  expiry_date    date,
  expiry_enabled boolean NOT NULL DEFAULT false,
  -- ACTIVE | EXPIRED | REMOVED
  status         text NOT NULL DEFAULT 'ACTIVE',
  assigned_at    timestamptz NOT NULL DEFAULT now(),
  ended_at       timestamptz
);
ALTER TABLE public.student_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_student_subscriptions" ON public.student_subscriptions;
CREATE POLICY "allow_all_student_subscriptions"
  ON public.student_subscriptions FOR ALL USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_subscriptions TO anon, authenticated;


-- ============================================================
-- 3. MISSING COLUMNS on existing tables
--    (ALTER COLUMN … ADD COLUMN IF NOT EXISTS)
-- ============================================================

-- students: class_id and group_id might already exist — skip if so
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id)  ON DELETE SET NULL;

-- teacher_seance_records: salary_payment_id link (needed by pay_teacher_seances RPC)
ALTER TABLE public.teacher_seance_records
  ADD COLUMN IF NOT EXISTS salary_payment_id uuid REFERENCES public.salary_payments(id) ON DELETE SET NULL;

-- salary_payments: pay_model column (needed by pay_teacher_seances RPC)
ALTER TABLE public.salary_payments
  ADD COLUMN IF NOT EXISTS pay_model text;


-- ============================================================
-- 4. UNIQUE CONSTRAINTS required for upsert operations
-- ============================================================

-- attendance: upsert on (plan_id, student_id, session_date)
ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_plan_student_date_key;
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_plan_student_date_key
  UNIQUE (plan_id, student_id, session_date);

-- teacher_attendance: upsert on (plan_id, teacher_id, session_date)
ALTER TABLE public.teacher_attendance
  DROP CONSTRAINT IF EXISTS teacher_attendance_plan_teacher_date_key;
ALTER TABLE public.teacher_attendance
  ADD CONSTRAINT teacher_attendance_plan_teacher_date_key
  UNIQUE (plan_id, teacher_id, session_date);


-- ============================================================
-- 5. VIEWS
-- ============================================================

-- ── classes_v ──────────────────────────────────────────────
CREATE OR REPLACE VIEW public.classes_v AS
SELECT
  c.*,
  COUNT(DISTINCT g.id)::integer AS groups_count,
  COUNT(DISTINCT s.id)::integer AS students_count
FROM public.classes c
LEFT JOIN public.groups   g ON g.class_id = c.id
LEFT JOIN public.students s ON s.class_id = c.id
GROUP BY c.id;

GRANT SELECT ON public.classes_v TO anon, authenticated;


-- ── groups_v ───────────────────────────────────────────────
CREATE OR REPLACE VIEW public.groups_v AS
SELECT
  g.*,
  COUNT(s.id)::integer AS current_count
FROM public.groups   g
LEFT JOIN public.students s ON s.group_id = g.id
GROUP BY g.id;

GRANT SELECT ON public.groups_v TO anon, authenticated;


-- ── plans_v ────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.plans_v AS
SELECT
  p.*,
  m.name                                              AS module_name,
  cl.name                                             AS class_name,
  CASE
    WHEN cl.type = 'FORMATION'
      THEN COALESCE(cl.name,'') ||
           CASE WHEN cl.year IS NOT NULL THEN ' · ' || cl.year ELSE '' END
    ELSE TRIM(
      CASE cl.level
        WHEN 'PRIMARY' THEN 'Primaire'
        WHEN 'CEM'     THEN 'CEM'
        WHEN 'LYCEE'   THEN 'Lycée'
        ELSE ''
      END || ' ' || COALESCE(cl.year,'')
    )
  END                                                 AS class_label,
  g.name                                              AS group_name,
  COALESCE(t.first_name || ' ' || t.last_name, '')   AS teacher_name,
  COUNT(DISTINCT s.id)::integer                       AS students_count
FROM public.plans p
LEFT JOIN public.modules          m   ON m.id  = p.module_id
LEFT JOIN public.classes          cl  ON cl.id = p.class_id
LEFT JOIN public.groups           g   ON g.id  = p.group_id
LEFT JOIN public.teachers         t   ON t.id  = p.teacher_id
LEFT JOIN public.subscription_types st ON st.plan_id = p.id
LEFT JOIN public.students          s  ON s.sub_type_id = st.id
GROUP BY p.id, m.name, cl.name, cl.type, cl.level, cl.year,
         g.name, t.first_name, t.last_name;

GRANT SELECT ON public.plans_v TO anon, authenticated;


-- ── students_v ─────────────────────────────────────────────
-- Resolves class/group via subscription chain for students
-- whose class_id/group_id columns may be null (legacy rows).
CREATE OR REPLACE VIEW public.students_v AS
SELECT
  s.*,
  -- derived debt
  GREATEST(0, COALESCE(s.final_price,0) - COALESCE(s.paid,0))   AS debt,
  -- subscription type
  st.name                                                         AS sub_type_name,
  -- plan (via sub type)
  pl.id                                                           AS plan_id,
  COALESCE(m.name, pl.name)                                      AS plan_name,
  -- class: prefer direct column, fall back through sub chain
  COALESCE(s.class_id, pl.class_id)                              AS resolved_class_id,
  CASE
    WHEN cl.type = 'FORMATION'
      THEN COALESCE(cl.name,'') ||
           CASE WHEN cl.year IS NOT NULL THEN ' · ' || cl.year ELSE '' END
    ELSE TRIM(
      CASE cl.level
        WHEN 'PRIMARY' THEN 'Primaire'
        WHEN 'CEM'     THEN 'CEM'
        WHEN 'LYCEE'   THEN 'Lycée'
        ELSE ''
      END || ' ' || COALESCE(cl.year,'')
    )
  END                                                             AS class_label,
  -- group: prefer direct column, fall back through plan
  COALESCE(grp.name, grp2.name)                                  AS group_name
FROM public.students s
LEFT JOIN public.subscription_types st   ON st.id  = s.sub_type_id
LEFT JOIN public.plans              pl   ON pl.id  = st.plan_id
LEFT JOIN public.modules            m    ON m.id   = pl.module_id
LEFT JOIN public.classes            cl   ON cl.id  = COALESCE(s.class_id, pl.class_id)
LEFT JOIN public.groups             grp  ON grp.id = s.group_id
LEFT JOIN public.groups             grp2 ON grp2.id = pl.group_id;

GRANT SELECT ON public.students_v TO anon, authenticated;

-- Alias: the store reads "class_id" from students_v; expose resolved_class_id as class_id
-- by re-creating the view with class_id column name
CREATE OR REPLACE VIEW public.students_v AS
SELECT
  s.*,
  GREATEST(0, COALESCE(s.final_price,0) - COALESCE(s.paid,0))   AS debt,
  st.name                                                         AS sub_type_name,
  pl.id                                                           AS plan_id,
  COALESCE(m.name, pl.name)                                      AS plan_name,
  COALESCE(s.class_id, pl.class_id)                              AS class_id,
  CASE
    WHEN cl.type = 'FORMATION'
      THEN COALESCE(cl.name,'') ||
           CASE WHEN cl.year IS NOT NULL THEN ' · ' || cl.year ELSE '' END
    ELSE TRIM(
      CASE cl.level
        WHEN 'PRIMARY' THEN 'Primaire'
        WHEN 'CEM'     THEN 'CEM'
        WHEN 'LYCEE'   THEN 'Lycée'
        ELSE ''
      END || ' ' || COALESCE(cl.year,'')
    )
  END                                                             AS class_label,
  COALESCE(grp.name, grp2.name)                                  AS group_name
FROM public.students s
LEFT JOIN public.subscription_types st   ON st.id  = s.sub_type_id
LEFT JOIN public.plans              pl   ON pl.id  = st.plan_id
LEFT JOIN public.modules            m    ON m.id   = pl.module_id
LEFT JOIN public.classes            cl   ON cl.id  = COALESCE(s.class_id, pl.class_id)
LEFT JOIN public.groups             grp  ON grp.id = s.group_id
LEFT JOIN public.groups             grp2 ON grp2.id = pl.group_id;

GRANT SELECT ON public.students_v TO anon, authenticated;


-- ── subscription_stats_v ───────────────────────────────────
CREATE OR REPLACE VIEW public.subscription_stats_v AS
SELECT
  st.id,
  COUNT(s.id)::integer       AS students_used,
  COALESCE(SUM(s.paid), 0)   AS total_gain
FROM public.subscription_types st
LEFT JOIN public.students s ON s.sub_type_id = st.id
GROUP BY st.id;

GRANT SELECT ON public.subscription_stats_v TO anon, authenticated;


-- ── dashboard_totals_v ─────────────────────────────────────
CREATE OR REPLACE VIEW public.dashboard_totals_v AS
SELECT
  (SELECT COUNT(*)  FROM public.students)::integer                              AS students,
  (SELECT COUNT(*)  FROM public.teachers)::integer                              AS teachers,
  (SELECT COUNT(*)  FROM public.classes)::integer                               AS classes,
  (SELECT COUNT(*)  FROM public.students WHERE status = 'ACTIVE')::integer      AS active_subs,
  COALESCE((
    SELECT SUM(amount) FROM public.payments
    WHERE date_trunc('month', paid_at::date::timestamptz)
        = date_trunc('month', now())
  ), 0)                                                                         AS revenue,
  COALESCE((
    SELECT SUM(GREATEST(0, COALESCE(final_price,0) - COALESCE(paid,0)))
    FROM public.students
  ), 0)                                                                         AS debt,
  COALESCE((
    SELECT SUM(amount) FROM public.expenses
    WHERE date_trunc('month', spent_at::date::timestamptz)
        = date_trunc('month', now())
  ), 0)                                                                         AS expenses,
  COALESCE((
    SELECT SUM(amount) FROM public.salary_payments
    WHERE date_trunc('month', paid_at::date::timestamptz)
        = date_trunc('month', now())
  ), 0)                                                                         AS salaries;

GRANT SELECT ON public.dashboard_totals_v TO anon, authenticated;


-- ── teacher_unpaid_seances_v ───────────────────────────────
CREATE OR REPLACE VIEW public.teacher_unpaid_seances_v AS
SELECT
  tsr.*,
  pl.name                                             AS plan_name,
  pl.start_time,
  pl.end_time,
  pl.days_of_week,
  cl.id                                               AS class_id,
  CASE
    WHEN cl.type = 'FORMATION'
      THEN COALESCE(cl.name,'') ||
           CASE WHEN cl.year IS NOT NULL THEN ' · ' || cl.year ELSE '' END
    ELSE TRIM(
      CASE cl.level
        WHEN 'PRIMARY' THEN 'Primaire'
        WHEN 'CEM'     THEN 'CEM'
        WHEN 'LYCEE'   THEN 'Lycée'
        ELSE ''
      END || ' ' || COALESCE(cl.year,'')
    )
  END                                                 AS class_label
FROM public.teacher_seance_records tsr
LEFT JOIN public.plans   pl ON pl.id = tsr.plan_id
LEFT JOIN public.classes cl ON cl.id = pl.class_id
WHERE tsr.is_paid = false;

GRANT SELECT ON public.teacher_unpaid_seances_v TO anon, authenticated;


-- ── subscription_usage_v (export helper) ──────────────────
CREATE OR REPLACE VIEW public.subscription_usage_v AS
SELECT
  s.id              AS student_id,
  s.first_name,
  s.last_name,
  st.name           AS subscription_name,
  s.seances_total,
  s.seances_remaining,
  s.start_date,
  s.expiry_date,
  s.status
FROM public.students s
LEFT JOIN public.subscription_types st ON st.id = s.sub_type_id;

GRANT SELECT ON public.subscription_usage_v TO anon, authenticated;


-- ============================================================
-- 6. RPC FUNCTIONS
-- ============================================================

-- ── list_parents_with_children ─────────────────────────────
CREATE OR REPLACE FUNCTION public.list_parents_with_children()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT json_agg(
    json_build_object(
      'id',          p.id,
      'full_name',   p.full_name,
      'phone',       p.phone,
      'email',       p.email,
      'alert_prefs', p.alert_prefs,
      'created_at',  p.created_at,
      'children', COALESCE((
        SELECT json_agg(json_build_object(
          'id',               sv.id,
          'first_name',       sv.first_name,
          'last_name',        sv.last_name,
          'birth_date',       sv.birth_date,
          'birth_place',      sv.birth_place,
          'id_card',          sv.id_card,
          'school_num',       sv.school_num,
          'class_id',         sv.class_id,
          'class_label',      sv.class_label,
          'group_name',       sv.group_name,
          'sub_type_id',      sv.sub_type_id,
          'sub_type_name',    sv.sub_type_name,
          'sub_price',        sv.sub_price,
          'discount_pct',     sv.discount_pct,
          'final_price',      sv.final_price,
          'paid',             sv.paid,
          'debt',             sv.debt,
          'seances_total',    sv.seances_total,
          'seances_remaining',sv.seances_remaining,
          'debt_seance_used', sv.debt_seance_used,
          'start_date',       sv.start_date,
          'expiry_date',      sv.expiry_date,
          'expiry_enabled',   sv.expiry_enabled,
          'status',           sv.status,
          'is_free',          sv.is_free
        ))
        FROM public.parent_students ps2
        JOIN public.students_v sv ON sv.id = ps2.student_id
        WHERE ps2.parent_id = p.id
      ), '[]'::json)
    )
  )
  FROM public.parents p;
$$;

GRANT EXECUTE ON FUNCTION public.list_parents_with_children() TO anon, authenticated;


-- ── record_teacher_seance ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_teacher_seance(
  p_teacher_id       uuid,
  p_plan_id          uuid,
  p_session_date     date,
  p_students_present integer,
  p_per_seance_price numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher  public.teachers%ROWTYPE;
  v_earning  numeric := 0;
  v_id       uuid;
BEGIN
  SELECT * INTO v_teacher FROM public.teachers WHERE id = p_teacher_id;

  IF v_teacher.pay_model = 'PER_SEANCE' THEN
    v_earning := COALESCE(v_teacher.seance_rate, 0);
  ELSIF v_teacher.pay_model = 'PERCENTAGE' THEN
    v_earning := GREATEST(
      COALESCE(v_teacher.min_per_seance, 0),
      COALESCE(v_teacher.percentage_rate, 0)
        * COALESCE(p_per_seance_price, 0)
        * p_students_present
    );
  END IF;

  INSERT INTO public.teacher_seance_records (
    teacher_id, plan_id, session_date,
    students_present, revenue_generated, teacher_earning,
    is_paid, recorded_at
  ) VALUES (
    p_teacher_id, p_plan_id, p_session_date,
    p_students_present,
    COALESCE(p_per_seance_price, 0) * p_students_present,
    v_earning,
    false,
    now()
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_teacher_seance(uuid, uuid, date, integer, numeric)
  TO anon, authenticated;


-- ── pay_teacher_seances ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.pay_teacher_seances(
  p_teacher_id uuid,
  p_seance_ids uuid[],
  p_amount     numeric,
  p_note       text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id uuid;
BEGIN
  INSERT INTO public.salary_payments (teacher_id, amount, note, pay_model, paid_at)
  VALUES (p_teacher_id, p_amount, p_note, 'PER_SEANCE', CURRENT_DATE)
  RETURNING id INTO v_payment_id;

  UPDATE public.teacher_seance_records
  SET is_paid           = true,
      paid_at           = now(),
      salary_payment_id = v_payment_id
  WHERE id = ANY(p_seance_ids)
    AND teacher_id = p_teacher_id;

  RETURN v_payment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pay_teacher_seances(uuid, uuid[], numeric, text)
  TO anon, authenticated;


-- ============================================================
-- 7. ENSURE RLS + GRANTS on all tables (idempotent sweep)
-- ============================================================
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'profiles','school_settings','modules','classes','groups',
    'teachers','staff','plans','subscription_types','parents',
    'students','parent_students','payments','acomptes','absences',
    'salary_payments','attendance','expense_categories','expenses',
    'announcements','notifications','teacher_attendance',
    'teacher_seance_records','formation_levels','student_subscriptions'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format(
        'DROP POLICY IF EXISTS "allow_all_%s" ON public.%I',
        tbl, tbl
      );
      EXECUTE format(
        'CREATE POLICY "allow_all_%s" ON public.%I FOR ALL USING (true) WITH CHECK (true)',
        tbl, tbl
      );
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated',
        tbl
      );
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'Table % does not exist, skipping.', tbl;
    END;
  END LOOP;
END;
$$;
