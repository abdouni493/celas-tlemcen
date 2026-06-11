import React, { useState, useMemo, useEffect, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { store, loadAll, addDays, classLabel, reloadStudents, reloadClasses, reloadGroups, reloadPlans, reloadSubTypes, reloadTeachers, reloadStaff, reloadExpenses, reloadParents, reloadAnnouncements, reloadTotals } from "./lib/store";
import { db, supabase, subscribeToRealtime } from "./lib/db";
import { filterStudentsByDateRange, filterStudentsByClass, filterStudentsByStatus, calculateSummaryStats, exportStudentsToExcel, exportTeachersToExcel, exportStaffToExcel, exportClassesToExcel, exportAttendanceToExcel, exportExpensesToExcel } from "./lib/excelExport";

/* ============================================================================
   PRIVATE SCHOOL MANAGEMENT SYSTEM
   React + Tailwind + Framer Motion · FR/AR (RTL) · Role-based
   Light token system. All screens functional UI on mock data.
============================================================================ */

/* ---------------------------------------------------------------------------
   DESIGN TOKENS
--------------------------------------------------------------------------- */
const TOKEN_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Lora:wght@500;600;700&display=swap');
  :root{
    --primary:#6D28D9; --primary-600:#5B21B6; --primary-50:#F3EEFF;
    --grad-primary:linear-gradient(135deg,#6366F1 0%,#8B5CF6 48%,#D946EF 100%);
    --grad-primary-br:linear-gradient(135deg,#7C3AED 0%,#A855F7 50%,#EC4899 100%);
    --grad-primary-soft:linear-gradient(135deg,#EEF0FF 0%,#F6EEFF 50%,#FDEEFB 100%);
    --grad-green:linear-gradient(135deg,#059669 0%,#34D399 100%);
    --grad-amber:linear-gradient(135deg,#EA580C 0%,#FBBF24 100%);
    --grad-red:linear-gradient(135deg,#DC2626 0%,#FB7185 100%);
    --grad-sky:linear-gradient(135deg,#0284C7 0%,#38BDF8 100%);
    --grad-aurora:linear-gradient(120deg,#6366F1 0%,#8B5CF6 25%,#D946EF 50%,#8B5CF6 75%,#6366F1 100%);
    --green:#059669; --green-bg:#D1FAE5;
    --amber:#D97706; --amber-bg:#FEF3C7;
    --red:#DC2626; --red-bg:#FEE2E2;
    --sky:#0284C7;
    --ink:#1A1433; --muted:#6B6488; --faint:#A39FB8;
    --line:#ECE9F5; --bg:#F4F2FC; --card:#FFFFFF;
    --shadow:0 1px 2px rgba(76,29,149,.05),0 8px 24px -14px rgba(109,40,217,.14);
    --shadow-lift:0 18px 44px -14px rgba(109,40,217,.30);
    --shadow-glow:0 0 0 1px rgba(139,92,246,.08),0 12px 30px -10px rgba(139,92,246,.35);
  }
  *{box-sizing:border-box;}
  body{margin:0;}
  .sms,.sms *{font-family:'Plus Jakarta Sans',sans-serif;-webkit-font-smoothing:antialiased;}
  .serif{font-family:'Lora',serif;}
  .mono{font-variant-numeric:tabular-nums;font-feature-settings:'tnum';}
  .grad-text{background:var(--grad-primary);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
  .app-bg{background:
    radial-gradient(1100px 560px at 6% -8%, rgba(139,92,246,.18), transparent 52%),
    radial-gradient(820px 480px at 102% -2%, rgba(217,70,239,.13), transparent 48%),
    radial-gradient(760px 640px at 50% 118%, rgba(99,102,241,.12), transparent 55%),
    radial-gradient(520px 420px at 88% 80%, rgba(56,189,248,.07), transparent 60%),
    var(--bg);}
  .sms ::-webkit-scrollbar{width:9px;height:9px;}
  .sms ::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#C4B5FD,#A78BFA);border-radius:9px;border:2px solid transparent;background-clip:padding-box;}
  .sms ::-webkit-scrollbar-thumb:hover{background:linear-gradient(180deg,#A78BFA,#8B5CF6);background-clip:padding-box;}
  .sms ::-webkit-scrollbar-track{background:transparent;}
  .sms input,.sms select,.sms textarea{font-family:inherit;transition:border-color .18s, box-shadow .18s, background .18s;}
  .sms input:hover,.sms select:hover,.sms textarea:hover{border-color:#D6CCF5;}
  .sms input:focus-visible,.sms select:focus-visible,.sms textarea:focus-visible{
    outline:none;border-color:#A78BFA;box-shadow:0 0 0 3.5px var(--primary-50);background:#fff;}
  .sms select{appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238B5CF6' stroke-width='3' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px;}
  .sms[dir="rtl"] select{background-position:left 12px center;padding-right:12px;padding-left:32px;}
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  @keyframes floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
  @keyframes auroraShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
  @keyframes pulseGlow{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}}
  @keyframes sweep{0%{transform:translateX(-120%) skewX(-18deg)}100%{transform:translateX(320%) skewX(-18deg)}}
  @keyframes popIn{0%{transform:scale(.9);opacity:0}100%{transform:scale(1);opacity:1}}
  @keyframes spinSlow{to{transform:rotate(360deg)}}
  .skel{background:linear-gradient(90deg,#EFEAFA 25%,#F8F5FE 37%,#EFEAFA 63%);
    background-size:200% 100%;animation:shimmer 1.4s linear infinite;border-radius:8px;}
  .gcard{position:relative;overflow:hidden;transition:box-shadow .25s, transform .25s;}
  .gcard::before{content:'';position:absolute;inset:0 0 auto 0;height:3px;background:var(--grad-primary);opacity:.9;}
  .gcard::after{content:'';position:absolute;top:-40%;left:-30%;width:60%;height:180%;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent);
    transform:translateX(-120%) skewX(-18deg);opacity:0;pointer-events:none;}
  .gcard:hover::after{opacity:1;animation:sweep .9s ease;}
  .sheen{position:relative;overflow:hidden;}
  .sheen::after{content:'';position:absolute;top:0;left:0;width:40%;height:100%;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent);
    transform:translateX(-120%) skewX(-18deg);pointer-events:none;}
  .sheen:hover::after{animation:sweep .8s ease;}
`;

/* ---------------------------------------------------------------------------
   I18N
--------------------------------------------------------------------------- */
const I18N = {
  fr: {
    appName: "Académie Noor", tagline: "Système de Gestion Scolaire",
    login: "Connexion", username: "Email ou identifiant", password: "Mot de passe",
    signIn: "Se connecter", quickAccess: "Accès rapide", signOut: "Déconnexion",
    search: "Rechercher…", noResults: "Aucun résultat", all: "Tous",
    create: "Créer", add: "Ajouter", edit: "Modifier", delete: "Supprimer",
    view: "Voir détails", cancel: "Annuler", save: "Enregistrer", confirm: "Confirmer",
    close: "Fermer", actions: "Actions", details: "Détails", history: "Historique",
    deleteConfirm: "Confirmer la suppression ?", deleteWarn: "Cette action est irréversible.",
    students: "Étudiants", teachers: "Enseignants", staff: "Administration", classes: "Classes",
    groups: "Groupes", parents: "Parents", revenue: "Revenus", debt: "Dette",
    expenses: "Dépenses", profit: "Bénéfice Net", paid: "Payé", remaining: "Restant",
    present: "Présent", absent: "Absent", late: "Retard", active: "Actif", expired: "Expiré",
    seances: "Séances", seancesLeft: "Séances restantes", payDebt: "Payer la dette",
    amountNow: "Montant à payer", method: "Méthode", collectedBy: "Encaissé par",
    cash: "Espèces", card: "Carte", transfer: "Virement",
    subscription: "Abonnement", subscriptions: "Abonnements", finalPrice: "Prix final",
    discount: "Remise", percent: "Pourcentage", amount: "Montant fixe", none: "Aucune",
    module: "Module", teacher: "Enseignant", group: "Groupe", capacity: "Capacité",
    day: "Jour", time: "Heure", duration: "Durée", level: "Niveau", year: "Année",
    type: "Type", courses: "Cours", formation: "Formation", description: "Description",
    name: "Nom", firstName: "Prénom", lastName: "Nom", birthDate: "Date de naissance",
    birthPlace: "Lieu de naissance", idCard: "N° Carte d'identité", schoolNum: "N° Scolaire",
    contact: "Contact", phone: "Téléphone", email: "Email", position: "Poste",
    salary: "Salaire", payModel: "Modèle de paie", fixed: "Salaire fixe", perSeance: "Par séance",
    rate: "Tarif", acompte: "Acompte", absence: "Absence (déduction)", payment: "Paiement",
    netPay: "Net à payer", unpaidMonths: "Mois impayés", category: "Catégorie",
    announcements: "Annonces", title: "Titre", audience: "Audience", send: "Envoyer",
    sentTo: "Envoyé à", notifications: "Notifications", markAllRead: "Tout marquer lu",
    dashboard: "Tableau de bord", analytics: "Analytique", reports: "Rapports Financiers",
    settings: "Paramètres", needsAttention: "Nécessite attention", quickActions: "Actions rapides",
    topDebtors: "Principaux débiteurs", recentPayments: "Paiements récents",
    timetable: "Emploi du temps", attendance: "Présence", mySalary: "Mon salaire",
    myClasses: "Mes classes", myProfile: "Mon profil", myAccount: "Mon compte",
    myChildren: "Mes enfants", home: "Accueil", generateReport: "Générer le rapport",
    from: "Du", to: "Au", export: "Exporter", academicYear: "Année scolaire",
    vsLastMonth: "vs mois dernier", totalCollected: "Total encaissé", outstanding: "Impayé",
    salariesPaid: "Salaires payés", byCategory: "Par catégorie", bySubType: "Par type d'abonnement",
    enrollment: "Inscriptions", retention: "Rétention", attendanceRate: "Taux de présence",
    debtAging: "Ancienneté dette", emptyTitle: "Rien ici pour l'instant",
    school: "École", profile: "Profil", data: "Données", backup: "Sauvegarde",
    restore: "Restaurer", changePassword: "Changer le mot de passe", currency: "Devise",
    relation: "Relation", father: "Père", mother: "Mère", guardian: "Tuteur",
    alertPrefs: "Préférences d'alerte", payments: "Paiements", nextSessions: "Prochaines séances",
    welcome: "Bienvenue", markPresent: "Présent", today: "Aujourd'hui",
    enrolled: "inscrits", roster: "Liste des élèves", selectSession: "Choisir une séance",
    monthRevenue: "Revenu ce mois", monthExpenses: "Dépenses ce mois", activeSubs: "Abonnements actifs",
    lowSeances: "Séances faibles (≤2)", expiringSubs: "Abonnements expirant", overdueSalaries: "Salaires en retard",
    newStudent: "Nouvel étudiant", recordPayment: "Encaisser un paiement", newAnnouncement: "Nouvelle annonce",
    confirmPayment: "Confirmer le paiement", paymentSummary: "Récapitulatif du paiement",
    saved: "Enregistré", noDebt: "Aucune dette", lowBadge: "Faible", read: "Lu", unread: "Non lu",
    subscriptionsManage: "Abonnements", newModule: "Nouveau module", newGroup: "Nouveau groupe",
    groupLimit: "Limite du groupe", seeCalendar: "Voir le calendrier", calendar: "Calendrier",
    plan: "Plan", newSubscriber: "Nouvel abonnement", subName: "Nom de l'abonnement",
    nbDays: "Nombre de jours", nbSeances: "Nombre de séances", pricePerSeance: "Prix par séance",
    total: "Total", editTotalManually: "Modifier le total manuellement", enableExpiry: "Activer la date d'expiration",
    expiryHint: "Si activé : expire à la fin de la période même s'il reste des séances. Sinon : actif jusqu'à épuisement des séances.",
    untilSeances: "Jusqu'à épuisement des séances", startDate: "Date de début", expiryDate: "Date d'expiration",
    totalStudentsUsed: "Étudiants ayant utilisé", totalGain: "Gain total", autoCalculated: "Calculé automatiquement",
    cardsView: "Cartes", tableView: "Tableau", assignSub: "Assigner un abonnement", noExpiry: "Sans expiration",
    selectPlan: "Sélectionner un plan", filterBy: "Filtrer par", reset: "Réinitialiser",
    week: "Semaine", allTeachers: "Tous les enseignants", allClasses: "Toutes les classes", allDays: "Tous les jours",
    addModuleTitle: "Ajouter un module", addGroupTitle: "Ajouter un groupe", moduleName: "Nom du module",
    alerts: "Alertes", viewAll: "Voir tout", thisWeek: "Cette semaine", overview: "Aperçu",
    searchStudent: "Rechercher un étudiant", selectChildren: "Sélectionner les enfants", selected: "sélectionné(s)",
    newCategory: "Nouvelle catégorie", categoryName: "Nom de la catégorie", addCategoryTitle: "Ajouter une catégorie",
    teacherPlans: "Séances de l'enseignant", assignedPlans: "Séances assignées", noPlans: "Aucune séance assignée",
    viewAnalytics: "Voir les analyses", detailedReports: "Rapports détaillés",
    clickForDetails: "Cliquez pour les détails", periodHistory: "Historique de la période", benefits: "Bénéfices",
    chooseLogo: "Choisir un logo", uploadFromDevice: "Importer depuis l'appareil", logoPreview: "Aperçu du logo",
    debtAlerts: "Alertes de dettes", paymentAlerts: "Alertes de paiements", expenseAlerts: "Alertes de dépenses",
    debtSeance: "Séance à crédit", debtSeanceUsed: "Crédit déjà utilisé", noSeancesLeft: "Aucune séance restante",
    grantDebtSeance: "Accorder une séance à crédit", lateNotified: "Retard signalé au parent",
    allStudents: "Tous les étudiants", seeAllStudents: "Voir tous les étudiants", studentsInClass: "Étudiants de la classe",
    presences: "Présences", retards: "Retards", subscriptionsHist: "Historique abonnements", paymentsHist: "Historique paiements",
    teacherOf: "Enseignant", childDetails: "Détails de l'enfant", fromAdmin: "De l'administration", messageReceived: "Message reçu",
    grossRevenue: "Revenu brut", netBenefit: "Bénéfice net", revenueBreakdown: "Répartition des revenus", expenseBreakdown: "Répartition des dépenses",
    byClass: "Par classe", byTeacher: "Par enseignant", byMonth: "Par mois", growth: "Croissance",
    avgRevenue: "Revenu moyen", collectionRate: "Taux de recouvrement", totalCategories: "catégories",
    adminAttendance: "Gestion des présences", todaySchedule: "Programme du jour", teacherPresence: "Présence enseignant",
    markPresence2: "Marquer la présence", seancesPay: "Paiement séances", monthlyPay: "Paiement mensuel",
    unpaidSeances: "Séances non payées", paidSeances: "Séances payées",
    paySelected: "Payer les séances sélectionnées", percentageModel: "Pourcentage",
    percentageRate: "Taux (%)", minPerSeance: "Minimum par séance", monthlyStart: "Date de début mensuel",
    freeStudent: "Cas spécial (gratuit)", specialCases: "Cas spéciaux",
    byCollector: "Par collecteur", seanceHistory: "Historique des séances",
    paymentStatus: "Statut de paiement", unpaid: "Non payé", manualPrice: "Prix manuel",
    autoCalc: "Calculé automatiquement", finalTotal: "Total final", selectAll: "Tout sélectionner",
    newLevel: "Nouveau niveau", teacherPayAlerts: "Salaires en attente", unpaidSeancesAlert: "Séances non payées",
    recordedAt: "Enregistré à", recordedBy: "Enregistré par",
    payNow: "Payer maintenant", payLater: "Payer plus tard",
    paymentOption: "Option de paiement", saveAsDebt: "Enregistrer comme dette",
    debtDetails: "Reste dû", studentsInSub: "Étudiants abonnés",
    subHistory: "Historique des abonnements", removeSubscription: "Supprimer l'abonnement",
    confirmRemoveSub: "Supprimer cet abonnement ?", subRemoved: "Abonnement supprimé",
    noSubscription: "Aucun abonnement assigné", assignedOn: "Assigné le", removedOn: "Retiré le",
    planInfo: "Emploi du temps", tabSubs: "Abonnements", tabPays: "Paiements", tabAtt: "Présences",
    // Export & Data Management
    exportData: "Exporter les données", exportToExcel: "Exporter en Excel", dateRange: "Plage de dates",
    filterByClass: "Filtrer par classe", filterByStatus: "Filtrer par statut",
    allStatuses: "Tous les statuts", includeSubscriptions: "Inclure les forfaits", includePayments: "Inclure les paiements",
    exportStudents: "Exporter les étudiants", exportAttendance: "Exporter les présences", lastBackup: "Dernière sauvegarde",
    noDataSelected: "Sélectionnez au moins un filtre", exportSuccess: "Données exportées avec succès",
    exportError: "Erreur lors de l'export", filteredResults: "résultats filtrés",
    roles: { ADMIN: "Administrateur", STAFF: "Administration", TEACHER: "Enseignant", STUDENT: "Étudiant", PARENT: "Parent" },
    days: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
    months: ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"],
  },
  ar: {
    appName: "أكاديمية نور", tagline: "نظام إدارة المدرسة",
    login: "تسجيل الدخول", username: "البريد أو المعرّف", password: "كلمة المرور",
    signIn: "دخول", quickAccess: "وصول سريع", signOut: "خروج",
    search: "بحث…", noResults: "لا نتائج", all: "الكل",
    create: "إنشاء", add: "إضافة", edit: "تعديل", delete: "حذف",
    view: "عرض التفاصيل", cancel: "إلغاء", save: "حفظ", confirm: "تأكيد",
    close: "إغلاق", actions: "إجراءات", details: "التفاصيل", history: "السجل",
    deleteConfirm: "تأكيد الحذف؟", deleteWarn: "هذا الإجراء لا يمكن التراجع عنه.",
    students: "الطلاب", teachers: "المعلمون", staff: "الإدارة", classes: "الفصول",
    groups: "المجموعات", parents: "أولياء الأمور", revenue: "الإيرادات", debt: "الديون",
    expenses: "المصروفات", profit: "صافي الربح", paid: "مدفوع", remaining: "متبقٍ",
    present: "حاضر", absent: "غائب", late: "متأخر", active: "نشط", expired: "منتهٍ",
    seances: "الحصص", seancesLeft: "الحصص المتبقية", payDebt: "سداد الدين",
    amountNow: "المبلغ المدفوع", method: "الطريقة", collectedBy: "حصّله",
    cash: "نقداً", card: "بطاقة", transfer: "تحويل",
    subscription: "اشتراك", subscriptions: "الاشتراكات", finalPrice: "السعر النهائي",
    discount: "خصم", percent: "نسبة مئوية", amount: "مبلغ ثابت", none: "لا شيء",
    module: "المادة", teacher: "المعلم", group: "المجموعة", capacity: "السعة",
    day: "اليوم", time: "الوقت", duration: "المدة", level: "المستوى", year: "السنة",
    type: "النوع", courses: "دروس", formation: "تكوين", description: "الوصف",
    name: "الاسم", firstName: "الاسم الأول", lastName: "اللقب", birthDate: "تاريخ الميلاد",
    birthPlace: "مكان الميلاد", idCard: "رقم الهوية", schoolNum: "الرقم المدرسي",
    contact: "التواصل", phone: "الهاتف", email: "البريد", position: "المنصب",
    salary: "الراتب", payModel: "نموذج الأجر", fixed: "راتب ثابت", perSeance: "بالحصة",
    rate: "التعرفة", acompte: "سلفة", absence: "غياب (خصم)", payment: "دفعة",
    netPay: "صافي المستحق", unpaidMonths: "أشهر غير مدفوعة", category: "الفئة",
    announcements: "الإعلانات", title: "العنوان", audience: "الجمهور", send: "إرسال",
    sentTo: "أُرسل إلى", notifications: "الإشعارات", markAllRead: "تعليم الكل كمقروء",
    dashboard: "لوحة التحكم", analytics: "التحليلات", reports: "التقارير المالية",
    settings: "الإعدادات", needsAttention: "يتطلب انتباه", quickActions: "إجراءات سريعة",
    topDebtors: "أكبر المدينين", recentPayments: "المدفوعات الأخيرة",
    timetable: "الجدول الزمني", attendance: "الحضور", mySalary: "راتبي",
    myClasses: "فصولي", myProfile: "ملفي", myAccount: "حسابي",
    myChildren: "أطفالي", home: "الرئيسية", generateReport: "إنشاء التقرير",
    from: "من", to: "إلى", export: "تصدير", academicYear: "السنة الدراسية",
    vsLastMonth: "مقابل الشهر الماضي", totalCollected: "إجمالي المحصّل", outstanding: "المتأخرات",
    salariesPaid: "الرواتب المدفوعة", byCategory: "حسب الفئة", bySubType: "حسب نوع الاشتراك",
    enrollment: "التسجيلات", retention: "الاحتفاظ", attendanceRate: "نسبة الحضور",
    debtAging: "تقادم الدين", emptyTitle: "لا شيء هنا بعد",
    school: "المدرسة", profile: "الملف", data: "البيانات", backup: "نسخ احتياطي",
    restore: "استعادة", changePassword: "تغيير كلمة المرور", currency: "العملة",
    relation: "صلة القرابة", father: "الأب", mother: "الأم", guardian: "الوصي",
    alertPrefs: "تفضيلات التنبيه", payments: "المدفوعات", nextSessions: "الحصص القادمة",
    welcome: "مرحباً", markPresent: "حاضر", today: "اليوم",
    enrolled: "مسجل", roster: "قائمة الطلاب", selectSession: "اختر حصة",
    monthRevenue: "إيراد هذا الشهر", monthExpenses: "مصروف هذا الشهر", activeSubs: "اشتراكات نشطة",
    lowSeances: "حصص منخفضة (≤2)", expiringSubs: "اشتراكات تنتهي", overdueSalaries: "رواتب متأخرة",
    newStudent: "طالب جديد", recordPayment: "تسجيل دفعة", newAnnouncement: "إعلان جديد",
    confirmPayment: "تأكيد الدفع", paymentSummary: "ملخص الدفعة",
    saved: "تم الحفظ", noDebt: "لا ديون", lowBadge: "منخفض", read: "مقروء", unread: "غير مقروء",
    subscriptionsManage: "الاشتراكات", newModule: "مادة جديدة", newGroup: "مجموعة جديدة",
    groupLimit: "حد المجموعة", seeCalendar: "عرض التقويم", calendar: "التقويم",
    plan: "الخطة", newSubscriber: "اشتراك جديد", subName: "اسم الاشتراك",
    nbDays: "عدد الأيام", nbSeances: "عدد الحصص", pricePerSeance: "سعر الحصة",
    total: "الإجمالي", editTotalManually: "تعديل الإجمالي يدوياً", enableExpiry: "تفعيل تاريخ الانتهاء",
    expiryHint: "إذا فُعّل: ينتهي في نهاية المدة حتى لو بقيت حصص. وإلا: يبقى نشطاً حتى نفاد الحصص.",
    untilSeances: "حتى نفاد الحصص", startDate: "تاريخ البدء", expiryDate: "تاريخ الانتهاء",
    totalStudentsUsed: "الطلاب المستخدمون", totalGain: "إجمالي الأرباح", autoCalculated: "محسوب تلقائياً",
    cardsView: "بطاقات", tableView: "جدول", assignSub: "تعيين اشتراك", noExpiry: "بدون انتهاء",
    selectPlan: "اختر خطة", filterBy: "تصفية حسب", reset: "إعادة تعيين",
    week: "الأسبوع", allTeachers: "كل المعلمين", allClasses: "كل الفصول", allDays: "كل الأيام",
    addModuleTitle: "إضافة مادة", addGroupTitle: "إضافة مجموعة", moduleName: "اسم المادة",
    alerts: "تنبيهات", viewAll: "عرض الكل", thisWeek: "هذا الأسبوع", overview: "نظرة عامة",
    searchStudent: "البحث عن طالب", selectChildren: "اختر الأبناء", selected: "محدد",
    newCategory: "فئة جديدة", categoryName: "اسم الفئة", addCategoryTitle: "إضافة فئة",
    teacherPlans: "حصص المعلم", assignedPlans: "الحصص المسندة", noPlans: "لا توجد حصص مسندة",
    viewAnalytics: "عرض التحليلات", detailedReports: "تقارير مفصلة",
    clickForDetails: "اضغط للتفاصيل", periodHistory: "سجل الفترة", benefits: "الأرباح",
    chooseLogo: "اختر شعاراً", uploadFromDevice: "تحميل من الجهاز", logoPreview: "معاينة الشعار",
    debtAlerts: "تنبيهات الديون", paymentAlerts: "تنبيهات المدفوعات", expenseAlerts: "تنبيهات المصاريف",
    debtSeance: "حصة بالدين", debtSeanceUsed: "الدين مستخدم", noSeancesLeft: "لا حصص متبقية",
    grantDebtSeance: "منح حصة بالدين", lateNotified: "تم إبلاغ ولي الأمر بالتأخر",
    allStudents: "كل الطلاب", seeAllStudents: "عرض كل الطلاب", studentsInClass: "طلاب الفصل",
    presences: "الحضور", retards: "التأخرات", subscriptionsHist: "سجل الاشتراكات", paymentsHist: "سجل المدفوعات",
    teacherOf: "المعلم", childDetails: "تفاصيل الابن", fromAdmin: "من الإدارة", messageReceived: "رسالة واردة",
    grossRevenue: "الإيراد الإجمالي", netBenefit: "صافي الربح", revenueBreakdown: "توزيع الإيرادات", expenseBreakdown: "توزيع المصاريف",
    byClass: "حسب الفصل", byTeacher: "حسب المعلم", byMonth: "حسب الشهر", growth: "النمو",
    avgRevenue: "متوسط الإيراد", collectionRate: "نسبة التحصيل", totalCategories: "فئات",
    adminAttendance: "إدارة الحضور", todaySchedule: "برنامج اليوم", teacherPresence: "حضور المعلم",
    markPresence2: "تسجيل الحضور", seancesPay: "دفع الحصص", monthlyPay: "الدفع الشهري",
    unpaidSeances: "حصص غير مدفوعة", paidSeances: "حصص مدفوعة",
    paySelected: "دفع الحصص المحددة", percentageModel: "نسبة مئوية",
    percentageRate: "النسبة (%)", minPerSeance: "الحد الأدنى للحصة", monthlyStart: "تاريخ بدء الراتب",
    freeStudent: "حالة خاصة (مجاني)", specialCases: "حالات خاصة",
    byCollector: "حسب المحصل", seanceHistory: "سجل الحصص",
    paymentStatus: "حالة الدفع", unpaid: "غير مدفوع", manualPrice: "السعر اليدوي",
    autoCalc: "محسوب تلقائياً", finalTotal: "المجموع النهائي", selectAll: "تحديد الكل",
    newLevel: "مستوى جديد", teacherPayAlerts: "رواتب معلقة", unpaidSeancesAlert: "حصص غير مدفوعة",
    recordedAt: "سُجل في", recordedBy: "سُجل بواسطة",
    payNow: "الدفع الآن", payLater: "الدفع لاحقاً",
    paymentOption: "خيار الدفع", saveAsDebt: "حفظ كدين",
    debtDetails: "المبلغ المتبقي", studentsInSub: "الطلاب المشتركون",
    subHistory: "سجل الاشتراكات", removeSubscription: "حذف الاشتراك",
    confirmRemoveSub: "حذف هذا الاشتراك؟", subRemoved: "تم حذف الاشتراك",
    noSubscription: "لا يوجد اشتراك", assignedOn: "تاريخ التعيين", removedOn: "تاريخ الإلغاء",
    planInfo: "الجدول الزمني", tabSubs: "الاشتراكات", tabPays: "المدفوعات", tabAtt: "الحضور",
    // Export & Data Management
    exportData: "تصدير البيانات", exportToExcel: "تصدير إلى Excel", dateRange: "نطاق التاريخ",
    filterByClass: "تصفية حسب الفصل", filterByStatus: "تصفية حسب الحالة",
    allStatuses: "كل الحالات", includeSubscriptions: "تضمين الاشتراكات", includePayments: "تضمين المدفوعات",
    exportStudents: "تصدير الطلاب", exportAttendance: "تصدير الحضور", lastBackup: "آخر نسخة احتياطية",
    noDataSelected: "حدد مرشح واحد على الأقل", exportSuccess: "تم تصدير البيانات بنجاح",
    exportError: "خطأ في التصدير", filteredResults: "نتائج مصفاة",
    roles: { ADMIN: "مدير", STAFF: "الإدارة", TEACHER: "معلم", STUDENT: "طالب", PARENT: "ولي أمر" },
    days: ["إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت", "أحد"],
    months: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
  },
};

const I18nCtx = createContext();
const useT = () => useContext(I18nCtx);

/* ---------------------------------------------------------------------------
   MOCK DATA
--------------------------------------------------------------------------- */
let CUR = store.SETTINGS?.currency === "DZD" ? "DA" : (store.SETTINGS?.currency || "DA");
const fmt = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " " + CUR;

/* ---------------------------------------------------------------------------
   LIVE DATA — sourced from Supabase via the store (see lib/store.js).
   These module-level bindings are refilled by hydrate() before each render
   pass so the existing screens keep reading the same names.
--------------------------------------------------------------------------- */

const MODULES_AR = { Math: "رياضيات", Physique: "فيزياء", Science: "علوم", Arabe: "عربية", Français: "فرنسية", Anglais: "إنجليزية", Espagnol: "إسبانية", Allemand: "ألمانية", Philosophie: "فلسفة", "Histoire-Géo": "تاريخ-جغرافيا", Islamique: "إسلامية" };
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const ri = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;

// live bindings (refilled from the store on every hydrate)
let MODULES = store.MODULES;
let CLASSES = store.CLASSES;
let GROUPS = store.GROUPS;
let SUB_TYPES = store.SUB_TYPES;
let TEACHERS = store.TEACHERS;
let STAFF = store.STAFF;
let STUDENTS = store.STUDENTS;
let PLANS = store.PLANS;
let EXPENSES = store.EXPENSES;
let ANNOUNCEMENTS = store.ANNOUNCEMENTS;
let NOTIFS = store.NOTIFS;
let PARENT_NOTIFS = store.PARENT_NOTIFS;
let PARENTS = store.PARENTS;
let totals = store.totals;

function hydrate() {
  MODULES = store.MODULES; MODULES_FULL = store.MODULES_FULL;
  CLASSES = store.CLASSES; GROUPS = store.GROUPS;
  SUB_TYPES = store.SUB_TYPES; TEACHERS = store.TEACHERS; STAFF = store.STAFF;
  STUDENTS = store.STUDENTS; PLANS = store.PLANS; EXPENSES = store.EXPENSES;
  ANNOUNCEMENTS = store.ANNOUNCEMENTS; NOTIFS = store.NOTIFS;
  PARENT_NOTIFS = store.PARENT_NOTIFS; PARENTS = store.PARENTS; totals = store.totals;
  CUR = store.SETTINGS?.currency === "DZD" ? "DA" : (store.SETTINGS?.currency || "DA");
}
// Full module objects (with id) for resolving module_id when creating plans
let MODULES_FULL = store.MODULES_FULL;


/* ---------------------------------------------------------------------------
   PROFILE NAV CONFIG
--------------------------------------------------------------------------- */
const NAV = {
  ADMIN: [
    ["dashboard", "📊"], ["classes", "🏫"], ["planner", "📅"], ["subscriptions", "🎫"], ["students", "🎓"],
    ["parents", "👨‍👩‍👧"], ["teachers", "👨‍🏫"], ["staff", "👥"], ["attendance", "✅"], ["expenses", "🧾"],
    ["announcements", "📢"], ["reports", "💰"], ["settings", "⚙️"],
  ],
  STAFF: [
    ["dashboard", "📋"], ["classes", "🏫"], ["planner", "📅"], ["subscriptions", "🎫"], ["students", "🎓"],
    ["parents", "👨‍👩‍👧"], ["attendance", "✅"], ["payments", "💳"], ["announcements", "📢"], ["notifications", "🔔"], ["settings", "⚙️"],
  ],
  TEACHER: [
    ["dashboard", "🏠"], ["timetable", "🗓️"], ["attendance", "✅"], ["mySalary", "💵"],
    ["myClasses", "👥"], ["announcements", "📣"], ["myProfile", "👤"],
  ],
  STUDENT: [
    ["home", "🏠"], ["timetable", "🗓️"], ["payments", "💵"], ["announcements", "📣"], ["myProfile", "👤"],
  ],
  PARENT: [
    ["home", "🏠"], ["myChildren", "👦"], ["timetable", "🗓️"], ["payments", "💵"],
    ["notifications", "🔔"], ["announcements", "📣"], ["myAccount", "👤"],
  ],
};
const ROLE_AVATAR = { ADMIN: "👑", STAFF: "🗂️", TEACHER: "📚", STUDENT: "🎒", PARENT: "👨‍👩‍👧" };


/* ---------------------------------------------------------------------------
   SHARED PRIMITIVES
--------------------------------------------------------------------------- */
const card = {
  background: "var(--card)", border: "1px solid var(--line)",
  borderRadius: 18, boxShadow: "var(--shadow)",
};

function Badge({ children, tone = "primary" }) {
  const map = {
    primary: ["var(--primary-50)", "var(--primary-600)"],
    green: ["var(--green-bg)", "var(--green)"],
    amber: ["var(--amber-bg)", "var(--amber)"],
    red: ["var(--red-bg)", "var(--red)"],
    gray: ["#F1EFF8", "var(--muted)"],
  };
  const [bg, fg] = map[tone] || map.gray;
  return (
    <span style={{ background: bg, color: fg, fontSize: 11.5, fontWeight: 700, padding: "3.5px 10px", borderRadius: 999, whiteSpace: "nowrap", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.5)" }}>
      {children}
    </span>
  );
}

function Btn({ children, onClick, variant = "primary", size = "md", style, type, disabled }) {
  const base = { border: "none", borderRadius: 12, fontWeight: 700, cursor: "pointer", userSelect: "none", display: "inline-flex", alignItems: "center", gap: 7, transition: "all .18s", whiteSpace: "nowrap" };
  const sizes = { sm: { fontSize: 12.5, padding: "7px 13px" }, md: { fontSize: 13.5, padding: "10px 17px" } };
  const variants = {
    primary: { background: "var(--grad-primary)", color: "#fff", boxShadow: "0 6px 18px -6px rgba(124,58,237,.55)" },
    soft: { background: "var(--grad-primary-soft)", color: "var(--primary-600)", border: "1px solid #EADDFB" },
    ghost: { background: "transparent", color: "var(--muted)" },
    danger: { background: "var(--grad-red)", color: "#fff", boxShadow: "0 6px 18px -6px rgba(239,68,68,.5)" },
    line: { background: "#fff", color: "var(--ink)", border: "1px solid var(--line)" },
  };
  const glossy = variant === "primary" || variant === "danger";
  return (
    <motion.button whileHover={{ scale: disabled ? 1 : 1.03, y: disabled ? 0 : -1 }} whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={disabled ? undefined : onClick} type={type} disabled={disabled}
      className={glossy && !disabled ? "sheen" : undefined}
      style={{ ...base, ...sizes[size], ...variants[variant], opacity: disabled ? 0.4 : 1, ...style }}>
      {children}
    </motion.button>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}
const inputStyle = { width: "100%", padding: "10px 13px", borderRadius: 11, border: "1px solid var(--line)", fontSize: 13.5, color: "var(--ink)", background: "linear-gradient(180deg,#FCFBFE,#fff)" };
function Input(p) { return <input {...p} style={{ ...inputStyle, ...p.style }} />; }
function Select({ children, ...p }) { return <select {...p} style={{ ...inputStyle, ...p.style }}>{children}</select>; }

function Modal({ open, onClose, title, children, footer, wide }) {
  const t = useT();
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: "fixed", inset: 0, background: "radial-gradient(circle at 50% 30%, rgba(76,29,149,.40), rgba(15,8,40,.55))", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
          <motion.div initial={{ scale: 0.94, y: 18, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            style={{ ...card, width: "100%", maxWidth: wide ? 720 : 480, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 30px 80px -20px rgba(76,29,149,.45)" }}>
            <div className="sheen" style={{ position: "relative", padding: "18px 22px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--grad-primary-soft)" }}>
              <div style={{ position: "absolute", inset: "0 0 auto 0", height: 3, background: "var(--grad-primary)" }} />
              <h3 className="serif" style={{ margin: 0, fontSize: 19, color: "var(--ink)" }}>{title}</h3>
              <motion.button whileHover={{ rotate: 90, scale: 1.08 }} whileTap={{ scale: 0.9 }} onClick={onClose}
                style={{ border: "none", background: "#fff", width: 32, height: 32, borderRadius: 10, cursor: "pointer", color: "var(--muted)", fontSize: 15, boxShadow: "0 2px 8px -2px rgba(76,29,149,.2)" }}>✕</motion.button>
            </div>
            <div className="sms" style={{ padding: 22, overflowY: "auto" }}>{children}</div>
            {footer && <div style={{ padding: "14px 22px", borderTop: "1px solid var(--line)", display: "flex", gap: 10, justifyContent: "flex-end", background: "linear-gradient(180deg,#fff,#FBFAFE)" }}>{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Menu({ items }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, flip: false });
  const btnRef = React.useRef(null);
  const rtl = document.documentElement.dir === "rtl";

  const place = () => {
    const el = btnRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const menuH = items.length * 40 + 14;
    const menuW = 190;
    const spaceBelow = window.innerHeight - r.bottom;
    const flip = spaceBelow < menuH + 16;
    const left = rtl ? r.left : r.right - menuW;
    setCoords({
      top: flip ? r.top - menuH - 6 : r.bottom + 6,
      left: Math.max(8, Math.min(left, window.innerWidth - menuW - 8)),
      flip,
    });
  };

  const toggle = (e) => { e.stopPropagation(); if (!open) place(); setOpen((v) => !v); };

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => { window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close); };
  }, [open]);

  // Render the dropdown via a portal so it escapes framer-motion transform
  // stacking contexts (which break position:fixed child coordinates).
  const dropdown = (
    <AnimatePresence>
      {open && (
        <>
          <div onClick={(e) => { e.stopPropagation(); setOpen(false); }} style={{ position: "fixed", inset: 0, zIndex: 9998 }} />
          <motion.div
            initial={{ opacity: 0, y: coords.flip ? 6 : -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", damping: 24, stiffness: 360 }}
            onClick={(e) => e.stopPropagation()}
            style={{ position: "fixed", top: coords.top, left: coords.left, width: 190, ...card, borderRadius: 13, padding: 6, zIndex: 9999, boxShadow: "0 18px 44px -10px rgba(76,29,149,.32)", border: "1px solid #ECE6F8" }}>
            {items.map((it, i) => (
              <button key={i} onClick={() => { setOpen(false); it.onClick && it.onClick(); }}
                style={{ width: "100%", textAlign: "start", border: "none", background: "transparent", padding: "10px 11px", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 600, color: it.danger ? "var(--red)" : "var(--ink)", display: "flex", gap: 10, alignItems: "center" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = it.danger ? "var(--red-bg)" : "var(--grad-primary-soft)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <span style={{ fontSize: 15 }}>{it.icon}</span>{it.label}
              </button>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div style={{ position: "relative" }}>
      <motion.button ref={btnRef} whileTap={{ scale: 0.9 }} onClick={toggle}
        style={{ border: "none", background: open ? "var(--primary-50)" : "transparent", cursor: "pointer", fontSize: 19, color: open ? "var(--primary-600)" : "var(--faint)", padding: "2px 7px", borderRadius: 9, lineHeight: 1 }}>⋮</motion.button>
      {createPortal(dropdown, document.body)}
    </div>
  );
}

/* View toggle: cards vs table */
function ViewToggle({ mode, setMode }) {
  return (
    <div style={{ display: "inline-flex", background: "#EFEAFA", borderRadius: 11, padding: 3, gap: 2 }}>
      {[["cards", "▦"], ["table", "☰"]].map(([m, ic]) => {
        const on = mode === m;
        return (
          <button key={m} onClick={() => setMode(m)}
            style={{ position: "relative", border: "none", cursor: "pointer", padding: "6px 13px", borderRadius: 9, fontSize: 14, fontWeight: 700, color: on ? "#fff" : "var(--faint)", background: "transparent" }}>
            {on && <motion.span layoutId="viewtoggle-pill" style={{ position: "absolute", inset: 0, borderRadius: 9, background: "var(--grad-primary)", boxShadow: "0 4px 12px -4px rgba(124,58,237,.5)" }} />}
            <span style={{ position: "relative" }}>{ic}</span>
          </button>
        );
      })}
    </div>
  );
}

/* Generic data table */
function DataTable({ columns, rows, actions }) {
  return (
    <div style={{ ...card, overflow: "visible" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead>
            <tr style={{ background: "var(--grad-primary-soft)" }}>
              {columns.map((c, i) => <th key={i} style={{ textAlign: "start", padding: "12px 16px", fontSize: 11.5, fontWeight: 700, color: "var(--primary-600)", textTransform: "uppercase", letterSpacing: 0.4, whiteSpace: "nowrap" }}>{c.h}</th>)}
              {actions && <th style={{ width: 50 }} />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <motion.tr key={ri} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: ri * 0.02 }}
                style={{ borderTop: "1px solid var(--line)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#FAF8FE")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                {columns.map((c, ci) => <td key={ci} style={{ padding: "12px 16px", fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap" }}>{c.render ? c.render(row) : row[c.k]}</td>)}
                {actions && <td style={{ padding: "8px 12px", textAlign: "end" }}><Menu items={actions(row)} /></td>}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PageHead({ icon, title, sub, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 44, height: 44, borderRadius: 13, background: "var(--grad-primary)", display: "grid", placeItems: "center", fontSize: 21, boxShadow: "0 8px 20px -8px rgba(124,58,237,.6)" }}>{icon}</span>
          <h1 className="serif grad-text" style={{ margin: 0, fontSize: 27 }}>{title}</h1>
        </div>
        {sub && <p style={{ margin: "8px 0 0 56px", fontSize: 13.5, color: "var(--muted)" }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function SearchFilter({ value, onChange, filters }) {
  const t = useT();
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18, alignItems: "center" }}>
      <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
        <span style={{ position: "absolute", insetInlineStart: 12, top: 10, color: "var(--faint)" }}>🔍</span>
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={t.search}
          style={{ ...inputStyle, paddingInlineStart: 34 }} />
      </div>
      {filters}
    </div>
  );
}

function FilterChips({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
      {options.map((o) => {
        const on = value === o.v;
        return (
          <motion.button key={o.v} whileTap={{ scale: 0.94 }} onClick={() => onChange(o.v)}
            style={{ border: "1px solid " + (on ? "transparent" : "var(--line)"), background: on ? "var(--grad-primary)" : "#fff", color: on ? "#fff" : "var(--muted)", borderRadius: 999, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", boxShadow: on ? "0 5px 14px -5px rgba(124,58,237,.5)" : "none", transition: "all .18s" }}>
            {o.l}
          </motion.button>
        );
      })}
    </div>
  );
}

function Empty({ icon = "📭", title, hint, action }) {
  const t = useT();
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ ...card, padding: "52px 24px", textAlign: "center" }}>
      <div style={{ width: 74, height: 74, margin: "0 auto 14px", borderRadius: 22, background: "var(--grad-primary-soft)", display: "grid", placeItems: "center", fontSize: 36, boxShadow: "inset 0 0 0 1px #EADDFB" }}>{icon}</div>
      <div className="serif" style={{ fontSize: 18, color: "var(--ink)", marginBottom: 6 }}>{title || t.emptyTitle}</div>
      {hint && <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>{hint}</div>}
      {action}
    </motion.div>
  );
}

function StatCard({ label, value, icon, trend, tone = "primary", money }) {
  const [disp, setDisp] = useState(0);
  useEffect(() => {
    let raf, start; const target = typeof value === "number" ? value : 0;
    const dur = 900;
    const tick = (ts) => { if (!start) start = ts; const p = Math.min((ts - start) / dur, 1); setDisp(Math.round(target * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    if (typeof value === "number") raf = requestAnimationFrame(tick); else setDisp(value);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  const grad = { primary: "var(--grad-primary)", green: "var(--grad-green)", amber: "var(--grad-amber)", red: "var(--grad-red)" }[tone];
  const tint = { primary: "rgba(139,92,246,.07)", green: "rgba(16,185,129,.07)", amber: "rgba(245,158,11,.08)", red: "rgba(239,68,68,.07)" }[tone];
  return (
    <motion.div whileHover={{ y: -5 }} className="sheen" style={{ ...card, padding: 18, position: "relative", overflow: "hidden", background: `linear-gradient(180deg, ${tint}, #fff 72%)` }}>
      <div style={{ position: "absolute", inset: "0 0 auto 0", height: 3, background: grad }} />
      <div style={{ position: "absolute", top: -30, insetInlineEnd: -30, width: 110, height: 110, borderRadius: "50%", background: grad, opacity: 0.1, filter: "blur(8px)", pointerEvents: "none" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
        <motion.span whileHover={{ rotate: -8, scale: 1.06 }} style={{ width: 42, height: 42, borderRadius: 13, background: grad, display: "grid", placeItems: "center", fontSize: 20, boxShadow: `0 10px 22px -8px ${tone === "primary" ? "rgba(124,58,237,.6)" : "rgba(0,0,0,.28)"}` }}>{icon}</motion.span>
        {trend != null && <Badge tone={trend >= 0 ? "green" : "red"}>{trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%</Badge>}
      </div>
      <div className="mono" style={{ fontSize: 24, fontWeight: 800, color: "var(--ink)", marginTop: 14, position: "relative" }}>
        {money ? fmt(disp) : disp.toLocaleString("fr-FR")}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600, marginTop: 2, position: "relative" }}>{label}</div>
    </motion.div>
  );
}

/* Lightweight SVG charts (no deps) */
function LineChart({ series, labels, height = 180 }) {
  const all = series.flatMap((s) => s.data);
  const max = Math.max(...all, 1); const w = 520; const pad = 28;
  const x = (i, n) => pad + (i * (w - pad * 2)) / (n - 1);
  const y = (v) => height - pad - (v / max) * (height - pad * 2);
  const uid = useMemo(() => "lg" + Math.random().toString(36).slice(2, 7), []);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} style={{ width: "100%", height }}>
      <defs>
        {series.map((s, si) => (
          <linearGradient key={si} id={`${uid}-${si}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.34" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0" />
          </linearGradient>
        ))}
        <filter id={`${uid}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((g, i) => <line key={i} x1={pad} x2={w - pad} y1={y(max * g)} y2={y(max * g)} stroke="var(--line)" strokeWidth="1" strokeDasharray={g === 0 ? "0" : "3 5"} />)}
      {series.map((s, si) => {
        const pts = s.data.map((v, i) => `${x(i, s.data.length)},${y(v)}`).join(" ");
        const area = `${pad},${height - pad} ${pts} ${w - pad},${height - pad}`;
        return (
          <g key={si}>
            <motion.polygon initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} points={area} fill={`url(#${uid}-${si})`} />
            <motion.polyline initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1 }}
              points={pts} fill="none" stroke={s.color} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${uid}-glow)`} />
            {s.data.map((v, i) => <circle key={i} cx={x(i, s.data.length)} cy={y(v)} r="3.4" fill="#fff" stroke={s.color} strokeWidth="2.2" />)}
          </g>
        );
      })}
      {labels.map((l, i) => <text key={i} x={x(i, labels.length)} y={height - 6} fontSize="10" fill="var(--faint)" textAnchor="middle">{l}</text>)}
    </svg>
  );
}

function BarChart({ data, height = 180, color = "var(--primary)", grad = "primary" }) {
  const max = Math.max(...data.map((d) => d.v), 1); const w = 520; const pad = 28;
  const bw = (w - pad * 2) / data.length * 0.6;
  const uid = useMemo(() => "bg" + Math.random().toString(36).slice(2, 7), []);
  const stops = { primary: ["#8B5CF6", "#D946EF"], green: ["#10B981", "#34D399"], amber: ["#F59E0B", "#FBBF24"], red: ["#EF4444", "#F87171"], sky: ["#0EA5E9", "#38BDF8"] }[grad] || ["#8B5CF6", "#D946EF"];
  return (
    <svg viewBox={`0 0 ${w} ${height}`} style={{ width: "100%", height }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stops[0]} />
          <stop offset="100%" stopColor={stops[1]} stopOpacity="0.75" />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const x = pad + (i + 0.5) * ((w - pad * 2) / data.length) - bw / 2;
        const h = (d.v / max) * (height - pad * 2);
        return (
          <g key={i}>
            <motion.rect initial={{ height: 0, y: height - pad }} animate={{ height: h, y: height - pad - h }} transition={{ delay: i * 0.05, type: "spring", damping: 18 }}
              x={x} width={bw} rx="6" fill={`url(#${uid})`} />
            <text x={x + bw / 2} y={height - 8} fontSize="9.5" fill="var(--faint)" textAnchor="middle">{d.l}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Donut({ data, size = 150 }) {
  const total = data.reduce((a, d) => a + d.v, 0) || 1; let acc = 0; const r = size / 2 - 14; const c = size / 2; const circ = 2 * Math.PI * r;
  const uid = useMemo(() => "dg" + Math.random().toString(36).slice(2, 7), []);
  const lighten = (hex) => hex; // keep base; gradient adds depth
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
      <svg width={size} height={size}>
        <defs>
          {data.map((d, i) => (
            <linearGradient key={i} id={`${uid}-${i}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={d.color} stopOpacity="1" />
              <stop offset="100%" stopColor={d.color} stopOpacity="0.6" />
            </linearGradient>
          ))}
        </defs>
        <circle cx={c} cy={c} r={r} fill="none" stroke="#F1EFF8" strokeWidth="14" />
        {data.map((d, i) => {
          const frac = d.v / total; const dash = frac * circ; const off = acc * circ; acc += frac;
          return <motion.circle key={i} initial={{ strokeDasharray: `0 ${circ}` }} animate={{ strokeDasharray: `${dash} ${circ - dash}` }} transition={{ delay: i * 0.1, duration: 0.7 }}
            cx={c} cy={c} r={r} fill="none" stroke={`url(#${uid}-${i})`} strokeWidth="14" strokeLinecap="round" strokeDashoffset={-off} transform={`rotate(-90 ${c} ${c})`} />;
        })}
        <circle cx={c} cy={c} r={r - 18} fill="#fff" />
        <text x={c} y={c - 1} textAnchor="middle" fontSize="18" fontWeight="800" fill="var(--ink)" className="mono">{total}</text>
        <text x={c} y={c + 13} textAnchor="middle" fontSize="8.5" fill="var(--faint)" style={{ textTransform: "uppercase", letterSpacing: 1 }}>total</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--muted)" }}>
            <span style={{ width: 11, height: 11, borderRadius: 4, background: `linear-gradient(135deg, ${d.color}, ${d.color}99)`, boxShadow: `0 2px 6px -1px ${d.color}66` }} />
            <span style={{ flex: 1 }}>{d.l}</span>
            <b className="mono" style={{ color: "var(--ink)" }}>{d.v}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function Panel({ title, children, right, pad = 18 }) {
  return (
    <div style={{ ...card, padding: pad }}>
      {(title || right) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          {title && <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 4, height: 16, borderRadius: 3, background: "var(--grad-primary)", display: "inline-block" }} />{title}</h3>}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   ADMIN SCREENS
--------------------------------------------------------------------------- */
function Confirm({ open, onClose, onConfirm, title, body }) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={title || t.deleteConfirm}
      footer={<><Btn variant="line" onClick={onClose}>{t.cancel}</Btn><Btn variant="danger" onClick={() => { onConfirm(); onClose(); }}>{t.delete}</Btn></>}>
      <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>{body || t.deleteWarn}</p>
    </Modal>
  );
}

function AdminDashboard() {
  const t = useT();
  const [period, setPeriod] = useState("month");
  const debtors = [...STUDENTS].filter((s) => s.debt > 0).sort((a, b) => b.debt - a.debt).slice(0, 5);
  const recent = STUDENTS.flatMap((s) => s.payments.map((p) => ({ ...p, who: `${s.firstName} ${s.lastName}` }))).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const studentsPerClass = CLASSES.map((c) => ({ l: c.type === "FORMATION" ? (c.name || "").split(" ")[0] : c.year, v: c.students }));
  const revByType = SUB_TYPES.map((s, i) => ({ l: (s.name || "").split(" ")[0], v: ri(80, 320) * 1000, color: ["#8B5CF6", "#10B981", "#F59E0B", "#0EA5E9", "#D946EF"][i % 5] }));
  const lowSeances = STUDENTS.filter((s) => s.seancesRemaining != null && s.seancesRemaining <= 2).length;
  const expiredCount = STUDENTS.filter((s) => s.status === "EXPIRED").length;
  const overdueSal = TEACHERS.filter((x) => x.unpaidMonths > 0).length;
  const debtorCount = STUDENTS.filter((s) => s.debt > 0).length;
  // Teacher payment alerts
  const [unpaidSeancesCount, setUnpaidSeancesCount] = useState(0);
  useEffect(() => {
    Promise.all(TEACHERS.filter((x) => x.payModel !== "FIXED").map((x) => db.listUnpaidSeances(x.id).catch(() => [])))
      .then((all) => setUnpaidSeancesCount(all.reduce((s, a) => s + (a?.length || 0), 0))).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const fixedOverdue = TEACHERS.filter((x) => x.payModel === "FIXED" && x.unpaidMonths > 0).length;
  const periodMult = { week: 0.25, month: 1, year: 9 }[period];
  const attention = [
    { icon: "⏳", txt: t.expiringSubs, n: 4, tone: "amber" },
    { icon: "🔋", txt: t.lowSeances, n: lowSeances, tone: "red" },
    { icon: "💼", txt: t.overdueSalaries, n: overdueSal, tone: "amber" },
    { icon: "⌛", txt: t.expired, n: expiredCount, tone: "red" },
  ];
  const banners = [
    debtorCount > 0 && { icon: "⚠️", tone: "red", msg: `${debtorCount} ${t.students.toLowerCase()} · ${t.debt.toLowerCase()}` },
    lowSeances > 0 && { icon: "🔋", tone: "amber", msg: `${lowSeances} · ${t.lowSeances.toLowerCase()}` },
    overdueSal > 0 && { icon: "💼", tone: "amber", msg: `${overdueSal} · ${t.overdueSalaries.toLowerCase()}` },
    { icon: "⏳", tone: "amber", msg: `4 · ${t.expiringSubs.toLowerCase()}` },
    fixedOverdue > 0 && { icon: "💼", tone: "amber", msg: `${fixedOverdue} ${t.teacherPayAlerts}` },
    unpaidSeancesCount > 0 && { icon: "🎓", tone: "amber", msg: `${unpaidSeancesCount} ${t.unpaidSeancesAlert}` },
  ].filter(Boolean);
  const toneMap = { red: ["var(--red-bg)", "var(--red)"], amber: ["var(--amber-bg)", "var(--amber)"], green: ["var(--green-bg)", "var(--green)"] };
  return (
    <div>
      <PageHead icon="📊" title={t.dashboard} sub={`${t.academicYear} 2025–2026`}
        action={<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "inline-flex", background: "#F1EFF8", borderRadius: 10, padding: 3, gap: 2 }}>
            {[["week", t.week], ["month", t.months[4]], ["year", t.academicYear]].map(([v, l]) => (
              <button key={v} onClick={() => setPeriod(v)} style={{ border: "none", cursor: "pointer", padding: "6px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, background: period === v ? "#fff" : "transparent", color: period === v ? "var(--primary-600)" : "var(--faint)", boxShadow: period === v ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>{l}</button>
            ))}
          </div>
        </div>} />

      {/* Alerts banner */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        {banners.map((b, i) => {
          const [bg, fg] = toneMap[b.tone];
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{ display: "flex", alignItems: "center", gap: 8, background: bg, color: fg, padding: "9px 14px", borderRadius: 12, fontSize: 12.5, fontWeight: 700 }}>
              <span style={{ fontSize: 15 }}>{b.icon}</span>{b.msg}
            </motion.div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 18 }}>
        <StatCard label={t.students} value={totals.students} icon="🎓" trend={6} />
        <StatCard label={t.teachers} value={totals.teachers} icon="👨‍🏫" trend={0} />
        <StatCard label={t.activeSubs} value={totals.activeSubs} icon="📑" trend={4} tone="green" />
        <StatCard label={t.monthRevenue} value={Math.round(totals.monthRevenue * periodMult)} icon="💰" trend={9} tone="green" money />
        <StatCard label={t.debt} value={totals.debt} icon="⚠️" trend={-3} tone="red" money />
        <StatCard label={t.monthExpenses} value={Math.round(totals.monthExpenses * periodMult)} icon="🧾" trend={2} tone="amber" money />
        <StatCard label={t.profit} value={Math.round(totals.profit * periodMult)} icon="📈" trend={7} tone={totals.profit >= 0 ? "green" : "red"} money />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }} className="dash-grid">
        <Panel title={`${t.revenue} vs ${t.expenses}`}>
          <LineChart labels={t.months.slice(0, 8)} series={[
            { data: [120, 180, 150, 220, 260, 240, 300, 280].map((x) => x * 1000), color: "#10B981" },
            { data: [80, 90, 110, 95, 120, 130, 115, 140].map((x) => x * 1000), color: "#F59E0B" },
          ]} />
        </Panel>
        <Panel title={t.bySubType}><Donut data={revByType} /></Panel>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }} className="dash-grid">
        <Panel title={`${t.students} / ${t.classes}`}><BarChart data={studentsPerClass} /></Panel>
        <Panel title={`${t.debt} / ${t.classes}`}><BarChart data={CLASSES.map((c) => ({ l: c.year || (c.name || "").split(" ")[0], v: ri(10, 90) * 1000 }))} grad="red" /></Panel>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }} className="dash-grid">
        <Panel title={t.topDebtors}>
          {debtors.map((d) => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{d.firstName} {d.lastName}</span>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}><span className="mono" style={{ color: "var(--red)", fontWeight: 700, fontSize: 12.5 }}>{fmt(d.debt)}</span><Btn size="sm">{t.payDebt}</Btn></span>
            </div>
          ))}
        </Panel>
        <Panel title={t.recentPayments}>
          {recent.map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
              <span style={{ fontSize: 13 }}>{p.who}</span>
              <span className="mono" style={{ color: "var(--green)", fontWeight: 700, fontSize: 12.5 }}>+{fmt(p.amount)}</span>
            </div>
          ))}
        </Panel>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel title={t.quickActions}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Btn variant="soft" style={{ justifyContent: "flex-start" }}>➕ {t.newStudent}</Btn>
              <Btn variant="soft" style={{ justifyContent: "flex-start" }}>💳 {t.recordPayment}</Btn>
              <Btn variant="soft" style={{ justifyContent: "flex-start" }}>📢 {t.newAnnouncement}</Btn>
            </div>
          </Panel>
          <Panel title={t.needsAttention}>
            {attention.map((a, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
                <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{a.icon} {a.txt}</span>
                <Badge tone={a.tone}>{a.n}</Badge>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* Reusable student detail modal body used in Classes, Planner, Subscriptions */
function StudentViewModalBody({ student, payments, attendance, attFilter, setAttFilter, t }) {
  if (!student) return null;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        <Panel title={t.finalPrice}><div className="mono" style={{ fontSize: 17, fontWeight: 800 }}>{fmt(student.finalPrice)}</div></Panel>
        <Panel title={t.paid}><div className="mono" style={{ fontSize: 17, fontWeight: 800, color: "var(--green)" }}>{fmt(student.paid)}</div></Panel>
        <Panel title={t.remaining}><div className="mono" style={{ fontSize: 17, fontWeight: 800, color: student.debt > 0 ? "var(--red)" : "var(--green)" }}>{fmt(student.debt)}</div></Panel>
      </div>
      <Panel title={`${t.subscription}: ${student.subType || "—"}`}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {student.className && <Badge tone="gray">📚 {student.className}</Badge>}
          {student.group && <Badge tone="gray">👥 {student.group}</Badge>}
          <Badge tone={student.status === "ACTIVE" ? "green" : "red"}>{student.status === "ACTIVE" ? t.active : t.expired}</Badge>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "var(--muted)" }}>
          <span>{t.seancesLeft}: <b className="mono" style={{ color: "var(--ink)" }}>{student.seancesRemaining ?? "∞"}{student.seancesTotal ? `/${student.seancesTotal}` : ""}</b></span>
          {student.startDate && <span>{t.startDate}: <b className="mono" style={{ color: "var(--ink)" }}>{student.startDate}</b></span>}
          {student.expiryDate && <span>{t.expiryDate}: <b className="mono" style={{ color: "var(--amber)" }}>{student.expiryDate}</b></span>}
          {!student.expiryDate && <Badge tone="green">{t.noExpiry}</Badge>}
        </div>
      </Panel>
      <div style={{ marginTop: 14 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{t.history} · {t.payments}</h4>
        {payments.length === 0 ? <p style={{ fontSize: 13, color: "var(--muted)" }}>{t.noResults}</p> :
          payments.map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
              <div><span>{p.date} · {t[p.method] || p.method}</span>{p.collectorName && <span style={{ color: "var(--muted)", fontSize: 11.5, marginLeft: 8 }}>{t.collectedBy}: {p.collectorName}</span>}</div>
              <span className="mono" style={{ color: "var(--green)", fontWeight: 700 }}>+{fmt(p.amount)}</span>
            </div>
          ))}
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{t.seanceHistory}</h4>
          <FilterChips value={attFilter} onChange={setAttFilter} options={[{ v: "all", l: t.all }, { v: "PRESENT", l: t.present }, { v: "ABSENT", l: t.absent }, { v: "LATE", l: t.late }]} />
        </div>
        {attendance.filter(a => attFilter === "all" || a.status === attFilter).length === 0
          ? <p style={{ fontSize: 13, color: "var(--muted)" }}>{t.noResults}</p>
          : attendance.filter(a => attFilter === "all" || a.status === attFilter).map((a, i) => {
            const tone = a.status === "PRESENT" ? "green" : a.status === "LATE" ? "amber" : "red";
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 12.5 }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{a.date}</span>
                  {a.recordedAt && <span style={{ color: "var(--faint)", marginLeft: 6 }}>{new Date(a.recordedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>}
                  <span style={{ color: "var(--muted)", marginLeft: 6 }}>· {a.planName}</span>
                  {a.isDebt && <Badge tone="amber" style={{ marginLeft: 6 }}>🎟️</Badge>}
                </div>
                <Badge tone={tone}>{a.status === "PRESENT" ? t.present : a.status === "LATE" ? t.late : t.absent}</Badge>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function ClassesScreen() {
  const t = useT();
  const [q, setQ] = useState(""); const [type, setType] = useState("all");
  const [modal, setModal] = useState(false); const [ctype, setCtype] = useState("COURSES");
  const [del, setDel] = useState(null); const [view, setView] = useState(null);
  const [viewMode, setViewMode] = useState("cards");
  const [form, setForm] = useState({ name: "", level: "", year: "", description: "" });
  const [classes, setClasses] = useState(CLASSES);
  const [formationLevels, setFormationLevels] = useState(["A1", "A2", "B1", "B2", "C1", "C2"]);
  const [lvlModal, setLvlModal] = useState(false); const [newLvl, setNewLvl] = useState("");
  const [classStudents, setClassStudents] = useState([]);
  const [studView, setStudView] = useState(null);
  const [studViewPays, setStudViewPays] = useState([]);
  const [studViewAtt, setStudViewAtt] = useState([]);
  const [studAttFilter, setStudAttFilter] = useState("all");
  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const doRefresh = async () => { setClasses(await reloadClasses()); };

  useEffect(() => {
    db.listFormationLevels().then((lvls) => { if (lvls && lvls.length) setFormationLevels(lvls.map((l) => l.name)); }).catch(() => {});
  }, []);

  const openView = (c) => {
    setView(c);
    // Traverse: class → plans → subscription types → students
    const classPlans = PLANS.filter(p => p.classId === c.id);
    const classPlanIds = new Set(classPlans.map(p => p.id));
    const classSubTypeIds = new Set(SUB_TYPES.filter(st => classPlanIds.has(st.planId)).map(st => st.id));
    setClassStudents(STUDENTS.filter(s => classSubTypeIds.has(s.subTypeId)));
  };
  const openStudView = async (s) => {
    setStudView(s); setStudViewPays([]); setStudViewAtt([]); setStudAttFilter("all");
    try {
      const [pays, att] = await Promise.all([db.paymentsForStudent(s.id).catch(() => []), db.attendanceForStudent(s.id).catch(() => [])]);
      setStudViewPays((pays || []).map(p => ({ amount: p.amount, date: p.paid_at?.slice(0,10), method: p.method, collectorName: p.collector_name })));
      setStudViewAtt((att || []).map(a => ({ date: a.session_date, status: a.status, planName: a.plans?.name || "—", recordedAt: a.recorded_at, isDebt: a.is_debt })));
    } catch(_) {}
  };

  const doDelete = async (c) => {
    setClasses((prev) => prev.filter((x) => x.id !== c.id));
    try { await db.deleteClass(c.id); }
    catch (e) { alert(e.message); doRefresh(); }
  };
  const save = async () => {
    try {
      await db.addClass({ type: ctype, name: ctype === "FORMATION" ? form.name : null, level: ctype === "FORMATION" ? "OTHER" : form.level, year: ctype === "FORMATION" ? form.level : form.year, description: form.description });
      await doRefresh(); setModal(false);
    } catch (e) { alert(e.message); }
  };
  const list = classes.filter((c) => (type === "all" || c.type === type) && classLabel(c).toLowerCase().includes(q.toLowerCase()));
  const actions = (c) => [{ icon: "👁️", label: t.view, onClick: () => openView(c) }, { icon: "✏️", label: t.edit, onClick: () => setModal(true) }, { icon: "🗑️", label: t.delete, danger: true, onClick: () => setDel(c) }];
  return (
    <div>
      <PageHead icon="🏫" title={t.classes} action={<Btn onClick={() => setModal(true)}>➕ {t.create}</Btn>} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <SearchFilter value={q} onChange={setQ} filters={<FilterChips value={type} onChange={setType} options={[{ v: "all", l: t.all }, { v: "COURSES", l: t.courses }, { v: "FORMATION", l: t.formation }]} />} />
        </div>
        <ViewToggle mode={viewMode} setMode={setViewMode} />
      </div>
      {list.length === 0 ? <Empty title={t.emptyTitle} hint="Créez votre première classe" action={<Btn onClick={() => setModal(true)}>➕ {t.create}</Btn>} /> : viewMode === "cards" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
          <AnimatePresence mode="popLayout">
          {list.map((c) => (
            <motion.div key={c.id} layout initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -8, transition: { duration: 0.15 } }} whileHover={{ y: -5, boxShadow: "var(--shadow-lift)" }} className="gcard" style={{ ...card, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Badge tone={c.type === "COURSES" ? "primary" : "green"}>{c.type === "COURSES" ? t.courses : t.formation}</Badge>
                <Menu items={actions(c)} />
              </div>
              <h3 className="serif" style={{ margin: "12px 0 4px", fontSize: 18 }}>{classLabel(c)}</h3>
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted)" }}>{c.desc}</p>
              <div style={{ display: "flex", gap: 18, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                <span style={{ fontSize: 12.5, color: "var(--muted)" }}>🎓 <b className="mono" style={{ color: "var(--ink)" }}>{c.students}</b> {t.enrolled}</span>
                <span style={{ fontSize: 12.5, color: "var(--muted)" }}>👥 <b className="mono" style={{ color: "var(--ink)" }}>{c.groups}</b> {t.groups}</span>
              </div>
            </motion.div>
          ))}
          </AnimatePresence>
        </div>
      ) : (
        <DataTable columns={[
          { h: t.name, render: (c) => <b>{classLabel(c)}</b> },
          { h: t.type, render: (c) => <Badge tone={c.type === "COURSES" ? "primary" : "green"}>{c.type === "COURSES" ? t.courses : t.formation}</Badge> },
          { h: t.description, k: "desc" },
          { h: t.students, render: (c) => <span className="mono">{c.students}</span> },
          { h: t.groups, render: (c) => <span className="mono">{c.groups}</span> },
        ]} rows={list} actions={actions} />
      )}
      <Modal open={modal} onClose={() => setModal(false)} title={t.create + " · " + t.classes}
        footer={<><Btn variant="line" onClick={() => setModal(false)}>{t.cancel}</Btn><Btn onClick={save}>{t.save}</Btn></>}>
        <Field label={t.type}>
          <div style={{ display: "flex", gap: 10 }}>
            {[["COURSES", t.courses], ["FORMATION", t.formation]].map(([v, l]) => (
              <button key={v} onClick={() => { setCtype(v); setF("level", ""); setF("year", ""); }} style={{ flex: 1, padding: "12px", borderRadius: 11, border: "1px solid " + (ctype === v ? "var(--primary)" : "var(--line)"), background: ctype === v ? "var(--primary-50)" : "#fff", color: ctype === v ? "var(--primary-600)" : "var(--muted)", fontWeight: 700, cursor: "pointer" }}>{l}</button>
            ))}
          </div>
        </Field>
        {ctype === "COURSES" ? (
          <>
            <Field label={t.level}><Select value={form.level} onChange={(e) => setF("level", e.target.value)}><option value="">— Sélectionner —</option><option value="PRIMARY">Primaire</option><option value="CEM">CEM</option><option value="LYCEE">Lycée</option></Select></Field>
            <Field label={t.year}><Select value={form.year} onChange={(e) => setF("year", e.target.value)}><option value="">— Sélectionner —</option>{["1ère", "2ème", "3ème", "4ème", "5ème"].map((y) => <option key={y}>{y}</option>)}</Select></Field>
          </>
        ) : (
          <>
            <Field label={t.name}><Input value={form.name} onChange={(e) => setF("name", e.target.value)} placeholder="Anglais Intensif" /></Field>
            <Field label={t.level}>
              <div style={{ display: "flex", gap: 8 }}>
                <Select value={form.level} onChange={(e) => setF("level", e.target.value)} style={{ flex: 1 }}>
                  <option value="">— Sélectionner —</option>
                  {formationLevels.map((l) => <option key={l}>{l}</option>)}
                </Select>
                <Btn variant="soft" size="sm" onClick={() => setLvlModal(true)}>➕ {t.newLevel}</Btn>
              </div>
            </Field>
          </>
        )}
        <Field label={t.description}><Input value={form.description} onChange={(e) => setF("description", e.target.value)} placeholder={t.description} /></Field>
      </Modal>
      <Modal open={!!view} onClose={() => { setView(null); setClassStudents([]); }} title={view ? classLabel(view) : ""} wide
        footer={<Btn variant="line" onClick={() => { setView(null); setClassStudents([]); }}>{t.close}</Btn>}>
        {view && <div>
          <Badge tone={view.type === "COURSES" ? "primary" : "green"}>{view.type === "COURSES" ? t.courses : t.formation}</Badge>
          <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 12 }}>{view.desc}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
            <Panel title={t.students}><div className="mono" style={{ fontSize: 24, fontWeight: 800 }}>{view.students}</div></Panel>
            <Panel title={t.groups}><div className="mono" style={{ fontSize: 24, fontWeight: 800 }}>{view.groups}</div></Panel>
          </div>
          <div style={{ marginTop: 12 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{t.groups}</h4>
            {GROUPS.filter((g) => g.classId === view.id).map((g) => (
              <div key={g.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                <span>{g.name}</span><Badge tone={g.current >= g.capacity ? "red" : "gray"}>{g.current}/{g.capacity}</Badge>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🎓 {t.students} ({classStudents.length})</h4>
            {classStudents.length === 0 ? <p style={{ fontSize: 13, color: "var(--muted)" }}>{t.noResults}</p> :
              classStudents.map((s) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{s.firstName} {s.lastName}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{s.subType || "—"}{s.group ? ` · ${s.group}` : ""}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {s.seancesRemaining != null && <Badge tone={s.seancesRemaining <= 2 ? "amber" : "gray"}>{s.seancesRemaining}/{s.seancesTotal}</Badge>}
                    {s.debt > 0 ? <Badge tone="red">💳 {fmt(s.debt)}</Badge> : <Badge tone="green">✅ {t.paid}</Badge>}
                    <Btn size="sm" variant="soft" onClick={() => openStudView(s)}>👁️ {t.view}</Btn>
                  </div>
                </div>
              ))}
          </div>
        </div>}
      </Modal>
      <Modal open={!!studView} onClose={() => { setStudView(null); setStudViewPays([]); setStudViewAtt([]); }} title={studView ? `${studView.firstName} ${studView.lastName}` : ""} wide
        footer={<Btn variant="line" onClick={() => { setStudView(null); setStudViewPays([]); setStudViewAtt([]); }}>{t.close}</Btn>}>
        <StudentViewModalBody student={studView} payments={studViewPays} attendance={studViewAtt} attFilter={studAttFilter} setAttFilter={setStudAttFilter} t={t} />
      </Modal>
      <Modal open={lvlModal} onClose={() => setLvlModal(false)} title={t.newLevel}
        footer={<><Btn variant="line" onClick={() => setLvlModal(false)}>{t.cancel}</Btn><Btn onClick={async () => { if (!newLvl.trim()) return; try { await db.addFormationLevel(newLvl.trim()); setFormationLevels((p) => [...p, newLvl.trim()]); setF("level", newLvl.trim()); setNewLvl(""); setLvlModal(false); } catch (e) { alert(e.message); } }}>{t.save}</Btn></>}>
        <Field label={t.level}><Input value={newLvl} onChange={(e) => setNewLvl(e.target.value)} placeholder="Ex: Intermédiaire" autoFocus /></Field>
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => del && doDelete(del)} />
    </div>
  );
}

function PlannerScreen() {
  const t = useT();
  const [q, setQ] = useState("");
  const [view, setView] = useState("cards");
  const [plans, setPlans] = useState(PLANS);
  const [modules, setModules] = useState(MODULES);
  const [groups, setGroups] = useState(GROUPS);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [planType, setPlanType] = useState("COURSES");
  const [classId, setClassId] = useState("");
  const [detail, setDetail] = useState(null);
  const [del, setDel] = useState(null);
  const [showCal, setShowCal] = useState(false);
  const [modModal, setModModal] = useState(false);
  const [grpModal, setGrpModal] = useState(false);
  const [newMod, setNewMod] = useState("");
  const [grpName, setGrpName] = useState(""); const [grpCap, setGrpCap] = useState(20);
  const [planStudents, setPlanStudents] = useState([]);
  const [studView, setStudView] = useState(null);
  const [studViewPays, setStudViewPays] = useState([]);
  const [studViewAtt, setStudViewAtt] = useState([]);
  const [studAttFilter, setStudAttFilter] = useState("all");

  const doRefresh = async () => { setPlans(await reloadPlans()); setGroups(await reloadGroups()); setModules([...store.MODULES]); };
  const openDetail = (p) => {
    setDetail(p);
    // Traverse: plan → subscription types → students
    const planSubTypeIds = new Set(SUB_TYPES.filter(st => st.planId === p.id).map(st => st.id));
    setPlanStudents(STUDENTS.filter(s => planSubTypeIds.has(s.subTypeId)));
  };
  const openStudView = async (s) => {
    setStudView(s); setStudViewPays([]); setStudViewAtt([]); setStudAttFilter("all");
    try {
      const [pays, att] = await Promise.all([db.paymentsForStudent(s.id).catch(() => []), db.attendanceForStudent(s.id).catch(() => [])]);
      setStudViewPays((pays || []).map(p => ({ amount: p.amount, date: p.paid_at?.slice(0,10), method: p.method, collectorName: p.collector_name })));
      setStudViewAtt((att || []).map(a => ({ date: a.session_date, status: a.status, planName: a.plans?.name || "—", recordedAt: a.recorded_at, isDebt: a.is_debt })));
    } catch(_) {}
  };

  // form state
  const blank = { name: "", classId: "", module: "", groupId: "", teacherId: "", days: [0], startTime: "09:00", endTime: "10:30" };
  const [form, setForm] = useState(blank);
  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const openCreate = () => { setEditing(null); setForm(blank); setPlanType("COURSES"); setClassId(""); setModal(true); };
  const openEdit = (p) => { setEditing(p); setForm({ name: p.name, classId: p.classId, module: p.module || "", groupId: p.groupId || "", teacherId: p.teacherId, days: p.days && p.days.length ? p.days : [p.day ?? 0], startTime: p.startTime, endTime: p.endTime }); setPlanType(CLASSES.find((c) => c.id === p.classId)?.type || "COURSES"); setClassId(p.classId); setModal(true); };

  const save = async () => {
    const cls = CLASSES.find((c) => c.id === form.classId);
    const moduleObj = (MODULES_FULL || []).find((m) => m.name === form.module);
    const grp = groups.find((g) => g.id === form.groupId) || groups.find((g) => g.classId === form.classId);
    const payload = {
      name: form.name || (cls?.type === "COURSES" ? form.module : cls?.name) || "",
      class_id: form.classId,
      module_id: moduleObj?.id || null,
      group_id: grp ? grp.id : null,
      teacher_id: form.teacherId,
      days_of_week: form.days || [],
      start_time: form.startTime,
      end_time: form.endTime,
    };
    try {
      if (editing) { await db.updatePlan(editing.id, payload); } else { await db.addPlan(payload); }
      await doRefresh();
      setModal(false);
    } catch (e) { alert(e.message); }
  };

  const doDelete = async (p) => {
    setPlans((prev) => prev.filter((x) => x.id !== p.id));
    try { await db.deletePlan(p.id); } catch (e) { alert(e.message); doRefresh(); }
  };

  const addModule = async () => {
    if (!newMod.trim()) return;
    try {
      const created = await db.addModule(newMod.trim());
      const createdModule = Array.isArray(created) ? created[0] : created;
      if (createdModule) {
        store.MODULES_FULL = [...(store.MODULES_FULL || [])];
        const exists = (store.MODULES_FULL || []).some((m) => m.id === createdModule.id);
        if (!exists) {
          store.MODULES_FULL.push(createdModule);
        }
        store.MODULES = (store.MODULES_FULL || []).map((m) => m.name).filter(Boolean);
      }
      setF("module", newMod.trim());
      setNewMod("");
      setModModal(false);
      setModules([...store.MODULES]);
    } catch (e) {
      alert(e.message);
    }
  };

  const addGroup = async () => {
    if (!grpName.trim()) return;
    try {
      const created = await db.addGroup({ class_id: form.classId, name: grpName.trim(), capacity: +grpCap });
      setGrpName(""); setGrpCap(20); setGrpModal(false);
      setGroups(await reloadGroups());
      setF("groupId", created.id);
    } catch (e) { alert(e.message); }
  };

  const list = plans.filter((p) => `${p.name} ${p.teacher} ${p.className}`.toLowerCase().includes(q.toLowerCase()));
  const classGroups = groups.filter((g) => g.classId === form.classId);

  const actions = (p) => [
    { icon: "👁️", label: t.view, onClick: () => openDetail(p) },
    { icon: "✏️", label: t.edit, onClick: () => openEdit(p) },
    { icon: "🗑️", label: t.delete, danger: true, onClick: () => setDel(p) },
  ];

  return (
    <div>
      <PageHead icon="📅" title={t.timetable} sub="Planification des séances"
        action={<div style={{ display: "flex", gap: 8 }}>
          <Btn variant="soft" onClick={() => setShowCal(true)}>🗓️ {t.seeCalendar}</Btn>
          <Btn onClick={openCreate}>➕ {t.create}</Btn>
        </div>} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div style={{ flex: "1 1 240px", maxWidth: 320 }}><SearchFilter value={q} onChange={setQ} /></div>
        <ViewToggle mode={view} setMode={setView} />
      </div>

      {view === "cards" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
          {list.map((p) => (
            <motion.div key={p.id} layout whileHover={{ y: -5, boxShadow: "var(--shadow-lift)" }} className="gcard" style={{ ...card, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(p.days||[]).map((d,i)=><Badge key={i}>{t.days[d]}</Badge>)}<Badge tone="gray">{p.startTime}–{p.endTime}</Badge>
                </div>
                <Menu items={actions(p)} />
              </div>
              <h3 className="serif" style={{ margin: "12px 0 2px", fontSize: 17 }}>{p.module || p.name}</h3>
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted)" }}>{p.className} · {p.group}</p>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12.5, color: "var(--muted)" }}>👨‍🏫 {p.teacher}</span>
                <span style={{ fontSize: 12.5, color: "var(--muted)" }}>🎓 {p.students} {t.enrolled}</span>
              </div>
            </motion.div>
          ))}
          {list.length === 0 && <Empty title={t.noResults} />}
        </div>
      ) : (
        <DataTable
          columns={[
            { h: t.module, render: (p) => <b>{p.module || p.name}</b> },
            { h: t.classes, k: "className" },
            { h: t.group, k: "group" },
            { h: t.teacher, k: "teacher" },
            { h: t.day, render: (p) => (p.days||[]).map(d=>t.days[d]).join(", ") },
            { h: t.time, render: (p) => `${p.startTime}–${p.endTime}` },
            { h: t.students, render: (p) => <span className="mono">{p.students}</span> },
          ]}
          rows={list}
          actions={actions}
        />
      )}

      {/* Create / Edit plan */}
      <Modal open={modal} onClose={() => setModal(false)} title={(editing ? t.edit : t.create) + " · " + t.timetable} wide
        footer={<><Btn variant="line" onClick={() => setModal(false)}>{t.cancel}</Btn><Btn onClick={save}>{t.save}</Btn></>}>
        <Field label={t.name}><Input value={form.name} onChange={(e) => setF("name", e.target.value)} placeholder={planType === "COURSES" ? "Séance Math" : "—"} /></Field>
        <Field label={t.classes}>
          <Select value={form.classId} onChange={(e) => { setF("classId", e.target.value); setClassId(e.target.value); setPlanType(CLASSES.find((c) => c.id === e.target.value)?.type || "COURSES"); setF("groupId", ""); }}>
            <option value="">— Sélectionner une classe —</option>
            {CLASSES.map((c) => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}
          </Select>
        </Field>
        {planType === "COURSES" && (
          <Field label={t.module}>
            <div style={{ display: "flex", gap: 8 }}>
              <Select value={form.module} onChange={(e) => setF("module", e.target.value)} style={{ flex: 1 }}><option value="">— Sélectionner un module —</option>{modules.map((m) => <option key={m} value={m}>{m}</option>)}</Select>
              <Btn variant="soft" size="sm" onClick={() => setModModal(true)}>➕ {t.newModule}</Btn>
            </div>
          </Field>
        )}
        <Field label={t.group}>
          <div style={{ display: "flex", gap: 8 }}>
            <Select value={form.groupId} onChange={(e) => setF("groupId", e.target.value)} style={{ flex: 1 }}>
              <option value="">—</option>
              {classGroups.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.current}/{g.capacity})</option>)}
            </Select>
            <Btn variant="soft" size="sm" onClick={() => setGrpModal(true)}>➕ {t.newGroup}</Btn>
          </div>
        </Field>
        <Field label={t.teacher}><Select value={form.teacherId} onChange={(e) => setF("teacherId", e.target.value)}><option value="">— Sélectionner un enseignant —</option>{TEACHERS.map((x) => <option key={x.id} value={x.id}>{x.firstName} {x.lastName}</option>)}</Select></Field>
        <Field label={t.day}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {t.days.map((d, i) => { const sel = (form.days||[]).includes(i); return <button key={i} type="button" onClick={() => setF("days", sel ? (form.days||[]).filter(x=>x!==i) : [...(form.days||[]),i].sort((a,b)=>a-b))} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid "+(sel?"var(--primary)":"var(--line)"), background: sel?"var(--primary-50)":"#fff", color: sel?"var(--primary-600)":"var(--muted)", fontWeight: sel?700:400, cursor:"pointer", fontSize:12.5 }}>{d}</button>; })}
          </div>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={t.time + " (début)"}><Input type="time" value={form.startTime} onChange={(e) => setF("startTime", e.target.value)} /></Field>
          <Field label={t.time + " (fin)"}><Input type="time" value={form.endTime} onChange={(e) => setF("endTime", e.target.value)} /></Field>
        </div>
      </Modal>

      {/* New module */}
      <Modal open={modModal} onClose={() => setModModal(false)} title={t.addModuleTitle}
        footer={<><Btn variant="line" onClick={() => setModModal(false)}>{t.cancel}</Btn><Btn onClick={addModule}>{t.save}</Btn></>}>
        <Field label={t.moduleName}><Input value={newMod} onChange={(e) => setNewMod(e.target.value)} placeholder="Ex: Comptabilité" autoFocus /></Field>
      </Modal>

      {/* New group with capacity */}
      <Modal open={grpModal} onClose={() => setGrpModal(false)} title={t.addGroupTitle}
        footer={<><Btn variant="line" onClick={() => setGrpModal(false)}>{t.cancel}</Btn><Btn onClick={addGroup}>{t.save}</Btn></>}>
        <Field label={t.name}><Input value={grpName} onChange={(e) => setGrpName(e.target.value)} placeholder="Groupe 4" autoFocus /></Field>
        <Field label={t.groupLimit}><Input type="number" min="1" value={grpCap} onChange={(e) => setGrpCap(e.target.value)} /></Field>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0 }}>{classLabel(CLASSES.find((c) => c.id === form.classId))}</p>
      </Modal>

      {/* Plan detail */}
      <Modal open={!!detail} onClose={() => { setDetail(null); setPlanStudents([]); }} title={detail ? (detail.module || detail.name) : ""} wide footer={<Btn variant="line" onClick={() => { setDetail(null); setPlanStudents([]); }}>{t.close}</Btn>}>
        {detail && <div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            <Badge>{detail.className}</Badge><Badge tone="gray">{detail.group}</Badge>{(detail.days||[]).map((d,i)=><Badge key={i} tone="primary">{t.days[d]}</Badge>)}<Badge tone="gray">{detail.startTime}–{detail.endTime}</Badge>
          </div>
          <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 0 }}>👨‍🏫 {detail.teacher}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Panel title={t.students}><div className="mono" style={{ fontSize: 22, fontWeight: 800 }}>{detail.students}</div></Panel>
            <Panel title={t.totalGain}><div className="mono" style={{ fontSize: 18, fontWeight: 800, color: "var(--green)" }}>{fmt(detail.gains)}</div></Panel>
            <Panel title={t.debt}><div className="mono" style={{ fontSize: 18, fontWeight: 800, color: "var(--red)" }}>{fmt(detail.debt)}</div></Panel>
          </div>
          <div style={{ marginTop: 16 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🎓 {t.students} ({planStudents.length})</h4>
            {planStudents.length === 0 ? <p style={{ fontSize: 13, color: "var(--muted)" }}>{t.noResults}</p> :
              planStudents.map((s) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{s.firstName} {s.lastName}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{s.subType || "—"}{s.group ? ` · ${s.group}` : ""}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {s.seancesRemaining != null && <Badge tone={s.seancesRemaining <= 2 ? "amber" : "gray"}>{s.seancesRemaining}/{s.seancesTotal}</Badge>}
                    {s.debt > 0 ? <Badge tone="red">💳 {fmt(s.debt)}</Badge> : <Badge tone="green">✅ {t.paid}</Badge>}
                    <Btn size="sm" variant="soft" onClick={() => openStudView(s)}>👁️ {t.view}</Btn>
                  </div>
                </div>
              ))}
          </div>
        </div>}
      </Modal>
      <Modal open={!!studView} onClose={() => { setStudView(null); setStudViewPays([]); setStudViewAtt([]); }} title={studView ? `${studView.firstName} ${studView.lastName}` : ""} wide
        footer={<Btn variant="line" onClick={() => { setStudView(null); setStudViewPays([]); setStudViewAtt([]); }}>{t.close}</Btn>}>
        <StudentViewModalBody student={studView} payments={studViewPays} attendance={studViewAtt} attFilter={studAttFilter} setAttFilter={setStudAttFilter} t={t} />
      </Modal>

      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => del && doDelete(del)} />

      {showCal && <CalendarView plans={plans} onClose={() => setShowCal(false)} />}
    </div>
  );
}

/* Full calendar of all plans with filters */
function CalendarView({ plans, onClose }) {
  const t = useT();
  const [fClass, setFClass] = useState("all");
  const [fTeacher, setFTeacher] = useState("all");
  const [fDay, setFDay] = useState("all");
  const slots = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
  const days = [0, 1, 2, 3, 4, 5];
  const teachers = [...new Set(plans.map((p) => p.teacher))];
  const filtered = plans.filter((p) =>
    (fClass === "all" || p.classId === fClass) &&
    (fTeacher === "all" || p.teacher === fTeacher) &&
    (fDay === "all" || (p.days||[]).includes(+fDay)));
  const colorFor = (p) => {
    const palette = ["var(--grad-primary)", "var(--grad-green)", "var(--grad-amber)", "var(--grad-sky)", "var(--grad-red)"];
    return palette[(p.teacherId ? parseInt(p.teacherId.replace(/\D/g, "") || "0") : 0) % palette.length];
  };
  return (
    <Modal open onClose={onClose} title={`🗓️ ${t.calendar}`} wide
      footer={<Btn variant="line" onClick={onClose}>{t.close}</Btn>}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <Select value={fClass} onChange={(e) => setFClass(e.target.value)} style={{ width: "auto" }}>
          <option value="all">{t.allClasses}</option>
          {CLASSES.map((c) => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}
        </Select>
        <Select value={fTeacher} onChange={(e) => setFTeacher(e.target.value)} style={{ width: "auto" }}>
          <option value="all">{t.allTeachers}</option>
          {teachers.map((tc) => <option key={tc}>{tc}</option>)}
        </Select>
        <Select value={fDay} onChange={(e) => setFDay(e.target.value)} style={{ width: "auto" }}>
          <option value="all">{t.allDays}</option>
          {days.map((d) => <option key={d} value={d}>{t.days[d]}</option>)}
        </Select>
        <Btn variant="line" size="sm" onClick={() => { setFClass("all"); setFTeacher("all"); setFDay("all"); }}>↺ {t.reset}</Btn>
      </div>
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 720, display: "grid", gridTemplateColumns: `60px repeat(${days.length}, 1fr)`, gap: 6 }}>
          <div />
          {days.map((d) => <div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "var(--primary-600)", padding: "6px 0" }}>{t.days[d]}</div>)}
          {slots.map((s) => (
            <React.Fragment key={s}>
              <div className="mono" style={{ fontSize: 11, color: "var(--faint)", textAlign: "end", paddingTop: 6 }}>{s}</div>
              {days.map((d) => {
                const cell = filtered.filter((p) => (p.days||[]).includes(d) && p.startTime.slice(0, 2) === s.slice(0, 2));
                return (
                  <div key={d} style={{ minHeight: 44, borderRadius: 8, background: cell.length ? "transparent" : "#FAF8FE", border: "1px dashed " + (cell.length ? "transparent" : "var(--line)"), padding: cell.length ? 0 : 0, display: "flex", flexDirection: "column", gap: 4 }}>
                    {cell.map((p) => (
                      <motion.div key={p.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        title={`${p.module || p.name} · ${p.teacher} · ${p.group}`}
                        style={{ background: colorFor(p), color: "#fff", borderRadius: 8, padding: "6px 8px", fontSize: 10.5, lineHeight: 1.3, boxShadow: "0 4px 12px -4px rgba(0,0,0,.3)" }}>
                        <b style={{ display: "block", fontSize: 11 }}>{p.module || p.name}</b>
                        <span style={{ opacity: 0.92 }}>{(p.teacher || "").split(" ")[0]} · {p.group}</span>
                        <span style={{ display: "block", opacity: 0.85 }}>{p.startTime}–{p.endTime}</span>
                      </motion.div>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 14, fontSize: 12, color: "var(--muted)" }}>{filtered.length} {t.seances.toLowerCase()}</div>
    </Modal>
  );
}

/* ============================================================
   SUBSCRIPTIONS MANAGEMENT
============================================================ */
function SubscriptionsScreen() {
  const t = useT();
  const [subs, setSubs] = useState(SUB_TYPES);
  const [q, setQ] = useState("");
  const [view, setView] = useState("cards");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [del, setDel] = useState(null);

  const blank = { name: "", planId: "", days: 30, seancesCount: 8, perSeance: 750, total: 6000, expiryEnabled: false, totalManual: false };
  const [form, setForm] = useState(blank);
  const [studView, setStudView] = useState(null);
  const [studViewPays, setStudViewPays] = useState([]);
  const [studViewAtt, setStudViewAtt] = useState([]);
  const [studAttFilter, setStudAttFilter] = useState("all");
  const setF = (k, v) => setForm((p) => {
    const next = { ...p, [k]: v };
    if (!next.totalManual && (k === "seancesCount" || k === "perSeance")) {
      next.total = (+next.seancesCount || 0) * (+next.perSeance || 0);
    }
    return next;
  });

  const doRefresh = async () => { setSubs(await reloadSubTypes()); };
  const openStudView = async (s) => {
    setStudView(s); setStudViewPays([]); setStudViewAtt([]); setStudAttFilter("all");
    try {
      const [pays, att] = await Promise.all([db.paymentsForStudent(s.id).catch(() => []), db.attendanceForStudent(s.id).catch(() => [])]);
      setStudViewPays((pays || []).map(p => ({ amount: p.amount, date: p.paid_at?.slice(0,10), method: p.method, collectorName: p.collector_name })));
      setStudViewAtt((att || []).map(a => ({ date: a.session_date, status: a.status, planName: a.plans?.name || "—", recordedAt: a.recorded_at, isDebt: a.is_debt })));
    } catch(_) {}
  };

  const openCreate = () => { setEditing(null); setForm(blank); setModal(true); };
  const openEdit = (s) => { setEditing(s); setForm({ name: s.name, planId: s.planId, days: s.days || 30, seancesCount: s.seancesCount, perSeance: s.perSeance, total: s.total, expiryEnabled: s.expiryEnabled, totalManual: true }); setModal(true); };

  const save = async () => {
    const payload = {
      name: form.name || "Abonnement",
      plan_id: form.planId || null,
      days: form.expiryEnabled ? +form.days : null,
      seances_count: +form.seancesCount,
      per_seance: +form.perSeance,
      total: +form.total,
      expiry_enabled: form.expiryEnabled,
    };
    try {
      if (editing) { await db.updateSubType(editing.id, payload); } else { await db.addSubType(payload); }
      await doRefresh();
      setModal(false);
    } catch (e) { alert(e.message); }
  };

  const doDelete = async (s) => {
    setSubs((prev) => prev.filter((x) => x.id !== s.id));
    try { await db.deleteSubType(s.id); } catch (e) { alert(e.message); doRefresh(); }
  };

  const statsFor = (s) => {
    const studs = STUDENTS.filter((st) => st.subTypeId === s.id);
    const gain = studs.reduce((a, st) => a + st.paid, 0);
    return { count: studs.length, gain };
  };
  const planName = (id) => { const p = PLANS.find((x) => x.id === id); return p ? `${p.module || p.name} · ${p.className}` : "—"; };

  const list = subs.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));
  const actions = (s) => [
    { icon: "👁️", label: t.view, onClick: () => setDetail(s) },
    { icon: "✏️", label: t.edit, onClick: () => openEdit(s) },
    { icon: "🗑️", label: t.delete, danger: true, onClick: () => setDel(s) },
  ];

  return (
    <div>
      <PageHead icon="🎫" title={t.subscriptionsManage} sub="Créer et gérer les types d'abonnement"
        action={<Btn onClick={openCreate}>➕ {t.newSubscriber}</Btn>} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div style={{ flex: "1 1 240px", maxWidth: 320 }}><SearchFilter value={q} onChange={setQ} /></div>
        <ViewToggle mode={view} setMode={setView} />
      </div>

      {view === "cards" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 14 }}>
          <AnimatePresence mode="popLayout">
          {list.map((s) => {
            const st = statsFor(s);
            return (
              <motion.div key={s.id} layout initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -8, transition: { duration: 0.15 } }} whileHover={{ y: -5, boxShadow: "var(--shadow-lift)" }} className="gcard" style={{ ...card, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Badge tone={s.expiryEnabled ? "amber" : "green"}>{s.expiryEnabled ? `⏳ ${s.days}j` : t.untilSeances}</Badge>
                  <Menu items={actions(s)} />
                </div>
                <h3 className="serif" style={{ margin: "12px 0 4px", fontSize: 18 }}>{s.name}</h3>
                <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>📅 {planName(s.planId)}</p>
                {(() => {
                  const plan = PLANS.find(p => p.id === s.planId);
                  return plan ? (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8, paddingTop: 8 }}>
                      {plan.className && <span style={{ fontSize: 11, background: "var(--primary-50)", padding: "4px 8px", borderRadius: 6, color: "var(--primary-600)", fontWeight: 600 }}>📚 {plan.className}</span>}
                      {plan.group && <span style={{ fontSize: 11, background: "var(--primary-50)", padding: "4px 8px", borderRadius: 6, color: "var(--primary-600)", fontWeight: 600 }}>👥 {plan.group}</span>}
                    </div>
                  ) : null;
                })()}
                <div style={{ display: "flex", gap: 8, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>🎟️ <b className="mono" style={{ color: "var(--ink)" }}>{s.seancesCount}</b> {t.seances.toLowerCase()}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>👥 <b className="mono" style={{ color: "var(--ink)" }}>{st.count}</b></span>
                </div>
                <div className="mono" style={{ fontSize: 20, fontWeight: 800, marginTop: 10 }} ><span className="grad-text">{fmt(s.total)}</span></div>
              </motion.div>
            );
          })}
          </AnimatePresence>
          {list.length === 0 && <Empty icon="🎫" title={t.emptyTitle} action={<Btn onClick={openCreate}>➕ {t.newSubscriber}</Btn>} />}
        </div>
      ) : (
        <DataTable
          columns={[
            { h: t.subName, render: (s) => <b>{s.name}</b> },
            { h: t.plan, render: (s) => planName(s.planId) },
            { h: t.nbSeances, render: (s) => <span className="mono">{s.seancesCount}</span> },
            { h: t.expiryDate, render: (s) => s.expiryEnabled ? `${s.days}j` : t.noExpiry },
            { h: t.totalStudentsUsed, render: (s) => <span className="mono">{statsFor(s).count}</span> },
            { h: t.total, render: (s) => <span className="mono grad-text" style={{ fontWeight: 800 }}>{fmt(s.total)}</span> },
          ]}
          rows={list}
          actions={actions}
        />
      )}

      {/* Create / Edit subscription */}
      <Modal open={modal} onClose={() => setModal(false)} title={(editing ? t.edit : t.create) + " · " + t.subscription} wide
        footer={<><Btn variant="line" onClick={() => setModal(false)}>{t.cancel}</Btn><Btn onClick={save}>{t.save}</Btn></>}>
        <Field label={t.subName}><Input value={form.name} onChange={(e) => setF("name", e.target.value)} placeholder="Mensuel Standard" /></Field>
        <Field label={t.selectPlan}>
          <Select value={form.planId} onChange={(e) => setF("planId", e.target.value)}>
            <option value="">— Sélectionner un emploi du temps —</option>
            {PLANS.map((p) => <option key={p.id} value={p.id}>{(p.module || p.name)} · {p.className} · {p.group}</option>)}
          </Select>
        </Field>
        {PLANS.find(p => p.id === form.planId) && (() => {
          const selectedPlan = PLANS.find(p => p.id === form.planId);
          return (
            <div style={{ background: "var(--grad-primary-soft)", borderRadius: 12, padding: 14, marginBottom: 14, border: "1px solid #EADDFB" }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {selectedPlan.module && <Badge tone="primary">📚 {selectedPlan.module}</Badge>}
                {selectedPlan.className && <Badge tone="gray">📚 {selectedPlan.className}</Badge>}
                {selectedPlan.group && <Badge tone="gray">👥 {selectedPlan.group}</Badge>}
                {selectedPlan.teacher && <Badge tone="gray">👨‍🏫 {selectedPlan.teacher}</Badge>}
              </div>
            </div>
          );
        })()}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={t.nbSeances}><Input type="number" min="1" value={form.seancesCount} onChange={(e) => setF("seancesCount", e.target.value)} /></Field>
          <Field label={t.pricePerSeance}><Input type="number" min="0" value={form.perSeance} onChange={(e) => setF("perSeance", e.target.value)} /></Field>
        </div>
        <div style={{ background: "var(--grad-primary-soft)", borderRadius: 12, padding: 14, marginBottom: 14, border: "1px solid #EADDFB" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--primary-600)" }}>{t.total} {!form.totalManual && <span style={{ fontWeight: 500, color: "var(--muted)" }}>({t.autoCalculated})</span>}</span>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
              <input type="checkbox" checked={form.totalManual} onChange={(e) => setF("totalManual", e.target.checked)} /> {t.editTotalManually}
            </label>
          </div>
          <Input type="number" value={form.total} disabled={!form.totalManual} onChange={(e) => setF("total", e.target.value)}
            style={{ marginTop: 8, fontSize: 18, fontWeight: 800, fontFamily: "inherit", background: form.totalManual ? "#fff" : "transparent", border: form.totalManual ? "1px solid var(--line)" : "none" }} />
        </div>
        <div style={{ borderRadius: 12, padding: 14, border: "1px solid var(--line)" }}>
          <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer", marginBottom: 8 }}>
            <input type="checkbox" checked={form.expiryEnabled} onChange={(e) => setF("expiryEnabled", e.target.checked)} />
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{t.enableExpiry}</span>
          </label>
          {form.expiryEnabled && <Field label={t.nbDays}><Input type="number" min="1" value={form.days} onChange={(e) => setF("days", e.target.value)} /></Field>}
          <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--muted)", lineHeight: 1.6 }}>{t.expiryHint}</p>
        </div>
      </Modal>

      {/* Detail */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name} wide footer={<Btn variant="line" onClick={() => setDetail(null)}>{t.close}</Btn>}>
        {detail && (() => {
          const st = statsFor(detail);
          const plan = PLANS.find(p => p.id === detail.planId);
          const detailStudents = STUDENTS.filter(s => s.subTypeId === detail.id);
          return (
            <div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                <Badge tone={detail.expiryEnabled ? "amber" : "green"}>{detail.expiryEnabled ? `⏳ ${detail.days} ${t.nbDays.toLowerCase()}` : t.untilSeances}</Badge>
                <Badge tone="primary">📅 {planName(detail.planId)}</Badge>
                {plan?.className && <Badge tone="gray">📚 {plan.className}</Badge>}
                {plan?.group && <Badge tone="gray">👥 {plan.group}</Badge>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <Panel title={t.nbSeances}><div className="mono" style={{ fontSize: 22, fontWeight: 800 }}>{detail.seancesCount}</div></Panel>
                <Panel title={t.pricePerSeance}><div className="mono" style={{ fontSize: 22, fontWeight: 800 }}>{fmt(detail.perSeance)}</div></Panel>
                <Panel title={t.totalStudentsUsed}><div className="mono" style={{ fontSize: 22, fontWeight: 800, color: "var(--primary-600)" }}>{st.count}</div></Panel>
                <Panel title={t.totalGain}><div className="mono" style={{ fontSize: 22, fontWeight: 800, color: "var(--green)" }}>{fmt(st.gain)}</div></Panel>
              </div>
              <Panel title={t.total}><div className="mono grad-text" style={{ fontSize: 26, fontWeight: 800 }}>{fmt(detail.total)}</div></Panel>
              <div style={{ marginTop: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🎓 {t.studentsInSub} ({detailStudents.length})</h4>
                {detailStudents.length === 0 ? <p style={{ fontSize: 13, color: "var(--muted)" }}>{t.noResults}</p> :
                  detailStudents.map((s) => (
                    <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{s.firstName} {s.lastName}</div>
                        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{s.className || "—"}{s.group ? ` · ${s.group}` : ""}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {s.seancesRemaining != null && <Badge tone={s.seancesRemaining <= 2 ? "amber" : "gray"}>{s.seancesRemaining}/{s.seancesTotal}</Badge>}
                        {s.debt > 0 ? <Badge tone="red">💳 {fmt(s.debt)}</Badge> : <Badge tone="green">✅ {t.paid}</Badge>}
                        <Btn size="sm" variant="soft" onClick={() => openStudView(s)}>👁️ {t.view}</Btn>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          );
        })()}
      </Modal>
      <Modal open={!!studView} onClose={() => { setStudView(null); setStudViewPays([]); setStudViewAtt([]); }} title={studView ? `${studView.firstName} ${studView.lastName}` : ""} wide
        footer={<Btn variant="line" onClick={() => { setStudView(null); setStudViewPays([]); setStudViewAtt([]); }}>{t.close}</Btn>}>
        <StudentViewModalBody student={studView} payments={studViewPays} attendance={studViewAtt} attFilter={studAttFilter} setAttFilter={setStudAttFilter} t={t} />
      </Modal>

      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => del && doDelete(del)} />
    </div>
  );
}

function StudentsScreen({ canPay = true, canRemoveSub = false }) {
  const t = useT();
  const profile = useProfile();
  const globalRefresh = useRefresh();
  const [students, setStudents] = useState(STUDENTS);
  const [q, setQ] = useState(""); const [debtF, setDebtF] = useState("all");
  const [viewMode, setViewMode] = useState("cards");
  const [view, setView] = useState(null); const [pay, setPay] = useState(null);
  const [payAmt, setPayAmt] = useState(""); const [payMethod, setPayMethod] = useState("cash");
  const [confirm, setConfirm] = useState(false);
  const [create, setCreate] = useState(false); const [del, setDel] = useState(null); const [editing, setEditing] = useState(null);
  const [assign, setAssign] = useState(null);
  const [viewPayments, setViewPayments] = useState([]);
  const [viewAttendance, setViewAttendance] = useState([]);
  const [attFilter, setAttFilter] = useState("all");
  const [viewSubHistory, setViewSubHistory] = useState([]);
  const [viewTab, setViewTab] = useState("subs");
  const [removeSubData, setRemoveSubData] = useState(null);

  // student form state
  const [sFirst, setSFirst] = useState(""); const [sLast, setSLast] = useState("");
  const [sBirth, setSBirth] = useState(""); const [sBirthPlace, setSBirthPlace] = useState("");
  const [sIdCard, setSIdCard] = useState(""); const [sSchoolNum, setSSchoolNum] = useState("");
  const [sEmail, setSEmail] = useState(""); const [sPassword, setSPassword] = useState("");
  const [sIsFree, setSIsFree] = useState(false);

  // auto-generate email/password from student name when creating (not editing)
  useEffect(() => {
    if (!editing) {
      const norm = (s) =>
        (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
      const first = norm(sFirst);
      const last = norm(sLast);
      setSEmail(last && first ? `${last}${first}@celas.com` : "");
      setSPassword(last && first ? `${last}${first}123` : "");
    }
  }, [sFirst, sLast, editing]);

  // assignment form
  const [aSub, setASub] = useState("");
  const [aStart, setAStart] = useState(new Date().toISOString().slice(0, 10));
  const [aPaidNow, setAPaidNow] = useState("");
  const [aPayMethod, setAPayMethod] = useState("cash");
  const [aPayLater, setAPayLater] = useState(false);
  const subObj = SUB_TYPES.find((s) => s.id === aSub);
  const aExpiry = subObj && subObj.expiryEnabled && subObj.days ? addDays(aStart, subObj.days) : null;
  const subPlan = subObj ? PLANS.find((p) => p.id === subObj.planId) : null;
  const aEffectivePaid = subObj ? (aPaidNow === "" ? subObj.total : Math.min(Math.max(parseFloat(aPaidNow) || 0, 0), subObj.total)) : 0;
  const aDebt = subObj ? subObj.total - aEffectivePaid : 0;

  const doRefresh = async () => { setStudents(await reloadStudents()); };

  const list = students.filter((s) => {
    const txt = `${s.firstName} ${s.lastName} ${s.idCard || ""} ${s.schoolNum || ""}`.toLowerCase();
    if (!txt.includes(q.toLowerCase())) return false;
    if (debtF === "debt") return s.debt > 0; if (debtF === "paid") return s.debt === 0;
    if (debtF === "low") return s.seancesRemaining != null && s.seancesRemaining <= 2;
    if (debtF === "expired") return s.status === "EXPIRED";
    if (debtF === "free") return s.isFree === true;
    return true;
  });
  const initials = (s) => ((s.firstName?.[0] || "") + (s.lastName?.[0] || "")).toUpperCase();

  const openCreate = () => {
    setEditing(null);
    setSFirst(""); setSLast(""); setSBirth(""); setSBirthPlace("");
    setSIdCard(""); setSSchoolNum(""); setSEmail(""); setSPassword(""); setSIsFree(false);
    setCreate(true);
  };
  const openEdit = (s) => {
    setEditing(s);
    setSFirst(s.firstName || ""); setSLast(s.lastName || "");
    setSBirth(s.birthDate || ""); setSBirthPlace(s.birthPlace || "");
    setSIdCard(s.idCard || ""); setSSchoolNum(s.schoolNum || "");
    setSEmail(""); setSPassword(""); setSIsFree(s.isFree || false);
    setCreate(true);
  };

  const doSaveStudent = async () => {
    if (!editing && (!sEmail || !sPassword)) {
      alert("Email et mot de passe sont requis pour créer un compte étudiant.");
      return;
    }
    const payload = {
      first_name: sFirst, last_name: sLast,
      birth_date: sBirth || null, birth_place: sBirthPlace || null,
      id_card: sIdCard || null, school_num: sSchoolNum || null,
      is_free: sIsFree,
    };
    try {
      let created;
      if (editing) {
        created = await db.updateStudent(editing.id, payload);
      } else {
        created = await db.addStudent(payload);
        const { data: { session: adminSession } } = await db.auth.getSession();
        const { error: signUpErr } = await db.auth.signUp(sEmail, sPassword, {
          role: "STUDENT", full_name: `${sFirst} ${sLast}`, student_id: created.id,
        });
        if (signUpErr) {
          await db.deleteStudent(created.id).catch(() => {});
          const msg = signUpErr.message?.toLowerCase().includes("already registered")
            ? `L'email "${sEmail}" est déjà utilisé. Supprimez l'ancien compte ou modifiez l'email manuellement.`
            : signUpErr.message;
          throw new Error(msg);
        }
        if (adminSession?.access_token) {
          await db.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token });
        }
      }
      await doRefresh();
      setCreate(false);
    } catch (e) { alert(e.message); }
  };

  const doDelete = async (s) => {
    setStudents((prev) => prev.filter((x) => x.id !== s.id));
    try {
      const authUid = await db.findAuthUidByEntity("student", s.id).catch(() => null);
      if (authUid) await db.deleteAuthUser(authUid).catch(() => {});
      await db.deleteStudent(s.id);
    } catch (e) { alert(e.message); doRefresh(); }
  };

  const openView = async (s) => {
    setView(s); setViewPayments([]); setViewAttendance([]); setViewSubHistory([]); setAttFilter("all"); setViewTab("subs");
    try {
      const [pays, att, subHist] = await Promise.all([
        db.paymentsForStudent(s.id).catch(() => []),
        db.attendanceForStudent(s.id).catch(() => []),
        db.listStudentSubscriptions(s.id).catch(() => []),
      ]);
      setViewPayments((pays || []).map((p) => ({ amount: p.amount, date: p.paid_at?.slice(0, 10), method: p.method, collectorName: p.collector_name, recordedAt: p.paid_at })));
      setViewAttendance((att || []).map((a) => ({ id: a.id, date: a.session_date, status: a.status, planName: a.plans?.name || "—", recordedAt: a.recorded_at, isDebt: a.is_debt })));
      setViewSubHistory(subHist || []);
    } catch (_) {}
  };

  const doRemoveSub = async () => {
    if (!removeSubData) return;
    try {
      await db.removeStudentSubscription(removeSubData.studentId, removeSubData.subRecordId);
      await doRefresh();
      const updated = STUDENTS.find(x => x.id === removeSubData.studentId);
      if (updated) await openView(updated);
      setRemoveSubData(null);
    } catch (e) { alert(e.message); }
  };

  const doAssign = async () => {
    if (!assign || !subObj) return;
    try {
      const planInfo = subPlan ? {
        planId: subPlan.id, planName: subPlan.module || subPlan.name,
        classId: subPlan.classId, className: subPlan.className,
        groupId: subPlan.groupId, groupName: subPlan.group, teacherName: subPlan.teacher,
      } : null;
      const { subRecordId } = await db.assignSubscription(assign.id, subObj, aStart, aExpiry, planInfo);
      if (!aPayLater && aEffectivePaid > 0) {
        const collectorName = profile?.full_name || "Admin";
        await db.addPayment(assign.id, aEffectivePaid, aPayMethod, collectorName, profile?.id, collectorName, subRecordId);
      }
      await doRefresh();
      setAssign(null);
    } catch (e) { alert(e.message); }
  };

  const doPayConfirm = async () => {
    if (!pay || !payAmt || +payAmt <= 0) return;
    try {
      const collectorName = profile?.full_name || "Admin";
      await db.addPayment(pay.id, +payAmt, payMethod || "cash", collectorName, profile?.id, collectorName);
      await doRefresh();
      setConfirm(false); setPay(null);
    } catch (e) { alert(e.message); }
  };

  const actions = (s) => [
    { icon: "👁️", label: t.view, onClick: () => openView(s) },
    { icon: "🎫", label: t.assignSub, onClick: () => { setAssign(s); setASub(SUB_TYPES[0]?.id || ""); setAStart(new Date().toISOString().slice(0, 10)); setAPaidNow(""); setAPayMethod("cash"); setAPayLater(false); } },
    ...(canPay ? [{ icon: "💳", label: t.payDebt, onClick: () => { setPay(s); setPayAmt(""); setPayMethod("cash"); } }] : []),
    { icon: "✏️", label: t.edit, onClick: () => openEdit(s) },
    { icon: "🗑️", label: t.delete, danger: true, onClick: () => setDel(s) },
  ];

  return (
    <div>
      <PageHead icon="🎓" title={t.students} action={<Btn onClick={openCreate}>➕ {t.create}</Btn>} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <SearchFilter value={q} onChange={setQ} filters={<FilterChips value={debtF} onChange={setDebtF} options={[{ v: "all", l: t.all }, { v: "debt", l: t.debt }, { v: "paid", l: t.paid }, { v: "low", l: t.lowSeances }, { v: "expired", l: t.expired }, { v: "free", l: "🎁 " + t.specialCases }]} />} />
        </div>
        <ViewToggle mode={viewMode} setMode={setViewMode} />
      </div>

      {viewMode === "cards" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 14 }}>
          <AnimatePresence mode="popLayout">
            {list.map((s) => (
              <motion.div key={s.id} layout initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -8, transition: { duration: 0.15 } }} whileHover={{ y: -5, boxShadow: "var(--shadow-lift)" }} className="gcard" style={{ ...card, padding: 18 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--grad-primary)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 15, boxShadow: "0 6px 16px -8px rgba(124,58,237,.6)" }}>{initials(s)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{s.firstName} {s.lastName}</h3>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>
                      {s.activeSubscriptions && s.activeSubscriptions.length > 1
                        ? s.activeSubscriptions.map((sub) => sub.class_name).filter(Boolean).join(" · ")
                        : `${s.className || "—"} · ${s.group || "—"}`}
                    </p>
                  </div>
                  <Menu items={actions(s)} />
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                  {s.isFree && <Badge tone="green">🎁 {t.specialCases}</Badge>}
                  <Badge tone={s.status === "ACTIVE" ? "green" : "red"}>{s.status === "ACTIVE" ? t.active : t.expired}</Badge>
                  {s.activeSubscriptions && s.activeSubscriptions.length > 0
                    ? s.activeSubscriptions.map((sub, idx) => (
                        <Badge key={idx} tone="primary">🎫 {sub.sub_type_name || sub.class_name || "—"}</Badge>
                      ))
                    : s.seancesRemaining != null && <Badge tone={s.seancesRemaining <= 2 ? "amber" : "gray"}>{s.seancesRemaining}/{s.seancesTotal} {t.seances}</Badge>}
                  {!s.isFree && (s.debt > 0 ? <Badge tone="red">{t.debt} {fmt(s.debt)}</Badge> : <Badge tone="green">{t.paid}</Badge>)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {list.length === 0 && <Empty title={t.noResults} />}
        </div>
      ) : (
        <DataTable
          columns={[
            { h: t.name, render: (s) => <b>{s.firstName} {s.lastName}</b> },
            { h: t.classes, k: "className" },
            { h: t.subscription, k: "subType" },
            { h: t.seancesLeft, render: (s) => <span className="mono">{s.seancesRemaining ?? "∞"}/{s.seancesTotal ?? "∞"}</span> },
            { h: t.remaining, render: (s) => <span className="mono" style={{ color: s.debt > 0 ? "var(--red)" : "var(--green)", fontWeight: 700 }}>{fmt(s.debt)}</span> },
            { h: "Statut", render: (s) => <Badge tone={s.status === "ACTIVE" ? "green" : "red"}>{s.status === "ACTIVE" ? t.active : t.expired}</Badge> },
          ]}
          rows={list}
          actions={actions}
        />
      )}

      {/* Create / Edit */}
      <Modal open={create} onClose={() => setCreate(false)} title={(editing ? t.edit : t.create) + " · " + t.students} wide
        footer={<><Btn variant="line" onClick={() => setCreate(false)}>{t.cancel}</Btn><Btn onClick={doSaveStudent}>{t.save}</Btn></>}>
        {/* Free student toggle */}
        <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 14px", borderRadius: 11, background: sIsFree ? "var(--green-bg)" : "var(--primary-50)", border: "1px solid " + (sIsFree ? "var(--green)" : "var(--line)"), cursor: "pointer" }}>
          <input type="checkbox" checked={sIsFree} onChange={(e) => setSIsFree(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--primary)" }} />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: sIsFree ? "var(--green)" : "var(--ink)" }}>🎁 {t.freeStudent}</span>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={t.firstName}><Input value={sFirst} onChange={(e) => setSFirst(e.target.value)} /></Field>
          <Field label={t.lastName}><Input value={sLast} onChange={(e) => setSLast(e.target.value)} /></Field>
          <Field label={t.birthDate}><Input type="date" value={sBirth} onChange={(e) => setSBirth(e.target.value)} /></Field>
          <Field label={t.birthPlace}><Input value={sBirthPlace} onChange={(e) => setSBirthPlace(e.target.value)} /></Field>
          <Field label={t.idCard}><Input value={sIdCard} onChange={(e) => setSIdCard(e.target.value)} /></Field>
          <Field label={t.schoolNum}><Input value={sSchoolNum} onChange={(e) => setSSchoolNum(e.target.value)} /></Field>
          <Field label={t.email}><Input type="email" value={sEmail} onChange={(e) => setSEmail(e.target.value)} placeholder="prénomnom@celas.com" /></Field>
          <Field label={t.password}><Input type="text" value={sPassword} onChange={(e) => setSPassword(e.target.value)} placeholder="nomprenom123" /></Field>
        </div>
      </Modal>

      {/* Assign subscription */}
      <Modal open={!!assign} onClose={() => setAssign(null)} title={t.assignSub} wide
        footer={<><Btn variant="line" onClick={() => setAssign(null)}>{t.cancel}</Btn><Btn disabled={!subObj} onClick={doAssign}>{t.save}</Btn></>}>
        {assign && (
          <div>
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 0 }}>{assign.firstName} {assign.lastName}</p>
            <Field label={t.subscription}>
              <Select value={aSub} onChange={(e) => { setASub(e.target.value); setAPaidNow(""); }}>
                <option value="">— Sélectionner un abonnement —</option>
                {SUB_TYPES.map((s) => <option key={s.id} value={s.id}>{s.name} — {fmt(s.total)}</option>)}
              </Select>
            </Field>
            {subObj && (
              <div style={{ background: "var(--grad-primary-soft)", borderRadius: 12, padding: 14, marginBottom: 14, border: "1px solid #EADDFB" }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  {subPlan && <Badge tone="primary">📅 {subPlan.module || subPlan.name}</Badge>}
                  {subPlan && <Badge tone="gray">{subPlan.className} · {subPlan.group}</Badge>}
                  {subPlan && <Badge tone="gray">👨‍🏫 {subPlan.teacher}</Badge>}
                </div>
                <Row k={t.nbSeances} v={subObj.seancesCount} />
                <Row k={t.total} v={fmt(subObj.total)} bold />
                <Row k={t.enableExpiry} v={subObj.expiryEnabled ? `⏳ ${subObj.days} ${t.nbDays.toLowerCase()}` : t.untilSeances} />
              </div>
            )}
            <Field label={t.startDate}><Input type="date" value={aStart} onChange={(e) => setAStart(e.target.value)} /></Field>
            {subObj && subObj.expiryEnabled ? (
              <div style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 12 }}>{t.expiryDate} ({t.autoCalculated}): <b className="mono" style={{ color: "var(--amber)" }}>{aExpiry}</b></div>
            ) : subObj ? (
              <div style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 12 }}>{t.seancesLeft}: <b className="mono" style={{ color: "var(--green)" }}>{subObj.seancesCount}</b> · {t.noExpiry}</div>
            ) : null}
            {subObj && (
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, marginTop: 4 }}>
                <Field label={t.paymentOption}>
                  <div style={{ display: "flex", gap: 10 }}>
                    {[false, true].map((v) => (
                      <button key={String(v)} onClick={() => setAPayLater(v)}
                        style={{ flex: 1, padding: "10px", borderRadius: 11, border: "1px solid " + (aPayLater === v ? "var(--primary)" : "var(--line)"), background: aPayLater === v ? "var(--primary-50)" : "#fff", color: aPayLater === v ? "var(--primary-600)" : "var(--muted)", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                        {v ? `⏰ ${t.payLater}` : `✅ ${t.payNow}`}
                      </button>
                    ))}
                  </div>
                </Field>
                {!aPayLater ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <Field label={t.amountNow}>
                        <Input
                          type="number" min="0" max={subObj.total} step="any"
                          value={aPaidNow === "" ? subObj.total : aPaidNow}
                          onChange={(e) => setAPaidNow(e.target.value)}
                        />
                      </Field>
                      <Field label={t.method}>
                        <Select value={aPayMethod} onChange={(e) => setAPayMethod(e.target.value)}>
                          <option value="cash">{t.cash}</option>
                          <option value="card">{t.card}</option>
                          <option value="transfer">{t.transfer}</option>
                        </Select>
                      </Field>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, padding: "10px 14px", borderRadius: 10, background: aDebt > 0 ? "var(--red-bg, #FEF2F2)" : "var(--green-bg)", border: `1px solid ${aDebt > 0 ? "var(--red)" : "var(--green)"}` }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: aDebt > 0 ? "var(--red)" : "var(--green)" }}>
                        {aDebt > 0 ? `💳 ${t.debt}` : `✅ ${t.paid}`}
                      </span>
                      <span className="mono" style={{ fontSize: 15, fontWeight: 800, color: aDebt > 0 ? "var(--red)" : "var(--green)" }}>
                        {fmt(aDebt)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: "12px 16px", borderRadius: 10, background: "var(--amber-bg)", border: "1px solid var(--amber)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--amber)" }}>💳 {t.saveAsDebt}</span>
                    <span className="mono" style={{ fontSize: 16, fontWeight: 800, color: "var(--amber)" }}>{fmt(subObj.total)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* View details — tabbed */}
      <Modal open={!!view} onClose={() => setView(null)} title={view ? `🎓 ${view.firstName} ${view.lastName}` : ""} wide
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <div style={{ display: "flex", gap: 8 }}>
              {view?.isFree && <Badge tone="green">🎁 {t.specialCases}</Badge>}
              <Badge tone={view?.status === "ACTIVE" ? "green" : "red"}>{view?.status === "ACTIVE" ? t.active : t.expired}</Badge>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {canPay && view?.debt > 0 && <Btn variant="soft" onClick={() => { setPay(view); setView(null); setPayAmt(""); setPayMethod("cash"); }}>💳 {t.payDebt}</Btn>}
              <Btn variant="line" onClick={() => setView(null)}>{t.close}</Btn>
            </div>
          </div>
        }>
        {view && (() => {
          // Subscription display: prefer history table, fall back to student's current sub
          const subDisplay = viewSubHistory.length > 0 ? viewSubHistory : (view.subTypeId ? [{
            id: null,
            sub_type_name: view.subType || "—",
            plan_name: (() => { const sub = SUB_TYPES.find(s => s.id === view.subTypeId); const p = sub ? PLANS.find(pl => pl.id === sub.planId) : null; return p ? (p.module || p.name) : "—"; })(),
            class_name: view.className || "—",
            group_name: view.group || "—",
            teacher_name: (() => { const sub = SUB_TYPES.find(s => s.id === view.subTypeId); const p = sub ? PLANS.find(pl => pl.id === sub.planId) : null; return p?.teacher || "—"; })(),
            total_price: view.finalPrice,
            seances_total: view.seancesTotal,
            start_date: view.startDate,
            expiry_date: view.expiryDate,
            expiry_enabled: view.expiryEnabled,
            status: view.status || "ACTIVE",
          }] : []);

          return (
            <div>
              {/* Financial summary */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                <Panel title={t.finalPrice}><div className="mono" style={{ fontSize: 17, fontWeight: 800 }}>{fmt(view.finalPrice)}</div></Panel>
                <Panel title={t.paid}><div className="mono" style={{ fontSize: 17, fontWeight: 800, color: "var(--green)" }}>{fmt(view.paid)}</div></Panel>
                <Panel title={t.remaining}><div className="mono" style={{ fontSize: 17, fontWeight: 800, color: view.debt > 0 ? "var(--red)" : "var(--green)" }}>{fmt(view.debt)}</div></Panel>
              </div>

              {/* Tab bar */}
              <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "var(--primary-50)", borderRadius: 12, padding: 4 }}>
                {[["subs", `🎫 ${t.tabSubs} (${subDisplay.length})`], ["pays", `💳 ${t.tabPays} (${viewPayments.length})`], ["att", `✅ ${t.tabAtt} (${viewAttendance.length})`]].map(([tab, label]) => (
                  <button key={tab} onClick={() => setViewTab(tab)}
                    style={{ flex: 1, padding: "8px 12px", borderRadius: 9, border: "none", background: viewTab === tab ? "#fff" : "transparent", color: viewTab === tab ? "var(--primary-600)" : "var(--muted)", fontWeight: viewTab === tab ? 700 : 500, cursor: "pointer", fontSize: 12.5, boxShadow: viewTab === tab ? "var(--shadow)" : "none", transition: "all .15s" }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* ── TAB: Abonnements ── */}
              {viewTab === "subs" && (
                <div>
                  {subDisplay.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)", fontSize: 13 }}>🎫 {t.noSubscription}</div>
                  ) : subDisplay.map((sub, i) => {
                    const isActive = sub.status === "ACTIVE";
                    const tone = isActive ? "green" : sub.status === "REMOVED" ? "gray" : "red";
                    return (
                      <div key={sub.id || i} style={{ ...card, padding: 16, marginBottom: 12, borderLeft: `4px solid ${isActive ? "var(--green)" : "var(--red)"}` }}>
                        {/* Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 15, color: "var(--ink)" }}>🎫 {sub.sub_type_name}</div>
                            {sub.assigned_at && <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{t.assignedOn}: {new Date(sub.assigned_at).toLocaleDateString("fr-FR")}</div>}
                          </div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <Badge tone={tone}>{isActive ? t.active : sub.status === "REMOVED" ? "Retiré" : t.expired}</Badge>
                            {canRemoveSub && isActive && (
                              <Btn size="sm" variant="soft" style={{ color: "var(--red)", borderColor: "var(--red)" }}
                                onClick={() => setRemoveSubData({ studentId: view.id, subRecordId: sub.id, subName: sub.sub_type_name })}>
                                🗑️
                              </Btn>
                            )}
                          </div>
                        </div>
                        {/* Class / Plan / Group / Teacher */}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                          {sub.class_name && <Badge tone="primary">📚 {sub.class_name}</Badge>}
                          {sub.plan_name && <Badge tone="gray">📅 {sub.plan_name}</Badge>}
                          {sub.group_name && <Badge tone="gray">👥 {sub.group_name}</Badge>}
                          {sub.teacher_name && <Badge tone="gray">👨‍🏫 {sub.teacher_name}</Badge>}
                        </div>
                        {/* Details grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t.nbSeances}: <b className="mono" style={{ color: "var(--ink)" }}>{sub.seances_total}</b></div>
                          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t.total}: <b className="mono" style={{ color: "var(--primary-600)" }}>{fmt(sub.total_price || 0)}</b></div>
                          {sub.start_date && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t.startDate}: <b className="mono" style={{ color: "var(--ink)" }}>{sub.start_date}</b></div>}
                          {sub.expiry_date ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t.expiryDate}: <b className="mono" style={{ color: "var(--amber)" }}>{sub.expiry_date}</b></div> : <div style={{ fontSize: 12.5 }}><Badge tone="green">{t.noExpiry}</Badge></div>}
                          {isActive && view.seancesRemaining != null && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t.seancesLeft}: <b className="mono" style={{ color: view.seancesRemaining <= 2 ? "var(--amber)" : "var(--green)" }}>{view.seancesRemaining}/{view.seancesTotal}</b></div>}
                          {sub.ended_at && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t.removedOn}: <b className="mono">{new Date(sub.ended_at).toLocaleDateString("fr-FR")}</b></div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── TAB: Paiements ── */}
              {viewTab === "pays" && (
                <div>
                  {viewPayments.length === 0 ? <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "20px 0" }}>{t.noResults}</p> :
                    viewPayments.map((p, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{p.date} · <span style={{ color: "var(--muted)", fontWeight: 400 }}>{t[p.method] || p.method}</span></div>
                          {p.collectorName && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{t.collectedBy}: {p.collectorName}</div>}
                        </div>
                        <span className="mono" style={{ color: "var(--green)", fontWeight: 800, fontSize: 14 }}>+{fmt(p.amount)}</span>
                      </div>
                    ))}
                </div>
              )}

              {/* ── TAB: Présences ── */}
              {viewTab === "att" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                    <FilterChips value={attFilter} onChange={setAttFilter} options={[{ v: "all", l: t.all }, { v: "PRESENT", l: t.present }, { v: "ABSENT", l: t.absent }, { v: "LATE", l: t.late }]} />
                  </div>
                  {viewAttendance.filter(a => attFilter === "all" || a.status === attFilter).length === 0
                    ? <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "20px 0" }}>{t.noResults}</p>
                    : viewAttendance.filter(a => attFilter === "all" || a.status === attFilter).map((a, i) => {
                      const tone = a.status === "PRESENT" ? "green" : a.status === "LATE" ? "amber" : "red";
                      return (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--line)", fontSize: 12.5 }}>
                          <div>
                            <span style={{ fontWeight: 600 }}>{a.date}</span>
                            {a.recordedAt && <span style={{ color: "var(--faint)", marginLeft: 6 }}>{new Date(a.recordedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>}
                            <span style={{ color: "var(--muted)", marginLeft: 6 }}>· {a.planName}</span>
                            {a.isDebt && <Badge tone="amber" style={{ marginLeft: 6 }}>🎟️</Badge>}
                          </div>
                          <Badge tone={tone}>{a.status === "PRESENT" ? t.present : a.status === "LATE" ? t.late : t.absent}</Badge>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* Confirm remove subscription */}
      <Modal open={!!removeSubData} onClose={() => setRemoveSubData(null)} title={t.confirmRemoveSub}
        footer={<><Btn variant="line" onClick={() => setRemoveSubData(null)}>{t.cancel}</Btn><Btn variant="primary" onClick={doRemoveSub}>🗑️ {t.removeSubscription}</Btn></>}>
        {removeSubData && (
          <div style={{ padding: "8px 0" }}>
            <p style={{ fontSize: 14, color: "var(--ink)", margin: "0 0 8px" }}>🎫 <b>{removeSubData.subName}</b></p>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>{t.deleteWarn}</p>
          </div>
        )}
      </Modal>

      {/* Pay flow */}
      <Modal open={!!pay} onClose={() => setPay(null)} title={t.payDebt}
        footer={<><Btn variant="line" onClick={() => setPay(null)}>{t.cancel}</Btn><Btn disabled={!payAmt || +payAmt <= 0} onClick={() => setConfirm(true)}>{t.confirm}</Btn></>}>
        {pay && (
          <div>
            <div style={{ background: "var(--grad-primary-soft)", borderRadius: 12, padding: 14, marginBottom: 14, border: "1px solid #EADDFB" }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 6, color: "var(--ink)" }}>🎓 {pay.firstName} {pay.lastName}</div>
              {pay.subType && <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>🎫 {pay.subType}{pay.className ? ` · ${pay.className}` : ""}{pay.group ? ` · ${pay.group}` : ""}</div>}
              <Row k={`${t.subscription} (${t.total})`} v={fmt(pay.finalPrice)} />
              <Row k={t.paid} v={fmt(pay.paid)} green />
              <div style={{ height: 1, background: "var(--line)", margin: "8px 0" }} />
              <Row k={t.debtDetails} v={fmt(pay.debt)} red bold />
            </div>
            <Field label={t.amountNow}>
              <Input type="number" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} max={pay.debt} placeholder={String(pay.debt)} />
            </Field>
            {+payAmt > 0 && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: +payAmt >= pay.debt ? "var(--green-bg)" : "var(--amber-bg)", border: `1px solid ${+payAmt >= pay.debt ? "var(--green)" : "var(--amber)"}`, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: +payAmt >= pay.debt ? "var(--green)" : "var(--amber)" }}>{+payAmt >= pay.debt ? `✅ ${t.paid}` : `⏳ ${t.remaining}`}</span>
                <span className="mono" style={{ fontSize: 15, fontWeight: 800, color: +payAmt >= pay.debt ? "var(--green)" : "var(--amber)" }}>{fmt(Math.max(0, pay.debt - +payAmt))}</span>
              </div>
            )}
            <Field label={t.method}>
              <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                <option value="cash">{t.cash}</option>
                <option value="card">{t.card}</option>
                <option value="transfer">{t.transfer}</option>
              </Select>
            </Field>
          </div>
        )}
      </Modal>
      <Modal open={confirm} onClose={() => setConfirm(false)} title={t.paymentSummary}
        footer={<><Btn variant="line" onClick={() => setConfirm(false)}>{t.cancel}</Btn><Btn variant="primary" onClick={doPayConfirm}>✓ {t.confirmPayment}</Btn></>}>
        <p style={{ fontSize: 14 }}>{t.amountNow}: <b className="mono">{fmt(+payAmt || 0)}</b></p>
        <p style={{ fontSize: 13, color: "var(--muted)" }}>{t.collectedBy}: {profile?.full_name || "Admin"}</p>
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => del && doDelete(del)} />
    </div>
  );
}
function Row({ k, v, green, red, bold }) {
  return <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
    <span style={{ color: "var(--muted)" }}>{k}</span>
    <span className="mono" style={{ fontWeight: bold ? 800 : 600, color: green ? "var(--green)" : red ? "var(--red)" : "var(--ink)" }}>{v}</span>
  </div>;
}

function ParentsScreen() {
  const t = useT();
  const globalRefresh = useRefresh();
  const [q, setQ] = useState(""); const [modal, setModal] = useState(false); const [del, setDel] = useState(null);
  const [viewMode, setViewMode] = useState("cards"); const [detail, setDetail] = useState(null); const [editing, setEditing] = useState(null); const [sendTo, setSendTo] = useState(null);
  const [rows, setRows] = useState(PARENTS);
  // create-form state
  const [fName, setFName] = useState(""); const [fPhone, setFPhone] = useState(""); const [fEmail, setFEmail] = useState("");
  const [fPassword, setFPassword] = useState("");
  const [picked, setPicked] = useState([]); const [studQ, setStudQ] = useState("");

  const doRefresh = async () => { await globalRefresh(); setRows([...PARENTS]); };

  const openCreate = () => { setEditing(null); setFName(""); setFPhone(""); setFEmail(""); setFPassword(""); setPicked([]); setStudQ(""); setModal(true); };
  const openEdit = (p) => { setEditing(p); setFName(p.name); setFPhone(p.phone || ""); setFEmail(p.email || ""); setFPassword(""); setPicked(p.children.map((c) => c.id)); setStudQ(""); setModal(true); };

  const save = async () => {
    const row = { full_name: fName || "Parent", phone: fPhone || null, email: fEmail || null };
    try {
      let created;
      if (editing) { created = await db.updateParent(editing.id, row, picked); }
      else { created = await db.addParent(row, picked); }
      if (fEmail && fPassword && !editing) {
        try {
          const { data: { session: adminSession } } = await db.auth.getSession();
          await db.auth.signUp(fEmail, fPassword, {
            role: "PARENT", full_name: fName, parent_id: created.id,
          });
          if (adminSession?.access_token) {
            await db.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token });
          }
        } catch (ae) { alert("Parent créé mais compte auth échoué: " + ae.message); }
      }
      await doRefresh();
      setModal(false);
    } catch (e) { alert(e.message); }
  };

  const doDelete = async (p) => {
    setRows((prev) => prev.filter((x) => x.id !== p.id));
    try {
      const authUid = await db.findAuthUidByEntity("parent", p.id).catch(() => null);
      if (authUid) await db.deleteAuthUser(authUid).catch(() => {});
      await db.deleteParent(p.id);
      await doRefresh();
    } catch (e) { alert(e.message); doRefresh(); }
  };
  const list = rows.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  const studMatches = STUDENTS.filter((s) => `${s.firstName} ${s.lastName} ${s.className}`.toLowerCase().includes(studQ.toLowerCase())).slice(0, 40);
  const toggleKid = (id) => setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const actions = (p) => [
    { icon: "👁️", label: t.view, onClick: () => setDetail(p) },
    { icon: "✏️", label: t.edit, onClick: () => openEdit(p) },
    { icon: "📨", label: t.send, onClick: () => setSendTo(p) },
    { icon: "🗑️", label: t.delete, danger: true, onClick: () => setDel(p) },
  ];
  return (
    <div>
      <PageHead icon="👨‍👩‍👧" title={t.parents} action={<Btn onClick={openCreate}>➕ {t.create}</Btn>} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 260 }}><SearchFilter value={q} onChange={setQ} /></div>
        <ViewToggle mode={viewMode} setMode={setViewMode} />
      </div>
      {viewMode === "cards" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 14 }}>
          <AnimatePresence mode="popLayout">
            {list.map((p) => (
              <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -8, transition: { duration: 0.15 } }} whileHover={{ y: -5, boxShadow: "var(--shadow-lift)" }} className="gcard" style={{ ...card, padding: 18, cursor: "pointer" }} onClick={() => setDetail(p)}>
                <div style={{ display: "flex", justifyContent: "space-between" }} onClick={(e) => e.stopPropagation()}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{p.name}</h3>
                  <Menu items={actions(p)} />
                </div>
                <p style={{ margin: "4px 0 10px", fontSize: 12.5, color: "var(--muted)" }}>📞 {p.phone}</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {p.children.map((c, i) => <Badge key={i} tone="primary">👦 {c.firstName}</Badge>)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {list.length === 0 && <Empty title={t.noResults} />}
        </div>
      ) : (
        <DataTable columns={[
          { h: t.name, render: (p) => <b>{p.name}</b> },
          { h: t.phone, k: "phone" },
          { h: t.email, k: "email" },
          { h: t.myChildren, render: (p) => p.children.map((c) => c.firstName).join(", ") },
        ]} rows={list} actions={actions} />
      )}
      <Modal open={modal} onClose={() => setModal(false)} title={(editing ? t.edit : t.create) + " · " + t.parents} wide
        footer={<><Btn variant="line" onClick={() => setModal(false)}>{t.cancel}</Btn><Btn onClick={save}>{t.save}</Btn></>}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={t.name}><Input value={fName} onChange={(e) => setFName(e.target.value)} /></Field>
          <Field label={t.phone}><Input value={fPhone} onChange={(e) => setFPhone(e.target.value)} /></Field>
          <Field label={t.email}><Input type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} /></Field>
          <Field label={t.password}><Input type="password" value={fPassword} onChange={(e) => setFPassword(e.target.value)} /></Field>
        </div>
        <Field label={`${t.selectChildren} · ${picked.length} ${t.selected}`}>
          <Input value={studQ} onChange={(e) => setStudQ(e.target.value)} placeholder={"🔍 " + t.searchStudent} />
          {picked.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0" }}>
              {STUDENTS.filter((s) => picked.includes(s.id)).map((s) => (
                <span key={s.id} onClick={() => toggleKid(s.id)} style={{ cursor: "pointer", background: "var(--grad-primary)", color: "#fff", borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>{s.firstName} {s.lastName} ✕</span>
              ))}
            </div>
          )}
          <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 12, marginTop: 8 }}>
            {studMatches.map((s) => {
              const on = picked.includes(s.id);
              return (
                <div key={s.id} onClick={() => toggleKid(s.id)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", cursor: "pointer", background: on ? "var(--grad-primary-soft)" : "transparent", borderBottom: "1px solid var(--line)" }}>
                  <span style={{ fontSize: 13, fontWeight: on ? 700 : 500 }}>{s.firstName} {s.lastName} <span style={{ color: "var(--muted)", fontWeight: 400 }}>· {s.className}</span></span>
                  <span style={{ fontSize: 16, color: on ? "var(--primary-600)" : "var(--faint)" }}>{on ? "☑" : "☐"}</span>
                </div>
              );
            })}
            {studMatches.length === 0 && <p style={{ padding: 14, fontSize: 13, color: "var(--muted)", margin: 0 }}>{t.noResults}</p>}
          </div>
        </Field>
        <Field label={t.alertPrefs}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {[t.payments, t.present, t.absent, t.late].map((x) => <label key={x} style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center", color: "var(--muted)" }}><input type="checkbox" defaultChecked /> {x}</label>)}
          </div>
        </Field>
      </Modal>
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name} wide footer={<Btn variant="line" onClick={() => setDetail(null)}>{t.close}</Btn>}>
        {detail && <div>
          <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 0 }}>📞 {detail.phone} · 📧 {detail.email}</p>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{t.myChildren}</h4>
          {detail.children.map((c, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{c.firstName} {c.lastName} <span style={{ color: "var(--muted)", fontWeight: 400 }}>· {c.className}</span></span>
              <div style={{ display: "flex", gap: 6 }}>
                <Badge tone={c.status === "ACTIVE" ? "green" : "red"}>{c.status === "ACTIVE" ? t.active : t.expired}</Badge>
                {c.debt > 0 && <Badge tone="red">{fmt(c.debt)}</Badge>}
              </div>
            </div>
          ))}
        </div>}
      </Modal>
      <Modal open={!!sendTo} onClose={() => setSendTo(null)} title={`${t.send} · ${sendTo?.name || ""}`}
        footer={<><Btn variant="line" onClick={() => setSendTo(null)}>{t.cancel}</Btn><Btn onClick={() => setSendTo(null)}>📤 {t.send}</Btn></>}>
        <Field label={t.title}><Input placeholder={t.payments} /></Field>
        <Field label={t.description}><textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} /></Field>
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => del && doDelete(del)} />
    </div>
  );
}

function PeopleScreen({ people, kind }) {
  // kind: "teacher" | "staff"
  const t = useT();
  const globalRefresh = useRefresh();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(people);
  const [viewMode, setViewMode] = useState("cards");
  const [view, setView] = useState(null); const [salary, setSalary] = useState(null);
  const [acompte, setAcompte] = useState(null); const [absence, setAbsence] = useState(null);
  const [viewTeacherAtt, setViewTeacherAtt] = useState([]); const [teacherAttFilter, setTeacherAttFilter] = useState("all");
  const [viewTeacherTab, setViewTeacherTab] = useState("info");
  // teacher payment modal state
  const [salaryTab, setSalaryTab] = useState("seances");
  const [unpaidSeances, setUnpaidSeances] = useState([]);
  const [paidSeances, setPaidSeances] = useState([]);
  const [salaryPayments, setSalaryPayments] = useState([]);
  const [selectedSeances, setSelectedSeances] = useState(new Set());
  const [manualPrices, setManualPrices] = useState({});
  const [finalTotalInput, setFinalTotalInput] = useState("");
  const [payNote, setPayNote] = useState("");
  const [create, setCreate] = useState(false); const [del, setDel] = useState(null); const [editing, setEditing] = useState(null);

  // form state
  const [pFirst, setPFirst] = useState(""); const [pLast, setPLast] = useState("");
  const [pPhone, setPPhone] = useState(""); const [pEmail, setPEmail] = useState("");
  const [pPosition, setPPosition] = useState(""); const [pPayModel, setPPayModel] = useState("FIXED");
  const [pSalary, setPSalary] = useState(""); const [pPassword, setPPassword] = useState("");
  const [pSeanceRate, setPSeanceRate] = useState(""); const [pPctRate, setPPctRate] = useState("");
  const [pMinPerSeance, setPMinPerSeance] = useState(""); const [pMonthlyStart, setPMonthlyStart] = useState("");

  // acompte form
  const [acAmt, setAcAmt] = useState(""); const [acDate, setAcDate] = useState(""); const [acNote, setAcNote] = useState("");
  // absence form
  const [abCost, setAbCost] = useState(""); const [abDate, setAbDate] = useState(""); const [abNote, setAbNote] = useState("");

  const doRefresh = async () => { await globalRefresh(); setRows(kind === "teacher" ? [...TEACHERS] : [...STAFF]); };

  const openCreate = () => {
    setEditing(null);
    setPFirst(""); setPLast(""); setPPhone(""); setPEmail(""); setPPosition("");
    setPPayModel("FIXED"); setPSalary(""); setPPassword("");
    setPSeanceRate(""); setPPctRate(""); setPMinPerSeance(""); setPMonthlyStart("");
    setCreate(true);
  };
  const openEdit = (p) => {
    setEditing(p);
    setPFirst(p.firstName || ""); setPLast(p.lastName || "");
    setPPhone(p.phone || ""); setPEmail(p.email || "");
    setPPosition(p.position || ""); setPPayModel(p.payModel || "FIXED");
    setPSalary(p.baseSalary || ""); setPPassword("");
    setPSeanceRate(p.seanceRate || ""); setPPctRate(p.percentageRate ? (p.percentageRate * 100).toFixed(0) : "");
    setPMinPerSeance(p.minPerSeance || ""); setPMonthlyStart(p.monthlyStartDate || "");
    setCreate(true);
  };

  const doSavePerson = async () => {
    try {
      let created;
      if (kind === "teacher") {
        const payload = {
          first_name: pFirst, last_name: pLast, phone: pPhone || null, email: pEmail || null,
          pay_model: pPayModel,
          base_salary: pPayModel === "FIXED" ? (+pSalary || 0) : 0,
          seance_rate: pPayModel === "PER_SEANCE" ? (+pSeanceRate || 0) : null,
          percentage_rate: pPayModel === "PERCENTAGE" ? ((+pPctRate || 0) / 100) : null,
          min_per_seance: pPayModel === "PERCENTAGE" ? (+pMinPerSeance || 0) : null,
          monthly_start_date: pPayModel === "FIXED" ? (pMonthlyStart || null) : null,
          modules: editing ? (editing.modules || []) : [],
        };
        if (editing) { created = await db.updateTeacher(editing.id, payload); }
        else { created = await db.addTeacher(payload); }
      } else {
        const payload = {
          first_name: pFirst, last_name: pLast, phone: pPhone || null, email: pEmail || null,
          position: pPosition || null, base_salary: +pSalary || 0,
        };
        if (editing) { created = await db.updateStaff(editing.id, payload); }
        else { created = await db.addStaff(payload); }
      }
      if (pEmail && pPassword && !editing) {
        try {
          const { data: { session: adminSession } } = await db.auth.getSession();
          const meta = kind === "teacher"
            ? { role: "TEACHER", full_name: `${pFirst} ${pLast}`, teacher_id: created.id }
            : { role: "STAFF", full_name: `${pFirst} ${pLast}`, staff_id: created.id };
          await db.auth.signUp(pEmail, pPassword, meta);
          if (adminSession?.access_token) {
            await db.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token });
          }
        } catch (ae) { alert("Créé mais compte auth échoué: " + ae.message); }
      }
      await doRefresh();
      setCreate(false);
    } catch (e) { alert(e.message); }
  };

  const doDelete = async (p) => {
    setRows((prev) => prev.filter((x) => x.id !== p.id));
    try {
      const entityType = kind === "teacher" ? "teacher" : "staff";
      const authUid = await db.findAuthUidByEntity(entityType, p.id).catch(() => null);
      if (authUid) await db.deleteAuthUser(authUid).catch(() => {});
      if (kind === "teacher") { await db.deleteTeacher(p.id); }
      else { await db.deleteStaff(p.id); }
      await doRefresh();
    } catch (e) { alert(e.message); doRefresh(); }
  };

  const doSaveAcompte = async () => {
    if (!acAmt || !acompte) return;
    try {
      const row = {
        ...(kind === "teacher" ? { teacher_id: acompte.id } : { staff_id: acompte.id }),
        amount: +acAmt, note: acNote || null,
        date: acDate || new Date().toISOString().slice(0, 10),
      };
      await db.addAcompte(row);
      await doRefresh();
      setAcompte(null); setAcAmt(""); setAcDate(""); setAcNote("");
    } catch (e) { alert(e.message); }
  };

  const doSaveAbsence = async () => {
    if (!abCost || !absence) return;
    try {
      const row = {
        ...(kind === "teacher" ? { teacher_id: absence.id } : { staff_id: absence.id }),
        cost: +abCost, note: abNote || null,
        date: abDate || new Date().toISOString().slice(0, 10),
      };
      await db.addAbsence(row);
      await doRefresh();
      setAbsence(null); setAbCost(""); setAbDate(""); setAbNote("");
    } catch (e) { alert(e.message); }
  };

  const openSalary = async (p) => {
    setSalary(p); setSalaryTab(p.payModel === "FIXED" ? "monthly" : "seances");
    setSelectedSeances(new Set()); setManualPrices({}); setFinalTotalInput(""); setPayNote("");
    if (kind === "teacher") {
      try {
        const [unp, paid, payments] = await Promise.all([
          db.listUnpaidSeances(p.id).catch(() => []),
          db.listPaidSeances(p.id).catch(() => []),
          db.listTeacherSalaryPayments(p.id).catch(() => []),
        ]);
        setUnpaidSeances(unp || []); setPaidSeances(paid || []); setSalaryPayments(payments || []);
      } catch (_) {}
    }
  };
  const doPaySalary = async () => {
    if (!salary) return;
    const n = netPay(salary);
    try {
      const row = {
        ...(kind === "teacher" ? { teacher_id: salary.id } : { staff_id: salary.id }),
        amount: n.net, month: new Date().toISOString().slice(0, 7),
      };
      await db.paySalary(row);
      await doRefresh(); setSalary(null);
    } catch (e) { alert(e.message); }
  };
  const doPaySeances = async () => {
    if (!salary || selectedSeances.size === 0) return;
    const ids = [...selectedSeances];
    const total = +finalTotalInput || ids.reduce((sum, id) => {
      const s = unpaidSeances.find((x) => x.id === id);
      return sum + (+manualPrices[id] || +(s?.teacher_earning || 0));
    }, 0);
    try {
      await db.payTeacherSeances(salary.id, ids, total, payNote || null);
      const remaining = unpaidSeances.filter((s) => !selectedSeances.has(s.id));
      setUnpaidSeances(remaining); setSelectedSeances(new Set()); setFinalTotalInput(""); setPayNote("");
      const payments = await db.listTeacherSalaryPayments(salary.id).catch(() => []);
      setSalaryPayments(payments || []);
    } catch (e) { alert(e.message); }
  };
  const doPayMonth = async (month) => {
    if (!salary) return;
    try {
      await db.paySalary({ teacher_id: salary.id, amount: salary.baseSalary, period: month, paid_at: new Date().toISOString() });
      const payments = await db.listTeacherSalaryPayments(salary.id).catch(() => []);
      setSalaryPayments(payments || []);
    } catch (e) { alert(e.message); }
  };
  const list = rows.filter((p) => `${p.firstName} ${p.lastName} ${p.position || ""}`.toLowerCase().includes(q.toLowerCase()));
  const netPay = (p) => {
    const base = kind === "teacher" ? (p.payModel === "FIXED" ? p.baseSalary : p.seanceRate * 20) : p.baseSalary;
    const abs = p.absences.filter((a) => !a.settled).reduce((s, a) => s + a.cost, 0);
    const aco = p.acomptes.filter((a) => !a.settled).reduce((s, a) => s + a.amount, 0);
    return { base, abs, aco, net: base - abs - aco };
  };
  const actions = (p) => [
    { icon: "👁️", label: t.view, onClick: () => setView(p) },
    { icon: "💰", label: t.payment, onClick: () => openSalary(p) },
    { icon: "💵", label: t.acompte, onClick: () => setAcompte(p) },
    { icon: "📋", label: t.absence, onClick: () => setAbsence(p) },
    { icon: "✏️", label: t.edit, onClick: () => openEdit(p) },
    { icon: "🗑️", label: t.delete, danger: true, onClick: () => setDel(p) },
  ];
  return (
    <div>
      <PageHead icon={kind === "teacher" ? "👨‍🏫" : "👥"} title={kind === "teacher" ? t.teachers : t.staff} action={<Btn onClick={openCreate}>➕ {t.add}</Btn>} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 260 }}><SearchFilter value={q} onChange={setQ} /></div>
        <ViewToggle mode={viewMode} setMode={setViewMode} />
      </div>
      {viewMode === "cards" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 14 }}>
          <AnimatePresence mode="popLayout">
            {list.map((p) => (
              <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -8, transition: { duration: 0.15 } }} whileHover={{ y: -5, boxShadow: "var(--shadow-lift)" }} className="gcard" style={{ ...card, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{p.firstName} {p.lastName}</h3>
                    <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--muted)" }}>{kind === "teacher" ? (p.modules || []).join(", ") : p.position}</p>
                  </div>
                  <Menu items={actions(p)} />
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                  {kind === "teacher" ? <Badge>{p.payModel === "FIXED" ? t.fixed : p.payModel === "PERCENTAGE" ? t.percentageModel : t.perSeance}</Badge> : <Badge>{t.fixed}</Badge>}
                  {p.unpaidMonths > 0 ? <Badge tone="amber">{p.unpaidMonths} {t.unpaidMonths}</Badge> : <Badge tone="green">✓</Badge>}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {list.length === 0 && <Empty title={t.noResults} />}
        </div>
      ) : (
        <DataTable columns={[
          { h: t.name, render: (p) => <b>{p.firstName} {p.lastName}</b> },
          { h: kind === "teacher" ? t.module : t.position, render: (p) => kind === "teacher" ? (p.modules || []).join(", ") : p.position },
          { h: t.payModel, render: (p) => kind === "teacher" ? (p.payModel === "FIXED" ? t.fixed : t.perSeance) : t.fixed },
          { h: t.netPay, render: (p) => <span className="mono">{fmt(netPay(p).net)}</span> },
          { h: t.unpaidMonths, render: (p) => p.unpaidMonths > 0 ? <Badge tone="amber">{p.unpaidMonths}</Badge> : <Badge tone="green">✓</Badge> },
        ]} rows={list} actions={actions} />
      )}

      <Modal open={create} onClose={() => setCreate(false)} title={editing ? t.edit : t.add} wide
        footer={<><Btn variant="line" onClick={() => setCreate(false)}>{t.cancel}</Btn><Btn onClick={doSavePerson}>{t.save}</Btn></>}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={t.firstName}><Input value={pFirst} onChange={(e) => setPFirst(e.target.value)} /></Field>
          <Field label={t.lastName}><Input value={pLast} onChange={(e) => setPLast(e.target.value)} /></Field>
          <Field label={t.phone}><Input value={pPhone} onChange={(e) => setPPhone(e.target.value)} /></Field>
          <Field label={t.email}><Input type="email" value={pEmail} onChange={(e) => setPEmail(e.target.value)} /></Field>
          {kind === "staff" && <Field label={t.position}><Input value={pPosition} onChange={(e) => setPPosition(e.target.value)} /></Field>}
          <Field label={t.password}><Input type="password" value={pPassword} onChange={(e) => setPPassword(e.target.value)} /></Field>
        </div>
        {kind === "teacher" ? (
          <>
            <Field label={t.payModel}>
              <div style={{ display: "flex", gap: 8 }}>
                {[["FIXED", t.fixed], ["PER_SEANCE", t.perSeance], ["PERCENTAGE", t.percentageModel]].map(([v, l]) => (
                  <button key={v} onClick={() => setPPayModel(v)} type="button" style={{ flex: 1, padding: "10px 8px", borderRadius: 10, border: "1px solid " + (pPayModel === v ? "var(--primary)" : "var(--line)"), background: pPayModel === v ? "var(--primary-50)" : "#fff", color: pPayModel === v ? "var(--primary-600)" : "var(--muted)", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>{l}</button>
                ))}
              </div>
            </Field>
            {pPayModel === "FIXED" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label={t.salary}><Input type="number" value={pSalary} onChange={(e) => setPSalary(e.target.value)} placeholder="40000" /></Field>
                <Field label={t.monthlyStart}><Input type="date" value={pMonthlyStart} onChange={(e) => setPMonthlyStart(e.target.value)} /></Field>
              </div>
            )}
            {pPayModel === "PER_SEANCE" && (
              <Field label={t.rate + " / " + t.seances}><Input type="number" value={pSeanceRate} onChange={(e) => setPSeanceRate(e.target.value)} placeholder="500" /></Field>
            )}
            {pPayModel === "PERCENTAGE" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label={t.percentageRate}><Input type="number" value={pPctRate} onChange={(e) => setPPctRate(e.target.value)} placeholder="40" /></Field>
                <Field label={t.minPerSeance}><Input type="number" value={pMinPerSeance} onChange={(e) => setPMinPerSeance(e.target.value)} placeholder="300" /></Field>
              </div>
            )}
          </>
        ) : (
          <Field label={t.salary}><Input type="number" value={pSalary} onChange={(e) => setPSalary(e.target.value)} placeholder="40000" /></Field>
        )}
      </Modal>

      <Modal open={!!view} onClose={() => { setView(null); setViewTeacherAtt([]); setViewTeacherTab("info"); }} title={view ? `${view.firstName} ${view.lastName}` : ""} wide footer={<Btn variant="line" onClick={() => { setView(null); setViewTeacherAtt([]); setViewTeacherTab("info"); }}>{t.close}</Btn>}>
        {view && (() => {
          if (kind === "teacher" && viewTeacherAtt.length === 0 && view) {
            db.listTeacherAttendance(view.id).then((att) => setViewTeacherAtt(att || [])).catch(() => {});
          }
          const n = netPay(view);
          const tPlans = PLANS.filter((p) => p.teacherId === view.id);
          const tClassIds = [...new Set(tPlans.map((p) => p.classId).filter(Boolean))];
          const seancesWorked = viewTeacherAtt.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
          const tabs = kind === "teacher"
            ? [["info", "📋 Infos & Salaire"], ["timetable", "🗓️ Emploi du temps"], ["classes", "👥 Classes"], ["seances", "✅ Séances"]]
            : [["info", "📋 Infos & Salaire"]];
          return (
            <div>
              {/* Tab bar */}
              <div style={{ display: "flex", gap: 2, marginBottom: 18, borderBottom: "1px solid var(--line)" }}>
                {tabs.map(([k, label]) => (
                  <button key={k} onClick={() => setViewTeacherTab(k)} style={{ padding: "9px 14px", border: "none", background: "transparent", cursor: "pointer", fontWeight: viewTeacherTab === k ? 700 : 500, color: viewTeacherTab === k ? "var(--primary-600)" : "var(--muted)", borderBottom: viewTeacherTab === k ? "2px solid var(--primary-600)" : "2px solid transparent", fontSize: 12.5, marginBottom: -1 }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* TAB: Infos & Salaire */}
              {viewTeacherTab === "info" && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14, padding: 14, background: "var(--primary-50)", borderRadius: 12, border: "1px solid #EADDFB" }}>
                    <Row k="📞 Téléphone" v={view.phone || "—"} />
                    <Row k="✉️ Email" v={view.email || "—"} />
                    <Row k="💼 Poste" v={view.position || (kind === "teacher" ? "Enseignant" : "Administration")} />
                    <Row k="📅 Début mensuel" v={view.monthlyStartDate || "—"} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 14 }}>
                    <Panel title={t.salary}><div className="mono" style={{ fontSize: 16, fontWeight: 800 }}>{fmt(n.base)}</div></Panel>
                    <Panel title={t.acompte}><div className="mono" style={{ fontSize: 16, fontWeight: 800, color: "var(--amber)" }}>{fmt(n.aco)}</div></Panel>
                    <Panel title={t.absence}><div className="mono" style={{ fontSize: 16, fontWeight: 800, color: "var(--red)" }}>{fmt(n.abs)}</div></Panel>
                    {kind === "teacher" && (
                      <Panel title="Séances travaillées"><div className="mono" style={{ fontSize: 16, fontWeight: 800, color: "var(--primary-600)" }}>{seancesWorked}</div></Panel>
                    )}
                  </div>
                  {kind === "teacher" && (
                    <Panel title="Modèle de paie" style={{ marginBottom: 14 }}>
                      <Row k="Type" v={view.payModel === "FIXED" ? "Salaire fixe" : view.payModel === "PER_SEANCE" ? "Par séance" : "Pourcentage"} />
                      {view.payModel === "FIXED" && <Row k="Salaire mensuel" v={fmt(view.baseSalary || 0)} />}
                      {view.payModel === "PER_SEANCE" && <Row k="Taux / séance" v={fmt(view.seanceRate || 0)} />}
                      {view.payModel === "PERCENTAGE" && <><Row k="Pourcentage" v={`${view.pctRate || 0}%`} /><Row k="Min / séance" v={fmt(view.minPerSeance || 0)} /></>}
                    </Panel>
                  )}
                  <Panel title={t.history}>
                    {[...(view.acomptes || []).map((a) => ({ ...a, type: t.acompte })), ...(view.absences || []).map((a) => ({ ...a, amount: a.cost, type: t.absence }))].map((h, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                        <span>{h.date} · {h.type}</span><span className="mono" style={{ fontWeight: 700 }}>{fmt(h.amount)}</span>
                      </div>
                    ))}
                    {(view.acomptes || []).length + (view.absences || []).length === 0 && <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>{t.noResults}</p>}
                  </Panel>
                </div>
              )}

              {/* TAB: Emploi du temps */}
              {viewTeacherTab === "timetable" && kind === "teacher" && (
                <div>
                  {tPlans.length === 0
                    ? <Empty title="Aucun emploi du temps" hint="Aucune séance n'est assignée à cet enseignant." />
                    : <TimetableGrid teacherId={view.id} classIds={null} />
                  }
                </div>
              )}

              {/* TAB: Classes */}
              {viewTeacherTab === "classes" && kind === "teacher" && (
                <div>
                  <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 0 }}>{tPlans.length} séance(s) · {tClassIds.length} classe(s)</p>
                  {tPlans.length === 0
                    ? <Empty title="Aucune classe" hint="Aucune séance n'est assignée à cet enseignant." />
                    : tPlans.map((p) => (
                      <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.module || p.name}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{p.className} · {p.group} · {(p.days||[]).map(d=>t.days[d]).join(", ")} · {p.startTime}–{p.endTime}</div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <Badge tone="primary">🎓 {p.students} élèves</Badge>
                          {view.payModel !== "FIXED" && <Badge tone="green">{fmt(p.gains)}</Badge>}
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}

              {/* TAB: Séances */}
              {viewTeacherTab === "seances" && kind === "teacher" && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12, marginBottom: 16 }}>
                    <Panel title="Total"><div className="mono" style={{ fontSize: 20, fontWeight: 800 }}>{viewTeacherAtt.length}</div></Panel>
                    <Panel title={t.present}><div className="mono" style={{ fontSize: 20, fontWeight: 800, color: "var(--green)" }}>{viewTeacherAtt.filter(a=>a.status==="PRESENT").length}</div></Panel>
                    <Panel title={t.late}><div className="mono" style={{ fontSize: 20, fontWeight: 800, color: "var(--amber)" }}>{viewTeacherAtt.filter(a=>a.status==="LATE").length}</div></Panel>
                    <Panel title={t.absent}><div className="mono" style={{ fontSize: 20, fontWeight: 800, color: "var(--red)" }}>{viewTeacherAtt.filter(a=>a.status==="ABSENT").length}</div></Panel>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                    <FilterChips value={teacherAttFilter} onChange={setTeacherAttFilter} options={[{ v: "all", l: t.all }, { v: "PRESENT", l: t.present }, { v: "ABSENT", l: t.absent }, { v: "LATE", l: t.late }]} />
                  </div>
                  {viewTeacherAtt.length === 0
                    ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Aucun historique de présence disponible.</p>
                    : viewTeacherAtt.filter((a) => teacherAttFilter === "all" || a.status === teacherAttFilter).map((a, i) => {
                        const tone = a.status === "PRESENT" ? "green" : a.status === "LATE" ? "amber" : "red";
                        return (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 12.5 }}>
                            <div>
                              <span style={{ fontWeight: 600 }}>{a.session_date}</span>
                              {a.recorded_at && <span style={{ color: "var(--faint)", marginLeft: 6 }}>{new Date(a.recorded_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>}
                              <span style={{ color: "var(--muted)", marginLeft: 6 }}>· {a.plans?.name || "—"}</span>
                            </div>
                            <Badge tone={tone}>{a.status === "PRESENT" ? t.present : a.status === "LATE" ? t.late : t.absent}</Badge>
                          </div>
                        );
                      })
                  }
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* ---- Teacher / Staff Payment Modal ---- */}
      <Modal open={!!salary} onClose={() => setSalary(null)} title={salary ? `💰 ${salary.firstName} ${salary.lastName}` : ""} wide
        footer={<Btn variant="line" onClick={() => setSalary(null)}>{t.close}</Btn>}>
        {salary && (() => {
          const isTeacher = kind === "teacher";
          const n = netPay(salary);
          if (!isTeacher) return (
            <div style={{ background: "#F4F6FB", borderRadius: 12, padding: 16, fontSize: 13.5 }}>
              <Row k={t.salary} v={fmt(n.base)} />
              <Row k={"− " + t.acompte} v={fmt(n.aco)} red />
              <Row k={"− " + t.absence} v={fmt(n.abs)} red />
              <div style={{ borderTop: "1px solid var(--line)", marginTop: 8, paddingTop: 8 }}><Row k={t.netPay} v={fmt(n.net)} green bold /></div>
              <div style={{ marginTop: 14 }}><Btn onClick={doPaySalary}>✓ {t.confirm}</Btn></div>
            </div>
          );
          // Teacher payment tabs
          const tabs = salary.payModel === "FIXED"
            ? [["monthly", t.monthlyPay], ["history", t.history]]
            : [["seances", t.seancesPay], ["history", t.history]];
          const autoTotal = [...selectedSeances].reduce((sum, id) => {
            const s = unpaidSeances.find((x) => x.id === id);
            return sum + (+manualPrices[id] || +(s?.teacher_earning || 0));
          }, 0);
          // generate unpaid months for FIXED
          const paidPeriods = new Set(salaryPayments.map((p) => p.period || p.month));
          const unpaidMonths = (() => {
            if (!salary.monthlyStartDate) return [];
            const start = new Date(salary.monthlyStartDate); const now = new Date();
            const months = []; let d = new Date(start.getFullYear(), start.getMonth(), 1);
            while (d <= now) {
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
              if (!paidPeriods.has(key)) months.push(key);
              d.setMonth(d.getMonth() + 1);
            }
            return months;
          })();
          return (
            <div>
              {/* Tabs */}
              <div style={{ display: "flex", gap: 6, marginBottom: 16, borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                {tabs.map(([k, l]) => (
                  <button key={k} onClick={() => setSalaryTab(k)} style={{ padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: salaryTab === k ? "var(--grad-primary)" : "var(--primary-50)", color: salaryTab === k ? "#fff" : "var(--primary-600)" }}>{l}</button>
                ))}
              </div>

              {/* Séances tab */}
              {salaryTab === "seances" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>{unpaidSeances.length} {t.unpaidSeances}</span>
                    <Btn size="sm" variant="soft" onClick={() => setSelectedSeances(selectedSeances.size === unpaidSeances.length ? new Set() : new Set(unpaidSeances.map((s) => s.id)))}>{t.selectAll}</Btn>
                  </div>
                  {unpaidSeances.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13 }}>{t.noResults}</p>}
                  {unpaidSeances.map((s) => {
                    const sel = selectedSeances.has(s.id);
                    const earning = +(manualPrices[s.id] ?? s.teacher_earning ?? 0);
                    return (
                      <div key={s.id} onClick={() => setSelectedSeances((prev) => { const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n; })}
                        style={{ ...card, padding: "12px 14px", marginBottom: 8, cursor: "pointer", border: "1.5px solid " + (sel ? "var(--primary)" : "var(--line)"), background: sel ? "var(--primary-50)" : "#fff", borderRadius: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{s.session_date} · {s.plan_name || "—"}</div>
                            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{s.class_label || ""} · {s.students_present ?? 0} {t.students.toLowerCase()}</div>
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                            <input type="number" value={manualPrices[s.id] ?? ""} placeholder={String(s.teacher_earning ?? 0)}
                              onChange={(e) => setManualPrices((p) => ({ ...p, [s.id]: e.target.value }))}
                              style={{ ...inputStyle, width: 90, fontSize: 12, padding: "6px 10px" }} />
                            <span className="mono" style={{ fontWeight: 700, color: "var(--green)", fontSize: 13 }}>{fmt(earning)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {selectedSeances.size > 0 && (
                    <div style={{ ...card, padding: 14, marginTop: 12, background: "var(--grad-primary-soft)", borderRadius: 12 }}>
                      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, marginBottom: 10 }}>
                        <span>📋 {selectedSeances.size} {t.seances}</span>
                        <span className="mono" style={{ fontWeight: 700, color: "var(--green)" }}>{t.autoCalc}: {fmt(autoTotal)}</span>
                      </div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <Field label={t.finalTotal} style={{ margin: 0, flex: 1 }}>
                          <Input type="number" value={finalTotalInput} onChange={(e) => setFinalTotalInput(e.target.value)} placeholder={String(autoTotal)} style={{ fontSize: 13 }} />
                        </Field>
                        <Field label="Note" style={{ margin: 0, flex: 1 }}>
                          <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Paiement séances…" style={{ fontSize: 13 }} />
                        </Field>
                      </div>
                      <Btn style={{ marginTop: 10 }} onClick={doPaySeances}>✓ {t.paySelected}</Btn>
                    </div>
                  )}
                </div>
              )}

              {/* Monthly tab */}
              {salaryTab === "monthly" && (
                <div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                    <Badge tone="primary">{fmt(salary.baseSalary)} / mois</Badge>
                    {salary.monthlyStartDate && <Badge tone="gray">Depuis {salary.monthlyStartDate}</Badge>}
                  </div>
                  {unpaidMonths.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13 }}>Tous les mois sont payés.</p>}
                  {unpaidMonths.map((m) => (
                    <div key={m} style={{ ...card, padding: "12px 14px", marginBottom: 8, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div><div style={{ fontWeight: 700, fontSize: 13 }}>{m}</div><div style={{ fontSize: 12, color: "var(--muted)" }}>{fmt(salary.baseSalary)}</div></div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <Badge tone="red">{t.unpaid}</Badge>
                        <Btn size="sm" onClick={() => doPayMonth(m)}>💳 {t.confirm}</Btn>
                      </div>
                    </div>
                  ))}
                  {salaryPayments.filter((p) => p.period || p.month).map((p, i) => (
                    <div key={i} style={{ ...card, padding: "12px 14px", marginBottom: 8, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div><div style={{ fontWeight: 700, fontSize: 13 }}>{p.period || p.month}</div><div style={{ fontSize: 12, color: "var(--muted)" }}>{p.paid_at?.slice(0, 10)}</div></div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <Badge tone="green">✅ {t.paid}</Badge>
                        <span className="mono" style={{ fontWeight: 700, color: "var(--green)", fontSize: 13 }}>{fmt(p.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* History tab */}
              {salaryTab === "history" && (
                <div>
                  {salaryPayments.length === 0 && paidSeances.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13 }}>{t.noResults}</p>}
                  {salaryPayments.map((p, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                      <div><div style={{ fontWeight: 600 }}>{p.paid_at?.slice(0, 10)} · {p.period || p.month || "—"}</div><div style={{ fontSize: 12, color: "var(--muted)" }}>{p.note || ""}</div></div>
                      <span className="mono" style={{ fontWeight: 700, color: "var(--green)" }}>{fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      <Modal open={!!acompte} onClose={() => { setAcompte(null); setAcAmt(""); setAcDate(""); setAcNote(""); }} title={t.acompte}
        footer={<><Btn variant="line" onClick={() => { setAcompte(null); setAcAmt(""); setAcDate(""); setAcNote(""); }}>{t.cancel}</Btn><Btn onClick={doSaveAcompte}>{t.save}</Btn></>}>
        <Field label={t.amount}><Input type="number" value={acAmt} onChange={(e) => setAcAmt(e.target.value)} /></Field>
        <Field label={t.day}><Input type="date" value={acDate} onChange={(e) => setAcDate(e.target.value)} /></Field>
        <Field label={t.description}><Input value={acNote} onChange={(e) => setAcNote(e.target.value)} /></Field>
      </Modal>
      <Modal open={!!absence} onClose={() => { setAbsence(null); setAbCost(""); setAbDate(""); setAbNote(""); }} title={t.absence}
        footer={<><Btn variant="line" onClick={() => { setAbsence(null); setAbCost(""); setAbDate(""); setAbNote(""); }}>{t.cancel}</Btn><Btn onClick={doSaveAbsence}>{t.save}</Btn></>}>
        <Field label={"Coût (" + t.amount + ")"}><Input type="number" value={abCost} onChange={(e) => setAbCost(e.target.value)} /></Field>
        <Field label={t.day}><Input type="date" value={abDate} onChange={(e) => setAbDate(e.target.value)} /></Field>
        <Field label={t.description}><Input value={abNote} onChange={(e) => setAbNote(e.target.value)} /></Field>
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => del && doDelete(del)} />
    </div>
  );
}

function ExpensesScreen() {
  const t = useT();
  const globalRefresh = useRefresh();
  const [q, setQ] = useState(""); const [modal, setModal] = useState(false); const [del, setDel] = useState(null);
  const [rows, setRows] = useState(EXPENSES); const [viewMode, setViewMode] = useState("cards"); const [editing, setEditing] = useState(null); const [catF, setCatF] = useState("all");
  const [catModal, setCatModal] = useState(false); const [newCat, setNewCat] = useState("");
  const cats = [...new Set([...store.EXPENSE_CATEGORIES, ...rows.map((e) => e.category)])];
  // form
  const [fCat, setFCat] = useState(""); const [fName, setFName] = useState(""); const [fDate, setFDate] = useState(new Date().toISOString().slice(0, 10)); const [fAmt, setFAmt] = useState("");
  const byCat = cats.map((c) => ({ l: c, v: rows.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0) }));

  const doRefresh = async () => { await globalRefresh(); setRows([...EXPENSES]); };

  const doDelete = async (e) => {
    setRows((prev) => prev.filter((x) => x.id !== e.id));
    try { await db.deleteExpense(e.id); await doRefresh(); } catch (err) { alert(err.message); doRefresh(); }
  };
  const openCreate = () => { setEditing(null); setFCat(""); setFName(""); setFDate(new Date().toISOString().slice(0, 10)); setFAmt(""); setModal(true); };
  const openEdit = (e) => { setEditing(e); setFCat(e.category); setFName(e.name); setFDate(e.date); setFAmt(e.amount); setModal(true); };
  const save = async () => {
    const payload = { category: fCat || "Autre", name: fName || "—", amount: +fAmt || 0, spent_at: fDate };
    try {
      if (editing) { await db.updateExpense(editing.id, payload); } else { await db.addExpense(payload); }
      await doRefresh();
      setModal(false);
    } catch (e) { alert(e.message); }
  };
  const addCategory = async () => {
    if (!newCat.trim()) return;
    try {
      await db.addExpenseCategory(newCat.trim());
      setFCat(newCat.trim()); setNewCat(""); setCatModal(false);
      await doRefresh();
    } catch (e) { alert(e.message); }
  };
  const list = rows.filter((e) => `${e.category} ${e.name}`.toLowerCase().includes(q.toLowerCase()) && (catF === "all" || e.category === catF));
  const total = list.reduce((s, e) => s + e.amount, 0);
  const actions = (e) => [{ icon: "✏️", label: t.edit, onClick: () => openEdit(e) }, { icon: "🗑️", label: t.delete, danger: true, onClick: () => setDel(e) }];
  return (
    <div>
      <PageHead icon="🧾" title={t.expenses} sub={`${t.from} 01/01 ${t.to} 31/05 · ${fmt(total)} · ${cats.length} ${t.totalCategories}`}
        action={<div style={{ display: "flex", gap: 8 }}>
          <Btn variant="soft" onClick={() => setCatModal(true)}>🏷️ {t.newCategory}</Btn>
          <Btn onClick={openCreate}>➕ {t.add}</Btn>
        </div>} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 16 }} className="dash-grid">
        <Panel title={t.byCategory}><Donut data={byCat.map((c, i) => ({ ...c, color: ["#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#0EA5E9", "#D946EF"][i % 6] }))} /></Panel>
        <Panel title={t.expenses}><BarChart data={byCat} grad="amber" /></Panel>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <SearchFilter value={q} onChange={setQ} filters={<FilterChips value={catF} onChange={setCatF} options={[{ v: "all", l: t.all }, ...cats.map((c) => ({ v: c, l: c }))]} />} />
        </div>
        <ViewToggle mode={viewMode} setMode={setViewMode} />
      </div>
      {viewMode === "cards" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
          <AnimatePresence mode="popLayout">
            {list.map((e) => (
              <motion.div key={e.id} layout initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -8, transition: { duration: 0.15 } }} whileHover={{ y: -5, boxShadow: "var(--shadow-lift)" }} className="gcard" style={{ ...card, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Badge tone="amber">{e.category}</Badge>
                  <Menu items={actions(e)} />
                </div>
                <h3 style={{ margin: "10px 0 4px", fontSize: 14.5, fontWeight: 700 }}>{e.name}</h3>
                <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>{e.date}</p>
                <div className="mono" style={{ fontSize: 18, fontWeight: 800, color: "var(--amber)", marginTop: 8 }}>{fmt(e.amount)}</div>
              </motion.div>
            ))}
          </AnimatePresence>
          {list.length === 0 && <Empty title={t.noResults} />}
        </div>
      ) : (
        <DataTable columns={[
          { h: t.category, render: (e) => <Badge tone="amber">{e.category}</Badge> },
          { h: t.name, k: "name" },
          { h: t.day, k: "date" },
          { h: t.amount, render: (e) => <span className="mono" style={{ color: "var(--amber)", fontWeight: 700 }}>{fmt(e.amount)}</span> },
        ]} rows={list} actions={actions} />
      )}
      <Modal open={modal} onClose={() => setModal(false)} title={(editing ? t.edit : t.add) + " · " + t.expenses}
        footer={<><Btn variant="line" onClick={() => setModal(false)}>{t.cancel}</Btn><Btn onClick={save}>{t.save}</Btn></>}>
        <Field label={t.category}>
          <div style={{ display: "flex", gap: 8 }}>
            <Select value={fCat} onChange={(e) => setFCat(e.target.value)} style={{ flex: 1 }}><option value="">— Sélectionner —</option>{cats.map((c) => <option key={c}>{c}</option>)}</Select>
            <Btn variant="soft" size="sm" onClick={() => setCatModal(true)}>➕</Btn>
          </div>
        </Field>
        <Field label={t.name}><Input value={fName} onChange={(e) => setFName(e.target.value)} /></Field>
        <Field label={t.day}><Input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} /></Field>
        <Field label={t.amount}><Input type="number" value={fAmt} onChange={(e) => setFAmt(e.target.value)} /></Field>
      </Modal>
      <Modal open={catModal} onClose={() => setCatModal(false)} title={t.addCategoryTitle}
        footer={<><Btn variant="line" onClick={() => setCatModal(false)}>{t.cancel}</Btn><Btn onClick={addCategory}>{t.save}</Btn></>}>
        <Field label={t.categoryName}><Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Ex: Transport" autoFocus /></Field>
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => del && doDelete(del)} />
    </div>
  );
}

function AnnouncementsScreen({ audienceFilter }) {
  const t = useT();
  const globalRefresh = useRefresh();
  const [modal, setModal] = useState(false); const [aud, setAud] = useState([]);
  const [rows, setRows] = useState(ANNOUNCEMENTS); const [q, setQ] = useState(""); const [audF, setAudF] = useState("all");
  const [detail, setDetail] = useState(null); const [del, setDel] = useState(null);
  // announcement form state
  const [annTitle, setAnnTitle] = useState(""); const [annDesc, setAnnDesc] = useState("");
  const audLabel = { STUDENTS: t.students, TEACHERS: t.teachers, PARENTS: t.parents };
  const canCompose = !audienceFilter;

  const doRefresh = async () => { await globalRefresh(); setRows([...ANNOUNCEMENTS]); };

  const doDelete = async (a) => {
    setRows((prev) => prev.filter((x) => x.id !== a.id));
    try { await db.deleteAnnouncement(a.id); await doRefresh(); } catch (e) { alert(e.message); doRefresh(); }
  };

  const doSend = async () => {
    if (!annTitle.trim()) return;
    try {
      await db.addAnnouncement({ title: annTitle, description: annDesc, audience: aud, sent_to: aud.length });
      await doRefresh();
      setModal(false); setAud([]); setAnnTitle(""); setAnnDesc("");
    } catch (e) { alert(e.message); }
  };
  const list = rows.filter((a) => (audienceFilter ? a.audience.includes(audienceFilter) : true)
    && `${a.title} ${a.desc}`.toLowerCase().includes(q.toLowerCase())
    && (audF === "all" || a.audience.includes(audF)));
  return (
    <div>
      <PageHead icon="📢" title={t.announcements} action={canCompose && <Btn onClick={() => setModal(true)}>➕ {t.create}</Btn>} />
      {canCompose && <SearchFilter value={q} onChange={setQ} filters={<FilterChips value={audF} onChange={setAudF} options={[{ v: "all", l: t.all }, { v: "STUDENTS", l: t.students }, { v: "TEACHERS", l: t.teachers }, { v: "PARENTS", l: t.parents }]} />} />}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <AnimatePresence mode="popLayout">
        {list.map((a) => (
          <motion.div key={a.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }} whileHover={{ y: -3, boxShadow: "var(--shadow-lift)" }} className="gcard" style={{ ...card, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 className="serif" style={{ margin: 0, fontSize: 17 }}>{a.title}</h3>
                <p style={{ margin: "6px 0 10px", fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6 }}>{a.desc}</p>
              </div>
              {canCompose && <Menu items={[{ icon: "👁️", label: t.view, onClick: () => setDetail(a) }, { icon: "🗑️", label: t.delete, danger: true, onClick: () => setDel(a) }]} />}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {a.audience.map((au) => <Badge key={au} tone="primary">{audLabel[au]}</Badge>)}
              <span style={{ fontSize: 12, color: "var(--faint)", marginInlineStart: "auto" }}>📅 {a.date} · {t.sentTo} {a.sentTo}</span>
            </div>
          </motion.div>
        ))}
        </AnimatePresence>
        {list.length === 0 && <Empty icon="📢" title={t.noResults} />}
      </div>
      <Modal open={modal} onClose={() => { setModal(false); setAud([]); setAnnTitle(""); setAnnDesc(""); }} title={t.create + " · " + t.announcements}
        footer={<><Btn variant="line" onClick={() => { setModal(false); setAud([]); setAnnTitle(""); setAnnDesc(""); }}>{t.cancel}</Btn><Btn onClick={doSend}>📤 {t.send}</Btn></>}>
        <Field label={t.title}><Input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} /></Field>
        <Field label={t.description}><textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} value={annDesc} onChange={(e) => setAnnDesc(e.target.value)} /></Field>
        <Field label={t.audience}>
          <div style={{ display: "flex", gap: 10 }}>
            {["STUDENTS", "TEACHERS", "PARENTS"].map((a) => (
              <button key={a} onClick={() => setAud((p) => p.includes(a) ? p.filter((x) => x !== a) : [...p, a])}
                style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid " + (aud.includes(a) ? "var(--primary)" : "var(--line)"), background: aud.includes(a) ? "var(--primary-50)" : "#fff", color: aud.includes(a) ? "var(--primary-600)" : "var(--muted)", fontWeight: 700, cursor: "pointer", fontSize: 12.5 }}>
                {audLabel[a]}
              </button>
            ))}
          </div>
        </Field>
      </Modal>
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title} wide footer={<Btn variant="line" onClick={() => setDetail(null)}>{t.close}</Btn>}>
        {detail && <div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {detail.audience.map((au) => <Badge key={au} tone="primary">{audLabel[au]}</Badge>)}
            <Badge tone="gray">📅 {detail.date}</Badge><Badge tone="green">{t.sentTo} {detail.sentTo}</Badge>
          </div>
          <p style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.7 }}>{detail.desc}</p>
        </div>}
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => del && doDelete(del)} />
    </div>
  );
}

function ReportsScreen() {
  const t = useT();
  const [from, setFrom] = useState("2026-01-01"); const [to, setTo] = useState("2026-05-31");
  const [tab, setTab] = useState("overview");
  const [scope, setScope] = useState("all");
  const [collectorFilter, setCollectorFilter] = useState("all");
  const [allPayments, setAllPayments] = useState([]);
  const [detail, setDetail] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    db.allPayments().then((pays) => setAllPayments(pays || [])).catch(() => {});
  }, []);

  const debtors = [...STUDENTS].filter((s) => s.debt > 0).sort((a, b) => b.debt - a.debt);
  const totalDebt = debtors.reduce((s, d) => s + d.debt, 0);
  const collected = STUDENTS.reduce((s, x) => s + x.paid, 0);
  const expTotal = EXPENSES.reduce((s, e) => s + e.amount, 0);
  const teacherSalTotal = TEACHERS.reduce((s, x) => s + (x.payModel === "FIXED" ? x.baseSalary : (x.seanceRate || 0) * 20), 0);
  const staffSalTotal = STAFF.reduce((s, x) => s + x.baseSalary, 0);
  const net = collected - expTotal - teacherSalTotal - staffSalTotal;
  const expiredCount = STUDENTS.filter((s) => s.status === "EXPIRED").length;
  const freeCount = STUDENTS.filter((s) => s.isFree).length;
  const lowSeances = STUDENTS.filter((s) => s.seancesRemaining != null && s.seancesRemaining <= 2).length;
  const collectionRate = Math.round((collected / (collected + totalDebt || 1)) * 100);
  // collector filter
  const collectors = ["all", ...new Set(allPayments.map((p) => p.collector_name).filter(Boolean))];
  const filteredPayments = collectorFilter === "all" ? allPayments : allPayments.filter((p) => p.collector_name === collectorFilter);
  const collectorTotal = filteredPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

  // alert feed
  const alerts = [
    { icon: "⚠️", tone: "red", title: t.debtAlerts, msg: `${debtors.length} ${t.students.toLowerCase()} · ${fmt(totalDebt)}` },
    { icon: "💵", tone: "green", title: t.paymentAlerts, msg: `${fmt(collected)} ${t.totalCollected.toLowerCase()}` },
    { icon: "🧾", tone: "amber", title: t.expenseAlerts, msg: `${fmt(expTotal)} · ${EXPENSES.length}` },
    { icon: "📈", tone: net >= 0 ? "green" : "red", title: t.benefits, msg: fmt(net) },
    { icon: "🔋", tone: "amber", title: t.lowSeances, msg: `${lowSeances}` },
    { icon: "⌛", tone: "red", title: t.expired, msg: `${expiredCount}` },
  ];
  const toneMap = { red: ["var(--red-bg)", "var(--red)"], amber: ["var(--amber-bg)", "var(--amber)"], green: ["var(--green-bg)", "var(--green)"], primary: ["var(--primary-50)", "var(--primary-600)"] };

  // clickable KPI cards -> period history
  const kpis = [
    { id: "rev", label: t.grossRevenue, value: collected, icon: "💵", tone: "green", money: true, rows: STUDENTS.flatMap((s) => s.payments.map((p) => ({ who: `${s.firstName} ${s.lastName}`, ...p }))).sort((a, b) => b.date.localeCompare(a.date)) },
    { id: "debt", label: t.outstanding, value: totalDebt, icon: "⚠️", tone: "red", money: true, rows: debtors.map((d) => ({ who: `${d.firstName} ${d.lastName}`, amount: d.debt, date: d.className })) },
    { id: "exp", label: t.expenses, value: expTotal, icon: "🧾", tone: "amber", money: true, rows: EXPENSES.map((e) => ({ who: `${e.category} · ${e.name}`, amount: e.amount, date: e.date })) },
    { id: "sal", label: t.salariesPaid, value: totals.salaries, icon: "💼", tone: "primary", money: true, rows: TEACHERS.map((x) => ({ who: `${x.firstName} ${x.lastName}`, amount: x.payModel === "FIXED" ? x.baseSalary : x.seanceRate * 20, date: x.payModel === "FIXED" ? t.fixed : t.perSeance })) },
    { id: "net", label: t.netBenefit, value: net, icon: "📈", tone: net >= 0 ? "green" : "red", money: true, rows: [] },
  ];

  const scopeData = {
    students: STUDENTS.map((s) => ({ name: `${s.firstName} ${s.lastName}`, a: s.className, b: s.subType, c: fmt(s.paid), d: s.debt > 0 ? fmt(s.debt) : "—", status: s.status })),
    parents: null,
    teachers: TEACHERS.map((x) => ({ name: `${x.firstName} ${x.lastName}`, a: (x.modules || []).join(", "), b: x.payModel === "FIXED" ? t.fixed : t.perSeance, c: fmt(x.payModel === "FIXED" ? x.baseSalary : x.seanceRate * 20), d: x.unpaidMonths > 0 ? `${x.unpaidMonths}` : "✓" })),
    staff: STAFF.map((x) => ({ name: `${x.firstName} ${x.lastName}`, a: x.position, b: t.fixed, c: fmt(x.baseSalary), d: x.unpaidMonths > 0 ? `${x.unpaidMonths}` : "✓" })),
  };

  const tabs = [["overview", t.overview], ["students", t.students], ["teachers", t.teachers], ["staff", t.staff]];

  return (
    <div>
      <PageHead icon="💰" title={t.reports} sub={`${t.detailedReports} · ${t.academicYear} 2025–2026`}
        action={<Btn variant="soft" onClick={() => setShowAnalytics(true)}>📈 {t.viewAnalytics}</Btn>} />

      {/* Filters */}
      <Panel pad={16}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div><span style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>{t.from}</span><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 150 }} /></div>
          <div><span style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>{t.to}</span><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 150 }} /></div>
          <div><span style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>{t.filterBy}</span>
            <Select value={scope} onChange={(e) => setScope(e.target.value)} style={{ width: 170 }}>
              <option value="all">{t.all}</option><option value="students">{t.students}</option>
              <option value="teachers">{t.teachers}</option><option value="staff">{t.staff}</option>
            </Select>
          </div>
          <div><span style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>{t.byCollector}</span>
            <Select value={collectorFilter} onChange={(e) => setCollectorFilter(e.target.value)} style={{ width: 180 }}>
              {collectors.map((c) => <option key={c} value={c}>{c === "all" ? t.all : c}</option>)}
            </Select>
          </div>
          <div style={{ marginInlineStart: "auto", display: "flex", gap: 8 }}><Btn variant="line" size="sm">⬇️ PDF</Btn><Btn variant="line" size="sm">⬇️ Excel</Btn></div>
        </div>
        {collectorFilter !== "all" && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--green-bg)", borderRadius: 10, fontSize: 13 }}>
            <b>{collectorFilter}</b> — {filteredPayments.length} {t.payments.toLowerCase()} · <span className="mono" style={{ color: "var(--green)", fontWeight: 700 }}>{fmt(collectorTotal)}</span>
          </div>
        )}
      </Panel>

      {/* Alerts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12, margin: "16px 0" }}>
        {alerts.map((a, i) => {
          const [bg, fg] = toneMap[a.tone];
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              style={{ ...card, padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ width: 40, height: 40, borderRadius: 11, background: bg, color: fg, display: "grid", placeItems: "center", fontSize: 19, flexShrink: 0 }}>{a.icon}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>{a.title}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: fg }}>{a.msg}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Clickable KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 16 }}>
        {kpis.map((k) => (
          <motion.div key={k.id} whileHover={{ y: -4, boxShadow: "var(--shadow-lift)" }} onClick={() => k.rows.length && setDetail(k)}
            style={{ ...card, padding: 18, position: "relative", overflow: "hidden", cursor: k.rows.length ? "pointer" : "default" }}>
            <div style={{ position: "absolute", inset: "0 0 auto 0", height: 3, background: { green: "var(--grad-green)", red: "var(--grad-red)", amber: "var(--grad-amber)", primary: "var(--grad-primary)" }[k.tone] }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontSize: 22 }}>{k.icon}</span>
              {k.rows.length > 0 && <span style={{ fontSize: 11, color: "var(--faint)" }}>{t.clickForDetails} ›</span>}
            </div>
            <div className="mono" style={{ fontSize: 21, fontWeight: 800, marginTop: 12, color: { green: "var(--green)", red: "var(--red)", amber: "var(--amber)", primary: "var(--primary-600)" }[k.tone] }}>{k.money ? fmt(k.value) : k.value}</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>{k.label}</div>
          </motion.div>
        ))}
        <div style={{ ...card, padding: 18, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: "0 0 auto 0", height: 3, background: "var(--grad-primary)" }} />
          <span style={{ fontSize: 22 }}>🎯</span>
          <div className="mono" style={{ fontSize: 21, fontWeight: 800, marginTop: 12 }}><span className="grad-text">{collectionRate}%</span></div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>{t.collectionRate}</div>
        </div>
      </div>

      {/* Sub-report tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: "8px 15px", borderRadius: 999, border: "1px solid " + (tab === k ? "transparent" : "var(--line)"), background: tab === k ? "var(--grad-primary)" : "#fff", color: tab === k ? "#fff" : "var(--muted)", fontWeight: 700, cursor: "pointer", fontSize: 12.5 }}>{l}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="dash-grid">
          {/* Net benefit breakdown */}
          <Panel title={`💡 ${t.netBenefit}`}>
            <Row k={`+ ${t.grossRevenue}`} v={fmt(collected)} green />
            <Row k={`− ${t.expenses}`} v={fmt(expTotal)} red />
            <Row k={`− ${t.teachers} ${t.salary.toLowerCase()}`} v={fmt(teacherSalTotal)} red />
            <Row k={`− ${t.staff} ${t.salary.toLowerCase()}`} v={fmt(staffSalTotal)} red />
            <div style={{ borderTop: "1px solid var(--line)", marginTop: 8, paddingTop: 8 }}><Row k={`= ${t.netBenefit}`} v={fmt(net)} green={net >= 0} red={net < 0} bold /></div>
          </Panel>
          {/* Special cases */}
          <Panel title={`🎁 ${t.specialCases}`}>
            <div style={{ marginBottom: 8 }}><Badge tone="green">{freeCount} {t.students.toLowerCase()}</Badge></div>
            {STUDENTS.filter((s) => s.isFree).slice(0, 6).map((s) => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line)", fontSize: 12.5 }}>
                <span>{s.firstName} {s.lastName}</span>
                <Badge tone="gray">{s.seancesRemaining ?? "∞"} {t.seances.toLowerCase()}</Badge>
              </div>
            ))}
          </Panel>
          <Panel title={`${t.revenueBreakdown}`}><BarChart data={SUB_TYPES.map((s) => ({ l: (s.name || "").split(" ")[0], v: ri(80, 300) * 1000 }))} grad="green" /></Panel>
          <Panel title={`${t.expenseBreakdown}`}><BarChart data={[...new Set(EXPENSES.map((e) => e.category))].map((c) => ({ l: c, v: EXPENSES.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0) }))} grad="amber" /></Panel>
          <Panel title={`${t.revenue} vs ${t.expenses} · ${t.byMonth}`}>
            <LineChart labels={t.months.slice(0, 5)} series={[
              { data: [120, 180, 150, 220, 260].map((x) => x * 1000), color: "#10B981" },
              { data: [80, 90, 110, 95, 120].map((x) => x * 1000), color: "#F59E0B" },
            ]} />
          </Panel>
          <Panel title={t.topDebtors}>
            {debtors.slice(0, 7).map((s) => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                <span>{s.firstName} {s.lastName} · {s.className}</span><span className="mono" style={{ color: "var(--red)", fontWeight: 700 }}>{fmt(s.debt)}</span>
              </div>
            ))}
          </Panel>
        </div>
      )}

      {tab !== "overview" && scopeData[tab] && (
        <DataTable
          columns={[
            { h: t.name, render: (r) => <b>{r.name}</b> },
            { h: tab === "students" ? t.classes : (tab === "teachers" ? t.module : t.position), k: "a" },
            { h: tab === "students" ? t.subscription : t.payModel, k: "b" },
            { h: tab === "students" ? t.paid : t.salary, render: (r) => <span className="mono">{r.c}</span> },
            { h: tab === "students" ? t.debt : t.unpaidMonths, render: (r) => <span className="mono" style={{ color: r.d !== "—" && r.d !== "✓" ? "var(--red)" : "var(--green)", fontWeight: 700 }}>{r.d}</span> },
          ]}
          rows={scopeData[tab]}
        />
      )}

      {/* KPI period-history modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `${detail.label} · ${t.periodHistory}` : ""} wide footer={<Btn variant="line" onClick={() => setDetail(null)}>{t.close}</Btn>}>
        {detail && <div>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 0 }}>{from} → {to}</p>
          <div className="mono" style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>{fmt(detail.value)}</div>
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {detail.rows.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                <span>{r.who} <span style={{ color: "var(--faint)" }}>· {r.date}</span></span>
                <span className="mono" style={{ fontWeight: 700, color: detail.tone === "red" ? "var(--red)" : detail.tone === "amber" ? "var(--amber)" : "var(--green)" }}>{fmt(r.amount)}</span>
              </div>
            ))}
          </div>
        </div>}
      </Modal>

      {/* Embedded analytics */}
      {showAnalytics && (
        <Modal open onClose={() => setShowAnalytics(false)} title={`📈 ${t.analytics}`} wide footer={<Btn variant="line" onClick={() => setShowAnalytics(false)}>{t.close}</Btn>}>
          <AnalyticsContent />
        </Modal>
      )}
    </div>
  );
}

function AnalyticsContent() {
  const t = useT();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="dash-grid">
      <Panel title={t.enrollment + " · " + t.growth}><LineChart labels={t.months.slice(0, 8)} series={[{ data: [120, 135, 150, 162, 178, 190, 205, 218], color: "#8B5CF6" }]} /></Panel>
      <Panel title={t.retention}><Donut data={[{ l: t.active, v: totals.activeSubs, color: "#10B981" }, { l: t.expired, v: STUDENTS.length - totals.activeSubs, color: "#EF4444" }]} /></Panel>
      <Panel title={t.attendanceRate + " / " + t.classes}><BarChart data={CLASSES.map((c) => ({ l: c.year || (c.name || "").split(" ")[0], v: ri(72, 98) }))} grad="green" /></Panel>
      <Panel title={t.revenue + " / " + t.classes}><BarChart data={CLASSES.map((c) => ({ l: c.year || (c.name || "").split(" ")[0], v: ri(40, 220) * 1000 }))} /></Panel>
      <Panel title={t.debtAging}><BarChart data={[{ l: "0-30j", v: 120000 }, { l: "30-60j", v: 80000 }, { l: "60-90j", v: 45000 }, { l: ">90j", v: 22000 }]} grad="red" /></Panel>
      <Panel title={t.seances + " · " + t.byMonth}><LineChart labels={t.months.slice(0, 8)} series={[{ data: [340, 380, 360, 420, 450, 410, 480, 460], color: "#F59E0B" }]} /></Panel>
      <Panel title={t.avgRevenue + " / " + t.students}><BarChart data={CLASSES.map((c) => ({ l: c.year || (c.name || "").split(" ")[0], v: ri(4, 12) * 1000 }))} grad="sky" /></Panel>
      <Panel title={t.collectionRate + " · " + t.byMonth}><LineChart labels={t.months.slice(0, 8)} series={[{ data: [78, 82, 80, 88, 91, 86, 93, 90], color: "#10B981" }]} /></Panel>
    </div>
  );
}

function AnalyticsScreen() {
  const t = useT();
  return (
    <div>
      <PageHead icon="📈" title={t.analytics} sub={`${t.academicYear} 2025–2026`} />
      <AnalyticsContent />
    </div>
  );
}

// Data Export & Backup Panel
function DataExportPanel() {
  const t = useT();
  const globalRefresh = useRefresh();
  const schoolName = store.SETTINGS?.name || "Académie Noor";

  // Export state
  const [exportType, setExportType] = useState("students");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [inclSubs, setInclSubs] = useState(true);
  const [inclPay, setInclPay] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [allPayments, setAllPayments] = useState([]);

  // Backup/Restore state
  const [backupBusy, setBackupBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restorePreview, setRestorePreview] = useState(null);
  const [lastBackup, setLastBackup] = useState(() => localStorage.getItem("lastBackup") || null);
  const restoreRef = React.useRef(null);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load payment history for Excel (sheet 4)
  useEffect(() => {
    db.allPayments().then(setAllPayments).catch(() => {});
  }, []);

  const filteredStudents = useMemo(() => {
    let r = [...STUDENTS];
    if (startDate && endDate) r = filterStudentsByDateRange(r, startDate, endDate);
    if (selectedClass !== "all") r = filterStudentsByClass(r, selectedClass);
    if (selectedStatus !== "all") r = filterStudentsByStatus(r, selectedStatus);
    return r;
  }, [startDate, endDate, selectedClass, selectedStatus]);

  const stats = useMemo(() => calculateSummaryStats(filteredStudents), [filteredStudents]);

  // ---------- Export ----------
  const handleExport = async () => {
    setExporting(true);
    try {
      if (exportType === "students") {
        if (!filteredStudents.length) { showToast(t.noDataSelected, "err"); return; }
        await exportStudentsToExcel(filteredStudents, {
          startDate, endDate, schoolName, includePayments: inclPay,
          includeSubscriptions: inclSubs, payments: inclPay ? allPayments : [],
        });
        showToast(`${filteredStudents.length} étudiant(s) exportés ✓`);
      } else if (exportType === "teachers") {
        await exportTeachersToExcel(TEACHERS, schoolName);
        showToast(`${TEACHERS.length} enseignant(s) exportés ✓`);
      } else if (exportType === "staff") {
        await exportStaffToExcel(STAFF, schoolName);
        showToast(`${STAFF.length} membre(s) exportés ✓`);
      } else if (exportType === "classes") {
        await exportClassesToExcel(CLASSES, schoolName);
        showToast(`${CLASSES.length} classe(s) exportées ✓`);
      } else if (exportType === "expenses") {
        await exportExpensesToExcel(EXPENSES, schoolName);
        showToast(`${EXPENSES.length} dépense(s) exportées ✓`);
      }
    } catch (e) {
      showToast(t.exportError + ": " + e.message, "err");
    } finally {
      setExporting(false);
    }
  };

  const exportCounts = {
    students: filteredStudents.length,
    teachers: TEACHERS.length,
    staff: STAFF.length,
    classes: CLASSES.length,
    expenses: EXPENSES.length,
  };

  // ---------- Backup ----------
  const handleBackup = async () => {
    setBackupBusy(true);
    try {
      const fetchRaw = (table) => supabase.from(table).select("*").then(({ data }) => data || []);
      const [settings, modules, classes, groups, teachers, staff, plans, subTypes,
             students, parents, parentStudents, payments, expenses, expCats, announcements] =
        await Promise.all([
          db.getSettings().catch(() => null),
          fetchRaw("modules"), fetchRaw("classes"), fetchRaw("groups"),
          fetchRaw("teachers"), fetchRaw("staff"), fetchRaw("plans"),
          fetchRaw("subscription_types"), fetchRaw("students"),
          fetchRaw("parents"), fetchRaw("parent_students"), fetchRaw("payments"),
          fetchRaw("expenses"), fetchRaw("expense_categories"), fetchRaw("announcements"),
        ]);

      const backup = {
        version: 2,
        created_at: new Date().toISOString(),
        school: schoolName,
        data: {
          school_settings: settings ? [settings] : [],
          modules, classes, groups, teachers, staff, plans,
          subscription_types: subTypes, students, parents,
          parent_students: parentStudents, payments, expenses,
          expense_categories: expCats, announcements,
        },
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${schoolName.replace(/\s+/g, "_")}_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const ts = new Date().toLocaleString("fr-FR");
      setLastBackup(ts);
      localStorage.setItem("lastBackup", ts);
      showToast("Sauvegarde téléchargée avec succès ✓");
    } catch (e) {
      showToast("Erreur sauvegarde: " + e.message, "err");
    } finally {
      setBackupBusy(false);
    }
  };

  // ---------- Restore ----------
  const onRestoreFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed?.data) throw new Error("Format invalide");
        setRestorePreview(parsed);
      } catch {
        showToast("Fichier invalide — ce n'est pas un fichier de sauvegarde JSON.", "err");
        if (restoreRef.current) restoreRef.current.value = "";
      }
    };
    reader.readAsText(f);
  };

  const handleRestore = async () => {
    if (!restorePreview?.data) return;
    if (!window.confirm("Confirmer la restauration ? Les données existantes seront remplacées par le contenu du fichier.")) return;
    setRestoreBusy(true);
    try {
      const d = restorePreview.data;
      // Insert in FK-safe order
      const steps = [
        ["modules", d.modules],
        ["expense_categories", d.expense_categories],
        ["subscription_types", d.subscription_types],
        ["teachers", d.teachers],
        ["staff", d.staff],
        ["parents", d.parents],
        ["classes", d.classes],
        ["groups", d.groups],
        ["students", d.students],
        ["plans", d.plans],
        ["parent_students", d.parent_students],
        ["payments", d.payments],
        ["expenses", d.expenses],
        ["announcements", d.announcements],
      ];
      for (const [table, rows] of steps) {
        if (rows?.length) {
          const { error } = await supabase.from(table).upsert(rows, { ignoreDuplicates: false });
          if (error) throw new Error(`Erreur table ${table}: ${error.message}`);
        }
      }
      if (d.school_settings?.[0]) {
        await supabase.from("school_settings").upsert(d.school_settings[0]);
      }
      await globalRefresh();
      setRestorePreview(null);
      if (restoreRef.current) restoreRef.current.value = "";
      showToast("Données restaurées avec succès ✓");
    } catch (e) {
      showToast("Erreur restauration: " + e.message, "err");
    } finally {
      setRestoreBusy(false);
    }
  };

  const EXPORT_TYPES = [
    { val: "students",  icon: "👥", label: "Étudiants" },
    { val: "teachers",  icon: "👨‍🏫", label: "Enseignants" },
    { val: "staff",     icon: "👔", label: "Admin" },
    { val: "classes",   icon: "🏫", label: "Classes" },
    { val: "expenses",  icon: "💰", label: "Dépenses" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: toast.type === "err" ? "var(--red)" : "var(--green)",
          color: "#fff", borderRadius: 12, padding: "12px 20px",
          fontSize: 13.5, fontWeight: 600, boxShadow: "var(--shadow-lift)",
          maxWidth: 320,
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── SECTION 1 : Export Excel ─────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <SectionHead icon="📊" title="Export Excel"
          sub="Téléchargez vos données en format .xlsx" />

        {/* Type tabs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 16 }}>
          {EXPORT_TYPES.map((opt) => (
            <button key={opt.val} onClick={() => setExportType(opt.val)} style={{
              padding: "10px 4px", borderRadius: 10,
              border: "2px solid " + (exportType === opt.val ? "var(--primary)" : "var(--line)"),
              background: exportType === opt.val ? "var(--primary-50)" : "#fff",
              color: exportType === opt.val ? "var(--primary-600)" : "var(--muted)",
              fontWeight: 600, cursor: "pointer", fontSize: 11,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              transition: "all .15s",
            }}>
              <span style={{ fontSize: 20 }}>{opt.icon}</span>
              <span>{opt.label}</span>
              <span style={{ fontVariantNumeric: "tabular-nums", opacity: .65 }}>{exportCounts[opt.val]}</span>
            </button>
          ))}
        </div>

        {/* Students filters */}
        {exportType === "students" && (
          <div style={{ background: "var(--bg)", borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Field label={t.from}><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
              <Field label={t.to}><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
              <Field label={t.filterByClass}>
                <Select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                  <option value="all">{t.allClasses}</option>
                  {CLASSES.map((c) => <option key={c.id} value={c.id}>{c.year || c.name}</option>)}
                </Select>
              </Field>
              <Field label={t.filterByStatus}>
                <Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                  <option value="all">{t.allStatuses}</option>
                  <option value="ACTIVE">{t.active}</option>
                  <option value="EXPIRED">{t.expired}</option>
                  <option value="SUSPENDED">Suspendu</option>
                </Select>
              </Field>
            </div>
            <div style={{ display: "flex", gap: 18, marginBottom: 14 }}>
              {[[inclSubs, setInclSubs, t.includeSubscriptions], [inclPay, setInclPay, t.includePayments]].map(([val, set, label], i) => (
                <label key={i} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                  <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} style={{ cursor: "pointer", accentColor: "var(--primary)" }} />
                  {label}
                </label>
              ))}
            </div>
            {/* Stats strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
              {[
                { l: t.students, v: stats.totalStudents, c: "var(--primary)" },
                { l: t.active,   v: stats.activeStudents, c: "var(--green)" },
                { l: "Expiré",   v: stats.expiredStudents, c: "var(--amber)" },
                { l: "Payé",     v: fmt(stats.totalPaid),  c: "var(--green)" },
                { l: "Dette",    v: fmt(stats.totalDebt),  c: "var(--red)" },
              ].map((s) => (
                <div key={s.l} style={{ background: "#fff", borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
                  <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 2 }}>{s.l}</div>
                  <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Btn
          onClick={handleExport}
          disabled={exporting || exportCounts[exportType] === 0}
          style={{ width: "100%", padding: "12px 0" }}
        >
          {exporting
            ? "⏳ Export en cours…"
            : `📥 Exporter ${EXPORT_TYPES.find(x => x.val === exportType)?.label} (${exportCounts[exportType]})`}
        </Btn>
      </div>

      <div style={{ height: 1, background: "var(--line)", margin: "0 0 24px" }} />

      {/* ── SECTION 2 : Sauvegarde ───────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <SectionHead icon="💾" title="Sauvegarde complète"
          sub={lastBackup ? `Dernière sauvegarde : ${lastBackup}` : "Aucune sauvegarde locale enregistrée"}
          iconBg="linear-gradient(135deg,#059669,#34D399)" />
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 14px" }}>
          Télécharge toutes vos données (étudiants, enseignants, cours, paiements…) dans un fichier JSON chiffré, réutilisable pour restauration.
        </p>
        <Btn variant="soft" onClick={handleBackup} disabled={backupBusy} style={{ width: "100%", padding: "12px 0" }}>
          {backupBusy ? "⏳ Création de la sauvegarde…" : "⬇️ Télécharger la sauvegarde"}
        </Btn>
      </div>

      <div style={{ height: 1, background: "var(--line)", margin: "0 0 24px" }} />

      {/* ── SECTION 3 : Restauration ─────────────────────────── */}
      <div>
        <SectionHead icon="♻️" title="Restaurer les données"
          sub="Importez un fichier de sauvegarde JSON"
          iconBg="linear-gradient(135deg,#D97706,#FBBF24)" />

        <input ref={restoreRef} type="file" accept=".json,application/json" onChange={onRestoreFile} style={{ display: "none" }} />

        {!restorePreview ? (
          <button
            onClick={() => restoreRef.current?.click()}
            style={{
              width: "100%", padding: "28px 16px", borderRadius: 12,
              border: "2px dashed var(--line)", background: "var(--bg)",
              cursor: "pointer", textAlign: "center", color: "var(--muted)",
              fontSize: 13, transition: "border-color .15s, background .15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.background = "var(--primary-50)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.background = "var(--bg)"; }}
          >
            <div style={{ fontSize: 30, marginBottom: 8 }}>📂</div>
            <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Cliquez pour choisir un fichier</div>
            <div style={{ fontSize: 12 }}>Fichier .json de sauvegarde Académie Noor</div>
          </button>
        ) : (
          <div>
            <div style={{
              borderRadius: 12, padding: 16, marginBottom: 14,
              background: "var(--amber-bg)", border: "1px solid #FCD34D",
            }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: "#92400E", marginBottom: 10 }}>
                📦 Aperçu de la sauvegarde
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink)", marginBottom: 12 }}>
                <strong>{restorePreview.school}</strong>
                {restorePreview.created_at && (
                  <span style={{ color: "var(--muted)", marginInlineStart: 8 }}>
                    · {new Date(restorePreview.created_at).toLocaleString("fr-FR")}
                  </span>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(90px,1fr))", gap: 8 }}>
                {[
                  ["Étudiants",   restorePreview.data?.students?.length ?? 0],
                  ["Enseignants", restorePreview.data?.teachers?.length ?? 0],
                  ["Classes",     restorePreview.data?.classes?.length ?? 0],
                  ["Paiements",   restorePreview.data?.payments?.length ?? 0],
                  ["Dépenses",    restorePreview.data?.expenses?.length ?? 0],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{k}</div>
                    <div className="mono" style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="line" style={{ flex: 1 }}
                onClick={() => { setRestorePreview(null); if (restoreRef.current) restoreRef.current.value = ""; }}>
                ✕ Annuler
              </Btn>
              <Btn disabled={restoreBusy} style={{ flex: 2, background: "#D97706", borderColor: "#D97706" }}
                onClick={handleRestore}>
                {restoreBusy ? "⏳ Restauration en cours…" : "♻️ Confirmer la restauration"}
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Small section header used inside DataExportPanel
function SectionHead({ icon, title, sub, iconBg }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: iconBg || "var(--grad-primary)",
        display: "grid", placeItems: "center", fontSize: 19,
      }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: "var(--muted)" }}>{sub}</div>}
      </div>
    </div>
  );
}

function SettingsScreen({ ownOnly }) {
  const t = useT(); const [tab, setTab] = useState(ownOnly ? "profile" : "school");
  const fileRef = React.useRef(null);
  const globalRefresh = useRefresh();

  const cfg = store.SETTINGS || {};
  const [sName, setSName] = useState(cfg.name || "Académie Noor");
  const [sAddress, setSAddress] = useState(cfg.address || "12 Rue des Écoles, Alger");
  const [sPhone, setSPhone] = useState(cfg.phone || "021 00 00 00");
  const [sEmail, setSEmail] = useState(cfg.email || "contact@noor.edu");
  const [logoPreview, setLogoPreview] = useState(cfg.logo_url || null); // URL or local blob preview
  const [logoFile, setLogoFile] = useState(null); // raw File to upload
  const [sYear, setSYear] = useState(cfg.academic_year || "2025-2026");
  const [sCurrency, setSCurrency] = useState(cfg.currency || "DZD");
  const [savingSchool, setSavingSchool] = useState(false);

  useEffect(() => {
    if (store.SETTINGS) {
      setSName(store.SETTINGS.name || "");
      setSAddress(store.SETTINGS.address || "");
      setSPhone(store.SETTINGS.phone || "");
      setSEmail(store.SETTINGS.email || "");
      setLogoPreview(store.SETTINGS.logo_url || null);
      setSYear(store.SETTINGS.academic_year || "2025-2026");
      setSCurrency(store.SETTINGS.currency || "DZD");
    }
  }, [store.SETTINGS]);

  const onLogo = (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    setLogoFile(f);
    setLogoPreview(URL.createObjectURL(f));
  };

  const doSaveSchool = async () => {
    setSavingSchool(true);
    try {
      let finalLogoUrl = logoPreview;
      // If user picked a new file, upload it to Supabase Storage
      if (logoFile) {
        finalLogoUrl = await db.uploadLogo(logoFile);
        setLogoFile(null);
        setLogoPreview(finalLogoUrl);
      }
      await db.saveSettings({
        name: sName,
        address: sAddress,
        phone: sPhone,
        email: sEmail,
        logo_url: finalLogoUrl,
        academic_year: sYear,
        currency: sCurrency
      });
      await globalRefresh();
      alert("Paramètres de l'école enregistrés avec succès !");
    } catch (e) { alert(e.message); }
    finally { setSavingSchool(false); }
  };

  // Profile management state
  const [profile, setProfile] = useState(null);
  const [pUsername, setPUsername] = useState("");
  const [pFullName, setPFullName] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pPass, setPPass] = useState("");
  const [pConfirm, setPConfirm] = useState("");
  const [pBusy, setPBusy] = useState(false);

  useEffect(() => {
    let active = true;
    db.auth.myProfile().then((p) => {
      if (p && active) {
        setProfile(p);
        setPUsername(p.username || "");
        setPFullName(p.full_name || "");
        setPEmail(p.email || "");
        setPPhone(p.phone || "");
      }
    });
    return () => { active = false; };
  }, []);

  const doSaveProfile = async () => {
    if (!profile) return;
    if (pPass && pPass !== pConfirm) {
      alert("Les mots de passe ne correspondent pas !");
      return;
    }
    setPBusy(true);
    try {
      const { error } = await supabase.from("profiles")
        .update({ username: pUsername, full_name: pFullName, email: pEmail, phone: pPhone })
        .eq("id", profile.id);
      if (error) throw error;
      if (pPass) {
        const { error: authErr } = await supabase.auth.updateUser({ password: pPass });
        if (authErr) throw authErr;
        setPPass(""); setPConfirm("");
      }
      alert("Profil mis à jour avec succès !");
    } catch (e) { alert(e.message); }
    finally { setPBusy(false); }
  };

  const tabs = ownOnly ? [["profile", t.profile]] : [["school", t.school], ["profile", t.profile], ["data", t.data]];
  return (
    <div>
      <PageHead icon="⚙️" title={t.settings} />
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: "9px 16px", borderRadius: 10, border: "1px solid " + (tab === k ? "var(--primary)" : "var(--line)"), background: tab === k ? "var(--primary-50)" : "#fff", color: tab === k ? "var(--primary-600)" : "var(--muted)", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{l}</button>
        ))}
      </div>
      <Panel pad={22}>
        {tab === "school" && <div style={{ maxWidth: 460 }}>
          <Field label={t.chooseLogo}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: 18, background: logoPreview ? `center/cover no-repeat url(${logoPreview})` : "var(--grad-primary)", display: "grid", placeItems: "center", fontSize: 30, color: "#fff", boxShadow: "0 8px 20px -8px rgba(124,58,237,.6)", flexShrink: 0, overflow: "hidden" }}>
                {logoPreview ? <img src={logoPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🎓"}
              </div>
              <div>
                <input ref={fileRef} type="file" accept="image/*" onChange={onLogo} style={{ display: "none" }} />
                <Btn variant="soft" onClick={() => fileRef.current && fileRef.current.click()}>📁 {t.uploadFromDevice}</Btn>
                {logoPreview && <Btn variant="ghost" size="sm" style={{ marginInlineStart: 8 }} onClick={() => { setLogoPreview(null); setLogoFile(null); }}>✕</Btn>}
                <p style={{ fontSize: 11.5, color: "var(--faint)", margin: "8px 0 0" }}>{t.logoPreview} · PNG/JPG</p>
              </div>
            </div>
          </Field>
          <Field label={t.name}><Input value={sName} onChange={(e) => setSName(e.target.value)} /></Field>
          <Field label="Adresse"><Input value={sAddress} onChange={(e) => setSAddress(e.target.value)} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label={t.phone}><Input value={sPhone} onChange={(e) => setSPhone(e.target.value)} /></Field>
            <Field label={t.email}><Input value={sEmail} onChange={(e) => setSEmail(e.target.value)} /></Field>
            <Field label={t.academicYear}>
              <Select value={sYear} onChange={(e) => setSYear(e.target.value)}>
                <option value="2025-2026">2025–2026</option>
                <option value="2024-2025">2024–2025</option>
              </Select>
            </Field>
            <Field label={t.currency}>
              <Select value={sCurrency} onChange={(e) => setSCurrency(e.target.value)}>
                <option value="DZD">DA (DZD)</option>
                <option value="EUR">€ (EUR)</option>
              </Select>
            </Field>
          </div>
          <Btn onClick={doSaveSchool} disabled={savingSchool}>{savingSchool ? "⏳ …" : t.save}</Btn>
        </div>}
        {tab === "profile" && <div style={{ maxWidth: 460 }}>
          <Field label={t.username}><Input value={pUsername} onChange={(e) => setPUsername(e.target.value)} /></Field>
          <Field label="Nom complet"><Input value={pFullName} onChange={(e) => setPFullName(e.target.value)} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label={t.email}><Input value={pEmail} onChange={(e) => setPEmail(e.target.value)} /></Field>
            <Field label={t.phone}><Input value={pPhone} onChange={(e) => setPPhone(e.target.value)} /></Field>
          </div>
          <Field label={t.changePassword}><Input type="password" placeholder="••••••••" value={pPass} onChange={(e) => setPPass(e.target.value)} /></Field>
          <Field label="Confirmer"><Input type="password" placeholder="••••••••" value={pConfirm} onChange={(e) => setPConfirm(e.target.value)} /></Field>
          <Btn onClick={doSaveProfile} disabled={pBusy}>{t.save}</Btn>
        </div>}
        {tab === "data" && <DataExportPanel />}
      </Panel>
    </div>
  );
}

function NotificationsScreen({ parent }) {
  const t = useT();
  const [items, setItems] = useState(parent ? PARENT_NOTIFS : NOTIFS);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null);
  const icons = { payment: "💳", seance: "🔋", salary: "💼", announcement: "📢", attendance: "✅", message: "✉️", late: "⏰" };

  useEffect(() => {
    const load = async () => {
      try {
        let data;
        if (parent) {
          // parent ID: find first parent with children matching current user — fall back to all
          const parentObj = PARENTS[0];
          data = parentObj ? await db.notificationsForParent(parentObj.id) : [];
        } else {
          data = await db.listNotifications("STAFF");
        }
        setItems((data || []).map((n) => ({ id: n.id, type: n.type, msg: n.message, title: n.title, from: n.source, time: new Date(n.created_at).toLocaleDateString("fr-FR"), read: n.read })));
      } catch (_) {}
    };
    load();
  }, [parent]);

  const list = filter === "all" ? items : items.filter((n) => n.type === filter);
  const filterOpts = parent
    ? [{ v: "all", l: t.all }, { v: "message", l: t.messageReceived }, { v: "payment", l: t.payments }, { v: "late", l: t.retards }]
    : [{ v: "all", l: t.all }, { v: "payment", l: t.payments }, { v: "seance", l: t.seances }, { v: "salary", l: t.salary }, { v: "announcement", l: t.announcements }];
  const openNotif = async (n) => {
    if (!n.read) {
      try { await db.markNotificationRead(n.id); } catch (_) {}
    }
    setItems((p) => p.map((x) => x.id === n.id ? { ...x, read: true } : x));
    if (parent && (n.title || n.msg)) setOpen(n);
  };
  return (
    <div>
      <PageHead icon="🔔" title={t.notifications} action={<Btn variant="soft" onClick={() => setItems((p) => p.map((n) => ({ ...n, read: true })))}>✓ {t.markAllRead}</Btn>} />
      <div style={{ marginBottom: 16 }}><FilterChips value={filter} onChange={setFilter} options={filterOpts} /></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map((n) => (
          <motion.div key={n.id} whileHover={{ x: 3 }} onClick={() => openNotif(n)}
            style={{ ...card, padding: 14, display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", borderInlineStart: "3px solid " + (n.read ? "var(--line)" : "var(--primary)") }}>
            <span style={{ fontSize: 20, marginTop: 2 }}>{icons[n.type] || "🔔"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {parent && n.from && <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                <Badge tone={n.from === "ADMIN" ? "primary" : "amber"}>{n.from === "ADMIN" ? t.fromAdmin : t.teacherOf}</Badge>
              </div>}
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: n.read ? 500 : 700, color: "var(--ink)" }}>{n.title || n.msg}</p>
              {parent && n.title && <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.msg}</p>}
              <span style={{ fontSize: 11.5, color: "var(--faint)" }}>{n.time}</span>
            </div>
            {!n.read && <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--primary)", marginTop: 6, flexShrink: 0 }} />}
          </motion.div>
        ))}
        {list.length === 0 && <Empty icon="🔔" title={t.noResults} />}
      </div>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.title || t.messageReceived} footer={<Btn variant="line" onClick={() => setOpen(null)}>{t.close}</Btn>}>
        {open && <div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <Badge tone={open.from === "ADMIN" ? "primary" : "amber"}>{open.from === "ADMIN" ? t.fromAdmin : t.teacherOf}</Badge>
            <Badge tone="gray">{open.time}</Badge>
          </div>
          <p style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.7, margin: 0 }}>{open.msg}</p>
        </div>}
      </Modal>
    </div>
  );
}

function PaymentsCollectScreen() {
  // Staff payments = collect student payments + history (reuse Students with pay focus)
  return <StudentsScreen canPay />;
}

/* ---------------------------------------------------------------------------
   PORTAL SCREENS (Student / Teacher / Parent)
--------------------------------------------------------------------------- */
const ME_STUDENT = () => STUDENTS[0] || {};
const ME_TEACHER = () => TEACHERS[0] || {};

function TimetableGrid({ teacherId, classIds }) {
  const t = useT();
  const slots = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
  const days = t.days.slice(0, 6);
  const source = teacherId
    ? PLANS.filter((p) => p.teacherId === teacherId)
    : Array.isArray(classIds)
      ? PLANS.filter((p) => classIds.includes(p.classId))
      : PLANS;
  const colorFor = (p) => {
    const palette = ["var(--grad-primary)", "var(--grad-green)", "var(--grad-amber)", "var(--grad-sky)", "var(--grad-red)"];
    return palette[(p.teacherId ? parseInt(p.teacherId.replace(/\D/g, "") || "0") : 0) % palette.length];
  };
  const [detail, setDetail] = useState(null);

  if (Array.isArray(classIds) && classIds.length === 0) {
    return (
      <Panel>
        <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--muted)" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗓️</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>Aucun emploi du temps</div>
          <div style={{ fontSize: 13 }}>Vous n'avez pas encore d'abonnement actif. Contactez l'administration pour vous inscrire à une classe.</div>
        </div>
      </Panel>
    );
  }

  return (
    <>
      <Panel pad={0}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead><tr style={{ background: "var(--grad-primary-soft)" }}>
              <th style={{ padding: 12, fontSize: 12, color: "var(--faint)" }}></th>
              {days.map((d) => <th key={d} style={{ padding: 12, fontSize: 12.5, color: "var(--primary-600)", fontWeight: 700 }}>{d}</th>)}
            </tr></thead>
            <tbody>
              {slots.map((s) => (
                <tr key={s}>
                  <td className="mono" style={{ padding: "10px 12px", fontSize: 11.5, color: "var(--faint)", fontWeight: 600, borderTop: "1px solid var(--line)" }}>{s}</td>
                  {days.map((_, di) => {
                    const p = source.find((x) => (x.days||[]).includes(di) && x.startTime.slice(0, 2) === s.slice(0, 2));
                    return <td key={di} style={{ padding: 5, verticalAlign: "top", borderTop: "1px solid var(--line)" }}>
                      {p && <motion.div whileHover={{ scale: 1.04 }} onClick={() => setDetail(p)}
                        style={{ background: colorFor(p), color: "#fff", borderRadius: 10, padding: "8px 9px", fontSize: 11, cursor: "pointer", boxShadow: "0 4px 12px -5px rgba(0,0,0,.35)" }}>
                        <b style={{ display: "block", fontSize: 11.5 }}>{p.module || p.name}</b>
                        <div style={{ opacity: 0.92, marginTop: 2 }}>👨‍🏫 {(p.teacher || "").split(" ")[0]}</div>
                        <div style={{ opacity: 0.85 }}>👥 {p.group}</div>
                        <div style={{ opacity: 0.85 }}>{p.startTime}–{p.endTime}</div>
                      </motion.div>}
                    </td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? (detail.module || detail.name) : ""} wide footer={<Btn variant="line" onClick={() => setDetail(null)}>{t.close}</Btn>}>
        {detail && <div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            <Badge tone="primary">{detail.className}</Badge><Badge tone="gray">👥 {detail.group}</Badge>
            {(detail.days||[]).map((d,i)=><Badge key={i} tone="gray">{t.days[d]}</Badge>)}<Badge tone="gray">{detail.startTime}–{detail.endTime}</Badge>
          </div>
          <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 0 }}>👨‍🏫 {detail.teacher}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Panel title={t.students}><div className="mono" style={{ fontSize: 20, fontWeight: 800 }}>{detail.students}</div></Panel>
            <Panel title={t.totalGain}><div className="mono" style={{ fontSize: 16, fontWeight: 800, color: "var(--green)" }}>{fmt(detail.gains)}</div></Panel>
            <Panel title={t.debt}><div className="mono" style={{ fontSize: 16, fontWeight: 800, color: "var(--red)" }}>{fmt(detail.debt)}</div></Panel>
          </div>
        </div>}
      </Modal>
    </>
  );
}

function StudentHome() {
  const t = useT(); const profile = useProfile();
  const s = STUDENTS.find((x) => x.id === profile?.student_id) || ME_STUDENT();
  return (
    <div>
      <PageHead icon="🏠" title={`${t.welcome}, ${s.firstName}`} sub={s.className + " · " + s.group} />
      {s.debt > 0 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ ...card, padding: 16, borderInlineStart: "4px solid var(--red)", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13.5 }}>⚠️ {t.debt}: <b className="mono" style={{ color: "var(--red)" }}>{fmt(s.debt)}</b></span>
      </motion.div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14, marginBottom: 16 }}>
        <StatCard label={t.seancesLeft} value={s.seancesRemaining ?? 0} icon="🔋" tone={s.seancesRemaining <= 2 ? "amber" : "green"} />
        <StatCard label={t.paid} value={s.paid} icon="✅" tone="green" money />
        <StatCard label={t.remaining} value={s.debt} icon="⚠️" tone="red" money />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="dash-grid">
        <Panel title={t.nextSessions}>
          {PLANS.slice(0, 4).map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.module || p.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>👨‍🏫 {(p.teacher || "").split(" ")[0]} · 👥 {p.group}</div>
              </div>
              <Badge tone="primary">{(p.days||[]).map(d=>t.days[d]).join(", ")} {p.startTime}–{p.endTime}</Badge>
            </div>
          ))}
        </Panel>
        <Panel title={t.announcements}>
          {ANNOUNCEMENTS.filter((a) => a.audience.includes("STUDENTS")).map((a) => (
            <div key={a.id} style={{ padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
              <b style={{ fontSize: 13 }}>{a.title}</b><p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>{a.date}</p>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}

function StudentPayments() {
  const t = useT(); const profile = useProfile();
  const s = STUDENTS.find((x) => x.id === profile?.student_id) || ME_STUDENT();
  return (
    <div>
      <PageHead icon="💵" title={t.payments} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14, marginBottom: 16 }}>
        <StatCard label={t.finalPrice} value={s.finalPrice} icon="🧾" money />
        <StatCard label={t.paid} value={s.paid} icon="✅" tone="green" money />
        <StatCard label={t.remaining} value={s.debt} icon="⚠️" tone={s.debt > 0 ? "red" : "green"} money />
      </div>
      <Panel title={t.history}>
        {s.payments.map((p, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 13.5 }}>
            <span>{p.date} · {t[p.method]}</span><span className="mono" style={{ color: "var(--green)", fontWeight: 700 }}>+{fmt(p.amount)}</span>
          </div>
        ))}
        {s.payments.length === 0 && <p style={{ fontSize: 13, color: "var(--muted)" }}>{t.noResults}</p>}
      </Panel>
    </div>
  );
}

function ProfileScreen({ icon, title }) {
  const t = useT();
  const [profile, setProfile] = useState(null);
  const [pUsername, setPUsername] = useState("");
  const [pFullName, setPFullName] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pPass, setPPass] = useState("");
  const [pConfirm, setPConfirm] = useState("");
  const [pBusy, setPBusy] = useState(false);

  useEffect(() => {
    let active = true;
    db.auth.myProfile().then((p) => {
      if (p && active) {
        setProfile(p);
        setPUsername(p.username || "");
        setPFullName(p.full_name || "");
        setPEmail(p.email || "");
        setPPhone(p.phone || "");
      }
    });
    return () => { active = false; };
  }, []);

  const doSaveProfile = async () => {
    if (!profile) return;
    if (pPass && pPass !== pConfirm) {
      alert("Les mots de passe ne correspondent pas !");
      return;
    }
    setPBusy(true);
    try {
      const { error } = await supabase.from("profiles")
        .update({ username: pUsername, full_name: pFullName, email: pEmail, phone: pPhone })
        .eq("id", profile.id);
      if (error) throw error;
      if (pPass) {
        const { error: authErr } = await supabase.auth.updateUser({ password: pPass });
        if (authErr) throw authErr;
        setPPass(""); setPConfirm("");
      }
      alert("Profil mis à jour avec succès !");
    } catch (e) { alert(e.message); }
    finally { setPBusy(false); }
  };

  return (
    <div>
      <PageHead icon={icon} title={title} />
      <Panel pad={22}>
        <div style={{ maxWidth: 440 }}>
          <Field label={t.username}><Input value={pUsername} onChange={(e) => setPUsername(e.target.value)} /></Field>
          <Field label="Nom complet"><Input value={pFullName} onChange={(e) => setPFullName(e.target.value)} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label={t.email}><Input value={pEmail} onChange={(e) => setPEmail(e.target.value)} /></Field>
            <Field label={t.phone}><Input value={pPhone} onChange={(e) => setPPhone(e.target.value)} /></Field>
          </div>
          <Field label={t.changePassword}><Input type="password" placeholder="••••••••" value={pPass} onChange={(e) => setPPass(e.target.value)} /></Field>
          <Field label="Confirmer"><Input type="password" placeholder="••••••••" value={pConfirm} onChange={(e) => setPConfirm(e.target.value)} /></Field>
          <Btn onClick={doSaveProfile} disabled={pBusy}>{t.save}</Btn>
        </div>
      </Panel>
    </div>
  );
}

function TeacherDashboard() {
  const t = useT();
  const profile = useProfile();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!profile?.teacher_id) { setLoading(false); return; }
    (async () => {
      try {
        await Promise.all([reloadTeachers(), reloadPlans()]);
        hydrate();
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [profile?.teacher_id]);

  const me = TEACHERS.find((x) => x.id === profile?.teacher_id) || null;
  const myPlans = me ? PLANS.filter((p) => p.teacherId === me.id) : [];
  const myClassIds = [...new Set(myPlans.map((p) => p.classId).filter(Boolean))];
  const today = new Date();
  const jsDay = today.getDay();
  const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1;
  const todayCount = myPlans.filter((p) => (p.days || []).includes(dayOfWeek)).length;
  const base = me ? (me.payModel === "FIXED" ? me.baseSalary : (me.seanceRate || 0) * 20) : 0;
  const todayStr = today.toLocaleDateString("fr-FR");

  if (loading) return <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>Chargement…</div>;

  return (
    <div>
      <PageHead icon="🏠" title={t.dashboard} sub={t.today + " · " + todayStr} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14, marginBottom: 16 }}>
        <StatCard label={t.today} value={todayCount} icon="📅" />
        <StatCard label={t.myClasses} value={myClassIds.length} icon="👥" tone="primary" />
        <StatCard label={t.mySalary} value={base} icon="💵" tone="green" money />
      </div>
      <Panel title={t.nextSessions}>
        {myPlans.length === 0
          ? <Empty title={t.noResults} hint="Aucune séance assignée à ce compte enseignant." />
          : myPlans.slice(0, 5).map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
              <div><b style={{ fontSize: 13.5 }}>{p.module || p.name}</b><p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>{p.className} · {p.group}</p></div>
              <Badge>{(p.days||[]).map(d=>t.days[d]).join(", ")} {p.startTime}</Badge>
            </div>
          ))
        }
      </Panel>
    </div>
  );
}

function AdminAttendanceScreen() {
  const t = useT();
  const profile = useProfile();
  const today = new Date();
  const dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  const [sessionDate, setSessionDate] = useState(today.toISOString().slice(0, 10));

  const selectedDayOfWeek = useMemo(() => {
    const d = new Date(sessionDate + "T00:00:00");
    const js = d.getDay();
    return js === 0 ? 6 : js - 1;
  }, [sessionDate]);

  const sessionLabel = `${dayNames[selectedDayOfWeek]} ${sessionDate.split("-").reverse().join("/")}`;

  const [todayPlans, setTodayPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planStudents, setPlanStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [debtUsed, setDebtUsed] = useState({});
  const [teacherStatus, setTeacherStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  useEffect(() => {
    db.plansForDay(selectedDayOfWeek).then((plans) => {
      setTodayPlans((plans || []).map((p) => ({
        id: p.id, name: p.name || p.module_name, module: p.module_name, className: p.class_label,
        group: p.group_name, teacher: p.teacher_name, teacherId: p.teacher_id,
        classId: p.class_id, startTime: (p.start_time || "09:00").slice(0, 5),
        endTime: (p.end_time || "10:00").slice(0, 5), days: Array.isArray(p.days_of_week) ? p.days_of_week : [],
        teacherPayModel: p.teacher_pay_model, teacherSeanceRate: p.teacher_seance_rate,
      })));
      setSelectedPlan(null); setMarks({}); setDebtUsed({});
    }).catch(() => {});
  }, [selectedDayOfWeek]);

  const selectPlan = async (plan) => {
    setSelectedPlan(plan); setMarks({}); setDebtUsed({}); setTeacherStatus(null);
    try {
      const studs = await db.studentsForPlan(plan.classId);
      setPlanStudents((studs || []).map((s) => ({
        id: s.id, firstName: s.first_name, lastName: s.last_name,
        seancesRemaining: s.seances_remaining, seancesTotal: s.seances_total,
        debtSeanceUsed: s.debt_seance_used, isFree: s.is_free || false,
      })));
    } catch (e) { alert(e.message); }
  };

  const mark = async (s, v) => {
    if (v === "PRESENT" && s.seancesRemaining === 0 && !s.isFree) {
      if (debtUsed[s.id] || marks[s.id] === "DEBT") { flash(`⛔ ${s.firstName}: ${t.debtSeanceUsed}`); return; }
      try {
        await db.consumeSeance({ id: s.id, seances_remaining: s.seancesRemaining, debt_seance_used: s.debtSeanceUsed });
      } catch (e) {
        if (e.message === "DEBT_SEANCE_USED") { flash(`⛔ ${s.firstName}: ${t.debtSeanceUsed}`); return; }
        alert(e.message); return;
      }
      setMarks((p) => ({ ...p, [s.id]: "DEBT" }));
      setDebtUsed((p) => ({ ...p, [s.id]: true }));
      flash(`🎟️ ${s.firstName}: ${t.debtSeance}`);
      return;
    }
    if (v === "PRESENT" && s.seancesRemaining > 0 && !s.isFree) {
      try { await db.consumeSeance({ id: s.id, seances_remaining: s.seancesRemaining, debt_seance_used: s.debtSeanceUsed }); }
      catch (e) { if (e.message !== "DEBT_SEANCE_USED") alert(e.message); }
    }
    setMarks((p) => ({ ...p, [s.id]: v }));
  };

  const markTeacher = async (status) => {
    if (!selectedPlan) return;
    try {
      await db.markTeacherAttendance(selectedPlan.id, selectedPlan.teacherId, sessionDate, status);
      setTeacherStatus(status);
      flash(`👨‍🏫 ${selectedPlan.teacher}: ${status}`);
    } catch (e) { alert(e.message); }
  };

  const doSave = async () => {
    if (!selectedPlan || planStudents.length === 0) return;
    setSaving(true);
    try {
      const rows = planStudents.map((s) => {
        const m = marks[s.id];
        return { plan_id: selectedPlan.id, student_id: s.id, status: m === "DEBT" ? "PRESENT" : (m || "ABSENT"), session_date: sessionDate, is_debt: m === "DEBT" };
      });
      await db.saveAttendance(rows, profile?.id);
      const presentCount = planStudents.filter((s) => { const m = marks[s.id]; return m === "PRESENT" || m === "DEBT" || m === "LATE"; }).length;
      if (teacherStatus === "PRESENT" || teacherStatus === "LATE") {
        try { await db.recordTeacherSeance(selectedPlan.teacherId, selectedPlan.id, sessionDate, presentCount, selectedPlan.teacherSeanceRate || 0); } catch (_) {}
      }
      flash("✅ " + t.saved);
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  const counts = planStudents.reduce((a, s) => {
    const m = marks[s.id];
    if (m === "PRESENT" || m === "DEBT") a.present++;
    else if (m === "LATE") a.late++;
    else if (m === "ABSENT") a.absent++;
    return a;
  }, { present: 0, late: 0, absent: 0 });

  const teacherStatusColors = { PRESENT: "green", LATE: "amber", ABSENT: "red" };

  return (
    <div>
      <PageHead icon="✅" title={t.adminAttendance} sub={sessionLabel} />

      {/* Date picker */}
      <div style={{ marginBottom: 14, maxWidth: 220 }}>
        <Field label="📅 Date de la séance">
          <input
            type="date"
            value={sessionDate}
            onChange={(e) => { setSessionDate(e.target.value); setSelectedPlan(null); setMarks({}); setDebtUsed({}); }}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13.5, fontFamily: "inherit" }}
          />
        </Field>
      </div>

      {/* Day plan tabs */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 18, flexWrap: "nowrap" }}>
        {todayPlans.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13 }}>Aucune séance aujourd'hui.</p>}
        {todayPlans.map((p) => {
          const on = selectedPlan?.id === p.id;
          return (
            <motion.button key={p.id} whileTap={{ scale: 0.96 }} onClick={() => selectPlan(p)}
              style={{ flexShrink: 0, padding: "10px 16px", borderRadius: 12, border: "1px solid " + (on ? "transparent" : "var(--line)"), background: on ? "var(--grad-primary)" : "#fff", color: on ? "#fff" : "var(--ink)", fontWeight: 700, fontSize: 12.5, cursor: "pointer", boxShadow: on ? "0 6px 16px -6px rgba(124,58,237,.5)" : "none" }}>
              <div>{p.module || p.name}</div>
              <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{p.startTime}–{p.endTime} · {p.className}</div>
            </motion.button>
          );
        })}
      </div>

      {selectedPlan && (
        <div>
          {/* Summary chips */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            {[["✅", t.present, counts.present, "green"], ["⏰", t.late, counts.late, "amber"], ["❌", t.absent, counts.absent, "red"]].map(([ic, l, n, tone]) => (
              <div key={l} style={{ ...card, padding: "10px 16px", display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 18 }}>{ic}</span>
                <div><div className="mono" style={{ fontSize: 18, fontWeight: 800, color: `var(--${tone})` }}>{n}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{l}</div></div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }} className="dash-grid">
            {/* Teacher section */}
            <Panel title={t.teacherPresence}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{selectedPlan.teacher}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  {teacherStatus && <Badge tone={teacherStatusColors[teacherStatus] || "gray"}>{teacherStatus}</Badge>}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[["PRESENT", "✅", "green"], ["LATE", "⏰", "amber"], ["ABSENT", "❌", "red"]].map(([s, ic, tone]) => (
                    <motion.button key={s} whileTap={{ scale: 0.92 }} onClick={() => markTeacher(s)}
                      style={{ padding: "8px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: "pointer", border: "1px solid " + (teacherStatus === s ? `var(--${tone})` : "var(--line)"), background: teacherStatus === s ? `var(--${tone}-bg)` : "#fff", color: teacherStatus === s ? `var(--${tone})` : "var(--muted)" }}>
                      {ic} {s === "PRESENT" ? t.present : s === "LATE" ? t.late : t.absent}
                    </motion.button>
                  ))}
                </div>
              </div>
            </Panel>

            {/* Student list */}
            <Panel title={`${t.roster} (${planStudents.length})`}>
              {planStudents.map((s, i) => {
                const m = marks[s.id];
                const zero = s.seancesRemaining === 0 && !s.isFree;
                return (
                  <motion.div key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--grad-primary-soft)", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 800, color: "var(--primary-600)" }}>{(s.firstName[0] || "") + (s.lastName[0] || "")}</div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{s.firstName} {s.lastName}</div>
                        <div style={{ display: "flex", gap: 5, marginTop: 3 }}>
                          {s.isFree ? <Badge tone="green">🎁 {t.freeStudent}</Badge> : <Badge tone={zero ? "red" : s.seancesRemaining <= 2 ? "amber" : "gray"}>{s.seancesRemaining}/{s.seancesTotal} {t.seances}</Badge>}
                          {m === "DEBT" && <Badge tone="amber">🎟️ {t.debtSeance}</Badge>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[["PRESENT", t.present, "green"], ["LATE", t.late, "amber"], ["ABSENT", t.absent, "red"]].map(([v, l, tone]) => {
                        const active = m === v || (v === "PRESENT" && m === "DEBT");
                        return (
                          <motion.button key={v} whileTap={{ scale: 0.92 }} onClick={() => mark(s, v)}
                            style={{ padding: "6px 11px", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "1px solid " + (active ? `var(--${tone})` : "var(--line)"), background: active ? `var(--${tone}-bg)` : "#fff", color: active ? `var(--${tone})` : "var(--muted)" }}>{l}</motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
              {planStudents.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13, margin: "8px 0" }}>Aucun étudiant.</p>}
              <Btn style={{ marginTop: 16 }} onClick={doSave} disabled={saving}>{saving ? "…" : "💾 " + t.save}</Btn>
            </Panel>
          </div>
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
            style={{ position: "fixed", bottom: 24, insetInlineStart: "50%", transform: "translateX(-50%)", background: "var(--ink)", color: "#fff", padding: "12px 20px", borderRadius: 999, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 12px 30px rgba(0,0,0,.3)" }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AttendanceScreen() {
  const t = useT();
  const profile = useProfile();

  const todayIso = new Date().toISOString().slice(0, 10);
  const [sessionDate, setSessionDate] = useState(todayIso);

  const selectedDayOfWeek = useMemo(() => {
    const d = new Date(sessionDate + "T00:00:00");
    const js = d.getDay();
    return js === 0 ? 6 : js - 1;
  }, [sessionDate]);

  const me = TEACHERS.find((x) => x.id === profile?.teacher_id) || null;
  const allMyPlans = me ? PLANS.filter((p) => p.teacherId === me.id) : PLANS;
  const plansForDay = allMyPlans.filter((p) => (p.days || []).includes(selectedDayOfWeek));

  const [session, setSession] = useState("");
  useEffect(() => {
    if (plansForDay.length > 0) { setSession(plansForDay[0].id); }
    else { setSession(""); }
    setMarks({});
    setDebtUsed({});
  }, [sessionDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const plan = allMyPlans.find((p) => p.id === session) || null;
  const roster = useMemo(() => {
    if (!plan) return [];
    return STUDENTS.filter((s) =>
      s.classId === plan.classId || (s.activeSubscriptions || []).some((sub) => sub.class_id === plan.classId)
    );
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  const [marks, setMarks] = useState({});
  const [debtUsed, setDebtUsed] = useState({});
  const [toast, setToast] = useState(null);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  const mark = async (s, v) => {
    if (v === "PRESENT" && s.seancesRemaining === 0 && !s.isFree) {
      if (debtUsed[s.id] || marks[s.id] === "DEBT") {
        flash(`⛔ ${s.firstName}: ${t.debtSeanceUsed}`);
        return;
      }
      try {
        await db.consumeSeance({ id: s.id, seances_remaining: s.seancesRemaining, debt_seance_used: s.debtSeanceUsed });
      } catch (e) {
        if (e.message === "DEBT_SEANCE_USED") { flash(`⛔ ${s.firstName}: ${t.debtSeanceUsed}`); return; }
        alert(e.message); return;
      }
      setMarks((p) => ({ ...p, [s.id]: "DEBT" }));
      setDebtUsed((p) => ({ ...p, [s.id]: true }));
      flash(`🎟️ ${s.firstName}: ${t.debtSeance} (-1)`);
      return;
    }
    if (v === "PRESENT" && s.seancesRemaining > 0 && !s.isFree) {
      try { await db.consumeSeance({ id: s.id, seances_remaining: s.seancesRemaining, debt_seance_used: s.debtSeanceUsed }); }
      catch (e) { if (e.message !== "DEBT_SEANCE_USED") alert(e.message); }
    }
    if (v === "LATE") {
      const parent = PARENTS.find((p) => p.children.some((c) => c.id === s.id));
      if (parent) {
        try {
          await db.addNotification({
            parent_id: parent.id, student_id: s.id, type: "late", source: "TEACHER",
            recipient_role: "PARENT", title: t.retards,
            message: `${s.firstName} ${s.lastName} · ${t.late} · ${plan ? (plan.module || plan.name) : ""}`,
          });
        } catch (_) {}
      }
      flash(`⏰ ${s.firstName}: ${t.lateNotified}`);
    }
    setMarks((p) => ({ ...p, [s.id]: v }));
  };

  const doSave = async () => {
    if (!session) return;
    const rows = roster.map((s) => {
      const m = marks[s.id];
      return { plan_id: session, student_id: s.id, status: m === "DEBT" ? "PRESENT" : (m || "ABSENT"), session_date: sessionDate, is_debt: m === "DEBT" };
    });
    try { await db.saveAttendance(rows, profile?.id); flash("✅ " + t.saved); } catch (e) { alert(e.message); }
  };

  const dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const counts = roster.reduce((a, s) => { const m = marks[s.id]; if (m === "PRESENT" || m === "DEBT") a.present++; else if (m === "LATE") a.late++; else if (m === "ABSENT") a.absent++; return a; }, { present: 0, late: 0, absent: 0 });

  return (
    <div>
      <PageHead icon="✅" title={t.attendance} sub={plan ? `${plan.module || plan.name} · ${plan.className} · ${plan.group}` : dayNames[selectedDayOfWeek]} />

      {/* Date + Session selector */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", maxWidth: 560 }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <Field label="📅 Date de la séance">
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13.5, fontFamily: "inherit" }}
            />
          </Field>
        </div>
        <div style={{ flex: 2, minWidth: 200 }}>
          <Field label={t.selectSession}>
            {plansForDay.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0" }}>
                Aucune séance ce jour — toutes les séances sont listées.
              </p>
            )}
            <Select
              value={session}
              onChange={(e) => { setSession(e.target.value); setMarks({}); setDebtUsed({}); }}
            >
              {(plansForDay.length > 0 ? plansForDay : allMyPlans).map((p) => (
                <option key={p.id} value={p.id}>
                  {(p.module || p.name)} · {(p.days||[]).map(d=>t.days[d]).join(", ")} {p.startTime}–{p.endTime}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>

      {/* summary chips */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        {[["✅", t.present, counts.present, "green"], ["⏰", t.late, counts.late, "amber"], ["❌", t.absent, counts.absent, "red"]].map(([ic, l, n, tone]) => (
          <motion.div key={l} layout style={{ ...card, padding: "10px 16px", display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 18 }}>{ic}</span>
            <div><div className="mono" style={{ fontSize: 18, fontWeight: 800, color: `var(--${tone})` }}>{n}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{l}</div></div>
          </motion.div>
        ))}
      </div>

      <Panel title={`${t.roster} (${roster.length})`}>
        {roster.map((s, i) => {
          const m = marks[s.id];
          const zero = s.seancesRemaining === 0 && !s.isFree;
          return (
            <motion.div key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--line)", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--grad-primary-soft)", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 800, color: "var(--primary-600)" }}>{s.firstName[0]}{s.lastName[0]}</div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{s.firstName} {s.lastName}</div>
                  <div style={{ display: "flex", gap: 5, marginTop: 3 }}>
                    {s.isFree
                      ? <Badge tone="green">🎁 {t.freeStudent}</Badge>
                      : <Badge tone={zero ? "red" : s.seancesRemaining <= 2 ? "amber" : "gray"}>{s.seancesRemaining}/{s.seancesTotal} {t.seances}</Badge>
                    }
                    {m === "DEBT" && <Badge tone="amber">🎟️ {t.debtSeance}</Badge>}
                    {zero && debtUsed[s.id] && m !== "DEBT" && <Badge tone="red">{t.debtSeanceUsed}</Badge>}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[["PRESENT", t.present, "green"], ["LATE", t.late, "amber"], ["ABSENT", t.absent, "red"]].map(([v, l, tone]) => {
                  const activeMark = m === v || (v === "PRESENT" && m === "DEBT");
                  return (
                    <motion.button key={v} whileTap={{ scale: 0.92 }} onClick={() => mark(s, v)}
                      style={{ padding: "6px 12px", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "1px solid " + (activeMark ? `var(--${tone})` : "var(--line)"), background: activeMark ? `var(--${tone}-bg)` : "#fff", color: activeMark ? `var(--${tone})` : "var(--muted)" }}>{l}</motion.button>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
        {roster.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13, margin: "8px 0" }}>{session ? "Aucun étudiant dans cette classe." : "Sélectionnez une séance ci-dessus."}</p>}
        {roster.length > 0 && <Btn style={{ marginTop: 16 }} onClick={doSave}>{t.save}</Btn>}
      </Panel>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
            style={{ position: "fixed", bottom: 24, insetInlineStart: "50%", transform: "translateX(-50%)", background: "var(--ink)", color: "#fff", padding: "12px 20px", borderRadius: 999, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 12px 30px rgba(0,0,0,.3)" }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TeacherSalary() {
  const t = useT();
  const profile = useProfile();
  const [me, setMe] = React.useState(TEACHERS.find((x) => x.id === profile?.teacher_id) || null);
  const [history, setHistory] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!profile?.teacher_id) { setLoading(false); return; }
    (async () => {
      try {
        await reloadTeachers();
        hydrate();
        setMe(TEACHERS.find((x) => x.id === profile.teacher_id) || null);
        const payments = await db.listTeacherSalaryPayments(profile.teacher_id).catch(() => []);
        setHistory(payments || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [profile?.teacher_id]);

  const base = me ? (me.payModel === "FIXED" ? me.baseSalary : (me.seanceRate || 0) * 20) : 0;
  const totalAcomptes = (me?.acomptes || []).reduce((s, a) => s + Number(a.amount), 0);
  const totalAbsences = (me?.absences || []).reduce((s, a) => s + Number(a.cost), 0);

  return (
    <div>
      <PageHead icon="💵" title={t.mySalary} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14, marginBottom: 16 }}>
        <StatCard label={t.salary} value={base} icon="💼" money />
        <StatCard label={t.acompte} value={totalAcomptes} icon="💵" tone="amber" money />
        <StatCard label={t.absence} value={totalAbsences} icon="📋" tone="red" money />
      </div>
      <Panel title={t.history}>
        {loading && <p style={{ color: "var(--muted)", fontSize: 13 }}>Chargement…</p>}
        {!loading && history.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: 13 }}>Aucun historique de paiement.</p>
        )}
        {history.map((pay) => (
          <div key={pay.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 13.5 }}>
            <div>
              <span style={{ fontWeight: 600 }}>{pay.period || pay.paid_at}</span>
              {pay.note && <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>{pay.note}</p>}
            </div>
            <span className="mono" style={{ color: "var(--green)", fontWeight: 700 }}>{fmt(pay.amount)}</span>
          </div>
        ))}
      </Panel>
    </div>
  );
}

function TeacherClasses() {
  const t = useT();
  const profile = useProfile();
  const [open, setOpen] = useState(null);
  const [myPlans, setMyPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    if (!profile?.teacher_id) { setLoading(false); return; }
    (async () => {
      try {
        await Promise.all([reloadTeachers(), reloadPlans()]);
        hydrate();
        setMyPlans(PLANS.filter((p) => p.teacherId === profile.teacher_id));
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [profile?.teacher_id]);

  const studentsOfPlan = (p) => STUDENTS.filter((s) =>
    s.classId === p.classId || (s.activeSubscriptions || []).some((sub) => sub.class_id === p.classId)
  );

  if (loading) return <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>Chargement…</div>;

  return (
    <div>
      <PageHead icon="👥" title={t.myClasses} />
      {myPlans.length === 0
        ? <Empty title={t.noResults} hint="Aucune séance assignée à ce compte enseignant." />
        : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
            {myPlans.map((p) => {
              const studs = studentsOfPlan(p);
              return (
                <motion.div key={p.id} whileHover={{ y: -5, boxShadow: "var(--shadow-lift)" }} className="gcard" style={{ ...card, padding: 18, cursor: "pointer" }} onClick={() => setOpen(p)}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    <Badge tone="primary">{p.className}</Badge>
                    <Badge tone="gray">👥 {p.group}</Badge>
                  </div>
                  <h3 className="serif" style={{ margin: "0 0 6px", fontSize: 16 }}>{p.module || p.name}</h3>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>{(p.days||[]).map(d=>t.days[d]).join(", ")} · {p.startTime}–{p.endTime}</p>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--primary-600)" }}>🎓 {studs.length} {t.students.toLowerCase()}</span>
                    <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{t.seeAllStudents} ›</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      }

      <Modal open={!!open} onClose={() => setOpen(null)}
        title={open ? `${open.module || open.name} · ${open.className} · ${open.group}` : ""}
        wide footer={<Btn variant="line" onClick={() => setOpen(null)}>{t.close}</Btn>}>
        {open && (() => {
          const studs = studentsOfPlan(open);
          return (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                <Badge tone="gray">{(open.days||[]).map(d=>t.days[d]).join(", ")} · {open.startTime}–{open.endTime}</Badge>
                <Badge tone="primary">🎓 {studs.length} {t.students.toLowerCase()}</Badge>
                <Badge tone="green">✅ {studs.filter((s) => s.status === "ACTIVE").length} {t.active.toLowerCase()}</Badge>
                <Badge tone="red">⌛ {studs.filter((s) => s.status === "EXPIRED").length} {t.expired.toLowerCase()}</Badge>
              </div>
              {studs.length === 0
                ? <Empty title={t.noResults} />
                : studs.map((s) => (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--grad-primary-soft)", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800, color: "var(--primary-600)" }}>{s.firstName[0]}{s.lastName[0]}</div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{s.firstName} {s.lastName}</div>
                        <div style={{ fontSize: 11.5, color: "var(--muted)" }}>👥 {s.group}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Badge tone={s.seancesRemaining <= 2 ? "amber" : "gray"}>{s.seancesRemaining ?? "∞"} {t.seances}</Badge>
                      <Badge tone={s.status === "ACTIVE" ? "green" : "red"}>{s.status === "ACTIVE" ? t.active : t.expired}</Badge>
                    </div>
                  </div>
                ))
              }
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

function ParentHome() {
  const t = useT(); const kids = STUDENTS.slice(0, 2);
  return (
    <div>
      <PageHead icon="🏠" title={t.home} sub={t.myChildren} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }} className="dash-grid">
        {kids.map((k) => (
          <Panel key={k.id} title={`${k.firstName} ${k.lastName}`}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge tone={k.status === "ACTIVE" ? "green" : "red"}>{k.status === "ACTIVE" ? t.active : t.expired}</Badge>
              {k.seancesRemaining != null && <Badge tone={k.seancesRemaining <= 2 ? "amber" : "gray"}>{k.seancesRemaining} {t.seances}</Badge>}
              {k.debt > 0 && <Badge tone="red">{fmt(k.debt)}</Badge>}
            </div>
          </Panel>
        ))}
      </div>
      <Panel title={t.announcements}>
        {ANNOUNCEMENTS.filter((a) => a.audience.includes("PARENTS")).map((a) => (
          <div key={a.id} style={{ padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
            <b style={{ fontSize: 13.5 }}>{a.title}</b><p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--muted)" }}>{a.desc}</p>
          </div>
        ))}
      </Panel>
    </div>
  );
}

function ParentChildren() {
  const t = useT(); const kids = STUDENTS.slice(0, 3);
  const [open, setOpen] = useState(null);
  // synthesize histories for a child
  const histFor = (k) => {
    const teacherPlans = PLANS.filter((p) => p.classId === k.classId);
    const teachers = [...new Set(teacherPlans.map((p) => p.teacher))];
    const presences = Array.from({ length: 6 }).map((_, i) => ({
      date: `2026-05-${String(2 + i * 4).padStart(2, "0")}`,
      module: rnd(teacherPlans).module || rnd(teacherPlans).name || "—",
      status: ["PRESENT", "PRESENT", "PRESENT", "LATE", "PRESENT", "ABSENT"][i],
    }));
    const retards = presences.filter((p) => p.status === "LATE").map((p) => ({ ...p }));
    return { teacherPlans, teachers, presences, retards };
  };
  const statusBadge = (st) => st === "PRESENT" ? <Badge tone="green">{t.present}</Badge> : st === "LATE" ? <Badge tone="amber">{t.late}</Badge> : <Badge tone="red">{t.absent}</Badge>;
  return (
    <div>
      <PageHead icon="👦" title={t.myChildren} sub={t.clickForDetails} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
        {kids.map((k) => (
          <motion.div key={k.id} whileHover={{ y: -5, boxShadow: "var(--shadow-lift)" }} className="gcard" style={{ ...card, padding: 18, cursor: "pointer" }} onClick={() => setOpen(k)}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--grad-primary)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, boxShadow: "0 6px 16px -8px rgba(124,58,237,.6)" }}>{k.firstName[0]}{k.lastName[0]}</div>
              <div><h3 style={{ margin: 0, fontSize: 15 }}>{k.firstName} {k.lastName}</h3><p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>{k.className}</p></div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
              <Badge tone={k.status === "ACTIVE" ? "green" : "red"}>{k.status === "ACTIVE" ? t.active : t.expired}</Badge>
              {k.seancesRemaining != null && <Badge tone="gray">{k.seancesRemaining}/{k.seancesTotal} {t.seances}</Badge>}
              {k.debt > 0 ? <Badge tone="red">{fmt(k.debt)}</Badge> : <Badge tone="green">{t.paid}</Badge>}
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--primary-600)", fontWeight: 700 }}>{t.childDetails} ›</div>
          </motion.div>
        ))}
      </div>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `${open.firstName} ${open.lastName}` : ""} wide footer={<Btn variant="line" onClick={() => setOpen(null)}>{t.close}</Btn>}>
        {open && (() => { const h = histFor(open); return (
          <div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              <Badge tone="primary">{open.className} · {open.group}</Badge>
              <Badge tone={open.status === "ACTIVE" ? "green" : "red"}>{open.status === "ACTIVE" ? t.active : t.expired}</Badge>
            </div>

            {/* Subscription */}
            <Panel title={t.subscriptionsHist}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{open.subType}</span>
                <span className="mono">{open.seancesRemaining}/{open.seancesTotal} {t.seances}</span>
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>
                {open.startDate && <span>{t.startDate}: <b style={{ color: "var(--ink)" }}>{open.startDate}</b></span>}
                {open.expiryDate ? <span>{t.expiryDate}: <b style={{ color: "var(--amber)" }}>{open.expiryDate}</b></span> : <span>{t.noExpiry}</span>}
                <span>{t.total}: <b style={{ color: "var(--ink)" }}>{fmt(open.finalPrice)}</b></span>
              </div>
            </Panel>

            {/* Teachers */}
            <div style={{ marginTop: 14 }}>
              <Panel title={t.teacherOf}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {h.teachers.map((tc, i) => <Badge key={i} tone="primary">👨‍🏫 {tc}</Badge>)}
                  {h.teachers.length === 0 && <span style={{ fontSize: 13, color: "var(--muted)" }}>—</span>}
                </div>
              </Panel>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }} className="dash-grid">
              {/* Payments */}
              <Panel title={t.paymentsHist}>
                {open.payments.length === 0 ? <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>{t.noResults}</p> : open.payments.map((p, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--line)", fontSize: 12.5 }}>
                    <span>{p.date} · {t[p.method]}</span><span className="mono" style={{ color: "var(--green)", fontWeight: 700 }}>+{fmt(p.amount)}</span>
                  </div>
                ))}
              </Panel>
              {/* Présences */}
              <Panel title={t.presences}>
                {h.presences.map((p, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--line)", fontSize: 12.5 }}>
                    <span>{p.date} · {p.module}</span>{statusBadge(p.status)}
                  </div>
                ))}
              </Panel>
            </div>

            {/* Retards */}
            <div style={{ marginTop: 14 }}>
              <Panel title={`${t.retards} (${h.retards.length})`}>
                {h.retards.length === 0 ? <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>{t.noResults}</p> : h.retards.map((r, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--line)", fontSize: 12.5 }}>
                    <span>⏰ {r.date} · {r.module}</span><Badge tone="amber">{t.late}</Badge>
                  </div>
                ))}
              </Panel>
            </div>
          </div>
        ); })()}
      </Modal>
    </div>
  );
}

function ParentPayments() {
  const t = useT(); const kids = STUDENTS.slice(0, 3);
  return (
    <div>
      <PageHead icon="💵" title={t.payments} />
      {kids.map((k) => (
        <div key={k.id} style={{ marginBottom: 16 }}>
          <Panel title={`${k.firstName} ${k.lastName} · ${k.debt > 0 ? t.debt + " " + fmt(k.debt) : t.noDebt}`}>
            {k.payments.map((p, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                <span>{p.date} · {t[p.method]}</span><span className="mono" style={{ color: "var(--green)", fontWeight: 700 }}>+{fmt(p.amount)}</span>
              </div>
            ))}
            {k.payments.length === 0 && <p style={{ fontSize: 13, color: "var(--muted)" }}>{t.noResults}</p>}
          </Panel>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   SCREEN ROUTER
--------------------------------------------------------------------------- */
function renderScreen(role, screen) {
  const map = {
    // Admin
    "ADMIN:dashboard": <AdminDashboard />, "ADMIN:classes": <ClassesScreen />, "ADMIN:planner": <PlannerScreen />,
    "ADMIN:subscriptions": <SubscriptionsScreen />,
    "ADMIN:students": <StudentsScreen canPay canRemoveSub />, "ADMIN:parents": <ParentsScreen />,
    "ADMIN:teachers": <PeopleScreen people={TEACHERS} kind="teacher" />, "ADMIN:staff": <PeopleScreen people={STAFF} kind="staff" />,
    "ADMIN:attendance": <AdminAttendanceScreen />,
    "ADMIN:expenses": <ExpensesScreen />, "ADMIN:announcements": <AnnouncementsScreen />,
    "ADMIN:reports": <ReportsScreen />, "ADMIN:analytics": <AnalyticsScreen />, "ADMIN:settings": <SettingsScreen />,
    // Staff
    "STAFF:dashboard": <AdminDashboard />, "STAFF:classes": <ClassesScreen />, "STAFF:planner": <PlannerScreen />, "STAFF:subscriptions": <SubscriptionsScreen />, "STAFF:students": <StudentsScreen canPay />,
    "STAFF:parents": <ParentsScreen />, "STAFF:attendance": <AdminAttendanceScreen />,
    "STAFF:payments": <PaymentsCollectScreen />,
    "STAFF:announcements": <AnnouncementsScreen />, "STAFF:notifications": <NotificationsScreen />, "STAFF:settings": <SettingsScreen ownOnly />,
    // Teacher
    "TEACHER:dashboard": <TeacherDashboard />, "TEACHER:timetable": <TimetableGrid />, "TEACHER:attendance": <AttendanceScreen />,
    "TEACHER:mySalary": <TeacherSalary />, "TEACHER:myClasses": <TeacherClasses />,
    "TEACHER:announcements": <AnnouncementsScreen audienceFilter="TEACHERS" />, "TEACHER:myProfile": <ProfileScreen icon="👤" title="My Profile" />,
    // Student
    "STUDENT:home": <StudentHome />, "STUDENT:timetable": <TimetableGrid />, "STUDENT:payments": <StudentPayments />,
    "STUDENT:announcements": <AnnouncementsScreen audienceFilter="STUDENTS" />, "STUDENT:myProfile": <ProfileScreen icon="👤" title="My Profile" />,
    // Parent
    "PARENT:home": <ParentHome />, "PARENT:myChildren": <ParentChildren />, "PARENT:timetable": <TimetableGrid />,
    "PARENT:payments": <ParentPayments />, "PARENT:notifications": <NotificationsScreen parent />,
    "PARENT:announcements": <AnnouncementsScreen audienceFilter="PARENTS" />, "PARENT:myAccount": <ProfileScreen icon="👤" title="My Account" />,
  };
  return map[`${role}:${screen}`] || <Empty title="—" />;
}

/* timetable/myProfile titles need translation — wrap profile screens */
function ProfileWrap({ which }) {
  const t = useT();
  if (which === "myProfile") return <ProfileScreen icon="👤" title={t.myProfile} />;
  return <ProfileScreen icon="👤" title={t.myAccount} />;
}

/* ---------------------------------------------------------------------------
   APP SHELL
--------------------------------------------------------------------------- */
function Shell({ role, lang, setLang, onSignOut }) {
  const t = useT(); const rtl = lang === "ar";
  const profile = useProfile();
  const meTeacher = role === "TEACHER" ? (TEACHERS.find((x) => x.id === profile?.teacher_id) || null) : null;
  const meStudent = role === "STUDENT" ? (STUDENTS.find((x) => x.id === profile?.student_id) || null) : null;
  const meParent = role === "PARENT" ? (PARENTS.find((x) => x.id === profile?.parent_id) || null) : null;
  const nav = NAV[role];
  const [active, setActive] = useState(() => {
    try {
      const saved = localStorage.getItem(`noor-screen-${role}`);
      return saved && nav.some(([k]) => k === saved) ? saved : nav[0][0];
    } catch (_) { return nav[0][0]; }
  });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  useEffect(() => { const c = () => setIsMobile(window.innerWidth < 900); c(); window.addEventListener("resize", c); return () => window.removeEventListener("resize", c); }, []);
  useEffect(() => {
    try { const saved = localStorage.getItem(`noor-screen-${role}`); if (saved && nav.some(([k]) => k === saved)) setActive(saved); else setActive(nav[0][0]); }
    catch (_) { setActive(nav[0][0]); }
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (k) => {
    setActive(k);
    try { localStorage.setItem(`noor-screen-${role}`, k); } catch (_) {}
    if (isMobile) setMobileOpen(false);
  };
  const unread = NOTIFS.filter((n) => !n.read).length;

  const sidebar = (
    <div style={{ position: "relative", width: collapsed && !isMobile ? 76 : 252, minWidth: collapsed && !isMobile ? 76 : 252, height: "100%", background: "linear-gradient(180deg,#FFFFFF 0%,#FBFAFE 100%)", borderInlineEnd: "1px solid var(--line)", display: "flex", flexDirection: "column", transition: "width .25s", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -40, insetInlineStart: -40, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,.16), transparent 70%)", filter: "blur(20px)", pointerEvents: "none", animation: "floaty 14s ease-in-out infinite" }} />
      <div style={{ position: "absolute", bottom: 40, insetInlineEnd: -50, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(217,70,239,.12), transparent 70%)", filter: "blur(22px)", pointerEvents: "none", animation: "floaty 18s ease-in-out infinite reverse" }} />
      <div style={{ position: "relative", padding: collapsed && !isMobile ? "18px 0" : "18px 20px", display: "flex", alignItems: "center", gap: 11, justifyContent: collapsed && !isMobile ? "center" : "flex-start" }}>
        <motion.div whileHover={{ rotate: -6, scale: 1.05 }} style={{ width: 40, height: 40, borderRadius: 12, background: store.SETTINGS?.logo_url ? "#fff" : "var(--grad-primary)", color: "#fff", display: "grid", placeItems: "center", fontSize: 19, boxShadow: "0 8px 20px -8px rgba(124,58,237,.6)", overflow: "hidden", flexShrink: 0 }}>
          {store.SETTINGS?.logo_url ? <img src={store.SETTINGS.logo_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : ROLE_AVATAR[role]}
        </motion.div>
        {!(collapsed && !isMobile) && <div><div className="serif grad-text" style={{ fontSize: 16.5, fontWeight: 700 }}>{store.SETTINGS?.name || t.appName}</div><div style={{ fontSize: 11, color: "var(--faint)" }}>{t.roles[role]}</div></div>}
      </div>
      <div style={{ height: 1, background: "var(--line)", margin: "0 14px" }} />
      <nav className="sms" style={{ position: "relative", flex: 1, overflowY: "auto", padding: "12px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
        {nav.map(([k, icon], i) => {
          const isA = active === k;
          return (
            <motion.button key={k} initial={{ opacity: 0, x: rtl ? 14 : -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              onClick={() => go(k)} title={t[k] || k}
              style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, border: "none", cursor: "pointer", background: isA ? "var(--grad-primary-soft)" : "transparent", color: isA ? "var(--primary-600)" : "var(--muted)", fontWeight: isA ? 700 : 600, fontSize: 13.5, justifyContent: collapsed && !isMobile ? "center" : "flex-start", textAlign: "start", boxShadow: isA ? "inset 0 0 0 1px #EADDFB" : "none" }}
              onMouseEnter={(e) => { if (!isA) e.currentTarget.style.background = "#F7F4FD"; }}
              onMouseLeave={(e) => { if (!isA) e.currentTarget.style.background = "transparent"; }}>
              {isA && <motion.span layoutId="navbar-active-bar" style={{ position: "absolute", insetInlineStart: 0, top: "50%", transform: "translateY(-50%)", width: 3.5, height: "60%", borderRadius: 4, background: "var(--grad-primary)" }} />}
              <span style={{ fontSize: 18 }}>{icon}</span>
              {!(collapsed && !isMobile) && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t[k] || k}</span>}
            </motion.button>
          );
        })}
      </nav>
     
      <div style={{ position: "relative", borderTop: "1px solid var(--line)" }}>
        {!(collapsed && !isMobile) && profile?.full_name && (
          <div style={{ padding: "10px 16px 6px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--grad-primary)", display: "grid", placeItems: "center", fontSize: 14, flexShrink: 0 }}>{ROLE_AVATAR[role]}</div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.full_name}</div>
              <div style={{ fontSize: 11, color: "var(--faint)" }}>{t.roles?.[role] || role}</div>
            </div>
          </div>
        )}
        <div style={{ padding: "0 12px 12px" }}>
          <button onClick={onSignOut} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, border: "none", cursor: "pointer", background: "transparent", color: "var(--muted)", fontWeight: 600, fontSize: 13.5, justifyContent: collapsed && !isMobile ? "center" : "flex-start" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--red-bg)"; e.currentTarget.style.color = "var(--red)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted)"; }}>
            <span style={{ fontSize: 18 }}>🚪</span>{!(collapsed && !isMobile) && t.signOut}
          </button>
        </div>
      </div>
    </div>
  );

  // adjust router for profile title screens
  let content = renderScreen(role, active);
  if (active === "myProfile" || active === "myAccount") content = <ProfileWrap which={active} />;
  if (active === "timetable") {
    const timetableClassIds = role === "STUDENT" && meStudent
      ? [...new Set([
          meStudent.classId,
          ...(meStudent.activeSubscriptions || []).map((s) => s.class_id),
        ].filter(Boolean))]
      : role === "PARENT" && meParent
        ? [...new Set(
            (meParent.children || []).flatMap((c) => [
              c.classId,
              ...(c.activeSubscriptions || []).map((s) => s.class_id),
            ]).filter(Boolean)
          )]
        : null;
    content = (
      <div>
        <PageHead icon="🗓️" title={t.timetable} sub={meTeacher ? `${meTeacher.firstName} ${meTeacher.lastName}` : meStudent ? `${meStudent.firstName} ${meStudent.lastName}` : undefined} />
        <TimetableGrid teacherId={meTeacher?.id} classIds={timetableClassIds} />
      </div>
    );
  }

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="sms app-bg" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{TOKEN_CSS}</style>
      <style>{`@media(max-width:900px){.dash-grid{grid-template-columns:1fr !important;}}`}</style>
      {/* top bar */}
      <header style={{ height: 60, background: "rgba(255,255,255,0.72)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px", flexShrink: 0, zIndex: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <motion.button whileTap={{ scale: 0.92 }} onClick={() => isMobile ? setMobileOpen((v) => !v) : setCollapsed((v) => !v)} style={{ border: "1px solid var(--line)", background: "var(--grad-primary-soft)", width: 36, height: 36, borderRadius: 10, cursor: "pointer", fontSize: 16, color: "var(--primary-600)" }}>☰</motion.button>
          <div style={{ position: "relative", width: 220 }} className="topsearch">
            <span style={{ position: "absolute", insetInlineStart: 11, top: 9, color: "var(--faint)" }}>🔍</span>
            <input placeholder={t.search} style={{ ...inputStyle, paddingInlineStart: 32, padding: "8px 12px 8px 32px" }} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative" }}>
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => setNotifOpen((v) => !v)} style={{ border: "1px solid var(--line)", background: "var(--grad-primary-soft)", width: 36, height: 36, borderRadius: 10, cursor: "pointer", fontSize: 16, position: "relative" }}>
              🔔{unread > 0 && <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2 }} style={{ position: "absolute", top: -3, insetInlineEnd: -3, background: "var(--grad-red)", color: "#fff", fontSize: 9.5, fontWeight: 800, borderRadius: 99, minWidth: 16, height: 16, display: "grid", placeItems: "center", padding: "0 3px" }}>{unread}</motion.span>}
            </motion.button>
            <AnimatePresence>
              {notifOpen && <>
                <div onClick={() => setNotifOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ position: "absolute", insetInlineEnd: 0, top: 44, ...card, width: 300, zIndex: 50, padding: 8, boxShadow: "0 18px 44px -10px rgba(76,29,149,.3)" }}>
                  {NOTIFS.slice(0, 4).map((n) => (
                    <div key={n.id} style={{ padding: "9px 10px", borderRadius: 9, fontSize: 12.5, display: "flex", gap: 8 }}>
                      <span>{{ payment: "💳", seance: "🔋", salary: "💼", announcement: "📢", attendance: "✅" }[n.type]}</span>
                      <div><div style={{ fontWeight: n.read ? 500 : 700 }}>{n.msg}</div><span style={{ fontSize: 11, color: "var(--faint)" }}>{n.time}</span></div>
                    </div>
                  ))}
                </motion.div>
              </>}
            </AnimatePresence>
          </div>
          <motion.button whileTap={{ scale: 0.92 }} onClick={() => setLang(lang === "fr" ? "ar" : "fr")} style={{ border: "1px solid #EADDFB", background: "var(--grad-primary-soft)", borderRadius: 10, padding: "8px 13px", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "var(--primary-600)" }}>{lang === "fr" ? "ع" : "FR"}</motion.button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {profile?.full_name && <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.full_name}</span>}
            <motion.div whileHover={{ scale: 1.06 }} className="sheen" style={{ width: 36, height: 36, borderRadius: 10, background: "var(--grad-primary)", display: "grid", placeItems: "center", fontSize: 17, boxShadow: "0 6px 16px -8px rgba(124,58,237,.6)" }}>{ROLE_AVATAR[role]}</motion.div>
          </div>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", minHeight: 0, position: "relative" }}>
        {!isMobile && sidebar}
        <AnimatePresence>
          {isMobile && mobileOpen && <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} style={{ position: "fixed", inset: 0, top: 60, background: "rgba(15,23,42,.4)", zIndex: 35 }} />
            <motion.div initial={{ x: rtl ? 260 : -260 }} animate={{ x: 0 }} exit={{ x: rtl ? 260 : -260 }} transition={{ type: "spring", damping: 28, stiffness: 300 }} style={{ position: "fixed", top: 60, bottom: 0, insetInlineStart: 0, zIndex: 40 }}>{sidebar}</motion.div>
          </>}
        </AnimatePresence>
        <main className="sms" style={{ flex: 1, overflowY: "auto", padding: "26px 30px" }}>
          <AnimatePresence mode="wait">
            <motion.div key={`${role}-${active}-${lang}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              {content}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   LOGIN
--------------------------------------------------------------------------- */
function Login({ lang, setLang, onLogin }) {
  const t = useT(); const rtl = lang === "ar";
  const roles = ["ADMIN", "STAFF", "TEACHER", "STUDENT", "PARENT"];
  const [mode, setMode] = useState("login"); // "login" | "signup"
  // login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authErr, setAuthErr] = useState("");
  const [busy, setBusy] = useState(false);
  // signup state
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPass, setSuPass] = useState("");
  const [suRole, setSuRole] = useState("ADMIN");

  const doSignIn = async () => {
    if (!email || !password) return;
    setBusy(true); setAuthErr("");
    try {
      const { error } = await db.auth.signIn(email, password);
      if (error) throw error;
      const profile = await db.auth.myProfile();
      if (!profile) throw new Error("Profil introuvable. Veuillez contacter l'administrateur.");
      onLogin(profile.role, profile);
    } catch (e) { setAuthErr(e.message); } finally { setBusy(false); }
  };

  const doSignUp = async () => {
    if (!suName || !suEmail || !suPass) { setAuthErr("Tous les champs sont requis."); return; }
    setBusy(true); setAuthErr("");
    try {
      const { error } = await db.auth.signUp(suEmail, suPass, { role: suRole, full_name: suName });
      if (error) throw error;
      const { error: siErr } = await db.auth.signIn(suEmail, suPass);
      if (siErr) throw siErr;
      const profile = await db.auth.myProfile();
      if (!profile) throw new Error("Compte créé. Vérifiez votre email pour confirmer, puis reconnectez-vous.");
      onLogin(profile.role, profile);
    } catch (e) { setAuthErr(e.message); } finally { setBusy(false); }
  };

  const switchMode = (m) => { setMode(m); setAuthErr(""); };

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="sms" style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "linear-gradient(120deg,#EEF0FF 0%,#F3EEFF 45%,#FDEEFB 100%)", backgroundSize: "200% 200%", animation: "auroraShift 18s ease infinite", padding: 20 }}>
      <style>{TOKEN_CSS}</style>
      {/* floating gradient orbs */}
      <div style={{ position: "absolute", top: "-8%", insetInlineStart: "-6%", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,.35), transparent 65%)", filter: "blur(40px)", animation: "floaty 13s ease-in-out infinite" }} />
      <div style={{ position: "absolute", bottom: "-10%", insetInlineEnd: "-4%", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(217,70,239,.28), transparent 65%)", filter: "blur(50px)", animation: "floaty 16s ease-in-out infinite reverse" }} />
      <div style={{ position: "absolute", top: "40%", insetInlineStart: "55%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,189,248,.18), transparent 65%)", filter: "blur(44px)", animation: "floaty 20s ease-in-out infinite" }} />
      <div style={{ position: "absolute", top: 20, insetInlineEnd: 20, display: "flex", gap: 6, zIndex: 2 }}>
        {[["fr", "Français"], ["ar", "العربية"]].map(([l, lbl]) => (
          <button key={l} onClick={() => setLang(l)} style={{ border: "1px solid " + (lang === l ? "transparent" : "var(--line)"), background: lang === l ? "var(--grad-primary)" : "rgba(255,255,255,.7)", color: lang === l ? "#fff" : "var(--muted)", borderRadius: 999, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>{lbl}</button>
        ))}
      </div>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 424 }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ position: "relative", width: 64, height: 64, margin: "0 auto 14px" }}>
            <div style={{ position: "absolute", inset: -8, borderRadius: 26, background: "var(--grad-primary)", filter: "blur(14px)", opacity: 0.5, animation: "pulseGlow 3s ease-in-out infinite" }} />
            <motion.div initial={{ scale: 0.8, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 12 }}
              style={{ position: "relative", width: 64, height: 64, borderRadius: 20, background: store.SETTINGS?.logo_url ? "#fff" : "var(--grad-primary)", color: "#fff", display: "grid", placeItems: "center", fontSize: 30, boxShadow: "0 16px 36px -12px rgba(124,58,237,.7)", overflow: "hidden" }}>
              {store.SETTINGS?.logo_url ? <img src={store.SETTINGS.logo_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🎓"}
            </motion.div>
          </div>
          <h1 className="serif grad-text" style={{ margin: 0, fontSize: 32 }}>{store.SETTINGS?.name || t.appName}</h1>
          <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "var(--muted)" }}>{t.tagline}</p>
        </div>
        <div style={{ ...card, padding: 28, background: "rgba(255,255,255,0.82)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", boxShadow: "0 24px 60px -20px rgba(109,40,217,.3)" }}>
          {mode === "login" ? (
            <>
              <h2 className="serif" style={{ margin: "0 0 18px", fontSize: 20, color: "var(--ink)" }}>{t.login}</h2>
              <Field label={t.email}><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@noor.edu" onKeyDown={(e) => e.key === "Enter" && doSignIn()} /></Field>
              <Field label={t.password}><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && doSignIn()} /></Field>
              {authErr && <p style={{ color: "var(--red)", fontSize: 13, margin: "0 0 10px", lineHeight: 1.5 }}>{authErr}</p>}
              <Btn style={{ width: "100%", justifyContent: "center", marginTop: 4, padding: "12px" }} disabled={busy} onClick={doSignIn}>{busy ? "…" : t.signIn}</Btn>
            </>
          ) : (
            <>
              <h2 className="serif" style={{ margin: "0 0 18px", fontSize: 20, color: "var(--ink)" }}>Créer un compte</h2>
              <Field label="Nom complet"><Input value={suName} onChange={(e) => setSuName(e.target.value)} placeholder="Ex: Mohammed Amine" /></Field>
              <Field label={t.email}><Input type="email" value={suEmail} onChange={(e) => setSuEmail(e.target.value)} placeholder="admin@noor.edu" /></Field>
              <Field label={t.password}><Input type="password" value={suPass} onChange={(e) => setSuPass(e.target.value)} placeholder="••••••••" /></Field>
              <Field label="Rôle">
                <Select value={suRole} onChange={(e) => setSuRole(e.target.value)}>
                  {roles.map((r) => <option key={r} value={r}>{t.roles[r]}</option>)}
                </Select>
              </Field>
              {authErr && <p style={{ color: "var(--red)", fontSize: 13, margin: "0 0 10px", lineHeight: 1.5 }}>{authErr}</p>}
              <Btn style={{ width: "100%", justifyContent: "center", marginTop: 4, padding: "12px" }} disabled={busy} onClick={doSignUp}>{busy ? "…" : "Créer le compte"}</Btn>
              <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--muted)", margin: "16px 0 0" }}>
                <span style={{ color: "var(--primary-600)", fontWeight: 700, cursor: "pointer" }} onClick={() => switchMode("login")}>← Retour à la connexion</span>
              </p>
            </>
          )}
        </div>
        {(store.SETTINGS?.address || store.SETTINGS?.phone || store.SETTINGS?.email) && (
          <div style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: "var(--muted)", display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", opacity: 0.8 }}>
            {store.SETTINGS.address && <span>📍 {store.SETTINGS.address}</span>}
            {store.SETTINGS.phone && <span>📞 {store.SETTINGS.phone}</span>}
            {store.SETTINGS.email && <span>✉️ {store.SETTINGS.email}</span>}
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   ROOT
--------------------------------------------------------------------------- */
export const RefreshCtx = createContext(() => {});
export const useRefresh = () => useContext(RefreshCtx);
export const ProfileCtx = createContext(null);
export const useProfile = () => useContext(ProfileCtx);

export default function App() {
  const [lang, setLang] = useState("fr");
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const value = useMemo(() => I18N[lang], [lang]);

  const refresh = React.useCallback(async () => {
    try {
      setError(null);
      await loadAll();
      hydrate();
      if (store.SETTINGS?.name) {
        document.title = store.SETTINGS.name;
      }
      setVersion((v) => v + 1);
    } catch (e) {
      console.error(e);
      setError(e?.message || "Erreur de connexion à Supabase");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await db.auth.getSession();
        if (session) {
          const prof = await db.auth.myProfile();
          if (prof?.role) { setRole(prof.role); setProfile(prof); }
        }
      } catch (_) {}
      await refresh();
      if (store.SETTINGS?.name) {
        document.title = store.SETTINGS.name;
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!role) return;
    let timeout = null;
    const debouncedRefresh = () => { clearTimeout(timeout); timeout = setTimeout(() => refresh(), 800); };
    const unsubscribe = subscribeToRealtime(debouncedRefresh);
    return () => { unsubscribe(); clearTimeout(timeout); };
  }, [role, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignOut = async () => {
    try { await db.auth.signOut(); } catch (_) {}
    setRole(null); setProfile(null);
  };
  const handleLogin = async (roleIn, profileIn) => { setRole(roleIn); if (profileIn) setProfile(profileIn); await refresh(); };

  const screen = (() => {
    if (loading) return <BootScreen text="Chargement des données…" />;
    if (error) return <BootScreen error={error} onRetry={refresh} />;
    return role
      ? <Shell role={role} lang={lang} setLang={setLang} onSignOut={handleSignOut} />
      : <Login lang={lang} setLang={setLang} onLogin={handleLogin} />;
  })();

  return (
    <I18nCtx.Provider value={value}>
      <ProfileCtx.Provider value={profile}>
        <RefreshCtx.Provider value={refresh}>{screen}</RefreshCtx.Provider>
      </ProfileCtx.Provider>
    </I18nCtx.Provider>
  );
}

function BootScreen({ text, error, onRetry }) {
  return (
    <div className="sms app-bg" style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      <style>{TOKEN_CSS}</style>
      <div style={{ textAlign: "center", padding: 30 }}>
        <div style={{ width: 64, height: 64, margin: "0 auto 18px", borderRadius: 20, background: "var(--grad-primary)", display: "grid", placeItems: "center", fontSize: 30, boxShadow: "0 16px 36px -12px rgba(124,58,237,.7)" }}>🎓</div>
        {error ? (
          <>
            <h2 className="serif" style={{ color: "var(--ink)", margin: "0 0 8px" }}>Connexion impossible</h2>
            <p style={{ color: "var(--muted)", maxWidth: 380, fontSize: 13.5 }}>{error}</p>
            <button onClick={onRetry} style={{ marginTop: 14, border: "none", background: "var(--grad-primary)", color: "#fff", padding: "10px 20px", borderRadius: 12, fontWeight: 700, cursor: "pointer" }}>Réessayer</button>
          </>
        ) : (
          <>
            <div style={{ width: 34, height: 34, margin: "0 auto", border: "3px solid #E9E2FB", borderTopColor: "#8B5CF6", borderRadius: "50%", animation: "spinSlow .8s linear infinite" }} />
            <p style={{ color: "var(--muted)", marginTop: 14, fontSize: 13.5 }}>{text}</p>
          </>
        )}
      </div>
    </div>
  );
}
