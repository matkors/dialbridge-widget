/* Self-serve path for the Booking Widget plan (Avenue-style):
   1 business search (Google Places when a key is configured, otherwise the typed name)
   2 builder: their widget, "Customise: Logo / Colour", Publish
   3 register at Publish (Continue with Google, or email + 6-digit code; no password, no card) -> where bookings go
     (name, business, mobile, business phone) -> live, with the hosted link and a setup checklist. Card comes later, at
     'put it on your website' (Stripe Checkout with the 14-day trial).
   The Website plan does NOT come here: it books a call (build.js).
   Nothing is sent or charged until LEAD_URL / CHECKOUT_URL are set. Pixel events (only if fbq exists):
   ViewContent when the builder opens, CompleteRegistration on sign-up, Lead when they publish. */
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
    // register window: the normal SaaS sign-up, shown at Publish (no password, no card)
    '<div class="sp" id="sp" hidden><div class="sp-box" role="dialog" aria-modal="true" aria-label="Save and publish your booking page">' +
    '<button class="sp-x" type="button" id="spX" aria-label="Close">' + ic('<path d="M6 6l12 12M18 6 6 18"/>') + '</button>' +
    '<span class="sp-mark">dialbridge<span>.</span>ai</span>' +
    // 1 register
    '<section class="sp-s" data-p="1"><h3>Save and publish <span data-name></span>\'s booking page</h3><p>Free for 14 days. No credit card.</p>' +
    '<button class="sp-google" type="button" id="spGoogle"><svg class="g" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.9 6.2C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C1 16.6 0 20.2 0 24s1 7.4 2.7 10.8l7.9-6.2z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.2C6.6 42.6 14.6 48 24 48z"/></svg>Continue with Google</button>' +
    '<div class="sp-or"><span>or</span></div>' +
    '<form id="spF1" novalidate><label class="sp-lab" for="spEmail">Email</label><input class="sp-in" id="spEmail" type="email" inputmode="email" autocomplete="email" placeholder="you@yourbusiness.com">' +
    '<p class="sp-err" id="spErr"></p><button class="btn sp-go" type="submit">Continue with email</button></form>' +
    '<p class="sp-terms">By continuing you agree to the <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.</p><p class="sp-alt">Already have an account? <a href="#">Log in</a></p></section>' +
    // 2 code
    '<section class="sp-s" data-p="2"><h3>Check your email</h3><p>We sent a 6-digit code to <b id="spTo"></b>.</p>' +
    '<div class="sp-code" id="spCode">' + [0, 1, 2, 3, 4, 5].map(function (i) { return '<input inputmode="numeric" maxlength="1" autocomplete="' + (i ? 'off' : 'one-time-code') + '" aria-label="Digit ' + (i + 1) + '">'; }).join('') + '</div>' +
    '<p class="sp-err" id="spErr2"></p><button class="btn sp-go" type="button" id="spVerify" disabled>Verify</button>' +
    '<p class="sp-alt"><a href="#" id="spResend">Resend code</a> &middot; <a href="#" id="spBack">Use a different email</a></p></section>' +
    // 3 details
    '<section class="sp-s" data-p="3"><h3>Where should new bookings go?</h3><p>Last step. Then your booking page is live.</p>' +
    '<div class="sp-two"><div><label class="sp-lab" for="spName">Your name</label><input class="sp-in" id="spName" autocomplete="name" placeholder="Jordan Lee"></div>' +
    '<div><label class="sp-lab" for="spBiz">Business name</label><input class="sp-in" id="spBiz" autocomplete="organization"></div></div>' +
    '<label class="sp-lab" for="spMob">Your mobile</label><input class="sp-in" id="spMob" type="tel" inputmode="tel" autocomplete="tel" placeholder="(201) 555-0148"><p class="sp-help">We text you the second a customer books. No marketing texts.</p>' +
    '<label class="sp-lab" for="spPh">Business phone <em>shown on your booking page</em></label><input class="sp-in" id="spPh" type="tel" inputmode="tel" placeholder="(201) 555-0100">' +
    '<p class="sp-err" id="spErr3"></p><button class="btn sp-go" type="button" id="spPublish">Publish my booking page</button></section>' +
    // 4 live
    '<section class="sp-s sp-live" data-p="4"><span class="sp-ok">' + CHECK + '</span><h3>You\'re live, <span id="spFirst"></span>.</h3><p>Customers can book you at this link now. Share it anywhere.</p>' +
    '<div class="sp-link"><span id="spUrl"></span><button type="button" id="spCopy">Copy link</button></div>' +
    '<div class="sp-prog"><span>Finish setting up</span><span id="spDone">1 of 4</span></div><i class="sp-bar"><b></b></i>' +
    '<ol class="sp-tasks"><li class="done"><i>' + CHECK + '</i><div><b>Create your booking page</b></div></li>' +
    '<li><i></i><div><b>Services and prices</b><span>Ready-made for your trade. Change anything.</span></div></li>' +
    '<li><i></i><div><b>Hours and arrival windows</b><span>When you take jobs and how many a day</span></div></li>' +
    '<li><i></i><div><b>Put it on your website and Google</b><span>Copy one line, email your web person, or we do it for you</span></div></li></ol>' +
    '<a class="btn sp-go" id="spSetup" href="#">Set up my services ' + ARW + '</a><p class="sp-demo" id="spDemo" hidden>Draft page: no account was created and nothing was sent.</p></section>' +
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
    $('#sbDot').style.background = B.brand;
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

  // register window
  var sent = '', slug = '';
  function pstep(n) { $$('.sp-s').forEach(function (s) { s.classList.toggle('on', +s.getAttribute('data-p') === n); }); var f = $('.sp-s.on input'); if (f) setTimeout(function () { f.focus(); }, 200); }
  function openSp() { names(); sp.hidden = false; requestAnimationFrame(function () { sp.classList.add('show'); }); pstep(B.email ? 3 : 1); track('ViewContent', { content_name: 'register' }); }
  $('#sbPub').addEventListener('click', openSp);
  function closeSp() { sp.classList.remove('show'); setTimeout(function () { sp.hidden = true; }, reduce ? 0 : 220); }
  $('#spX').addEventListener('click', closeSp);
  sp.addEventListener('click', function (e) { if (e.target === sp) closeSp(); });
  function registered(email, via) {
    B.email = email; B.via = via;
    if (/^https:\/\//.test(LEAD_URL)) fetch(LEAD_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: 'registered', via: via, email: email, business: B.name, area: B.area, phone: B.phone, website: B.website, placeId: B.placeId, trade: B.trade, brand: B.brand, page: location.href, at: new Date().toISOString() }) }).catch(function () { });
    track('CompleteRegistration', { content_name: 'booking_widget', method: via });
    $('#spBiz').value = B.name; $('#spPh').value = B.phone || '';
    pstep(3);
  }
  // Google: real sign-in needs our OAuth client; until then the demo just continues
  $('#spGoogle').addEventListener('click', function () { $('#spDemo').hidden = false; registered('', 'google'); });
  $('#spF1').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('#spEmail').value.trim(), er = $('#spErr');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { er.textContent = 'Please enter a valid email.'; er.classList.add('on'); return; }
    er.classList.remove('on'); sent = v; $('#spTo').textContent = v;
    $$('#spCode input').forEach(function (i) { i.value = ''; }); $('#spVerify').disabled = true;
    pstep(2);
  });
  var boxes = $$('#spCode input');
  function code() { return boxes.map(function (i) { return i.value; }).join(''); }
  boxes.forEach(function (inp, i) {
    inp.addEventListener('input', function () {
      var d = inp.value.replace(/\D/g, '');
      if (d.length > 1) { d.split('').slice(0, 6 - i).forEach(function (c, k) { boxes[i + k].value = c; }); }
      else inp.value = d;
      var nx = boxes[Math.min(5, i + Math.max(1, d.length))]; if (d && nx) nx.focus();
      $('#spVerify').disabled = code().length !== 6;
      if (code().length === 6) $('#spVerify').click();
    });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Backspace' && !inp.value && i) boxes[i - 1].focus(); });
  });
  $('#spVerify').addEventListener('click', function () { if (code().length !== 6) return; $('#spDemo').hidden = false; registered(sent, 'email'); });
  $('#spBack').addEventListener('click', function (e) { e.preventDefault(); pstep(1); });
  $('#spResend').addEventListener('click', function (e) { e.preventDefault(); this.textContent = 'Code sent again'; });
  $('#spPublish').addEventListener('click', function () {
    var name = $('#spName').value.trim(), biz = $('#spBiz').value.trim(), mob = $('#spMob').value.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''), er = $('#spErr3');
    var bad = !name ? 'Please add your name.' : !biz ? 'Please add your business name.' : mob.length !== 10 ? 'Please add a 10-digit mobile number.' : '';
    er.textContent = bad; er.classList.toggle('on', !!bad); if (bad) return;
    B.name = biz; B.owner = name; B.mobile = mob; B.phone = $('#spPh').value.trim() || B.phone;
    if (/^https:\/\//.test(LEAD_URL)) fetch(LEAD_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: 'published', email: B.email, via: B.via, owner: name, mobile: mob, business: biz, businessPhone: B.phone, area: B.area, placeId: B.placeId, trade: B.trade, brand: B.brand, page: location.href, at: new Date().toISOString() }) }).catch(function () { });
    track('Lead', { content_name: 'booking_widget_live', value: 25, currency: 'USD' });
    slug = biz.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'your-business';
    $('#spFirst').textContent = name.split(' ')[0]; $('#spUrl').textContent = 'book.dialbridge.ai/' + slug;
    pstep(4);
  });
  $('#spCopy').addEventListener('click', function () { var b = this; try { navigator.clipboard.writeText('https://' + $('#spUrl').textContent); } catch (e) { } b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy link'; }, 1500); });
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
