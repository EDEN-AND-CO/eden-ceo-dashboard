/**
 * EDEN & CO. CEO Flight Deck - Overview Tab Renderer
 * Injects live Sales Log data into all Overview panel elements.
 *
 * Elements updated:
 *   Tile 1: Total Revenue MTD, sparkline, vs prior, progress bar
 *   Tile 2: Contribution Margin %, sparkline, vs prior
 *   Tile 3: Retained Profit MTD (revenue after COGS + commission), vs opex
 *   Platform split bars: Shopify, Amazon, Other vs targets
 *   AOV tile: value, vs target, RAG
 *   30-day charts: revenue trend, margin trend (SVG polylines)
 *   Order chips: total orders MTD, orders/day, goal pace
 */
window.EDEN = window.EDEN || {};

(function () {
  'use strict';

  var m   = null; // metrics namespace, resolved at render time
  var cfg = null; // config namespace
  var _ovMode = 'mtd'; // 'mtd' | 'lastmonth'

  // ── Formatting helpers ─────────────────────────────────────────

  function fmtGBP(n) {
    if (n >= 1000) return '£' + Math.round(n).toLocaleString('en-GB');
    return '£' + Math.round(n);
  }

  function fmtPct(n, dp) {
    return (Math.round(n * Math.pow(10, dp || 1)) / Math.pow(10, dp || 1)).toFixed(dp || 1) + '%';
  }

  function fmtChange(pct) {
    var rounded = Math.round(Math.abs(pct) * 10) / 10;
    if (pct > 0) return { label: '\u2191 ' + rounded + '% vs last period', cls: 'up' };
    if (pct < 0) return { label: '\u2193 ' + rounded + '% vs last period', cls: 'dn' };
    return { label: '\u2015 0% vs last period', cls: 'fl' };
  }

  function ragClass(rag) {
    return rag === 'g' ? 'g' : rag === 'a' ? 'a' : 'r';
  }

  function ragLabel(rag, name) {
    if (rag === 'g') return 'ON TRACK';
    if (rag === 'a') return 'WATCH';
    return name ? name.toUpperCase() + ' ALERT' : 'ALERT';
  }

  // ── DOM helpers ────────────────────────────────────────────────

  function setHTML(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function setStyle(id, prop, val) {
    var el = document.getElementById(id);
    if (el) el.style[prop] = val;
  }

  function setClass(id, removeClass, addClass) {
    var el = document.getElementById(id);
    if (!el) return;
    if (removeClass) {
      var remove = removeClass.split(' ');
      for (var i = 0; i < remove.length; i++) el.classList.remove(remove[i]);
    }
    if (addClass) {
      var add = addClass.split(' ');
      for (var j = 0; j < add.length; j++) { if (add[j]) el.classList.add(add[j]); }
    }
  }

  // ── SVG sparkline builder ──────────────────────────────────────

  /**
   * Build SVG polyline points string from an array of values.
   * Maps values into a 200x32 viewBox.
   * @param {number[]} values
   * @returns {string} SVG points attribute value
   */
  function buildSparkPoints(values, w, h) {
    w = w || 200; h = h || 32;
    if (!values || values.length === 0) return '';
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var range = max - min || 1;
    var pad = 3;
    return values.map(function (v, i) {
      var x = Math.round((i / (values.length - 1)) * w);
      var y = Math.round(h - pad - ((v - min) / range) * (h - pad * 2));
      return x + ',' + y;
    }).join(' ');
  }

  /**
   * Build a two-series comparison sparkline SVG string (current vs prior).
   * Returns the inner SVG content (polylines + hover overlay), not the outer tag.
   */
  function buildComparisonSpark(current, prior) {
    var allVals = current.concat(prior);
    var min = Math.min.apply(null, allVals);
    var max = Math.max.apply(null, allVals);
    var range = max - min || 1;
    var w = 300; var h = 110; var pad = 8;

    function pts(vals) {
      return vals.map(function (v, i) {
        var x = Math.round((i / (vals.length - 1)) * w);
        var y = Math.round(h - pad - ((v - min) / range) * (h - pad * 2));
        return x + ',' + y;
      }).join(' ');
    }

    var lastY = Math.round(h - pad - ((current[current.length - 1] - min) / range) * (h - pad * 2));

    return '<polyline points="' + pts(prior) + '" fill="none" stroke="var(--GL)" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.5"/>' +
      '<polyline points="' + pts(current) + '" fill="none" stroke="var(--G)" stroke-width="2" stroke-linejoin="round"/>' +
      '<circle cx="' + w + '" cy="' + lastY + '" r="4" fill="var(--G)"/>' +
      '<rect class="chart-overlay" x="0" y="0" width="300" height="94" fill="transparent" style="cursor:crosshair"/>' +
      '<g class="chart-hover" visibility="hidden">' +
        '<line class="hv-line" x1="0" y1="0" x2="0" y2="94" stroke="var(--GMD)" stroke-width="1" stroke-dasharray="3,2" opacity="0.6"/>' +
        '<circle class="hv-dot-cur" cx="0" cy="0" r="4" fill="var(--G)" stroke="white" stroke-width="1.5"/>' +
        '<circle class="hv-dot-pri" cx="0" cy="0" r="3" fill="var(--GL)" stroke="var(--GMD)" stroke-width="1"/>' +
        '<rect class="hv-bg" x="0" y="0" width="92" height="36" rx="3" fill="white" stroke="var(--GL)" stroke-width="1" opacity="0.97"/>' +
        '<text class="hv-date" x="0" y="0" font-size="8" fill="var(--GMD)" font-family="Josefin Sans,sans-serif"></text>' +
        '<text class="hv-cur" x="0" y="0" font-size="9" fill="var(--G)" font-family="Josefin Sans,sans-serif" font-weight="700"></text>' +
        '<text class="hv-pri" x="0" y="0" font-size="8" fill="var(--GMD)" font-family="Josefin Sans,sans-serif"></text>' +
      '</g>';
  }

  /**
   * Attach mousemove hover tooltip to a comparison chart SVG.
   * @param {string} svgId
   * @param {number[]} current - 30 values
   * @param {number[]} prior   - 30 values (offset 30 days back)
   * @param {Function} formatFn - formats a value for display
   */
  function attachChartHover(svgId, current, prior, formatFn) {
    var svg = document.getElementById(svgId);
    if (!svg) return;
    var overlay    = svg.querySelector('.chart-overlay');
    var hg         = svg.querySelector('.chart-hover');
    if (!overlay || !hg) return;

    var hvLine  = hg.querySelector('.hv-line');
    var dotCur  = hg.querySelector('.hv-dot-cur');
    var dotPri  = hg.querySelector('.hv-dot-pri');
    var hvBg    = hg.querySelector('.hv-bg');
    var hvDate  = hg.querySelector('.hv-date');
    var hvCur   = hg.querySelector('.hv-cur');
    var hvPri   = hg.querySelector('.hv-pri');

    var W = 300; var H = 94; var pad = 8;
    var allVals = current.concat(prior);
    var minV = Math.min.apply(null, allVals);
    var maxV = Math.max.apply(null, allVals);
    var rangeV = maxV - minV || 1;
    var days = current.length;
    var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    function yFor(v) {
      return Math.round(H - pad - ((v - minV) / rangeV) * (H - pad * 2));
    }

    overlay.addEventListener('mousemove', function (e) {
      var rect = svg.getBoundingClientRect();
      var pct  = (e.clientX - rect.left) / rect.width;
      var idx  = Math.max(0, Math.min(days - 1, Math.round(pct * (days - 1))));
      var svgX = Math.round((idx / (days - 1)) * W);
      var curV = current[idx]; var priV = prior[idx];
      var curY = yFor(curV);   var priY = yFor(priV);

      var d = new Date(new Date().getTime() - (days - 1 - idx) * 86400000);
      var dateLabel = d.getDate() + ' ' + MON[d.getMonth()];

      var boxW = 92;
      var boxX = svgX + 10;
      if (boxX + boxW > W) boxX = svgX - boxW - 10;
      var boxY = 4;

      hvLine.setAttribute('x1', svgX); hvLine.setAttribute('x2', svgX);
      dotCur.setAttribute('cx', svgX); dotCur.setAttribute('cy', curY);
      dotPri.setAttribute('cx', svgX); dotPri.setAttribute('cy', priY);
      hvBg.setAttribute('x', boxX);    hvBg.setAttribute('y', boxY);
      hvDate.setAttribute('x', boxX + 6); hvDate.setAttribute('y', boxY + 11);
      hvDate.textContent = dateLabel;
      hvCur.setAttribute('x', boxX + 6);  hvCur.setAttribute('y', boxY + 22);
      hvCur.textContent = formatFn(curV) + ' (now)';
      hvPri.setAttribute('x', boxX + 6);  hvPri.setAttribute('y', boxY + 32);
      hvPri.textContent = formatFn(priV) + ' (prior)';

      hg.setAttribute('visibility', 'visible');
    });

    overlay.addEventListener('mouseleave', function () {
      hg.setAttribute('visibility', 'hidden');
    });
  }

  /** Add intermediate x-axis date labels to a chart SVG at 33% and 67%. */
  function addChartMidLabels(svgId, days) {
    var svg = document.getElementById(svgId);
    if (!svg) return;
    var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    [Math.round(days * 0.33), Math.round(days * 0.67)].forEach(function (idx) {
      var d = new Date(new Date().getTime() - (days - 1 - idx) * 86400000);
      var label = d.getDate() + ' ' + MON[d.getMonth()];
      var x = Math.round((idx / (days - 1)) * 300);
      var t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', x - 10);
      t.setAttribute('y', '106');
      t.setAttribute('font-size', '9');
      t.setAttribute('fill', '#6D6E71');
      t.setAttribute('font-family', 'Josefin Sans,sans-serif');
      t.setAttribute('opacity', '0.7');
      t.textContent = label;
      svg.appendChild(t);
    });
  }

  // ── Channel grouping helper ────────────────────────────────────

  /**
   * Group orders by channel category: Shopify, Amazon, Other.
   * Returns revenue totals for each.
   */
  function channelGroupRevenue(orders) {
    var shopify = 0; var amazon = 0; var other = 0;
    for (var i = 0; i < orders.length; i++) {
      var o = orders[i];
      var ch = o.channel || '';
      if (ch === 'Shopify') shopify += o.amount_paid;
      else if (ch === 'Amazon UK' || ch === 'Amazon IRE') amazon += o.amount_paid;
      else other += o.amount_paid;
    }
    return { shopify: shopify, amazon: amazon, other: other };
  }

  // ── Main render ────────────────────────────────────────────────

  function render(data) {
    m = window.EDEN.metrics;
    cfg = window.EDEN.CONFIG;

    if (!m || !cfg || !data || !data.orders) {
      console.warn('[EDEN Overview] Missing dependencies or data');
      return;
    }

    var now = new Date();

    var orders = data.orders.filter(function (o) {
      return o.status !== 'cancelled' && o.status !== 'on_hold';
    });

    // ── Mode: MTD (current) or full last calendar month ──
    var isLastMonth = _ovMode === 'lastmonth';
    var mtd, priorMTD, daysElapsed, daysInMonthN, periodLabel, priorLabel;

    if (isLastMonth) {
      mtd      = m.getFullLastMonthOrders(orders);
      priorMTD = m.getFullPreviousMonthOrders(orders);
      var lmDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      var pmDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      periodLabel = MONTHS[lmDate.getMonth()] + ' ' + lmDate.getFullYear();
      priorLabel  = MONTHS[pmDate.getMonth()] + ' ' + pmDate.getFullYear();
      daysInMonthN = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      daysElapsed  = daysInMonthN; // full month
    } else {
      mtd      = m.getMTDOrders(orders);
      priorMTD = m.getPriorMTDOrders(orders);
      periodLabel = null;
      priorLabel  = 'last period';
      daysElapsed  = now.getDate();
      daysInMonthN = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    }

    // Update mode banner
    var banner = document.getElementById('ov-mode-banner');
    if (banner) {
      if (isLastMonth) {
        banner.style.display = 'flex';
        banner.innerHTML = '<span style="font-weight:700;color:var(--G)">' + periodLabel + ' — Full Month</span>'
          + '<span style="color:var(--GMD);margin-left:8px">vs ' + priorLabel + '</span>'
          + '<span style="margin-left:auto;font-size:10px;color:var(--GMD)">Toggle to return to current month</span>';
      } else {
        banner.style.display = 'none';
      }
    }

    // Update section label
    var secLbl = document.getElementById('ov-period-label');
    if (secLbl) secLbl.textContent = isLastMonth ? (periodLabel + ' — full month comparison') : 'Month to date — primary performance';

    console.log('[EDEN Overview] Mode:', _ovMode, '| Orders:', mtd.length, '| Prior:', priorMTD.length);

    // ── Revenue ──
    var revMTD       = m.totalRevenue(mtd);
    var revPriorMTD  = m.totalRevenue(priorMTD);
    var revChange    = m.pctChange(revMTD, revPriorMTD);
    var proratedTarget = cfg.targets.monthly_revenue * (isLastMonth ? 1 : (daysElapsed / daysInMonthN));
    var revRag       = m.ragStatus(revMTD, { green: proratedTarget, amber: proratedTarget * 0.85, red: proratedTarget * 0.65 });
    var revPct       = Math.min(100, Math.round((revMTD / proratedTarget) * 100));
    var revChg       = fmtChange(revChange);

    var vsLbl  = isLastMonth ? ('vs ' + priorLabel) : 'vs last period';
    var revDiff = revMTD - revPriorMTD;
    var diffArrow = revDiff >= 0 ? '&#8593;' : '&#8595;';
    var diffCls   = revDiff >= 0 ? 'up' : 'dn';
    var revBarPct = revPriorMTD > 0 ? Math.min(100, Math.round((revMTD / revPriorMTD) * 100)) : revPct;

    setHTML('ov-rev-val', fmtGBP(revMTD));
    setHTML('ov-rev-change',
      '<span class="d ' + diffCls + '" style="font-size:15px;font-weight:700">' + diffArrow + ' ' + fmtGBP(Math.abs(revDiff)) + '</span>'
      + '<span class="d ' + diffCls + '" style="font-size:11px;opacity:0.8"> · ' + Math.abs(Math.round(revChange * 10) / 10) + '% ' + vsLbl + '</span>'
    );
    setStyle('ov-rev-bar', 'width', revBarPct + '%');
    setClass('ov-rev-bar', 'pf a pf r', revDiff >= 0 ? 'pf' : 'pf r');
    setClass('ov-rev-tile', 'tg ta tr', 't' + ragClass(revRag));
    setHTML('ov-rev-prior-lbl', revPriorMTD > 0 ? fmtGBP(revPriorMTD) + ' last period' : '');
    setHTML('ov-rev-pace-lbl', revPriorMTD > 0 ? (revBarPct + '% of prior') : '');

    // ── Contribution margin % MTD ──
    var cmPct        = m.contributionMarginPct(mtd);
    var cmPctPrior   = m.contributionMarginPct(priorMTD);
    var cmChange     = m.pctChange(cmPct, cmPctPrior);
    var cmRag        = m.ragStatus(cmPct, cfg.rag.contribution_margin_pct);
    var cmBarPct     = Math.min(100, Math.round((cmPct / 50) * 100));
    var cmChg        = fmtChange(cmChange);
    var cmGap        = Math.round((45 - cmPct) * 10) / 10;

    setHTML('ov-cm-val', fmtPct(cmPct));
    setHTML('ov-cm-change', '<span class="d ' + cmChg.cls + '">' + (cmChg.cls === 'up' ? '&#8593;' : cmChg.cls === 'dn' ? '&#8595;' : '&#8213;') + ' ' + Math.abs(Math.round(Math.abs(cmChange) * 10) / 10) + '% vs last period</span><span class="rag ' + ragClass(cmRag) + '">' + (cmRag === 'g' ? 'ON TRACK' : cmRag === 'a' ? 'BELOW 45%' : 'BELOW TARGET') + '</span>');
    setStyle('ov-cm-bar', 'width', cmBarPct + '%');
    setClass('ov-cm-bar', 'pf pf a pf r', cmRag === 'g' ? 'pf' : 'pf a');
    setClass('ov-cm-tile', 'tg ta tr', 't' + ragClass(cmRag));
    if (cmGap > 0) {
      setHTML('ov-cm-insight', '&#8595; ' + cmGap + 'pp below 45% floor');
    } else {
      setHTML('ov-cm-insight', '&#8593; Above 45% target');
    }

    // ── Retained profit MTD (contribution margin £) ──
    var cmAbs       = m.contributionMargin(mtd);
    var opex = 10230; // confirmed April 2026 until OpEx tab is live
    var opexCovered = cmAbs >= opex;
    var opexPct     = Math.min(100, Math.round((cmAbs / opex) * 100));

    var opexShortfall = opex - cmAbs;
    var opexSurplus   = cmAbs - opex;

    setHTML('ov-profit-val', fmtGBP(cmAbs));
    setHTML('ov-profit-meta',
      opexCovered
        ? '<span class="d up">&#8593; ' + fmtGBP(opexSurplus) + ' above OpEx</span><span class="rag g">COVERED</span>'
        : '<span class="d dn">' + fmtGBP(opexShortfall) + ' short of OpEx</span><span class="rag r">SHORTFALL</span>'
    );
    setStyle('ov-profit-bar', 'width', opexPct + '%');
    setHTML('ov-profit-status', opexCovered ? 'OpEx: £10,230' : fmtGBP(opexShortfall) + ' to cover');
    setClass('ov-profit-tile', 'tg ta tr', opexCovered ? 'tg' : 'tr');

    // ── TACOS + Blended ROAS card ──
    // adSpend-cache is MTD-filtered at build time by build-adspend-cache.py
    // In Last Month mode, ad spend cache is MTD (current month) — cannot compare to last month
    // revenue accurately, so TACOS/ROAS are suppressed in that mode.
    var sp = window.EDEN._adSpend || {};
    function gs(v) { return (v && typeof v === 'object') ? (v.spend || 0) : (Number(v) || 0); }
    var adSpendMTD = gs(sp.google) + gs(sp.amazon) + gs(sp.meta);
    // Sanity check: if adSpend exceeds monthly revenue by more than 5x, something is wrong
    var adSpend = (adSpendMTD > 0 && revMTD > 0 && adSpendMTD > revMTD * 5) ? 0 : adSpendMTD;
    if (adSpend !== adSpendMTD && adSpendMTD > 0) {
      console.warn('[EDEN Overview] adSpend sanity fail: £' + adSpendMTD + ' vs rev £' + revMTD + ' — suppressing TACOS');
    }
    var adSpendValid = adSpend > 0 && !isLastMonth;
    var ovSpendLabel = adSpendValid ? ('£' + Math.round(adSpend).toLocaleString('en-GB') + ' total ad spend MTD') : '—';

    // Ex-VAT revenue for ROAS and TACOS — ad spend is ex-VAT; using inc-VAT overstates ROAS ~20% and understates TACOS ~17%
    var revMTDExVat = m.totalRevenueExVat ? m.totalRevenueExVat(mtd) : (revMTD / 1.2);

    // Revenue vs ad spend card (always populate revenue; ROAS when adSpend known and in MTD mode)
    setHTML('ov-roas-rev', fmtGBP(revMTD));
    if (adSpendValid) {
      var blendedRoas = revMTDExVat / adSpend;
      setHTML('ov-roas-spend', fmtGBP(adSpend));
      setHTML('ov-roas-val', (Math.round(blendedRoas * 10) / 10) + 'x');
      setHTML('ov-roas-insight', blendedRoas >= 4 ? 'On target (4x+)' : blendedRoas >= 3 ? 'Below target — 4x needed' : 'Below baseline — action required');
      setStyle('ov-roas-bar', 'width', Math.min(blendedRoas / 6 * 100, 100) + '%');
      var roasBarEl = document.getElementById('ov-roas-bar');
      if (roasBarEl) roasBarEl.style.background = blendedRoas >= 4 ? 'var(--OK)' : blendedRoas >= 3 ? 'var(--AMB)' : 'var(--RED)';
    } else {
      setHTML('ov-roas-spend', isLastMonth ? 'MTD only' : '—');
      setHTML('ov-roas-val', '—');
      setHTML('ov-roas-insight', isLastMonth ? 'Ad spend cache is MTD — switch to MTD view for ROAS' : 'Ad spend from Google Ads MCP · Amazon/Meta via Coupler when available');
    }

    if (adSpendValid && revMTDExVat > 0) {
      var tacosPct  = (adSpend / revMTDExVat) * 100;
      var tacosRag  = m.ragStatus(tacosPct, cfg.rag.tacos_pct);
      var tacosDisp = Math.round(tacosPct * 10) / 10 + '%';
      setHTML('ov-tacos-val', tacosDisp);
      setHTML('ov-tacos-meta', ovSpendLabel);
      setHTML('ov-tacos-status', 'Target &lt;15%');
      setStyle('ov-tacos-bar', 'width', Math.min(tacosPct / 25 * 100, 100) + '%');
      setHTML('ov-tacos-insight', '');
      setClass('ov-tacos-tile', 'tg ta tr', tacosRag === 'g' ? 'tg' : tacosRag === 'a' ? 'ta' : 'tr');
    } else if (isLastMonth) {
      setHTML('ov-tacos-val', 'N/A');
      setHTML('ov-tacos-meta', 'Switch to MTD view for TACOS');
      setHTML('ov-tacos-insight', '');
    }

    // ── Platform split (Shopify / Amazon / Other) ──
    var revByCh      = channelGroupRevenue(mtd);
    var revByChPrior = channelGroupRevenue(priorMTD);
    var totalRev     = revMTD || 1;

    var shopifyPct  = Math.round((revByCh.shopify / totalRev) * 100);
    var amazonPct   = Math.round((revByCh.amazon / totalRev) * 100);
    var otherPct    = Math.round((revByCh.other / totalRev) * 100);

    var shopifyChg  = m.pctChange(revByCh.shopify, revByChPrior.shopify);
    var amazonChg   = m.pctChange(revByCh.amazon, revByChPrior.amazon);
    var otherChg    = m.pctChange(revByCh.other, revByChPrior.other);

    function chgSpan(pct) {
      var rounded = Math.round(Math.abs(pct) * 10) / 10;
      if (pct > 0) return '<span style="color:var(--OK);font-weight:700">&#8593; ' + rounded + '% vs prior</span>';
      if (pct < 0) return '<span style="color:var(--RED);font-weight:700">&#8595; ' + rounded + '% vs prior</span>';
      return '<span style="color:var(--GMD)">&#8213; 0%</span>';
    }

    // Shopify target 40%
    setHTML('ov-shopify-pct', shopifyPct + '%');
    setStyle('ov-shopify-bar', 'width', Math.min(100, (shopifyPct / 40) * 100) + '%');
    setHTML('ov-shopify-sub', '<span>Target 40%</span>' + chgSpan(shopifyChg));

    // Amazon target 40%
    setHTML('ov-amazon-pct', amazonPct + '%');
    setStyle('ov-amazon-bar', 'width', Math.min(100, (amazonPct / 40) * 100) + '%');
    setHTML('ov-amazon-sub', '<span>Target 40%</span>' + chgSpan(amazonChg));

    // Other target 20%
    setHTML('ov-other-pct', otherPct + '%');
    setStyle('ov-other-bar', 'width', Math.min(100, (otherPct / 20) * 100) + '%');
    setHTML('ov-other-sub', '<span>Target 20%</span>' + chgSpan(otherChg));

    // ── AOV ──
    var aovVal      = m.aov(mtd);
    var aovPrior    = m.aov(priorMTD);
    var aovChange   = m.pctChange(aovVal, aovPrior);
    var aovRag      = m.ragStatus(aovVal, cfg.rag.aov);
    var aovBarPct   = Math.min(100, Math.round((aovVal / cfg.targets.aov) * 100));
    var aovGap      = cfg.targets.aov - aovVal;

    setHTML('ov-aov-val', fmtGBP(aovVal));
    setHTML('ov-aov-change', (aovChange >= 0 ? '&#8593;' : '&#8595;') + ' ' + Math.abs(Math.round(aovChange * 10) / 10) + '% vs last period');
    setStyle('ov-aov-bar', 'width', aovBarPct + '%');
    setHTML('ov-aov-sub', Math.round(aovBarPct) + '% of £' + cfg.targets.aov + ' target' + (aovGap > 0 ? ' — ' + (aovRag === 'r' ? 'action required' : 'watch') : ''));
    setClass('ov-aov-tile', 'tg ta tr', 't' + ragClass(aovRag));

    // ── Order velocity ──
    var totalMTD      = m.totalOrders(mtd);
    var totalPriorMTD = m.totalOrders(priorMTD);
    var opd           = daysElapsed > 0 ? totalMTD / daysElapsed : 0;
    var opdPrior      = daysElapsed > 0 ? totalPriorMTD / daysElapsed : 0;

    var ordVsPrior = totalPriorMTD > 0 ? ((totalMTD - totalPriorMTD) / totalPriorMTD) * 100 : 0;
    var opdVsPrior = opdPrior > 0 ? ((opd - opdPrior) / opdPrior) * 100 : 0;

    function vsArrow(pct) {
      var abs = Math.abs(Math.round(pct * 10) / 10);
      if (pct > 1)  return '<span style="color:var(--OK);font-weight:700">&#8593; ' + abs + '% vs last period</span>';
      if (pct < -1) return '<span style="color:var(--RED);font-weight:700">&#8595; ' + abs + '% vs last period</span>';
      return '<span style="color:var(--GMD)">&#8213; flat vs last period</span>';
    }

    var priorBarPct = totalPriorMTD > 0 ? Math.min(150, Math.round((totalMTD / totalPriorMTD) * 100)) : 0;
    var opdBarPct   = opdPrior > 0 ? Math.min(150, Math.round((opd / opdPrior) * 100)) : 0;

    // MTD orders — dark green, primary = vs prior period
    setHTML('ov-orders-val', totalMTD.toLocaleString('en-GB'));
    setHTML('ov-orders-meta',
      vsArrow(ordVsPrior) +
      '<br><span style="color:rgba(245,239,228,0.55);font-size:11px">' + totalPriorMTD.toLocaleString('en-GB') + ' same period last month</span>');
    setStyle('ov-orders-bar', 'width', Math.min(100, priorBarPct) + '%');
    setClass('ov-orders-chip', 'tg ta tr', 'tg');

    // Orders per day — vs prior period
    var opdRag = m.ragStatus(opd, { green: opdPrior * 1.0, amber: opdPrior * 0.85, red: opdPrior * 0.7 });
    setHTML('ov-opd-val', (Math.round(opd * 10) / 10).toString());
    setHTML('ov-opd-meta',
      vsArrow(opdVsPrior) +
      '<br><span style="color:var(--GMD);font-size:11px">' + (Math.round(opdPrior * 10) / 10) + '/day last period</span>');
    setStyle('ov-opd-bar', 'width', Math.min(100, opdBarPct) + '%');
    setClass('ov-opd-chip', 'tg ta tr', 't' + ragClass(opdRag));

    // ── Express orders MTD ──
    var expressMTD = mtd.filter(function (o) {
      return o.shipping_amount > 0 && o.shipping_amount <= 9.99 &&
             (o.country === 'GB' || o.shipping_country === 'GB' || o.country === '' || !o.country);
    });
    var expressCount = expressMTD.length;
    var expressPct   = totalMTD > 0 ? Math.round((expressCount / totalMTD) * 100) : 0;
    setHTML('ov-express-val', expressCount.toString());
    setHTML('ov-express-meta', '<span class="d">' + expressPct + '% of MTD orders · avg £' +
      (expressCount > 0 ? (Math.round(expressMTD.reduce(function (s, o) { return s + o.shipping_amount; }, 0) / expressCount * 100) / 100).toFixed(2) : '0.00') +
      ' shipping</span>');

    // ── 30-day sparklines ──
    var days30 = 30;

    // Revenue trend (current 30d vs prior 30d)
    var sparkRevCurrent = buildDailySeries(orders, days30, 0, m.totalRevenue);
    var sparkRevPrior   = buildDailySeries(orders, days30, 30, m.totalRevenue);
    var sparkRevEl = document.getElementById('ov-spark-rev');
    if (sparkRevEl) {
      sparkRevEl.innerHTML = buildComparisonSpark(sparkRevCurrent, sparkRevPrior);
      addChartMidLabels('ov-spark-rev', days30);
      attachChartHover('ov-spark-rev', sparkRevCurrent, sparkRevPrior, function (v) {
        return '£' + Math.round(v).toLocaleString('en-GB');
      });
    }

    // Contribution margin % trend
    var sparkCMCurrent = buildDailySeries(orders, days30, 0, m.contributionMarginPct);
    var sparkCMPrior   = buildDailySeries(orders, days30, 30, m.contributionMarginPct);
    var sparkCMEl = document.getElementById('ov-spark-cm');
    if (sparkCMEl) {
      sparkCMEl.innerHTML = buildComparisonSpark(sparkCMCurrent, sparkCMPrior);
      addChartMidLabels('ov-spark-cm', days30);
      attachChartHover('ov-spark-cm', sparkCMCurrent, sparkCMPrior, function (v) {
        return (Math.round(v * 10) / 10) + '%';
      });
    }

    // Revenue MTD tile mini sparkline
    var sparkMiniRevVals = buildDailySeries(mtd, now.getDate(), 0, m.totalRevenue);
    var sparkMiniRevEl = document.getElementById('ov-spark-rev-mini');
    if (sparkMiniRevEl) {
      var pts = buildSparkPoints(sparkMiniRevVals);
      if (pts) {
        sparkMiniRevEl.querySelector('polyline').setAttribute('points', pts);
      }
    }

    // ── Update date labels in chart axes ──
    var d30Start = new Date(now.getTime() - 30 * 86400000);
    var months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    var startLabel = d30Start.getDate() + ' ' + months[d30Start.getMonth()];
    var endLabel   = now.getDate() + ' ' + months[now.getMonth()];
    var chartLabels = document.querySelectorAll('.ov-chart-start');
    for (var i = 0; i < chartLabels.length; i++) chartLabels[i].textContent = startLabel;
    var chartEnds = document.querySelectorAll('.ov-chart-end');
    for (var j = 0; j < chartEnds.length; j++) chartEnds[j].textContent = endLabel;

    // ── YTD Revenue → £1m progress bar ──
    // Current year YTD — use canonical metrics filter (consistent with all other date ranges)
    var ytdStart = new Date(now.getFullYear(), 0, 1);
    var ytdOrders = m.getYTDOrders(orders);
    var revYTD = m.totalRevenue(ytdOrders);

    // Prior year YTD — same number of days into last year
    var daysElapsedYTD = Math.round((now - ytdStart) / 86400000);
    var priorYtdStart = new Date(now.getFullYear() - 1, 0, 1);
    var priorYtdEnd   = new Date(priorYtdStart.getTime() + daysElapsedYTD * 86400000);
    var priorYtdOrders = orders.filter(function(o) {
      var od = o.order_date ? new Date(o.order_date) : null;
      return od && od >= priorYtdStart && od <= priorYtdEnd;
    });
    var revPriorYTD = m.totalRevenue(priorYtdOrders);
    var ytdVsPrior  = revPriorYTD > 0 ? ((revYTD - revPriorYTD) / revPriorYTD) * 100 : null;

    var TARGET_1M = 1000000;
    var ytdPct = Math.min(100, (revYTD / TARGET_1M) * 100);
    var ytdGap = Math.max(0, TARGET_1M - revYTD);
    var runRate = daysElapsedYTD > 0 ? (revYTD / daysElapsedYTD) * 365 : 0;

    var ytdValEl  = document.getElementById('ov-ytd-val');
    var ytdMetaEl = document.getElementById('ov-ytd-meta');
    var ytdVsEl   = document.getElementById('ov-ytd-vs');
    var ytdGapEl  = document.getElementById('ov-ytd-gap');
    var ytdRREl   = document.getElementById('ov-ytd-runrate');
    var ytdBarEl  = document.getElementById('ov-ytd-bar');
    var ytdPctLbl = document.getElementById('ov-ytd-pct-lbl');

    if (ytdValEl) ytdValEl.textContent = fmtGBP(revYTD);
    var MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var todayLabel = MONTHS_SHORT[now.getMonth()] + ' ' + now.getDate();
    if (ytdMetaEl) ytdMetaEl.textContent = 'Jan 1 \u2013 ' + todayLabel + ' \u00b7 ' + Math.round(ytdPct * 10) / 10 + '% of £1m';
    if (ytdVsEl) {
      if (ytdVsPrior !== null) {
        var vsRounded = Math.round(Math.abs(ytdVsPrior) * 10) / 10;
        var vsUp = ytdVsPrior >= 0;
        ytdVsEl.innerHTML = '<span class="d ' + (vsUp ? 'up' : 'dn') + '">'
          + (vsUp ? '&#8593;' : '&#8595;') + ' ' + vsRounded + '% vs ' + (now.getFullYear() - 1) + ' YTD</span>'
          + ' <span style="font-size:11px;color:var(--GMD)">(' + fmtGBP(revPriorYTD) + ' prior year)</span>';
      } else {
        ytdVsEl.textContent = 'No prior year data in range';
      }
    }
    if (ytdGapEl) ytdGapEl.textContent = fmtGBP(ytdGap);
    if (ytdRREl) ytdRREl.textContent = 'Run rate: ' + fmtGBP(runRate) + ' annualised';
    if (ytdBarEl) {
      ytdBarEl.style.width = ytdPct + '%';
      ytdBarEl.style.background = ytdPct >= 80 ? 'var(--OK)' : ytdPct >= 50 ? 'var(--G)' : 'var(--AMB)';
    }
    if (ytdPctLbl) ytdPctLbl.textContent = Math.round(ytdPct * 10) / 10 + '% there';

    // ── £1m pacing breakdown ──
    var ytdOrderCount = ytdOrders.length;
    var aovYTD = ytdOrderCount > 0 ? revYTD / ytdOrderCount : aovVal;
    var daysRemainingInYear = Math.max(1, 365 - daysElapsedYTD);
    var revPerDayNeeded = ytdGap / daysRemainingInYear;
    var ordersPerDayNeeded = aovYTD > 0 ? revPerDayNeeded / aovYTD : 0;
    var ordersPerMonthNeeded = ordersPerDayNeeded * 30.5;
    var totalOrdersNeeded = aovYTD > 0 ? Math.ceil(ytdGap / aovYTD) : 0;
    var currentDailyRateYTD = daysElapsedYTD > 0 ? ytdOrderCount / daysElapsedYTD : 0;

    function setV2(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; }
    setV2('ov-pace-orders-ytd', ytdOrderCount.toLocaleString('en-GB'));
    setV2('ov-pace-aov', fmtGBP(aovYTD));
    setV2('ov-pace-daily', (Math.round(currentDailyRateYTD * 10) / 10) + '/day');
    setV2('ov-pace-days', daysRemainingInYear + ' days');
    setV2('ov-pace-gap', fmtGBP(ytdGap));
    setV2('ov-pace-orders-needed', totalOrdersNeeded.toLocaleString('en-GB') + ' orders');
    setV2('ov-pace-req-day', (Math.round(ordersPerDayNeeded * 10) / 10) + '/day');
    setV2('ov-pace-req-month', Math.round(ordersPerMonthNeeded) + '/month');

    // ── CEO Hero Command Bar ──
    (function() {
      function heroEl(id) { return document.getElementById(id); }
      function heroClass(el, cls) { if (el) el.className = 'ceo-hero-val ' + cls; }

      var ordersEl = heroEl('hero-orders');
      if (ordersEl) {
        ordersEl.textContent = Math.round(opd * 10) / 10 + '/day';
        heroClass(ordersEl, opdRag === 'g' ? 'ok' : opdRag === 'a' ? 'wn' : 'bad');
      }

      var revEl = heroEl('hero-rev');
      if (revEl) {
        revEl.textContent = fmtGBP(revMTD);
        heroClass(revEl, revRag === 'g' ? 'ok' : revRag === 'a' ? 'wn' : 'bad');
      }

      var cmHeroEl = heroEl('hero-cpa');
      if (cmHeroEl) {
        cmHeroEl.textContent = fmtPct(cmPct);
        heroClass(cmHeroEl, cmRag === 'g' ? 'ok' : cmRag === 'a' ? 'wn' : 'bad');
      }

      var forecastEl = heroEl('hero-roas');
      if (forecastEl) {
        var forecast = daysElapsed > 0 ? revMTD / daysElapsed * daysInMonthN : 0;
        forecastEl.textContent = fmtGBP(forecast);
        heroClass(forecastEl, forecast >= 50000 ? 'ok' : forecast >= 42500 ? 'wn' : 'bad');
      }

      var ragDot = heroEl('hero-rag-dot');
      var ragTxt = heroEl('hero-rag-txt');
      if (ragDot && ragTxt) {
        var overallRag = [revRag, cmRag, opdRag].filter(function(r){ return r; });
        var hasRed = overallRag.indexOf('r') > -1;
        var hasAmb = overallRag.indexOf('a') > -1;
        if (hasRed) {
          ragDot.className = 'ceo-hero-rag-dot bad';
          ragTxt.textContent = 'Needs attention';
        } else if (hasAmb) {
          ragDot.className = 'ceo-hero-rag-dot wn';
          ragTxt.textContent = 'Monitor';
        } else {
          ragDot.className = 'ceo-hero-rag-dot';
          ragTxt.textContent = 'On track';
        }
      }
    })();

    console.log('[EDEN Overview] Rendered. MTD rev: ' + fmtGBP(revMTD) + ', YTD: ' + fmtGBP(revYTD) + ', Orders: ' + totalMTD + ', OPD: ' + Math.round(opd) + ', CM: ' + fmtPct(cmPct));
  }

  // ── Daily series builder ───────────────────────────────────────

  /**
   * Build an array of daily metric values for N days ending daysAgo days back.
   * @param {Object[]} orders
   * @param {number} days - Number of days in the series
   * @param {number} daysAgo - How far back the series ends (0 = today)
   * @param {Function} metricFn - Takes order array, returns number
   * @returns {number[]}
   */
  function buildDailySeries(orders, days, daysAgo, metricFn) {
    var result = [];
    var t = new Date();
    t = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    var endDay = new Date(t.getTime() - daysAgo * 86400000);
    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(endDay.getTime() - i * 86400000);
      var next = new Date(d.getTime() + 86400000 - 1);
      var dayOrders = orders.filter(function (o) {
        var od = o.order_date ? new Date(o.order_date) : null;
        return od && od >= d && od <= next;
      });
      result.push(metricFn(dayOrders));
    }
    return result;
  }

  function toggleLastMonth() {
    _ovMode = _ovMode === 'lastmonth' ? 'mtd' : 'lastmonth';
    var btn = document.getElementById('ov-toggle-btn');
    if (btn) {
      btn.classList.toggle('active', _ovMode === 'lastmonth');
      btn.textContent = _ovMode === 'lastmonth' ? 'Viewing: Last Month' : 'Last Month';
    }
    render(window.EDEN._edenData);
  }

  window.EDEN.overview = { render: render, toggleLastMonth: toggleLastMonth };

})();
