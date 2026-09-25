/* Alexx Keukens — site behaviour
   nav drawer · sticky-bar height · infinite gallery · lightbox · contact form */
(function () {
  'use strict';

  var PHOTOS = [
    { id: 'keuken-eiland-blauwgrijs'    , src: 'img/keuken-eiland-blauwgrijs.jpg',     caption: 'Kookeiland in blauwgrijs met zwart keramisch werkblad en wijnklimaatkast' },
    { id: 'keuken-keramiek-marmerlook'  , src: 'img/keuken-keramiek-marmerlook.jpg',   caption: 'Greeploze witte keuken met keramische wand in marmerlook' },
    { id: 'keuken-eiland-keramisch-blad', src: 'img/keuken-eiland-keramisch-blad.jpg', caption: 'Antraciet kookeiland met keramisch werkblad' },
    { id: 'keuken-antraciet-natuursteen', src: 'img/keuken-antraciet-natuursteen.jpg', caption: 'Antraciete keuken met natuursteenlook werkblad' },
    { id: 'keuken-groen-eiland'         , src: 'img/keuken-groen-eiland.jpg',          caption: 'Zachtgroene greeploze keuken met kookeiland' },
    { id: 'keuken-houtstructuur'        , src: 'img/keuken-houtstructuur.jpg',         caption: 'Keuken in houtstructuur met zwart werkblad' },
    { id: 'keuken-zand-eiland'          , src: 'img/keuken-zand-eiland.jpg',           caption: 'Zandkleurige keuken met kookeiland en visgraatvloer' },
    { id: 'kast-schuifdeur-spiegel'     , src: 'img/kast-schuifdeur-spiegel.jpg',      caption: 'Maatwerk schuifdeurkast met houtdecor panelen en spiegel' },
    { id: 'kast-inloopkast'             , src: 'img/kast-inloopkast.jpg',              caption: 'Inloopkast met maatwerk interieur: laden, roedes en open vakken' },
    { id: 'kast-wandmeubel-bureau'      , src: 'img/kast-wandmeubel-bureau.jpg',       caption: 'Maatwerk wandmeubel met bureau en boekenkast' },
    { id: 'kast-schuifdeur-greeploos'   , src: 'img/kast-schuifdeur-greeploos.jpg',    caption: 'Greeploze schuifdeurkast van vloer tot plafond' },
    { id: 'kast-halkast-hout'           , src: 'img/kast-halkast-hout.jpg',            caption: 'Halkast in houtdecor met open vakken' },
    { id: 'kast-tv-wandmeubel'          , src: 'img/kast-tv-wandmeubel.jpg',           caption: 'Zwevend tv-wandmeubel met open kast' }
  ];

  /* ---------------------------------------------------------------- nav */
  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.nav-toggle');
  if (header && toggle) {
    toggle.addEventListener('click', function () {
      var open = header.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', function (e) {
      if (header.classList.contains('nav-open') && !header.contains(e.target)) {
        header.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------------------------------------------- sticky bar → body pad */
  var bar = document.querySelector('.sticky-bar');
  if (bar) {
    var setBar = function () {
      document.documentElement.style.setProperty('--bar-h', bar.offsetHeight + 'px');
    };
    setBar();
    if ('ResizeObserver' in window) new ResizeObserver(setBar).observe(bar);
    else window.addEventListener('resize', setBar);
  }

  /* ------------------------------------------------- hero crossfade */
  var heroStack = document.querySelector('.hero-stack');
  if (heroStack) {
    var slides = heroStack.querySelectorAll('.hero-slide');
    var slideReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (slides.length > 1 && !slideReduce.matches) {
      var at = 0;
      setInterval(function () {
        if (document.hidden || document.body.classList.contains('lb-open')) return;
        slides[at].classList.remove('is-active');
        at = (at + 1) % slides.length;
        slides[at].classList.add('is-active');
      }, 5200);
    }
  }

  /* ------------------------------------------------ infinite gallery */
  var track = document.querySelector('[data-gallery]');
  if (track && track.children.length > 1) {
    var originals = Array.prototype.slice.call(track.children);
    var count = originals.length;
    var step = 0, setWidth = 0, raf = 0;

    // Triple the list: [copy A][copy B — the one the user sees first][copy C]
    for (var c = 0; c < 2; c++) {
      originals.forEach(function (el) {
        var clone = el.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
      });
    }

    var measure = function () {
      var kids = track.children;
      step = kids[1].offsetLeft - kids[0].offsetLeft;
      setWidth = step * count;
      track.scrollLeft = setWidth;
    };

    track.addEventListener('scroll', function () {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        if (!setWidth) return;
        if (track.scrollLeft < setWidth * 0.5) track.scrollLeft += setWidth;
        else if (track.scrollLeft > setWidth * 1.5) track.scrollLeft -= setWidth;
      });
    }, { passive: true });

    var resizeT = 0;
    window.addEventListener('resize', function () {
      clearTimeout(resizeT);
      resizeT = setTimeout(measure, 120);
    });

    var wrap = track.parentNode;
    var go = function (dir) {
      if (!setWidth) measure();
      track.scrollBy({ left: dir * (step || 320), behavior: 'smooth' });
    };
    var prevBtn = wrap.querySelector('.gal-prev');
    var nextBtn = wrap.querySelector('.gal-next');
    if (prevBtn) prevBtn.addEventListener('click', function () { go(-1); nudge(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { go(1); nudge(); });

    measure();
    window.addEventListener('load', measure);

    /* ---- autoplay -------------------------------------------------------
       A slow continuous drift rather than a card-by-card jump: the track is
       nudged a few hundredths of a pixel every frame, timed off the clock so
       the speed is the same on any refresh rate. The loop normaliser already
       keeps it seamless. Pauses while the visitor is pointing at it,
       dragging it, tabbing through it, reading a photo full screen, or
       looking at another tab. Off entirely for reduced-motion users.       */
    var SPEED = 28;                  // pixels per second
    var raf2 = 0, last = 0, posF = null;   // posF: scrollLeft is rounded on
                                           // write, so fractions are kept here
    var held = 0;
    var resumeT = 0;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    // One flag per reason to pause. A shared counter with shared timers let a
    // later release cancel an earlier one, which could strand the drift.
    var pHover = false, pFocus = false, pDrag = false, pWheel = false, pArrow = false;
    var dragT = 0, wheelT = 0, arrowT = 0;

    var canRun = function () {
      return !pHover && !pFocus && !pDrag && !pWheel && !pArrow &&
             !document.hidden && !document.body.classList.contains('lb-open');
    };

    var frame = function (ts) {
      raf2 = requestAnimationFrame(frame);
      var dt = last ? ts - last : 0;
      last = ts;                     // keep the clock fresh even while paused
      if (!canRun() || dt <= 0 || dt > 100) { posF = null; return; }
      // re-sync after a swipe, an arrow, or the loop normaliser moved us
      if (posF === null || Math.abs(posF - track.scrollLeft) > 2) posF = track.scrollLeft;
      posF += SPEED * dt / 1000;
      track.scrollLeft = posF;
    };

    var start = function () {
      if (reduce.matches || raf2) return;
      last = 0; posF = null;
      raf2 = requestAnimationFrame(frame);
    };
    var stop = function () { cancelAnimationFrame(raf2); raf2 = 0; };

    // let an arrow's smooth scroll finish before the drift takes over again
    function nudge() {
      pArrow = true;
      clearTimeout(arrowT);
      arrowT = setTimeout(function () { pArrow = false; }, 700);
    }

    wrap.addEventListener('mouseenter', function () { pHover = true; });
    wrap.addEventListener('mouseleave', function () { pHover = false; });
    // Only keyboard focus should pause: clicking an arrow focuses it too, and
    // that focus outlives the mouse leaving, which would strand the drift.
    wrap.addEventListener('focusin', function (e) {
      var kb = false;
      try { kb = e.target.matches(':focus-visible'); } catch (err) { kb = false; }
      pFocus = kb;
    });
    wrap.addEventListener('focusout', function () { pFocus = false; });

    var dragStart = function () { pDrag = true; clearTimeout(dragT); };
    var dragEnd = function () {
      clearTimeout(dragT);
      dragT = setTimeout(function () { pDrag = false; }, 1200);
    };
    track.addEventListener('pointerdown', dragStart);
    window.addEventListener('pointerup', dragEnd);
    track.addEventListener('touchstart', dragStart, { passive: true });
    track.addEventListener('touchend', dragEnd, { passive: true });

    track.addEventListener('wheel', function () {
      pWheel = true;
      clearTimeout(wheelT);
      wheelT = setTimeout(function () { pWheel = false; }, 700);
    }, { passive: true });

    if (reduce.addEventListener) reduce.addEventListener('change', function () {
      reduce.matches ? stop() : start();
    });

    start();
  }

  /* ------------------------------------------------------- lightbox */
  var lb = document.getElementById('lightbox');
  if (lb) {
    var lbImg = lb.querySelector('.lightbox-img');
    var lbCap = lb.querySelector('.lightbox-caption');
    var lbPrev = lb.querySelector('[data-lb-prev]');
    var lbNext = lb.querySelector('[data-lb-next]');
    var index = -1;
    var list = PHOTOS;          // the set being stepped through right now
    var lastFocus = null;

    // The photos of the gallery that was clicked — not every photo on the site.
    // The home strip repeats its cards three times for the seamless loop, so
    // identical ids are collapsed.
    var groupFor = function (fig) {
      var scope = fig.closest('[data-gallery]') || fig.closest('.tile-grid') || fig.closest('.hero-stack');
      var ids = scope
        ? Array.prototype.map.call(scope.querySelectorAll('[data-photo]'),
            function (el) { return el.getAttribute('data-photo'); })
        : [fig.getAttribute('data-photo')];
      var seen = {}, out = [];
      ids.forEach(function (id) {
        if (seen[id]) return;
        seen[id] = 1;
        for (var k = 0; k < PHOTOS.length; k++) {
          if (PHOTOS[k].id === id) { out.push(PHOTOS[k]); break; }
        }
      });
      return out.length ? out : PHOTOS;
    };

    var render = function () {
      var p = list[index];
      lbImg.src = p.src;
      lbImg.alt = p.caption;
      lbCap.textContent = p.caption;
      // restart the entry animation
      lbImg.style.animation = 'none';
      void lbImg.offsetWidth;
      lbImg.style.animation = '';
    };
    var open = function (i) {
      index = i;
      render();
      lastFocus = document.activeElement;
      lb.hidden = false;
      document.body.classList.add('lb-open');
      (lbNext.hidden ? lb : lbNext).focus();
    };
    var close = function () {
      lb.hidden = true;
      index = -1;
      document.body.classList.remove('lb-open');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };
    var stepTo = function (d) {
      index = (index + d + list.length) % list.length;
      render();
    };

    document.addEventListener('click', function (e) {
      var fig = e.target.closest('[data-photo]');
      if (!fig) return;
      var id = fig.getAttribute('data-photo');
      list = groupFor(fig);
      var i = -1;
      for (var k = 0; k < list.length; k++) if (list[k].id === id) { i = k; break; }
      if (i < 0) return;
      // a lone photo (the hero) has nothing to step to
      var solo = list.length < 2;
      lbPrev.hidden = solo;
      lbNext.hidden = solo;
      open(i);
    });
    lb.addEventListener('click', function (e) {
      if (e.target.closest('.lightbox-nav') || e.target === lbImg) return;
      close();
    });
    lbPrev.addEventListener('click', function (e) { e.stopPropagation(); stepTo(-1); });
    lbNext.addEventListener('click', function (e) { e.stopPropagation(); stepTo(1); });

    window.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); stepTo(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stepTo(-1); }
      else if (e.key === 'Tab') {
        // focus trap between the two arrow buttons
        var first = lbPrev, last = lbNext;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        else if (!lb.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ----------------------------------------------------------- FAQ */
  /* <details> can't animate on its own, so the open/close is driven here.
     Opening one closes the others. Without JS the rows still work. */
  var faqRows = document.querySelectorAll('.faq details');
  if (faqRows.length) {
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    var slide = function (row, opening, done) {
      var body = row.querySelector('.faq-body');
      if (!body || reduceMotion.matches) { row.open = opening; if (done) done(); return; }
      if (opening) row.open = true;
      var from = opening ? 0 : body.scrollHeight;
      var to = opening ? body.scrollHeight : 0;
      body.style.height = from + 'px';
      body.style.transition = 'none';
      requestAnimationFrame(function () {
        body.style.transition = 'height ' + (opening ? 280 : 220) + 'ms cubic-bezier(.2,.7,.2,1)';
        body.style.height = to + 'px';
      });
      var end = function (e) {
        if (e && e.propertyName !== 'height') return;
        body.removeEventListener('transitionend', end);
        body.style.height = '';
        body.style.transition = '';
        if (!opening) row.open = false;
        if (done) done();
      };
      body.addEventListener('transitionend', end);
      setTimeout(end, 400);              // safety net if the event is missed
    };

    Array.prototype.forEach.call(faqRows, function (row) {
      var summary = row.querySelector('summary');
      if (!summary) return;
      summary.addEventListener('click', function (e) {
        e.preventDefault();
        if (row.open) { slide(row, false); return; }
        Array.prototype.forEach.call(faqRows, function (other) {
          if (other !== row && other.open) slide(other, false);
        });
        slide(row, true);
      });
    });
  }

  /* --------------------------------------------------- contact form */
  var form = document.querySelector('[data-contact-form]');
  if (form) {
    var panel = form.closest('.form-panel');
    var success = panel.querySelector('[data-form-success]');
    var nameOut = panel.querySelector('[data-first-name]');
    var resetBtn = panel.querySelector('[data-form-reset]');
    var errorEl = form.querySelector('.form-error');
    var submitBtn = form.querySelector('[type="submit"]');
    var submitLabel = submitBtn.textContent;

    var showSuccess = function (first) {
      nameOut.textContent = first;
      form.hidden = true;
      success.hidden = false;
      success.querySelector('h3').setAttribute('tabindex', '-1');
      success.querySelector('h3').focus();
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var first = String(fd.get('naam') || '').trim().split(/\s+/)[0] || 'alvast';
      var endpoint = form.getAttribute('data-endpoint');

      if (!endpoint) { showSuccess(first); return; }

      errorEl.hidden = true;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Versturen…';
      fetch(endpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' } })
        .then(function (r) {
          return r.json().catch(function () { return null; }).then(function (data) {
            // only a real {ok:true} from contact.php counts as sent — never
            // assume success from a bare 200 or a non-JSON response
            if (!r.ok || !data || data.ok !== true) {
              throw new Error((data && data.message) || '');
            }
            showSuccess(first);
          });
        })
        .catch(function (err) {
          if (err && err.message) errorEl.firstChild.nodeValue = err.message + ' ';
          errorEl.hidden = false;
        })
        .then(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = submitLabel;
        });
    });

    // visitor arrived back from contact.php without JavaScript on the first pass
    if (/[?&]verzonden=1/.test(location.search)) {
      showSuccess('alvast');
      history.replaceState(null, '', location.pathname);
    }

    if (resetBtn) resetBtn.addEventListener('click', function () {
      form.reset();
      success.hidden = true;
      form.hidden = false;
      var firstField = form.querySelector('input');
      if (firstField) firstField.focus();
    });
  }
})();
