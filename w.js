/* Dialbridge widget loader. Install with one line:
   <script async src="https://matviykorsunskiy.me/dialbridge-widget/w.js" data-business="harbor-haul" data-color="#0E6650"></script>
   Optional: data-label="Book a pickup", data-position="left", data-config="<base64url>" (demo generator),
   data-icon="none" (label only), data-bubble="Skip the call and book online" + data-avatar="<image url>" (a speech
   bubble above the button on desktop; closing it hides it until the next page load). Pages with their own bottom bar can lift the
   button: document.dispatchEvent(new CustomEvent('dialbridge:lift', { detail: { px: 70 } })).
   Inline mode for builders that block floating buttons: <div data-dialbridge-inline="harbor-haul"></div>
   Desktop opens a centered popup that grows out of the button; phones get a bottom sheet that fits each step.
   Closing keeps the half-filled form, so an accidental tap outside never loses a customer's answers. */
(function () {
  'use strict';
  var s = document.currentScript || document.querySelector('script[src*="w.js"][data-business],script[src*="w.js"][data-b],script[src*="w.js"][data-config]');
  if (!s || window.__dbwLoaded) return;
  window.__dbwLoaded = true;
  var base = s.src.replace(/w\.js(\?.*)?$/, '');
  var slug = (s.getAttribute('data-business') || s.getAttribute('data-b') || '').replace(/[^a-z0-9-]/g, '');
  // data-live="1": a real business saved in our API (the install code from the app always has it).
  var live = s.getAttribute('data-live') === '1' ? '&live=1' : '';
  var cfg = (s.getAttribute('data-config') || '').replace(/[^A-Za-z0-9_-]/g, '');
  var color = /^#[0-9a-fA-F]{6}$/.test(s.getAttribute('data-color') || '') ? s.getAttribute('data-color') : '#0E6650';
  var label = s.getAttribute('data-label') || 'Book online';
  var left = s.getAttribute('data-position') === 'left';
  var phone = (s.getAttribute('data-phone') || '').replace(/[^\d+]/g, '');   // optional: adds a round call button next to Book online
  var noIcon = s.getAttribute('data-icon') === 'none';
  var font = (s.getAttribute('data-font') || '').replace(/[^\w ]/g, '');   // a font the page already loads, e.g. Manrope
  var bubble = (s.getAttribute('data-bubble') || '').replace(/[<>&"]/g, '').slice(0, 80);
  var avatar = (s.getAttribute('data-avatar') || '').replace(/["'()<>\s]/g, '');
  if (avatar && !/^https:\/\//.test(avatar)) avatar = /^[\w.\/-]+$/.test(avatar) ? new URL(avatar, document.baseURI).href : '';
  var q = (cfg ? 'c=' + cfg : 'b=' + (slug || 'harbor-haul') + live);
  // data-page="try.html": open one of our own pages instead of a business's booking page (the Try it popup on our site).
  var page = (s.getAttribute('data-page') || '').replace(/[^a-z0-9.-]/g, '');
  var src = page ? base + page + '?embed=1' : base + 'book.html?embed=1&' + q;
  // w.js?v=<release>: the popup page gets the same tag, so a normal refresh picks up a new release (no stale cached copy).
  var ver = (s.src.match(/[?&]v=([\w.-]+)/) || [])[1];
  if (ver) src += '&v=' + ver;
  // Traffic for the owner's dashboard (live businesses only). One 'visit' per page load of their site, sent to our
  // API without cookies or anything saved in the browser, so their visitors never see a consent box. The booking
  // form gets the same referrer and page, so it knows how this visitor found them (Google, Facebook, direct...).
  var trackable = !!(live && slug && !page && !cfg);
  function deviceType() { var m = Math.min(screen.width, screen.height); return m < 600 ? 'phone' : m < 1000 && window.matchMedia && matchMedia('(pointer: coarse)').matches ? 'tablet' : 'desktop'; }
  var ctx = trackable ? '&via=site&ref=' + encodeURIComponent(document.referrer.slice(0, 300)) + '&pg=' + encodeURIComponent(location.href.split('#')[0].slice(0, 300)) : '';
  if (trackable) {
    src += ctx;
    try {
      var api = 'https://dialbridge-booking-api.dialbridge-booking-api.workers.dev';
      if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(s.getAttribute('data-api') || '')) api = s.getAttribute('data-api');
      var visit = JSON.stringify({ type: 'visit', ref: document.referrer.slice(0, 300), page: location.href.split('#')[0].slice(0, 300), via: 'site', device: deviceType() });
      var to = api + '/v1/w/' + slug + '/events';
      // Plain text, so no preflight: the owner's site may not be on our list of origins yet.
      if (!(navigator.sendBeacon && navigator.sendBeacon(to, new Blob([visit], { type: 'text/plain' })))) fetch(to, { method: 'POST', body: visit, keepalive: true, mode: 'no-cors' }).catch(function () { });
    } catch (e) { }
  }
  var EASE = 'cubic-bezier(.23,1,.32,1)', DRAWER = 'cubic-bezier(.32,.72,0,1)';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function onBrand(hex) {
    var c = [1, 3, 5].map(function (i) { var v = parseInt(hex.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] > 0.45 ? '#1A1D21' : '#FFFFFF';
  }
  var fg = onBrand(color);

  // Everything lives in one shadow root so the host site's CSS can't restyle it.
  var host = document.createElement('div');
  host.setAttribute('data-dialbridge', '');
  host.style.cssText = 'position:fixed;inset:0 auto auto 0;width:0;height:0;z-index:2147483000';
  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
  root.innerHTML = '<style>' +
    ':host{all:initial}' +
    '*{box-sizing:border-box}' +
    '.w{position:fixed;bottom:calc(24px + var(--lift,0px));' + (left ? 'left' : 'right') + ':24px;display:flex;flex-direction:column;align-items:' + (left ? 'flex-start' : 'flex-end') + ';gap:7px;font-family:' + (font ? '"' + font + '",' : '') + '"Instrument Sans",system-ui,-apple-system,"Segoe UI",sans-serif;animation:wIn .5s .4s ' + EASE + ' both;transition:opacity .2s,transform .25s ' + EASE + ',bottom .3s ' + EASE + '}' +
    // speech bubble (desktop): photo + a short line, a tail pointing at the button, a small close button
    '.bb{position:relative;display:flex;align-items:center;gap:13px;max-width:300px;margin-bottom:12px;padding:14px 18px 14px 14px;border:0;border-radius:18px;background:#fff;color:#14171a;text-align:left;cursor:pointer;font:500 15.5px/1.4 inherit;font-family:inherit;box-shadow:0 0 0 1px rgba(16,24,40,.05),0 12px 30px rgba(16,24,40,.16);animation:bbIn .75s 1.3s cubic-bezier(.34,1.45,.64,1) backwards;transform-origin:' + (left ? '20%' : '75%') + ' 100%;transition:transform .2s ' + EASE + ',box-shadow .2s ' + EASE + '}' +
    '.bb:hover{transform:translateY(-2px);box-shadow:0 0 0 1px rgba(16,24,40,.06),0 16px 36px rgba(16,24,40,.2)}' +
    '.bb::after{content:"";position:absolute;bottom:-7px;' + (left ? 'left:44px' : 'right:' + (phone ? '128px' : '60px')) + ';width:16px;height:16px;background:#fff;border-radius:3px;transform:rotate(45deg);box-shadow:3px 3px 6px rgba(16,24,40,.06)}' +
    '.bb img{width:46px;height:46px;border-radius:50%;object-fit:cover;flex-shrink:0;box-shadow:0 0 0 2px #fff,0 0 0 3px rgba(16,24,40,.1)}' +
    '.bx{position:absolute;top:-9px;' + (left ? 'right' : 'left') + ':-9px;display:grid;place-items:center;width:24px;height:24px;border:0;border-radius:50%;background:#fff;color:#5d646d;cursor:pointer;box-shadow:0 0 0 1px rgba(16,24,40,.1),0 2px 6px rgba(16,24,40,.14);opacity:0;transition:opacity .15s}' +
    '.bwrap{position:relative}.bwrap:hover .bx,.bx:focus-visible{opacity:1}' +
    '.bwrap.gone{display:none}' +
    // the bubble rises up out of the button: starts small and low, springs into place; the photo pops in a beat later
    '@keyframes bbIn{0%{opacity:0;transform:translateY(34px) scale(.86)}55%{opacity:1}}' +
    '.bb img{animation:bbPop .5s 1.45s cubic-bezier(.34,1.56,.64,1) backwards}' +
    '@keyframes bbPop{from{opacity:0;transform:scale(.5)}}' +
    '@media (max-width:640px){.bwrap{display:none}}' +
    '.row{display:flex;align-items:center;gap:10px;flex-direction:' + (left ? 'row-reverse' : 'row') + '}' +
    '.go,.call{position:relative;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,.55);color:' + fg + ';cursor:pointer;text-decoration:none;font-family:inherit;-webkit-tap-highlight-color:transparent;' +
      'background:linear-gradient(180deg,color-mix(in srgb,' + color + ' 62%,#fff) 0%,' + color + ' 58%,color-mix(in srgb,' + color + ' 88%,#000) 100%);' +
      'box-shadow:inset 0 1px 1px rgba(255,255,255,.55),inset 0 -3px 8px rgba(0,0,0,.14),0 0 0 4px color-mix(in srgb,' + color + ' 16%,transparent),0 10px 26px color-mix(in srgb,' + color + ' 38%,transparent);' +
      'transition:transform .2s ' + EASE + ',box-shadow .2s ' + EASE + ',filter .15s}' +
    '.go{gap:10px;height:58px;padding:0 28px 0 22px;border-radius:29px;font:650 17px/1 inherit;font-family:inherit;letter-spacing:-.01em}' +
    '.call{width:58px;height:58px;border-radius:50%}' +
    '.go.ni{padding:0 32px;font-size:19px;font-weight:700}' +
    '.w.hid{opacity:0;transform:translateY(12px);pointer-events:none}' +
    '.go:hover,.call:hover{transform:translateY(-2px);filter:brightness(1.05);box-shadow:inset 0 1px 1px rgba(255,255,255,.55),inset 0 -3px 8px rgba(0,0,0,.14),0 0 0 6px color-mix(in srgb,' + color + ' 18%,transparent),0 16px 34px color-mix(in srgb,' + color + ' 45%,transparent)}' +
    '.go:active,.call:active{transform:scale(.96);transition-duration:.1s}' +
    '.go:focus-visible,.call:focus-visible{outline:3px solid ' + color + ';outline-offset:4px}' +
    '.go svg,.call svg{transition:transform .25s ' + EASE + '}.go:hover svg{transform:rotate(-8deg) scale(1.06)}.call:hover svg{transform:rotate(12deg)}' +
    '.pw{display:flex;align-items:center;gap:5px;padding-' + (left ? 'left' : 'right') + ':' + (phone ? '68px' : '0') + ';font-size:12px;font-weight:600;color:#3d4249;text-shadow:0 1px 0 rgba(255,255,255,.7)}' +
    '.pw i{width:11px;height:11px;border-radius:3px;background:linear-gradient(135deg,#f35427 50%,#20251f 50%)}' +
    '.w.away{opacity:0;transform:translateY(8px) scale(.96);pointer-events:none}' +
    '@keyframes wIn{from{opacity:0;transform:translateY(14px) scale(.96)}}' +
    '.ov{position:fixed;inset:0;z-index:1;display:none;align-items:center;justify-content:center;background:rgba(15,18,22,.46);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);opacity:0;transition:opacity .25s ' + EASE + ';-webkit-tap-highlight-color:transparent}' +
    '.ov.on{display:flex}.ov.show{opacity:1}' +
    '.pn{position:relative;display:flex;flex-direction:column;width:min(940px,calc(100vw - 32px));height:620px;max-height:calc(100dvh - 48px);background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 0 0 1px rgba(16,24,40,.06),0 24px 64px rgba(16,24,40,.28);opacity:0;transform:translateY(28px) scale(.985);transition:opacity .3s ' + EASE + ',transform .3s ' + EASE + '}' +
    '.ov.show .pn{opacity:1;transform:none}' +
    '.pn.fit{transition:opacity .3s ' + EASE + ',transform .3s ' + EASE + ',height .32s ' + EASE + '}' +
    '.ov.out{transition-duration:.15s}.ov.out .pn{transition:opacity .15s ease-out,transform .15s ease-out;transform:translateY(12px) scale(.985);opacity:0}' +
    'iframe{flex:1;width:100%;min-height:0;border:0;background:#fff;opacity:0;transition:opacity .15s}' +
    '.pn.ready iframe{opacity:1}' +
    '.sk{position:absolute;inset:0;display:flex;flex-direction:column;gap:12px;padding:0 0 20px;pointer-events:none;transition:opacity .15s}' +
    '.pn.ready .sk{opacity:0}' +
    '.sk i{display:block;border-radius:12px;background:linear-gradient(90deg,#eef0f2 0,#f6f7f8 40%,#eef0f2 80%) 0 0/300% 100%;animation:sh 1.2s linear infinite}' +
    '.sk .h{height:72px;border-radius:0;background:' + color + ';animation:none;margin-bottom:10px}' +
    '.sk .t{height:22px;width:46%;margin:0 24px 4px}.sk .r{height:66px;margin:0 24px}' +
    '@keyframes sh{to{background-position:-300% 0}}' +
    '.gr{display:none}' +
    '@media (max-width:640px){' +
    '.ov{align-items:flex-end;-webkit-backdrop-filter:none;backdrop-filter:none}' +
    '.pn{width:100%;max-height:calc(100dvh - 12px);border-radius:18px 18px 0 0;padding-bottom:env(safe-area-inset-bottom,0px);transform:translateY(100%);opacity:1;transition:transform .34s ' + DRAWER + '}' +
    '.pn.fit{transition:transform .34s ' + DRAWER + ',height .32s ' + EASE + '}' +
    '.ov.show .pn{transform:none}' +
    '.ov.out .pn{transform:translateY(100%);opacity:1;transition:transform .22s ease-in}' +
    '.pn.drag{transition:none}' +
    '.gr{display:flex;justify-content:center;align-items:center;position:absolute;top:0;left:0;right:0;height:16px;z-index:3;touch-action:none;cursor:grab}' +
    '.gr::before{content:"";width:38px;height:4px;border-radius:2px;background:rgba(255,255,255,.55)}' +
    '.pn.light .gr::before{background:#d3d7dc}' +
    '.w{bottom:calc(16px + var(--lift,0px));' + (left ? 'left' : 'right') + ':16px}.go{height:52px;font-size:16px;padding:0 22px 0 18px}.call{width:52px;height:52px}.pw{padding-' + (left ? 'left' : 'right') + ':' + (phone ? '62px' : '0') + '}}' +
    '@media (prefers-reduced-motion:reduce){*{animation:none!important;transition-duration:.01ms!important}}' +
    '</style>' +
    '<div class="w">' + (bubble ? '<div class="bwrap"><button type="button" class="bb" aria-haspopup="dialog">' + (avatar ? '<img src="' + avatar + '" alt="">' : '') + '<span>' + bubble + '</span></button>' +
      '<button type="button" class="bx" aria-label="Hide this message"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>' : '') +
    '<div class="row"><button type="button" class="go' + (noIcon ? ' ni' : '') + '" aria-haspopup="dialog">' + (noIcon ? '' : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>') +
    label.replace(/[<>&]/g, '') + '</button>' + (phone ? '<a class="call" href="tel:' + phone + '" aria-label="Call us"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15.6 14.4l-2.2 2.2a14 14 0 0 1-6-6l2.2-2.2a1 1 0 0 0 .2-1.1L8.6 4.6a1 1 0 0 0-1.1-.6L4.9 4.6a1 1 0 0 0-.8 1C4.6 14 10 19.4 18.4 19.9a1 1 0 0 0 1-.8l.6-2.6a1 1 0 0 0-.6-1.1l-2.7-1.2a1 1 0 0 0-1.1.2z"/></svg></a>' : '') + '</div><span class="pw"><i></i>Powered by Dialbridge</span></div>' +
    '<div class="ov" role="presentation"><div class="pn" role="dialog" aria-modal="true" aria-label="Book online"><div class="gr" aria-hidden="true"></div>' +
    '<div class="sk" aria-hidden="true"><i class="h"></i><i class="t"></i><i class="r"></i><i class="r"></i><i class="r"></i></div></div></div>';

  var wrap = root.querySelector('.w'), btn = root.querySelector('.go'), ov = root.querySelector('.ov'), pn = root.querySelector('.pn'), grab = root.querySelector('.gr');
  var frame = null, frameStart = null, isOpen = false, lastFocus = null, prefetched = false, wantH = 0, focusOn = false, closeT = null;

  function mobile() { return window.matchMedia('(max-width: 640px)').matches; }
  function prefetch() {
    if (prefetched) return; prefetched = true;
    var l = document.createElement('link'); l.rel = 'prefetch'; l.href = src; document.head.appendChild(l);
  }
  // Size the panel to the screen inside it. On phones the sheet goes full height while the keyboard is up.
  function fit() {
    if (!wantH) return;
    var vh = window.innerHeight, h;
    if (mobile()) { h = focusOn ? vh - 12 : Math.min(wantH, vh - 12); pn.style.height = 'calc(' + Math.round(h) + 'px + env(safe-area-inset-bottom, 0px))'; return; }
    h = Math.max(380, Math.min(wantH, 760, vh - 48));
    pn.style.height = Math.round(h) + 'px';
  }
  function originFrom(el) {
    if (!el || mobile()) { pn.style.transformOrigin = ''; return; }
    var r = el.getBoundingClientRect(), p = pn.getBoundingClientRect();
    pn.style.transformOrigin = Math.round(r.left + r.width / 2 - p.left) + 'px ' + Math.round(r.top + r.height / 2 - p.top) + 'px';
  }
  function open(start, from) {
    if (isOpen) return;
    isOpen = true; clearTimeout(closeT);
    var st = /^(book|quote|text|call|plan|demo|message|widget|full)$/.test(start || '') ? start : null;
    if (!frame || (st && st !== frameStart)) {
      if (frame) frame.remove();
      pn.classList.remove('ready', 'fit'); wantH = 0; pn.style.height = '';
      frame = document.createElement('iframe');
      frame.src = src + (st ? '&start=' + st : '');
      frame.title = 'Book online';
      frame.setAttribute('allow', 'camera');
      frameStart = st;
      frame.addEventListener('load', function () { setTimeout(function () { pn.classList.add('ready'); }, 1200); });
      pn.appendChild(frame);
    }
    lastFocus = document.activeElement;
    ov.classList.remove('out'); ov.classList.add('on');
    wrap.classList.add('away');
    document.documentElement.style.overflow = 'hidden';
    fit();
    requestAnimationFrame(function () { requestAnimationFrame(function () { ov.classList.add('show'); if (frame) frame.focus(); }); });
  }
  function close() {
    if (!isOpen) return;
    isOpen = false; focusOn = false;
    ov.classList.add('out'); ov.classList.remove('show');
    pn.style.transform = '';
    wrap.classList.remove('away');
    document.documentElement.style.overflow = '';
    closeT = setTimeout(function () { ov.classList.remove('on', 'out'); }, reduce ? 0 : 240);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  window.addEventListener('resize', function () { if (isOpen) fit(); });

  // Drag the sheet's top edge down to close it (phones).
  var dragY = null, dragT = 0, dy = 0;
  grab.addEventListener('pointerdown', function (e) { dragY = e.clientY; dragT = Date.now(); dy = 0; pn.classList.add('drag'); grab.setPointerCapture(e.pointerId); });
  grab.addEventListener('pointermove', function (e) { if (dragY === null) return; dy = Math.max(0, e.clientY - dragY); pn.style.transform = 'translateY(' + dy + 'px)'; });
  function endDrag() {
    if (dragY === null) return;
    var v = dy / Math.max(1, Date.now() - dragT);
    dragY = null; pn.classList.remove('drag');
    if (dy > 110 || v > 0.5) close(); else pn.style.transform = '';
  }
  grab.addEventListener('pointerup', endDrag);
  grab.addEventListener('pointercancel', endDrag);

  var inline = [];
  window.addEventListener('message', function (e) {
    if (!e.data || typeof e.data.type !== 'string') return;
    if (frame && e.source === frame.contentWindow) {
      var t = e.data.type;
      if (t === 'dbw:close') close();
      else if (t === 'dbw:ready') { pn.classList.add('ready'); pn.classList.toggle('light', !!e.data.light); }
      else if (t === 'dbw:height' && e.data.h > 0) {
        var first = !wantH; wantH = +e.data.h; fit();
        if (first) requestAnimationFrame(function () { pn.classList.add('fit'); });
      }
      else if (t === 'dbw:focus') { focusOn = !!e.data.on; if (mobile()) fit(); }
      else if (t === 'dbw:submit') document.dispatchEvent(new CustomEvent('dialbridge:submit', { detail: e.data }));
      return;
    }
    inline.forEach(function (f) { if (e.source === f.contentWindow && e.data.type === 'dbw:height' && e.data.h > 0) f.style.height = Math.max(480, Math.round(e.data.h)) + 'px'; });
  });

  btn.addEventListener('click', function () { open(null, btn); });
  // The page can open the popup itself, e.g. a pricing button: window.DialBridge.open('plan').
  window.DialBridge = { open: function (start) { open(start, btn); } };
  var bb = root.querySelector('.bb'), bx = root.querySelector('.bx');
  if (bb) { bb.addEventListener('click', function () { open(null, btn); }); bb.addEventListener('mouseenter', function () { prefetch(); }); }
  // Closing the bubble hides it on this page view only; it comes back on the next visit.
  if (bx) bx.addEventListener('click', function () { root.querySelector('.bwrap').classList.add('gone'); });
  document.addEventListener('dialbridge:lift', function (e) { var d = e.detail || {}, px = +d.px; wrap.style.setProperty('--lift', (px > 0 ? Math.min(px, 200) : 0) + 'px'); wrap.classList.toggle('hid', d.hide === true); });
  btn.addEventListener('mouseenter', prefetch);
  btn.addEventListener('touchstart', prefetch, { passive: true });
  setTimeout(prefetch, 3000);

  function mount() {
    document.body.appendChild(host);
    Array.prototype.forEach.call(document.querySelectorAll('[data-dialbridge-inline]'), function (el) {
      var b = (el.getAttribute('data-dialbridge-inline') || slug).replace(/[^a-z0-9-]/g, '');
      var f = document.createElement('iframe');
      f.src = base + 'book.html?embed=1&inline=1&' + (cfg ? 'c=' + cfg : 'b=' + b + live) + (b === slug ? ctx : '');
      f.title = 'Book online';
      f.style.cssText = 'display:block;width:100%;height:620px;border:0;border-radius:16px;box-shadow:0 0 0 1px rgba(16,24,40,.08),0 12px 32px rgba(16,24,40,.1);transition:height .32s ' + EASE;
      el.appendChild(f); inline.push(f);
    });
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  // Links like yoursite.com/?book or /#book (or ?book=quote) open the widget straight away, for ads and social bios.
  var auto = new URLSearchParams(location.search).get('book');
  if (auto !== null || location.hash === '#book') setTimeout(function () { open(auto); }, 300);
  window.DialBridgeWidget = { open: function (start, el) { open(start, el && el.nodeType === 1 ? el : null); }, close: close };
})();
