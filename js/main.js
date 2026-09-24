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
    if (prevBtn) prevBtn.addEventListener('click', function () { go(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { go(1); });

    measure();
    window.addEventListener('load', measure);
  }

  /* ------------------------------------------------------- lightbox */
  var lb = document.getElementById('lightbox');
  if (lb) {
    var lbImg = lb.querySelector('.lightbox-img');
    var lbCap = lb.querySelector('.lightbox-caption');
    var lbPrev = lb.querySelector('[data-lb-prev]');
    var lbNext = lb.querySelector('[data-lb-next]');
    var index = -1;
    var lastFocus = null;

    var render = function () {
      var p = PHOTOS[index];
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
      lbNext.focus();
    };
    var close = function () {
      lb.hidden = true;
      index = -1;
      document.body.classList.remove('lb-open');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };
    var stepTo = function (d) {
      index = (index + d + PHOTOS.length) % PHOTOS.length;
      render();
    };

    document.addEventListener('click', function (e) {
      var fig = e.target.closest('[data-photo]');
      if (!fig) return;
      var i = -1;
      for (var k = 0; k < PHOTOS.length; k++) if (PHOTOS[k].id === fig.getAttribute('data-photo')) { i = k; break; }
      if (i >= 0) open(i);
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
        .then(function (r) { if (!r.ok) throw new Error(r.statusText); showSuccess(first); })
        .catch(function () {
          errorEl.hidden = false;
        })
        .then(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = submitLabel;
        });
    });

    if (resetBtn) resetBtn.addEventListener('click', function () {
      form.reset();
      success.hidden = true;
      form.hidden = false;
      var firstField = form.querySelector('input');
      if (firstField) firstField.focus();
    });
  }
})();
