/**
 * TRADEAXIS GLOBAL VENTURES — COMMAND PORTAL CLIENT
 * Core Controller for Authentication, Commercial Inquiries CRM, Catalog CMS, and Supabase Sync.
 */

// Global State Store
const STATE = {
  token: null,
  inquiries: [],
  products: [],
  news: [],
  activeInquiry: null,
  currentTab: 'overview'
};

// ==========================================================================
// 1. LIFECYCLE & INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initNavigation();
  initModals();
  initSearchAndFilters();
  initForms();
});

// Helper: Make authenticated API requests
async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(STATE.token ? { 'x-admin-password': STATE.token } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(endpoint, {
    ...options,
    headers
  });

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }

  return res;
}

// ==========================================================================
// 2. AUTHENTICATION & SESSION MANAGEMENT
// ==========================================================================
function initAuth() {
  const loginGate = document.getElementById('loginGate');
  const adminApp = document.getElementById('adminApp');
  const loginForm = document.getElementById('loginForm');
  const passwordInput = document.getElementById('adminPasswordInput');
  const toggleBtn = document.getElementById('togglePasswordBtn');
  const loginError = document.getElementById('loginError');
  const logoutBtn = document.getElementById('logoutBtn');

  // Toggle password visibility
  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      toggleBtn.style.color = isPassword ? 'var(--gold)' : 'var(--text-muted)';
    });
  }

  // Check saved session
  const savedToken = sessionStorage.getItem('tradeaxis_admin_token');
  if (savedToken) {
    STATE.token = savedToken;
    apiFetch('/api/auth')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          unlockPortal();
        } else {
          sessionStorage.removeItem('tradeaxis_admin_token');
        }
      })
      .catch(() => {
        sessionStorage.removeItem('tradeaxis_admin_token');
      });
  }

  // Handle Login Submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError.style.display = 'none';
      const submitBtn = document.getElementById('loginSubmitBtn');
      const originalText = submitBtn.innerHTML;

      const password = passwordInput.value.trim();
      if (!password) return;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Verifying...</span>';

      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });

        const data = await res.json();
        if (res.ok && data.authenticated) {
          STATE.token = password;
          sessionStorage.setItem('tradeaxis_admin_token', password);
          unlockPortal();
          showToast('Welcome to TradeAxis Command Portal');
        } else {
          loginError.style.display = 'flex';
          passwordInput.select();
        }
      } catch (err) {
        loginError.style.display = 'flex';
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }

  // Handle Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('tradeaxis_admin_token');
      STATE.token = null;
      window.location.reload();
    });
  }
}

function unlockPortal() {
  const loginGate = document.getElementById('loginGate');
  const adminApp = document.getElementById('adminApp');
  if (loginGate) loginGate.style.display = 'none';
  if (adminApp) adminApp.style.display = 'flex';

  loadAllData();
}

function handleUnauthorized() {
  sessionStorage.removeItem('tradeaxis_admin_token');
  STATE.token = null;
  const loginGate = document.getElementById('loginGate');
  const adminApp = document.getElementById('adminApp');
  if (loginGate) loginGate.style.display = 'flex';
  if (adminApp) adminApp.style.display = 'none';
  showToast('Session expired. Please re-authenticate.');
}

// ==========================================================================
// 3. NAVIGATION & TABS
// ==========================================================================
function initNavigation() {
  const tabButtons = document.querySelectorAll('.nav-tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  const mobileToggle = document.getElementById('mobileSidebarToggle');
  const sidebar = document.getElementById('portalSidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  const refreshBtn = document.getElementById('refreshAllBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadAllData();
      showToast('Data refreshed');
    });
  }
}

function switchTab(tabName) {
  STATE.currentTab = tabName;
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `tab-${tabName}`);
  });

  // Close mobile sidebar if open
  const sidebar = document.getElementById('portalSidebar');
  if (sidebar) sidebar.classList.remove('open');
}

// ==========================================================================
// 4. DATA FETCHING & RENDERING
// ==========================================================================
async function loadAllData() {
  try {
    await Promise.all([
      fetchStatus(),
      fetchInquiries(),
      fetchProducts(),
      fetchNews()
    ]);
    renderOverview();
  } catch (err) {
    console.error('Data load error:', err);
  }
}

async function fetchStatus() {
  try {
    const res = await apiFetch('/api/status');
    const data = await res.json();

    const badge = document.getElementById('dbStatusBadge');
    const badgeText = document.getElementById('dbStatusText');
    const settingsMode = document.getElementById('settingsStorageMode');
    const settingsUrl = document.getElementById('settingsSupabaseUrl');

    if (data.supabaseConfigured) {
      if (badge) badge.classList.add('connected');
      if (badgeText) badgeText.textContent = 'Supabase Cloud';
      if (settingsMode) {
        settingsMode.textContent = 'Supabase Cloud (PostgreSQL)';
        settingsMode.className = 'badge-pill gold';
      }
      if (settingsUrl && data.supabaseUrl) {
        settingsUrl.textContent = data.supabaseUrl;
      }
    } else {
      if (badge) badge.classList.remove('connected');
      if (badgeText) badgeText.textContent = 'Local Store (Fallback)';
      if (settingsMode) {
        settingsMode.textContent = 'Local Persistent JSON Store';
        settingsMode.className = 'badge-pill';
      }
      if (settingsUrl) {
        settingsUrl.textContent = 'Not configured in Vercel environment';
      }
    }
  } catch (err) {
    console.warn('Status fetch error:', err);
  }
}

async function fetchInquiries() {
  try {
    const res = await apiFetch('/api/inquiries');
    const data = await res.json();
    if (!res.ok) {
      console.warn('Inquiries fetch error:', data);
      STATE.inquiries = [];
      const tbody = document.getElementById('inquiriesTableBody');
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="table-empty" style="color:#b91c1c; padding: 2rem 1rem;">
          <div style="font-weight:600; margin-bottom:0.4rem;">⚠️ Supabase Table Notice: ${escapeHtml(data.error || 'Inquiry query failed')}</div>
          <div style="font-size:0.82rem; color:var(--text-muted); max-width:600px; margin:0 auto;">${escapeHtml(data.details || 'Execute supabase-schema.sql in your Supabase SQL Editor to initialize the inquiries table.')}</div>
        </td></tr>`;
      }
      return;
    }
    STATE.inquiries = data.inquiries || [];
    renderInquiriesTable();

    // Update unread counter badge
    const newCount = STATE.inquiries.filter(i => i.status === 'new').length;
    const badge = document.getElementById('unreadCountBadge');
    if (badge) {
      badge.textContent = newCount;
      badge.style.display = newCount > 0 ? 'inline-block' : 'none';
    }
  } catch (err) {
    console.warn('Inquiries fetch error:', err);
  }
}

async function fetchProducts() {
  try {
    const res = await apiFetch('/api/products');
    const data = await res.json();
    if (!res.ok) {
      console.warn('Products fetch error:', data);
      STATE.products = [];
      const tbody = document.getElementById('productsTableBody');
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty" style="color:#b91c1c; padding: 2rem 1rem;">
          <div style="font-weight:600; margin-bottom:0.4rem;">⚠️ Supabase Table Notice: ${escapeHtml(data.error || 'Product query failed')}</div>
          <div style="font-size:0.82rem; color:var(--text-muted); max-width:600px; margin:0 auto;">${escapeHtml(data.details || 'Execute supabase-schema.sql in your Supabase SQL Editor to initialize the products table.')}</div>
        </td></tr>`;
      }
      return;
    }
    STATE.products = data.products || [];
    renderProductsTable();
  } catch (err) {
    console.warn('Products fetch error:', err);
  }
}

async function fetchNews() {
  try {
    const res = await apiFetch('/api/news');
    const data = await res.json();
    STATE.news = data.news || [];
    renderNewsTable();
  } catch (err) {
    console.warn('News fetch error:', err);
  }
}

// ==========================================================================
// 5. RENDER FUNCTIONS
// ==========================================================================
function renderOverview() {
  const totalInquiries = STATE.inquiries.length;
  const pendingInquiries = STATE.inquiries.filter(i => i.status === 'new').length;
  const totalProducts = STATE.products.length;
  const totalNews = STATE.news.length;

  document.getElementById('statTotalInquiries').textContent = totalInquiries;
  document.getElementById('statPendingInquiries').textContent = pendingInquiries;
  document.getElementById('statTotalProducts').textContent = totalProducts;
  document.getElementById('statTotalNews').textContent = totalNews;

  // Render recent 5 inquiries in overview
  const recent = STATE.inquiries.slice(0, 5);
  const tbody = document.getElementById('overviewRecentTableBody');
  if (!tbody) return;

  if (recent.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No commercial enquiries recorded yet.</td></tr>';
    return;
  }

  tbody.innerHTML = recent.map(item => `
    <tr>
      <td>${formatDate(item.created_at)}</td>
      <td>
        <strong>${escapeHtml(item.full_name || 'Prospect')}</strong>
        <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(item.company_name || 'Individual')}</div>
      </td>
      <td>${escapeHtml(item.product_requirement || item.subject || 'Trade Enquiry')}</td>
      <td><span class="badge-status ${item.status || 'new'}">${formatStatus(item.status)}</span></td>
      <td>
        <button class="btn-text-gold" onclick="viewInquiryDetail('${item.id}')">View Details →</button>
      </td>
    </tr>
  `).join('');
}

function renderInquiriesTable() {
  const tbody = document.getElementById('inquiriesTableBody');
  if (!tbody) return;

  const statusFilter = document.getElementById('inquiryStatusFilter')?.value || 'all';
  const search = (document.getElementById('inquirySearchInput')?.value || '').toLowerCase().trim();

  const filtered = STATE.inquiries.filter(item => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (search) {
      const hay = [
        item.full_name,
        item.company_name,
        item.email,
        item.phone,
        item.product_requirement,
        item.volume_port,
        item.subject,
        item.message
      ].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No enquiries match the current filter criteria.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(item => `
    <tr>
      <td>
        <div>${formatDate(item.created_at)}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${formatTime(item.created_at)}</div>
      </td>
      <td>
        <div style="font-weight:600; color:var(--text-primary);">${escapeHtml(item.full_name || 'Anonymous')}</div>
        <div style="font-size:0.8rem; color:var(--text-secondary);">${escapeHtml(item.company_name || 'Undisclosed Entity')}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(item.email || '')} ${item.phone ? '• ' + escapeHtml(item.phone) : ''}</div>
      </td>
      <td>
        <div style="font-weight:500;">${escapeHtml(item.product_requirement || item.subject || 'Enquiry')}</div>
      </td>
      <td>
        <div>${escapeHtml(item.volume_port || '—')}</div>
      </td>
      <td>
        <span class="badge-status ${item.status || 'new'}">${formatStatus(item.status)}</span>
      </td>
      <td>
        <div class="action-btn-row">
          <button class="btn-icon" title="View & Edit Lead" onclick="viewInquiryDetail('${item.id}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="btn-icon delete" title="Delete Lead" onclick="deleteInquiryRecord('${item.id}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderProductsTable() {
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;

  if (STATE.products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No catalog items defined. Click "Add New Product" to create one.</td></tr>';
    return;
  }

  tbody.innerHTML = STATE.products.map(item => `
    <tr>
      <td>
        <strong style="color:var(--text-primary);">${escapeHtml(item.name)}</strong>
        <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(item.specs || item.description || '').slice(0, 70)}...</div>
      </td>
      <td><span class="badge-pill">${escapeHtml(item.category || 'general')}</span></td>
      <td>${escapeHtml(item.division || '—')}</td>
      <td><span class="code-pill">${escapeHtml(item.badge || 'Standard')}</span></td>
      <td>${item.is_featured ? '⭐ Featured' : '—'}</td>
      <td>
        <div class="action-btn-row">
          <button class="btn-icon" title="Edit Product" onclick="openEditProductModal('${item.id}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon delete" title="Delete Product" onclick="deleteProductRecord('${item.id}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderNewsTable() {
  const tbody = document.getElementById('newsTableBody');
  if (!tbody) return;

  if (STATE.news.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No market intelligence articles published yet.</td></tr>';
    return;
  }

  tbody.innerHTML = STATE.news.map(item => `
    <tr>
      <td>
        <strong style="color:var(--text-primary);">${escapeHtml(item.title)}</strong>
        <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(item.excerpt || '').slice(0, 80)}...</div>
      </td>
      <td><span class="badge-pill">${escapeHtml(item.category || 'Market Trends')}</span></td>
      <td>${escapeHtml(item.publish_date || '—')}</td>
      <td>${escapeHtml(item.read_time || '3 min read')}</td>
      <td>${item.published !== false ? '🟢 Published' : '⚪ Draft'}</td>
      <td>
        <div class="action-btn-row">
          <button class="btn-icon" title="Edit Article" onclick="openEditNewsModal('${item.id}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon delete" title="Delete Article" onclick="deleteNewsRecord('${item.id}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ==========================================================================
// 6. INQUIRY DETAIL MODAL & CRM ACTIONS
// ==========================================================================
window.viewInquiryDetail = function(id) {
  const item = STATE.inquiries.find(x => x.id === id);
  if (!item) return;

  STATE.activeInquiry = item;

  document.getElementById('modalInquiryName').textContent = item.full_name || 'Prospect';
  document.getElementById('modalInquiryDate').textContent = `Submitted: ${formatDate(item.created_at)} at ${formatTime(item.created_at)}`;
  document.getElementById('modalInquiryCompany').textContent = item.company_name || '—';
  document.getElementById('modalInquiryEmail').textContent = item.email || '—';
  document.getElementById('modalInquiryPhone').textContent = item.phone || '—';
  document.getElementById('modalInquiryType').textContent = item.inquiry_type === 'rfq' ? 'Request for Quotation (RFQ)' : 'General Commercial Inquiry';
  document.getElementById('modalInquiryProduct').textContent = item.product_requirement || item.subject || '—';
  document.getElementById('modalInquiryVolume').textContent = item.volume_port || 'Not specified';
  document.getElementById('modalInquiryMessage').textContent = item.message || 'No additional message text provided.';

  document.getElementById('modalAdminNotes').value = item.admin_notes || '';
  document.getElementById('modalStatusSelect').value = item.status || 'new';

  openModal('inquiryDetailModal');
};

async function saveInquiryChanges() {
  if (!STATE.activeInquiry) return;
  const id = STATE.activeInquiry.id;
  const notes = document.getElementById('modalAdminNotes').value;
  const status = document.getElementById('modalStatusSelect').value;

  try {
    const res = await apiFetch('/api/inquiries', {
      method: 'PATCH',
      body: JSON.stringify({
        id,
        admin_notes: notes,
        status
      })
    });

    if (res.ok) {
      showToast('Lead status & notes updated');
      closeModal('inquiryDetailModal');
      await fetchInquiries();
      renderOverview();
    } else {
      showToast('Error updating lead');
    }
  } catch (err) {
    showToast('Failed to update inquiry');
  }
}

window.deleteInquiryRecord = async function(id) {
  if (!confirm('Are you sure you wish to delete this inquiry record? This action cannot be undone.')) {
    return;
  }

  try {
    const res = await apiFetch(`/api/inquiries?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      showToast('Inquiry removed');
      closeModal('inquiryDetailModal');
      await fetchInquiries();
      renderOverview();
    }
  } catch (err) {
    showToast('Failed to delete inquiry');
  }
};

// ==========================================================================
// 7. PRODUCT MODAL & CMS ACTIONS
// ==========================================================================
window.openAddProductModal = function() {
  document.getElementById('productModalTitle').textContent = 'Add Catalog Product';
  document.getElementById('prodFormId').value = '';
  document.getElementById('productForm').reset();
  openModal('productModal');
};

window.openEditProductModal = function(id) {
  const item = STATE.products.find(x => x.id === id);
  if (!item) return;

  document.getElementById('productModalTitle').textContent = 'Edit Catalog Product';
  document.getElementById('prodFormId').value = item.id;
  document.getElementById('prodFormName').value = item.name || '';
  document.getElementById('prodFormCategory').value = item.category || 'jute';
  document.getElementById('prodFormBadge').value = item.badge || '';
  document.getElementById('prodFormDivision').value = item.division || '';
  document.getElementById('prodFormDesc').value = item.description || '';
  document.getElementById('prodFormSpecs').value = item.specs || '';
  document.getElementById('prodFormFeatured').checked = Boolean(item.is_featured);

  openModal('productModal');
};

window.deleteProductRecord = async function(id) {
  if (!confirm('Are you sure you want to delete this product from the catalog?')) return;
  try {
    const res = await apiFetch(`/api/products?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Product removed');
      await fetchProducts();
      renderOverview();
    }
  } catch (err) {
    showToast('Failed to delete product');
  }
};

// ==========================================================================
// 8. NEWS MODAL & CMS ACTIONS
// ==========================================================================
window.openAddNewsModal = function() {
  document.getElementById('newsModalTitle').textContent = 'Publish News Article';
  document.getElementById('newsFormId').value = '';
  document.getElementById('newsForm').reset();
  const editor = document.getElementById('newsFormEditor');
  if (editor) editor.innerHTML = '';
  document.getElementById('newsFormContent').value = '';
  openModal('newsModal');
};

window.openEditNewsModal = function(id) {
  const item = STATE.news.find(x => x.id === id);
  if (!item) return;

  document.getElementById('newsModalTitle').textContent = 'Edit News Article';
  document.getElementById('newsFormId').value = item.id;
  document.getElementById('newsFormTitle').value = item.title || '';
  document.getElementById('newsFormCategory').value = item.category || 'Company News';
  document.getElementById('newsFormReadTime').value = item.read_time || '3 min read';
  document.getElementById('newsFormExcerpt').value = item.excerpt || '';
  
  const editor = document.getElementById('newsFormEditor');
  if (editor) {
    editor.innerHTML = item.content || '';
  }
  document.getElementById('newsFormContent').value = item.content || '';

  openModal('newsModal');
};

window.deleteNewsRecord = async function(id) {
  if (!confirm('Are you sure you want to delete this article?')) return;
  try {
    const res = await apiFetch(`/api/news?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Article removed');
      await fetchNews();
      renderOverview();
    }
  } catch (err) {
    showToast('Failed to delete article');
  }
};

function initRte() {
  const toolbar = document.getElementById('newsRteToolbar');
  const editor = document.getElementById('newsFormEditor');
  if (!toolbar || !editor) return;

  toolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('.rte-btn');
    if (!btn) return;
    e.preventDefault();
    editor.focus();

    const cmd = btn.getAttribute('data-cmd');
    const val = btn.getAttribute('data-val');

    if (cmd === 'createLink') {
      const url = prompt('Enter URL (e.g. https://example.com):', 'https://');
      if (url && url !== 'https://') {
        document.execCommand(cmd, false, url);
      }
    } else if (cmd === 'formatBlock') {
      document.execCommand(cmd, false, val);
    } else {
      document.execCommand(cmd, false, null);
    }
    syncEditor();
  });

  editor.addEventListener('input', syncEditor);
  editor.addEventListener('blur', syncEditor);

  function syncEditor() {
    const hidden = document.getElementById('newsFormContent');
    if (hidden && editor) {
      hidden.value = editor.innerHTML;
    }
  }
}

// ==========================================================================
// 9. FORMS & CSV EXPORT
// ==========================================================================
function initForms() {
  initRte();

  // Detail modal save
  document.getElementById('saveInquiryModalBtn')?.addEventListener('click', saveInquiryChanges);
  document.getElementById('deleteInquiryModalBtn')?.addEventListener('click', () => {
    if (STATE.activeInquiry) deleteInquiryRecord(STATE.activeInquiry.id);
  });

  // Product Form
  document.getElementById('addProductBtn')?.addEventListener('click', openAddProductModal);
  document.getElementById('productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('prodFormId').value;
    const payload = {
      id: id || undefined,
      name: document.getElementById('prodFormName').value.trim(),
      category: document.getElementById('prodFormCategory').value,
      badge: document.getElementById('prodFormBadge').value.trim(),
      division: document.getElementById('prodFormDivision').value.trim(),
      description: document.getElementById('prodFormDesc').value.trim(),
      specs: document.getElementById('prodFormSpecs').value.trim(),
      is_featured: document.getElementById('prodFormFeatured').checked
    };

    try {
      const res = await apiFetch('/api/products', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(id ? 'Product updated' : 'Product created');
        closeModal('productModal');
        await fetchProducts();
        renderOverview();
      }
    } catch (err) {
      showToast('Failed to save product');
    }
  });

  // News Form
  document.getElementById('addNewsBtn')?.addEventListener('click', openAddNewsModal);
  document.getElementById('newsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('newsFormId').value;
    const editor = document.getElementById('newsFormEditor');
    const content = editor ? editor.innerHTML.trim() : document.getElementById('newsFormContent').value.trim();

    const payload = {
      id: id || undefined,
      title: document.getElementById('newsFormTitle').value.trim(),
      category: document.getElementById('newsFormCategory').value.trim() || 'Company News',
      read_time: document.getElementById('newsFormReadTime').value.trim() || '3 min read',
      excerpt: document.getElementById('newsFormExcerpt').value.trim(),
      content: content
    };

    try {
      const res = await apiFetch('/api/news', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(id ? 'Article updated' : 'Article published');
        closeModal('newsModal');
        await fetchNews();
        renderOverview();
      }
    } catch (err) {
      showToast('Failed to save article');
    }
  });

  // Copy Schema Button
  document.getElementById('copySchemaBtn')?.addEventListener('click', () => {
    const code = document.getElementById('schemaSqlCode')?.value;
    if (code) {
      navigator.clipboard.writeText(code).then(() => {
        showToast('SQL schema copied to clipboard');
      });
    }
  });

  // Export to CSV
  document.getElementById('exportCsvBtn')?.addEventListener('click', exportInquiriesToCsv);
}

function exportInquiriesToCsv() {
  if (!STATE.inquiries.length) {
    showToast('No inquiries available to export');
    return;
  }

  const headers = ['ID', 'Date', 'Type', 'Full Name', 'Company', 'Email', 'Phone', 'Requirement', 'Volume & Port', 'Status', 'Message', 'Notes'];
  const rows = STATE.inquiries.map(item => [
    item.id,
    item.created_at,
    item.inquiry_type,
    `"${(item.full_name || '').replace(/"/g, '""')}"`,
    `"${(item.company_name || '').replace(/"/g, '""')}"`,
    `"${(item.email || '').replace(/"/g, '""')}"`,
    `"${(item.phone || '').replace(/"/g, '""')}"`,
    `"${(item.product_requirement || item.subject || '').replace(/"/g, '""')}"`,
    `"${(item.volume_port || '').replace(/"/g, '""')}"`,
    item.status,
    `"${(item.message || '').replace(/"/g, '""')}"`,
    `"${(item.admin_notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `tradeaxis-leads-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('CSV export downloaded');
}

// ==========================================================================
// 10. MODAL & FILTER HELPERS
// ==========================================================================
function initModals() {
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.portal-modal-overlay');
      if (modal) modal.classList.remove('active');
    });
  });

  document.querySelectorAll('.portal-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

function initSearchAndFilters() {
  const searchInput = document.getElementById('inquirySearchInput');
  const typeFilter = document.getElementById('inquiryTypeFilter');
  const statusFilter = document.getElementById('inquiryStatusFilter');

  if (searchInput) searchInput.addEventListener('input', renderInquiriesTable);
  if (typeFilter) typeFilter.addEventListener('change', renderInquiriesTable);
  if (statusFilter) statusFilter.addEventListener('change', renderInquiriesTable);
}

// ==========================================================================
// 11. UTILITY FUNCTIONS
// ==========================================================================
function showToast(message) {
  const toast = document.getElementById('portalToast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (_) {
    return iso;
  }
}

function formatTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch (_) {
    return '';
  }
}

function formatStatus(status) {
  const map = {
    new: 'New / Unread',
    reviewed: 'Reviewed',
    quoted: 'Quoted',
    contacted: 'Contacted',
    closed: 'Closed'
  };
  return map[status] || status || 'New';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Expose switchTab globally
window.switchTab = switchTab;
