/* =========================================================
   Car Advance — main.js
========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);

  // GSAPが使えない環境では静的レイアウトにフォールバック
  if (!hasGsap || reduceMotion) root.classList.remove('motion');
  var motion = root.classList.contains('motion');

  /* ---------- スクロール移動（ブラウザ標準のsmoothはピン留めと競合して止まるためGSAPで制御） ---------- */
  var canScrollTo = hasGsap && !!window.ScrollToPlugin;
  if (canScrollTo) gsap.registerPlugin(ScrollToPlugin);
  function scrollToY(y, done) {
    y = Math.max(0, Math.round(y));
    if (reduceMotion || !canScrollTo) { window.scrollTo(0, y); if (done) done(); return; }
    var dist = Math.abs(y - window.pageYOffset);
    var dur = Math.min(1.8, 0.6 + dist / 6000);
    var finished = false;
    function finish() { if (finished) return; finished = true; clearTimeout(guard); if (done) done(); }
    var tween = gsap.to(window, {
      scrollTo: { y: y, autoKill: false },
      duration: dur,
      ease: 'power3.inOut',
      overwrite: true,
      onComplete: finish
    });
    // アニメーションが止められる環境でも必ず目的地へ移動させる保険
    var guard = setTimeout(function () {
      if (finished) return;
      tween.kill();
      window.scrollTo(0, y);
      finish();
    }, dur * 1000 + 900);
  }
  // 要素の位置（フェードイン中の移動量を除く）からスクロール先を計算
  function anchorY(el) {
    var shift = 0;
    try { var tf = getComputedStyle(el).transform; if (tf && tf !== 'none') shift = new DOMMatrixReadOnly(tf).m42; } catch (err) {}
    return el.getBoundingClientRect().top - shift + window.pageYOffset - ($('#header').offsetHeight + 12);
  }
  function scrollToCenter(el) {
    var r = el.getBoundingClientRect();
    scrollToY(r.top + window.pageYOffset - (window.innerHeight - r.height) / 2);
  }

  /* ---------- 初回アンベール ---------- */
  (function () {
    var heroImg = $('.scene--hero img');
    var done = false;
    function loaded() {
      if (done) return; done = true;
      requestAnimationFrame(function () { root.classList.add('is-loaded'); });
    }
    if (!heroImg || heroImg.complete) loaded();
    else { heroImg.addEventListener('load', loaded); heroImg.addEventListener('error', loaded); }
    setTimeout(loaded, 2500);
  })();

  /* ---------- 年表記 ---------- */
  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- CTA計測（GTM / GA4 用） ---------- */
  window.dataLayer = window.dataLayer || [];
  function track(event, params) {
    var payload = Object.assign({ event: event }, params || {});
    window.dataLayer.push(payload);
    if (typeof window.gtag === 'function') window.gtag('event', event, params || {});
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-cta]');
    if (!el) return;
    var name = el.getAttribute('data-cta');
    var type = name.indexOf('line') === 0 ? 'line' : name.indexOf('tel') === 0 ? 'tel' : 'form';
    track('cta_click', { cta_name: name, cta_type: type });
  });

  /* ---------- ヘッダー / 固定CTA / トップへ ---------- */
  var header = $('#header');
  var fixedCta = $('#fixedCta');
  var floatLine = $('#floatLine');
  var toTop = $('#toTop');
  var formEl = $('#form');
  var formVisible = false;

  if ('IntersectionObserver' in window && formEl) {
    new IntersectionObserver(function (entries) {
      formVisible = entries[0].isIntersecting;
      onScroll();
    }, { threshold: 0.05 }).observe(formEl);
  }

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var vh = window.innerHeight;
    header.classList.toggle('is-solid', y > 40);
    var show = y > vh * 0.8;
    fixedCta.classList.toggle('is-show', show && !formVisible);
    floatLine.classList.toggle('is-show', show && !formVisible);
    toTop.classList.toggle('is-show', y > vh * 1.5);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  toTop.addEventListener('click', function () {
    scrollToY(0);
  });

  /* ---------- ページ内リンク ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var target = document.getElementById(id.slice(1));
    if (!target) return;
    e.preventDefault();
    closeDrawer();

    // サービス別CTAからフォームの種別を事前選択
    var key = a.getAttribute('data-subject');
    if (key) {
      var radio = $('input[name="subject"][data-key="' + key + '"]');
      if (radio) { radio.checked = true; clearError('subject'); }
    }

    if (id === '#top') { scrollToY(0); }
    else {
      // 到着後に位置を再確認（画像の読込やアニメーションで位置がずれた場合に補正）
      scrollToY(anchorY(target), function () {
        var fix = anchorY(target);
        if (Math.abs(fix - window.pageYOffset) > 4) window.scrollTo(0, fix);
      });
    }
    if (history.replaceState) history.replaceState(null, '', id === '#top' ? location.pathname : id);
  });

  /* ---------- ナビ現在地 ---------- */
  if ('IntersectionObserver' in window) {
    var navLinks = $$('.gnav a');
    var map = {};
    navLinks.forEach(function (l) { map[l.getAttribute('href').slice(1)] = l; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && map[en.target.id]) {
          navLinks.forEach(function (l) { l.classList.remove('is-current'); });
          map[en.target.id].classList.add('is-current');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- モバイルドロワー ---------- */
  var burger = $('#burger');
  var drawer = $('#drawer');
  function openDrawer() {
    drawer.hidden = false;
    requestAnimationFrame(function () { drawer.classList.add('is-open'); });
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'メニューを閉じる');
    document.body.style.overflow = 'hidden';
    header.classList.add('is-solid');
  }
  function closeDrawer() {
    if (drawer.hidden) return;
    drawer.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'メニューを開く');
    document.body.style.overflow = '';
    setTimeout(function () { drawer.hidden = true; }, 350);
    onScroll();
  }
  burger.addEventListener('click', function () {
    burger.getAttribute('aria-expanded') === 'true' ? closeDrawer() : openDrawer();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
  window.addEventListener('resize', function () { if (window.innerWidth >= 1024) closeDrawer(); });

  /* ---------- 手数料タブ ---------- */
  var tabs = $$('.tabs__btn');
  var tabList = $('.tabs');
  function selectTab(btn) {
    var idx = tabs.indexOf(btn);
    var prevIdx = parseInt(tabList.getAttribute('data-active'), 10) || 0;
    if (idx === prevIdx) return;
    tabList.setAttribute('data-active', idx);
    var dir = idx > prevIdx ? 1 : -1;
    var incoming = document.getElementById(btn.getAttribute('aria-controls'));
    tabs.forEach(function (t) {
      var on = t === btn;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    // 選んだ側から項目がスライドして現れる
    if (hasGsap && !reduceMotion) {
      gsap.fromTo(incoming, { autoAlpha: 0, x: dir * 60 }, { autoAlpha: 1, x: 0, duration: 0.6, ease: 'power3.out', clearProps: 'transform' });
      gsap.fromTo($$('tbody tr', incoming), { autoAlpha: 0, x: dir * 24 }, { autoAlpha: 1, x: 0, duration: 0.45, stagger: 0.05, delay: 0.12, ease: 'power2.out', clearProps: 'transform' });
    }
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      selectTab(next); next.focus();
    });
  });

  /* ---------- FAQ：＋をクリックで回答がスライドして開く ---------- */
  $$('.faq__item').forEach(function (item) {
    var summary = $('summary', item), answer = $('.faq__a', item);
    if (!summary || !answer || reduceMotion || !answer.animate) return;
    var anim = null;
    summary.addEventListener('click', function (e) {
      e.preventDefault();
      if (anim) anim.cancel();
      var opening = !item.open;
      if (opening) item.open = true;
      var h = answer.scrollHeight;
      item.classList.toggle('is-closing', !opening);
      anim = answer.animate(
        opening
          ? [{ height: '0px', opacity: 0, transform: 'translateY(-8px)' }, { height: h + 'px', opacity: 1, transform: 'none' }]
          : [{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
        { duration: opening ? 420 : 300, easing: 'cubic-bezier(.22,.8,.24,1)' }
      );
      answer.style.overflow = 'hidden';
      anim.onfinish = function () {
        anim = null;
        answer.style.overflow = '';
        if (!opening) item.open = false;
        item.classList.remove('is-closing');
      };
    });
  });

  /* =========================================================
     SPEEDOMETER（描画は常時、スクロール連動はmotion時）
  ========================================================= */
  var gauge = (function () {
    var svg = $('.gauge');
    if (!svg) return null;
    var NS = 'http://www.w3.org/2000/svg';
    var C = 150, START = -135, SWEEP = 270, RED_FROM = 0.8;
    function pt(deg, r) {
      var a = deg * Math.PI / 180;
      return [C + r * Math.sin(a), C - r * Math.cos(a)];
    }
    function arc(from, to, r) {
      var p1 = pt(from, r), p2 = pt(to, r);
      return 'M' + p1[0] + ' ' + p1[1] + ' A' + r + ' ' + r + ' 0 ' + (to - from > 180 ? 1 : 0) + ' 1 ' + p2[0] + ' ' + p2[1];
    }
    $('.gauge__track', svg).setAttribute('d', arc(START, START + SWEEP, 124));
    $('.gauge__red', svg).setAttribute('d', arc(START + SWEEP * RED_FROM, START + SWEEP, 124));
    var ticks = $('.gauge__ticks', svg), nums = $('.gauge__nums', svg);
    for (var i = 0; i <= 40; i++) {
      var ratio = i / 40, deg = START + SWEEP * ratio, major = i % 5 === 0;
      var a = pt(deg, 118), b = pt(deg, major ? 102 : 110);
      var l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', a[0]); l.setAttribute('y1', a[1]); l.setAttribute('x2', b[0]); l.setAttribute('y2', b[1]);
      if (major) l.setAttribute('class', 'major' + (ratio >= RED_FROM ? ' hot' : ''));
      else if (ratio >= RED_FROM) l.setAttribute('class', 'hot');
      ticks.appendChild(l);
      if (major) {
        var p = pt(deg, 86), t = document.createElementNS(NS, 'text');
        t.setAttribute('x', p[0]); t.setAttribute('y', p[1]);
        t.textContent = i / 5;
        if (ratio >= RED_FROM) t.setAttribute('class', 'hot');
        nums.appendChild(t);
      }
    }

    var needle = $('.gauge__needle', svg);
    var valueEl = $('#gaugeValue'), unitEl = $('#gaugeUnit'), capEl = $('#gaugeCap');
    var items = $$('#numbersList li');
    var current = -1, counter = { v: 0 };

    function setNeedle(ratio, animate) {
      var deg = START + SWEEP * ratio;
      if (!hasGsap) { needle.setAttribute('transform', 'rotate(' + deg + ' 150 150)'); return; }
      if (animate) gsap.to(needle, { rotation: deg, svgOrigin: '150 150', duration: 1.1, ease: 'elastic.out(1, 0.55)', overwrite: true });
      else gsap.set(needle, { rotation: deg, svgOrigin: '150 150' });
    }
    function activate(idx, animate) {
      if (idx === current || !items[idx]) return;
      current = idx;
      items.forEach(function (li, i) { li.classList.toggle('is-active', i === idx); });
      var d = items[idx].dataset, target = parseFloat(d.value), prefix = d.prefix || '';
      unitEl.textContent = d.unit; capEl.textContent = d.cap;
      setNeedle(parseFloat(d.ratio), animate);
      if (hasGsap && animate) {
        gsap.to(counter, {
          v: target, duration: 0.9, ease: 'power2.out', overwrite: true,
          onUpdate: function () { valueEl.textContent = prefix + Math.round(counter.v); }
        });
      } else { counter.v = target; valueEl.textContent = prefix + target; }
    }
    // スクロールしなくても項目タップで確認できるように
    items.forEach(function (li, i) {
      li.addEventListener('mouseenter', function () { if (!motion) activate(i, hasGsap); });
      li.addEventListener('click', function () { activate(i, hasGsap); });
    });
    activate(0, false);
    return { activate: activate, count: items.length, needle: needle, start: START, sweep: SWEEP };
  })();

  /* ---------- フォーム ---------- */
  initForm();

  if (!motion) { root.classList.add('is-loaded'); return; }

  /* =========================================================
     MOTION（GSAP + ScrollTrigger）
  ========================================================= */
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  var mm = gsap.matchMedia();

  /* ---------- SHOWROOM：視点が回り込むカメラワーク ---------- */
  (function () {
    var section = $('.showroom');
    var scenes = $$('.scene', section);
    var sweep = $('.sweep', section);
    var hudDeg = $('#hudDeg'), hudName = $('#hudName'), sceneNo = $('#sceneNo'), sceneBar = $('#sceneBar');
    var hudCar = $('.hud__car'), hudTicks = $('.hud__ticks');
    var isPhone = window.matchMedia('(max-width: 767px)').matches;

    // HUD目盛り
    var NS = 'http://www.w3.org/2000/svg';
    for (var i = 0; i < 36; i++) {
      var a = i * 10 * Math.PI / 180, major = i % 9 === 0;
      var r1 = 54, r2 = major ? 46 : 50;
      var l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', 60 + r1 * Math.sin(a)); l.setAttribute('y1', 60 - r1 * Math.cos(a));
      l.setAttribute('x2', 60 + r2 * Math.sin(a)); l.setAttribute('y2', 60 - r2 * Math.cos(a));
      if (major) l.setAttribute('class', 'major');
      hudTicks.appendChild(l);
    }

    var CLIP_START = 'polygon(115% 0%, 140% 0%, 140% 100%, 100% 100%)';
    var CLIP_END = 'polygon(-5% 0%, 140% 0%, 140% 100%, -20% 100%)';
    var TRANS = 1, HOLD = 1.2, STEP = TRANS + HOLD;
    var angles = scenes.map(function (s) { return parseFloat(s.dataset.angle) || 0; });
    var names = scenes.map(function (s) { return s.dataset.label || ''; });
    var starts = [0];

    var tl = gsap.timeline({ defaults: { ease: 'none' } });
    var m0 = $('.scene__media', scenes[0]);

    gsap.set($$('.scene__media', section), { transformPerspective: 1200, force3D: true });
    gsap.set(sweep, { x: window.innerWidth * 1.2, skewX: -12, autoAlpha: 0 });

    // Scene 1：ゆっくりと前に寄る
    tl.to(m0, { scale: 1.22, xPercent: -5, duration: 1 }, 0)
      .to('.hero', { autoAlpha: 0, y: -60, duration: 0.55 }, 0.15)
      .to('.hero__bigtype', { xPercent: -25, autoAlpha: 0, duration: 1 }, 0)
      .to('.scroll-hint', { autoAlpha: 0, duration: 0.2 }, 0);

    var t = 1;
    for (var k = 1; k < scenes.length; k++) {
      var s = scenes[k];
      var media = $('.scene__media', s);
      var prev = $('.scene__media', scenes[k - 1]);
      var cap = $('.caption', s);
      var prevCap = k > 1 ? $('.caption', scenes[k - 1]) : null;
      starts.push(t);

      // 斜めワイプ＋光のスイープで次の視点へ
      tl.fromTo(s, { clipPath: CLIP_START }, { clipPath: CLIP_END, duration: TRANS, ease: 'power2.inOut' }, t)
        .fromTo(sweep, { x: function () { return window.innerWidth * 1.1; }, autoAlpha: 1 }, { x: function () { return -window.innerWidth * 0.35; }, duration: TRANS, ease: 'power2.inOut', immediateRender: false }, t)
        .set(sweep, { autoAlpha: 0 }, t + TRANS)
        // カメラが回り込む：新しい車は右奥から、前の車は左へ流れる
        .fromTo(media, { scale: 1.38, xPercent: 12, rotationY: -16 }, { scale: 1.14, xPercent: 0, rotationY: 0, duration: TRANS * 1.15, ease: 'power3.out' }, t)
        .to(prev, { xPercent: -12, rotationY: 12, scale: 1.34, filter: isPhone ? 'none' : 'brightness(0.35)', duration: TRANS, ease: 'power2.in' }, t);
      if (prevCap) tl.to(prevCap, { autoAlpha: 0, y: -40, duration: 0.35 }, t);
      tl.fromTo(cap, { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, t + 0.65);
      // ホールド中もじわっと視点がスライド
      tl.to(media, { xPercent: -4, rotationY: 4, scale: 1.12, duration: HOLD }, t + TRANS * 1.15);
      t += STEP;
    }
    tl.to({}, { duration: 0.4 }); // 最後のシーンで少し止める

    function lerpAngle(time) {
      var ang = angles[0], idx = 0;
      for (var i = 1; i < starts.length; i++) {
        if (time >= starts[i]) {
          var p = Math.min(1, (time - starts[i]) / TRANS);
          ang = angles[i - 1] + (angles[i] - angles[i - 1]) * p;
          if (p > 0.5) idx = i;
        }
      }
      return { angle: ang, idx: idx };
    }
    var lastIdx = -1;
    function updateHud() {
      var r = lerpAngle(tl.time());
      var deg = Math.round(r.angle);
      hudDeg.textContent = ('00' + deg).slice(-3);
      hudCar.style.transform = 'rotate(' + r.angle + 'deg)';
      sceneBar.style.transform = 'scaleX(' + tl.progress() + ')';
      if (r.idx !== lastIdx) {
        lastIdx = r.idx;
        hudName.textContent = names[r.idx];
        sceneNo.textContent = ('0' + (r.idx + 1)).slice(-2);
      }
    }

    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: function () { return '+=' + window.innerHeight * (isPhone ? 5.2 : 6.5); },
      pin: true,
      scrub: 0.9,
      anticipatePin: 1,
      animation: tl,
      invalidateOnRefresh: true
    });
    // scrubの慣性に追従させるため、タイムライン側の更新でHUDを描画
    tl.eventCallback('onUpdate', updateHud);
  })();

  /* ---------- NUMBERS：スクロールでメーターが上がる ---------- */
  if (gauge) {
    var revved = false;
    ScrollTrigger.create({
      trigger: '.numbers',
      start: 'top top',
      end: function () { return '+=' + window.innerHeight * 2.4; },
      pin: true,
      anticipatePin: 1,
      onEnter: function () {
        if (revved) return; revved = true;
        // エンジン始動：一度レッドゾーンまで吹け上がる
        gsap.timeline()
          .to(gauge.needle, { rotation: gauge.start + gauge.sweep, svgOrigin: '150 150', duration: 0.55, ease: 'power2.in' })
          .to(gauge.needle, { rotation: gauge.start, svgOrigin: '150 150', duration: 0.6, ease: 'power2.out' });
      },
      onUpdate: function (self) {
        var idx = Math.min(gauge.count - 1, Math.floor(self.progress * gauge.count));
        gauge.activate(idx, true);
      }
    });
  }

  /* ---------- REASONS：画像が開いてパララックス ---------- */
  $$('.reason').forEach(function (r) {
    var media = $('.reason__media', r), img = $('img', media), body = $('.reason__body', r);
    gsap.fromTo(media, { clipPath: 'inset(14% 14% 14% 14% round 14px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 14px)', ease: 'none',
      scrollTrigger: { trigger: media, start: 'top 90%', end: 'top 40%', scrub: true }
    });
    gsap.fromTo(img, { yPercent: -7 }, {
      yPercent: 7, ease: 'none',
      scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: true }
    });
    gsap.from(body.children, {
      autoAlpha: 0, y: 40, duration: 0.9, stagger: 0.1, ease: 'power3.out',
      scrollTrigger: { trigger: body, start: 'top 82%' }
    });
  });

  /* ---------- 汎用リビール ---------- */
  var revealTargets = $$('.sec-head, .svc, .business__body > *, .cta-band__inner > *, .tabs, #panel-buy, .fee-cta, .faq__item, .way, .form, .company, .contact__hero-txt > *');
  gsap.set(revealTargets, { autoAlpha: 0, y: 40 });
  ScrollTrigger.batch(revealTargets, {
    start: 'top 88%',
    once: true,
    onEnter: function (batch) {
      gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out', overwrite: true, clearProps: 'transform' });
    }
  });

  /* ---------- パララックス背景 ---------- */
  [['.cta-band__bg img', '.cta-band'], ['.contact__hero img', '.contact__hero']].forEach(function (p) {
    gsap.fromTo(p[0], { yPercent: -8 }, {
      yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: p[1], start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });
  gsap.from('.business__media', {
    xPercent: 18, autoAlpha: 0, duration: 1.4, ease: 'power3.out',
    scrollTrigger: { trigger: '.business', start: 'top 70%' }
  });

  // 法人向け 30〜50% カウントアップ
  var bigNums = $$('.business__big span');
  ScrollTrigger.create({
    trigger: '.business__big', start: 'top 85%', once: true,
    onEnter: function () {
      bigNums.forEach(function (el) {
        var to = parseInt(el.textContent, 10), o = { v: 0 };
        gsap.to(o, { v: to, duration: 1.6, ease: 'power3.out', onUpdate: function () { el.textContent = Math.round(o.v); } });
      });
    }
  });

  /* ---------- FLOW：車が道を走って進む ---------- */
  var steps = $$('.step');
  function flowTimeline(vertical) {
    var fill = $('.flow__fill'), car = $('.flow__car');
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#flowList', start: vertical ? 'top 70%' : 'top 75%', end: vertical ? 'bottom 60%' : 'center 45%', scrub: 0.6,
        onUpdate: function (self) {
          steps.forEach(function (s, i) { s.classList.toggle('is-on', self.progress >= i / steps.length + 0.02); });
        }
      }
    });
    tl.fromTo(fill, vertical ? { scaleY: 0 } : { scaleX: 0 }, vertical ? { scaleY: 1, ease: 'none' } : { scaleX: 1, ease: 'none' }, 0)
      .fromTo(car, vertical ? { top: '0%' } : { left: '0%' }, vertical ? { top: '100%', ease: 'none' } : { left: '100%', ease: 'none' }, 0);
    gsap.from(steps, {
      autoAlpha: 0, y: 40, duration: 0.8, stagger: 0.12, ease: 'power3.out',
      scrollTrigger: { trigger: '#flowList', start: 'top 82%' }
    });
    return tl;
  }
  mm.add('(min-width: 1024px)', function () { flowTimeline(false); });
  mm.add('(max-width: 1023px)', function () { flowTimeline(true); });

  // 画像・フォント読込後に位置を再計算
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });

  /* =========================================================
     FORM
  ========================================================= */
  function clearError(name) {
    var err = $('.form__err[data-for="' + name + '"]');
    if (err) err.textContent = '';
    $$('[name="' + name + '"]').forEach(function (el) { el.classList.remove('is-invalid'); el.removeAttribute('aria-invalid'); });
  }

  function initForm() {
    var form = $('#form');
    if (!form) return;
    var status = $('#formStatus');
    var started = false;

    var rules = {
      subject: function () { return $('input[name="subject"]:checked', form) ? '' : 'ご相談内容を選択してください。'; },
      name: function (v) { return v.trim() ? (v.length > 60 ? '60文字以内でご入力ください。' : '') : 'お名前をご入力ください。'; },
      tel: function (v) {
        if (!v.trim()) return '';
        var d = v.replace(/[^\d]/g, '');
        return /^[\d\-\s()+]+$/.test(v) && d.length >= 10 && d.length <= 11 ? '' : '電話番号の形式をご確認ください。';
      },
      email: function (v) {
        if (!v.trim()) return 'メールアドレスをご入力ください。';
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'メールアドレスの形式をご確認ください。';
      },
      message: function (v) { return v.trim() ? (v.length > 3000 ? '3000文字以内でご入力ください。' : '') : 'ご相談内容の詳細をご入力ください。'; },
      agree: function () { return form.agree.checked ? '' : 'プライバシーポリシーへの同意が必要です。'; }
    };

    function check(name) {
      var el = form.elements[name];
      var msg = rules[name](el && el.value !== undefined ? el.value : '');
      var err = $('.form__err[data-for="' + name + '"]');
      if (err) err.textContent = msg;
      $$('[name="' + name + '"]', form).forEach(function (f) {
        f.classList.toggle('is-invalid', !!msg && f.type !== 'radio' && f.type !== 'checkbox');
        if (msg) f.setAttribute('aria-invalid', 'true'); else f.removeAttribute('aria-invalid');
      });
      return !msg;
    }

    Object.keys(rules).forEach(function (name) {
      $$('[name="' + name + '"]', form).forEach(function (el) {
        var ev = (el.type === 'radio' || el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'blur';
        el.addEventListener(ev, function () { check(name); });
        el.addEventListener('input', function () { if (el.getAttribute('aria-invalid')) check(name); });
      });
    });

    form.addEventListener('focusin', function () {
      if (started) return; started = true;
      track('form_start', { form_name: 'contact' });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.textContent = ''; status.classList.remove('is-error');

      var firstBad = null;
      Object.keys(rules).forEach(function (name) {
        if (!check(name) && !firstBad) firstBad = form.elements[name].length && !form.elements[name].tagName ? form.elements[name][0] : form.elements[name];
      });
      if (firstBad) {
        firstBad.focus({ preventScroll: true });
        scrollToCenter(firstBad.closest('.form__group') || firstBad);
        return;
      }
      if (form.elements['bot-field'].value) return; // スパム

      form.classList.add('is-sending');
      var fd = new FormData(form);
      var endpoint = (form.getAttribute('data-endpoint') || '').trim();
      var ctrl = 'AbortController' in window ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
      var serverMsg = '';

      fetch(endpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' }, credentials: 'same-origin', signal: ctrl && ctrl.signal })
      .then(function (res) {
        // PHPが動かない環境（静的ホスティング等）ではJSONが返らないので失敗扱い
        return res.json().catch(function () { return null; }).then(function (data) {
          if (!res.ok || !data || data.ok !== true) {
            if (data && data.message && res.status !== 500) serverMsg = data.message;
            throw new Error('HTTP ' + res.status);
          }
        });
      })
      .then(function () {
        track('generate_lead', { form_name: 'contact', subject: fd.get('subject') });
        form.innerHTML =
          '<div class="form-done" tabindex="-1">' +
          '<i class="fas fa-circle-check" aria-hidden="true"></i>' +
          '<h3>お問い合わせありがとうございます</h3>' +
          '<p>ご入力のメールアドレスに確認メールをお送りしました。<br>内容を確認のうえ、担当者よりご連絡いたします。<br>お急ぎの場合はLINEまたはお電話でもお気軽にどうぞ。</p>' +
          '<a href="https://lin.ee/raFB37D9" class="btn btn--line" target="_blank" rel="noopener" data-cta="line_thanks"><i class="fab fa-line" aria-hidden="true"></i>LINEで友だち追加</a>' +
          '</div>';
        var done = $('.form-done', form);
        done.focus({ preventScroll: true });
        scrollToCenter(done);
      }).catch(function () {
        status.classList.add('is-error');
        status.innerHTML = (serverMsg ? serverMsg.replace(/[<>&]/g, '') + '<br>' : '送信できませんでした。') +
          'お手数ですが<a href="https://lin.ee/raFB37D9" target="_blank" rel="noopener">LINE</a>またはお電話（<a href="tel:0664157184">06-6415-7184</a>）でもご連絡いただけます。';
      }).then(function () {
        clearTimeout(timer);
        form.classList.remove('is-sending');
      });
    });
  }
})();
