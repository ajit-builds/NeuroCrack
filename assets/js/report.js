/**
 * NeuroCrack Report - Main JavaScript Interactivity & Navigation
 * Production Pass 03 — Reading Experience & Navigation
 */

document.addEventListener('DOMContentLoaded', () => {
  LiveNavigator.init();
  ReadingProgressBar.init();
  ScrollToTop.init();
  SubscriberRevenueMatrix.init();
  ChartReveal.init();
  PoolInfographic.init();
  VideoCardManager.init();
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

  GRID_COLS:   40,
  TOTAL_CELLS: 1600, // 40 × 40

  /* ── Company dataset ───────────────────────────────────────────── */
  data: [
    { id: 'marrow',      name: 'Marrow',            subscribers: 500000, revenue: 773, isTarget: false },
    { id: 'doctutorials', name: 'DocTutorials',      subscribers: 200000, revenue: 70,  isTarget: false },
    { id: 'cerebellum',  name: 'Cerebellum Academy', subscribers: 300000,  revenue: 102,  isTarget: false },
    { id: 'neurocrack',  name: 'NeuroCrack',         subscribers: 100000, revenue: 15,  isTarget: true  }
  ],

  /* ── Bootstrap ─────────────────────────────────────────────────── */
  init() {
    const container = document.getElementById('srm-container');
    if (!container) return;

    this.data.forEach((company) => {
      // 1 unit = 1 cell.
      // Subscribers: 500K -> 500 cells, 100K -> 100 cells, 40K -> 40 cells
      const subCells = Math.round(company.subscribers / 1000);
      // Revenue: ₹700 Cr -> 700 cells, ₹140 Cr -> 140 cells, ₹75 Cr -> 75 cells, ₹150 Cr -> 150 cells
      const revCells = company.revenue;

      container.appendChild(this._buildCard(company, subCells, revCells));
    });
  },

  /* ── Build one company card ─────────────────────────────────────── */
  _buildCard(company, subCells, revCells) {
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

    /* 40 × 40 matrix */
    const matrix = document.createElement('div');
    matrix.className = 'srm-matrix';

    // Both metrics exist inside the same matrix sequentially:
    // First, draw filled revenue cells.
    // Immediately following, draw hollow subscriber cells.
    // The rest of the cells are empty.
    for (let i = 0; i < this.TOTAL_CELLS; i++) {
      const cell = document.createElement('div');
      if (i < revCells) {
        // Filled white cell (or green for target)
        cell.className = 'srm-cell srm-cell--rev srm-cell--rev-on';
      } else if (i < revCells + subCells) {
        // Hollow outlined cell
        cell.className = 'srm-cell srm-cell--sub';
      } else {
        // Empty cell
        cell.className = 'srm-cell srm-cell--empty';
      }
      matrix.appendChild(cell);
    }

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
    card.appendChild(matrix);
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

    let fired = false;
    const io = new IntersectionObserver((entries) => {
      if (!fired && entries[0].isIntersecting) {
        fired = true;
        io.disconnect();

        // Reveal each pool card
        figure.querySelectorAll('.pool-card').forEach(card => {
          card.classList.add('pool-visible');
        });

        // Reveal the total banner (CSS delay handles stagger)
        const total = figure.querySelector('.pool-total');
        if (total) total.classList.add('pool-visible');
      }
    }, { threshold: 0.12 });

    io.observe(figure);
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
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0`;
    iframe.title = videoBlock.querySelector('.media-video__title')?.textContent || "YouTube Video Player";
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
    iframe.setAttribute('allowfullscreen', 'true');
    
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

