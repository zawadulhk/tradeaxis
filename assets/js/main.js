/**
 * TRADEAXIS GLOBAL VENTURES - INTERACTIVE JAVASCRIPT
 */

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initMobileNav();
  initRfqModal();
  initProductFilter();
  initForms();
  initScrollAnimations();
  initDynamicNews();
  initDynamicProducts();
});

/* --- Header Sticky & Scroll State --- */
function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

/* --- Mobile Navigation Drawer --- */
function initMobileNav() {
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navMenu = document.querySelector('.nav-menu');
  if (!mobileToggle || !navMenu) return;

  mobileToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    navMenu.classList.toggle('open');
    const isOpen = navMenu.classList.contains('open');
    mobileToggle.setAttribute('aria-expanded', isOpen);
  });

  // Mobile dropdown toggle
  const dropdownItems = document.querySelectorAll('.nav-item.has-dropdown');
  dropdownItems.forEach(item => {
    const link = item.querySelector('.nav-link');
    if (link) {
      link.addEventListener('click', (e) => {
        if (window.innerWidth <= 868) {
          e.preventDefault();
          item.classList.toggle('dropdown-open');
        }
      });
    }
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!navMenu.contains(e.target) && !mobileToggle.contains(e.target)) {
      navMenu.classList.remove('open');
    }
  });
}

/* --- Unified Form Controller & Field Toggler --- */
function updateFormFields(form, type) {
  if (!form) return;
  const rfqFields = form.querySelector('.rfq-fields');
  const generalFields = form.querySelector('.general-fields');
  const submitBtn = form.querySelector('.submit-inquiry-btn') || form.querySelector('button[type="submit"]');
  const productSelect = form.querySelector('.rfq-product-select');
  const generalSubject = form.querySelector('.general-subject-input');
  const messageArea = form.querySelector('textarea[name="message"]');

  if (type === 'rfq') {
    if (rfqFields) rfqFields.style.display = 'block';
    if (generalFields) generalFields.style.display = 'none';
    if (productSelect) productSelect.required = true;
    if (generalSubject) generalSubject.required = false;
    if (submitBtn) submitBtn.textContent = 'Submit Request for Quotation';
    if (messageArea) {
      messageArea.placeholder = 'Specify grade, technical specifications, volume, delivery schedules, or message details...';
    }
  } else {
    if (rfqFields) rfqFields.style.display = 'none';
    if (generalFields) generalFields.style.display = 'block';
    if (productSelect) productSelect.required = false;
    if (generalSubject) generalSubject.required = true;
    if (submitBtn) submitBtn.textContent = 'Transmit Message to Trade Desk';
    if (messageArea) {
      messageArea.placeholder = 'Provide details regarding your inquiry, partnership interest, or questions...';
    }
  }
}

/* --- Inquiry / RFQ Modal --- */
/* --- Inquiry / RFQ Modal (Event Delegation) --- */
function initRfqModal() {
  const modal = document.getElementById('rfqModal');
  if (!modal || modal._delegationBound) return;
  modal._delegationBound = true;

  const form = modal.querySelector('form');
  const typeSelect = modal.querySelector('.inquiry-type-select');
  const productInput = modal.querySelector('.rfq-product-select') || document.getElementById('rfqProductSelect');

  document.addEventListener('click', (e) => {
    // Open RFQ button
    const openBtn = e.target.closest('[data-open-rfq]');
    if (openBtn) {
      e.preventDefault();
      if (typeSelect) {
        typeSelect.value = 'rfq';
        updateFormFields(form, 'rfq');
      }
      const preselect = openBtn.getAttribute('data-product') || '';
      if (productInput && preselect) {
        if (productInput.tagName === 'SELECT') {
          let exists = Array.from(productInput.options).some(opt => opt.value === preselect);
          if (!exists) {
            const newOpt = new Option(preselect, preselect, true, true);
            productInput.add(newOpt);
          }
        }
        productInput.value = preselect;
      }
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      return;
    }

    // Open General Contact button
    const contactBtn = e.target.closest('[data-open-contact]');
    if (contactBtn) {
      e.preventDefault();
      if (typeSelect) {
        typeSelect.value = 'general';
        updateFormFields(form, 'general');
      }
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      return;
    }

    // Close buttons
    const closeBtn = e.target.closest('[data-close-rfq]');
    if (closeBtn) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      return;
    }

    // Close on backdrop click
    if (e.target === modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
}

/* --- Product Catalog Dynamic Filter --- */
function applyProductFilter(filter) {
  const productCards = document.querySelectorAll('.product-item-card');
  productCards.forEach(card => {
    const category = card.getAttribute('data-category');
    if (filter === 'all' || category === filter) {
      card.style.display = 'flex';
      setTimeout(() => { card.style.opacity = '1'; }, 10);
    } else {
      card.style.opacity = '0';
      setTimeout(() => { card.style.display = 'none'; }, 200);
    }
  });
}

function initProductFilter() {
  const filterButtons = document.querySelectorAll('.catalog-filter-bar .filter-btn');
  if (!filterButtons.length) return;

  filterButtons.forEach(btn => {
    btn.onclick = () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');
      applyProductFilter(filter);
    };
  });

  // Check URL param ?cat=xxx
  const urlParams = new URLSearchParams(window.location.search);
  const cat = urlParams.get('cat');
  if (cat) {
    const targetBtn = document.querySelector(`.catalog-filter-bar .filter-btn[data-filter="${cat}"]`);
    if (targetBtn) {
      targetBtn.click();
    }
  }
}

/* --- Dynamic News & Insights Hydration --- */
async function initDynamicNews() {
  const newsGrid = document.getElementById('newsGrid');
  const homeNewsGrid = document.getElementById('homeNewsGrid');
  if (!newsGrid && !homeNewsGrid) return;

  try {
    const res = await fetch('/api/news');
    if (!res.ok) return;
    const data = await res.json();
    const articles = data.news || [];
    if (!Array.isArray(articles) || articles.length === 0) return;

    // Filter to published articles
    const published = articles.filter(a => a.published !== false);
    if (published.length === 0) return;

    // 1. Full news grid on news.html
    if (newsGrid) {
      newsGrid.innerHTML = published.map((item, idx) => {
        const imgSrc = item.image_url || getCategoryThumb(item.category);
        const excerptHtml = item.excerpt 
          ? `<p style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.75rem;">${escapeHtml(item.excerpt)}</p>` 
          : '';
        const bodyParagraphs = (item.content || '')
          .split(/\n+/)
          .filter(Boolean)
          .map(p => `<p>${escapeHtml(p)}</p>`)
          .join('');

        return `
          <article class="division-card" id="article-${item.id || idx}" style="opacity: 1; transform: translateY(0);">
            <div class="card-thumb">
              <img src="${imgSrc}" alt="${escapeHtml(item.title)}">
              <span class="badge-tag">${escapeHtml(item.category || 'Industry Insights')}</span>
            </div>
            <div class="card-body">
              <div style="font-size: 0.8rem; color: var(--primary); font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">
                ${escapeHtml(item.publish_date || '')} ${item.read_time ? '• ' + escapeHtml(item.read_time) : ''}
              </div>
              <h3>${escapeHtml(item.title)}</h3>
              ${excerptHtml}
              ${bodyParagraphs}
              <div style="margin-top: auto; padding-top: 1rem;">
                <button class="btn btn-outline-gold btn-sm" data-open-rfq data-product="${escapeHtml(item.title)}">Inquire Regarding This Report</button>
              </div>
            </div>
          </article>
        `;
      }).join('');
    }

    // 2. Latest 3 news cards on index.html
    if (homeNewsGrid) {
      const top3 = published.slice(0, 3);
      homeNewsGrid.innerHTML = top3.map((item, idx) => {
        const imgSrc = item.image_url || getCategoryThumb(item.category);
        const summary = item.excerpt || (item.content ? item.content.slice(0, 140) + '...' : '');

        return `
          <div class="division-card" style="opacity: 1; transform: translateY(0);">
            <div class="card-thumb" style="height: 180px;">
              <img src="${imgSrc}" alt="${escapeHtml(item.title)}">
              <span class="badge-tag">${escapeHtml(item.category || 'Industry Updates')}</span>
            </div>
            <div class="card-body">
              <div style="font-size: 0.75rem; color: var(--primary); font-weight: 700; margin-bottom: 0.25rem;">
                ${escapeHtml(item.publish_date || '')}
              </div>
              <h4>${escapeHtml(item.title)}</h4>
              <p>${escapeHtml(summary)}</p>
              <a href="news.html#article-${item.id || idx}" class="card-cta">Read Article →</a>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.warn('Dynamic news hydration skipped:', err);
  }
}

/* --- Dynamic Product Catalog Hydration --- */
async function initDynamicProducts() {
  const productGrid = document.getElementById('productGrid');
  if (!productGrid) return;

  try {
    const res = await fetch('/api/products');
    if (!res.ok) return;
    const data = await res.json();
    const products = data.products || [];
    if (!Array.isArray(products) || products.length === 0) return;

    productGrid.innerHTML = products.map(item => {
      const imgSrc = item.image_url || getCategoryThumb(item.category);
      const catLabel = getCategoryLabel(item.category);
      
      let tagsHtml = '';
      if (item.specs) {
        const tags = item.specs
          .split(/\\n|\n/)
          .map(s => s.replace(/^[•\-\*]\s*/, '').trim())
          .filter(Boolean);
        if (tags.length > 0) {
          tagsHtml = `<div class="card-tags">${tags.slice(0, 4).map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>`;
        }
      }

      return `
        <div class="product-item-card division-card" data-category="${escapeHtml(item.category || 'jute')}" style="opacity: 1; transform: translateY(0);">
          <div class="card-thumb">
            <img src="${imgSrc}" alt="${escapeHtml(item.name)}">
            <span class="badge-tag">${escapeHtml(catLabel)}</span>
          </div>
          <div class="card-body">
            <h3>${escapeHtml(item.name)}</h3>
            ${item.badge ? `<span class="sub-title">${escapeHtml(item.badge)}</span>` : ''}
            <p>${escapeHtml(item.description || '')}</p>
            ${tagsHtml}
            <div style="margin-top: auto; padding-top: 1rem;">
              <button class="btn btn-outline-gold btn-sm" data-open-rfq data-product="${escapeHtml(item.name)}">Request Specifications</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Re-apply current active filter
    const activeBtn = document.querySelector('.catalog-filter-bar .filter-btn.active');
    const filter = activeBtn ? activeBtn.getAttribute('data-filter') : 'all';
    applyProductFilter(filter);
  } catch (err) {
    console.warn('Dynamic product hydration skipped:', err);
  }
}

/* --- Helper Utilities --- */
function getCategoryThumb(cat) {
  const c = (cat || '').toLowerCase();
  if (c.includes('jute')) return 'assets/images/jute-sustainable-export.jpg';
  if (c.includes('plastic') || c.includes('polymer') || c.includes('masterbatch')) return 'assets/images/plastic-polymers-masterbatch.jpg';
  if (c.includes('pharma') || c.includes('packag')) return 'assets/images/pharma-packaging-security.jpg';
  if (c.includes('food') || c.includes('dairy')) return 'assets/images/food-ingredients-sourcing.jpg';
  if (c.includes('machin')) return 'assets/images/industrial-machinery-sourcing.jpg';
  return 'assets/images/hero-global-trade.jpg';
}

function getCategoryLabel(cat) {
  const map = {
    jute: 'Jute Products',
    plastic: 'Plastic Raw Materials',
    polymers: 'Plastic Raw Materials',
    masterbatch: 'Masterbatch',
    packaging: 'Packaging Materials',
    pharma: 'Pharma Packaging',
    food: 'Food Ingredients',
    machinery: 'Machinery'
  };
  return map[(cat || '').toLowerCase()] || cat || 'General';
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

/* --- Form Submissions & Toast Notifications --- */
function initForms() {
  // Initialize dynamic field toggling on all inquiry forms
  document.querySelectorAll('.inquiry-type-select').forEach(select => {
    const form = select.closest('form');
    select.addEventListener('change', () => {
      updateFormFields(form, select.value);
    });
    // Set initial display based on selected value
    updateFormFields(form, select.value);
  });

  const forms = document.querySelectorAll('form[data-ajax-form]');
  forms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.innerHTML : 'Submit';
      const typeSelect = form.querySelector('.inquiry-type-select');
      const inquiryType = typeSelect ? typeSelect.value : 'rfq';

      const payload = {
        inquiry_type: inquiryType,
        full_name: form.querySelector('[name="full_name"]')?.value?.trim() || '',
        company_name: form.querySelector('[name="company_name"]')?.value?.trim() || '',
        email: form.querySelector('[name="email"]')?.value?.trim() || '',
        phone: form.querySelector('[name="phone"]')?.value?.trim() || '',
        product_requirement: form.querySelector('[name="product_requirement"]')?.value?.trim() || null,
        volume_port: form.querySelector('[name="volume_port"]')?.value?.trim() || null,
        subject: form.querySelector('[name="subject"]')?.value?.trim() || null,
        message: form.querySelector('[name="message"]')?.value?.trim() || ''
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Transmitting...';
      }

      try {
        const res = await fetch('/api/inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error('Inquiry submission error:', errData);
          showToast(errData.details || errData.error || 'Submission error. Please email us directly.');
          return;
        }
      } catch (err) {
        console.warn('API submission failed:', err);
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }

      // Close modal if inside modal
      const modal = form.closest('.modal-overlay');
      if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }

      const successMsg = inquiryType === 'rfq'
        ? 'Thank you! Your quotation request has been transmitted to our trade desk. Our representative will contact you within 24 hours.'
        : 'Thank you! Your message has been transmitted to TradeAxis. We will respond to your inquiry shortly.';

      showToast(successMsg);
      form.reset();
      if (typeSelect) {
        updateFormFields(form, typeSelect.value);
      }
    });
  });
}

function showToast(message) {
  let toast = document.getElementById('siteToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'siteToast';
    toast.className = 'toast-msg';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 4500);
}

/* --- Scroll-Triggered Reveal Animations --- */
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('.fade-up, .division-card, .product-card, .hub-card');

  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  animatedElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(25px)';
    el.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    observer.observe(el);
  });
}
