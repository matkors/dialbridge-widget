/* DialBridge dashboard: owner inbox + settings, DialBridge admin console. Hash routes:
   #/login · #/o/<slug>/inbox[/<id>] · #/o/<slug>/overview · #/o/<slug>/booking · #/o/<slug>/install
   #/a/clients · #/a/client/<slug> · #/a/requests */
(function () {
  'use strict';
  var root = document.getElementById('root');
  var BASE = location.href.replace(/app\/.*$/, '');
  var ui = { filter: 'all', q: '', afilter: 'all', abiz: 'all' };
  DBX.load();

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ic(n) { return '<i data-lucide="' + n + '"></i>'; }
  function money(n) { return '$' + Math.round(n || 0).toLocaleString('en-US'); }
  function dur(ms) { if (ms == null) return 'n/a'; var m = Math.round(ms / 60000); return m < 60 ? m + ' min' : (m / 60).toFixed(m < 600 ? 1 : 0) + ' hr'; }
  function ago(t) { var s = (Date.now() - t) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; if (s < 7 * 86400) return Math.floor(s / 86400) + 'd ago'; return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  function stamp(t) { return new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  function median(a) { a = a.filter(function (x) { return x != null; }).sort(function (x, y) { return x - y; }); if (!a.length) return null; var m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
  function within(rs, days) { var c = Date.now() - days * DBX.DAY; return rs.filter(function (r) { return r.createdAt >= c; }); }
  function toast(t) { var el = document.getElementById('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove('on'); }, 1800); }
  function go(h) { location.hash = h; }
  function role() { try { return localStorage.getItem('dbx_role'); } catch (e) { return null; } }
  function setRole(r) { try { if (r) localStorage.setItem('dbx_role', r); else localStorage.removeItem('dbx_role'); } catch (e) { } }
  function enc(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  var STATUS = { new: 'New', contacted: 'Contacted', scheduled: 'Scheduled', won: 'Won', lost: 'Lost' };
  function spill(s) { return '<span class="pill s-' + s + '">' + (STATUS[s] || s) + '</span>'; }
  function hasFlow(slug) { return ['harbor-haul', 'comfort-air', 'sparkle-and-co'].indexOf(slug) > -1; }

  function stats(rs) {
    var won = rs.filter(function (r) { return r.status === 'won'; });
    var closed = rs.filter(function (r) { return r.status === 'won' || r.status === 'lost'; });
    return {
      n: rs.length, after: rs.filter(function (r) { return r.afterHours; }).length,
      reply: median(rs.map(function (r) { return r.replyMs; })), won: won.length,
      revenue: won.reduce(function (s, r) { return s + (r.jobValue || 0); }, 0),
      closeRate: closed.length ? won.length / closed.length : null,
      waiting: rs.filter(function (r) { return r.status === 'new'; })
    };
  }
  function flags(b) {
    var out = [], rs = within(DBX.requestsFor(b.slug), 30), st = stats(rs), now = Date.now();
    if (b.status !== 'Onboarding') {
      if (!b.lastWidgetOpen || now - b.lastWidgetOpen > 3 * DBX.DAY) out.push(['bad', 'No widget opens in ' + (b.lastWidgetOpen ? Math.floor((now - b.lastWidgetOpen) / DBX.DAY) + ' days' : 'a while') + '. Check the install on their ' + (b.installedOn || 'site') + '.']);
      if (st.reply && st.reply > b.replyGoalMin * 2 * 60000) out.push(['warn', 'Owner replies slowly: median ' + dur(st.reply) + ' against a ' + b.replyGoalMin + ' min goal.']);
      var stale = st.waiting.filter(function (r) { return now - r.createdAt > DBX.HOUR; });
      if (stale.length) out.push(['bad', stale.length + ' request' + (stale.length > 1 ? 's' : '') + ' waiting over an hour.']);
    }
    if (b.texting !== 'Toll-free verified') out.push(['warn', 'Texting: ' + b.texting + '. Customer texts are off until verified; owner alerts still work.']);
    if (!b.googleLink) out.push(['warn', 'Booking link not on their Google profile yet.']);
    var left = b.setup.filter(function (s) { return !s.done; }).length;
    if (left && b.status === 'Onboarding') out.push(['warn', left + ' setup steps left.']);
    if (!out.length) out.push(['ok', 'Healthy. Nothing needs attention.']);
    return out;
  }

  /* ---------- shell ---------- */
  function shell(navHtml, whoHtml, body, asbar) {
    root.innerHTML = '<div class="shell"><aside class="side"><div class="brand">DialBridge' + (role() === 'admin' ? '<span>Admin</span>' : '') + '</div>' + whoHtml +
      '<nav class="nav">' + navHtml + '</nav><div class="foot"><button data-act="reset">Reset demo data</button><button data-act="signout">Sign out</button></div></aside>' +
      '<main class="main">' + (asbar || '') + body + '</main></div>';
    if (window.lucide) lucide.createIcons();
  }
  function navLink(href, icon, label, on, cnt) { return '<a href="' + href + '" class="' + (on ? 'on' : '') + '">' + ic(icon) + label + (cnt ? '<span class="cnt">' + cnt + '</span>' : '') + '</a>'; }
  function top(title, sub, actions) { return '<div class="top"><div><h1>' + title + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div><div class="acts">' + (actions || '') + '</div></div>'; }

  /* ---------- login ---------- */
  function login() {
    var d = DBX.get();
    root.innerHTML = '<div class="login"><div class="box"><h1>DialBridge</h1><p>Demo sign in. Pick who you are.</p>' +
      '<button class="opt" data-login="admin">' + ic('shield') + '<div><b>DialBridge admin</b><span>All clients, setup, health and revenue</span></div></button>' +
      d.businesses.filter(function (b) { return b.status !== 'Onboarding'; }).map(function (b) { return '<button class="opt" data-login="owner:' + b.slug + '">' + ic('store') + '<div><b>' + esc(b.name) + '</b><span>Owner view: ' + esc(b.owner) + '</span></div></button>'; }).join('') +
      '<p style="font-size:12.5px">Demo data lives only in this browser. Book something in the <a href="' + BASE + 'site.html?b=harbor-haul&book" target="_blank">live widget demo</a> and it shows up in Harbor Haul\'s inbox.</p></div></div>';
    if (window.lucide) lucide.createIcons();
  }

  /* ---------- owner views ---------- */
  function ownerShell(b, page, body) {
    var r = role(), isAdmin = r === 'admin';
    var newCount = DBX.requestsFor(b.slug).filter(function (x) { return x.status === 'new'; }).length;
    var nav = navLink('#/o/' + b.slug + '/inbox', 'inbox', 'Inbox', page === 'inbox', newCount) +
      navLink('#/o/' + b.slug + '/overview', 'chart-column', 'Overview', page === 'overview') +
      navLink('#/o/' + b.slug + '/booking', 'sliders-horizontal', 'Booking page', page === 'booking') +
      navLink('#/o/' + b.slug + '/install', 'code', 'Install and links', page === 'install');
    var who = '<div class="who"><b>' + esc(b.name) + '</b><span>' + esc(b.owner) + ' · ' + esc(b.town) + '</span>' +
      (isAdmin ? '<select data-act="switchbiz">' + DBX.get().businesses.map(function (x) { return '<option value="' + x.slug + '"' + (x.slug === b.slug ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select>' : '') + '</div>';
    var asbar = isAdmin ? '<div class="asbar"><span>Viewing as <b>' + esc(b.name) + '</b> (what the owner sees)</span><a href="#/a/client/' + b.slug + '">Back to admin</a></div>' : '';
    shell(nav, who, body, asbar);
  }

  function itemsText(r) { return (r.items || []).join(', ') + (r.load ? ' · ' + r.load : ''); }

  function inbox(b, id) {
    var all = DBX.requestsFor(b.slug), now = Date.now();
    var counts = { all: all.length }; Object.keys(STATUS).forEach(function (k) { counts[k] = all.filter(function (r) { return r.status === k; }).length; });
    var list = all.filter(function (r) { return ui.filter === 'all' || r.status === ui.filter; });
    if (ui.q) { var q = ui.q.toLowerCase(); list = list.filter(function (r) { return (r.name + ' ' + r.phone + ' ' + itemsText(r)).toLowerCase().indexOf(q) > -1; }); }
    if (!id && window.innerWidth > 860 && list.length) id = list[0].id;
    var sel = all.filter(function (r) { return r.id === id; })[0];
    var items = list.map(function (r) {
      var waitMs = now - r.createdAt, late = r.status === 'new' && waitMs > b.replyGoalMin * 60000;
      return '<a class="it' + (r.status === 'new' ? ' unread' : '') + (sel && sel.id === r.id ? ' on' : '') + '" href="#/o/' + b.slug + '/inbox/' + r.id + '"><b>' + esc(r.name) + '</b><span class="t">' + ago(r.createdAt) + '</span>' +
        '<span class="d">' + esc(r.path === 'text' ? '"' + r.message + '"' : itemsText(r)) + '</span><span class="t">' + (late ? '<span class="wait">Waiting ' + dur(waitMs) + '</span>' : spill(r.status)) + '</span></a>';
    }).join('') || '<div class="empty">Nothing here yet.</div>';
    var listHtml = '<div class="list"><div class="filters">' + ['all', 'new', 'contacted', 'scheduled', 'won', 'lost'].map(function (k) { return '<button data-filter="' + k + '" class="' + (ui.filter === k ? 'on' : '') + '">' + (k === 'all' ? 'All' : STATUS[k]) + ' ' + counts[k] + '</button>'; }).join('') +
      '</div><div class="search"><input id="q" placeholder="Search name, phone or item" value="' + esc(ui.q) + '"></div><div class="items">' + items + '</div></div>';
    var detail = sel ? detailHtml(b, sel) : '<div class="detail"><div class="empty">Pick a request to see the details.</div></div>';
    var waiting = all.filter(function (r) { return r.status === 'new'; }).length;
    ownerShell(b, 'inbox', top('Inbox', waiting ? waiting + ' new request' + (waiting > 1 ? 's' : '') + ' waiting for a reply. Fast replies win the job.' : 'All caught up.', '<a class="btn" href="' + BASE + 'site.html?b=' + (hasFlow(b.slug) ? b.slug : 'harbor-haul') + '&book" target="_blank">' + ic('external-link') + 'Test your booking page</a>') +
      '<div class="content"><div class="card inbox' + (sel ? ' has-sel' : '') + '">' + listHtml + detail + '</div></div>');
  }

  function detailHtml(b, r) {
    var first = r.name.split(' ')[0];
    var tpls = [
      ['Confirm time', 'Hi ' + first + ', this is ' + b.owner.split(' ')[0] + ' from ' + b.name + '. Got your request' + (r.when ? ' for ' + r.when.charAt(0).toLowerCase() + r.when.slice(1) : '') + '. That works for us, see you then!'],
      ['Send price', 'Hi ' + first + ', ' + b.owner.split(' ')[0] + ' from ' + b.name + ' here. From what you sent, it should be ' + (r.priceShown || '[price]') + ' all in. Want me to lock in a time?'],
      ['Ask for photos', 'Hi ' + first + ', thanks for reaching out to ' + b.name + '! Can you text me 2 photos of everything that\'s going? I\'ll send you an exact price.'],
      ['On the way', 'Hi ' + first + ', we\'re on the way, about 20 minutes out. See you soon!']
    ];
    ui.tpls = tpls.map(function (t) { return t[1]; });
    var facts = [['Items', (r.items || []).join(', ') || 'n/a'], ['Size', r.load || (r.priceShown === 'Free estimate' ? 'Walkthrough' : 'n/a')], ['When', r.when || 'Not picked'], ['Price shown', r.priceShown || 'n/a'], ['Source', r.source], ['Received', stamp(r.createdAt) + (r.afterHours ? ' <span class="tag">After hours</span>' : '')]];
    return '<div class="detail"><div class="dh"><div><a class="btn sm" href="#/o/' + b.slug + '/inbox" style="margin-bottom:8px;display:none" data-mobile-back>' + ic('arrow-left') + 'Back</a><h3>' + esc(r.name) + ' ' + spill(r.status) + '</h3><p>' + esc(r.phone) + ' · ' + esc((r.town ? r.town + ' ' : '') + (r.zip || '')) + (r.live ? ' · <b>from the live widget demo</b>' : '') + '</p></div>' +
      '<div class="acts"><a class="btn" href="tel:' + esc(r.phone) + '">' + ic('phone') + 'Call</a></div></div>' +
      '<dl class="facts">' + facts.map(function (f) { return '<div><dt>' + f[0] + '</dt><dd>' + (f[0] === 'Received' ? f[1] : esc(f[1])) + '</dd></div>'; }).join('') + '</dl>' +
      '<div class="dbody">' + (r.message ? '<p class="quote">"' + esc(r.message) + '"</p>' : '') + (r.details ? '<p class="quote">' + esc(r.details) + '</p>' : '') +
      (r.photos ? '<div class="photos">' + new Array(r.photos + 1).join('.').split('').map(function () { return '<span>' + ic('image') + '</span>'; }).join('') + '</div>' : '') +
      '<div class="compose"><div class="tpls">' + tpls.map(function (t, i) { return '<button data-tpl="' + i + '">' + t[0] + '</button>'; }).join('') + '</div><textarea id="msg" placeholder="Text ' + esc(first) + '..."></textarea>' +
      '<div class="row"><span>Sends from your business number. Demo: nothing is actually sent.</span><button class="btn p sm" data-act="send" data-id="' + r.id + '">' + ic('send') + 'Send text</button></div></div>' +
      '<div class="outcome"><button class="btn" data-act="sched" data-id="' + r.id + '">' + ic('calendar-check') + 'Mark scheduled</button>' +
      '<input id="jobval" inputmode="numeric" placeholder="Job $" value="' + (r.jobValue || '') + '"><button class="btn" data-act="won" data-id="' + r.id + '">' + ic('badge-check') + 'Mark won</button>' +
      '<select id="lostwhy"><option>Went with another company</option><option>Price too high</option><option>No reply from customer</option><option>Out of our area</option></select><button class="btn" data-act="lost" data-id="' + r.id + '">Mark lost</button></div>' +
      '<div><b style="font-size:13px">History</b><ul class="tl">' + r.timeline.slice().reverse().map(function (e) { return '<li><span>' + stamp(e.at) + '</span>' + esc(e.text) + '</li>'; }).join('') + '</ul></div></div>' +
      '</div>';
  }

  function overview(b) {
    var rs = within(DBX.requestsFor(b.slug), 30), st = stats(rs);
    var prev = DBX.requestsFor(b.slug).filter(function (r) { var a = Date.now() - r.createdAt; return a >= 30 * DBX.DAY && a < 60 * DBX.DAY; });
    var goal = b.replyGoalMin * 60000;
    var kpis = '<div class="kpis">' +
      '<div class="card kpi"><span>Requests, last 30 days</span><b>' + st.n + '</b><em>' + st.after + ' came in after hours (' + (st.n ? Math.round(st.after / st.n * 100) : 0) + '%)</em></div>' +
      '<div class="card kpi"><span>Median reply time</span><b>' + dur(st.reply) + '</b><em class="' + (st.reply != null && st.reply <= goal ? 'good' : 'bad') + '">Goal: ' + b.replyGoalMin + ' min</em></div>' +
      '<div class="card kpi"><span>Jobs won</span><b>' + st.won + '</b><em>' + (st.closeRate != null ? Math.round(st.closeRate * 100) + '% of closed requests' : 'No closed requests yet') + '</em></div>' +
      '<div class="card kpi"><span>Revenue from booked jobs</span><b>' + money(st.revenue) + '</b><em>' + (b.mrr ? Math.max(1, Math.round(st.revenue / b.mrr)) + 'x what DialBridge costs' : 'Tracked when you mark jobs won') + '</em></div></div>';
    // chart: last 14 days, business hours vs after hours
    var days = [], max = 1;
    for (var i = 13; i >= 0; i--) {
      var d0 = new Date(); d0.setHours(0, 0, 0, 0); d0 = d0.getTime() - i * DBX.DAY;
      var dayRs = rs.filter(function (r) { return r.createdAt >= d0 && r.createdAt < d0 + DBX.DAY; });
      var a = dayRs.filter(function (r) { return r.afterHours; }).length, n = dayRs.length;
      days.push({ t: d0, a: a, b: n - a }); max = Math.max(max, n);
    }
    var W = 640, H = 190, pl = 28, pb = 24, bw = (W - pl) / 14;
    var ticks = []; var step = max <= 4 ? 1 : Math.ceil(max / 4); for (var y = 0; y <= max; y += step) ticks.push(y);
    var top0 = ticks[ticks.length - 1] || 1;
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Requests per day, last 14 days">' +
      ticks.map(function (t) { var yy = H - pb - (t / top0) * (H - pb - 10); return '<line x1="' + pl + '" x2="' + W + '" y1="' + yy + '" y2="' + yy + '" stroke="#eeefe9"/><text x="' + (pl - 6) + '" y="' + (yy + 4) + '" font-size="11" fill="#8d9386" text-anchor="end">' + t + '</text>'; }).join('') +
      days.map(function (d, i) {
        var x = pl + i * bw + 5, w = bw - 10, hb = (d.b / top0) * (H - pb - 10), ha = (d.a / top0) * (H - pb - 10), base = H - pb;
        var lab = new Date(d.t).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
        return '<g><title>' + lab + ': ' + d.b + ' during hours, ' + d.a + ' after hours</title>' +
          (d.b ? '<rect x="' + x + '" y="' + (base - hb) + '" width="' + w + '" height="' + Math.max(0, hb - (d.a ? 1 : 0)) + '" rx="2" fill="#20251f"/>' : '') +
          (d.a ? '<rect x="' + x + '" y="' + (base - hb - ha) + '" width="' + w + '" height="' + Math.max(0, ha - 1) + '" rx="2" fill="#f35427"/>' : '') +
          (i % 2 === 0 ? '<text x="' + (x + w / 2) + '" y="' + (H - 7) + '" font-size="11" fill="#8d9386" text-anchor="middle">' + lab + '</text>' : '') + '</g>';
      }).join('') + '</svg>';
    var sources = {}; rs.forEach(function (r) { var s = sources[r.source] = sources[r.source] || { n: 0, won: 0, rev: 0 }; s.n++; if (r.status === 'won') { s.won++; s.rev += r.jobValue || 0; } });
    var srcRows = Object.keys(sources).sort(function (a, c) { return sources[c].n - sources[a].n; }).map(function (k) { var s = sources[k]; return '<tr><td>' + esc(k) + '</td><td class="num">' + s.n + '</td><td class="num">' + s.won + '</td><td class="num">' + money(s.rev) + '</td></tr>'; }).join('');
    var wait = st.waiting.map(function (r) { return '<tr class="click" data-href="#/o/' + b.slug + '/inbox/' + r.id + '"><td>' + esc(r.name) + '<span class="sub">' + esc(itemsText(r)) + '</span></td><td class="num">' + ago(r.createdAt) + '</td></tr>'; }).join('') || '<tr><td class="empty" colspan="2">No one waiting. Nice.</td></tr>';
    ownerShell(b, 'overview', top('Overview', 'Last 30 days' + (prev.length ? ' · ' + (st.n >= prev.length ? 'up' : 'down') + ' from ' + prev.length + ' requests the 30 days before' : '')) +
      '<div class="content">' + kpis + '<div class="grid2"><div class="card"><h2>Requests per day <small>last 14 days</small></h2><div class="chart">' + svg + '</div><div class="legend"><span><i style="background:#20251f"></i>During business hours</span><span><i style="background:#f35427"></i>After hours (would have gone to voicemail)</span></div></div>' +
      '<div class="card"><h2>Waiting for a reply</h2><table class="tbl">' + wait + '</table></div></div>' +
      '<div class="card"><h2>Where requests come from</h2><div class="scroll"><table class="tbl"><thead><tr><th>Source</th><th class="num">Requests</th><th class="num">Won</th><th class="num">Revenue</th></tr></thead><tbody>' + srcRows + '</tbody></table></div></div></div>');
  }

  function cfgFor(b) {
    var s = b.settings, c = { trade: b.trade, name: b.name, phone: b.ownerPhone, brand: b.brand, area: s.area, zips: String(s.zips).split(/[ ,]+/).filter(Boolean), open: s.open, close: s.close, replyMins: b.replyGoalMin };
    if (s.prices) c.prices = s.prices;
    if (s.hide && s.hide.length) c.hideServices = s.hide;
    return c;
  }
  function booking(b) {
    var T = window.DBW_TEMPLATES[b.trade], s = b.settings, hide = s.hide || [];
    var svc = T.services.map(function (x) { return '<label class="svc-row"><input type="checkbox" data-svc="' + x.id + '"' + (hide.indexOf(x.id) < 0 ? ' checked' : '') + '><span><b>' + esc(x.label) + '</b><span class="sub" style="display:block;font-size:12.5px;color:var(--mute)">' + esc(x.hint) + '</span></span><span class="tag">' + (x.mode === 'estimate' ? 'Walkthrough' : x.mode === 'book' ? 'Book a time' : 'Request a window') + '</span></label>'; }).join('');
    var prices = '';
    Object.keys(T.steps).forEach(function (sid) { var st = T.steps[sid]; (st.options || []).forEach(function (o) { if (!o.price) return; var k = sid + '.' + o.id, v = (s.prices && s.prices[k]) || o.price; prices += '<div class="price-row"><span>' + esc((st.sum || sid) + ': ' + (o.short || o.label)) + '</span><input data-price="' + k + '" data-i="0" inputmode="numeric" value="' + v[0] + '" aria-label="Low"><input data-price="' + k + '" data-i="1" inputmode="numeric" value="' + v[1] + '" aria-label="High"></div>'; }); });
    ownerShell(b, 'booking', top('Booking page', 'What customers see when they book. Changes show in the preview right away.', '<button class="btn p" data-act="publish">' + ic('upload') + 'Publish changes</button>') +
      '<div class="content"><div class="grid2"><div style="display:flex;flex-direction:column;gap:16px">' +
      '<div class="card"><h2>Services</h2><div class="pad" style="padding-top:4px;padding-bottom:4px">' + svc + '</div></div>' +
      (prices ? '<div class="card"><h2>Price ranges <small>low and high, in dollars</small></h2><div class="pad">' + prices + '</div></div>' : '') +
      '<div class="card"><h2>Hours and area</h2><div class="pad form">' +
      '<label class="fld">Opens<input type="time" data-set="open" value="' + esc(s.open) + '"></label><label class="fld">Closes<input type="time" data-set="close" value="' + esc(s.close) + '"></label>' +
      '<label class="fld">Service area<input data-set="area" value="' + esc(s.area) + '"></label><label class="fld">ZIPs start with<input data-set="zips" value="' + esc(s.zips) + '"><small>Separate with commas, e.g. 074, 076</small></label>' +
      '<label class="fld">Brand color<input type="color" data-biz="brand" value="' + esc(b.brand) + '"></label><label class="fld">Reply promise (minutes)<input inputmode="numeric" data-biz="replyGoalMin" value="' + b.replyGoalMin + '"><small>Shown to customers: "usually within X minutes"</small></label>' +
      '</div></div></div><div class="card"><h2>Live preview</h2><div class="pad"><div class="preview"><iframe id="pv" title="Booking preview" src="' + BASE + 'book.html?embed=1&inline=1&c=' + enc(cfgFor(b)) + '"></iframe></div></div></div></div></div>');
  }
  function install(b) {
    var hosted = hasFlow(b.slug) ? BASE + 'book.html?b=' + b.slug : BASE + 'book.html?c=' + enc(cfgFor(b));
    var snip = '<script async src="' + BASE + 'w.js" data-business="' + b.slug + '" data-color="' + b.brand + '"><\/script>';
    var steps = [['Your website', 'Paste the install code before the closing body tag. On WordPress use the WPCode plugin; on Wix use Settings, Custom Code; on Squarespace use Code Injection.'],
      ['Google Business Profile', 'Open your profile on Google, choose Edit profile, then Bookings, and paste your booking page link as the online booking link.'],
      ['Facebook and Instagram', 'Set the "Book now" button and your bio link to your booking page link.'],
      ['Missed-call text', 'Add the link to your missed-call text: "Sorry we missed you. You can also book here: [link]".'],
      ['Truck and invoices', 'Print the QR code on your truck magnet, yard signs and invoices.']];
    ownerShell(b, 'install', top('Install and links', 'Put your booking page everywhere customers find you.') +
      '<div class="content"><div class="grid2"><div style="display:flex;flex-direction:column;gap:16px"><div class="card"><h2>Your booking page link</h2><div class="pad" style="display:flex;flex-direction:column;gap:10px"><pre id="hosted">' + esc(hosted) + '</pre><div class="acts"><button class="btn" data-copy="hosted">' + ic('copy') + 'Copy link</button><a class="btn" href="' + esc(hosted) + '" target="_blank">' + ic('external-link') + 'Open</a></div></div></div>' +
      '<div class="card"><h2>Install code for your website</h2><div class="pad" style="display:flex;flex-direction:column;gap:10px"><pre id="snip">' + esc(snip) + '</pre><div class="acts"><button class="btn" data-copy="snip">' + ic('copy') + 'Copy code</button></div></div></div>' +
      '<div class="card"><h2>Where to put it</h2><div class="pad">' + steps.map(function (x, i) { return '<div class="svc-row" style="grid-template-columns:28px 1fr"><b>' + (i + 1) + '</b><span><b>' + x[0] + '</b><span style="display:block;color:var(--mute);font-size:13px">' + x[1] + '</span></span></div>'; }).join('') + '</div></div></div>' +
      '<div class="card"><h2>QR code</h2><div class="pad" style="display:flex;flex-direction:column;align-items:center;gap:10px"><div id="qr"></div><span style="color:var(--mute);font-size:13px;text-align:center">Scans straight to your booking page</span></div></div></div></div>');
    if (window.QRCode) new QRCode(document.getElementById('qr'), { text: hosted, width: 180, height: 180, correctLevel: QRCode.CorrectLevel.L });
  }

  /* ---------- admin views ---------- */
  function adminShell(page, body) {
    var d = DBX.get(), waiting = d.requests.filter(function (r) { return r.status === 'new'; }).length;
    var nav = '<span class="lbl">Workspace</span>' + navLink('#/a/clients', 'building-2', 'Clients', page === 'clients') + navLink('#/a/requests', 'inbox', 'All requests', page === 'requests', waiting) +
      '<span class="lbl">Clients</span>' + d.businesses.map(function (b) { return navLink('#/a/client/' + b.slug, 'store', esc(b.name), page === 'client:' + b.slug); }).join('');
    shell(nav, '<div class="who"><b>DialBridge team</b><span>Admin</span></div>', body);
  }
  function clients() {
    var d = DBX.get(), all30 = within(d.requests, 30), st = stats(all30);
    var active = d.businesses.filter(function (b) { return b.status === 'Active' || b.status === 'Pilot'; });
    var mrr = d.businesses.reduce(function (s, b) { return s + (b.mrr || 0); }, 0);
    var rows = d.businesses.map(function (b) {
      var rs = within(DBX.requestsFor(b.slug), 30), s = stats(rs), f = flags(b), done = b.setup.filter(function (x) { return x.done; }).length;
      var worst = f.some(function (x) { return x[0] === 'bad'; }) ? 'bad' : f.some(function (x) { return x[0] === 'warn'; }) ? 'warn' : 'ok';
      return '<tr class="click" data-href="#/a/client/' + b.slug + '"><td><b>' + esc(b.name) + '</b><span class="sub">' + esc(window.DBW_TEMPLATES[b.trade].trade) + ' · ' + esc(b.town) + '</span></td><td>' + spill(b.status) + '</td><td>' + esc(b.plan) + '<span class="sub">' + (b.mrr ? money(b.mrr) + '/mo' : 'Not billing yet') + '</span></td>' +
        '<td><div class="bar"><i style="width:' + Math.round(done / b.setup.length * 100) + '%"></i></div><span class="sub">' + done + ' of ' + b.setup.length + '</span></td><td class="num">' + s.n + '</td><td class="num">' + dur(s.reply) + '</td><td>' + (b.lastWidgetOpen ? ago(b.lastWidgetOpen) : 'never') + '</td><td>' + esc(b.texting) + '</td>' +
        '<td><span class="pill ' + (worst === 'ok' ? 's-won' : worst === 'warn' ? 's-scheduled' : 's-new') + '">' + (worst === 'ok' ? 'Healthy' : f.length + ' issue' + (f.length > 1 ? 's' : '')) + '</span></td></tr>';
    }).join('');
    adminShell('clients', top('Clients', 'Everyone on DialBridge, their setup progress and anything that needs attention.', '<a class="btn" href="' + BASE + 'new.html" target="_blank">' + ic('plus') + 'Build a demo for a prospect</a>') +
      '<div class="content"><div class="kpis"><div class="card kpi"><span>Live clients</span><b>' + active.length + '</b><em>' + (d.businesses.length - active.length) + ' onboarding</em></div><div class="card kpi"><span>Monthly recurring revenue</span><b>' + money(mrr) + '</b><em>' + money(mrr * 12) + ' a year</em></div>' +
      '<div class="card kpi"><span>Requests captured, 30 days</span><b>' + st.n + '</b><em>' + st.after + ' after hours</em></div><div class="card kpi"><span>Median owner reply</span><b>' + dur(st.reply) + '</b><em>Across all clients</em></div></div>' +
      '<div class="card"><div class="scroll"><table class="tbl"><thead><tr><th>Business</th><th>Status</th><th>Plan</th><th>Setup</th><th class="num">Requests 30d</th><th class="num">Reply</th><th>Last widget open</th><th>Texting</th><th>Health</th></tr></thead><tbody>' + rows + '</tbody></table></div></div></div>');
  }
  function client(slug) {
    var b = DBX.business(slug); if (!b) return go('#/a/clients');
    var rs = DBX.requestsFor(slug), s = stats(within(rs, 30)), done = b.setup.filter(function (x) { return x.done; }).length;
    var recent = rs.slice(0, 10).map(function (r) { return '<tr><td>' + esc(r.name) + '<span class="sub">' + esc(itemsText(r) || r.message || '') + '</span></td><td>' + spill(r.status) + '</td><td>' + esc(r.source) + '</td><td class="num">' + (r.replyMs ? dur(r.replyMs) : '') + '</td><td class="num">' + ago(r.createdAt) + '</td></tr>'; }).join('') || '<tr><td class="empty" colspan="5">No requests yet.</td></tr>';
    var facts = [['Owner', b.owner + ' · ' + b.ownerPhone], ['Plan', b.plan + (b.mrr ? ' · ' + money(b.mrr) + '/mo' : '')], ['Client since', new Date(b.since).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })], ['Website builder', b.installedOn || 'Not installed'], ['Texting', b.texting], ['Google booking link', b.googleLink ? 'Added' : 'Not yet'], ['Last widget open', b.lastWidgetOpen ? ago(b.lastWidgetOpen) : 'Never'], ['Revenue won, 30 days', money(s.revenue)]];
    adminShell('client:' + slug, top(esc(b.name) + ' ' + spill(b.status), esc(window.DBW_TEMPLATES[b.trade].trade) + ' · ' + esc(b.town), '<a class="btn" href="#/o/' + slug + '/inbox">' + ic('eye') + 'View as owner</a><a class="btn" target="_blank" href="' + BASE + (hasFlow(slug) ? 'site.html?b=' + slug + '&book' : 'book.html?c=' + enc(cfgFor(b))) + '">' + ic('external-link') + 'Open booking page</a>') +
      '<div class="content"><div class="grid2"><div style="display:flex;flex-direction:column;gap:16px"><div class="card"><h2>Setup <small>' + done + ' of ' + b.setup.length + ' done</small></h2><div class="pad" style="padding-top:2px;padding-bottom:2px">' +
      b.setup.map(function (x, i) { return '<label class="check' + (x.done ? ' done' : '') + '"><input type="checkbox" data-step="' + i + '"' + (x.done ? ' checked' : '') + '><span>' + esc(x.label) + '</span></label>'; }).join('') + '</div></div>' +
      '<div class="card"><h2>Recent requests</h2><div class="scroll"><table class="tbl"><thead><tr><th>Customer</th><th>Status</th><th>Source</th><th class="num">Reply</th><th class="num">Received</th></tr></thead><tbody>' + recent + '</tbody></table></div></div></div>' +
      '<div style="display:flex;flex-direction:column;gap:16px"><div class="card"><h2>Health</h2><div class="pad flags">' + flags(b).map(function (f) { return '<div class="flag ' + f[0] + '">' + ic(f[0] === 'ok' ? 'circle-check' : 'triangle-alert') + '<span>' + esc(f[1]) + '</span></div>'; }).join('') + '</div></div>' +
      '<div class="card"><h2>Account</h2><table class="tbl">' + facts.map(function (f) { return '<tr><td style="color:var(--mute)">' + f[0] + '</td><td>' + esc(f[1]) + '</td></tr>'; }).join('') + '</table></div>' +
      '<div class="card"><h2>Notes</h2><div class="pad"><textarea id="notes" rows="5" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:6px;resize:vertical" placeholder="Calls, promises, anything the next person should know">' + esc(b.notes) + '</textarea></div></div></div></div></div>');
  }
  function allRequests() {
    var d = DBX.get(), rs = d.requests.filter(function (r) { return (ui.afilter === 'all' || r.status === ui.afilter) && (ui.abiz === 'all' || r.business === ui.abiz); }).slice(0, 150);
    var rows = rs.map(function (r) { var b = DBX.business(r.business); return '<tr class="click" data-href="#/o/' + r.business + '/inbox/' + r.id + '"><td class="num" style="text-align:left">' + ago(r.createdAt) + '</td><td>' + esc(b ? b.name : r.business) + '</td><td>' + esc(r.name) + '<span class="sub">' + esc(itemsText(r) || r.message || '') + '</span></td><td>' + spill(r.status) + '</td><td>' + esc(r.source) + '</td><td class="num">' + (r.replyMs ? dur(r.replyMs) : (r.status === 'new' ? '<b style="color:var(--acc-d)">waiting</b>' : '')) + '</td></tr>'; }).join('');
    adminShell('requests', top('All requests', 'Every request across clients. Watch for anything waiting too long.',
      '<select class="btn" id="abiz"><option value="all">All clients</option>' + d.businesses.map(function (b) { return '<option value="' + b.slug + '"' + (ui.abiz === b.slug ? ' selected' : '') + '>' + esc(b.name) + '</option>'; }).join('') + '</select>' +
      '<select class="btn" id="afilter"><option value="all">Any status</option>' + Object.keys(STATUS).map(function (k) { return '<option value="' + k + '"' + (ui.afilter === k ? ' selected' : '') + '>' + STATUS[k] + '</option>'; }).join('') + '</select>') +
      '<div class="content"><div class="card"><div class="scroll"><table class="tbl"><thead><tr><th>Received</th><th>Client</th><th>Customer</th><th>Status</th><th>Source</th><th class="num">Reply</th></tr></thead><tbody>' + rows + '</tbody></table></div></div></div>');
  }

  /* ---------- router ---------- */
  function route() {
    DBX.absorbQueue();
    var r = role(), parts = location.hash.replace(/^#\/?/, '').split('/');
    if (!r || parts[0] === 'login') return login();
    if (parts[0] === 'a' && r === 'admin') {
      if (parts[1] === 'client') return client(parts[2]);
      if (parts[1] === 'requests') return allRequests();
      return clients();
    }
    if (parts[0] === 'o') {
      var slug = parts[1];
      if (r !== 'admin' && r !== 'owner:' + slug) return go('#/o/' + r.split(':')[1] + '/inbox');
      var b = DBX.business(slug); if (!b) return go(r === 'admin' ? '#/a/clients' : '#/login');
      if (parts[2] === 'overview') return overview(b);
      if (parts[2] === 'booking') return booking(b);
      if (parts[2] === 'install') return install(b);
      return inbox(b, parts[3]);
    }
    go(r === 'admin' ? '#/a/clients' : '#/o/' + r.split(':')[1] + '/inbox');
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('storage', function (e) { if (e.key === 'dbx_inbox_queue' && e.newValue) route(); });
  setInterval(function () { if (DBX.absorbQueue()) { toast('New request just came in'); route(); } }, 4000);

  /* ---------- events ---------- */
  var pvTimer;
  function refreshPreview(b) { clearTimeout(pvTimer); pvTimer = setTimeout(function () { var f = document.getElementById('pv'); if (f) f.src = BASE + 'book.html?embed=1&inline=1&c=' + enc(cfgFor(b)); }, 350); }
  function findReq(id) { return DBX.get().requests.filter(function (r) { return r.id === id; })[0]; }

  root.addEventListener('click', function (e) {
    var t = e.target.closest('[data-login],[data-act],[data-filter],[data-tpl],[data-href],[data-copy]'); if (!t) return;
    var d = DBX.get();
    if (t.dataset.login) { setRole(t.dataset.login); return go(t.dataset.login === 'admin' ? '#/a/clients' : '#/o/' + t.dataset.login.split(':')[1] + '/inbox'); }
    if (t.dataset.href) return go(t.dataset.href);
    if (t.dataset.filter) { ui.filter = t.dataset.filter; return route(); }
    if (t.dataset.copy) { var txt = document.getElementById(t.dataset.copy).textContent; try { navigator.clipboard.writeText(txt); } catch (x) { } return toast('Copied'); }
    if (t.dataset.tpl) { document.getElementById('msg').value = (ui.tpls || [])[+t.dataset.tpl] || ''; return; }
    var act = t.dataset.act, r = t.dataset.id ? findReq(t.dataset.id) : null, now = Date.now();
    if (act === 'signout') { setRole(null); return go('#/login'); }
    if (act === 'reset') { if (confirm('Reset all demo data in this browser?')) { DBX.reset(); toast('Demo data reset'); route(); } return; }
    if (act === 'send' && r) {
      var m = document.getElementById('msg').value.trim(); if (!m) return toast('Write a message first');
      r.timeline.push({ at: now, text: 'You texted: "' + m + '"' });
      if (r.status === 'new') { r.status = 'contacted'; r.replyMs = now - r.createdAt; }
      DBX.save(); toast('Text sent (demo)'); return route();
    }
    if (act === 'sched' && r) { r.status = 'scheduled'; r.timeline.push({ at: now, text: 'Job scheduled' }); if (!r.replyMs) r.replyMs = now - r.createdAt; DBX.save(); toast('Marked scheduled'); return route(); }
    if (act === 'won' && r) {
      var v = parseInt(String(document.getElementById('jobval').value).replace(/\D/g, ''), 10);
      if (!v) return toast('Add the job amount first');
      r.status = 'won'; r.jobValue = v; r.timeline.push({ at: now, text: 'Marked won, ' + money(v) }); if (!r.replyMs) r.replyMs = now - r.createdAt;
      DBX.save(); toast('Nice. ' + money(v) + ' added to revenue'); return route();
    }
    if (act === 'lost' && r) { var why = document.getElementById('lostwhy').value; r.status = 'lost'; r.timeline.push({ at: now, text: 'Marked lost: ' + why.toLowerCase() }); DBX.save(); toast('Marked lost'); return route(); }
    if (act === 'publish') { toast('Published. Your booking page updates within a minute.'); return; }
  });
  root.addEventListener('change', function (e) {
    var t = e.target, p = location.hash.replace(/^#\/?/, '').split('/');
    if (t.dataset.act === 'switchbiz') return go('#/o/' + t.value + '/' + (p[2] || 'inbox'));
    if (t.id === 'afilter') { ui.afilter = t.value; return route(); }
    if (t.id === 'abiz') { ui.abiz = t.value; return route(); }
    if (t.dataset.step != null) { var b = DBX.business(p[2]); b.setup[+t.dataset.step].done = t.checked; DBX.save(); return route(); }
    if (t.dataset.svc) { var b2 = DBX.business(p[1]); var h = b2.settings.hide || []; var i = h.indexOf(t.dataset.svc); if (t.checked && i > -1) h.splice(i, 1); if (!t.checked && i < 0) h.push(t.dataset.svc); b2.settings.hide = h; DBX.save(); refreshPreview(b2); }
  });
  root.addEventListener('input', function (e) {
    var t = e.target, p = location.hash.replace(/^#\/?/, '').split('/');
    if (t.id === 'q') { ui.q = t.value; clearTimeout(pvTimer); pvTimer = setTimeout(function () { route(); var q = document.getElementById('q'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 250); return; }
    if (t.id === 'notes') { var bn = DBX.business(p[2]); bn.notes = t.value; DBX.save(); return; }
    var b = p[0] === 'o' ? DBX.business(p[1]) : null; if (!b) return;
    if (t.dataset.set) { b.settings[t.dataset.set] = t.value; DBX.save(); refreshPreview(b); }
    if (t.dataset.biz) { b[t.dataset.biz] = t.dataset.biz === 'replyGoalMin' ? (parseInt(t.value, 10) || 15) : t.value; DBX.save(); refreshPreview(b); }
    if (t.dataset.price) {
      var T = window.DBW_TEMPLATES[b.trade], k = t.dataset.price, sp = k.split('.');
      var def = T.steps[sp[0]].options.filter(function (o) { return o.id === sp[1]; })[0].price;
      b.settings.prices = b.settings.prices || {}; var cur = (b.settings.prices[k] || def).slice(); cur[+t.dataset.i] = parseInt(t.value, 10) || 0; b.settings.prices[k] = cur; DBX.save(); refreshPreview(b);
    }
  });
  route();
})();
