/* ─────────────────────────────────────────────
   HYLND — site engine
   Fixed:
   • Hero text was invisible: reveal fires after
     loader exits using simple setTimeout stagger,
     no conflicting CSS transition-delay
   • Curtain used transform which snapped back —
     now uses clip-path, base state is just hidden
   • observePage no longer fights with data-delay
     CSS; delays are JS-only with clear stagger
   • BUSY flag properly resets on all paths
───────────────────────────────────────────── */
'use strict';

let CUR = 'home', BUSY = false;

/* ─── REVEAL ───
   Simple: find all [data-reveal] on the active page,
   stagger them with pure JS setTimeout.
   data-delay attr multiplies the base stagger gap.
*/
function revealPage(pageId, baseDelay) {
  baseDelay = baseDelay || 0;
  const pg = document.getElementById('page-' + pageId);
  if (!pg) return;

  const els = Array.from(pg.querySelectorAll('[data-reveal]'));
  els.forEach(el => el.classList.remove('in'));

  // Remove any leftover CSS transition-delay so JS controls timing fully
  els.forEach(el => { el.style.transitionDelay = ''; });

  els.forEach((el, i) => {
    const d = parseInt(el.dataset.delay || 0);
    // stagger: each element gets 70ms more than the previous
    const ms = baseDelay + i * 70 + d * 40;
    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      // Only animate if visible in viewport
      if (rect.top < window.innerHeight + 40) {
        el.classList.add('in');
      } else {
        // For below-fold, observe on scroll
        scrollRevealObs.observe(el);
      }
    }, ms);
  });
}

/* ─── SCROLL REVEAL (for below-fold elements) ─── */
const scrollRevealObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      scrollRevealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });

/* ─── LOADER EXIT ─── */
window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = document.getElementById('loader');
    loader.classList.add('hidden');
    setTimeout(() => { loader.style.display = 'none'; }, 700);
    // Reveal hero content with stagger after loader clears
    revealPage('home', 100);
  }, 2000);
});

/* ─── NAVBAR ─── */
window.addEventListener('scroll', () => {
  document.getElementById('nav').classList.toggle('s', window.scrollY > 32);
}, { passive: true });

/* ─── SCROLL REVEAL trigger on scroll ─── */
window.addEventListener('scroll', () => {
  const pg = document.getElementById('page-' + CUR);
  if (!pg) return;
  pg.querySelectorAll('[data-reveal]:not(.in)').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) {
      el.classList.add('in');
      scrollRevealObs.unobserve(el);
    }
  });
}, { passive: true });

/* ─── MOBILE NAV ─── */
const $tog = document.getElementById('ntog');
const $nl  = document.getElementById('nlinks');

$tog.addEventListener('click', () => {
  const open = $nl.classList.toggle('open');
  const s = $tog.querySelectorAll('span');
  s[0].style.transform = open ? 'translateY(7px) rotate(45deg)' : '';
  s[1].style.opacity   = open ? '0' : '';
  s[2].style.transform = open ? 'translateY(-7px) rotate(-45deg)' : '';
});

function closeNav() {
  $nl.classList.remove('open');
  const s = $tog.querySelectorAll('span');
  s[0].style.transform = '';
  s[1].style.opacity   = '';
  s[2].style.transform = '';
}

/* ─── PAGE TRANSITIONS ─── */
function goTo(page) {
  if (BUSY || page === CUR) return;
  BUSY = true;
  closeNav();

  const curtain = document.getElementById('curtain');

  // Phase 1 — curtain wipes IN (covers current page)
  curtain.className = 'in';

  setTimeout(() => {
    // Swap pages while screen is covered
    document.getElementById('page-' + CUR).classList.remove('active');
    document.getElementById('page-' + page).classList.add('active');
    window.scrollTo(0, 0);
    CUR = page;
    updateNav();

    // Force a reflow so the new page renders before curtain lifts
    void curtain.offsetWidth;

    // Phase 2 — curtain wipes OUT (reveals new page)
    curtain.className = 'out';

    setTimeout(() => {
      // Fully hide curtain — class="" returns it to visibility:hidden
      curtain.className = '';
      BUSY = false;
      // Reveal new page content
      revealPage(page, 0);
    }, 500);

  }, 460);
}

function updateNav() {
  document.querySelectorAll('.nl').forEach(a => {
    a.classList.toggle('on', a.dataset.page === CUR);
  });
}

/* ─── CLICK DELEGATION ─── */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-page]');
  if (t) { e.preventDefault(); goTo(t.dataset.page); }
});

/* ─── PARALLAX (home hero orbs only) ─── */
window.addEventListener('scroll', () => {
  if (CUR !== 'home') return;
  const y = window.scrollY;
  const o1 = document.querySelector('.horb1');
  const o2 = document.querySelector('.horb2');
  if (o1) o1.style.transform = `translateY(${y * .1}px)`;
  if (o2) o2.style.transform = `translateY(${-y * .07}px)`;
}, { passive: true });

/* ─── CARD TILT ─── */
function attachTilt(sel, deg) {
  document.querySelectorAll(sel).forEach(card => {
    card.addEventListener('mousemove', e => {
      if (window.innerWidth < 768) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - .5;
      const y = (e.clientY - r.top)  / r.height - .5;
      card.style.transform =
        `translateY(-6px) rotateX(${-y * deg}deg) rotateY(${x * deg}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}
attachTilt('.pc', 3);
attachTilt('.nc', 2.5);
attachTilt('.pcard', 1.8);
attachTilt('.pillar', 2);

/* ─── CONTACT FORM ─── */
document.getElementById('ctf').addEventListener('submit', e => {
  e.preventDefault();
  const btn = e.target.querySelector('.btn-red');
  btn.textContent = 'Sending…';
  btn.disabled = true;
  btn.style.opacity = '.7';
  setTimeout(() => {
    btn.textContent = '✓ Message Sent!';
    btn.style.opacity = '1';
    btn.style.background = '#16a34a';
    e.target.reset();
    setTimeout(() => {
      btn.textContent = 'Send Message';
      btn.style.background = '';
      btn.disabled = false;
    }, 3200);
  }, 1400);
});

updateNav();