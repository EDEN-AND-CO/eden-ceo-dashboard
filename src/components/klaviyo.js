/**
 * EDEN & CO. CEO Flight Deck - Klaviyo Email Component
 * Live data fetched from Klaviyo MCP on 27 Mar 2026.
 * Refresh by re-running Klaviyo MCP queries in Claude and updating the DATA block below.
 */
window.EDEN = window.EDEN || {};
window.EDEN.components = window.EDEN.components || {};

(function () {
  'use strict';

  // ── Live data (last fetched: 27 Mar 2026) ────────────────────────────────

  var DATA = {
    flows: {
      mtd: [
        { name: 'Winback Flow',          revenue: 575.89,  conversions: 8,  recipients: 2307,  open_rate: 0.3808, click_rate: 0.0157 },
        { name: 'Shipping: Order Shipped',revenue: 218.50, conversions: 4,  recipients: 6716,  open_rate: 0.0655, click_rate: 0.0019 },
        { name: 'Email Welcome Series',  revenue: 198.00,  conversions: 5,  recipients: 1096,  open_rate: 0.3512, click_rate: 0.0065 },
        { name: 'Browse Abandonment',    revenue: 177.08,  conversions: 4,  recipients: 341,   open_rate: 0.7722, click_rate: 0.0266 },
        { name: 'Abandoned Cart',        revenue: 98.00,   conversions: 3,  recipients: 75,    open_rate: 0.3151, click_rate: 0.0137 },
        { name: 'Gift Finder (Large)',   revenue: 25.00,   conversions: 1,  recipients: 1,     open_rate: 1.0000, click_rate: 0.0000 }
      ],
      ytd: [
        { name: 'Winback Flow',          revenue: 1180.87, conversions: 18, recipients: 14439, open_rate: 0.3811, click_rate: 0.0111 },
        { name: 'Shipping: Order Shipped',revenue: 529.00, conversions: 16, recipients: 15911, open_rate: 0.0961, click_rate: 0.0035 },
        { name: 'Email Welcome Series',  revenue: 764.09,  conversions: 13, recipients: 3352,  open_rate: 0.3465, click_rate: 0.0087 },
        { name: 'Abandoned Cart',        revenue: 459.99,  conversions: 8,  recipients: 202,   open_rate: 0.4141, click_rate: 0.0455 },
        { name: 'Browse Abandonment',    revenue: 371.08,  conversions: 6,  recipients: 562,   open_rate: 0.6631, click_rate: 0.0323 },
        { name: 'Gift Finder (Large)',   revenue: 25.00,   conversions: 1,  recipients: 3,     open_rate: 0.6667, click_rate: 0.0000 }
      ]
    },
    campaigns: {
      mtd: [
        { name: 'Mothers Day 1',   revenue: 227.37, conversions: 4, recipients: 7025, open_rate: 0.3487, click_rate: 0.00742, sent: '10 Mar' },
        { name: 'Easter 2026 1',   revenue: 45.00,  conversions: 2, recipients: 1957, open_rate: 0.5714, click_rate: 0.01535, sent: '24 Mar' },
        { name: 'Mothers Day 2',   revenue: 47.50,  conversions: 2, recipients: 6886, open_rate: 0.3004, click_rate: 0.00349, sent: '12 Mar' },
        { name: 'Mar 12 Campaign', revenue: 22.50,  conversions: 1, recipients: 7006, open_rate: 0.2762, click_rate: 0.00143, sent: '13 Mar' }
      ],
      ytd: [
        { name: 'Mothers Day 1',   revenue: 227.37, conversions: 4, recipients: 7025, open_rate: 0.3487, click_rate: 0.00742, sent: '10 Mar' },
        { name: 'Mothers Day 2',   revenue: 47.50,  conversions: 2, recipients: 6886, open_rate: 0.3004, click_rate: 0.00349, sent: '12 Mar' },
        { name: 'Easter 2026 1',   revenue: 45.00,  conversions: 2, recipients: 1957, open_rate: 0.5714, click_rate: 0.01535, sent: '24 Mar' },
        { name: 'Mar 12 Campaign', revenue: 22.50,  conversions: 1, recipients: 7006, open_rate: 0.2762, click_rate: 0.00143, sent: '13 Mar' }
      ]
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  function fmtGBP(n) { return '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
  function pct(n)    { return Math.round(n * 1000) / 10 + '%'; }

  function totalRevenue(rows) {
    return rows.reduce(function (s, r) { return s + r.revenue; }, 0);
  }

  function buildFlowRows(rows) {
    var sorted = rows.slice().sort(function (a, b) { return b.revenue - a.revenue; });
    return sorted.map(function (r, i) {
      var openCls = r.open_rate >= 0.40 ? 'style="color:var(--OK)"' : r.open_rate >= 0.25 ? '' : 'style="color:var(--AMB)"';
      return '<tr>' +
        '<td style="color:var(--GMD)">' + (i + 1) + '</td>' +
        '<td><span class="pn">' + r.name + '</span><div class="ps">' + r.recipients.toLocaleString('en-GB') + ' recipients</div></td>' +
        '<td class="r" style="color:var(--OK);font-weight:700">' + fmtGBP(r.revenue) + '</td>' +
        '<td class="r" ' + openCls + '>' + pct(r.open_rate) + '</td>' +
        '<td class="r">' + pct(r.click_rate) + '</td>' +
        '<td class="r">' + r.conversions + '</td>' +
        '</tr>';
    }).join('');
  }

  function buildCampaignRows(rows) {
    var sorted = rows.slice().sort(function (a, b) { return b.revenue - a.revenue; });
    return sorted.map(function (r, i) {
      var openCls = r.open_rate >= 0.40 ? 'style="color:var(--OK)"' : r.open_rate >= 0.25 ? '' : 'style="color:var(--AMB)"';
      return '<tr>' +
        '<td style="color:var(--GMD)">' + (i + 1) + '</td>' +
        '<td><span class="pn">' + r.name + '</span><div class="ps">Sent ' + r.sent + ' · ' + r.recipients.toLocaleString('en-GB') + ' recipients</div></td>' +
        '<td class="r" style="color:var(--OK);font-weight:700">' + fmtGBP(r.revenue) + '</td>' +
        '<td class="r" ' + openCls + '>' + pct(r.open_rate) + '</td>' +
        '<td class="r">' + pct(r.click_rate) + '</td>' +
        '<td class="r">' + r.conversions + '</td>' +
        '</tr>';
    }).join('');
  }

  function renderView(view) {
    var flowRows = DATA.flows[view];
    var campRows = DATA.campaigns[view];
    var label    = view === 'mtd' ? 'Month to date — Mar 2026' : 'Year to date — Jan–Mar 2026';

    // Update labels
    var fLbl = document.getElementById('klv-f-lbl');
    var cLbl = document.getElementById('klv-c-lbl');
    if (fLbl) fLbl.textContent = label;
    if (cLbl) cLbl.textContent = label;

    // Toggle button states
    ['f','c'].forEach(function (prefix) {
      var mtdBtn = document.getElementById('klv-' + prefix + '-mtd');
      var ytdBtn = document.getElementById('klv-' + prefix + '-ytd');
      if (mtdBtn) mtdBtn.classList.toggle('active', view === 'mtd');
      if (ytdBtn) ytdBtn.classList.toggle('active', view === 'ytd');
    });

    // Flow table
    var fBody = document.getElementById('klv-f-body');
    if (fBody) fBody.innerHTML = buildFlowRows(flowRows);
    var fTot = document.getElementById('klv-f-tot');
    if (fTot) fTot.textContent = fmtGBP(totalRevenue(flowRows));
    var fRecip = document.getElementById('klv-f-recip');
    if (fRecip) fRecip.textContent = flowRows.reduce(function (s, r) { return s + r.recipients; }, 0).toLocaleString('en-GB');

    // Campaign table
    var cBody = document.getElementById('klv-c-body');
    if (cBody) cBody.innerHTML = buildCampaignRows(campRows);
    var cTot = document.getElementById('klv-c-tot');
    if (cTot) cTot.textContent = fmtGBP(totalRevenue(campRows));
    var cRecip = document.getElementById('klv-c-recip');
    if (cRecip) cRecip.textContent = campRows.reduce(function (s, r) { return s + r.recipients; }, 0).toLocaleString('en-GB');
  }

  function render() {
    renderView('mtd');
    console.log('[EDEN] Klaviyo component rendered.');
  }

  function setView(view) {
    renderView(view);
  }

  window.EDEN.components.klaviyo = { render: render, setView: setView };
})();
