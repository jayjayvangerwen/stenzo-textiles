/* ============================================================
   STENZO TEXTILES - Catalog App
   ============================================================ */

(function () {
  'use strict';

  // --- Globals ---
  let allProducts = [];
  let filteredProducts = [];
  let activeFilters = {};
  let currentPage = 1;
  const PAGE_SIZE = 48;
  let searchQuery = '';

  // --- Icons ---
  const ICONS = {
    search: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    chevron: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    chevronRight: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
    x: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    fabric: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>',
    arrowLeft: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    arrowRight: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  };

  // --- Header scroll effect ---
  function initHeader() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 10);
    });
  }

  // --- Load product data ---
  async function loadProducts() {
    try {
      const resp = await fetch(getBasePath() + 'data/products_index.json');
      allProducts = await resp.json();
      return true;
    } catch (e) {
      console.error('Failed to load products:', e);
      return false;
    }
  }

  function getBasePath() {
    const path = window.location.pathname;
    if (path.includes('/product/') || path.includes('/collection/')) {
      return '../../';
    }
    return '';
  }

  // --- Filter Logic ---
  const FILTER_CONFIG = [
    { key: 'fabricType', label: 'Stofsoort' },
    { key: 'color', label: 'Kleur' },
    { key: 'stretch', label: 'Rek' },
    { key: 'finishing', label: 'Afwerking' },
    { key: 'weave', label: 'Weefsel' },
    { key: 'dyeingType', label: 'Verftype' },
    { key: 'composition', label: 'Samenstelling' },
  ];

  function buildFilterCounts() {
    const counts = {};
    FILTER_CONFIG.forEach(f => { counts[f.key] = {}; });

    allProducts.forEach(p => {
      FILTER_CONFIG.forEach(f => {
        const val = p[f.key];
        if (val) {
          counts[f.key][val] = (counts[f.key][val] || 0) + 1;
        }
      });
    });

    return counts;
  }

  function applyFilters() {
    filteredProducts = allProducts.filter(p => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchable = (p.name + ' ' + (p.composition || '') + ' ' + (p.fabricType || '') + ' ' + (p.color || '')).toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      // Filters
      for (const key of Object.keys(activeFilters)) {
        const vals = activeFilters[key];
        if (vals.length === 0) continue;
        if (!vals.includes(p[key])) return false;
      }

      return true;
    });

    currentPage = 1;
    renderProducts();
    renderActiveFilterTags();
    updateProductCount();
  }

  function toggleFilter(key, value) {
    if (!activeFilters[key]) activeFilters[key] = [];
    const idx = activeFilters[key].indexOf(value);
    if (idx >= 0) {
      activeFilters[key].splice(idx, 1);
    } else {
      activeFilters[key].push(value);
    }
    applyFilters();
    renderFilters();
  }

  function clearAllFilters() {
    activeFilters = {};
    searchQuery = '';
    const searchInput = document.getElementById('product-search');
    if (searchInput) searchInput.value = '';
    applyFilters();
    renderFilters();
  }

  // --- Render Filters Sidebar ---
  function renderFilters() {
    const sidebar = document.getElementById('filters-sidebar');
    if (!sidebar) return;

    const counts = buildFilterCounts();

    let html = '';
    FILTER_CONFIG.forEach(f => {
      const values = Object.entries(counts[f.key] || {}).sort((a, b) => b[1] - a[1]);
      if (values.length === 0) return;

      html += `<div class="filter-section">
        <button class="filter-toggle" data-filter="${f.key}">
          ${f.label} ${ICONS.chevron}
        </button>
        <div class="filter-options" id="filter-${f.key}">`;

      values.forEach(([val, count]) => {
        const isActive = (activeFilters[f.key] || []).includes(val);
        html += `<div class="filter-option ${isActive ? 'active' : ''}" data-filter-key="${f.key}" data-filter-value="${val}">
          <div class="filter-checkbox"></div>
          <span>${val}</span>
          <span class="filter-count">${count}</span>
        </div>`;
      });

      html += '</div></div>';
    });

    sidebar.innerHTML = html;

    // Bind click events
    sidebar.querySelectorAll('.filter-option').forEach(el => {
      el.addEventListener('click', () => {
        toggleFilter(el.dataset.filterKey, el.dataset.filterValue);
      });
    });

    sidebar.querySelectorAll('.filter-toggle').forEach(el => {
      el.addEventListener('click', () => {
        const opts = document.getElementById('filter-' + el.dataset.filter);
        if (opts) {
          opts.classList.toggle('collapsed');
          el.classList.toggle('collapsed');
        }
      });
    });
  }

  function renderActiveFilterTags() {
    const container = document.getElementById('active-filters');
    if (!container) return;

    let html = '';
    let hasFilters = false;

    Object.entries(activeFilters).forEach(([key, vals]) => {
      vals.forEach(val => {
        hasFilters = true;
        html += `<span class="active-filter-tag" data-key="${key}" data-value="${val}">
          ${val} ${ICONS.x}
        </span>`;
      });
    });

    if (hasFilters) {
      html += `<span class="clear-filters" id="clear-all-filters">Alles wissen</span>`;
    }

    container.innerHTML = html;

    container.querySelectorAll('.active-filter-tag').forEach(el => {
      el.addEventListener('click', () => {
        toggleFilter(el.dataset.key, el.dataset.value);
      });
    });

    const clearBtn = document.getElementById('clear-all-filters');
    if (clearBtn) clearBtn.addEventListener('click', clearAllFilters);
  }

  function updateProductCount() {
    const el = document.getElementById('products-count');
    if (el) {
      el.innerHTML = `<strong>${filteredProducts.length}</strong> producten`;
    }
  }

  // --- Render Product Grid ---
  function renderProducts() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageProducts = filteredProducts.slice(start, end);

    if (pageProducts.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">
        ${ICONS.fabric}
        <h3>Geen producten gevonden</h3>
        <p>Probeer andere filters of zoektermen.</p>
      </div>`;
      renderPagination();
      return;
    }

    grid.innerHTML = pageProducts.map((p, i) => {
      const imgSrc = p.image || '';
      const imageHtml = imgSrc
        ? `<img src="${imgSrc}" alt="${p.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="no-image" style="display:none"><span>Geen afbeelding</span></div>`
        : `<div class="no-image"><span>Geen afbeelding</span></div>`;

      const specs = [];
      if (p.fabricType) specs.push(p.fabricType);
      if (p.composition) specs.push(p.composition);
      if (p.weight) specs.push(p.weight + ' g/m²');

      const badgeHtml = p.variants > 1 ? `<span class="product-card-badge">${p.variants} varianten</span>` : '';

      return `<a href="${getBasePath()}product/${p.id}.html" class="product-card" style="animation-delay:${Math.min(i * 0.03, 0.5)}s">
        <div class="product-card-image">
          ${imageHtml}
          ${badgeHtml}
        </div>
        <div class="product-card-info">
          <div class="product-card-name">${p.name}</div>
          <div class="product-card-meta">${p.fabricType || ''} ${p.color ? '· ' + p.color : ''}</div>
          <div class="product-card-specs">
            ${specs.slice(0, 3).map(s => `<span class="spec-tag">${s}</span>`).join('')}
          </div>
        </div>
      </a>`;
    }).join('');

    // Animate cards
    grid.querySelectorAll('.product-card').forEach(card => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(16px)';
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    });

    requestAnimationFrame(() => {
      grid.querySelectorAll('.product-card').forEach((card, i) => {
        setTimeout(() => {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        }, i * 30);
      });
    });

    renderPagination();
  }

  // --- Pagination ---
  function renderPagination() {
    const container = document.getElementById('pagination');
    if (!container) return;

    const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let html = '';

    html += `<button class="page-btn ${currentPage === 1 ? 'disabled' : ''}" data-page="${currentPage - 1}">${ICONS.arrowLeft}</button>`;

    const range = [];
    range.push(1);
    for (let i = Math.max(2, currentPage - 2); i <= Math.min(totalPages - 1, currentPage + 2); i++) {
      range.push(i);
    }
    if (totalPages > 1) range.push(totalPages);

    const unique = [...new Set(range)].sort((a, b) => a - b);
    let prev = 0;
    unique.forEach(p => {
      if (p - prev > 1) html += '<span class="page-btn disabled">...</span>';
      html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
      prev = p;
    });

    html += `<button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" data-page="${currentPage + 1}">${ICONS.arrowRight}</button>`;

    container.innerHTML = html;

    container.querySelectorAll('.page-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page);
        if (page >= 1 && page <= totalPages) {
          currentPage = page;
          renderProducts();
          document.getElementById('product-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // --- Product Detail Gallery ---
  function initGallery() {
    const main = document.querySelector('.gallery-main img');
    const thumbs = document.querySelectorAll('.gallery-thumb');
    if (!main || thumbs.length === 0) return;

    thumbs.forEach(thumb => {
      thumb.addEventListener('click', () => {
        thumbs.forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        main.src = thumb.querySelector('img').src;
      });
    });

    // Lightbox
    const galleryMain = document.querySelector('.gallery-main');
    if (galleryMain) {
      galleryMain.addEventListener('click', () => {
        const lightbox = document.getElementById('lightbox');
        const lightboxImg = document.getElementById('lightbox-img');
        if (lightbox && lightboxImg) {
          lightboxImg.src = main.src;
          lightbox.classList.add('active');
        }
      });
    }

    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
      lightbox.addEventListener('click', () => lightbox.classList.remove('active'));
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') lightbox.classList.remove('active');
      });
    }
  }

  // --- Variant Switcher ---
  function initVariantSwitcher() {
    const btns = document.querySelectorAll('.variant-btn');
    if (btns.length === 0) return;

    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update gallery images
        const variantData = btn.dataset.images;
        if (variantData) {
          try {
            const images = JSON.parse(variantData);
            const main = document.querySelector('.gallery-main img');
            const thumbContainer = document.querySelector('.gallery-thumbs');
            if (main && images.length > 0) {
              main.src = images[0];
              if (thumbContainer) {
                thumbContainer.innerHTML = images.map((img, i) =>
                  `<div class="gallery-thumb ${i === 0 ? 'active' : ''}"><img src="${img}" alt="Variant"></div>`
                ).join('');
                initGallery();
              }
            }
          } catch (e) {}
        }
      });
    });
  }

  // --- Search ---
  function initSearch() {
    const input = document.getElementById('product-search');
    if (!input) return;

    let timeout;
    input.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        searchQuery = input.value.trim();
        applyFilters();
      }, 250);
    });
  }

  // --- Sort ---
  function initSort() {
    const select = document.getElementById('product-sort');
    if (!select) return;

    select.addEventListener('change', () => {
      const val = select.value;
      if (val === 'name-asc') {
        filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
      } else if (val === 'name-desc') {
        filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
      } else if (val === 'newest') {
        filteredProducts.sort((a, b) => (b.created || '').localeCompare(a.created || ''));
      } else if (val === 'weight-asc') {
        filteredProducts.sort((a, b) => (a.weight || 9999) - (b.weight || 9999));
      } else if (val === 'weight-desc') {
        filteredProducts.sort((a, b) => (b.weight || 0) - (a.weight || 0));
      }
      currentPage = 1;
      renderProducts();
    });
  }

  // --- Collection page init ---
  function initCollectionPage() {
    const collectionId = document.body.dataset.collection;
    if (!collectionId) return;

    loadProducts().then(() => {
      const collectionProducts = allProducts.filter(p =>
        p.collections && p.collections.includes(collectionId)
      );
      filteredProducts = collectionProducts;
      renderProducts();
      updateProductCount();
    });
  }

  // --- Init ---
  document.addEventListener('DOMContentLoaded', async () => {
    initHeader();
    initGallery();
    initVariantSwitcher();

    // Catalog page
    const grid = document.getElementById('product-grid');
    if (grid) {
      const loaded = await loadProducts();
      if (loaded) {
        filteredProducts = [...allProducts];
        renderFilters();
        renderProducts();
        updateProductCount();
        initSearch();
        initSort();
      }
    }

    // Collection page
    if (document.body.dataset.collection) {
      initCollectionPage();
    }

    // Intersection observer for scroll animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.observe-animate').forEach(el => observer.observe(el));
  });

})();
