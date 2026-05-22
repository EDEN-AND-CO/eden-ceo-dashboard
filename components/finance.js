/**
 * EDEN & CO. Finance Tab
 * Chart 1: Cash balance month by month — where does it dip below safety?
 * Chart 2: Revenue vs costs (operating + stock split) — is growth profitable?
 */
window.EDEN = window.EDEN || {};
window.EDEN.components = window.EDEN.components || {};

(function () {
  'use strict';

  var SAFETY_LOW    = 40000;   // danger — act now
  var SAFETY_AMBER  = 100000;  // watch
  var MONTHS        = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var ACTUAL_MONTHS = ['Jan','Feb','Mar','Apr'];
  var CURRENT_IDX   = 4; // May = index 4

  // 2025 full-year actuals (baked in from Xero P&L)
  var REV_2025 = {
    Jan:16783, Feb:22089, Mar:21376, Apr:25058, May:19666, Jun:19726,
    Jul:22647, Aug:16930, Sep:18114, Oct:32914, Nov:75962, Dec:390941
  };
  // 2025 total costs (CoS + Admin) for ratio line
  var COSTS_2025 = {
    Jan:40797, Feb:14363, Mar:37803, Apr:45550, May:23895, Jun:35675,
    Jul:23337, Aug:22888, Sep:98521, Oct:33092, Nov:107915, Dec:214454
  };

  var _charts = {};

  function ac() { return (window.EDEN && window.EDEN._accounting) || {}; }

  function fmtGBP(n) {
    if (n == null || isNaN(n)) return '—';
    var abs = Math.abs(Math.round(n));
    return (n < 0 ? '-' : '') + '£' + abs.toLocaleString('en-GB');
  }

  function destroyChart(key) {
    if (_charts[key]) { _charts[key].destroy(); delete _charts[key]; }
  }

  // ── Chart 1: Cash Balance ─────────────────────────────────────────────────────
  function buildCashChart() {
    destroyChart('cash');
    var canvas = document.getElementById('fin-cash-canvas');
    if (!canvas || typeof Chart === 'undefined') return;

    var data = ac();
    var balances = MONTHS.map(function (m) {
      var v = data.closing_balance && data.closing_balance[m];
      return v != null ? Math.round(v) : null;
    });

    // Bar colours: red below safety, amber below 100k, green above
    var bgColors = balances.map(function (v, i) {
      if (v === null) return 'rgba(0,0,0,0)';
      var isActual = i < CURRENT_IDX;
      var alpha = isActual ? 'cc' : '66';
      if (v < SAFETY_LOW)   return '#E24B4A' + alpha;
      if (v < SAFETY_AMBER) return '#BA7517' + alpha;
      return '#639922' + alpha;
    });

    var borderColors = bgColors.map(function (c) {
      return c.substring(0, 7);
    });

    _charts['cash'] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: MONTHS,
        datasets: [{
          label: 'Closing balance',
          data: balances,
          backgroundColor: bgColors,
          borderColor: borderColors,
          borderWidth: 1.5,
          borderRadius: 3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                var v = ctx.parsed.y;
                var status = v < SAFETY_LOW ? ' ⚠ BELOW SAFETY' : v < SAFETY_AMBER ? ' · watch' : ' · safe';
                return fmtGBP(v) + status;
              },
              title: function (ctx) {
                return ctx[0].label + (MONTHS.indexOf(ctx[0].label) >= CURRENT_IDX ? ' (forecast)' : ' (actual)');
              }
            }
          },
          annotation: {
            annotations: {
              safetyLow: {
                type: 'line', scaleID: 'y', value: SAFETY_LOW,
                borderColor: '#E24B4A', borderWidth: 2, borderDash: [6,3],
                label: { content: '£40k danger', display: true, position: 'start', font: { size: 11, weight: '600' }, color: '#E24B4A', backgroundColor: 'rgba(255,255,255,0.85)', padding: 4 }
              },
              safetyAmber: {
                type: 'line', scaleID: 'y', value: SAFETY_AMBER,
                borderColor: '#BA7517', borderWidth: 1.5, borderDash: [4,3],
                label: { content: '£100k watch', display: true, position: 'start', font: { size: 11 }, color: '#BA7517', backgroundColor: 'rgba(255,255,255,0.85)', padding: 4 }
              },
              today: {
                type: 'line', scaleID: 'x', value: CURRENT_IDX,
                borderColor: 'rgba(0,68,55,0.35)', borderWidth: 2, borderDash: [4,3],
                label: { content: 'Today', display: true, position: 'start', font: { size: 10 }, color: '#004437', backgroundColor: 'rgba(255,255,255,0.85)', padding: 3 }
              },
              zero: {
                type: 'line', scaleID: 'y', value: 0,
                borderColor: '#E24B4A', borderWidth: 1, borderDash: [2,2],
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(0,68,55,0.06)' },
            ticks: { font: { size: 13 } }
          },
          y: {
            grid: { color: 'rgba(0,68,55,0.06)' },
            ticks: {
              font: { size: 13 },
              callback: function (v) { return '£' + (v / 1000).toFixed(0) + 'k'; }
            }
          }
        }
      }
    });
  }

  // ── Chart 2: One bar per year per month ──────────────────────────────────────
  function buildCostChart() {
    destroyChart('cost');
    var canvas = document.getElementById('fin-cost-canvas');
    if (!canvas || typeof Chart === 'undefined') return;

    var data = ac();

    var inc2025 = MONTHS.map(function (m) { return REV_2025[m] || 0; });
    var inc2026 = MONTHS.map(function (m, i) {
      if (i >= CURRENT_IDX) return null;
      var v = data.income_actual && data.income_actual[m];
      return v != null ? Math.round(v) : null;
    });

    var costs2026 = MONTHS.map(function (m, i) {
      if (i >= CURRENT_IDX) return null;
      var v = data.total_expenses && data.total_expenses[m];
      return v != null ? Math.round(v) : null;
    });

    // Bar colour: green = income > costs (profitable), red = loss
    var bar2026Colors = MONTHS.map(function (m, i) {
      var r = inc2026[i], c = costs2026[i];
      if (r == null) return 'rgba(0,0,0,0)';
      return (c == null || r >= c) ? 'rgba(99,153,34,0.8)' : 'rgba(192,57,43,0.75)';
    });

    var pctChange = MONTHS.map(function (m, i) {
      var r25 = REV_2025[m], r26 = inc2026[i];
      if (!r25 || r26 == null) return null;
      return Math.round(((r26 - r25) / r25) * 100);
    });

    _charts['cost'] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: MONTHS,
        datasets: [
          {
            label: '2025',
            data: inc2025,
            backgroundColor: 'rgba(180,180,180,0.5)',
            borderColor: 'rgba(130,130,130,0.6)',
            borderWidth: 1,
            borderRadius: 2,
          },
          {
            label: '2026',
            data: inc2026,
            backgroundColor: bar2026Colors,
            borderColor: bar2026Colors.map(function(c){ return c.replace('0.8','1').replace('0.75','1'); }),
            borderWidth: 1.5,
            borderRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { font: { size: 13 }, boxWidth: 14, padding: 16 } },
          tooltip: {
            callbacks: {
              title: function (ctx) {
                var idx = ctx[0].dataIndex;
                var pct = pctChange[idx];
                var m   = MONTHS[idx];
                if (idx >= CURRENT_IDX) return m + ' — 2025 benchmark only';
                var r26 = inc2026[idx], c26 = costs2026[idx];
                var ret = (r26 && c26) ? '£' + (r26 / c26).toFixed(2) + ' back per £1 spent' : '';
                var growth = pct != null ? '  ·  income ' + (pct >= 0 ? '+' : '') + pct + '% vs 2025' : '';
                return m + '  ' + ret + growth;
              },
              label: function () { return null; },
              afterBody: function (ctx) {
                var idx = ctx[0].dataIndex;
                var m   = MONTHS[idx];

                function ret(inc, cost) {
                  if (!inc || !cost) return '—';
                  return '£' + (inc / cost).toFixed(2) + ' per £1 spent';
                }

                var r25 = inc2025[idx];
                var c25 = COSTS_2025[m];

                var lines = [
                  '── 2025 ──────────────',
                  '  Income:  ' + fmtGBP(r25),
                  '  Costs:   ' + fmtGBP(c25),
                  '  Return:  ' + ret(r25, c25),
                ];

                if (idx < CURRENT_IDX) {
                  var r26 = inc2026[idx];
                  var c26 = costs2026[idx];
                  lines.push('── 2026 ──────────────');
                  lines.push('  Income:  ' + fmtGBP(r26));
                  lines.push('  Costs:   ' + fmtGBP(c26));
                  lines.push('  Return:  ' + ret(r26, c26));
                  lines.push((c26 == null || r26 >= c26) ? '  ✓ Profitable' : '  ✗ Loss');
                }

                return lines;
              }
            }
          },
          annotation: {
            annotations: {
              divider: {
                type: 'line', scaleID: 'x', value: CURRENT_IDX - 0.5,
                borderColor: 'rgba(0,68,55,0.2)', borderWidth: 1.5, borderDash: [3,3],
                label: { content: '← Actual · Benchmark →', display: true, position: 'center', font: { size: 10 }, color: '#004437', backgroundColor: 'rgba(255,255,255,0.9)', padding: 4 }
              }
            }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(0,68,55,0.06)' }, ticks: { font: { size: 13 } } },
          y: {
            grid: { color: 'rgba(0,68,55,0.06)' },
            ticks: { font: { size: 13 }, callback: function (v) { return '£' + (v/1000).toFixed(0) + 'k'; } }
          }
        }
      }
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  function render() {
    var root = document.getElementById('finance-root');
    if (!root) return;

    var data = ac();
    var starlingBalance = data.starling_balance || 173849;
    var starlingDate    = data.starling_date    || '—';
    var lowestMonth     = data.lowest_month     || '—';
    var lowestAmt       = data.lowest_amount;

    // Summary strip
    var lowestColor = lowestAmt != null && lowestAmt < SAFETY_LOW ? '#E24B4A' : lowestAmt < SAFETY_AMBER ? '#BA7517' : '#639922';

    root.innerHTML = [

      // Summary strip
      '<div class="fin-summary-strip">',
        '<div class="fin-summary-item">',
          '<div class="fin-summary-label">Starling balance</div>',
          '<div class="fin-summary-val">'+fmtGBP(starlingBalance)+'</div>',
          '<div class="fin-summary-sub">as of '+starlingDate+'</div>',
        '</div>',
        '<div class="fin-summary-sep"></div>',
        '<div class="fin-summary-item">',
          '<div class="fin-summary-label">Lowest projected</div>',
          '<div class="fin-summary-val" style="color:'+lowestColor+'">'+fmtGBP(lowestAmt)+'</div>',
          '<div class="fin-summary-sub">'+lowestMonth+'</div>',
        '</div>',
        '<div class="fin-summary-sep"></div>',
        '<div class="fin-summary-item">',
          '<div class="fin-summary-label">Safety threshold</div>',
          '<div class="fin-summary-val">£40k</div>',
          '<div class="fin-summary-sub">danger line</div>',
        '</div>',
        '<div class="fin-summary-sep"></div>',
        '<div class="fin-summary-item">',
          '<div class="fin-summary-label">Q4 revenue lands</div>',
          '<div class="fin-summary-val">Dec 2026</div>',
          '<div class="fin-summary-sub">plan for Sep stock buy</div>',
        '</div>',
      '</div>',

      // Chart 1
      '<div class="fin-card">',
        '<div class="fin-chart-title">Cash balance — month by month',
          '<span class="fin-chart-legend"><span class="fin-dot" style="background:#639922"></span>Safe',
          ' <span class="fin-dot" style="background:#BA7517"></span>Watch',
          ' <span class="fin-dot" style="background:#E24B4A"></span>Danger',
          ' <span style="opacity:0.5;font-size:11px;margin-left:8px">Solid = actual · Faded = forecast</span></span>',
        '</div>',
        '<div style="height:360px;position:relative"><canvas id="fin-cash-canvas"></canvas></div>',
      '</div>',

      // Chart 2
      '<div class="fin-card">',
        '<div class="fin-chart-title">Income 2026 vs 2025',
          '<span class="fin-chart-legend">',
            '<span class="fin-swatch" style="background:rgba(180,180,180,0.5)"></span>2025',
            ' <span class="fin-swatch" style="background:rgba(99,153,34,0.8)"></span>2026 profitable',
            ' <span class="fin-swatch" style="background:rgba(192,57,43,0.75)"></span>2026 loss',
            ' <span style="opacity:0.55;font-size:11px;margin-left:8px">Hover any month for % change vs 2025, costs and net</span>',
          '</span>',
        '</div>',
        '<div style="height:360px;position:relative"><canvas id="fin-cost-canvas"></canvas></div>',
      '</div>',

    ].join('');

    setTimeout(function () {
      buildCashChart();
      buildCostChart();
    }, 50);
  }

  // ── Styles ────────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('fin-styles')) return;
    var s = document.createElement('style');
    s.id = 'fin-styles';
    s.textContent = [
      '#finance-root{display:flex;flex-direction:column;gap:28px;padding:8px 0 48px}',
      '.fin-summary-strip{display:flex;align-items:center;background:var(--W);border:1px solid var(--GL);border-radius:6px;padding:20px 28px;gap:0}',
      '.fin-summary-item{flex:1;text-align:center}',
      '.fin-summary-sep{width:1px;height:48px;background:var(--GL);flex-shrink:0;margin:0 4px}',
      '.fin-summary-label{font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--GMD);margin-bottom:6px;font-family:var(--F)}',
      '.fin-summary-val{font-size:22px;font-weight:700;font-family:var(--FM);color:var(--G);line-height:1}',
      '.fin-summary-sub{font-size:11px;color:var(--GMD);margin-top:5px}',
      '.fin-card{background:var(--W);border:1px solid var(--GL);border-radius:6px;padding:24px 28px}',
      '.fin-chart-title{font-size:14px;font-weight:600;color:var(--G);margin-bottom:20px;display:flex;align-items:center;flex-wrap:wrap;gap:10px;font-family:var(--F)}',
      '.fin-chart-legend{font-size:12px;color:var(--GMD);font-weight:400;display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.fin-dot{display:inline-block;width:10px;height:10px;border-radius:50%;vertical-align:middle;margin-right:3px}',
      '.fin-swatch{display:inline-block;width:12px;height:12px;border-radius:2px;vertical-align:middle;margin-right:3px}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── Public ────────────────────────────────────────────────────────────────────
  window.EDEN.components.finance = {
    render: render,
    init: function () {
      injectStyles();
      if (!document.getElementById('fin-cash-canvas')) render();
      else { buildCashChart(); buildCostChart(); }
    },
  };

})();
