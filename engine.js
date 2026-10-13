/* Dialbridge booking widget engine. One renderer, any business: config = trade template + business overrides.
   Loads from ?b=<slug> (flows/<slug>.json) or ?c=<base64url JSON> (demo generator). ?embed=1 when opened by w.js.
   Steps are grouped into screens: the service screen also holds the questions that follow it, revealed one at a time. */
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  // ?live=1 (set by w.js data-live and the owner's booking link): a real business saved in our API, with real
  // open times and real bookings. Without it, ?b= reads the demo files in flows/ and nothing leaves the page.
  var LIVE_API = 'https://dialbridge-booking-api.dialbridge-booking-api.workers.dev';
  // Local testing only: a page served from this computer may point at a local API (?api=http://127.0.0.1:8791).
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(params.get('api') || '')) LIVE_API = params.get('api');
  // Pictures: https, our API's own links, or (only on a page served from this computer) a local test server's.
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  function srcOk(u) { u = String(u || ''); return /^https:\/\//.test(u) || u.indexOf(LIVE_API + '/') === 0 || (LOCAL && /^http:\/\/(localhost|127\.0\.0\.1):\d+\//.test(u)); }
  var LIVE = params.get('live') === '1' && !params.get('c') && params.get('builder') !== '1';
  var EMBED = params.get('embed') === '1';
  var LOAD_AT = Date.now();
  var CLOSABLE = EMBED && params.get('inline') !== '1';
  var app = document.getElementById('app');
  if (EMBED) document.body.classList.add('embed');
  // ?demo=1: the product page drives this copy itself. Hide scrollbars and ignore the visitor's wheel and touch scrolling.
  if (params.get('demo') === '1') {
    document.body.classList.add('demo-lock');
    ['wheel', 'touchmove'].forEach(function (t) { document.addEventListener(t, function (e) { e.preventDefault(); }, { passive: false }); });
  }

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var ic = function (name, cls) { return '<i data-lucide="' + esc(name) + '"' + (cls ? ' class="' + cls + '"' : '') + '></i>'; };

  function b64dec(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return JSON.parse(decodeURIComponent(escape(atob(s))));
  }

  function build(p) {
    // A live business brings its own saved template (services, prices, steps); demos use the trade's built-in one.
    var saved = p.template && Array.isArray(p.template.services) && p.template.services.length && p.template.steps && p.template.flows;
    var t = JSON.parse(JSON.stringify(saved ? p.template : (window.DBW_TEMPLATES[p.trade] || window.DBW_TEMPLATES.junk)));
    delete p.template;
    // Ids end up inside HTML attributes: letters, digits, - and _ only, whatever a saved template or a link says.
    var safeId = function (v) { return String(v == null ? '' : v).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60); };
    (t.services || []).forEach(function (x) { if (x) x.id = safeId(x.id); });
    Object.keys(t.steps || {}).forEach(function (k) { var st = t.steps[k]; if (st && Array.isArray(st.options)) st.options.forEach(function (o) { if (o) o.id = safeId(o.id); }); });
    var b = Object.assign({}, t.defaults, {
      name: 'Your Business', phone: '(201) 555-0148', brand: '#0E6650', area: 'your area', zips: [], rating: null, reviews: null, tz: 'America/New_York', demo: true
    }, p);
    if (!/^#[0-9a-fA-F]{6}$/.test(b.brand)) b.brand = '#0E6650';
    if (b.logo && !srcOk(b.logo)) b.logo = null;
    // The template's pictures (side photo, tile photos): https, or our API's own image links.
    var okUrl = srcOk;
    var im = p.images && typeof p.images === 'object' ? p.images : {};
    if (okUrl(im.side)) b.hero = im.side; else if (b.hero && !okUrl(b.hero)) b.hero = null;
    b.tileImg = {}; ['book', 'quote', 'text', 'call'].forEach(function (k) { if (okUrl(im['tile-' + k])) b.tileImg[k] = im['tile-' + k]; });
    b.zips = (b.zips || []).map(function (z) { return String(z).replace(/\D/g, ''); }).filter(Boolean);
    b.phoneDigits = String(b.phone).replace(/\D/g, '');
    if (p.prices) Object.keys(p.prices).forEach(function (k) {
      var parts = k.split('.'); var st = t.steps[parts[0]];
      var opt = st && st.options && st.options.filter(function (o) { return o.id === parts[1]; })[0];
      if (opt) opt.price = p.prices[k];
    });
    if (p.serviceImages && typeof p.serviceImages === 'object') t.services.forEach(function (x) { var u = p.serviceImages[x.id]; if (typeof u === 'string' && /^https:\/\//.test(u)) x.image = u; });
    if (Array.isArray(p.hideServices) && p.hideServices.length) {
      var keep = t.services.filter(function (x) { return p.hideServices.indexOf(x.id) < 0; });
      if (keep.length) t.services = keep;
    }
    if (p.tradeLabel) t.trade = String(p.tradeLabel).slice(0, 40);   // their own words, e.g. "Barbershop"
    // Optional, only when a business sets them: its own service list, step wording and button words (e.g. a lamp repair shop on the general template).
    if (Array.isArray(p.services)) {
      var own = p.services.filter(function (x) { return x && x.id && x.label; }).map(function (x) {
        return { id: String(x.id).replace(/[^a-z0-9-]/g, ''), label: String(x.label).slice(0, 60), hint: String(x.hint || '').slice(0, 80), icon: String(x.icon || 'clipboard-list').replace(/[^a-z0-9-]/g, ''), mode: ['book', 'request', 'estimate'].indexOf(x.mode) > -1 ? x.mode : 'estimate' };
      });
      if (own.length) t.services = own;
    }
    if (p.stepText && typeof p.stepText === 'object') Object.keys(p.stepText).forEach(function (k) {
      var st = t.steps[k], o = p.stepText[k];
      if (!st || !o) return;
      ['title', 'estimateTitle', 'placeholder'].forEach(function (f) { if (typeof o[f] === 'string') st[f] = o[f].slice(0, 120); });
      if (typeof o.askAddress === 'boolean') st.askAddress = o.askAddress;
    });
    if (p.words && typeof p.words === 'object') ['estimateSubmit', 'estimateDone'].forEach(function (f) { if (typeof p.words[f] === 'string') t[f] = p.words[f].slice(0, 40); });
    t.biz = b;
    return t;
  }

  function getJSON(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function prettyUs(p) { var d = String(p || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''); return d.length === 10 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : ''; }
  // Their weekly hours -> the days, opening and closing time the "open now" check and the call tile use.
  function hoursOf(h) {
    var w = (h && h.weekly) || {}, days = [], open = null, close = null;
    for (var d = 0; d < 7; d++) {
      var iv = w[d] || w[String(d)];
      if (!iv || !iv.length) continue;
      days.push(d);
      iv.forEach(function (x) { if (!open || x[0] < open) open = x[0]; if (!close || x[1] > close) close = x[1]; });
    }
    return { days: days, open: open || '08:00', close: close || '18:00', mode: h && h.mode === 'slots' ? 'slots' : 'window' };
  }
  function loadLive() {
    var slug = (params.get('b') || '').replace(/[^a-z0-9-]/g, '');
    var api = LIVE_API + '/v1/w/' + slug;
    return Promise.all([getJSON(api + '/config'), getJSON(api + '/slots?days=14').catch(function () { return { slots: [] }; })]).then(function (r) {
      var c = r[0], h = hoursOf(c.hours);
      var T0 = build({ slug: c.slug, trade: c.trade, template: c.template, name: c.name, phone: prettyUs(c.phone), brand: c.brand, area: c.area || 'your area',
        zips: c.zips || [], tz: c.timezone, days: h.days, open: h.open, close: h.close, timeMode: h.mode, demo: false, api: api, apiSlots: r[1].slots || [], notLive: c.live === false, templateOnly: c.setupDone === false,
        logo: c.logo || null, website: c.website || null, images: c.images || {}, rating: c.rating || null, reviews: c.reviews || null });
      // Photos can't be sent through the API yet, so don't offer an upload we would drop (details and the truck step).
      Object.keys(T0.steps).forEach(function (k) { if (T0.steps[k].type === 'details' || T0.steps[k].photos) T0.steps[k].photos = false; });
      return T0;
    });
  }

  function loadConfig() {
    if (LIVE && params.get('b')) return loadLive();
    if (params.get('c')) {
      // Link-based demo configs can never send data anywhere: submitUrl only comes from our own flows/*.json files.
      try { var dc = b64dec(params.get('c')); delete dc.submitUrl; dc.demo = true; return Promise.resolve(build(dc)); } catch (e) { return Promise.reject(e); }
    }
    var slug = (params.get('b') || 'harbor-haul').replace(/[^a-z0-9-]/g, '');
    return fetch('flows/' + slug + '.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('not found');
      return r.json();
    }).then(function (j) { return build(Object.assign({ slug: slug }, j)); });
  }

  /* ---------- time helpers ---------- */
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function mins(hhmm) { var a = String(hhmm).split(':'); return (+a[0]) * 60 + (+(a[1] || 0)); }
  function fmt(m) { var h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? 'PM' : 'AM', h12 = h % 12 || 12; return h12 + (mm ? ':' + String(mm).padStart(2, '0') : '') + ' ' + ap; }
  function bizNow(b) {
    var parts = new Intl.DateTimeFormat('en-US', { timeZone: b.tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    var o = {}; parts.forEach(function (x) { o[x.type] = x.value; });
    return { dow: DOW.indexOf(o.weekday), m: (+o.hour % 24) * 60 + (+o.minute) };
  }
  function isOpen(b) {
    if (params.get('open') === '1') return true;
    if (params.get('open') === '0') return false;
    var n = bizNow(b);
    return b.days.indexOf(n.dow) > -1 && n.m >= mins(b.open) && n.m < mins(b.close);
  }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

  /* ---------- app ---------- */
  loadConfig().then(start).catch(function () {
    app.innerHTML = '<div class="err">This booking page could not be loaded. Please call the business directly.</div>';
  });

  function start(T) {
    var B = T.biz;
    var OPEN = isOpen(B);
    document.title = 'Book ' + B.name + ' online';
    var root = document.documentElement.style;
    function setBrand(hex) {
      root.setProperty('--brand', hex);
      var rgb = [1, 3, 5].map(function (i) { return parseInt(hex.substr(i, 2), 16) / 255; }).map(function (c) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
      var lum = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
      root.setProperty('--on-brand', lum > 0.45 ? '#1A1D21' : '#FFFFFF');
    }
    setBrand(B.brand);
    var hostLine = document.getElementById('hostline');
    if (hostLine && !EMBED) hostLine.innerHTML = '<b>' + esc(B.name) + '</b><span>Serving ' + esc(B.area) + ' · <a href="tel:+1' + B.phoneDigits + '">' + esc(B.phone) + '</a></span>';
    // Live traffic for the owner's dashboard: no cookies and nothing stored on the visitor's device, so no consent
    // box. The session id lives in memory for this page load only. ref and pg come from the page around us (w.js on
    // their site, or their hosted booking page), so the source is how the visitor found them, not our own frame.
    // Never names, phones or answers: those only go in the booking itself.
    var sid = Math.random().toString(36).slice(2, 12), sent = {}, booked = false;
    var REF = (params.has('ref') ? params.get('ref') : document.referrer) || '', PG = params.get('pg') || location.href;
    var VIA = /^(site|hosted)$/.test(params.get('via') || '') ? params.get('via') : 'link';
    var DEVICE = (function () { var m = Math.min(screen.width, screen.height); return m < 600 ? 'phone' : m < 1000 && matchMedia('(pointer: coarse)').matches ? 'tablet' : 'desktop'; })();
    function liveEvent(type, step) {
      var k = type + (step ? ':' + step : '');
      if (!B.api || sent[k]) return; sent[k] = 1;
      fetch(B.api + '/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
        body: JSON.stringify({ type: type, step: step || undefined, session: sid, ref: REF.slice(0, 300), page: PG.slice(0, 300), via: VIA, device: DEVICE }) }).catch(function () { });
    }
    if (B.api) liveEvent('view');

    var S;
    function fresh() { S = { path: null, idx: 0, svc: null, svcs: [], ans: {}, addons: {}, details: '', photos: [], day: null, time: null, tmode: 'first', name: '', phone: '', zip: '', addr: '', msg: '', cb: null, done: null }; }
    fresh();
    // ?builder=1: the product page's widget builder (same origin) can try a color and an uploaded logo live.
    // An uploaded logo arrives as a data: image and is only ever shown in an <img>, never saved from here.
    var BUILDERS = /^https:\/\/(app\.matviykorsunskiy\.me|app\.dialbridge\.ai)$|^http:\/\/(localhost|127\.0\.0\.1):\d+$/;
    // ?builder=1&edit=1: the dashboard's page builder. The template's slots (logo, side photo, the four start options,
    // the Google rating) show as outlined boxes; clicking one asks the dashboard to fill it. Nothing is booked from here.
    // edit=1: every box. edit=brand: only the left side (logo, side photo, rating). edit=tiles: only the four options.
    var EDIT = params.get('builder') === '1' && /^(1|brand|tiles)$/.test(params.get('edit') || '');
    var EDITB = EDIT && params.get('edit') !== 'tiles', EDITT = EDIT && params.get('edit') !== 'brand';
    if (EDIT) document.documentElement.classList.add('editing');
    // Brand step: the middle (the four options) is the next step, so it fades back and says so.
    if (EDITB && !EDITT) document.documentElement.classList.add('edit-brand');
    var imgOk = function (u) { return /^data:image\/(png|jpeg|webp);base64,/.test(u || '') || srcOk(u); };
    if (params.get('builder') === '1') window.addEventListener('message', function (e) {
      if ((e.origin !== location.origin && !BUILDERS.test(e.origin)) || !e.data || e.data.type !== 'dbw:customize') return;
      if (/^#[0-9a-fA-F]{6}$/.test(e.data.brand || '')) { B.brand = e.data.brand; setBrand(B.brand); }
      if (e.data.logo === null) B.logo = null;
      else if (/^data:image\/(png|jpeg|webp|gif);base64,/.test(e.data.logo || '') || srcOk(e.data.logo)) B.logo = e.data.logo;
      if (e.data.hero === null) B.hero = null; else if (imgOk(e.data.hero)) B.hero = e.data.hero;
      if (e.data.tileImg && typeof e.data.tileImg === 'object') { B.tileImg = {}; Object.keys(e.data.tileImg).forEach(function (k) { if (imgOk(e.data.tileImg[k])) B.tileImg[k] = e.data.tileImg[k]; }); }
      if (e.data.tiles && typeof e.data.tiles === 'object') ['book', 'quote', 'text', 'call', 'order', 'off'].forEach(function (k) { if (e.data.tiles[k] !== undefined) T.tiles[k] = e.data.tiles[k]; });
      if (e.data.rating !== undefined) { B.rating = e.data.rating || null; B.reviews = e.data.reviews || null; }
      if (e.data.logoTone !== undefined) T.logoTone = e.data.logoTone === 'light' ? 'light' : '';
      if (e.data.heroPos !== undefined) T.heroPos = /^\d{1,3}% \d{1,3}%$/.test(e.data.heroPos || '') ? e.data.heroPos : '';
      if (typeof e.data.name === 'string' && e.data.name.trim()) B.name = e.data.name.trim().slice(0, 80);
      render();
    });

    function flowFor(path) {
      if (path === 'book' || path === 'quote') return T.flows[path];
      return { text: ['message'], call: ['call'], callback: ['callback'] }[path] || [];
    }
    var BUILTIN = { message: 'What would you like to ask?', call: 'Call ' + B.name, callback: OPEN ? 'When should we call you?' : 'We are closed right now. When should we call you?' };
    function stepDef(id) { return T.steps[id] || { type: id, title: BUILTIN[id] || '' }; }
    function visible() {
      return flowFor(S.path).filter(function (id) {
        var d = stepDef(id);
        if (!d.showIf) return true;
        if (!S.svc) return false;
        return d.showIf.indexOf(S.svc.mode) > -1;
      });
    }
    // Questions after the service picker share its screen; everything else starts a new screen.
    var STARTS = { zip: 1, service: 1, details: 1, time: 1, contact: 1, message: 1, call: 1, callback: 1 };
    function screens() {
      var out = [];
      visible().forEach(function (id) { var t = stepDef(id).type; if (!out.length || STARTS[t]) out.push([id]); else out[out.length - 1].push(id); });
      return out;
    }
    function curScreen() { if (!S.path || S.done) return null; return screens()[S.idx] || null; }

    function svcById(id) { return T.services.filter(function (s) { return s.id === id; })[0]; }
    // Several picks (junk removal) act as one combined service: any walkthrough-only pick makes the whole job a walkthrough.
    function combined() {
      var list = S.svcs.map(svcById).filter(Boolean);
      if (!list.length) return null;
      if (list.length === 1) return Object.assign({}, list[0], { parts: list });
      return {
        id: S.svcs.join('+'), label: list.map(function (x) { return x.label; }).join(', '),
        mode: list.some(function (x) { return x.mode === 'estimate'; }) ? 'estimate' : list[0].mode,
        heavy: list.some(function (x) { return x.heavy; }), icon: list[0].icon, parts: list
      };
    }
    function optOf(stepId) { var d = T.steps[stepId]; return d && d.options && d.options.filter(function (o) { return o.id === S.ans[stepId]; })[0]; }

    // The owner's own price for a service (pricing: fixed | from | range | none), or null when the answers price it.
    // Same rules as the server (api/src/pricing.js), so the customer sees the price the owner gets.
    function ownPrice(s) {
      var n = function (v) { return typeof v === 'number' && isFinite(v) && v >= 0 ? Math.round(v) : null; };
      if (s.pricing === 'fixed' && n(s.fixed) !== null) return { lo: n(s.fixed), hi: n(s.fixed) };
      if (s.pricing === 'from' && n(s.from) !== null) return { lo: n(s.from), hi: null };
      if (s.pricing === 'range' && s.range && n(s.range[0]) !== null && n(s.range[1]) !== null) return { lo: n(s.range[0]), hi: Math.max(n(s.range[0]), n(s.range[1])) };
      if (s.pricing === 'none') return { none: true };
      return null;
    }
    function priceText(lo, hi) { return hi === null ? 'From $' + lo : lo === hi ? '$' + lo : '$' + lo + ' to $' + hi; }
    function svcTag(s) {
      if (s.mode === 'estimate') return 'Free estimate';
      var o = ownPrice(s); if (o) return o.none ? '' : priceText(o.lo, o.hi);
      return s.fixed ? '$' + s.fixed : s.fee ? '$' + s.fee + ' visit' : s.heavy ? 'By weight' : '';
    }
    function priceInfo() {
      if (!B.showPrices || !S.svc) return null;
      if (S.svc.mode === 'estimate') return { text: 'Free estimate', note: 'Priced after a quick walkthrough' };
      var lo = 0, hi = 0, has = false, m = S.svc.mult || 1, alo = 0, ahi = 0;
      visible().forEach(function (id) {
        var d = stepDef(id);
        if (d.type === 'choice') { var o = optOf(id); if (o && o.price) { lo += o.price[0]; hi += o.price[1]; has = true; } if (o && o.mult) m *= o.mult; }
        if (d.type === 'addons') d.options.forEach(function (o) { if (S.addons[o.id] && o.add) { alo += o.add[0]; ahi += o.add[1]; } });
      });
      var own = (S.svc.parts || [S.svc]).map(ownPrice);
      if (own.every(Boolean)) {
        if (own.some(function (x) { return x.none; })) return null;
        var L = own.reduce(function (a, x) { return a + x.lo; }, 0) + alo, open = own.some(function (x) { return x.hi === null; });
        var H = open ? null : own.reduce(function (a, x) { return a + x.hi; }, 0) + ahi;
        return { text: priceText(L, H), note: T.priceNote || 'Final price confirmed before we start.' };
      }
      if (!has) {
        if (S.svc.fixed) return { text: '$' + S.svc.fixed, note: 'Flat price for the visit' };
        if (S.svc.fee) return { text: '$' + S.svc.fee + ' visit', note: 'Diagnostic visit fee. Repair priced on site.' };
        return null;
      }
      if (m !== 1) { lo = Math.round(lo * m / 5) * 5; hi = Math.round(hi * m / 5) * 5; }
      lo += alo; hi += ahi;
      return { text: lo === hi ? '$' + lo : '$' + lo + ' to $' + hi, note: (S.svc.heavy ? 'Dirt, concrete and rock are priced by weight, so the final price may be higher. ' : '') + (T.priceNote || 'Based on your answers. Final price confirmed before we start.') };
    }
    function bookRange() {
      var lo = null, hi = null;
      var own = T.services.filter(function (s) { return s.mode !== 'estimate'; }).map(ownPrice);
      if (own.length && own.every(function (x) { return x && !x.none; })) {
        return [Math.min.apply(null, own.map(function (x) { return x.lo; })), null, true];
      }
      if (own.some(Boolean)) return null;
      T.flows.book.forEach(function (id) { var d = T.steps[id]; if (!d || d.type !== 'choice' || lo !== null) return; d.options.forEach(function (o) { if (!o.price) return; lo = lo === null ? o.price[0] : Math.min(lo, o.price[0]); hi = hi === null ? o.price[1] : Math.max(hi, o.price[1]); }); });
      return lo === null ? null : [lo, hi];
    }

    // Live: the next 7 days in their time zone, starting with the first day that has an open time.
    // A day with no open times shows as closed. Times come straight from /slots, so they can actually be booked.
    function liveDays() {
      var have = {}; B.apiSlots.forEach(function (s) { have[s.day] = 1; });
      var p = new Intl.DateTimeFormat('en-CA', { timeZone: B.tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).split('-');
      var all = [];
      for (var i = 0; i < 15; i++) {
        var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + i, 12));
        var key = d.toISOString().slice(0, 10);
        all.push({ key: key, dow: DOW[d.getUTCDay()], num: d.getUTCDate(), mon: MON3[d.getUTCMonth()], off: !have[key], today: i === 0 });
      }
      var first = 0; while (first < all.length - 7 && all[first].off) first++;
      return all.slice(first, first + 7);
    }
    function liveTimes(day) {
      return B.apiSlots.filter(function (s) { return s.day === day.key; }).map(function (s) {
        var hm = /T(\d{2}):(\d{2})/.exec(s.start) || [0, 0, 0];
        return { id: s.start, label: s.label, start: (+hm[1]) * 60 + (+hm[2]), full: s.remaining !== undefined && s.remaining <= 0 };
      });
    }
    function dayList() {
      if (B.api) return liveDays();
      var n = bizNow(B), out = [], base = new Date();
      var startOffset = n.m > mins(B.close) - 120 ? 1 : 0;
      for (var i = startOffset; out.length < 7; i++) {
        var d = new Date(base); d.setDate(base.getDate() + i);
        out.push({ key: d.toDateString(), dow: DOW[d.getDay()], num: d.getDate(), mon: MON3[d.getMonth()], off: B.days.indexOf(d.getDay()) < 0, today: i === 0 });
      }
      return out;
    }
    function windows(day) {
      if (B.api) return liveTimes(day);
      var o = mins(B.open), c = mins(B.close), n = bizNow(B), list;
      if (B.timeMode === 'slots') {
        list = [];
        for (var t = Math.max(o, 8 * 60); t <= c - 120; t += 120) list.push({ id: fmt(t), label: fmt(t), start: t });
        list.forEach(function (x) { x.full = hash(day.key + x.start) % 7 === 0; });
      } else {
        list = [
          { id: 'Morning', label: fmt(o) + ' to 11 AM', start: o },
          { id: 'Midday', label: '11 AM to 2 PM', start: 11 * 60 },
          { id: 'Afternoon', label: '2 PM to ' + fmt(Math.min(c, 17 * 60)), start: 14 * 60 }
        ];
      }
      return list.filter(function (x) { return !(day.today && x.start < n.m + 60); });
    }
    function dayLabel(d) { return (d.today ? 'Today' : d.dow) + ', ' + d.mon + ' ' + d.num; }
    function firstAvailable() {
      var out = [];
      dayList().forEach(function (d) { if (d.off || out.length >= 5) return; windows(d).forEach(function (w) { if (!w.full && out.length < 5) out.push({ day: d, w: w }); }); });
      return out;
    }
    function whenText() {
      var d = dayList().filter(function (x) { return x.key === S.day; })[0];
      if (!d || !S.time) return '';
      var w = windows(d).filter(function (x) { return x.id === S.time; })[0];
      return dayLabel(d) + ', ' + (w ? w.label : S.time);
    }

    function digits() { return S.phone.replace(/\D/g, ''); }
    function prettyPhone() { var d = digits().replace(/^1(?=\d{10}$)/, ''); return d.length === 10 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : S.phone; }
    function inArea() { return !B.zips.length || B.zips.some(function (z) { return S.zip.indexOf(z) === 0; }); }
    function zipOk() { return /^\d{5}$/.test(S.zip) && inArea(); }
    function hasZipStep() { return flowFor(S.path).indexOf('zip') > -1; }
    // Ask for a ZIP on the contact step only when there was no ZIP step and the business limits its area.
    // Customers who go to the business (barbers, salons) are never asked.
    function contactNeedsZip() { return !hasZipStep() && B.zips.length > 0; }
    function contactOk() { return S.name.trim().length > 1 && digits().length >= 10; }
    function valid(id) {
      var d = stepDef(id);
      if (d.type === 'service') return !!S.svc;
      if (d.type === 'choice') return !!S.ans[id];
      if (d.type === 'time') return !!(S.day && S.time);
      if (d.type === 'zip') return zipOk();
      if (d.type === 'contact') return contactOk() && (!d.askAddress || S.addr.trim().length > 4) && (!contactNeedsZip() || zipOk());
      if (d.type === 'message') return contactOk() && S.msg.trim().length >= 3;
      if (d.type === 'callback') return contactOk() && !!S.cb;
      if (d.type === 'call') return false;
      return true;
    }
    function screenValid(sc) { return !!sc && sc.every(valid); }

    /* ---------- render ---------- */
    function stars() { return '<span class="stars" aria-hidden="true">' + new Array(6).join('★') + '</span>'; }
    // Logos come in every shape: wide wordmarks, square badges, round icons. Each gets the size that reads best
    // (a square one is drawn bigger than the height of a wide one), measured from the picture itself.
    function fitLogos() {
      Array.prototype.forEach.call(app.querySelectorAll('img.logo, .slogo img, .slot-slogo img'), function (img) {
        var set = function () { var r = img.naturalWidth / (img.naturalHeight || 1); img.setAttribute('data-shape', r >= 2.6 ? 'wide' : r >= 1.35 ? 'mid' : 'square'); };
        if (img.complete && img.naturalWidth) set(); else img.addEventListener('load', set, { once: true });
      });
    }
    // A white or very light logo would vanish on a white chip: T.logoTone 'light' puts it on a dark one instead.
    var lightLogo = function () { return T.logoTone === 'light'; };
    function headerHtml() {
      var brand = B.logo ? '<img class="logo" src="' + esc(B.logo) + '" alt="' + esc(B.name) + '">' : '<span class="wordmark">' + esc(B.name) + '</span>';
      if (EDITB) brand = '<button type="button" class="slot slot-logo' + (B.logo ? ' has' : '') + '" data-edit="logo">' + (B.logo ? '<img class="logo" src="' + esc(B.logo) + '" alt=""><span class="sl-tip">Change logo</span>' : '<span class="sl-plus">+</span><span>Upload logo</span>') + '</button>';
      var sub = 'Book online' + (B.rating ? ' <span class="dot">·</span> ' + stars() + ' ' + esc(B.rating) + ' (' + esc(B.reviews) + ' reviews)' : '');
      if (EDITB) sub = 'Book online ' + (B.rating ? '<button type="button" class="slot slot-rate has" data-edit="rating">' + stars() + ' ' + esc(B.rating) + ' (' + esc(B.reviews) + ')<span class="sl-tip">Change</span></button>' : '<button type="button" class="slot slot-rate" data-edit="rating"><span class="sl-plus">+</span>Add your Google rating</button>');
      return '<header class="hd' + (B.logo && !lightLogo() ? ' light' : '') + '"><div class="hd-l">' + brand + '<span class="hd-sub">' + sub + '</span></div>' +
        (CLOSABLE ? '<button class="x" data-act="close" aria-label="Close">' + ic('x') + '</button>' : '') + '</header>' +
        // The owner hasn't finished the builder yet: say so, so nobody mistakes the starter template for their real page.
        (B.templateOnly && !EDIT ? '<div class="tpl-note"><b>Starter template.</b> This page is not set up yet. <a href="https://app.matviykorsunskiy.me/booking-page/1" target="_top">Finish setting it up</a></div>' : '');
    }
    // A thin progress bar (like Avenue's): the first screen counts as a step, and the done screen fills it.
    // It starts at the last screen's width and grows to the new one, so every step change animates.
    var PROG = 0;
    function progress() {
      if (S.done) return 1;
      if (!S.path) return .12;
      var n = screens().length;
      return Math.min(1, (S.idx + 1) / (n + 1));
    }
    function stepperHtml() {
      var to = progress(), n = S.path ? screens().length : 0;
      var label = S.done ? 'Done' : S.path && n ? 'Step ' + (S.idx + 1) + ' of ' + n : 'Start';
      return '<div class="prog"><div class="ptrack" role="progressbar" aria-label="' + label + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(to * 100) + '"><i id="pfill" style="width:' + (PROG * 100) + '%"></i></div></div>';
    }
    function truck(frac) {
      var w = Math.round(150 * (frac || 0));
      return '<svg class="truck" viewBox="0 0 240 96" role="img" aria-label="Truck load"><rect x="4" y="8" width="154" height="66" rx="3" fill="#fff" stroke="#1d2125" stroke-width="2"/><rect x="6" y="10" width="' + w + '" height="62" fill="var(--brand)"/><path d="M43 10v62M81 10v62M119 10v62" stroke="#1d2125" stroke-width="1" stroke-dasharray="3 4" opacity=".25"/><path d="M158 28h36l26 26v20h-62z" fill="#fff" stroke="#1d2125" stroke-width="2" stroke-linejoin="round"/><path d="M168 35h22l16 16h-38z" fill="#e8eaed" stroke="#1d2125" stroke-width="1.5" stroke-linejoin="round"/><path d="M2 74h224" stroke="#1d2125" stroke-width="2"/><circle cx="42" cy="81" r="10" fill="#fff" stroke="#1d2125" stroke-width="2"/><circle cx="42" cy="81" r="3" fill="#1d2125"/><circle cx="190" cy="81" r="10" fill="#fff" stroke="#1d2125" stroke-width="2"/><circle cx="190" cy="81" r="3" fill="#1d2125"/></svg>';
    }
    function pinArt() {
      return '<svg class="art" viewBox="0 0 160 120" aria-hidden="true"><circle cx="80" cy="62" r="56" fill="#f1f2f4"/><rect x="36" y="58" width="56" height="34" rx="3" fill="var(--brand)" opacity=".18"/><path d="M92 66h18l14 14v12H92z" fill="var(--brand)"/><path d="M98 70h10l9 9H98z" fill="#fff"/><path d="M30 92h100" stroke="#1d2125" stroke-width="2"/><circle cx="52" cy="94" r="7" fill="#fff" stroke="#1d2125" stroke-width="3"/><circle cx="108" cy="94" r="7" fill="#fff" stroke="#1d2125" stroke-width="3"/><path d="M66 22c-11 0-19 8-19 18 0 14 19 32 19 32s19-18 19-32c0-10-8-18-19-18z" fill="var(--brand)"/><circle cx="66" cy="40" r="7" fill="#fff"/></svg>';
    }
    function photosHtml(label) {
      return '<input type="file" id="ph" accept="image/*" multiple hidden><div class="photos"><button type="button" class="btn-out" data-act="photos">' + ic('image-plus') + esc(label) + '</button>' +
        S.photos.map(function (u) { return '<img class="thumb" alt="" src="' + u + '">'; }).join('') + '</div>';
    }
    function nameFields(n) {
      return '<div class="f2"><label class="fld"><span>Name <em>*</em></span><input data-in="name" autocomplete="name" placeholder="Jordan Lee" value="' + esc(S.name) + '"></label>' +
        '<label class="fld"><span>Mobile <em>*</em></span><input data-in="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="(201) 555-0123" value="' + esc(S.phone) + '"></label></div>' +
        // Spam trap: hidden from people and screen readers; bots that fill every field give themselves away.
        '<div aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden"><label>Company fax<input id="hpf" name="company_fax" tabindex="-1" autocomplete="off"></label></div>';
    }

    function blockHtml(id) {
      var d = stepDef(id), h = '';
      var title = d.title || '';
      if (d.type === 'time' && S.svc && S.svc.mode === 'estimate') title = d.estimateTitle || title;
      if (d.type === 'zip') {
        h += '<div class="center">' + pinArt() + '<h3>' + esc(title) + '</h3><p class="lede">Enter your ZIP code so we can check that ' + esc(B.name) + ' comes to you.</p></div>' +
          '<label class="fld narrow"><span>ZIP code <em>*</em></span><span class="inwrap"><input data-in="zip" inputmode="numeric" autocomplete="postal-code" maxlength="5" placeholder="07430" value="' + esc(S.zip) + '"><span class="ok" id="zok"' + (zipOk() ? '' : ' hidden') + '>' + ic('circle-check') + '</span></span></label>' +
          '<p class="warn narrow" id="oa"' + (/^\d{5}$/.test(S.zip) && !inArea() ? '' : ' hidden') + '>We don\'t cover that ZIP yet. ' + esc(B.name) + ' serves ' + esc(B.area) + '. <a href="tel:+1' + B.phoneDigits + '">Call to ask</a></p>';
        return h;
      }
      h += '<h3>' + esc(title) + '</h3>';
      if (d.type === 'service') {
        if (T.multiService && d.multiHint) h += '<p class="lede">' + esc(d.multiHint) + '</p>';
        h += '<div class="tiles' + (T.services.some(function (x) { return x.image; }) ? '' : ' icons') + '" style="--n:' + (T.services.length <= 6 ? T.services.length : 5) + '">' + T.services.map(function (s) {
          var on = S.svcs.indexOf(s.id) > -1;
          var tag = svcTag(s);
          var tick = on ? '<span class="tick">' + ic('check') + '</span>' : '', tt = tag && B.showPrices ? '<span class="tt">' + esc(tag) + '</span>' : '';
          // Photo tiles: picture with the label underneath. Icon tiles: one card with the icon, label and tag inside.
          if (s.image) return '<button type="button" class="tile' + (on ? ' on' : '') + '" data-act="svc" data-v="' + esc(s.id) + '" aria-pressed="' + !!on + '"><span class="tbox">' + tick + '<img alt="" src="' + esc(s.image) + '"></span><span class="tl">' + esc(s.label) + '</span>' + tt + '</button>';
          return '<button type="button" class="tile it' + (on ? ' on' : '') + '" data-act="svc" data-v="' + esc(s.id) + '" aria-pressed="' + !!on + '"><span class="tbox">' + tick + '<span class="tico">' + ic(s.icon) + '</span><span class="tl">' + esc(s.label) + '</span>' + tt + '</span></button>';
        }).join('') + '</div>';
      }
      if (d.type === 'choice') {
        var o = optOf(id);
        h += '<div class="chips' + (d.ui === 'list' ? ' col' : '') + '">' + d.options.map(function (x) {
          return '<button type="button" class="chip' + (S.ans[id] === x.id ? ' on' : '') + '" data-act="opt" data-s="' + esc(id) + '" data-v="' + esc(x.id) + '">' + esc(d.ui === 'grid' ? x.label : (x.short && d.ui === 'truck' ? x.label : x.label)) + (x.badge ? '<span class="save">' + esc(x.badge) + '</span>' : '') + '</button>';
        }).join('') + '</div>';
        if (o && o.urgent) h += '<div class="alert">' + ic('triangle-alert') + '<span>No heat or no cooling right now? Calling is fastest.</span><a href="tel:+1' + B.phoneDigits + '">Call now</a></div>';
        if (d.ui === 'truck' && o) {
          var p = priceInfo();
          h += '<div class="pricebox">' + truck(o.frac) + '<div><b>' + esc(p ? p.text : o.label) + '</b><span>' + esc(p ? p.note : 'Final price confirmed on site.') + '</span></div></div>';
          if (d.photos) h += photosHtml(S.path === 'quote' ? 'Add photos for a tighter price' : 'Add photos (optional)');
        }
      }
      if (d.type === 'addons') {
        h += '<div class="chips">' + d.options.map(function (x) { var on = !!S.addons[x.id]; return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-act="addon" data-v="' + esc(x.id) + '" aria-pressed="' + on + '">' + (on ? ic('check', 'ci') : ic('plus', 'ci')) + esc(x.label) + (B.showPrices && x.add ? ' <span class="amt">+$' + esc(x.add[0]) + '</span>' : '') + '</button>'; }).join('') + '</div>';
      }
      if (d.type === 'details') {
        h += '<label class="fld"><span>Describe the job</span><textarea data-in="details" rows="4" placeholder="' + esc(d.placeholder || '') + '">' + esc(S.details) + '</textarea></label>' + (d.photos ? photosHtml('Upload photos') : '');
      }
      if (d.type === 'time') {
        h += '<div class="tabs"><button type="button" class="' + (S.tmode === 'first' ? 'on' : '') + '" data-act="tmode" data-v="first">First available</button><button type="button" class="' + (S.tmode === 'day' ? 'on' : '') + '" data-act="tmode" data-v="day">Pick a day</button></div>';
        h += '<p class="meta">' + ic('globe') + ({ 'America/Chicago': 'Central', 'America/Denver': 'Mountain', 'America/Phoenix': 'Arizona', 'America/Los_Angeles': 'Pacific' }[B.tz] || 'Eastern') + ' Time. ' + (B.timeMode === 'slots' ? 'Pick a start time.' : 'Pick an arrival window; we text to confirm.') + '</p>';
        if (S.tmode === 'first') {
          h += '<div class="radios">' + firstAvailable().map(function (r) { var on = S.day === r.day.key && S.time === r.w.id; return '<button type="button" class="radio' + (on ? ' on' : '') + '" data-act="slot" data-d="' + esc(r.day.key) + '" data-v="' + esc(r.w.id) + '"><span class="rb"></span>' + dayLabel(r.day) + ', ' + r.w.label + '</button>'; }).join('') + '</div>';
        } else {
          var days = dayList();
          h += '<div class="days">' + days.map(function (x) { return '<button type="button" class="day' + (S.day === x.key ? ' on' : '') + '" data-act="day" data-v="' + esc(x.key) + '"' + (x.off ? ' disabled' : '') + '><span>' + (x.today ? 'Today' : x.dow) + '</span><b>' + x.num + '</b></button>'; }).join('') + '</div>';
          var dd = days.filter(function (x) { return x.key === S.day; })[0];
          if (dd) {
            var ws = windows(dd);
            h += ws.length ? '<div class="radios">' + ws.map(function (w) { var on = S.time === w.id; return '<button type="button" class="radio' + (on ? ' on' : '') + '" data-act="slot" data-d="' + esc(dd.key) + '" data-v="' + esc(w.id) + '"' + (w.full ? ' disabled' : '') + '><span class="rb"></span>' + w.label + (w.full ? '<span class="full">Booked</span>' : '') + '</button>'; }).join('') + '</div>' : '<p class="meta">No times left today. Pick another day.</p>';
          }
        }
      }
      if (d.type === 'contact') {
        h += nameFields(1) + (d.askAddress ? '<label class="fld"><span>' + esc(d.addressLabel || 'Address of the job') + ' <em>*</em></span><input data-in="addr" autocomplete="street-address" placeholder="123 Main St" value="' + esc(S.addr) + '"></label>' : '') + (contactNeedsZip() ? '<label class="fld narrow"><span>ZIP code <em>*</em></span><input data-in="zip" inputmode="numeric" maxlength="5" placeholder="07430" value="' + esc(S.zip) + '"></label><p class="warn" id="oa"' + (/^\d{5}$/.test(S.zip) && !inArea() ? '' : ' hidden') + '>' + esc(B.name) + ' does not serve this ZIP yet.</p>' : '') +
          '<p class="fine">By sending, you agree that ' + esc(B.name) + ' may text you about this request. Message and data rates may apply. Reply STOP to opt out. No account, no spam.</p>';
      }
      if (d.type === 'message') {
        h += '<label class="fld"><span>Your question <em>*</em></span><textarea data-in="msg" rows="4" placeholder="Do you take old hot tubs?">' + esc(S.msg) + '</textarea></label>' + nameFields(2) +
          '<p class="fine">Goes straight to the owner\'s phone. Reply STOP to opt out.</p>';
      }
      if (d.type === 'call') {
        h += '<div class="callbox"><span class="num">' + esc(B.phone) + '</span><span class="meta">' + (OPEN ? 'Open until ' + fmt(mins(B.close)) + ' today' : 'Closed now') + '</span><a class="btn" href="tel:+1' + B.phoneDigits + '">' + ic('phone') + 'Call now</a></div>' +
          '<button type="button" class="linkrow" data-act="callback">I would rather get a call back' + ic('chevron-right') + '</button>';
      }
      if (d.type === 'callback') {
        h += nameFields(3) + '<div class="radios">' + ['As soon as you open', 'Late morning', 'Afternoon'].map(function (x) { return '<button type="button" class="radio' + (S.cb === x ? ' on' : '') + '" data-act="cb" data-v="' + x + '"><span class="rb"></span>' + x + '</button>'; }).join('') + '</div>';
      }
      return h;
    }

    // Photos for the first screen (free Unsplash licence, files in img/tiles, credits in img/tiles/CREDITS.json).
    var TRADE = { junk: 'junk', cleaning: 'cleaning', detailing: 'detailing', hvac: 'hvac', general: 'general', appointments: 'appointments' }[B.trade] || 'junk';
    var IMG = { book: 'img/tiles/' + TRADE + '-book.webp', quote: 'img/tiles/quote.webp', text: 'img/tiles/text.webp', call: 'img/tiles/call.webp' };
    // The brand panel follows the customer: one short line for the screen they are on (wide layout only).
    function sideCopy() {
      var area = B.area && B.area !== 'your area' ? B.area : '';
      var first = [B.tagline || (T.trade + (area ? ' in ' + area : ', booked online')), T.sideLine || 'Tell us what you need, see your price and pick a time.'];
      if (S.done) return ['You\'re all set', B.name + ' has your request. Watch for a text from ' + B.phone + '.'];
      var sc = curScreen(); if (!sc) return first;
      var t = stepDef(sc[0]).type;
      if (t === 'zip') return ['We come to you', area ? B.name + ' serves ' + area + '. Your ZIP tells us you\'re covered.' : 'Your ZIP tells us ' + B.name + ' covers your address.'];
      if (t === 'service') return S.path === 'quote' ? ['Get a price without a visit', 'Tell us about the job and ' + B.name + ' texts you a price.']
        : B.showPrices ? ['See your price first', 'Prices show as you pick, before you book anything.'] : ['What do you need?', 'Pick what fits. You can add details next.'];
      if (t === 'details') return ['Photos help', 'A couple of photos usually get you an exact price instead of a range.'];
      var confirmWord = T.confirmBy === 'call' ? ' calls you to confirm' : ' texts you to confirm', inst = S.svc && S.svc.mode === 'book';
      if (t === 'time') return ['Pick a time that works', inst ? 'These are open times. Pick one and it\'s booked.' : 'These are open times. ' + B.name + confirmWord + '.'];
      if (t === 'contact') return ['Last step', 'No account and no spam. ' + (inst ? B.name + ' texts you the confirmation.' : B.name + confirmWord + ' the details.')];
      if (t === 'message') return ['Ask anything', 'Your question goes straight to the owner\'s phone. Replies come by text.'];
      if (t === 'call' || t === 'callback') return ['Talk to a person', OPEN ? 'Call now, or pick a time and ' + B.name + ' calls you back.' : B.name + ' calls you back at the time you pick.'];
      return first;
    }
    function sideHtml() {
      var photo = imgOk(B.hero) ? B.hero : (TRADE === 'junk' ? 'img/tiles/junk-hero.webp' : IMG.book);
      var c = sideCopy();
      var pos = /^\d{1,3}% \d{1,3}%$/.test(T.heroPos || '') && imgOk(B.hero) ? ' style="object-position:' + T.heroPos + '"' : '';
      return '<aside class="side' + (imgOk(B.hero) ? ' own' : '') + '"' + (EDITB ? '' : ' aria-hidden="true"') + '><div class="sb"><img alt="" src="' + esc(photo) + '"' + pos + '>' +
        (EDITB ? '<button type="button" class="slot slot-side' + (B.hero ? ' has' : '') + '" data-edit="side"><span class="sl-plus">+</span><span>' + (B.hero ? 'Change side photo' : 'Add your own photo') + '</span><small>Tall photo, at least 600 &times; 900</small></button>' +
          '<span class="sl-badge">' + (B.hero ? 'Your photo' : 'Side photo: click to add yours') + '</span>' : '') + '<div class="st">' +
        (EDITB ? '<button type="button" class="slot slot-slogo' + (B.logo ? ' has' : '') + (B.logo && lightLogo() ? ' dark' : '') + '" data-edit="logo">' + (B.logo ? '<img src="' + esc(B.logo) + '" alt=""><span class="sl-tip">Change logo</span>' : '<span class="sl-plus">+</span><span><b>Upload your logo</b><small>At least 300 &times; 80, wide or square</small></span>') + '</button>'
          : B.logo ? '<span class="slogo' + (lightLogo() ? ' dark' : '') + '"><img src="' + esc(B.logo) + '" alt=""></span>' : '<span class="sname"><span class="smark">' + esc((B.name || 'B').trim().charAt(0).toUpperCase()) + '</span>' + esc(B.name) + '</span>') +
        '<div class="scopy"><h2>' + esc(c[0]) + '</h2><p>' + esc(c[1]) + '</p></div></div>' +
        '<div class="sinfo"><span class="sopen' + (OPEN ? ' on' : '') + '"><i></i>' + (OPEN ? 'Open now' : 'Closed now, book anyway') + '</span>' +
        '<span>Usually replies in ' + esc(B.replyMins || 15) + ' minutes</span>' +
        (EDITB ? '<button type="button" class="slot slot-srate' + (B.rating ? ' has' : '') + '" data-edit="rating">' + (B.rating ? '<b class="stars">★</b> <b>' + esc(B.rating) + '</b> from ' + esc(B.reviews) + ' Google reviews<span class="sl-tip">Change</span>' : '<span class="sl-plus">+</span>Show your Google rating') + '</button>'
          : B.rating ? '<span><b class="stars">★</b> <b>' + esc(B.rating) + '</b> from ' + esc(B.reviews) + ' Google reviews</span>' : '') + '</div></div></aside>';
    }
    function menuHtml() {
      // The owner's order and which options show (tiles.order / tiles.off). Without one: Call first while open.
      var ALL = ['book', 'quote', 'text', 'call'], tiles = T.tiles || {};
      var mine = Array.isArray(tiles.order) ? tiles.order.filter(function (k) { return ALL.indexOf(k) > -1 && T.tiles[k]; }) : null;
      var order = mine && mine.length ? mine.concat(ALL.filter(function (k) { return mine.indexOf(k) < 0; })) : (OPEN ? ['call', 'book', 'quote', 'text'] : ['book', 'quote', 'text', 'call']);
      var off = Array.isArray(tiles.off) ? tiles.off : [];
      var hidden = EDITT ? order.filter(function (k) { return off.indexOf(k) > -1 && T.tiles[k]; }) : [];
      order = order.filter(function (k) { return off.indexOf(k) < 0 && T.tiles[k]; });
      if (!order.length) order = ['book'];
      if (EDITT) order = order.concat(hidden);
      return (EDITB && !EDITT ? '<div class="next-note">The four options are the next step</div>' : '') + '<div class="mhead"><h3>How can we help?</h3><p class="lede">Pick one. It takes about a minute.</p></div><div class="menu tiles2' + (order.length === 3 ? ' n3' : order.length < 3 ? ' n' + order.length : '') + '">' + order.map(function (k) {
        var t = T.tiles[k], title = t.title, desc = t.desc, icon = t.icon;
        if (k === 'book' && t.priced && B.showPrices) { var rg = bookRange(); if (rg) desc = rg[2] ? 'From $' + rg[0] + '. See your price as you pick.' : t.priced.replace('{min}', '$' + rg[0]).replace('{max}', '$' + rg[1]); }
        if (k === 'call' && !t.custom) { title = OPEN ? 'Call the office' : 'Get a call back'; desc = OPEN ? 'Open until ' + fmt(mins(B.close)) + ' today.' : 'Closed now. Calls from ' + fmt(mins(B.open)) + '.'; icon = OPEN ? 'phone' : 'phone-incoming'; }
        var pic = (B.tileImg && B.tileImg[k]) || IMG[k], ipos = /^\d{1,3}% \d{1,3}%$/.test(t.imgPos || '') ? ' style="object-position:' + t.imgPos + '"' : '';
        if (EDITT) {
          var isOff = off.indexOf(k) > -1;
          return '<div class="mtile slot slot-tile' + (isOff ? ' off' : '') + '" draggable="true" data-edit="tile" data-k="' + k + '" role="button" tabindex="0"><span class="mimg"><img alt="" src="' + esc(pic) + '"' + ipos + '></span>' +
            '<span class="sl-drag" title="Drag to move">&#8942;&#8942;</span><span class="sl-edit">' + (isOff ? 'Hidden. Click to show' : 'Edit') + '</span><span class="mt"><b>' + esc(title) + '</b><span>' + esc(desc) + '</span></span></div>';
        }
        return '<button type="button" class="mtile" data-act="start" data-v="' + k + '"><span class="mimg"><img alt="" src="' + esc(pic) + '"' + ipos + '></span><span class="mt"><b>' + esc(title) + '</b><span>' + esc(desc) + '</span></span></button>';
      }).join('') + '</div>' +
        // Phones don't show the side panel, so its open-now and reply-time line goes under the options.
        '<p class="mtrust"><span class="sopen' + (OPEN ? ' on' : '') + '"><i></i>' + (OPEN ? 'Open now' : 'Closed now, book anyway') + '</span><span>Usually replies in ' + esc(B.replyMins || 15) + ' minutes</span></p>';
    }

    function doneHtml() {
      var who = esc(S.name.trim().split(' ')[0] || 'there'), ph = esc(prettyPhone());
      var title, text, foot = OPEN ? 'They usually reply within ' + esc(B.replyMins) + ' minutes.' : 'The office opens at ' + fmt(mins(B.open)) + '. Expect a text shortly after.';
      var byCall = T.confirmBy === 'call', instant = S.path === 'book' && S.svc.mode === 'book' && !!S.time;
      if (S.path === 'book') {
        title = S.svc.mode === 'estimate' ? esc(T.estimateDone || 'Walkthrough requested') : instant ? 'You\'re booked' : 'Request sent';
        text = instant ? esc(B.name) + ' will text ' + ph + ' a reminder before the visit. Need to change something? Just reply to the text.'
          : byCall ? esc(B.name) + ' will call ' + ph + ' to confirm the time and details.' : esc(B.name) + ' will text ' + ph + ' to confirm. Need to change something? Just reply to the text.';
      }
      else if (S.path === 'quote') { title = 'Price request sent'; text = esc(B.name) + ' will text your price to ' + ph + '.'; foot = 'Photos usually get you an exact number instead of a range.'; }
      else if (S.path === 'text') { title = 'Message sent'; text = esc(B.name) + ' will reply to ' + ph + ' by text.'; }
      else { title = 'Call back requested'; text = esc(B.name) + ' will call ' + ph + ' ' + esc((S.cb || 'soon').toLowerCase()) + '.'; foot = 'Save ' + esc(B.phone) + ' so you know it is them.'; }
      var rows = [];
      if (S.svc) rows.push([S.svcs.length > 1 ? 'Items' : 'Service', S.svc.label]);
      visible().forEach(function (id) { var dd = stepDef(id); if (dd.type === 'choice') { var o = optOf(id); if (o) rows.push([dd.sum || dd.title, o.short || o.label]); } });
      var extras = T.steps.addons ? T.steps.addons.options.filter(function (o) { return S.addons[o.id]; }).map(function (o) { return o.label; }) : [];
      if (extras.length) rows.push(['Extras', extras.join(', ')]);
      if (S.details.trim()) rows.push(['Details', S.details.trim().length > 70 ? S.details.trim().slice(0, 67) + '...' : S.details.trim()]);
      if (S.photos.length) rows.push(['Photos', S.photos.length + ' attached']);
      if (whenText()) rows.push(['When', whenText()]);
      var p = priceInfo(); if (p && (S.path === 'book' || S.path === 'quote')) rows.push(['Estimate', p.text]);
      var h = '<div class="donehd"><span class="okc"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="draw" pathLength="1" d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><div><h3>' + title + ', ' + who + '</h3><p class="lede">' + text + '</p></div></div>';
      if (rows.length) h += '<dl class="receipt"><div class="rh"><span>' + (instant ? 'Booking' : 'Request') + ' #' + esc(S.done.id) + '</span><span>' + (instant ? 'Confirmed' : 'Waiting for confirmation') + '</span></div>' + rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>';
      return h + '<p class="meta">' + foot + '</p>';
    }

    function bodyHtml() {
      if (S.done) return doneHtml();
      if (!S.path) return menuHtml();
      var sc = curScreen(), h = '';
      for (var i = 0; i < sc.length; i++) {
        h += '<section class="blk" id="blk-' + esc(sc[i]) + '">' + blockHtml(sc[i]) + '</section>';
        var t = stepDef(sc[i]).type;
        if ((t === 'service' || t === 'choice') && !valid(sc[i])) break; // reveal the next question only after this one is answered
      }
      var hasTruck = sc.some(function (id) { return stepDef(id).ui === 'truck'; });
      var p = priceInfo();
      if (p && sc.indexOf('service') > -1 && !hasTruck) h += '<div class="pricebox simple"><div><b>' + esc(p.text) + '</b><span>' + esc(p.note) + '</span></div></div>';
      return h;
    }

    function footHtml() {
      var call = '<a class="callus" href="tel:+1' + B.phoneDigits + '">' + ic('phone') + 'Call us</a>';
      // The Demo tag only shows on a standalone demo link; previews inside our own pages leave it out.
      var pow = '<div class="pow"><a href="https://matviykorsunskiy.me/dialbridge-widget/" target="_blank" rel="noopener">Powered by Dialbridge</a>' + (B.demo && window.top === window.self ? '<span class="demo" title="Demo: requests are not sent anywhere">Demo</span>' : '') + '</div>';
      if (S.done) return '<footer class="ft"><span></span><div class="ft-r"><button type="button" class="btn" data-act="' + (CLOSABLE ? 'close' : 'restart') + '">' + (CLOSABLE ? 'Close' : 'Start over') + '</button></div></footer>' + pow;
      if (!S.path) return '<footer class="ft">' + call + '</footer>' + pow;
      var sc = curScreen(), last = S.idx === screens().length - 1, t = stepDef(sc[0]).type;
      var label = 'Continue';
      if (last && t === 'contact') label = S.path === 'book' ? (S.svc && S.svc.mode === 'estimate' ? esc(T.estimateSubmit || 'Request walkthrough') : 'Send booking request') : 'Send price request';
      if (t === 'message') label = 'Send message';
      if (t === 'callback') label = 'Request a call back';
      var next = t === 'call' ? '' : '<button type="button" class="btn" id="next" data-act="next"' + (screenValid(sc) ? '' : ' disabled') + '>' + label + (label === 'Continue' ? ic('arrow-right', 'arr') : '') + '</button>';
      return '<footer class="ft">' + (t === 'call' ? '<span></span>' : call) + '<div class="ft-r"><button type="button" class="btn-g" data-act="back">Back</button>' + next + '</div></footer>' + pow;
    }

    // NAV = 'fwd' | 'back' | 'done' when the screen changes (slides the new screen in); null for taps inside a screen.
    // JUST = selector of the control that was just tapped, so only it plays the select animation.
    var NAV = null, JUST = null, RO = null, firstPaint = true;
    var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function render(scrollTo) {
      var old = document.getElementById('bd'), keep = old && !NAV ? old.scrollTop : 0;
      var oldSide = app.querySelector('.scopy'), sideWas = oldSide ? oldSide.textContent : '';
      // Cross-fade between screens: a copy of the old screen fades out on top while the new one fades in.
      // The real DOM swaps right away, so taps, keyboard and the product page's scripted demo never wait.
      var ghost = null;
      if (NAV && !firstPaint && old && !REDUCED) {
        ghost = document.createElement('div');
        ghost.className = 'ghost'; ghost.setAttribute('aria-hidden', 'true');
        ghost.style.top = old.offsetTop + 'px'; ghost.style.height = old.clientHeight + 'px';
        ghost.innerHTML = '<div class="bd"><div class="bdi">' + document.getElementById('bdi').innerHTML + '</div></div>';
        Array.prototype.forEach.call(ghost.querySelectorAll('[id],[data-act],[data-in]'), function (n) { n.removeAttribute('id'); n.removeAttribute('data-act'); n.removeAttribute('data-in'); });
        var gs = old.scrollTop;
        ghost.firstChild.firstChild.style.transform = 'translateY(' + -gs + 'px)';
      }
      app.innerHTML = sideHtml() + '<div class="main" id="main">' + headerHtml() + stepperHtml() + '<div class="bd" id="bd"><div class="bdi" id="bdi">' + bodyHtml() + '</div></div>' + footHtml() + '</div>';
      if (window.lucide) window.lucide.createIcons();
      var bd = document.getElementById('bd');
      if (ghost) {
        ghost.style.top = bd.offsetTop + 'px'; ghost.style.height = bd.clientHeight + 'px';
        document.getElementById('main').appendChild(ghost);
        ghost.addEventListener('animationend', function () { ghost.remove(); });
        setTimeout(function () { if (ghost.parentNode) ghost.remove(); }, 600);
      }
      var newSide = app.querySelector('.scopy');
      if (newSide && sideWas && newSide.textContent !== sideWas && !firstPaint) newSide.classList.add('swap');
      if (NAV && !firstPaint) bd.classList.add(NAV === 'back' ? 'in-back' : NAV === 'done' ? 'in-done' : 'in-fwd');
      var pf = document.getElementById('pfill'), to = progress();
      if (pf) { if (firstPaint || to === PROG) pf.style.width = to * 100 + '%'; else requestAnimationFrame(function () { requestAnimationFrame(function () { pf.style.width = to * 100 + '%'; }); }); }
      PROG = to;
      if (NAV && !firstPaint) Array.prototype.slice.call(app.querySelectorAll('#bdi .mrow, #bdi .tile, #bdi .radio, #bdi .chip, #bdi .day'), 0, 12).forEach(function (el, i) { el.classList.add('stag'); el.style.setProperty('--i', i); });
      if (JUST) { try { var j = app.querySelector(JUST); if (j) j.classList.add('just'); } catch (e) { } }
      if (bd) {
        bd.scrollTop = keep;
        if (scrollTo) { var el = document.getElementById('blk-' + scrollTo); if (el) glide(bd, Math.max(0, el.offsetTop - bd.offsetTop - 8)); }
      }
      NAV = null; JUST = null;
      watchHeight();
      var cs = curScreen(); if (cs) liveEvent('step', (S.path === 'book' || S.path === 'quote' ? '' : S.path + '-') + cs[0]);
      fitLogos();
      if (firstPaint) { firstPaint = false; post('dbw:ready', { light: !!B.logo }); }
    }
    // Eased scroll inside the card (same feel in every browser, unlike native smooth scrolling).
    function glide(el, top, ms) {
      var from = el.scrollTop, d = Math.min(top, el.scrollHeight - el.clientHeight) - from, t0 = null; ms = ms || 520;
      if (Math.abs(d) < 2) return;
      (function f(now) { if (t0 === null) t0 = now; var k = Math.min(1, (now - t0) / ms), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; el.scrollTop = from + d * e; if (k < 1) requestAnimationFrame(f); })(performance.now());
    }
    window.__dbwGlide = glide;
    // Tell w.js how tall this screen wants to be, so the popup fits the content instead of showing a half-empty card.
    function wantedHeight() {
      var h = 0, main = document.getElementById('main') || app;
      Array.prototype.forEach.call(main.children, function (c) {
        if (c.classList.contains('ghost')) return;
        if (c.id !== 'bd') { h += c.offsetHeight; return; }
        var cs = getComputedStyle(c), inner = document.getElementById('bdi');
        h += (inner ? inner.offsetHeight : 0) + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      });
      return Math.ceil(app.offsetWidth >= 760 ? Math.max(h, 600) : h);   // wide layout: the brand panel needs room
    }
    var lastH = 0;
    function sendHeight() { var h = wantedHeight(); if (Math.abs(h - lastH) > 1) { lastH = h; post('dbw:height', { h: h }); } }
    function watchHeight() {
      if (!EMBED) return;
      if (window.ResizeObserver) {
        if (RO) RO.disconnect();
        RO = new ResizeObserver(sendHeight);
        var bdi = document.getElementById('bdi'); if (bdi) RO.observe(bdi);
        Array.prototype.forEach.call((document.getElementById('main') || app).children, function (c) { if (c.id !== 'bd' && !c.classList.contains('ghost')) RO.observe(c); });
      }
      requestAnimationFrame(sendHeight);
    }
    function nextBlockAfter(id) { var sc = curScreen(); if (!sc) return null; var i = sc.indexOf(id); return i > -1 && i < sc.length - 1 ? sc[i + 1] : null; }

    function refreshNav() {
      var btn = document.getElementById('next');
      if (btn) btn.disabled = !screenValid(curScreen());
      var oa = document.getElementById('oa'); if (oa) oa.hidden = !(/^\d{5}$/.test(S.zip) && !inArea());
      var zok = document.getElementById('zok'); if (zok) zok.hidden = !zipOk();
    }

    function payload(reqId) {
      var answers = {};
      visible().forEach(function (id) { var d = stepDef(id); if (d.type === 'choice') { var o = optOf(id); if (o) answers[d.sum || id] = o.short || o.label; } });
      var p = priceInfo();
      return {
        requestId: reqId, business: B.slug || B.name, businessName: B.name, path: S.path,
        service: S.svc ? S.svc.label : null, services: S.svcs.map(function (id) { var x = svcById(id); return x ? x.label : id; }), mode: S.svc ? S.svc.mode : null, answers: answers,
        extras: T.steps.addons ? T.steps.addons.options.filter(function (o) { return S.addons[o.id]; }).map(function (o) { return o.label; }) : [],
        details: S.details.trim() || null, message: S.msg.trim() || null, callbackTime: S.cb,
        day: S.day, window: S.time, when: whenText() || null, priceShown: p ? p.text : null,
        name: S.name.trim(), phone: digits(), zip: S.zip || null, address: S.addr.trim() || null, photosCount: S.photos.length,
        smsConsentText: 'By sending, you agree that ' + B.name + ' may text you about this request. Message and data rates may apply. Reply STOP to opt out.',
        page: document.referrer || location.href, submittedAt: new Date().toISOString()
      };
    }
    // Live: what the API needs. Ids (not labels) so the server prices it from their saved template.
    function liveBody(reqId) {
      var answers = {};
      visible().forEach(function (id) { if (stepDef(id).type === 'choice' && S.ans[id]) answers[id] = S.ans[id]; });
      var addons = T.steps.addons && T.steps.addons.options ? T.steps.addons.options.filter(function (o) { return S.addons[o.id]; }).map(function (o) { return o.id; }) : [];
      var timed = S.path === 'book' && S.time && /T\d{2}:\d{2}/.test(S.time);
      var notes = [];
      if (S.msg.trim()) notes.push(S.msg.trim());
      if (S.cb) notes.push('Best time to call back: ' + S.cb);
      // An estimate visit has no booked slot, so the time they picked goes to the owner as a preference.
      if (timed && S.svc && S.svc.mode === 'estimate') notes.push('Preferred time: ' + whenText());
      var hp = document.getElementById('hpf');
      return {
        path: S.path, services: S.svcs.length ? S.svcs.slice() : (S.svc ? [S.svc.id] : []), answers: answers, addons: addons,
        name: S.name.trim(), phone: digits(), zip: S.zip || undefined, address: S.addr.trim() || undefined,
        details: S.details.trim() || undefined, message: notes.join('\n') || undefined,
        start: timed && !(S.svc && S.svc.mode === 'estimate') ? S.time : undefined,
        source: VIA === 'site' ? 'website' : 'booking page', page: PG.slice(0, 300), ref: REF.slice(0, 300), pg: PG.slice(0, 300),
        idempotencyKey: reqId, company_fax: hp ? hp.value : undefined, elapsed: Date.now() - LOAD_AT
      };
    }
    function sendLive(reqId, ok) {
      var btn = document.getElementById('next');
      if (btn) { btn.disabled = true; btn.classList.add('busy'); btn.innerHTML = '<span class="spin" aria-hidden="true"></span>Sending'; }
      var call = B.phone ? ' Or call ' + esc(B.name) + ' at <a href="tel:+1' + B.phoneDigits + '">' + esc(B.phone) + '</a>.' : '';
      var fail = function (msg) {
        if (btn) { btn.disabled = false; btn.classList.remove('busy'); btn.textContent = 'Try again'; }
        var bd = document.getElementById('bd'), old = document.getElementById('sendErr');
        if (old) old.remove();
        if (bd) bd.insertAdjacentHTML('beforeend', '<p class="warn" id="sendErr">' + msg + call + '</p>');
      };
      var ctl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 12000);
      fetch(B.api + '/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': reqId }, body: JSON.stringify(liveBody(reqId)), signal: ctl ? ctl.signal : undefined })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
        .then(function (x) {
          clearTimeout(timer);
          if (x.ok) { booked = true; liveEvent('submit'); return ok(x.j.booking && x.j.booking.ref); }
          if (x.status === 409) {
            // Someone took that time a moment ago: reload real times and send them back to pick again.
            S.time = null;
            var at = screens().map(function (sc) { return sc.some(function (id) { return stepDef(id).type === 'time'; }); }).indexOf(true);
            getJSON(B.api + '/slots?days=14').then(function (s) { B.apiSlots = s.slots || []; }).catch(function () { }).then(function () {
              if (at > -1) { S.idx = at; NAV = 'back'; render(); }
              var bd = document.getElementById('bd');
              if (bd) bd.insertAdjacentHTML('afterbegin', '<p class="warn" id="sendErr">That time was just booked by someone else. Pick another one.</p>');
            });
            return;
          }
          if (x.status === 410) return fail('Online booking for ' + esc(B.name) + ' is not open yet.');
          // too_many_bookings: this phone already has requests waiting here (the API caps open ones per phone).
          if (x.status === 429) return fail((x.j.errors || [])[0] === 'too_many_bookings' ? 'You already have requests waiting with ' + esc(B.name) + '. They will text you back soon.' : 'Too many tries. Wait a minute and try again.');
          var e = (x.j.errors || [])[0];
          fail(e === 'zip_out_of_area' ? 'That ZIP code is outside the area ' + esc(B.name) + ' serves.' : e === 'phone' ? 'Check the phone number and try again.' : 'That did not go through. Try again.');
        })
        .catch(function () { clearTimeout(timer); fail('That did not go through. Check your connection and try again.'); });
    }
    function finish() {
      var reqId =(B.name.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase() || 'DB') + '-' + (1000 + hash(S.phone + Date.now()) % 9000);
      var done = function () {
        S.done = { id: reqId }; NAV = 'done'; post('dbw:submit', { path: S.path, service: S.svc && S.svc.id });
        // Demo only: hand the booking to the Dialbridge dashboard demo on the same site, so it shows up in the owner inbox.
        if (B.demo) { try { var q = JSON.parse(localStorage.getItem('dbx_inbox_queue') || '[]'); q.push(payload(reqId)); localStorage.setItem('dbx_inbox_queue', JSON.stringify(q.slice(-20))); } catch (e) { } }
        render();
      };
      if (B.api) return sendLive(reqId, function (ref) { if (ref) reqId = ref; done(); });
      // Demos have no submitUrl, so nothing leaves the page. A real business config points this at its intake webhook.
      if (!B.submitUrl || !/^https:\/\//.test(B.submitUrl)) return done();
      var btn = document.getElementById('next');
      if (btn) { btn.disabled = true; btn.classList.add('busy'); btn.innerHTML = '<span class="spin" aria-hidden="true"></span>Sending'; }
      var ctl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 10000);
      fetch(B.submitUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload(reqId)), signal: ctl ? ctl.signal : undefined })
        .then(function (r) { clearTimeout(timer); if (!r.ok) throw new Error(r.status); done(); })
        .catch(function () {
          clearTimeout(timer);
          if (btn) { btn.disabled = false; btn.classList.remove('busy'); btn.textContent = 'Try again'; }
          var bd = document.getElementById('bd');
          if (bd && !document.getElementById('sendErr')) bd.insertAdjacentHTML('beforeend', '<p class="warn" id="sendErr">That did not go through. Try again, or call ' + esc(B.name) + ' at <a href="tel:+1' + B.phoneDigits + '">' + esc(B.phone) + '</a>.</p>');
        });
    }
    function advance() {
      if (S.idx >= screens().length - 1) return finish();
      S.idx++; NAV = 'fwd'; render();
    }
    function post(type, data) { try { if (EMBED && parent !== window) parent.postMessage(Object.assign({ type: type }, data || {}), '*'); } catch (e) { } }

    if (EDIT) {
      var dragK = null;
      app.addEventListener('click', function (e) {
        var s = e.target.closest('[data-edit]'); if (!s) return;
        e.preventDefault(); e.stopPropagation();
        var box = s.closest('.side');
        post('dbw:edit', { slot: s.getAttribute('data-edit'), key: s.getAttribute('data-k') || null, w: box ? box.clientWidth : null, h: box ? box.clientHeight : null });
      }, true);
      app.addEventListener('dragstart', function (e) { var t = e.target.closest('.slot-tile'); if (!t) return; dragK = t.getAttribute('data-k'); t.classList.add('dragging'); try { e.dataTransfer.setData('text/plain', dragK); e.dataTransfer.effectAllowed = 'move'; } catch (x) { } });
      app.addEventListener('dragend', function () { dragK = null; Array.prototype.forEach.call(app.querySelectorAll('.slot-tile'), function (t) { t.classList.remove('dragging', 'over'); }); });
      app.addEventListener('dragover', function (e) { var t = e.target.closest('.slot-tile'); if (!t || !dragK) return; e.preventDefault(); Array.prototype.forEach.call(app.querySelectorAll('.slot-tile'), function (x) { x.classList.toggle('over', x === t && x.getAttribute('data-k') !== dragK); }); });
      app.addEventListener('drop', function (e) {
        var t = e.target.closest('.slot-tile'); if (!t || !dragK) return; e.preventDefault();
        var keys = Array.prototype.map.call(app.querySelectorAll('.slot-tile'), function (x) { return x.getAttribute('data-k'); });
        var to = keys.indexOf(t.getAttribute('data-k')), from = keys.indexOf(dragK); if (to < 0 || from < 0 || to === from) return;
        keys.splice(to, 0, keys.splice(from, 1)[0]);
        T.tiles.order = keys; render();
        post('dbw:edit', { slot: 'order', order: keys });
      });
    }
    app.addEventListener('click', function (e) {
      var el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
      var act = el.getAttribute('data-act'), v = el.getAttribute('data-v');
      var sel = function (a) { return '[data-act="' + a + '"][data-v="' + (window.CSS && CSS.escape ? CSS.escape(v || '') : v) + '"]'; };
      if (act === 'start') { S.path = v === 'call' ? (OPEN ? 'call' : 'callback') : v; S.idx = 0; NAV = 'fwd'; liveEvent('open'); render(); }
      else if (act === 'svc') {
        var before = S.svc ? S.svc.mode : null;
        if (T.multiService) { var at = S.svcs.indexOf(v); if (at > -1) S.svcs.splice(at, 1); else S.svcs.push(v); }
        else S.svcs = [v];
        S.svc = combined();
        if (!T.multiService || !S.svc || S.svc.mode !== before) { S.ans = {}; S.addons = {}; }
        JUST = sel('svc');
        render(T.multiService ? 'service' : nextBlockAfter('service'));
      }
      else if (act === 'opt') { var sid = el.getAttribute('data-s'); var first = !S.ans[sid]; S.ans[sid] = v; JUST = sel('opt') + '[data-s="' + sid + '"]'; render(first ? nextBlockAfter(sid) || sid : sid); }
      else if (act === 'addon') { S.addons[v] = !S.addons[v]; JUST = sel('addon'); render('addons'); }
      else if (act === 'tmode') { S.tmode = v; render(); }
      else if (act === 'day') { S.day = v; S.time = null; JUST = sel('day'); render(); }
      else if (act === 'slot') { S.day = el.getAttribute('data-d'); S.time = v; JUST = sel('slot') + '[data-d="' + S.day + '"]'; render(); }
      else if (act === 'cb') { S.cb = v; JUST = sel('cb'); render(); }
      else if (act === 'callback') { S.path = 'callback'; S.idx = 0; NAV = 'fwd'; render(); }
      else if (act === 'next') { if (screenValid(curScreen())) advance(); }
      else if (act === 'back') { if (S.idx === 0) { S.path = null; S.svc = null; S.svcs = []; S.ans = {}; } else S.idx--; NAV = 'back'; render(); }
      else if (act === 'photos') { var f = document.getElementById('ph'); if (f) f.click(); }
      else if (act === 'restart') { fresh(); NAV = 'back'; render(); }
      else if (act === 'close') { if (sent.open && !booked) liveEvent('abandon'); post('dbw:close'); if (S.done) { fresh(); render(); } }
    });
    app.addEventListener('input', function (e) {
      var k = e.target.getAttribute('data-in'); if (!k) return;
      S[k] = k === 'zip' ? e.target.value.replace(/\D/g, '').slice(0, 5) : e.target.value;
      refreshNav();
    });
    app.addEventListener('change', function (e) {
      if (e.target.id !== 'ph') return;
      Array.prototype.slice.call(e.target.files || [], 0, 10 - S.photos.length).forEach(function (f) { S.photos.push(URL.createObjectURL(f)); });
      render();
    });
    app.addEventListener('focusin', function (e) { if (e.target.matches('input,textarea')) post('dbw:focus', { on: true }); });
    app.addEventListener('focusout', function (e) { if (e.target.matches('input,textarea')) post('dbw:focus', { on: false }); });
    app.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.matches('input[data-in]') && screenValid(curScreen())) { e.preventDefault(); advance(); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && CLOSABLE) { post('dbw:close'); if (S.done) { fresh(); render(); } } });

    var st0 = params.get('start');
    if (/^(book|quote|text)$/.test(st0 || '')) S.path = st0;
    else if (st0 === 'call') S.path = OPEN ? 'call' : 'callback';
    render();
    post('dbw:ready');
  }
})();
