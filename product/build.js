/* "Build my booking page" for the product page (done-for-you), as a split-screen signup:
   left  = proof: their own live booking page (built in front of them), 3 stat tiles, trades served
   right = Step 1 of 3 pick a setup-call time -> Step 2 contact -> Step 3 quick fit questions -> booked.
   Nothing is sent anywhere until SUBMIT_URL is set, and the calendar shows generated times (no real calendar yet).
   Meta pixel events fire only if the page has fbq loaded: ViewContent when their page is built; on booking:
   Schedule, Lead (value by fit: 5 / 25 / 60, with eventID for CAPI dedupe) and QualifiedLead for good fits. */
(function () {
  'use strict';
  var SUBMIT_URL = '';            // intake webhook (https). Empty = demo mode: nothing leaves the page.
  var BASE = '../';
  var TEXT_US = '(916) 644-7495';
  var OFFICE_TZ = 'America/New_York';
  var HOURS = { open: 10, close: 20, days: [1, 2, 3, 4, 5, 6], stepMin: 30, noticeH: 3 };   // setup calls: 10 AM to 8 PM ET, Mon to Sat
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ic = function (d) { return '<svg viewBox="0 0 24 24">' + d + '</svg>'; };
  var CHECK = ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>');
  var ARW = '<svg class="arw"><use href="#arw"/></svg>';
  var esc = function (t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var S = { name: '', trade: 'junk', site: null, mgr: null, calls: null, miss: null, slot: null, first: '', mobile: '', email: '', url: '' };
  var userTz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || OFFICE_TZ;

  var el = document.createElement('div');
  el.className = 'sg'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Start your free trial');
  el.innerHTML =
    // proof panel
    '<aside class="sg-l">' +
    '<button class="sg-back" type="button" data-close>' + ic('<path d="M15 5l-7 7 7 7"/>') + 'Back</button>' +
    '<div class="sg-lin">' +
    '<span class="sg-badge"><i></i>Free for 2 weeks &middot; we set it up for you</span>' +
    '<h1 class="sg-h">Your booking page is ready, <span data-name></span>.</h1>' +
    '<p class="sg-sub">Customers see your services and prices and book a time, even at 10 PM. On a 15-minute call we make it yours and put it live.</p>' +
    '<div class="sg-stats"><div><b>48 hrs</b><span>Live after your call</span></div><div><b>2 weeks</b><span>Free, from go-live</span></div><div><b>$0</b><span>Today, no card</span></div></div>' +
    '<div class="sg-pv"><p class="sg-pvl"><span>Your booking page</span><em id="sgPvState">Building</em></p>' +
    '<div class="sg-card"><iframe title="Your booking page" id="bFrame" tabindex="-1"></iframe>' +
    '<div class="sg-build" id="sgBuild"><ul class="blist">' + ['Adding your name and colors', 'Setting up your services', 'Adding price ranges', 'Opening your schedule'].map(function (t) { return '<li><span class="dot">' + CHECK + '</span>' + t + '</li>'; }).join('') + '</ul></div></div></div>' +
    '<p class="sg-trades">Built for junk removal, cleaning, mobile detailing and HVAC</p>' +
    '</div></aside>' +
    // form side
    '<main class="sg-r">' +
    '<div class="sg-top"><span>Questions? Text us <a href="sms:+19166447495">' + TEXT_US + '</a></span><button class="sg-x" type="button" data-close aria-label="Close">' + ic('<path d="M6 6l12 12M18 6 6 18"/>') + '</button></div>' +
    '<div class="sg-mid">' +
    '<div class="sg-prog" id="sgProg"><span id="sgStep">Step 1 of 3</span><i><b id="sgBar"></b></i></div>' +
    '<div class="sg-box">' +
    // step 1: time
    '<section class="sg-s" data-s="1"><h2>Pick a time for your setup call</h2><p class="sg-p">15 minutes by phone. We build everything, you just tell us your prices.</p>' +
    '<div class="bdays" id="bDays"></div><div class="bslots" id="bSlots"></div><p class="btz" id="bTz"></p>' +
    '<button class="btn sg-go" type="button" id="sgNext1" disabled>Continue ' + ARW + '</button></section>' +
    // step 2: contact
    '<section class="sg-s" data-s="2"><h2>Where should we call you?</h2><div class="bwhen" id="bWhen"></div>' +
    '<div class="sg-f"><label class="bfield">First name<input id="fFirst" autocomplete="given-name"></label><label class="bfield">Mobile<input id="fMobile" type="tel" inputmode="tel" autocomplete="tel" placeholder="(201) 555-0148"></label></div>' +
    '<label class="bfield">Email<input id="fEmail" type="email" inputmode="email" autocomplete="email" placeholder="you@yourbusiness.com"></label>' +
    '<p class="berr" id="bErr2"></p>' +
    '<button class="btn sg-go" type="button" id="sgNext2">Continue ' + ARW + '</button><button class="sg-link" type="button" data-to="1">Back</button></section>' +
    // step 3: fit
    '<section class="sg-s" data-s="3"><h2>So we come prepared</h2><p class="sg-p">Tap what fits. It helps us set it up right the first time.</p><div class="bq">' +
    '<div><h3>Do you have a website?</h3><div class="opts" data-q="site"><button type="button" class="opt" data-v="yes">Yes</button><button type="button" class="opt" data-v="no">No</button><button type="button" class="opt" data-v="old">Yes, but it\'s outdated</button></div></div>' +
    '<div id="bMgr" hidden><h3>Who takes care of it?</h3><div class="opts" data-q="mgr"><button type="button" class="opt" data-v="me">I do</button><button type="button" class="opt" data-v="agency">A web company</button><button type="button" class="opt" data-v="nobody">Nobody really</button></div><label class="bfield" style="margin-top:10px">Website address<input id="fUrl" inputmode="url" autocomplete="url" placeholder="yourbusiness.com"></label></div>' +
    '<div><h3>Calls or quote requests in a normal week?</h3><div class="opts" data-q="calls"><button type="button" class="opt" data-v="0">0 to 5</button><button type="button" class="opt" data-v="1">6 to 15</button><button type="button" class="opt" data-v="2">16 to 40</button><button type="button" class="opt" data-v="3">40+</button></div></div>' +
    '<div><h3>When a call comes in while you\'re on a job?</h3><div class="opts" data-q="miss"><button type="button" class="opt" data-v="answer">I answer it</button><button type="button" class="opt" data-v="vm">Voicemail</button><button type="button" class="opt" data-v="later">I call back later</button><button type="button" class="opt" data-v="office">Office answers</button></div></div>' +
    '</div><div class="brec" id="bRec" hidden></div><p class="berr" id="bErr3"></p>' +
    '<button class="btn sg-go" type="button" id="bSubmit">Book my setup call ' + ARW + '</button><button class="sg-link" type="button" data-to="2">Back</button>' +
    '<p class="bfine">By booking you agree that DialBridge may call or text you about your setup. Message and data rates may apply. Reply STOP to opt out.</p></section>' +
    // done
    '<section class="sg-s sg-done" data-s="4"><div class="ok">' + CHECK + '</div><h2>You\'re booked, <span data-first></span>.</h2><div class="bwhen" id="bWhen2"></div><p class="sg-p" id="bDoneSub"></p><ul class="btl" id="bTl"></ul>' +
    '<a class="btn ghost sg-go" id="bGcal" target="_blank" rel="noopener">Add to Google Calendar</a><p class="bdemo" id="bDemo" hidden>Draft page: nothing was booked or sent yet.</p></section>' +
    '</div>' +
    '<p class="sg-trust"><span>' + ic('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>') + 'Your info stays private</span><span>No card needed</span><span>15-minute call</span></p>' +
    '</div></main>';
  document.body.appendChild(el);

  var $ = function (s) { return el.querySelector(s); }, $$ = function (s) { return [].slice.call(el.querySelectorAll(s)); };
  var frame = $('#bFrame'), cur = 0, last = null, buildRun = 0;

  function enc(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function guessTrade(n) { n = n.toLowerCase(); return /clean|maid|janitor/.test(n) ? 'cleaning' : /detail|auto|car wash|mobile wash/.test(n) ? 'detailing' : /hvac|heat|cool|air|furnace|plumb/.test(n) ? 'hvac' : 'junk'; }
  function track(ev, data, custom, eventId) { try { if (window.fbq) window.fbq(custom ? 'trackCustom' : 'track', ev, data || {}, eventId ? { eventID: eventId } : undefined); } catch (e) { } try { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: 'dbx_' + ev }, data || {})); } catch (e) { } }

  /* fit: does this business already get the demand a booking widget converts? */
  function fit() { return ({ yes: 30, old: 20, no: 0 }[S.site] || 0) + ([0, 25, 35, 40][+S.calls] || 0) + ({ vm: 25, later: 25, answer: 10, office: 5 }[S.miss] || 0); }
  function tier() { var f = fit(); return f >= 60 ? 'A' : f >= 35 ? 'B' : 'C'; }
  // no site, an outdated site or very few calls -> the plan that builds demand first
  function plan() { return S.site === 'yes' && S.calls !== '0' ? 'widget' : 'full'; }

  /* ---------- setup-call times: office hours in ET, shown in the visitor's own time zone ---------- */
  function partsIn(ms, tz) { var o = {}; new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = p.value; }); return o; }
  function offsetMs(ms, tz) { var p = partsIn(ms, tz); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute) - Math.floor(ms / 60000) * 60000; }
  function zoned(y, m, d, h, mi, tz) { var guess = Date.UTC(y, m, d, h, mi), off = offsetMs(guess, tz), t = guess - off, off2 = offsetMs(t, tz); return off2 === off ? t : guess - off2; }
  function days() {
    var now = Date.now(), out = [], p0 = partsIn(now, OFFICE_TZ);
    for (var i = 0; i < 14 && out.length < 6; i++) {
      var base = Date.UTC(+p0.year, +p0.month - 1, +p0.day + i, 12), p = partsIn(base, 'UTC');
      if (HOURS.days.indexOf(new Date(base).getUTCDay()) < 0) continue;
      var slots = [];
      for (var m = HOURS.open * 60; m < HOURS.close * 60; m += HOURS.stepMin) {
        var t = zoned(+p.year, +p.month - 1, +p.day, Math.floor(m / 60), m % 60, OFFICE_TZ);
        if (t >= now + HOURS.noticeH * 3600e3) slots.push(t);
      }
      if (slots.length) out.push({ first: slots[0], slots: slots });
    }
    return out;
  }
  var fmt = function (ms, o) { return new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: userTz }, o)).format(new Date(ms)); };
  function tzName(ms) { var p = new Intl.DateTimeFormat('en-US', { timeZone: userTz, timeZoneName: 'short' }).formatToParts(new Date(ms)).filter(function (x) { return x.type === 'timeZoneName'; })[0]; return p ? p.value : ''; }
  function whenText(ms) { return fmt(ms, { weekday: 'long', month: 'short', day: 'numeric' }) + ' at ' + fmt(ms, { hour: 'numeric', minute: '2-digit' }) + ' ' + tzName(ms); }
  var DAYS = [], dayIdx = 0;
  function renderCal() {
    DAYS = days();
    $('#bDays').innerHTML = DAYS.map(function (d, i) { return '<button type="button" class="bday' + (i === dayIdx ? ' on' : '') + '" data-day="' + i + '"><small>' + fmt(d.first, { weekday: 'short' }) + '</small><b>' + fmt(d.first, { day: 'numeric' }) + '</b><small>' + fmt(d.first, { month: 'short' }) + '</small></button>'; }).join('');
    var d = DAYS[dayIdx];
    $('#bSlots').innerHTML = d ? d.slots.map(function (t) { return '<button type="button" class="bslot' + (S.slot === t ? ' on' : '') + '" data-t="' + t + '">' + fmt(t, { hour: 'numeric', minute: '2-digit' }) + '</button>'; }).join('') : '';
    $('#bTz').textContent = 'Times shown in your time zone (' + tzName(Date.now()) + ').';
    $('#sgNext1').disabled = !S.slot;
  }
  function callCard() { return '<span class="bw-ic">' + ic('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>') + '</span><div><b>' + esc(whenText(S.slot)) + '</b><span>15-minute setup call by phone</span></div>'; }

  /* ---------- steps ---------- */
  function show(n) {
    var prev = cur; cur = n;
    $$('.sg-s').forEach(function (s) { var on = +s.getAttribute('data-s') === n; s.classList.toggle('on', on); s.classList.toggle('back', on && n < prev); });
    $('#sgProg').hidden = n === 4;
    $('#sgStep').textContent = 'Step ' + Math.min(n, 3) + ' of 3';
    $('#sgBar').style.transform = 'scaleX(' + (Math.min(n, 3) / 3) + ')';
    $('.sg-r').scrollTop = 0;
    if (matchMedia('(max-width: 900px)').matches && n > 1) el.scrollTo({ top: $('.sg-r').offsetTop, behavior: reduce ? 'auto' : 'smooth' });
    if (n === 1) renderCal();
    if (n === 2) { $('#bWhen').innerHTML = callCard(); setTimeout(function () { $('#fFirst').focus({ preventScroll: true }); }, 250); }
  }
  function names() { $$('[data-name]').forEach(function (n) { n.textContent = S.name; }); }
  async function build() {
    var id = ++buildRun, box = $('#sgBuild'), items = $$('.blist li');
    box.classList.remove('gone'); $('#sgPvState').textContent = 'Building'; $('#sgPvState').className = '';
    items.forEach(function (li) { li.className = ''; });
    frame.src = BASE + 'book.html?c=' + enc({ trade: S.trade, name: S.name, phone: '(201) 555-0148', brand: '#0E6650', area: 'your area', zips: [] }) + '&embed=1&inline=1';
    var step = reduce ? 200 : 600;
    for (var i = 0; i < items.length; i++) {
      items[i].classList.add('go');
      await new Promise(function (r) { setTimeout(r, step + Math.random() * 180); });
      if (id !== buildRun) return;
      items[i].classList.remove('go'); items[i].classList.add('ok');
    }
    await new Promise(function (r) { setTimeout(r, 350); });
    if (id !== buildRun) return;
    box.classList.add('gone'); $('#sgPvState').textContent = 'Live preview'; $('#sgPvState').className = 'live';
    track('ViewContent', { content_name: 'booking_page_preview', content_category: S.trade });
  }

  function recUpdate(pulse) {
    $('#bMgr').hidden = !S.site || S.site === 'no';
    var r = $('#bRec'); r.hidden = !(S.site && S.calls);
    if (r.hidden) return;
    var full = plan() === 'full';
    r.innerHTML = '<span class="ic">' + (full ? ic('<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01"/>') : ic('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>')) + '</span>' +
      '<div><b>' + (full ? 'Website + Reviews + Booking Widget' : 'Booking Widget') + '</b><span>' + (!full ? 'Goes on the website you already have.' : S.site === 'no' ? 'You need a site customers can book on. We build it.' : S.calls === '0' ? 'Reviews and a site that ranks bring the calls first.' : 'We rebuild your site to book jobs, plus review requests.') + '</span></div>' +
      '<div class="pr">' + (full ? '$199' : '$99') + '<span>/mo</span><small>Free for 2 weeks</small></div>';
    if (pulse) { r.classList.remove('pulse'); r.offsetWidth; r.classList.add('pulse'); }
  }

  function digits(t) { return String(t).replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''); }
  function utm() { var q = new URLSearchParams(location.search), o = {}; ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'].forEach(function (k) { if (q.get(k)) o[k] = q.get(k); }); return o; }
  function err(id, msg) { var b = $(id); b.textContent = msg; b.classList.toggle('on', !!msg); return !!msg; }
  function step2() {
    S.first = $('#fFirst').value.trim(); S.mobile = digits($('#fMobile').value); S.email = $('#fEmail').value.trim();
    if (err('#bErr2', !S.first ? 'Please add your first name.' : S.mobile.length !== 10 ? 'Please add a 10-digit mobile number.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(S.email) ? 'Please add a valid email.' : '')) return;
    show(3);
  }
  async function submit() {
    S.url = $('#fUrl').value.trim();
    if (err('#bErr3', !(S.site && S.calls && S.miss) || (S.site !== 'no' && !S.mgr) ? 'Please tap an answer for each question.' : '')) return;
    var t = tier(), value = { A: 60, B: 25, C: 5 }[t], evid = 'dbx-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    var payload = { business: S.name, trade: S.trade, setupCallAt: new Date(S.slot).toISOString(), setupCallTz: userTz, website: S.url || null, hasWebsite: S.site, siteManagedBy: S.site === 'no' ? null : S.mgr,
      callsPerWeek: ['0-5', '6-15', '16-40', '40+'][+S.calls], whenOnAJob: S.miss, plan: plan(), fit: fit(), tier: t, firstName: S.first, mobile: S.mobile, email: S.email,
      consentText: $('.bfine').textContent, page: location.href, utm: utm(), eventId: evid, submittedAt: new Date().toISOString() };
    var btn = $('#bSubmit');
    if (/^https:\/\//.test(SUBMIT_URL)) {
      btn.disabled = true;
      try { var r = await fetch(SUBMIT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!r.ok) throw new Error(r.status); }
      catch (x) { btn.disabled = false; err('#bErr3', 'That did not go through. Please try again, or text us at ' + TEXT_US + '.'); return; }
    } else $('#bDemo').hidden = false;
    track('Schedule', { content_name: 'setup_call', plan: plan() });
    track('Lead', { value: value, currency: 'USD', content_name: plan(), lead_tier: t }, false, evid);
    if (t !== 'C') track('QualifiedLead', { value: value, currency: 'USD', plan: plan(), lead_tier: t }, true);
    done();
  }
  function done() {
    var full = plan() === 'full';
    $$('[data-first]').forEach(function (n) { n.textContent = S.first; });
    $('#bWhen2').innerHTML = callCard();
    $('#bDoneSub').textContent = 'We\'ll call ' + S.mobile.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3') + '. A text confirmation is on its way.';
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
    if (e.target.closest('[data-close]')) { close(); return; }
    var to = e.target.closest('[data-to]'); if (to) { show(+to.getAttribute('data-to')); return; }
    var dy = e.target.closest('.bday'); if (dy) { dayIdx = +dy.getAttribute('data-day'); renderCal(); return; }
    var sl = e.target.closest('.bslot'); if (sl) { S.slot = +sl.getAttribute('data-t'); renderCal(); return; }
    var o = e.target.closest('.opt');
    if (o) {
      var q = o.parentNode.getAttribute('data-q');
      [].forEach.call(o.parentNode.children, function (x) { x.classList.toggle('on', x === o); });
      S[q] = o.getAttribute('data-v'); recUpdate(q === 'site' || q === 'calls');
    }
  });
  $('#sgNext1').addEventListener('click', function () { if (S.slot) show(2); });
  $('#sgNext2').addEventListener('click', step2);
  ['#fFirst', '#fMobile', '#fEmail'].forEach(function (s) { $(s).addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); step2(); } }); });
  $('#bSubmit').addEventListener('click', submit);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && el.classList.contains('on')) close(); });

  function open(name) {
    S.name = (name || '').trim() || 'Your Business'; S.trade = guessTrade(S.name); names();
    last = document.activeElement;
    el.classList.add('on'); document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('show'); }); });
    show(1); build();
  }
  function close() {
    el.classList.remove('show'); document.documentElement.style.overflow = ''; buildRun++;
    setTimeout(function () { el.classList.remove('on'); cur = 0; }, reduce ? 0 : 300);
    if (last && last.focus) last.focus();
  }
  window.DBXBuild = { open: open, close: close };
})();
