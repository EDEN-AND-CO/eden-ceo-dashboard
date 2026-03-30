/**
 * EDEN & CO. CEO Flight Deck - Platforms Tab Renderer
 */
window.EDEN = window.EDEN || {};
window.EDEN.components = window.EDEN.components || {};

(function () {
  'use strict';

  var SALES_CHANNELS = ['Shopify', 'Amazon UK', 'Amazon IRE', 'Etsy', 'Yumbles'];
  var CORP_CHANNELS  = ['NOTHS', 'Virgin', 'Corporate', 'ReachDesk', 'Sendoso', 'GiftSenda', 'Needi'];
  var PLATFORM_ORDER = SALES_CHANNELS.concat(CORP_CHANNELS).concat(['Unknown']);

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
    PETITE: 'Petite (Letterbox Gift)', COCOA: 'Cocoa (Chocolate Hamper)',
    SIGNATURE: 'Signature Hamper', PAMPER: 'Pamper Hamper',
    GRAND: 'Grand Hamper', PRESTIGE: 'Prestige (Wicker)', UNKNOWN: 'Other / Unknown'
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
        var p    = byPrior[ch] || { orders: 0, revenue: 0 };
        var meta = PLATFORM_META[ch] || { sub: '', comm: 0, cls: '' };
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

    var sectionHdr = '<tr><td colspan="6" style="padding:10px 14px 4px;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:var(--GMD);font-family:\'Josefin Sans\',sans-serif;font-weight:700;background:var(--LG);border-top:2px solid var(--GL)">';
    var salesRows = buildRows(SALES_CHANNELS);
    var corpRows  = buildRows(CORP_CHANNELS);

    var rows = (salesRows ? sectionHdr + 'Sales Channels</td></tr>' + salesRows : '')
             + (corpRows  ? sectionHdr + 'Corporate &amp; High-Commission</td></tr>' + corpRows : '');

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

  // ── Monthly platform bar chart ──────────────────────────────────────────────

  var CHART_TABS = [
    { key: 'Total',     label: 'All',       color: '#3a5a8a' },
    { key: 'Shopify',   label: 'Shopify',   color: '#1a7a5e' },
    { key: 'Amazon',    label: 'Amazon',    color: '#c8830a' },
    { key: 'NOTHS',     label: 'NOTHS',     color: '#8a3a6a' },
    { key: 'Yumbles',   label: 'Yumbles',   color: '#6a3a8a' },
    { key: 'Etsy',      label: 'Etsy',      color: '#c85a1a' },
    { key: 'Virgin',    label: 'Virgin',    color: '#c81a1a' },
    { key: 'Corporate', label: 'Corporate', color: '#1a5a8a' }
  ];

  var _chartPlatform = 'Total';
  var _chartOrders   = null;
  var _chartPeriod   = 'p12m';

  function bucketChannel(ch) {
    if (ch === 'Amazon UK' || ch === 'Amazon IRE') return 'Amazon';
    if (ch === 'ReachDesk' || ch === 'Sendoso' || ch === 'Needi' || ch === 'GiftSenda' || ch === 'Bespoke/Corporate') return 'Corporate';
    return ch;
  }

  function getMonthKey(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
  }

  function drawBarChart(platform) {
    var svg = document.getElementById('plt-monthly-chart');
    var meta = document.getElementById('plt-chart-meta');
    if (!svg || !_chartOrders) return;

    _chartPlatform = platform;

    // Update tab active state
    var tabs = document.getElementById('plt-chart-tabs');
    if (tabs) {
      tabs.querySelectorAll('.kb').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-plt') === platform);
      });
    }

    var now = new Date();
    var months = [];
    if (_chartPeriod === 'ytd') {
      // Jan 1 to current month
      for (var i = 0; i <= now.getMonth(); i++) {
        var d = new Date(now.getFullYear(), i, 1);
        var mk = getMonthKey(d);
        var py = d.getFullYear() - 1;
        var pmk = py + '-' + String(d.getMonth() + 1).padStart(2, '0');
        months.push({ key: mk, priorKey: pmk, label: d.toLocaleString('en-GB', { month: 'short' }), year: d.getFullYear() });
      }
    } else {
      // Rolling 12 months
      for (var i = 11; i >= 0; i--) {
        var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        var mk = getMonthKey(d);
        var py = d.getFullYear() - 1;
        var pmk = py + '-' + String(d.getMonth() + 1).padStart(2, '0');
        months.push({ key: mk, priorKey: pmk, label: d.toLocaleString('en-GB', { month: 'short' }), year: d.getFullYear() });
      }
    }

    var curVals   = months.map(function () { return 0; });
    var priorVals = months.map(function () { return 0; });

    _chartOrders.forEach(function (o) {
      if (!o.order_date) return;
      var mk      = getMonthKey(new Date(o.order_date));
      var ch      = o.channel || 'Unknown';
      var bucket  = bucketChannel(ch);
      var match   = platform === 'Total' || bucket === platform || ch === platform;
      if (!match) return;

      months.forEach(function (m, idx) {
        if (mk === m.key)      curVals[idx]   += o.amount_paid;
        if (mk === m.priorKey) priorVals[idx] += o.amount_paid;
      });
    });

    var seriesCfg = CHART_TABS.filter(function (t) { return t.key === platform; })[0] || CHART_TABS[0];
    var barColor  = seriesCfg.color;

    var allVals = curVals.concat(priorVals);
    var maxVal  = Math.max.apply(null, allVals) || 1;

    // SVG dimensions
    var W = 700, H = 240;
    var PAD_L = 44, PAD_R = 10, PAD_T = 12, PAD_B = 26;
    var chartW = W - PAD_L - PAD_R;
    var chartH = H - PAD_T - PAD_B;
    var n      = months.length;
    var slotW  = chartW / n;
    var barW   = slotW * 0.55;
    var gap    = (slotW - barW) / 2;

    function xSlot(i) { return PAD_L + i * slotW; }
    function barX(i)  { return xSlot(i) + gap; }
    function yBase()  { return PAD_T + chartH; }
    function yTop(v)  { return PAD_T + chartH - (v / maxVal) * chartH; }
    function barH(v)  { return (v / maxVal) * chartH; }

    // Y-axis labels (4 ticks)
    var yLabHtml = '';
    var gridHtml = '';
    for (var g = 0; g <= 3; g++) {
      var frac = g / 3;
      var yy   = PAD_T + (1 - frac) * chartH;
      var val  = maxVal * frac;
      var lbl  = val >= 1000 ? '£' + Math.round(val / 1000) + 'k' : '£' + Math.round(val);
      gridHtml  += '<line x1="' + PAD_L + '" y1="' + yy + '" x2="' + (W - PAD_R) + '" y2="' + yy + '" stroke="#e8ecea" stroke-width="0.6"/>';
      yLabHtml  += '<text x="' + (PAD_L - 4) + '" y="' + (yy + 3) + '" text-anchor="end" fill="#9ab0ab" font-size="8" font-family="var(--F)">' + lbl + '</text>';
    }

    // Bars
    var barsHtml = '';
    curVals.forEach(function (v, i) {
      var isCurrentMonth = (months[i].key === getMonthKey(now));
      var opacity = isCurrentMonth ? '0.55' : '1';
      var h = barH(v);
      if (h < 0.5) h = 0.5;
      barsHtml += '<rect x="' + barX(i) + '" y="' + yTop(v) + '" width="' + barW + '" height="' + h + '" fill="' + barColor + '" opacity="' + opacity + '" rx="1.5"/>';
    });

    // Prior year line
    var linePts = priorVals.map(function (v, i) {
      return (xSlot(i) + slotW / 2) + ',' + yTop(v);
    }).join(' ');
    var lineHtml = '<polyline points="' + linePts + '" fill="none" stroke="#aabfb8" stroke-width="1.4" stroke-dasharray="4,3" stroke-linejoin="round" stroke-linecap="round"/>';

    // Prior year dots
    var priorDots = '';
    priorVals.forEach(function (v, i) {
      if (v > 0) {
        priorDots += '<circle cx="' + (xSlot(i) + slotW / 2) + '" cy="' + yTop(v) + '" r="2.2" fill="#aabfb8"/>';
      }
    });

    // X-axis labels
    var xLabHtml = '';
    months.forEach(function (m, i) {
      xLabHtml += '<text x="' + (xSlot(i) + slotW / 2) + '" y="' + (H - 6) + '" text-anchor="middle" fill="#9ab0ab" font-size="8" font-family="var(--F)" letter-spacing="0.05em">' + m.label.toUpperCase() + '</text>';
    });

    // Hover columns (invisible, for tooltip)
    var hoverHtml = '';
    months.forEach(function (m, i) {
      var cx   = Math.round(xSlot(i) + slotW / 2);
      var tipX = cx > W - 140 ? cx - 136 : cx + 6;
      var cur  = Math.round(curVals[i]).toLocaleString('en-GB');
      var pri  = Math.round(priorVals[i]).toLocaleString('en-GB');
      var chg  = priorVals[i] > 0 ? Math.round(((curVals[i] - priorVals[i]) / priorVals[i]) * 1000) / 10 : null;
      var chgTxt = chg === null ? 'NEW' : (chg >= 0 ? '+' + chg + '%' : chg + '%');
      var tipData = [m.label + ' ' + m.year, platform + ': £' + cur, 'Prior: £' + pri, chgTxt].join('|');
      hoverHtml += '<rect class="plt-hcol" x="' + xSlot(i) + '" y="' + PAD_T + '" width="' + slotW + '" height="' + chartH + '" fill="transparent" data-tip="' + tipData + '" data-tipx="' + tipX + '" data-tipy="' + (PAD_T + 2) + '"/>';
    });

    svg.innerHTML =
      gridHtml + yLabHtml +
      '<line x1="' + PAD_L + '" y1="' + yBase() + '" x2="' + (W - PAD_R) + '" y2="' + yBase() + '" stroke="#cdd8d4" stroke-width="0.8"/>' +
      barsHtml + lineHtml + priorDots + xLabHtml + hoverHtml +
      '<g id="plt-bar-tip" opacity="0" pointer-events="none">' +
        '<rect id="plt-bt-bg" x="0" y="0" width="130" height="66" rx="4" fill="#f4f8f6" stroke="#cdd8d4" stroke-width="0.8"/>' +
        '<text id="plt-bt-0" x="8" y="16" font-size="9" font-weight="700" fill="' + barColor + '" font-family="var(--F)"></text>' +
        '<text id="plt-bt-1" x="8" y="30" font-size="8.5" fill="#2d4a40" font-family="var(--F)"></text>' +
        '<text id="plt-bt-2" x="8" y="44" font-size="8" fill="#9ab0ab" font-family="var(--F)"></text>' +
        '<text id="plt-bt-3" x="8" y="58" font-size="8.5" font-weight="700" fill="#2d4a40" font-family="var(--F)"></text>' +
      '</g>';

    svg.querySelectorAll('.plt-hcol').forEach(function (col) {
      col.addEventListener('mouseenter', function () {
        var tip  = document.getElementById('plt-bar-tip');
        if (!tip) return;
        var lines = col.getAttribute('data-tip').split('|');
        var tx    = parseFloat(col.getAttribute('data-tipx'));
        var ty    = parseFloat(col.getAttribute('data-tipy'));
        tip.setAttribute('opacity', '1');
        tip.querySelector('#plt-bt-bg').setAttribute('x', tx);
        tip.querySelector('#plt-bt-bg').setAttribute('y', ty);
        [0,1,2,3].forEach(function (n) {
          var el = tip.querySelector('#plt-bt-' + n);
          el.textContent = lines[n] || '';
          el.setAttribute('x', tx + 8);
          el.setAttribute('y', ty + 16 + n * 14);
        });
        // Colour the change text
        var chgEl = tip.querySelector('#plt-bt-3');
        var chgVal = parseFloat(lines[3]);
        chgEl.setAttribute('fill', isNaN(chgVal) ? '#9ab0ab' : (chgVal >= 0 ? '#1a7a5e' : '#c0392b'));
      });
      col.addEventListener('mouseleave', function () {
        var tip = document.getElementById('plt-bar-tip');
        if (tip) tip.setAttribute('opacity', '0');
      });
    });

    // Meta legend
    if (meta) {
      meta.innerHTML =
        '<span style="display:flex;align-items:center;gap:6px;color:#2d4a40;font-weight:700">' +
          '<span style="width:14px;height:10px;background:' + barColor + ';border-radius:2px;display:inline-block"></span>' + platform + ' revenue' +
        '</span>' +
        '<span style="display:flex;align-items:center;gap:6px;color:#9ab0ab;font-weight:600">' +
          '<span style="width:14px;border-top:2px dashed #aabfb8;display:inline-block"></span>Prior year' +
        '</span>' +
        '<span style="color:#9ab0ab;font-weight:400;font-size:9px;margin-left:auto">Faded bar = current (partial) month</span>';
    }
  }

  function renderMonthlyChart(orders) {
    _chartOrders = orders;

    var tabs = document.getElementById('plt-chart-tabs');
    if (tabs && !tabs.hasChildNodes()) {
      CHART_TABS.forEach(function (t, i) {
        var btn = document.createElement('button');
        btn.className = 'kb' + (i === 0 ? ' active' : '');
        btn.textContent = t.label;
        btn.setAttribute('data-plt', t.key);
        btn.onclick = function () { drawBarChart(t.key); };
        tabs.appendChild(btn);
      });
    }

    drawBarChart(_chartPlatform);
  }

  function setView(view, btn) {
    if (!_cachedOrders) return;
    _currentView = view;

    // Toggle button states
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
    var lbl = document.getElementById('plt-chart-period-lbl');
    if (lbl) lbl.textContent = period === 'ytd' ? 'Monthly revenue — year to date' : 'Monthly revenue — rolling 12 months';
    if (_chartOrders) drawBarChart(_chartPlatform);
  }

  window.EDEN.components.platforms = { render: render, setView: setView, setPeriod: setPeriod };
})();
