/* Trade templates. A business = one template + its own overrides (name, color, phone, hours, area, prices).
   Steps are shown or skipped with showIf against the chosen service's mode: book | request | estimate. */
window.DBW_TEMPLATES = {
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
    services: [
      { id: 'furniture', label: 'Furniture', hint: 'Couches, beds, dressers', icon: 'sofa', mode: 'request' },
      { id: 'appliances', label: 'Appliances', hint: 'Fridges, washers, AC units', icon: 'refrigerator', mode: 'request' },
      { id: 'garage', label: 'Garage cleanout', hint: 'Garages and basements', icon: 'warehouse', mode: 'request' },
      { id: 'yard', label: 'Yard waste', hint: 'Branches, brush, sheds', icon: 'trees', mode: 'request' },
      { id: 'reno', label: 'Renovation debris', hint: 'Drywall, flooring, cabinets', icon: 'hammer', mode: 'request' },
      { id: 'estate', label: 'Whole property', hint: 'Estates, move-outs', icon: 'house', mode: 'estimate' }
    ],
    flows: {
      book: ['zip', 'service', 'size', 'property', 'time', 'contact'],
      quote: ['zip', 'service', 'size', 'property', 'contact']
    },
    steps: {
      zip: { type: 'zip', title: 'Where is the pickup?' },
      service: { type: 'service', title: 'What needs to go?' },
      size: {
        type: 'choice', ui: 'truck', title: 'How much of the truck?', sum: 'Load', showIf: ['request', 'book'], photos: true,
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
