// ============================================================================
//  db.js — Supabase data-access layer for Académie Noor
//  Centralizes every query/mutation the UI needs. Import { db } and call.
//  Requires: npm i @supabase/supabase-js
// ============================================================================
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://flvsycnkozszxblfxqvg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdnN5Y25rb3pzenhibGZ4cXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzIzMzAsImV4cCI6MjA5NTY0ODMzMH0.xvA1Z4wG4__F0iuHPaqABZqvI9uDK9aqtnPpCYSASGg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ok = ({ data, error }) => { if (error) throw error; return data; };

export const db = {
  // ---- Auth --------------------------------------------------------------
  auth: {
    signUp: (email, password, meta) =>
      supabase.auth.signUp({ email, password, options: { data: meta } }),
    signIn: (email, password) =>
      supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
    getSession: () => supabase.auth.getSession(),
    setSession: (tokens) => supabase.auth.setSession(tokens),
    myProfile: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles")
        .select("*").eq("auth_uid", user.id).single();
      return data;
    },
  },

  // ---- Settings ----------------------------------------------------------
  getSettings: () => supabase.from("school_settings").select("*").eq("id", 1).single().then(ok),
  saveSettings: (patch) => supabase.from("school_settings").update(patch).eq("id", 1).select().single().then(ok),

  // ---- Logo upload (Supabase Storage — public bucket "logos") -------------
  uploadLogo: async (file) => {
    const ext = file.name?.split(".").pop() || "png";
    const fileName = `school-logo-${Date.now()}.${ext}`;
    try {
      // Ensure the "logos" public bucket exists
      const { error: bErr } = await supabase.storage.createBucket("logos", { public: true, fileSizeLimit: 5 * 1024 * 1024 });
      // Ignore "already exists" errors
      if (bErr && !bErr.message?.includes("already exists")) {
        console.warn("Bucket creation warning:", bErr.message);
      }
      // Upload the file
      const { error: upErr } = await supabase.storage
        .from("logos")
        .upload(fileName, file, { cacheControl: "3600", upsert: true });
      if (upErr) throw upErr;
      // Get the permanent public URL (never expires)
      const { data } = supabase.storage.from("logos").getPublicUrl(fileName);
      return data.publicUrl;
    } catch (storageErr) {
      console.warn("Storage upload failed, falling back to base64:", storageErr.message);
      // Fallback: convert to base64 data URL and save directly
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  },

  // ---- Modules -----------------------------------------------------------
  listModules: () => supabase.from("modules").select("*").order("name").then(ok),
  addModule: (name, name_ar) => supabase.from("modules").insert({ name, name_ar }).select().single().then(ok),

  // ---- Classes -----------------------------------------------------------
  listClasses: async () => {
    const { data, error } = await supabase.from("classes_v").select("*").order("created_at");
    if (error) return supabase.from("classes").select("*").order("created_at").then(ok);
    return data;
  },
  addClass: (row) => supabase.from("classes").insert(row).select().single().then(ok),
  updateClass: (id, patch) => supabase.from("classes").update(patch).eq("id", id).select().single().then(ok),
  deleteClass: (id) => supabase.from("classes").delete().eq("id", id).then(ok),

  // ---- Groups ------------------------------------------------------------
  listGroups: () => supabase.from("groups_v").select("*").order("created_at").then(ok),
  groupsForClass: (classId) => supabase.from("groups_v").select("*").eq("class_id", classId).then(ok),
  addGroup: (row) => supabase.from("groups").insert(row).select().single().then(ok),
  deleteGroup: (id) => supabase.from("groups").delete().eq("id", id).then(ok),

  // ---- Teachers ----------------------------------------------------------
  listTeachers: () => supabase.from("teachers").select("*").order("created_at").then(ok),
  addTeacher: (row) => supabase.from("teachers").insert(row).select().single().then(ok),
  updateTeacher: (id, patch) => supabase.from("teachers").update(patch).eq("id", id).select().single().then(ok),
  deleteTeacher: (id) => supabase.from("teachers").delete().eq("id", id).then(ok),

  // ---- Staff -------------------------------------------------------------
  listStaff: () => supabase.from("staff").select("*").order("created_at").then(ok),
  addStaff: (row) => supabase.from("staff").insert(row).select().single().then(ok),
  updateStaff: (id, patch) => supabase.from("staff").update(patch).eq("id", id).select().single().then(ok),
  deleteStaff: (id) => supabase.from("staff").delete().eq("id", id).then(ok),

  // ---- Plans (timetable) -------------------------------------------------
  listPlans: () => supabase.from("plans_v").select("*").order("start_time").then(ok),
  addPlan: (row) => supabase.from("plans").insert(row).select().single().then(ok),
  updatePlan: (id, patch) => supabase.from("plans").update(patch).eq("id", id).select().single().then(ok),
  deletePlan: (id) => supabase.from("plans").delete().eq("id", id).then(ok),

  // ---- Subscription types ------------------------------------------------
  listSubTypes: () => supabase.from("subscription_types").select("*").order("created_at").then(ok),
  subStats: () => supabase.from("subscription_stats_v").select("*").then(ok),
  addSubType: (row) => supabase.from("subscription_types").insert(row).select().single().then(ok),
  updateSubType: (id, patch) => supabase.from("subscription_types").update(patch).eq("id", id).select().single().then(ok),
  deleteSubType: (id) => supabase.from("subscription_types").delete().eq("id", id).then(ok),

  // ---- Students ----------------------------------------------------------
  listStudents: () => supabase.from("students_v").select("*").order("created_at").then(ok),
  studentsForClass: (classId) => supabase.from("students_v").select("*").eq("class_id", classId).then(ok),
  addStudent: (row) => supabase.from("students").insert(row).select().single().then(ok),
  updateStudent: (id, patch) => supabase.from("students").update(patch).eq("id", id).select().single().then(ok),
  deleteStudent: (id) => supabase.from("students").delete().eq("id", id).then(ok),
  assignSubscription: async (studentId, sub, startDate, expiryDate, planInfo) => {
    // Add new subscription alongside any existing ones (multiple active allowed)
    let subRecordId = null;
    try {
      const rec = await supabase.from("student_subscriptions").insert({
        student_id: studentId,
        sub_type_id: sub.id,
        sub_type_name: sub.name || "",
        plan_id: planInfo?.planId || sub.planId || null,
        plan_name: planInfo?.planName || "",
        class_id: planInfo?.classId || null,
        class_name: planInfo?.className || "",
        group_name: planInfo?.groupName || "",
        teacher_name: planInfo?.teacherName || "",
        total_price: sub.total || 0,
        seances_total: sub.seancesCount || 0,
        seances_remaining: sub.seancesCount || 0,
        start_date: startDate,
        expiry_date: expiryDate,
        expiry_enabled: sub.expiryEnabled || false,
        status: "ACTIVE",
      }).select("id").single().then(ok);
      subRecordId = rec?.id || null;
    } catch (_) {}
    // Update student's primary subscription fields (used as fallback display)
    const student = await supabase.from("students").update({
      sub_type_id: sub.id, sub_price: sub.total, final_price: sub.total, discount_pct: 0,
      seances_total: sub.seancesCount, seances_remaining: sub.seancesCount,
      start_date: startDate, expiry_date: expiryDate, expiry_enabled: sub.expiryEnabled,
      paid: 0, status: "ACTIVE",
      class_id: planInfo?.classId || null,
      group_id: planInfo?.groupId || null,
    }).eq("id", studentId).select().single().then(ok);
    return { student, subRecordId };
  },

  listStudentSubscriptions: (studentId) =>
    supabase.from("student_subscriptions").select("*")
      .eq("student_id", studentId).order("assigned_at", { ascending: false }).then(ok),

  listAllStudentSubscriptions: () =>
    supabase.from("student_subscriptions").select("*")
      .order("assigned_at", { ascending: false }).then(ok),

  removeStudentSubscription: async (studentId, subRecordId) => {
    if (subRecordId) {
      // Delete payments linked to this subscription
      try {
        await supabase.from("payments").delete().eq("subscription_id", subRecordId);
      } catch (_) {}
      // Mark the subscription record as REMOVED
      try {
        await supabase.from("student_subscriptions")
          .update({ status: "REMOVED", ended_at: new Date().toISOString() })
          .eq("id", subRecordId);
      } catch (_) {}
    }
    // Recalculate students.paid from remaining payments
    try {
      const remaining = await supabase.from("payments").select("amount").eq("student_id", studentId).then(ok);
      const totalPaid = (remaining || []).reduce((sum, p) => sum + Number(p.amount), 0);
      await supabase.from("students").update({ paid: totalPaid }).eq("id", studentId);
    } catch (_) {}
    // Check if any active subscriptions remain
    let activeSubs = [];
    try {
      activeSubs = await supabase.from("student_subscriptions")
        .select("id, class_id, group_id, sub_type_id, seances_total, start_date, expiry_date, expiry_enabled, total_price")
        .eq("student_id", studentId).eq("status", "ACTIVE").then(ok);
    } catch (_) {}
    if (activeSubs && activeSubs.length > 0) {
      // Student still has active subscriptions — return the current record (paid already recalculated above)
      return supabase.from("students").select("*").eq("id", studentId).single().then(ok);
    }
    // No active subscriptions remain — clear all subscription fields
    return supabase.from("students").update({
      sub_type_id: null, sub_price: 0, final_price: 0, discount_pct: 0,
      seances_total: null, seances_remaining: null, debt_seance_used: false,
      start_date: null, expiry_date: null, expiry_enabled: false,
      paid: 0, status: "ACTIVE",
      class_id: null, group_id: null,
    }).eq("id", studentId).select().single().then(ok);
  },

  // ---- Payments ----------------------------------------------------------
  paymentsForStudent: (studentId) =>
    supabase.from("payments").select("*").eq("student_id", studentId).order("paid_at", { ascending: false }).then(ok),
  allPayments: () => supabase.from("payments").select("*, students(first_name,last_name)").order("paid_at", { ascending: false }).then(ok),
  addPayment: async (studentId, amount, method, collectedBy, profileId, collectorName, subscriptionId = null) => {
    const pay = await supabase.from("payments").insert({
      student_id: studentId, amount, method: method || 'cash', collected_by: collectedBy,
      collected_by_profile_id: profileId, collector_name: collectorName,
      ...(subscriptionId ? { subscription_id: subscriptionId } : {}),
    }).select().single().then(ok);
    const s = await supabase.from("students").select("paid").eq("id", studentId).single().then(ok);
    await supabase.from("students").update({ paid: Number(s.paid) + Number(amount) }).eq("id", studentId).then(ok);
    return pay;
  },

  // ---- Parents -----------------------------------------------------------
  listParents: async () => {
    const { data, error } = await supabase.rpc("list_parents_with_children");
    if (error) throw error;
    return typeof data === 'string' ? JSON.parse(data) : data;
  },
  addParent: async (row, childIds) => {
    const parent = await supabase.from("parents").insert(row).select().single().then(ok);
    if (childIds?.length) {
      await supabase.from("parent_students")
        .insert(childIds.map((sid) => ({ parent_id: parent.id, student_id: sid }))).then(ok);
    }
    return parent;
  },
  updateParent: async (id, patch, childIds) => {
    const parent = await supabase.from("parents").update(patch).eq("id", id).select().single().then(ok);
    if (childIds) {
      await supabase.from("parent_students").delete().eq("parent_id", id).then(ok);
      if (childIds.length) {
        await supabase.from("parent_students")
          .insert(childIds.map((sid) => ({ parent_id: id, student_id: sid }))).then(ok);
      }
    }
    return parent;
  },
  deleteParent: (id) => supabase.from("parents").delete().eq("id", id).then(ok),

  // ---- Attendance --------------------------------------------------------
  saveAttendance: (rows, recordedByProfileId) =>
    supabase.from("attendance").upsert(
      rows.map(r => ({ ...r, recorded_at: new Date().toISOString(), recorded_by: recordedByProfileId })),
      { onConflict: "plan_id,student_id,session_date" }
    ).then(ok),
  attendanceForStudent: (studentId) =>
    supabase.from("attendance").select("*, plans(name, module_id)").eq("student_id", studentId)
      .order("session_date", { ascending: false }).then(ok),
  // consumes one séance; respects the single debt-séance rule
  consumeSeance: async (student) => {
    if (student.seances_remaining > 0) {
      return supabase.from("students")
        .update({ seances_remaining: student.seances_remaining - 1 })
        .eq("id", student.id).then(ok);
    }
    if (!student.debt_seance_used) {
      return supabase.from("students").update({ debt_seance_used: true }).eq("id", student.id).then(ok);
    }
    throw new Error("DEBT_SEANCE_USED");
  },

  // ---- Acomptes / Absences / Salaries ------------------------------------
  addAcompte: (row) => supabase.from("acomptes").insert(row).select().single().then(ok),
  addAbsence: (row) => supabase.from("absences").insert(row).select().single().then(ok),
  paySalary: (row) => supabase.from("salary_payments").insert(row).select().single().then(ok),
  listAcomptes: () => supabase.from("acomptes").select("*").order("created_at", { ascending: false }).then(ok),
  listAbsences: () => supabase.from("absences").select("*").order("created_at", { ascending: false }).then(ok),

  // ---- Expense categories + expenses -------------------------------------
  listExpenseCategories: () => supabase.from("expense_categories").select("*").order("name").then(ok),
  addExpenseCategory: (name) => supabase.from("expense_categories").insert({ name }).select().single().then(ok),
  listExpenses: () => supabase.from("expenses").select("*").order("spent_at", { ascending: false }).then(ok),
  addExpense: (row) => supabase.from("expenses").insert(row).select().single().then(ok),
  updateExpense: (id, patch) => supabase.from("expenses").update(patch).eq("id", id).select().single().then(ok),
  deleteExpense: (id) => supabase.from("expenses").delete().eq("id", id).then(ok),

  // ---- Announcements -----------------------------------------------------
  listAnnouncements: () => supabase.from("announcements").select("*").order("sent_at", { ascending: false }).then(ok),
  addAnnouncement: (row) => supabase.from("announcements").insert(row).select().single().then(ok),
  deleteAnnouncement: (id) => supabase.from("announcements").delete().eq("id", id).then(ok),

  // ---- Notifications -----------------------------------------------------
  listNotifications: (role) =>
    supabase.from("notifications").select("*").eq("recipient_role", role)
      .order("created_at", { ascending: false }).then(ok),
  notificationsForParent: (parentId) =>
    supabase.from("notifications").select("*").eq("parent_id", parentId)
      .order("created_at", { ascending: false }).then(ok),
  addNotification: (row) => supabase.from("notifications").insert(row).select().single().then(ok),
  markNotificationRead: (id) => supabase.from("notifications").update({ read: true }).eq("id", id).then(ok),

  // ---- Teacher attendance ------------------------------------------------
  markTeacherAttendance: (planId, teacherId, sessionDate, status) =>
    supabase.from("teacher_attendance").upsert({
      plan_id: planId, teacher_id: teacherId, session_date: sessionDate,
      status, recorded_at: new Date().toISOString()
    }, { onConflict: "plan_id,teacher_id,session_date" }).then(ok),
  listTeacherAttendance: (teacherId) =>
    supabase.from("teacher_attendance").select("*, plans(name,module_id,class_id,start_time,end_time,days_of_week)")
      .eq("teacher_id", teacherId).order("session_date", { ascending: false }).then(ok),

  // ---- Teacher séance records (unpaid/paid tracking) ---------------------
  recordTeacherSeance: (teacherId, planId, sessionDate, studentsPresent, perSeancePrice) =>
    supabase.rpc("record_teacher_seance", {
      p_teacher_id: teacherId, p_plan_id: planId, p_session_date: sessionDate,
      p_students_present: studentsPresent, p_per_seance_price: perSeancePrice || 0
    }).then(ok),
  listUnpaidSeances: (teacherId) =>
    supabase.from("teacher_unpaid_seances_v").select("*")
      .eq("teacher_id", teacherId).order("session_date", { ascending: false }).then(ok),
  listPaidSeances: (teacherId) =>
    supabase.from("teacher_seance_records").select("*, plans(name,start_time,end_time)")
      .eq("teacher_id", teacherId).eq("is_paid", true).order("session_date", { ascending: false }).then(ok),
  payTeacherSeances: (teacherId, seanceIds, amount, note) =>
    supabase.rpc("pay_teacher_seances", {
      p_teacher_id: teacherId, p_seance_ids: seanceIds, p_amount: amount, p_note: note
    }).then(ok),
  listTeacherSalaryPayments: (teacherId) =>
    supabase.from("salary_payments").select("*").eq("teacher_id", teacherId)
      .order("paid_at", { ascending: false }).then(ok),

  // ---- Formation levels --------------------------------------------------
  listFormationLevels: () => supabase.from("formation_levels").select("*").order("sort_order").then(ok),
  addFormationLevel: (name) => supabase.from("formation_levels").insert({ name }).select().single().then(ok),

  // ---- Plans for a specific day ------------------------------------------
  plansForDay: (dayOfWeek) => supabase.from("plans_v").select("*").contains("days_of_week", [dayOfWeek]).order("start_time").then(ok),

  // ---- Students for a specific plan's class ------------------------------
  studentsForPlan: (classId) => supabase.from("students_v").select("*").eq("class_id", classId).order("first_name").then(ok),

  // ---- Dashboard ---------------------------------------------------------
  dashboardTotals: () => supabase.from("dashboard_totals_v").select("*").single().then(ok),

  // ---- Data Export (for Excel) -------------------------------------------
  /**
   * Get all students with their subscription details and payments
   * Used for Excel export functionality
   */
  getStudentsForExport: () =>
    supabase.from("students_v").select("*").order("created_at").then(ok),

  /**
   * Get students with payment history
   */
  getStudentsWithPayments: async () => {
    const students = await supabase.from("students_v").select("*").then(ok);
    const payments = await supabase.from("payments")
      .select("*, students(first_name,last_name,id_card)")
      .order("paid_at", { ascending: false }).then(ok);
    return { students, payments };
  },

  /**
   * Get payments for multiple students (for export)
   */
  getPaymentsForExport: async (startDate, endDate) => {
    let query = supabase.from("payments").select("*, students(first_name,last_name,id_card)");
    if (startDate) query = query.gte("paid_at", startDate);
    if (endDate) query = query.lte("paid_at", endDate);
    return query.order("paid_at", { ascending: false }).then(ok);
  },

  /**
   * Get attendance records for export
   */
  getAttendanceForExport: async (startDate, endDate) => {
    let query = supabase.from("attendance")
      .select("*, students(first_name,last_name), plans(name,module_name)");
    if (startDate) query = query.gte("session_date", startDate);
    if (endDate) query = query.lte("session_date", endDate);
    return query.order("session_date", { ascending: false }).then(ok);
  },

  /**
   * Get subscription usage statistics for students
   */
  getSubscriptionStatsForExport: async (studentIds = null) => {
    let query = supabase.from("subscription_usage_v").select("*");
    if (studentIds && studentIds.length > 0) {
      query = query.in("student_id", studentIds);
    }
    return query.then(ok);
  },

  /**
   * Get teachers with salary details
   */
  getTeachersForExport: () =>
    supabase.from("teachers").select("*").order("created_at").then(ok),

  /**
   * Get staff with salary details
   */
  getStaffForExport: () =>
    supabase.from("staff").select("*").order("created_at").then(ok),

  /**
   * Get expenses for export
   */
  getExpensesForExport: async (startDate, endDate) => {
    let query = supabase.from("expenses").select("*");
    if (startDate) query = query.gte("spent_at", startDate);
    if (endDate) query = query.lte("spent_at", endDate);
    return query.order("spent_at", { ascending: false }).then(ok);
  },

  /**
   * Get all classes with student counts
   */
  getClassesForExport: () =>
    supabase.from("classes_v").select("*").order("created_at").then(ok),
};
