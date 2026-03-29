/**
 * EDEN & CO. CEO Flight Deck - Marketing Tab Renderer
 * Wires occasion grid and add-on attach rates from Sales Log.
 * Ad blocks (Google, Amazon, Meta) remain static pending Coupler integration.
 */
window.EDEN = window.EDEN || {};
window.EDEN.components = window.EDEN.components || {};

(function () {
  'use strict';

  var OCCASION_LABELS = {
    BIRTHDAY:  'Birthday',
    BASE:      'Base / Generic',
    JFY:       'Just For You',
    LOVE:      'With Love',
    THANKU:    'Thank You',
    MUM:       'For Mum',
    CELEBRATE: 'Celebrate',
    BABY:      'New Baby',
    DAD:       'For Dad',
    XMAS:      'Christmas',
    EDEN:      'EDEN Brand'
  };

  function fmtGBP(n) {
    return '£' + Math.round(n).toLocaleString('en-GB');
  }

  function chgArrow(pct) {
    if (pct > 0) return '<span class="d up">&#8593; ' + Math.round(Math.abs(pct) * 10) / 10 + '%</span>';
    if (pct < 0) return '<span class="d dn">&#8595; ' + Math.round(Math.abs(pct) * 10) / 10 + '%</span>';
    return '<span class="d fl">&#8213; 0%</span>';
  }

  function render(data) {
    var m = window.EDEN.metrics;
    if (!m || !data || !data.orders) return;

    var orders = data.orders.filter(function (o) {
      return o.status !== 'cancelled' && o.status !== 'on_hold';
    });

    var mtd      = m.getMTDOrders(orders);
    var priorMTD = m.getPriorMTDOrders(orders);
    var total    = mtd.length;

    // ── Occasion grid ──
    var occMTD   = m.revenueByOccasion(mtd);
    var occPrior = m.revenueByOccasion(priorMTD);

    // Sort by MTD revenue descending
    var occList = Object.keys(occMTD).sort(function (a, b) {
      return (occMTD[b] || 0) - (occMTD[a] || 0);
    });

    var occHtml = '';
    occList.forEach(function (occ) {
      var rev   = occMTD[occ] || 0;
      var prior = occPrior[occ] || 0;
      var chg   = prior > 0 ? ((rev - prior) / prior) * 100 : 0;
      var label = OCCASION_LABELS[occ] || occ;
      occHtml +=
        '<div class="occ">' +
          '<div class="occ-n">' + label + '</div>' +
          '<div class="occ-v">' + fmtGBP(rev) + '</div>' +
          '<div class="occ-sp"><svg class="sp" height="22" viewBox="0 0 100 22" preserveAspectRatio="none">' +
            '<polyline points="0,18 50,12 100,' + (chg >= 0 ? '6' : '20') + '" fill="none" stroke="' + (chg >= 0 ? 'var(--G)' : 'var(--RED)') + '" stroke-width="1.5" stroke-linejoin="round"/>' +
          '</svg></div>' +
          chgArrow(chg) +
        '</div>';
    });

    var occGrid = document.getElementById('mkt-occ-grid');
    if (occGrid) occGrid.innerHTML = occHtml || '<div style="color:var(--GMD);padding:16px;font-size:11px">No occasion data</div>';

    // ── Add-on attach rates ──
    var ginCount   = 0;
    var mocktailCount = 0;
    var proseccoCount = 0;

    mtd.forEach(function (o) {
      var a = o.add_on || 'NONE';
      if (a === 'GIN_LIQUEUR') ginCount++;
      else if (a === 'MOCKTAIL' || a === 'MOCKTAIL_X2') mocktailCount++;
      else if (a === 'PROSECCO' || a === 'PROSECCO_X2') proseccoCount++;
    });

    function attachChip(label, count, total) {
      var pct  = total > 0 ? (count / total) * 100 : 0;
      var disp = Math.round(pct * 10) / 10;
      var cls  = pct >= 8 ? 'tg' : pct >= 4 ? 'ta' : 'tr';
      var col  = pct >= 8 ? 'var(--OK)' : pct >= 4 ? 'var(--AMB)' : 'var(--RED)';
      return '<div class="chip ' + cls + '">' +
        '<div class="tlbl">' + label + '</div>' +
        '<div class="tval" style="font-size:28px">' + disp + '%</div>' +
        '<div style="font-size:11px;color:' + col + ';margin-top:4px">' + count + ' of ' + total + ' orders</div>' +
        '</div>';
    }

    var addonGrid = document.getElementById('mkt-addon-grid');
    if (addonGrid) {
      addonGrid.innerHTML =
        attachChip('Gin / Liqueur add-on', ginCount, total) +
        attachChip('Mocktail add-on', mocktailCount, total) +
        attachChip('Prosecco add-on', proseccoCount, total);
    }

    // ── TACOS + Blended ACOS ──
    var cfg      = window.EDEN.CONFIG;
    // Meta spend from Coupler (Mar 1–27 2026, updated 27 Mar)
    window.EDEN._adSpend = window.EDEN._adSpend || {};
    window.EDEN._adSpend.meta = 302.27;
    var adSpend = (window.EDEN._adSpend.google || 0) + (window.EDEN._adSpend.amazon || 0) + (window.EDEN._adSpend.meta || 0);
    var revMTD  = mtd.reduce(function (s, o) { return s + o.amount_paid; }, 0);

    function setEl(id, html)  { var el = document.getElementById(id); if (el) el.innerHTML = html; }
    function setAttr(id, attr, val) { var el = document.getElementById(id); if (el) el.setAttribute('style', attr + ':' + val); }

    if (adSpend > 0 && revMTD > 0) {
      var tacosPct  = (adSpend / revMTD) * 100;
      var tacosRag  = cfg ? window.EDEN.metrics.ragStatus(tacosPct, cfg.rag.tacos_pct) : 'a';
      var tacosDisp = Math.round(tacosPct * 10) / 10 + '%';
      setEl('mkt-tacos-val',     tacosDisp);
      setEl('mkt-tacos-meta',    '£' + Math.round(adSpend).toLocaleString('en-GB') + ' total ad spend MTD');
      setEl('mkt-tacos-status',  'Target &lt;15%');
      setEl('mkt-tacos-insight', '');
      var tacosTile = document.getElementById('mkt-tacos-tile');
      if (tacosTile) tacosTile.className = 'tile ' + (tacosRag === 'g' ? 'tg' : tacosRag === 'a' ? 'ta' : 'tr');
      var tacosBarEl = document.getElementById('mkt-tacos-bar');
      if (tacosBarEl) tacosBarEl.style.width = Math.min(tacosPct / 25 * 100, 100) + '%';
    }

    if (adSpend > 0 && revMTD > 0) {
      var roasVal  = revMTD / adSpend;
      var roasDisp = Math.round(roasVal * 10) / 10 + 'x';
      var roasRag  = roasVal >= 4 ? 'g' : roasVal >= 3 ? 'a' : 'r';
      setEl('mkt-roas-val',     roasDisp);
      setEl('mkt-roas-meta',    '£' + Math.round(adSpend).toLocaleString('en-GB') + ' total ad spend MTD');
      setEl('mkt-roas-status',  'Target: 4x+');
      setEl('mkt-roas-insight', 'Total ad revenue ÷ total ad spend (Google + Amazon + Meta)');
      var roasTile = document.getElementById('mkt-roas-tile');
      if (roasTile) roasTile.className = 'tile ' + (roasRag === 'g' ? 'tg' : roasRag === 'a' ? 'ta' : 'tr');
      var roasBarEl = document.getElementById('mkt-roas-bar');
      if (roasBarEl) roasBarEl.style.width = Math.min(roasVal / 6 * 100, 100) + '%';
    }

    // ── Meta adblk live values ──
    var metaSpendEl = document.getElementById('meta-spend-val');
    if (metaSpendEl) metaSpendEl.textContent = '£302';
    var metaImprEl = document.getElementById('meta-impr-val');
    if (metaImprEl) metaImprEl.textContent = '41,865';

    // Trigger TACOS tile refresh now that meta spend is set
    if (window.EDEN.refreshAdTiles) window.EDEN.refreshAdTiles();

    console.log('[EDEN] Marketing tab rendered. Occasions:', occList.length, '| Add-ons: gin=' + ginCount + ' mock=' + mocktailCount + ' pro=' + proseccoCount);
  }

  // ── Social Media Intelligence (Typeform cache) ────────────────────────────────
  function renderIntel() {
    var md = window.EDEN._marketingData;
    if (!md) return;

    function setEl(id, html) {
      var el = document.getElementById(id);
      if (el) el.innerHTML = html;
    }

    var gd   = md.gift_designer   || {};
    var corp = md.corporate       || {};
    var gr   = md.google_reviews  || {};
    var built = md._built || '';

    // Header label
    var gdTotal = gd.total || 0;
    var corpTotal = corp.total || 0;
    setEl('mkt-intel-lbl',
      gdTotal.toLocaleString('en-GB') + ' gift designer responses &bull; ' +
      corpTotal + ' corporate leads &bull; ' + (gr.total || 0) + ' post-purchase reviews &bull; built ' + built
    );
    setEl('mkt-intel-dnote', built);

    // ── Buyer side: who / feel / concern ─────────────────────────────────────
    var who = gd.who || {};
    setEl('sm-who-family', (who['A family member or friend'] || 0).toLocaleString('en-GB'));
    setEl('sm-who-corp',   (who['A client or colleague']     || 0).toLocaleString('en-GB'));
    setEl('sm-who-self',   (who['Myself (we love this!)']    || 0).toLocaleString('en-GB'));

    var feel = gd.feel || {};
    setEl('sm-feel-loved', (feel['Loved and appreciated']   || 0).toLocaleString('en-GB'));
    setEl('sm-feel-surp',  (feel['Surprised and delighted'] || 0).toLocaleString('en-GB'));
    setEl('sm-feel-calm',  (feel['Calm and relaxed']        || 0).toLocaleString('en-GB'));

    var concern = gd.concern || {};
    setEl('sm-concern-diet',    (concern['Worrying about allergies or dietary needs']                  || 0).toLocaleString('en-GB'));
    setEl('sm-concern-generic', (concern['Not wanting it to feel generic']                             || 0).toLocaleString('en-GB'));
    setEl('sm-concern-look',    (concern["It won't look as good as it does in the picture"]            || 0).toLocaleString('en-GB'));
    setEl('sm-concern-taste',   (concern['It will taste rubbish']                                      || 0).toLocaleString('en-GB'));
    setEl('sm-concern-care',    (concern['I care deeply, but worry the gift won\u2019t show it.']      || 0).toLocaleString('en-GB'));

    // ── Dietary table ─────────────────────────────────────────────────────────
    var dietary = gd.dietary || {};
    var dietKeys = ['Gluten Free', 'Dairy Free', 'Vegan', 'Vegetarian', 'Plant Based', 'None'];
    var dietTotal = Object.values(dietary).reduce(function(a,b){ return a+b; }, 0);
    var dietHtml = '';
    dietKeys.forEach(function(k) {
      var v = dietary[k] || 0;
      if (!v) return;
      var pct = dietTotal > 0 ? Math.round(v / dietTotal * 100) : 0;
      dietHtml += '<tr><td>' + k + '</td><td class="r">' + v.toLocaleString('en-GB') + '</td><td class="r">' + pct + '%</td></tr>';
    });
    setEl('sm-dietary-body', dietHtml || '<tr><td colspan="3" style="color:var(--GMD)">No data</td></tr>');

    // ── Occasion table ────────────────────────────────────────────────────────
    var occ = gd.occasion || {};
    var occKeys = Object.keys(occ).sort(function(a,b){ return occ[b]-occ[a]; });
    var occHtmlSm = '';
    occKeys.forEach(function(k) {
      if (!occ[k]) return;
      occHtmlSm += '<tr><td>' + k + '</td><td class="r">' + occ[k].toLocaleString('en-GB') + '</td></tr>';
    });
    setEl('sm-occasion-body', occHtmlSm || '<tr><td colspan="2" style="color:var(--GMD)">No data</td></tr>');

    // ── Google Business Profile reviews (from sheet) ─────────────────────────
    var gbp = md.gbp_reviews || {};
    var qual = gr.quality   || {};
    var impr = gr.impression || {};
    // Prefer live GBP sheet data, fall back to Typeform ratings
    var grRating = gbp.avg_rating ? gbp.avg_rating + '/5' : (qual.avg ? qual.avg + '/5' : '—');
    var grTotal  = gbp.total ? 'from ' + gbp.total.toLocaleString('en-GB') + ' Google reviews' : (qual.total ? 'from ' + qual.total.toLocaleString('en-GB') + ' reviews' : '—');
    var grPct    = gbp.pct_five ? gbp.pct_five + '%' : (qual.pct_positive ? qual.pct_positive + '%' : '—');
    // Last updated
    setEl('sm-last-updated', gbp.last_updated || built || '—');
    // Header strip (summary tiles)
    setEl('sm-gr-quality',     grRating);
    setEl('sm-gr-quality-n',   grTotal);
    setEl('sm-gr-pct',         grPct);
    // Recipient card (duplicated for layout)
    setEl('sm-gr-quality-card',   grRating);
    setEl('sm-gr-quality-n-card', grTotal);
    setEl('sm-gr-impression',  impr.avg ? impr.avg + '/5' : '—');
    setEl('sm-gr-impression-n', impr.total ? 'from ' + impr.total.toLocaleString('en-GB') + ' post-purchase surveys' : '—');

    // ── Corp pipeline IDs ────────────────────────────────────────────────────
    var corpOcc = corp.occasion || {};
    // Map corp occasion keys to IDs (partial match)
    function occVal(keyword) {
      var total = 0;
      Object.keys(corpOcc).forEach(function(k) {
        if (k.toLowerCase().indexOf(keyword) !== -1) total += corpOcc[k];
      });
      return total || 0;
    }

    setEl('corp-occ-xmas',    (occVal('christmas') || occVal('seasonal') || '0') + ' leads');
    setEl('corp-occ-emp',     (occVal('employee') || '0') + ' leads');
    setEl('corp-occ-client',  (occVal('client') || '0') + ' leads');
    setEl('corp-occ-onboard', (occVal('onboard') || '0') + ' leads');
    setEl('corp-occ-vip',     (occVal('vip') || '0') + ' leads');

    // Budget grid
    var budget = corp.budget || {};
    var budgetKeys = Object.keys(budget);
    var budgetHtml = '<div style="display:flex;gap:8px;flex-wrap:wrap">';
    budgetKeys.forEach(function(k) {
      budgetHtml += '<div class="chip ta" style="min-width:80px">' +
        '<div class="tlbl">' + k + '</div>' +
        '<div class="tval" style="font-size:22px">' + budget[k] + '</div>' +
        '<div style="font-size:10px;color:var(--GT)">leads</div>' +
        '</div>';
    });
    budgetHtml += '</div>';
    setEl('corp-budget-grid', budgetHtml);

    // Readiness score
    var readiness = corp.readiness_avg || 0;
    var readCol = readiness >= 4 ? 'var(--OK)' : readiness >= 3 ? 'var(--GOLD)' : 'var(--RED)';
    var readEl = document.getElementById('corp-readiness-val');
    if (readEl) {
      readEl.textContent = readiness + ' / 5';
      readEl.style.color = readCol;
    }

    // Qty stats
    setEl('corp-qty-summary',
      'Median order: ' + corp.qty_median + ' units &bull; Mean: ' + corp.qty_mean + ' units &bull; Largest: ' + (corp.qty_max || '—') + ' units'
    );

    // Pipeline stats
    setEl('corp-total', corpTotal);

    var dm = corp.decision || {};
    setEl('corp-dm', dm['Yes'] || '—');

    var branded = corp.branded || {};
    var brandedYes = branded['Yes'] || 0;
    var brandedTotal = (branded['Yes'] || 0) + (branded['No'] || 0);
    var brandedPct = brandedTotal > 0 ? Math.round(brandedYes / brandedTotal * 100) : 0;
    setEl('corp-branded', brandedYes + ' (' + brandedPct + '%)');

    setEl('corp-qty-med',  corp.qty_median || '—');
    setEl('corp-qty-mean', corp.qty_mean   || '—');

    console.log('[EDEN] Marketing intelligence rendered. GD:', gdTotal, '| Corp:', corpTotal);
  }

  // Expose and auto-run after DOM is ready
  window.EDEN.components.marketing = { render: render, renderIntel: renderIntel };

  // Run intel renderer once DOM is loaded (cache script loaded before this)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderIntel);
  } else {
    renderIntel();
  }
})();
