// ============================================================================
//  store.js — live, mutable data store that mirrors the old mock arrays.
//  Filled from Supabase at startup (and after any mutation) by loadAll().
//  Screens keep reading the same exported arrays; we just refill them.
// ============================================================================
import { db } from "./db";

// Exported live collections (same names/shapes the UI uses) ------------------
export const store = {
  MODULES: [],
  MODULES_FULL: [],
  CLASSES: [],
  GROUPS: [],
  TEACHERS: [],
  STAFF: [],
  PLANS: [],
  SUB_TYPES: [],
  STUDENTS: [],
  EXPENSES: [],
  EXPENSE_CATEGORIES: [],
  ANNOUNCEMENTS: [],
  PARENTS: [],
  NOTIFS: [],
  PARENT_NOTIFS: [],
  SETTINGS: null,
  totals: { students: 0, teachers: 0, classes: 0, activeSubs: 0, monthRevenue: 0, debt: 0, monthExpenses: 0, salaries: 0, profit: 0 },
  ready: false,
};

// --- helpers ---------------------------------------------------------------
export function addDays(dateStr, days) {
  if (!dateStr) return null;
  const d = new Date(dateStr); d.setDate(d.getDate() + (days || 0));
  return d.toISOString().slice(0, 10);
}
export function classLabel(c) {
  if (!c) return "";
  if (c.type === "FORMATION") return [c.name, c.year].filter(Boolean).join(" · ");
  const lv = { PRIMARY: "Primaire", CEM: "CEM", LYCEE: "Lycée", OTHER: "" }[c.level] || "";
  return `${lv} ${c.year || ""}`.trim();
}

// --- row mappers (SQL -> UI shape) -----------------------------------------
const mapClass = (c) => ({ id: c.id, type: c.type, name: c.name, level: c.level, year: c.year, desc: c.description, students: c.students_count ?? 0, groups: c.groups_count ?? 0 });
const mapGroup = (g) => ({ id: g.id, classId: g.class_id, name: g.name, capacity: g.capacity, current: g.current_count ?? 0 });
const mapTeacher = (t, acomptes = [], absences = []) => ({ id: t.id, firstName: t.first_name, lastName: t.last_name, phone: t.phone, email: t.email, payModel: t.pay_model, baseSalary: t.base_salary, seanceRate: t.seance_rate, percentageRate: t.percentage_rate, minPerSeance: t.min_per_seance, monthlyStartDate: t.monthly_start_date, modules: t.modules || [], unpaidMonths: t.unpaid_months || 0, acomptes, absences });
const mapStaff = (s, acomptes = [], absences = []) => ({ id: s.id, firstName: s.first_name, lastName: s.last_name, position: s.position, phone: s.phone, email: s.email, baseSalary: s.base_salary, unpaidMonths: s.unpaid_months || 0, acomptes, absences });
const mapAcompte = (a) => ({ id: a.id, amount: Number(a.amount), note: a.note, date: a.date || a.created_at?.slice(0, 10), settled: a.settled || false });
const mapAbsence = (a) => ({ id: a.id, cost: Number(a.cost), note: a.note, date: a.date || a.created_at?.slice(0, 10), settled: a.settled || false });
const mapPlan = (p) => ({ id: p.id, name: p.name || p.module_name, classId: p.class_id, className: p.class_label, groupId: p.group_id, group: p.group_name, module: p.module_name, day: p.day_of_week ?? 0, startTime: (p.start_time || "09:00").slice(0, 5), endTime: (p.end_time || "10:00").slice(0, 5), teacherId: p.teacher_id, teacher: p.teacher_name, students: p.students_count ?? 0, gains: 0, debt: 0 });
const mapSub = (s, st) => ({ id: s.id, name: s.name, planId: s.plan_id, days: s.days, seancesCount: s.seances_count, perSeance: s.per_seance, total: Number(s.total), expiryEnabled: s.expiry_enabled, studentsUsed: st?.students_used ?? 0, totalGain: Number(st?.total_gain ?? 0) });
const mapStudent = (s) => ({ id: s.id, firstName: s.first_name, lastName: s.last_name, birthDate: s.birth_date, birthPlace: s.birth_place, idCard: s.id_card, schoolNum: s.school_num, classId: s.class_id, className: s.class_label, group: s.group_name, subTypeId: s.sub_type_id, subType: s.sub_type_name, subPrice: Number(s.sub_price), discountPct: Number(s.discount_pct), finalPrice: Number(s.final_price), paid: Number(s.paid), debt: Number(s.debt), seancesTotal: s.seances_total, seancesRemaining: s.seances_remaining, debtSeanceUsed: s.debt_seance_used, startDate: s.start_date, expiryDate: s.expiry_date, expiryEnabled: s.expiry_enabled, status: s.status, isFree: s.is_free || false, payments: [] });
const mapExpense = (e) => ({ id: e.id, category: e.category, name: e.name, amount: Number(e.amount), date: e.spent_at, categoryId: e.category_id });
const mapAnn = (a) => ({ id: a.id, title: a.title, desc: a.description, audience: a.audience || [], sentTo: a.sent_to || 0, date: a.sent_at });
const mapNotif = (n) => ({ id: n.id, type: n.type, msg: n.message, title: n.title, from: n.source, time: new Date(n.created_at).toLocaleDateString("fr-FR"), read: n.read });

// --- selective reload functions (per-table) --------------------------------
export async function reloadStudents() {
  const students = await db.listStudents();
  store.STUDENTS = students.map(mapStudent);
  return store.STUDENTS;
}

export async function reloadClasses() {
  const classes = await db.listClasses();
  store.CLASSES = classes.map((c) => ({
    id: c.id, type: c.type, name: c.name, level: c.level, year: c.year,
    desc: c.description, students: c.students_count ?? 0, groups: c.groups_count ?? 0,
  }));
  return store.CLASSES;
}

export async function reloadGroups() {
  const groups = await db.listGroups();
  store.GROUPS = groups.map(mapGroup);
  return store.GROUPS;
}

export async function reloadPlans() {
  const plans = await db.listPlans();
  store.PLANS = plans.map(mapPlan);
  return store.PLANS;
}

export async function reloadSubTypes() {
  const [subTypes, subStats] = await Promise.all([db.listSubTypes(), db.subStats()]);
  const statsById = Object.fromEntries(subStats.map((s) => [s.id, s]));
  store.SUB_TYPES = subTypes.map((s) => mapSub(s, statsById[s.id]));
  return store.SUB_TYPES;
}

export async function reloadTeachers() {
  const [teachers, allAcomptes, allAbsences] = await Promise.all([
    db.listTeachers(), db.listAcomptes().catch(() => []), db.listAbsences().catch(() => []),
  ]);
  store.TEACHERS = teachers.map((t) => mapTeacher(
    t,
    allAcomptes.filter((a) => a.teacher_id === t.id).map(mapAcompte),
    allAbsences.filter((a) => a.teacher_id === t.id).map(mapAbsence),
  ));
  return store.TEACHERS;
}

export async function reloadStaff() {
  const [staff, allAcomptes, allAbsences] = await Promise.all([
    db.listStaff(), db.listAcomptes().catch(() => []), db.listAbsences().catch(() => []),
  ]);
  store.STAFF = staff.map((s) => mapStaff(
    s,
    allAcomptes.filter((a) => a.staff_id === s.id).map(mapAcompte),
    allAbsences.filter((a) => a.staff_id === s.id).map(mapAbsence),
  ));
  return store.STAFF;
}

export async function reloadExpenses() {
  const [expenses, cats] = await Promise.all([db.listExpenses(), db.listExpenseCategories()]);
  store.EXPENSES = expenses.map(mapExpense);
  store.EXPENSE_CATEGORIES = cats.map((c) => c.name);
  return store.EXPENSES;
}

export async function reloadParents() {
  const parents = await db.listParents();
  store.PARENTS = parents.map((p) => ({
    id: p.id, name: p.full_name, phone: p.phone, email: p.email,
    children: (p.children || []).map(mapStudent),
  }));
  return store.PARENTS;
}

export async function reloadAnnouncements() {
  const anns = await db.listAnnouncements();
  store.ANNOUNCEMENTS = anns.map(mapAnn);
  return store.ANNOUNCEMENTS;
}

export async function reloadTotals() {
  const totals = await db.dashboardTotals().catch(() => ({}));
  store.totals = {
    students: totals.students ?? store.STUDENTS.length,
    teachers: totals.teachers ?? store.TEACHERS.length,
    classes: totals.classes ?? store.CLASSES.length,
    activeSubs: totals.active_subs ?? 0,
    monthRevenue: Number(totals.revenue ?? 0),
    debt: Number(totals.debt ?? 0),
    monthExpenses: Number(totals.expenses ?? 0),
    salaries: Number(totals.salaries ?? 0),
    profit: Number(totals.revenue ?? 0) - Number(totals.expenses ?? 0) - Number(totals.salaries ?? 0),
  };
  return store.totals;
}

// --- main loader (startup only) -----------------------------------------------
export async function loadAll() {
  const [settings, modules, classes, groups, teachers, staff, plans, subTypes, subStats,
         students, expenses, cats, anns, parents, totals, allAcomptes, allAbsences] = await Promise.all([
    db.getSettings().catch(() => null), db.listModules(), db.listClasses(), db.listGroups(),
    db.listTeachers(), db.listStaff(), db.listPlans(), db.listSubTypes(), db.subStats(),
    db.listStudents(), db.listExpenses(), db.listExpenseCategories(), db.listAnnouncements(),
    db.listParents(), db.dashboardTotals().catch(() => ({})),
    db.listAcomptes().catch(() => []), db.listAbsences().catch(() => []),
  ]);

  const statsById = Object.fromEntries(subStats.map((s) => [s.id, s]));
  const grps = groups.map(mapGroup);
  const studs = students.map(mapStudent);

  store.SETTINGS = settings;
  store.MODULES = modules.map((m) => m.name);
  store.MODULES_FULL = modules;
  // Use classes_v pre-computed counts instead of filtering
  store.CLASSES = classes.map((c) => ({
    id: c.id, type: c.type, name: c.name, level: c.level, year: c.year,
    desc: c.description, students: c.students_count ?? 0, groups: c.groups_count ?? 0,
  }));
  store.GROUPS = grps;
  store.TEACHERS = teachers.map((t) => mapTeacher(
    t,
    allAcomptes.filter((a) => a.teacher_id === t.id).map(mapAcompte),
    allAbsences.filter((a) => a.teacher_id === t.id).map(mapAbsence),
  ));
  store.STAFF = staff.map((s) => mapStaff(
    s,
    allAcomptes.filter((a) => a.staff_id === s.id).map(mapAcompte),
    allAbsences.filter((a) => a.staff_id === s.id).map(mapAbsence),
  ));
  store.PLANS = plans.map(mapPlan);
  store.SUB_TYPES = subTypes.map((s) => mapSub(s, statsById[s.id]));
  store.STUDENTS = studs;
  store.EXPENSES = expenses.map(mapExpense);
  store.EXPENSE_CATEGORIES = cats.map((c) => c.name);
  store.ANNOUNCEMENTS = anns.map(mapAnn);
  store.PARENTS = parents.map((p) => ({ id: p.id, name: p.full_name, phone: p.phone, email: p.email, children: (p.children || []).map(mapStudent) }));
  store.NOTIFS = [];
  store.PARENT_NOTIFS = [];
  store.totals = {
    students: totals.students ?? studs.length,
    teachers: totals.teachers ?? teachers.length,
    classes: totals.classes ?? classes.length,
    activeSubs: totals.active_subs ?? studs.filter((s) => s.status === "ACTIVE").length,
    monthRevenue: Number(totals.revenue ?? 0),
    debt: Number(totals.debt ?? 0),
    monthExpenses: Number(totals.expenses ?? 0),
    salaries: Number(totals.salaries ?? 0),
    profit: Number(totals.revenue ?? 0) - Number(totals.expenses ?? 0) - Number(totals.salaries ?? 0),
  };
  store.ready = true;
  return store;
}
