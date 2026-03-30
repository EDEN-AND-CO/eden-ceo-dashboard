/**
 * EDEN & CO. CEO Flight Deck - Operations Tab Renderer
 */
window.EDEN = window.EDEN || {};
window.EDEN.components = window.EDEN.components || {};

(function () {
  'use strict';

  var _bomView = 'matrix'; // 'matrix' | 'hamper'
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

  // ── BoM Hamper View ────────────────────────────────────────────────
  function renderBomHamper(bom, hamperKey) {
    var products = bom.products.filter(function(p){ return p.hampers[hamperKey]; });
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
    html += '<div class="bom-hsum">'
      + '<div class="bom-hsum-name">' + esc(label) + '</div>'
      + '<div class="bom-hsum-stats">'
      + '<div class="bom-hstat"><div class="bom-hstat-lbl">COGS</div><div class="bom-hstat-val">' + fmtCost(cogs) + '</div></div>'
      + '<div class="bom-hstat"><div class="bom-hstat-lbl">RRP</div><div class="bom-hstat-val">' + fmtCost(rrp) + '</div></div>'
      + '<div class="bom-hstat"><div class="bom-hstat-lbl">Gross Margin</div><div class="bom-hstat-val g">' + fmtPct(margin) + '</div></div>'
      + '<div class="bom-hstat"><div class="bom-hstat-lbl">Components</div><div class="bom-hstat-val">' + products.length + '</div></div>'
      + '</div></div>';

    // Component table
    html += '<table class="bom-htable"><thead><tr>'
      + '<th>Component</th><th>Supplier</th><th class="r">Weight</th><th class="r">Unit Cost</th><th class="r">RRP</th><th>Private Label</th>'
      + '</tr></thead><tbody>';

    var running = 0;
    products.forEach(function(p, i) {
      running += p.cost;
      var stripe = i % 2 === 0 ? '' : ' bom-alt';
      html += '<tr class="' + stripe + '">'
        + '<td>' + esc(p.name) + '</td>'
        + '<td>' + esc(p.supplier) + '</td>'
        + '<td class="r">' + (p.weightG ? p.weightG + 'g' : '—') + '</td>'
        + '<td class="r"><strong>' + fmtCost(p.cost) + '</strong></td>'
        + '<td class="r">' + fmtCost(p.rrp) + '</td>'
        + '<td>' + (p.privateLabel ? '<span class="bom-pl">PL</span>' : '') + '</td>'
        + '</tr>';
    });

    html += '<tr class="bom-sum-row"><td colspan="3">Total COGS</td><td class="r"><strong>' + fmtCost(running) + '</strong></td><td colspan="2"></td></tr>';
    html += '</tbody></table>';
    html += '</div>';
    return html;
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
    renderBom();
    console.log('[EDEN] Operations tab rendered. BoM products:', window.EDEN.bomData ? window.EDEN.bomData.products.length : 0);
  }

  window.EDEN.components.operations = { render: render, switchView: switchView, switchHamper: switchHamper };
})();
