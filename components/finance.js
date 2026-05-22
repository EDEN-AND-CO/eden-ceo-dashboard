/**
 * EDEN & CO. CEO Flight Deck — Finance Tab
 * Four components: Fuel Gauge · Scenario Chart · Rolling Balance Table · Key Dates
 * Data: window.EDEN._accounting (from accounting-cache.js, source: Cash Forecast Google Sheet)
 */
window.EDEN = window.EDEN || {};
window.EDEN.components = window.EDEN.components || {};

(function () {
  'use strict';

  // ── Constants ────────────────────────────────────────────────────────────────
  var FIXED_MONTHLY_BURN   = 11665;
  var DANGER_THRESHOLD     = 40000;
  var EXCEPTIONAL = { May:-41754, Jun:-7560, Sep:30000, Dec:-132101 };
  var REV_2025 = {
    Jan:16783, Feb:22089, Mar:21376, Apr:25058, May:19666, Jun:19726,
    Jul:22647, Aug:16930, Sep:18114, Oct:32914, Nov:75962, Dec:390941
  };
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var ACTUALS_MONTHS = ['Jan','Feb','Mar','Apr']; // months with 2026 confirmed actuals

  var SCENARIOS = [
    { key:'red',    label:'Red',    pct:-10, color:'#E24B4A' },
    { key:'orange', label:'Orange', pct:0,   color:'#BA7517' },
    { key:'blue',   label:'Blue',   pct:20,  color:'#378ADD' },
    { key:'green',  label:'Green',  pct:25,  color:'#639922' },
  ];

  var KEY_DATES = [
    { date:'May 2026',  desc:'Move costs land',           amount:'-£41,754',  sign:-1 },
    { date:'Jun 2026',  desc:'Remaining move costs',       amount:'-£7,560',   sign:-1 },
    { date:'Sep 2026',  desc:'Personal loan in',           amount:'+£30,000',  sign:1  },
    { date:'Oct 2026',  desc:'Production begins',          amount:'Stock committed', sign:0 },
    { date:'Dec 2026',  desc:'Supplier payments due',      amount:'-£132,101', sign:-1 },
    { date:'Dec 2026',  desc:'Q4 revenue clears',          amount:'+',         sign:1  },
    { date:'Jan 2027',  desc:'Nov production invoices',    amount:'-£198,151', sign:-1 },
  ];

  var _scenarioChart = null;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function fmtGBP(n) {
    if (n == null || isNaN(n)) return '—';
    var abs = Math.abs(Math.round(n));
    return (n < 0 ? '-' : '') + '£' + abs.toLocaleString('en-GB');
  }

  function ac() { return (window.EDEN && window.EDEN._accounting) || {}; }

  function getStarlingBalance() {
    var stored = localStorage.getItem('ec_starling_balance');
    return stored !== null ? parseFloat(stored) : (ac().starling_balance || 173849);
  }

  function getSliderPct(i) {
    var el = document.getElementById('fin-slider-' + i);
    return el ? parseFloat(el.value) : SCENARIOS[i].pct;
  }

  // ── Scenario engine ──────────────────────────────────────────────────────────
  // Returns array of 12 closing balances for a given growth %
  function computeScenario(growthPct) {
    var data = ac();
    var balance = getStarlingBalance();
    var results = [];

    MONTHS.forEach(function (m, i) {
      var isActual = ACTUALS_MONTHS.indexOf(m) !== -1;
      var net;

      if (isActual) {
        // Use sheet actual net movement
        var actual = data.net_movement && data.net_movement[m];
        // Jan-Apr actuals: use pl_actual which reflects real P&L
        var pl = data.pl_actual && data.pl_actual[m];
        net = (pl != null) ? pl : (actual != null ? actual : 0);
      } else {
        // Forecast: revenue based on 2025 * (1 + growth%) + fixed costs
        var rev = REV_2025[m] * (1 + growthPct / 100);
        var exc = EXCEPTIONAL[m] || 0;
        net = rev - FIXED_MONTHLY_BURN + exc;
      }

      balance += net;
      results.push(Math.round(balance));
    });

    return results;
  }

  // ── Fuel Gauge ───────────────────────────────────────────────────────────────
  function buildGauge() {
    var balance = getStarlingBalance();
    var dailyBurn = FIXED_MONTHLY_BURN / 30;
    var days = Math.round(balance / dailyBurn);

    var color = days >= 90 ? '#639922' : days >= 60 ? '#BA7517' : '#E24B4A';
    var label = days >= 90 ? 'Safe — race hard' : days >= 60 ? 'Watch spend' : 'Act now';

    var pct = Math.min(1, days / 180); // 180d = full gauge
    var angle = pct * 270 - 135; // -135deg to +135deg sweep
    var rad = angle * Math.PI / 180;
    var cx = 100, cy = 110, r = 80;
    var startAngle = -135 * Math.PI / 180;
    var endAngle   = (angle) * Math.PI / 180;

    function arcPoint(a) {
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    }

    var s = arcPoint(startAngle), e = arcPoint(endAngle);
    var large = pct > 0.5 ? 1 : 0;
    var trackPath  = 'M ' + arcPoint(-135*Math.PI/180).join(' ') + ' A ' + r + ' ' + r + ' 0 1 1 ' + arcPoint(135*Math.PI/180).join(' ');
    var fillPath   = 'M ' + s.join(' ') + ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + e.join(' ');

    var exhaustDate = new Date();
    exhaustDate.setDate(exhaustDate.getDate() + days);
    var exhaustStr = exhaustDate.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });

    var starlingDate = ac().starling_date || '';
    var badge = '<span class="fin-badge fin-badge-live">LIVE</span>';

    return [
      '<div class="fin-gauge-wrap">',
        '<svg width="200" height="170" viewBox="0 0 200 170">',
          '<path d="' + trackPath + '" fill="none" stroke="rgba(0,68,55,0.1)" stroke-width="14" stroke-linecap="round"/>',
          '<path d="' + fillPath + '" fill="none" stroke="' + color + '" stroke-width="14" stroke-linecap="round"/>',
          '<text x="100" y="108" text-anchor="middle" font-size="38" font-weight="700" font-family="var(--FM)" fill="' + color + '">' + days + '</text>',
          '<text x="100" y="130" text-anchor="middle" font-size="11" font-family="var(--F)" fill="var(--GMD)" letter-spacing="0.1em">of runway</text>',
          '<text x="100" y="150" text-anchor="middle" font-size="10" font-family="var(--F)" fill="' + color + '">' + label + '</text>',
        '</svg>',
        '<div class="fin-gauge-stats">',
          '<div>Cash today: <strong>' + fmtGBP(balance) + '</strong> ' + badge + '</div>',
          '<div>Fuel runs out: <strong>' + exhaustStr + '</strong></div>',
          '<div>Q4 revenue lands: <strong>Dec 2026</strong></div>',
        '</div>',
        '<div class="fin-gauge-input">',
          '<label>Update Starling balance</label>',
          '<div style="display:flex;gap:8px;align-items:center;margin-top:6px">',
            '<input type="number" id="fin-starling-input" value="' + Math.round(balance) + '" step="100" style="width:130px;padding:5px 8px;font-size:13px;border:1px solid var(--GL);border-radius:3px;font-family:var(--FM)">',
            '<span style="font-size:11px;color:var(--GMD)">As of ' + (starlingDate || 'today') + '</span>',
          '</div>',
        '</div>',
      '</div>',
    ].join('');
  }

  function updateGauge() {
    var el = document.getElementById('fin-gauge-container');
    if (el) el.innerHTML = buildGauge();
    attachGaugeListener();
  }

  function attachGaugeListener() {
    var inp = document.getElementById('fin-starling-input');
    if (!inp) return;
    inp.addEventListener('input', function () {
      var v = parseFloat(this.value);
      if (!isNaN(v) && v > 0) {
        localStorage.setItem('ec_starling_balance', String(v));
        updateGauge();
        updateScenarioChart();
        renderTable();
      }
    });
  }

  // ── Scenario Chart ───────────────────────────────────────────────────────────
  function updateScenarioChart() {
    if (_scenarioChart) { _scenarioChart.destroy(); _scenarioChart = null; }
    var canvas = document.getElementById('fin-scenario-canvas');
    if (!canvas || typeof Chart === 'undefined') return;

    var datasets = SCENARIOS.map(function (s, i) {
      var pct = getSliderPct(i);
      var vals = computeScenario(pct);
      return {
        label: s.label + ' (' + (pct >= 0 ? '+' : '') + pct + '%)',
        data: vals,
        borderColor: s.color,
        backgroundColor: s.color + '15',
        borderWidth: 2.5,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.3,
        fill: false,
      };
    });

    // 2025 comparison line (actual Starling closing balances baked in)
    var history2025 = [206194,208888,208316,179609,182603,165817,131559,137965,116541,46208,39470,27450];
    datasets.push({
      label: '2025 actual',
      data: history2025,
      borderColor: '#aaaaaa',
      borderWidth: 1.5,
      borderDash: [6,4],
      pointRadius: 2,
      tension: 0.3,
      fill: false,
    });

    var currentMonthIdx = 4; // May (0-indexed)

    _scenarioChart = new Chart(canvas, {
      type: 'line',
      data: { labels: MONTHS, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 18 } },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return ctx.dataset.label + ': ' + fmtGBP(ctx.parsed.y);
              }
            }
          },
          annotation: {
            annotations: {
              currentMonth: {
                type: 'line', scaleID: 'x', value: currentMonthIdx,
                borderColor: 'rgba(0,68,55,0.4)', borderWidth: 1.5,
                borderDash: [4,3], label: { content: 'Today', display: true, position: 'start', font: { size: 10 } }
              },
              zero: {
                type: 'line', scaleID: 'y', value: 0,
                borderColor: '#E24B4A', borderWidth: 1.5, borderDash: [6,3],
              },
              danger: {
                type: 'line', scaleID: 'y', value: DANGER_THRESHOLD,
                borderColor: '#BA7517', borderWidth: 1, borderDash: [4,3],
              }
            }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(0,68,55,0.07)' }, ticks: { font: { size: 11 } } },
          y: {
            grid: { color: 'rgba(0,68,55,0.07)' },
            ticks: {
              font: { size: 11 },
              callback: function (v) { return '£' + (v/1000).toFixed(0) + 'k'; }
            }
          }
        }
      }
    });
  }

  function buildSliders() {
    return SCENARIOS.map(function (s, i) {
      return [
        '<div class="fin-slider-row">',
          '<div class="fin-slider-dot" style="background:' + s.color + '"></div>',
          '<span class="fin-slider-lbl" id="fin-slider-lbl-' + i + '">' + s.label + ' ' + (s.pct >= 0 ? '+' : '') + s.pct + '%</span>',
          '<input type="range" id="fin-slider-' + i + '" min="-30" max="50" step="1" value="' + s.pct + '"',
          ' oninput="window.EDEN.components.finance._onSlider()">',
        '</div>',
      ].join('');
    }).join('');
  }

  function updateSliderLabels() {
    SCENARIOS.forEach(function (s, i) {
      var lbl = document.getElementById('fin-slider-lbl-' + i);
      var val = getSliderPct(i);
      if (lbl) lbl.textContent = s.label + ' ' + (val >= 0 ? '+' : '') + val + '%';
    });
  }

  // ── Rolling Balance Table ────────────────────────────────────────────────────
  function renderTable() {
    var tbody = document.getElementById('fin-table-body');
    if (!tbody) return;
    var data = ac();
    var currentMonthIdx = 4; // May

    var rows = [
      { key: 'net',     label: 'Net cash movement', src: data.net_movement },
      { key: 'open',    label: 'Opening balance',   src: data.opening_balance },
      { key: 'close',   label: 'Closing balance',   src: data.closing_balance, bold: true },
    ];

    tbody.innerHTML = rows.map(function (row) {
      var cells = MONTHS.map(function (m, idx) {
        var v = row.src && row.src[m];
        var isActual = idx < currentMonthIdx;
        var isCurrent = idx === currentMonthIdx;
        var fmt = v != null ? fmtGBP(v) : '—';

        var style = '';
        if (row.key === 'net' && v != null) style = v < 0 ? 'color:var(--RED)' : 'color:var(--OK)';
        if (row.key === 'close' && v != null && v < DANGER_THRESHOLD) style = 'color:var(--RED);font-weight:700';
        if (!isActual && !isCurrent) style += (style ? ';' : '') + 'opacity:0.6;font-style:italic';
        if (row.bold) style += (style ? ';' : '') + 'font-weight:600';

        var bg = isCurrent ? 'background:rgba(55,138,221,0.08)' : '';

        // Check localStorage override
        var override = localStorage.getItem('ec_balance_' + m);
        var displayVal = override ? fmtGBP(parseFloat(override)) : fmt;
        var editIcon = override ? ' <span style="font-size:9px;color:var(--GOLD)">✏</span>' : '';

        return '<td style="text-align:right;padding:7px 10px;' + style + ';' + bg + '" ' +
          (row.key === 'close' ? 'ondblclick="window.EDEN.components.finance._editCell(\'' + m + '\', this)" title="Double-click to override"' : '') +
          '>' + displayVal + editIcon + '</td>';
      }).join('');

      return '<tr><td style="padding:7px 12px;font-weight:' + (row.bold ? '600' : '400') + ';white-space:nowrap">' + row.label + '</td>' + cells + '</tr>';
    }).join('');
  }

  // ── Key Dates Panel ──────────────────────────────────────────────────────────
  function buildKeyDates() {
    return KEY_DATES.map(function (d) {
      var color = d.sign > 0 ? 'var(--OK)' : d.sign < 0 ? 'var(--RED)' : 'var(--GMD)';
      return [
        '<div class="fin-keydate-row">',
          '<span class="fin-keydate-date">' + d.date + '</span>',
          '<span class="fin-keydate-desc">' + d.desc + '</span>',
          '<span class="fin-keydate-amount" style="color:' + color + '">' + d.amount + '</span>',
        '</div>',
      ].join('');
    }).join('');
  }

  // ── Full render ──────────────────────────────────────────────────────────────
  function render() {
    var root = document.getElementById('finance-root');
    if (!root) return;

    root.innerHTML = [
      // Top row: gauge + key dates
      '<div class="fin-top-row">',
        '<div class="fin-card fin-gauge-card">',
          '<div class="fin-section-label">Runway</div>',
          '<div id="fin-gauge-container">', buildGauge(), '</div>',
        '</div>',
        '<div class="fin-card fin-dates-card">',
          '<div class="fin-section-label">Key dates</div>',
          buildKeyDates(),
        '</div>',
      '</div>',

      // Scenario chart
      '<div class="fin-card" style="margin-bottom:20px">',
        '<div class="fin-section-label">Cash balance — scenario forecast</div>',
        '<div style="height:320px;position:relative"><canvas id="fin-scenario-canvas"></canvas></div>',
        '<div class="fin-sliders">', buildSliders(), '</div>',
      '</div>',

      // Rolling balance table
      '<div class="fin-card" style="margin-bottom:20px">',
        '<div class="fin-section-label">Rolling bank balance',
          ' <span style="font-size:10px;color:var(--GMD);font-weight:400;margin-left:8px">Italic = forecast · Bold = closing · Double-click closing to override</span>',
        '</div>',
        '<div style="overflow-x:auto">',
          '<table style="width:100%;border-collapse:collapse;font-size:12px;font-family:var(--FM)">',
            '<thead><tr>',
              '<th style="text-align:left;padding:7px 12px;border-bottom:2px solid var(--GL);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--GMD)">Label</th>',
              'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ').map(function(m,i){
                var hl = i===4 ? 'background:rgba(55,138,221,0.08)' : '';
                return '<th style="text-align:right;padding:7px 10px;border-bottom:2px solid var(--GL);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--GMD);'+hl+'">'+m+'</th>';
              }).join(''),
            '</tr></thead>',
            '<tbody id="fin-table-body"></tbody>',
          '</table>',
        '</div>',
      '</div>',
    ].join('');

    attachGaugeListener();
    renderTable();
    setTimeout(updateScenarioChart, 50);
  }

  // ── CSS injection ────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('fin-styles')) return;
    var s = document.createElement('style');
    s.id = 'fin-styles';
    s.textContent = [
      '.fin-top-row{display:grid;grid-template-columns:1fr 1.5fr;gap:20px;margin-bottom:20px}',
      '.fin-card{background:var(--W);border:1px solid var(--GL);border-radius:6px;padding:20px 24px}',
      '.fin-section-label{font-family:var(--F);font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--GMD);margin-bottom:16px}',
      '.fin-gauge-wrap{display:flex;flex-direction:column;align-items:center}',
      '.fin-gauge-stats{font-size:12px;color:var(--GMD);text-align:center;line-height:2;margin-top:4px}',
      '.fin-gauge-stats strong{color:var(--G)}',
      '.fin-gauge-input{margin-top:14px;text-align:center}',
      '.fin-gauge-input label{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--GMD)}',
      '.fin-badge{font-size:9px;font-weight:700;letter-spacing:.08em;padding:2px 6px;border-radius:3px}',
      '.fin-badge-live{background:rgba(99,153,34,0.15);color:#639922}',
      '.fin-badge-manual{background:rgba(186,117,23,0.15);color:#BA7517}',
      '.fin-keydate-row{display:grid;grid-template-columns:90px 1fr auto;gap:8px;padding:8px 0;border-bottom:1px solid var(--GL);align-items:center;font-size:12px}',
      '.fin-keydate-date{font-family:var(--FM);font-size:11px;color:var(--GMD)}',
      '.fin-keydate-desc{color:var(--G)}',
      '.fin-keydate-amount{font-family:var(--FM);font-size:12px;font-weight:600;text-align:right;white-space:nowrap}',
      '.fin-sliders{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:16px;margin-top:16px;padding-top:16px;border-top:1px solid var(--GL)}',
      '.fin-slider-row{display:flex;flex-direction:column;gap:4px}',
      '.fin-slider-dot{width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:6px;vertical-align:middle}',
      '.fin-slider-lbl{font-family:var(--F);font-size:11px;font-weight:600;color:var(--G)}',
      'input[type=range]{width:100%;accent-color:var(--G)}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  var component = {
    render: render,

    init: function () {
      injectStyles();
      var root = document.getElementById('finance-root');
      if (!root) return;
      var needsRender = !document.getElementById('fin-gauge-container');
      if (needsRender) render();
      else {
        updateGauge();
        updateScenarioChart();
        renderTable();
      }
    },

    _onSlider: function () {
      updateSliderLabels();
      if (this._t) clearTimeout(this._t);
      this._t = setTimeout(function () {
        updateScenarioChart();
      }, 120);
    },

    _editCell: function (month, td) {
      var current = (ac().closing_balance && ac().closing_balance[month]) || '';
      var stored = localStorage.getItem('ec_balance_' + month);
      var val = prompt('Override closing balance for ' + month + ':', stored || Math.round(current));
      if (val === null) return;
      if (val === '') {
        localStorage.removeItem('ec_balance_' + month);
      } else {
        localStorage.setItem('ec_balance_' + month, val);
      }
      renderTable();
    },
  };

  window.EDEN.components.finance = component;

})();
