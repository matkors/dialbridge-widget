/* Trade templates. A business = one template + its own overrides (name, color, phone, hours, area, prices).
   Steps are shown or skipped with showIf against the chosen service's mode: book | request | estimate. */
window.DBW_TEMPLATES = {
  // Pre-built niche (Oct 15): residential window cleaning and exterior washing. Everything comes switched on with prices,
  // so a new owner in this trade starts with a finished page and only adjusts. Steps are owner-style (own, forSvc).
  exterior: {
    "preset": true,
    "trade": "Window cleaning and exterior washing",
    "noun": "job",
    "priceNote": "Based on what you told us. Final price confirmed on arrival, before we start.",
    "illustration": "clipboard",
    "defaults": {
      "open": "08:00",
      "close": "18:00",
      "days": [
        1,
        2,
        3,
        4,
        5,
        6
      ],
      "replyMins": 15,
      "showPrices": true,
      "timeMode": "windows"
    },
    "tiles": {
      "book": {
        "title": "See my price and book",
        "desc": "Windows, house wash, driveways, gutters",
        "icon": "clipboard-list",
        "custom": true
      },
      "quote": {
        "title": "Send photos for a quote",
        "desc": "Commercial, roofs and bigger jobs",
        "icon": "camera",
        "custom": true
      },
      "text": {
        "title": "Text a question",
        "desc": "Replies come by text.",
        "icon": "message-square-text",
        "custom": true
      },
      "call": {
        "title": "Call us",
        "desc": "",
        "icon": "phone"
      },
      "order": [
        "book",
        "quote",
        "text",
        "call"
      ],
      "off": []
    },
    "svcSet": true,
    "multiService": false,
    "services": [
      {
        "id": "visit",
        "label": "Free estimate visit",
        "hint": "We come out, look at the job and give you a price",
        "icon": "wrench",
        "mode": "estimate",
        "custom": true,
        "pricing": "none",
        "visit": true
      },
      {
        "id": "win",
        "label": "Window cleaning",
        "hint": "Glass, frames and sills. Screens wiped.",
        "icon": "app-window",
        "mode": "book",
        "custom": true,
        "duration": 180,
        "pricing": "fixed",
        "fixed": 189
      },
      {
        "id": "wash",
        "label": "House soft wash",
        "hint": "Siding, soffits and trim, low pressure",
        "icon": "house",
        "mode": "book",
        "custom": true,
        "duration": 180,
        "pricing": "fixed",
        "fixed": 279
      },
      {
        "id": "combo",
        "label": "Windows + house wash",
        "hint": "Both in one visit. Save $39.",
        "icon": "sparkles",
        "mode": "book",
        "custom": true,
        "duration": 300,
        "pricing": "fixed",
        "fixed": 429
      },
      {
        "id": "drive",
        "label": "Driveway and walkway",
        "hint": "Concrete or pavers, oil and algae spots",
        "icon": "car-front",
        "mode": "book",
        "custom": true,
        "duration": 90,
        "pricing": "fixed",
        "fixed": 149
      },
      {
        "id": "gutter",
        "label": "Gutter cleaning",
        "hint": "Cleared, bagged and downspouts flushed",
        "icon": "cloud-rain",
        "mode": "book",
        "custom": true,
        "duration": 90,
        "pricing": "fixed",
        "fixed": 129
      },
      {
        "id": "lights",
        "label": "Holiday light installation",
        "hint": "Designed, installed, taken down in January",
        "icon": "lightbulb",
        "mode": "estimate",
        "custom": true,
        "duration": 60,
        "pricing": "none"
      }
    ],
    "flows": {
      "book": [
        "zip",
        "service",
        "details",
        "qwin",
        "qin",
        "qsize",
        "qstory",
        "qdrive",
        "addons",
        "time",
        "contact"
      ],
      "quote": [
        "zip",
        "details",
        "qwin",
        "qin",
        "qsize",
        "qstory",
        "qdrive",
        "addons",
        "contact"
      ]
    },
    "steps": {
      "zip": {
        "type": "zip",
        "title": "Where is the job?"
      },
      "service": {
        "type": "service",
        "title": "What do you need?"
      },
      "details": {
        "type": "details",
        "title": "Tell us about it",
        "showIf": [
          "estimate"
        ],
        "placeholder": "What needs doing, roughly how big, and anything we should know",
        "photos": true
      },
      "time": {
        "type": "time",
        "title": "When works for you?",
        "estimateTitle": "When would you like us to come by?"
      },
      "contact": {
        "type": "contact",
        "title": "Where should we text you?",
        "askAddress": true
      },
      "qwin": {
        "type": "choice",
        "title": "About how many windows?",
        "own": true,
        "sum": "Windows",
        "forSvc": [
          "win",
          "combo"
        ],
        "ui": "list",
        "options": [
          {
            "id": "ob7rvc",
            "label": "Up to 15",
            "price": [
              0,
              0
            ],
            "short": "Up to 15 windows"
          },
          {
            "id": "otb8qt",
            "label": "16 to 25",
            "price": [
              70,
              70
            ],
            "short": "16-25 windows"
          },
          {
            "id": "op65so",
            "label": "26 to 35",
            "price": [
              140,
              140
            ],
            "short": "26-35 windows"
          },
          {
            "id": "omozgv",
            "label": "36 or more",
            "price": [
              220,
              220
            ],
            "short": "36+ windows"
          }
        ]
      },
      "qin": {
        "type": "choice",
        "title": "Inside and outside, or just outside?",
        "own": true,
        "sum": "Sides",
        "forSvc": [
          "win",
          "combo"
        ],
        "ui": "list",
        "options": [
          {
            "id": "o2rn9o",
            "label": "Outside only",
            "price": [
              0,
              0
            ]
          },
          {
            "id": "o2rxkk",
            "label": "Inside and outside",
            "price": [
              90,
              90
            ]
          }
        ]
      },
      "qsize": {
        "type": "choice",
        "title": "How big is the home?",
        "own": true,
        "sum": "Home size",
        "forSvc": [
          "wash",
          "combo"
        ],
        "ui": "list",
        "options": [
          {
            "id": "ovjh76",
            "label": "Small (2 bedrooms or fewer)",
            "price": [
              0,
              0
            ],
            "short": "Small home"
          },
          {
            "id": "od5iue",
            "label": "Medium (3 to 4 bedrooms)",
            "price": [
              80,
              80
            ],
            "short": "Medium home"
          },
          {
            "id": "ooem77",
            "label": "Large (5+ bedrooms)",
            "price": [
              170,
              170
            ],
            "short": "Large home"
          },
          {
            "id": "o06fkf",
            "label": "Very large or estate",
            "price": [
              260,
              260
            ],
            "short": "Very large home"
          }
        ]
      },
      "qstory": {
        "type": "choice",
        "title": "How many stories?",
        "own": true,
        "sum": "Stories",
        "forSvc": [
          "win",
          "wash",
          "combo",
          "gutter"
        ],
        "ui": "list",
        "options": [
          {
            "id": "othth6",
            "label": "1 story",
            "price": [
              0,
              0
            ]
          },
          {
            "id": "owe0c5",
            "label": "2 stories",
            "price": [
              40,
              40
            ]
          },
          {
            "id": "ojb6es",
            "label": "3 stories",
            "price": [
              90,
              90
            ]
          }
        ]
      },
      "qdrive": {
        "type": "choice",
        "title": "How big is the driveway?",
        "own": true,
        "sum": "Driveway",
        "forSvc": [
          "drive"
        ],
        "ui": "list",
        "options": [
          {
            "id": "oiypec",
            "label": "1 to 2 cars",
            "price": [
              0,
              0
            ],
            "short": "1-2 car driveway"
          },
          {
            "id": "oucuv2",
            "label": "3 to 4 cars",
            "price": [
              60,
              60
            ],
            "short": "3-4 car driveway"
          },
          {
            "id": "olwrs5",
            "label": "Long or circular",
            "price": [
              130,
              130
            ],
            "short": "Long driveway"
          }
        ]
      },
      "addons": {
        "type": "addons",
        "title": "Anything to add?",
        "own": true,
        "forSvc": [
          "win",
          "wash",
          "combo",
          "drive",
          "gutter"
        ],
        "options": [
          {
            "id": "xscr",
            "label": "Screens washed and dried",
            "add": [
              35,
              35
            ]
          },
          {
            "id": "xwalk",
            "label": "Walkway and front steps",
            "add": [
              49,
              49
            ]
          },
          {
            "id": "xdeck",
            "label": "Patio or deck wash",
            "add": [
              99,
              99
            ]
          },
          {
            "id": "xgut",
            "label": "Gutter face brightening",
            "add": [
              79,
              79
            ]
          }
        ],
        "optional": true
      }
    },
    "tagline": "See your price and book in a minute",
    "sideLine": "Window cleaning, house washing, driveways and gutters. See your exact price before anyone comes out.",
    "heroImg": "img/side/pressure-1.webp"
  },

  detailing: {
    trade: 'Mobile detailing',
    noun: 'detail',
    priceNote: 'We come to you. Final price confirmed when we see the vehicle.',
    illustration: 'car',
    defaults: { open: '09:00', close: '17:00', days: [1, 2, 3, 4, 5, 6], replyMins: 15, showPrices: true, timeMode: 'slots' },
    tiles: {
      book: { title: 'Book a detail', desc: 'Pick a package and a time.', priced: 'See your price now. From {min}.', icon: 'car' },
      quote: { title: 'Ceramic or paint quote', desc: 'Send photos, get a price.', icon: 'shield-check' },
      text: { title: 'Text a question', desc: 'Replies come by text.', icon: 'message-square-text' },
      call: { title: 'Call us', desc: '', icon: 'phone' }
    },
    services: [
      { id: 'full', label: 'Full detail', hint: 'Inside and out', icon: 'car', mode: 'book' },
      { id: 'interior', label: 'Interior detail', hint: 'Seats, carpets, dash, glass', icon: 'armchair', mode: 'book', mult: 0.65 },
      { id: 'exterior', label: 'Exterior detail', hint: 'Hand wash, wheels, wax', icon: 'droplets', mode: 'book', mult: 0.45 },
      { id: 'wax', label: 'Wax and polish', hint: 'Shine and protection', icon: 'sparkles', mode: 'book', mult: 0.6 },
      { id: 'ceramic', label: 'Ceramic coating', hint: 'Years of protection', icon: 'shield-check', mode: 'estimate' },
      { id: 'paint', label: 'Paint correction', hint: 'Swirls and scratches out', icon: 'paintbrush', mode: 'estimate' }
    ],
    flows: {
      book: ['zip', 'service', 'size', 'addons', 'vehicle', 'time', 'contact'],
      quote: ['zip', 'service', 'size', 'vehicle', 'contact']
    },
    steps: {
      zip: { type: 'zip', title: 'Where is the car?' },
      service: { type: 'service', title: 'What does it need?' },
      size: {
        type: 'choice', ui: 'grid', title: 'What are we detailing?', sum: 'Vehicle',
        options: [
          { id: 'sedan', label: 'Car or coupe', short: 'Car', price: [179, 219] },
          { id: 'suv', label: 'SUV or small truck', short: 'SUV / small truck', price: [209, 249] },
          { id: 'large', label: 'Large truck or van', short: 'Large truck / van', price: [239, 289] }
        ]
      },
      addons: {
        type: 'addons', title: 'Anything extra?', showIf: ['book'], optional: true,
        options: [
          { id: 'pet', label: 'Pet hair removal', icon: 'paw-print', add: [40, 40] },
          { id: 'odor', label: 'Odor treatment', icon: 'wind', add: [50, 50] },
          { id: 'engine', label: 'Engine bay clean', icon: 'cog', add: [40, 40] },
          { id: 'lights', label: 'Headlight restoration', icon: 'lightbulb', add: [60, 60] }
        ]
      },
      vehicle: { type: 'details', title: 'Tell us about the vehicle', showIf: ['estimate'], placeholder: '2021 black Tahoe, light swirls on the hood, daily driver', photos: true },
      time: { type: 'time', title: 'Pick a day and time', estimateTitle: 'Pick a time for a free inspection' },
      contact: { type: 'contact', title: 'Where should we come?', askAddress: true, addressLabel: 'Address where the vehicle will be' }
    }
  },

  junk: {
    trade: 'Junk removal',
    noun: 'pickup',
    priceNote: 'Loading, hauling and disposal included. Final price confirmed on site.',
    illustration: 'truck',
    defaults: { open: '07:00', close: '18:00', days: [1, 2, 3, 4, 5, 6], replyMins: 15, showPrices: true, timeMode: 'window' },
    tiles: {
      book: { title: 'Book a pickup', desc: 'Choose what is going and when.', priced: 'From {min}. Full truck up to {max}.', icon: 'truck' },
      quote: { title: 'Get a price first', desc: 'Send details and photos.', icon: 'tag' },
      text: { title: 'Text a question', desc: 'Replies come by text.', icon: 'message-square-text' },
      call: { title: 'Call the office', desc: '', icon: 'phone' }
    },
    multiService: true,
    services: [
      { id: 'furniture', label: 'Furniture', hint: 'Couches, beds, dressers', icon: 'sofa', mode: 'request' },
      { id: 'appliances', label: 'Appliances', hint: 'Fridges, washers, AC units', icon: 'refrigerator', mode: 'request' },
      { id: 'trash', label: 'Trash and bags', hint: 'Bagged trash, boxes, clutter', icon: 'trash-2', mode: 'request' },
      { id: 'wood', label: 'Wood and planks', hint: 'Lumber, pallets, old decking', icon: 'layers', mode: 'request' },
      { id: 'yard', label: 'Yard waste', hint: 'Branches, brush, leaves', icon: 'trees', mode: 'request' },
      { id: 'reno', label: 'Renovation debris', hint: 'Drywall, flooring, cabinets', icon: 'hammer', mode: 'request' },
      { id: 'heavy', label: 'Dirt and concrete', hint: 'Soil, rock, bricks', icon: 'mountain', mode: 'request', heavy: true },
      { id: 'garage', label: 'Garage or basement', hint: 'Mixed items, full cleanout', icon: 'warehouse', mode: 'request' },
      { id: 'estate', label: 'Whole property', hint: 'Estates, move-outs', icon: 'house', mode: 'estimate' }
    ],
    flows: {
      book: ['zip', 'service', 'size', 'property', 'time', 'contact'],
      quote: ['zip', 'service', 'size', 'property', 'contact']
    },
    steps: {
      zip: { type: 'zip', title: 'Where is the pickup?' },
      service: { type: 'service', title: 'What needs to go?', multiHint: 'Pick everything that applies. Mixed loads are normal.' },
      size: {
        type: 'choice', ui: 'truck', title: 'How much of the truck, for everything?', sum: 'Load', showIf: ['request', 'book'], photos: true,
        note: 'One truck holds about 6 pickup loads',
        options: [
          { id: 'few', label: 'A few items', short: 'Few items', frac: 0.12, price: [99, 179] },
          { id: 'quarter', label: 'Quarter truck', short: '1/4 truck', frac: 0.25, price: [199, 279] },
          { id: 'half', label: 'Half truck', short: '1/2 truck', frac: 0.5, price: [349, 449] },
          { id: 'full', label: 'Full truck', short: 'Full truck', frac: 1, price: [599, 799] }
        ]
      },
      property: { type: 'details', title: 'Tell us about the property', showIf: ['estimate'], placeholder: '3 bedroom house, full basement, moving out by the 30th', photos: true },
      time: { type: 'time', title: 'Pick a day and time', estimateTitle: 'Pick a time for a free walkthrough' },
      contact: { type: 'contact', title: 'Where should we text you?' }
    }
  },

  cleaning: {
    trade: 'House cleaning',
    noun: 'cleaning',
    priceNote: 'Based on your home. Final price confirmed by text before the visit.',
    illustration: 'sparkles',
    defaults: { open: '08:00', close: '18:00', days: [1, 2, 3, 4, 5, 6], replyMins: 20, showPrices: true, timeMode: 'slots' },
    tiles: {
      book: { title: 'Book a cleaning', desc: 'See your price and pick a time.', priced: 'See your price now. From {min}.', icon: 'sparkles' },
      quote: { title: 'Get a quote', desc: 'For bigger or custom jobs.', icon: 'clipboard-list' },
      text: { title: 'Text a question', desc: 'Replies come by text.', icon: 'message-square-text' },
      call: { title: 'Call the office', desc: '', icon: 'phone' }
    },
    services: [
      { id: 'standard', label: 'Standard clean', hint: 'Kitchen, baths, floors, dusting', icon: 'sparkles', mode: 'book' },
      { id: 'deep', label: 'Deep clean', hint: 'Inside appliances, baseboards', icon: 'spray-can', mode: 'book', mult: 1.5 },
      { id: 'move', label: 'Move in / out', hint: 'Empty home, top to bottom', icon: 'box', mode: 'book', mult: 1.7 },
      { id: 'office', label: 'Office or commercial', hint: 'Walkthrough first', icon: 'building-2', mode: 'estimate' }
    ],
    flows: {
      book: ['zip', 'service', 'bedrooms', 'bathrooms', 'frequency', 'addons', 'space', 'time', 'contact'],
      quote: ['zip', 'service', 'bedrooms', 'bathrooms', 'space', 'contact']
    },
    steps: {
      zip: { type: 'zip', title: 'Where is the home?' },
      service: { type: 'service', title: 'What kind of cleaning?' },
      bedrooms: {
        type: 'choice', ui: 'grid', title: 'How many bedrooms?', sum: 'Bedrooms', showIf: ['book'],
        options: [
          { id: 'b1', label: '1', short: '1 bed', price: [109, 129] },
          { id: 'b2', label: '2', short: '2 beds', price: [139, 159] },
          { id: 'b3', label: '3', short: '3 beds', price: [169, 199] },
          { id: 'b4', label: '4', short: '4 beds', price: [209, 239] },
          { id: 'b5', label: '5+', short: '5+ beds', price: [249, 299] }
        ]
      },
      bathrooms: {
        type: 'choice', ui: 'grid', title: 'How many bathrooms?', sum: 'Bathrooms', showIf: ['book'],
        options: [
          { id: 'ba1', label: '1', short: '1 bath', price: [0, 0] },
          { id: 'ba2', label: '2', short: '2 baths', price: [25, 30] },
          { id: 'ba3', label: '3', short: '3 baths', price: [50, 60] },
          { id: 'ba4', label: '4+', short: '4+ baths', price: [75, 95] }
        ]
      },
      frequency: {
        type: 'choice', ui: 'list', title: 'How often?', sum: 'How often', showIf: ['book'],
        options: [
          { id: 'once', label: 'One time', short: 'One time', mult: 1 },
          { id: 'weekly', label: 'Every week', short: 'Weekly', mult: 0.8, badge: 'Save 20%' },
          { id: 'biweekly', label: 'Every 2 weeks', short: 'Every 2 weeks', mult: 0.85, badge: 'Save 15%' },
          { id: 'monthly', label: 'Every month', short: 'Monthly', mult: 0.9, badge: 'Save 10%' }
        ]
      },
      addons: {
        type: 'addons', title: 'Anything extra?', showIf: ['book'], optional: true,
        options: [
          { id: 'fridge', label: 'Inside the fridge', icon: 'refrigerator', add: [35, 35] },
          { id: 'oven', label: 'Inside the oven', icon: 'flame', add: [35, 35] },
          { id: 'windows', label: 'Inside windows', icon: 'app-window', add: [45, 45] },
          { id: 'laundry', label: 'Laundry and folding', icon: 'shirt', add: [30, 30] }
        ]
      },
      space: { type: 'details', title: 'Tell us about the space', showIf: ['estimate'], placeholder: 'About 2,500 sq ft office, 2 restrooms, cleaning 3 nights a week', photos: true },
      time: { type: 'time', title: 'Pick a day and time', estimateTitle: 'Pick a time for a walkthrough' },
      contact: { type: 'contact', title: 'Where should we text you?' }
    }
  },

  // Any business that prices after seeing the job: no price list, just a request with details and photos.
  general: {
    trade: 'Local services',
    noun: 'visit',
    priceNote: 'We reply with a price after we see the details.',
    sideLine: 'Tell us what you need and we reply with a price.',
    illustration: 'clipboard',
    defaults: { open: '08:00', close: '18:00', days: [1, 2, 3, 4, 5, 6], replyMins: 15, showPrices: false, timeMode: 'window' },
    tiles: {
      book: { title: 'Request a quote', desc: 'Tell us what you need. We reply with a price.', icon: 'clipboard-list' },
      quote: { title: 'Send photos for a price', desc: 'The fastest way to an exact price.', icon: 'camera' },
      text: { title: 'Text a question', desc: 'Replies come by text.', icon: 'message-square-text' },
      call: { title: 'Call us', desc: '', icon: 'phone' }
    },
    services: [
      { id: 'job', label: 'A job or project', hint: 'Tell us what needs doing', icon: 'clipboard-list', mode: 'estimate' },
      { id: 'visit', label: 'A service visit', hint: 'Repairs, upkeep, check-ups', icon: 'wrench', mode: 'estimate' },
      { id: 'other', label: 'Something else', hint: 'Ask us anything', icon: 'message-square-text', mode: 'estimate' }
    ],
    flows: {
      book: ['zip', 'service', 'details', 'time', 'contact'],
      quote: ['zip', 'service', 'details', 'contact']
    },
    steps: {
      zip: { type: 'zip', title: 'Where is the job?' },
      service: { type: 'service', title: 'What do you need?' },
      details: { type: 'details', title: 'Tell us about it', showIf: ['estimate'], placeholder: 'What needs doing, roughly how big, and anything we should know', photos: true },
      time: { type: 'time', title: 'When works for you?', estimateTitle: 'When would you like us to come by?' },
      contact: { type: 'contact', title: 'Where should we text you?', askAddress: true }
    }
  },

  // Customers come to you (or book a fixed slot): barbers, salons, studios, mechanics.
  appointments: {
    trade: 'Appointments',
    noun: 'appointment',
    priceNote: 'Prices are per appointment.',
    sideLine: 'Pick a service and a time that works for you.',
    illustration: 'calendar',
    defaults: { open: '09:00', close: '18:00', days: [2, 3, 4, 5, 6], replyMins: 15, showPrices: true, timeMode: 'slots' },
    tiles: {
      book: { title: 'Book an appointment', desc: 'Pick a service and a time.', priced: 'From {min}.', icon: 'calendar-check' },
      quote: { title: 'Ask a question first', desc: 'We reply by text.', icon: 'message-square-text' },
      text: { title: 'Text a question', desc: 'Replies come by text.', icon: 'message-square-text' },
      call: { title: 'Call us', desc: '', icon: 'phone' }
    },
    services: [
      { id: 'standard', label: 'Standard appointment', hint: 'Our most booked service', icon: 'calendar-check', mode: 'book', fixed: 40 },
      { id: 'long', label: 'Longer appointment', hint: 'More time, more detail', icon: 'calendar-clock', mode: 'book', fixed: 70 },
      { id: 'consult', label: 'Free consultation', hint: 'Talk it through first', icon: 'message-square-text', mode: 'book' }
    ],
    flows: {
      book: ['service', 'time', 'contact'],
      quote: ['service', 'details', 'contact']
    },
    steps: {
      service: { type: 'service', title: 'What would you like to book?' },
      details: { type: 'details', title: 'What would you like to ask?', placeholder: 'Your question', photos: false },
      time: { type: 'time', title: 'Pick a day and time' },
      contact: { type: 'contact', title: 'Where should we text your confirmation?' }
    }
  },

  hvac: {
    trade: 'Heating and cooling',
    noun: 'service visit',
    illustration: 'thermometer',
    defaults: { open: '07:00', close: '19:00', days: [1, 2, 3, 4, 5, 6], replyMins: 10, showPrices: true, timeMode: 'window' },
    tiles: {
      book: { title: 'Book a repair', desc: 'Pick a time for a technician.', icon: 'wrench' },
      quote: { title: 'New system quote', desc: 'Free in-home estimate.', icon: 'clipboard-list' },
      text: { title: 'Text a question', desc: 'Replies come by text.', icon: 'message-square-text' },
      call: { title: 'Call the office', desc: '', icon: 'phone' }
    },
    services: [
      { id: 'ac', label: 'AC not cooling', hint: 'Warm air, not turning on, leaking', icon: 'snowflake', mode: 'book', fee: 89 },
      { id: 'heat', label: 'Heat not working', hint: 'No heat, noises, short cycling', icon: 'flame', mode: 'book', fee: 89 },
      { id: 'tuneup', label: 'Tune-up', hint: 'Seasonal maintenance visit', icon: 'wrench', mode: 'book', fixed: 129 },
      { id: 'install', label: 'New system', hint: 'Replace AC, furnace or heat pump', icon: 'house', mode: 'estimate' }
    ],
    flows: {
      book: ['zip', 'service', 'urgent', 'age', 'install', 'time', 'contact'],
      quote: ['zip', 'service', 'age', 'install', 'contact']
    },
    steps: {
      zip: { type: 'zip', title: 'Where is the home?' },
      service: { type: 'service', title: 'What do you need help with?' },
      urgent: {
        type: 'choice', ui: 'list', title: 'Is anyone without heat or cooling right now?', sum: 'Urgency', showIf: ['book'],
        options: [
          { id: 'no', label: 'No, it can wait a day or two', short: 'Not urgent' },
          { id: 'yes', label: 'Yes, it is urgent', short: 'Urgent', urgent: true }
        ]
      },
      age: {
        type: 'choice', ui: 'list', title: 'How old is the system?', sum: 'System age',
        options: [
          { id: 'a1', label: 'Under 5 years', short: 'Under 5 yrs' },
          { id: 'a2', label: '5 to 10 years', short: '5 to 10 yrs' },
          { id: 'a3', label: '10 to 15 years', short: '10 to 15 yrs' },
          { id: 'a4', label: 'Over 15 years', short: 'Over 15 yrs' },
          { id: 'a5', label: 'Not sure', short: 'Age unknown' }
        ]
      },
      install: { type: 'details', title: 'Tell us about the home', showIf: ['estimate'], placeholder: '2 story, about 2,200 sq ft, gas furnace and central AC', photos: true },
      time: { type: 'time', title: 'Pick a day and arrival window', estimateTitle: 'Pick a time for a free in-home estimate' },
      contact: { type: 'contact', title: 'Where should we text you?' }
    }
  }
};
