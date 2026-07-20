/**
 * NeuroCrack Report - Main JavaScript Interactivity & Navigation
 * Production Pass 03 — Reading Experience & Navigation
 */

document.addEventListener('DOMContentLoaded', () => {
  BrandTypewriter.init();
  LiveNavigator.init();
  ReadingProgressBar.init();
  ScrollToTop.init();
  SubscriberRevenueMatrix.init();
  ChartReveal.init();
  PoolInfographic.init();
  VideoCardManager.init();

  // Reusable Trend Graphs
  TrendGraphEngine.init('fig-mbbs-growth');
  TrendGraphEngine.init('fig-aspirant-growth');

  // Comparison Graphs
  ComparisonGraphEngine.init('fig-effort-outcomes');

  // Timeline Progress
  TimelineEngine.init();

  // Progress Roadmap
  RoadmapEngine.init('fig-roadmap');

  // Section & Block Reveals
  SectionRevealEngine.init();
});


/**
 * 1. Live Sidebar Reading Navigator
 * Manages active states, collapsible section groups, dynamic module sublists,
 * silent URL hash updates, and chapter progress calculation.
 */
const LiveNavigator = {
  init() {
    this.sidebar = document.querySelector('.toc');
    if (!this.sidebar) return;

    this.contentWrapper = document.querySelector('.page__main');
    this.sectionGroups = this.sidebar.querySelectorAll('.toc__section-group');
    this.chapters = [];
    this.modules = [];
    this.allTrackedElements = [];

    // Step A: Dynamically build module sublists under each chapter sidebar item
    this.buildModuleSublists();

    // Step B: Set up IntersectionObserver to track reading position
    this.setupObserver();

    // Step C: Set up click handlers for sidebar links to ensure smooth scrolling and url updates
    this.setupClickHandlers();

    // Step D: Calculate chapter progress on scroll
    window.addEventListener('scroll', () => {
      this.updateChapterProgress();
    }, { passive: true });
  },

  /**
   * Traverse content to find modules belonging to each chapter,
   * then inject sub-navigation links under their respective chapter sidebar items.
   */
  buildModuleSublists() {
    const chapterLinks = this.sidebar.querySelectorAll('.toc__list > .toc__item > a[href^="#ch"]');

    chapterLinks.forEach(link => {
      const chapterId = link.getAttribute('href').substring(1);
      const chapterHeader = document.getElementById(chapterId);
      if (!chapterHeader) return;

      const parentLi = link.parentElement;
      const modulesForChapter = [];

      // Find all sibling content modules until we hit the next chapter or section hero
      let sibling = chapterHeader.nextElementSibling;
      while (sibling) {
        if (sibling.classList.contains('chapter-header') || sibling.classList.contains('section-hero')) {
          break;
        }
        if (sibling.tagName === 'ARTICLE' && sibling.classList.contains('content-block') && sibling.id) {
          modulesForChapter.push(sibling);
        }
        sibling = sibling.nextElementSibling;
      }

      if (modulesForChapter.length > 0) {
        const sublist = document.createElement('ul');
        sublist.className = 'toc__sublist';

        modulesForChapter.forEach(module => {
          const subitem = document.createElement('li');
          subitem.className = 'toc__subitem';

          const sublink = document.createElement('a');
          sublink.setAttribute('href', `#${module.id}`);

          // Get the title text from h3
          const h3 = module.querySelector('.content-block__heading');
          const title = h3 ? h3.textContent.trim() : 'Module';
          sublink.textContent = title;

          subitem.appendChild(sublink);
          sublist.appendChild(subitem);

          // Add to our tracked modules list
          this.modules.push({
            id: module.id,
            element: module,
            sidebarLink: sublink,
            sidebarLi: subitem
          });
        });

        parentLi.appendChild(sublist);
      }

      this.chapters.push({
        id: chapterId,
        element: chapterHeader,
        sidebarLink: link,
        sidebarLi: parentLi,
        modules: modulesForChapter.map(m => m.id)
      });
    });
  },

  /**
   * Intersection Observer to track active layout items efficiently without heavy scroll listeners.
   */
  setupObserver() {
    // Collect all elements we want to track in the document
    const targets = [];

    // Front matter
    ['cover', 'summary', 'summary-opportunity', 'contents'].forEach(id => {
      const el = document.getElementById(id);
      if (el) targets.push(el);
    });

    // Sections
    ['sec1', 'sec2', 'sec3', 'sec4', 'sec5'].forEach(id => {
      const el = document.getElementById(id);
      if (el) targets.push(el);
    });

    // Chapters
    this.chapters.forEach(ch => {
      targets.push(ch.element);
    });

    // Modules
    this.modules.forEach(mod => {
      targets.push(mod.element);
    });

    this.allTrackedElements = targets;

    // Track active status map
    const activeStates = new Map();

    const observerOptions = {
      root: null,
      // Focus on the top-middle third of the viewport where reading is concentrated
      rootMargin: '-8% 0px -60% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        activeStates.set(entry.target.id, entry.isIntersecting);
      });

      // Find the active element. The active element is the highest intersecting element on the screen.
      let activeId = null;
      let minOffset = Infinity;

      this.allTrackedElements.forEach(target => {
        if (activeStates.get(target.id)) {
          const offset = target.offsetTop;
          if (offset < minOffset) {
            minOffset = offset;
            activeId = target.id;
          }
        }
      });

      // Fallback: if nothing is intersecting (e.g. between fast scrolls), find the element closest to the top of viewport
      if (!activeId) {
        let closestEl = null;
        let minDiff = Infinity;
        const scrollY = window.scrollY + 100;

        this.allTrackedElements.forEach(target => {
          const diff = Math.abs(target.offsetTop - scrollY);
          if (diff < minDiff) {
            minDiff = diff;
            closestEl = target;
          }
        });
        if (closestEl) activeId = closestEl.id;
      }

      if (activeId) {
        this.setActiveSidebarItem(activeId);
      }
    }, observerOptions);

    targets.forEach(target => observer.observe(target));
  },

  /**
   * Set active classes in sidebar, collapse/expand section groups, and silently update URL hash.
   */
  setActiveSidebarItem(activeId) {
    // Map second page of executive summary to the main summary navigation link
    if (activeId === 'summary-opportunity') {
      activeId = 'summary';
    }

    // 1. Clear all active classes in sidebar
    this.sidebar.querySelectorAll('.toc__item').forEach(li => {
      li.classList.remove('toc__item--active');
    });
    this.sidebar.querySelectorAll('.toc__subitem').forEach(li => {
      li.classList.remove('toc__subitem--active');
    });

    let currentLink = this.sidebar.querySelector(`a[href="#${activeId}"]`);
    let activeChapterId = null;

    if (currentLink) {
      const parentLi = currentLink.parentElement;
      if (parentLi.classList.contains('toc__item')) {
        parentLi.classList.add('toc__item--active');
      } else if (parentLi.classList.contains('toc__subitem')) {
        parentLi.classList.add('toc__subitem--active');

        // Walk up to highlight the parent chapter as active too
        const parentChapterLi = parentLi.closest('.toc__item');
        if (parentChapterLi) {
          parentChapterLi.classList.add('toc__item--active');
        }
      }
    }

    // 2. Expand active section group and collapse others
    let activeGroup = null;
    if (currentLink) {
      activeGroup = currentLink.closest('.toc__section-group');
    }

    this.sectionGroups.forEach(group => {
      if (group === activeGroup) {
        group.classList.add('toc__section-group--active');
      } else {
        group.classList.remove('toc__section-group--active');
      }
    });

    // 3. Silent URL hash update (without page jump or reload)
    if (window.location.hash !== `#${activeId}`) {
      history.replaceState(null, null, `#${activeId}`);
    }
  },

  /**
   * Calculate reading completion progress for the active chapter.
   */
  updateChapterProgress() {
    // Find the currently active chapter
    const activeChapterLi = this.sidebar.querySelector('.toc__item--active > a[href^="#ch"]');
    if (!activeChapterLi) {
      // Remove any leftover progress indicators
      this.clearAllChapterProgress();
      return;
    }

    const chapterId = activeChapterLi.getAttribute('href').substring(1);
    const chapterData = this.chapters.find(ch => ch.id === chapterId);
    if (!chapterData) return;

    // Calculate bounds of this chapter
    const startScroll = chapterData.element.offsetTop;

    // End bounds: offsetTop of next chapter header, section hero, or end of document
    let endScroll = document.documentElement.scrollHeight - window.innerHeight;
    const allHeaders = Array.from(document.querySelectorAll('.chapter-header, .section-hero'));
    const currentIndex = allHeaders.indexOf(chapterData.element);

    if (currentIndex !== -1 && currentIndex < allHeaders.length - 1) {
      endScroll = allHeaders[currentIndex + 1].offsetTop;
    }

    const viewportMiddle = window.scrollY + (window.innerHeight / 2);
    const range = endScroll - startScroll;
    let progressPercent = 0;

    if (range > 0) {
      progressPercent = Math.min(100, Math.max(0, ((viewportMiddle - startScroll) / range) * 100));
    }

    // Update or insert progress bar inside active chapter sidebar item
    this.renderChapterProgress(chapterData.sidebarLi, progressPercent);
  },

  renderChapterProgress(chapterLi, percent) {
    // Clear other progress indicators
    this.clearAllChapterProgress(chapterLi);

    let progressDiv = chapterLi.querySelector('.toc__chapter-progress');
    if (!progressDiv) {
      progressDiv = document.createElement('div');
      progressDiv.className = 'toc__chapter-progress';
      chapterLi.appendChild(progressDiv);
    }

    // Build bar like ████████░░░░ (12 characters total)
    const totalBlocks = 12;
    const activeBlocks = Math.round((percent / 100) * totalBlocks);
    const inactiveBlocks = totalBlocks - activeBlocks;
    const progressBarText = '█'.repeat(activeBlocks) + '░'.repeat(inactiveBlocks);

    progressDiv.innerHTML = `
      <span class="toc__progress-bar">${progressBarText}</span>
      <span class="toc__progress-percent">${Math.round(percent)}%</span>
    `;
  },

  clearAllChapterProgress(exceptLi = null) {
    this.sidebar.querySelectorAll('.toc__chapter-progress').forEach(el => {
      if (!exceptLi || !exceptLi.contains(el)) {
        el.remove();
      }
    });
  },

  /**
   * Smoothly scroll when a sidebar link is clicked.
   */
  setupClickHandlers() {
    this.sidebar.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
          // Native smooth scroll uses scroll-padding-top for header offset
          targetElement.scrollIntoView({ behavior: 'smooth' });

          // Focus target element for accessibility
          targetElement.setAttribute('tabindex', '-1');
          targetElement.focus({ preventScroll: true });

          // Silently set active state immediately to avoid lag
          this.setActiveSidebarItem(targetId);
        }
      });
    });
  }
};

/**
 * 2. Reading Progress Bar (slim line fixed to top of screen)
 */
const ReadingProgressBar = {
  init() {
    this.bar = document.getElementById('reading-progress');
    this.sidebarBar = document.getElementById('toc-progress-bar');
    this.sidebarPct = document.getElementById('toc-progress-pct');
    this.mobilePct = document.getElementById('mobile-progress-pct');

    window.addEventListener('scroll', () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        const percent = (window.scrollY / scrollHeight) * 100;
        const roundedPercent = Math.round(percent);

        if (this.bar) this.bar.style.width = `${percent}%`;
        if (this.sidebarBar) this.sidebarBar.style.width = `${percent}%`;
        if (this.sidebarPct) this.sidebarPct.textContent = `${roundedPercent}%`;
        if (this.mobilePct) this.mobilePct.textContent = `${roundedPercent}%`;
      }
    }, { passive: true });
  }
};

/**
 * 3. Scroll to Top floating action button
 */
const ScrollToTop = {
  init() {
    this.btn = document.getElementById('back-to-top');
    if (!this.btn) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) {
        this.btn.classList.add('back-to-top--visible');
      } else {
        this.btn.classList.remove('back-to-top--visible');
      }
    }, { passive: true });

    this.btn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
};

/**
 * 4. Premium Subscriber vs Revenue Matrix
 *    40×40 waffle chart — four-company comparison (SpaceX-style static grid)
 *    Each cell represents one proportional unit:
 *      • 1 solid filled cell = ₹1 Cr of Annual Revenue
 *      • 1 hollow outlined cell = 1K Subscribers
 *    Both metrics exist inside the SAME matrix.
 */
const SubscriberRevenueMatrix = {

  GRID_COLS: 40,
  TOTAL_CELLS: 1600, // 40 × 40

  /* ── Company dataset ───────────────────────────────────────────── */
  data: [
    { id: 'marrow', name: 'Marrow', subscribers: 500000, revenue: 773, isTarget: false },
    { id: 'doctutorials', name: 'DocTutorials', subscribers: 200000, revenue: 70, isTarget: false },
    { id: 'cerebellum', name: 'Cerebellum Academy', subscribers: 300000, revenue: 102, isTarget: false },
    { id: 'neurocrack', name: 'NeuroCrack', subscribers: 100000, revenue: 15, isTarget: true }
  ],

  /* ── Animation State ───────────────────────────────────────────── */
  anim: {
    requestRef: null,
    startTime: null,
    isPlaying: false,
    observer: null,
    durationPhase1: 1500, // Construction phase (1.5s)
    durationPhase2: 1500, // Revenue Fill phase (1.5s)
    durationPhase3: 1200, // Reading Pause phase (1.2s)
    durationPhase4: 800,  // Soft reset / clearing wave (0.8s)
    totalDuration: 5000   // Total loop (5.0s)
  },

  /* ── Bootstrap ─────────────────────────────────────────────────── */
  init() {
    const container = document.getElementById('srm-container');
    if (!container) return;

    // Retrieve styles dynamically to respect theme CSS variables
    const styles = getComputedStyle(document.documentElement);
    this.colorAccent = styles.getPropertyValue('--c-accent').trim() || '#D8FF3E';
    this.colorText1 = styles.getPropertyValue('--c-text-1').trim() || '#FAFAFA';

    // Reset container to avoid duplication
    container.innerHTML = '';

    // Render cards and prepare animation buffers
    this.data.forEach((company, index) => {
      const subCells = Math.round(company.subscribers / 1000);
      const revCells = company.revenue;
      container.appendChild(this._buildCard(company, subCells, revCells, index));
    });

    // Set up IntersectionObserver to trigger and pause animation based on viewport visibility
    this._initObserver();

    // Set up window resize listener to keep canvas rendering crisp and correctly sized
    window.addEventListener('resize', () => {
      this.data.forEach(company => {
        this._drawCanvas(company);
      });
    }, { passive: true });
  },

  /* ── Viewport Intersection Observer ────────────────────────────── */
  _initObserver() {
    const targetFigure = document.getElementById('fig-srm');
    if (!targetFigure) return;

    const component = {
      start: () => this.startAnimation(),
      stop: () => this.pauseAnimation(),
      reset: () => this.pauseAnimation()
    };

    AnimationManager.register(targetFigure, component);
  },

  /* ── Animation Controls ────────────────────────────────────────── */
  startAnimation() {
    if (this.anim.isPlaying) return;
    this.anim.isPlaying = true;
    this.anim.startTime = null; // Will calibrate on first animation frame
    this.anim.requestRef = requestAnimationFrame((timestamp) => this._loop(timestamp));
  },

  pauseAnimation() {
    if (!this.anim.isPlaying) return;
    this.anim.isPlaying = false;
    if (this.anim.requestRef) {
      cancelAnimationFrame(this.anim.requestRef);
      this.anim.requestRef = null;
    }

    // Reset animation clock
    this.anim.startTime = null;

    // Reset all active cells back to hidden/initial state
    this.data.forEach(company => {
      company.currentCount = -1;
      company.currentFilled = -1;
      company.currentCleared = -1;
      company.lastTargetCount = 0;
      company.lastTargetFilled = 0;
      company.lastTargetCleared = 0;
      company.lastElapsed = 0;

      if (company.canvasCells) {
        company.canvasCells.forEach(cell => {
          cell.opacity = 0;
          cell.scale = 0.95;
          cell.fillProgress = 0;
        });
      }

      this._drawCanvas(company);
    });
  },

  /* ── Animation Loop ────────────────────────────────────────────── */
  _loop(timestamp) {
    if (!this.anim.isPlaying) return;

    if (!this.anim.startTime) {
      this.anim.startTime = timestamp;
    }

    const elapsed = (timestamp - this.anim.startTime) % this.anim.totalDuration;

    // Simultaneously update all company grids
    this.data.forEach(company => {
      this._updateGrid(company, elapsed);
    });

    this.anim.requestRef = requestAnimationFrame((ts) => this._loop(ts));
  },

  /* ── Build one company card ─────────────────────────────────────── */
  _buildCard(company, subCells, revCells, index) {
    const card = document.createElement('div');
    card.className = 'srm-card' + (company.isTarget ? ' srm-card--target' : '');

    /* Company name row */
    const nameRow = document.createElement('p');
    nameRow.className = 'srm-card__name' + (company.isTarget ? ' srm-card__name--target' : '');
    nameRow.textContent = company.name;
    if (company.isTarget) {
      const badge = document.createElement('span');
      badge.className = 'srm-card__badge';
      badge.textContent = 'TARGET';
      nameRow.appendChild(badge);
    }

    /* Matrix Container */
    const container = document.createElement('div');
    container.className = 'srm-matrix-container';

    /* Single Matrix Canvas Layer */
    const matrix = document.createElement('div');
    matrix.className = 'srm-matrix';

    const canvas = document.createElement('canvas');
    canvas.width = 799;
    canvas.height = 799;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.borderRadius = '3px';
    matrix.appendChild(canvas);

    company.canvas = canvas;
    company.ctx = canvas.getContext('2d');

    const totalActive = revCells + subCells;
    company.activeCellsCount = totalActive;
    company.revenue = revCells;
    company.currentCount = -1;
    company.currentFilled = -1;
    company.currentCleared = -1;
    company.lastTargetCount = 0;
    company.lastTargetFilled = 0;
    company.lastTargetCleared = 0;
    company.lastElapsed = 0;

    // Precompute diagonal indices and ranks
    const cols = this.GRID_COLS;
    company.diagonalIndices = Array.from({length: totalActive}, (_, i) => i);
    company.diagonalIndices.sort((a, b) => {
      const colA = a % cols;
      const rowA = Math.floor(a / cols);
      const colB = b % cols;
      const rowB = Math.floor(b / cols);
      const diagA = colA + rowA;
      const diagB = colB + rowB;
      if (diagA !== diagB) return diagA - diagB;
      return colA - colB;
    });

    company.diagonalRanks = new Int32Array(totalActive);
    for (let idx = 0; idx < totalActive; idx++) {
      const cellIndex = company.diagonalIndices[idx];
      company.diagonalRanks[cellIndex] = idx;
    }

    // Initialize animation values for active cells
    company.canvasCells = [];
    for (let i = 0; i < totalActive; i++) {
      company.canvasCells.push({
        opacity: 0,
        scale: 0.95,
        fillProgress: 0
      });
    }

    container.appendChild(matrix);

    /* Labels / Metrics below the matrix */
    const meta = document.createElement('div');
    meta.className = 'srm-meta';

    // Subscribers value
    const subLabel = company.subscribers >= 1000000 ? (company.subscribers / 1000000).toFixed(1) + 'M' : (company.subscribers / 1000) + 'K';
    const subStat = this._buildStat('Subscribers', subLabel, company.isTarget);

    // Revenue value
    const revLabel = `₹${company.revenue} Cr`;
    const revStat = this._buildStat('Revenue', revLabel, company.isTarget);

    meta.appendChild(subStat);
    meta.appendChild(revStat);

    card.appendChild(nameRow);
    card.appendChild(container);
    card.appendChild(meta);

    // Draw the initial clean canvas grid
    this._drawCanvas(company);

    return card;
  },

  _buildStat(label, value, isTarget) {
    const wrap = document.createElement('div');
    wrap.className = 'srm-stat';
    const lbl = document.createElement('span');
    lbl.className = 'srm-stat__label';
    lbl.textContent = label;
    const val = document.createElement('span');
    val.className = 'srm-stat__value' + (isTarget ? ' srm-stat__value--target' : '');
    val.textContent = value;
    wrap.appendChild(lbl);
    wrap.appendChild(val);
    return wrap;
  },

  _drawCanvas(company) {
    const canvas = company.canvas;
    const ctx = company.ctx;
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;

    // Dynamically scale canvas coordinates to match screen physical pixels (perfect Retina rendering)
    const targetWidth = Math.round(W * dpr);
    const targetHeight = Math.round(H * dpr);
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cols = this.GRID_COLS;
    const totalActive = company.activeCellsCount;
    const fillStyleColor = company.isTarget ? this.colorAccent : this.colorText1;

    // Precalculate physical pixel boundaries for columns and rows to ensure perfect grid snapping
    const cellLayouts = new Float32Array(40 * 3); // left, top, size
    const availableWidth = W - 39; // W minus 39 gaps of 1px
    const gapPhysical = Math.round(dpr); // 1 CSS pixel gap in physical pixels

    for (let i = 0; i < 40; i++) {
      const pLeft = Math.round(i * availableWidth / 40 * dpr) + i * gapPhysical;
      const pRight = Math.round((i + 1) * availableWidth / 40 * dpr) + i * gapPhysical;
      cellLayouts[i * 3] = pLeft;
      cellLayouts[i * 3 + 1] = pRight - pLeft; // width
    }

    for (let i = 0; i < this.TOTAL_CELLS; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      const pX = cellLayouts[col * 3];
      const pW = cellLayouts[col * 3 + 1];
      const pY = cellLayouts[row * 3];
      const pH = cellLayouts[row * 3 + 1];

      if (i < totalActive) {
        const cell = company.canvasCells[i];
        if (cell.opacity > 0.005) {
          if (Math.abs(cell.scale - 1.0) < 0.005) {
            // Highly optimized non-transform path
            ctx.strokeStyle = `rgba(250, 250, 250, ${0.45 * cell.opacity})`;
            ctx.lineWidth = 1;
            ctx.strokeRect(pX + 0.5, pY + 0.5, pW - 1, pH - 1);

            if (cell.fillProgress > 0.005) {
              ctx.fillStyle = fillStyleColor;
              ctx.globalAlpha = cell.opacity * cell.fillProgress;
              ctx.fillRect(pX, pY, pW, pH);
              ctx.globalAlpha = 1.0;
            }
          } else {
            // Scaling transform path
            ctx.save();
            ctx.translate(pX + pW / 2, pY + pH / 2);
            ctx.scale(cell.scale, cell.scale);

            ctx.strokeStyle = `rgba(250, 250, 250, ${0.45 * cell.opacity})`;
            ctx.lineWidth = 1;
            ctx.strokeRect(-pW / 2 + 0.5, -pH / 2 + 0.5, pW - 1, pH - 1);

            if (cell.fillProgress > 0.005) {
              ctx.fillStyle = fillStyleColor;
              ctx.globalAlpha = cell.opacity * cell.fillProgress;
              ctx.fillRect(-pW / 2, -pH / 2, pW, pH);
            }
            ctx.restore();
          }
        }
      } else {
        // Inactive background cell
        ctx.strokeStyle = 'rgba(250, 250, 250, 0.015)';
        ctx.lineWidth = 1;
        ctx.strokeRect(pX + 0.5, pY + 0.5, pW - 1, pH - 1);
      }
    }
  },

  _updateGrid(company, elapsed) {
    const totalActive = company.activeCellsCount;
    const revCells = company.revenue;

    let targetCount = 0;
    let targetFilled = 0;
    let targetCleared = 0;

    const p1 = this.anim.durationPhase1; // 1500
    const p2 = this.anim.durationPhase2; // 1500
    const p3 = this.anim.durationPhase3; // 1200
    const p4 = this.anim.durationPhase4; // 800

    // Detect loop wrap-around reset
    if (elapsed < company.lastElapsed) {
      company.currentCount = -1;
      company.currentFilled = -1;
      company.currentCleared = -1;

      // Force synchronous reset of all active cells to initial hidden state
      company.canvasCells.forEach(cell => {
        cell.opacity = 0;
        cell.scale = 0.95;
        cell.fillProgress = 0;
      });
    }
    company.lastElapsed = elapsed;

    if (elapsed < p1) {
      // Phase 1: Grid Construction (0ms -> 1500ms)
      const progress = elapsed / p1;
      targetCount = Math.floor(progress * totalActive);
      targetFilled = 0;
      targetCleared = 0;
    } else if (elapsed < p1 + p2) {
      // Phase 2: Revenue Fill (1500ms -> 3000ms)
      const progress = (elapsed - p1) / p2;
      targetCount = totalActive;
      targetFilled = Math.floor(progress * revCells);
      targetCleared = 0;
    } else if (elapsed < p1 + p2 + p3) {
      // Phase 3: Reading Pause (3000ms -> 4200ms)
      targetCount = totalActive;
      targetFilled = revCells;
      targetCleared = 0;
    } else {
      // Phase 4: Diagonal Clear (4200ms -> 5000ms)
      const progress = (elapsed - (p1 + p2 + p3)) / p4;
      targetCount = totalActive;
      targetFilled = revCells;
      targetCleared = Math.floor(progress * totalActive);
    }

    // Update target state for each active cell and run transitions
    let needsRedraw = false;
    for (let i = 0; i < totalActive; i++) {
      let targetOpacity = 0;
      let targetScale = 0.95;
      let targetFillProgress = 0;

      if (elapsed < p1) {
        const diagIdx = company.diagonalRanks[i];
        if (diagIdx < targetCount) {
          targetOpacity = 1;
          targetScale = 1.0;
        }
      } else if (elapsed < p1 + p2 + p3) {
        targetOpacity = 1;
        targetScale = 1.0;
        if (i < targetFilled) {
          targetFillProgress = 1;
        }
      } else {
        const diagIdx = company.diagonalRanks[i];
        if (diagIdx >= targetCleared) {
          targetOpacity = 1;
          targetScale = 1.0;
          if (i < revCells) {
            targetFillProgress = 1;
          }
        }
      }

      const cell = company.canvasCells[i];
      const prevOpacity = cell.opacity;
      const prevScale = cell.scale;
      const prevFill = cell.fillProgress;

      // Smooth interpolation using simple exponential decay
      cell.opacity += (targetOpacity - cell.opacity) * 0.25;
      cell.scale += (targetScale - cell.scale) * 0.25;
      cell.fillProgress += (targetFillProgress - cell.fillProgress) * 0.25;

      // Snap values when very close to target to prevent infinite redraws
      if (Math.abs(cell.opacity - targetOpacity) < 0.005) cell.opacity = targetOpacity;
      if (Math.abs(cell.scale - targetScale) < 0.005) cell.scale = targetScale;
      if (Math.abs(cell.fillProgress - targetFillProgress) < 0.005) cell.fillProgress = targetFillProgress;

      if (cell.opacity !== prevOpacity || cell.scale !== prevScale || cell.fillProgress !== prevFill) {
        needsRedraw = true;
      }
    }

    // Only draw the canvas if grid values change or cells are currently animating
    if (
      company.currentCount !== targetCount ||
      company.currentFilled !== targetFilled ||
      company.currentCleared !== targetCleared ||
      needsRedraw
    ) {
      this._drawCanvas(company);
      company.currentCount = targetCount;
      company.currentFilled = targetFilled;
      company.currentCleared = targetCleared;
    }
  }
};


/**
 * 5. Chart Scroll Reveal
 *    Fades every .chart-block into view as it enters the viewport.
 *    Uses a single IntersectionObserver for all chart blocks.
 */
const ChartReveal = {
  init() {
    const blocks = document.querySelectorAll('.chart-block');
    if (!blocks.length) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('chart-revealed');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    blocks.forEach(b => io.observe(b));
  }
};


/**
 * 6. Preparation Pool Infographic — scroll-reveal animation
 *    Reveals each pool-card and the pool-total banner when the
 *    #fig-prep-pool figure enters the viewport.
 */
const PoolInfographic = {
  init() {
    const figure = document.getElementById('fig-prep-pool');
    if (!figure) return;

    const cardsContainer = figure.querySelector('.pool-cards');
    if (!cardsContainer) return;

    // Cache DOM references
    const cards = Array.from(cardsContainer.querySelectorAll('.pool-card'));
    const total = figure.querySelector('.pool-total');

    // Create and append the progress overlay and glow elements dynamically
    const progressOverlay = document.createElement('div');
    progressOverlay.className = 'pool-cards-progress';
    cardsContainer.appendChild(progressOverlay);

    const glowDot = document.createElement('div');
    glowDot.className = 'pool-cards-glow';
    cardsContainer.appendChild(glowDot);

    // Make cards keyboard-focusable
    cards.forEach(card => {
      card.setAttribute('tabindex', '0');
    });

    // Setup interactive mode event listeners (only active when container has .pool-cards--interactive)
    cards.forEach(card => {
      // Desktop Hover
      card.addEventListener('mouseenter', () => {
        if (!cardsContainer.classList.contains('pool-cards--interactive')) return;
        this.highlightCard(cards, card);
      });

      // Keyboard Focus
      card.addEventListener('focus', () => {
        if (!cardsContainer.classList.contains('pool-cards--interactive')) return;
        this.highlightCard(cards, card);
      });

      // Mobile Tap / Click
      card.addEventListener('click', (e) => {
        if (!cardsContainer.classList.contains('pool-cards--interactive')) return;
        e.stopPropagation(); // Avoid triggering document click handler immediately
        this.highlightCard(cards, card);
      });
    });

    // Leave container / Hover end
    cardsContainer.addEventListener('mouseleave', () => {
      if (!cardsContainer.classList.contains('pool-cards--interactive')) return;
      this.clearHighlights(cards);
    });

    // Blur / Focus end
    cardsContainer.addEventListener('focusout', () => {
      if (!cardsContainer.classList.contains('pool-cards--interactive')) return;
      setTimeout(() => {
        // Clear only if focus left the entire cards block
        if (!cardsContainer.contains(document.activeElement)) {
          this.clearHighlights(cards);
        }
      }, 10);
    });

    // Tapping outside cards to remove active highlight
    document.addEventListener('click', () => {
      if (!cardsContainer.classList.contains('pool-cards--interactive')) return;
      this.clearHighlights(cards);
    });

    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      cards.forEach(card => card.classList.add('pool-visible'));
      if (total) total.classList.add('pool-visible');
      progressOverlay.style.width = '100%';
      // Enable interactive mode immediately
      cardsContainer.classList.add('pool-cards--interactive');
      return;
    }

    // Set transition delays of all cards to 0 so we control their reveal in JS
    cards.forEach(card => {
      card.style.transitionDelay = '0ms';
    });

    // Mark container as animating (temporarily overrides Card 4's static highlights)
    // and set the initial highlight state on the 1st card ("3rd Year MBBS")
    cardsContainer.classList.add('pool-cards--animating');
    cards[0].classList.add('pool-card--highlighted');

    let hasAnimated = false;

    // IntersectionObserver scroll trigger (runs once per session)
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !hasAnimated) {
        hasAnimated = true;
        observer.disconnect();

        this.startAnimation(cardsContainer, cards, total, progressOverlay, glowDot);
      }
    }, { threshold: 0.12 });

    observer.observe(figure);
  },

  startAnimation(cardsContainer, cards, total, progressOverlay, glowDot) {
    const duration = 2400; // 2.4 seconds total journey time
    const startTime = performance.now();

    // Show glow dot dynamically
    glowDot.classList.add('pool-glow-active');

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth ease-in-out quadratic curve for premium motion pacing
      const easedProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const percent = easedProgress * 100;

      // Update progress overlay line and traveling glow position
      progressOverlay.style.width = `${percent}%`;

      // Calculate glow position based on percentages matching the line spacing
      glowDot.style.left = `calc((100% - 2 * (var(--sp-4) + 22px)) * ${easedProgress} + (var(--sp-4) + 22px))`;

      // Determine the currently active cohort index (highest reached threshold)
      let activeIndex = 0;
      cards.forEach((card, index) => {
        const threshold = index / (cards.length - 1);
        if (easedProgress >= threshold - 0.02) { // 2% early tolerance for overlapping feel
          activeIndex = index;
          if (!card.classList.contains('pool-visible')) {
            card.classList.add('pool-visible');
          }
        }
      });

      // Synchronize the highlighted accent border (only one card highlighted at a time)
      cards.forEach((card, index) => {
        if (index === activeIndex) {
          card.classList.add('pool-card--highlighted');
        } else {
          card.classList.remove('pool-card--highlighted');
        }
      });

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Animation complete: fade out the glow dot
        glowDot.classList.remove('pool-glow-active');

        // Reveal the total active preparation pool banner
        if (total) {
          total.classList.add('pool-visible');
        }

        // Clean up progress overlay, glow element, and animating classes to restore exact original visual identity
        // and transition the figure into full interactive mode
        setTimeout(() => {
          progressOverlay.remove();
          glowDot.remove();
          cardsContainer.classList.remove('pool-cards--animating');
          cards.forEach(card => card.classList.remove('pool-card--highlighted'));
          cardsContainer.classList.add('pool-cards--interactive');
        }, 500);
      }
    };

    requestAnimationFrame(step);
  },

  highlightCard(cards, activeCard) {
    cards.forEach(card => {
      if (card === activeCard) {
        card.classList.add('pool-card--highlighted');
      } else {
        card.classList.remove('pool-card--highlighted');
      }
    });
  },

  clearHighlights(cards) {
    cards.forEach(card => {
      card.classList.remove('pool-card--highlighted');
    });
  }
};


/**
 * 7. Global Video Card Component & Playback Manager
 * Ensures lazy-loaded playback, keyboard accessibility, and single-active-video restriction.
 */
const VideoCardManager = {
  activeWrapper: null,

  init() {
    // 1. Auto-generate inner HTML structure for declarative video shells
    const videoBlocks = document.querySelectorAll('.media-video');
    videoBlocks.forEach(block => {
      if (!block.querySelector('.media-video__wrapper')) {
        this.renderComponent(block);
      }
    });

    // 2. Query wrappers (both static and dynamically rendered)
    const wrappers = document.querySelectorAll('.media-video__wrapper');
    if (!wrappers.length) return;

    wrappers.forEach(wrapper => {
      // Click event
      wrapper.addEventListener('click', () => {
        this.playVideo(wrapper);
      });

      // Keyboard event (Space or Enter key)
      wrapper.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          this.playVideo(wrapper);
        }
      });
    });

    // Escape key exits fullscreen or stops active video
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeWrapper) {
        this.stopVideo(this.activeWrapper);
      }
    });
  },

  renderComponent(block) {
    const rawUrl = block.getAttribute('data-youtube-url');
    const videoId = block.getAttribute('data-video-id') || this.extractVideoId(rawUrl);
    const thumbnail = block.getAttribute('data-thumbnail') || '';
    const title = block.getAttribute('data-title') || '';
    const desc = block.getAttribute('data-desc') || '';
    const caption = block.getAttribute('data-caption') || '';

    if (!videoId) return;

    // Normalize data-video-id attribute on the host element
    block.setAttribute('data-video-id', videoId);

    let html = `
      <div class="media-video__wrapper" tabindex="0" role="button" aria-label="Play video${title ? ': ' + title : ''}">
        <div class="media-video__preview">
          <img src="${thumbnail}" alt="Video Thumbnail" class="media-video__thumb" loading="lazy" />
          <div class="media-video__overlay"></div>
          <button class="media-video__play-btn" tabindex="-1" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>
        <div class="media-video__player"></div>
      </div>
    `;

    if (title || desc) {
      html += `
        <div class="media-video__info">
          ${title ? `<h4 class="media-video__title">${title}</h4>` : ''}
          ${desc ? `<p class="media-video__desc">${desc}</p>` : ''}
        </div>
      `;
    }

    if (caption) {
      html += `
        <span class="media-video__caption">${caption}</span>
      `;
    }

    block.innerHTML = html;
  },

  extractVideoId(url) {
    if (!url) return '';
    // Extract video ID from standard YouTube links, share URLs, embeds, etc.
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
  },

  playVideo(wrapper) {
    if (this.activeWrapper === wrapper) return;

    // 1. Stop any currently playing video
    if (this.activeWrapper) {
      this.stopVideo(this.activeWrapper);
    }

    const videoBlock = wrapper.closest('.media-video');
    if (!videoBlock) return;

    const videoId = videoBlock.getAttribute('data-video-id');
    if (!videoId) return;

    const playerContainer = wrapper.querySelector('.media-video__player');
    const previewContainer = wrapper.querySelector('.media-video__preview');
    if (!playerContainer || !previewContainer) return;

    // 2. Inject YouTube iframe (lazy load on click)
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}`;
    iframe.title = videoBlock.querySelector('.media-video__title')?.textContent || "YouTube Video Player";
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');

    playerContainer.innerHTML = '';
    playerContainer.appendChild(iframe);

    // 3. Hide thumbnail preview layer
    previewContainer.classList.add('media-video__preview--hidden');

    // 4. Set as active
    this.activeWrapper = wrapper;

    // Add active class to card for border color highlights
    videoBlock.classList.add('media-video--active');
  },

  stopVideo(wrapper) {
    const videoBlock = wrapper.closest('.media-video');
    const playerContainer = wrapper.querySelector('.media-video__player');
    const previewContainer = wrapper.querySelector('.media-video__preview');
    if (!playerContainer || !previewContainer) return;

    // 1. Remove the iframe completely (destroys player, stops audio/video network usage)
    playerContainer.innerHTML = '';

    // 2. Show the thumbnail preview layer again
    previewContainer.classList.remove('media-video__preview--hidden');

    // 3. Clear active class
    if (videoBlock) {
      videoBlock.classList.remove('media-video--active');
    }

    // 4. Reset active tracker
    if (this.activeWrapper === wrapper) {
      this.activeWrapper = null;
    }
  }
};


/**
 * Shared Animation Manager
 * Registers animated elements and manages their start, loop, stop, and reset cycles
 * using a single, unified IntersectionObserver to optimize CPU utilization.
 */
const AnimationManager = {
  observer: null,
  registry: new Map(),

  init() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const component = this.registry.get(entry.target);
        if (!component) return;

        if (entry.isIntersecting) {
          component.start();
        } else {
          component.stop();
          component.reset();
        }
      });
    }, { threshold: 0.05 });
  },

  register(element, component) {
    if (!this.observer) {
      this.init();
    }
    this.registry.set(element, component);
    this.observer.observe(element);
    component.reset(); // Initialize component to off-screen / reset state
  },

  unregister(element) {
    if (this.observer) {
      this.observer.unobserve(element);
    }
    this.registry.delete(element);
  }
};


/**
 * 8. Main "Neurocrack" Brand Title Typewriter Animation
 * Refactored to loop while visible and reset to empty when offscreen.
 */
const BrandTypewriter = {
  init() {
    const brand = document.querySelector('.cover-hero__brand');
    if (!brand) return;

    const text = brand.textContent.trim(); // "NEUROCRACK"
    brand.innerHTML = '';

    const fragment = document.createDocumentFragment();
    const chars = text.split('').map(char => {
      const span = document.createElement('span');
      span.textContent = char;
      span.className = 'typewriter-char';
      span.style.visibility = 'hidden';
      fragment.appendChild(span);
      return span;
    });

    const cursor = document.createElement('span');
    cursor.className = 'typewriter-cursor';
    fragment.insertBefore(cursor, chars[0]);
    brand.appendChild(fragment);

    const component = {
      timeoutRef: null,
      timeoutRef2: null,
      timeoutRef3: null,
      currentCharIndex: 0,
      isPlaying: false,

      start() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.type();
      },

      stop() {
        this.isPlaying = false;
        if (this.timeoutRef) clearTimeout(this.timeoutRef);
        if (this.timeoutRef2) clearTimeout(this.timeoutRef2);
        if (this.timeoutRef3) clearTimeout(this.timeoutRef3);
      },

      reset() {
        this.stop();
        this.currentCharIndex = 0;
        chars.forEach(span => {
          span.style.visibility = 'hidden';
        });
        cursor.classList.remove('typewriter-cursor--fade-out');
        if (!brand.contains(cursor)) {
          brand.insertBefore(cursor, chars[0]);
        } else {
          brand.insertBefore(cursor, chars[0]);
        }
      },

      type() {
        if (!this.isPlaying) return;

        if (this.currentCharIndex < chars.length) {
          chars[this.currentCharIndex].style.visibility = 'visible';
          brand.insertBefore(cursor, chars[this.currentCharIndex].nextSibling);
          this.currentCharIndex++;
          this.timeoutRef = setTimeout(() => this.type(), 80);
        } else {
          // Completed typing: fade cursor out, wait, then remove, then restart loop
          cursor.classList.add('typewriter-cursor--fade-out');
          this.timeoutRef2 = setTimeout(() => {
            cursor.remove();
            this.timeoutRef3 = setTimeout(() => {
              this.reset();
              this.start();
            }, 3000); // 3-second pause at completed title before loop restart
          }, 500);
        }
      }
    };

    AnimationManager.register(brand, component);
  }
};


/**
 * 9. Reusable Trend Graph Animation Engine
 * Progressive path draw, intermediate dots, glowing marker, and label reveals.
 * Loops while visible and cleans up timers/listeners completely offscreen.
 */
const TrendGraphEngine = {
  init(figureId) {
    const figure = document.getElementById(figureId);
    if (!figure) return;

    const svg = figure.querySelector('svg');
    const path = svg ? svg.querySelector('path') : null;
    if (!path) return;

    const allCircles = Array.from(svg.querySelectorAll('circle'));
    const pathIndex = allCircles.findIndex(c => path.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING);
    const trailingCircles = pathIndex >= 0 ? allCircles.slice(pathIndex) : [];

    const intermediatePoints = trailingCircles.filter(c => !c.classList.contains('chart-glow-point'));
    const terminalPoint = trailingCircles.find(c => c.classList.contains('chart-glow-point'));

    const textElements = svg.querySelectorAll('text');
    const terminalLabel = textElements.length > 0 ? textElements[textElements.length - 1] : null;

    const pointData = intermediatePoints.map(el => ({
      element: el,
      cx: parseFloat(el.getAttribute('cx') || 0)
    }));

    const pathLength = path.getTotalLength();
    const duration = Math.round(pathLength * 3.1);

    const component = {
      requestRef: null,
      timeoutRef1: null,
      timeoutRef2: null,
      timeoutRef3: null,
      isPlaying: false,
      startTime: null,

      start() {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
          path.style.strokeDasharray = 'none';
          path.style.strokeDashoffset = '0';
          pointData.forEach(pt => {
            pt.element.classList.remove('fig1-1-hidden');
            pt.element.classList.add('fig1-1-fade-in');
          });
          if (terminalPoint) {
            terminalPoint.classList.remove('fig1-1-hidden');
            terminalPoint.classList.add('fig1-1-fade-in');
          }
          if (terminalLabel) {
            terminalLabel.classList.remove('fig1-1-hidden');
            terminalLabel.classList.add('fig1-1-fade-in');
          }
          return;
        }

        if (this.isPlaying) return;
        this.isPlaying = true;
        this.startTime = null;
        this.requestRef = requestAnimationFrame((ts) => this.loop(ts));
      },

      stop() {
        this.isPlaying = false;
        if (this.requestRef) {
          cancelAnimationFrame(this.requestRef);
          this.requestRef = null;
        }
        if (this.timeoutRef1) clearTimeout(this.timeoutRef1);
        if (this.timeoutRef2) clearTimeout(this.timeoutRef2);
        if (this.timeoutRef3) clearTimeout(this.timeoutRef3);
      },

      reset() {
        this.stop();
        path.style.strokeDasharray = pathLength;
        path.style.strokeDashoffset = pathLength;

        pointData.forEach(pt => {
          pt.element.classList.add('fig1-1-hidden');
          pt.element.classList.remove('fig1-1-fade-in');
        });
        if (terminalPoint) {
          terminalPoint.classList.add('fig1-1-hidden');
          terminalPoint.classList.remove('fig1-1-fade-in');
        }
        if (terminalLabel) {
          terminalLabel.classList.add('fig1-1-hidden');
          terminalLabel.classList.remove('fig1-1-fade-in');
        }
      },

      loop(timestamp) {
        if (!this.isPlaying) return;
        if (!this.startTime) {
          this.startTime = timestamp;
        }
        const elapsed = timestamp - this.startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 2);

        path.style.strokeDashoffset = pathLength * (1 - easedProgress);

        const currentLength = pathLength * easedProgress;
        const currentPoint = path.getPointAtLength(currentLength);
        const currentX = currentPoint.x;

        pointData.forEach(pt => {
          if (currentX >= pt.cx - 1.5) {
            pt.element.classList.remove('fig1-1-hidden');
            pt.element.classList.add('fig1-1-fade-in');
          }
        });

        if (progress < 1) {
          this.requestRef = requestAnimationFrame((ts) => this.loop(ts));
        } else {
          path.style.strokeDasharray = 'none';
          path.style.strokeDashoffset = '0';

          pointData.forEach(pt => {
            pt.element.classList.remove('fig1-1-hidden');
            pt.element.classList.add('fig1-1-fade-in');
          });

          this.timeoutRef1 = setTimeout(() => {
            if (terminalPoint) {
              terminalPoint.classList.remove('fig1-1-hidden');
              terminalPoint.classList.add('fig1-1-fade-in');
            }

            this.timeoutRef2 = setTimeout(() => {
              if (terminalLabel) {
                terminalLabel.classList.remove('fig1-1-hidden');
                terminalLabel.classList.add('fig1-1-fade-in');
              }

              // Loop reset: wait 3 seconds, then restart animation!
              this.timeoutRef3 = setTimeout(() => {
                this.reset();
                this.start();
              }, 3000);

            }, 100);
          }, 120);
        }
      }
    };

    AnimationManager.register(figure, component);
  }
};


/**
 * Chapter 7 — Comparison Graph Animation Engine
 * Progressive baseline and accent line draws, staggered connectors, markers, and labels.
 * Loops while visible and cleans up completely offscreen.
 */
const ComparisonGraphEngine = {
  init(figureId) {
    const figure = document.getElementById(figureId);
    if (!figure) return;

    const svg = figure.querySelector('svg');
    if (!svg) return;

    const baselinePath = svg.querySelector('.comparison-baseline');
    const accentPath = svg.querySelector('.comparison-accent');
    const markers = svg.querySelectorAll('.comparison-marker');
    const labels = svg.querySelectorAll('.comparison-label');

    if (!baselinePath || !accentPath) return;

    const baselineLength = baselinePath.getTotalLength();
    const accentLength = accentPath.getTotalLength();

    const component = {
      requestRef: null,
      timeoutRef1: null,
      timeoutRef2: null,
      timeoutRef3: null,
      timeoutRef4: null,
      isPlaying: false,
      startTime: null,
      baselineDuration: 1200,
      accentDuration: 1200,

      start() {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
          baselinePath.style.strokeDasharray = 'none';
          baselinePath.style.strokeDashoffset = '0';
          accentPath.style.strokeDasharray = 'none';
          accentPath.style.strokeDashoffset = '0';
          markers.forEach(el => el.style.opacity = '1');
          labels.forEach(el => el.style.opacity = '1');
          return;
        }

        if (this.isPlaying) return;
        this.isPlaying = true;
        this.startTime = null;
        this.requestRef = requestAnimationFrame((ts) => this.loopBaseline(ts));
      },

      stop() {
        this.isPlaying = false;
        if (this.requestRef) {
          cancelAnimationFrame(this.requestRef);
          this.requestRef = null;
        }
        if (this.timeoutRef1) clearTimeout(this.timeoutRef1);
        if (this.timeoutRef2) clearTimeout(this.timeoutRef2);
        if (this.timeoutRef3) clearTimeout(this.timeoutRef3);
        if (this.timeoutRef4) clearTimeout(this.timeoutRef4);
      },

      reset() {
        this.stop();
        baselinePath.style.strokeDasharray = `${baselineLength} ${baselineLength}`;
        baselinePath.style.strokeDashoffset = baselineLength;

        accentPath.style.strokeDasharray = `${accentLength} ${accentLength}`;
        accentPath.style.strokeDashoffset = accentLength;

        markers.forEach(el => el.style.opacity = '0');
        labels.forEach(el => el.style.opacity = '0');
      },

      loopBaseline(timestamp) {
        if (!this.isPlaying) return;
        if (!this.startTime) {
          this.startTime = timestamp;
        }
        const elapsed = timestamp - this.startTime;
        const progress = Math.min(elapsed / this.baselineDuration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3); // cubic ease-out

        baselinePath.style.strokeDashoffset = baselineLength * (1 - easedProgress);

        if (progress < 1) {
          this.requestRef = requestAnimationFrame((ts) => this.loopBaseline(ts));
        } else {
          baselinePath.style.strokeDasharray = '4 4';
          baselinePath.style.strokeDashoffset = '0';

          this.timeoutRef1 = setTimeout(() => {
            this.startTime = null; // reset clock for next animation segment
            this.requestRef = requestAnimationFrame((ts) => this.loopAccent(ts));
          }, 300);
        }
      },

      loopAccent(timestamp) {
        if (!this.isPlaying) return;
        if (!this.startTime) {
          this.startTime = timestamp;
        }
        const elapsed = timestamp - this.startTime;
        const progress = Math.min(elapsed / this.accentDuration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);

        accentPath.style.strokeDashoffset = accentLength * (1 - easedProgress);

        if (progress < 1) {
          this.requestRef = requestAnimationFrame((ts) => this.loopAccent(ts));
        } else {
          accentPath.style.strokeDasharray = 'none';
          accentPath.style.strokeDashoffset = '0';

          this.timeoutRef2 = setTimeout(() => {
            markers.forEach(el => el.style.opacity = '1');

            this.timeoutRef3 = setTimeout(() => {
              labels.forEach(el => el.style.opacity = '1');

              // Loop reset: wait 3 seconds, then restart comparison!
              this.timeoutRef4 = setTimeout(() => {
                this.reset();
                this.start();
              }, 3000);

            }, 200);
          }, 200);
        }
      }
    };

    AnimationManager.register(figure, component);
  }
};


/**
 * Chapter 8 — Learning Journey Timeline Engine
 * Animates the horizontal process flow steps based on scroll progress.
 * Attaches scroll/resize listeners only when visible and cleans them up offscreen.
 */
const TimelineEngine = {
  init() {
    const flow = document.querySelector('.process-flow');
    if (!flow) return;

    const steps = Array.from(flow.querySelectorAll('.process-step'));
    if (!steps.length) return;

    const updateTimeline = () => {
      const rect = flow.getBoundingClientRect();
      const flowTop = rect.top + window.scrollY;
      const flowHeight = rect.height;
      const windowHeight = window.innerHeight;

      // Expanded vertical range to reduce scroll sensitivity and give more reading time per milestone
      const startScroll = flowTop - windowHeight * 0.95;
      const endScroll = flowTop + flowHeight - windowHeight * 0.05;
      const scrollDist = endScroll - startScroll;
      if (scrollDist <= 0) return;

      const scrollY = window.scrollY;
      let progress = (scrollY - startScroll) / scrollDist;
      progress = Math.max(0, Math.min(1, progress));

      const activeIndex = Math.min(steps.length - 1, Math.floor(progress * steps.length));

      steps.forEach((step, idx) => {
        if (idx === activeIndex) {
          step.classList.add('process-step--active');
          step.classList.remove('process-step--completed');
        } else if (idx < activeIndex) {
          step.classList.remove('process-step--active');
          step.classList.add('process-step--completed');
        } else {
          step.classList.remove('process-step--active', 'process-step--completed');
        }
      });
    };

    const component = {
      isPlaying: false,

      start() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        window.addEventListener('scroll', updateTimeline, { passive: true });
        window.addEventListener('resize', updateTimeline, { passive: true });
        updateTimeline();
      },

      stop() {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        window.removeEventListener('scroll', updateTimeline);
        window.removeEventListener('resize', updateTimeline);
      },

      reset() {
        this.stop();
        steps.forEach(step => {
          step.classList.remove('process-step--active', 'process-step--completed');
        });
      }
    };

    AnimationManager.register(flow, component);
  }
};


/**
 * Chapter 9 — Progress Roadmap Engine
 * Animates the vertical and horizontal growth roadmap based on scroll progress.
 * Listens to scroll/resize events only when visible.
 */
const RoadmapEngine = {
  init(figureId) {
    const container = document.getElementById(figureId);
    if (!container) return;

    const journey = container.querySelector('.roadmap-journey');
    const pipeline = container.querySelector('.roadmap-pipeline');
    if (!journey || !pipeline) return;

    const nodes = Array.from(journey.querySelectorAll('.roadmap-node'));
    const pipelineStates = Array.from(pipeline.querySelectorAll('.pipeline-state'));
    if (!nodes.length || !pipelineStates.length) return;

    const bar = document.createElement('div');
    bar.className = 'roadmap-progress-bar';
    journey.appendChild(bar);

    const glow = document.createElement('div');
    glow.className = 'roadmap-glow-dot';
    journey.appendChild(glow);

    const calculateBulletPositions = () => {
      return nodes.map(node => {
        const bullet = node.querySelector('div');
        return node.offsetTop + bullet.offsetTop + bullet.offsetHeight / 2;
      });
    };

    let bulletPositions = calculateBulletPositions();
    let startY = bulletPositions[0];
    let endY = bulletPositions[bulletPositions.length - 1];
    let totalLineHeight = endY - startY;

    bar.style.top = `${startY}px`;
    bar.style.height = `${totalLineHeight}px`;

    const updateRoadmap = () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        bar.style.transform = 'scaleY(1)';
        glow.classList.remove('roadmap-glow--active');
        nodes.forEach((n, idx) => {
          if (idx === 4) n.classList.add('roadmap-node--active');
          else n.classList.remove('roadmap-node--active');
        });
        pipelineStates.forEach((s, idx) => {
          if (idx === 4) s.classList.add('pipeline-state--active');
          else s.classList.remove('pipeline-state--active');
        });
        return;
      }

      const rect = journey.getBoundingClientRect();
      const journeyTop = rect.top + window.scrollY;

      const viewportCenter = window.scrollY + window.innerHeight / 2;
      let progress = (viewportCenter - (journeyTop + startY)) / totalLineHeight;
      progress = Math.max(0, Math.min(1, progress));

      const currentY = startY + progress * totalLineHeight;

      bar.style.transform = `scaleY(${progress})`;
      glow.style.top = `${currentY}px`;

      if (progress > 0.01 && progress < 0.99) {
        glow.classList.add('roadmap-glow--active');
      } else {
        glow.classList.remove('roadmap-glow--active');
      }

      let activeIndex = 0;
      let minDiff = Infinity;
      bulletPositions.forEach((y, idx) => {
        const diff = Math.abs(currentY - y);
        if (diff < minDiff) {
          minDiff = diff;
          activeIndex = idx;
        }
      });

      nodes.forEach((node, idx) => {
        if (idx === activeIndex) {
          node.classList.add('roadmap-node--active');
        } else {
          node.classList.remove('roadmap-node--active');
        }
      });

      pipelineStates.forEach((state, idx) => {
        if (idx === activeIndex) {
          state.classList.add('pipeline-state--active');
        } else {
          state.classList.remove('pipeline-state--active');
        }
      });
    };

    const handleResize = () => {
      bulletPositions = calculateBulletPositions();
      startY = bulletPositions[0];
      endY = bulletPositions[bulletPositions.length - 1];
      totalLineHeight = endY - startY;
      bar.style.top = `${startY}px`;
      bar.style.height = `${totalLineHeight}px`;
      updateRoadmap();
    };

    const component = {
      isPlaying: false,

      start() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        window.addEventListener('scroll', updateRoadmap, { passive: true });
        window.addEventListener('resize', handleResize, { passive: true });
        updateRoadmap();
      },

      stop() {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        window.removeEventListener('scroll', updateRoadmap);
        window.removeEventListener('resize', handleResize);
      },

      reset() {
        this.stop();
        bar.style.transform = 'scaleY(0)';
        glow.style.top = `${startY}px`;
        glow.classList.remove('roadmap-glow--active');
        nodes.forEach(n => n.classList.remove('roadmap-node--active'));
        pipelineStates.forEach(s => s.classList.remove('pipeline-state--active'));
      }
    };

    AnimationManager.register(container, component);
  }
};


/**
 * Chapter 10 — Section Reveal Motion System
 * Handles fading and translating page sections as they enter the viewport.
 */
const SectionRevealEngine = {
  init() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Select major structural blocks
    const selectors = [
      '.section-hero',
      '.chapter-header',
      '.content-block',
      '.chapter-summary'
    ];

    const blocks = document.querySelectorAll(selectors.join(', '));
    if (!blocks.length) return;

    // Apply the pending reveal class dynamically (static fallback if JS disabled)
    blocks.forEach(b => {
      // Don't animate blocks that are already revealed or have custom reveal logic
      if (!b.classList.contains('chart-block')) {
        b.classList.add('reveal-pending');
      }
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('reveal-pending');
          entry.target.classList.add('reveal-active');
          observer.unobserve(entry.target);

          // Clean up the classes completely after transition completes to restore normal DOM states
          setTimeout(() => {
            entry.target.classList.remove('reveal-active');
          }, 800);
        }
      });
    }, {
      threshold: 0.02,
      rootMargin: '0px 0px -8% 0px' // slightly offset trigger from the bottom
    });

    blocks.forEach(b => {
      if (!b.classList.contains('chart-block')) {
        observer.observe(b);
      }
    });
  }
};

