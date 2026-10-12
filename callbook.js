/* Booking a call with the Dialbridge team: real open times from our GHL calendars, booked through n8n.
   Used by the Try it popup on the website (try.html) and by the app (/call/help, /call/website).
   The app keeps a copy at app/public/js/callbook.js: edit this file and copy it over.

   Kinds (one GHL calendar each):
     demo     20 min, before sign-up (Try it popup, landing page)
     website  30 min, the $199 plan: we build their website with them
     help     15 min, signed-up owners who want help going live

   window.CallBook
     .slots(kind)            -> Promise<{ ok, days: [{ date: 'YYYY-MM-DD', slots: [iso] }] }> (one request per kind, reused for 2 minutes)
     .prefetch(kind)         start loading times early (when the popup or page opens), so the picker shows them at once
     .book(data)             -> Promise<{ ok, startTime } | { ok: false, error }>
                                data: { kind, firstName, lastName, email, phone, business, startTime, interests, note, plan, accountId }
                                (their time zone is added, so GHL's invite and reminders use it)
     .picker(el, kind, onPick) renders a day strip + times into el and calls onPick(iso) when one is tapped,
                                or onPick('') when they switch time zone (the times change, so they pick again)
     .when(iso)              -> 'Tue, Oct 13 at 10:20 AM EDT'
   Times show in the visitor's own time zone (from their device), with a switcher like GHL's booking page.
   Colors come from CSS variables the page can set: --cb-accent, --cb-on-accent, --cb-ink, --cb-mute, --cb-line, --cb-soft, --cb-card. */
(function () {
  'use strict';
  var BASE = 'https://matkors.app.n8n.cloud/webhook/dialbridge/';
  var TZ = 'America/New_York';
  try { TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || TZ; } catch (e) { }
  var ZONES = [['America/New_York', 'Eastern Time'], ['America/Chicago', 'Central Time'], ['America/Denver', 'Mountain Time'], ['America/Phoenix', 'Arizona'],
    ['America/Los_Angeles', 'Pacific Time'], ['America/Anchorage', 'Alaska'], ['Pacific/Honolulu', 'Hawaii']];
  if (!ZONES.some(function (z) { return z[0] === TZ; })) ZONES.unshift([TZ, TZ.split('/').pop().replace(/_/g, ' ')]);
  function abbr(iso) { try { return new Date(iso || Date.now()).toLocaleTimeString('en-US', { timeZone: TZ, timeZoneName: 'short' }).split(' ').pop(); } catch (e) { return ''; } }
  function hm(iso) { return new Date(iso).toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }); }

  // One request per kind, shared by everything that asks within 2 minutes. A failed load is not kept, so the next ask retries.
  var cache = {};
  function slots(kind) {
    var key = kind + '|' + TZ, c = cache[key];
    if (c && Date.now() - c.at < 120000) return c.p;
    var p = fetch(BASE + 'call-slots-k7q2?kind=' + encodeURIComponent(kind) + '&tz=' + encodeURIComponent(TZ))
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, days: [] }; })
      .then(function (r) { if (!(r && r.ok && r.days && r.days.length)) delete cache[key]; return r; });
    cache[key] = { p: p, at: Date.now() };
    return p;
  }
  function book(d) {
    return fetch(BASE + 'call-book-r8m4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ timezone: TZ }, d)) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'booking_failed' }; }); })
      .catch(function () { return { ok: false, error: 'network' }; });
  }
  function when(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric' }) + ' at ' + hm(iso) + ' ' + abbr(iso);
  }

  var CSS = '.cb{--a:var(--cb-accent,#f35427);--oa:var(--cb-on-accent,#fff);--k:var(--cb-ink,#1d221c);--m:var(--cb-mute,#6b7068);--l:var(--cb-line,#e4e3dc);--s:var(--cb-soft,#f4f3ee);--c:var(--cb-card,#fff);display:flex;flex-direction:column;gap:14px}' +
    '.cb-days{display:grid;grid-template-columns:repeat(var(--n,6),minmax(0,1fr));gap:8px}' +
    '.cb-day{display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 0;border:1px solid var(--l);border-radius:12px;background:var(--c);color:var(--m);font:inherit;font-size:12.5px;cursor:pointer;transition:border-color .15s,background-color .15s,transform .12s}' +
    '.cb-day b{font-size:19px;color:var(--k);font-weight:700}.cb-day:hover{border-color:color-mix(in srgb,var(--a) 45%,var(--l))}.cb-day:active{transform:scale(.96)}' +
    '.cb-day.on{background:var(--a);border-color:var(--a);color:var(--oa)}.cb-day.on b{color:var(--oa)}' +
    '.cb-tz{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0;font-size:13px;color:var(--m)}' +
    '.cb-tz svg{width:15px;height:15px;flex-shrink:0}' +
    '.cb-tzs{max-width:100%;height:34px;padding:0 30px 0 10px;border:1px solid var(--l);border-radius:9px;background:var(--c) url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%236b7068%27 stroke-width=%272.4%27%3E%3Cpath d=%27M6 9l6 6 6-6%27/%3E%3C/svg%3E") no-repeat right 9px center/14px;color:var(--k);font:inherit;font-size:13px;font-weight:600;cursor:pointer;-webkit-appearance:none;appearance:none}' +
    '.cb-times{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;animation:cbIn .3s cubic-bezier(.23,1,.32,1) both}' +
    '.cb-time{display:flex;align-items:center;justify-content:center;gap:8px;height:46px;border:1px solid var(--l);border-radius:12px;background:var(--c);color:var(--k);font:inherit;font-size:15px;font-weight:600;cursor:pointer;transition:border-color .15s,background-color .15s,transform .12s}' +
    '.cb-time i{width:7px;height:7px;border-radius:50%;background:#2f9e5b}' +
    '.cb-time:hover{border-color:var(--a)}.cb-time:active{transform:scale(.97)}.cb-time.on{border-color:var(--a);box-shadow:0 0 0 1px var(--a);background:color-mix(in srgb,var(--a) 8%,var(--c))}' +
    '.cb-load,.cb-none{padding:18px;border-radius:12px;background:var(--s);color:var(--m);font-size:14px;text-align:center}' +
    '.cb-sk{height:46px;border-radius:12px;background:linear-gradient(90deg,var(--s) 0,color-mix(in srgb,var(--s) 40%,var(--c)) 50%,var(--s) 100%) 0 0/300% 100%;animation:cbSh 1.2s linear infinite}' +
    '@keyframes cbSh{to{background-position:-300% 0}}@keyframes cbIn{from{opacity:0;transform:translateY(6px)}}' +
    '@media (max-width:560px){.cb-days{grid-template-columns:repeat(4,minmax(0,1fr))}.cb-days .cb-day:nth-child(n+5){display:none}.cb-days.all .cb-day{display:flex}.cb-times{grid-template-columns:repeat(2,minmax(0,1fr))}}' +
    '@media (prefers-reduced-motion:reduce){.cb *{animation:none!important;transition:none!important}}';
  function style() { if (document.getElementById('cb-css')) return; var s = document.createElement('style'); s.id = 'cb-css'; s.textContent = CSS; document.head.appendChild(s); }

  // Day strip + times. Uses the shared load above, so going back to this step (or a prefetch) shows them at once.
  function picker(el, kind, onPick, picked) {
    style();
    el.innerHTML = '<div class="cb"><div class="cb-days">' + new Array(6).join('<i class="cb-sk"></i>') + '</div><div class="cb-times"><i class="cb-sk"></i><i class="cb-sk"></i><i class="cb-sk"></i></div></div>';
    return slots(kind).then(function (r) {
      var days = (r && r.ok && r.days) || [];
      if (!days.length) { el.innerHTML = '<div class="cb"><p class="cb-none">We couldn\'t load open times. Try again in a minute, or send us a message instead.</p></div>'; return false; }
      days = days.slice(0, 6);
      var sel = 0;
      if (picked) days.forEach(function (d, i) { if (d.slots.indexOf(picked) > -1) sel = i; });
      function draw() {
        el.innerHTML = '<div class="cb"><div class="cb-days" style="--n:' + days.length + '">' + days.map(function (d, i) {
          var dt = new Date(d.date + 'T12:00:00');
          return '<button type="button" class="cb-day' + (i === sel ? ' on' : '') + '" data-i="' + i + '"><span>' + dt.toLocaleDateString('en-US', { weekday: 'short' }) + '</span><b>' + dt.getDate() + '</b></button>';
        }).join('') + '</div><p class="cb-tz"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>Times shown in <select class="cb-tzs" aria-label="Time zone">' +
          ZONES.map(function (z) { return '<option value="' + z[0] + '"' + (z[0] === TZ ? ' selected' : '') + '>' + z[1] + '</option>'; }).join('') + '</select></p><div class="cb-times">' + days[sel].slots.map(function (s) {
          return '<button type="button" class="cb-time' + (s === picked ? ' on' : '') + '" data-s="' + s + '"><i></i>' + hm(s) + '</button>';
        }).join('') + '</div></div>';
      }
      draw();
      el.onclick = function (e) {
        var d = e.target.closest('.cb-day'), t = e.target.closest('.cb-time');
        if (d) { sel = +d.getAttribute('data-i'); draw(); }
        if (t) { picked = t.getAttribute('data-s'); draw(); onPick(picked); }
      };
      // Another time zone: load times for it and start the pick over (the same hour means something else now).
      el.onchange = function (e) {
        if (!e.target.classList.contains('cb-tzs')) return;
        TZ = e.target.value; onPick('');
        picker(el, kind, onPick, '');
      };
      return true;
    });
  }

  window.CallBook = { slots: slots, prefetch: slots, book: book, picker: picker, when: when, tz: function () { return TZ; },
    forget: function (k) { Object.keys(cache).forEach(function (key) { if (key.indexOf(k + '|') === 0) delete cache[key]; }); } };
})();
