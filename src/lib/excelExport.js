// ============================================================================
//  excelExport.js — Excel export utilities for Académie Noor
//  Exports students, subscriptions, and financial data to .xlsx format
// ============================================================================
import * as XLSX from 'xlsx';

/**
 * Export students with comprehensive details to Excel
 * @param {Array} students - Array of student objects with payments and subscriptions
 * @param {Object} options - Filter and export options
 * @param {string} options.startDate - Start date (YYYY-MM-DD)
 * @param {string} options.endDate - End date (YYYY-MM-DD)
 * @param {string} options.schoolName - School name for header
 * @param {boolean} options.includePayments - Include payment details
 * @param {boolean} options.includeSubscriptions - Include subscription details
 * @param {Array} options.payments - All payment records
 */
export async function exportStudentsToExcel(students, options = {}) {
  const {
    startDate = null,
    endDate = null,
    schoolName = 'Académie Noor',
    includePayments = true,
    includeSubscriptions = true,
    payments = [],
  } = options;

  // Create a new workbook with multiple sheets
  const wb = XLSX.utils.book_new();

  // ===== Sheet 1: Comprehensive Student Details =====
  const studentsData = students.map((s) => {
    const discount = (s.subPrice * s.discountPct) / 100 || 0;
    const paymentRate = s.finalPrice > 0 ? (s.paid / s.finalPrice) * 100 : 0;
    const remainingSeances = (s.seancesTotal || 0) - (s.seancesRemaining || 0);
    
    return {
      'N° ID': s.id?.slice(0, 12) || '',
      'Prénom': s.firstName || '',
      'Nom': s.lastName || '',
      'Classe': s.className || '',
      'Groupe': s.group || '',
      'Statut': s.status || 'ACTIVE',
      'Date de naissance': s.birthDate || '',
      'Lieu de naissance': s.birthPlace || '',
      'Numéro d\'identité': s.idCard || '',
      'Numéro scolaire': s.schoolNum || '',
      'Forfait': s.subType || 'N/A',
      'Séances (Total)': s.seancesTotal || 0,
      'Séances (Utilisées)': remainingSeances || 0,
      'Séances (Restantes)': s.seancesRemaining || 0,
      'Prix du forfait': s.subPrice || 0,
      'Remise (%)': s.discountPct || 0,
      'Montant remise': discount,
      'Prix final': s.finalPrice || 0,
      'Montant payé': s.paid || 0,
      'Montant restant (Dette)': s.debt || 0,
      'Taux de paiement (%)': paymentRate.toFixed(2),
      'Date de début': s.startDate || '',
      'Date d\'expiration': s.expiryDate || '',
      'Crédits utilisé': s.debtSeanceUsed ? 'Oui' : 'Non',
    };
  });

  const wsStudents = XLSX.utils.json_to_sheet(studentsData);
  wsStudents['!cols'] = [
    { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
    { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(wb, wsStudents, 'Détails Étudiants');

  // ===== Sheet 2: Detailed Subscriptions =====
  if (includeSubscriptions) {
    const subsData = students
      .filter(s => s.subType)
      .map((s) => {
        const seancesUsed = (s.seancesTotal || 0) - (s.seancesRemaining || 0);
        const pricePerSeance = s.seancesTotal > 0 ? s.finalPrice / s.seancesTotal : 0;
        const daysRemaining = s.expiryDate 
          ? Math.max(0, Math.floor((new Date(s.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)))
          : 'N/A';
        
        return {
          'Étudiant': `${s.firstName} ${s.lastName}`,
          'N° ID': s.id?.slice(0, 12) || '',
          'Classe': s.className || '',
          'Forfait': s.subType || '',
          'Séances (Total)': s.seancesTotal || 0,
          'Séances (Utilisées)': seancesUsed || 0,
          'Séances (Restantes)': s.seancesRemaining || 0,
          'Taux Utilisation (%)': s.seancesTotal > 0 ? ((seancesUsed / s.seancesTotal) * 100).toFixed(2) : 0,
          'Prix/Séance': pricePerSeance.toFixed(2),
          'Prix Total': s.finalPrice || 0,
          'Payé': s.paid || 0,
          'Reste à payer': s.debt || 0,
          'Date de début': s.startDate || '',
          'Date d\'expiration': s.expiryDate || '',
          'Jours restants': daysRemaining,
          'Statut': s.status || 'ACTIVE',
        };
      });

    if (subsData.length > 0) {
      const wsSubscriptions = XLSX.utils.json_to_sheet(subsData);
      wsSubscriptions['!cols'] = [
        { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 18 },
        { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
        { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
        { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
      ];
      XLSX.utils.book_append_sheet(wb, wsSubscriptions, 'Forfaits Détaillés');
    }
  }

  // ===== Sheet 3: Detailed Financial Summary =====
  if (includePayments) {
    const financialData = students.map((s) => {
      const discountAmount = (s.subPrice * s.discountPct) / 100 || 0;
      const paymentPercentage = s.finalPrice > 0 ? ((s.paid / s.finalPrice) * 100).toFixed(2) : 0;
      const paymentStatus = s.paid >= s.finalPrice ? 'PAYÉ COMPLET' : 
                           s.paid > 0 ? 'PARTIELLEMENT PAYÉ' : 'NON PAYÉ';
      
      return {
        'Étudiant': `${s.firstName} ${s.lastName}`,
        'N° ID': s.id?.slice(0, 12) || '',
        'Classe': s.className || '',
        'Forfait': s.subType || '',
        'Prix initial': s.subPrice || 0,
        'Remise (%)': s.discountPct || 0,
        'Montant remise': discountAmount,
        'Prix final': s.finalPrice || 0,
        'Montant payé': s.paid || 0,
        'Taux de paiement (%)': paymentPercentage,
        'Montant restant': s.debt || 0,
        'Statut du paiement': paymentStatus,
        'Statut étudiant': s.status || 'ACTIVE',
        'Date de début': s.startDate || '',
        'Date d\'expiration': s.expiryDate || '',
      };
    });

    const wsFinancial = XLSX.utils.json_to_sheet(financialData);
    wsFinancial['!cols'] = [
      { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
      { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 14 },
      { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 16 },
      { wch: 14 }, { wch: 14 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, wsFinancial, 'Finances Détaillées');
  }

  // ===== Sheet 4: Payment History =====
  if (includePayments && payments && payments.length > 0) {
    const paymentsData = payments
      .filter(p => {
        if (!startDate || !endDate) return true;
        const pDate = new Date(p.paid_at);
        return pDate >= new Date(startDate) && pDate <= new Date(endDate);
      })
      .map((p) => ({
        'Date': p.paid_at || '',
        'Étudiant': p.students?.first_name ? `${p.students.first_name} ${p.students.last_name}` : 'N/A',
        'N° ID': p.students?.id_card || '',
        'Montant': p.amount || 0,
        'Méthode': p.method || 'cash',
        'Collecteur': p.collected_by || '',
        'Collecteur ID': p.collector_name || '',
        'Note': p.note || '',
      }));

    if (paymentsData.length > 0) {
      const wsPayments = XLSX.utils.json_to_sheet(paymentsData);
      wsPayments['!cols'] = [
        { wch: 14 }, { wch: 22 }, { wch: 14 },
        { wch: 12 }, { wch: 12 }, { wch: 18 },
        { wch: 16 }, { wch: 20 },
      ];
      XLSX.utils.book_append_sheet(wb, wsPayments, 'Historique Paiements');
    }
  }

  // ===== Sheet 5: Summary Statistics =====
  const stats = calculateSummaryStats(students);
  const summaryData = [
    { 'Statistique': 'Total Étudiants', 'Valeur': stats.totalStudents },
    { 'Statistique': 'Étudiants Actifs', 'Valeur': stats.activeStudents },
    { 'Statistique': 'Étudiants Expirés', 'Valeur': stats.expiredStudents },
    { 'Statistique': 'Revenu Total', 'Valeur': stats.totalRevenue.toFixed(2) },
    { 'Statistique': 'Montant Payé', 'Valeur': stats.totalPaid.toFixed(2) },
    { 'Statistique': 'Montant Due (Dette)', 'Valeur': stats.totalDebt.toFixed(2) },
    { 'Statistique': 'Prix Moyen', 'Valeur': stats.averagePrice.toFixed(2) },
    { 'Statistique': 'Taux de Paiement (%)', 'Valeur': stats.paymentRate.toFixed(2) },
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');

  // Generate filename with date range
  const dateStr = startDate && endDate
    ? `_${startDate}_to_${endDate}`
    : `_${new Date().toISOString().slice(0, 10)}`;
  const filename = `${schoolName}_export${dateStr}.xlsx`;

  // Save the workbook
  XLSX.writeFile(wb, filename);
  return filename;
}

/**
 * Export teachers with detailed salary information
 */
export async function exportTeachersToExcel(teachers, schoolName = 'Académie Noor') {
  const wb = XLSX.utils.book_new();

  const teachersData = teachers.map((t) => ({
    'Prénom': t.firstName || '',
    'Nom': t.lastName || '',
    'Email': t.email || '',
    'Téléphone': t.phone || '',
    'Modèle de paie': t.payModel || 'FIXED',
    'Salaire de base': t.baseSalary || 0,
    'Tarif par séance': t.seanceRate || 0,
    'Modules enseignés': Array.isArray(t.modules) ? t.modules.join(', ') : '',
    'Mois impayés': t.unpaidMonths || 0,
    'Nombre acomptes': (t.acomptes || []).length,
    'Total acomptes': (t.acomptes || []).reduce((sum, a) => sum + (a.amount || 0), 0),
  }));

  const ws = XLSX.utils.json_to_sheet(teachersData);
  ws['!cols'] = [
    { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 20 },
    { wch: 12 }, { wch: 14 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Enseignants');

  const filename = `${schoolName}_teachers_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}

/**
 * Export staff with salary details
 */
export async function exportStaffToExcel(staff, schoolName = 'Académie Noor') {
  const wb = XLSX.utils.book_new();

  const staffData = staff.map((s) => ({
    'Prénom': s.firstName || '',
    'Nom': s.lastName || '',
    'Position': s.position || '',
    'Email': s.email || '',
    'Téléphone': s.phone || '',
    'Salaire de base': s.baseSalary || 0,
    'Mois impayés': s.unpaidMonths || 0,
    'Nombre acomptes': (s.acomptes || []).length,
    'Total acomptes': (s.acomptes || []).reduce((sum, a) => sum + (a.amount || 0), 0),
  }));

  const ws = XLSX.utils.json_to_sheet(staffData);
  ws['!cols'] = [
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 },
    { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Administration');

  const filename = `${schoolName}_staff_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}

/**
 * Export classes with student statistics
 */
export async function exportClassesToExcel(classes, schoolName = 'Académie Noor') {
  const wb = XLSX.utils.book_new();

  const classesData = classes.map((c) => ({
    'Classe': c.year || c.name || '',
    'Type': c.type || 'COURSES',
    'Niveau': c.level || '',
    'Description': c.desc || '',
    'Nombre d\'étudiants': c.students || 0,
    'Nombre de groupes': c.groups || 0,
  }));

  const ws = XLSX.utils.json_to_sheet(classesData);
  ws['!cols'] = [
    { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
    { wch: 16 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Classes');

  const filename = `${schoolName}_classes_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}

/**
 * Export attendance with detailed records
 */
export async function exportAttendanceToExcel(attendance, schoolName = 'Académie Noor') {
  const wb = XLSX.utils.book_new();

  const attendanceData = attendance.map((a) => ({
    'Date': a.date || '',
    'Étudiant': a.studentName || '',
    'Classe': a.className || '',
    'Module': a.module || '',
    'Statut': a.status || 'PRESENT',
    'Groupe': a.group || '',
    'À crédit': a.is_debt ? 'Oui' : 'Non',
  }));

  const ws = XLSX.utils.json_to_sheet(attendanceData);
  ws['!cols'] = [
    { wch: 12 }, { wch: 20 }, { wch: 14 },
    { wch: 16 }, { wch: 12 }, { wch: 12 },
    { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Présences');

  const filename = `${schoolName}_attendance_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}

/**
 * Export expenses with breakdown
 */
export async function exportExpensesToExcel(expenses, schoolName = 'Académie Noor') {
  const wb = XLSX.utils.book_new();

  // Sheet 1: All expenses
  const expensesData = expenses.map((e) => ({
    'Date': e.date || '',
    'Catégorie': e.category || '',
    'Description': e.name || '',
    'Montant': e.amount || 0,
  }));

  const wsExpenses = XLSX.utils.json_to_sheet(expensesData);
  wsExpenses['!cols'] = [
    { wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'Dépenses');

  // Sheet 2: Summary by category
  const categoryTotals = {};
  expenses.forEach((e) => {
    const cat = e.category || 'Autre';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + (e.amount || 0);
  });

  const categorySummary = Object.entries(categoryTotals).map(([cat, total]) => ({
    'Catégorie': cat,
    'Montant total': total,
    'Pourcentage': ((total / expenses.reduce((sum, e) => sum + (e.amount || 0), 0)) * 100).toFixed(2),
  }));

  const wsSummary = XLSX.utils.json_to_sheet(categorySummary);
  wsSummary['!cols'] = [
    { wch: 16 }, { wch: 14 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé Catégories');

  const filename = `${schoolName}_expenses_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}

/**
 * Filter students by date range
 * @param {Array} students - All students
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 */
export function filterStudentsByDateRange(students, startDate, endDate) {
  if (!startDate || !endDate) return students;

  const start = new Date(startDate);
  const end = new Date(endDate);

  return students.filter((s) => {
    const subStart = s.startDate ? new Date(s.startDate) : null;
    const subEnd = s.expiryDate ? new Date(s.expiryDate) : null;

    // Include students who have subscription overlap with date range
    if (subStart && subEnd) {
      return (subStart <= end) && (subEnd >= start);
    }
    return true;
  });
}

/**
 * Filter students by status
 * @param {Array} students - All students
 * @param {string} status - Filter by status (ACTIVE, EXPIRED, SUSPENDED)
 */
export function filterStudentsByStatus(students, status) {
  if (!status || status === 'ALL') return students;
  return students.filter((s) => s.status === status);
}

/**
 * Filter students by class
 * @param {Array} students - All students
 * @param {string} classId - Filter by class ID
 */
export function filterStudentsByClass(students, classId) {
  if (!classId) return students;
  return students.filter((s) => s.classId === classId);
}

/**
 * Calculate summary statistics
 * @param {Array} students - Filtered students
 */
export function calculateSummaryStats(students) {
  const totalStudents = students.length;
  const totalRevenue = students.reduce((sum, s) => sum + (s.finalPrice || 0), 0);
  const totalPaid = students.reduce((sum, s) => sum + (s.paid || 0), 0);
  const totalDebt = students.reduce((sum, s) => sum + (s.debt || 0), 0);
  const activeStudents = students.filter((s) => s.status === 'ACTIVE').length;
  const expiredStudents = students.filter((s) => s.status === 'EXPIRED').length;

  return {
    totalStudents,
    activeStudents,
    expiredStudents,
    totalRevenue,
    totalPaid,
    totalDebt,
    averagePrice: totalStudents > 0 ? totalRevenue / totalStudents : 0,
    paymentRate: totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0,
  };
}
