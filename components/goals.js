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
  var TP_OPEX = 10230;
  var TP_ORDER_TGT = 50;

  // ── Person metadata — role, focus, noise (not in the sheet) ─────
  var TP_META = {
    Jon:    { role: 'CEO · Business Lead',            focus: 'Close deals. Own the money. Run the ads.',        noise: [] },
    Rosie:  { role: 'Brand + UX + Team Support',      focus: 'Brand QA. Team happy. Customer satisfied.',       noise: [] },
    Edith:  { role: 'Marketing',                      focus: 'One sentence first. Then depth. Then publish.',   noise: [] },
    Phoebe: { role: 'Operations',                     focus: 'Orders out. Stock in. Nothing breaks.',           noise: [] }
  };

  var PEOPLE = ['Jon', 'Rosie', 'Edith', 'Phoebe'];

  var TP_QUOTES = [
    "Discipline is the bridge between goals and accomplishment.",
    "Small daily improvements over time lead to stunning results.",
    "Don't watch the clock. Do what it does. Keep going.",
    "The secret of getting ahead is getting started.",
    "Success is the sum of small efforts repeated day in and day out.",
    "Focus on being productive instead of busy.",
    "You don't have to be great to start, but you have to start to be great.",
    "Work hard in silence. Let success make the noise.",
    "Don't count the days, make the days count.",
    "The harder you work for something, the greater you'll feel when you achieve it.",
    "Dream big. Start small. Act now.",
    "Push yourself, because no one else is going to do it for you.",
    "Great things never come from comfort zones.",
    "It always seems impossible until it's done.",
    "Don't stop when you're tired. Stop when you're done.",
    "Wake up with determination. Go to bed with satisfaction.",
    "Do something today that your future self will thank you for.",
    "Little things make big days.",
    "It's going to be hard, but hard is not impossible.",
    "Don't wait for opportunity. Create it.",
    "Sometimes we're tested not to show our weaknesses, but to discover our strengths.",
    "The key to success is to focus on goals, not obstacles.",
    "Dream it. Wish it. Do it.",
    "Stay focused and never give up.",
    "Believe you can and you're halfway there.",
    "Act as if what you do makes a difference. It does.",
    "Success is not final, failure is not fatal — it is the courage to continue that counts.",
    "You are never too old to set another goal or dream a new dream.",
    "Knowing is not enough; we must apply. Wishing is not enough; we must do."
  ];

  function setWeeklyQuote(weekKey) {
    var el = document.getElementById('tp-quote-text');
    if (!el) return;
    var wn = weekKey ? parseInt(weekKey.split('-W')[1], 10) || 0 : 0;
    el.textContent = '\u201c' + TP_QUOTES[wn % TP_QUOTES.length] + '\u201d';
  }

  // ── State ────────────────────────────────────────────────────────
  var tpHideDone = true;
  var tpInitialised = false;
  var _laneData   = {};
  var _laneNoise  = {};
  var _ytdMap     = {};
  var _streakMap  = {};
  var _openPerson = null;

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
      if (!row.task) continue;
      var cat = row.category || 'This week';

      // Category = 'Other' → noise bucket (week-agnostic — always show)
      if (cat === 'Other') {
        sheetNoise.push(row.task);
        continue;
      }

      // Skip rows from future weeks
      if (row.week && row.week > currentWeek) continue;

      // Sanitize parent — unevaluated formula strings start with '='
      var parentVal = (row.parent && row.parent.charAt(0) === '=') ? '' : (row.parent || '');

      // Tasks from a prior week that aren't done are overdue
      var isPriorWeek = row.week && row.week < currentWeek;
      var status = row.status || '';
      if (isPriorWeek && status !== 'done') status = 'overdue';

      // Urgent rows render in This week section with urgent flag
      var isUrgent = cat === 'Urgent';
      var targetCat = isUrgent ? 'This week' : cat;
      if (!categories[targetCat]) categories[targetCat] = [];
      categories[targetCat].push({
        title:      row.task,
        status:     status,
        parent:     parentVal,
        note:       row.note || '',
        goals:      [],
        urgent:     isUrgent,
        priorWeek:  isPriorWeek,
        weekLabel:  isPriorWeek ? row.week : ''
      });
    }
    // Ensure This week section exists even if empty
    if (!categories['This week']) categories['This week'] = [];

    return { categories: categories, noise: sheetNoise };
  }

  // ── Scorecard helpers ────────────────────────────────────────────
  function countWeekTasks(categories) {
    var tasks = categories['This week'] || [];
    var done = 0, ontrack = 0, overdue = 0;
    for (var i = 0; i < tasks.length; i++) {
      var s = tasks[i].status;
      if (s === 'done')    done++;
      else if (s === 'overdue') overdue++;
      else                 ontrack++;
    }
    return { done: done, ontrack: ontrack, overdue: overdue, total: tasks.length };
  }

  // ── Task renderer (shared by detail panel) ───────────────────────
  function renderTask(t, isWeekCat, idx) {
    var done     = t.status === 'done';
    var isOv     = t.status === 'overdue';
    var isUrgent = isWeekCat && !!t.urgent;
    var dotCls   = done ? 'done'
                 : (t.status === 'on' || t.status === 'on-track') ? 'on'
                 : t.status === 'blocked' ? 'blocked'
                 : isOv ? 'overdue' : isUrgent ? 'overdue' : '';

    var parentTag = t.parent ? '<div class="tp-parent-tag">\u2191 ' + esc(t.parent) + '</div>' : '';
    var weekTag   = (t.priorWeek && t.weekLabel)
                  ? '<div class="tp-parent-tag" style="color:var(--RED,#c0392b)">\u23f0 ' + esc(t.weekLabel) + ' \u2014 not completed</div>' : '';

    var noteId  = 'tp-n-' + (t.title || '').replace(/\W/g,'').slice(0,12) + idx;
    var noteBtn = isWeekCat ? '<button class="tp-note-btn" onclick="document.getElementById(\'' + noteId + '\').classList.toggle(\'open\')">note \u25be</button>' : '';
    var noteHtml = isWeekCat ? '<div class="tp-note" id="' + noteId + '">' + esc(t.note || 'No note added.') + '</div>' : '';
    var overdueNote = (isOv && isWeekCat && !t.note) ? '<div class="tp-overdue-note">Not done \u2014 note required before Monday.</div>' : '';

    var goalsHtml = '';
    if (t.goals && t.goals.length) {
      goalsHtml = '<div class="tp-goals">';
      for (var gi = 0; gi < t.goals.length; gi++) {
        var g = t.goals[gi];
        goalsHtml += '<div class="tp-goal-row"><div class="tp-mgdot' + (done ? ' done' : '') + '" onclick="this.classList.toggle(\'done\')"></div>'
          + '<div class="tp-goal-text">' + esc(g.t) + '</div>'
          + (g.m ? '<div class="tp-metric">' + esc(g.m) + '</div>' : '')
          + '</div>';
      }
      goalsHtml += '</div>';
    }

    var taskCls = done ? ' done' : isUrgent ? ' urgent' : isOv ? ' overdue' : '';
    return '<div class="tp-task' + (isWeekCat ? ' week' : '') + taskCls + '">'
      + '<div class="tp-task-hd' + (goalsHtml ? '' : ' bare') + '">'
      + '<div style="flex:1"><div class="tp-task-title' + (done ? ' struck' : '') + '">' + esc(t.title) + '</div>' + parentTag + weekTag + '</div>'
      + noteBtn + '<div class="tp-dot ' + dotCls + '"></div></div>'
      + goalsHtml + noteHtml + overdueNote + '</div>';
  }

  // ── Detail section block ─────────────────────────────────────────
  function buildDsec(label, id, tasks, isWeekCat, startOpen) {
    var bodyId = 'tp-ds-' + id;
    var collapsed = startOpen ? '' : ' collapsed';
    var toggleTxt = startOpen ? 'hide' : 'show';
    var tasksHtml = '';
    for (var i = 0; i < tasks.length; i++) tasksHtml += renderTask(tasks[i], isWeekCat, i);
    return '<div class="tp-dsec">'
      + '<div class="tp-dsec-hd" onclick="var b=document.getElementById(\'' + bodyId + '\');b.classList.toggle(\'collapsed\');this.querySelector(\'.tp-dsec-toggle\').textContent=b.classList.contains(\'collapsed\')?\'show\':\'hide\'">'
      + '<div class="tp-dsec-lbl">' + esc(label) + '</div><span class="tp-dsec-toggle">' + toggleTxt + '</span></div>'
      + '<div class="tp-dsec-body' + collapsed + '" id="' + bodyId + '"><div class="tp-detail-tasks">' + tasksHtml + '</div></div>'
      + '</div>';
  }

  // ── Build full detail panel for one person ───────────────────────
  function buildDetailPanel(name, categories, noise, ytd, streak) {
    var meta = TP_META[name] || { role: '', focus: '' };

    // Completed tasks — pulled from all categories
    var doneTasks = [];
    var catKeys = Object.keys(categories);
    for (var ci = 0; ci < catKeys.length; ci++) {
      var arr = categories[catKeys[ci]];
      for (var ti = 0; ti < arr.length; ti++) {
        if (arr[ti].status === 'done') doneTasks.push(arr[ti]);
      }
    }
    var streakBadge = streak > 1 ? '<span class="tp-ytd-badge" style="margin-left:12px">' + streak + ' wk streak</span>' : '';

    var html = '<div class="tp-detail-hd">'
      + '<div><div class="tp-detail-name">' + esc(name) + '</div>'
      + '<div class="tp-detail-role">' + esc(meta.role) + '</div>'
      + '<div style="margin-top:8px"><span class="tp-ytd-badge">' + ytd + ' done YTD</span>' + streakBadge + '</div></div>'
      + '<div class="tp-detail-focus">' + esc(meta.focus) + '</div>'
      + '<button class="tp-detail-close" onclick="tpClosePerson()">\u2715 Close</button>'
      + '</div>'
      + '<div class="tp-detail-body">';

    // Tasks completed — always open, no toggle
    html += '<div class="tp-dsec tp-dsec-completed">'
      + '<div class="tp-dsec-hd tp-dsec-always"><div class="tp-dsec-lbl">Tasks completed this week</div>'
      + '<div class="tp-dsec-count">' + doneTasks.length + '</div></div>'
      + '<div class="tp-dsec-body"><div class="tp-detail-tasks">';
    if (doneTasks.length) {
      for (var di = 0; di < doneTasks.length; di++) html += renderTask(doneTasks[di], false, di);
    } else {
      html += '<div class="tp-dsec-empty">No tasks completed yet this week.</div>';
    }
    html += '</div></div></div>';

    // Core goals — collapsible, default open
    var cg = categories['Core goals'] || [];
    if (cg.length) html += buildDsec('Core goals', name + '-cg', cg, false, true);

    // This week active — collapsible, default open
    var wk = (categories['This week'] || []).filter(function(t) { return t.status !== 'done'; });
    if (wk.length) html += buildDsec('This week', name + '-wk', wk, true, true);

    // Monthly — collapsible, default open
    var mo = (categories['Monthly'] || []).filter(function(t) { return t.status !== 'done'; });
    if (mo.length) html += buildDsec('Monthly', name + '-mo', mo, false, true);

    // Noise — collapsible, default open
    var noiseItems = noise || [];
    if (noiseItems.length) {
      var noiseId = 'tp-ds-' + name + '-noise';
      html += '<div class="tp-dsec">'
        + '<div class="tp-dsec-hd" onclick="var b=document.getElementById(\'' + noiseId + '\');b.classList.toggle(\'collapsed\');this.querySelector(\'.tp-dsec-toggle\').textContent=b.classList.contains(\'collapsed\')?\'show\':\'hide\'">'
        + '<div class="tp-dsec-lbl">Noise bucket \u2014 when there\'s time</div><span class="tp-dsec-toggle">hide</span></div>'
        + '<div class="tp-dsec-body" id="' + noiseId + '">'
        + '<div class="tp-noise-items">' + noiseItems.map(function(n) { return '<span class="tp-noise-item">' + esc(n) + '</span>'; }).join('') + '</div>'
        + '</div></div>';
    }

    html += '</div>'; // tp-detail-body
    return html;
  }

  // ── Render ───────────────────────────────────────────────────────
  function render(laneData, concerns, ytdMap, streakMap, noiseMap) {
    // Store at module scope for accordion
    _laneData  = laneData;
    _laneNoise = noiseMap || {};
    _ytdMap    = ytdMap;
    _streakMap = streakMap;

    // Build scorecard cards
    var scorecard = document.getElementById('tp-scorecard');
    if (scorecard) {
      var scHtml = '';
      for (var pi = 0; pi < PEOPLE.length; pi++) {
        var name   = PEOPLE[pi];
        var meta   = TP_META[name] || { role: '' };
        var cats   = laneData[name] || {};
        var counts = countWeekTasks(cats);
        var ytd    = ytdMap[name] || 0;

        var statsHtml = '';
        if (counts.done)    statsHtml += '<span class="tp-cs done">' + counts.done + ' done</span>';
        if (counts.ontrack) statsHtml += '<span class="tp-cs ontrack">' + counts.ontrack + ' on track</span>';
        if (counts.overdue) statsHtml += '<span class="tp-cs overdue">' + counts.overdue + ' overdue</span>';
        if (!counts.total)  statsHtml += '<span class="tp-cs ontrack">No tasks</span>';

        scHtml += '<div class="tp-card" id="tp-card-' + name + '" onclick="tpOpenPerson(\'' + name + '\')">'
          + '<div class="tp-card-name">' + esc(name) + '</div>'
          + '<div class="tp-card-role">' + esc(meta.role) + '</div>'
          + '<div class="tp-seg-bar">'
          + (counts.done    ? '<div class="tp-seg seg-done" style="flex:' + counts.done + '"></div>' : '')
          + (counts.ontrack ? '<div class="tp-seg seg-ontrack" style="flex:' + counts.ontrack + '"></div>' : '')
          + (counts.overdue ? '<div class="tp-seg seg-overdue" style="flex:' + counts.overdue + '"></div>' : '')
          + (!counts.total  ? '<div class="tp-seg seg-empty" style="flex:1"></div>' : '')
          + '</div>'
          + '<div class="tp-card-stats">' + statsHtml + '</div>'
          + '<div class="tp-card-ytd">' + ytd + ' done YTD</div>'
          + '<div class="tp-card-expand">View detail \u25be</div>'
          + '</div>';
      }
      scorecard.innerHTML = scHtml;
    }

    // Concerns grid
    var today = new Date(); today.setHours(0,0,0,0);
    var cgEl  = document.getElementById('tp-concerns-grid');
    if (cgEl) {
      if (!concerns || !concerns.length) {
        cgEl.innerHTML = '<div style="color:var(--tp-muted);font-size:13px;padding:10px 0">No open concerns this week.</div>';
      } else {
        var cgHtml = '';
        for (var ci = 0; ci < concerns.length; ci++) {
          var c   = concerns[ci];
          var due = c.due ? new Date(c.due) : null;
          if (due) due.setHours(0,0,0,0);
          var isOv2 = due && due < today;
          cgHtml += '<div class="tp-concern ' + (isOv2 ? 'overdue' : (c.level || 'med')) + '">'
            + '<div class="tp-c-level">' + (c.level === 'high' ? 'High' : c.level === 'med' ? 'Medium' : esc(c.level || '')) + ' \xb7 ' + esc(c.owner || '') + '</div>'
            + '<div class="tp-c-title">' + esc(c.title) + '</div>'
            + '<div class="tp-c-action">' + esc(c.action || '') + '</div>'
            + duePill(c.due) + '</div>';
        }
        cgEl.innerHTML = cgHtml;
      }
    }
  }

  // ── Accordion — open one person at a time ────────────────────────
  window.tpOpenPerson = function(name) {
    if (_openPerson === name) { tpClosePerson(); return; }
    _openPerson = name;

    for (var pi = 0; pi < PEOPLE.length; pi++) {
      var card = document.getElementById('tp-card-' + PEOPLE[pi]);
      if (!card) continue;
      var exp = card.querySelector('.tp-card-expand');
      if (PEOPLE[pi] === name) {
        card.classList.add('active');
        if (exp) exp.innerHTML = 'Close \u25b4';
      } else {
        card.classList.remove('active');
        if (exp) exp.innerHTML = 'View detail \u25be';
      }
    }

    var panel = document.getElementById('tp-detail');
    if (panel) {
      panel.innerHTML = buildDetailPanel(name, _laneData[name] || {}, _laneNoise[name] || [], _ytdMap[name] || 0, _streakMap[name] || 0);
      panel.style.display = 'block';
      setTimeout(function() { panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
    }
  };

  window.tpClosePerson = function() {
    _openPerson = null;
    for (var pi = 0; pi < PEOPLE.length; pi++) {
      var card = document.getElementById('tp-card-' + PEOPLE[pi]);
      if (!card) continue;
      card.classList.remove('active');
      var exp = card.querySelector('.tp-card-expand');
      if (exp) exp.innerHTML = 'View detail \u25be';
    }
    var panel = document.getElementById('tp-detail');
    if (panel) { panel.style.display = 'none'; panel.innerHTML = ''; }
  };

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
      setWeeklyQuote(wk);
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
    var cache = window.EDEN && window.EDEN.teamPulse;
    setWeeklyQuote(cache ? cache.current_week : null);
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
