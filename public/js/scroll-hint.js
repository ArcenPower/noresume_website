/* 'Scroll down' hint (Simon 20-21 Oct 2026: older visitors missed that the page goes on below the full-screen top). Sits at the foot of the full-screen top section; while the cookie bar is showing it
   sits just above the bar and the headline + buttons move up to make room (one-line hint on short screens; if it still
   cannot fit it waits for the cookie choice). Nothing moves when the bar closes.
   Bounces 3 times, fades once the visitor scrolls, back (still) when they return to the top. Clicking glides down. */
(function () {
  var MENU_CLEAR = 76, GAP = 10;
  var CSS = '.nr-cue{position:absolute;left:50%;bottom:var(--nr-cue-b,18px);transform:translateX(-50%);z-index:20;display:block;' +
    '  padding:14px 38px 8px;text-decoration:none;color:#fff !important;cursor:pointer;-webkit-tap-highlight-color:transparent;' +
    '  background:radial-gradient(closest-side,rgba(5,24,30,.82) 0%,rgba(5,24,30,.6) 55%,rgba(5,24,30,0) 100%);' +
    '  transition:opacity .45s ease}' +
    '.nr-cue-in{display:flex;flex-direction:column;align-items:center;gap:0;white-space:nowrap;' +
    '  font:600 17px/1.2 Poppins,system-ui,sans-serif;letter-spacing:.02em;text-shadow:0 1px 8px rgba(0,0,0,.7)}' +
    '.nr-cue svg{width:30px;height:30px;filter:drop-shadow(0 1px 6px rgba(0,0,0,.7))}' +
    '@media (min-width:761px){.nr-cue{--nr-cue-b:22px}.nr-cue-in{font-size:19px}.nr-cue svg{width:34px;height:34px}}' +
    '.nr-cue.nr-bob .nr-cue-in{animation:nrCueBob 1.3s ease-in-out .6s 3}' +
    '@keyframes nrCueBob{0%,100%{transform:translateY(0)}50%{transform:translateY(8px)}}' +
    '.nr-cue.nr-gone{opacity:0;pointer-events:none}' +
    '.nr-cue.nr-small{--nr-cue-b:8px;padding:5px 28px 3px}.nr-cue.nr-small .nr-cue-in{flex-direction:row;gap:4px;font-size:15px}' +
    '.nr-cue.nr-small svg{width:20px;height:20px}' +
    '.nr-cue.nr-wait{display:none}' +
    '.nr-cue:focus-visible{outline:2px solid #36C5C5;outline-offset:2px;border-radius:12px}' +
    '[data-hero-full] > [data-hero-text],[data-hero-full] > [data-hero-btns],[data-hero-spot]{transition:none}' +
    '@media (prefers-reduced-motion:reduce){.nr-cue.nr-bob .nr-cue-in{animation:none}.nr-cue{transition:none}}';
  function setup() {
    var hero = document.querySelector('[data-hero-full]'); if (!hero || hero.querySelector('.nr-cue')) return;
    var text = hero.querySelector(':scope > [data-hero-text]'), btns = hero.querySelector(':scope > [data-hero-btns]');
    var spot = hero.querySelector('[data-hero-spot]'), next = hero.nextElementSibling;
    var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var cue = document.createElement('a'); cue.className = 'nr-cue'; cue.href = '#';
    cue.setAttribute('aria-label', 'Scroll down to see more');
    cue.innerHTML = '<span class="nr-cue-in">Scroll down<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" '
      + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></span>';
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    hero.appendChild(cue);
    cue.addEventListener('click', function (e) { e.preventDefault(); if (next) next.scrollIntoView({ behavior: still ? 'auto' : 'smooth' }); });
    function shift(px) { [text, btns, spot].forEach(function (el) { if (el) if (px) el.style.setProperty('transform', 'translateY(' + (-px) + 'px)', 'important'); else el.style.removeProperty('transform'); }); }
    function fit() {                                                                   // true = hint fits under the buttons
      cue.style.removeProperty('--nr-cue-b');
      var hb = hero.getBoundingClientRect(), bar = document.getElementById('nr-consent'), lift = parseFloat(getComputedStyle(cue).bottom);
      var floor = Math.min(hb.bottom, innerHeight) - lift;                              // hint's bottom edge: on screen
      if (bar) floor = Math.min(floor, bar.getBoundingClientRect().top - 8);              // ... and above the cookie bar
      cue.style.setProperty('--nr-cue-b', (hb.bottom - floor) + 'px');
      var gap = cue.classList.contains('nr-small') ? 4 : GAP;
      var need = btns ? btns.getBoundingClientRect().bottom + gap - (floor - cue.offsetHeight) : 0;
      if (need <= 0) return true;
      var room = text ? text.getBoundingClientRect().top - hb.top - MENU_CLEAR : 0;   // headline may not go under the menu
      if (need > room) return false;
      shift(need); return true;
    }
    function place() {
      shift(0); cue.classList.remove('nr-wait', 'nr-small');
      if (fit()) return;
      cue.classList.add('nr-small'); if (fit()) return;                                 // short screens: one-line hint
      shift(0); cue.classList.add('nr-wait');                                           // no room: waits for the cookie choice
    }
    place();
    function bob() { if (!still) cue.classList.add('nr-bob'); }
    var root = document.documentElement;
    if (!root.hasAttribute('data-intro-on')) bob();
    else new MutationObserver(function (m, o) { if (!root.hasAttribute('data-intro-on')) { o.disconnect(); place(); bob(); } })
      .observe(root, { attributes: true, attributeFilter: ['data-intro-on'] });
    if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(function () { if (scrollY < 5) place(); });   // headline size settles
    var lastW = innerWidth;
    addEventListener('resize', function () { if (innerWidth !== lastW) { lastW = innerWidth; place(); } });
    var hadBar = !!document.getElementById('nr-consent');
    new MutationObserver(function () {                                                  // cookie bar opened / closed
      var hasBar = !!document.getElementById('nr-consent'); if (hasBar === hadBar) return; hadBar = hasBar;
      if (hasBar || cue.classList.contains('nr-wait')) place();                       // bar closed after a shift: nothing moves
    }).observe(document.body, { childList: true });
    addEventListener('scroll', function () { cue.classList.toggle('nr-gone', scrollY > 40); }, { passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(setup, 0); });
  else setTimeout(setup, 0);
})();
