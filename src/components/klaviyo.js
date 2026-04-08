/**
 * EDEN & CO. CEO Flight Deck - Klaviyo Email Component
 * Live data fetched from Klaviyo MCP on 8 Apr 2026.
 * Refresh by re-running Klaviyo MCP queries in Claude and updating the DATA block below.
 */
window.EDEN = window.EDEN || {};
window.EDEN.components = window.EDEN.components || {};

(function () {
  'use strict';

  // ── Live data (last fetched: 8 Apr 2026) ─────────────────────────────────

  var DATA = {
    flows: {
      mtd: [
        { name: 'Winback Flow',           revenue: 157.98, conversions: 2, recipients: 402,  open_rate: 0.3233, click_rate: 0.0100 },
        { name: 'Abandoned Cart',         revenue:  45.00, conversions: 1, recipients:  20,  open_rate: 0.1765, click_rate: 0.0000 },
        { name: 'Email Welcome Series',   revenue:  25.00, conversions: 1, recipients: 276,  open_rate: 0.3162, click_rate: 0.0110 },
        { name: 'Browse Abandonment',     revenue:   0.00, conversions: 0, recipients:  42,  open_rate: 0.6098, click_rate: 0.0000 },
        { name: 'Shipping: Order Shipped',revenue:   0.00, conversions: 0, recipients: 1018, open_rate: 0.0884, click_rate: 0.0010 },
        { name: 'Shipping: Order Received',revenue:  0.00, conversions: 0, recipients: 521,  open_rate: 0.0576, click_rate: 0.0019 }
      ],
      ytd: [
        { name: 'Winback Flow',           revenue: 1338.85, conversions: 20, recipients: 15132, open_rate: 0.3798, click_rate: 0.0111 },
        { name: 'Email Welcome Series',   revenue:  789.09, conversions: 14, recipients:  3850, open_rate: 0.3409, click_rate: 0.0089 },
        { name: 'Shipping: Order Shipped',revenue:  529.00, conversions: 16, recipients: 17634, open_rate: 0.0957, click_rate: 0.0033 },
        { name: 'Abandoned Cart',         revenue:  504.99, conversions:  9, recipients:   240, open_rate: 0.3820, click_rate: 0.0386 },
        { name: 'Browse Abandonment',     revenue:  371.08, conversions:  6, recipients:   640, open_rate: 0.6441, click_rate: 0.0299 },
        { name: 'Gift Finder (Large)',    revenue:   25.00, conversions:  1, recipients:     4, open_rate: 0.7500, click_rate: 0.0000 }
      ]
    },
    campaigns: {
      mtd: [
        { name: 'Easter 3',       revenue: 25.00, conversions: 1, recipients: 2107, open_rate: 0.5031, click_rate: 0.00380, sent: '2 Apr' },
        { name: 'Easter 2026 4',  revenue:  0.00, conversions: 0, recipients: 2125, open_rate: 0.5588, click_rate: 0.00236, sent: '5 Apr' }
      ],
      ytd: [
        { name: 'Mothers Day 1',        revenue: 227.37, conversions: 4, recipients: 7025, open_rate: 0.3501, click_rate: 0.00742, sent: '10 Mar' },
        { name: 'Mothers Day 2',        revenue:  47.50, conversions: 2, recipients: 6886, open_rate: 0.3020, click_rate: 0.00364, sent: '12 Mar' },
        { name: 'Easter 2026 1',        revenue:  45.00, conversions: 2, recipients: 1957, open_rate: 0.5852, click_rate: 0.01586, sent: '24 Mar' },
        { name: 'Easter 3',             revenue:  25.00, conversions: 1, recipients: 2107, open_rate: 0.5031, click_rate: 0.00380, sent: '2 Apr' },
        { name: 'Campaign Mar 12',      revenue:  22.50, conversions: 1, recipients: 7006, open_rate: 0.2786, click_rate: 0.00143, sent: '13 Mar' },
        { name: 'Campaign Mar 30',      revenue:  22.00, conversions: 1, recipients: 2053, open_rate: 0.5439, click_rate: 0.00634, sent: '30 Mar' }
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
