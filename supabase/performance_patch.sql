-- ============================================================================
--  PERFORMANCE PATCH — Run this in your Supabase SQL Editor
--  Replaces slow views with efficient JOINs, adds RPC functions, and indexes
-- ============================================================================

-- Replace slow views with efficient versions using LEFT JOIN subqueries ------

-- classes_v: includes pre-computed student and group counts
drop view if exists classes_v cascade;
create view classes_v as
select
  c.*,
  (select count(*) from students s where s.class_id = c.id)  as students_count,
  (select count(*) from groups g where g.class_id = c.id)    as groups_count
from classes c;

-- plans_v: more efficient with pre-computed student count
drop view if exists plans_v cascade;
create or replace view plans_v as
select
  p.*,
  m.name                                                     as module_name,
  (t.first_name || ' ' || t.last_name)                       as teacher_name,
  g.name                                                     as group_name,
  case
    when c.type = 'FORMATION' then coalesce(c.name,'') || ' · ' || coalesce(c.year,'')
    else coalesce(c.level::text,'') || ' ' || coalesce(c.year,'')
  end                                                        as class_label,
  (select count(*) from students s where s.class_id = p.class_id) as students_count
from plans p
left join modules m  on m.id = p.module_id
left join teachers t on t.id = p.teacher_id
left join groups g   on g.id = p.group_id
left join classes c  on c.id = p.class_id;

-- dashboard_totals_v: use CTE for efficiency instead of 8 separate subqueries
drop view if exists dashboard_totals_v cascade;
create or replace view dashboard_totals_v as
with counts as (
  select
    (select count(*) from students)                                  as students,
    (select count(*) from teachers)                                  as teachers,
    (select count(*) from classes)                                   as classes,
    (select count(*) from students where status = 'ACTIVE')          as active_subs
),
money as (
  select
    (select coalesce(sum(paid),0) from students)                     as revenue,
    (select coalesce(sum(final_price - paid),0) from students)       as debt,
    (select coalesce(sum(amount),0) from expenses)                   as expenses
),
payroll as (
  select
    coalesce(sum(coalesce(base_salary, seance_rate*20)),0) +
    (select coalesce(sum(base_salary),0) from staff)                 as salaries
  from teachers
)
select
  counts.students, counts.teachers, counts.classes, counts.active_subs,
  money.revenue, money.debt, money.expenses, payroll.salaries
from counts, money, payroll;

-- Replace groups_v to avoid correlated subquery on every row
drop view if exists groups_v cascade;
create or replace view groups_v as
select
  g.*,
  coalesce(s.current_count, 0) as current_count
from groups g
left join (
  select group_id, count(*) as current_count from students where group_id is not null group by group_id
) s on s.group_id = g.id;

-- ============================================================================
--  NEW RPC FUNCTIONS
-- ============================================================================

-- pay_student: Insert payment + update student.paid in one RPC call
drop function if exists pay_student(uuid, numeric, text, text);
create or replace function pay_student(
  p_student_id uuid,
  p_amount numeric,
  p_method text default 'cash',
  p_collected_by text default null
)
returns uuid as $$
declare
  v_payment_id uuid;
  v_current_paid numeric;
begin
  -- Insert payment record
  insert into payments (student_id, amount, method, collected_by, paid_at)
  values (p_student_id, p_amount, p_method::pay_method, p_collected_by, current_date)
  returning id into v_payment_id;

  -- Get current paid amount
  select paid into v_current_paid from students where id = p_student_id;

  -- Update student's paid total
  update students
  set paid = coalesce(v_current_paid, 0) + p_amount
  where id = p_student_id;

  return v_payment_id;
end;
$$ language plpgsql strict;

-- list_parents_with_children: Fetch parents + their children in one call
drop function if exists list_parents_with_children();
create or replace function list_parents_with_children()
returns json as $$
declare
  v_result json;
begin
  select json_agg(
    jsonb_set(
      to_jsonb(p),
      '{children}',
      coalesce(
        (select json_agg(to_jsonb(s)) 
         from students_v s
         where exists (
           select 1 from parent_students ps 
           where ps.parent_id = p.id and ps.student_id = s.id
         )),
        '[]'::json
      )
    )
  ) into v_result
  from parents p;

  return coalesce(v_result, '[]'::json);
end;
$$ language plpgsql stable;

-- ============================================================================
--  13 NEW COMPOSITE INDEXES for the view JOINs
-- ============================================================================

-- For students_v (class + group + subtype lookups)
create index if not exists idx_students_class_id on students(class_id);
create index if not exists idx_students_group_id on students(group_id);
create index if not exists idx_students_sub_type_id on students(sub_type_id);

-- For groups_v (group lookup by class)
create index if not exists idx_groups_class_id on groups(class_id);

-- For plans_v (all the foreign keys)
create index if not exists idx_plans_class_id on plans(class_id);
create index if not exists idx_plans_teacher_id on plans(teacher_id);
create index if not exists idx_plans_group_id on plans(group_id);
create index if not exists idx_plans_module_id on plans(module_id);

-- For dashboard_totals_v (student status)
create index if not exists idx_students_status on students(status);

-- For subscription_stats_v (student sub_type_id)
create index if not exists idx_students_sub_type_id_2 on students(sub_type_id);

-- For parent_students lookup in list_parents_with_children
create index if not exists idx_parent_students_parent_id on parent_students(parent_id);
create index if not exists idx_parent_students_student_id on parent_students(student_id);

-- For payment queries
create index if not exists idx_payments_student_id on payments(student_id);

-- For expense summation
create index if not exists idx_expenses_amount on expenses(amount) where amount > 0;

-- ============================================================================
--  END OF PERFORMANCE PATCH
-- ============================================================================
