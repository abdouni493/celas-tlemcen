# Académie Noor — School Management (React + Vite + Supabase)

A bilingual (FR/AR, RTL) role-based school management app, connected to Supabase.

## What's inside

```
academie-noor/
├── index.html
├── package.json
├── vite.config.js
├── supabase/
│   └── schema.sql          ← full database (run this first)
└── src/
    ├── main.jsx
    ├── App.jsx             ← all UI + screens (3,000+ lines)
    └── lib/
        ├── db.js           ← Supabase data-access layer (URL + key pre-filled)
        ├── store.js        ← live store; maps DB rows → UI shapes
        └── DataProvider.jsx← optional context variant (alternative wiring)
```

Your Supabase project is already wired in `src/lib/db.js`:
- URL: `https://flvsycnkozszxblfxqvg.supabase.co`
- Anon key: embedded

---

## Quick start

```bash
# 1) Create the database
#    Supabase dashboard → SQL Editor → paste supabase/schema.sql → Run

# 2) Install & run
npm install
npm run dev
```

Open http://localhost:5173 — the app loads all data from Supabase on startup
(spinner while loading, error screen with retry if the DB is unreachable).

## Status of the data wiring

- **Reads:** every screen reads live data from Supabase (no mock data remains).
- **Writes:** fully wired on **Classes** (create / delete persist) — use it as the
  reference pattern. The other screens still need their create/edit/delete handlers
  pointed at `db.*`. Use the Copilot prompt below to finish them.

---

## 🤖 Prompt to paste into GitHub Copilot (Chat / Agent mode)

> You are working in a Vite + React app (`src/App.jsx`) connected to Supabase via
> `src/lib/db.js` (the `db` object) and `src/lib/store.js` (which fills module-level
> arrays `STUDENTS, CLASSES, GROUPS, TEACHERS, STAFF, PLANS, SUB_TYPES, EXPENSES,
> ANNOUNCEMENTS, PARENTS, totals`). A `useRefresh()` hook returns an async function
> that reloads all data from Supabase and re-renders.
>
> **Goal:** make every screen's create / edit / delete / action buttons persist to
> Supabase, following the already-completed `ClassesScreen` as the reference pattern:
> each handler calls the matching `db.*` method, then `await refresh()`, wrapped in
> try/catch with `alert(e.message)` on failure. Remove any remaining in-memory
> mutations (`.splice`, `.push`, local `setRows/setState` that fake persistence).
>
> **Wire these screens** (function names in `src/App.jsx`):
> - `StudentsScreen`: create → `db.addStudent`; edit → `db.updateStudent`;
>   delete → `db.deleteStudent`; pay → `db.addPayment(studentId, amount, method, "Admin")`;
>   assign subscription → `db.assignSubscription(studentId, sub, startDate, expiryDate)`.
>   Load a student's payments with `db.paymentsForStudent(id)` when opening details.
> - `SubscriptionsScreen`: `db.addSubType / db.updateSubType / db.deleteSubType`.
> - `PlannerScreen`: `db.addPlan / db.updatePlan / db.deletePlan`,
>   `db.addModule(name)`, `db.addGroup({class_id,name,capacity})`.
> - `ExpensesScreen`: `db.addExpense / db.updateExpense / db.deleteExpense`,
>   `db.addExpenseCategory(name)`.
> - `ParentsScreen`: `db.addParent(row, childIds) / db.updateParent(id, patch, childIds)
>   / db.deleteParent(id)`.
> - `PeopleScreen` (teachers & staff): `db.addTeacher/updateTeacher/deleteTeacher`
>   and `db.addStaff/updateStaff/deleteStaff`; salary actions →
>   `db.addAcompte / db.addAbsence / db.paySalary`.
> - `AnnouncementsScreen`: `db.addAnnouncement(row) / db.deleteAnnouncement(id)`.
> - `AttendanceScreen`: save marks with
>   `db.saveAttendance(rows.map(r => ({ plan_id, student_id: r.id, status: r.mark,
>   session_date: today, is_debt: r.debt })))`; when marking a present that consumes a
>   séance, call `db.consumeSeance(student)` (it throws `"DEBT_SEANCE_USED"` if the one
>   free debt séance was already used — show the existing toast in that case); when a
>   student is marked late, insert a parent notification via
>   `db.addNotification({ parent_id, student_id, type:'late', source:'TEACHER', title, message })`.
> - `NotificationsScreen`: parents read `db.notificationsForParent(parentId)`, mark read
>   with `db.markNotificationRead(id)`; staff read `db.listNotifications('STAFF')`.
> - `SettingsScreen`: save with `db.saveSettings(patch)`; logo upload stays client-side
>   (data URL) unless you add Supabase Storage.
>
> **Field mapping for writes** (UI → DB column): firstName→first_name,
> lastName→last_name, classId→class_id, subTypeId→sub_type_id, finalPrice→final_price,
> seancesRemaining→seances_remaining, startDate→start_date, expiryDate→expiry_date,
> desc→description, baseSalary→base_salary, seanceRate→seance_rate, payModel→pay_model,
> day→day_of_week, startTime→start_time, endTime→end_time, seancesCount→seances_count,
> perSeance→per_seance. The `db` methods already expect snake_case payloads.
>
> **Constraints:** do not change the visual design, styling, animations, or i18n. Keep
> all existing screens, props, and component names. Only replace the data-mutation
> internals. After each screen, run `npm run dev` and confirm it compiles.
>
> Then run:
> ```
> npm install
> npm run dev
> ```
> and fix any runtime errors you see in the browser console, keeping the design intact.

---

## Optional: real authentication later

The schema ships with **permissive RLS** so the anon key works immediately. To lock it
down, create Supabase Auth users, add a `profiles` row per user (`auth_uid`, `role`,
and the relevant `teacher_id`/`parent_id`/`student_id`), then replace the permissive
policies with the role-scoped examples at the bottom of `supabase/schema.sql`, and use
`supabase.auth.signInWithPassword` in `Login`.
