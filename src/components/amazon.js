/**
 * EDEN & CO. CEO Flight Deck - Amazon Ads Component
 * Live data from Coupler (AMZ x Claude — Ads + Search Terms).
 * Last Coupler run: 27 Mar 2026. Re-run Coupler to update.
 */
window.EDEN = window.EDEN || {};
window.EDEN.components = window.EDEN.components || {};

(function () {
  'use strict';

  // ── Live data (Coupler, 27 Mar 2026, full Mar MTD) ───────────────────────

  var TOTALS = {
    spend:  2212.52,
    orders: 321,   // 14-day attribution window
    days:   27
  };

  var PRODUCTS = [
    { name: 'Petite (Letterbox)', spend: 1225.42, orders: 209 },
    { name: 'Chocolate Hamper',   spend: 625.97,  orders: 87  },
    { name: 'Signature Hamper',   spend: 361.13,  orders: 26  }
  ];

  var SEARCH_TERMS = [
    { term: 'vegan chocolate',                   clicks: 496, orders: 42, spend: 298.99 },
    { term: 'gluten free hamper',                clicks: 385, orders: 32, spend: 255.52 },
    { term: 'vegan hamper',                      clicks: 250, orders: 31, spend: 165.99 },
    { term: 'vegan chocolate gifts',             clicks: 168, orders: 22, spend: 93.28  },
    { term: 'gluten free chocolate',             clicks: 213, orders: 19, spend: 123.27 },
    { term: 'gluten free hamper gifts for women',clicks: 90,  orders: 11, spend: 59.05  },
    { term: 'gluten free chocolates gift box',   clicks: 76,  orders: 9,  spend: 43.91  },
    { term: 'vegan hampers for women',           clicks: 57,  orders: 9,  spend: 38.67  },
    { term: 'vegan chocolate hamper',            clicks: 28,  orders: 7,  spend: 15.88  },
    { term: 'gluten free hampers',               clicks: 90,  orders: 6,  spend: 58.09  }
  ];

  // ── Helpers ───────────────────────────────────────────────────────────────

  function fmtGBP(n)  { return '£' + Math.round(n).toLocaleString('en-GB'); }
  function fmtGBPd(n) { return '£' + (Math.round(n * 100) / 100).toFixed(2); }

  // ── Render ───────────────────────────────────────────────────────────────

  function render() {
    var cpa    = TOTALS.orders > 0 ? TOTALS.spend / TOTALS.orders : 0;
    var cpaOk  = cpa <= 10;
    var cpaAmb = cpa <= 15;
    var cpaCol = cpaOk ? 'var(--OK)' : cpaAmb ? 'var(--AMB)' : 'var(--RED)';

    var adblk = document.getElementById('amz-adblk');
    if (adblk) {
      adblk.className = 'adblk ' + (cpaOk ? 'ok' : 'wn');
      adblk.innerHTML =
        '<div class="adhead"><div class="adname">Amazon Ads</div>' +
          '<span class="rag ' + (cpaOk ? 'g' : 'a') + '">MTD LIVE</span>' +
        '</div>' +
        '<div class="adgrid">' +
          '<div><div class="amlbl">Spend MTD</div><div class="amval">' + fmtGBP(TOTALS.spend) + '</div><div class="amtgt">Mar 1–27</div></div>' +
          '<div><div class="amlbl">Orders (14d)</div><div class="amval">' + TOTALS.orders + '</div><div class="amtgt">~' + Math.round(TOTALS.orders / TOTALS.days * 10) / 10 + '/day</div></div>' +
          '<div><div class="amlbl">Blended CPA</div><div class="amval" style="color:' + cpaCol + '">' + fmtGBPd(cpa) + '</div><div class="amtgt">No rev. column</div></div>' +
          '<div><div class="amlbl">ACOS</div><div class="amval na">—</div><div class="amtgt">Need rev. export</div></div>' +
        '</div>';
    }

    // ── Product breakdown ──
    var campBody = document.getElementById('amz-camp-body');
    if (campBody) {
      campBody.innerHTML = PRODUCTS.map(function (p) {
        var cpa  = p.orders > 0 ? p.spend / p.orders : 0;
        var col  = cpa <= 10 ? 'style="color:var(--OK)"' : cpa > 15 ? 'style="color:var(--RED)"' : 'style="color:var(--AMB)"';
        return '<tr>' +
          '<td><span class="pn">' + p.name + '</span></td>' +
          '<td class="r">' + fmtGBP(p.spend) + '</td>' +
          '<td class="r">' + p.orders + '</td>' +
          '<td class="r" ' + col + '>' + fmtGBPd(cpa) + '</td>' +
        '</tr>';
      }).join('');
    }

    // Update product breakdown table header to show CPA not ACOS
    var campHead = document.querySelector('#amz-camp-body')
      ? document.querySelector('#amz-camp-body').closest('table')
      : null;
    if (campHead) {
      var ths = campHead.querySelectorAll('thead th');
      if (ths[3]) ths[3].textContent = 'CPA';
    }

    // ── Search terms ──
    var stBody = document.getElementById('mkt-amz-terms-body');
    if (stBody) {
      // Update header
      var stHead = stBody.closest('table');
      if (stHead) {
        var hs = stHead.querySelectorAll('thead th');
        if (hs[3]) hs[3].textContent = 'CPA';
      }
      stBody.innerHTML = SEARCH_TERMS.map(function (t) {
        var cpa  = t.orders > 0 ? t.spend / t.orders : 0;
        var col  = cpa <= 8 ? 'style="color:var(--OK)"' : cpa > 15 ? 'style="color:var(--RED)"' : '';
        return '<tr>' +
          '<td>' + t.term + '</td>' +
          '<td class="r">' + t.orders + '</td>' +
          '<td class="r">' + t.clicks + '</td>' +
          '<td class="r" ' + col + '>' + (cpa > 0 ? fmtGBPd(cpa) : '—') + '</td>' +
        '</tr>';
      }).join('');
    }

    // ── Contribute to TACOS ──
    window.EDEN._adSpend = window.EDEN._adSpend || {};
    window.EDEN._adSpend.amazon = TOTALS.spend;
    if (window.EDEN.refreshAdTiles) window.EDEN.refreshAdTiles();

    console.log('[EDEN] Amazon Ads rendered. Spend: ' + fmtGBP(TOTALS.spend) + ' | Orders: ' + TOTALS.orders + ' | CPA: ' + fmtGBPd(cpa) + ' (Coupler 27 Mar)');
  }

  window.EDEN.components['amazon'] = { render: render };
})();
