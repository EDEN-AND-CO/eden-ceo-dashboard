/**
 * EDEN & CO. CEO Flight Deck - Operations Tab Renderer
 */
window.EDEN = window.EDEN || {};
window.EDEN.components = window.EDEN.components || {};

(function () {
  'use strict';

  var _bomView = 'hamper'; // 'matrix' | 'hamper'
  var _activeHamper = 'COCOA';

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function fmtCost(n) {
    return n ? '£' + n.toFixed(2) : '—';
  }

  function fmtPct(n) {
    return n ? n.toFixed(1) + '%' : '—';
  }

  // ── BoM Matrix View ────────────────────────────────────────────────
  function renderBomMatrix(bom) {
    var hampers  = bom.hampers.filter(function(h){ return h !== 'ADDON'; });
    var products = bom.products;

    // Group products by section
    var sections = [];
    var sectionMap = {};
    products.forEach(function(p) {
      if (!sectionMap[p.section]) {
        sectionMap[p.section] = [];
        sections.push(p.section);
      }
      sectionMap[p.section].push(p);
    });

    var hamperLabels = bom.hamperLabels;
    var hamperKeys   = hampers;

    // Header row
    var html = '<div class="bom-matrix-wrap"><table class="bom-matrix">';
    html += '<thead><tr><th class="bom-prod-col">Product</th><th class="bom-attr-col">Supplier</th><th class="bom-attr-col r">Cost</th><th class="bom-attr-col r">Weight</th>';
    hamperKeys.forEach(function(h) {
      html += '<th class="bom-hcol">' + esc(hamperLabels[h] || h) + '</th>';
    });
    html += '</tr></thead><tbody>';

    // Product rows by section
    sections.forEach(function(sec) {
      var rows = sectionMap[sec];
      // Section header
      html += '<tr class="bom-sec-row"><td colspan="' + (4 + hamperKeys.length) + '">' + esc(sec) + '</td></tr>';
      rows.forEach(function(p) {
        html += '<tr class="bom-prod-row">';
        html += '<td class="bom-prod-name">' + esc(p.name) + (p.privateLabel ? ' <span class="bom-pl">PL</span>' : '') + '</td>';
        html += '<td class="bom-supplier">' + esc(p.supplier) + '</td>';
        html += '<td class="r bom-cost">' + fmtCost(p.cost) + '</td>';
        html += '<td class="r bom-weight">' + (p.weightG ? p.weightG + 'g' : '—') + '</td>';
        hamperKeys.forEach(function(h) {
          var inc = p.hampers[h];
          html += '<td class="bom-cell ' + (inc ? 'bom-in' : 'bom-out') + '">'
            + (inc ? '<span class="bom-tick">&#10003;</span><span class="bom-cell-cost">' + fmtCost(p.cost) + '</span>' : '')
            + '</td>';
        });
        html += '</tr>';
      });
    });

    // COGS summary row
    html += '<tr class="bom-sum-row"><td colspan="4">COGS (components)</td>';
    hamperKeys.forEach(function(h) {
      html += '<td class="r">' + fmtCost(bom.hamperCogs[h]) + '</td>';
    });
    html += '</tr>';

    // RRP row
    html += '<tr class="bom-rrp-row"><td colspan="4">RRP (inc VAT)</td>';
    hamperKeys.forEach(function(h) {
      html += '<td class="r">' + fmtCost(bom.hamperRrp[h]) + '</td>';
    });
    html += '</tr>';

    // Margin row
    html += '<tr class="bom-margin-row"><td colspan="4">Gross Margin (ex VAT)</td>';
    hamperKeys.forEach(function(h) {
      html += '<td class="r">' + fmtPct(bom.hamperMargin[h]) + '</td>';
    });
    html += '</tr>';

    html += '</tbody></table></div>';
    return html;
  }

  // ── Sales velocity from orders ─────────────────────────────────────
  var HAMPER_SKU_MAP = {
    'LETTERBOX': 'PETITE',
    'COCOA':     'COCOA',
    'SIGNATURE': 'SIGNATURE',
    'PAMPER':    'PAMPER',
    'GRAND':     'GRAND',
    'PRESTIGE':  'PRESTIGE'
  };

  function get30DayVelocity(hamperKey) {
    var orders = window.EDEN && window.EDEN._allOrders;
    if (!orders || !orders.length) return null;
    var skuKey = HAMPER_SKU_MAP[hamperKey];
    if (!skuKey) return null;
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    var count = 0;
    orders.forEach(function(o) {
      if (o.status === 'cancelled' || o.status === 'on_hold') return;
      if (o.core_product !== skuKey) return;
      var d = new Date(o.order_date || o.date || '');
      if (isNaN(d)) return;
      if (d >= cutoff) count++;
    });
    return count;
  }

  // ── BoM Hamper View ────────────────────────────────────────────────
  function renderBomHamper(bom, hamperKey) {
    // Exclude packaging items — BoM product view is food/gift contents only
    var products = bom.products.filter(function(p){ return p.hampers[hamperKey] && p.section !== 'Packaging'; });
    var label    = bom.hamperLabels[hamperKey] || hamperKey;
    var cogs     = bom.hamperCogs[hamperKey];
    var rrp      = bom.hamperRrp[hamperKey];
    var margin   = bom.hamperMargin[hamperKey];

    var html = '<div class="bom-hamper-wrap">';

    // Hamper selector tabs
    html += '<div class="bom-htabs">';
    bom.hampers.filter(function(h){ return h !== 'ADDON'; }).forEach(function(h) {
      html += '<button class="bom-htab' + (h === hamperKey ? ' active' : '') + '" onclick="window.EDEN.components.operations.switchHamper(\'' + h + '\')">'
        + esc(bom.hamperLabels[h] || h) + '</button>';
    });
    html += '</div>';

    // Summary card
    var vel = get30DayVelocity(hamperKey);
    var velPerDay = vel !== null ? (vel / 30).toFixed(1) : null;
    html += '<div class="bom-hsum">'
      + '<div class="bom-hsum-name">' + esc(label) + '</div>'
      + '<div class="bom-hsum-stats">'
      + '<div class="bom-hstat"><div class="bom-hstat-lbl">COGS</div><div class="bom-hstat-val">' + fmtCost(cogs) + '</div></div>'
      + '<div class="bom-hstat"><div class="bom-hstat-lbl">RRP</div><div class="bom-hstat-val">' + fmtCost(rrp) + '</div></div>'
      + '<div class="bom-hstat"><div class="bom-hstat-lbl">Gross Margin</div><div class="bom-hstat-val g">' + fmtPct(margin) + '</div></div>'
      + '<div class="bom-hstat"><div class="bom-hstat-lbl">Components</div><div class="bom-hstat-val">' + products.length + '</div></div>'
      + '<div class="bom-hstat"><div class="bom-hstat-lbl">30d Sales</div><div class="bom-hstat-val">' + (vel !== null ? vel + ' orders' : '—') + '</div></div>'
      + '<div class="bom-hstat"><div class="bom-hstat-lbl">Velocity</div><div class="bom-hstat-val">' + (velPerDay !== null ? velPerDay + '/day' : '—') + '</div></div>'
      + '</div></div>';

    // Component table
    html += '<table class="bom-htable"><thead><tr>'
      + '<th>Component</th><th>Supplier</th><th class="r">Weight</th><th class="r">Case Size</th><th class="r">Unit Cost</th><th class="r">RRP</th><th>PL</th>'
      + '</tr></thead><tbody>';

    var running = 0;
    products.forEach(function(p, i) {
      running += p.cost;
      var stripe = i % 2 === 0 ? '' : ' bom-alt';
      html += '<tr class="' + stripe + '">'
        + '<td>' + esc(p.name) + '</td>'
        + '<td>' + esc(p.supplier) + '</td>'
        + '<td class="r">' + (p.weightG ? p.weightG + 'g' : '—') + '</td>'
        + '<td class="r">' + (p.caseQty || '—') + '</td>'
        + '<td class="r"><strong>' + fmtCost(p.cost) + '</strong></td>'
        + '<td class="r">' + fmtCost(p.rrp) + '</td>'
        + '<td>' + (p.privateLabel ? '<span class="bom-pl">PL</span>' : '') + '</td>'
        + '</tr>';
    });

    html += '<tr class="bom-sum-row"><td colspan="4">Total COGS</td><td class="r"><strong>' + fmtCost(running) + '</strong></td><td colspan="2"></td></tr>';
    html += '</tbody></table>';
    html += '</div>';
    return html;
  }

  // ── Hamper stock tiles ─────────────────────────────────────────────
  function renderHamperTiles(bom) {
    var container = document.getElementById('hamper-stock-tiles');
    if (!container || !bom) return;

    var hampers = bom.hampers.filter(function(h){ return h !== 'ADDON'; });
    var html = '';
    hampers.forEach(function(h) {
      var label = bom.hamperLabels[h] || h;
      var vel   = get30DayVelocity(h);
      var velDay = vel !== null ? (vel / 30).toFixed(1) : null;

      // Stock data — loaded from EDEN_CO_WEEKLY_STATUS if available
      var stockData = window.EDEN._stockData && window.EDEN._stockData[h];
      var avail     = stockData ? stockData.available : null;
      var minStock  = stockData ? stockData.minimum   : null;
      var daysLeft  = (avail !== null && velDay !== null && parseFloat(velDay) > 0)
        ? Math.floor(avail / parseFloat(velDay)) : null;
      var restockDate = null;
      if (daysLeft !== null) {
        var rd = new Date();
        rd.setDate(rd.getDate() + daysLeft);
        var mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        restockDate = rd.getDate() + ' ' + mo[rd.getMonth()];
      }

      var stockStr  = avail !== null ? avail + ' units' : '—';
      var daysStr   = daysLeft !== null ? daysLeft + 'd stock left' : '—';
      var restockStr = restockDate || '—';
      var isLow = daysLeft !== null && daysLeft < 14;
      var borderColor = isLow ? '#c94444' : 'rgba(255,255,255,0.12)';

      html += '<div style="background:var(--G);border:2px solid ' + borderColor + ';border-radius:8px;padding:14px 12px;color:#fff">'
        + '<div style="font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:var(--GL);font-weight:700;margin-bottom:10px">' + esc(label) + '</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">'
        + '<div><div style="font-size:9px;color:rgba(255,255,255,0.5);margin-bottom:2px">In stock</div><div style="font-size:16px;font-weight:700;color:var(--GXP)">' + stockStr + '</div></div>'
        + '<div><div style="font-size:9px;color:rgba(255,255,255,0.5);margin-bottom:2px">Days left</div><div style="font-size:16px;font-weight:700;color:' + (isLow ? '#f07070' : 'var(--GXP)') + '">' + daysStr + '</div></div>'
        + '<div><div style="font-size:9px;color:rgba(255,255,255,0.5);margin-bottom:2px">30d vel.</div><div style="font-size:14px;font-weight:600;color:var(--GL)">' + (velDay !== null ? velDay + '/day' : '—') + '</div></div>'
        + '<div><div style="font-size:9px;color:rgba(255,255,255,0.5);margin-bottom:2px">Est. restock</div><div style="font-size:14px;font-weight:600;color:' + (isLow ? '#f07070' : 'var(--GL)') + '">' + restockStr + '</div></div>'
        + '</div></div>';
    });
    container.innerHTML = html;
  }

  // ── Main render ────────────────────────────────────────────────────
  function renderBom() {
    var bom = window.EDEN && window.EDEN.bomData;
    var container = document.getElementById('bom-container');
    if (!container) return;

    if (!bom) {
      container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--GMD)">BoM data not loaded. Run: python3 scripts/build-bom-cache.py</div>';
      return;
    }

    if (_bomView === 'hamper') {
      container.innerHTML = renderBomHamper(bom, _activeHamper);
    } else {
      container.innerHTML = renderBomMatrix(bom);
    }
  }

  function switchView(view, btn) {
    _bomView = view;
    var matBtn = document.getElementById('bom-btn-matrix');
    var hapBtn = document.getElementById('bom-btn-hamper');
    if (matBtn) matBtn.classList.toggle('active', view === 'matrix');
    if (hapBtn) hapBtn.classList.toggle('active', view === 'hamper');
    renderBom();
  }

  function switchHamper(key) {
    _activeHamper = key;
    renderBom();
  }

  function render(data) {
    var bom = window.EDEN && window.EDEN.bomData;
    renderHamperTiles(bom);
    renderBom();
    console.log('[EDEN] Operations tab rendered. BoM products:', bom ? bom.products.length : 0);
  }

  window.EDEN.components.operations = { render: render, switchView: switchView, switchHamper: switchHamper };
})();
