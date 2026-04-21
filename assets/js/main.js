/* ══════════════════════════════════════════════
   HYLND — main.js
   
   Animation system fixes:
   1. Tilt uses perspective + rotateX/Y on card element
      BUT resets to 'translateY(0) scale(1)' not ''
      so revealed cards don't snap back to off-screen
   2. Curtain uses clip-path — no transform snap-back
   3. Reveal uses pure JS stagger, no CSS delay conflict
   4. Scroll reveals fire immediately when in viewport
   5. RAF-throttled scroll handlers for 60fps
══════════════════════════════════════════════ */
'use strict';

let CUR  = 'home';
let BUSY = false;

/* ══ REVEAL ══════════════════════════════════
   All [data-reveal] elements start hidden via CSS.
   revealPage() staggers them with setTimeout.
   Elements get .in class which sets opacity:1, transform:none.
   No CSS transition-delay — JS owns timing 100%.
══════════════════════════════════════════════ */
function revealPage(pageId, startDelay) {
  startDelay = startDelay || 0;
  const pg = document.getElementById('page-' + pageId);
  if (!pg) return;

  const els = Array.from(pg.querySelectorAll('[data-reveal]'));
  
  // Reset all reveals on this page
  els.forEach(el => {
    el.classList.remove('in');
    el.style.transitionDelay = '';
  });

  els.forEach((el, i) => {
    // base stagger 65ms per item + small bonus for data-delay hint
    const d   = parseInt(el.dataset.delay || 0);
    const ms  = startDelay + i * 65 + d * 30;
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight + 60) {
        el.classList.add('in');
      } else {
        // Below fold — use observer
        revealObs.observe(el);
      }
    }, ms);
  });
}

/* IntersectionObserver for below-fold elements */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.05, rootMargin: '0px 0px -10px 0px' });

/* Scroll-triggered reveal fallback */
function checkScrollReveals() {
  const pg = document.getElementById('page-' + CUR);
  if (!pg) return;
  pg.querySelectorAll('[data-reveal]:not(.in)').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.93) {
      el.classList.add('in');
      revealObs.unobserve(el);
    }
  });
}

/* ══ LOADER ══════════════════════════════════ */
window.addEventListener('load', () => {
  // Bar fills in ~1.5s; we wait 2s total then slide loader up
  setTimeout(() => {
    const loader = document.getElementById('loader');
    loader.classList.add('out');
    // Remove from DOM after animation
    setTimeout(() => { loader.style.display = 'none'; }, 700);
    // Reveal home page content
    revealPage('home', 120);
  }, 2000);
});

/* ══ NAVBAR ════════════════════════════════ */
let navTick = false;
window.addEventListener('scroll', () => {
  if (navTick) return;
  navTick = true;
  requestAnimationFrame(() => {
    document.getElementById('nav').classList.toggle('s', window.scrollY > 32);
    checkScrollReveals();
    navTick = false;
  });
}, { passive: true });

/* ══ MOBILE NAV ════════════════════════════ */
const $tog = document.getElementById('ntog');
const $nl  = document.getElementById('nlinks');

$tog.addEventListener('click', () => {
  const open = $nl.classList.toggle('open');
  const s = $tog.querySelectorAll('span');
  s[0].style.transform = open ? 'translateY(7px) rotate(45deg)' : '';
  s[1].style.opacity   = open ? '0'   : '';
  s[2].style.transform = open ? 'translateY(-7px) rotate(-45deg)' : '';
});

function closeNav() {
  $nl.classList.remove('open');
  const s = $tog.querySelectorAll('span');
  s[0].style.transform = '';
  s[1].style.opacity   = '';
  s[2].style.transform = '';
}

/* ══ PAGE TRANSITION ══════════════════════
   Timing:
   ├── 0ms    curtain.wipe-in starts   (clip from bottom, 440ms)
   ├── 460ms  curtain fully covers     → swap page here
   ├── 460ms  curtain.wipe-out starts  (clip to top, 440ms)
   ├── 900ms  curtain fully gone       → revealPage fires
   └── content reveals start           (~900ms from click)
══════════════════════════════════════════ */
function goTo(page) {
  if (BUSY || page === CUR) return;
  BUSY = true;
  closeNav();

  const curtain = document.getElementById('curtain');

  // Reset then force reflow before adding class
  curtain.className = '';
  void curtain.offsetWidth;
  curtain.className = 'wipe-in';

  setTimeout(() => {
    // Swap page content while screen is fully covered
    document.getElementById('page-' + CUR).classList.remove('active');
    document.getElementById('page-' + page).classList.add('active');
    window.scrollTo(0, 0);
    CUR = page;
    updateNav();

    // Force reflow so new page is rendered before curtain lifts
    void document.getElementById('page-' + page).offsetHeight;

    // Start wipe-out
    curtain.className = 'wipe-out';

    setTimeout(() => {
      // Curtain fully gone — hide it cleanly
      curtain.className = '';
      BUSY = false;
      revealPage(page, 0);
    }, 460);

  }, 460);
}

function updateNav() {
  document.querySelectorAll('.nl').forEach(a => {
    a.classList.toggle('on', a.dataset.page === CUR);
  });
}

/* ══ CLICK DELEGATION ═══════════════════ */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-page]');
  if (t) { e.preventDefault(); goTo(t.dataset.page); }
});

/* ══ PARALLAX ════════════════════════════
   Subtle only — orbs on hero move with scroll
══════════════════════════════════════════ */
let pTick = false;
window.addEventListener('scroll', () => {
  if (CUR !== 'home' || pTick) return;
  pTick = true;
  requestAnimationFrame(() => {
    const y  = window.scrollY;
    const o1 = document.querySelector('.horb1');
    const o2 = document.querySelector('.horb2');
    if (o1) o1.style.transform = `translateY(${y * .1}px)`;
    if (o2) o2.style.transform = `translateY(${-y * .07}px)`;
    pTick = false;
  });
}, { passive: true });

/* ══ CARD TILT ════════════════════════════
   FIX: mouseleave resets to 'translateY(0) scale(1)'
   NOT '' — so revealed cards don't revert to
   translateY(28px) and disappear.
   
   Uses CSS perspective on parent container.
   Transition on the card element itself is very short
   so it snaps into tilt instantly and eases out on leave.
══════════════════════════════════════════ */
function attachTilt(containerSel, cardSel, maxDeg) {
  document.querySelectorAll(containerSel).forEach(container => {
    container.style.perspective = '1000px';
    const card = cardSel ? container.querySelector(cardSel) : container;
    if (!card) return;

    // Short transition for enter (feels responsive), longer for leave (smooth settle)
    card.style.transition = 'transform .12s ease, border-color .32s, box-shadow .32s';

    let raf = null;

    container.addEventListener('mousemove', e => {
      if (window.innerWidth < 768) return;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = container.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width  - .5) * 2;
        const y = ((e.clientY - r.top)  / r.height - .5) * 2;
        const ry =  x * maxDeg;
        const rx = -y * maxDeg;
        card.style.transform = `translateY(-6px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      });
    });

    container.addEventListener('mouseleave', () => {
      if (raf) cancelAnimationFrame(raf);
      // CRITICAL: reset to neutral transform, not '' 
      // '' would revert to CSS value which for revealed elements is translateY(0) anyway
      // but for safety we set explicitly so browser has no ambiguity
      card.style.transition = 'transform .5s cubic-bezier(.16,1,.3,1), border-color .32s, box-shadow .32s';
      card.style.transform  = 'translateY(0) rotateX(0deg) rotateY(0deg)';
      // After settle, clear inline transform so CSS hover works cleanly
      setTimeout(() => {
        card.style.transition = 'transform .12s ease, border-color .32s, box-shadow .32s';
        card.style.transform  = '';
      }, 520);
    });
  });
}

// Attach tilt — container = the card itself (it has perspective set on it)
// We tilt the card directly; works because no conflicting CSS transform on hover
attachTilt('.pc',     null, 4);
attachTilt('.nc',     null, 3);
attachTilt('.pcard',  null, 2);
attachTilt('.pillar', null, 2.5);

/* ══ CONTACT FORM ════════════════════════ */
const ctf = document.getElementById('ctf');
if (ctf) {
  ctf.addEventListener('submit', e => {
    e.preventDefault();
    const btn = ctf.querySelector('.btn-red');
    const orig = btn.textContent;
    btn.textContent = 'Sending…';
    btn.disabled = true;
    btn.style.opacity = '.65';
    setTimeout(() => {
      btn.textContent  = '✓ Sent!';
      btn.style.opacity = '1';
      btn.style.background = '#16a34a';
      ctf.reset();
      setTimeout(() => {
        btn.textContent = orig;
        btn.style.background = '';
        btn.disabled = false;
      }, 3000);
    }, 1400);
  });
}

/* ══ INIT ════════════════════════════════ */
updateNav();
