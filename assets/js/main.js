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

/* --- RFQ / Sourcing Modal --- */
function initRfqModal() {
  const modal = document.getElementById('rfqModal');
  const openButtons = document.querySelectorAll('[data-open-rfq]');
  const closeButtons = document.querySelectorAll('[data-close-rfq]');
  const productInput = document.getElementById('rfqProductSelect');

  if (!modal) return;

  openButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const preselect = btn.getAttribute('data-product') || '';
      if (productInput && preselect) {
        productInput.value = preselect;
      }
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    });
  });

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
}

/* --- Product Catalog Dynamic Filter --- */
function initProductFilter() {
  const filterButtons = document.querySelectorAll('.catalog-filter-bar .filter-btn');
  const productCards = document.querySelectorAll('.product-item-card');

  if (!filterButtons.length || !productCards.length) return;

  function applyFilter(filter) {
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

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');
      applyFilter(filter);
    });
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

/* --- Form Submissions & Toast Notifications --- */
function initForms() {
  const forms = document.querySelectorAll('form[data-ajax-form]');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.innerHTML : 'Submit';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Submitting...';
      }

      setTimeout(() => {
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

        showToast('Thank you! Your inquiry has been transmitted to our trade desk. Our representative will contact you within 24 hours.');
        form.reset();
      }, 1000);
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
