/**
 * EDEN & CO. CEO Flight Deck — Finance Tab
 * Fuel Gauge · Scenario Bar Chart · Rolling Balance Table · Key Dates
 */
window.EDEN = window.EDEN || {};
window.EDEN.components = window.EDEN.components || {};

(function () {
  'use strict';

  // ── Constants ────────────────────────────────────────────────────────────────
  var FIXED_MONTHLY_BURN = 11665;
  var DAILY_BURN         = FIXED_MONTHLY_BURN / 30;
  var DANGER_THRESHOLD   = 40000;
  var HIGH_THRESHOLD     = 100000;
  var DEFAULT_BALANCE    = 173849.20;
  var EXCEPTIONAL = { May:-41754, Jun:-7560, Sep:30000, Dec:-132101 };
  var REV_2025 = {
    Jan:16783, Feb:22089, Mar:21376, Apr:25058, May:19666, Jun:19726,
    Jul:22647, Aug:16930, Sep:18114, Oct:32914, Nov:75962, Dec:390941
  };
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var ACTUALS_MONTHS = ['Jan','Feb','Mar','Apr'];

  // Three scenarios only — no Blue
  var SCENARIOS = [
    { key:'red',    label:'Red',    pct:-10, color:'#E24B4A', bgAlpha:'33' },
    { key:'orange', label:'Orange', pct:0,   color:'#BA7517', bgAlpha:'33' },
    { key:'green',  label:'Green',  pct:25,  color:'#639922', bgAlpha:'44' },
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

  var _chart = null;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function fmtGBP(n) {
    if (n == null || isNaN(n)) return '—';
    var abs = Math.abs(Math.round(n));
    return (n < 0 ? '-' : '') + '£' + abs.toLocaleString('en-GB');
  }

  function ac() { return (window.EDEN && window.EDEN._accounting) || {}; }

  // Fix: validate stored balance — reject anything implausible (< 1000 or > 10M)
  function getStarlingBalance() {
    var stored = localStorage.getItem('ec_starling_balance');
    if (stored !== null) {
      var v = parseFloat(stored);
      if (!isNaN(v) && v >= 1000 && v <= 10000000) return v;
      // Bad value in storage — clear it
      localStorage.removeItem('ec_starling_balance');
    }
    return ac().starling_balance || DEFAULT_BALANCE;
  }

  function getSliderPct(i) {
    var el = document.getElementById('fin-slider-' + i);
    return el ? parseFloat(el.value) : SCENARIOS[i].pct;
  }

  // ── Scenario engine ──────────────────────────────────────────────────────────
  function computeScenario(growthPct) {
    var data = ac();
    var balance = getStarlingBalance();
    var results = [];
    MONTHS.forEach(function (m) {
      var isActual = ACTUALS_MONTHS.indexOf(m) !== -1;
      var net;
      if (isActual) {
        var pl = data.pl_actual && data.pl_actual[m];
        var mv = data.net_movement && data.net_movement[m];
        net = pl != null ? pl : (mv != null ? mv : 0);
      } else {
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
    var days = Math.round(balance / DAILY_BURN);
    var color = days >= 90 ? '#639922' : days >= 60 ? '#BA7517' : '#E24B4A';
    var label = days >= 90 ? 'Safe — race hard' : days >= 60 ? 'Watch spend' : 'Act now';

    var pct = Math.min(1, days / 180);
    var sweepDeg = pct * 270 - 135;
    var sweepRad = sweepDeg * Math.PI / 180;
    var cx = 100, cy = 110, r = 76;

    function pt(deg) {
      var a = deg * Math.PI / 180;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    }

    var s = pt(-135), e = pt(sweepDeg);
    var large = pct > 0.5 ? 1 : 0;
    var track = 'M '+pt(-135).join(' ')+' A '+r+' '+r+' 0 1 1 '+pt(135).join(' ');
    var fill  = 'M '+s.join(' ')+' A '+r+' '+r+' 0 '+large+' 1 '+e.join(' ');

    var exhaustDate = new Date();
    exhaustDate.setDate(exhaustDate.getDate() + days);
    var exhaustStr = exhaustDate.toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'});

    var starlingDate = ac().starling_date || '';

    return [
      '<div class="fin-gauge-wrap">',
        '<svg width="200" height="175" viewBox="0 0 200 175">',
          '<path d="'+track+'" fill="none" stroke="rgba(0,68,55,0.1)" stroke-width="14" stroke-linecap="round"/>',
          '<path d="'+fill+'" fill="none" stroke="'+color+'" stroke-width="14" stroke-linecap="round"/>',
          '<text x="100" y="108" text-anchor="middle" font-size="42" font-weight="700" font-family="var(--FM)" fill="'+color+'">'+days+'</text>',
          '<text x="100" y="132" text-anchor="middle" font-size="12" font-family="var(--F)" fill="var(--GMD)" letter-spacing="0.08em">of runway</text>',
          '<text x="100" y="153" text-anchor="middle" font-size="11" font-family="var(--F)" fill="'+color+'">'+label+'</text>',
        '</svg>',
        '<div class="fin-gauge-stats">',
          '<div>Cash today: <strong>'+fmtGBP(balance)+'</strong> <span class="fin-badge fin-badge-live">LIVE</span></div>',
          '<div>Fuel runs out: <strong>'+exhaustStr+'</strong></div>',
          '<div>Q4 revenue lands: <strong>Dec 2026</strong></div>',
        '</div>',
        '<div class="fin-gauge-input">',
          '<label>Update Starling balance</label>',
          '<div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap">',
            '<input type="number" id="fin-starling-input" value="'+Math.round(balance)+'" step="100"',
            ' style="width:140px;padding:7px 10px;font-size:14px;border:1px solid var(--GL);border-radius:3px;font-family:var(--FM)">',
            starlingDate ? '<span style="font-size:11px;color:var(--GMD)">as of '+starlingDate+'</span>' : '',
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
    if (!inp || inp._wired) return;
    inp._wired = true;
    inp.addEventListener('input', function () {
      var v = parseFloat(this.value);
      if (!isNaN(v) && v >= 1000) {
        localStorage.setItem('ec_starling_balance', String(v));
        updateGauge();
        updateChart();
        renderTable();
      }
    });
  }

  // ── Scenario Chart (grouped bars + 2025 line) ────────────────────────────────
  function updateChart() {
    if (_chart) { _chart.destroy(); _chart = null; }
    var canvas = document.getElementById('fin-scenario-canvas');
    if (!canvas || typeof Chart === 'undefined') return;

    var barDatasets = SCENARIOS.map(function (s, i) {
      var pct = getSliderPct(i);
      return {
        type: 'bar',
        label: s.label + ' (' + (pct >= 0 ? '+' : '') + pct + '%)',
        data: computeScenario(pct),
        backgroundColor: s.color + s.bgAlpha,
        borderColor: s.color,
        borderWidth: 1.5,
        borderRadius: 2,
        order: 2,
      };
    });

    // 2025 actual closing balances as overlay line
    var history2025 = [206194,208888,208316,179609,182603,165817,131559,137965,116541,46208,39470,27450];
    var lineDataset = {
      type: 'line',
      label: '2025 actual',
      data: history2025,
      borderColor: '#999999',
      borderWidth: 2,
      borderDash: [6,4],
      pointRadius: 3,
      pointBackgroundColor: '#999',
      tension: 0.3,
      fill: false,
      order: 1,
    };

    _chart = new Chart(canvas, {
      type: 'bar',
      data: { labels: MONTHS, datasets: barDatasets.concat([lineDataset]) },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { font: { size: 12 }, boxWidth: 14, padding: 16 } },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return ' ' + ctx.dataset.label + ': ' + fmtGBP(ctx.parsed.y);
              }
            }
          },
          annotation: {
            annotations: {
              currentMonth: {
                type: 'line', scaleID: 'x', value: 4,
                borderColor: 'rgba(0,68,55,0.5)', borderWidth: 2,
                borderDash: [5,4],
                label: { content: 'Today', display: true, position: 'start', font: { size: 10 }, color: '#004437' }
              },
              zero: {
                type: 'line', scaleID: 'y', value: 0,
                borderColor: '#E24B4A', borderWidth: 1.5, borderDash: [6,3],
              },
              danger: {
                type: 'line', scaleID: 'y', value: DANGER_THRESHOLD,
                borderColor: '#BA7517', borderWidth: 1, borderDash: [4,3],
                label: { content: '£40k', display: true, position: 'end', font: { size: 10 }, color: '#BA7517' }
              }
            }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(0,68,55,0.06)' }, ticks: { font: { size: 12 } } },
          y: {
            grid: { color: 'rgba(0,68,55,0.06)' },
            ticks: { font: { size: 12 }, callback: function (v) { return '£' + (v/1000).toFixed(0) + 'k'; } }
          }
        }
      }
    });
  }

  function buildSliders() {
    return [
      '<div class="fin-sliders">',
      SCENARIOS.map(function (s, i) {
        return [
          '<div class="fin-slider-row">',
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">',
              '<div class="fin-slider-dot" style="background:'+s.color+'"></div>',
              '<span class="fin-slider-lbl" id="fin-slider-lbl-'+i+'">'+s.label+' '+(s.pct>=0?'+':'')+s.pct+'%</span>',
            '</div>',
            '<input type="range" id="fin-slider-'+i+'" min="-30" max="50" step="1" value="'+s.pct+'"',
            ' oninput="window.EDEN.components.finance._onSlider()">',
          '</div>',
        ].join('');
      }).join(''),
      '</div>',
    ].join('');
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
    var currentIdx = 4; // May

    var rowDefs = [
      { key:'net',   label:'Net cash movement',  src:data.net_movement,    size:'normal' },
      { key:'open',  label:'Opening balance',     src:data.opening_balance, size:'normal' },
      { key:'close', label:'Closing balance',     src:data.closing_balance, size:'large'  },
    ];

    // Separator row between actuals and forecast
    var separatorHtml = '<tr><td colspan="13" style="padding:0;height:2px;background:linear-gradient(90deg,var(--G) 33%,var(--GL) 100%)"></td></tr>';

    var rowsHtml = rowDefs.map(function (row) {
      var isLarge = row.size === 'large';
      var cells = MONTHS.map(function (m, idx) {
        var v = row.src && row.src[m];
        var isActual = idx < currentIdx;
        var isCurrent = idx === currentIdx;
        var fmt = v != null ? fmtGBP(v) : '—';

        // Colour logic
        var color = '';
        if (row.key === 'net') {
          color = v != null ? (v < 0 ? '#c0392b' : '#2e7d32') : '';
        }
        if (row.key === 'close') {
          if (v != null) color = v >= HIGH_THRESHOLD ? '#2e7d32' : v >= DANGER_THRESHOLD ? '#BA7517' : '#c0392b';
        }

        var opacity = (!isActual && !isCurrent) ? '0.62' : '1';
        var fontStyle = (!isActual && !isCurrent) ? 'italic' : 'normal';
        var bg = isCurrent ? 'background:rgba(55,138,221,0.1)' : '';

        // Override check
        var override = localStorage.getItem('ec_balance_' + m);
        var displayVal = (override && row.key === 'close') ? fmtGBP(parseFloat(override)) : fmt;
        var editMark = (override && row.key === 'close') ? '<span style="font-size:9px;color:var(--GOLD);margin-left:3px">✏</span>' : '';

        var tdStyle = [
          'text-align:right',
          'padding:' + (isLarge ? '16px 16px' : '12px 16px'),
          'font-size:' + (isLarge ? '20px' : '15px'),
          'font-weight:' + (isLarge ? '700' : '400'),
          'font-family:var(--FM)',
          'font-style:' + fontStyle,
          'opacity:' + opacity,
          color ? 'color:' + color : '',
          bg,
          'border-bottom:1px solid var(--GL)',
          isLarge ? 'letter-spacing:-0.01em' : '',
        ].filter(Boolean).join(';');

        return '<td style="'+tdStyle+'"' +
          (row.key==='close' ? ' ondblclick="window.EDEN.components.finance._editCell(\''+m+'\',this)" title="Double-click to override"' : '') +
          '>'+displayVal+editMark+'</td>';
      }).join('');

      var thStyle = 'padding:'+(isLarge?'16px 16px':'12px 16px')+';font-size:'+(isLarge?'18px':'15px')+';font-weight:'+(isLarge?'700':'400')+';white-space:nowrap;border-bottom:1px solid var(--GL);color:var(--G)';
      return '<tr><td style="'+thStyle+'">'+row.label+'</td>'+cells+'</tr>';
    });

    // Insert separator after row index 1 (between opening and closing)
    rowsHtml.splice(2, 0, '');
    tbody.innerHTML = rowsHtml.join(separatorHtml);
  }

  // ── Key Dates ────────────────────────────────────────────────────────────────
  function buildKeyDates() {
    return KEY_DATES.map(function (d) {
      var color = d.sign > 0 ? '#2e7d32' : d.sign < 0 ? '#c0392b' : 'var(--GMD)';
      return [
        '<div class="fin-keydate-row">',
          '<span class="fin-keydate-date">'+d.date+'</span>',
          '<span class="fin-keydate-desc">'+d.desc+'</span>',
          '<span class="fin-keydate-amount" style="color:'+color+'">'+d.amount+'</span>',
        '</div>',
      ].join('');
    }).join('');
  }

  // ── Full render ──────────────────────────────────────────────────────────────
  function render() {
    var root = document.getElementById('finance-root');
    if (!root) return;

    root.innerHTML = [
      // Top row
      '<div class="fin-top-row">',
        '<div class="fin-card fin-gauge-card">',
          '<div class="fin-section-label">Runway</div>',
          '<div id="fin-gauge-container">'+buildGauge()+'</div>',
        '</div>',
        '<div class="fin-card">',
          '<div class="fin-section-label">Key dates</div>',
          buildKeyDates(),
        '</div>',
      '</div>',

      // Scenario chart
      '<div class="fin-card">',
        '<div class="fin-section-label">Cash balance forecast</div>',
        '<div style="height:340px;position:relative"><canvas id="fin-scenario-canvas"></canvas></div>',
        buildSliders(),
      '</div>',

      // Rolling table
      '<div class="fin-card">',
        '<div class="fin-section-label">',
          'Rolling bank balance',
          '<span style="font-size:10px;font-weight:400;color:var(--GMD);margin-left:10px;letter-spacing:0">',
            'Solid = actual · Italic = forecast · Double-click closing to override',
          '</span>',
        '</div>',
        '<div style="overflow-x:auto">',
          '<table style="width:100%;border-collapse:collapse">',
            '<thead><tr>',
              '<th style="text-align:left;padding:12px 16px;border-bottom:2px solid var(--G);font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--GMD);white-space:nowrap">Label</th>',
              MONTHS.map(function(m,i){
                var hl = i===4?'background:rgba(55,138,221,0.1)':'';
                return '<th style="text-align:right;padding:12px 16px;border-bottom:2px solid var(--G);font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--GMD);'+hl+'">'+m+'</th>';
              }).join(''),
            '</tr></thead>',
            '<tbody id="fin-table-body"></tbody>',
          '</table>',
        '</div>',
      '</div>',
    ].join('');

    attachGaugeListener();
    renderTable();
    setTimeout(updateChart, 50);
  }

  // ── Styles ───────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('fin-styles')) return;
    var s = document.createElement('style');
    s.id = 'fin-styles';
    s.textContent = [
      '#finance-root{display:flex;flex-direction:column;gap:28px;padding:8px 0 40px}',
      '.fin-top-row{display:grid;grid-template-columns:260px 1fr;gap:28px}',
      '.fin-card{background:var(--W);border:1px solid var(--GL);border-radius:6px;padding:24px 28px}',
      '.fin-section-label{font-family:var(--F);font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--GMD);margin-bottom:20px}',
      '.fin-gauge-wrap{display:flex;flex-direction:column;align-items:center}',
      '.fin-gauge-stats{font-size:13px;color:var(--GMD);text-align:center;line-height:2.2;margin-top:6px}',
      '.fin-gauge-stats strong{color:var(--G);font-family:var(--FM)}',
      '.fin-gauge-input{margin-top:18px;text-align:center;width:100%}',
      '.fin-gauge-input label{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--GMD)}',
      '.fin-badge{font-size:9px;font-weight:700;letter-spacing:.06em;padding:2px 7px;border-radius:3px;vertical-align:middle}',
      '.fin-badge-live{background:rgba(99,153,34,0.15);color:#639922}',
      '.fin-badge-manual{background:rgba(186,117,23,0.15);color:#BA7517}',
      '.fin-keydate-row{display:grid;grid-template-columns:90px 1fr auto;gap:10px;padding:11px 0;border-bottom:1px solid var(--GL);align-items:center;font-size:13px}',
      '.fin-keydate-date{font-family:var(--FM);font-size:11px;color:var(--GMD);white-space:nowrap}',
      '.fin-keydate-desc{color:var(--G)}',
      '.fin-keydate-amount{font-family:var(--FM);font-size:13px;font-weight:600;text-align:right;white-space:nowrap}',
      '.fin-sliders{display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:20px;padding-top:20px;border-top:1px solid var(--GL)}',
      '.fin-slider-row{display:flex;flex-direction:column}',
      '.fin-slider-dot{width:11px;height:11px;border-radius:50%;flex-shrink:0}',
      '.fin-slider-lbl{font-family:var(--F);font-size:12px;font-weight:600;color:var(--G)}',
      'input[type=range]{width:100%;accent-color:var(--G);margin-top:4px}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── Public ───────────────────────────────────────────────────────────────────
  var component = {
    render: render,

    init: function () {
      injectStyles();
      var root = document.getElementById('finance-root');
      if (!root) return;
      if (!document.getElementById('fin-gauge-container')) {
        render();
      } else {
        updateGauge();
        updateChart();
        renderTable();
      }
    },

    _onSlider: function () {
      updateSliderLabels();
      if (this._t) clearTimeout(this._t);
      this._t = setTimeout(function () { updateChart(); }, 100);
    },

    _editCell: function (month) {
      var current = ac().closing_balance && ac().closing_balance[month];
      var stored = localStorage.getItem('ec_balance_' + month);
      var val = prompt('Override closing balance for ' + month + ':', stored || Math.round(current || 0));
      if (val === null) return;
      if (val === '') localStorage.removeItem('ec_balance_' + month);
      else localStorage.setItem('ec_balance_' + month, val);
      renderTable();
    },
  };

  window.EDEN.components.finance = component;

})();
