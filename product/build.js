/* "Build my booking page" flow for the product page.
   1 build (labor-illusion checklist) -> 2 live preview + customize -> 3 fit questions + plan -> 4 contact -> 5 done.
   Nothing is sent anywhere until SUBMIT_URL is set. Meta pixel events fire only if the page has fbq loaded:
   ViewContent when the preview is built, Lead (value by fit: 5 / 25 / 60) for every claim, plus QualifiedLead for good fits.
   Optimize ads on Lead until QualifiedLead reaches ~50 a week (see research/funnel-research.md). */
(function () {
  'use strict';
  var SUBMIT_URL = '';            // intake webhook (https). Empty = demo mode: nothing leaves the page.
  var CALL_URL = 'https://cal.com/dialbridge.ai/discovery-call';
  var BASE = '../';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COLORS = ['#0E6650', '#1F5FAD', '#C2410C', '#B91C1C', '#0F766E', '#1F2937'];
  var TRADES = { junk: 'Junk removal', cleaning: 'House cleaning', detailing: 'Mobile detailing', hvac: 'Heating and cooling' };
  var ic = function (d) { return '<svg viewBox="0 0 24 24">' + d + '</svg>'; };
  var CHECK = ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>');
  var esc = function (t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  var S = { name: '', trade: 'junk', brand: COLORS[0], area: '', phone: '', site: null, calls: null, miss: null, mgr: null, setup: 'dfy', first: '', mobile: '', email: '', url: '' };

  var el = document.createElement('div');
  el.className = 'bld'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Build your booking page');
  el.innerHTML =
    '<div class="bld-top"><span class="logo">dialbridge<span>.</span>ai</span><div class="bld-prog" aria-hidden="true"><i></i><i></i><i></i><i></i></div><button class="bld-x" type="button" aria-label="Close">' + ic('<path d="M6 6l12 12M18 6 6 18"/>') + '</button></div>' +
    '<div class="bld-body">' +
    // 1 build
    '<section class="bstep" data-s="1"><div class="bbuild"><p class="eyebrow">Building your booking page</p><div class="bname" data-name></div><ul class="blist">' +
    ['Adding your business name and colors', 'Setting up your services', 'Adding price ranges customers see', 'Opening your schedule'].map(function (t) { return '<li><span class="dot">' + CHECK + '</span>' + t + '</li>'; }).join('') +
    '</ul></div></section>' +
    // 2 preview
    '<section class="bstep" data-s="2"><div class="bwrap bprev"><div class="bpv"><span class="tag2">Live preview</span><div class="card"><iframe title="Your booking page preview" id="bFrame"></iframe></div><p class="try"><i></i>It works. Tap through it like a customer would.</p></div>' +
    '<div class="bside"><div><p class="eyebrow">Your booking page</p><h2 style="margin-top:12px">Here it is, <span data-name></span>.</h2><p class="bsub">Make it yours. Changes show up right away.</p></div>' +
    '<label class="bfield">Business name<input id="bName" maxlength="60"></label>' +
    '<label class="bfield">What you do<select id="bTrade">' + Object.keys(TRADES).map(function (k) { return '<option value="' + k + '">' + TRADES[k] + '</option>'; }).join('') + '</select></label>' +
    '<div class="bfield">Brand color<div class="swatches" id="bSw">' + COLORS.map(function (c) { return '<button type="button" data-c="' + c + '" style="background:' + c + '" aria-label="Color ' + c + '"></button>'; }).join('') + '<label aria-label="Pick any color"><input type="color" id="bCol"></label></div></div>' +
    '<label class="bfield">Where you work<input id="bArea" placeholder="Bergen County, NJ" maxlength="60"><small>Shown to customers so they know you cover them.</small></label>' +
    '<div class="bcta"><button class="btn" type="button" data-go="3">Start my free 2-week trial <svg class="arw"><use href="#arw"/></svg></button><div class="bnote"><span>' + CHECK + 'We set it up for you</span><span>' + CHECK + 'Live in 48 hours</span><span>' + CHECK + 'No card needed</span></div></div>' +
    '</div></div></section>' +
    // 3 fit + plan
    '<section class="bstep" data-s="3"><div class="bnarrow"><p class="eyebrow">3 quick questions</p><h2 style="margin-top:12px">Let\'s set up your trial.</h2><p class="bsub">We set everything up for you. This tells us how.</p><div class="bq">' +
    '<div><h3>Do you have a website?</h3><div class="opts" data-q="site"><button class="opt" data-v="yes">Yes</button><button class="opt" data-v="no">No</button><button class="opt" data-v="old">Yes, but it\'s outdated</button></div></div>' +
    '<div><h3>About how many calls or quote requests do you get in a normal week?</h3><div class="opts" data-q="calls"><button class="opt" data-v="0">0 to 5</button><button class="opt" data-v="1">6 to 15</button><button class="opt" data-v="2">16 to 40</button><button class="opt" data-v="3">40+</button></div></div>' +
    '<div><h3>When you\'re on a job and a new call comes in, what usually happens?</h3><div class="opts" data-q="miss"><button class="opt" data-v="answer">I answer it</button><button class="opt" data-v="vm">It goes to voicemail</button><button class="opt" data-v="later">I call back later</button><button class="opt" data-v="office">Someone in the office answers</button></div></div>' +
    '<div id="bMgr" hidden><h3>Who takes care of your website?</h3><div class="opts" data-q="mgr"><button class="opt" data-v="me">I do</button><button class="opt" data-v="agency">A web company or freelancer</button><button class="opt" data-v="nobody">Nobody really</button></div><p class="bfine" style="margin-top:8px">So we know how to add your Book button. We never need your password to get you live: your booking link goes on Google, Facebook and Instagram on day one.</p></div>' +
    '</div><div class="brec" id="bRec"></div>' +
    '<div class="bnav"><button class="bback" type="button" data-go="2">Back</button><button class="btn" type="button" data-go="4" id="bTo4" disabled>Continue <svg class="arw"><use href="#arw"/></svg></button></div></div></section>' +
    // 4 contact
    '<section class="bstep" data-s="4"><div class="bnarrow"><p class="eyebrow">Last step</p><h2 style="margin-top:12px">Where should we send it?</h2><p class="bsub" id="bWhat"></p><form class="bform" id="bForm" novalidate>' +
    '<div class="two"><label class="bfield">First name<input id="fFirst" autocomplete="given-name" required></label><label class="bfield">Mobile<input id="fMobile" type="tel" inputmode="tel" autocomplete="tel" placeholder="(201) 555-0148" required></label></div>' +
    '<label class="bfield">Email<input id="fEmail" type="email" inputmode="email" autocomplete="email" placeholder="you@yourbusiness.com" required></label>' +
    '<label class="bfield" id="fUrlRow">Your website<input id="fUrl" inputmode="url" autocomplete="url" placeholder="yourbusiness.com"></label>' +
    '<p class="berr" id="bErr"></p>' +
    '<p class="bfine">By starting your trial you agree that DialBridge may call or text you about your setup. Message and data rates may apply. Reply STOP to opt out.</p>' +
    '<div class="bnav" style="margin-top:6px"><button class="bback" type="button" data-go="3">Back</button><button class="btn" type="submit" id="bSubmit">Start my free trial <svg class="arw"><use href="#arw"/></svg></button></div></form></div></section>' +
    // 5 done
    '<section class="bstep" data-s="5"><div class="bnarrow bdone"><div class="ok">' + CHECK + '</div><h2>You\'re in, <span data-first></span>.</h2><p class="bsub" id="bDoneSub"></p>' +
    '<ul class="btl" id="bTl"></ul><div class="bcta" style="position:static;background:none;border:0;padding:0;align-items:center"><a class="btn" id="bCall" target="_blank" rel="noopener">Pick a time for your setup call <svg class="arw"><use href="#arw"/></svg></a></div>' +
    '<p class="bdemo" id="bDemo" hidden>Draft page: this request was not sent anywhere yet.</p></div></section>' +
    '</div>';
  document.body.appendChild(el);

  var $ = function (s) { return el.querySelector(s); }, $$ = function (s) { return [].slice.call(el.querySelectorAll(s)); };
  var frame = $('#bFrame'), cur = 0, last = null, built = false;

  function enc(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function guessTrade(n) { n = n.toLowerCase(); return /clean|maid|janitor/.test(n) ? 'cleaning' : /detail|auto|car wash|mobile wash/.test(n) ? 'detailing' : /hvac|heat|cool|air|furnace|plumb/.test(n) ? 'hvac' : 'junk'; }
  function track(ev, data, custom, eventId) { try { if (window.fbq) window.fbq(custom ? 'trackCustom' : 'track', ev, data || {}, eventId ? { eventID: eventId } : undefined); } catch (e) { } try { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: 'dbx_' + ev }, data || {})); } catch (e) { } }

  // fit score: does this business already get enough demand for a booking widget to pay off?
  function fit() {
    var s = 0;
    s += { yes: 30, old: 20, no: 0 }[S.site] || 0;
    s += [0, 25, 35, 40][+S.calls] || 0;
    s += { vm: 25, later: 25, answer: 10, office: 5 }[S.miss] || 0;
    return s;   // 0 to 95
  }
  function tier() { var f = fit(); return f >= 60 ? 'A' : f >= 35 ? 'B' : 'C'; }
  // the widget only converts demand they already have: no site, an outdated site or very few calls -> the plan that builds demand
  function plan() { return S.site === 'yes' && S.calls !== '0' ? 'widget' : 'full'; }

  function show(n) {
    cur = n;
    $$('.bstep').forEach(function (s) { s.classList.toggle('on', +s.getAttribute('data-s') === n); });
    $$('.bld-prog i').forEach(function (p, i) { p.classList.toggle('done', i < Math.min(n, 5) - 1 || n === 5); });
    $('.bld-body').scrollTop = 0;
    if (n === 3) recUpdate(false);
    if (n === 4) { $('#fUrlRow').hidden = S.site === 'no'; $('#bWhat').textContent = plan() === 'widget' ? 'We\'ll text you to set up your Booking Widget. Your 2 weeks start when it goes live.' : 'We\'ll text you to set up your website, reviews and booking. Your 2 weeks start when it goes live.'; setTimeout(function () { $('#fFirst').focus(); }, 300); }
  }
  function names() { $$('[data-name]').forEach(function (n) { n.textContent = S.name; }); }
  var tReload = null;
  function preview(now) {
    clearTimeout(tReload);
    tReload = setTimeout(function () {
      frame.classList.add('fade');
      var cfg = { trade: S.trade, name: S.name, phone: S.phone || '(201) 555-0148', brand: S.brand, area: S.area || 'your area', zips: [] };
      frame.src = BASE + 'book.html?c=' + enc(cfg) + '&embed=1&inline=1';
      frame.onload = function () { setTimeout(function () { frame.classList.remove('fade'); }, 150); };
    }, now ? 0 : 450);
  }
  function swatch() { $$('#bSw button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-c').toLowerCase() === S.brand.toLowerCase()); }); }

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
    show(2); built = true;
    track('ViewContent', { content_name: 'booking_page_preview', content_category: S.trade });
  }

  function recUpdate(pulse) {
    $('#bMgr').hidden = !S.site || S.site === 'no';
    var ok = S.site && S.calls && S.miss && (S.site === 'no' || S.mgr);
    $('#bTo4').disabled = !ok;
    var full = plan() === 'full';
    var r = $('#bRec');
    r.innerHTML = '<span class="ic">' + (full ? ic('<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01"/>') : ic('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>')) + '</span>' +
      '<div><b>' + (full ? 'Website + Review Automation + Booking Widget' : 'Booking Widget') + '</b><span>' + (!S.site ? 'Answer above to see your plan.' : !full ? 'Goes on the website you already have.' : S.site === 'no' ? 'You need a site for customers to book on. We build it.' : S.calls === '0' ? 'More Google reviews and a site that ranks bring the calls first.' : 'We rebuild your site to book jobs, plus Google review requests.') + '</span></div>' +
      '<div class="pr">' + (full ? '$199' : '$99') + '<span style="font-size:13px;font-weight:600;color:var(--mute)">/mo</span><small>Free for 2 weeks</small></div>';
    if (pulse) { r.classList.remove('pulse'); r.offsetWidth; r.classList.add('pulse'); }
  }

  function digits(t) { return String(t).replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''); }
  function utm() { var q = new URLSearchParams(location.search), o = {}; ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'].forEach(function (k) { if (q.get(k)) o[k] = q.get(k); }); return o; }

  async function submit(e) {
    e.preventDefault();
    S.first = $('#fFirst').value.trim(); S.mobile = digits($('#fMobile').value); S.email = $('#fEmail').value.trim(); S.url = $('#fUrl').value.trim();
    var err = !S.first ? 'Please add your first name.' : S.mobile.length !== 10 ? 'Please add a 10-digit mobile number.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(S.email) ? 'Please add a valid email.' : '';
    var box = $('#bErr'); box.textContent = err; box.classList.toggle('on', !!err);
    if (err) return;
    var t = tier(), value = { A: 60, B: 25, C: 5 }[t];
    var payload = { business: S.name, trade: S.trade, brand: S.brand, area: S.area, website: S.url || null, hasWebsite: S.site, siteManagedBy: S.site === 'no' ? null : S.mgr, callsPerWeek: ['0-5', '6-15', '16-40', '40+'][+S.calls], whenOnAJob: S.miss, setup: S.setup, plan: plan(), fit: fit(), tier: t,
      firstName: S.first, mobile: S.mobile, email: S.email, consentText: $('.bfine').textContent, page: location.href, utm: utm(), submittedAt: new Date().toISOString() };
    var btn = $('#bSubmit');
    if (/^https:\/\//.test(SUBMIT_URL)) {
      btn.disabled = true; btn.firstChild.textContent = 'Starting your trial ';
      try {
        var r = await fetch(SUBMIT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!r.ok) throw new Error(r.status);
      } catch (x) {
        btn.disabled = false; btn.firstChild.textContent = 'Start my free trial ';
        box.textContent = 'That did not go through. Please try again, or text us at (916) 644-7495.'; box.classList.add('on'); return;
      }
    } else $('#bDemo').hidden = false;
    // every claim is a Lead (value by fit); good fits also fire QualifiedLead so ads can move to it once there is volume
    var evid = 'dbx-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8); payload.eventId = evid;   // same id goes to the server for CAPI dedupe
    track('Lead', { value: value, currency: 'USD', content_name: plan(), lead_tier: t }, false, evid);
    if (t !== 'C') track('QualifiedLead', { value: value, currency: 'USD', plan: plan(), lead_tier: t }, true);
    done();
  }

  function done() {
    $$('[data-first]').forEach(function (n) { n.textContent = S.first; });
    var dfy = S.setup === 'dfy', full = plan() === 'full';
    $('#bDoneSub').textContent = dfy ? 'We\'ll text you at the number you gave us within 1 business hour to set up ' + S.name + '.' : 'We\'ll text you a link to your setup page within 1 business hour.';
    var steps = dfy
      ? [['Today', 'A quick 15-minute call: your services, prices and hours.'], [full ? 'Within 5 days' : 'Within 48 hours', full ? 'Your new website and booking page go live, with review requests on.' : 'Your Book online button goes live on your website.'], ['Your 2 free weeks start', 'They start the day it goes live, so you see real bookings before you pay.'], ['Day 14', 'Keep it for ' + (full ? '$199' : '$99') + '/month, or cancel by text.']]
      : [['Today', 'We text you your setup link.'], ['10 minutes', 'Add your services and prices, then paste one line on your site.'], ['Your 2 free weeks start', 'They start the day it goes live.'], ['Day 14', 'Keep it for $99/month, or cancel by text.']];
    $('#bTl').innerHTML = steps.map(function (x) { return '<li><i></i><div><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></div></li>'; }).join('');
    var call = $('#bCall'); call.href = CALL_URL; call.parentNode.hidden = !dfy;
    show(5);
  }

  // events
  el.addEventListener('click', function (e) {
    var go = e.target.closest('[data-go]'); if (go && !go.disabled) { show(+go.getAttribute('data-go')); return; }
    var sw = e.target.closest('#bSw button'); if (sw) { S.brand = sw.getAttribute('data-c'); swatch(); preview(); return; }
    var o = e.target.closest('.opt');
    if (o) {
      var q = o.parentNode.getAttribute('data-q');
      [].forEach.call(o.parentNode.children, function (x) { x.classList.toggle('on', x === o); });
      S[q] = o.getAttribute('data-v');
      recUpdate(q === 'site' || q === 'calls');
    }
  });
  $('.bld-x').addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && el.classList.contains('on')) close(); });
  $('#bName').addEventListener('input', function (e) { S.name = e.target.value.trim() || 'Your Business'; names(); preview(); });
  $('#bTrade').addEventListener('change', function (e) { S.trade = e.target.value; preview(true); });
  $('#bCol').addEventListener('input', function (e) { S.brand = e.target.value; swatch(); preview(); });
  $('#bArea').addEventListener('input', function (e) { S.area = e.target.value.trim(); preview(); });
  $('#bForm').addEventListener('submit', submit);

  function open(name) {
    S.name = (name || '').trim() || 'Your Business'; S.trade = guessTrade(S.name);
    $('#bName').value = S.name; $('#bTrade').value = S.trade; swatch();
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
