/* DialBridge booking widget engine. One renderer, any business: config = trade template + business overrides.
   Loads from ?b=<slug> (flows/<slug>.json) or ?c=<base64url JSON> (demo generator). ?embed=1 when opened by w.js. */
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  var EMBED = params.get('embed') === '1';
  var CLOSABLE = EMBED && params.get('inline') !== '1';
  var app = document.getElementById('app');
  if (EMBED) document.body.classList.add('embed');

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var ic = function (name, cls) { return '<i data-lucide="' + esc(name) + '"' + (cls ? ' class="' + cls + '"' : '') + '></i>'; };

  function b64dec(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return JSON.parse(decodeURIComponent(escape(atob(s))));
  }

  function build(p) {
    var t = JSON.parse(JSON.stringify(window.DBW_TEMPLATES[p.trade] || window.DBW_TEMPLATES.junk));
    var b = Object.assign({}, t.defaults, {
      name: 'Your Business', phone: '(201) 555-0148', brand: '#0E6650', area: 'your area', zips: [], rating: null, reviews: null, tz: 'America/New_York', demo: true
    }, p);
    if (!/^#[0-9a-fA-F]{6}$/.test(b.brand)) b.brand = '#0E6650';
    b.zips = (b.zips || []).map(function (z) { return String(z).replace(/\D/g, ''); }).filter(Boolean);
    b.phoneDigits = String(b.phone).replace(/\D/g, '');
    if (p.prices) Object.keys(p.prices).forEach(function (k) {
      var parts = k.split('.'); var st = t.steps[parts[0]];
      var opt = st && st.options && st.options.filter(function (o) { return o.id === parts[1]; })[0];
      if (opt) opt.price = p.prices[k];
    });
    t.biz = b;
    return t;
  }

  function loadConfig() {
    if (params.get('c')) {
      try { return Promise.resolve(build(b64dec(params.get('c')))); } catch (e) { return Promise.reject(e); }
    }
    var slug = (params.get('b') || 'harbor-haul').replace(/[^a-z0-9-]/g, '');
    return fetch('flows/' + slug + '.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('not found');
      return r.json();
    }).then(build);
  }

  /* ---------- time helpers ---------- */
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
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
    root.setProperty('--brand', B.brand);
    var rgb = [1, 3, 5].map(function (i) { return parseInt(B.brand.substr(i, 2), 16) / 255; }).map(function (c) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
    var lum = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    root.setProperty('--on-brand', lum > 0.45 ? '#1A1D21' : '#FFFFFF');

    var S;
    function fresh() { S = { path: null, idx: 0, svc: null, ans: {}, addons: {}, details: '', photos: [], day: null, time: null, name: '', phone: '', zip: '', msg: '', cb: null, done: null }; }
    fresh();

    function flowFor(path) {
      if (path === 'book' || path === 'quote') return T.flows[path];
      return { text: ['message'], call: ['call'], callback: ['callback'] }[path] || [];
    }
    var BUILTIN = { message: 'Text ' + B.name, call: 'The office is open', callback: OPEN ? 'We will call you back' : 'The office is closed right now' };
    function stepDef(id) { return T.steps[id] || { type: id, title: BUILTIN[id] || '' }; }
    function visible() {
      return flowFor(S.path).filter(function (id) {
        var d = stepDef(id);
        if (!d.showIf || !S.svc) return true;
        return d.showIf.indexOf(S.svc.mode) > -1;
      });
    }
    function cur() { if (!S.path || S.done) return null; return visible()[S.idx]; }
    function svcById(id) { return T.services.filter(function (s) { return s.id === id; })[0]; }
    function optOf(stepId) { var d = T.steps[stepId]; return d && d.options && d.options.filter(function (o) { return o.id === S.ans[stepId]; })[0]; }

    function priceInfo() {
      if (!B.showPrices || !S.svc) return null;
      if (S.svc.mode === 'estimate') return { text: 'Free estimate', note: 'Priced after a quick walkthrough' };
      var lo = 0, hi = 0, has = false, m = S.svc.mult || 1, alo = 0, ahi = 0;
      visible().forEach(function (id) {
        var d = stepDef(id);
        if (d.type === 'choice') { var o = optOf(id); if (o && o.price) { lo += o.price[0]; hi += o.price[1]; has = true; } if (o && o.mult) m *= o.mult; }
        if (d.type === 'addons') d.options.forEach(function (o) { if (S.addons[o.id] && o.add) { alo += o.add[0]; ahi += o.add[1]; } });
      });
      if (!has) {
        if (S.svc.fixed) return { text: '$' + S.svc.fixed, note: 'Flat price for the visit' };
        if (S.svc.fee) return { text: '$' + S.svc.fee + ' visit', note: 'Diagnostic visit fee. Repair priced on site.' };
        return null;
      }
      if (m !== 1) { lo = Math.round(lo * m / 5) * 5; hi = Math.round(hi * m / 5) * 5; }
      lo += alo; hi += ahi;
      return { text: lo === hi ? '$' + lo : '$' + lo + ' to $' + hi, note: 'Includes everything shown. Final price confirmed by text.' };
    }

    function bookRange() {
      var lo = null, hi = null;
      T.flows.book.forEach(function (id) { var d = T.steps[id]; if (!d || d.type !== 'choice' || lo !== null) return; d.options.forEach(function (o) { if (!o.price) return; lo = lo === null ? o.price[0] : Math.min(lo, o.price[0]); hi = hi === null ? o.price[1] : Math.max(hi, o.price[1]); }); });
      return lo === null ? null : [lo, hi];
    }
    function dayList() {
      var n = bizNow(B), out = [];
      var base = new Date();
      var startOffset = n.m > mins(B.close) - 120 ? 1 : 0;
      for (var i = startOffset; out.length < 7; i++) {
        var d = new Date(base); d.setDate(base.getDate() + i);
        out.push({ key: d.toDateString(), dow: DOW[d.getDay()], num: d.getDate(), month: MON[d.getMonth()] + ' ' + d.getFullYear(), off: B.days.indexOf(d.getDay()) < 0, today: i === 0 });
      }
      return out;
    }
    function timeList() {
      var o = mins(B.open), c = mins(B.close);
      if (B.timeMode === 'slots') {
        var list = [], t = Math.max(o, 8 * 60);
        for (; t <= c - 120; t += 120) list.push(t);
        return list.map(function (t) {
          var h = hash((S.day || '') + t) % 7;
          return { label: fmt(t), sub: h === 0 ? 'Booked' : h === 1 ? '1 spot left' : 'Open', off: h === 0 };
        });
      }
      return [
        { label: 'Morning', sub: fmt(o) + ' to 11 AM' },
        { label: 'Midday', sub: '11 AM to 2 PM' },
        { label: 'Afternoon', sub: '2 to ' + fmt(Math.min(c, 17 * 60)) }
      ];
    }
    function whenText() {
      var d = dayList().filter(function (x) { return x.key === S.day; })[0];
      if (!d || !S.time) return '';
      return (d.today ? 'Today' : d.dow + ' ' + d.num) + ', ' + S.time.toLowerCase();
    }
    function digits() { return S.phone.replace(/\D/g, ''); }
    function prettyPhone() { var d = digits().replace(/^1(?=\d{10}$)/, ''); return d.length === 10 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : S.phone; }
    function inArea() { return !B.zips.length || B.zips.some(function (z) { return S.zip.indexOf(z) === 0; }); }
    function hasZipStep() { return flowFor(S.path).indexOf('zip') > -1; }
    function contactOk() { return S.name.trim().length > 1 && digits().length >= 10; }
    function valid(id) {
      if (!id) return false;
      var d = stepDef(id);
      if (d.type === 'service') return !!S.svc;
      if (d.type === 'choice') return !!S.ans[id];
      if (d.type === 'time') return !!(S.day && S.time);
      if (d.type === 'zip') return /^\d{5}$/.test(S.zip) && inArea();
      if (d.type === 'contact') return contactOk() && (hasZipStep() || (/^\d{5}$/.test(S.zip) && inArea()));
      if (d.type === 'message') return contactOk() && S.msg.trim().length >= 3;
      if (d.type === 'callback') return contactOk() && !!S.cb;
      return true;
    }

    /* ---------- render ---------- */
    function asideHtml(id) {
      var crumbs = [];
      if (S.svc && id !== 'service') crumbs.push({ i: S.svc.icon, v: S.svc.label });
      visible().forEach(function (sid) {
        var d = stepDef(sid);
        if (sid === id) return;
        if (d.type === 'choice') { var o = optOf(sid); if (o) crumbs.push({ i: 'circle-check', v: o.short || o.label }); }
        if (d.type === 'addons') { var n = Object.keys(S.addons).filter(function (k) { return S.addons[k]; }).length; if (n) crumbs.push({ i: 'plus', v: n + ' extra' + (n > 1 ? 's' : '') }); }
      });
      if (whenText() && id !== 'time') crumbs.push({ i: 'calendar-days', v: whenText() });
      var title = S.done ? 'You are all set' : 'Book ' + esc(B.name) + ' online';
      var text = OPEN ? 'Tell us what you need and when. We confirm by text, usually within ' + B.replyMins + ' minutes.'
        : 'We are closed right now, but you can still book. We confirm by text when we open at ' + fmt(mins(B.open)) + '.';
      if (S.done) text = 'Your request is in. Keep your phone close for a text from ' + esc(B.name) + '.';
      var h = '<aside><div class="a-top"><h2>' + title + '</h2><p>' + text + '</p>';
      if (crumbs.length) h += '<div class="crumbs">' + crumbs.map(function (c) { return '<span class="crumb">' + ic(c.i) + esc(c.v) + '</span>'; }).join('') + '</div>';
      h += '</div>';
      if (!crumbs.length) h += '<div class="art"><div class="ring"></div><div class="disc">' + ic(T.illustration) + '</div></div>';
      h += '<div class="a-foot"><div class="area">' + ic('map-pin') + 'Serving ' + esc(B.area) + '</div>';
      if (B.rating) h += '<div class="badge"><span class="stars">' + Array(5).join('.').split('.').map(function () { return '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.5 1.3 6.6L12 17.2l-5.9 3.3 1.3-6.6-4.9-4.5 6.6-.8z"/></svg>'; }).join('') + '</span><span>' + esc(B.rating) + ' from ' + esc(B.reviews) + ' Google reviews</span></div>';
      return h + '</div></aside>';
    }

    function truck(frac) {
      var w = Math.round(192 * (frac || 0));
      return '<svg width="300" height="122" viewBox="0 0 300 122" role="img" aria-label="Truck load"><rect x="6" y="10" width="196" height="84" rx="4" fill="#fff" stroke="#1A1D21" stroke-width="2"/><rect x="8" y="12" width="' + w + '" height="80" fill="' + B.brand + '" style="transition:width .3s"/><path d="M55 12v80M104 12v80M153 12v80" stroke="#1A1D21" stroke-width="1" stroke-dasharray="3 4" opacity=".3"/><path d="M202 36h44l30 30v28h-74z" fill="#fff" stroke="#1A1D21" stroke-width="2" stroke-linejoin="round"/><path d="M214 44h28l20 20h-48z" fill="#E4E8EC" stroke="#1A1D21" stroke-width="1.5" stroke-linejoin="round"/><path d="M2 94h282" stroke="#1A1D21" stroke-width="2"/><circle cx="52" cy="102" r="13" fill="#fff" stroke="#1A1D21" stroke-width="2"/><circle cx="52" cy="102" r="4" fill="#1A1D21"/><circle cx="238" cy="102" r="13" fill="#fff" stroke="#1A1D21" stroke-width="2"/><circle cx="238" cy="102" r="4" fill="#1A1D21"/></svg>';
    }
    function priceCard() {
      var p = priceInfo();
      if (!p) return '';
      return '<div class="price"><b>' + p.text + '</b><span>' + p.note + '</span></div>';
    }
    function photosHtml(label) {
      return '<input type="file" id="ph" accept="image/*" multiple hidden><button class="photo-btn" data-act="photos">' + ic('image-plus') + esc(label) + '</button>' +
        (S.photos.length ? '<div class="photos">' + S.photos.map(function (u) { return '<img class="thumb" alt="" src="' + u + '">'; }).join('') + '</div>' : '');
    }
    function contactFields(n) {
      return '<div class="f2"><div class="fld"><label for="nm' + n + '">Name</label><input id="nm' + n + '" data-in="name" autocomplete="name" placeholder="Jordan Lee" value="' + esc(S.name) + '"></div>' +
        '<div class="fld"><label for="ph' + n + '">Mobile</label><input id="ph' + n + '" data-in="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="(201) 555-0123" value="' + esc(S.phone) + '"></div></div>';
    }

    function bodyHtml(id) {
      if (S.done) return doneHtml();
      if (!S.path) {
        var order = OPEN ? ['call', 'book', 'quote', 'text'] : ['book', 'quote', 'text', 'call'];
        return '<h3>How can we help?</h3><div class="grid2">' + order.map(function (k) {
          var t = T.tiles[k], title = t.title, desc = t.desc;
          if (k === 'book' && t.priced && B.showPrices) { var rg = bookRange(); if (rg) desc = t.priced.replace('{min}', '$' + rg[0]).replace('{max}', '$' + rg[1]); }
          if (k === 'call') { title = OPEN ? 'Call the office' : 'Get a call back'; desc = OPEN ? 'Open until ' + fmt(mins(B.close)) + ' today.' : 'Closed now. Calls from ' + fmt(mins(B.open)) + '.'; }
          return '<button class="tile" data-act="start" data-v="' + k + '"><div class="pic">' + ic(k === 'call' && !OPEN ? 'phone-incoming' : t.icon) + '</div><div class="lab"><span class="t">' + title + '</span><span class="d">' + desc + '</span></div></button>';
        }).join('') + '</div>';
      }
      var d = stepDef(id);
      var title = d.title || '';
      if (d.type === 'time' && S.svc && S.svc.mode === 'estimate') title = d.estimateTitle || title;
      var h = '<h3>' + esc(title) + '</h3>';

      if (d.type === 'zip') {
        var zipOk = /^\d{5}$/.test(S.zip);
        h += '<p class="sub">So we can check that ' + esc(B.name) + ' comes to you.</p><div class="card zipcard"><div class="fld"><label for="zp0">ZIP code</label><input id="zp0" class="zipbig" data-in="zip" inputmode="numeric" autocomplete="postal-code" maxlength="5" placeholder="07430" value="' + esc(S.zip) + '"></div>' +
          '<p class="okmsg" id="zok"' + (zipOk && inArea() ? '' : ' hidden') + '>' + ic('circle-check') + 'Good news, we cover that area.</p>' +
          '<p class="warn" id="oa"' + (zipOk && !inArea() ? '' : ' hidden') + '>' + esc(B.name) + ' does not cover that ZIP yet. They serve ' + esc(B.area) + '. <a href="tel:+1' + B.phoneDigits + '">Call to ask</a></p></div>';
      }
      if (d.type === 'service') {
        var many = T.services.length > 4;
        h += '<div class="' + (many ? 'grid3' : 'grid2') + '">' + T.services.map(function (s) {
          var chip = s.mode === 'estimate' ? 'Free estimate' : s.fixed ? '$' + s.fixed : s.fee ? '$' + s.fee + ' visit' : '';
          return '<button class="tile' + (S.svc && S.svc.id === s.id ? ' on' : '') + '" data-act="svc" data-v="' + s.id + '"><div class="pic">' + (s.image ? '<img alt="" src="' + esc(s.image) + '">' : ic(s.icon)) + '</div><div class="lab"><span class="t">' + esc(s.label) + '</span><span class="d">' + esc(s.hint) + '</span>' + (chip && B.showPrices ? '<span class="chip">' + chip + '</span>' : '') + '</div></button>';
        }).join('') + '</div>';
      }
      if (d.type === 'choice') {
        var o = optOf(id);
        if (d.ui === 'truck') {
          h += '<div class="card gauge">' + truck(o && o.frac) + (o ? priceCard() || '<div class="price"><b>' + esc(o.label) + '</b><span>Final price confirmed by text</span></div>' : '<div class="price"><b>Pick a size below</b><span>' + esc(d.note || '') + '</span></div>') + '</div>';
          h += '<div class="seg" role="group" aria-label="Load size">' + d.options.map(function (x) { return '<button class="' + (S.ans[id] === x.id ? 'on' : '') + '" data-act="opt" data-s="' + id + '" data-v="' + x.id + '">' + esc(x.short || x.label) + '</button>'; }).join('') + '</div>';
          if (d.photos) h += photosHtml(S.path === 'quote' ? 'Add photos for an exact price' : 'Add photos (optional)');
        } else if (d.ui === 'grid') {
          h += '<div class="seg' + (d.options.length === 5 ? ' n5' : '') + '" role="group">' + d.options.map(function (x) { return '<button class="' + (S.ans[id] === x.id ? 'on' : '') + '" data-act="opt" data-s="' + id + '" data-v="' + x.id + '">' + esc(x.label) + '</button>'; }).join('') + '</div>';
          var pc = priceCard(); if (pc && o) h += '<div class="card">' + pc + '</div>';
        } else {
          h += '<div class="rows">' + d.options.map(function (x) { return '<button class="row' + (S.ans[id] === x.id ? ' on' : '') + '" data-act="opt" data-s="' + id + '" data-v="' + x.id + '"><span>' + esc(x.label) + '</span><span class="r">' + (x.badge ? '<span class="pill">' + esc(x.badge) + '</span>' : '') + '</span></button>'; }).join('') + '</div>';
          if (o && o.urgent) h += '<div class="alert"><span>For no heat or no cooling right now, calling is fastest.</span><a href="tel:+1' + B.phoneDigits + '">Call now</a></div>';
          var pc2 = priceCard(); if (pc2 && o && (o.mult || o.price)) h += '<div class="card">' + pc2 + '</div>';
        }
      }
      if (d.type === 'addons') {
        h += '<div class="rows">' + d.options.map(function (x) { var on = !!S.addons[x.id]; return '<button class="row' + (on ? ' on' : '') + '" data-act="addon" data-v="' + x.id + '" aria-pressed="' + on + '"><span class="rl">' + ic(x.icon) + esc(x.label) + '</span><span class="r">' + (B.showPrices && x.add ? '+$' + x.add[0] : '') + '<span class="check">' + (on ? ic('check') : '') + '</span></span></button>'; }).join('') + '</div>';
        var pc3 = priceCard(); if (pc3) h += '<div class="card">' + pc3 + '</div>';
      }
      if (d.type === 'details') {
        h += '<div class="card"><div class="fld"><label for="dt">Details</label><textarea id="dt" data-in="details" placeholder="' + esc(d.placeholder || '') + '">' + esc(S.details) + '</textarea></div>' + (d.photos ? photosHtml('Add photos (optional)') : '') + '</div>';
      }
      if (d.type === 'time') {
        var days = dayList();
        h += '<div class="mhead"><span class="month">' + days[0].month + '</span><span>' + (B.timeMode === 'slots' ? 'Open times on the schedule' : 'Exact time confirmed by text') + '</span></div>';
        h += '<div class="days">' + days.map(function (x) { return '<button class="day' + (S.day === x.key ? ' on' : '') + '" data-act="day" data-v="' + esc(x.key) + '"' + (x.off ? ' disabled' : '') + '><span>' + (x.today ? 'Today' : x.dow) + '</span><b>' + x.num + '</b></button>'; }).join('') + '</div>';
        if (S.day) h += '<div class="rows">' + timeList().map(function (t) { return '<button class="row' + (S.time === t.label ? ' on' : '') + '" data-act="time" data-v="' + esc(t.label) + '"' + (t.off ? ' disabled' : '') + '><span>' + t.label + '</span><span class="r">' + t.sub + (t.off ? '' : '<span class="dot"></span>') + '</span></button>'; }).join('') + '</div>';
        else h += '<p class="sub" style="margin:0">Pick a day to see open times.</p>';
      }
      if (d.type === 'contact') {
        h += '<div class="card">' + contactFields(1) +
          (hasZipStep() ? '' : '<div class="fld"><label for="zp">' + (T.noun === 'pickup' ? 'Pickup ZIP code' : 'ZIP code') + '</label><input id="zp" class="zip" data-in="zip" inputmode="numeric" autocomplete="postal-code" maxlength="5" placeholder="07430" value="' + esc(S.zip) + '"></div>') +
          (hasZipStep() ? '' : '<p class="warn" id="oa"' + (/^\d{5}$/.test(S.zip) && !inArea() ? '' : ' hidden') + '>' + esc(B.name) + ' does not serve this ZIP yet. They cover ' + esc(B.area) + '.</p>') +
          '<p class="fine">By sending, you agree that ' + esc(B.name) + ' may text you about this request. Message and data rates may apply. Reply STOP to opt out.</p></div>';
      }
      if (d.type === 'message') {
        h += '<div class="card"><div class="fld"><label for="ms">Your question</label><textarea id="ms" data-in="msg" placeholder="Do you take old hot tubs?">' + esc(S.msg) + '</textarea></div>' + contactFields(2) +
          '<p class="fine">Goes straight to the owner\'s phone. Reply STOP to opt out.</p></div>';
      }
      if (d.type === 'call') {
        h += '<div class="card callbox"><span class="sub" style="margin:0">Someone usually picks up within a few rings.</span><span class="num">' + esc(B.phone) + '</span><a class="cta" href="tel:+1' + B.phoneDigits + '">Call now</a></div>' +
          '<button class="row" data-act="callback"><span>I would rather get a call back</span><span class="r">' + ic('chevron-right') + '</span></button>';
      }
      if (d.type === 'callback') {
        h += '<div class="card">' + contactFields(3) + '<span class="fld"><label>Best time to call</label></span><div class="rows">' +
          ['As soon as you open', 'Late morning', 'Afternoon'].map(function (x) { return '<button class="row' + (S.cb === x ? ' on' : '') + '" data-act="cb" data-v="' + x + '"><span>' + x + '</span></button>'; }).join('') + '</div></div>';
      }
      return h;
    }

    function doneHtml() {
      var D = S.done, who = esc(S.name.trim().split(' ')[0] || 'there'), ph = esc(prettyPhone());
      var title, text, foot = (OPEN ? 'They usually reply within ' + B.replyMins + ' minutes.' : 'The office opens at ' + fmt(mins(B.open)) + '. Expect a text shortly after.') + (S.path === 'book' ? ' Need to change something? Just reply to the text.' : '');
      if (S.path === 'book') { title = S.svc.mode === 'estimate' ? 'Walkthrough requested, ' + who : 'Request sent, ' + who; text = esc(B.name) + ' will text ' + ph + ' to confirm ' + (B.timeMode === 'slots' ? 'your booking.' : 'the exact time.'); }
      else if (S.path === 'quote') { title = 'Price request sent, ' + who; text = esc(B.name) + ' will text your price to ' + ph + '.'; foot = 'Photos usually get you an exact number instead of a range.'; }
      else if (S.path === 'text') { title = 'Text sent'; text = esc(B.name) + ' will reply to ' + ph + '.'; }
      else { title = 'Call back requested'; text = esc(B.name) + ' will call ' + ph + ' ' + esc((S.cb || 'soon').toLowerCase()) + '.'; foot = 'Save ' + esc(B.phone) + ' so you know it is them.'; }
      var rows = [];
      if (S.svc) rows.push(['Service', S.svc.label]);
      visible().forEach(function (id) { var dd = stepDef(id); if (dd.type === 'choice') { var o = optOf(id); if (o) rows.push([dd.sum || dd.title, o.short || o.label]); } });
      var extras = T.steps.addons ? T.steps.addons.options.filter(function (o) { return S.addons[o.id]; }).map(function (o) { return o.label; }) : [];
      if (extras.length) rows.push(['Extras', extras.join(', ')]);
      if (S.details.trim()) rows.push(['Details', S.details.trim().length > 70 ? S.details.trim().slice(0, 67) + '...' : S.details.trim()]);
      if (S.photos.length) rows.push(['Photos', S.photos.length + ' attached']);
      if (whenText()) rows.push(['When', whenText()]);
      var p = priceInfo(); if (p && S.path !== 'text' && S.path !== 'callback') rows.push(['Estimate', p.text]);
      var h = '<div class="done"><div class="ok">' + ic('check') + '</div><h3>' + title + '</h3><p>' + text + '</p></div>';
      if (rows.length) h += '<div class="receipt"><div class="h"><b>Request #' + D.id + '</b><span>Waiting for confirmation</span></div>' + rows.map(function (r) { return '<div class="kv"><span>' + esc(r[0].charAt(0).toUpperCase() + r[0].slice(1)) + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('') + '</div>';
      return h + '<p class="foot-note">' + foot + '</p>';
    }

    function footHtml(id) {
      var pow = '<span class="pow"><a href="https://matviykorsunskiy.me/dialbridge-widget/" target="_blank" rel="noopener">Powered by DialBridge</a>' + (B.demo ? '<span class="demo" title="Demo: requests are not sent anywhere">Demo</span>' : '') + '</span>';
      if (S.done) return '<div class="m-foot">' + pow + '<button class="cta" data-act="' + (CLOSABLE ? 'close' : 'restart') + '">' + (CLOSABLE ? 'Close' : 'Start over') + '</button></div>';
      var d = id ? stepDef(id) : null;
      if (!d || d.type === 'service' || d.type === 'call') return '<div class="m-foot">' + pow + '</div>';
      var label = 'Continue';
      if (d.type === 'contact') label = S.path === 'book' ? (S.svc && S.svc.mode === 'estimate' ? 'Request walkthrough' : 'Send booking request') : 'Send price request';
      if (d.type === 'message') label = 'Send text';
      if (d.type === 'callback') label = 'Request a call back';
      if (d.type === 'time') label = 'Choose this time';
      if (d.type === 'addons' && !Object.keys(S.addons).some(function (k) { return S.addons[k]; })) label = 'Skip';
      return '<div class="m-foot">' + pow + '<button class="cta" id="next" data-act="next"' + (valid(id) ? '' : ' disabled') + '>' + label + '</button></div>';
    }

    function render() {
      var id = cur();
      var steps = visible();
      var pct = S.done ? 100 : S.path ? Math.max(6, Math.round((S.idx + 1) / (steps.length + 1) * 100)) : 4;
      var html = asideHtml(id) + '<main><div class="m-head"><div class="slot40">' +
        (S.path && !S.done ? '<button class="circ" data-act="back" aria-label="Back">' + ic('arrow-left') + '</button>' : '') +
        '</div><div class="track"><div><i style="width:' + pct + '%"></i></div></div>' +
        (CLOSABLE ? '<button class="xbtn" data-act="close" aria-label="Close">' + ic('x') + '</button>' : '<div class="slot40"></div>') +
        '</div><div class="m-body anim">' + bodyHtml(id) + '</div>' + footHtml(id) + '</main>';
      app.innerHTML = html;
      if (window.lucide) window.lucide.createIcons();
    }

    function refreshNav() {
      var btn = document.getElementById('next'); var id = cur();
      if (btn) btn.disabled = !valid(id);
      var oa = document.getElementById('oa');
      if (oa) oa.hidden = !(/^\d{5}$/.test(S.zip) && !inArea());
      var zok = document.getElementById('zok');
      if (zok) zok.hidden = !(/^\d{5}$/.test(S.zip) && inArea());
    }

    function advance() {
      var steps = visible();
      if (S.idx >= steps.length - 1) {
        S.done = { id: (B.name.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase() || 'DB') + '-' + (1000 + hash(S.phone + Date.now()) % 9000) };
        post('dbw:submit', { path: S.path, service: S.svc && S.svc.id });
      } else S.idx++;
      render();
    }
    function post(type, data) { try { if (EMBED && parent !== window) parent.postMessage(Object.assign({ type: type }, data || {}), '*'); } catch (e) { } }

    app.addEventListener('click', function (e) {
      var el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
      var act = el.getAttribute('data-act'), v = el.getAttribute('data-v');
      if (act === 'start') { S.path = v === 'call' ? (OPEN ? 'call' : 'callback') : v; S.idx = 0; render(); }
      else if (act === 'svc') { S.svc = svcById(v); S.ans = {}; S.addons = {}; advance(); }
      else if (act === 'opt') { S.ans[el.getAttribute('data-s')] = v; render(); }
      else if (act === 'addon') { S.addons[v] = !S.addons[v]; render(); }
      else if (act === 'day') { S.day = v; S.time = null; render(); }
      else if (act === 'time') { S.time = v; render(); }
      else if (act === 'cb') { S.cb = v; render(); }
      else if (act === 'callback') { S.path = 'callback'; S.idx = 0; render(); }
      else if (act === 'next') { if (valid(cur())) advance(); }
      else if (act === 'back') { if (S.idx === 0) { S.path = null; S.svc = null; } else { S.idx--; if (stepDef(cur()).type === 'service') S.svc = null; } render(); }
      else if (act === 'photos') { var f = document.getElementById('ph'); if (f) f.click(); }
      else if (act === 'restart') { fresh(); render(); }
      else if (act === 'close') { post('dbw:close'); fresh(); render(); }
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
    app.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.matches('input[data-in]') && valid(cur())) { e.preventDefault(); advance(); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && CLOSABLE) { post('dbw:close'); fresh(); render(); } });

    var st0 = params.get('start');
    if (/^(book|quote|text)$/.test(st0 || '')) S.path = st0;
    else if (st0 === 'call') S.path = OPEN ? 'call' : 'callback';
    render();
    post('dbw:ready');
  }
})();
