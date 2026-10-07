# DialBridge dashboard (demo)

Live at `/dialbridge-widget/app/`. Sign in as the DialBridge admin or as an owner.

**What works today (in the browser, demo data):**
- **Owner inbox:**
  - filters and search;
  - a "Waiting X min" warning when a request passes the business's reply goal;
  - reply templates, plus Call;
  - mark scheduled, won (with the job's dollar amount) or lost (with a reason);
  - a history of everything that happened on the request.
- **Owner overview:** requests in the last 30 days, the share that came in after hours, median reply time against the goal, jobs won, revenue, requests per day (in hours vs. after hours), and requests by source.
- **Booking page settings:** turn services on or off, set price ranges, hours, ZIPs, brand color and the reply promise. A live preview of the widget updates as you type.
- **Install and links:** the booking link, the install code, a QR code, and where to put each.
- **Admin console:**
  - all clients with status, plan, MRR, setup progress, 30-day requests, reply time, last widget open, texting status and a health badge;
  - each client's setup checklist, health warnings, account facts and notes;
  - "View as owner";
  - all requests across clients.
- **Live demo bridge:** a booking made in the widget demo on the same site shows up in that business's inbox within seconds. It goes through the browser's localStorage, key `dbx_inbox_queue`.

**Going real:** `db/schema.sql` (outside the published site) is the Supabase schema. It has the same tables the demo uses: businesses, members, flows, requests, contacts, consents, messages, events, setup steps, texting registrations, integrations. Row-level security keeps each owner in their own business and lets DialBridge admins see everything.

To make it real, swap the `DBX` functions in `data.js` for Supabase queries:
- `requestsFor` becomes `select * from requests where business_id = ...`;
- saving the inbox actions becomes an `update requests` plus an insert into `request_events`;
- login becomes Supabase Auth with magic links.
