// EDEN & CO. Critical Path 2026
// Status overrides persisted in localStorage. Click any row to cycle status.
(function () {
  'use strict';

  var STATUS_CYCLE  = ['not-started', 'on-track', 'done', 'blocked', 'overdue'];
  var STATUS_LABEL  = { 'done': 'Done', 'on-track': 'On Track', 'not-started': 'Not Started', 'blocked': 'Blocked', 'overdue': 'Overdue' };
  var _overrides    = {};
  var _filter       = 'all';
  var _initialised  = false;

  function loadOverrides() {
    try { _overrides = JSON.parse(localStorage.getItem('cp_overrides') || '{}'); }
    catch (e) { _overrides = {}; }
  }

  function saveOverrides() {
    try { localStorage.setItem('cp_overrides', JSON.stringify(_overrides)); } catch (e) {}
  }

  function effectiveStatus(item) {
    return _overrides[item.id] !== undefined ? _overrides[item.id] : item.status;
  }

  function render() {
    var data  = (window.EDEN || {})._criticalPath;
    if (!data || !data.items) return;
    var items = data.items;

    // Counts
    var counts = { done: 0, 'on-track': 0, 'not-started': 0, blocked: 0, overdue: 0 };
    items.forEach(function (i) { var s = effectiveStatus(i); counts[s] = (counts[s] || 0) + 1; });

    var total = items.length;
    var donePct = total ? Math.round(counts['done'] / total * 100) : 0;

    setEl('cp-stat-done',       counts['done']);
    setEl('cp-stat-ontrack',    counts['on-track']);
    setEl('cp-stat-pending',    counts['not-started']);
    setEl('cp-stat-blocked',    (counts['blocked'] || 0) + (counts['overdue'] || 0));
    setEl('cp-pct',             donePct + '%');

    var fill = document.getElementById('cp-progress-fill');
    if (fill) fill.style.width = donePct + '%';

    // Phase groups
    var phases = [], phaseMap = {};
    items.forEach(function (item) {
      if (!phaseMap[item.phase]) { phaseMap[item.phase] = []; phases.push(item.phase); }
      phaseMap[item.phase].push(item);
    });

    var html = '';
    phases.forEach(function (phase) {
      var all   = phaseMap[phase];
      var shown = all.filter(function (item) {
        if (_filter === 'all') return true;
        return effectiveStatus(item) === _filter;
      });
      if (!shown.length) return;

      var pDone = all.filter(function (i) { return effectiveStatus(i) === 'done'; }).length;
      html += '<tr class="cp-phase-row"><td colspan="6">'
        + '<span class="cp-phase-label">' + phase + '</span>'
        + '<span class="cp-phase-count">' + pDone + ' / ' + all.length + '</span>'
        + '</td></tr>';

      shown.forEach(function (item) {
        var s = effectiveStatus(item);
        var isOverridden = _overrides[item.id] !== undefined;
        html += '<tr class="cp-row" data-id="' + item.id + '" onclick="cpCycle(\'' + item.id + '\')">'
          + '<td class="cp-num">' + item.id + '</td>'
          + '<td class="cp-title">' + esc(item.title) + '</td>'
          + '<td class="cp-owner">' + esc(item.owner) + '</td>'
          + '<td class="cp-deadline">' + esc(item.deadline) + '</td>'
          + '<td class="cp-status-cell"><span class="cp-chip cp-chip-' + s + '">' + (STATUS_LABEL[s] || s) + '</span>'
          + (isOverridden ? '<span class="cp-override-dot" title="Status overridden locally. Right-click to reset." onclick="event.stopPropagation();cpReset(\'' + item.id + '\')">×</span>' : '')
          + '</td>'
          + '<td class="cp-notes">' + esc(item.notes) + '</td>'
          + '</tr>';
      });
    });

    var tbody = document.getElementById('cp-table-body');
    if (tbody) tbody.innerHTML = html;
  }

  function setEl(id, v) {
    var el = document.getElementById(id);
    if (el) el.textContent = v;
  }

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  window.cpCycle = function (id) {
    var data = (window.EDEN || {})._criticalPath;
    if (!data) return;
    var item = data.items.filter(function (i) { return i.id === id; })[0];
    if (!item) return;
    var cur = effectiveStatus(item);
    var idx = STATUS_CYCLE.indexOf(cur);
    _overrides[id] = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    saveOverrides();
    render();
  };

  window.cpReset = function (id) {
    delete _overrides[id];
    saveOverrides();
    render();
  };

  window.cpFilter = function (f, el) {
    _filter = f;
    document.querySelectorAll('.cp-filter-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.filter === f);
    });
    render();
  };

  window.cpResetAll = function () {
    if (!confirm('Reset all status overrides? This will restore the original status for all items.')) return;
    _overrides = {};
    saveOverrides();
    render();
  };

  window.cpInit = function () {
    if (!_initialised) { loadOverrides(); _initialised = true; }
    render();
  };
}());
