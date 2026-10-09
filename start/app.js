/* DialBridge trial funnel (visual demo, nothing is saved server-side, sent or charged).
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
  function track(ev, data, custom) { try { if (window.fbq) window.fbq(custom ? 'trackCustom' : 'track', ev, data || {}); } catch (e) { } }

  var S = { email: '', name: '', biz: '', area: '', trade: '', reach: [], miss: '', calls: '', goal: '', plan: 'widget', paid: false, widgetDone: false, brand: '#0E6650', logo: null, svc: {}, days: [1, 2, 3, 4, 5, 6], open: '08:00', close: '18:00' };
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { }
  var q0 = new URLSearchParams(location.search).get('biz'); if (q0 && !S.biz) S.biz = q0.slice(0, 60);
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
  var first = function () { return (S.name || 'there').split(' ')[0]; };
  var BIZ = function () { return S.biz || 'Your business'; };
  var price = function () { return S.plan === 'full' ? 199 : 99; };
  var END = new Date(Date.now() + 14 * 864e5), REMIND = new Date(Date.now() + 12 * 864e5);
  var md = function (d) { return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }); };

  function toast(t) { var el = $('#toast'); $('#toastTx').textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove('on'); }, 2400); }
  function modal(html) { $('#modalBox').innerHTML = html; $('#modal').hidden = false; }
  $('#modal').addEventListener('click', function (e) { if (e.target.id === 'modal' || e.target.closest('[data-close]')) $('#modal').hidden = true; });

  /* ---------------- router ---------------- */
  function show(id) { $$('.view').forEach(function (v) { v.classList.toggle('on', v.id === id); }); scrollTo(0, 0); }
  function route() {
    var h = (location.hash || '#signup').slice(1), parts = h.split('/');
    if (parts[0] === 'app' && !S.paid) { location.hash = S.trade ? '#plan' : '#signup'; return; }
    if (parts[0] === 'signup') { show('v-signup'); }
    else if (parts[0] === 'onb') { show('v-onb'); onb(+parts[1] || 0); }
    else if (parts[0] === 'plan') { show('v-plan'); paywall(); }
    else if (parts[0] === 'checkout') { show('v-checkout'); checkout(); }
    else if (parts[0] === 'app') { show('v-app'); app(parts[1] || 'home'); }
    else location.hash = '#signup';
  }
  addEventListener('hashchange', route);

  /* ---------------- 1. sign up ---------------- */
  var GOOGLE_DEMO = { name: 'Matt Korsun', email: 'matt@haulpros.com' };
  $('#gSign').addEventListener('click', function () { S.name = S.name || GOOGLE_DEMO.name; S.email = S.email || GOOGLE_DEMO.email; save(); track('CompleteRegistration', { method: 'google' }); location.hash = '#onb/1'; });
  $('#emailForm').addEventListener('submit', function (e) {
    e.preventDefault(); var v = $('#email').value.trim(), er = $('#emailErr');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { er.textContent = 'Please enter a valid email.'; er.classList.add('on'); return; }
    er.classList.remove('on'); S.email = v; save(); $('#codeTo').textContent = v; $('#authForm').hidden = true; $('#codeForm').hidden = false; boxes[0].focus();
  });
  $('#code').innerHTML = [0, 1, 2, 3, 4, 5].map(function (i) { return '<input inputmode="numeric" maxlength="1" aria-label="Digit ' + (i + 1) + '"' + (i ? '' : ' autocomplete="one-time-code"') + '>'; }).join('');
  var boxes = $$('#code input'), code = function () { return boxes.map(function (b) { return b.value; }).join(''); };
  boxes.forEach(function (b, i) {
    b.addEventListener('input', function () {
      var d = b.value.replace(/\D/g, '');
      if (d.length > 1) d.split('').slice(0, 6 - i).forEach(function (c, k) { boxes[i + k].value = c; }); else b.value = d;
      if (d && boxes[Math.min(5, i + d.length)]) boxes[Math.min(5, i + d.length)].focus();
      $('#verify').disabled = code().length !== 6; if (code().length === 6) $('#verify').click();
    });
    b.addEventListener('keydown', function (e) { if (e.key === 'Backspace' && !b.value && i) boxes[i - 1].focus(); });
  });
  $('#verify').addEventListener('click', function () { if (code().length !== 6) return; track('CompleteRegistration', { method: 'email' }); location.hash = '#onb/0'; });
  $('#resend').addEventListener('click', function () { this.textContent = 'Code sent again'; });
  $('#diffEmail').addEventListener('click', function () { $('#codeForm').hidden = true; $('#authForm').hidden = false; });

  /* ---------------- 2. onboarding (one question per screen) ---------------- */
  var TRADES = [['junk', 'Junk removal', 'truck'], ['cleaning', 'House cleaning', 'spark'], ['detailing', 'Mobile detailing', 'car'], ['hvac', 'Heating and cooling', 'fan'], ['other', 'Something else', 'dots']];
  var STEPS = [
    { k: 'name', type: 'text', t: 'Welcome! What\'s your first name?', p: 'So we know what to call you.', ph: 'Matt', auto: 'given-name' },
    { k: 'biz', type: 'biz', t: 'What\'s your business called?', p: 'We\'ll use it on your booking page. If you\'re on Google, we\'ll find you.' },
    { k: 'trade', type: 'one', grid: true, t: 'What kind of work do you do?', p: 'We set up your services and prices for your trade.', o: TRADES.map(function (x) { return [x[0], x[1], '', x[2]]; }) },
    { k: 'reach', type: 'multi', t: 'How do customers reach you today?', p: 'Pick all that apply.', o: [['calls', 'Phone calls', '', 'phone'], ['texts', 'Text messages', '', 'msg'], ['site', 'A form on my website', '', 'globe'], ['google', 'My Google profile', '', 'pin'], ['social', 'Facebook or Instagram', '', 'msg'], ['apps', 'Thumbtack, Angi or Yelp', '', 'dots']] },
    { k: 'miss', type: 'one', t: 'When you\'re on a job and a new call comes in, what usually happens?', p: '', o: [['answer', 'I stop and answer it', '', 'phone'], ['vm', 'It goes to voicemail', '', 'msg'], ['later', 'I call back when I can', '', 'cal'], ['office', 'Someone in the office answers', '', 'home']] },
    { k: 'insight', type: 'insight' },
    { k: 'calls', type: 'one', t: 'About how many calls or quote requests do you get in a normal week?', p: 'Ballpark is fine.', o: [['0', '0 to 5'], ['1', '6 to 15'], ['2', '16 to 40'], ['3', 'More than 40']] },
    { k: 'goal', type: 'one', t: 'What do you want most right now?', p: 'We\'ll set up your dashboard around it.', o: [['jobs', 'More booked jobs', 'Turn more visitors and callers into jobs', 'cal'], ['missed', 'Stop losing missed calls', 'Catch the ones that go to voicemail', 'phone'], ['reviews', 'More Google reviews', 'Ask every happy customer, automatically', 'star'], ['time', 'Less time on the phone', 'Let customers price and book themselves', 'msg']] },
    { k: 'build', type: 'build' },
    { k: 'ready', type: 'ready' }
  ];
  function onbVisible() { return STEPS.filter(function (s) { return !(s.k === 'name' && S.name && S.email === GOOGLE_DEMO.email); }); }
  function opt(o, on, multi) {
    return '<button type="button" class="opt' + (multi ? ' multi' : '') + (on ? ' on' : '') + '" data-v="' + o[0] + '">' + (o[3] ? '<span class="oi">' + I(o[3]) + '</span>' : '') +
      '<span class="ot">' + esc(o[1]) + (o[2] ? '<small>' + esc(o[2]) + '</small>' : '') + '</span><span class="ck">' + I('chk') + '</span></button>';
  }
  var onbIdx = 0, buildRun = 0;
  function onb(i) {
    var list = STEPS, s = list[i]; if (!s) { location.hash = '#plan'; return; }
    if (s.k === 'name' && S.name && S.email === GOOGLE_DEMO.email) { location.hash = '#onb/' + (i + 1); return; }
    onbIdx = i;
    $('#onbBar').style.width = Math.round((i + 1) / (list.length + 1) * 86) + '%';
    $('#onbBack').style.visibility = i > 0 && s.type !== 'build' ? 'visible' : 'hidden';
    var m = $('#onbMain'), h = '<div class="q">';
    if (s.type === 'text') h += '<h1>' + s.t + '</h1><p>' + s.p + '</p><div class="opts"><input class="in" id="qIn" autocomplete="' + s.auto + '" placeholder="' + s.ph + '" value="' + esc(S[s.k]) + '" style="height:56px;font-size:18px"></div>' + act(!S[s.k]);
    else if (s.type === 'biz') h += '<h1>' + s.t + '</h1><p>' + s.p + '</p><div class="opts" style="gap:0"><input class="in" id="qIn" autocomplete="organization" placeholder="Haul Pros Junk Removal" value="' + esc(S.biz) + '" style="height:56px;font-size:18px"><div class="sugg" id="sugg" hidden></div>' +
      '<div class="bizcard" id="bizcard"' + (S.area ? '' : ' hidden') + '><span class="pin">' + I('pin') + '</span><div><b id="bcN">' + esc(S.biz) + '</b><span id="bcA">' + esc(S.area) + '</span></div><span class="ok">Found on Google</span></div></div>' + act(!S.biz);
    else if (s.type === 'one' || s.type === 'multi') {
      var cur = S[s.k], multi = s.type === 'multi';
      h += '<p class="k">' + (multi ? 'Pick all that apply' : 'Pick one') + '</p><h1>' + s.t + '</h1>' + (s.p ? '<p>' + s.p + '</p>' : '') +
        '<div class="opts' + (s.grid ? ' grid' : '') + '" id="qOpts">' + s.o.map(function (o) { return opt(o, multi ? cur.indexOf(o[0]) > -1 : cur === o[0], multi); }).join('') + '</div>' + (multi ? act(!cur.length) : '');
    }
    else if (s.type === 'insight') {
      var vm = S.miss === 'vm' || S.miss === 'later';
      h += '<p class="k">' + (vm ? 'You\'re not alone' : 'Good to know') + '</p><h1>' + (vm ? 'Most owners can\'t pick up while they\'re working. Customers don\'t wait.' : 'Even owners who always answer miss the after-hours customers.') + '</h1>' +
        '<div class="insight"><div class="big">41%</div><p>of online bookings come in after hours, when nobody is answering the phone.</p><div class="clock">' + Array.apply(null, Array(24)).map(function (_, hr) { var ah = hr < 8 || hr >= 18, v = [3, 2, 1, 1, 1, 2, 4, 6, 7, 8, 9, 9, 8, 9, 9, 8, 8, 9, 10, 11, 12, 11, 9, 6][hr]; return '<i class="' + (ah ? 'ah' : '') + '" style="height:' + v * 8 + '%"></i>'; }).join('') + '</div><div class="clock-l"><span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span></div>' +
        '<small>Orange: requests that arrive outside 8 AM to 6 PM. Published data from large home-service booking platforms.</small></div>' +
        '<p style="margin-top:18px">Your booking page takes those requests while you work or sleep, with your prices and your schedule.</p>' + act(false);
    }
    else if (s.type === 'build') {
      var tr = (TRADES.filter(function (x) { return x[0] === S.trade; })[0] || TRADES[0])[1].toLowerCase();
      var items = ['Creating ' + BIZ() + '\'s account', 'Adding ' + tr + ' services and prices', 'Opening your schedule for after-hours booking', 'Connecting your lead inbox', 'Preparing your dashboard'];
      h += '<div class="building"><div class="ring"><svg viewBox="0 0 140 140"><circle class="t" cx="70" cy="70" r="60"/><circle class="p" id="ringP" cx="70" cy="70" r="60"/></svg><b id="ringN">0%</b></div><h1 style="margin-top:22px;text-align:center">Setting up ' + esc(BIZ()) + '</h1><ul class="blist" id="blist">' + items.map(function (t) { return '<li><i>' + I('chk') + '</i>' + esc(t) + '</li>'; }).join('') + '</ul></div>';
    }
    else if (s.type === 'ready') {
      var full = recommend() === 'full';
      var lines = [];
      if (S.miss === 'vm' || S.miss === 'later') lines.push(['Catch the calls you can\'t pick up', 'Customers book online instead of leaving a voicemail.']);
      else lines.push(['Take bookings around the clock', 'Including the 41% that come in after hours.']);
      lines.push(['Your ' + ((TRADES.filter(function (x) { return x[0] === S.trade; })[0] || TRADES[0])[1]).toLowerCase() + ' services and prices', 'Ready to edit. Customers see the price before they book.']);
      lines.push(['A text the second someone books', 'With the job, the price they saw and their number.']);
      lines.push([S.reach.indexOf('google') > -1 || S.reach.indexOf('social') > -1 ? 'On your Google profile, Facebook and Instagram' : 'On your website and Google profile', 'One link works everywhere customers find you.']);
      if (S.goal === 'reviews' || full) lines.push(['Automatic Google review requests', 'Included in Website + Reviews + Booking Widget.']);
      h += '<p class="k">Your plan is ready</p><h1>Here\'s how ' + esc(BIZ()) + ' books more jobs</h1>' +
        '<div class="plan-sum"><div class="ph"><small>Built for ' + esc(BIZ()) + '</small><b>' + (S.goal === 'reviews' ? 'More reviews and more booked jobs' : S.goal === 'time' ? 'Less phone time, more booked jobs' : 'Book more jobs without answering every call') + '</b></div><ul>' +
        lines.map(function (l) { return '<li><i>' + I('chk') + '</i><div><b>' + esc(l[0]) + '</b><span>' + esc(l[1]) + '</span></div></li>'; }).join('') + '</ul></div>' + act(false, 'See my plan');
    }
    h += '</div>'; m.innerHTML = h;
    var inp = $('#qIn'); if (inp) setTimeout(function () { inp.focus(); }, 60);
    if (s.type === 'build') runBuild();
    if (s.type === 'biz') bizSearch();
    track('ViewContent', { content_name: 'onboarding_' + s.k }, false);
  }
  function act(disabled, label) { return '<div class="q-actions"><span></span><button class="btn dark" type="button" id="qNext"' + (disabled ? ' disabled' : '') + '>' + (label || 'Continue') + ' ' + I('arw') + '</button></div>'; }
  function next() { var s = STEPS[onbIdx]; if (s.type === 'text' || s.type === 'biz') { S[s.k] = $('#qIn').value.trim(); } save(); location.hash = '#onb/' + (onbIdx + 1); }
  $('#onbBack').addEventListener('click', function () { var i = onbIdx - 1; while (i > 0 && (STEPS[i].type === 'build' || (STEPS[i].k === 'name' && S.email === GOOGLE_DEMO.email))) i--; location.hash = '#onb/' + Math.max(0, i); });
  $('#onbMain').addEventListener('input', function (e) { if (e.target.id === 'qIn') { var b = $('#qNext'); if (b) b.disabled = !e.target.value.trim(); } });
  $('#onbMain').addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'qIn' && e.target.value.trim()) { e.preventDefault(); next(); } });
  $('#onbMain').addEventListener('click', function (e) {
    if (e.target.closest('#qNext')) { if (STEPS[onbIdx].type === 'ready') { S.plan = recommend(); save(); location.hash = '#plan'; } else next(); return; }
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
    var full = S.plan === 'full';
    $('#tlRemind').textContent = md(REMIND); $('#tlCharge').textContent = md(END);
    $('#tlChargeTx').textContent = 'You\'re charged $' + price() + '. Cancel anytime before, in one click.';
    $('#toCheckout').innerHTML = (full ? 'Book my setup call ' : 'Start my free trial ') + I('arw');
    $('#pwFine').textContent = full ? 'Your 14 days start when your new site goes live. Then $199/month.' : '$0 due today. Then $99/month. Cancel anytime.';
    track('ViewContent', { content_name: 'paywall' });
  }
  $('#plans').addEventListener('click', function (e) { var c = e.target.closest('.pcard'); if (!c) return; S.plan = c.getAttribute('data-plan'); save(); paywall(); });
  $('#toCheckout').addEventListener('click', function () {
    if (S.plan === 'full') { location.href = '../product/?call=1&biz=' + encodeURIComponent(S.biz || ''); return; }
    track('InitiateCheckout', { value: 99, currency: 'USD', content_name: 'booking_widget' }); location.hash = '#checkout';
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
      setTimeout(function () { location.hash = '#app/home'; setTimeout(welcome, 350); }, 700);
    }, reduce ? 200 : 1500);
  }
  $('#coPay').addEventListener('click', pay); $('#payLink').addEventListener('click', pay); $('#payApple').addEventListener('click', pay);
  function welcome() {
    modal('<div class="okc">' + I('chk') + '</div><h3>Your free trial has started</h3><p>Welcome to DialBridge, ' + esc(first()) + '. Next, set up your booking widget. It takes about 10 minutes.</p><a class="btn" href="#app/widget" data-close>Set up my booking widget ' + I('arw') + '</a><p style="margin-top:12px;font-size:13px">Trial ends ' + md(END) + '. We remind you on ' + md(REMIND) + '.</p>');
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
  var TITLES = { home: 'Home', leads: 'Leads', bookings: 'Bookings', reviews: 'Reviews', traffic: 'Traffic', widget: 'Booking widget', settings: 'Settings' };
  function app(pg) {
    if (!TITLES[pg]) pg = 'home';
    $$('.nav a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-pg') === pg); });
    $('#pgTitle').textContent = TITLES[pg];
    $('#bizName').textContent = BIZ(); $('#bizAv').textContent = BIZ().charAt(0).toUpperCase(); $('#bizAv').style.background = S.brand;
    $('#bizPlan').textContent = S.plan === 'full' ? 'Website + Reviews' : 'Booking Widget';
    $('#meName').textContent = S.name || 'You'; $('#meAv').textContent = (S.name || 'Y').charAt(0).toUpperCase();
    $('#trialEnd').textContent = 'Ends ' + md(END) + ', then $' + price() + '/mo';
    var P = $('#page'); P.innerHTML = PAGES[pg](); P.firstElementChild && P.firstElementChild.classList.add('on');
    if (pg === 'widget') wizard();
    if (pg === 'leads') leadsInit();
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
    home: function () {
      var w = S.widgetDone, tasks = [
        [true, 'Create your account', 'Done'],
        [w, 'Set up your booking widget', 'Services, prices, hours and your look. About 10 minutes.', '#app/widget', 'Start'],
        [false, 'Put it on your website and Google', 'Copy one line, or send it to your web person.', w ? '#app/widget/4' : '', w ? 'Open' : ''],
        [false, 'Turn on Google review requests', S.plan === 'full' ? 'Ask every customer after the job.' : 'Included in Website + Reviews.', '#app/reviews', S.plan === 'full' ? 'Turn on' : 'See plan'],
        [false, 'Get your first booking', 'Share your link on Facebook or text it to a past customer.']
      ], done = tasks.filter(function (t) { return t[0]; }).length, curI = tasks.findIndex(function (t) { return !t[0]; });
      return '<div class="pg"><div class="hello"><h2>' + greet() + ', ' + esc(first()) + '</h2><p>' + new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + '</p></div>' +
        '<div class="card guide"><div class="guide-l"><div class="guide-h">' + ring(done, tasks.length) + '<div><h3>Get ' + esc(BIZ()) + ' ready for bookings</h3><p>' + (w ? 'Your booking page is live. Two more steps.' : 'Most owners finish in about 10 minutes.') + '</p></div></div><ol class="tasks">' +
        tasks.map(function (t, i) { return '<li class="task' + (t[0] ? ' done' : '') + (i === curI ? ' cur' : '') + (!t[0] && !t[3] && i !== curI ? ' locked' : '') + '"><i>' + I('chk') + '</i><div><b>' + esc(t[1]) + '</b><span>' + esc(t[2]) + '</span></div>' + (t[3] && !t[0] ? '<a class="btn sm' + (i === curI ? '' : ' ghost') + '" href="' + t[3] + '">' + t[4] + '</a>' : '') + '</li>'; }).join('') +
        '</ol></div><div class="guide-r"><img src="img/widget.webp" alt="Your booking widget" width="900" height="560"><p>' + (w ? 'Live at book.dialbridge.ai/' + slug() : 'This is what your customers will see. Make it yours in the setup.') + '</p></div></div>' +
        '<div class="sample">' + I('info') + 'Sample data below. Your real numbers show up here after your first booking.</div>' +
        '<div class="kpis"><div class="card kpi"><span>Booking requests</span><b>34</b><small class="up">' + I('up') + '21% vs last month</small></div><div class="card kpi"><span>Booked jobs</span><b>18</b><small class="mute">$10,686 in jobs</small></div><div class="card kpi"><span>Average reply time</span><b>19 min</b><small class="mute">Goal: 15 min</small></div><div class="card kpi"><span>Google rating</span><b>4.9 ★</b><small class="mute">212 reviews</small></div></div>' +
        '<div class="grid2"><div class="card"><div class="card-h"><h3>Booking requests</h3><span>Last 14 days</span></div><div class="chart">' + barsChart() + '<div class="legend"><span><i style="background:#1d221c"></i>Business hours</span><span><i style="background:#f35427"></i>After hours, would have gone to voicemail</span></div></div></div>' +
        '<div class="card"><div class="card-h"><h3>Latest activity</h3><a class="link" href="#app/leads" style="font-size:13px">See all</a></div><ul class="feed">' +
        LEADS.slice(0, 5).map(function (l) { return '<li><span class="fi">' + I(l.s === 'won' ? 'cal' : l.p ? 'inbox' : 'msg') + '</span><div><b>' + esc(l.n) + '</b><span>' + esc(l.t) + '</span></div><span class="pill ' + PILL[l.s][0] + '">' + PILL[l.s][1] + '</span></li>'; }).join('') + '</ul></div></div></div>';
    },
    leads: function () {
      return '<div class="pg"><div class="hello"><h2>Leads</h2><p>3 new requests waiting. Fast replies win the job.</p></div><div class="sample">' + I('info') + 'Sample leads. Real ones arrive here and by text the moment someone books.</div>' +
        '<div class="card leads"><div class="leads-l"><div class="tabs"><button class="on">All 8</button><button>New 3</button><button>Scheduled 2</button><button>Booked 2</button><button>Lost 1</button></div><div id="lrows">' +
        LEADS.map(function (l, i) { return '<div class="lrow' + (i ? '' : ' on') + '" data-i="' + i + '"><b>' + (l.s === 'new' ? '<span style="color:var(--accent)">● </span>' : '') + esc(l.n) + '</b><small>' + l.ago + '</small><span>' + esc(l.t) + '</span><span class="pill ' + PILL[l.s][0] + '" style="justify-self:end">' + PILL[l.s][1] + '</span></div>'; }).join('') +
        '</div></div><div class="ld" id="ld"></div></div></div>';
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
        '<ol class="card wz-steps" id="wzSteps">' + [['Your look', 'Logo and color'], ['Services and prices', 'What customers can book'], ['Hours and area', 'When and where you work'], ['Go live', 'Website, Google, social']].map(function (s, i) { return '<li data-s="' + (i + 1) + '"><button type="button"><i>' + (i + 1) + '</i><div><b>' + s[0] + '</b><span>' + s[1] + '</span></div></button></li>'; }).join('') + '</ol>' +
        '<div class="card wz-form" id="wzForm"></div>' +
        '<div class="wz-prev"><div class="card"><div class="bar"><i></i><i></i><i></i><span id="wzUrl">book.dialbridge.ai/' + slug() + '</span></div><iframe id="wzFrame" title="Your booking widget preview"></iframe></div><p>Live preview. Tap through it like a customer.</p></div></div></div>';
    },
    settings: function () {
      return '<div class="pg"><div class="hello"><h2>Settings</h2><p>Your account, business and billing.</p></div><div class="grid2"><div class="card"><div class="card-h"><h3>Business</h3></div><div style="padding:18px;display:flex;flex-direction:column;gap:12px"><label class="field">Business name<input class="in" value="' + esc(BIZ()) + '"></label><label class="field">Where you work<input class="in" value="' + esc(S.area) + '" placeholder="Bergen County, NJ"></label><label class="field">Your mobile <em>new bookings are texted here</em><input class="in" placeholder="(201) 555-0148"></label></div></div>' +
        '<div class="card"><div class="card-h"><h3>Plan and billing</h3><span>Managed by Stripe</span></div><div style="padding:18px"><b style="font-size:17px">' + (S.plan === 'full' ? 'Website + Reviews + Booking Widget' : 'Booking Widget') + '</b><p style="margin:4px 0 0;color:var(--mute)">Free trial until ' + md(END) + ', then $' + price() + '/month</p><p style="margin:14px 0 0;font-size:14px">Visa ending in 4242</p><div style="display:flex;gap:8px;margin-top:16px"><button class="btn sm ghost" type="button">Update card</button><button class="btn sm ghost" type="button">Cancel trial</button></div></div></div></div></div>';
    }
  };
  /* leads interaction */
  function leadDetail(i) {
    var l = LEADS[i];
    $('#ld').innerHTML = '<div class="ld-h"><h3>' + esc(l.n) + '</h3><span class="pill ' + PILL[l.s][0] + '">' + PILL[l.s][1] + '</span><a class="btn sm ghost" href="#">' + I('phone') + 'Call</a></div><p style="margin:4px 0 0;color:var(--mute);font-size:14px">(201) 555-0' + (140 + i) + ' · ' + esc(l.a) + (l.ah ? ' · <b style="color:var(--accent-ink)">' + I('moon') + ' booked after hours</b>' : '') + '</p>' +
      '<div class="facts"><div><span>Job</span><b>' + esc(l.t) + '</b></div><div><span>When</span><b>' + esc(l.w) + '</b></div><div><span>Price shown</span><b>' + esc(l.p || 'None') + '</b></div><div><span>Source</span><b>' + esc(l.src) + '</b></div><div><span>Received</span><b>' + l.ago + ' ago</b></div><div><span>Photos</span><b>' + (i % 2 ? 'None' : '2 attached') + '</b></div></div>' +
      '<div class="reply"><div class="chips"><button type="button">Confirm time</button><button type="button">Send price</button><button type="button">Ask for photos</button><button type="button">On the way</button></div><textarea placeholder="Text ' + esc(l.n.split(' ')[0]) + '..."></textarea><div class="rb"><span>Sends from your business number</span><button class="btn sm" type="button" id="sendTx">Send text</button></div></div>' +
      '<div style="display:flex;gap:8px;margin-top:14px"><button class="btn sm ghost" type="button">' + I('cal') + 'Mark scheduled</button><button class="btn sm ghost" type="button">' + I('chk') + 'Mark booked</button><button class="btn sm ghost" type="button">Mark lost</button></div>';
  }
  function leadsInit() {
    leadDetail(0);
    $('#lrows').addEventListener('click', function (e) { var r = e.target.closest('.lrow'); if (!r) return; $$('.lrow').forEach(function (x) { x.classList.toggle('on', x === r); }); leadDetail(+r.getAttribute('data-i')); });
    $('#ld').addEventListener('click', function (e) { var c = e.target.closest('.chips button'); if (c) $('textarea', $('#ld')).value = { 'Confirm time': 'Hi! You\'re all set for the time you picked. We\'ll text when we\'re on the way.', 'Send price': 'Thanks for the details! Your price is $199 to $279, confirmed on site.', 'Ask for photos': 'Could you text a couple of photos of the items? It helps us give an exact price.', 'On the way': 'We\'re on the way, about 20 minutes out.' }[c.textContent]; if (e.target.closest('#sendTx')) toast('Demo: text not sent'); });
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
    if (wzStep === 1) h = '<div><h3>Your look</h3><p>Add your logo and pick your brand color.</p></div><div class="wz-body"><div class="field">Logo<label class="drop">' + (S.logo ? '<img src="' + S.logo + '" alt="">' : I('up')) + '<span>' + (S.logo ? 'Change logo' : 'Upload your logo (PNG or JPG)') + '</span><input type="file" id="wzLogo" accept="image/png,image/jpeg,image/webp"></label></div>' +
      '<div class="field">Brand color<div class="sw">' + COLORS.map(function (c) { return '<button type="button" data-c="' + c + '" style="background:' + c + '"' + (c.toLowerCase() === S.brand.toLowerCase() ? ' class="on"' : '') + ' aria-label="' + c + '"></button>'; }).join('') + '</div></div>' +
      '<label class="field">Business name<input class="in" id="wzName" value="' + esc(BIZ()) + '"></label></div>';
    else if (wzStep === 2) h = '<div><h3>Services and prices</h3><p>Turn on what you offer. Prices show as "from" ranges; 0 means free estimate.</p></div><div class="wz-body">' +
      SVC[trade()].map(function (x) { var on = S.svc[x[0]] !== false; return '<div class="svc"><button type="button" class="tog' + (on ? ' on' : '') + '" data-svc="' + x[0] + '" aria-label="Offer ' + x[1] + '"></button><div><b>' + x[1] + '</b><span>' + (x[2] ? 'Price shown up front' : 'Free estimate') + '</span></div><label class="pr">From $<input value="' + (x[2] || 0) + '" inputmode="numeric"></label></div>'; }).join('') + '</div>';
    else if (wzStep === 3) h = '<div><h3>Hours and area</h3><p>Customers only see times you can actually take.</p></div><div class="wz-body"><div class="field">Days you work<div class="days" id="wzDays">' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(function (d, i) { return '<button type="button" data-d="' + i + '"' + (S.days.indexOf(i) > -1 ? ' class="on"' : '') + '>' + d + '</button>'; }).join('') + '</div></div>' +
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
      S.widgetDone = true; save(); track('Lead', { content_name: 'widget_published', value: 99, currency: 'USD' }); wzRender();
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
  route();
})();
