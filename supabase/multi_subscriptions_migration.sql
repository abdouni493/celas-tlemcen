-- =============================================================================
--  Multi-subscription migration
--  Run in Supabase SQL Editor
-- =============================================================================

-- 1. Add seances_remaining per subscription record (for tracking per-sub séances)
ALTER TABLE public.student_subscriptions
  ADD COLUMN IF NOT EXISTS seances_remaining integer;

-- Initialize from seances_total for any existing records
UPDATE public.student_subscriptions
SET seances_remaining = seances_total
WHERE seances_remaining IS NULL;

-- 2. Rebuild plans_v to expose class_type as a standalone column
--    (previously it was only used inside a CASE expression)
CREATE OR REPLACE VIEW public.plans_v AS
SELECT
  p.*,
  m.name                                                       AS module_name,
  (t.first_name || ' ' || t.last_name)                         AS teacher_name,
  g.name                                                       AS group_name,
  CASE
    WHEN c.type = 'FORMATION'
      THEN COALESCE(c.name, '') || ' · ' || COALESCE(c.year, '')
    ELSE COALESCE(c.level::text, '') || ' ' || COALESCE(c.year, '')
  END                                                          AS class_label,
  c.type                                                       AS class_type,
  (SELECT COUNT(*) FROM students s WHERE s.class_id = p.class_id) AS students_count
FROM plans p
LEFT JOIN modules  m ON m.id = p.module_id
LEFT JOIN teachers t ON t.id = p.teacher_id
LEFT JOIN groups   g ON g.id = p.group_id
LEFT JOIN classes  c ON c.id = p.class_id;

GRANT SELECT ON public.plans_v TO anon, authenticated;
