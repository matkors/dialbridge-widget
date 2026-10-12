/* Booking a call with the Dialbridge team: real open times from our GHL calendars, booked through n8n.
   Used by the Try it popup on the website (try.html) and by the app (/call/help, /call/website).
   The app keeps a copy at app/public/js/callbook.js: edit this file and copy it over.

   Kinds (one GHL calendar each):
     demo     20 min, before sign-up (Try it popup, landing page)
     website  30 min, the $199 plan: we build their website with them
     help     15 min, signed-up owners who want help going live

   window.CallBook
     .slots(kind)            -> Promise<{ ok, days: [{ date: 'YYYY-MM-DD', slots: [iso] }] }>
     .book(data)             -> Promise<{ ok, startTime } | { ok: false, error }>
                                data: { kind, firstName, lastName, email, phone, business, startTime, interests, note, plan, accountId }
     .picker(el, kind, onPick) renders a day strip + times into el and calls onPick(iso) when one is tapped
     .when(iso)              -> 'Tue, Oct 13 at 10:20 AM'
   Colors come from CSS variables the page can set: --cb-accent, --cb-on-accent, --cb-ink, --cb-mute, --cb-line, --cb-soft, --cb-card. */
(function () {
  'use strict';
  var BASE = 'https://matkors.app.n8n.cloud/webhook/dialbridge/';
  var TZ = 'America/New_York';
  try { TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || TZ; } catch (e) { }

  function slots(kind) {
    return fetch(BASE + 'call-slots-k7q2?kind=' + encodeURIComponent(kind) + '&tz=' + encodeURIComponent(TZ))
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, days: [] }; });
  }
  function book(d) {
    return fetch(BASE + 'call-book-r8m4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'booking_failed' }; }); })
      .catch(function () { return { ok: false, error: 'network' }; });
  }
  function when(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  var CSS = '.cb{--a:var(--cb-accent,#f35427);--oa:var(--cb-on-accent,#fff);--k:var(--cb-ink,#1d221c);--m:var(--cb-mute,#6b7068);--l:var(--cb-line,#e4e3dc);--s:var(--cb-soft,#f4f3ee);--c:var(--cb-card,#fff);display:flex;flex-direction:column;gap:14px}' +
    '.cb-days{display:grid;grid-template-columns:repeat(var(--n,6),minmax(0,1fr));gap:8px}' +
    '.cb-day{display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 0;border:1px solid var(--l);border-radius:12px;background:var(--c);color:var(--m);font:inherit;font-size:12.5px;cursor:pointer;transition:border-color .15s,background-color .15s,transform .12s}' +
    '.cb-day b{font-size:19px;color:var(--k);font-weight:700}.cb-day:hover{border-color:color-mix(in srgb,var(--a) 45%,var(--l))}.cb-day:active{transform:scale(.96)}' +
    '.cb-day.on{background:var(--a);border-color:var(--a);color:var(--oa)}.cb-day.on b{color:var(--oa)}' +
    '.cb-tz{margin:0;font-size:12.5px;color:var(--m)}' +
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

  // Day strip + times. Keeps the last loaded times, so going back to this step doesn't load again.
  var cache = {};
  function picker(el, kind, onPick, picked) {
    style();
    el.innerHTML = '<div class="cb"><div class="cb-days">' + new Array(6).join('<i class="cb-sk"></i>') + '</div><div class="cb-times"><i class="cb-sk"></i><i class="cb-sk"></i><i class="cb-sk"></i></div></div>';
    var p = cache[kind] ? Promise.resolve(cache[kind]) : slots(kind);
    return p.then(function (r) {
      var days = (r && r.ok && r.days) || [];
      if (days.length) cache[kind] = r;
      if (!days.length) { el.innerHTML = '<div class="cb"><p class="cb-none">We couldn\'t load open times. Try again in a minute, or send us a message instead.</p></div>'; return false; }
      days = days.slice(0, 6);
      var sel = 0;
      if (picked) days.forEach(function (d, i) { if (d.slots.indexOf(picked) > -1) sel = i; });
      function draw() {
        var tzName = ''; try { tzName = new Date().toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop(); } catch (e) { }
        el.innerHTML = '<div class="cb"><div class="cb-days" style="--n:' + days.length + '">' + days.map(function (d, i) {
          var dt = new Date(d.date + 'T12:00:00');
          return '<button type="button" class="cb-day' + (i === sel ? ' on' : '') + '" data-i="' + i + '"><span>' + dt.toLocaleDateString('en-US', { weekday: 'short' }) + '</span><b>' + dt.getDate() + '</b></button>';
        }).join('') + '</div><p class="cb-tz">Times in your time zone' + (tzName ? ' (' + tzName + ')' : '') + '</p><div class="cb-times">' + days[sel].slots.map(function (s) {
          return '<button type="button" class="cb-time' + (s === picked ? ' on' : '') + '" data-s="' + s + '"><i></i>' + new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + '</button>';
        }).join('') + '</div></div>';
      }
      draw();
      el.onclick = function (e) {
        var d = e.target.closest('.cb-day'), t = e.target.closest('.cb-time');
        if (d) { sel = +d.getAttribute('data-i'); draw(); }
        if (t) { picked = t.getAttribute('data-s'); draw(); onPick(picked); }
      };
      return true;
    });
  }

  window.CallBook = { slots: slots, book: book, picker: picker, when: when, forget: function (k) { delete cache[k]; } };
})();
