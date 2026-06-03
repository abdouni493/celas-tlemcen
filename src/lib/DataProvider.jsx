// ============================================================================
//  DataProvider.jsx — loads all Supabase data into a context whose collections
//  match the field names the existing screens already use, so screen logic
//  (.map / .filter / .reduce) keeps working. Mutations call db.* then refresh().
//
//  Usage in SchoolMS.jsx:
//    import { DataProvider, useData } from "./DataProvider";
//    Wrap <App/> body:  <DataProvider> ...Shell/Login... </DataProvider>
//    In a screen:       const { students, classes, refresh, actions } = useData();
// ============================================================================
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { db } from "./db";

const DataCtx = createContext(null);
export const useData = () => useContext(DataCtx);

// ---- mappers: SQL row  ->  shape the UI expects ----------------------------
const mapClass = (c) => ({
  id: c.id, type: c.type, name: c.name, level: c.level, year: c.year,
  desc: c.description, students: c.students ?? 0, groups: c.groups ?? 0,
});
const mapGroup = (g) => ({
  id: g.id, classId: g.class_id, name: g.name, capacity: g.capacity, current: g.current_count ?? 0,
});
const mapTeacher = (t) => ({
  id: t.id, firstName: t.first_name, lastName: t.last_name, phone: t.phone, email: t.email,
  payModel: t.pay_model, baseSalary: t.base_salary, seanceRate: t.seance_rate,
  modules: t.modules || [], unpaidMonths: t.unpaid_months || 0,
  acomptes: t.acomptes || [], absences: t.absences || [],
});
const mapStaff = (s) => ({
  id: s.id, firstName: s.first_name, lastName: s.last_name, position: s.position,
  phone: s.phone, email: s.email, baseSalary: s.base_salary, unpaidMonths: s.unpaid_months || 0,
  acomptes: s.acomptes || [], absences: s.absences || [],
});
const mapPlan = (p) => ({
  id: p.id, name: p.name || p.module_name, classId: p.class_id, className: p.class_label,
  groupId: p.group_id, group: p.group_name, module: p.module_name,
  day: p.day_of_week, startTime: (p.start_time || "").slice(0, 5), endTime: (p.end_time || "").slice(0, 5),
  teacherId: p.teacher_id, teacher: p.teacher_name, students: p.students_count ?? 0, gains: 0, debt: 0,
});
const mapSub = (s, stats) => ({
  id: s.id, name: s.name, planId: s.plan_id, days: s.days, seancesCount: s.seances_count,
  perSeance: s.per_seance, total: s.total, expiryEnabled: s.expiry_enabled,
  studentsUsed: stats?.students_used ?? 0, totalGain: stats?.total_gain ?? 0,
});
const mapStudent = (s, payments) => ({
  id: s.id, firstName: s.first_name, lastName: s.last_name, birthDate: s.birth_date,
  birthPlace: s.birth_place, idCard: s.id_card, schoolNum: s.school_num,
  classId: s.class_id, className: s.class_label, group: s.group_name,
  subTypeId: s.sub_type_id, subType: s.sub_type_name, subPrice: s.sub_price,
  discountPct: s.discount_pct, finalPrice: s.final_price, paid: s.paid, debt: s.debt,
  seancesTotal: s.seances_total, seancesRemaining: s.seances_remaining,
  debtSeanceUsed: s.debt_seance_used, startDate: s.start_date, expiryDate: s.expiry_date,
  expiryEnabled: s.expiry_enabled, status: s.status,
  payments: (payments || []).map((p) => ({ amount: p.amount, date: p.paid_at, method: p.method, collectedBy: p.collected_by })),
});
const mapExpense = (e) => ({ id: e.id, category: e.category, name: e.name, amount: e.amount, date: e.spent_at, categoryId: e.category_id });
const mapAnnouncement = (a) => ({ id: a.id, title: a.title, desc: a.description, audience: a.audience, sentTo: a.sent_to, date: a.sent_at });

export function DataProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [state, setState] = useState({
    settings: null, modules: [], classes: [], groups: [], teachers: [], staff: [],
    plans: [], subTypes: [], students: [], expenses: [], expenseCategories: [],
    announcements: [], parents: [], totals: {},
  });

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [settings, modules, classes, groups, teachers, staff, plans, subTypes,
             subStats, studentsRaw, expenses, expenseCategories, announcements, parents, totals] =
        await Promise.all([
          db.getSettings().catch(() => null), db.listModules(), db.listClasses(), db.listGroups(),
          db.listTeachers(), db.listStaff(), db.listPlans(), db.listSubTypes(), db.subStats(),
          db.listStudents(), db.listExpenses(), db.listExpenseCategories(), db.listAnnouncements(),
          db.listParents(), db.dashboardTotals().catch(() => ({})),
        ]);
      const statsById = Object.fromEntries(subStats.map((s) => [s.id, s]));
      setState({
        settings,
        modules: modules.map((m) => m.name),
        moduleRows: modules,
        classes: classes.map(mapClass),
        groups: groups.map(mapGroup),
        teachers: teachers.map(mapTeacher),
        staff: staff.map(mapStaff),
        plans: plans.map(mapPlan),
        subTypes: subTypes.map((s) => mapSub(s, statsById[s.id])),
        students: studentsRaw.map((s) => mapStudent(s)),
        expenses: expenses.map(mapExpense),
        expenseCategories: expenseCategories.map((c) => c.name),
        announcements: announcements.map(mapAnnouncement),
        parents: parents.map((p) => ({
          id: p.id, name: p.full_name, phone: p.phone, email: p.email,
          children: (p.children || []).map((c) => mapStudent(c)),
        })),
        totals: {
          students: totals.students ?? studentsRaw.length,
          teachers: totals.teachers ?? teachers.length,
          classes: totals.classes ?? classes.length,
          activeSubs: totals.active_subs ?? studentsRaw.filter((s) => s.status === "ACTIVE").length,
          monthRevenue: Number(totals.revenue ?? 0),
          debt: Number(totals.debt ?? 0),
          monthExpenses: Number(totals.expenses ?? 0),
          salaries: Number(totals.salaries ?? 0),
          profit: Number(totals.revenue ?? 0) - Number(totals.expenses ?? 0) - Number(totals.salaries ?? 0),
        },
      });
    } catch (e) {
      console.error(e); setError(e.message || "Erreur de connexion à la base de données");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // mutation helpers — each performs the write then refreshes the cache
  const wrap = (fn) => async (...args) => { const r = await fn(...args); await refresh(); return r; };
  const actions = {
    addClass: wrap(db.addClass), updateClass: wrap(db.updateClass), deleteClass: wrap(db.deleteClass),
    addGroup: wrap(db.addGroup), deleteGroup: wrap(db.deleteGroup),
    addTeacher: wrap(db.addTeacher), updateTeacher: wrap(db.updateTeacher), deleteTeacher: wrap(db.deleteTeacher),
    addStaff: wrap(db.addStaff), updateStaff: wrap(db.updateStaff), deleteStaff: wrap(db.deleteStaff),
    addPlan: wrap(db.addPlan), updatePlan: wrap(db.updatePlan), deletePlan: wrap(db.deletePlan),
    addModule: wrap(db.addModule),
    addSubType: wrap(db.addSubType), updateSubType: wrap(db.updateSubType), deleteSubType: wrap(db.deleteSubType),
    addStudent: wrap(db.addStudent), updateStudent: wrap(db.updateStudent), deleteStudent: wrap(db.deleteStudent),
    assignSubscription: wrap(db.assignSubscription),
    addPayment: wrap(db.addPayment),
    addParent: wrap(db.addParent), updateParent: wrap(db.updateParent), deleteParent: wrap(db.deleteParent),
    addExpense: wrap(db.addExpense), updateExpense: wrap(db.updateExpense), deleteExpense: wrap(db.deleteExpense),
    addExpenseCategory: wrap(db.addExpenseCategory),
    addAnnouncement: wrap(db.addAnnouncement), deleteAnnouncement: wrap(db.deleteAnnouncement),
    saveAttendance: wrap(db.saveAttendance), consumeSeance: wrap(db.consumeSeance),
    addNotification: wrap(db.addNotification),
  };

  return (
    <DataCtx.Provider value={{ ...state, loading, error, refresh, actions, db }}>
      {children}
    </DataCtx.Provider>
  );
}
