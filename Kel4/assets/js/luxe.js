/* LIMA STUDIO — luxe.js : preloader, split teks, reveal, parallax,
   kursor kustom, magnetic, header hide, progress, marquee reaktif, transisi halaman.
   File://-safe, tanpa dependensi. Hormati prefers-reduced-motion. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var html = document.documentElement;

  /* ============ 1. PRELOADER ============ */
  var loader = document.querySelector('.luxe-loader');
  function finishLoad() {
    html.classList.add('luxe-ready');
    if (loader) {
      loader.classList.add('done');
      setTimeout(function () { loader.remove(); }, 1100);
    } else {
      html.classList.add('luxe-ready');
    }
    startReveals();
  }
  if (loader && !reduce) {
    var bar = loader.querySelector('.l-bar i');
    var num = loader.querySelector('.l-count b');
    var t0 = performance.now(), DUR = 950;
    (function tick(t) {
      var p = Math.min(1, ((t || performance.now()) - t0) / DUR);
      var eased = 1 - Math.pow(1 - p, 3);
      if (bar) bar.style.transform = 'scaleX(' + eased + ')';
      if (num) num.textContent = Math.round(eased * 100);
      if (p < 1) requestAnimationFrame(tick);
      else setTimeout(finishLoad, 120);
    })();
    // pengaman: jangan kunci halaman lebih dari 2.5 dtk
    setTimeout(function () {
      if (document.querySelector('.luxe-loader')) finishLoad();
    }, 2500);
  } else {
    if (loader) loader.remove();
    html.classList.add('luxe-ready');
    startReveals();
  }

  /* ============ 2. SPLIT HERO TITLE per huruf ============ */
  function splitEl(el, baseDelay, step) {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = '1';
    var nodes = Array.prototype.slice.call(el.childNodes);
    el.innerHTML = '';
    var i = 0;
    nodes.forEach(function (node) {
      if (node.nodeType === 3) {
        node.textContent.split('').forEach(function (ch) {
          if (ch === '\n' || ch === '\r') return;
          var m = document.createElement('span');
          m.className = 'split-mask';
          var c = document.createElement('span');
          c.className = 'split-ch';
          c.style.setProperty('--d', (baseDelay + i * step).toFixed(3) + 's');
          c.textContent = ch === ' ' ? '\u00A0' : ch;
          m.appendChild(c); el.appendChild(m); i++;
        });
      } else if (node.nodeName === 'BR') {
        el.appendChild(node.cloneNode());
      } else {
        var wrap = node.cloneNode(false);
        wrap.innerHTML = '';
        node.textContent.split('').forEach(function (ch) {
          var m = document.createElement('span');
          m.className = 'split-mask';
          var c = document.createElement('span');
          c.className = 'split-ch';
          c.style.setProperty('--d', (baseDelay + i * step).toFixed(3) + 's');
          c.textContent = ch === ' ' ? '\u00A0' : ch;
          m.appendChild(c); wrap.appendChild(m); i++;
        });
        el.appendChild(wrap);
      }
    });
  }
  if (!reduce) {
    document.querySelectorAll('.hero .mega, .bio-head .mega, .detail-head .mega').forEach(function (el, k) {
      splitEl(el, 0.15 + k * 0.05, 0.028);
    });
  }

  /* ============ 3. AUTO REVEAL HOOKS ============ */
  function tagReveals() {
    var sel = [
      '.intro .big', '.intro-cols > *', '.work-sec > .label',
      '.work-grid .work', '.services li', '.contact .mega',
      '.contact-grid > *', '.bio-head p', '.detail-cols > *',
      '.detail-gallery figure', '.pager', '.member',
      '.timeline li', '.caps li', '.table-wrap', '.kp-list li'
    ].join(',');
    var els = document.querySelectorAll(sel);
    var w = 0;
    els.forEach(function (el) {
      if (el.hasAttribute('data-reveal') || el.classList.contains('work')) {
        if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', '');
      } else {
        el.setAttribute('data-reveal', '');
      }
      // stagger ringan per grup saudara
      var sib = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.setProperty('--d', (Math.min(sib, 6) * 0.07).toFixed(2) + 's');
      void w;
    });
    // parallax otomatis untuk figure besar
    document.querySelectorAll('.detail-hero img, .intro-cols figure img, .member figure img').forEach(function (img) {
      var fig = img.closest('figure') || img;
      if (!fig.hasAttribute('data-parallax')) fig.setAttribute('data-parallax', '');
    });
  }
  tagReveals();

  var io = null;
  function startReveals() {
    var els = document.querySelectorAll('[data-reveal]');
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }
  // elemen dinamis (related grid di detail) ikut ter-observe
  var mo = new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      m.addedNodes.forEach(function (n) {
        if (!(n instanceof Element)) return;
        if (n.matches && n.matches('[data-reveal]')) {
          if (io) io.observe(n); else n.classList.add('in');
        }
        (n.querySelectorAll ? n.querySelectorAll('[data-reveal]') : []).forEach(function (el) {
          if (io) io.observe(el); else el.classList.add('in');
        });
      });
    });
  });
  mo.observe(document.body, { childList: true, subtree: true });

  /* ============ 4. PARALLAX + PROGRESS + HEADER + MARQUEE (satu rAF) ============ */
  var pxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax] img'));
  var prog = document.querySelector('.luxe-progress span');
  var headerLast = 0;
  var mqTrack = document.querySelector('.marquee-track');
  var mqX = 0, mqV = 0.6, mqTarget = 0.6;
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY || 0;
      var max = document.body.scrollHeight - window.innerHeight;
      // progress
      if (prog) prog.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
      // header hide/show
      if (y > 140 && y > headerLast + 4) html.classList.add('luxe-hide-header');
      else if (y < headerLast - 4 || y < 140) html.classList.remove('luxe-hide-header');
      html.classList.toggle('luxe-scrolled', y > 24);
      headerLast = y;
      // parallax gambar
      if (!reduce) {
        var vh = window.innerHeight;
        pxEls.forEach(function (img) {
          var r = img.getBoundingClientRect();
          if (r.bottom < -100 || r.top > vh + 100) return;
          var p = (r.top + r.height / 2 - vh / 2) / vh; // -0.5..0.5
          img.style.setProperty('--py', (p * -46).toFixed(1) + 'px');
        });
      }
      // marquee reaktif: scroll cepat = marquee ngebut
      if (mqTrack && !reduce) {
        mqTarget = 0.6 + Math.min(6, Math.abs(y - (onScroll._p || 0)) * 0.12);
        onScroll._p = y;
      }
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  // loop marquee digerakkan manual agar bisa reaktif
  if (mqTrack && !reduce) {
    (function mqLoop() {
      mqV += (mqTarget - mqV) * 0.06;
      mqTarget += (0.6 - mqTarget) * 0.02;
      mqX -= mqV;
      var w = mqTrack.scrollWidth / 2;
      if (w > 0 && -mqX >= w) mqX += w;
      mqTrack.style.transform = 'translate3d(' + mqX.toFixed(1) + 'px,0,0)';
      requestAnimationFrame(mqLoop);
    })();
  }

  /* ============ 5. KURSOR KUSTOM ============ */
  if (finePointer && !reduce) {
    var dot = document.querySelector('.luxe-dot');
    var ring = document.querySelector('.luxe-ring');
    var mx = -100, my = -100, rx = -100, ry = -100;
    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (dot) dot.style.transform = 'translate(' + (mx - 4) + 'px,' + (my - 4) + 'px)';
    });
    (function ringLoop() {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      if (ring) ring.style.transform = 'translate(' + (rx - 19) + 'px,' + (ry - 19) + 'px)';
      requestAnimationFrame(ringLoop);
    })();
    document.querySelectorAll('a, button, .filter-bar button').forEach(function (el) {
      el.addEventListener('mouseenter', function () { if (ring) ring.classList.add('is-hover'); });
      el.addEventListener('mouseleave', function () { if (ring) ring.classList.remove('is-hover'); });
    });
    // mode VIEW pada kartu karya
    document.querySelectorAll('.work a').forEach(function (el) {
      el.addEventListener('mouseenter', function () { if (ring) ring.classList.add('is-view'); });
      el.addEventListener('mouseleave', function () { if (ring) ring.classList.remove('is-view'); });
    });
  }

  /* ============ 6. MAGNETIC pada tombol penting ============ */
  if (finePointer && !reduce) {
    document.querySelectorAll('.more a, .pager a, .filter-bar button, .menu-btn').forEach(function (el) {
      el.classList.add('magnetic');
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + (dx * 0.18).toFixed(1) + 'px,' + (dy * 0.28).toFixed(1) + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  /* ============ 7. TRANSISI HALAMAN (wipe) ============ */
  var wipe = document.querySelector('.luxe-wipe');
  if (wipe && !reduce) {
    document.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      if (/^https?:\/\//i.test(href) && a.hostname !== location.hostname) return;
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        wipe.classList.remove('go');
        void wipe.offsetWidth;
        wipe.classList.add('go');
        setTimeout(function () { window.location.href = href; }, 420);
      });
    });
  }
})();
