/* ===== CAISSE – SALLE NUMÉRIQUE UNILU ===== */
/* Core Application Logic */

const CaisseApp = (() => {
  const STORAGE_KEY = 'caisse_unilu_transactions';

  function getTransactions() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveTransactions(transactions) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }

  function addTransaction(transaction) {
    const transactions = getTransactions();
    const newTransaction = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      ...transaction,
      date: new Date().toISOString(),
      timestamp: Date.now()
    };
    transactions.unshift(newTransaction);
    saveTransactions(transactions);
    return newTransaction;
  }

  function deleteTransaction(id) {
    const transactions = getTransactions().filter(t => t.id !== id);
    saveTransactions(transactions);
  }

  function getStats() {
    const transactions = getTransactions();
    const totalEntrees = transactions
      .filter(t => t.type === 'entree')
      .reduce((sum, t) => sum + t.montant, 0);
    const totalSorties = transactions
      .filter(t => t.type === 'sortie')
      .reduce((sum, t) => sum + t.montant, 0);
    const solde = totalEntrees - totalSorties;
    const nbEntrees = transactions.filter(t => t.type === 'entree').length;
    const nbSorties = transactions.filter(t => t.type === 'sortie').length;
    return { totalEntrees, totalSorties, solde, nbEntrees, nbSorties, total: transactions.length };
  }

  function getFilteredTransactions(filters = {}) {
    let transactions = getTransactions();
    if (filters.type && filters.type !== 'all') {
      transactions = transactions.filter(t => t.type === filters.type);
    }
    if (filters.categorie && filters.categorie !== 'all') {
      transactions = transactions.filter(t => t.categorie === filters.categorie);
    }
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      from.setHours(0, 0, 0, 0);
      transactions = transactions.filter(t => new Date(t.date) >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      transactions = transactions.filter(t => new Date(t.date) <= to);
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      transactions = transactions.filter(t =>
        (t.motif && t.motif.toLowerCase().includes(s)) ||
        (t.categorie && t.categorie.toLowerCase().includes(s)) ||
        (t.description && t.description.toLowerCase().includes(s)) ||
        (t.nom && t.nom.toLowerCase().includes(s)) ||
        (t.postnom && t.postnom.toLowerCase().includes(s)) ||
        (t.prenom && t.prenom.toLowerCase().includes(s)) ||
        (t.personnel && t.personnel.toLowerCase().includes(s))
      );
    }
    return transactions;
  }

  function getRecentTransactions(limit = 5) {
    return getTransactions().slice(0, limit);
  }

  function getDailyStats(days = 7) {
    const transactions = getTransactions();
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);
      const dayTx = transactions.filter(t => {
        const td = new Date(t.date);
        return td >= d && td < nextD;
      });
      result.push({
        date: d,
        label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
        entrees: dayTx.filter(t => t.type === 'entree').reduce((s, t) => s + t.montant, 0),
        sorties: dayTx.filter(t => t.type === 'sortie').reduce((s, t) => s + t.montant, 0)
      });
    }
    return result;
  }

  // ===== CLOSURE SYSTEM =====
  const CLOSURE_KEY = 'caisse_unilu_closures';

  function getClosures() {
    try { return JSON.parse(localStorage.getItem(CLOSURE_KEY)) || {}; } catch { return {}; }
  }

  function saveClosures(closures) {
    localStorage.setItem(CLOSURE_KEY, JSON.stringify(closures));
  }

  function isDayClosed(dateStr) {
    const key = dateStr || new Date().toISOString().split('T')[0];
    return !!getClosures()[key];
  }

  function getClosureData(dateStr) {
    return getClosures()[dateStr] || null;
  }

  function closeDay(dateStr) {
    const key = dateStr || new Date().toISOString().split('T')[0];
    if (isDayClosed(key)) return null;

    const from = new Date(key); from.setHours(0, 0, 0, 0);
    const to = new Date(key); to.setHours(23, 59, 59, 999);
    const dayTx = getTransactions().filter(t => {
      const d = new Date(t.date);
      return d >= from && d <= to;
    });

    const entrees = dayTx.filter(t => t.type === 'entree').reduce((s, t) => s + t.montant, 0);
    const sorties = dayTx.filter(t => t.type === 'sortie').reduce((s, t) => s + t.montant, 0);

    const closure = {
      date: key,
      closedAt: new Date().toISOString(),
      totalEntrees: entrees,
      totalSorties: sorties,
      solde: entrees - sorties,
      nbTransactions: dayTx.length,
      transactions: dayTx
    };

    const closures = getClosures();
    closures[key] = closure;
    saveClosures(closures);
    return closure;
  }

  function isTransactionLocked(transaction) {
    const txDate = new Date(transaction.date).toISOString().split('T')[0];
    return isDayClosed(txDate);
  }

  // Override deleteTransaction to check closure
  function deleteTransaction(id) {
    const transactions = getTransactions();
    const tx = transactions.find(t => t.id === id);
    if (tx && isTransactionLocked(tx)) {
      return false; // locked
    }
    saveTransactions(transactions.filter(t => t.id !== id));
    return true;
  }

  return {
    getTransactions, addTransaction, deleteTransaction, getStats,
    getFilteredTransactions, getRecentTransactions, getDailyStats,
    isDayClosed, closeDay, getClosureData, isTransactionLocked, getClosures
  };
})();

// ===== UTILITIES =====
function formatMontant(amount) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FC';
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(dateStr) {
  return formatDate(dateStr) + ' à ' + formatTime(dateStr);
}

function getCategorieLabel(cat) {
  const labels = {
    'internet': 'Internet',
    'impression': 'Impression',
    'formation': 'Formation',
    'retrait': 'Retrait',
    'autre': 'Autre'
  };
  return labels[cat] || cat;
}

function getCurrentDate() {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ===== TOAST =====
function showToast(type, title, message) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { 
    success: '<i class="fa-solid fa-circle-check"></i>', 
    error: '<i class="fa-solid fa-circle-xmark"></i>', 
    warning: '<i class="fa-solid fa-triangle-exclamation"></i>', 
    info: '<i class="fa-solid fa-circle-info"></i>' 
  };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.closest('.toast').remove()">✕</button>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ===== SIDEBAR =====
function initSidebar() {
  const toggle = document.querySelector('.mobile-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }
  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === currentPage) link.classList.add('active');
  });
}

// ===== CHART =====
function renderChart(containerId, data) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const maxVal = Math.max(...data.map(d => Math.max(d.entrees, d.sorties)), 1);
  let barsHTML = '';
  let labelsHTML = '';
  data.forEach(d => {
    const eH = Math.max((d.entrees / maxVal) * 180, 4);
    const sH = Math.max((d.sorties / maxVal) * 180, 4);
    barsHTML += `
      <div style="display:flex; flex:1; gap:3px; align-items:flex-end;">
        <div class="chart-bar" style="height:${eH}px" title="Entrées: ${formatMontant(d.entrees)}"></div>
        <div class="chart-bar secondary" style="height:${sH}px" title="Sorties: ${formatMontant(d.sorties)}"></div>
      </div>`;
    labelsHTML += `<div class="chart-label">${d.label}</div>`;
  });
  container.innerHTML = `
    <div class="chart-container">${barsHTML}</div>
    <div class="chart-labels">${labelsHTML}</div>
    <div class="chart-legend">
      <div class="chart-legend-item"><div class="chart-legend-dot" style="background:var(--primary)"></div> Entrées</div>
      <div class="chart-legend-item"><div class="chart-legend-dot" style="background:#D0D0E0"></div> Sorties</div>
    </div>`;
}

// ===== MODAL =====
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('active');
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('active');
}

// ===== PRINT =====
function printPage() { window.print(); }

// ===== EXPORT CSV =====
function exportCSV(transactions, filename) {
  const headers = ['Date', 'Heure', 'Type', 'Catégorie', 'Nom', 'Post-nom', 'Prénom', 'Promotion', 'Personnel', 'Motif', 'Montant (FC)'];
  const rows = transactions.map(t => [
    formatDate(t.date), formatTime(t.date),
    t.type === 'entree' ? 'Entrée' : 'Sortie',
    t.categorie || '', t.nom || '', t.postnom || '', t.prenom || '',
    t.promotion || '', t.personnel || '',
    t.motif || t.description || '', t.montant
  ]);
  const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'caisse_export.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('success', 'Export réussi', 'Le fichier CSV a été téléchargé.');
}

// ===== PDF RECEIPT GENERATION =====
function generateReceipt(transaction) {
  const isEntree = transaction.type === 'entree';
  const who = isEntree
    ? [transaction.nom, transaction.postnom, transaction.prenom].filter(Boolean).join(' ')
    : (transaction.personnel || 'N/A');
  const receiptNum = transaction.id.toUpperCase();

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Reçu ${receiptNum}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1a1a2e; }
  .receipt { max-width: 400px; margin: 0 auto; border: 2px solid #CC0000; border-radius: 12px; overflow: hidden; }
  .receipt-header { background: #CC0000; color: white; padding: 20px; text-align: center; }
  .receipt-header h1 { font-size: 18px; font-weight: 800; margin-bottom: 4px; }
  .receipt-header p { font-size: 12px; opacity: 0.85; }
  .receipt-body { padding: 20px; }
  .receipt-number { text-align: center; font-size: 11px; color: #888; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px dashed #ddd; }
  .receipt-type { text-align: center; margin-bottom: 16px; }
  .receipt-type span { display: inline-block; padding: 6px 20px; border-radius: 20px; font-size: 13px; font-weight: 700; }
  .type-entree { background: #e8f5e9; color: #2e7d32; }
  .type-sortie { background: #fce4ec; color: #c62828; }
  .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
  .receipt-row:last-child { border-bottom: none; }
  .receipt-label { color: #666; font-weight: 500; }
  .receipt-value { font-weight: 600; color: #1a1a2e; text-align: right; max-width: 55%; }
  .receipt-amount { text-align: center; margin: 20px 0; padding: 16px; background: #f8f8fc; border-radius: 10px; }
  .receipt-amount .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  .receipt-amount .value { font-size: 28px; font-weight: 800; color: ${isEntree ? '#2e7d32' : '#c62828'}; }
  .receipt-footer { padding: 16px 20px; border-top: 1px dashed #ddd; text-align: center; }
  .receipt-footer p { font-size: 11px; color: #999; line-height: 1.5; }
  .receipt-footer .sig { margin-top: 24px; padding-top: 12px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
  @media print {
    body { padding: 0; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <div class="receipt">
    <div class="receipt-header">
      <h1>CAISSE — SALLE NUMÉRIQUE</h1>
      <p>Université de Lubumbashi (UNILU)</p>
    </div>
    <div class="receipt-body">
      <div class="receipt-number">REÇU N° ${receiptNum}</div>
      <div class="receipt-type">
        <span class="${isEntree ? 'type-entree' : 'type-sortie'}">${isEntree ? 'ENTRÉE' : 'SORTIE / RETRAIT'}</span>
      </div>
      <div class="receipt-row"><span class="receipt-label">Date</span><span class="receipt-value">${formatDate(transaction.date)}</span></div>
      <div class="receipt-row"><span class="receipt-label">Heure</span><span class="receipt-value">${formatTime(transaction.date)}</span></div>
      <div class="receipt-row"><span class="receipt-label">${isEntree ? 'Nom complet' : 'Personnel'}</span><span class="receipt-value">${who}</span></div>
      ${isEntree && transaction.promotion ? `<div class="receipt-row"><span class="receipt-label">Promotion</span><span class="receipt-value">${transaction.promotion}</span></div>` : ''}
      <div class="receipt-row"><span class="receipt-label">${isEntree ? 'Service' : 'Motif'}</span><span class="receipt-value">${isEntree ? getCategorieLabel(transaction.categorie) : transaction.motif}</span></div>
      ${transaction.description ? `<div class="receipt-row"><span class="receipt-label">Détails</span><span class="receipt-value">${transaction.description}</span></div>` : ''}
      <div class="receipt-amount">
        <div class="label">Montant ${isEntree ? 'payé' : 'retiré'}</div>
        <div class="value">${formatMontant(transaction.montant)}</div>
      </div>
    </div>
    <div class="receipt-footer">
      <p>Ce reçu a été généré automatiquement par le système de caisse<br>de la Salle Numérique de l'UNILU.</p>
      <div class="sig">
        Signature Caissière : ___________________
      </div>
    </div>
  </div>
  <div class="no-print" style="text-align:center; margin-top:20px;">
    <button onclick="window.print()" style="padding:10px 30px; background:#CC0000; color:white; border:none; border-radius:8px; font-size:14px; cursor:pointer; font-weight:600;">Imprimer le reçu</button>
  </div>
</body></html>`;

  const win = window.open('', '_blank', 'width=500,height=700');
  win.document.write(html);
  win.document.close();
}

// ===== DAILY REPORT PDF =====
function generateDailyReport(dateStr) {
  const key = dateStr || new Date().toISOString().split('T')[0];
  const from = new Date(key); from.setHours(0, 0, 0, 0);
  const to = new Date(key); to.setHours(23, 59, 59, 999);

  const allTx = CaisseApp.getTransactions().filter(t => {
    const d = new Date(t.date);
    return d >= from && d <= to;
  });

  const entrees = allTx.filter(t => t.type === 'entree');
  const sorties = allTx.filter(t => t.type === 'sortie');
  const totalIn = entrees.reduce((s, t) => s + t.montant, 0);
  const totalOut = sorties.reduce((s, t) => s + t.montant, 0);
  const solde = totalIn - totalOut;
  const isClosed = CaisseApp.isDayClosed(key);
  const dateLabel = new Date(key).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  let rowsHTML = allTx.map((t, i) => {
    const who = t.type === 'entree'
      ? [t.nom, t.postnom, t.prenom].filter(Boolean).join(' ')
      : (t.personnel || '');
    return `<tr>
      <td style="padding:8px 12px; border-bottom:1px solid #eee; font-size:12px;">${i + 1}</td>
      <td style="padding:8px 12px; border-bottom:1px solid #eee; font-size:12px;">${formatTime(t.date)}</td>
      <td style="padding:8px 12px; border-bottom:1px solid #eee; font-size:12px;">
        <span style="padding:3px 10px; border-radius:12px; font-size:11px; font-weight:600; background:${t.type === 'entree' ? '#e8f5e9' : '#fce4ec'}; color:${t.type === 'entree' ? '#2e7d32' : '#c62828'};">
          ${t.type === 'entree' ? 'Entrée' : 'Sortie'}
        </span>
      </td>
      <td style="padding:8px 12px; border-bottom:1px solid #eee; font-size:12px;">${who}</td>
      <td style="padding:8px 12px; border-bottom:1px solid #eee; font-size:12px;">${t.motif || getCategorieLabel(t.categorie)}</td>
      <td style="padding:8px 12px; border-bottom:1px solid #eee; font-size:12px; text-align:right; font-weight:600; color:${t.type === 'entree' ? '#2e7d32' : '#c62828'};">
        ${t.type === 'entree' ? '+' : '-'}${formatMontant(t.montant)}
      </td>
    </tr>`;
  }).join('');

  if (allTx.length === 0) {
    rowsHTML = '<tr><td colspan="6" style="padding:30px; text-align:center; color:#999; font-size:14px;">Aucune transaction pour cette journée</td></tr>';
  }

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Rapport journalier — ${dateLabel}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1a1a2e; }
  .report { max-width: 800px; margin: 0 auto; }
  .report-header { border-bottom: 3px solid #CC0000; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
  .report-header h1 { font-size: 22px; color: #CC0000; font-weight: 800; }
  .report-header p { font-size: 13px; color: #666; }
  .report-date { font-size: 14px; font-weight: 600; color: #1a1a2e; text-align: right; }
  .report-date small { display: block; font-weight: 400; color: #888; font-size: 11px; }
  .status { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-top: 6px; }
  .status-closed { background: #e8f5e9; color: #2e7d32; }
  .status-open { background: #fff3e0; color: #e65100; }
  .summary { display: flex; gap: 16px; margin-bottom: 24px; }
  .summary-card { flex: 1; padding: 18px; border-radius: 10px; border: 1px solid #eee; }
  .summary-card .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; }
  .summary-card .value { font-size: 24px; font-weight: 800; }
  .val-green { color: #2e7d32; }
  .val-red { color: #c62828; }
  .val-blue { color: #CC0000; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #CC0000; border-bottom: 2px solid #CC0000; background: rgba(204,0,0,0.03); }
  .report-footer { border-top: 1px solid #eee; padding-top: 20px; display: flex; justify-content: space-between; }
  .sig-block { text-align: center; min-width: 200px; }
  .sig-block .line { border-top: 1px solid #333; margin-top: 40px; padding-top: 6px; font-size: 12px; color: #666; }
  @media print { body { padding: 15px; } .no-print { display: none !important; } }
</style>
</head>
<body>
<div class="report">
  <div class="report-header">
    <div>
      <h1>RAPPORT JOURNALIER — CAISSE</h1>
      <p>Salle Numérique — Université de Lubumbashi (UNILU)</p>
    </div>
    <div class="report-date">
      ${dateLabel}
      <small>Généré le ${getCurrentDate()}</small>
      <span class="status ${isClosed ? 'status-closed' : 'status-open'}">${isClosed ? '<i class="fa-solid fa-lock"></i> CLÔTURÉ' : '<i class="fa-solid fa-lock-open"></i> NON CLÔTURÉ'}</span>
    </div>
  </div>

  <div class="summary">
    <div class="summary-card"><div class="label">Total Entrées</div><div class="value val-green">${formatMontant(totalIn)}</div></div>
    <div class="summary-card"><div class="label">Total Sorties</div><div class="value val-red">${formatMontant(totalOut)}</div></div>
    <div class="summary-card"><div class="label">Solde du jour</div><div class="value val-blue">${formatMontant(solde)}</div></div>
    <div class="summary-card"><div class="label">Transactions</div><div class="value">${allTx.length}</div></div>
  </div>

  <table>
    <thead>
      <tr><th>N°</th><th>Heure</th><th>Type</th><th>Personne / Personnel</th><th>Motif</th><th style="text-align:right;">Montant</th></tr>
    </thead>
    <tbody>${rowsHTML}</tbody>
  </table>

  <div class="report-footer">
    <div class="sig-block">
      <div class="line">Signature Caissière</div>
    </div>
    <div class="sig-block">
      <div class="line">Signature Super Administrateur</div>
    </div>
  </div>
</div>

<div class="no-print" style="text-align:center; margin-top:24px;">
  <button onclick="window.print()" style="padding:12px 32px; background:#CC0000; color:white; border:none; border-radius:8px; font-size:14px; cursor:pointer; font-weight:600;">Imprimer le rapport</button>
</div>
</body></html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(html);
  win.document.close();
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  const dateEl = document.getElementById('current-date');
  if (dateEl) dateEl.textContent = getCurrentDate();
});
