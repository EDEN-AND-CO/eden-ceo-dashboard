/**
 * EDEN & CO. CEO Flight Deck — Weekly Pulse Tab
 * Reads entirely from window.EDEN.teamPulse (built by scripts/build-team-pulse.py).
 * TP_META holds only the static per-person context not stored in the sheet.
 */

window.EDEN = window.EDEN || {};
window.EDEN.components = window.EDEN.components || {};

(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────
  var TP_OPEX      = 11205;
  var TP_ORDER_TGT = 50;

  // ── Person metadata — role, focus, noise (not in the sheet) ─────
  var TP_META = {
    Jon:    { role: 'CEO · Business Lead',            focus: 'Close deals. Own the money. Run the ads.',        noise: ['New product line decision', 'EU 90-day review', 'Supplier relationship calls'] },
    Rosie:  { role: 'Brand + UX + Team Support',      focus: 'Brand QA. Team happy. Customer satisfied.',       noise: ['EU translation review', 'New product copy', 'Website copy refresh'] },
    Edith:  { role: 'Marketing',                      focus: 'One sentence first. Then depth. Then publish.',   noise: ['B2B lead list support', 'EU listing copy', 'PR pitches', 'Klaviyo flows'] },
    Phoebe: { role: 'Operations',                     focus: 'Orders out. Stock in. Nothing breaks.',           noise: ['EU fulfilment process docs', 'Supplier SLA review', 'Returns process write-up'] }
  };

  var PEOPLE = ['Jon', 'Rosie', 'Edith', 'Phoebe'];

  // ── State ────────────────────────────────────────────────────────
  // Completed tasks hidden by default
  var tpHideDone = true;
  var tpInitialised = false;

  // ── Helpers ─────────────────────────────────────────────────────
  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function duePill(due) {
    if (!due) return '';
    var today = new Date(); today.setHours(0,0,0,0);
    var d = new Date(due); d.setHours(0,0,0,0);
    var days = Math.round((d - today) / 86400000);
    if (days < 0)  return '<span class="tp-c-due overdue">Overdue by ' + Math.abs(days) + 'd</span>';
    if (days <= 3) return '<span class="tp-c-due soon">Due ' + (days === 0 ? 'today' : days === 1 ? 'tomorrow' : 'in ' + days + 'd') + '</span>';
    return '<span class="tp-c-due on-time">Due ' + d.toLocaleDateString('en-GB', { day:'numeric', month:'short' }) + '</span>';
  }

  // ── Info bar ────────────────────────────────────────────────────
  function updateInfoBar() {
    var n = new Date(), s = new Date(n.getFullYear(), 0, 1);
    var w = Math.ceil(((n - s) / 86400000 + s.getDay() + 1) / 7);
    var mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var mon = new Date(n); mon.setDate(n.getDate() - ((n.getDay() + 6) % 7));
    var fri = new Date(mon); fri.setDate(mon.getDate() + 4);
    var xmas = new Date(n.getFullYear(), 11, 25);
    if (xmas < n) xmas.setFullYear(n.getFullYear() + 1);
    var weeksX = Math.ceil((xmas - n) / 604800000);
    var yStart = new Date(n.getFullYear(), 0, 1), yEnd = new Date(n.getFullYear() + 1, 0, 1);
    var yPct = Math.round((n - yStart) / (yEnd - yStart) * 100);

    function el(id) { return document.getElementById(id); }
    el('tp-wk-dates').textContent = mon.getDate() + ' ' + mo[mon.getMonth()] + ' \u2013 ' + fri.getDate() + ' ' + mo[fri.getMonth()];
    el('tp-wk-num').textContent   = 'Week ' + w;
    el('tp-wk-xmas').textContent  = weeksX + 'w to Christmas';
    el('tp-year-pct').textContent = yPct + '% of ' + n.getFullYear();

    var bar = document.querySelector('#tab-goals .tp-info-bar');
    if (bar) bar.style.setProperty('--tp-year-pct', yPct + '%');

    var qMap = { 'tp-q1': [0,1,2], 'tp-q2': [3,4,5], 'tp-q3': [6,7,8], 'tp-q4': [9,10,11] };
    var month = n.getMonth();
    var ids = Object.keys(qMap);
    for (var qi = 0; qi < ids.length; qi++) {
      var qEl = document.getElementById(ids[qi]);
      if (!qEl) continue;
      var active = qMap[ids[qi]].indexOf(month) !== -1;
      if (active) qEl.classList.add('active'); else qEl.classList.remove('active');
    }
  }

  function updateStats(revMTD, ordersMTD) {
    var now = new Date();
    var daysElapsed = now.getDate();
    var ordersPace  = TP_ORDER_TGT * daysElapsed;
    var toOpEx      = Math.max(0, TP_OPEX - (revMTD || 0));

    var revEl  = document.getElementById('tp-stat-rev');
    var opexEl = document.getElementById('tp-stat-opex');
    var ordEl  = document.getElementById('tp-stat-orders');
    if (!revEl) return;

    if (revMTD != null) {
      revEl.textContent = 'Rev MTD: \u00a3' + Math.round(revMTD).toLocaleString('en-GB');
      var ratio  = revMTD / TP_OPEX;
      var revCol = ratio >= 1 ? 'var(--tp-green-mid)' : ratio >= 0.8 ? 'var(--tp-amber)' : 'var(--tp-red)';
      revEl.style.color = revCol; revEl.style.borderColor = revCol;
      opexEl.textContent = toOpEx === 0 ? 'OpEx: covered' : 'To OpEx: \u00a3' + Math.round(toOpEx).toLocaleString('en-GB');
      var opCol = toOpEx === 0 ? 'var(--tp-green-mid)' : toOpEx < 5000 ? 'var(--tp-amber)' : 'var(--tp-red)';
      opexEl.style.color = opCol; opexEl.style.borderColor = opCol;
    }
    if (ordersMTD != null) {
      ordEl.textContent = 'Orders: ' + ordersMTD;
      var pace   = ordersMTD / ordersPace;
      var ordCol = pace >= 0.9 ? 'var(--tp-green-mid)' : pace >= 0.8 ? 'var(--tp-amber)' : 'var(--tp-red)';
      ordEl.style.color = ordCol; ordEl.style.borderColor = ordCol;
    }
  }

  // ── Build lane data from cache ───────────────────────────────────
  // Returns { categories, noise } — noise populated from sheet Other column
  function buildPersonData(person, coreGoals, weeklyRows, currentWeek) {
    var categories = {};
    var sheetNoise = [];

    // Core goals — built entirely from the sheet
    var cg = coreGoals[person] || {};
    var cgList = [];
    var titles = Object.keys(cg);
    for (var ti = 0; ti < titles.length; ti++) {
      var title = titles[ti];
      var g = cg[title];
      cgList.push({
        title:  title,
        status: g.status || '',
        goals:  g.goals  || [],
        note:   '',
        parent: ''
      });
    }
    if (cgList.length) categories['Core goals'] = cgList;

    // This week — from the person's weekly tab, current week only
    var rows = weeklyRows[person] || [];
    for (var ri = 0; ri < rows.length; ri++) {
      var row = rows[ri];
      if (row.week !== currentWeek || !row.task) continue;
      var cat = row.category || 'This week';

      // Category = 'Other' → noise bucket, not a task
      if (cat === 'Other') {
        sheetNoise.push(row.task);
        continue;
      }

      // Sanitize parent — unevaluated formula strings start with '='
      var parentVal = (row.parent && row.parent.charAt(0) === '=') ? '' : (row.parent || '');

      // Urgent rows render in This week section with urgent flag
      var isUrgent = cat === 'Urgent';
      var targetCat = isUrgent ? 'This week' : cat;
      if (!categories[targetCat]) categories[targetCat] = [];
      categories[targetCat].push({
        title:   row.task,
        status:  row.status || '',
        parent:  parentVal,
        note:    row.note   || '',
        goals:   [],
        urgent:  isUrgent
      });
    }
    // Ensure This week section exists even if empty
    if (!categories['This week']) categories['This week'] = [];

    return { categories: categories, noise: sheetNoise };
  }

  // ── Lane renderer ────────────────────────────────────────────────
  function buildLane(name, meta, categories, ytd, streak, extraNoise) {
    var blockedCount = 0;
    var catKeys = Object.keys(categories);
    var catsHtml = '';

    for (var ci = 0; ci < catKeys.length; ci++) {
      var cat    = catKeys[ci];
      var tasks  = categories[cat];
      var isWeek = cat === 'This week';
      var isOther = cat === 'Other';
      var catId  = 'tp-cat-' + name + '-' + cat.replace(/\s+/g,'-');
      var tasksHtml = '';

      for (var ti = 0; ti < tasks.length; ti++) {
        var t    = tasks[ti];
        var num  = ti + 1;
        var done = t.status === 'done';
        var isOverdue = isWeek && t.status === 'overdue';
        var isUrgent  = isWeek && !!t.urgent;
        if (!isWeek && !isOther && t.status === 'blocked') blockedCount++;

        var taskCls = done ? ' done' : isUrgent ? ' urgent' : isOverdue ? ' overdue' : '';
        var dotCls  = done ? 'done'
                    : (t.status === 'on' || t.status === 'on-track') ? 'on'
                    : t.status === 'blocked' ? 'blocked'
                    : isOverdue ? 'overdue'
                    : isUrgent  ? 'overdue' : '';

        var numEl  = isWeek  ? '<div class="tp-num action' + (isUrgent ? ' urgent' : '') + '">' + num + '</div>'
                   : isOther ? '<div class="tp-num other">\xb7</div>'
                   :           '<div class="tp-num">' + num + '</div>';

        var parentTag = t.parent ? '<div class="tp-parent-tag">\u2191 ' + esc(t.parent) + '</div>' : '';
        var noteId    = 'tp-note-' + name + '-' + num;
        var noteBtn   = isWeek ? '<button class="tp-note-btn" onclick="document.getElementById(\'' + noteId + '\').classList.toggle(\'open\')">note \u25be</button>' : '';
        var noteHtml  = isWeek ? '<div class="tp-note" id="' + noteId + '">' + esc(t.note || 'No note added.') + '</div>' : '';
        var overdueNote = (isOverdue && !t.note) ? '<div class="tp-overdue-note">Not done \u2014 note required before Monday.</div>' : '';

        var goalsHtml = '';
        if (t.goals && t.goals.length) {
          goalsHtml = '<div class="tp-goals">';
          for (var gi = 0; gi < t.goals.length; gi++) {
            var g = t.goals[gi];
            goalsHtml += '<div class="tp-goal-row"><div class="tp-mgdot" onclick="this.classList.toggle(\'done\')"></div>'
              + '<div class="tp-goal-text">' + esc(g.t) + '</div>'
              + (g.m ? '<div class="tp-metric' + (isWeek ? ' am' : '') + '">' + esc(g.m) + '</div>' : '')
              + '</div>';
          }
          goalsHtml += '</div>';
        }

        tasksHtml += '<div class="tp-task' + (isWeek ? ' week' : '') + taskCls + (done && tpHideDone ? ' hidden' : '') + '">'
          + '<div class="tp-task-hd' + (t.goals && t.goals.length ? '' : ' bare') + '">' + numEl
          + '<div style="flex:1"><div class="tp-task-title' + (done ? ' struck' : '') + '">' + esc(t.title) + '</div>' + parentTag + '</div>'
          + noteBtn + '<div class="tp-dot ' + dotCls + '"></div></div>'
          + goalsHtml + noteHtml + overdueNote
          + '</div>';
      }

      catsHtml += '<div class="tp-cat-lbl" onclick="var b=document.getElementById(\'' + catId + '\');b.classList.toggle(\'collapsed\');this.querySelector(\'.tp-cat-toggle\').textContent=b.classList.contains(\'collapsed\')?\'show\':\'hide\'">'
        + esc(cat) + '<span class="tp-cat-toggle">hide</span></div>'
        + '<div class="tp-cat-body" id="' + catId + '">' + tasksHtml + '</div>';
    }

    var noiseItems = (meta.noise || []).concat(extraNoise || []);
    var noiseHtml = noiseItems.length
      ? '<div class="tp-noise"><div class="tp-noise-lbl">Noise bucket \u2014 when there\u2019s time</div><div class="tp-noise-items">'
        + noiseItems.map(function(n) { return '<span class="tp-noise-item">' + esc(n) + '</span>'; }).join('')
        + '</div></div>' : '';

    var streakHtml = streak > 1 ? '<span class="tp-streak">' + streak + ' weeks on track</span>' : '';

    return {
      html: '<div class="tp-lane">'
        + '<div class="tp-lane-hd"><div>'
        + '<div class="tp-lane-name">' + esc(name) + '</div>'
        + '<div class="tp-lane-role">' + esc(meta.role) + '</div>'
        + '<div class="tp-lane-meta"><span class="tp-ytd-badge">' + ytd + ' done YTD</span>' + streakHtml + '</div>'
        + '</div><div class="tp-focus">' + esc(meta.focus) + '</div></div>'
        + '<div class="tp-lane-body">' + catsHtml + '</div>'
        + noiseHtml + '</div>',
      blocked: blockedCount
    };
  }

  // ── Render ───────────────────────────────────────────────────────
  function render(laneData, concerns, ytdMap, streakMap, noiseMap) {
    var totalBlocked = 0;
    var lanesHtml = '';
    for (var pi = 0; pi < PEOPLE.length; pi++) {
      var name = PEOPLE[pi];
      var ld   = laneData[name];
      if (!ld) continue;
      var r = buildLane(name, TP_META[name] || { role:'', focus:'', noise:[] }, ld, ytdMap[name] || 0, streakMap[name] || 0, (noiseMap && noiseMap[name]) || []);
      totalBlocked += r.blocked;
      lanesHtml += r.html;
    }

    var lanes = document.getElementById('tp-lanes');
    if (lanes) lanes.innerHTML = lanesHtml || '<div style="padding:40px;text-align:center;color:var(--tp-muted)">No data — run build-team-pulse.py then refresh.</div>';

    var ns = ['jon','rosie','edith','phoebe'];
    for (var ni = 0; ni < ns.length; ni++) {
      var el = document.getElementById('tp-ytd-' + ns[ni]);
      var key = ns[ni].charAt(0).toUpperCase() + ns[ni].slice(1);
      if (el) el.textContent = ytdMap[key] || 0;
    }

    // Concerns grid
    var today = new Date(); today.setHours(0,0,0,0);
    var cgEl = document.getElementById('tp-concerns-grid');
    if (cgEl) {
      if (!concerns || !concerns.length) {
        cgEl.innerHTML = '<div style="color:var(--tp-muted);font-size:13px;padding:10px 0">No open concerns.</div>';
      } else {
        var cgHtml = '';
        for (var ci = 0; ci < concerns.length; ci++) {
          var c   = concerns[ci];
          var due = c.due ? new Date(c.due) : null;
          if (due) due.setHours(0,0,0,0);
          var isOv = due && due < today;
          cgHtml += '<div class="tp-concern ' + (isOv ? 'overdue' : (c.level || 'med')) + '">'
            + '<div class="tp-c-level">' + (c.level === 'high' ? 'High' : c.level === 'med' ? 'Medium' : esc(c.level || '')) + ' \xb7 ' + esc(c.owner || '') + '</div>'
            + '<div class="tp-c-title">' + esc(c.title) + '</div>'
            + '<div class="tp-c-action">' + esc(c.action || '') + '</div>'
            + duePill(c.due) + '</div>';
        }
        cgEl.innerHTML = cgHtml;
      }
    }
  }

  // ── Toggle completed ─────────────────────────────────────────────
  window.tpToggleHide = function() {
    var cb = document.getElementById('tp-show-done');
    tpHideDone = cb ? !cb.checked : true;
    var tasks = document.querySelectorAll('#tab-goals .tp-task.done');
    for (var i = 0; i < tasks.length; i++) {
      if (tpHideDone) tasks[i].classList.add('hidden');
      else tasks[i].classList.remove('hidden');
    }
  };

  // ── Fetch from cache and render ──────────────────────────────────
  function fetchAndRender() {
    try {
      var cache = window.EDEN && window.EDEN.teamPulse;

      if (!cache) {
        var db = document.getElementById('tp-demo-bar');
        if (db) db.style.display = 'block';
        // Render empty lanes — no static data fallback
        var emptyLanes = {};
        for (var pi = 0; pi < PEOPLE.length; pi++) {
          emptyLanes[PEOPLE[pi]] = { 'Core goals': [], 'This week': [] };
        }
        render(emptyLanes, [], {}, {}, {});
        return;
      }

      var wk     = cache.current_week;
      var cg     = cache.core_goals || {};
      var weekly = cache.weekly     || {};

      // Build lane data per person entirely from cache
      var laneData = {};
      var laneNoise = {};
      for (var pi = 0; pi < PEOPLE.length; pi++) {
        var person = PEOPLE[pi];
        var pd = buildPersonData(person, cg, weekly, wk);
        laneData[person] = pd.categories;
        laneNoise[person] = pd.noise;
      }

      render(laneData, cache.concerns || [], cache.ytd || {}, cache.streak || {}, laneNoise);

    } catch (e) {
      console.error('Team Pulse render error:', e);
      var lanesEl = document.getElementById('tp-lanes');
      if (lanesEl) lanesEl.innerHTML = '<div style="padding:40px;color:#c94444;text-align:center">Render error — check console.<br><small>' + esc(String(e)) + '</small></div>';
    }
  }

  // ── Public ───────────────────────────────────────────────────────
  window.tpInit = function() {
    updateInfoBar();
    fetchAndRender();
  };

  window.tpActivate = function() {
    if (!tpInitialised) {
      tpInit();
      tpInitialised = true;
    }
    var edenData = window.EDEN && window.EDEN._data;
    var m = window.EDEN && window.EDEN.metrics;
    if (edenData && edenData.orders && m && m.getMTDOrders) {
      var active = edenData.orders.filter(function(o) { return o.status !== 'cancelled' && o.status !== 'on_hold'; });
      var mtd = m.getMTDOrders(active);
      var revMTD = mtd.reduce(function(s, o) { return s + (o.amount_paid || 0); }, 0);
      updateStats(revMTD, mtd.length);
    }
  };

  window.tpUpdateStats = updateStats;
  window.EDEN.components.goals = {
    render: function(data) {
      // Called by renderAll after orders data loads — populate the info bar stats
      var m = window.EDEN.metrics;
      if (!data || !data.orders || !m || !m.getMTDOrders) return;
      var active = data.orders.filter(function(o) { return o.status !== 'cancelled' && o.status !== 'on_hold'; });
      var mtd = m.getMTDOrders(active);
      var revMTD = mtd.reduce(function(s, o) { return s + (o.amount_paid || 0); }, 0);
      updateStats(revMTD, mtd.length);
    }
  };

})();
