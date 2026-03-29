/**
 * EDEN & CO. CEO Flight Deck - UI Interactions and App Init
 * Tab switching, drawer, alerts, scenario calc, SKU lookup, goals scoring.
 */
window.EDEN = window.EDEN || {};

(function () {
  'use strict';

  // ── Tab switching ──────────────────────────────────────────────

  /**
   * Show the named tab panel and mark the clicked tab button as active.
   * @param {string} id - Panel id suffix (e.g. 'overview')
   * @param {Element} el - The clicked tab button element
   * @param {string} label - Human label for the header section indicator
   */
  function showTab(id, el, label) {
    var panels = document.querySelectorAll('.panel');
    for (var i = 0; i < panels.length; i++) {
      panels[i].classList.remove('active');
    }
    var tabs = document.querySelectorAll('.tab');
    for (var j = 0; j < tabs.length; j++) {
      tabs[j].classList.remove('active');
    }
    var panel = document.getElementById('tab-' + id);
    if (panel) panel.classList.add('active');
    if (el) el.classList.add('active');
    var hdr = document.getElementById('hdr-section');
    if (hdr) hdr.textContent = label || id;
  }

  // ── Alert drawer ───────────────────────────────────────────────

  function openDrawer() {
    var overlay = document.getElementById('drawer-overlay');
    var drawer = document.getElementById('drawer');
    if (overlay) overlay.classList.add('open');
    if (drawer) drawer.classList.add('open');
  }

  function closeDrawer() {
    var overlay = document.getElementById('drawer-overlay');
    var drawer = document.getElementById('drawer');
    if (overlay) overlay.classList.remove('open');
    if (drawer) drawer.classList.remove('open');
  }

  /**
   * Dismiss an individual alert item and update the badge count.
   * @param {string} id - Element id of the alert to dismiss
   */
  function dimDrawerAlert(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
    var alerts = document.querySelectorAll('.drawer-alert');
    var visible = 0;
    for (var i = 0; i < alerts.length; i++) {
      if (alerts[i].style.display !== 'none') visible++;
    }
    var badge = document.getElementById('alert-count');
    if (badge) {
      badge.textContent = visible;
      badge.style.display = visible === 0 ? 'none' : 'flex';
    }
  }

  // ── Scenario calculator ────────────────────────────────────────

  function calc() {
    var mEl = document.getElementById('sc-m');
    var aEl = document.getElementById('sc-a');
    if (!mEl || !aEl) return;
    var m = parseFloat(mEl.value) || 0;
    var a = parseFloat(aEl.value) || 1;
    var ordersDay = a > 0 ? Math.ceil((m / a) / 30) : 0;
    var ann = m * 12;
    var target = 1000000;
    var gap = target - ann;

    var o = document.getElementById('sc-o');
    var annEl = document.getElementById('sc-ann');
    var gapEl = document.getElementById('sc-gap');

    if (o) o.value = ordersDay;
    if (annEl) annEl.textContent = fmt(ann);
    if (gapEl) {
      gapEl.textContent = gap > 0 ? fmt(gap) + ' short' : 'On track';
    }
  }

  // ── Detail row expand/collapse (stock table) ───────────────────

  /**
   * Toggle a hidden detail row in the stock table.
   * @param {string} id - Element id of the detail row
   * @param {Element} btn - The button that was clicked
   */
  function tog(id, btn) {
    var row = document.getElementById(id);
    if (!row) return;
    var open = row.classList.toggle('open');
    if (btn) btn.innerHTML = open ? 'Detail &#9650;' : 'Detail &#9660;';
  }

  // ── SKU lookup ─────────────────────────────────────────────────

  function skuLookup() {
    var q = (document.getElementById('sku-q') || {}).value;
    if (!q) return;
    q = q.trim().toUpperCase();
    var cfg = window.EDEN.CONFIG;
    var found = null;
    for (var key in cfg.products) {
      if (key === q || cfg.products[key].name.toUpperCase().includes(q)) {
        found = { line: key, data: cfg.products[key] };
        break;
      }
    }
    var res = document.getElementById('sku-result');
    if (!res) return;
    if (found) {
      res.innerHTML = '<div class="ctile" style="margin-top:10px">' +
        '<div class="ctile-n">' + found.data.name + '</div>' +
        '<div class="ctile-v">RRP: ' + fmtGBP(found.data.rrp) + ' &nbsp;|&nbsp; COGS: ' + fmtGBP(found.data.cogs) + '</div>' +
        '<div class="ctile-o">Max CPA: ' + fmtGBP(cfg.maxCPA[found.line]) + '</div>' +
        '</div>';
    } else {
      res.innerHTML = '<div class="nodata" style="margin-top:8px">No match for "' + q + '"</div>';
    }
  }

  // ── Team Goals scoring ─────────────────────────────────────────

  var SCORE_KEYS = ['ceo', 'ops', 'mkt', 'bx'];

  function applyScoreClass(el, val) {
    el.classList.remove('score-hi', 'score-mid', 'score-lo');
    if (val >= 7) el.classList.add('score-hi');
    else if (val >= 4) el.classList.add('score-mid');
    else el.classList.add('score-lo');
  }

  function loadScores() {
    for (var i = 0; i < SCORE_KEYS.length; i++) {
      var role = SCORE_KEYS[i];
      var el = document.getElementById('score-' + role);
      if (!el) continue;
      var stored = localStorage.getItem('eden_score_' + role);
      if (stored) {
        el.textContent = stored;
        applyScoreClass(el, parseInt(stored));
      } else {
        applyScoreClass(el, parseInt(el.textContent) || 5);
      }
    }
    updateTeamAvg();
  }

  function editScore(role) {
    var el = document.getElementById('score-' + role);
    if (!el) return;
    var current = parseInt(el.textContent) || 5;
    el.classList.add('editing');
    el.contentEditable = 'true';
    el.focus();

    var range = document.createRange();
    range.selectNodeContents(el);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);

    function finish() {
      el.contentEditable = 'false';
      el.classList.remove('editing');
      var val = parseInt(el.textContent);
      if (isNaN(val) || val < 1) val = 1;
      if (val > 10) val = 10;
      el.textContent = val;
      localStorage.setItem('eden_score_' + role, val);
      applyScoreClass(el, val);
      updateTeamAvg();
      el.removeEventListener('blur', finish);
      el.removeEventListener('keydown', keyHandler);
    }

    function keyHandler(e) {
      if (e.key === 'Enter') { e.preventDefault(); finish(); }
      if (e.key === 'Escape') { el.textContent = current; finish(); }
      if (!/[0-9]|Backspace|Delete|ArrowLeft|ArrowRight/.test(e.key)) e.preventDefault();
    }

    el.addEventListener('blur', finish);
    el.addEventListener('keydown', keyHandler);
  }

  function updateTeamAvg() {
    var scores = SCORE_KEYS.map(function (r) {
      var el = document.getElementById('score-' + r);
      return el ? parseInt(el.textContent) || 5 : 5;
    });
    var avg = scores.reduce(function (a, b) { return a + b; }, 0) / scores.length;
    var avgRound = Math.round(avg * 10) / 10;

    var display = document.getElementById('team-avg-display');
    var bar = document.getElementById('team-bar');
    var insight = document.getElementById('team-insight');

    if (display) display.textContent = avgRound.toFixed(1);
    if (bar) bar.style.width = (avg * 10) + '%';
    if (insight) {
      if (avg >= 8) insight.textContent = 'Strong week — team performing well';
      else if (avg >= 6) insight.textContent = 'Good week — keep momentum';
      else if (avg >= 4) insight.textContent = 'Mixed week — identify blockers';
      else insight.textContent = 'Tough week — regroup and refocus';
      if (bar) {
        bar.style.background = avg >= 7 ? 'var(--GL)' : avg >= 4 ? '#f0c040' : '#f07070';
      }
    }
  }

  // ── Live clock ─────────────────────────────────────────────────

  function updateClock() {
    var el = document.querySelector('.htime');
    if (!el) return;
    var now = new Date();
    var months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    var d = now.getDate();
    var m = months[now.getMonth()];
    var y = now.getFullYear();
    var h = now.getHours();
    var mn = now.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    el.innerHTML = d + ' ' + m + ' ' + y + '<br>' + h + ':' + (mn < 10 ? '0' : '') + mn + ' ' + ampm;
  }

  // ── Formatting helpers ─────────────────────────────────────────

  function fmt(n) {
    return '£' + Math.round(n).toLocaleString('en-GB');
  }

  function fmtGBP(n) {
    return '£' + n.toFixed(2);
  }

  // ── Data load and render ───────────────────────────────────────

  /**
   * Initialise the dashboard: fetch live data, transform, render all tabs.
   */
  function init() {
    // Run clock
    updateClock();
    setInterval(updateClock, 60000);

    // Init scenario calc
    calc();

    // Load stored scores
    loadScores();

    // Load data — prefer pre-built cache, fall back to CSV fetch
    if (window.EDEN._ordersCache && window.EDEN._ordersCache.length > 0) {
      console.log('[EDEN] Using orders cache:', window.EDEN._ordersCache.length, 'rows | Built:', window.EDEN._ordersCacheDate || 'unknown');
      var raw = {
        salesLog: window.EDEN._ordersCache,
        stock: [],
        componentStock: [],
        skuMap: []
      };
      if (window.EDEN.transform) {
        var data = window.EDEN.transform.transformData(raw);
        window.EDEN._data = data;
        renderAll(data);
      }
    } else if (window.EDEN.sheets && window.EDEN.CONFIG) {
      console.log('[EDEN] No cache found, fetching from CSV...');
      window.EDEN.sheets.fetchAllSheets()
        .then(function (raw) {
          console.log('[EDEN] Raw fetch results:',
            'salesLog:', raw.salesLog.length,
            '| stock:', raw.stock.length
          );
          if (window.EDEN.transform) {
            var data = window.EDEN.transform.transformData(raw);
            window.EDEN._data = data;
            renderAll(data);
          }
        })
        .catch(function (err) {
          console.warn('[EDEN] Data load failed:', err);
        });
    }
  }

  /**
   * Render all tab components with live data.
   * Each component stub receives the full data object.
   * @param {Object} data - Transformed data from transform.js
   */
  function renderAll(data) {
    // Components may be registered under EDEN.components.X or EDEN.X
    var components = ['overview', 'marketing', 'klaviyo', 'google-ads', 'amazon', 'platforms', 'operations', 'customers', 'goals', 'scenario'];
    for (var i = 0; i < components.length; i++) {
      var name = components[i];
      if (!window.EDEN[name] && window.EDEN.components && window.EDEN.components[name]) {
        window.EDEN[name] = window.EDEN.components[name];
      }
      if (window.EDEN[name] && typeof window.EDEN[name].render === 'function') {
        try {
          window.EDEN[name].render(data);
        } catch (e) {
          console.warn('[EDEN] Render failed for ' + name + ':', e);
        }
      }
    }
  }

  // ── Ad spend accumulator + TACOS tile refresh ──────────────────

  window.EDEN._adSpend = { google: 0, amazon: 0, meta: 0 };

  window.EDEN.refreshAdTiles = function () {
    var sp    = window.EDEN._adSpend || {};
    var total = (sp.google || 0) + (sp.amazon || 0) + (sp.meta || 0);
    if (total === 0) return;

    var data = window.EDEN._data;
    if (!data || !data.orders) return;

    var m   = window.EDEN.metrics;
    var cfg = window.EDEN.CONFIG;
    if (!m) return;

    var mtd    = m.getMTDOrders(data.orders.filter(function (o) {
      return o.status !== 'cancelled' && o.status !== 'on_hold';
    }));
    var revMTD = mtd.reduce(function (s, o) { return s + o.amount_paid; }, 0);
    if (revMTD === 0) return;

    var tacosPct  = (total / revMTD) * 100;
    var tacosDisp = Math.round(tacosPct * 10) / 10 + '%';
    var tacosRag  = cfg ? m.ragStatus(tacosPct, cfg.rag.tacos_pct) : 'a';
    var tacosCol  = tacosRag === 'g' ? 'var(--OK)' : tacosRag === 'a' ? 'var(--AMB)' : 'var(--RED)';
    var spendFmt  = '£' + Math.round(total).toLocaleString('en-GB');

    function setEl(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; }
    function setWidth(id, w) { var e = document.getElementById(id); if (e) e.style.width = w; }
    function setCls(id, cls) { var e = document.getElementById(id); if (e) e.className = 'tile ' + cls; }

    var tileCls = tacosRag === 'g' ? 'tg' : tacosRag === 'a' ? 'ta' : 'tr';

    // Overview TACOS tile
    setEl('ov-tacos-val',     tacosDisp);
    setEl('ov-tacos-meta',    spendFmt + ' total ad spend MTD');
    setEl('ov-tacos-insight', '');
    setWidth('ov-tacos-bar', Math.min(tacosPct / 25 * 100, 100) + '%');
    var ovBar = document.getElementById('ov-tacos-bar');
    if (ovBar) ovBar.style.background = tacosCol;
    setCls('ov-tacos-tile', tileCls);

    // Marketing TACOS tile
    setEl('mkt-tacos-val',  tacosDisp);
    setEl('mkt-tacos-meta', spendFmt + ' total ad spend MTD');
    setWidth('mkt-tacos-bar', Math.min(tacosPct / 25 * 100, 100) + '%');
    var mktTacosTile = document.getElementById('mkt-tacos-tile');
    if (mktTacosTile) mktTacosTile.className = 'tile ' + tileCls;

    // Blended ROAS = total revenue / total ad spend
    var roas     = total > 0 ? revMTD / total : 0;
    var roasDisp = roas.toFixed(1) + 'x';
    var roasRag  = roas >= 4 ? 'g' : roas >= 2 ? 'a' : 'r';
    var roasCls  = roasRag === 'g' ? 'tg' : roasRag === 'a' ? 'ta' : 'tr';
    var roasCol  = roasRag === 'g' ? 'var(--OK)' : roasRag === 'a' ? 'var(--AMB)' : 'var(--RED)';
    var revFmt   = '£' + Math.round(revMTD).toLocaleString('en-GB');

    // Marketing Blended ROAS tile
    setEl('mkt-roas-val',  roasDisp);
    setEl('mkt-roas-meta', spendFmt + ' ad spend · ' + revFmt + ' revenue');
    setWidth('mkt-roas-bar', Math.min(roas / 5 * 100, 100) + '%');
    var mktRoasBar = document.getElementById('mkt-roas-bar');
    if (mktRoasBar) mktRoasBar.style.background = roasCol;
    var mktRoasTile = document.getElementById('mkt-roas-tile');
    if (mktRoasTile) mktRoasTile.className = 'tile ' + roasCls;
    setEl('mkt-roas-status', roasRag === 'g' ? '✓ On target' : roasRag === 'a' ? '⚠ Monitor' : '✕ Below target');

    // Overview ROAS card
    setEl('ov-roas-rev',   revFmt);
    setEl('ov-roas-spend', spendFmt);
    setEl('ov-roas-val',   roasDisp);
    var ovRoasBar = document.getElementById('ov-roas-bar');
    if (ovRoasBar) { ovRoasBar.style.width = Math.min(roas / 5 * 100, 100) + '%'; ovRoasBar.style.background = roasCol; }
    var ovRoasInsight = document.getElementById('ov-roas-insight');
    if (ovRoasInsight) { ovRoasInsight.textContent = roasRag === 'g' ? 'On target — holding 4x+' : roas >= 2 ? 'Below 4x target — review spend allocation' : 'Below baseline — pause underperforming campaigns'; ovRoasInsight.style.color = roasCol; }
  };

  // ── Expose public API ──────────────────────────────────────────

  window.EDEN.app = { init: init, renderAll: renderAll };

  // Also expose functions called inline from HTML attributes
  window.showTab          = showTab;
  window.openDrawer       = openDrawer;
  window.closeDrawer      = closeDrawer;
  window.dimDrawerAlert   = dimDrawerAlert;
  window.calc             = calc;
  window.tog              = tog;

  window.skuLookup        = skuLookup;
  window.editScore        = editScore;

  window.setCPAView = function (view) {
    var gv = document.getElementById('cpa-google-view');
    var av = document.getElementById('cpa-amazon-view');
    if (gv) gv.style.display = view === 'google' ? '' : 'none';
    if (av) av.style.display = view === 'amazon' ? '' : 'none';
    var btns = document.querySelectorAll('.ktog .kb[onclick*="setCPAView"]');
    btns.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('onclick').includes("'" + view + "'"));
    });
  };

  // Init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
