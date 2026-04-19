/**
 * EDEN & CO. CEO Flight Deck - Platforms Tab Renderer
 */
window.EDEN = window.EDEN || {};
window.EDEN.components = window.EDEN.components || {};

(function () {
  'use strict';

  // Known channel config — any channel found in order data will appear even if not listed here
  var KNOWN_CHANNELS = ['Shopify', 'Amazon UK', 'Amazon IRE', 'Etsy', 'Yumbles', 'NOTHS', 'Virgin', 'Corporate', 'ReachDesk', 'Sendoso', 'GiftSenda', 'Needi'];

  var PLATFORM_META = {
    'Shopify':   { sub: 'D2C primary · Store 87653', comm: 2.5,  cls: 'rowg' },
    'Amazon UK': { sub: 'Store 67911',               comm: 15,   cls: 'rowg' },
    'Amazon IRE':{ sub: 'Store 167644',              comm: 15,   cls: 'rowg' },
    'Yumbles':   { sub: 'Store 47576',               comm: 25,   cls: 'rowa' },
    'NOTHS':     { sub: 'Store 16432',               comm: 25,   cls: 'rowa' },
    'Virgin':    { sub: 'Store 40322',               comm: 30,   cls: '' },
    'Etsy':      { sub: 'Store 40324',               comm: 13,   cls: '' },
    'Corporate': { sub: 'ReachDesk · Sendoso · Needi · GiftSenda · Direct', comm: 0, cls: '' },
    'Unknown':   { sub: 'Unmatched channel',         comm: 0,    cls: '' }
  };

  // Cached data for toggle re-render
  var _cachedOrders = null;
  var _currentView  = 'mtd';

  var PRODUCT_NAMES = {
    PETITE: 'Letterbox Gift', COCOA: 'Chocolate Hamper',
    SIGNATURE: 'Signature Hamper', PAMPER: 'Pamper Hamper',
    GRAND: 'Grand Hamper', PRESTIGE: 'Prestige Hamper', UNKNOWN: 'Other / Unknown'
  };

  function fmtGBP(n) {
    return '£' + Math.round(n).toLocaleString('en-GB');
  }

  function chgSpan(pct, priorZero) {
    if (priorZero) return '<span class="d fl">NEW</span>';
    var r = Math.round(Math.abs(pct) * 10) / 10;
    if (pct > 0) return '<span class="d up">&#8593; ' + r + '%</span>';
    if (pct < 0) return '<span class="d dn">&#8595; ' + r + '%</span>';
    return '<span class="d fl">&#8213; 0%</span>';
  }

  function groupByChannel(orders) {
    var result = {};
    orders.forEach(function (o) {
      var ch = o.channel || 'Unknown';
      if (!result[ch]) result[ch] = { orders: 0, revenue: 0 };
      result[ch].orders++;
      result[ch].revenue += o.amount_paid;
    });
    return result;
  }

  function groupByProduct(orders) {
    var result = {};
    orders.forEach(function (o) {
      var p = o.core_product || 'UNKNOWN';
      if (!result[p]) result[p] = { orders: 0, revenue: 0 };
      result[p].orders++;
      result[p].revenue += o.amount_paid;
    });
    return result;
  }

  function renderPlatformTable(orders, view) {
    var m = window.EDEN.metrics;
    if (!m) return;

    var cur, prior, vsLabel, titleLabel;
    if (view === 'ytd') {
      var ytd = m.getYTDOrders(orders);
      // Prior YTD = same Jan-to-dayOfYear range last year
      var t = new Date();
      var startOfYear = new Date(t.getFullYear() - 1, 0, 1);
      var priorEnd    = new Date(t.getFullYear() - 1, t.getMonth(), t.getDate());
      var priorYTD    = m.filterByDateRange(orders, startOfYear, priorEnd);
      cur = ytd; prior = priorYTD;
      vsLabel    = 'vs Prior YTD';
      titleLabel = 'Platform performance — YTD vs prior YTD';
    } else {
      cur   = m.getMTDOrders(orders);
      prior = m.getPriorMTDOrders(orders);
      vsLabel    = 'vs Prior MTD';
      titleLabel = 'Platform performance — MTD vs prior MTD';
    }

    var labelEl = document.getElementById('plt-table-label');
    if (labelEl) labelEl.textContent = titleLabel;
    var vsCol = document.getElementById('plt-vs-col');
    if (vsCol) vsCol.textContent = vsLabel;

    var byCur   = groupByChannel(cur);
    var byPrior = groupByChannel(prior);

    function buildRows(channels) {
      var rows = '';
      channels.forEach(function (ch) {
        var c = byCur[ch];
        if (!c) return;
        var meta = PLATFORM_META[ch] || { sub: '', comm: 0, cls: '' };
        // Only show channels that have a real Store ID in the sub-label
        if (!meta.sub || !meta.sub.match(/Store\s+\d+/)) return;
        var p    = byPrior[ch] || { orders: 0, revenue: 0 };
        var aov  = c.orders > 0 ? c.revenue / c.orders : 0;
        var chg  = p.revenue > 0 ? ((c.revenue - p.revenue) / p.revenue) * 100 : null;
        rows += '<tr class="' + meta.cls + '">' +
          '<td><span class="pn">' + ch + '</span><div class="ps">' + meta.sub + '</div></td>' +
          '<td class="r">' + meta.comm + '%</td>' +
          '<td class="r">' + c.orders + '</td>' +
          '<td class="r">' + fmtGBP(c.revenue) + '</td>' +
          '<td class="r">' + fmtGBP(aov) + '</td>' +
          '<td class="r">' + chgSpan(chg, p.revenue === 0) + '</td>' +
          '</tr>';
      });
      return rows;
    }

    // Build dynamic channel list: known channels first (if they have data), then any unseen channels from orders
    var allCurChannels = Object.keys(byCur);
    var ordered = KNOWN_CHANNELS.filter(function(ch) { return byCur[ch]; });
    allCurChannels.forEach(function(ch) {
      if (ordered.indexOf(ch) === -1) ordered.push(ch);
    });
    var rows = buildRows(ordered);

    var tbody = document.getElementById('plt-table-body');
    if (tbody) tbody.innerHTML = rows || '<tr><td colspan="6" style="text-align:center;color:var(--GMD);padding:16px">No data</td></tr>';
  }

  function render(data) {
    var m = window.EDEN.metrics;
    if (!m || !data || !data.orders) return;

    var orders = data.orders.filter(function (o) {
      return o.status !== 'cancelled' && o.status !== 'on_hold';
    });

    _cachedOrders = orders;
    _currentView  = 'mtd';

    renderPlatformTable(orders, 'mtd');
    renderMonthlyChart(orders);

    var mtd = m.getMTDOrders(orders);
    var ytd = m.getYTDOrders(orders);
    var priorMTD = m.getPriorMTDOrders(orders);

    // ── Top product lines MTD ──
    var byProdMTD   = groupByProduct(mtd);
    var byProdPrior = groupByProduct(priorMTD);

    var prodList = Object.keys(byProdMTD).map(function (p) {
      return { key: p, orders: byProdMTD[p].orders, revenue: byProdMTD[p].revenue };
    }).sort(function (a, b) { return b.revenue - a.revenue; });

    var skuMtdRows = '';
    prodList.forEach(function (p, i) {
      var prior = byProdPrior[p.key] || { revenue: 0 };
      var chg = prior.revenue > 0
        ? ((p.revenue - prior.revenue) / prior.revenue) * 100
        : null;
      var rank = i === 0 ? '<td style="color:var(--GOLD);font-weight:700">1</td>' : '<td style="color:var(--GMD)">' + (i + 1) + '</td>';
      skuMtdRows += '<tr>' + rank +
        '<td><span class="pn">' + (PRODUCT_NAMES[p.key] || p.key) + '</span></td>' +
        '<td class="r">' + p.orders + '</td>' +
        '<td class="r">' + fmtGBP(p.revenue) + '</td>' +
        '<td class="r">' + chgSpan(chg, prior.revenue === 0) + '</td>' +
        '</tr>';
    });

    var mtdBody = document.getElementById('plt-sku-mtd-body');
    if (mtdBody) mtdBody.innerHTML = skuMtdRows || '<tr><td colspan="5" style="text-align:center;color:var(--GMD);padding:16px">No data</td></tr>';

    // ── Top product lines YTD ──
    var byProdYTD = groupByProduct(ytd);
    var ytdList = Object.keys(byProdYTD).map(function (p) {
      return { key: p, orders: byProdYTD[p].orders, revenue: byProdYTD[p].revenue };
    }).sort(function (a, b) { return b.revenue - a.revenue; });

    var skuYtdRows = '';
    ytdList.forEach(function (p, i) {
      var rank = i === 0 ? '<td style="color:var(--GOLD);font-weight:700">1</td>' : '<td style="color:var(--GMD)">' + (i + 1) + '</td>';
      skuYtdRows += '<tr>' + rank +
        '<td><span class="pn">' + (PRODUCT_NAMES[p.key] || p.key) + '</span></td>' +
        '<td class="r">' + p.orders + '</td>' +
        '<td class="r">' + fmtGBP(p.revenue) + '</td>' +
        '<td class="r"><span class="d fl">YTD</span></td>' +
        '</tr>';
    });

    var ytdBody = document.getElementById('plt-sku-ytd-body');
    if (ytdBody) ytdBody.innerHTML = skuYtdRows || '<tr><td colspan="5" style="text-align:center;color:var(--GMD);padding:16px">No data</td></tr>';

    console.log('[EDEN] Platforms tab rendered.');
  }

  // ── Monthly revenue table ──────────────────────────────────────────────────

  var _chartOrders = null;
  var _chartPeriod = 'p12m';

  function bucketChannel(ch) {
    if (ch === 'Amazon UK' || ch === 'Amazon IRE') return 'Amazon';
    if (ch === 'ReachDesk' || ch === 'Sendoso' || ch === 'Needi' || ch === 'GiftSenda' || ch === 'Bespoke/Corporate') return 'Corporate';
    return ch;
  }

  function getMonthKey(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
  }

  function drawMonthlyTable() {
    var tbl = document.getElementById('plt-monthly-table');
    if (!tbl || !_chartOrders) return;

    var now = new Date();
    var months = [];

    if (_chartPeriod === 'ytd') {
      for (var i = 0; i <= now.getMonth(); i++) {
        var d = new Date(now.getFullYear(), i, 1);
        var mk = getMonthKey(d);
        var pmk = (d.getFullYear() - 1) + '-' + String(d.getMonth() + 1).padStart(2, '0');
        months.push({ key: mk, priorKey: pmk, label: d.toLocaleString('en-GB', { month: 'short', year: '2-digit' }) });
      }
    } else {
      for (var i = 11; i >= 0; i--) {
        var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        var mk = getMonthKey(d);
        var pmk = (d.getFullYear() - 1) + '-' + String(d.getMonth() + 1).padStart(2, '0');
        months.push({ key: mk, priorKey: pmk, label: d.toLocaleString('en-GB', { month: 'short', year: '2-digit' }) });
      }
    }

    var COLS = ['Shopify', 'Amazon', 'NOTHS', 'Etsy', 'Corporate', 'Other'];
    var curMk = getMonthKey(now);

    // Aggregate revenue by month + channel
    var data = {};
    months.forEach(function (m) {
      data[m.key] = { total: 0, prior: 0 };
      COLS.forEach(function (c) { data[m.key][c] = 0; });
    });

    _chartOrders.forEach(function (o) {
      if (!o.order_date) return;
      var mk = getMonthKey(new Date(o.order_date));
      var bucket = bucketChannel(o.channel || 'Unknown');
      var col = COLS.indexOf(bucket) !== -1 ? bucket : 'Other';
      if (data[mk]) {
        data[mk].total += o.amount_paid;
        data[mk][col]  += o.amount_paid;
      }
      months.forEach(function (m) {
        if (mk === m.priorKey && data[m.key]) {
          data[m.key].prior += o.amount_paid;
        }
      });
    });

    // Build rows (oldest to newest — scroll to bottom for latest)
    var rows = months.map(function (m) {
      var d = data[m.key];
      var chg = d.prior > 0 ? Math.round(((d.total - d.prior) / d.prior) * 100) : null;
      var isCur = m.key === curMk;
      var rowStyle = isCur ? ' style="opacity:0.75"' : '';
      var partialNote = isCur ? ' <span style="font-size:9px;color:var(--GMD)">(MTD)</span>' : '';
      var chgHtml = chg === null ? '<span style="color:var(--GMD)">—</span>' : chgSpan(chg, false);
      var cols = COLS.map(function (c) {
        var v = d[c];
        return '<td class="r">' + (v > 50 ? fmtGBP(v) : '<span style="color:var(--GP)">—</span>') + '</td>';
      }).join('');
      return '<tr' + rowStyle + '>' +
        '<td style="white-space:nowrap;font-weight:600">' + m.label + partialNote + '</td>' +
        '<td class="r" style="font-weight:700">' + fmtGBP(d.total) + '</td>' +
        cols +
        '<td class="r">' + chgHtml + '</td>' +
        '</tr>';
    }).join('');

    // Totals row
    var grandTotal = 0;
    var colTotals = {};
    COLS.forEach(function (c) { colTotals[c] = 0; });
    months.forEach(function (m) {
      var d = data[m.key];
      grandTotal += d.total;
      COLS.forEach(function (c) { colTotals[c] += d[c]; });
    });
    var totalCols = COLS.map(function (c) {
      return '<td class="r" style="font-weight:700">' + fmtGBP(colTotals[c]) + '</td>';
    }).join('');
    rows += '<tr class="bom-sum-row"><td style="font-weight:700">Total</td>' +
      '<td class="r" style="font-weight:700">' + fmtGBP(grandTotal) + '</td>' +
      totalCols + '<td class="r">—</td></tr>';

    tbl.innerHTML = rows;

    var lbl = document.getElementById('plt-chart-period-lbl');
    if (lbl) lbl.textContent = _chartPeriod === 'ytd' ? 'Monthly revenue — year to date' : 'Monthly revenue — rolling 12 months';
  }

  function renderMonthlyChart(orders) {
    _chartOrders = orders;
    drawMonthlyTable();
  }

  function setView(view, btn) {
    if (!_cachedOrders) return;
    _currentView = view;
    var mtdBtn = document.getElementById('plt-btn-mtd');
    var ytdBtn = document.getElementById('plt-btn-ytd');
    if (mtdBtn) mtdBtn.classList.toggle('active', view === 'mtd');
    if (ytdBtn) ytdBtn.classList.toggle('active', view === 'ytd');
    renderPlatformTable(_cachedOrders, view);
  }

  function setPeriod(period) {
    _chartPeriod = period;
    var p12Btn = document.getElementById('plt-period-p12m');
    var ytdBtn = document.getElementById('plt-period-ytd');
    if (p12Btn) p12Btn.classList.toggle('active', period === 'p12m');
    if (ytdBtn) ytdBtn.classList.toggle('active', period === 'ytd');
    if (_chartOrders) drawMonthlyTable();
  }

  window.EDEN.components.platforms = { render: render, setView: setView, setPeriod: setPeriod };
})();
