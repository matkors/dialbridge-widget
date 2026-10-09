/* "Build my booking page" flow for the product page (done-for-you).
   1 build (labor-illusion checklist) -> 2 their live booking page + offer + setup-call calendar
   -> 3 details (contact + quick fit taps) -> 4 booked. No editing: we set it up with them on the call.
   Nothing is sent anywhere until SUBMIT_URL is set, and the calendar shows generated times until a real
   calendar is connected (SLOTS_URL). Meta pixel events fire only if the page has fbq loaded:
   ViewContent when the preview is built; on booking: Schedule, Lead (value by fit: 5 / 25 / 60) and
   QualifiedLead for good fits. Optimize ads on Lead until QualifiedLead reaches ~50 a week (research/funnel-research.md). */
(function () {
  'use strict';
  var SUBMIT_URL = '';            // intake webhook (https). Empty = demo mode: nothing leaves the page.
  var BASE = '../';
  var OFFICE_TZ = 'America/New_York';
  var HOURS = { open: 10, close: 20, days: [1, 2, 3, 4, 5, 6], stepMin: 30, noticeH: 3 };   // setup calls: 10 AM to 8 PM ET, Mon to Sat
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COLORS = ['#0E6650', '#1F5FAD', '#C2410C', '#B91C1C', '#0F766E', '#1F2937'];
  var TRADES = { junk: 'Junk removal', cleaning: 'House cleaning', detailing: 'Mobile detailing', hvac: 'Heating and cooling' };
  var ic = function (d) { return '<svg viewBox="0 0 24 24">' + d + '</svg>'; };
  var CHECK = ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>');
  var esc = function (t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var ARW = '<svg class="arw"><use href="#arw"/></svg>';

  var S = { name: '', trade: 'junk', brand: COLORS[0], area: '', site: null, mgr: null, calls: null, miss: null, slot: null, first: '', mobile: '', email: '', url: '' };
  var userTz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || OFFICE_TZ;

  var el = document.createElement('div');
  el.className = 'bld'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Build your booking page');
  el.innerHTML =
    '<div class="bld-top"><span class="logo">dialbridge<span>.</span>ai</span><div class="bld-prog" aria-hidden="true"><i></i><i></i><i></i></div><button class="bld-x" type="button" aria-label="Close">' + ic('<path d="M6 6l12 12M18 6 6 18"/>') + '</button></div>' +
    '<div class="bld-body">' +
    // 1 build
    '<section class="bstep" data-s="1"><div class="bbuild"><p class="eyebrow">Building your booking page</p><div class="bname" data-name></div><ul class="blist">' +
    ['Adding your business name and colors', 'Setting up your services', 'Adding price ranges customers see', 'Opening your schedule'].map(function (t) { return '<li><span class="dot">' + CHECK + '</span>' + t + '</li>'; }).join('') +
    '</ul></div></section>' +
    // 2 their page + offer + setup-call calendar
    '<section class="bstep" data-s="2"><div class="bwrap boffer">' +
    '<div class="bpv"><span class="tag2">Your booking page</span><div class="card"><iframe title="Your booking page preview" id="bFrame"></iframe></div><p class="try"><i></i>It works. Tap through it like a customer would.</p></div>' +
    '<div class="bright"><div class="bdeal"><p class="eyebrow">Your free trial</p><h2 style="margin-top:10px">2 weeks free.<br>We set it all up for <span data-name></span>.</h2>' +
    '<ul class="bget">' +
    ['Your services, prices and hours, on your website, Google, Facebook and Instagram', 'Your 2 free weeks start the day it goes live', 'No card today. Cancel anytime by text'].map(function (t) { return '<li><span>' + CHECK + '</span>' + t + '</li>'; }).join('') +
    '</ul></div>' +
    '<div class="bcal"><div class="bcal-hd"><span class="bcal-ic">' + ic('<path d="M15.6 14.4l-2.2 2.2a14 14 0 0 1-6-6l2.2-2.2a1 1 0 0 0 .2-1.1L8.6 4.6a1 1 0 0 0-1.1-.6L4.9 4.6a1 1 0 0 0-.8 1C4.6 14 10 19.4 18.4 19.9a1 1 0 0 0 1-.8l.6-2.6a1 1 0 0 0-.6-1.1l-2.7-1.2a1 1 0 0 0-1.1.2z"/>') + '</span><div><b>Pick a time for your setup call</b><span>15 minutes by phone. We build it, you just say yes.</span></div></div>' +
    '<div class="bdays" id="bDays"></div><div class="bslots" id="bSlots"></div><p class="btz" id="bTz"></p>' +
    '<button class="btn" type="button" id="bTo4" disabled>Continue ' + ARW + '</button></div>' +
    '<div class="bstat"><b>41%</b><p>of online bookings come in after hours, when nobody is answering the phone.<small>Published data from large home-service booking platforms</small></p></div>' +
    '<p class="bprice">After your trial: from <b>$99/month</b>. Month to month.</p></div>' +
    '</div></section>' +
    // 4 details
    '<section class="bstep" data-s="3"><div class="bnarrow"><p class="eyebrow">Almost done</p><h2 style="margin-top:12px">Where should we call you?</h2>' +
    '<div class="bwhen" id="bWhen"></div>' +
    '<form class="bform" id="bForm" novalidate>' +
    '<div class="two"><label class="bfield">First name<input id="fFirst" autocomplete="given-name" required></label><label class="bfield">Mobile<input id="fMobile" type="tel" inputmode="tel" autocomplete="tel" placeholder="(201) 555-0148" required></label></div>' +
    '<label class="bfield">Email<input id="fEmail" type="email" inputmode="email" autocomplete="email" placeholder="you@yourbusiness.com" required></label>' +
    '<div class="bq"><p class="bqh">So we come prepared</p>' +
    '<div><h3>Do you have a website?</h3><div class="opts" data-q="site"><button type="button" class="opt" data-v="yes">Yes</button><button type="button" class="opt" data-v="no">No</button><button type="button" class="opt" data-v="old">Yes, but it\'s outdated</button></div></div>' +
    '<div id="bMgr" hidden><h3>Who takes care of it?</h3><div class="opts" data-q="mgr"><button type="button" class="opt" data-v="me">I do</button><button type="button" class="opt" data-v="agency">A web company or freelancer</button><button type="button" class="opt" data-v="nobody">Nobody really</button></div><label class="bfield" style="margin-top:12px">Website address<input id="fUrl" inputmode="url" autocomplete="url" placeholder="yourbusiness.com"></label></div>' +
    '<div><h3>About how many calls or quote requests do you get in a normal week?</h3><div class="opts" data-q="calls"><button type="button" class="opt" data-v="0">0 to 5</button><button type="button" class="opt" data-v="1">6 to 15</button><button type="button" class="opt" data-v="2">16 to 40</button><button type="button" class="opt" data-v="3">40+</button></div></div>' +
    '<div><h3>When you\'re on a job and a new call comes in, what usually happens?</h3><div class="opts" data-q="miss"><button type="button" class="opt" data-v="answer">I answer it</button><button type="button" class="opt" data-v="vm">It goes to voicemail</button><button type="button" class="opt" data-v="later">I call back later</button><button type="button" class="opt" data-v="office">Someone in the office answers</button></div></div>' +
    '</div>' +
    '<div class="brec" id="bRec" hidden></div>' +
    '<p class="berr" id="bErr"></p>' +
    '<p class="bfine">By booking you agree that DialBridge may call or text you about your setup. Message and data rates may apply. Reply STOP to opt out.</p>' +
    '<div class="bnav"><button class="bback" type="button" data-go="2">Back</button><button class="btn" type="submit" id="bSubmit">Book my setup call ' + ARW + '</button></div></form></div></section>' +
    // 5 booked
    '<section class="bstep" data-s="4"><div class="bnarrow bdone"><div class="ok">' + CHECK + '</div><h2>You\'re booked, <span data-first></span>.</h2>' +
    '<div class="bwhen big" id="bWhen2"></div><p class="bsub" id="bDoneSub"></p>' +
    '<ul class="btl" id="bTl"></ul>' +
    '<a class="btn ghost" id="bGcal" target="_blank" rel="noopener">Add to Google Calendar</a>' +
    '<p class="bdemo" id="bDemo" hidden>Draft page: nothing was booked or sent yet.</p></div></section>' +
    '</div>';
  document.body.appendChild(el);

  var $ = function (s) { return el.querySelector(s); }, $$ = function (s) { return [].slice.call(el.querySelectorAll(s)); };
  var frame = $('#bFrame'), cur = 0, last = null;

  function enc(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function guessTrade(n) { n = n.toLowerCase(); return /clean|maid|janitor/.test(n) ? 'cleaning' : /detail|auto|car wash|mobile wash/.test(n) ? 'detailing' : /hvac|heat|cool|air|furnace|plumb/.test(n) ? 'hvac' : 'junk'; }
  function track(ev, data, custom, eventId) { try { if (window.fbq) window.fbq(custom ? 'trackCustom' : 'track', ev, data || {}, eventId ? { eventID: eventId } : undefined); } catch (e) { } try { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: 'dbx_' + ev }, data || {})); } catch (e) { } }

  /* fit: does this business already get the demand a booking widget converts? */
  function fit() {
    var s = 0;
    s += { yes: 30, old: 20, no: 0 }[S.site] || 0;
    s += [0, 25, 35, 40][+S.calls] || 0;
    s += { vm: 25, later: 25, answer: 10, office: 5 }[S.miss] || 0;
    return s;
  }
  function tier() { var f = fit(); return f >= 60 ? 'A' : f >= 35 ? 'B' : 'C'; }
  // no site, an outdated site or very few calls -> the plan that builds demand first
  function plan() { return S.site === 'yes' && S.calls !== '0' ? 'widget' : 'full'; }

  /* ---------- setup-call times (office hours in ET, shown in the visitor's time zone) ---------- */
  function partsIn(ms, tz) { var o = {}; new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short' }).formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = p.value; }); return o; }
  function offsetMs(ms, tz) { var p = partsIn(ms, tz); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute) - Math.floor(ms / 60000) * 60000; }
  function zoned(y, m, d, h, mi, tz) { var guess = Date.UTC(y, m, d, h, mi), off = offsetMs(guess, tz), t = guess - off, off2 = offsetMs(t, tz); return off2 === off ? t : guess - off2; }
  var DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  function days() {
    var now = Date.now(), out = [], p0 = partsIn(now, OFFICE_TZ);
    for (var i = 0; i < 14 && out.length < 6; i++) {
      var base = Date.UTC(+p0.year, +p0.month - 1, +p0.day + i, 12), p = partsIn(base, 'UTC');
      var dow = new Date(base).getUTCDay(); if (HOURS.days.indexOf(dow) < 0) continue;
      var slots = [];
      for (var m = HOURS.open * 60; m < HOURS.close * 60; m += HOURS.stepMin) {
        var t = zoned(+p.year, +p.month - 1, +p.day, Math.floor(m / 60), m % 60, OFFICE_TZ);
        if (t >= now + HOURS.noticeH * 3600e3) slots.push(t);
      }
      if (slots.length) out.push({ key: p.year + '-' + p.month + '-' + p.day, first: slots[0], slots: slots });
    }
    return out;
  }
  var fmt = function (ms, o) { return new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: userTz }, o)).format(new Date(ms)); };
  function tzName(ms) { var p = new Intl.DateTimeFormat('en-US', { timeZone: userTz, timeZoneName: 'short' }).formatToParts(new Date(ms)).filter(function (x) { return x.type === 'timeZoneName'; })[0]; return p ? p.value : ''; }
  function whenText(ms) { return fmt(ms, { weekday: 'long', month: 'short', day: 'numeric' }) + ' at ' + fmt(ms, { hour: 'numeric', minute: '2-digit' }) + ' ' + tzName(ms); }
  var DAYS = [], dayIdx = 0;
  function renderCal() {
    DAYS = days();
    $('#bDays').innerHTML = DAYS.map(function (d, i) {
      return '<button type="button" class="bday' + (i === dayIdx ? ' on' : '') + '" data-day="' + i + '"><small>' + fmt(d.first, { weekday: 'short' }) + '</small><b>' + fmt(d.first, { day: 'numeric' }) + '</b><small>' + fmt(d.first, { month: 'short' }) + '</small></button>';
    }).join('');
    var d = DAYS[dayIdx];
    $('#bSlots').innerHTML = d ? d.slots.map(function (t) { return '<button type="button" class="bslot' + (S.slot === t ? ' on' : '') + '" data-t="' + t + '">' + fmt(t, { hour: 'numeric', minute: '2-digit' }) + '</button>'; }).join('') : '';
    $('#bTz').textContent = 'Times shown in your time zone (' + tzName(Date.now()) + ').';
    $('#bTo4').disabled = !S.slot;
  }

  /* ---------- steps ---------- */
  function show(n) {
    cur = n;
    $$('.bstep').forEach(function (s) { s.classList.toggle('on', +s.getAttribute('data-s') === n); });
    $$('.bld-prog i').forEach(function (p, i) { p.classList.toggle('done', i < n - 1 || n === 4); });
    $('.bld-body').scrollTop = 0;
    if (n === 2) renderCal();
    if (n === 3) { $('#bWhen').innerHTML = callCard(true); setTimeout(function () { $('#fFirst').focus(); }, 300); }
  }
  function callCard(edit) {
    return '<span class="bw-ic">' + ic('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>') + '</span><div><b>' + esc(whenText(S.slot)) + '</b><span>15-minute setup call by phone</span></div>' + (edit ? '<button type="button" class="bback" data-go="2">Change</button>' : '');
  }
  function names() { $$('[data-name]').forEach(function (n) { n.textContent = S.name; }); }
  var tReload = null;
  function preview(now) {
    clearTimeout(tReload);
    tReload = setTimeout(function () {
      frame.classList.add('fade');
      var cfg = { trade: S.trade, name: S.name, phone: '(201) 555-0148', brand: S.brand, area: S.area || 'your area', zips: [] };
      frame.src = BASE + 'book.html?c=' + enc(cfg) + '&embed=1&inline=1';
      frame.onload = function () { setTimeout(function () { frame.classList.remove('fade'); }, 150); };
    }, now ? 0 : 450);
  }

  async function build() {
    show(1); names();
    var items = $$('.blist li'); items.forEach(function (li) { li.className = ''; });
    preview(true);
    var step = reduce ? 250 : 650;
    for (var i = 0; i < items.length; i++) {
      items[i].classList.add('go');
      await new Promise(function (r) { setTimeout(r, step + Math.random() * 200); });
      items[i].classList.remove('go'); items[i].classList.add('ok');
    }
    await new Promise(function (r) { setTimeout(r, reduce ? 100 : 450); });
    if (cur !== 1) return;
    show(2);
    track('ViewContent', { content_name: 'booking_page_preview', content_category: S.trade });
  }

  function recUpdate(pulse) {
    $('#bMgr').hidden = !S.site || S.site === 'no';
    var r = $('#bRec'); r.hidden = !(S.site && S.calls);
    if (r.hidden) return;
    var full = plan() === 'full';
    r.innerHTML = '<span class="ic">' + (full ? ic('<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01"/>') : ic('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>')) + '</span>' +
      '<div><b>We\'ll set up: ' + (full ? 'Website + Review Automation + Booking Widget' : 'Booking Widget') + '</b><span>' + (!full ? 'Goes on the website you already have.' : S.site === 'no' ? 'You need a site for customers to book on. We build it.' : S.calls === '0' ? 'More Google reviews and a site that ranks bring the calls first.' : 'We rebuild your site to book jobs, plus Google review requests.') + '</span></div>' +
      '<div class="pr">' + (full ? '$199' : '$99') + '<span style="font-size:13px;font-weight:600;color:var(--mute)">/mo</span><small>Free for 2 weeks</small></div>';
    if (pulse) { r.classList.remove('pulse'); r.offsetWidth; r.classList.add('pulse'); }
  }

  function digits(t) { return String(t).replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''); }
  function utm() { var q = new URLSearchParams(location.search), o = {}; ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'].forEach(function (k) { if (q.get(k)) o[k] = q.get(k); }); return o; }

  async function submit(e) {
    e.preventDefault();
    S.first = $('#fFirst').value.trim(); S.mobile = digits($('#fMobile').value); S.email = $('#fEmail').value.trim(); S.url = $('#fUrl').value.trim();
    var err = !S.first ? 'Please add your first name.' : S.mobile.length !== 10 ? 'Please add a 10-digit mobile number.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(S.email) ? 'Please add a valid email.'
      : !(S.site && S.calls && S.miss) || (S.site !== 'no' && !S.mgr) ? 'Please answer the quick questions so we come prepared.' : '';
    var box = $('#bErr'); box.textContent = err; box.classList.toggle('on', !!err);
    if (err) return;
    var t = tier(), value = { A: 60, B: 25, C: 5 }[t];
    var evid = 'dbx-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);   // same id goes to the server for CAPI dedupe
    var payload = { business: S.name, trade: S.trade, brand: S.brand, area: S.area, setupCallAt: new Date(S.slot).toISOString(), setupCallTz: userTz,
      website: S.url || null, hasWebsite: S.site, siteManagedBy: S.site === 'no' ? null : S.mgr, callsPerWeek: ['0-5', '6-15', '16-40', '40+'][+S.calls], whenOnAJob: S.miss,
      plan: plan(), fit: fit(), tier: t, firstName: S.first, mobile: S.mobile, email: S.email, consentText: $('.bfine').textContent, page: location.href, utm: utm(), eventId: evid, submittedAt: new Date().toISOString() };
    var btn = $('#bSubmit');
    if (/^https:\/\//.test(SUBMIT_URL)) {
      btn.disabled = true;
      try { var r = await fetch(SUBMIT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!r.ok) throw new Error(r.status); }
      catch (x) { btn.disabled = false; box.textContent = 'That did not go through. Please try again, or text us at (916) 644-7495.'; box.classList.add('on'); return; }
    } else $('#bDemo').hidden = false;
    track('Schedule', { content_name: 'setup_call', plan: plan() });
    track('Lead', { value: value, currency: 'USD', content_name: plan(), lead_tier: t }, false, evid);
    if (t !== 'C') track('QualifiedLead', { value: value, currency: 'USD', plan: plan(), lead_tier: t }, true);
    done();
  }

  function done() {
    $$('[data-first]').forEach(function (n) { n.textContent = S.first; });
    var full = plan() === 'full';
    $('#bWhen2').innerHTML = callCard(false);
    $('#bDoneSub').textContent = 'We\'ll call ' + S.mobile.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3') + '. You\'ll get a text confirmation in a minute.';
    var steps = [['Your setup call', '15 minutes: your services, prices and hours. We build the rest.'],
      [full ? 'Within 5 days' : 'Within 48 hours', full ? 'Your new website and booking page go live, with review requests on.' : 'Your Book online button goes live on your website, Google, Facebook and Instagram.'],
      ['Your 2 free weeks start', 'The day it goes live, so you see real bookings before you pay anything.'],
      ['Day 14', 'Keep it for ' + (full ? '$199' : '$99') + '/month, or cancel by text.']];
    $('#bTl').innerHTML = steps.map(function (x) { return '<li><i></i><div><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></div></li>'; }).join('');
    var g = function (ms) { return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); };
    $('#bGcal').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('DialBridge setup call: ' + S.name) + '&dates=' + g(S.slot) + '/' + g(S.slot + 15 * 60e3) + '&details=' + encodeURIComponent('15-minute call to set up your booking page. We will call you.');
    show(4);
  }

  /* ---------- events ---------- */
  el.addEventListener('click', function (e) {
    var go = e.target.closest('[data-go]'); if (go && !go.disabled) { show(+go.getAttribute('data-go')); return; }
    var dy = e.target.closest('.bday'); if (dy) { dayIdx = +dy.getAttribute('data-day'); renderCal(); return; }
    var sl = e.target.closest('.bslot'); if (sl) { S.slot = +sl.getAttribute('data-t'); renderCal(); return; }
    var o = e.target.closest('.opt');
    if (o) {
      var q = o.parentNode.getAttribute('data-q');
      [].forEach.call(o.parentNode.children, function (x) { x.classList.toggle('on', x === o); });
      S[q] = o.getAttribute('data-v');
      recUpdate(q === 'site' || q === 'calls');
    }
  });
  $('#bTo4').addEventListener('click', function () { if (S.slot) show(3); });
  $('.bld-x').addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && el.classList.contains('on')) close(); });
  $('#bForm').addEventListener('submit', submit);

  function open(name) {
    S.name = (name || '').trim() || 'Your Business'; S.trade = guessTrade(S.name);
    last = document.activeElement;
    el.classList.add('on'); document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('show'); }); });
    build();
  }
  function close() {
    el.classList.remove('show'); document.documentElement.style.overflow = '';
    setTimeout(function () { el.classList.remove('on'); cur = 0; }, reduce ? 0 : 300);
    if (last && last.focus) last.focus();
  }
  window.DBXBuild = { open: open, close: close };
})();
