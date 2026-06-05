-- ============================================================================
--  ACADÉMIE NOOR — School Management System
--  Complete PostgreSQL / Supabase schema
--  Run this in the Supabase SQL Editor (Project: flvsycnkozszxblfxqvg)
-- ============================================================================
--  Sections:
--    1. Extensions & enums
--    2. Tables (core domain)
--    3. Indexes
--    4. Triggers (updated_at, derived counters)
--    5. Views (dashboard / reports helpers)
--    6. Row Level Security (RLS) policies
--    7. Seed data (optional starter rows)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS & ENUMS
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()

do $$ begin
  create type class_type      as enum ('COURSES', 'FORMATION');
  exception when duplicate_object then null; end $$;
do $$ begin
  create type school_level    as enum ('PRIMARY', 'CEM', 'LYCEE', 'OTHER');
  exception when duplicate_object then null; end $$;
do $$ begin
  create type pay_model        as enum ('FIXED', 'PER_SEANCE');
  exception when duplicate_object then null; end $$;
do $$ begin
  create type student_status   as enum ('ACTIVE', 'EXPIRED', 'SUSPENDED');
  exception when duplicate_object then null; end $$;
do $$ begin
  create type pay_method        as enum ('cash', 'card', 'transfer');
  exception when duplicate_object then null; end $$;
do $$ begin
  create type attendance_status as enum ('PRESENT', 'ABSENT', 'LATE', 'DEBT');
  exception when duplicate_object then null; end $$;
do $$ begin
  create type app_role          as enum ('ADMIN', 'STAFF', 'TEACHER', 'STUDENT', 'PARENT');
  exception when duplicate_object then null; end $$;
do $$ begin
  create type notif_type        as enum ('payment','seance','salary','announcement','attendance','message','late');
  exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 2. TABLES
-- ----------------------------------------------------------------------------

-- App users / profiles (linked to auth.users when using Supabase Auth) -------
create table if not exists profiles (
  id           uuid primary key default gen_random_uuid(),
  auth_uid     uuid unique,                       -- references auth.users.id
  role         app_role not null default 'ADMIN',
  full_name    text,
  username     text unique,
  email        text,
  phone        text,
  -- optional links to a domain row depending on role:
  teacher_id   uuid,
  student_id   uuid,
  parent_id    uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- School settings (single row) ----------------------------------------------
create table if not exists school_settings (
  id            int primary key default 1,
  name          text not null default 'Académie Noor',
  address       text,
  phone         text,
  email         text,
  logo_url      text,
  academic_year text default '2025-2026',
  currency      text default 'DZD',
  updated_at    timestamptz not null default now(),
  constraint single_row check (id = 1)
);

-- Modules (subjects) ---------------------------------------------------------
create table if not exists modules (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  name_ar    text,
  created_at timestamptz not null default now()
);

-- Classes --------------------------------------------------------------------
create table if not exists classes (
  id          uuid primary key default gen_random_uuid(),
  type        class_type not null default 'COURSES',
  name        text,                       -- used for FORMATION
  level       school_level,
  year        text,                       -- used for COURSES (e.g. "2ème")
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Groups (within a class), with capacity limit ------------------------------
create table if not exists groups (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references classes(id) on delete cascade,
  name       text not null,
  capacity   int  not null default 20 check (capacity > 0),
  created_at timestamptz not null default now()
);

-- Teachers -------------------------------------------------------------------
create table if not exists teachers (
  id            uuid primary key default gen_random_uuid(),
  first_name    text not null,
  last_name     text not null,
  phone         text,
  email         text,
  pay_model     pay_model not null default 'FIXED',
  base_salary   numeric(12,2),            -- when FIXED
  seance_rate   numeric(12,2),            -- when PER_SEANCE
  module_ids    uuid[] default '{}',      -- subjects taught
  unpaid_months int default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Staff (administration) -----------------------------------------------------
create table if not exists staff (
  id            uuid primary key default gen_random_uuid(),
  first_name    text not null,
  last_name     text not null,
  position      text,
  phone         text,
  email         text,
  base_salary   numeric(12,2),
  unpaid_months int default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Plans (timetable sessions / emploi du temps) ------------------------------
create table if not exists plans (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  class_id    uuid references classes(id) on delete set null,
  group_id    uuid references groups(id)  on delete set null,
  module_id   uuid references modules(id) on delete set null,
  teacher_id  uuid references teachers(id) on delete set null,
  day_of_week int check (day_of_week between 0 and 6),  -- 0 = Monday ... 6 = Sunday
  start_time  time,
  end_time    time,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Subscription types ---------------------------------------------------------
create table if not exists subscription_types (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  plan_id        uuid references plans(id) on delete set null,
  days           int,                       -- null when expiry disabled
  seances_count  int  not null default 0,
  per_seance     numeric(12,2) not null default 0,
  total          numeric(12,2) not null default 0,
  expiry_enabled boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Parents --------------------------------------------------------------------
create table if not exists parents (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  phone       text,
  email       text,
  alert_prefs jsonb default '{"payments":true,"present":true,"absent":true,"late":true}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Students -------------------------------------------------------------------
create table if not exists students (
  id                 uuid primary key default gen_random_uuid(),
  first_name         text not null,
  last_name          text not null,
  birth_date         date,
  birth_place        text,
  id_card            text,
  school_num         text,
  class_id           uuid references classes(id) on delete set null,
  group_id           uuid references groups(id)  on delete set null,
  sub_type_id        uuid references subscription_types(id) on delete set null,
  sub_price          numeric(12,2) default 0,
  discount_pct       numeric(5,2)  default 0,
  final_price        numeric(12,2) default 0,
  paid               numeric(12,2) default 0,
  seances_total      int default 0,
  seances_remaining  int default 0,
  debt_seance_used   boolean not null default false,  -- one free debt séance rule
  start_date         date,
  expiry_date        date,
  expiry_enabled     boolean default true,
  status             student_status not null default 'ACTIVE',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
-- debt is derived: final_price - paid (exposed via the students_v view)

-- Many-to-many: parent <-> student (children) -------------------------------
create table if not exists parent_students (
  parent_id  uuid not null references parents(id)  on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  primary key (parent_id, student_id)
);

-- Student payments -----------------------------------------------------------
create table if not exists payments (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references students(id) on delete cascade,
  amount       numeric(12,2) not null check (amount > 0),
  method       pay_method not null default 'cash',
  paid_at      date not null default current_date,
  collected_by text,
  note         text,
  created_at   timestamptz not null default now()
);

-- Teacher / staff acomptes (salary advances) --------------------------------
create table if not exists acomptes (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid references teachers(id) on delete cascade,
  staff_id    uuid references staff(id)    on delete cascade,
  amount      numeric(12,2) not null,
  note        text,
  settled     boolean not null default false,
  given_at    date not null default current_date,
  created_at  timestamptz not null default now(),
  check (teacher_id is not null or staff_id is not null)
);

-- Teacher / staff absences (deductions) -------------------------------------
create table if not exists absences (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid references teachers(id) on delete cascade,
  staff_id    uuid references staff(id)    on delete cascade,
  cost        numeric(12,2) not null default 0,
  note        text,
  settled     boolean not null default false,
  happened_at date not null default current_date,
  created_at  timestamptz not null default now(),
  check (teacher_id is not null or staff_id is not null)
);

-- Salary payments to teachers / staff ---------------------------------------
create table if not exists salary_payments (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid references teachers(id) on delete cascade,
  staff_id    uuid references staff(id)    on delete cascade,
  amount      numeric(12,2) not null,
  period      text,                         -- e.g. "2026-05"
  paid_at     date not null default current_date,
  created_at  timestamptz not null default now(),
  check (teacher_id is not null or staff_id is not null)
);

-- Attendance records (per session, per student) ------------------------------
create table if not exists attendance (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid references plans(id)    on delete cascade,
  student_id  uuid references students(id) on delete cascade,
  status      attendance_status not null,
  session_date date not null default current_date,
  is_debt     boolean not null default false,  -- consumed the one debt séance
  created_at  timestamptz not null default now(),
  unique (plan_id, student_id, session_date)
);

-- Expense categories ---------------------------------------------------------
create table if not exists expense_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now()
);

-- Expenses -------------------------------------------------------------------
create table if not exists expenses (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid references expense_categories(id) on delete set null,
  category    text,                          -- denormalized label for convenience
  name        text not null,
  amount      numeric(12,2) not null default 0,
  spent_at    date not null default current_date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Announcements --------------------------------------------------------------
create table if not exists announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  audience    text[] not null default '{}',   -- subset of {STUDENTS,TEACHERS,PARENTS}
  sent_to     int default 0,
  sent_at     date not null default current_date,
  created_at  timestamptz not null default now()
);

-- Notifications (admin/staff feed + targeted parent messages) ---------------
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  recipient_role app_role,                    -- broad audience (e.g. STAFF)
  parent_id   uuid references parents(id) on delete cascade,  -- targeted parent
  student_id  uuid references students(id) on delete set null,
  type        notif_type not null default 'message',
  source      app_role,                        -- who created it (ADMIN / TEACHER)
  title       text,
  message     text not null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. INDEXES
-- ----------------------------------------------------------------------------
create index if not exists idx_groups_class       on groups(class_id);
create index if not exists idx_plans_class         on plans(class_id);
create index if not exists idx_plans_teacher       on plans(teacher_id);
create index if not exists idx_students_class      on students(class_id);
create index if not exists idx_students_subtype    on students(sub_type_id);
create index if not exists idx_students_status     on students(status);
create index if not exists idx_payments_student    on payments(student_id);
create index if not exists idx_attendance_plan     on attendance(plan_id);
create index if not exists idx_attendance_student  on attendance(student_id);
create index if not exists idx_parent_students_p   on parent_students(parent_id);
create index if not exists idx_parent_students_s   on parent_students(student_id);
create index if not exists idx_notifications_parent on notifications(parent_id);
create index if not exists idx_expenses_category   on expenses(category_id);
create index if not exists idx_acomptes_teacher    on acomptes(teacher_id);
create index if not exists idx_absences_teacher    on absences(teacher_id);

-- ----------------------------------------------------------------------------
-- 4. TRIGGERS — keep updated_at fresh
-- ----------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','school_settings','classes','teachers','staff','plans',
    'subscription_types','parents','students','expenses'
  ] loop
    execute format(
      'drop trigger if exists trg_%1$s_updated on %1$s;
       create trigger trg_%1$s_updated before update on %1$s
       for each row execute function set_updated_at();', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 5. VIEWS — convenient derived data
-- ----------------------------------------------------------------------------

-- Classes with student and group counts -------------------------------------
create or replace view classes_v as
select
  c.*,
  (select count(*) from students s where s.class_id = c.id) as students_count,
  (select count(*) from groups  g where g.class_id = c.id)  as groups_count
from classes c;

-- Students with derived debt + class/sub labels ------------------------------
create or replace view students_v as
select
  s.*,
  (s.final_price - s.paid)                                   as debt,
  case
    when c.type = 'FORMATION' then coalesce(c.name,'') || ' · ' || coalesce(c.year,'')
    else coalesce(c.level::text,'') || ' ' || coalesce(c.year,'')
  end                                                        as class_label,
  c.type                                                     as class_type,
  g.name                                                     as group_name,
  st.name                                                    as sub_type_name
from students s
left join classes c            on c.id  = s.class_id
left join groups g             on g.id  = s.group_id
left join subscription_types st on st.id = s.sub_type_id;

-- Group occupancy (current members vs capacity) -----------------------------
create or replace view groups_v as
select
  g.*,
  (select count(*) from students s where s.group_id = g.id) as current_count
from groups g;

-- Plans with readable labels -------------------------------------------------
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

-- Subscription type stats (students using it + total gain) ------------------
create or replace view subscription_stats_v as
select
  st.id,
  count(s.id)                                  as students_used,
  coalesce(sum(s.paid),0)                      as total_gain
from subscription_types st
left join students s on s.sub_type_id = st.id
group by st.id;

-- Dashboard KPI snapshot -----------------------------------------------------
create or replace view dashboard_totals_v as
select
  (select count(*) from students)                                  as students,
  (select count(*) from teachers)                                  as teachers,
  (select count(*) from classes)                                   as classes,
  (select count(*) from students where status = 'ACTIVE')          as active_subs,
  (select coalesce(sum(paid),0) from students)                     as revenue,
  (select coalesce(sum(final_price - paid),0) from students)       as debt,
  (select coalesce(sum(amount),0) from expenses)                   as expenses,
  (select coalesce(sum(coalesce(base_salary, seance_rate*20)),0) from teachers)
    + (select coalesce(sum(base_salary),0) from staff)             as salaries;

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
--    NOTE: With the anon key and no Supabase Auth wired yet, enable permissive
--    policies so the app works immediately. Tighten these once you add Auth.
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','school_settings','modules','classes','groups','teachers','staff',
    'plans','subscription_types','parents','students','parent_students','payments',
    'acomptes','absences','salary_payments','attendance','expense_categories',
    'expenses','announcements','notifications'
  ] loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "anon_all_%1$s" on %1$s;', t);
    -- Permissive policy: anon + authenticated may read/write.
    execute format(
      'create policy "anon_all_%1$s" on %1$s
         for all to anon, authenticated
         using (true) with check (true);', t);
  end loop;
end $$;

-- ============================================================================
--  EXAMPLE: tighter policies (commented). Enable after wiring Supabase Auth.
-- ----------------------------------------------------------------------------
--  create policy "admins manage students" on students
--    for all to authenticated
--    using ( exists (select 1 from profiles p
--                    where p.auth_uid = auth.uid()
--                      and p.role in ('ADMIN','STAFF')) );
--
--  create policy "parents read own children" on students
--    for select to authenticated
--    using ( exists (select 1 from parent_students ps
--                    join profiles p on p.parent_id = ps.parent_id
--                    where ps.student_id = students.id
--                      and p.auth_uid = auth.uid()) );
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 7. SEED DATA (starter rows — safe to edit/remove)
-- ----------------------------------------------------------------------------
insert into school_settings (id, name, address, phone, email)
values (1, 'Académie Noor', '12 Rue des Écoles, Alger', '021 00 00 00', 'contact@noor.edu')
on conflict (id) do nothing;

-- Modules
insert into modules (name, name_ar) values
  ('Math','رياضيات'), ('Physique','فيزياء'), ('Science','علوم'),
  ('Arabe','عربية'), ('Français','فرنسية'), ('Anglais','إنجليزية'),
  ('Espagnol','إسبانية'), ('Allemand','ألمانية'), ('Philosophie','فلسفة'),
  ('Histoire-Géo','تاريخ-جغرافيا'), ('Islamique','إسلامية')
on conflict (name) do nothing;

-- Expense categories
insert into expense_categories (name) values
  ('Loyer'), ('Électricité'), ('Fournitures'), ('Marketing'), ('Entretien'), ('Internet')
on conflict (name) do nothing;

-- Classes
insert into classes (type, name, level, year, description) values
  ('COURSES', null, 'LYCEE', '2ème', 'Tronc commun scientifique'),
  ('COURSES', null, 'CEM',   '4ème', 'Préparation BEM'),
  ('COURSES', null, 'PRIMARY','5ème','Cours de soutien'),
  ('FORMATION','Anglais Intensif','OTHER','B1','Formation langue'),
  ('FORMATION','Français Pro','OTHER','C1','Formation avancée'),
  ('COURSES', null, 'LYCEE', '3ème', 'Préparation BAC')
on conflict do nothing;

-- A couple of groups for the first two classes
insert into groups (class_id, name, capacity)
select id, 'Groupe 1', 20 from classes order by created_at limit 1;
insert into groups (class_id, name, capacity)
select id, 'Groupe 2', 20 from classes order by created_at limit 1;

-- Teachers
insert into teachers (first_name, last_name, phone, email, pay_model, base_salary, seance_rate, unpaid_months) values
  ('Karim','Cherif','0551 100 100','prof1@noor.edu','FIXED', 45000, null, 1),
  ('Amina','Haddad','0552 200 200','prof2@noor.edu','PER_SEANCE', null, 1200, 0),
  ('Reda','Bouzid','0553 300 300','prof3@noor.edu','FIXED', 52000, null, 0)
on conflict do nothing;

-- Staff
insert into staff (first_name, last_name, position, phone, base_salary, unpaid_months) values
  ('Sara','Mansouri','Secrétaire','0554 400 400', 32000, 0),
  ('Bilal','Ziani','Comptable','0555 500 500', 40000, 1)
on conflict do nothing;

-- Subscription types
insert into subscription_types (name, days, seances_count, per_seance, total, expiry_enabled) values
  ('Mensuel Standard', 30, 8,  750, 6000,  true),
  ('Mensuel Premium',  30, 12, 708, 8500,  true),
  ('Pack Séances 24',  null,24, 625, 15000, false),
  ('Trimestriel Intensif', 90, 36, 611, 22000, true)
on conflict do nothing;

-- ============================================================================
--  END OF SCHEMA
-- ============================================================================
