/* DialBridge booking widget engine. One renderer, any business: config = trade template + business overrides.
   Loads from ?b=<slug> (flows/<slug>.json) or ?c=<base64url JSON> (demo generator). ?embed=1 when opened by w.js.
   Steps are grouped into screens: the service screen also holds the questions that follow it, revealed one at a time. */
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
    if (b.logo && !/^https:\/\//.test(b.logo)) b.logo = null;
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
    t.biz = b;
    return t;
  }

  function loadConfig() {
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
    root.setProperty('--brand', B.brand);
    var rgb = [1, 3, 5].map(function (i) { return parseInt(B.brand.substr(i, 2), 16) / 255; }).map(function (c) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
    var lum = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    root.setProperty('--on-brand', lum > 0.45 ? '#1A1D21' : '#FFFFFF');
    var hostLine = document.getElementById('hostline');
    if (hostLine && !EMBED) hostLine.innerHTML = '<b>' + esc(B.name) + '</b><span>Serving ' + esc(B.area) + ' · <a href="tel:+1' + B.phoneDigits + '">' + esc(B.phone) + '</a></span>';

    var S;
    function fresh() { S = { path: null, idx: 0, svc: null, svcs: [], ans: {}, addons: {}, details: '', photos: [], day: null, time: null, tmode: 'first', name: '', phone: '', zip: '', addr: '', msg: '', cb: null, done: null }; }
    fresh();

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
    var LABELS = { zip: ['Location', 'map-pin'], service: ['Service', 'clipboard-list'], details: ['Details', 'camera'], time: ['Schedule', 'clock'], contact: ['Contact', 'user-round'], message: ['Message', 'message-square-text'], call: ['Call', 'phone'], callback: ['Call back', 'phone-incoming'] };

    function svcById(id) { return T.services.filter(function (s) { return s.id === id; })[0]; }
    // Several picks (junk removal) act as one combined service: any walkthrough-only pick makes the whole job a walkthrough.
    function combined() {
      var list = S.svcs.map(svcById).filter(Boolean);
      if (!list.length) return null;
      if (list.length === 1) return list[0];
      return {
        id: S.svcs.join('+'), label: list.map(function (x) { return x.label; }).join(', '),
        mode: list.some(function (x) { return x.mode === 'estimate'; }) ? 'estimate' : list[0].mode,
        heavy: list.some(function (x) { return x.heavy; }), icon: list[0].icon
      };
    }
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
      return { text: lo === hi ? '$' + lo : '$' + lo + ' to $' + hi, note: (S.svc.heavy ? 'Dirt, concrete and rock are priced by weight, so the final price may be higher. ' : '') + (T.priceNote || 'Based on your answers. Final price confirmed before we start.') };
    }
    function bookRange() {
      var lo = null, hi = null;
      T.flows.book.forEach(function (id) { var d = T.steps[id]; if (!d || d.type !== 'choice' || lo !== null) return; d.options.forEach(function (o) { if (!o.price) return; lo = lo === null ? o.price[0] : Math.min(lo, o.price[0]); hi = hi === null ? o.price[1] : Math.max(hi, o.price[1]); }); });
      return lo === null ? null : [lo, hi];
    }

    function dayList() {
      var n = bizNow(B), out = [], base = new Date();
      var startOffset = n.m > mins(B.close) - 120 ? 1 : 0;
      for (var i = startOffset; out.length < 7; i++) {
        var d = new Date(base); d.setDate(base.getDate() + i);
        out.push({ key: d.toDateString(), dow: DOW[d.getDay()], num: d.getDate(), mon: MON3[d.getMonth()], off: B.days.indexOf(d.getDay()) < 0, today: i === 0 });
      }
      return out;
    }
    function windows(day) {
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
    function contactOk() { return S.name.trim().length > 1 && digits().length >= 10; }
    function valid(id) {
      var d = stepDef(id);
      if (d.type === 'service') return !!S.svc;
      if (d.type === 'choice') return !!S.ans[id];
      if (d.type === 'time') return !!(S.day && S.time);
      if (d.type === 'zip') return zipOk();
      if (d.type === 'contact') return contactOk() && (!d.askAddress || S.addr.trim().length > 4) && (hasZipStep() || zipOk());
      if (d.type === 'message') return contactOk() && S.msg.trim().length >= 3;
      if (d.type === 'callback') return contactOk() && !!S.cb;
      if (d.type === 'call') return false;
      return true;
    }
    function screenValid(sc) { return !!sc && sc.every(valid); }

    /* ---------- render ---------- */
    function stars() { return '<span class="stars" aria-hidden="true">' + new Array(6).join('★') + '</span>'; }
    function headerHtml() {
      var brand = B.logo ? '<img class="logo" src="' + esc(B.logo) + '" alt="' + esc(B.name) + '">' : '<span class="wordmark">' + esc(B.name) + '</span>';
      var sub = 'Book online' + (B.rating ? ' <span class="dot">·</span> ' + stars() + ' ' + esc(B.rating) + ' (' + esc(B.reviews) + ' reviews)' : '');
      return '<header class="hd' + (B.logo ? ' light' : '') + '"><div class="hd-l">' + brand + '<span class="hd-sub">' + sub + '</span></div>' +
        (CLOSABLE ? '<button class="x" data-act="close" aria-label="Close">' + ic('x') + '</button>' : '') + '</header>';
    }
    function stepperHtml() {
      if (!S.path || S.done || S.path === 'call') return '';
      var scs = screens();
      if (scs.length < 2) return '';
      return '<ol class="steps">' + scs.map(function (sc, i) {
        var t = stepDef(sc[0]).type, L = LABELS[t] || [t, 'circle'];
        var st = i < S.idx ? 'done' : i === S.idx ? 'now' : '';
        return '<li class="' + st + '"><span class="bub">' + ic(i < S.idx ? 'check' : L[1]) + '</span><span class="lab">' + L[0] + '</span></li>';
      }).join('') + '</ol>';
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
        '<label class="fld"><span>Mobile <em>*</em></span><input data-in="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="(201) 555-0123" value="' + esc(S.phone) + '"></label></div>';
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
        h += '<div class="tiles" style="--n:' + (T.services.length <= 6 ? T.services.length : 5) + '">' + T.services.map(function (s) {
          var on = S.svcs.indexOf(s.id) > -1;
          var tag = s.mode === 'estimate' ? 'Free estimate' : s.fixed ? '$' + s.fixed : s.fee ? '$' + s.fee + ' visit' : s.heavy ? 'By weight' : '';
          return '<button type="button" class="tile' + (on ? ' on' : '') + '" data-act="svc" data-v="' + s.id + '" aria-pressed="' + !!on + '"><span class="tbox">' + (on ? '<span class="tick">' + ic('check') + '</span>' : '') + (s.image ? '<img alt="" src="' + esc(s.image) + '">' : '<span class="blob"></span>' + ic(s.icon)) + '</span><span class="tl">' + esc(s.label) + '</span>' + (tag && B.showPrices ? '<span class="tt">' + tag + '</span>' : '') + '</button>';
        }).join('') + '</div>';
      }
      if (d.type === 'choice') {
        var o = optOf(id);
        h += '<div class="chips' + (d.ui === 'list' ? ' col' : '') + '">' + d.options.map(function (x) {
          return '<button type="button" class="chip' + (S.ans[id] === x.id ? ' on' : '') + '" data-act="opt" data-s="' + id + '" data-v="' + x.id + '">' + esc(d.ui === 'grid' ? x.label : (x.short && d.ui === 'truck' ? x.label : x.label)) + (x.badge ? '<span class="save">' + esc(x.badge) + '</span>' : '') + '</button>';
        }).join('') + '</div>';
        if (o && o.urgent) h += '<div class="alert">' + ic('triangle-alert') + '<span>No heat or no cooling right now? Calling is fastest.</span><a href="tel:+1' + B.phoneDigits + '">Call now</a></div>';
        if (d.ui === 'truck' && o) {
          var p = priceInfo();
          h += '<div class="pricebox">' + truck(o.frac) + '<div><b>' + (p ? p.text : esc(o.label)) + '</b><span>' + (p ? p.note : 'Final price confirmed on site.') + '</span></div></div>';
          if (d.photos) h += photosHtml(S.path === 'quote' ? 'Add photos for a tighter price' : 'Add photos (optional)');
        }
      }
      if (d.type === 'addons') {
        h += '<div class="chips">' + d.options.map(function (x) { var on = !!S.addons[x.id]; return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-act="addon" data-v="' + x.id + '" aria-pressed="' + on + '">' + (on ? ic('check', 'ci') : ic('plus', 'ci')) + esc(x.label) + (B.showPrices && x.add ? ' <span class="amt">+$' + x.add[0] + '</span>' : '') + '</button>'; }).join('') + '</div>';
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
        h += nameFields(1) + (d.askAddress ? '<label class="fld"><span>Address where the vehicle will be <em>*</em></span><input data-in="addr" autocomplete="street-address" placeholder="123 Main St" value="' + esc(S.addr) + '"></label>' : '') + (hasZipStep() ? '' : '<label class="fld narrow"><span>ZIP code <em>*</em></span><input data-in="zip" inputmode="numeric" maxlength="5" placeholder="07430" value="' + esc(S.zip) + '"></label><p class="warn" id="oa"' + (/^\d{5}$/.test(S.zip) && !inArea() ? '' : ' hidden') + '>' + esc(B.name) + ' does not serve this ZIP yet.</p>') +
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

    function menuHtml() {
      var order = OPEN ? ['call', 'book', 'quote', 'text'] : ['book', 'quote', 'text', 'call'];
      return '<h3>How can we help?</h3><div class="menu">' + order.map(function (k) {
        var t = T.tiles[k], title = t.title, desc = t.desc, icon = t.icon;
        if (k === 'book' && t.priced && B.showPrices) { var rg = bookRange(); if (rg) desc = t.priced.replace('{min}', '$' + rg[0]).replace('{max}', '$' + rg[1]); }
        if (k === 'call') { title = OPEN ? 'Call the office' : 'Get a call back'; desc = OPEN ? 'Open until ' + fmt(mins(B.close)) + ' today.' : 'Closed now. Calls from ' + fmt(mins(B.open)) + '.'; icon = OPEN ? 'phone' : 'phone-incoming'; }
        return '<button type="button" class="mrow" data-act="start" data-v="' + k + '"><span class="mi">' + ic(icon) + '</span><span class="mt"><b>' + title + '</b><span>' + desc + '</span></span>' + ic('chevron-right', 'chev') + '</button>';
      }).join('') + '</div>';
    }

    function doneHtml() {
      var who = esc(S.name.trim().split(' ')[0] || 'there'), ph = esc(prettyPhone());
      var title, text, foot = OPEN ? 'They usually reply within ' + B.replyMins + ' minutes.' : 'The office opens at ' + fmt(mins(B.open)) + '. Expect a text shortly after.';
      if (S.path === 'book') { title = S.svc.mode === 'estimate' ? 'Walkthrough requested' : 'Request sent'; text = esc(B.name) + ' will text ' + ph + ' to confirm. Need to change something? Just reply to the text.'; }
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
      if (rows.length) h += '<dl class="receipt"><div class="rh"><span>Request #' + S.done.id + '</span><span>Waiting for confirmation</span></div>' + rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>';
      return h + '<p class="meta">' + foot + '</p>';
    }

    function bodyHtml() {
      if (S.done) return doneHtml();
      if (!S.path) return menuHtml();
      var sc = curScreen(), h = '';
      for (var i = 0; i < sc.length; i++) {
        h += '<section class="blk" id="blk-' + sc[i] + '">' + blockHtml(sc[i]) + '</section>';
        var t = stepDef(sc[i]).type;
        if ((t === 'service' || t === 'choice') && !valid(sc[i])) break; // reveal the next question only after this one is answered
      }
      var hasTruck = sc.some(function (id) { return stepDef(id).ui === 'truck'; });
      var p = priceInfo();
      if (p && sc.indexOf('service') > -1 && !hasTruck) h += '<div class="pricebox simple"><div><b>' + p.text + '</b><span>' + p.note + '</span></div></div>';
      return h;
    }

    function footHtml() {
      var call = '<a class="callus" href="tel:+1' + B.phoneDigits + '">' + ic('phone') + 'Call us</a>';
      var pow = '<div class="pow"><a href="https://matviykorsunskiy.me/dialbridge-widget/" target="_blank" rel="noopener">Powered by DialBridge</a>' + (B.demo ? '<span class="demo" title="Demo: requests are not sent anywhere">Demo</span>' : '') + '</div>';
      if (S.done) return '<footer class="ft"><span></span><div class="ft-r"><button type="button" class="btn" data-act="' + (CLOSABLE ? 'close' : 'restart') + '">' + (CLOSABLE ? 'Close' : 'Start over') + '</button></div></footer>' + pow;
      if (!S.path) return '<footer class="ft">' + call + '</footer>' + pow;
      var sc = curScreen(), last = S.idx === screens().length - 1, t = stepDef(sc[0]).type;
      var label = 'Continue';
      if (last && t === 'contact') label = S.path === 'book' ? (S.svc && S.svc.mode === 'estimate' ? 'Request walkthrough' : 'Send booking request') : 'Send price request';
      if (t === 'message') label = 'Send message';
      if (t === 'callback') label = 'Request a call back';
      var next = t === 'call' ? '' : '<button type="button" class="btn" id="next" data-act="next"' + (screenValid(sc) ? '' : ' disabled') + '>' + label + (label === 'Continue' ? ic('arrow-right', 'arr') : '') + '</button>';
      return '<footer class="ft">' + (t === 'call' ? '<span></span>' : call) + '<div class="ft-r"><button type="button" class="btn-g" data-act="back">Back</button>' + next + '</div></footer>' + pow;
    }

    // NAV = 'fwd' | 'back' | 'done' when the screen changes (slides the new screen in); null for taps inside a screen.
    // JUST = selector of the control that was just tapped, so only it plays the select animation.
    var NAV = null, JUST = null, RO = null, firstPaint = true;
    function render(scrollTo) {
      var old = document.getElementById('bd'), keep = old && !NAV ? old.scrollTop : 0;
      var hadSteps = !!app.querySelector('.steps');
      app.innerHTML = headerHtml() + stepperHtml() + '<div class="bd" id="bd"><div class="bdi" id="bdi">' + bodyHtml() + '</div></div>' + footHtml();
      if (window.lucide) window.lucide.createIcons();
      var bd = document.getElementById('bd');
      if (NAV && !firstPaint) bd.classList.add(NAV === 'back' ? 'in-back' : NAV === 'done' ? 'in-done' : 'in-fwd');
      if (NAV === 'fwd' && hadSteps) { var now = app.querySelector('.steps li.now'); if (now) now.classList.add('grow'); }
      if (NAV && !firstPaint) Array.prototype.slice.call(app.querySelectorAll('#bdi .mrow, #bdi .tile, #bdi .radio, #bdi .chip, #bdi .day'), 0, 12).forEach(function (el, i) { el.classList.add('stag'); el.style.setProperty('--i', i); });
      if (JUST) { try { var j = app.querySelector(JUST); if (j) j.classList.add('just'); } catch (e) { } }
      if (bd) {
        bd.scrollTop = keep;
        if (scrollTo) { var el = document.getElementById('blk-' + scrollTo); if (el) bd.scrollTo({ top: Math.max(0, el.offsetTop - bd.offsetTop - 8), behavior: 'smooth' }); }
      }
      NAV = null; JUST = null;
      watchHeight();
      if (firstPaint) { firstPaint = false; post('dbw:ready', { light: !!B.logo }); }
    }
    // Tell w.js how tall this screen wants to be, so the popup fits the content instead of showing a half-empty card.
    function wantedHeight() {
      var h = 0;
      Array.prototype.forEach.call(app.children, function (c) {
        if (c.id !== 'bd') { h += c.offsetHeight; return; }
        var cs = getComputedStyle(c), inner = document.getElementById('bdi');
        h += (inner ? inner.offsetHeight : 0) + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      });
      return Math.ceil(h);
    }
    var lastH = 0;
    function sendHeight() { var h = wantedHeight(); if (Math.abs(h - lastH) > 1) { lastH = h; post('dbw:height', { h: h }); } }
    function watchHeight() {
      if (!EMBED) return;
      if (window.ResizeObserver) {
        if (RO) RO.disconnect();
        RO = new ResizeObserver(sendHeight);
        var bdi = document.getElementById('bdi'); if (bdi) RO.observe(bdi);
        Array.prototype.forEach.call(app.children, function (c) { if (c.id !== 'bd') RO.observe(c); });
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
    function finish() {
      var reqId = (B.name.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase() || 'DB') + '-' + (1000 + hash(S.phone + Date.now()) % 9000);
      var done = function () {
        S.done = { id: reqId }; NAV = 'done'; post('dbw:submit', { path: S.path, service: S.svc && S.svc.id });
        // Demo only: hand the booking to the DialBridge dashboard demo on the same site, so it shows up in the owner inbox.
        if (B.demo) { try { var q = JSON.parse(localStorage.getItem('dbx_inbox_queue') || '[]'); q.push(payload(reqId)); localStorage.setItem('dbx_inbox_queue', JSON.stringify(q.slice(-20))); } catch (e) { } }
        render();
      };
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

    app.addEventListener('click', function (e) {
      var el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
      var act = el.getAttribute('data-act'), v = el.getAttribute('data-v');
      var sel = function (a) { return '[data-act="' + a + '"][data-v="' + (window.CSS && CSS.escape ? CSS.escape(v || '') : v) + '"]'; };
      if (act === 'start') { S.path = v === 'call' ? (OPEN ? 'call' : 'callback') : v; S.idx = 0; NAV = 'fwd'; render(); }
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
      else if (act === 'close') { post('dbw:close'); if (S.done) { fresh(); render(); } }
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
