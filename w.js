/* DialBridge widget loader. Install with one line:
   <script async src="https://matviykorsunskiy.me/dialbridge-widget/w.js" data-business="harbor-haul" data-color="#0E6650"></script>
   Optional: data-label="Book a pickup", data-position="left", data-config="<base64url>" (demo generator).
   Inline mode for builders that block floating buttons: <div data-dialbridge-inline="harbor-haul"></div> */
(function () {
  'use strict';
  var s = document.currentScript || document.querySelector('script[src*="w.js"][data-business],script[src*="w.js"][data-config]');
  if (!s || window.__dbwLoaded) return;
  window.__dbwLoaded = true;
  var base = s.src.replace(/w\.js(\?.*)?$/, '');
  var slug = (s.getAttribute('data-business') || '').replace(/[^a-z0-9-]/g, '');
  var cfg = (s.getAttribute('data-config') || '').replace(/[^A-Za-z0-9_-]/g, '');
  var color = /^#[0-9a-fA-F]{6}$/.test(s.getAttribute('data-color') || '') ? s.getAttribute('data-color') : '#0E6650';
  var label = s.getAttribute('data-label') || 'Book online';
  var left = s.getAttribute('data-position') === 'left';
  var q = (cfg ? 'c=' + cfg : 'b=' + (slug || 'harbor-haul'));
  var src = base + 'book.html?embed=1&' + q;

  function onBrand(hex) {
    var c = [1, 3, 5].map(function (i) { var v = parseInt(hex.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] > 0.45 ? '#1A1D21' : '#FFFFFF';
  }

  // Launcher in a shadow root so the host site's CSS can't restyle it.
  var host = document.createElement('div');
  host.style.cssText = 'position:fixed;z-index:2147483000;bottom:24px;' + (left ? 'left' : 'right') + ':24px';
  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
  root.innerHTML = '<style>' +
    '.w{display:flex;flex-direction:column;align-items:' + (left ? 'flex-start' : 'flex-end') + ';gap:7px;font-family:"Instrument Sans",system-ui,-apple-system,"Segoe UI",sans-serif}' +
    'button{display:flex;align-items:center;gap:10px;height:54px;padding:0 22px 0 18px;border:0;border-radius:27px;background:' + color + ';color:' + onBrand(color) + ';font:600 15.5px/1 inherit;font-family:inherit;cursor:pointer;box-shadow:0 8px 24px rgba(26,29,33,.2),0 2px 6px rgba(26,29,33,.12);transition:transform .15s}' +
    'button:hover{transform:translateY(-1px)}button:focus-visible{outline:3px solid ' + color + ';outline-offset:3px}' +
    'span{font-size:11px;color:#8A9099;background:rgba(255,255,255,.85);padding:1px 6px;border-radius:4px}' +
    '@media (max-width:640px){button{height:50px;font-size:15px}}</style>' +
    '<div class="w"><button type="button" aria-haspopup="dialog"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>' +
    label.replace(/[<>&]/g, '') + '</button><span>Powered by DialBridge</span></div>';

  var overlay = null, frame = null, lastFocus = null, prefetched = false;
  function prefetch() {
    if (prefetched) return; prefetched = true;
    var l = document.createElement('link'); l.rel = 'prefetch'; l.href = src; document.head.appendChild(l);
  }
  function open(start) {
    if (overlay) return;
    var url = src + (/^(book|quote|text|call)$/.test(start || '') ? '&start=' + start : '');
    lastFocus = document.activeElement;
    var mobile = window.matchMedia('(max-width: 640px)').matches;
    overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483001;background:rgba(26,29,33,.5);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s';
    frame = document.createElement('iframe');
    frame.src = url;
    frame.title = 'Book online';
    frame.setAttribute('allow', 'camera');
    frame.style.cssText = mobile
      ? 'width:100%;height:100%;border:0;background:#fff'
      : 'width:min(600px,96vw);height:min(720px,92vh);border:0;border-radius:8px;background:#fff;box-shadow:0 30px 80px rgba(0,0,0,.35);transform:translateY(8px) scale(.98);transition:transform .2s';
    overlay.appendChild(frame);
    document.body.appendChild(overlay);
    host.style.display = 'none';
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function () { overlay.style.opacity = '1'; frame.style.transform = 'none'; frame.focus(); });
  }
  function close() {
    if (!overlay) return;
    overlay.remove(); overlay = null; frame = null;
    host.style.display = '';
    document.documentElement.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  window.addEventListener('message', function (e) {
    if (!frame || e.source !== frame.contentWindow || !e.data) return;
    if (e.data.type === 'dbw:close') close();
    if (e.data.type === 'dbw:submit') document.dispatchEvent(new CustomEvent('dialbridge:submit', { detail: e.data }));
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  var btn = root.querySelector('button');
  btn.addEventListener('click', function () { open(); });
  btn.addEventListener('mouseenter', prefetch);
  setTimeout(prefetch, 3000);

  function mount() {
    document.body.appendChild(host);
    Array.prototype.forEach.call(document.querySelectorAll('[data-dialbridge-inline]'), function (el) {
      var b = (el.getAttribute('data-dialbridge-inline') || slug).replace(/[^a-z0-9-]/g, '');
      var f = document.createElement('iframe');
      f.src = base + 'book.html?embed=1&inline=1&' + (cfg ? 'c=' + cfg : 'b=' + b);
      f.title = 'Book online';
      f.style.cssText = 'width:100%;height:680px;border:0;border-radius:18px';
      el.appendChild(f);
    });
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  // Links like yoursite.com/?book or /#book (or ?book=quote) open the widget straight away, for ads and social bios.
  var auto = new URLSearchParams(location.search).get('book');
  if (auto !== null || location.hash === '#book') setTimeout(function () { open(auto); }, 300);
  window.DialBridgeWidget = { open: open, close: close };
})();
