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
  function injectStockOrderByDates() {
    var today = new Date();
    // Find stock table rows that have a lead time cell but no order-by date yet
    var rows = document.querySelectorAll('#tab-operations .dt tbody tr:not(.detrow)');
    rows.forEach(function(row) {
      var cells = row.querySelectorAll('td');
      if (cells.length < 6) return;
      // Lead time is in the 6th cell (index 5), safety stock in 7th (index 6)
      var leadCell = cells[5];
      var leadText = leadCell ? leadCell.textContent.trim() : '';
      var match = leadText.match(/(\d+)/);
      if (!match) return;
      // Check if order-by cell already exists (8th cell added manually)
      if (cells.length >= 8) return;
      var leadDays = parseInt(match[1]);
      var orderBy = new Date(today);
      orderBy.setDate(orderBy.getDate() + leadDays);
      var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      var label = orderBy.getDate() + ' ' + months[orderBy.getMonth()];
      var urgency = leadDays <= 10 ? 'color:var(--AMB);font-weight:700' : 'color:var(--GMD)';
      var td = document.createElement('td');
      td.className = 'r';
      td.setAttribute('style', urgency);
      td.textContent = label;
      // Insert before last cell (the expbtn)
      var lastCell = cells[cells.length - 1];
      row.insertBefore(td, lastCell);
    });
  }

  function init() {
    // Run clock
    updateClock();
    setInterval(updateClock, 60000);

    // Init scenario calc
    calc();

    // Load stored scores
    loadScores();

    // Init DVE log
    dvRenderLog();
    dvScore();

    // Inject Order By dates into stock table
    injectStockOrderByDates();

    // Data timestamps and freshness banner
    updateDataTimestamps();
    checkDataFreshness();

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
        window.EDEN._allOrders = data.orders || [];
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
            window.EDEN._allOrders = data.orders || [];
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

  window.rvSwitch = function (channel, btn) {
    document.querySelectorAll('.rv-pane').forEach(function (p) { p.classList.remove('active'); });
    var pane = document.getElementById('rv-' + channel);
    if (pane) pane.classList.add('active');
    if (btn) {
      btn.closest('.ktog').querySelectorAll('.kb').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
    }
  };

  // ── Dream Value Equation ──────────────────────────────────────────

  var _dveLog = JSON.parse(localStorage.getItem('eden_dve_log') || '[]');

  function dvScore() {
    var dEl = document.getElementById('dve-dream');
    var lEl = document.getElementById('dve-likely');
    var tEl = document.getElementById('dve-time');
    var eEl = document.getElementById('dve-effort');
    if (!dEl || !lEl || !tEl || !eEl) return;
    var dream  = parseInt(dEl.value)  || 5;
    var likely = parseInt(lEl.value) || 5;
    var time   = parseInt(tEl.value)   || 5;
    var effort = parseInt(eEl.value) || 5;
    var score  = Math.round((dream * likely) / (time * effort) * 100) / 100;
    var scoreEl   = document.getElementById('dve-score');
    var verdictEl = document.getElementById('dve-verdict');
    var adviceEl  = document.getElementById('dve-advice');
    if (!scoreEl) return;
    scoreEl.textContent = score.toFixed(2);
    var verdict, advice;
    if (score >= 4)      { verdict = 'Exceptional — use as a creative brief'; advice = 'This hook resolves all four tensions. Replicate the format, emotion, and immediacy in future content.'; }
    else if (score >= 2) { verdict = 'Strong post — worth scaling'; advice = 'Good outcome and believability. Reduce perceived effort (clearer CTA, faster delivery messaging) to push score higher.'; }
    else if (score >= 1) { verdict = 'Average — room to improve'; advice = dream < 5 ? 'Strengthen the outcome — show the moment of giving, the recipient reaction, the emotional result.' : likely < 5 ? 'Make it more believable — use real UGC, real names, real occasions.' : time > 6 ? 'Reduce time friction — lead with "arrives tomorrow" or "order today".' : 'Simplify the call to action. Fewer steps between scroll and checkout.'; }
    else                 { verdict = 'Low impact — reconsider'; advice = 'Score below 1. The post either lacks emotional pull or creates too much friction. Rethink the hook before publishing.'; }
    verdictEl.textContent = verdict;
    adviceEl.textContent  = advice;
  }

  function dvSave() {
    var post    = (document.getElementById('dve-post')     || {}).value || '';
    var plat    = (document.getElementById('dve-platform') || {}).value || '';
    var occ     = (document.getElementById('dve-occasion') || {}).value || '';
    var dream   = parseInt((document.getElementById('dve-dream')  || {value:'5'}).value) || 5;
    var likely  = parseInt((document.getElementById('dve-likely') || {value:'5'}).value) || 5;
    var time    = parseInt((document.getElementById('dve-time')   || {value:'5'}).value) || 5;
    var effort  = parseInt((document.getElementById('dve-effort') || {value:'5'}).value) || 5;
    var score   = Math.round((dream * likely) / (time * effort) * 100) / 100;
    var entry   = { date: new Date().toLocaleDateString('en-GB'), plat: plat, occ: occ, post: post.slice(0, 80), dream: dream, likely: likely, time: time, effort: effort, score: score };
    _dveLog.unshift(entry);
    localStorage.setItem('eden_dve_log', JSON.stringify(_dveLog.slice(0, 50)));
    dvRenderLog();
  }

  function dvRenderLog() {
    var body = document.getElementById('dve-log-body');
    if (!body) return;
    if (!_dveLog.length) {
      body.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--GMD);padding:16px">No posts analysed yet.</td></tr>';
      return;
    }
    body.innerHTML = _dveLog.map(function(e, i) {
      var cls = e.score >= 4 ? 'rowg' : e.score >= 2 ? '' : e.score >= 1 ? 'rowa' : 'rowr';
      return '<tr class="' + cls + '">'
        + '<td>' + e.plat + '</td>'
        + '<td>' + e.occ + '</td>'
        + '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + e.post + '</td>'
        + '<td class="r">' + e.dream + '</td>'
        + '<td class="r">' + e.likely + '</td>'
        + '<td class="r">' + e.time + '</td>'
        + '<td class="r">' + e.effort + '</td>'
        + '<td class="r"><strong>' + e.score.toFixed(2) + '</strong></td>'
        + '<td><span style="cursor:pointer;color:var(--GMD);font-size:10px" onclick="dvDelete(' + i + ')">remove</span></td>'
        + '</tr>';
    }).join('');
  }

  function dvDelete(i) {
    _dveLog.splice(i, 1);
    localStorage.setItem('eden_dve_log', JSON.stringify(_dveLog));
    dvRenderLog();
  }

  window.dvScore  = dvScore;
  window.dvSave   = dvSave;
  window.dvDelete = dvDelete;

  // ── Status Panel ──────────────────────────────────────────────────

  function fmtAge(isoStr) {
    if (!isoStr) return null;
    var d = new Date(isoStr.replace(' ', 'T').replace(' UTC', 'Z'));
    if (isNaN(d)) return null;
    var mins = Math.floor((Date.now() - d) / 60000);
    if (mins < 2)   return 'Just now';
    if (mins < 60)  return mins + 'm ago';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24)   return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  }

  function buildStatusPanel() {
    var TP    = window.EDEN && window.EDEN.teamPulse;
    var mkt   = window.EDEN && window.EDEN._marketingData;
    var spend = window.EDEN && window.EDEN._adSpend;
    var ordTs = window.EDEN && window.EDEN._ordersCacheDate;

    var sources = [
      { name: 'Sales Log',           ts: ordTs,                                   maxH: 24 },
      { name: 'Typeform Data',        ts: mkt && mkt._built,                       maxH: 48 },
      { name: 'Google PPC',           ts: spend && spend.google_updated,            maxH: 25 },
      { name: 'Google Reviews',       ts: mkt && mkt.gbp_reviews && mkt.gbp_reviews.last_updated,  maxH: 168 },
      { name: 'Amazon',               ts: spend && spend.amazon_updated,            maxH: 25 },
      { name: 'Meta',                 ts: spend && spend.meta_updated,              maxH: 25 },
      { name: 'Team Pulse Tasks',     ts: TP && TP.generated,                      maxH: 168 },
      { name: 'Corporate Pipeline',   ts: mkt && mkt._built,                       maxH: 48 },
      { name: 'Stock Data',            ts: window.EDEN._stockCacheDate,             maxH: 168 },
      { name: 'Klaviyo',              ts: window.EDEN._klaviyoData && window.EDEN._klaviyoData._built, maxH: 48 },
      { name: 'Social Platforms',     ts: null,                                    maxH: 0 }
    ];

    var worstCls = 'g';
    var rows = sources.map(function(s) {
      var age = fmtAge(s.ts);
      var cls = 'r';
      if (!s.ts) {
        cls = 'r';
      } else {
        var hrs = (Date.now() - new Date(s.ts.replace(' ','T').replace(' UTC','Z'))) / 3600000;
        cls = hrs <= s.maxH ? 'g' : hrs <= s.maxH * 2 ? 'a' : 'r';
      }
      if (cls === 'r' && worstCls !== 'r') worstCls = 'r';
      else if (cls === 'a' && worstCls === 'g') worstCls = 'a';
      return '<div class="sp-row">'
        + '<div class="sp-dot ' + (cls === 'g' ? '' : cls) + '"></div>'
        + '<div class="sp-name">' + s.name + '</div>'
        + '<div class="sp-time">' + (age || 'Not loaded') + '</div>'
        + '</div>';
    }).join('');

    var rowsEl = document.getElementById('sp-rows');
    if (rowsEl) rowsEl.innerHTML = rows;
    var dot = document.getElementById('status-dot');
    if (dot) { dot.className = 'status-dot' + (worstCls !== 'g' ? ' ' + worstCls : ''); }
  }

  function toggleStatusPanel(e) {
    if (e) e.stopPropagation();
    buildStatusPanel();
    var panel = document.getElementById('status-panel');
    if (panel) panel.classList.toggle('open');
  }

  document.addEventListener('click', function(e) {
    var panel = document.getElementById('status-panel');
    if (!panel) return;
    if (!e.target.closest('.status-btn') && !e.target.closest('.status-panel')) {
      panel.classList.remove('open');
    }
  });

  window.toggleStatusPanel = toggleStatusPanel;

  // ── Data timestamps ───────────────────────────────────────────────

  function updateDataTimestamps() {
    var now = Date.now();
    var H24 = 24 * 60 * 60 * 1000;
    var H48 = 48 * 60 * 60 * 1000;

    function setTs(id, isoStr, maxMs) {
      var el = document.getElementById(id);
      if (!el) return;
      if (!isoStr) { el.textContent = 'Not loaded'; el.className = 'data-ts stale'; return; }
      var d = new Date(isoStr);
      var age = now - d.getTime();
      var label = fmtTsAge(age);
      el.textContent = 'Updated ' + label;
      el.className = 'data-ts ' + (age > maxMs ? 'stale' : 'ok');
    }

    function fmtTsAge(ms) {
      var h = Math.floor(ms / 3600000);
      if (h < 1) return 'just now';
      if (h < 24) return h + 'h ago';
      return Math.floor(h / 24) + 'd ago';
    }

    var ad = window.EDEN._adSpend || {};
    var mkt = window.EDEN._marketingData || {};
    setTs('ts-google-ppc', ad.google_updated, H24);
    setTs('ts-amazon-ppc', ad.amazon_updated, H24);
    setTs('ts-meta-ppc', ad.meta_updated, H24);
    var klvDate = (window.EDEN._klaviyoData && window.EDEN._klaviyoData._built) || (mkt.klaviyo && mkt.klaviyo.updated) || mkt._built || null;
    setTs('ts-klaviyo', klvDate, H48);
  }

  // ── Staleness alert banner ────────────────────────────────────────

  var FRESHNESS_SOURCES = [
    { name: 'Sales Log',      ts: function(){ return (window.EDEN._ordersCacheDate || null); },      maxH: 24 },
    { name: 'Stock Data',     ts: function(){ return (window.EDEN._stockCacheDate || null); },       maxH: 168 },
    { name: 'Team Pulse',     ts: function(){ var tp=window.EDEN.teamPulse; return tp && tp.generated; }, maxH: 168 },
    { name: 'Google PPC',     ts: function(){ return (window.EDEN._adSpend||{}).google_updated; },   maxH: 24 },
    { name: 'Amazon PPC',     ts: function(){ return (window.EDEN._adSpend||{}).amazon_updated; },   maxH: 24 },
    { name: 'Meta PPC',       ts: function(){ return (window.EDEN._adSpend||{}).meta_updated; },     maxH: 24 },
    { name: 'Google Reviews', ts: function(){ var m=window.EDEN._marketingData; return m && m.gbp_reviews && m.gbp_reviews.last_updated; }, maxH: 168 },
    { name: 'Klaviyo',        ts: function(){ return (window.EDEN._klaviyoData||{})._built || null; }, maxH: 48 }
  ];

  function checkDataFreshness() {
    var now = Date.now();
    var stale = [];
    FRESHNESS_SOURCES.forEach(function(s) {
      var ts = s.ts();
      if (!ts) { stale.push(s.name + ' (not loaded)'); return; }
      var age = now - new Date(ts).getTime();
      if (age > s.maxH * 3600000) {
        var h = Math.floor(age / 3600000);
        stale.push(s.name + ' (' + (h < 24 ? h + 'h' : Math.floor(h/24) + 'd') + ' old)');
      }
    });
    // Banner hidden — status drawer (Shift+L / status icon) is the freshness indicator
    var banner = document.getElementById('stale-banner');
    if (banner) banner.style.display = 'none';
  }

  // ── Sync log loader ───────────────────────────────────────────────

  window.EDEN.loadSyncLog = function() {
    var el = document.getElementById('sync-log-content');
    if (!el) return;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'data/sync.log?_=' + Date.now(), true);
    xhr.onload = function() {
      if (xhr.status === 200) {
        var lines = xhr.responseText.trim().split('\n');
        el.textContent = lines.slice(-50).join('\n');
      } else {
        el.textContent = 'Log not found. Run scripts/daily-rebuild.sh to generate.';
      }
    };
    xhr.onerror = function() { el.textContent = 'Could not load sync log.'; };
    xhr.send();
  };

  // Init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
