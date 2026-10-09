/* DialBridge trial funnel. Runs as a demo (nothing saved, sent or charged) until ../dbx.js has an api URL;
   then sign-up, onboarding answers, plan choice and Stripe checkout go to the real backend (api/src/saas.js).
   #signup -> #onb/N (one question per screen, app-onboarding style) -> #plan (paywall, trial timeline)
   -> #checkout (Stripe Checkout look) -> #app/home (dashboard + setup guide) -> #app/widget (set up the widget).
   The Website plan is done-for-you, so choosing it sends the owner to book a setup call instead of checkout.
   State lives in localStorage under dbx_start so a refresh keeps your place. */
(function () {
  'use strict';
  var KEY = 'dbx_start';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var I = function (id, cls) { return '<svg class="i' + (cls ? ' ' + cls : '') + '"><use href="#' + id + '"/></svg>'; };
  function track(ev, data, custom, eventId) { try { if (window.fbq) window.fbq(custom ? 'trackCustom' : 'track', ev, Object.assign({ content_category: 'booking_widget' }, data || {}), eventId ? { eventID: eventId } : undefined); } catch (e) { } }
  var DBX = window.DBX || { api: '', inApp: false, attr: function () { return {}; } };
  if (DBX.inApp) document.documentElement.classList.add('inapp');
  var LIVE = !!DBX.api;                       // real backend configured
  var TOK = 'dbx_tok';
  function token() { try { return localStorage.getItem(TOK) || ''; } catch (e) { return ''; } }
  function setToken(t) { try { if (t) localStorage.setItem(TOK, t); else localStorage.removeItem(TOK); } catch (e) { } }
  // JSON call to the backend. Resolves { ok, status, body }; never throws on HTTP errors.
  function api(path, method, body) {
    var h = { 'Content-Type': 'application/json' }, t = token();
    if (t) h.Authorization = 'Bearer ' + t;
    return fetch(DBX.api.replace(/\/$/, '') + path, { method: method || 'GET', headers: h, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (b) { return { ok: r.ok, status: r.status, body: b }; }); })
      .catch(function () { return { ok: false, status: 0, body: { errors: ['network'] } }; });
  }
  var ACCT = null;   // the signed-in account from the backend (live mode)
  // Onboarding answers go to the backend as they happen, so a reload or a later visit resumes in place.
  function sync(fields) { if (!LIVE || !token()) return Promise.resolve(); return api('/v1/acct/me', 'PATCH', fields).then(function (r) { if (r.ok) ACCT = r.body.account; return r; }); }
  function fromAccount(a) {
    if (!a) return;
    ACCT = a;
    S.email = a.email || S.email; S.name = a.firstName || S.name; S.biz = a.businessName || S.biz; S.phone = a.phone || S.phone; S.trade = a.trade || S.trade;
    var an = a.answers || {}; ['mode', 'reach', 'calls', 'goal'].forEach(function (k) { if (an[k] !== undefined) S[k] = an[k]; }); if (an.trade_label) S.tradeLabel = an.trade_label;
    S.paid = a.subStatus === 'trialing' || a.subStatus === 'active' || a.subStatus === 'past_due';
    if (a.plan) S.plan = a.plan;
    save();
  }

  var S = { email: '', name: '', phone: '', biz: '', area: '', trade: '', tradeLabel: '', mode: '', reach: [], miss: '', calls: '', goal: '', plan: 'widget', paid: false, widgetDone: false, brand: '#0E6650', logo: null, svc: {}, days: [1, 2, 3, 4, 5, 6], open: '08:00', close: '18:00' };
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { }
  var q0 = new URLSearchParams(location.search).get('biz'); if (q0 && !S.biz) S.biz = q0.slice(0, 60);
  // ?preview=1: a read-only live dashboard with sample data, used as the product shot on the sign-up page
  var PREVIEW = /[?&]preview=1/.test(location.search);
  if (PREVIEW) {
    S = { email: 'matt@haulpros.com', name: 'Matt', biz: 'Haul Pros Junk Removal', area: 'Bergen County, NJ', trade: 'junk', reach: ['calls'], miss: 'vm', calls: '1', goal: 'jobs', plan: 'widget', paid: true, widgetDone: true, brand: '#0E6650', logo: null, svc: {}, days: [1, 2, 3, 4, 5, 6], open: '08:00', close: '18:00' };
    document.documentElement.classList.add('preview');
  }
  function save() { if (PREVIEW) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
  var first = function () { return (S.name || 'there').split(' ')[0]; };
  var BIZ = function () { return S.biz || 'Your business'; };
  var price = function () { return S.plan === 'full' ? 199 : 99; };
  var END = new Date(Date.now() + 14 * 864e5), REMIND = new Date(Date.now() + 12 * 864e5);
  var md = function (d) { return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }); };

  function toast(t) { var el = $('#toast'); $('#toastTx').textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove('on'); }, 2400); }
  function modal(html) { $('#modalBox').innerHTML = html; $('#modal').hidden = false; }
  document.addEventListener('click', function (e) { var u = e.target.closest('[data-upgrade]'); if (u) { track('UpgradeClick', { from: 'reviews' }, true); if (window.DBXBuild) window.DBXBuild.open(S.biz || ''); return; } });
  document.addEventListener('click', function (e) { var a = e.target.closest('[data-setupcall]'); if (a && !DBX.setupCallUrl) { e.preventDefault(); toast('Demo: the setup call calendar is not connected yet'); } else if (a) track('SetupCallClick', {}, true); });
  $('#modal').addEventListener('click', function (e) { if (e.target.id === 'modal' || e.target.closest('[data-close]')) $('#modal').hidden = true; });

  /* ---------------- router ---------------- */
  function show(id) { $$('.view').forEach(function (v) { v.classList.toggle('on', v.id === id); }); scrollTo(0, 0); }
  function route() {
    var h = (location.hash || '#signup').slice(1), parts = h.split('/');
    if (LIVE && !token() && parts[0] !== 'signup' && parts[0] !== 'login') { location.hash = '#signup'; return; }
    if (parts[0] === 'app' && !S.paid) { location.hash = S.trade ? '#plan' : '#signup'; return; }
    if (parts[0] === 'signup' || parts[0] === 'login') { show('v-signup'); authView(parts[0] === 'login' ? 'login' : 'signup'); }
    else if (parts[0] === 'onb') { show('v-onb'); onb(+parts[1] || 0); }
    else if (parts[0] === 'plan') { show('v-plan'); paywall(); }
    else if (parts[0] === 'checkout') { show('v-checkout'); checkout(); }
    else if (parts[0] === 'app') { show('v-app'); app(parts[1] || (S.widgetDone ? 'home' : 'setup')); }
    else location.hash = '#signup';
  }
  addEventListener('hashchange', route);
  // Back from Stripe (success URL has ?paid=1): the webhook switches the trial on, usually within seconds.
  function waitForTrial(tries) {
    api('/v1/acct/me').then(function (r) {
      if (r.ok) fromAccount(r.body.account);
      if (S.paid) {
        $('#modal').hidden = true;
        try { history.replaceState(null, '', location.pathname + '#app/home'); } catch (e) { }
        if (!S.trialTracked) { S.trialTracked = true; save(); track('StartTrial', { value: 50, currency: 'USD', predicted_ltv: 600, content_name: 'widget_plan_99' }, false, ACCT ? 'st_' + ACCT.id : undefined); }
        location.hash = '#app/setup'; return;
      }
      if (tries > 15) { modal('<h3>Almost there</h3><p>Your payment went through, and we\'re still switching your account on. Refresh in a minute, or text us and we\'ll sort it out.</p><button class="btn" type="button" data-close>OK</button>'); return; }
      setTimeout(function () { waitForTrial(tries + 1); }, 2000);
    });
  }

  /* ---------------- 1. sign up / log in ---------------- */
  var GOOGLE_DEMO = { name: 'Matt Korsun', email: 'matt@haulpros.com' };
  var ERR = {
    firstName: 'Please add your first name.', email: 'Please enter a valid email.', password: 'Use at least 8 characters for your password.',
    account_exists: 'There\'s already an account with this email. Log in instead.', wrong_login: 'That email and password don\'t match.',
    no_password: 'This account signs in with Google. Use Continue with Google, or reset your password.', locked: 'Too many tries. Wait 15 minutes, or reset your password.',
    wrong_code: 'That code isn\'t right. Check the email and try again.', code_expired: 'That code has expired. Send a new one.', too_many_tries: 'Too many tries. Send a new code.',
    wait: 'Give it 30 seconds before asking for another code.', network: 'We couldn\'t reach the server. Check your connection and try again.', slow_down: 'Too many tries. Wait a minute and try again.'
  };
  function errText(r) { var e = (r.body && r.body.errors) || []; return e.map(function (k) { return ERR[k] || ''; }).filter(Boolean)[0] || 'Something went wrong. Please try again.'; }
  function showErr(id, t) { var el = $(id); el.textContent = t || ''; el.classList.toggle('on', !!t); }
  function busy(btn, on) { btn.classList.toggle('busy', on); btn.disabled = on; }

  function authView(v) {
    $('#authForm').hidden = v !== 'signup'; $('#loginForm').hidden = v !== 'login'; $('#resetForm').hidden = v !== 'reset';
    // Google sign-in is blocked inside the Facebook / Instagram browser: hide it there and point at the app's menu instead.
    var g = !DBX.inApp && (!LIVE || !!DBX.googleClientId);
    $('#gWrap').hidden = !g;
    $('#iabHint').hidden = !(DBX.inApp && v === 'signup' && (!LIVE || !!DBX.googleClientId));
  }
  $('#v-signup').addEventListener('click', function (e) {
    var t = e.target.closest('[data-auth]'); if (t) { var v = t.getAttribute('data-auth'); if (v === 'reset') authView('reset'); else location.hash = '#' + v; return; }
    var pt = e.target.closest('.pw-t'); if (pt) { var inp = pt.parentNode.querySelector('input'), show = inp.type === 'password'; inp.type = show ? 'text' : 'password'; pt.classList.toggle('on', show); pt.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); }
  });

  // After any sign-in: keep the token, load the account, and go where they left off.
  function signedIn(r, created) {
    setToken(r.body.token); fromAccount(r.body.account);
    if (created) track('AccountCreated', { method: r.method || 'email' }, true);
    var a = r.body.account;
    if (S.paid) location.hash = S.widgetDone ? '#app/home' : '#app/setup';
    else if (a.stage === 'saw_plans' || a.plan) location.hash = '#plan';
    else location.hash = '#onb/0';
  }

  $('#signupForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#suName').value.trim(), email = $('#suEmail').value.trim(), pw = $('#suPw').value;
    if (!name) return showErr('#suErr', ERR.firstName);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showErr('#suErr', ERR.email);
    if (pw.length < 8) return showErr('#suErr', ERR.password);
    showErr('#suErr', '');
    if (!LIVE) { S.name = name; S.email = email; save(); track('AccountCreated', { method: 'email' }, true); location.hash = '#onb/0'; return; }
    var b = $('#suBtn'); busy(b, true);
    api('/v1/acct/signup', 'POST', Object.assign({ firstName: name, email: email, password: pw, biz: S.biz }, DBX.attr())).then(function (r) {
      busy(b, false);
      if (!r.ok) return showErr('#suErr', errText(r));
      S.name = name; signedIn(r, true);
    });
  });

  $('#liForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = $('#liEmail').value.trim(), pw = $('#liPw').value;
    if (!email || !pw) return showErr('#liErr', ERR.wrong_login);
    if (!LIVE) { location.hash = S.paid ? '#app/home' : '#plan'; return; }
    var b = $('#liBtn'); busy(b, true);
    api('/v1/acct/login', 'POST', Object.assign({ email: email, password: pw }, DBX.attr())).then(function (r) { busy(b, false); if (!r.ok) return showErr('#liErr', errText(r)); signedIn(r, false); });
  });

  // Password reset: email -> 6-digit code + new password
  $('#code').innerHTML = [0, 1, 2, 3, 4, 5].map(function (i) { return '<input inputmode="numeric" maxlength="1" aria-label="Digit ' + (i + 1) + '"' + (i ? '' : ' autocomplete="one-time-code"') + '>'; }).join('');
  var boxes = $$('#code input'), code = function () { return boxes.map(function (b) { return b.value; }).join(''); };
  boxes.forEach(function (b, i) {
    b.addEventListener('input', function () {
      var d = b.value.replace(/\D/g, '');
      if (d.length > 1) d.split('').slice(0, 6 - i).forEach(function (c, k) { if (boxes[i + k]) boxes[i + k].value = c; }); else b.value = d;
      var nx = boxes[Math.min(5, i + Math.max(1, d.length))]; if (d && nx) nx.focus();
      if (code().length === 6) $('#rsPw').focus();
    });
    b.addEventListener('keydown', function (e) { if (e.key === 'Backspace' && !b.value && i) boxes[i - 1].focus(); });
  });
  function sendReset() {
    var email = $('#rsEmail').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showErr('#rsErr', ERR.email);
    showErr('#rsErr', '');
    var go = function () { $('#rsLead').innerHTML = 'If there\'s an account for <b>' + esc(email) + '</b>, we just sent it a 6-digit code. It works for 10 minutes.'; $('#rsEmailForm').hidden = true; $('#rsCodeForm').hidden = false; $('#resend').hidden = false; boxes[0].focus(); };
    if (!LIVE) return go();
    api('/v1/acct/code', 'POST', { email: email, purpose: 'reset' }).then(function (r) { if (!r.ok && r.status !== 429) return showErr('#rsErr', errText(r)); go(); });
  }
  $('#rsEmailForm').addEventListener('submit', function (e) { e.preventDefault(); sendReset(); });
  $('#resend').addEventListener('click', function () { sendReset(); this.textContent = 'Code sent again'; });
  $('#rsCodeForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (code().length !== 6) return showErr('#rsErr', ERR.wrong_code);
    if ($('#rsPw').value.length < 8) return showErr('#rsErr', ERR.password);
    if (!LIVE) { toast('Demo: password not changed'); authView('login'); return; }
    var b = $('#rsBtn'); busy(b, true);
    api('/v1/acct/reset', 'POST', { email: $('#rsEmail').value.trim(), code: code(), password: $('#rsPw').value }).then(function (r) { busy(b, false); if (!r.ok) return showErr('#rsErr', errText(r)); signedIn(r, false); });
  });

  // Google: demo button in demo mode; Google's own button when a client ID is set (normal browsers only).
  $('#gSign').addEventListener('click', function () {
    if (LIVE) return;
    S.name = S.name || GOOGLE_DEMO.name; S.email = S.email || GOOGLE_DEMO.email; save(); track('AccountCreated', { method: 'google' }, true); location.hash = '#onb/0';
  });
  if (LIVE && DBX.googleClientId && !DBX.inApp) {
    var gs = document.createElement('script'); gs.src = 'https://accounts.google.com/gsi/client'; gs.async = true;
    gs.onload = function () {
      try {
        window.google.accounts.id.initialize({ client_id: DBX.googleClientId, callback: function (res) {
          api('/v1/acct/google', 'POST', Object.assign({ credential: res.credential, biz: S.biz }, DBX.attr())).then(function (r) {
            if (!r.ok) return showErr('#suErr', errText(r));
            r.method = 'google'; signedIn(r, r.status === 201);
          });
        } });
        var holder = document.createElement('div'); holder.id = 'gBtn'; $('#gSign').replaceWith(holder);
        window.google.accounts.id.renderButton(holder, { theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', width: Math.min(380, holder.parentNode.clientWidth || 380) });
      } catch (e) { }
    };
    document.head.appendChild(gs);
  }

  /* ---------------- 2. onboarding (one question per screen) ---------------- */
  // Trade: they type it (any business works); the chips are shortcuts. The key picks a starting template.
  var TRADES = [['junk', 'Junk removal', 'truck'], ['cleaning', 'House cleaning', 'spark'], ['detailing', 'Mobile detailing', 'car'], ['hvac', 'Heating and cooling', 'fan'], ['other', 'Something else', 'dots']];
  var TRADE_CHIPS = ['Junk removal', 'House cleaning', 'Mobile detailing', 'Pressure washing', 'Landscaping', 'HVAC', 'Plumbing', 'Handyman', 'Moving', 'Painting', 'Pest control', 'Barbershop'];
  function tradeKey(label) {
    var t = String(label || '').toLowerCase();
    if (/junk|haul|clean ?out|dumpster|debris/.test(t)) return 'junk';
    if (/detail|car wash|ceramic|tint/.test(t)) return 'detailing';
    if (/clean|maid|janitor/.test(t)) return 'cleaning';
    if (/hvac|heat|cool|air cond|furnace/.test(t)) return 'hvac';
    return 'other';
  }
  // How the booking page works depends on how they price: set prices, quotes after seeing the job, or time slots.
  var MODES = [['priced', 'I have set prices or price ranges', 'Customers pick the job and see the price before they book', 'tag'],
    ['estimate', 'I quote after I see the job', 'Customers send details and photos, you send the price', 'msg'],
    ['appointments', 'Customers book a time with me', 'Like a haircut or a detail: pick a service and a time slot', 'clock'],
    ['mix', 'A mix of these', 'Some jobs have a price, bigger ones get a quote', 'dots']];
  var STEPS = [
    { k: 'phone', type: 'phone', t: 'Where should we text you when a customer books?', p: 'You get a text the second someone books, with the job, the time and the price they saw.' },
    { k: 'biz', type: 'biz', t: 'What\'s your business called?', p: 'We\'ll use it on your booking page. If you\'re on Google, we\'ll find you.' },
    { k: 'tradeLabel', type: 'trade', t: 'What kind of work do you do?', p: 'Type it in your own words, or tap one.' },
    { k: 'mode', type: 'one', t: 'How do customers usually get a price from you?', p: 'This sets up how your booking page works. You can change it later.', o: MODES },
    { k: 'reach', type: 'multi', t: 'How do customers reach you today?', p: 'Pick all that apply.', o: [['calls', 'Phone calls', '', 'phone'], ['texts', 'Text messages', '', 'msg'], ['site', 'A form on my website', '', 'globe'], ['google', 'My Google profile', '', 'pin'], ['social', 'Facebook or Instagram', '', 'msg'], ['apps', 'Thumbtack, Angi or Yelp', '', 'dots']] },
    { k: 'insight', type: 'insight' },
    { k: 'calls', type: 'one', t: 'About how many new customers reach out in a normal week?', p: 'Calls, texts, messages and website forms together. A ballpark is fine.', o: [['0', '0 to 5'], ['1', '6 to 15'], ['2', '16 to 40'], ['3', 'More than 40']] },
    { k: 'goal', type: 'one', t: 'What do you want most right now?', p: 'We\'ll set up your dashboard around it.', o: [['jobs', 'More booked jobs', 'Turn more visitors and callers into jobs', 'cal'], ['missed', 'Stop losing missed calls', 'Catch the ones that go to voicemail', 'phone'], ['reviews', 'More Google reviews', 'Ask every happy customer, automatically', 'star'], ['time', 'Less time on the phone', 'Let customers price and book themselves', 'msg']] },
    { k: 'build', type: 'build' },
    { k: 'ready', type: 'ready' }
  ];
  function opt(o, on, multi) {
    return '<button type="button" class="opt' + (multi ? ' multi' : '') + (on ? ' on' : '') + '" data-v="' + o[0] + '">' + (o[3] ? '<span class="oi">' + I(o[3]) + '</span>' : '') +
      '<span class="ot">' + esc(o[1]) + (o[2] ? '<small>' + esc(o[2]) + '</small>' : '') + '</span><span class="ck">' + I('chk') + '</span></button>';
  }
  var onbIdx = 0, buildRun = 0;
  function onb(i) {
    var list = STEPS, s = list[i]; if (!s) { location.hash = '#plan'; return; }
    onbIdx = i;
    $('#onbBar').style.width = Math.round((i + 1) / (list.length + 1) * 86) + '%';
    $('#onbBack').style.visibility = i > 0 && s.type !== 'build' ? 'visible' : 'hidden';
    var m = $('#onbMain'), h = '<div class="q">';
    if (s.type === 'phone') h += '<p class="k">Welcome, ' + esc(first()) + '</p><h1>' + s.t + '</h1><p>' + s.p + '</p><div class="opts"><input class="in" id="qIn" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="(201) 555-0142" value="' + esc(fmtPhone(S.phone)) + '" style="height:56px;font-size:18px"></div>' +
      act(!phoneOk(S.phone)) + '<p class="consent">By continuing you agree to texts from DialBridge about your bookings, your account and finishing setup. Msg and data rates may apply. Reply STOP to opt out.</p>';
    else if (s.type === 'text') h += '<h1>' + s.t + '</h1><p>' + s.p + '</p><div class="opts"><input class="in" id="qIn" autocomplete="' + s.auto + '" placeholder="' + s.ph + '" value="' + esc(S[s.k]) + '" style="height:56px;font-size:18px"></div>' + act(!S[s.k]);
    else if (s.type === 'biz') h += '<h1>' + s.t + '</h1><p>' + s.p + '</p><div class="opts" style="gap:0"><input class="in" id="qIn" autocomplete="organization" placeholder="Haul Pros Junk Removal" value="' + esc(S.biz) + '" style="height:56px;font-size:18px"><div class="sugg" id="sugg" hidden></div>' +
      '<div class="bizcard" id="bizcard"' + (S.area ? '' : ' hidden') + '><span class="pin">' + I('pin') + '</span><div><b id="bcN">' + esc(S.biz) + '</b><span id="bcA">' + esc(S.area) + '</span></div><span class="ok">Found on Google</span></div></div>' + act(!S.biz);
    else if (s.type === 'trade') {
      var tl = S.tradeLabel || '';
      h += '<h1>' + s.t + '</h1><p>' + s.p + '</p><div class="opts" style="gap:0"><input class="in" id="qIn" autocomplete="off" placeholder="For example: junk removal" value="' + esc(tl) + '" style="height:56px;font-size:18px"></div>' +
        '<div class="chips2" id="tChips">' + TRADE_CHIPS.map(function (c) { return '<button type="button" data-t="' + esc(c) + '"' + (c.toLowerCase() === tl.toLowerCase() ? ' class="on"' : '') + '>' + esc(c) + '</button>'; }).join('') + '</div>' + act(!tl);
    }
    else if (s.type === 'one' || s.type === 'multi') {
      var cur = S[s.k], multi = s.type === 'multi';
      h += '<p class="k">' + (multi ? 'Pick all that apply' : 'Pick one') + '</p><h1>' + s.t + '</h1>' + (s.p ? '<p>' + s.p + '</p>' : '') +
        '<div class="opts' + (s.grid ? ' grid' : '') + '" id="qOpts">' + s.o.map(function (o) { return opt(o, multi ? cur.indexOf(o[0]) > -1 : cur === o[0], multi); }).join('') + '</div>' + (multi ? act(!cur.length) : '');
    }
    else if (s.type === 'insight') {
      h += '<p class="k">Good to know</p><h1>Customers book when it suits them, not when you can pick up.</h1>' +
        '<div class="insight"><div class="big">41%</div><p>of online bookings come in after hours, when nobody is answering the phone.</p><div class="clock">' + Array.apply(null, Array(24)).map(function (_, hr) { var ah = hr < 8 || hr >= 18, v = [3, 2, 1, 1, 1, 2, 4, 6, 7, 8, 9, 9, 8, 9, 9, 8, 8, 9, 10, 11, 12, 11, 9, 6][hr]; return '<i class="' + (ah ? 'ah' : '') + '" style="height:' + v * 8 + '%"></i>'; }).join('') + '</div><div class="clock-l"><span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span></div>' +
        '<small>Orange: requests that arrive outside 8 AM to 6 PM. Published data from large home-service booking platforms.</small></div>' +
        '<p style="margin-top:18px">Your booking page takes those requests while you work or sleep, with your prices and your schedule.</p>' + act(false);
    }
    else if (s.type === 'build') {
      var tr = (S.tradeLabel || 'your').toLowerCase();
      var items = ['Creating ' + BIZ() + '\'s account', S.mode === 'estimate' ? 'Setting up estimate requests with photos' : S.mode === 'appointments' ? 'Setting up ' + tr + ' appointments' : 'Adding ' + tr + ' services and prices', 'Opening your schedule for after-hours booking', 'Connecting your lead inbox', 'Preparing your dashboard'];
      h += '<div class="building"><div class="ring"><svg viewBox="0 0 140 140"><circle class="t" cx="70" cy="70" r="60"/><circle class="p" id="ringP" cx="70" cy="70" r="60"/></svg><b id="ringN">0%</b></div><h1 style="margin-top:22px;text-align:center">Setting up ' + esc(BIZ()) + '</h1><ul class="blist" id="blist">' + items.map(function (t) { return '<li><i>' + I('chk') + '</i>' + esc(t) + '</li>'; }).join('') + '</ul></div>';
    }
    else if (s.type === 'ready') {
      var full = recommend() === 'full', tlab = (S.tradeLabel || 'your').toLowerCase();
      var how = S.mode === 'estimate' ? ['Estimate requests with photos', 'Customers send the job and photos. You reply with a price.']
        : S.mode === 'appointments' ? ['Online appointments', 'Customers pick a service and an open time slot.']
        : S.mode === 'mix' ? ['Prices for small jobs, quotes for big ones', 'Each service can show a price or ask for an estimate.']
        : ['Your services and prices up front', 'Customers see the price before they book.'];
      var rows = [
        ['moon', 'Bookings around the clock', 'Including the 41% that come in after hours.'],
        [S.mode === 'estimate' ? 'msg' : 'cal', how[0], how[1]],
        ['phone', 'A text the second someone books', 'With the job, the time and their number.'],
        [S.reach.indexOf('google') > -1 || S.reach.indexOf('social') > -1 ? 'pin' : 'globe', S.reach.indexOf('google') > -1 || S.reach.indexOf('social') > -1 ? 'On Google, Facebook and Instagram' : 'On your website and Google profile', 'One link works everywhere customers find you.']
      ];
      if (S.goal === 'reviews' || full) rows.push(['star', 'Automatic Google review requests', 'Included in Website + Reviews + Booking Widget.']);
      h += '<p class="k">Your plan is ready</p><h1>Here\'s how ' + esc(BIZ()) + ' books more ' + (S.mode === 'appointments' ? 'appointments' : 'jobs') + '</h1>' +
        '<div class="plan2"><div class="p2-head"><span class="p2-av">' + esc((BIZ()[0] || 'D').toUpperCase()) + '</span><div><b>' + esc(BIZ()) + '</b><span>' + esc(S.tradeLabel || 'Booking page') + '</span></div><span class="p2-tag">Ready to set up</span></div>' +
        '<ul>' + rows.map(function (r) { return '<li><span class="p2-i">' + I(r[0]) + '</span><div><b>' + esc(r[1]) + '</b><span>' + esc(r[2]) + '</span></div></li>'; }).join('') + '</ul>' +
        '<div class="p2-foot"><span>' + I('chk') + '14 days free</span><span>' + I('chk') + 'No setup fee</span><span>' + I('chk') + 'Cancel anytime</span></div></div>' + act(false, 'See my plan');
    }
    h += '</div>'; m.innerHTML = h;
    var inp = $('#qIn'); if (inp) setTimeout(function () { inp.focus(); }, 60);
    if (s.type === 'build') runBuild();
    if (s.type === 'biz') bizSearch();
    track('OnboardingStep', { step: s.k }, true);
  }
  function act(disabled, label) { return '<div class="q-actions"><span></span><button class="btn dark" type="button" id="qNext"' + (disabled ? ' disabled' : '') + '>' + (label || 'Continue') + ' ' + I('arw') + '</button></div>'; }
  function phoneOk(v) { var d = String(v || '').replace(/\D/g, ''); if (d.length === 11 && d[0] === '1') d = d.slice(1); return /^[2-9]\d{2}[2-9]\d{6}$/.test(d); }
  function fmtPhone(v) { var d = String(v || '').replace(/\D/g, ''); if (d.length === 11 && d[0] === '1') d = d.slice(1); return d.length === 10 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : (v || ''); }
  // What each answer is called on the backend.
  function syncStep(s) {
    if (s.k === 'phone') return sync({ phone: S.phone, smsConsent: true, step: 'phone', tz: (DBX.attr().tz || undefined) });
    if (s.k === 'biz') return sync({ businessName: S.biz, step: 'biz' });
    if (s.k === 'tradeLabel') return sync({ trade: S.trade, answers: { trade_label: S.tradeLabel }, step: 'tradeLabel' });
    if (['mode', 'reach', 'calls', 'goal'].indexOf(s.k) > -1) { var o = {}; o[s.k] = S[s.k]; return sync({ answers: o, step: s.k }); }
  }
  function next() {
    var s = STEPS[onbIdx];
    if (s.type === 'text' || s.type === 'biz') { S[s.k] = $('#qIn').value.trim(); }
    if (s.type === 'trade') { S.tradeLabel = $('#qIn').value.trim().slice(0, 40); if (!S.tradeLabel) return; S.trade = tradeKey(S.tradeLabel); }
    if (s.type === 'phone') { var v = $('#qIn').value; if (!phoneOk(v)) return; S.phone = v.replace(/\D/g, '').slice(-10); }
    save(); syncStep(s); location.hash = '#onb/' + (onbIdx + 1);
  }
  $('#onbBack').addEventListener('click', function () { var i = onbIdx - 1; while (i > 0 && STEPS[i].type === 'build') i--; location.hash = '#onb/' + Math.max(0, i); });
  $('#onbMain').addEventListener('input', function (e) {
    if (e.target.id !== 'qIn') return;
    var b = $('#qNext'); if (b) b.disabled = STEPS[onbIdx].type === 'phone' ? !phoneOk(e.target.value) : !e.target.value.trim();
    if (STEPS[onbIdx].type === 'trade') { var v = e.target.value.trim().toLowerCase(); $$('#tChips button').forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-t').toLowerCase() === v); }); }
  });
  $('#onbMain').addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'qIn' && e.target.value.trim()) { e.preventDefault(); next(); } });
  $('#onbMain').addEventListener('click', function (e) {
    if (e.target.closest('#qNext')) {
      if (STEPS[onbIdx].type === 'ready') {
        S.plan = recommend(); save();
        if (!S.registered) { S.registered = true; save(); track('CompleteRegistration', { content_name: 'onboarding_done', status: true }, false, ACCT ? 'reg_' + ACCT.id : undefined); }
        sync({ step: 'done' });
        location.hash = '#plan';
      } else next();
      return;
    }
    var tc = e.target.closest('#tChips button');
    if (tc) { $('#qIn').value = tc.getAttribute('data-t'); $$('#tChips button').forEach(function (c) { c.classList.toggle('on', c === tc); }); $('#qNext').disabled = false; setTimeout(next, reduce ? 0 : 220); return; }
    var o = e.target.closest('.opt'); if (!o) return;
    var s = STEPS[onbIdx], v = o.getAttribute('data-v');
    if (s.type === 'multi') { var a = S[s.k], i = a.indexOf(v); if (i > -1) a.splice(i, 1); else a.push(v); o.classList.toggle('on'); $('#qNext').disabled = !a.length; save(); return; }
    S[s.k] = v; $$('.opt', o.parentNode).forEach(function (x) { x.classList.toggle('on', x === o); }); save();
    setTimeout(next, reduce ? 0 : 280);
  });
  // business search: the typed name always works; Google suggestions appear when a Places key is configured
  function bizSearch() {
    var inp = $('#qIn'), sug = $('#sugg'), key = window.DBX_PLACES_KEY || '', t = null;
    inp.addEventListener('input', function () {
      $('#bizcard').hidden = true; S.area = '';
      clearTimeout(t); var q = inp.value.trim();
      if (!key || q.length < 3) { sug.hidden = true; return; }
      t = setTimeout(function () {
        fetch('https://places.googleapis.com/v1/places:autocomplete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key }, body: JSON.stringify({ input: q, includedRegionCodes: ['us'] }) })
          .then(function (r) { return r.json(); }).then(function (d) {
            var list = (d.suggestions || []).filter(function (x) { return x.placePrediction; }).slice(0, 4).map(function (x) { var p = x.placePrediction.structuredFormat || {}; return { n: (p.mainText || {}).text, a: (p.secondaryText || {}).text || '' }; });
            sug.innerHTML = list.map(function (x) { return '<button type="button" data-n="' + esc(x.n) + '" data-a="' + esc(x.a) + '"><b>' + esc(x.n) + '</b><span>' + esc(x.a) + '</span></button>'; }).join('');
            sug.hidden = !list.length;
          }).catch(function () { sug.hidden = true; });
      }, 220);
    });
    sug.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; inp.value = b.getAttribute('data-n'); S.biz = inp.value; S.area = b.getAttribute('data-a'); $('#bcN').textContent = S.biz; $('#bcA').textContent = S.area; $('#bizcard').hidden = false; sug.hidden = true; $('#qNext').disabled = false; save(); });
  }
  function runBuild() {
    var id = ++buildRun, p = $('#ringP'), n = $('#ringN'), lis = $$('#blist li'), t0 = performance.now(), D = reduce ? 600 : 4200;
    (function f(now) {
      if (id !== buildRun) return;
      var k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 2);
      p.style.strokeDashoffset = 377 * (1 - e); n.textContent = Math.round(e * 100) + '%';
      lis.forEach(function (li, i) { li.classList.toggle('ok', e >= (i + 1) / (lis.length + .4)); });
      if (k < 1) requestAnimationFrame(f); else setTimeout(function () { if (id === buildRun && location.hash.indexOf('#onb/') === 0) location.hash = '#onb/' + (onbIdx + 1); }, 450);
    })(t0);
  }
  function recommend() { return S.calls === '0' || S.goal === 'reviews' ? 'full' : 'widget'; }

  /* ---------------- 3. paywall ---------------- */
  function paywall() {
    $$('.pcard').forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-plan') === S.plan); });
    $$('[data-badge]').forEach(function (b) { b.hidden = b.getAttribute('data-badge') !== recommend(); });
    var full = S.plan === 'full';
    $('#tlRemind').textContent = md(REMIND); $('#tlCharge').textContent = md(END);
    $('#tlChargeTx').textContent = 'You\'re charged $' + price() + '. Cancel anytime before, in one click.';
    $('#toCheckout').innerHTML = (full ? 'Book my setup call ' : 'Start my free trial ') + I('arw');
    $('#pwFine').textContent = full ? 'Your 14 days start when your new site goes live. Then $199/month.' : '$0 due today. Then $99/month. Cancel anytime.';
    track('ViewContent', { content_name: 'paywall' });
  }
  $('#plans').addEventListener('click', function (e) { var c = e.target.closest('.pcard'); if (!c) return; S.plan = c.getAttribute('data-plan'); save(); paywall(); });
  $('#toCheckout').addEventListener('click', function () {
    var btn = this;
    if (S.plan !== 'full') track('InitiateCheckout', { value: 99, currency: 'USD', content_name: 'widget_plan_99' });
    var fallback = function (r) {
      if (S.plan === 'full') {
        if (r && r.body && r.body.callUrl) { location.href = r.body.callUrl; return; }
        if (window.DBXBuild) { window.DBXBuild.open(S.biz || ''); return; }
        location.href = '../product/?call=1&biz=' + encodeURIComponent(S.biz || ''); return;
      }
      location.hash = '#checkout';
    };
    if (!LIVE) return fallback();
    busy(btn, true);
    api('/v1/acct/plan', 'POST', Object.assign({ plan: S.plan }, DBX.attr())).then(function (r) {
      busy(btn, false);
      if (r.ok && r.body.checkoutUrl) { location.href = r.body.checkoutUrl; return; }   // Stripe's own page
      fallback(r);
    });
  });

  /* ---------------- 4. checkout (Stripe Checkout look; no real payment) ---------------- */
  function checkout() {
    var p = '$' + price() + '.00';
    $('#coTry').textContent = 'Try ' + (S.plan === 'full' ? 'Website + Reviews + Booking Widget' : 'Booking Widget');
    $('#coThen').textContent = 'Then ' + p + ' per month starting ' + END.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    $('#coItem').textContent = S.plan === 'full' ? 'Website + Reviews + Booking Widget' : 'Booking Widget';
    $('#coItemThen').textContent = p + ' / month after'; $('#coSub').textContent = p; $('#coAfter').textContent = p;
    $('#coEmail').value = S.email || ''; $('#coName').value = S.name || '';
    var b = $('#coPay'); b.classList.remove('busy', 'done'); $('.tx', b).textContent = 'Start trial';
  }
  $('#coBack').addEventListener('click', function () { location.hash = '#plan'; });
  $('#coCard').addEventListener('input', function (e) { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '); });
  $('#coExp').addEventListener('input', function (e) { var d = e.target.value.replace(/\D/g, '').slice(0, 4); e.target.value = d.length > 2 ? d.slice(0, 2) + ' / ' + d.slice(2) : d; });
  function pay() {
    var b = $('#coPay'); b.classList.add('busy');
    setTimeout(function () {
      b.classList.remove('busy'); b.classList.add('done'); $('.tx', b).textContent = '✓';
      S.paid = true; save(); track('StartTrial', { value: price(), currency: 'USD', predicted_ltv: price() * 6 });
      setTimeout(function () { location.hash = '#app/setup'; }, 700);
    }, reduce ? 200 : 1500);
  }
  $('#coPay').addEventListener('click', pay); $('#payLink').addEventListener('click', pay); $('#payApple').addEventListener('click', pay);
  function welcome() { location.hash = '#app/setup'; }
  function welcomeOld() {
    modal('<div class="okc">' + I('chk') + '</div><h3>Your free trial has started</h3><p>Welcome to DialBridge, ' + esc(first()) + '. Next, set up your booking widget. It takes about 10 minutes.</p><a class="btn" href="#app/widget" data-close>Set up my booking widget ' + I('arw') + '</a><p style="margin-top:10px;font-size:14px">Rather have us do it with you? <a href="' + esc(DBX.setupCallUrl || '#') + '" data-setupcall' + (DBX.setupCallUrl ? ' target="_blank" rel="noopener"' : '') + '>Book a free setup call</a></p><p style="margin-top:12px;font-size:13px">Trial ends ' + md(END) + '. We remind you on ' + md(REMIND) + '.</p>');
  }

  /* ---------------- 5. app ---------------- */
  var LEADS = [
    { n: 'Omar Diaz', t: 'Appliances, 1/4 truck', a: 'Fair Lawn 07410', w: 'Sat Oct 10, 11 AM to 2 PM', p: '$199 to $279', s: 'new', src: 'Booking page', ago: '12m', ah: true },
    { n: 'Kathy Russo', t: '"Do you haul paint cans?"', a: 'Paramus 07652', w: 'Text question', p: '', s: 'new', src: 'Google profile', ago: '38m' },
    { n: 'Dana Lopez', t: 'Furniture and appliances, half truck', a: 'Hackensack 07601', w: 'Mon Oct 12, 8 to 11 AM', p: '$349 to $449', s: 'new', src: 'Website', ago: '1h', ah: true },
    { n: 'Sofia Nguyen', t: 'Single mattress', a: 'Teaneck 07666', w: 'Fri Oct 9, 2 to 5 PM', p: '$99 to $179', s: 'sch', src: 'Facebook', ago: '5h' },
    { n: 'Luis Bianchi', t: 'Garage cleanout, full truck', a: 'Ridgewood 07450', w: 'Thu Oct 8, 11 AM to 2 PM', p: '$599 to $799', s: 'won', src: 'Website', ago: '1d' },
    { n: 'Jenna Patel', t: 'Trash and bags, few items', a: 'Mahwah 07430', w: 'Wed Oct 7, 8 to 11 AM', p: '$99 to $179', s: 'won', src: 'Google profile', ago: '2d' },
    { n: 'Steve Ortiz', t: 'Renovation debris', a: 'Clifton 07011', w: 'Free estimate', p: 'Estimate', s: 'lost', src: 'Missed-call text', ago: '3d' },
    { n: 'Lauren Nguyen', t: 'Hot tub removal', a: 'Wayne 07470', w: 'Free estimate', p: 'Estimate', s: 'sch', src: 'Booking page', ago: '4d' }
  ];
  var PILL = { new: ['new', 'New'], sch: ['sch', 'Scheduled'], won: ['won', 'Booked'], lost: ['lost', 'Lost'] };
  var TITLES = { setup: 'Setup', home: 'Home', leads: 'Leads', bookings: 'Bookings', reviews: 'Reviews', traffic: 'Traffic', widget: 'Booking widget', settings: 'Settings' };
  function app(pg) {
    if (pg === 'test') { S.tested = true; save(); window.open('../book.html?c=' + previewSrc().split('?c=')[1].split('&')[0], '_blank'); toast('Booking page opened in a new tab. Book something and watch it land in Leads.'); location.replace('#app/home'); return; }
    if (!TITLES[pg]) pg = 'home';
    $$('.nav a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-pg') === pg); });
    $('#pgTitle').textContent = TITLES[pg];
    $('#bizName').textContent = BIZ(); $('#bizAv').textContent = BIZ().charAt(0).toUpperCase(); $('#bizAv').style.background = S.brand;
    $('#bizPlan').textContent = S.plan === 'full' ? 'Website + Reviews' : 'Booking Widget';
    $('#meName').textContent = S.name || 'You'; $('#meAv').textContent = (S.name || 'Y').charAt(0).toUpperCase();
    $('#trialEnd').textContent = 'Ends ' + md(END) + ', then $' + price() + '/mo';
    var P = $('#page'), html = PAGES[pg](), lock = gateFor(pg);
    $$('.nav a').forEach(function (a) { var k = a.getAttribute('data-pg'); a.classList.toggle('locked', !!gateFor(k)); });
    var ns = $('#navSetup'); if (ns) ns.hidden = !!S.widgetDone;
    P.innerHTML = lock ? '<div class="gate"><div class="gate-blur" aria-hidden="true" inert>' + html + '</div>' + lock + '</div>' : html;
    var first0 = lock ? $('.gate-blur > *', P) : P.firstElementChild; if (first0) first0.classList.add('on');
    if (pg === 'widget') wizard();
    if (pg === 'leads') leadsInit();
    var lt = $('#later'); if (lt) lt.addEventListener('click', function () { S.hideGuide = true; save(); app('home'); toast('Setup guide hidden. It is still under Booking widget.'); });
  }
  // What each page is for, said plainly on its locked card.
  var GATE_TX = {
    home: ['Home', 'New requests, upcoming jobs and what came in after hours, all in one place.'],
    leads: ['Leads', 'Every booking request lands here with the job, the price they saw and their number.'],
    bookings: ['Bookings', 'Upcoming jobs from your booking page, in order.'],
    traffic: ['Traffic', 'How many people open your booking page, and where they come from.'],
    reviews: ['Reviews', 'Your Google rating and the review requests we send after each job.']
  };
  function gateFor(pg) {
    if (pg === 'reviews' && S.plan !== 'full') return upsellReviews();
    if (S.widgetDone || !GATE_TX[pg]) return '';
    var t = GATE_TX[pg];
    return '<div class="gate-card"><span class="gate-ic">' + I('lock') + '</span><h3>' + t[0] + ' opens after setup</h3><p>' + t[1] + '</p>' +
      '<div class="gate-act"><a class="btn dark" href="#app/setup">Continue setup ' + I('arw') + '</a><a class="link" href="' + esc(DBX.setupCallUrl || '#') + '" data-setupcall' + (DBX.setupCallUrl ? ' target="_blank" rel="noopener"' : '') + '>Or set it up with us on a free call</a></div></div>';
  }
  function upsellReviews() {
    return '<div class="gate-card up"><span class="gate-ic">' + I('star') + '</span><h3>Get more 5-star Google reviews without asking</h3>' +
      '<ul class="gate-list"><li>' + I('chk') + '<span>After every job, the customer gets a text with a one-tap review link.</span></li>' +
      '<li>' + I('chk') + '<span>More reviews move you up on Google Maps, so new customers find you first.</span></li>' +
      '<li>' + I('chk') + '<span>New reviews show up here, and you can reply in one tap.</span></li></ul>' +
      '<p class="gate-plan">Part of <b>Website + Review Automation + Booking Widget</b>, $199/month. It also comes with a new website built to book jobs.</p>' +
      '<div class="gate-act"><button class="btn" type="button" data-upgrade>Upgrade with a quick call ' + I('arw') + '</button></div></div>';
  }
  var greet = function () { var h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
  function ring(done, total) { var off = 132 * (1 - done / total); return '<div class="gring"><svg viewBox="0 0 52 52"><circle class="t" cx="26" cy="26" r="21"/><circle class="p" cx="26" cy="26" r="21" style="stroke-dashoffset:' + off + '"/></svg><b>' + done + '/' + total + '</b></div>'; }
  function barsChart() {
    var inH = [2, 1, 3, 2, 1, 2, 3, 1, 2, 3, 2, 1, 2, 3], aft = [1, 2, 1, 0, 2, 1, 1, 2, 1, 2, 1, 2, 2, 3], W = 600, H = 190, bw = W / 14;
    var max = 6, g = '';
    for (var i = 0; i < 14; i++) {
      var x = i * bw + bw * .2, w = bw * .6, h1 = inH[i] / max * (H - 20), h2 = aft[i] / max * (H - 20);
      g += '<rect x="' + x + '" y="' + (H - h1) + '" width="' + w + '" height="' + h1 + '" rx="3" fill="#1d221c"/>';
      if (h2) g += '<rect x="' + x + '" y="' + (H - h1 - h2 - 2) + '" width="' + w + '" height="' + h2 + '" rx="3" fill="#f35427"/>';
    }
    return '<svg viewBox="0 0 600 200" preserveAspectRatio="none"><line x1="0" y1="190" x2="600" y2="190" stroke="#e7e5de"/>' + g + '</svg>';
  }
  var PAGES = {
    setup: function () {
      var steps = [['clock', 'Hours and area', 'When you work and where you go'], [S.mode === 'estimate' ? 'msg' : 'tag', S.mode === 'estimate' ? 'What you quote' : 'Services and prices', S.mode === 'estimate' ? 'The jobs customers can ask about' : 'What customers can book'], ['spark', 'Your look', 'Logo and color'], ['globe', 'Go live', 'Website, Google profile and social']];
      return '<div class="pg setup"><div class="su-hello"><p class="su-k">' + (S.widgetDone ? 'All set' : 'Your trial has started') + '</p><h2>Welcome, ' + esc(first()) + '. Let\'s get ' + esc(BIZ()) + ' taking bookings.</h2>' +
        '<p>Most owners are live in about 10 minutes. Pick the way that suits you.</p></div>' +
        '<div class="su-choices">' +
        '<a class="su-card" href="#app/widget"><span class="su-ic">' + I('widget') + '</span><b>Set it up myself</b><span>We walk you through it step by step. About 10 minutes.</span><span class="btn dark">Start setup ' + I('arw') + '</span></a>' +
        '<a class="su-card" href="' + esc(DBX.setupCallUrl || '#') + '" data-setupcall' + (DBX.setupCallUrl ? ' target="_blank" rel="noopener"' : '') + '><span class="su-ic">' + I('phone') + '</span><b>Set it up with us</b><span>A free 20-minute call. We set everything up with you and put it on your website and Google profile.</span><span class="btn">Book a free call ' + I('arw') + '</span></a>' +
        '</div>' +
        '<div class="su-steps"><p>What you\'ll set up</p><ol>' + steps.map(function (st, i) { return '<li' + (S.widgetDone ? ' class="done"' : '') + '><span class="su-n">' + (S.widgetDone ? I('chk') : i + 1) + '</span><span class="su-si">' + I(st[0]) + '</span><div><b>' + st[1] + '</b><span>' + st[2] + '</span></div></li>'; }).join('') + '</ol></div>' +
        '<p class="su-foot">Your other pages open as soon as your booking page is set up. Free until ' + md(END) + '.</p></div>';
    },
    home: function () {
      var w = S.widgetDone, full = S.plan === 'full', tasks = [
        { d: true, t: 'Create your account', s: 'Welcome aboard', m: '' },
        { d: w, t: 'Set up your booking widget', s: 'Services, prices, hours and your look', m: '10 min', h: '#app/widget', b: 'Start setup' },
        { d: !!S.tested, t: 'Send yourself a test booking', s: 'See exactly what your customers see, and get the text', m: '1 min', h: w ? '#app/test' : '', b: 'Try it' },
        { d: false, t: 'Put it on your website and Google', s: 'Copy one line, or send it to your web person', m: '5 min', h: w ? '#app/widget/4' : '', b: 'Add it now' },
        { d: false, t: 'Turn on Google review requests', s: full ? 'Ask every customer after the job' : 'Included in Website + Reviews', m: '2 min', h: '#app/reviews', b: full ? 'Turn on' : 'See plan' },
        { d: false, t: 'Get your first booking', s: 'Share your link on Facebook or text it to a past customer', m: '', h: '', b: '' }
      ];
      var done = tasks.filter(function (t) { return t.d; }), todo = tasks.filter(function (t) { return !t.d; }), pct = Math.round(done.length / tasks.length * 100), cur = todo[0];
      var row = function (t) {
        var isCur = t === cur, can = !!t.h;
        return '<li class="task' + (t.d ? ' done' : '') + (isCur ? ' cur' : '') + (!t.d && !can && !isCur ? ' locked' : '') + '"><i>' + I('chk') + '</i><div><b>' + esc(t.t) + '</b><span>' + esc(t.s) + '</span></div>' +
          (t.d ? '<small class="dn">Done</small>' : can ? '<span class="tr">' + (t.m ? '<small>' + t.m + '</small>' : '') + '<a class="btn sm' + (isCur ? '' : ' ghost') + '" href="' + t.h + '">' + t.b + '</a></span>' : (t.m ? '<small>' + t.m + '</small>' : '')) + '</li>';
      };
      var headline = pct >= 50 ? 'More than halfway there!' : pct > 20 ? 'Nice start, ' + esc(first()) + '!' : 'Welcome to DialBridge';
      return '<div class="pg"><div class="hello"><h2>' + greet() + ', ' + esc(first()) + '</h2><p>' + (w ? 'Your booking page is live. 3 new leads are waiting for a reply.' : 'Let us get ' + esc(BIZ()) + ' ready to take bookings. It takes about 15 minutes.') + '</p></div>' +
        (S.hideGuide ? '' : '<div class="card guide"><div class="guide-l"><div class="gbanner"><div><b>' + headline + '</b><span>' + todo.length + ' steps left</span></div>' + ring(done.length, tasks.length) + '</div>' +
          '<p class="gsec">To do</p><ol class="tasks">' + todo.map(row).join('') + '</ol>' +
          '<details class="gdone"><summary>Already done (' + done.length + ')</summary><ol class="tasks">' + done.map(row).join('') + '</ol></details>' +
          '<button class="link" type="button" id="later" style="font-size:13px;margin:8px 0 0 12px">I will finish later</button></div>' +
          '<div class="guide-r"><img src="img/widget.webp" alt="Your booking widget" width="900" height="660"><p>' + (w ? 'Live at book.dialbridge.ai/' + slug() : 'This is what customers will see. Make it yours in the setup.') + '</p>' +
          (w ? '' : '<div class="helpcall"><b>Want us to set it up with you?</b><span>Free 20-minute call. We add your services, prices and hours, and put the button on your website and Google profile.</span><a class="btn sm" href="' + esc(DBX.setupCallUrl || '#') + '" data-setupcall' + (DBX.setupCallUrl ? ' target="_blank" rel="noopener"' : '') + '>Book a free setup call</a></div>') + '</div></div>') +
        '<div class="sample">' + I('info') + 'Sample data below. Your real numbers show up here after your first booking.</div>' +
        '<div class="kpis"><div class="card kpi"><span>' + I('inbox') + 'New leads</span><b>34</b><small class="up">' + I('up') + '21% vs last month</small></div><div class="card kpi"><span>' + I('cal') + 'Booked jobs</span><b>18</b><small class="mute">$10,686 in jobs</small></div><div class="card kpi"><span>' + I('phone') + 'Reply time</span><b>19 min</b><small class="mute">Goal: 15 min</small></div><div class="card kpi"><span>' + I('star') + 'Google rating</span><b>4.9</b><small class="mute">212 reviews</small></div></div>' +
        '<div class="grid2"><div class="card"><div class="card-h"><h3>Booking requests</h3><span>Last 14 days</span></div><div class="chart">' + barsChart() + '<div class="legend"><span><i style="background:#1d221c"></i>Business hours</span><span><i style="background:#f35427"></i>After hours, would have gone to voicemail</span></div></div></div>' +
        '<div class="card"><div class="card-h"><h3>Needs your attention</h3><a class="link" href="#app/leads" style="font-size:13px">See all</a></div><ul class="feed">' +
        LEADS.slice(0, 5).map(function (l) { return '<li><span class="fi">' + I(l.s === 'won' ? 'cal' : l.p ? 'inbox' : 'msg') + '</span><div><b>' + esc(l.n) + '</b><span>' + esc(l.t) + ' · ' + l.ago + ' ago</span></div><span class="pill ' + PILL[l.s][0] + '">' + PILL[l.s][1] + '</span></li>'; }).join('') + '</ul></div></div></div>';
    },
    leads: function () {
      var c = leadCounts();
      return '<div class="pg ib-pg"><div class="ib-top"><p class="ib-sum">' + (c.reply ? '<b>' + c.reply + ' waiting for a reply.</b> Oldest: 1 hour.' : 'You\'re all caught up.') + '<span class="ib-sample">Sample leads</span></p>' +
        '<div class="ib-views" id="ibViews">' + [['reply', 'Needs reply'], ['sch', 'Scheduled'], ['closed', 'Closed']].map(function (v) { return '<button type="button" data-v="' + v[0] + '"' + (v[0] === ibView ? ' class="on"' : '') + '>' + v[1] + ' <span>' + c[v[0]] + '</span></button>'; }).join('') + '</div></div>' +
        '<div class="inbox" id="ibox"><div class="ib-list" id="ibList"></div><div class="ib-d" id="ibD"></div></div></div>';
    },
    bookings: function () {
      var up = LEADS.filter(function (l) { return l.s === 'sch' || l.s === 'won' || /Oct/.test(l.w); });
      return '<div class="pg"><div class="hello"><h2>Bookings</h2><p>What\'s on the schedule.</p></div><div class="sample">' + I('info') + 'Sample bookings.</div><div class="card" style="margin-top:14px"><div class="card-h"><h3>Upcoming</h3><span>Next 7 days</span></div><ul class="feed">' +
        up.map(function (l) { return '<li><span class="fi">' + I('cal') + '</span><div><b>' + esc(l.w) + '</b><span>' + esc(l.n) + ' · ' + esc(l.t) + ' · ' + esc(l.a) + '</span></div><span class="pill ' + PILL[l.s][0] + '">' + (l.p || PILL[l.s][1]) + '</span></li>'; }).join('') + '</ul></div></div>';
    },
    reviews: function () {
      var R = [['Sofia N.', 5, 'Fast, friendly crew. Fair price and they swept up after.', '2d'], ['Luis B.', 5, 'Booked online at night, they showed up the next morning. Super easy.', '4d'], ['Jenna P.', 5, 'Price was exactly what the website said.', '1w'], ['Mark T.', 4, 'Great job, came a little late but texted ahead.', '2w']];
      return '<div class="pg"><div class="hello"><h2>Reviews</h2><p>Your Google rating and the requests we send after each job.</p></div>' +
        (S.plan !== 'full' ? '<div class="upsell">' + I('star') + '<div><b>Get more 5-star reviews automatically</b><span>Every customer gets a review request by text after the job. Included in Website + Reviews + Booking Widget.</span></div><a class="btn" href="../product/?call=1">Book a call</a></div>' : '') +
        '<div class="sample">' + I('info') + 'Sample reviews.</div><div class="rv-top"><div class="card rv-score"><b>4.9</b><div class="st">★★★★★</div><span>212 Google reviews</span><div class="bars">' +
        [[5, 92], [4, 6], [3, 1], [2, 0], [1, 1]].map(function (x) { return '<div><span>' + x[0] + '</span><i><b style="width:' + x[1] + '%"></b></i><span>' + x[1] + '%</span></div>'; }).join('') +
        '</div></div><div class="card"><div class="card-h"><h3>Latest reviews</h3><span>From Google</span></div><ul class="rv-list">' +
        R.map(function (r) { return '<li><div class="who"><b>' + r[0] + '</b><span class="st">' + '★★★★★'.slice(0, r[1]) + '</span><small>' + r[3] + ' ago</small></div><p>' + esc(r[2]) + '</p></li>'; }).join('') + '</ul></div></div></div>';
    },
    traffic: function () {
      var F = [['Booking page views', 412, 100], ['Started a booking', 96, 23], ['Sent a request', 34, 8], ['Booked jobs', 18, 4]];
      return '<div class="pg"><div class="hello"><h2>Traffic</h2><p>Who sees your booking page and how many book.</p></div><div class="sample">' + I('info') + 'Sample data.</div>' +
        '<div class="kpis"><div class="card kpi"><span>Page views</span><b>412</b><small class="up">' + I('up') + '14%</small></div><div class="card kpi"><span>Started a booking</span><b>96</b><small class="mute">23% of views</small></div><div class="card kpi"><span>Requests</span><b>34</b><small class="mute">8% of views</small></div><div class="card kpi"><span>After hours</span><b>41%</b><small class="mute">of requests</small></div></div>' +
        '<div class="grid2"><div class="card"><div class="card-h"><h3>From view to booked job</h3><span>Last 30 days</span></div><div style="padding:16px 18px;display:flex;flex-direction:column;gap:12px">' +
        F.map(function (f) { return '<div><div style="display:flex;justify-content:space-between;font-size:13.5px;font-weight:600"><span>' + f[0] + '</span><span>' + f[1] + '</span></div><div style="height:10px;margin-top:6px;border-radius:5px;background:#f0efe9;overflow:hidden"><div style="height:100%;width:' + Math.max(2, f[2]) + '%;border-radius:5px;background:var(--accent)"></div></div></div>'; }).join('') +
        '</div></div><div class="card"><div class="card-h"><h3>Where requests come from</h3></div><ul class="feed">' +
        [['Website', 14, 'globe'], ['Google profile', 11, 'pin'], ['Facebook', 7, 'msg'], ['Missed-call text', 2, 'phone']].map(function (s) { return '<li><span class="fi">' + I(s[2]) + '</span><div><b>' + s[0] + '</b><span>' + Math.round(s[1] / 34 * 100) + '% of requests</span></div><b>' + s[1] + '</b></li>'; }).join('') + '</ul></div></div></div>';
    },
    widget: function () {
      return '<div class="pg"><div class="hello"><h2>Set up your booking widget</h2><p>Your changes show in the preview right away.</p></div><div class="wz">' +
        '<ol class="card wz-steps" id="wzSteps">' + [['Hours and area', 'When and where you work'], ['Services and prices', 'What customers can book'], ['Your look', 'Logo and color'], ['Go live', 'Website, Google, social']].map(function (s, i) { return '<li data-s="' + (i + 1) + '"><button type="button"><i>' + (i + 1) + '</i><div><b>' + s[0] + '</b><span>' + s[1] + '</span></div></button></li>'; }).join('') + '</ol>' +
        '<div class="card wz-form" id="wzForm"></div>' +
        '<div class="wz-prev"><div class="card"><div class="bar"><i></i><i></i><i></i><span id="wzUrl">book.dialbridge.ai/' + slug() + '</span></div><iframe id="wzFrame" title="Your booking widget preview"></iframe></div><p>Live preview. Tap through it like a customer.</p></div></div></div>';
    },
    settings: function () {
      return '<div class="pg"><div class="hello"><h2>Settings</h2><p>Your account, business and billing.</p></div><div class="grid2"><div class="card"><div class="card-h"><h3>Business</h3></div><div style="padding:18px;display:flex;flex-direction:column;gap:12px"><label class="field">Business name<input class="in" value="' + esc(BIZ()) + '"></label><label class="field">Where you work<input class="in" value="' + esc(S.area) + '" placeholder="Bergen County, NJ"></label><label class="field">Your mobile <em>new bookings are texted here</em><input class="in" placeholder="(201) 555-0148"></label></div></div>' +
        '<div class="card"><div class="card-h"><h3>Plan and billing</h3><span>Managed by Stripe</span></div><div style="padding:18px"><b style="font-size:17px">' + (S.plan === 'full' ? 'Website + Reviews + Booking Widget' : 'Booking Widget') + '</b><p style="margin:4px 0 0;color:var(--mute)">Free trial until ' + md(END) + ', then $' + price() + '/month</p><p style="margin:14px 0 0;font-size:14px">Visa ending in 4242</p><div style="display:flex;gap:8px;margin-top:16px"><button class="btn sm ghost" type="button">Update card</button><button class="btn sm ghost" type="button">Cancel trial</button></div></div></div></div></div>';
    }
  };
  /* leads interaction */
  // ---- Leads inbox ----
  var ibView = 'reply', ibSel = 0;
  var VIEW = { new: 'reply', sch: 'sch', won: 'closed', lost: 'closed' };
  function leadCounts() { var c = { reply: 0, sch: 0, closed: 0 }; LEADS.forEach(function (l) { c[VIEW[l.s]]++; }); return c; }
  function ibRows() {
    var rows = LEADS.map(function (l, i) { return [l, i]; }).filter(function (x) { return VIEW[x[0].s] === ibView; });
    if (!rows.length) return '<p class="ib-empty">Nothing here right now.</p>';
    if (!rows.some(function (x) { return x[1] === ibSel; })) ibSel = rows[0][1];
    return rows.map(function (x) {
      var l = x[0], i = x[1], unread = l.s === 'new';
      var end = l.s === 'won' ? '<em class="st ok">Booked' + (l.p && /\$/.test(l.p) ? ' ' + esc(l.p.split(' ')[0]) : '') + '</em>' : l.s === 'lost' ? '<em class="st">Lost</em>' : '';
      return '<button type="button" class="ib-row' + (i === ibSel ? ' on' : '') + (unread ? ' unread' : '') + '" data-i="' + i + '">' +
        '<span class="r1">' + (unread ? '<i class="dot"></i>' : '') + '<b>' + esc(l.n) + '</b>' + (l.ah ? '<span class="mk" title="Came in after hours">' + I('moon') + '</span>' : '') + '<small>' + l.ago + '</small></span>' +
        '<span class="r2">' + esc(l.t) + (l.w && !/estimate|question/i.test(l.w) ? ' · ' + esc(l.w.replace(/^[A-Z][a-z]{2} /, '').replace(/ to /, '-')) : '') + end + '</span></button>';
    }).join('');
  }
  var STATUS = { new: 'New', sch: 'Scheduled', won: 'Booked', lost: 'Lost' };
  function leadDetail(i) {
    var l = LEADS[i], fn = l.n.split(' ')[0], ph = '(201) 555-0' + (140 + i);
    var photos = i % 2 ? '' : '<div class="rq-ph"><img src="../img/tiles/junk-book.webp" alt=""><img src="../img/tiles/junk-hero.webp" alt=""></div>';
    var thread = l.s === 'sch' || l.s === 'won' ? '<div class="msg us"><p>Hi ' + esc(fn) + ', this is Mike from ' + esc(BIZ()) + '. You\'re all set for ' + esc(l.w) + '. We\'ll text when we\'re on the way.</p><small>You · ' + (l.s === 'won' ? '1d ago' : '4h ago') + '</small></div>' : '';
    $('#ibD').innerHTML =
      '<div class="ib-dh"><button class="ib-back" type="button" aria-label="Back to leads">' + I('back') + '</button><div class="who"><h3>' + esc(l.n) + '</h3><p>' + ph + ' · ' + esc(l.a) + '</p></div>' +
        '<a class="btn sm ghost" href="tel:' + ph.replace(/\D/g, '') + '">' + I('phone') + 'Call</a>' +
        '<div class="stsel"><button type="button" class="stbtn" id="stBtn">' + STATUS[l.s] + '<svg viewBox="0 0 24 24"><path d="m7 10 5 5 5-5"/></svg></button><div class="stmenu" id="stMenu" hidden>' + ['sch', 'won', 'lost', 'new'].filter(function (k) { return k !== l.s; }).map(function (k) { return '<button type="button" data-st="' + k + '">' + ({ sch: 'Mark scheduled', won: 'Mark booked', lost: 'Mark lost', new: 'Move back to new' })[k] + '</button>'; }).join('') + '</div></div></div>' +
      '<div class="ib-thread">' + (/question/i.test(l.w) ? '<div class="msg them"><p>' + esc(l.t.replace(/^"|"$/g, '')) + '</p><small>' + esc(fn) + ' · ' + esc(l.src) + ' · ' + l.ago + ' ago</small></div>' :
        '<div class="rq"><p class="rq-k">Booking request · ' + esc(l.src) + ' · ' + l.ago + ' ago' + (l.ah ? ' · <span class="ah">' + I('moon') + 'after hours</span>' : '') + '</p>' +
          '<dl><div><dt>Job</dt><dd>' + esc(l.t) + '</dd></div><div><dt>When</dt><dd>' + esc(l.w) + '</dd></div>' + (l.p ? '<div><dt>Price shown</dt><dd>' + esc(l.p) + '</dd></div>' : '') + '</dl>' + photos + '</div>') +
        thread +
      '</div>' +
      '<div class="ib-comp"><textarea id="ibTx" rows="2" placeholder="Text ' + esc(fn) + '..."></textarea><div class="tpl" id="tpl" hidden>' +
        ['Confirm the time', 'Send the price', 'Ask for photos', 'On the way'].map(function (t) { return '<button type="button">' + t + '</button>'; }).join('') + '</div>' +
        '<div class="cb"><button type="button" class="link" id="tplBtn">Templates</button><span>From your business number</span><button class="btn sm" type="button" id="sendTx">Send text</button></div></div>';
  }
  function leadsInit() {
    $('#ibList').innerHTML = ibRows(); leadDetail(ibSel);
    var open = function (i) { ibSel = i; $$('.ib-row').forEach(function (x) { x.classList.toggle('on', +x.getAttribute('data-i') === i); }); leadDetail(i); $('#ibox').classList.add('show-d'); };
    $('#ibViews').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; ibView = b.getAttribute('data-v'); $$('#ibViews button').forEach(function (x) { x.classList.toggle('on', x === b); }); $('#ibList').innerHTML = ibRows(); leadDetail(ibSel); });
    $('#ibList').addEventListener('click', function (e) { var r = e.target.closest('.ib-row'); if (r) open(+r.getAttribute('data-i')); });
    $('#ibD').addEventListener('click', function (e) {
      if (e.target.closest('.ib-back')) { $('#ibox').classList.remove('show-d'); return; }
      if (e.target.closest('#stBtn')) { var m = $('#stMenu'); m.hidden = !m.hidden; return; }
      var st = e.target.closest('[data-st]');
      if (st) {
        var l = LEADS[ibSel], to = st.getAttribute('data-st'); l.s = to;
        var nextI = LEADS.map(function (x, i) { return [x, i]; }).filter(function (x) { return VIEW[x[0].s] === ibView; })[0];
        var c = leadCounts(); $$('#ibViews button').forEach(function (b) { $('span', b).textContent = c[b.getAttribute('data-v')]; });
        $('#ibList').innerHTML = ibRows();
        toast(STATUS[to] === 'New' ? 'Moved back to new' : 'Marked ' + STATUS[to].toLowerCase() + (nextI ? '. Next: ' + nextI[0].n : ''));
        if (nextI) open(nextI[1]); else leadDetail(ibSel);
        return;
      }
      if (e.target.closest('#tplBtn')) { var t = $('#tpl'); t.hidden = !t.hidden; return; }
      var tb = e.target.closest('#tpl button');
      if (tb) { var l2 = LEADS[ibSel]; $('#ibTx').value = { 'Confirm the time': 'Hi ' + l2.n.split(' ')[0] + '! You\'re all set for ' + l2.w + '. We\'ll text when we\'re on the way.', 'Send the price': 'Thanks for the details! Your price is ' + (l2.p || '$199 to $279') + ', confirmed on site.', 'Ask for photos': 'Could you text a couple of photos? It helps us give you an exact price.', 'On the way': 'We\'re on the way, about 20 minutes out.' }[tb.textContent]; $('#tpl').hidden = true; $('#ibTx').focus(); return; }
      if (e.target.closest('#sendTx')) toast('Demo: text not sent');
    });
  }
  /* widget wizard */
  var SVC = { junk: [['furniture', 'Furniture', 99], ['appliances', 'Appliances', 99], ['trash', 'Trash and bags', 99], ['yard', 'Yard waste', 99], ['reno', 'Renovation debris', 149], ['heavy', 'Dirt and concrete', 199], ['garage', 'Garage or basement', 199], ['estate', 'Whole property', 0]],
    cleaning: [['standard', 'Standard clean', 129], ['deep', 'Deep clean', 229], ['move', 'Move in or out', 279], ['office', 'Office', 0]],
    detailing: [['full', 'Full detail', 179], ['interior', 'Interior detail', 119], ['exterior', 'Exterior detail', 89], ['ceramic', 'Ceramic coating', 0]],
    hvac: [['repair', 'Repair visit', 89], ['tuneup', 'Tune-up', 129], ['install', 'New system', 0]] };
  var COLORS = ['#0E6650', '#1F5FAD', '#C2410C', '#B91C1C', '#0F766E', '#7A4E1D', '#1F2937', '#E8A200'];
  var wzStep = 1;
  function slug() { return (BIZ().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)) || 'your-business'; }
  function trade() { return SVC[S.trade] ? S.trade : 'junk'; }
  function previewSrc() {
    var hide = SVC[trade()].filter(function (x) { return S.svc[x[0]] === false; }).map(function (x) { return x[0]; });
    var cfg = { trade: trade(), name: BIZ(), phone: '(201) 555-0148', brand: S.brand, area: S.area || 'your area', zips: [], open: S.open, close: S.close, hideServices: hide };
    return '../book.html?c=' + btoa(unescape(encodeURIComponent(JSON.stringify(cfg)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') + '&embed=1&inline=1&builder=1';
  }
  var reloadT = null;
  function preview(now) { clearTimeout(reloadT); reloadT = setTimeout(function () { var f = $('#wzFrame'); if (!f) return; f.src = previewSrc(); f.onload = function () { if (S.logo) send(); }; }, now ? 0 : 450); }
  function send() { var f = $('#wzFrame'); try { f.contentWindow.postMessage({ type: 'dbw:customize', brand: S.brand, logo: S.logo || null }, location.origin); } catch (e) { } }
  function wizard() {
    var m = (location.hash.match(/#app\/widget\/(\d)/) || [])[1]; wzStep = +m || 1;
    preview(true); wzRender();
    $('#wzSteps').addEventListener('click', function (e) { var li = e.target.closest('li'); if (li) { wzStep = +li.getAttribute('data-s'); wzRender(); } });
    $('#wzForm').addEventListener('click', wzClick); $('#wzForm').addEventListener('input', wzInput); $('#wzForm').addEventListener('change', wzInput);
  }
  function wzRender() {
    $$('#wzSteps li').forEach(function (li) { var s = +li.getAttribute('data-s'); li.classList.toggle('on', s === wzStep); li.classList.toggle('done', s < wzStep || (S.widgetDone && s !== wzStep)); });
    var f = $('#wzForm'), h = '';
    // Order Matt chose: hours first, then services and prices, then the look, then go live.
    var sec = [3, 2, 1, 4][wzStep - 1];
    if (sec === 1) h = '<div><h3>Your look</h3><p>Add your logo and pick your brand color.</p></div><div class="wz-body"><div class="field">Logo<label class="drop">' + (S.logo ? '<img src="' + S.logo + '" alt="">' : I('up')) + '<span>' + (S.logo ? 'Change logo' : 'Upload your logo (PNG or JPG)') + '</span><input type="file" id="wzLogo" accept="image/png,image/jpeg,image/webp"></label></div>' +
      '<div class="field">Brand color<div class="sw">' + COLORS.map(function (c) { return '<button type="button" data-c="' + c + '" style="background:' + c + '"' + (c.toLowerCase() === S.brand.toLowerCase() ? ' class="on"' : '') + ' aria-label="' + c + '"></button>'; }).join('') + '</div></div>' +
      '<label class="field">Business name<input class="in" id="wzName" value="' + esc(BIZ()) + '"></label></div>';
    else if (sec === 2) h = '<div><h3>Services and prices</h3><p>Turn on what you offer. Prices show as "from" ranges; 0 means free estimate.</p></div><div class="wz-body">' +
      SVC[trade()].map(function (x) { var on = S.svc[x[0]] !== false; return '<div class="svc"><button type="button" class="tog' + (on ? ' on' : '') + '" data-svc="' + x[0] + '" aria-label="Offer ' + x[1] + '"></button><div><b>' + x[1] + '</b><span>' + (x[2] ? 'Price shown up front' : 'Free estimate') + '</span></div><label class="pr">From $<input value="' + (x[2] || 0) + '" inputmode="numeric"></label></div>'; }).join('') + '</div>';
    else if (sec === 3) h = '<div><h3>Hours and area</h3><p>Customers only see times you can actually take.</p></div><div class="wz-body"><div class="field">Days you work<div class="days" id="wzDays">' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(function (d, i) { return '<button type="button" data-d="' + i + '"' + (S.days.indexOf(i) > -1 ? ' class="on"' : '') + '>' + d + '</button>'; }).join('') + '</div></div>' +
      '<div class="row2"><label class="field">Start<select class="in" id="wzOpen">' + hrs(S.open) + '</select></label><label class="field">End<select class="in" id="wzClose">' + hrs(S.close) + '</select></label></div>' +
      '<label class="field">Area you serve<input class="in" id="wzArea" value="' + esc(S.area) + '" placeholder="Bergen County, NJ"></label><label class="field">ZIP codes you cover <em>first 3 digits work too</em><input class="in" placeholder="074, 076, 07601"></label><label class="field">Most jobs per day<input class="in" value="4" inputmode="numeric"></label></div>';
    else h = '<div><h3>Go live</h3><p>Put your Book online button where customers find you.</p></div><div class="wz-body">' + (S.widgetDone ? '<div class="live-ok">' + I('chk') + 'Your booking page is live.</div>' : '') +
      '<div class="field">Your booking link <em>for Google, Facebook and Instagram</em><div class="linkbox"><span>book.dialbridge.ai/' + slug() + '</span><button class="btn sm dark" type="button" id="wzCopy">' + I('copy') + 'Copy</button></div></div>' +
      '<div class="field">Add the button to your website<div class="inst-tabs" id="wzTabs">' + ['WordPress', 'Wix', 'Squarespace', 'GoDaddy', 'Other'].map(function (t, i) { return '<button type="button"' + (i ? '' : ' class="on"') + '>' + t + '</button>'; }).join('') + '</div>' +
      '<div class="codebox">&lt;script async src="https://book.dialbridge.ai/w.js" data-business="' + slug() + '"&gt;&lt;/script&gt;<button type="button" id="wzCode">Copy</button></div><p style="margin:2px 0 0;font-size:13px;color:var(--mute);font-weight:500" id="wzHow">WordPress: Appearance, Theme File Editor, footer.php, paste above &lt;/body&gt;. Or use a plugin like WPCode.</p></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm ghost" type="button" id="wzEmail">' + I('msg') + 'Email it to my web person</button><button class="btn sm ghost" type="button" id="wzCall">' + I('phone') + 'Book a free install call</button></div></div>';
    h += '<div class="wz-nav">' + (wzStep > 1 ? '<button class="link" type="button" id="wzPrev">Back</button>' : '<span></span>') + '<button class="btn' + (wzStep === 4 ? '' : ' dark') + '" type="button" id="wzNext">' + (wzStep === 4 ? (S.widgetDone ? 'Back to home' : 'Publish my booking page') : 'Continue') + ' ' + I('arw') + '</button></div>';
    f.innerHTML = h; f.classList.remove('swap');
  }
  function hrs(sel) { var o = ''; for (var h = 6; h <= 21; h++) { var v = (h < 10 ? '0' : '') + h + ':00', l = (h % 12 || 12) + ':00 ' + (h < 12 ? 'AM' : 'PM'); o += '<option value="' + v + '"' + (v === sel ? ' selected' : '') + '>' + l + '</option>'; } return o; }
  function wzClick(e) {
    var t = e.target;
    var c = t.closest('[data-c]'); if (c) { S.brand = c.getAttribute('data-c'); save(); $$('.sw button').forEach(function (b) { b.classList.toggle('on', b === c); }); send(); return; }
    var sv = t.closest('[data-svc]'); if (sv) { var k = sv.getAttribute('data-svc'); S.svc[k] = S.svc[k] === false; sv.classList.toggle('on', S.svc[k] !== false); save(); preview(); return; }
    var d = t.closest('[data-d]'); if (d) { var n = +d.getAttribute('data-d'), i = S.days.indexOf(n); if (i > -1) S.days.splice(i, 1); else S.days.push(n); d.classList.toggle('on'); save(); return; }
    var tab = t.closest('#wzTabs button'); if (tab) { $$('#wzTabs button').forEach(function (b) { b.classList.toggle('on', b === tab); }); $('#wzHow').innerHTML = { WordPress: 'WordPress: Appearance, Theme File Editor, footer.php, paste above &lt;/body&gt;. Or use a plugin like WPCode.', Wix: 'Wix: Settings, Custom code, Add code, paste it, place it in Body - end, apply to all pages.', Squarespace: 'Squarespace: Settings, Advanced, Code injection, paste it into Footer.', GoDaddy: 'GoDaddy: Edit website, add an HTML section to your footer, paste it.', Other: 'Paste it right before &lt;/body&gt; on every page, or send it to whoever manages your site.' }[tab.textContent]; return; }
    if (t.closest('#wzCopy') || t.closest('#wzCode')) { toast('Copied'); return; }
    if (t.closest('#wzEmail')) { toast('Demo: email not sent'); return; }
    if (t.closest('#wzCall')) { location.href = '../product/?call=1'; return; }
    if (t.closest('#wzPrev')) { wzStep--; wzRender(); return; }
    if (t.closest('#wzNext')) {
      if (wzStep < 4) { wzStep++; wzRender(); $('.main').scrollTo && scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); return; }
      if (S.widgetDone) { location.hash = '#app/home'; return; }
      S.widgetDone = true; save(); track('WidgetPublished', {}, true); wzRender();
      modal('<div class="okc">' + I('chk') + '</div><h3>Your booking page is live</h3><p>Customers can book ' + esc(BIZ()) + ' at book.dialbridge.ai/' + slug() + '. Add the button to your website and the link to Google to start getting bookings.</p><button class="btn" type="button" data-close>Got it</button>');
    }
  }
  function wzInput(e) {
    var t = e.target;
    if (t.id === 'wzName') { S.biz = t.value.trim(); save(); $('#bizName').textContent = BIZ(); $('#wzUrl').textContent = 'book.dialbridge.ai/' + slug(); preview(); }
    if (t.id === 'wzArea') { S.area = t.value.trim(); save(); preview(); }
    if (t.id === 'wzOpen') { S.open = t.value; save(); preview(); }
    if (t.id === 'wzClose') { S.close = t.value; save(); preview(); }
    if (t.id === 'wzLogo' && e.type === 'change') { var file = t.files && t.files[0]; if (!file || file.size > 4e6) return; var r = new FileReader(); r.onload = function () { S.logo = r.result; save(); send(); wzRender(); }; r.readAsDataURL(file); }
  }

  /* demo helper: ?reset clears the saved progress */
  if (/[?&]reset\b/.test(location.search)) { localStorage.removeItem(KEY); location.replace(location.pathname + (q0 ? '?biz=' + encodeURIComponent(q0) : '') + '#signup'); return; }
  // Live mode: a saved session picks up where they left off (or finishes the return from Stripe).
  if (LIVE && token()) {
    api('/v1/acct/me').then(function (r) {
      if (r.status === 401) { setToken(''); route(); return; }
      if (r.ok) fromAccount(r.body.account);
      if (/[?&]paid=1/.test(location.search)) { modal('<div class="waiting"><div class="spin"></div><h3>Starting your free trial</h3><p>This takes a few seconds.</p></div>'); waitForTrial(0); return; }
      var h = (location.hash.slice(1).split('/')[0]) || 'signup';
      if ((h === 'signup' || h === 'login') && ACCT) { location.hash = S.paid ? (S.widgetDone ? '#app/home' : '#app/setup') : (ACCT.stage === 'saw_plans' || ACCT.plan) ? '#plan' : '#onb/' + stepIndex(ACCT.step); return; }
      route();
    });
  } else route();
  // resume onboarding on the question after the last one they answered
  function stepIndex(k) { for (var i = 0; i < STEPS.length; i++) if (STEPS[i].k === k) return i + 1; return 0; }
})();
