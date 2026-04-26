// EDEN & CO. Critical Path 2026
// Source: Google Sheet "Critical Path 2026" tab (synced daily)
// Status overrides stored in localStorage['cp_overrides']

window.EDEN = window.EDEN || {};
window.EDEN._criticalPath = {
  generated: "2026-04-26",
  sheet_url: "https://docs.google.com/spreadsheets/d/1XXivn1DwnkVmlfCP8YGA4va6SywS8Ax51QldlIvyq70",
  items: [
    // PHASE 1 — FOUNDATION
    { id: "1",  title: "Warehouse move complete and operational", owner: "Phoebe",      deadline: "14 May", status: "on-track",   phase: "Foundation",        notes: "2,400ft live, restock in, ops running" },
    { id: "2",  title: "New product lines confirmed and ordered",  owner: "Jon",         deadline: "16 May", status: "on-track",   phase: "Foundation",        notes: "Choc bars x2, granola, bliss balls x2. Samples needed for July pitch" },
    { id: "3",  title: "Pamper Hamper locked",                     owner: "Rosie",       deadline: "16 May", status: "on-track",   phase: "Foundation",        notes: "BOM, pricing, sample box built and signed off" },
    { id: "4",  title: "Packaging orders placed",                  owner: "Jon",         deadline: "23 May", status: "on-track",   phase: "Foundation",        notes: "Branded tubes, Christmas sleeve brief, hamper box decision" },
    { id: "5",  title: "Phoebe manages weekend independently",     owner: "Phoebe",      deadline: "31 May", status: "not-started","phase": "Foundation",        notes: "First solo weekend cover. Recurring monthly from June" },
    // CORP — SOFT LAUNCH
    { id: "6",  title: "Corp — new mailboxes live",                owner: "Jon",         deadline: "26 Apr", status: "on-track",   phase: "Corp: Soft Launch", notes: "3 inboxes created" },
    { id: "7",  title: "Corp — Instantly warming (30 days)",       owner: "Jon",         deadline: "26 May", status: "on-track",   phase: "Corp: Soft Launch", notes: "Started. Must complete full 30 days before outreach begins" },
    { id: "8",  title: "Corp — landing pages built",               owner: "Jon",         deadline: "30 Apr", status: "on-track",   phase: "Corp: Soft Launch", notes: "Core pillars messaging live" },
    { id: "9",  title: "Corp — LP imagery (AI generated)",         owner: "Jon",         deadline: "7 May",  status: "not-started","phase": "Corp: Soft Launch", notes: "AI image gen for LP hero imagery" },
    { id: "10", title: "Corp — lead magnets designed x4",          owner: "Jon / Rosie", deadline: "16 May", status: "not-started","phase": "Corp: Soft Launch", notes: "4 lead magnets. Rosie design lead, Jon content lead" },
    { id: "11", title: "Corp — Apollo lists created",              owner: "Jon",         deadline: "16 May", status: "not-started","phase": "Corp: Soft Launch", notes: "Filtered by EA, HR, Sales and Marketing Execs" },
    { id: "12", title: "Corp — AI auto-enrich and pull into Instantly", owner: "Jon",   deadline: "23 May", status: "not-started","phase": "Corp: Soft Launch", notes: "AI enrichment workflow connecting Apollo to Instantly" },
    { id: "13", title: "Corp — Instantly email sequences built (A/B test)", owner: "Jon", deadline: "23 May", status: "not-started","phase": "Corp: Soft Launch", notes: "Outbound sequences with A/B subject line and hook testing" },
    { id: "14", title: "Corp — Klaviyo follow-up sequences built", owner: "Jon",         deadline: "30 May", status: "not-started","phase": "Corp: Soft Launch", notes: "Inbound lead follow-up automation" },
    { id: "15", title: "Corp — template proposal ready",           owner: "Jon / Rosie", deadline: "30 May", status: "not-started","phase": "Corp: Soft Launch", notes: "Structured template. Rosie briefs design, Jon owns content" },
    // CORP — FULL LAUNCH
    { id: "16", title: "Corp — MVP outreach begins (test and refine)", owner: "Jon",    deadline: "1 Jun",  status: "not-started","phase": "Corp: Full Launch", notes: "First sequences live. Monitor open rates, replies, book rates" },
    { id: "17", title: "Corp — Apollo and Klaviyo leads linked",   owner: "Jon",         deadline: "7 Jun",  status: "not-started","phase": "Corp: Full Launch", notes: "Cold outbound to warm Klaviyo nurture connected" },
    { id: "18", title: "Corp — retargeting ads built and running", owner: "Jon",         deadline: "14 Jun", status: "not-started","phase": "Corp: Full Launch", notes: "Meta and Google low-cost retargeting to outreach and inbound lists" },
    { id: "19", title: "Corp — 40 touches sent, 5 conversations open", owner: "Jon",    deadline: "30 Jun", status: "not-started","phase": "Corp: Full Launch", notes: "Target metric for end of June pipeline health" },
    { id: "20", title: "Corp — first order confirmed",             owner: "Jon",         deadline: "31 Jul", status: "not-started","phase": "Corp: Full Launch", notes: "Even a small one. Social proof for September push" },
    { id: "21", title: "Corp — 15 active accounts, 5 with Q4 intention", owner: "Jon", deadline: "30 Sep", status: "not-started","phase": "Corp: Full Launch", notes: "Conversion target from warmup pipeline" },
    // TEAM INDEPENDENCE
    { id: "22", title: "Phoebe manages 10-day holiday cover (solo ops)", owner: "Phoebe", deadline: "Jul",  status: "not-started","phase": "Team Independence", notes: "Jon offline. Full ops test." },
    // WEBSITE
    { id: "23", title: "Rewards programme — app selected and live", owner: "Rosie",     deadline: "30 Jun", status: "not-started","phase": "Website",          notes: "Loyalty points system live on Shopify. Membership frame not discount frame" },
    { id: "24", title: "Free gift mechanic — decision confirmed",  owner: "Jon",         deadline: "30 Apr", status: "not-started","phase": "Website",          notes: "Run in tandem with loyalty. Free gift closes transaction. Points build LTV" },
    { id: "25", title: "Mobile CVR improvement live",              owner: "Rosie",       deadline: "Oct",    status: "not-started","phase": "Website",          notes: "Shopify mobile reskin before peak traffic" },
    // RETAIL
    { id: "26", title: "Bread and Jam retail pitch",               owner: "Jon",         deadline: "Jul",    status: "not-started","phase": "Retail",           notes: "Samples, brand deck, numbers ready. Ocado, Waitrose, BA" },
    { id: "27", title: "Virgin Experiences integration — decision made", owner: "Jon",   deadline: "Oct",    status: "not-started","phase": "Retail",           notes: "Pamper Hamper + Spa/Afternoon Tea viability confirmed" },
    // INTERNATIONAL
    { id: "28", title: "International shipping live (UPS Global Checkout)", owner: "Jon", deadline: "Jul",  status: "on-track",   phase: "International",     notes: "EU and US DDP, brokerage structure resolved" },
    // BRAND
    { id: "29", title: "Photo shoot — full range",                 owner: "Rosie",       deadline: "Sep",    status: "not-started","phase": "Brand",            notes: "All new products, Pamper Hamper, corp lifestyle imagery" },
    // MARKETING
    { id: "30", title: "Q4 campaign calendar mapped",              owner: "Edith",       deadline: "31 Aug", status: "not-started","phase": "Marketing",        notes: "Full Oct-Dec calendar, BF/CM brief, Veganuary 2027 started" },
    // OPERATIONS
    { id: "31", title: "Q4 stock plan complete",                   owner: "Phoebe",      deadline: "30 Sep", status: "not-started","phase": "Operations",       notes: "BOM run, packaging warehoused, PPC Q4 briefed" },
    // PEAK
    { id: "32", title: "Christmas peak — full execution",          owner: "Team",        deadline: "Nov-Dec",status: "not-started","phase": "Peak",             notes: "Gift sleeve live, PPC full budget, corp orders fulfilling" }
  ]
};
