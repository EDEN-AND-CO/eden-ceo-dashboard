#!/usr/bin/env node
/**
 * EDEN & CO. — Create "Critical Path 2026" tab in Google Sheet
 *
 * Run once to create the sheet tab and populate it with the critical path data.
 * Requires Google OAuth credentials.
 *
 * Setup:
 *   1. npm install googleapis
 *   2. Go to https://console.cloud.google.com → APIs & Services → Credentials
 *      Create an OAuth 2.0 Client ID (Desktop app) and download credentials.json
 *      into this directory (scripts/credentials.json)
 *   3. node scripts/create-critpath-sheet.js
 *      First run will open a browser for OAuth consent. Token saved to scripts/token.json.
 *
 * Or with a Service Account:
 *   Set env var GOOGLE_SERVICE_ACCOUNT_KEY to the path of your service account JSON.
 *   Ensure the service account has Editor access to the spreadsheet.
 */

const fs   = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SPREADSHEET_ID = '1XXivn1DwnkVmlfCP8YGA4va6SywS8Ax51QldlIvyq70';
const TAB_NAME       = 'Critical Path 2026';
const SCOPES         = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH     = path.join(__dirname, 'token.json');
const CREDS_PATH     = path.join(__dirname, 'credentials.json');
const SA_KEY_PATH    = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

// ── Data ─────────────────────────────────────────────────────────────────────

const HEADER = [['#', 'Title', 'Owner', 'Deadline', 'Status', 'Phase', 'Notes']];

const ROWS = [
  // Foundation
  ['1',  'Warehouse move complete and operational',        'Phoebe',      '14 May', 'on-track',   'Foundation',        '2,400ft live, restock in, ops running'],
  ['2',  'New product lines confirmed and ordered',        'Jon',         '16 May', 'on-track',   'Foundation',        'Choc bars x2, granola, bliss balls x2. Samples needed for July pitch'],
  ['3',  'Pamper Hamper locked',                           'Rosie',       '16 May', 'on-track',   'Foundation',        'BOM, pricing, sample box built and signed off'],
  ['4',  'Packaging orders placed',                        'Jon',         '23 May', 'on-track',   'Foundation',        'Branded tubes, Christmas sleeve brief, hamper box decision'],
  ['5',  'Phoebe manages weekend independently',           'Phoebe',      '31 May', 'not-started','Foundation',        'First solo weekend cover. Recurring monthly from June'],
  // Corp: Soft Launch
  ['6',  'Corp — new mailboxes live',                      'Jon',         '26 Apr', 'on-track',   'Corp: Soft Launch', '3 inboxes created'],
  ['7',  'Corp — Instantly warming (30 days)',              'Jon',         '26 May', 'on-track',   'Corp: Soft Launch', 'Started. Must complete full 30 days before outreach begins'],
  ['8',  'Corp — landing pages built',                     'Jon',         '30 Apr', 'on-track',   'Corp: Soft Launch', 'Core pillars messaging live'],
  ['9',  'Corp — LP imagery (AI generated)',               'Jon',         '7 May',  'not-started','Corp: Soft Launch', 'AI image gen for LP hero imagery'],
  ['10', 'Corp — lead magnets designed x4',                'Jon / Rosie', '16 May', 'not-started','Corp: Soft Launch', '4 lead magnets. Rosie design lead, Jon content lead'],
  ['11', 'Corp — Apollo lists created',                    'Jon',         '16 May', 'not-started','Corp: Soft Launch', 'Filtered by EA, HR, Sales and Marketing Execs'],
  ['12', 'Corp — AI auto-enrich and pull into Instantly',  'Jon',         '23 May', 'not-started','Corp: Soft Launch', 'AI enrichment workflow connecting Apollo to Instantly'],
  ['13', 'Corp — Instantly email sequences built (A/B)',   'Jon',         '23 May', 'not-started','Corp: Soft Launch', 'Outbound sequences with A/B subject line and hook testing'],
  ['14', 'Corp — Klaviyo follow-up sequences built',       'Jon',         '30 May', 'not-started','Corp: Soft Launch', 'Inbound lead follow-up automation'],
  ['15', 'Corp — template proposal ready',                 'Jon / Rosie', '30 May', 'not-started','Corp: Soft Launch', 'Structured template. Rosie briefs design, Jon owns content'],
  // Corp: Full Launch
  ['16', 'Corp — MVP outreach begins (test and refine)',   'Jon',         '1 Jun',  'not-started','Corp: Full Launch', 'First sequences live. Monitor open rates, replies, book rates'],
  ['17', 'Corp — Apollo and Klaviyo leads linked',         'Jon',         '7 Jun',  'not-started','Corp: Full Launch', 'Cold outbound to warm Klaviyo nurture connected'],
  ['18', 'Corp — retargeting ads built and running',       'Jon',         '14 Jun', 'not-started','Corp: Full Launch', 'Meta and Google low-cost retargeting to outreach and inbound lists'],
  ['19', 'Corp — 40 touches sent, 5 conversations open',  'Jon',         '30 Jun', 'not-started','Corp: Full Launch', 'Target metric for end of June pipeline health'],
  ['20', 'Corp — first order confirmed',                   'Jon',         '31 Jul', 'not-started','Corp: Full Launch', 'Even a small one. Social proof for September push'],
  ['21', 'Corp — 15 active accounts, 5 with Q4 intention','Jon',         '30 Sep', 'not-started','Corp: Full Launch', 'Conversion target from warmup pipeline'],
  // Team Independence
  ['22', 'Phoebe manages 10-day holiday cover (solo ops)', 'Phoebe',      'Jul',    'not-started','Team Independence', 'Jon offline. Full ops test.'],
  // Website
  ['23', 'Rewards programme — app selected and live',      'Rosie',       '30 Jun', 'not-started','Website',           'Loyalty points system live on Shopify. Membership frame not discount frame'],
  ['24', 'Free gift mechanic — decision confirmed',        'Jon',         '30 Apr', 'not-started','Website',           'Run in tandem with loyalty. Free gift closes transaction. Points build LTV'],
  ['25', 'Mobile CVR improvement live',                    'Rosie',       'Oct',    'not-started','Website',           'Shopify mobile reskin before peak traffic'],
  // Retail
  ['26', 'Bread and Jam retail pitch',                     'Jon',         'Jul',    'not-started','Retail',            'Samples, brand deck, numbers ready. Ocado, Waitrose, BA'],
  ['27', 'Virgin Experiences integration — decision made', 'Jon',         'Oct',    'not-started','Retail',            'Pamper Hamper + Spa/Afternoon Tea viability confirmed'],
  // International
  ['28', 'International shipping live (UPS Global Checkout)', 'Jon',      'Jul',    'on-track',   'International',     'EU and US DDP, brokerage structure resolved'],
  // Brand
  ['29', 'Photo shoot — full range',                       'Rosie',       'Sep',    'not-started','Brand',             'All new products, Pamper Hamper, corp lifestyle imagery'],
  // Marketing
  ['30', 'Q4 campaign calendar mapped',                    'Edith',       '31 Aug', 'not-started','Marketing',         'Full Oct-Dec calendar, BF/CM brief, Veganuary 2027 started'],
  // Operations
  ['31', 'Q4 stock plan complete',                         'Phoebe',      '30 Sep', 'not-started','Operations',        'BOM run, packaging warehoused, PPC Q4 briefed'],
  // Peak
  ['32', 'Christmas peak — full execution',                'Team',        'Nov-Dec','not-started','Peak',              'Gift sleeve live, PPC full budget, corp orders fulfilling'],
];

// Phase group first data rows (row index in ROWS array, 0-based) — tinted backgrounds
const PHASE_FIRST_ROWS = [0, 5, 15, 21, 22, 25, 27, 28, 29, 30, 31];

// ── Auth ──────────────────────────────────────────────────────────────────────

async function getAuth() {
  // Service account takes priority
  if (SA_KEY_PATH && fs.existsSync(SA_KEY_PATH)) {
    const key = JSON.parse(fs.readFileSync(SA_KEY_PATH, 'utf8'));
    const auth = new google.auth.GoogleAuth({ credentials: key, scopes: SCOPES });
    console.log('[Auth] Using service account:', key.client_email);
    return auth.getClient();
  }

  // OAuth flow
  if (!fs.existsSync(CREDS_PATH)) {
    console.error('[Error] No credentials found.');
    console.error('  Option A — Service account: set GOOGLE_SERVICE_ACCOUNT_KEY=/path/to/sa.json');
    console.error('  Option B — OAuth: download credentials.json from Google Cloud Console into scripts/');
    process.exit(1);
  }

  const creds   = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8'));
  const { client_secret, client_id, redirect_uris } = creds.installed || creds.web;
  const oAuth2  = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    oAuth2.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')));
    return oAuth2;
  }

  const authUrl = oAuth2.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
  console.log('\n[Auth] Authorize this app by visiting:\n', authUrl, '\n');
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve, reject) => {
    rl.question('Paste the code here: ', async (code) => {
      rl.close();
      try {
        const { tokens } = await oAuth2.getToken(code.trim());
        oAuth2.setCredentials(tokens);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        console.log('[Auth] Token saved to', TOKEN_PATH);
        resolve(oAuth2);
      } catch (e) { reject(e); }
    });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const auth   = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  // 1. Get existing sheet list
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existing = meta.data.sheets.find(s => s.properties.title === TAB_NAME);
  let sheetId;

  if (existing) {
    sheetId = existing.properties.sheetId;
    console.log(`[Sheet] "${TAB_NAME}" already exists (sheetId ${sheetId}) — clearing and rewriting`);
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${TAB_NAME}'`,
    });
  } else {
    console.log(`[Sheet] Creating tab "${TAB_NAME}"...`);
    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: TAB_NAME } } }],
      },
    });
    sheetId = addRes.data.replies[0].addSheet.properties.sheetId;
    console.log(`[Sheet] Created (sheetId ${sheetId})`);
  }

  // 2. Write data
  const allRows = [...HEADER, ...ROWS];
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${TAB_NAME}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: allRows },
  });
  console.log(`[Data] Written ${ROWS.length} data rows + 1 header = ${allRows.length} total`);

  // 3. Formatting
  function rgb(hex) {
    const r = parseInt(hex.slice(1,3),16)/255;
    const g = parseInt(hex.slice(3,5),16)/255;
    const b = parseInt(hex.slice(5,7),16)/255;
    return { red: r, green: g, blue: b };
  }

  const requests = [];

  // Header row — dark background, white bold text, freeze
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
      cell: {
        userEnteredFormat: {
          backgroundColor: rgb('#1a1a1a'),
          textFormat: { bold: true, foregroundColor: rgb('#ffffff'), fontSize: 10 },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    },
  });

  requests.push({
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
      fields: 'gridProperties.frozenRowCount',
    },
  });

  // Column widths
  const COL_WIDTHS = [40, 320, 100, 90, 110, 160, 380];
  COL_WIDTHS.forEach((px, i) => {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: px },
        fields: 'pixelSize',
      },
    });
  });

  // Phase group tint rows — #f5f5f5
  PHASE_FIRST_ROWS.forEach(rowIdx => {
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: rowIdx + 1, endRowIndex: rowIdx + 2 },
        cell: { userEnteredFormat: { backgroundColor: rgb('#f5f5f5') } },
        fields: 'userEnteredFormat.backgroundColor',
      },
    });
  });

  // Conditional formatting — Status column (col E = index 4)
  const statusRules = [
    { value: 'done',        bg: '#d4edda', fg: '#155724' },
    { value: 'on-track',    bg: '#d1ecf1', fg: '#0c5460' },
    { value: 'not-started', bg: '#f8f9fa', fg: '#6c757d' },
    { value: 'blocked',     bg: '#f8d7da', fg: '#721c24' },
    { value: 'overdue',     bg: '#fff3cd', fg: '#856404' },
  ];
  statusRules.forEach(rule => {
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: 100, startColumnIndex: 4, endColumnIndex: 5 }],
          booleanRule: {
            condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: rule.value }] },
            format: {
              backgroundColor: rgb(rule.bg),
              textFormat: { foregroundColor: rgb(rule.fg) },
            },
          },
        },
        index: 0,
      },
    });
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests },
  });

  console.log('[Format] Formatting applied');
  console.log(`\nDone. View at https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`);
  if (ROWS.length !== 32) {
    console.warn(`[WARN] Expected 32 data rows, got ${ROWS.length}`);
  } else {
    console.log('[OK] 32 data rows confirmed');
  }
}

run().catch(err => {
  console.error('[Error]', err.message || err);
  process.exit(1);
});
