/**
 * EDEN & CO. CEO Flight Deck — Finance Tab
 * Scenario cash planner, 2025v2026 revenue/COGS/expenses charts, cash at bank
 */
window.EDEN = window.EDEN || {};
window.EDEN.components = window.EDEN.components || {};

(function () {
  'use strict';

  // ── 2025 P&L constants (baked in from Xero) ─────────────────────────────
  var PL25 = {
    revenue:          { Jan:16783, Feb:22089, Mar:21376, Apr:25058, May:19666, Jun:19726, Jul:22647, Aug:16930, Sep:18114, Oct:32914, Nov:75962, Dec:390941 },
    cogs_op:          { Jan:5387,  Feb:7312,  Mar:8346,  Apr:10907, May:6395,  Jun:9692,  Jul:10811, Aug:11329, Sep:20093, Oct:14339, Nov:21865, Dec:109000 },
    cogs_stock:       { Jan:23620, Feb:542,   Mar:21338, Apr:6688,  May:7080,  Jun:7375,  Jul:2149,  Aug:2157,  Sep:65087, Oct:13352, Nov:71331, Dec:22688 },
    expenses:         { Jan:11790, Feb:6509,  Mar:8119,  Apr:27955, May:10420, Jun:18608, Jul:10377, Aug:9402,  Sep:13341, Oct:5401,  Nov:14719, Dec:82795 },
    marketing:        { Jan:3356,  Feb:2653,  Mar:3885,  Apr:19487, May:6993,  Jun:9728,  Jul:7254,  Aug:5505,  Sep:5173,  Oct:2050,  Nov:10103, Dec:22056 },
    platform_amazon:  { Jan:3586,  Feb:6639,  Mar:8753,  Apr:11872, May:6285,  Jun:4177,  Jul:7771,  Aug:3856,  Sep:4329,  Oct:4518,  Nov:5717,  Dec:142786 },
    platform_shopify: { Jan:3574,  Feb:1863,  Mar:3342,  Apr:3891,  May:5527,  Jun:8980,  Jul:7622,  Aug:4426,  Sep:3316,  Oct:3608,  Nov:44646, Dec:85203 },
    platform_noths:   { Jan:1856,  Feb:3141,  Mar:2087,  Apr:2935,  May:2260,  Jun:1333,  Jul:1550,  Aug:2253,  Sep:2872,  Oct:5183,  Nov:7551,  Dec:63528 },
    platform_yumbles: { Jan:4833,  Feb:5002,  Mar:4970,  Apr:4029,  May:3709,  Jun:3383,  Jul:3838,  Aug:4447,  Sep:4007,  Oct:3794,  Nov:4296,  Dec:58277 },
  };

  // ── Starling historical month-end balances ───────────────────────────────
  var STARLING_HISTORY = {
    '2025-03': 206194, '2025-04': 179609, '2025-05': 165817, '2025-06': 131559,
    '2025-07': 137965, '2025-08': 116541, '2025-09': 46208,  '2025-10': 39470,
    '2025-11': 38821,  '2025-12': 27450,  '2026-01': 242815
  };

  var OPENING_CASH = 173849; // 21 May 2026
  var Q4_STOCK_DEC_PAYMENT = 132101; // Oct production paid Dec (45d terms)

  // ── Scenario defaults ────────────────────────────────────────────────────
  var SCENARIO_DEFAULTS = [
    { key: 'red',    label: 'Red (–10%)',   pct: -10, color: '#E24B4A' },
    { key: 'orange', label: 'Orange (0%)',   pct:   0, color: '#BA7517' },
    { key: 'blue',   label: 'Blue (+20%)',   pct:  20, color: '#378ADD' },
    { key: 'green',  label: 'Green (+25%)',  pct:  25, color: '#639922' },
  ];

  var MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var MONTHS_KEYS  = ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08','2026-09','2026-10','2026-11','2026-12'];

  // Chart instance registry — destroy before recreate
  var _charts = {};

  // ── Helpers ──────────────────────────────────────────────────────────────
  function fmtGBP(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    var abs = Math.abs(Math.round(n));
    var sign = n < 0 ? '-' : '';
    return sign + '£' + abs.toLocaleString('en-GB');
  }

  function fmtK(n) {
    if (!n && n !== 0) return '—';
    var k = n / 1000;
    return '£' + (Math.round(k * 10) / 10).toLocaleString('en-GB') + 'k';
  }

  function getScenarioPcts() {
    var pcts = [];
    SCENARIO_DEFAULTS.forEach(function (s, i) {
      var el = document.getElementById('fin-slider-' + i);
      pcts.push(el ? parseFloat(el.value) : s.pct);
    });
    return pcts;
  }

  function getStarlingBalance() {
    var stored = localStorage.getItem('ec_starling_balance');
    if (stored !== null) return parseFloat(stored);
    return OPENING_CASH;
  }

  // ── Get 2026 actuals from accounting cache ───────────────────────────────
  function getActuals() {
    var ac = window.EDEN && window.EDEN._accounting;
    if (!ac || !ac.data || !ac.months || !ac.months.length) return {};
    var out = {};
    ac.months.forEach(function (mLabel) {
      var mon = mLabel.split(' ')[0]; // "Jan" from "Jan 2026"
      out[mon] = {
        revenue:  ac.data.revenue_total  && ac.data.revenue_total[mon]  || 0,
        cogs_op:  (ac.data.cogs_total    && ac.data.cogs_total[mon]     || 0) - (ac.data.cogs_stock && ac.data.cogs_stock[mon] || 0),
        cogs_stock: ac.data.cogs_stock   && ac.data.cogs_stock[mon]     || 0,
        expenses: ac.data.expenses_total && ac.data.expenses_total[mon] || 0,
        marketing: ac.data.expenses_marketing && ac.data.expenses_marketing[mon] || 0,
        gross_profit: ac.data.gross_profit && ac.data.gross_profit[mon] || 0,
      };
    });
    return out;
  }

  function getLastActualMonth(actuals) {
    // Returns e.g. "Apr" if Apr is the last month we have data for
    var last = null;
    MONTHS_SHORT.forEach(function (m) {
      if (actuals[m] && actuals[m].revenue > 0) last = m;
    });
    return last;
  }

  // ── Cash flow projection ─────────────────────────────────────────────────
  function buildCashFlow(growthPct) {
    var actuals = getActuals();
    var lastActual = getLastActualMonth(actuals);
    var lastActualIdx = lastActual ? MONTHS_SHORT.indexOf(lastActual) : -1;

    var cash = getStarlingBalance();
    // Back-fill Jan from Starling if no actuals
    // Jan 2026 Starling month-end = 242815 (from history)
    // We start projecting forward from opening cash (May 21 = 173849)
    // For months Jan-Apr we use actuals if available, else show actuals from cache
    // For May onwards we project forward from opening cash

    var result = [];
    var runningCash = cash; // Start from current balance

    // For Jan-Apr: use Starling history where available (these are past months)
    // For May onwards: project forward

    // Jan 2026 month-end from Starling = 242815
    // Feb, Mar, Apr — we don't have Starling month-end history for 2026
    // We'll derive them from actuals if available

    // Build a cash array Jan-Dec 2026
    var cashPositions = [];
    var prevCash = STARLING_HISTORY['2026-01'] || 242815; // Jan 2026 month-end

    MONTHS_SHORT.forEach(function (mon, idx) {
      var isForecast = idx > lastActualIdx;
      var isPartial  = (mon === lastActual);

      var revenue, cogsOp, expenses, stockBuy;

      if (!isForecast) {
        // Use actuals if we have them
        var a = actuals[mon] || {};
        revenue  = a.revenue  || PL25.revenue[mon]  * (1 + growthPct / 100);
        cogsOp   = a.cogs_op  || PL25.cogs_op[mon]  * (1 + growthPct / 100);
        expenses = a.expenses || PL25.expenses[mon]  * (1 + growthPct / 100);
        stockBuy = a.cogs_stock != null ? a.cogs_stock : (PL25.cogs_stock[mon] * (1 + growthPct / 100));
      } else {
        // Forecast: apply growth to 2025 base
        var g = 1 + growthPct / 100;
        revenue  = PL25.revenue[mon]  * g;
        cogsOp   = PL25.cogs_op[mon]  * g;
        expenses = PL25.expenses[mon] * g;
        // Stock buys — Q4 logic
        if (mon === 'Sep') {
          stockBuy = 0; // Pushed to Oct/Nov per spec
        } else if (mon === 'Dec') {
          stockBuy = Q4_STOCK_DEC_PAYMENT; // Pay Oct production batch
        } else {
          stockBuy = PL25.cogs_stock[mon] * g * 0.3; // Rough baseline for non-Q4 stock buys
        }
      }

      // Loan injection September
      var loanIncome = (mon === 'Sep') ? 30000 : 0;

      // Net cash movement
      var netCash = revenue - cogsOp - expenses - stockBuy + loanIncome;

      // For Jan 2026 we use Starling history as the start
      var monthEndCash;
      if (idx === 0) {
        // Jan 2026 — use Starling actual
        monthEndCash = STARLING_HISTORY['2026-01'] || (prevCash + netCash);
      } else if (idx <= 3 && lastActualIdx >= idx) {
        // Past months with actuals — derive from previous Starling month-end + net
        monthEndCash = prevCash + netCash;
      } else if (idx === 4) {
        // May — start from our known opening balance (21 May, so partial)
        monthEndCash = runningCash + netCash;
      } else {
        monthEndCash = prevCash + netCash;
      }

      cashPositions.push({
        month:       mon,
        revenue:     revenue,
        cogsOp:      cogsOp,
        expenses:    expenses,
        stockBuy:    stockBuy,
        loanIncome:  loanIncome,
        netCash:     netCash,
        cashEnd:     monthEndCash,
        isForecast:  isForecast,
        isPartial:   isPartial,
      });

      prevCash = monthEndCash;
    });

    return cashPositions;
  }

  // ── Chart helpers ────────────────────────────────────────────────────────
  function destroyChart(key) {
    if (_charts[key]) {
      try { _charts[key].destroy(); } catch(e) {}
      _charts[key] = null;
    }
  }

  function getCtx(id) {
    var el = document.getElementById(id);
    return el ? el.getContext('2d') : null;
  }

  var CHART_FONT = "'Josefin Sans', 'Montserrat', sans-serif";

  var baseGridColor  = 'rgba(0,68,55,0.08)';
  var baseTickColor  = '#6b7280';

  function axisDefaults() {
    return {
      ticks: { color: baseTickColor, font: { family: CHART_FONT, size: 11 } },
      grid: { color: baseGridColor }
    };
  }

  // ── Scenario line chart ──────────────────────────────────────────────────
  function renderScenarioChart() {
    if (!window.Chart) return;
    destroyChart('scenario');
    var ctx = getCtx('fin-chart-scenario');
    if (!ctx) return;

    var pcts = getScenarioPcts();
    var currentMonthIdx = 4; // May = index 4

    var datasets = SCENARIO_DEFAULTS.map(function (s, i) {
      var flow = buildCashFlow(pcts[i]);
      return {
        label: s.label,
        data: flow.map(function (m) { return Math.round(m.cashEnd); }),
        borderColor: s.color,
        backgroundColor: s.color + '18',
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.3,
        fill: false,
      };
    });

    // Zero line annotation data
    var zeroData  = MONTHS_SHORT.map(function() { return 0; });
    var dangerData = MONTHS_SHORT.map(function() { return 40000; });

    datasets.push({
      label: 'Zero',
      data: zeroData,
      borderColor: '#E24B4A',
      borderWidth: 1,
      borderDash: [6,4],
      pointRadius: 0,
      fill: false,
    });
    datasets.push({
      label: '£40k danger',
      data: dangerData,
      borderColor: '#BA7517',
      borderWidth: 1,
      borderDash: [4,4],
      pointRadius: 0,
      fill: false,
    });

    _charts['scenario'] = new Chart(ctx, {
      type: 'line',
      data: { labels: MONTHS_SHORT, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#374151',
              font: { family: CHART_FONT, size: 11 },
              filter: function(item) { return item.text !== 'Zero' && item.text !== '£40k danger'; }
            }
          },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                if (ctx.dataset.label === 'Zero' || ctx.dataset.label === '£40k danger') return null;
                return ctx.dataset.label + ': ' + fmtGBP(ctx.parsed.y);
              }
            }
          }
        },
        scales: {
          x: Object.assign(axisDefaults(), {
            afterTickToLabelConversion: function(axis) {
              // Highlight current month
              if (axis.ticks[currentMonthIdx]) {
                axis.ticks[currentMonthIdx].color = '#004437';
              }
            }
          }),
          y: Object.assign(axisDefaults(), {
            ticks: {
              color: baseTickColor,
              font: { family: CHART_FONT, size: 11 },
              callback: function(v) { return fmtK(v); }
            }
          })
        }
      }
    });
  }

  // ── Revenue 2025v2026 chart ──────────────────────────────────────────────
  function renderRevenueChart() {
    if (!window.Chart) return;
    destroyChart('revenue');
    var ctx = getCtx('fin-chart-revenue');
    if (!ctx) return;

    var actuals = getActuals();
    var lastActual = getLastActualMonth(actuals);
    var lastActualIdx = lastActual ? MONTHS_SHORT.indexOf(lastActual) : -1;

    var rev25 = MONTHS_SHORT.map(function (m) { return PL25.revenue[m]; });
    var rev26actual = MONTHS_SHORT.map(function (m, i) {
      if (i > lastActualIdx) return null;
      return actuals[m] ? actuals[m].revenue : null;
    });
    var rev26forecast = MONTHS_SHORT.map(function (m, i) {
      if (i <= lastActualIdx) return null;
      return Math.round(PL25.revenue[m] * 1.2); // Blue scenario (+20%) as default forecast
    });

    _charts['revenue'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: MONTHS_SHORT,
        datasets: [
          {
            label: '2025 Actual',
            data: rev25,
            backgroundColor: 'rgba(180,162,105,0.35)',
            borderColor: 'rgba(180,162,105,0.7)',
            borderWidth: 1,
          },
          {
            label: '2026 Actual',
            data: rev26actual,
            backgroundColor: 'rgba(0,68,55,0.75)',
            borderColor: '#004437',
            borderWidth: 1,
          },
          {
            label: '2026 Forecast (+20%)',
            data: rev26forecast,
            backgroundColor: 'rgba(0,68,55,0.25)',
            borderColor: 'rgba(0,68,55,0.5)',
            borderWidth: 1,
            borderDash: [4,3],
          },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { color: '#374151', font: { family: CHART_FONT, size: 11 } } },
          tooltip: {
            callbacks: { label: function(ctx) { return ctx.dataset.label + ': ' + fmtGBP(ctx.parsed.y); } }
          }
        },
        scales: {
          x: axisDefaults(),
          y: Object.assign(axisDefaults(), {
            ticks: { color: baseTickColor, font: { family: CHART_FONT, size: 11 }, callback: function(v) { return fmtK(v); } }
          })
        }
      }
    });
  }

  // ── COGS 2025v2026 chart ─────────────────────────────────────────────────
  function renderCogsChart() {
    if (!window.Chart) return;
    destroyChart('cogs');
    var ctx = getCtx('fin-chart-cogs');
    if (!ctx) return;

    var actuals = getActuals();
    var lastActual = getLastActualMonth(actuals);
    var lastActualIdx = lastActual ? MONTHS_SHORT.indexOf(lastActual) : -1;

    var cogs25op    = MONTHS_SHORT.map(function (m) { return PL25.cogs_op[m]; });
    var cogs25stock = MONTHS_SHORT.map(function (m) { return PL25.cogs_stock[m]; });
    var cogs26op    = MONTHS_SHORT.map(function (m, i) {
      if (i > lastActualIdx) return null;
      return actuals[m] ? actuals[m].cogs_op : null;
    });
    var cogs26stock = MONTHS_SHORT.map(function (m, i) {
      if (i > lastActualIdx) return null;
      return actuals[m] ? actuals[m].cogs_stock : null;
    });

    _charts['cogs'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: MONTHS_SHORT,
        datasets: [
          {
            label: '2025 Op COGS',
            data: cogs25op,
            backgroundColor: 'rgba(180,162,105,0.45)',
            borderColor: 'rgba(180,162,105,0.7)',
            borderWidth: 1,
            stack: 'y2025',
          },
          {
            label: '2025 Stock Buys',
            data: cogs25stock,
            backgroundColor: 'rgba(186,117,23,0.35)',
            borderColor: 'rgba(186,117,23,0.6)',
            borderWidth: 1,
            stack: 'y2025',
          },
          {
            label: '2026 Op COGS',
            data: cogs26op,
            backgroundColor: 'rgba(0,68,55,0.7)',
            borderColor: '#004437',
            borderWidth: 1,
            stack: 'y2026',
          },
          {
            label: '2026 Stock Buys',
            data: cogs26stock,
            backgroundColor: 'rgba(55,138,221,0.45)',
            borderColor: 'rgba(55,138,221,0.7)',
            borderWidth: 1,
            stack: 'y2026',
          },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { color: '#374151', font: { family: CHART_FONT, size: 11 } } },
          tooltip: {
            callbacks: { label: function(ctx) { return ctx.dataset.label + ': ' + fmtGBP(ctx.parsed.y); } }
          }
        },
        scales: {
          x: axisDefaults(),
          y: Object.assign(axisDefaults(), {
            stacked: false,
            ticks: { color: baseTickColor, font: { family: CHART_FONT, size: 11 }, callback: function(v) { return fmtK(v); } }
          })
        }
      }
    });
  }

  // ── Expenses 2025v2026 chart ─────────────────────────────────────────────
  function renderExpensesChart() {
    if (!window.Chart) return;
    destroyChart('expenses');
    var ctx = getCtx('fin-chart-expenses');
    if (!ctx) return;

    var actuals = getActuals();
    var lastActual = getLastActualMonth(actuals);
    var lastActualIdx = lastActual ? MONTHS_SHORT.indexOf(lastActual) : -1;

    var exp25 = MONTHS_SHORT.map(function (m) { return PL25.expenses[m]; });
    var mkt25 = MONTHS_SHORT.map(function (m) { return PL25.marketing[m]; });
    var exp26 = MONTHS_SHORT.map(function (m, i) {
      if (i > lastActualIdx) return null;
      return actuals[m] ? actuals[m].expenses : null;
    });
    var mkt26 = MONTHS_SHORT.map(function (m, i) {
      if (i > lastActualIdx) return null;
      return actuals[m] ? actuals[m].marketing : null;
    });

    _charts['expenses'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: MONTHS_SHORT,
        datasets: [
          {
            label: '2025 Total Expenses',
            data: exp25,
            backgroundColor: 'rgba(226,75,74,0.25)',
            borderColor: 'rgba(226,75,74,0.6)',
            borderWidth: 1,
          },
          {
            label: '2025 Marketing',
            data: mkt25,
            backgroundColor: 'rgba(180,162,105,0.5)',
            borderColor: 'rgba(180,162,105,0.8)',
            borderWidth: 1,
          },
          {
            label: '2026 Total Expenses',
            data: exp26,
            backgroundColor: 'rgba(226,75,74,0.65)',
            borderColor: '#E24B4A',
            borderWidth: 1,
          },
          {
            label: '2026 Marketing',
            data: mkt26,
            backgroundColor: 'rgba(99,153,34,0.6)',
            borderColor: 'rgba(99,153,34,0.9)',
            borderWidth: 1,
          },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { color: '#374151', font: { family: CHART_FONT, size: 11 } } },
          tooltip: {
            callbacks: { label: function(ctx) { return ctx.dataset.label + ': ' + fmtGBP(ctx.parsed.y); } }
          }
        },
        scales: {
          x: axisDefaults(),
          y: Object.assign(axisDefaults(), {
            ticks: { color: baseTickColor, font: { family: CHART_FONT, size: 11 }, callback: function(v) { return fmtK(v); } }
          })
        }
      }
    });
  }

  // ── Cash at Bank chart ───────────────────────────────────────────────────
  function renderCashChart() {
    if (!window.Chart) return;
    destroyChart('cash');
    var ctx = getCtx('fin-chart-cash');
    if (!ctx) return;

    var pcts = getScenarioPcts();

    // Starling historical — 2025 Mar through 2026 Jan
    var histLabels = Object.keys(STARLING_HISTORY).sort();
    var histData   = histLabels.map(function (k) { return STARLING_HISTORY[k]; });

    // Build extended labels: historical + 2026 months
    var allLabels = histLabels.map(function (k) {
      var parts = k.split('-');
      return MONTHS_SHORT[parseInt(parts[1]) - 1] + ' ' + parts[0].slice(2);
    });

    // Pad 2026 months into the same label array
    // Historical ends at 2026-01, then we project Feb-Dec 2026
    var proj2026Start = 1; // Feb 2026 (index 1)
    MONTHS_SHORT.slice(proj2026Start).forEach(function (m, i) {
      allLabels.push(m + ' 26');
    });

    // Historical dataset (same length as histLabels)
    var histDs = {
      label: 'Starling (actual)',
      data: Array.prototype.concat.call(histData, new Array(MONTHS_SHORT.length - proj2026Start).fill(null)),
      borderColor: '#004437',
      backgroundColor: 'rgba(0,68,55,0.12)',
      borderWidth: 2.5,
      pointRadius: 3,
      fill: true,
      tension: 0.2,
    };

    // For each scenario, build Feb-Dec 2026 projection starting from Jan 2026 end
    var scenarioDatasets = SCENARIO_DEFAULTS.map(function (s, i) {
      var flow = buildCashFlow(pcts[i]);
      // flow is Jan-Dec 2026
      // We want Feb-Dec 2026 (11 values)
      var projValues = flow.slice(proj2026Start).map(function (m) { return Math.round(m.cashEnd); });
      // Prepend nulls for historical positions, then Jan 2026 bridge, then proj
      var data = new Array(histData.length - 1).fill(null);
      data.push(STARLING_HISTORY['2026-01']); // Jan 2026 bridge point
      data = data.concat(projValues);
      return {
        label: s.label,
        data: data,
        borderColor: s.color,
        borderWidth: 1.5,
        borderDash: [5,3],
        pointRadius: 2,
        fill: false,
        tension: 0.3,
      };
    });

    var datasets = [histDs].concat(scenarioDatasets);

    // Zero and danger lines
    datasets.push({
      label: 'Zero',
      data: new Array(allLabels.length).fill(0),
      borderColor: '#E24B4A',
      borderWidth: 1,
      borderDash: [6,4],
      pointRadius: 0,
      fill: false,
    });
    datasets.push({
      label: '£40k floor',
      data: new Array(allLabels.length).fill(40000),
      borderColor: '#BA7517',
      borderWidth: 1,
      borderDash: [4,4],
      pointRadius: 0,
      fill: false,
    });

    _charts['cash'] = new Chart(ctx, {
      type: 'line',
      data: { labels: allLabels, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#374151',
              font: { family: CHART_FONT, size: 11 },
              filter: function(item) { return item.text !== 'Zero' && item.text !== '£40k floor'; }
            }
          },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                if (ctx.dataset.label === 'Zero' || ctx.dataset.label === '£40k floor') return null;
                return ctx.dataset.label + ': ' + fmtGBP(ctx.parsed.y);
              }
            }
          }
        },
        scales: {
          x: axisDefaults(),
          y: Object.assign(axisDefaults(), {
            ticks: { color: baseTickColor, font: { family: CHART_FONT, size: 11 }, callback: function(v) { return fmtK(v); } }
          })
        }
      }
    });
  }

  // ── Cash table ───────────────────────────────────────────────────────────
  function renderCashTable() {
    var container = document.getElementById('fin-cash-table-body');
    if (!container) return;

    var pcts = getScenarioPcts();
    var flows = SCENARIO_DEFAULTS.map(function (s, i) { return buildCashFlow(pcts[i]); });

    var html = '';
    MONTHS_SHORT.forEach(function (mon, idx) {
      var baseFlow = flows[1][idx]; // Orange (0%) as base row
      var classes = baseFlow.isForecast ? 'fin-row-forecast' : '';
      if (baseFlow.isPartial) classes += ' fin-row-partial';

      html += '<tr class="' + classes + '">';
      html += '<td>' + mon + ' 2026' + (baseFlow.isPartial ? ' <span class="fin-partial-tag">partial</span>' : '') + '</td>';
      html += '<td class="r">' + fmtGBP(baseFlow.revenue) + '</td>';
      html += '<td class="r">' + fmtGBP(baseFlow.cogsOp + baseFlow.stockBuy) + '</td>';
      html += '<td class="r">' + fmtGBP(baseFlow.expenses) + '</td>';
      html += '<td class="r">' + (baseFlow.loanIncome ? fmtGBP(baseFlow.loanIncome) : '—') + '</td>';
      html += '<td class="r">' + fmtGBP(baseFlow.netCash) + '</td>';
      // Cash end for each scenario
      SCENARIO_DEFAULTS.forEach(function (s, i) {
        var f = flows[i][idx];
        var val = Math.round(f.cashEnd);
        var cls = val < 0 ? 'fin-cash-neg' : (val < 40000 ? 'fin-cash-warn' : 'fin-cash-ok');
        html += '<td class="r ' + cls + '" style="color:' + s.color + '">' + fmtGBP(val) + '</td>';
      });
      html += '</tr>';
    });
    container.innerHTML = html;
  }

  // ── Summary bar ──────────────────────────────────────────────────────────
  function renderSummaryBar() {
    var balance = getStarlingBalance();
    var pcts = getScenarioPcts();

    // Find lowest projected cash (green scenario = best case)
    var greenFlow = buildCashFlow(pcts[3]);
    var lowestCash = Infinity;
    var yearEndBest = greenFlow[11].cashEnd;
    greenFlow.forEach(function (m) {
      if (m.isForecast && m.cashEnd < lowestCash) lowestCash = m.cashEnd;
    });

    var ac = window.EDEN && window.EDEN._accounting;
    var refreshText = ac && ac.generated ? ac.generated.replace('T', ' ').replace('Z', ' UTC') : 'Not loaded';

    var el = document.getElementById('fin-summary-bar');
    if (!el) return;

    el.innerHTML = [
      '<div class="fin-sb-item">',
        '<div class="fin-sb-lbl">Current balance</div>',
        '<div class="fin-sb-val" id="fin-balance-display">' + fmtGBP(balance) + '</div>',
        '<input id="fin-balance-input" type="number" class="fin-balance-input" value="' + Math.round(balance) + '" ',
        'onchange="window.EDEN.components.finance._onBalanceChange(this.value)" ',
        'placeholder="Balance">',
      '</div>',
      '<div class="fin-sb-item">',
        '<div class="fin-sb-lbl">Lowest projected</div>',
        '<div class="fin-sb-val ' + (lowestCash < 0 ? 'fin-neg' : lowestCash < 40000 ? 'fin-warn' : '') + '">' + fmtGBP(lowestCash === Infinity ? 0 : lowestCash) + '</div>',
        '<div class="fin-sb-sub">Green scenario</div>',
      '</div>',
      '<div class="fin-sb-item">',
        '<div class="fin-sb-lbl">Year-end best case</div>',
        '<div class="fin-sb-val">' + fmtGBP(yearEndBest) + '</div>',
        '<div class="fin-sb-sub">Green scenario</div>',
      '</div>',
      '<div class="fin-sb-item">',
        '<div class="fin-sb-lbl">P&amp;L last refreshed</div>',
        '<div class="fin-sb-val" style="font-size:12px">' + refreshText + '</div>',
        '<button class="fin-refresh-btn" onclick="window.EDEN.components.finance._onRefresh()">Refresh</button>',
      '</div>',
    ].join('');
  }

  // ── Slider labels ────────────────────────────────────────────────────────
  function updateSliderLabels() {
    SCENARIO_DEFAULTS.forEach(function (s, i) {
      var el = document.getElementById('fin-slider-' + i);
      var lbl = document.getElementById('fin-slider-lbl-' + i);
      if (el && lbl) {
        var v = parseFloat(el.value);
        lbl.textContent = (v >= 0 ? '+' : '') + v + '%';
        lbl.style.color = s.color;
      }
    });
  }

  // ── Render all charts ────────────────────────────────────────────────────
  function renderAllCharts() {
    renderSummaryBar();
    renderScenarioChart();
    renderRevenueChart();
    renderCogsChart();
    renderExpensesChart();
    renderCashChart();
    renderCashTable();
  }

  // ── HTML template ────────────────────────────────────────────────────────
  function buildHTML() {
    var sliders = SCENARIO_DEFAULTS.map(function (s, i) {
      return [
        '<div class="fin-slider-row">',
          '<span class="fin-slider-dot" style="background:' + s.color + '"></span>',
          '<span class="fin-slider-name">' + s.label + '</span>',
          '<input id="fin-slider-' + i + '" type="range" min="-30" max="50" step="1" value="' + s.pct + '" ',
          'class="fin-slider" oninput="window.EDEN.components.finance._onSlider()">',
          '<span id="fin-slider-lbl-' + i + '" class="fin-slider-val" style="color:' + s.color + '">' + (s.pct >= 0 ? '+' : '') + s.pct + '%</span>',
        '</div>',
      ].join('');
    }).join('');

    var cashTableHeaders = SCENARIO_DEFAULTS.map(function (s) {
      return '<th class="r" style="color:' + s.color + '">' + s.key.charAt(0).toUpperCase() + s.key.slice(1) + '</th>';
    }).join('');

    return [
      '<style>',
        '#tab-finance { font-family:"Josefin Sans",sans-serif; }',
        '#tab-finance .page { max-width: none; padding: 0; }',
        '.fin-summary-bar { display:flex; gap:2px; background:var(--G); border-bottom:3px solid var(--GOLD); flex-wrap:wrap; }',
        '.fin-sb-item { flex:1; min-width:180px; padding:18px 24px; border-right:1px solid rgba(255,255,255,0.1); }',
        '.fin-sb-item:last-child { border-right:none; }',
        '.fin-sb-lbl { font-size:9px; letter-spacing:0.18em; text-transform:uppercase; color:rgba(245,239,228,0.55); font-weight:700; margin-bottom:6px; }',
        '.fin-sb-val { font-size:22px; font-weight:700; font-family:var(--FM); color:#fff; line-height:1; margin-bottom:4px; }',
        '.fin-sb-val.fin-neg { color:#f87171; }',
        '.fin-sb-val.fin-warn { color:var(--GOLD); }',
        '.fin-sb-sub { font-size:10px; color:rgba(245,239,228,0.45); }',
        '.fin-balance-input { background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; font-family:"Josefin Sans",sans-serif; font-size:13px; padding:4px 8px; width:100%; margin-top:6px; border-radius:2px; }',
        '.fin-refresh-btn { margin-top:8px; background:transparent; border:1px solid rgba(245,239,228,0.3); color:rgba(245,239,228,0.7); font-family:"Josefin Sans",sans-serif; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; padding:5px 12px; cursor:pointer; border-radius:2px; transition:all 0.15s; }',
        '.fin-refresh-btn:hover { background:rgba(255,255,255,0.1); color:#fff; }',

        '.fin-section { padding:32px 32px 0; }',
        '.fin-section:last-of-type { padding-bottom:40px; }',
        '.fin-sec-eyebrow { font-size:9px; letter-spacing:0.2em; text-transform:uppercase; color:var(--GOLD); font-weight:700; margin-bottom:6px; }',
        '.fin-sec-title { font-family:var(--FM); font-size:24px; font-weight:400; color:var(--G); margin:0 0 20px; letter-spacing:-0.01em; }',
        '.fin-chart-wrap { background:var(--W); border:1px solid var(--GL); border-radius:var(--r8); padding:20px; margin-bottom:20px; }',
        '.fin-chart-canvas { width:100% !important; height:280px; }',

        '.fin-sliders { display:flex; flex-direction:column; gap:10px; margin-top:16px; padding:16px 20px; background:var(--GXP); border:1px solid var(--GL); border-radius:var(--r8); }',
        '.fin-sliders-title { font-size:9px; letter-spacing:0.18em; text-transform:uppercase; color:var(--GMD); font-weight:700; margin-bottom:4px; }',
        '.fin-slider-row { display:flex; align-items:center; gap:10px; }',
        '.fin-slider-dot { width:10px; height:10px; min-width:10px; border-radius:50%; }',
        '.fin-slider-name { font-size:12px; color:var(--GDK); min-width:120px; }',
        '.fin-slider { flex:1; accent-color:var(--G); cursor:pointer; }',
        '.fin-slider-val { font-size:13px; font-weight:700; font-family:var(--FM); min-width:48px; text-align:right; }',

        '.fin-cash-table-wrap { overflow-x:auto; }',
        '.fin-cash-table { width:100%; border-collapse:collapse; font-size:12px; }',
        '.fin-cash-table th { background:var(--G); color:var(--CREAM); font-family:"Josefin Sans",sans-serif; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; padding:10px 12px; text-align:left; border-right:1px solid rgba(255,255,255,0.08); white-space:nowrap; }',
        '.fin-cash-table th.r { text-align:right; }',
        '.fin-cash-table td { padding:8px 12px; border-bottom:1px solid var(--GL); font-size:12px; white-space:nowrap; }',
        '.fin-cash-table td.r { text-align:right; font-family:var(--FM); }',
        '.fin-cash-table tr:nth-child(even) td { background:var(--GXP); }',
        '.fin-cash-table .fin-row-forecast td { opacity:0.85; font-style:italic; }',
        '.fin-cash-table .fin-cash-neg { color:#E24B4A !important; font-weight:700; }',
        '.fin-cash-table .fin-cash-warn { color:#BA7517 !important; }',
        '.fin-cash-table .fin-cash-ok { }',
        '.fin-partial-tag { font-size:9px; background:var(--ABL); color:var(--GOM); border:1px solid var(--GOLD); border-radius:2px; padding:1px 5px; letter-spacing:0.06em; }',

        '.fin-no-data { background:var(--ABL); border:1px solid var(--GOLD); border-radius:var(--r8); padding:18px 22px; margin-bottom:20px; font-size:13px; color:var(--AMB); }',
      '</style>',

      '<div id="fin-summary-bar" class="fin-summary-bar">',
        '<div class="fin-sb-item"><div class="fin-sb-lbl">Loading...</div></div>',
      '</div>',

      // ── Scenario planner ──
      '<div class="fin-section">',
        '<div class="fin-sec-eyebrow">Cash forecast</div>',
        '<h2 class="fin-sec-title">Scenario Cash Planner — 2026</h2>',

        '<div id="fin-pl-warning" style="display:none" class="fin-no-data">',
          'P&amp;L actuals not loaded. Charts show 2025 baseline only.',
          ' The accounting cache is refreshed daily at 9am. Click Refresh above to pull current data.',
        '</div>',

        '<div class="fin-chart-wrap">',
          '<canvas id="fin-chart-scenario" class="fin-chart-canvas"></canvas>',
        '</div>',
        '<div class="fin-sliders">',
          '<div class="fin-sliders-title">Growth vs 2025 — adjust each scenario</div>',
          sliders,
        '</div>',
      '</div>',

      // ── Revenue ──
      '<div class="fin-section">',
        '<div class="fin-sec-eyebrow">Year on year</div>',
        '<h2 class="fin-sec-title">Revenue — 2025 vs 2026</h2>',
        '<div class="fin-chart-wrap">',
          '<canvas id="fin-chart-revenue" class="fin-chart-canvas"></canvas>',
        '</div>',
      '</div>',

      // ── COGS ──
      '<div class="fin-section">',
        '<div class="fin-sec-eyebrow">Year on year</div>',
        '<h2 class="fin-sec-title">COGS — 2025 vs 2026</h2>',
        '<div class="fin-chart-wrap">',
          '<canvas id="fin-chart-cogs" class="fin-chart-canvas"></canvas>',
        '</div>',
      '</div>',

      // ── Expenses ──
      '<div class="fin-section">',
        '<div class="fin-sec-eyebrow">Year on year</div>',
        '<h2 class="fin-sec-title">Expenses — 2025 vs 2026</h2>',
        '<div class="fin-chart-wrap">',
          '<canvas id="fin-chart-expenses" class="fin-chart-canvas"></canvas>',
        '</div>',
      '</div>',

      // ── Cash at Bank ──
      '<div class="fin-section">',
        '<div class="fin-sec-eyebrow">Bank</div>',
        '<h2 class="fin-sec-title">Cash at Bank — Historical &amp; Projected</h2>',
        '<div class="fin-chart-wrap">',
          '<canvas id="fin-chart-cash" class="fin-chart-canvas"></canvas>',
        '</div>',
        '<div class="fin-cash-table-wrap">',
          '<table class="fin-cash-table">',
            '<thead><tr>',
              '<th>Month</th>',
              '<th class="r">Revenue</th>',
              '<th class="r">COGS</th>',
              '<th class="r">Expenses</th>',
              '<th class="r">Loan</th>',
              '<th class="r">Net</th>',
              cashTableHeaders,
            '</tr></thead>',
            '<tbody id="fin-cash-table-body"><tr><td colspan="10" style="padding:16px;text-align:center;color:var(--GMD)">Loading...</td></tr></tbody>',
          '</table>',
        '</div>',
      '</div>',
    ].join('\n');
  }

  // ── Public API ───────────────────────────────────────────────────────────
  var component = {
    render: function () {
      var root = document.getElementById('finance-root');
      if (!root) return;
      root.innerHTML = buildHTML();

      // Show warning if no accounting data
      var ac = window.EDEN && window.EDEN._accounting;
      var hasData = ac && ac.months && ac.months.length > 0;
      var warn = document.getElementById('fin-pl-warning');
      if (warn) warn.style.display = hasData ? 'none' : 'block';
    },

    init: function () {
      // Render HTML if not yet done
      var root = document.getElementById('finance-root');
      if (!root) return;
      var needsRender = !document.getElementById('fin-summary-bar') || document.getElementById('fin-summary-bar').children.length <= 1;
      if (needsRender) this.render();

      // Short delay to let Chart.js initialise if just added
      var self = this;
      setTimeout(function () {
        renderAllCharts();
        updateSliderLabels();
      }, 50);
    },

    _onSlider: function () {
      updateSliderLabels();
      // Debounce chart redraws
      if (this._sliderTimer) clearTimeout(this._sliderTimer);
      this._sliderTimer = setTimeout(function () {
        renderScenarioChart();
        renderCashChart();
        renderCashTable();
        renderSummaryBar();
      }, 150);
    },

    _onBalanceChange: function (val) {
      var n = parseFloat(val);
      if (!isNaN(n)) {
        localStorage.setItem('ec_starling_balance', String(n));
        renderSummaryBar();
        renderScenarioChart();
        renderCashChart();
        renderCashTable();
      }
    },

    _onRefresh: function () {
      // Trigger a page reload to pick up fresh cache files
      window.location.reload();
    },
  };

  window.EDEN.components.finance = component;

})();
