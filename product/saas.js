/* Self-serve path for the Booking Widget plan (Avenue-style):
   1 business search (Google Places when a key is configured, otherwise the typed name)
   2 builder: their widget, "Customise: Logo / Colour", Publish
   3 publish window: email -> start the 14-day free trial (checkout) -> "you're in, set up your services".
   The Website plan does NOT come here: it books a call (build.js).
   Nothing is sent or charged until LEAD_URL / CHECKOUT_URL are set. Pixel events (only if fbq exists):
   ViewContent when the builder opens, Lead on email, InitiateCheckout on "Start my free trial". */
(function () {
  'use strict';
  var PLACES_KEY = window.DBX_PLACES_KEY || '';   // browser key, referrer-locked to this site. Empty = no suggestions, typed name only.
  var LEAD_URL = '';                               // https webhook that saves the email + business. Empty = demo.
  var CHECKOUT_URL = '';                           // Stripe Checkout / Payment Link with a 14-day trial. Empty = demo.
  var BASE = '../';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COLORS = ['#0E6650', '#1F5FAD', '#C2410C', '#B91C1C', '#0F766E', '#7A4E1D', '#1F2937', '#E8A200'];
  var ic = function (d) { return '<svg viewBox="0 0 24 24">' + d + '</svg>'; };
  var CHECK = ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>');
  var ARW = '<svg class="arw"><use href="#arw"/></svg>';
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function enc(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function track(ev, data) { try { if (window.fbq) window.fbq('track', ev, data || {}); } catch (e) { } try { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: 'dbx_' + ev }, data || {})); } catch (e) { } }
  function guessTrade(t) { t = (t || '').toLowerCase(); return /clean|maid|janitor/.test(t) ? 'cleaning' : /detail|car wash|auto/.test(t) ? 'detailing' : /hvac|heat|cool|air|furnace|plumb/.test(t) ? 'hvac' : 'junk'; }

  var B = { name: '', area: '', phone: '', website: '', placeId: null, trade: 'junk', brand: COLORS[0], logo: null, email: '' };

  /* ---------- 1. hero search with suggestions ---------- */
  var form = document.getElementById('quick'), input = document.getElementById('qName');
  if (!form || !input) return;
  var drop = document.createElement('div'); drop.className = 'qs-drop'; drop.hidden = true; drop.setAttribute('role', 'listbox');
  form.appendChild(drop); form.classList.add('qs');
  var sug = [], active = -1, tmr = null, session = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
  function places(path, opt) {
    return fetch('https://places.googleapis.com/v1' + path, { method: opt.body ? 'POST' : 'GET', headers: Object.assign({ 'Content-Type': 'application/json', 'X-Goog-Api-Key': PLACES_KEY }, opt.mask ? { 'X-Goog-FieldMask': opt.mask } : {}), body: opt.body ? JSON.stringify(opt.body) : undefined })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function paintDrop() {
    var q = input.value.trim();
    if (q.length < 2) { drop.hidden = true; return; }
    drop.innerHTML = sug.map(function (s, i) { return '<button type="button" class="qs-item' + (i === active ? ' on' : '') + '" data-i="' + i + '"><b>' + esc(s.main) + '</b><span>' + esc(s.sub) + '</span></button>'; }).join('') +
      '<button type="button" class="qs-item qs-typed' + (active === sug.length ? ' on' : '') + '" data-i="typed">' + ic('<path d="M5 12h14M13 6l6 6-6 6"/>') + '<span>Continue with <b>' + esc(q) + '</b></span></button>';
    drop.hidden = false;
  }
  input.addEventListener('input', function () {
    active = -1; clearTimeout(tmr);
    var q = input.value.trim(); if (q.length < 2) { sug = []; paintDrop(); return; }
    if (!PLACES_KEY) { sug = []; paintDrop(); return; }
    tmr = setTimeout(function () {
      places('/places:autocomplete', { body: { input: q, sessionToken: session, includedRegionCodes: ['us'] } }).then(function (d) {
        sug = (d.suggestions || []).filter(function (s) { return s.placePrediction; }).slice(0, 5).map(function (s) {
          var p = s.placePrediction; return { id: p.placeId, main: (p.structuredFormat && p.structuredFormat.mainText.text) || p.text.text, sub: (p.structuredFormat && p.structuredFormat.secondaryText && p.structuredFormat.secondaryText.text) || '' };
        });
        paintDrop();
      }).catch(function () { sug = []; paintDrop(); });
    }, 220);
  });
  input.addEventListener('keydown', function (e) {
    if (drop.hidden) return;
    var n = sug.length + 1;
    if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % n; paintDrop(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + n) % n; paintDrop(); }
    else if (e.key === 'Escape') { drop.hidden = true; }
  });
  document.addEventListener('click', function (e) { if (!form.contains(e.target)) drop.hidden = true; });
  drop.addEventListener('mousedown', function (e) { e.preventDefault(); });
  drop.addEventListener('click', function (e) { var b = e.target.closest('.qs-item'); if (b) choose(b.getAttribute('data-i')); });
  form.addEventListener('submit', function (e) { e.preventDefault(); e.stopImmediatePropagation(); choose(active > -1 && active < sug.length ? String(active) : 'typed'); }, true);

  function choose(i) {
    drop.hidden = true;
    var typed = input.value.trim();
    if (i === 'typed' || !sug[+i]) { open({ name: typed || 'Your Business' }); return; }
    var s = sug[+i];
    places('/places/' + encodeURIComponent(s.id) + '?sessionToken=' + encodeURIComponent(session), { mask: 'displayName,shortFormattedAddress,addressComponents,nationalPhoneNumber,websiteUri,primaryTypeDisplayName' })
      .then(function (p) {
        var city = (p.addressComponents || []).filter(function (c) { return c.types.indexOf('locality') > -1; })[0], st = (p.addressComponents || []).filter(function (c) { return c.types.indexOf('administrative_area_level_1') > -1; })[0];
        open({ name: (p.displayName && p.displayName.text) || s.main, area: city ? city.longText + (st ? ', ' + st.shortText : '') : '', phone: p.nationalPhoneNumber || '', website: p.websiteUri || '', placeId: s.id, trade: guessTrade((p.primaryTypeDisplayName && p.primaryTypeDisplayName.text) + ' ' + s.main) });
      })
      .catch(function () { open({ name: s.main }); })
      .then(function () { session = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())); });
  }

  /* ---------- 2. builder + 3. publish window ---------- */
  var el = document.createElement('div');
  el.className = 'sb'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Your booking page');
  el.innerHTML =
    '<div class="sb-top"><span class="logo">dialbridge<span>.</span>ai</span><span class="sb-free">Free for 14 days &middot; cancel anytime</span><button class="sb-x" type="button" data-close aria-label="Close">' + ic('<path d="M6 6l12 12M18 6 6 18"/>') + '</button></div>' +
    '<div class="sb-body"><div class="sb-wrap">' +
    '<div class="sb-head"><h2>Here\'s your booking page, <span data-name></span>.</h2><p>Add your logo and color, then publish it to your website.</p></div>' +
    '<div class="sb-frame">' +
    '<div class="sb-bar"><span class="sb-lbl">Customize</span>' +
    '<label class="sb-chip" id="sbLogoBtn">' + ic('<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M20.5 16l-5-5-8 8.5"/>') + '<span>Logo</span><input type="file" id="sbLogo" accept="image/png,image/jpeg,image/webp"></label>' +
    '<div class="sb-cwrap"><button class="sb-chip" type="button" id="sbColBtn" aria-expanded="false"><i class="sb-dot" id="sbDot"></i><span>Color</span></button>' +
    '<div class="sb-pop" id="sbPop" hidden>' + COLORS.map(function (c) { return '<button type="button" data-c="' + c + '" style="background:' + c + '" aria-label="' + c + '"></button>'; }).join('') + '<label class="sb-any" aria-label="Any color"><input type="color" id="sbAny"></label></div></div>' +
    '<button class="btn sb-pub" type="button" id="sbPub">Publish ' + ic('<path d="M7 17 17 7M9 7h8v8"/>') + '</button></div>' +
    '<div class="sb-canvas"><div class="sb-card"><iframe id="sbFrame" title="Your booking page"></iframe></div></div>' +
    '</div>' +
    '<p class="sb-hint">' + ic('<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>') + 'It works. Tap through it like one of your customers.</p>' +
    '</div></div>' +
    // publish window
    '<div class="sp" id="sp" hidden><div class="sp-box" role="dialog" aria-modal="true" aria-label="Publish your booking page">' +
    '<button class="sp-x" type="button" id="spX" aria-label="Close">' + ic('<path d="M6 6l12 12M18 6 6 18"/>') + '</button>' +
    '<div class="sp-art" id="spArt"><div class="sp-site"><i></i><i></i><i></i><b></b><b class="s"></b></div><div class="sp-btn" id="spBtn">' + ic('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>') + 'Book online</div><p>The same button<br>on your website</p></div>' +
    // a: email
    '<section class="sp-s" data-p="1"><h3>Put it live today</h3><p>Your booking page is ready. Enter your email and we\'ll get you set up.</p>' +
    '<form class="sp-row" id="spF1" novalidate><span>' + ic('<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 6.5 12 13l8.5-6.5"/>') + '</span><input id="spEmail" type="email" inputmode="email" autocomplete="email" placeholder="you@yourbusiness.com"><button class="btn" type="submit">Continue</button></form>' +
    '<p class="sp-err" id="spErr"></p></section>' +
    // b: trial
    '<section class="sp-s" data-p="2"><h3>Start your 14-day free trial</h3>' +
    '<div class="sp-plan"><div><b>Booking Widget</b><span>Your booking page, the Book button for your site, Google and social links, and your inbox</span></div><div class="pr">$0<small>today</small></div></div>' +
    '<ul class="sp-list"><li>' + CHECK + 'Free for 14 days, then $99/month</li><li>' + CHECK + 'We remind you 3 days before the trial ends</li><li>' + CHECK + 'Cancel anytime in one click</li></ul>' +
    '<button class="btn sp-go" type="button" id="spTrial">Start my free trial ' + ARW + '</button><p class="sp-fine">Secure checkout. You won\'t be charged today.</p></section>' +
    // c: in
    '<section class="sp-s" data-p="3"><h3>You\'re in, <span data-name></span>.</h3><p>Next, add your services, prices and hours. It takes about 10 minutes, and you get the one line of code for your website at the end.</p>' +
    '<ol class="sp-next"><li><b>Services and prices</b><span>What you do and what customers see</span></li><li><b>Hours and area</b><span>When and where you take jobs</span></li><li><b>Go live</b><span>Paste one line on your site, or we do it for you</span></li></ol>' +
    '<a class="btn sp-go" id="spSetup" href="#">Set up my services ' + ARW + '</a><p class="sp-demo" id="spDemo" hidden>Draft page: nothing was saved or charged yet.</p></section>' +
    '</div></div>';
  document.body.appendChild(el);

  var $ = function (s) { return el.querySelector(s); }, $$ = function (s) { return [].slice.call(el.querySelectorAll(s)); };
  var frame = $('#sbFrame'), pop = $('#sbPop'), sp = $('#sp'), last = null, logoUrl = null;
  function names() { $$('[data-name]').forEach(function (n) { n.textContent = B.name; }); }
  function load() {
    var cfg = { trade: B.trade, name: B.name, phone: B.phone || '(201) 555-0148', brand: B.brand, area: B.area || 'your area', zips: [] };
    frame.src = BASE + 'book.html?c=' + enc(cfg) + '&embed=1&inline=1&builder=1';
    frame.onload = function () { if (logoUrl) send(); };
  }
  function send() { try { frame.contentWindow.postMessage({ type: 'dbw:customize', brand: B.brand, logo: logoUrl }, location.origin); } catch (e) { } }
  function paintColor() {
    $('#sbDot').style.background = B.brand; $('#spArt').style.setProperty('--b', B.brand);
    $$('#sbPop [data-c]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-c').toLowerCase() === B.brand.toLowerCase()); });
  }

  el.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) { close(); return; }
    var c = e.target.closest('#sbPop [data-c]'); if (c) { B.brand = c.getAttribute('data-c'); paintColor(); send(); pop.hidden = true; $('#sbColBtn').setAttribute('aria-expanded', 'false'); return; }
    if (e.target.closest('#sbColBtn')) { pop.hidden = !pop.hidden; $('#sbColBtn').setAttribute('aria-expanded', String(!pop.hidden)); return; }
    if (!e.target.closest('.sb-cwrap')) pop.hidden = true;
  });
  $('#sbAny').addEventListener('input', function (e) { B.brand = e.target.value; paintColor(); send(); });
  $('#sbLogo').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0]; if (!f || !/^image\/(png|jpeg|webp)$/.test(f.type) || f.size > 4e6) return;
    var r = new FileReader();
    r.onload = function () { logoUrl = r.result; $('#sbLogoBtn').classList.add('set'); send(); };
    r.readAsDataURL(f);
  });

  // publish window
  function pstep(n) { $$('.sp-s').forEach(function (s) { s.classList.toggle('on', +s.getAttribute('data-p') === n); }); }
  $('#sbPub').addEventListener('click', function () { sp.hidden = false; requestAnimationFrame(function () { sp.classList.add('show'); }); pstep(B.email ? 2 : 1); setTimeout(function () { if (!B.email) $('#spEmail').focus(); }, 250); });
  function closeSp() { sp.classList.remove('show'); setTimeout(function () { sp.hidden = true; }, reduce ? 0 : 220); }
  $('#spX').addEventListener('click', closeSp);
  sp.addEventListener('click', function (e) { if (e.target === sp) closeSp(); });
  $('#spF1').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('#spEmail').value.trim(), er = $('#spErr');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { er.textContent = 'Please enter a valid email.'; er.classList.add('on'); return; }
    er.classList.remove('on'); B.email = v;
    var payload = { email: v, business: B.name, area: B.area, phone: B.phone, website: B.website, placeId: B.placeId, trade: B.trade, brand: B.brand, plan: 'widget', page: location.href, at: new Date().toISOString() };
    if (/^https:\/\//.test(LEAD_URL)) fetch(LEAD_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(function () { });
    track('Lead', { content_name: 'widget_publish', value: 25, currency: 'USD' });
    pstep(2);
  });
  $('#spTrial').addEventListener('click', function () {
    track('InitiateCheckout', { content_name: 'booking_widget', value: 99, currency: 'USD' });
    if (/^https:\/\//.test(CHECKOUT_URL)) { location.href = CHECKOUT_URL + (CHECKOUT_URL.indexOf('?') > -1 ? '&' : '?') + 'prefilled_email=' + encodeURIComponent(B.email); return; }
    $('#spDemo').hidden = false; pstep(3);
  });
  $('#spSetup').addEventListener('click', function (e) { e.preventDefault(); });

  document.addEventListener('keydown', function (e) { if (e.key !== 'Escape' || !el.classList.contains('on')) return; if (!sp.hidden) closeSp(); else close(); });

  function open(o) {
    B = Object.assign(B, { name: o.name, area: o.area || '', phone: o.phone || '', website: o.website || '', placeId: o.placeId || null, trade: o.trade || guessTrade(o.name) });
    names(); paintColor(); load();
    last = document.activeElement;
    el.classList.add('on'); document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('show'); }); });
    track('ViewContent', { content_name: 'widget_builder', content_category: B.trade });
  }
  function close() {
    el.classList.remove('show'); document.documentElement.style.overflow = ''; sp.hidden = true; sp.classList.remove('show');
    setTimeout(function () { el.classList.remove('on'); }, reduce ? 0 : 300);
    if (last && last.focus) last.focus();
  }
  window.DBXSaas = { open: open, close: close };
})();
