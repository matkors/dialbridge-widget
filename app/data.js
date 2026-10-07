/* Demo data layer for the DialBridge dashboard.
   Shape mirrors db/schema.sql (businesses, requests, messages, setup steps) so it can be swapped for Supabase calls later.
   Everything lives in this browser's localStorage. Widget demo bookings arrive through the 'dbx_inbox_queue' key. */
(function () {
  'use strict';
  var KEY = 'dbx_db_v4', QUEUE = 'dbx_inbox_queue';
  var MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;

  // Small seeded random so the demo looks the same every reset.
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }

  var FIRST = ['Jordan', 'Maria', 'Kevin', 'Priya', 'Tom', 'Angela', 'Luis', 'Dana', 'Mike', 'Rachel', 'Steve', 'Nicole', 'Chris', 'Elena', 'Brian', 'Sofia', 'Paul', 'Jenna', 'Omar', 'Kathy', 'Victor', 'Lauren', 'Greg', 'Tina'];
  var LAST = ['Lee', 'Russo', 'Patel', 'Kim', 'Moretti', 'Shah', 'Lopez', 'Walsh', 'Cohen', 'Nguyen', 'Bianchi', 'Murphy', 'Diaz', 'Rossi', 'Kaplan', 'Ortiz'];
  var TOWNS = [['Mahwah', '07430'], ['Ramsey', '07446'], ['Wyckoff', '07481'], ['Oakland', '07436'], ['Paramus', '07652'], ['Ridgewood', '07450'], ['Wayne', '07470'], ['Fair Lawn', '07410'], ['Franklin Lakes', '07417'], ['Glen Rock', '07452']];

  var BUSINESSES = [
    { slug: 'harbor-haul', name: 'Harbor Haul', trade: 'junk', owner: 'Mike Torres', ownerPhone: '(201) 555-0148', town: 'Mahwah', plan: 'Growth system', mrr: 497, status: 'Active', since: -64, brand: '#0E6650', texting: 'Toll-free verified', googleLink: true, installedOn: 'WordPress', lastWidgetOpen: -0.08, replyGoalMin: 15 },
    { slug: 'comfort-air', name: 'Comfort Air Heating & Cooling', trade: 'hvac', owner: 'Dan Rizzo', ownerPhone: '(973) 555-0119', town: 'Morristown', plan: 'Booking widget', mrr: 99, status: 'Active', since: -38, brand: '#C8211B', texting: '10DLC pending', googleLink: true, installedOn: 'Wix', lastWidgetOpen: -0.3, replyGoalMin: 10 },
    { slug: 'sparkle-and-co', name: 'Sparkle & Co. Cleaning', trade: 'cleaning', owner: 'Ana Silva', ownerPhone: '(973) 555-0172', town: 'Wayne', plan: 'Booking widget', mrr: 99, status: 'Pilot', since: -9, brand: '#1F4FD1', texting: 'Toll-free submitted', googleLink: false, installedOn: 'Squarespace', lastWidgetOpen: -8, replyGoalMin: 20 },
    { slug: 'northside-haulers', name: 'Northside Haulers', trade: 'junk', owner: 'Rob Feliz', ownerPhone: '(862) 555-0133', town: 'Paterson', plan: 'Growth system', mrr: 0, status: 'Onboarding', since: -2, brand: '#1A1D21', texting: 'Not started', googleLink: false, installedOn: null, lastWidgetOpen: null, replyGoalMin: 15 }
  ];

  var SETUP_STEPS = [
    ['call', 'Kickoff call: services, prices, service area'],
    ['config', 'Widget configured and approved by owner'],
    ['install', 'Installed on website'],
    ['google', 'Booking link added to Google Business Profile'],
    ['texting', 'Business texting number verified'],
    ['alerts', 'Owner alerts tested on their phone'],
    ['reviews', 'Review request text turned on'],
    ['report', 'First monthly report sent']
  ];
  var SETUP_DONE = { 'harbor-haul': 8, 'comfort-air': 6, 'sparkle-and-co': 3, 'northside-haulers': 1 };

  var JUNK = { items: [['Furniture'], ['Furniture', 'Trash and bags'], ['Appliances'], ['Garage or basement'], ['Yard waste'], ['Renovation debris'], ['Wood and planks', 'Trash and bags'], ['Whole property']],
    loads: [['1/4 truck', 199, 279], ['1/2 truck', 349, 449], ['Full truck', 599, 799], ['Few items', 99, 179]] };
  var CLEAN = { items: [['Standard clean'], ['Deep clean'], ['Move in / out']], loads: [['3 beds, 2 baths', 169, 229], ['2 beds, 1 bath', 139, 159], ['4 beds, 3 baths', 259, 299]] };
  var HVAC = { items: [['AC not cooling'], ['Heat not working'], ['Tune-up'], ['New system']], loads: [['$89 visit', 89, 89], ['$129 flat', 129, 129]] };

  function makeRequests() {
    var out = [], now = Date.now(), id = 1000;
    var plan = { 'harbor-haul': 34, 'comfort-air': 22, 'sparkle-and-co': 6 };
    Object.keys(plan).forEach(function (slug) {
      var b = BUSINESSES.filter(function (x) { return x.slug === slug; })[0];
      var T = b.trade === 'junk' ? JUNK : b.trade === 'hvac' ? HVAC : CLEAN;
      for (var i = 0; i < plan[slug]; i++) {
        // Sparkle's widget stopped opening 8 days ago (the "installed wrong" example), so its requests are all older than that.
        var age = slug === 'sparkle-and-co' ? (8.5 + rnd() * 6) * DAY : rnd() * 30 * DAY;
        var fresh = slug !== 'sparkle-and-co' && i < 3;
        if (fresh) age = (i + 1) * (11 + rnd() * 30) * MIN;
        var t = now - age, d = new Date(t), hr = d.getHours();
        // About 40% after hours (industry data says roughly half of online bookings land outside 9 to 5).
        if (!fresh) { d.setHours(rnd() < 0.4 ? pick([18, 19, 20, 21, 22, 6, 7]) : 8 + Math.floor(rnd() * 10), Math.floor(rnd() * 60)); t = d.getTime(); if (t > now - HOUR) t -= DAY; hr = new Date(t).getHours(); age = now - t; }
        var it = pick(T.items), ld = pick(T.loads), town = pick(TOWNS);
        var estimate = /Whole property|New system/.test(it[0]);
        var status = age < 2 * HOUR ? (rnd() < 0.6 ? 'new' : 'contacted') : pick(['won', 'won', 'won', 'scheduled', 'contacted', 'lost', 'won', 'scheduled']);
        var reply = status === 'new' ? null : Math.round((3 + rnd() * (rnd() < 0.8 ? 25 : 140)) * MIN);
        var jobValue = status === 'won' ? (estimate ? Math.round(900 + rnd() * 1800) : Math.round((ld[1] + rnd() * (ld[2] - ld[1])) / 5) * 5) : null;
        var path = estimate ? 'book' : pick(['book', 'book', 'book', 'quote', 'text']);
        var r = {
          id: 'R' + (id++), business: slug, createdAt: t, status: status, path: path,
          name: pick(FIRST) + ' ' + pick(LAST), phone: '(201) 555-0' + (100 + Math.floor(rnd() * 899)), zip: town[1], town: town[0],
          items: it, load: estimate ? null : ld[0], priceShown: estimate ? 'Free estimate' : (ld[1] === ld[2] ? '$' + ld[1] : '$' + ld[1] + ' to $' + ld[2]),
          when: path === 'text' ? null : pick(['Morning', 'Midday', 'Afternoon']) + ', ' + new Date(t + (1 + Math.floor(rnd() * 4)) * DAY).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          message: path === 'text' ? pick(['Do you take old hot tubs?', 'How much for a single mattress?', 'Can you come this Saturday?', 'Do you haul paint cans?']) : null,
          details: estimate ? pick(['3 bed house, full basement, moving out by the 30th', 'Mom\'s house, everything goes except the piano', 'Replacing a 20 year old furnace and AC']) : null,
          photos: rnd() < 0.35 ? Math.ceil(rnd() * 3) : 0,
          source: pick(['Website', 'Website', 'Google profile', 'Google profile', 'Facebook', 'Missed-call text']),
          afterHours: hr < 8 || hr >= 18, replyMs: reply, jobValue: jobValue,
          timeline: []
        };
        r.timeline.push({ at: t, text: 'Request received from ' + r.source.toLowerCase() });
        r.timeline.push({ at: t + 4000, text: 'Owner alerted by text' });
        if (reply) r.timeline.push({ at: t + reply, text: 'Owner replied by text' });
        if (status === 'scheduled' || status === 'won') r.timeline.push({ at: t + reply + 20 * MIN, text: 'Job scheduled' });
        if (status === 'won') r.timeline.push({ at: t + 2 * DAY, text: 'Marked won, $' + jobValue });
        if (status === 'lost') r.timeline.push({ at: t + DAY, text: 'Marked lost: ' + pick(['went with another company', 'price too high', 'no reply from customer']) });
        out.push(r);
      }
    });
    return out.sort(function (a, b) { return b.createdAt - a.createdAt; });
  }

  function seedDb() {
    var now = Date.now();
    var businesses = BUSINESSES.map(function (b) {
      var c = JSON.parse(JSON.stringify(b));
      c.since = now + b.since * DAY;
      c.lastWidgetOpen = b.lastWidgetOpen === null ? null : now + b.lastWidgetOpen * DAY;
      c.setup = SETUP_STEPS.map(function (s, i) { return { key: s[0], label: s[1], done: i < SETUP_DONE[b.slug] }; });
      c.notes = b.slug === 'northside-haulers' ? 'Met at the Paterson transfer station. Wants online booking before spring. Kickoff done Oct 5.' : '';
      c.settings = { prices: null, open: '07:00', close: '18:00', zips: '07', area: b.town + ' and nearby', alertPhones: b.ownerPhone, quietHours: true, reviewText: true };
      return c;
    });
    return { v: 4, seededAt: now, businesses: businesses, requests: makeRequests() };
  }

  var db;
  function load() {
    try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { db = null; }
    if (!db || db.v !== 4) { seed = 7; db = seedDb(); save(); }
    absorbQueue();
    return db;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { } }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) { } seed = 7; db = seedDb(); save(); return db; }

  // Bookings made in the live widget demo (same site) land here.
  function absorbQueue() {
    var q = [];
    try { q = JSON.parse(localStorage.getItem(QUEUE) || '[]'); localStorage.removeItem(QUEUE); } catch (e) { }
    q.forEach(function (p) {
      var slug = db.businesses.some(function (b) { return b.slug === p.business; }) ? p.business : 'harbor-haul';
      var t = Date.parse(p.submittedAt) || Date.now(), hr = new Date(t).getHours();
      db.requests.unshift({
        id: p.requestId || 'R' + t, business: slug, createdAt: t, status: 'new', path: p.path,
        name: p.name, phone: p.phone && p.phone.length === 10 ? '(' + p.phone.slice(0, 3) + ') ' + p.phone.slice(3, 6) + '-' + p.phone.slice(6) : p.phone,
        zip: p.zip, town: '', items: p.services && p.services.length ? p.services : (p.service ? [p.service] : []),
        load: p.answers ? (p.answers.Load || Object.keys(p.answers).map(function (k) { return p.answers[k]; }).join(', ') || null) : null,
        priceShown: p.priceShown, when: p.when, message: p.message, details: p.details, photos: p.photosCount || 0,
        source: 'Website (live demo)', afterHours: hr < 8 || hr >= 18, replyMs: null, jobValue: null, live: true,
        timeline: [{ at: t, text: 'Request received from the booking widget' }, { at: t + 4000, text: 'Owner alerted by text' }]
      });
    });
    if (q.length) save();
    return q.length;
  }

  window.DBX = {
    load: load, save: save, reset: reset, absorbQueue: absorbQueue,
    get: function () { return db; },
    business: function (slug) { return db.businesses.filter(function (b) { return b.slug === slug; })[0]; },
    requestsFor: function (slug) { return db.requests.filter(function (r) { return !slug || r.business === slug; }); },
    MIN: MIN, HOUR: HOUR, DAY: DAY
  };
})();
