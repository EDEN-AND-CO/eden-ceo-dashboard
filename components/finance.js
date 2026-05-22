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

  // 2025 full-year revenue for comparison line
  var REV_2025 = {
    Jan:16783, Feb:22089, Mar:21376, Apr:25058, May:19666, Jun:19726,
    Jul:22647, Aug:16930, Sep:18114, Oct:32914, Nov:75962, Dec:390941
  };

  // 2025 stock purchases for comparison
  var STOCK_2025 = {
    Jan:23620, Feb:542,   Mar:21338, Apr:6688,  May:7080,  Jun:7375,
    Jul:2149,  Aug:2157,  Sep:65087, Oct:13352, Nov:71331, Dec:22688
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

  // ── Chart 2: Revenue vs Costs (stacked: opex + stock) ────────────────────────
  function buildCostChart() {
    destroyChart('cost');
    var canvas = document.getElementById('fin-cost-canvas');
    if (!canvas || typeof Chart === 'undefined') return;

    var data = ac();

    var revenue  = MONTHS.map(function (m) { return Math.round(data.income_actual && data.income_actual[m] || REV_2025[m] || 0); });
    var opex     = MONTHS.map(function (m) { return Math.round(Math.max(0, data.opex_only && data.opex_only[m] != null ? data.opex_only[m] : 0)); });
    var stock    = MONTHS.map(function (m) { return Math.round(Math.max(0, (data.stock_purchases_2026 && data.stock_purchases_2026[m]) || 0)); });
    var rev2025  = MONTHS.map(function (m) { return REV_2025[m] || 0; });

    // Actual months solid, forecast lighter
    var revColors = MONTHS.map(function (m, i) {
      return i < CURRENT_IDX ? 'rgba(99,153,34,0.85)' : 'rgba(99,153,34,0.4)';
    });
    var opexColors = MONTHS.map(function (m, i) {
      return i < CURRENT_IDX ? 'rgba(0,68,55,0.7)' : 'rgba(0,68,55,0.35)';
    });
    var stockColors = MONTHS.map(function (m, i) {
      return i < CURRENT_IDX ? 'rgba(186,117,23,0.85)' : 'rgba(186,117,23,0.4)';
    });

    _charts['cost'] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: MONTHS,
        datasets: [
          {
            type: 'bar',
            label: 'Revenue',
            data: revenue,
            backgroundColor: revColors,
            borderColor: revColors.map(function(c){return c.replace(/0\.\d+\)/, '1)');}),
            borderWidth: 1,
            borderRadius: 3,
            order: 2,
          },
          {
            type: 'bar',
            label: 'Operating costs',
            data: opex,
            backgroundColor: opexColors,
            borderWidth: 0,
            stack: 'costs',
            order: 3,
          },
          {
            type: 'bar',
            label: 'Stock purchases',
            data: stock,
            backgroundColor: stockColors,
            borderWidth: 0,
            stack: 'costs',
            order: 3,
          },
          {
            type: 'line',
            label: '2025 revenue',
            data: rev2025,
            borderColor: 'rgba(150,150,150,0.7)',
            borderWidth: 2,
            borderDash: [5,4],
            pointRadius: 3,
            pointBackgroundColor: '#aaa',
            tension: 0.3,
            fill: false,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { size: 12 }, boxWidth: 14, padding: 16 }
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return ' ' + ctx.dataset.label + ': ' + fmtGBP(ctx.parsed.y);
              },
              afterBody: function (ctx) {
                var idx = ctx[0] && ctx[0].dataIndex;
                if (idx == null) return;
                var rev  = revenue[idx]  || 0;
                var cost = (opex[idx] || 0) + (stock[idx] || 0);
                if (rev <= 0) return;
                var ratio = Math.round((cost / rev) * 100);
                var flag  = ratio > 100 ? ' ⚠ loss month' : ratio > 80 ? ' · tight' : ' · profitable';
                return ['─────────────', 'Cost ratio: ' + ratio + '%' + flag];
              }
            }
          },
          annotation: {
            annotations: {
              today: {
                type: 'line', scaleID: 'x', value: CURRENT_IDX,
                borderColor: 'rgba(0,68,55,0.35)', borderWidth: 2, borderDash: [4,3],
                label: { content: 'Today', display: true, position: 'start', font: { size: 10 }, color: '#004437', backgroundColor: 'rgba(255,255,255,0.85)', padding: 3 }
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
            stacked: false,
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
        '<div class="fin-chart-title">Revenue vs costs — month by month',
          '<span class="fin-chart-legend">',
            '<span class="fin-swatch" style="background:rgba(99,153,34,0.85)"></span>Revenue 2026',
            ' <span class="fin-swatch" style="background:rgba(0,68,55,0.7)"></span>Operating costs',
            ' <span class="fin-swatch" style="background:rgba(186,117,23,0.85)"></span>Stock purchases',
            ' <span style="opacity:0.5;font-size:11px;margin-left:8px">Grey line = 2025 revenue · Faded = forecast · Hover for cost ratio</span>',
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
