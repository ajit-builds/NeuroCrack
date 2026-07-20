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
 *    Both metrics exist inside the SAME matrix sequentially.
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

  /* ── Bootstrap ─────────────────────────────────────────────────── */
  init() {
    const container = document.getElementById('srm-container');
    if (!container) return;

    this.data.forEach((company, index) => {
      // 1 unit = 1 cell.
      // Subscribers: 500K -> 500 cells, 100K -> 100 cells, 40K -> 40 cells
      const subCells = Math.round(company.subscribers / 1000);
      // Revenue: ₹700 Cr -> 700 cells, ₹140 Cr -> 140 cells, ₹75 Cr -> 75 cells, ₹150 Cr -> 150 cells
      const revCells = company.revenue;

      container.appendChild(this._buildCard(company, subCells, revCells, index));
    });
  },

  /* ── Build one company card ─────────────────────────────────────── */
  _buildCard(company, subCells, revCells, cardIndex) {
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

    /* Background Matrix (1600 empty cells) */
    const matrixBg = document.createElement('div');
    matrixBg.className = 'srm-matrix srm-matrix--bg';
    for (let i = 0; i < this.TOTAL_CELLS; i++) {
      const cell = document.createElement('div');
      cell.className = 'srm-cell srm-cell--empty';
      matrixBg.appendChild(cell);
    }

    /* Foreground Matrix (actual cells) */
    const baseDelay = 750 + cardIndex * 2850;
    const matrixFg = document.createElement('div');
    matrixFg.className = 'srm-matrix srm-matrix--fg';
    for (let i = 0; i < this.TOTAL_CELLS; i++) {
      const cell = document.createElement('div');
      const isRev = i < revCells;
      const isSub = !isRev && i < (revCells + subCells);

      if (isRev) {
        cell.className = 'srm-cell srm-cell--rev srm-cell--rev-on';
      } else if (isSub) {
        cell.className = 'srm-cell srm-cell--sub';
      } else {
        cell.className = 'srm-cell srm-cell--empty';
      }

      if (isRev || isSub) {
        const col = i % this.GRID_COLS;
        cell.style.animationDelay = `${baseDelay + col * 25}ms`;
      }
      matrixFg.appendChild(cell);
    }

    container.appendChild(matrixBg);
    container.appendChild(matrixFg);

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
 * 8. Main "Neurocrack" Brand Title Typewriter Animation
 * Handles sequential character reveal with a blinking cursor,
 * preserving layout width and ensuring a single-execution flow on page load.
 */
const BrandTypewriter = {
  init() {
    const brand = document.querySelector('.cover-hero__brand');
    if (!brand) return;

    const text = brand.textContent.trim(); // "NEUROCRACK"
    brand.innerHTML = '';

    const fragment = document.createDocumentFragment();

    // Create character spans
    const chars = text.split('').map(char => {
      const span = document.createElement('span');
      span.textContent = char;
      span.className = 'typewriter-char';
      span.style.visibility = 'hidden';
      fragment.appendChild(span);
      return span;
    });

    // Create cursor element
    const cursor = document.createElement('span');
    cursor.className = 'typewriter-cursor';

    // Insert cursor at the beginning
    fragment.insertBefore(cursor, chars[0]);
    brand.appendChild(fragment);

    // Typing speed: ~80ms per character
    const typingSpeed = 80;
    let currentCharIndex = 0;

    const type = () => {
      if (currentCharIndex < chars.length) {
        chars[currentCharIndex].style.visibility = 'visible';
        brand.insertBefore(cursor, chars[currentCharIndex].nextSibling);
        currentCharIndex++;
        setTimeout(type, typingSpeed);
      } else {
        // Typing complete: fade out cursor and then remove it
        cursor.classList.add('typewriter-cursor--fade-out');
        setTimeout(() => {
          cursor.remove();
        }, 500);
      }
    };

    // Begin typing sequence with a small delay for dramatic cinematic effect (150ms)
    setTimeout(type, 150);
  }
};


/**
 * 9. Figure 1.1 (MBBS Seats Growth Line Chart) Progressive Draw Animation
 * Animates the SVG path from left to right when it enters the viewport.
 * Coordinates reveal of dots and terminal text without any layout shift.
 */
/**
 * Reusable Trend Graph Animation Engine (Chapter 6)
 * Handles progressive path drawing, staggered dots, terminal glowing point,
 * and final text label fades for single-series line graphs.
 */
const TrendGraphEngine = {
  init(figureId) {
    const figure = document.getElementById(figureId);
    if (!figure) return;

    const svg = figure.querySelector('svg');
    const path = svg ? svg.querySelector('path') : null;
    if (!path) return;

    // Discover data point circles dynamically:
    // They are siblings coming after the path in the SVG.
    const allCircles = Array.from(svg.querySelectorAll('circle'));
    const pathIndex = allCircles.findIndex(c => path.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING);
    const trailingCircles = pathIndex >= 0 ? allCircles.slice(pathIndex) : [];

    // Filter intermediate points and terminal glowing point
    const intermediatePoints = trailingCircles.filter(c => !c.classList.contains('chart-glow-point'));
    const terminalPoint = trailingCircles.find(c => c.classList.contains('chart-glow-point'));

    // Discover the terminal label dynamically (last text element inside SVG)
    const textElements = svg.querySelectorAll('text');
    const terminalLabel = textElements.length > 0 ? textElements[textElements.length - 1] : null;

    // Cache points data to avoid DOM queries inside animation frames
    const pointData = intermediatePoints.map(el => ({
      element: el,
      cx: parseFloat(el.getAttribute('cx') || 0)
    }));

    // Calculate length of the path for stroke-dasharray and stroke-dashoffset
    const pathLength = path.getTotalLength();

    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      path.style.strokeDasharray = 'none';
      path.style.strokeDashoffset = '0';
      return;
    }

    // Hide components by adding CSS helper class before animation starts
    pointData.forEach(pt => pt.element.classList.add('fig1-1-hidden'));
    if (terminalPoint) terminalPoint.classList.add('fig1-1-hidden');
    if (terminalLabel) terminalLabel.classList.add('fig1-1-hidden');

    // Set initial dasharray and fully offset it
    path.style.strokeDasharray = pathLength;
    path.style.strokeDashoffset = pathLength;

    let hasAnimated = false;

    // IntersectionObserver scroll trigger (runs only once per session)
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !hasAnimated) {
        hasAnimated = true;
        observer.disconnect();

        // Calculate a natural speed-dependent duration (e.g. length * 3.1ms, approx 2100ms)
        const duration = Math.round(pathLength * 3.1);

        this.animateLine(path, pathLength, pointData, terminalPoint, terminalLabel, duration);
      }
    }, { threshold: 0.1 });

    observer.observe(figure);
  },

  animateLine(path, pathLength, pointData, terminalPoint, terminalLabel, duration) {
    const startTime = performance.now();

    const draw = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth ease-out curve (quadratic)
      const easedProgress = 1 - Math.pow(1 - progress, 2);

      // Update stroke dashoffset
      const currentOffset = pathLength * (1 - easedProgress);
      path.style.strokeDashoffset = currentOffset;

      // Find current X coordinate of the leading path tip
      const currentLength = pathLength * easedProgress;
      const currentPoint = path.getPointAtLength(currentLength);
      const currentX = currentPoint.x;

      // Reveal intermediate points as soon as line tip reaches their x-coordinate
      pointData.forEach(pt => {
        if (currentX >= pt.cx - 1.5) {
          pt.element.classList.remove('fig1-1-hidden');
          pt.element.classList.add('fig1-1-fade-in');
        }
      });

      if (progress < 1) {
        requestAnimationFrame(draw);
      } else {
        // Line drawing completed. Clean up line styles.
        path.style.strokeDasharray = 'none';
        path.style.strokeDashoffset = '0';

        // Reveal remaining intermediate points (safety pass)
        pointData.forEach(pt => {
          pt.element.classList.remove('fig1-1-hidden');
          pt.element.classList.add('fig1-1-fade-in');
        });

        // Staggered terminal sequence:
        // Wait 120ms, then reveal glowing terminal point
        setTimeout(() => {
          if (terminalPoint) {
            terminalPoint.classList.remove('fig1-1-hidden');
            terminalPoint.classList.add('fig1-1-fade-in');
          }

          // Wait another 100ms, then reveal terminal label text
          setTimeout(() => {
            if (terminalLabel) {
              terminalLabel.classList.remove('fig1-1-hidden');
              terminalLabel.classList.add('fig1-1-fade-in');
            }

            // Cleanup: remove temporary classes completely after animation ends
            setTimeout(() => {
              pointData.forEach(pt => {
                pt.element.classList.remove('fig1-1-hidden', 'fig1-1-fade-in');
              });
              if (terminalPoint) terminalPoint.classList.remove('fig1-1-hidden', 'fig1-1-fade-in');
              if (terminalLabel) terminalLabel.classList.remove('fig1-1-hidden', 'fig1-1-fade-in');
            }, 300); // Allow transition to settle, then clear classes

          }, 100);

        }, 120);
      }
    };

    requestAnimationFrame(draw);
  }
};


/**
 * Chapter 7 — Comparison Graph Animation Engine
 * Handles drawing multi-series lines sequentially, then fading in connectors,
 * markers, and value callouts for Figure 6.12.
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

    // Check for prefers-reduced-motion
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

    // Measure path lengths
    const baselineLength = baselinePath.getTotalLength();
    const accentLength = accentPath.getTotalLength();

    // Set initial offsets (temporarily make baseline solid for progressive draw)
    baselinePath.style.strokeDasharray = `${baselineLength} ${baselineLength}`;
    baselinePath.style.strokeDashoffset = baselineLength;

    accentPath.style.strokeDasharray = `${accentLength} ${accentLength}`;
    accentPath.style.strokeDashoffset = accentLength;

    // Hide markers and labels
    markers.forEach(el => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.4s ease';
    });
    labels.forEach(el => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.4s ease';
    });

    let hasAnimated = false;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !hasAnimated) {
        hasAnimated = true;
        observer.disconnect();

        this.animate(baselinePath, baselineLength, accentPath, accentLength, markers, labels);
      }
    }, { threshold: 0.1 });

    observer.observe(figure);
  },

  animate(baselinePath, baselineLength, accentPath, accentLength, markers, labels) {
    const baselineDuration = 1200;
    const startTime = performance.now();

    const drawBaseline = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / baselineDuration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3); // cubic ease-out

      baselinePath.style.strokeDashoffset = baselineLength * (1 - easedProgress);

      if (progress < 1) {
        requestAnimationFrame(drawBaseline);
      } else {
        // Restore dashed style
        baselinePath.style.strokeDasharray = '4 4';
        baselinePath.style.strokeDashoffset = '0';

        // Stage 2: Pause 300ms, then draw Neuro-Informed Study
        setTimeout(() => {
          const accentStartTime = performance.now();
          const accentDuration = 1200;

          const drawAccent = (accentNow) => {
            const accentElapsed = accentNow - accentStartTime;
            const accentProgress = Math.min(accentElapsed / accentDuration, 1);
            const accentEasedProgress = 1 - Math.pow(1 - accentProgress, 3);

            accentPath.style.strokeDashoffset = accentLength * (1 - accentEasedProgress);

            if (accentProgress < 1) {
              requestAnimationFrame(drawAccent);
            } else {
              accentPath.style.strokeDasharray = 'none';
              accentPath.style.strokeDashoffset = '0';

              // Stage 3: Pause 200ms, then fade in vertical comparison connector and markers
              setTimeout(() => {
                markers.forEach(el => el.style.opacity = '1');

                // Stage 4: Pause 200ms, then fade in callout labels
                setTimeout(() => {
                  labels.forEach(el => el.style.opacity = '1');
                }, 200);

              }, 200);
            }
          };

          requestAnimationFrame(drawAccent);
        }, 300);
      }
    };

    requestAnimationFrame(drawBaseline);
  }
};


/**
 * Chapter 8 — Learning Journey Timeline Engine
 * Animates the horizontal process flow steps based on scroll progress of Chapter 1.
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

      // Animation starts when element top enters the bottom 75% of viewport
      const startScroll = flowTop - windowHeight * 0.75;
      // Animation ends when element bottom enters the top 25% of viewport
      const endScroll = flowTop + flowHeight - windowHeight * 0.25;
      const scrollDist = endScroll - startScroll;
      if (scrollDist <= 0) return;

      const scrollY = window.scrollY;
      let progress = (scrollY - startScroll) / scrollDist;
      progress = Math.max(0, Math.min(1, progress));

      // Calculate active step index (0 to 5)
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

    // Run on scroll
    window.addEventListener('scroll', updateTimeline, { passive: true });
    // Run on resize
    window.addEventListener('resize', updateTimeline, { passive: true });
    // Run once initially
    updateTimeline();
  }
};


/**
 * Chapter 9 — Progress Roadmap Engine
 * Animates the vertical and horizontal growth roadmap based on scroll progress.
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

    // Inject the progress bar overlay and travelling glow dot dynamically
    const bar = document.createElement('div');
    bar.className = 'roadmap-progress-bar';
    journey.appendChild(bar);

    const glow = document.createElement('div');
    glow.className = 'roadmap-glow-dot';
    journey.appendChild(glow);

    // Calculate Y coordinates of the milestone bullets relative to journey container
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

    // Position progress bar overlay statically
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

      // Calculate progress when viewport center moves from startY to endY of the vertical line
      const viewportCenter = window.scrollY + window.innerHeight / 2;
      let progress = (viewportCenter - (journeyTop + startY)) / totalLineHeight;
      progress = Math.max(0, Math.min(1, progress));

      const currentY = startY + progress * totalLineHeight;

      // Scale the progress line and position the glow dot
      bar.style.transform = `scaleY(${progress})`;
      glow.style.top = `${currentY}px`;

      // Show/hide glow dot at the boundaries to prevent overflow rendering
      if (progress > 0.01 && progress < 0.99) {
        glow.classList.add('roadmap-glow--active');
      } else {
        glow.classList.remove('roadmap-glow--active');
      }

      // Proximity-based active index calculation
      let activeIndex = 0;
      let minDiff = Infinity;
      bulletPositions.forEach((y, idx) => {
        const diff = Math.abs(currentY - y);
        if (diff < minDiff) {
          minDiff = diff;
          activeIndex = idx;
        }
      });

      // Synchronously toggle active states on vertical milestones
      nodes.forEach((node, idx) => {
        if (idx === activeIndex) {
          node.classList.add('roadmap-node--active');
        } else {
          node.classList.remove('roadmap-node--active');
        }
      });

      // Synchronously toggle active states on horizontal pipeline items
      pipelineStates.forEach((state, idx) => {
        if (idx === activeIndex) {
          state.classList.add('pipeline-state--active');
        } else {
          state.classList.remove('pipeline-state--active');
        }
      });
    };

    // Listen to window scroll and resize events
    window.addEventListener('scroll', updateRoadmap, { passive: true });
    window.addEventListener('resize', () => {
      bulletPositions = calculateBulletPositions();
      startY = bulletPositions[0];
      endY = bulletPositions[bulletPositions.length - 1];
      totalLineHeight = endY - startY;
      bar.style.top = `${startY}px`;
      bar.style.height = `${totalLineHeight}px`;
      updateRoadmap();
    }, { passive: true });

    // Run once initially
    updateRoadmap();
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

