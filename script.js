/* ==========================================================================
   Personal bio website: interaction layer v2
   --------------------------------------------------------------------------
   - Intro curtain that waits for fonts + hero image, then lifts once
   - Eased smooth scrolling (cancels when the visitor takes over)
   - Header: frosted state, auto-hide on scroll down, reappears on scroll up
   - Accurate active nav (including #contact), scroll progress bar
   - Reveals that also work for very tall sections, staggered per group
   - Cursor glow, hero tilt, magnetic buttons, card spotlight (mouse only)
   - Lightbox built from the gallery HTML: crossfade, preload, swipe, focus
     trap, inert background, scrollbar-safe, Home/End keys, error fallback
   - Every feature is isolated: if one fails, the rest still run
   - Respects prefers-reduced-motion
   ========================================================================== */

(() => {
  'use strict';

  /* ---------- Settings you can change ---------- */
  const CONFIG = {
    introOncePerSession: false, // true = curtain plays only on a visitor's first load per session
    introMinMs: 900,            // shortest time the curtain stays
    introMaxMs: 3500,           // failsafe: lift no matter what after this
    hideHeaderOnScroll: true,   // hide header when scrolling down, show when scrolling up
    headerHideAfterPx: 320,
    spotlightSelector: '.journey-card, .social-card',
    magneticSelector: '.btn, .button, [data-magnetic]',
  };

  /* ---------- Helpers ---------- */
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';

  const body = document.body;
  const header = $('.site-header') || $('header');
  const nav = $('.site-nav');
  const navToggle = $('.nav-toggle');
  const navLinks = $$('.site-nav a');

  const init = (name, fn) => {
    try {
      fn();
    } catch (error) {
      console.error(`[site] "${name}" failed to start`, error);
    }
  };

  /* ---------- Injected styles (placed first so your own CSS wins) ---------- */
  init('styles', () => {
    const style = document.createElement('style');
    style.setAttribute('data-enhancements', 'true');
    style.textContent = `
      .scroll-progress{position:fixed;inset:0 0 auto 0;height:3px;z-index:9999;pointer-events:none;
        transform-origin:0 50%;transform:scaleX(0);
        background:linear-gradient(90deg,var(--accent,#c9a45c),var(--accent-2,#e6cf93));}

      .page-curtain{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;
        transition:transform .95s cubic-bezier(.76,0,.24,1);will-change:transform;}
      .page-curtain.is-done{transform:translateY(-100%);}
      .page-curtain__inner{display:flex;flex-direction:column;align-items:center;gap:1rem;}
      .page-curtain__mark{font-family:var(--font-display,Georgia,serif);font-weight:500;
        font-size:clamp(2.4rem,7vw,4rem);line-height:1;letter-spacing:.14em;padding-left:.14em;
        opacity:0;transform:translateY(12px);animation:curtain-mark .9s ${EASE_OUT} .1s forwards;}
      .page-curtain__line{width:clamp(4rem,12vw,7rem);height:1px;background:var(--accent,#c9a45c);
        transform:scaleX(0);animation:curtain-line 1s ${EASE_OUT} .35s forwards;}
      .page-curtain.is-done .page-curtain__inner{opacity:0;transition:opacity .3s ease;}
      @keyframes curtain-mark{to{opacity:1;transform:none;}}
      @keyframes curtain-line{to{transform:scaleX(1);}}

      .reveal{transition-delay:var(--reveal-delay,0ms);}

      .site-header.is-hidden{transform:translateY(-101%);}

      .journey-card::before,.social-card::before{content:"";position:absolute;inset:0;border-radius:inherit;
        pointer-events:none;opacity:0;transition:opacity .5s ease;
        background:radial-gradient(380px circle at var(--mx,50%) var(--my,50%),
          color-mix(in srgb,var(--accent,#c9a45c) 16%,transparent),transparent 55%);}
      .journey-card:hover::before,.social-card:hover::before{opacity:1;}
      .social-card{position:relative;overflow:hidden;}

      .lightbox-image{transition:opacity .35s ease,transform .6s ${EASE_OUT};}
      .lightbox-image.is-swapping{opacity:0;transform:scale(.97);}
      .lightbox-counter{display:block;margin-top:.35rem;font-size:.8rem;opacity:.65;
        font-variant-numeric:tabular-nums;}

      .gallery-item{cursor:zoom-in;}

      @media (prefers-reduced-motion: reduce){
        .page-curtain,.page-curtain__mark,.page-curtain__line,.lightbox-image{
          transition:none!important;animation:none!important;}
      }
    `;
    document.head.prepend(style);
  });

  /* ---------- Intro curtain ---------- */
  init('intro', () => {
    const seenKey = 'intro-seen';
    let seen = false;
    try {
      seen = sessionStorage.getItem(seenKey) === '1';
    } catch {
      /* storage unavailable: treat as first visit */
    }
    const forced = /[?&]intro\b/.test(location.search);
    const skip = reduceMotion || (CONFIG.introOncePerSession && seen && !forced);

    if (skip) {
      body.classList.add('is-ready');
      return;
    }

    const computed = getComputedStyle(body);
    const bg = computed.backgroundColor;
    const hasBg = bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
    const monogram = document.documentElement.dataset.monogram || 'NS';

    const curtain = document.createElement('div');
    curtain.className = 'page-curtain';
    curtain.setAttribute('aria-hidden', 'true');
    curtain.style.background = hasBg ? bg : '#0b0908';
    curtain.style.color = computed.color || '#fff';
    curtain.innerHTML =
      `<div class="page-curtain__inner"><span class="page-curtain__mark">${monogram}</span>` +
      '<span class="page-curtain__line"></span></div>';
    body.appendChild(curtain);

    let lifted = false;
    const lift = () => {
      if (lifted) return;
      lifted = true;
      curtain.classList.add('is-done');
      body.classList.add('is-ready');
      try {
        sessionStorage.setItem(seenKey, '1');
      } catch {
        /* ignore */
      }
      const remove = () => curtain.remove();
      curtain.addEventListener('transitionend', remove, { once: true });
      setTimeout(remove, 1800);
    };

    const heroImage = $('.hero-visual img');
    const imageReady =
      heroImage && heroImage.decode ? heroImage.decode().catch(() => {}) : Promise.resolve();
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    const minimum = new Promise((resolve) => setTimeout(resolve, CONFIG.introMinMs));

    Promise.all([minimum, imageReady, fontsReady]).then(lift);
    setTimeout(lift, CONFIG.introMaxMs);
  });

  /* ---------- Footer year ---------- */
  init('year', () => {
    const yearNode = document.getElementById('year');
    if (yearNode) yearNode.textContent = new Date().getFullYear();
  });

  /* ---------- Mobile navigation ---------- */
  const setNav = (open) => {
    if (!nav || !navToggle) return;
    nav.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };

  init('mobile-nav', () => {
    if (!nav || !navToggle) return;

    navToggle.addEventListener('click', () => setNav(!nav.classList.contains('is-open')));
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setNav(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setNav(false);
        navToggle.focus();
      }
    });

    document.addEventListener('click', (event) => {
      if (!nav.classList.contains('is-open')) return;
      if (nav.contains(event.target) || navToggle.contains(event.target)) return;
      setNav(false);
    });

    // leaving the mobile layout while the menu is open should not leave it stuck open
    window.matchMedia('(min-width: 961px)').addEventListener('change', (event) => {
      if (event.matches) setNav(false);
    });
  });

  /* ---------- Eased smooth scrolling ---------- */
  let cancelScrollAnimation = null;

  const scrollToY = (targetY, onDone) => {
    if (cancelScrollAnimation) cancelScrollAnimation();

    const maxY = document.documentElement.scrollHeight - window.innerHeight;
    const endY = Math.max(0, Math.min(targetY, maxY));
    const startY = window.scrollY;
    const distance = endY - startY;

    if (reduceMotion || Math.abs(distance) < 2) {
      window.scrollTo({ top: endY, left: 0, behavior: 'instant' });
      if (onDone) onDone();
      return;
    }

    const duration = Math.min(1500, Math.max(650, Math.abs(distance) * 0.55));
    const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const startTime = performance.now();
    let frameId = 0;

    const stop = () => {
      cancelAnimationFrame(frameId);
      ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((type) =>
        window.removeEventListener(type, stop)
      );
      cancelScrollAnimation = null;
    };

    const step = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      window.scrollTo({ top: startY + distance * easeInOut(t), left: 0, behavior: 'instant' });
      if (t < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        stop();
        if (onDone) onDone();
      }
    };

    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((type) =>
      window.addEventListener(type, stop, { passive: true, once: true })
    );
    cancelScrollAnimation = stop;
    frameId = requestAnimationFrame(step);
  };

  init('anchor-scroll', () => {
    $$('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const hash = link.getAttribute('href');
        if (!hash || hash.length < 2) return;

        let target = null;
        try {
          target = document.querySelector(hash);
        } catch {
          return;
        }
        if (!target) return;

        event.preventDefault();
        const offset = header ? header.offsetHeight : 0;
        const isHome = hash === '#home';
        const top = isHome ? 0 : target.getBoundingClientRect().top + window.scrollY - offset + 1;

        scrollToY(top, () => {
          if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        });
        history.replaceState(null, '', hash);
      });
    });
  });

  /* ---------- Active nav link ---------- */
  let shownActiveId = null;
  const setActiveLink = (id) => {
    if (id === shownActiveId) return;
    shownActiveId = id;
    navLinks.forEach((link) => {
      const isActive = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  };

  let observedActiveId = 'home';
  const contactEl = document.getElementById('contact');
  setActiveLink('home');

  init('active-nav', () => {
    if (!('IntersectionObserver' in window)) return;

    // every element a nav link points to
    const targets = [
      ...new Set(
        navLinks
          .map((link) => document.getElementById((link.getAttribute('href') || '').slice(1)))
          .filter(Boolean)
      ),
    ];
    // nested targets (like #contact inside #goals) are handled at the page bottom
    const topLevel = targets.filter(
      (el) => !targets.some((other) => other !== el && other.contains(el))
    );

    const inBand = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => inBand.set(entry.target.id, entry.isIntersecting));
        const current = topLevel.find((el) => inBand.get(el.id));
        if (current) {
          observedActiveId = current.id;
          setActiveLink(current.id);
        }
      },
      { rootMargin: '-35% 0px -60% 0px', threshold: 0 }
    );
    topLevel.forEach((el) => observer.observe(el));
  });

  /* ---------- Scroll progress, header state, header auto-hide ---------- */
  const progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  progressBar.setAttribute('aria-hidden', 'true');
  body.appendChild(progressBar);

  if (header) {
    header.style.transition =
      'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), background 0.5s ease, ' +
      'border-color 0.5s ease, -webkit-backdrop-filter 0.5s ease, backdrop-filter 0.5s ease';
  }

  let lastScrollY = window.scrollY;
  let scrollTicking = false;

  const onScrollFrame = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(y / max, 1) : 0;
    progressBar.style.transform = `scaleX(${progress.toFixed(4)})`;

    const atBottom = max > 0 && y >= max - 4;
    setActiveLink(atBottom && contactEl ? 'contact' : observedActiveId);

    if (header) {
      header.classList.toggle('is-scrolled', y > 24);

      if (CONFIG.hideHeaderOnScroll) {
        const delta = y - lastScrollY;
        const menuOpen = nav && nav.classList.contains('is-open');
        const focusInside = header.contains(document.activeElement);

        if (y > CONFIG.headerHideAfterPx && delta > 4 && !menuOpen && !focusInside) {
          header.classList.add('is-hidden');
        } else if (delta < -4 || y <= CONFIG.headerHideAfterPx || menuOpen || focusInside) {
          header.classList.remove('is-hidden');
        }
      }
    }

    lastScrollY = y;
    scrollTicking = false;
  };

  const requestScrollFrame = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(onScrollFrame);
  };

  window.addEventListener('scroll', requestScrollFrame, { passive: true });
  window.addEventListener('resize', requestScrollFrame, { passive: true });
  if (header) header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
  onScrollFrame();

  /* ---------- Cursor glow ---------- */
  init('cursor-glow', () => {
    body.style.setProperty('--cursor-x', '50vw');
    body.style.setProperty('--cursor-y', '50vh');

    if (!(finePointer && !reduceMotion)) {
      window.addEventListener(
        'pointermove',
        (event) => {
          body.style.setProperty('--cursor-x', `${event.clientX}px`);
          body.style.setProperty('--cursor-y', `${event.clientY}px`);
        },
        { passive: true }
      );
      return;
    }

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let rafId = null;

    const tick = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      body.style.setProperty('--cursor-x', `${currentX.toFixed(1)}px`);
      body.style.setProperty('--cursor-y', `${currentY.toFixed(1)}px`);

      const settled = Math.abs(targetX - currentX) < 0.4 && Math.abs(targetY - currentY) < 0.4;
      rafId = settled ? null : requestAnimationFrame(tick);
    };

    window.addEventListener(
      'pointermove',
      (event) => {
        targetX = event.clientX;
        targetY = event.clientY;
        if (rafId === null) rafId = requestAnimationFrame(tick);
      },
      { passive: true }
    );
  });

  /* ---------- Hero portrait tilt ---------- */
  init('hero-tilt', () => {
    const heroVisual = $('.hero-visual');
    const portraitCard = $('.portrait-card');
    if (!(heroVisual && portraitCard && finePointer && !reduceMotion)) return;

    portraitCard.style.willChange = 'transform';

    heroVisual.addEventListener('pointerenter', () => {
      portraitCard.style.transition = 'transform 0.18s ease-out';
    });

    heroVisual.addEventListener('pointermove', (event) => {
      const rect = heroVisual.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      portraitCard.style.transform =
        `perspective(1000px) translate(${(x * 14).toFixed(1)}px, ${(y * 14).toFixed(1)}px) ` +
        `rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg)`;
    });

    heroVisual.addEventListener('pointerleave', () => {
      portraitCard.style.transition = `transform 0.9s ${EASE_OUT}`;
      portraitCard.style.transform =
        'perspective(1000px) translate(0, 0) rotateX(0deg) rotateY(0deg)';
    });
  });

  /* ---------- Magnetic buttons ---------- */
  init('magnetic', () => {
    if (!(finePointer && !reduceMotion)) return;

    $$(CONFIG.magneticSelector).forEach((el) => {
      el.addEventListener('pointermove', (event) => {
        const rect = el.getBoundingClientRect();
        const x = event.clientX - (rect.left + rect.width / 2);
        const y = event.clientY - (rect.top + rect.height / 2);
        el.style.transition = 'transform 0.2s ease-out';
        el.style.transform = `translate(${(x * 0.18).toFixed(1)}px, ${(y * 0.25).toFixed(1)}px)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = `transform 0.6s ${EASE_OUT}`;
        el.style.transform = '';
      });
    });
  });

  /* ---------- Card spotlight (light follows the cursor inside cards) ---------- */
  init('spotlight', () => {
    if (!(finePointer && !reduceMotion)) return;

    $$(CONFIG.spotlightSelector).forEach((card) => {
      card.addEventListener(
        'pointermove',
        (event) => {
          const rect = card.getBoundingClientRect();
          card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
          card.style.setProperty('--my', `${event.clientY - rect.top}px`);
        },
        { passive: true }
      );
    });
  });

  /* ---------- Reveal on scroll + count-up ---------- */
  const animateCount = (el) => {
    const end = parseFloat(el.dataset.count);
    if (Number.isNaN(end)) return;

    const suffix = el.dataset.suffix || '';
    const decimals = (el.dataset.count.split('.')[1] || '').length;
    const duration = 1600;

    if (reduceMotion) {
      el.textContent = end.toFixed(decimals) + suffix;
      return;
    }

    const startTime = performance.now();
    const step = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t); // easeOutExpo
      el.textContent = (end * eased).toFixed(decimals) + suffix;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  init('reveal', () => {
    const revealItems = $$('.reveal');
    const countItems = $$('[data-count]');

    // stagger siblings
    const groups = new Map();
    revealItems.forEach((item) => {
      const parent = item.parentElement;
      const index = groups.get(parent) || 0;
      groups.set(parent, index + 1);
      item.style.setProperty('--reveal-delay', `${Math.min(index, 6) * 90}ms`);
    });

    const show = (el) => {
      el.classList.add('is-visible');
      if (el.hasAttribute('data-count')) animateCount(el);
    };

    if (!('IntersectionObserver' in window)) {
      revealItems.forEach(show);
      countItems.forEach(animateCount);
      return;
    }

    // one observer per element so very tall sections still trigger on small screens
    const watch = (el) => {
      const height = el.offsetHeight || 1;
      const threshold = Math.min(0.14, Math.max(0.01, (window.innerHeight * 0.2) / height));
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && entry.intersectionRatio >= threshold * 0.98) {
            show(el);
            observer.disconnect();
          }
        },
        { threshold, rootMargin: '0px 0px -6% 0px' }
      );
      observer.observe(el);
    };

    revealItems.forEach(watch);
    countItems.forEach((el) => {
      if (!el.classList.contains('reveal')) watch(el);
    });
  });

  /* ==========================================================================
     Gallery lightbox (reads images from the gallery HTML, nothing hard-coded)
     ========================================================================== */
  init('lightbox', () => {
    const galleryItems = $$('.gallery-item');
    if (!galleryItems.length) return;

    const galleryImages = galleryItems.map((item) => {
      const img = $('img', item);
      const captionEl = $('.gallery-caption', item);
      return {
        src: img ? img.getAttribute('src') : '',
        alt: img ? img.alt : '',
        title: item.dataset.title || (captionEl ? captionEl.textContent.trim() : ''),
      };
    });

    const total = galleryImages.length;
    const wrapIndex = (i) => (i + total) % total;
    let activeIndex = 0;
    let isOpen = false;

    const pageContent = $('.page-content');

    const lightbox = document.createElement('div');
    lightbox.className = 'gallery-lightbox';
    lightbox.setAttribute('aria-hidden', 'true');
    lightbox.innerHTML = `
      <div class="gallery-lightbox-backdrop" data-close="true"></div>
      <div class="gallery-lightbox-dialog" role="dialog" aria-modal="true" aria-label="Gallery image preview">
        <button type="button" class="lightbox-close" aria-label="Close image preview">×</button>
        <button type="button" class="lightbox-nav lightbox-prev" aria-label="Previous image">‹</button>
        <div class="lightbox-media-wrap">
          <img class="lightbox-image" src="" alt="" draggable="false" />
        </div>
        <button type="button" class="lightbox-nav lightbox-next" aria-label="Next image">›</button>
        <div class="lightbox-caption">
          <span class="lightbox-title"></span>
          <span class="lightbox-counter" aria-live="polite"></span>
        </div>
      </div>
    `;
    body.appendChild(lightbox);

    const dialog = $('.gallery-lightbox-dialog', lightbox);
    const image = $('.lightbox-image', lightbox);
    const title = $('.lightbox-title', lightbox);
    const counter = $('.lightbox-counter', lightbox);
    const closeBtn = $('.lightbox-close', lightbox);
    const prevBtn = $('.lightbox-prev', lightbox);
    const nextBtn = $('.lightbox-next', lightbox);

    let renderToken = 0;
    let lastFocused = null;

    const preload = (index) => {
      const item = galleryImages[wrapIndex(index)];
      if (item && item.src) new Image().src = item.src;
    };

    const render = (animate = true) => {
      const item = galleryImages[activeIndex];
      if (!item) return;
      const token = ++renderToken;

      const apply = () => {
        if (token !== renderToken) return;
        image.src = item.src;
        image.alt = item.alt;
        title.textContent = item.title;
        counter.textContent = `${activeIndex + 1} / ${total}`;
        preload(activeIndex + 1);
        preload(activeIndex - 1);
      };

      if (!animate || reduceMotion) {
        apply();
        return;
      }

      image.classList.add('is-swapping');
      const incoming = new Image();
      incoming.src = item.src;

      const reveal = () => {
        if (token !== renderToken) return;
        apply();
        requestAnimationFrame(() => image.classList.remove('is-swapping'));
      };

      setTimeout(() => {
        if (incoming.decode) incoming.decode().then(reveal, reveal);
        else reveal();
      }, 180);
    };

    // if a file is missing, say so instead of showing a broken icon
    image.addEventListener('error', () => {
      if (!image.getAttribute('src')) return;
      image.classList.remove('is-swapping');
      title.textContent = 'This image could not be loaded';
    });

    const go = (step) => {
      activeIndex = wrapIndex(activeIndex + step);
      render();
    };

    const lockScroll = () => {
      const gap = window.innerWidth - document.documentElement.clientWidth;
      body.classList.add('lightbox-open');
      if (gap > 0) {
        body.style.paddingRight = `${gap}px`;
        if (header) header.style.paddingRight = `${gap}px`;
      }
    };

    const unlockScroll = () => {
      body.classList.remove('lightbox-open');
      body.style.paddingRight = '';
      if (header) header.style.paddingRight = '';
    };

    const open = (index) => {
      activeIndex = wrapIndex(index);
      lastFocused = document.activeElement;
      lockScroll();
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      if (pageContent) pageContent.inert = true;
      isOpen = true;
      render(false);
      setTimeout(() => closeBtn.focus(), 20);
    };

    const close = () => {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      if (pageContent) pageContent.inert = false;
      unlockScroll();
      isOpen = false;
      const trigger = galleryItems[activeIndex] || lastFocused;
      if (trigger && trigger.focus) trigger.focus({ preventScroll: true });
    };

    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', () => go(-1));
    nextBtn.addEventListener('click', () => go(1));
    lightbox.addEventListener('click', (event) => {
      if (event.target.matches('[data-close="true"]')) close();
    });

    document.addEventListener('keydown', (event) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          close();
          break;
        case 'ArrowLeft':
          go(-1);
          break;
        case 'ArrowRight':
          go(1);
          break;
        case 'Home':
          event.preventDefault();
          activeIndex = 0;
          render();
          break;
        case 'End':
          event.preventDefault();
          activeIndex = total - 1;
          render();
          break;
        case 'Tab': {
          const focusable = [closeBtn, prevBtn, nextBtn];
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          } else if (!dialog.contains(document.activeElement)) {
            event.preventDefault();
            first.focus();
          }
          break;
        }
        default:
      }
    });

    // swipe (ignore presses that start on a button)
    let startX = 0;
    let startY = 0;
    let swipeArmed = false;
    dialog.addEventListener(
      'pointerdown',
      (event) => {
        swipeArmed = !event.target.closest('button');
        startX = event.clientX;
        startY = event.clientY;
      },
      { passive: true }
    );
    dialog.addEventListener(
      'pointerup',
      (event) => {
        if (!swipeArmed) return;
        swipeArmed = false;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx > 0 ? -1 : 1);
      },
      { passive: true }
    );

    galleryItems.forEach((item, index) => {
      if (item.tagName !== 'BUTTON' && item.tagName !== 'A') {
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');
        item.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            item.click();
          }
        });
      }
      item.addEventListener('click', () => open(index));
    });
  });
})();