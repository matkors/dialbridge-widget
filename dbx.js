/* DialBridge shared setup for the product page and the trial app (start/).
   Fill these in at launch. While api is empty, the app runs as a demo: nothing is saved, sent or charged.
     api            the booking API, e.g. https://dialbridge-booking-api.<sub>.workers.dev
     googleClientId Google Sign-In web client ID (shown only in normal browsers)
     pixelId        Meta pixel / dataset ID
     setupCallUrl   GHL calendar link for the free widget setup call
   Also keeps the ad click (fbclid, UTMs) from the first visit, so it survives sign-in and a switch to Safari or Chrome. */
(function () {
  'use strict';
  var C = window.DBX = Object.assign({ api: 'https://dialbridge-booking-api.dialbridge-booking-api.workers.dev', googleClientId: '743909157730-mfbs31gl7ipjb3fsh82969bdrli3jf2j.apps.googleusercontent.com', pixelId: '', setupCallUrl: '' }, window.DBX || {});

  // Facebook, Instagram, Messenger and Threads open links in their own browser, where Google sign-in is blocked.
  C.inApp = /FBAN|FBAV|FB_IAB|FB4A|FBIOS|Instagram|Messenger|Barcelona/i.test(navigator.userAgent || '');

  // First touch wins: the ad that brought them is the one that gets credit.
  var KEY = 'dbx_attr', A = {};
  try { A = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { }
  try {
    var q = new URLSearchParams(location.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'ad_id'].forEach(function (k) {
      var v = q.get(k); if (v && !A[k]) A[k] = v.slice(0, 300);
    });
    if (A.fbclid && !A.fbc_at) A.fbc_at = Date.now();
    if (!A.at) { A.at = Date.now(); A.landing = location.pathname; }
    localStorage.setItem(KEY, JSON.stringify(A));
  } catch (e) { }

  function cookie(n) { var m = document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : ''; }
  // What the sign-up and plan calls send along, so the server can report signups and trials to Meta.
  C.attr = function () {
    var utm = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'].forEach(function (k) { if (A[k]) utm[k] = A[k]; });
    var fbc = cookie('_fbc') || (A.fbclid ? 'fb.1.' + A.fbc_at + '.' + A.fbclid : '');
    return { utm: utm, fbp: cookie('_fbp'), fbc: fbc, tz: (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone };
  };

  // Meta pixel, only when an ID is set.
  if (C.pixelId) {
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s) }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', C.pixelId);
    window.fbq('track', 'PageView');
    if (/\/product\//.test(location.pathname)) window.fbq('track', 'ViewContent', { content_category: 'booking_widget', content_name: 'widget_landing' });
  }
})();
