// ════════════════════════════════════════════════════════════════
//  GRIDPRO — Advanced Spreadsheet Engine
// ════════════════════════════════════════════════════════════════

const ROWS = 50, COLS = 26;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// ─── STATE ────────────────────────────────────────────────────
let state = {
  sheets: [createSheet('Hoja1')],
  activeSheet: 0,
};
let active = { r: 0, c: 0 };
let selStart = { r: 0, c: 0 }, selEnd = { r: 0, c: 0 };
let isEditing = false, isDragging = false, isSelecting = false;
let clipboard = { cells: null, cut: false };
let undoStack = [], redoStack = [];
let colWidths = new Array(COLS).fill(100);
let frozenRows = 0, frozenCols = 0;

// Spell check
let spellErrors = [], spellIdx = 0;
let spellIgnored = new Set();

// Find
let findMatches = [], findIdx = 0;

function createSheet(name) {
  return {
    name,
    data: Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => ({
        v: '', f: '', fmt: {}
      }))
    )
  };
}

function sheet() { return state.sheets[state.activeSheet]; }
function cell(r, c) { return sheet().data[r]?.[c]; }
function colName(c) { return ALPHABET[c]; }
function cellAddr(r, c) { return `${colName(c)}${r + 1}`; }

// ─── BUILD TABLE ──────────────────────────────────────────────
function buildTable() {
  const thead = document.querySelector('#spreadsheet thead');
  const tbody = document.querySelector('#spreadsheet tbody');
  thead.innerHTML = '';
  tbody.innerHTML = '';

  // Header row
  const hr = document.createElement('tr');
  const corner = document.createElement('th');
  corner.className = 'corner-cell';
  corner.innerHTML = `<div class="corner-cell-inner"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18"/></svg></div>`;
  corner.querySelector('.corner-cell-inner').addEventListener('click', selectAll);
  hr.appendChild(corner);

  for (let c = 0; c < COLS; c++) {
    const th = document.createElement('th');
    th.className = 'col-header';
    th.dataset.col = c;
    th.style.width = colWidths[c] + 'px';
    th.innerHTML = `<div class="col-header-inner">${colName(c)}<div class="col-resize" data-col="${c}"></div></div>`;
    th.addEventListener('click', (e) => { if (!e.target.classList.contains('col-resize')) selectCol(c, e); });
    hr.appendChild(th);
  }
  thead.appendChild(hr);

  // Data rows
  for (let r = 0; r < ROWS; r++) {
    const tr = document.createElement('tr');
    const rh = document.createElement('td');
    rh.className = 'row-header';
    rh.dataset.row = r;
    rh.innerHTML = `<div class="row-header-inner">${r + 1}</div>`;
    rh.addEventListener('click', (e) => selectRow(r, e));
    tr.appendChild(rh);

    for (let c = 0; c < COLS; c++) {
      const td = document.createElement('td');
      td.className = 'data-cell';
      td.dataset.r = r; td.dataset.c = c;
      td.innerHTML = `<div class="cell-content"></div>`;
      td.addEventListener('mousedown', (e) => onCellMouseDown(e, r, c));
      td.addEventListener('dblclick', () => startEdit(r, c));
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  setupColResize();
  renderAll();
}

function getCellEl(r, c) {
  return document.querySelector(`#spreadsheet td[data-r="${r}"][data-c="${c}"]`);
}
function getColHeader(c) {
  return document.querySelector(`#spreadsheet th.col-header[data-col="${c}"]`);
}
function getRowHeader(r) {
  return document.querySelector(`#spreadsheet td.row-header[data-row="${r}"]`);
}

// ─── RENDER ────────────────────────────────────────────────────
function renderAll() {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      renderCell(r, c);
  updateSelectionUI();
}

function renderCell(r, c) {
  const td = getCellEl(r, c);
  if (!td) return;
  const d = cell(r, c);
  const div = td.querySelector('.cell-content');
  let val = d.v;
  let cls = 'cell-content';
  if (isFormula(val)) {
    const res = evalFormula(val, r, c);
    val = res.display;
    if (res.error) cls += ' error';
    else if (typeof res.raw === 'number') cls += ' formula-result';
  } else if (val !== '' && !isNaN(val)) {
    cls += ' align-right';
  }
  if (d.fmt.align === 'center') cls += ' align-center';
  else if (d.fmt.align === 'right') cls += ' align-right';
  div.className = cls;
  div.textContent = val;

  // Inline styles from fmt
  const fmt = d.fmt;
  td.style.background = fmt.bg || '';
  div.style.fontFamily = fmt.font || '';
  div.style.fontSize = fmt.size ? fmt.size + 'px' : '';
  div.style.fontWeight = fmt.bold ? 'bold' : '';
  div.style.fontStyle = fmt.italic ? 'italic' : '';
  div.style.textDecoration = [fmt.underline ? 'underline' : '', fmt.strike ? 'line-through' : ''].filter(Boolean).join(' ') || '';
  div.style.color = fmt.color || '';
}

// ─── FORMULAS ─────────────────────────────────────────────────
function isFormula(v) { return typeof v === 'string' && v.startsWith('='); }

function evalFormula(f, r, c) {
  try {
    const expr = f.slice(1).trim().toUpperCase();
    // SUM, AVG, MIN, MAX, COUNT, IF
    const m = expr.match(/^(SUM|AVG|AVERAGE|MIN|MAX|COUNT|COUNTA|PRODUCT)\((.+)\)$/);
    if (m) {
      const vals = parseRange(m[2]);
      const nums = vals.filter(v => !isNaN(v) && v !== '').map(Number);
      let raw;
      switch (m[1]) {
        case 'SUM': raw = nums.reduce((a, b) => a + b, 0); break;
        case 'AVG': case 'AVERAGE': raw = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0; break;
        case 'MIN': raw = Math.min(...nums); break;
        case 'MAX': raw = Math.max(...nums); break;
        case 'COUNT': raw = nums.length; break;
        case 'COUNTA': raw = vals.filter(v => v !== '').length; break;
        case 'PRODUCT': raw = nums.reduce((a, b) => a * b, 1); break;
      }
      return { raw, display: formatNum(raw), error: false };
    }
    // IF
    const ifm = expr.match(/^IF\((.+),(.+),(.+)\)$/);
    if (ifm) {
      const cond = evalSimple(ifm[1].trim());
      const val = cond ? evalSimple(ifm[2].trim()) : evalSimple(ifm[3].trim());
      return { raw: val, display: String(val), error: false };
    }
    // NOW/TODAY
    if (expr === 'NOW()') return { raw: new Date(), display: new Date().toLocaleString('es-CO'), error: false };
    if (expr === 'TODAY()') return { raw: new Date(), display: new Date().toLocaleDateString('es-CO'), error: false };
    // Simple math
    const res = evalSimple(expr);
    return { raw: res, display: formatNum(res), error: false };
  } catch(e) {
    return { raw: null, display: '#ERROR', error: true };
  }
}

function parseRange(s) {
  s = s.trim().toUpperCase();
  // A1:B5 or A1,B2,C3
  const parts = s.split(',');
  const vals = [];
  for (const p of parts) {
    const range = p.trim().match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (range) {
      const c1 = ALPHABET.indexOf(range[1]), r1 = parseInt(range[2]) - 1;
      const c2 = ALPHABET.indexOf(range[3]), r2 = parseInt(range[4]) - 1;
      for (let row = r1; row <= r2; row++)
        for (let col = c1; col <= c2; col++)
          vals.push(cell(row, col)?.v || '');
    } else {
      const single = p.trim().match(/^([A-Z]+)(\d+)$/);
      if (single) {
        const col = ALPHABET.indexOf(single[1]), row = parseInt(single[2]) - 1;
        vals.push(cell(row, col)?.v || '');
      } else if (!isNaN(p.trim())) {
        vals.push(p.trim());
      }
    }
  }
  return vals;
}

function evalSimple(expr) {
  // Replace cell refs
  const replaced = expr.replace(/([A-Z]+)(\d+)/g, (_, col, row) => {
    const c = ALPHABET.indexOf(col), r = parseInt(row) - 1;
    const v = cell(r, c)?.v || '0';
    return isNaN(v) ? '0' : v;
  });
  // Safe eval
  return Function('"use strict"; return (' + replaced + ')')();
}

function formatNum(n) {
  if (typeof n !== 'number' || isNaN(n)) return String(n);
  if (Number.isInteger(n)) return n.toLocaleString('es-CO');
  return parseFloat(n.toFixed(6)).toLocaleString('es-CO', { maximumFractionDigits: 6 });
}

// ─── SELECTION ────────────────────────────────────────────────
function setActive(r, c) {
  active = { r, c };
  selStart = { r, c };
  selEnd = { r, c };
  updateSelectionUI();
  updateFormulaBar();
  updateStatusBar();
}

function updateSelectionUI() {
  // Clear all
  document.querySelectorAll('.active-cell, .selected-range').forEach(el => {
    el.classList.remove('active-cell', 'selected-range');
  });
  document.querySelectorAll('.col-header.selected, .row-header.selected').forEach(el => {
    el.classList.remove('selected');
  });

  const r0 = Math.min(selStart.r, selEnd.r), r1 = Math.max(selStart.r, selEnd.r);
  const c0 = Math.min(selStart.c, selEnd.c), c1 = Math.max(selStart.c, selEnd.c);

  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const td = getCellEl(r, c);
      if (td) td.classList.add(r === active.r && c === active.c ? 'active-cell' : 'selected-range');
    }
    getRowHeader(r)?.classList.add('selected');
  }
  for (let c = c0; c <= c1; c++) getColHeader(c)?.classList.add('selected');

  // Fill handle
  updateFillHandle();
}

function updateFillHandle() {
  const r1 = Math.max(selStart.r, selEnd.r);
  const c1 = Math.max(selStart.c, selEnd.c);
  const td = getCellEl(r1, c1);
  const fh = document.getElementById('fill-handle');
  if (td && !isEditing) {
    const rect = td.getBoundingClientRect();
    fh.style.left = (rect.right - 4) + 'px';
    fh.style.top = (rect.bottom - 4) + 'px';
    fh.style.display = 'block';
  } else {
    fh.style.display = 'none';
  }
}

function selectAll() {
  selStart = { r: 0, c: 0 };
  selEnd = { r: ROWS - 1, c: COLS - 1 };
  updateSelectionUI();
}

function selectRow(r, e) {
  if (e.shiftKey) selEnd = { r, c: COLS - 1 };
  else { selStart = { r, c: 0 }; selEnd = { r, c: COLS - 1 }; active = { r, c: 0 }; }
  updateSelectionUI(); updateFormulaBar(); updateStatusBar();
}

function selectCol(c, e) {
  if (e.shiftKey) selEnd = { r: ROWS - 1, c };
  else { selStart = { r: 0, c }; selEnd = { r: ROWS - 1, c }; active = { r: 0, c }; }
  updateSelectionUI(); updateFormulaBar(); updateStatusBar();
}

// ─── FORMULA BAR ──────────────────────────────────────────────
function updateFormulaBar() {
  document.getElementById('cell-ref').value = cellAddr(active.r, active.c);
  const d = cell(active.r, active.c);
  document.getElementById('formula-input').value = d ? d.v : '';
}

// ─── STATUS BAR ───────────────────────────────────────────────
function updateStatusBar() {
  document.getElementById('st-cell').textContent = cellAddr(active.r, active.c);
  const r0 = Math.min(selStart.r, selEnd.r), r1 = Math.max(selStart.r, selEnd.r);
  const c0 = Math.min(selStart.c, selEnd.c), c1 = Math.max(selStart.c, selEnd.c);
  const cnt = (r1 - r0 + 1) * (c1 - c0 + 1);
  document.getElementById('st-range').textContent = cnt > 1
    ? `${cellAddr(r0, c0)}:${cellAddr(r1, c1)}` : '—';

  let nums = [], count = 0;
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const v = cell(r, c)?.v;
      if (v !== '' && v !== undefined) {
        count++;
        let n = isFormula(v) ? evalFormula(v, r, c).raw : parseFloat(v);
        if (!isNaN(n)) nums.push(n);
      }
    }
  }
  const sum = nums.reduce((a, b) => a + b, 0);
  const avg = nums.length ? sum / nums.length : 0;
  document.getElementById('st-sum').textContent = `Σ ${nums.length ? formatNum(sum) : '—'}`;
  document.getElementById('st-avg').textContent = `x̄ ${nums.length ? formatNum(avg) : '—'}`;
  document.getElementById('st-count').textContent = `# ${count}`;
}

// ─── CELL MOUSE EVENTS ────────────────────────────────────────
function onCellMouseDown(e, r, c) {
  if (e.button !== 0) return;
  commitEdit();
  if (e.shiftKey) {
    selEnd = { r, c };
    updateSelectionUI(); updateStatusBar(); return;
  }
  active = { r, c };
  selStart = { r, c }; selEnd = { r, c };
  isSelecting = true;
  updateSelectionUI(); updateFormulaBar(); updateStatusBar();

  const onMove = (ev) => {
    if (!isSelecting) return;
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    const td = el?.closest('td.data-cell');
    if (td) {
      selEnd = { r: +td.dataset.r, c: +td.dataset.c };
      updateSelectionUI(); updateStatusBar();
    }
  };
  const onUp = () => {
    isSelecting = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// ─── EDIT ─────────────────────────────────────────────────────
const editor = document.getElementById('cell-editor');

function startEdit(r, c, initial = null) {
  active = { r, c };
  selStart = { r, c }; selEnd = { r, c };
  const d = cell(r, c);
  const td = getCellEl(r, c);
  if (!td || !d) return;
  const rect = td.getBoundingClientRect();
  editor.style.left = rect.left + 'px';
  editor.style.top = rect.top + 'px';
  editor.style.width = Math.max(colWidths[c], 100) + 'px';
  editor.style.height = rect.height + 'px';
  editor.style.fontFamily = d.fmt.font || 'DM Sans';
  editor.style.fontSize = (d.fmt.size || 13) + 'px';
  editor.style.display = 'block';
  editor.value = initial !== null ? initial : d.v;
  editor.focus();
  if (initial !== null) editor.setSelectionRange(initial.length, initial.length);
  else editor.select();
  isEditing = true;
  document.getElementById('fill-handle').style.display = 'none';
}

function commitEdit() {
  if (!isEditing) return;
  const val = editor.value;
  const d = cell(active.r, active.c);
  if (d) {
    pushUndo();
    d.v = val;
  }
  editor.style.display = 'none';
  isEditing = false;
  renderCell(active.r, active.c);
  updateFormulaBar();
  updateStatusBar();
  updateSelectionUI();
  markUnsaved();
}

function cancelEdit() {
  editor.style.display = 'none';
  isEditing = false;
  updateSelectionUI();
}

editor.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault(); commitEdit();
    moveActive(1, 0);
  } else if (e.key === 'Tab') {
    e.preventDefault(); commitEdit();
    moveActive(0, e.shiftKey ? -1 : 1);
  } else if (e.key === 'Escape') {
    cancelEdit();
  }
});

editor.addEventListener('input', () => {
  document.getElementById('formula-input').value = editor.value;
});

function moveActive(dr, dc) {
  const nr = Math.max(0, Math.min(ROWS - 1, active.r + dr));
  const nc = Math.max(0, Math.min(COLS - 1, active.c + dc));
  setActive(nr, nc);
  scrollToCell(nr, nc);
}

function scrollToCell(r, c) {
  const td = getCellEl(r, c);
  td?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

// ─── KEYBOARD ─────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.target === editor || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case 'c': e.preventDefault(); copySelection(); return;
      case 'x': e.preventDefault(); cutSelection(); return;
      case 'v': e.preventDefault(); pasteSelection(); return;
      case 'z': e.preventDefault(); undo(); return;
      case 'y': e.preventDefault(); redo(); return;
      case 'b': e.preventDefault(); toggleFmt('bold'); return;
      case 'i': e.preventDefault(); toggleFmt('italic'); return;
      case 'u': e.preventDefault(); toggleFmt('underline'); return;
      case 'h': e.preventDefault(); toggleFindBar(); return;
      case 'a': e.preventDefault(); selectAll(); return;
      case 'home': e.preventDefault(); setActive(0, 0); scrollToCell(0, 0); return;
    }
  }

  if (e.key === 'F7') { e.preventDefault(); startSpellCheck(); return; }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (!isEditing) { e.preventDefault(); clearSelection(); return; }
  }

  const arrows = { ArrowUp: [-1,0], ArrowDown: [1,0], ArrowLeft: [0,-1], ArrowRight: [0,1] };
  if (arrows[e.key]) {
    e.preventDefault();
    if (isEditing) { commitEdit(); }
    const [dr, dc] = arrows[e.key];
    if (e.shiftKey) {
      selEnd.r = Math.max(0, Math.min(ROWS-1, selEnd.r + dr));
      selEnd.c = Math.max(0, Math.min(COLS-1, selEnd.c + dc));
      updateSelectionUI(); updateStatusBar();
    } else {
      moveActive(dr, dc);
    }
    scrollToCell(active.r, active.c); return;
  }

  if (e.key === 'Enter') {
    if (!isEditing) { e.preventDefault(); startEdit(active.r, active.c); return; }
  }
  if (e.key === 'F2') {
    if (!isEditing) { e.preventDefault(); startEdit(active.r, active.c); return; }
  }
  if (e.key === 'Tab') {
    if (!isEditing) { e.preventDefault(); moveActive(0, e.shiftKey ? -1 : 1); return; }
  }

  // Start typing = start edit
  if (!isEditing && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    startEdit(active.r, active.c, e.key === '=' ? '=' : e.key);
  }
});

// Formula bar enter
document.getElementById('formula-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const val = e.target.value;
    pushUndo();
    cell(active.r, active.c).v = val;
    renderCell(active.r, active.c);
    updateStatusBar();
    markUnsaved();
  }
});
document.getElementById('formula-input').addEventListener('input', (e) => {
  if (isEditing) editor.value = e.target.value;
});

// Cell ref navigation
document.getElementById('cell-ref').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const ref = e.target.value.trim().toUpperCase();
    const m = ref.match(/^([A-Z]+)(\d+)$/);
    if (m) {
      const c = ALPHABET.indexOf(m[1]), r = parseInt(m[2]) - 1;
      if (c >= 0 && r >= 0 && r < ROWS && c < COLS) {
        setActive(r, c); scrollToCell(r, c);
      }
    }
    e.target.blur();
  }
});

// ─── CLIPBOARD ────────────────────────────────────────────────
function getSelectionCells() {
  const r0 = Math.min(selStart.r, selEnd.r), r1 = Math.max(selStart.r, selEnd.r);
  const c0 = Math.min(selStart.c, selEnd.c), c1 = Math.max(selStart.c, selEnd.c);
  const cells = [];
  for (let r = r0; r <= r1; r++) {
    const row = [];
    for (let c = c0; c <= c1; c++) row.push(JSON.parse(JSON.stringify(cell(r, c))));
    cells.push(row);
  }
  return { cells, r0, c0, r1, c1 };
}

function copySelection() {
  const sel = getSelectionCells();
  clipboard = { cells: sel.cells, r0: sel.r0, c0: sel.c0, cut: false };
  // Also copy to system clipboard as TSV
  const tsv = sel.cells.map(row => row.map(c => c.v).join('\t')).join('\n');
  navigator.clipboard?.writeText(tsv).catch(() => {});
  showToast('✓ Copiado');
  // Dashed outline on copied range
  highlightCopy(sel.r0, sel.c0, sel.r1, sel.c1);
}

function cutSelection() {
  const sel = getSelectionCells();
  clipboard = { cells: sel.cells, r0: sel.r0, c0: sel.c0, cut: true };
  const tsv = sel.cells.map(row => row.map(c => c.v).join('\t')).join('\n');
  navigator.clipboard?.writeText(tsv).catch(() => {});
  // Clear source
  pushUndo();
  for (let r = sel.r0; r <= sel.r1; r++)
    for (let c = sel.c0; c <= sel.c1; c++) {
      cell(r, c).v = ''; cell(r, c).fmt = {};
    }
  renderAll();
  showToast('✂ Cortado');
}

async function pasteSelection() {
  // Try system clipboard first
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      pushUndo();
      const rows = text.split('\n');
      rows.forEach((row, dr) => {
        row.split('\t').forEach((val, dc) => {
          const nr = active.r + dr, nc = active.c + dc;
          if (nr < ROWS && nc < COLS) cell(nr, nc).v = val;
        });
      });
      renderAll(); updateStatusBar(); markUnsaved();
      showToast('📋 Pegado desde portapapeles');
      return;
    }
  } catch (_) {}

  if (!clipboard.cells) return;
  pushUndo();
  clipboard.cells.forEach((row, dr) => {
    row.forEach((srcCell, dc) => {
      const nr = active.r + dr, nc = active.c + dc;
      if (nr < ROWS && nc < COLS) {
        sheet().data[nr][nc] = JSON.parse(JSON.stringify(srcCell));
      }
    });
  });
  renderAll(); updateStatusBar(); markUnsaved();
  showToast('📋 Pegado');
}

let copyBox = null;
function highlightCopy(r0, c0, r1, c1) {
  if (copyBox) copyBox.remove();
  const tl = getCellEl(r0, c0), br = getCellEl(r1, c1);
  if (!tl || !br) return;
  const a = tl.getBoundingClientRect(), b = br.getBoundingClientRect();
  copyBox = document.createElement('div');
  copyBox.style.cssText = `position:fixed;left:${a.left}px;top:${a.top}px;width:${b.right-a.left}px;height:${b.bottom-a.top}px;border:2px dashed var(--accent-green);pointer-events:none;z-index:45;`;
  document.body.appendChild(copyBox);
  setTimeout(() => copyBox?.remove(), 2000);
}

// ─── FORMATTING ───────────────────────────────────────────────
function applyFmtToSelection(key, value) {
  pushUndo();
  iterSelection((r, c) => { cell(r, c).fmt[key] = value; renderCell(r, c); });
  markUnsaved();
}

function toggleFmt(key) {
  const d = cell(active.r, active.c);
  const cur = d.fmt[key];
  pushUndo();
  iterSelection((r, c) => { cell(r, c).fmt[key] = !cur; renderCell(r, c); });
  const btn = document.getElementById('btn-' + key);
  if (btn) btn.classList.toggle('active', !cur);
  markUnsaved();
}

function iterSelection(fn) {
  const r0 = Math.min(selStart.r, selEnd.r), r1 = Math.max(selStart.r, selEnd.r);
  const c0 = Math.min(selStart.c, selEnd.c), c1 = Math.max(selStart.c, selEnd.c);
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) fn(r, c);
}

function clearSelection() {
  pushUndo();
  iterSelection((r, c) => { cell(r, c).v = ''; });
  renderAll(); updateFormulaBar(); updateStatusBar(); markUnsaved();
}

function updateFmtButtons() {
  const d = cell(active.r, active.c);
  if (!d) return;
  ['bold', 'italic', 'underline', 'strikethrough'].forEach(k => {
    document.getElementById('btn-' + k)?.classList.toggle('active', !!d.fmt[k]);
  });
  const aligns = ['left', 'center', 'right'];
  aligns.forEach(a => document.getElementById('btn-align-' + a)?.classList.toggle('active', d.fmt.align === a));
  if (d.fmt.font) document.getElementById('font-select').value = d.fmt.font;
  if (d.fmt.size) document.getElementById('size-select').value = d.fmt.size;
}

// ─── TOOLBAR EVENTS ───────────────────────────────────────────
document.getElementById('btn-bold').addEventListener('click', () => toggleFmt('bold'));
document.getElementById('btn-italic').addEventListener('click', () => toggleFmt('italic'));
document.getElementById('btn-underline').addEventListener('click', () => toggleFmt('underline'));
document.getElementById('btn-strikethrough').addEventListener('click', () => toggleFmt('strike'));

document.getElementById('btn-align-left').addEventListener('click', () => applyFmtToSelection('align', 'left'));
document.getElementById('btn-align-center').addEventListener('click', () => applyFmtToSelection('align', 'center'));
document.getElementById('btn-align-right').addEventListener('click', () => applyFmtToSelection('align', 'right'));

document.getElementById('font-select').addEventListener('change', e => applyFmtToSelection('font', e.target.value));
document.getElementById('size-select').addEventListener('change', e => applyFmtToSelection('size', +e.target.value));

document.getElementById('btn-copy').addEventListener('click', copySelection);
document.getElementById('btn-cut').addEventListener('click', cutSelection);
document.getElementById('btn-paste').addEventListener('click', pasteSelection);

document.getElementById('btn-insert-row').addEventListener('click', insertRow);
document.getElementById('btn-insert-col').addEventListener('click', insertCol);
document.getElementById('btn-delete-row').addEventListener('click', deleteRow);

document.getElementById('btn-spell').addEventListener('click', startSpellCheck);
document.getElementById('btn-find').addEventListener('click', toggleFindBar);
document.getElementById('btn-undo').addEventListener('click', undo);
document.getElementById('btn-redo').addEventListener('click', redo);

document.getElementById('btn-freeze').addEventListener('click', () => {
  frozenRows = frozenRows ? 0 : active.r + 1;
  frozenCols = frozenCols ? 0 : active.c + 1;
  showToast(frozenRows || frozenCols ? `🔒 Congelado hasta ${cellAddr(active.r, active.c)}` : '🔓 Descongelado');
});

// ─── COLOR PICKERS ────────────────────────────────────────────
const COLORS = [
  '#e8e8f0','#ffffff','#f0f0f0','#d0d0d0','#a0a0a0','#707070','#404040','#202020','#101010','#000000',
  '#f87171','#fb923c','#fbbf24','#a3e635','#34d399','#22d3ee','#60a5fa','#a78bfa','#f472b6','#e879f9',
  '#dc2626','#ea580c','#d97706','#65a30d','#059669','#0891b2','#2563eb','#7c3aed','#db2777','#c026d3',
  '#fecaca','#fed7aa','#fef08a','#d9f99d','#a7f3d0','#a5f3fc','#bfdbfe','#ddd6fe','#fbcfe8','#f5d0fe',
  '#6366f1','#818cf8','#4f46e5','#3730a3','#312e81','#1e1b4b','#14b8a6','#0d9488','#0f766e','#134e4a',
];

function buildColorGrid(containerId, callback) {
  const grid = document.getElementById(containerId);
  grid.innerHTML = '';
  COLORS.forEach(color => {
    const s = document.createElement('div');
    s.className = 'color-swatch';
    s.style.background = color;
    s.title = color;
    s.addEventListener('click', () => { callback(color); closeColorPickers(); });
    grid.appendChild(s);
  });
}

buildColorGrid('text-color-grid', (c) => {
  document.getElementById('text-color-strip').style.background = c;
  applyFmtToSelection('color', c);
});
buildColorGrid('bg-color-grid', (c) => {
  document.getElementById('bg-color-strip').style.background = c;
  applyFmtToSelection('bg', c);
});

document.getElementById('text-color-custom').addEventListener('input', (e) => {
  document.getElementById('text-color-strip').style.background = e.target.value;
  applyFmtToSelection('color', e.target.value);
});
document.getElementById('bg-color-custom').addEventListener('input', (e) => {
  document.getElementById('bg-color-strip').style.background = e.target.value;
  applyFmtToSelection('bg', e.target.value);
});

function toggleColorPicker(pickerId, btnId) {
  const p = document.getElementById(pickerId);
  const btn = document.getElementById(btnId);
  const rect = btn.getBoundingClientRect();
  if (p.style.display === 'block') { p.style.display = 'none'; return; }
  closeColorPickers();
  p.style.left = rect.left + 'px';
  p.style.top = rect.bottom + 4 + 'px';
  p.style.display = 'block';
}

function closeColorPickers() {
  document.querySelectorAll('.color-picker-popup').forEach(p => p.style.display = 'none');
}

document.getElementById('btn-text-color').addEventListener('click', () => toggleColorPicker('text-color-picker', 'btn-text-color'));
document.getElementById('btn-bg-color').addEventListener('click', () => toggleColorPicker('bg-color-picker', 'btn-bg-color'));

// ─── ROW/COL OPS ─────────────────────────────────────────────
function insertRow() {
  pushUndo();
  const r = active.r;
  const sh = sheet();
  sh.data.splice(r, 0, Array.from({ length: COLS }, () => ({ v: '', f: '', fmt: {} })));
  sh.data.pop();
  buildTable(); showToast('Fila insertada'); markUnsaved();
}

function insertCol() {
  pushUndo();
  const c = active.c;
  const sh = sheet();
  sh.data.forEach(row => { row.splice(c, 0, { v: '', f: '', fmt: {} }); row.pop(); });
  colWidths.splice(c, 0, 100); colWidths.pop();
  buildTable(); showToast('Columna insertada'); markUnsaved();
}

function deleteRow() {
  pushUndo();
  const r = active.r;
  const sh = sheet();
  sh.data.splice(r, 1);
  sh.data.push(Array.from({ length: COLS }, () => ({ v: '', f: '', fmt: {} })));
  buildTable(); showToast('Fila eliminada'); markUnsaved();
}

// ─── COL RESIZE ───────────────────────────────────────────────
function setupColResize() {
  document.querySelectorAll('.col-resize').forEach(handle => {
    let startX, startW, col;
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault(); e.stopPropagation();
      col = +handle.dataset.col;
      startX = e.clientX; startW = colWidths[col];
      handle.classList.add('resizing');
      const onMove = (ev) => {
        const w = Math.max(40, startW + ev.clientX - startX);
        colWidths[col] = w;
        const th = getColHeader(col);
        if (th) th.style.width = w + 'px';
        document.querySelectorAll(`td.data-cell[data-c="${col}"]`).forEach(td => td.style.width = w + 'px');
        updateFillHandle();
      };
      const onUp = () => {
        handle.classList.remove('resizing');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}

// ─── CONTEXT MENU ────────────────────────────────────────────
const ctxMenu = document.getElementById('context-menu');

document.getElementById('spreadsheet').addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const td = e.target.closest('td.data-cell');
  if (td) { const r = +td.dataset.r, c = +td.dataset.c; if (r !== active.r || c !== active.c) setActive(r, c); }
  ctxMenu.style.left = e.clientX + 'px';
  ctxMenu.style.top = e.clientY + 'px';
  ctxMenu.style.display = 'block';
});

document.addEventListener('click', () => { ctxMenu.style.display = 'none'; closeColorPickers(); });

document.getElementById('ctx-cut').addEventListener('click', cutSelection);
document.getElementById('ctx-copy').addEventListener('click', copySelection);
document.getElementById('ctx-paste').addEventListener('click', pasteSelection);
document.getElementById('ctx-bold').addEventListener('click', () => toggleFmt('bold'));
document.getElementById('ctx-clear').addEventListener('click', clearSelection);
document.getElementById('ctx-ins-row').addEventListener('click', insertRow);
document.getElementById('ctx-ins-col').addEventListener('click', insertCol);
document.getElementById('ctx-del-row').addEventListener('click', deleteRow);

// ─── UNDO / REDO ─────────────────────────────────────────────
function pushUndo() {
  undoStack.push(JSON.stringify(sheet().data));
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
}

function undo() {
  if (!undoStack.length) return showToast('Nada para deshacer');
  redoStack.push(JSON.stringify(sheet().data));
  sheet().data = JSON.parse(undoStack.pop());
  renderAll(); updateFormulaBar(); updateStatusBar();
  showToast('↩ Deshecho');
}

function redo() {
  if (!redoStack.length) return showToast('Nada para rehacer');
  undoStack.push(JSON.stringify(sheet().data));
  sheet().data = JSON.parse(redoStack.pop());
  renderAll(); updateFormulaBar(); updateStatusBar();
  showToast('↪ Rehecho');
}

// ─── SPELL CHECK ─────────────────────────────────────────────
// Simple Spanish/English dictionary simulation
const COMMON_WORDS = new Set([
  'el','la','los','las','un','una','de','en','y','a','que','es','por','con','para','como','más','o',
  'este','esta','estos','estas','del','al','se','no','su','lo','le','si','me','mi','yo','he','ha',
  'son','ser','estar','hay','fue','era','todo','todos','todavía','también','pero','desde','hasta',
  'the','a','an','and','or','but','in','on','at','to','for','of','is','are','was','were','be',
  'been','have','has','had','do','does','did','will','would','could','should','may','might','can',
  'name','first','last','city','date','total','price','amount','number','text','data','value',
  'nombre','fecha','total','precio','cantidad','numero','texto','dato','valor','ciudad','pais',
  'enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre',
  'lunes','martes','miercoles','miercoles','jueves','viernes','sabado','domingo',
  'juan','maria','pedro','ana','carlos','luis','pablo','jose','santiago','bogota','colombia',
]);

const SPELL_SUGGESTIONS = {
  'qe': ['que'], 'dle': ['del'], 'dl': ['del'], 'ene': ['en'], 'teh': ['the'],
  'thier': ['their'], 'recieve': ['receive'], 'seperate': ['separate'],
  'occured': ['occurred'], 'untill': ['until'], 'enviroment': ['environment'],
  'numer': ['número', 'number'], 'calculo': ['cálculo'], 'analisis': ['análisis'],
  'economia': ['economía'], 'produccion': ['producción'], 'administracion': ['administración'],
};

function isSpellOk(word) {
  const w = word.toLowerCase().replace(/[^a-záéíóúüñ]/g, '');
  if (!w || w.length <= 2 || /^\d+$/.test(w)) return true;
  if (COMMON_WORDS.has(w)) return true;
  if (spellIgnored.has(w)) return true;
  if (/^[A-Z][a-z]+$/.test(word)) return true; // Proper noun
  return false;
}

function startSpellCheck() {
  spellErrors = [];
  spellIgnored.clear();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = cell(r, c)?.v;
      if (v && !isFormula(v)) {
        const words = v.split(/\s+/);
        words.forEach((word, wi) => {
          const clean = word.replace(/[^a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/g, '');
          if (clean && !isSpellOk(clean)) {
            spellErrors.push({ r, c, word: clean, original: word, wi });
          }
        });
      }
    }
  }
  if (!spellErrors.length) { showToast('✓ Ortografía correcta'); return; }
  spellIdx = 0;
  document.getElementById('spell-panel').style.display = 'block';
  showSpellError();
}

function showSpellError() {
  if (spellIdx >= spellErrors.length) {
    document.getElementById('spell-panel').style.display = 'none';
    showToast(`✓ Corrección completada`);
    return;
  }
  const err = spellErrors[spellIdx];
  document.getElementById('spell-word').textContent = `"${err.word}"`;
  document.getElementById('spell-progress').textContent = `${spellIdx + 1} de ${spellErrors.length} errores`;
  const sugs = SPELL_SUGGESTIONS[err.word.toLowerCase()] || generateSuggestions(err.word);
  const sugDiv = document.getElementById('spell-suggestions');
  sugDiv.innerHTML = '';
  sugs.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'spell-sug-btn';
    btn.textContent = s;
    btn.addEventListener('click', () => applySpellFix(s));
    sugDiv.appendChild(btn);
  });
  // Scroll to cell
  setActive(err.r, err.c); scrollToCell(err.r, err.c);
}

function generateSuggestions(word) {
  // Simple: try common suffixes/prefixes
  const sug = [];
  if (word.endsWith('cion')) sug.push(word.replace(/cion$/, 'ción'));
  if (word.endsWith('ion')) sug.push(word.replace(/ion$/, 'ión'));
  if (!sug.length) sug.push(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  return sug.slice(0, 4);
}

function applySpellFix(fix) {
  const err = spellErrors[spellIdx];
  const d = cell(err.r, err.c);
  if (d) {
    pushUndo();
    d.v = d.v.replace(err.word, fix);
    renderCell(err.r, err.c);
    markUnsaved();
  }
  spellIdx++;
  showSpellError();
}

document.getElementById('spell-skip').addEventListener('click', () => { spellIdx++; showSpellError(); });
document.getElementById('spell-skip-all').addEventListener('click', () => {
  spellIgnored.add(spellErrors[spellIdx].word.toLowerCase());
  spellIdx++;
  showSpellError();
});
document.getElementById('spell-fix').addEventListener('click', () => {
  const sugs = document.querySelectorAll('.spell-sug-btn');
  if (sugs.length) applySpellFix(sugs[0].textContent);
  else { spellIdx++; showSpellError(); }
});
document.getElementById('spell-close').addEventListener('click', () => {
  document.getElementById('spell-panel').style.display = 'none';
});

// ─── FIND & REPLACE ───────────────────────────────────────────
function toggleFindBar() {
  const bar = document.getElementById('find-bar');
  bar.style.display = bar.style.display === 'block' ? 'none' : 'block';
  if (bar.style.display === 'block') document.getElementById('find-input').focus();
}

function findAll() {
  const q = document.getElementById('find-input').value.toLowerCase();
  findMatches = [];
  if (!q) return;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (cell(r, c)?.v?.toLowerCase().includes(q)) findMatches.push({ r, c });
}

function findNext() {
  findAll();
  if (!findMatches.length) { document.getElementById('find-status').textContent = 'Sin resultados'; return; }
  findIdx = (findIdx + 1) % findMatches.length;
  const m = findMatches[findIdx];
  setActive(m.r, m.c); scrollToCell(m.r, m.c);
  document.getElementById('find-status').textContent = `Resultado ${findIdx + 1} de ${findMatches.length}`;
}

function findPrev() {
  findAll();
  if (!findMatches.length) { document.getElementById('find-status').textContent = 'Sin resultados'; return; }
  findIdx = (findIdx - 1 + findMatches.length) % findMatches.length;
  const m = findMatches[findIdx];
  setActive(m.r, m.c); scrollToCell(m.r, m.c);
  document.getElementById('find-status').textContent = `Resultado ${findIdx + 1} de ${findMatches.length}`;
}

function replaceOne() {
  findAll();
  if (!findMatches.length) return;
  const m = findMatches[findIdx % findMatches.length];
  const rep = document.getElementById('replace-input').value;
  const q = document.getElementById('find-input').value;
  pushUndo();
  cell(m.r, m.c).v = cell(m.r, m.c).v.split(q).join(rep);
  renderCell(m.r, m.c);
  markUnsaved();
  document.getElementById('find-status').textContent = 'Reemplazado';
}

function replaceAllFn() {
  findAll();
  const rep = document.getElementById('replace-input').value;
  const q = document.getElementById('find-input').value;
  if (!q || !findMatches.length) return;
  pushUndo();
  let count = 0;
  findMatches.forEach(m => {
    cell(m.r, m.c).v = cell(m.r, m.c).v.split(q).join(rep);
    renderCell(m.r, m.c); count++;
  });
  markUnsaved();
  document.getElementById('find-status').textContent = `${count} reemplazos realizados`;
}

document.getElementById('find-next').addEventListener('click', findNext);
document.getElementById('find-prev').addEventListener('click', findPrev);
document.getElementById('replace-one').addEventListener('click', replaceOne);
document.getElementById('replace-all').addEventListener('click', replaceAllFn);
document.getElementById('find-close').addEventListener('click', () => { document.getElementById('find-bar').style.display = 'none'; });
document.getElementById('find-input').addEventListener('keydown', e => { if (e.key === 'Enter') findNext(); if (e.key === 'Escape') document.getElementById('find-bar').style.display = 'none'; });

// ─── SHEET TABS ───────────────────────────────────────────────
document.getElementById('add-sheet').addEventListener('click', addSheet);

function addSheet() {
  const name = `Hoja${state.sheets.length + 1}`;
  state.sheets.push(createSheet(name));
  renderTabs();
  switchSheet(state.sheets.length - 1);
}

function switchSheet(idx) {
  state.activeSheet = idx;
  undoStack = []; redoStack = [];
  renderTabs();
  buildTable();
  setActive(0, 0);
}

function renderTabs() {
  const bar = document.getElementById('sheetbar');
  bar.innerHTML = '';
  state.sheets.forEach((sh, i) => {
    const tab = document.createElement('div');
    tab.className = 'sheet-tab' + (i === state.activeSheet ? ' active' : '');
    tab.dataset.sheet = i;
    tab.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/></svg>${sh.name}<button class="close-tab">×</button>`;
    tab.addEventListener('click', (e) => {
      if (!e.target.classList.contains('close-tab')) switchSheet(i);
    });
    tab.querySelector('.close-tab').addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.sheets.length === 1) return showToast('No se puede eliminar la única hoja');
      state.sheets.splice(i, 1);
      if (state.activeSheet >= state.sheets.length) state.activeSheet = state.sheets.length - 1;
      renderTabs(); buildTable();
    });
    bar.appendChild(tab);
  });
  const addBtn = document.createElement('button');
  addBtn.className = 'add-sheet-btn';
  addBtn.id = 'add-sheet'; addBtn.textContent = '+';
  addBtn.addEventListener('click', addSheet);
  bar.appendChild(addBtn);
}

// ─── SAVE / EXPORT ────────────────────────────────────────────
let unsaved = false;
function markUnsaved() {
  unsaved = true;
  document.getElementById('save-tag').textContent = '● Sin guardar';
  document.getElementById('save-tag').style.color = 'var(--accent-amber)';
  document.getElementById('save-tag').style.background = 'rgba(251,191,36,0.1)';
  document.getElementById('save-tag').style.border = '1px solid rgba(251,191,36,0.25)';
}
function markSaved() {
  unsaved = false;
  document.getElementById('save-tag').textContent = '● Guardado';
  document.getElementById('save-tag').style.color = '';
  document.getElementById('save-tag').style.background = '';
  document.getElementById('save-tag').style.border = '';
}

document.getElementById('btn-save').addEventListener('click', exportCSV);
function exportCSV() {
  const rows = sheet().data.map(row => row.map(c => {
    const v = isFormula(c.v) ? evalFormula(c.v, 0, 0).display : c.v;
    return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(','));
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (document.getElementById('filename').value.replace('.gp', '') || 'libro') + '.csv';
  a.click();
  markSaved();
  showToast('📥 CSV exportado');
}

document.getElementById('btn-import').addEventListener('click', () => document.getElementById('import-input').click());
document.getElementById('import-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    pushUndo();
    const lines = ev.target.result.split('\n');
    lines.forEach((line, r) => {
      if (r >= ROWS) return;
      const cols = line.split(',');
      cols.forEach((val, c) => {
        if (c >= COLS) return;
        cell(r, c).v = val.trim().replace(/^"|"$/g, '');
      });
    });
    renderAll(); markUnsaved();
    showToast('📤 CSV importado');
  };
  reader.readAsText(file);
  e.target.value = '';
});

// Auto-save to localStorage
function autoSave() {
  try {
    localStorage.setItem('gridpro_data', JSON.stringify(state));
    markSaved();
  } catch (_) {}
}

function autoLoad() {
  try {
    const saved = localStorage.getItem('gridpro_data');
    if (saved) {
      state = JSON.parse(saved);
      // Ensure structure
      state.sheets.forEach(sh => {
        while (sh.data.length < ROWS) sh.data.push(Array.from({ length: COLS }, () => ({ v: '', f: '', fmt: {} })));
        sh.data.forEach(row => { while (row.length < COLS) row.push({ v: '', f: '', fmt: {} }); });
      });
    }
  } catch (_) {}
}

setInterval(() => { if (unsaved) autoSave(); }, 5000);

// ─── TOAST ────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._to);
  t._to = setTimeout(() => t.classList.remove('show'), 2000);
}

// ─── ACTIVE CELL TRACKING ─────────────────────────────────────
// Update fmt buttons when active cell changes
const origSetActive = setActive;
// Patch setActive to also refresh fmt buttons
window._origSetActive = setActive;
function setActive(r, c) {
  active = { r, c };
  selStart = { r, c };
  selEnd = { r, c };
  updateSelectionUI();
  updateFormulaBar();
  updateStatusBar();
  updateFmtButtons();
}

// Click outside editing closes editor
document.addEventListener('mousedown', (e) => {
  if (isEditing && e.target !== editor) { commitEdit(); }
});

// Close panels on outside click
document.addEventListener('mousedown', (e) => {
  if (!e.target.closest('#find-bar') && !e.target.closest('#btn-find')) {
    // keep find bar open
  }
  if (!e.target.closest('#spell-panel') && !e.target.closest('#btn-spell')) {
    // keep spell panel open
  }
});

// ─── SAMPLE DATA ─────────────────────────────────────────────
function loadSampleData() {
  const headers = ['Producto','Enero','Febrero','Marzo','Abril','Total','Promedio'];
  const products = ['Laptop Pro','Monitor 4K','Teclado Mecánico','Mouse Inalámbrico','Auriculares USB','Webcam HD','Tablet 10"','USB Hub'];
  headers.forEach((h, c) => {
    cell(0, c).v = h;
    cell(0, c).fmt = { bold: true, bg: '#1e1e2e', color: '#a5b4fc', font: 'DM Sans', size: 12 };
  });
  products.forEach((p, i) => {
    const r = i + 1;
    cell(r, 0).v = p;
    cell(r, 0).fmt = { font: 'DM Sans' };
    for (let m = 1; m <= 4; m++) {
      const v = Math.floor(Math.random() * 150 + 50);
      cell(r, m).v = String(v);
      cell(r, m).fmt = { font: 'JetBrains Mono', align: 'right' };
    }
    cell(r, 5).v = `=SUM(B${r+1}:E${r+1})`;
    cell(r, 5).fmt = { font: 'JetBrains Mono', align: 'right', color: '#34d399', bold: true };
    cell(r, 6).v = `=AVG(B${r+1}:E${r+1})`;
    cell(r, 6).fmt = { font: 'JetBrains Mono', align: 'right', color: '#60a5fa' };
  });
  // Totals row
  const tr = products.length + 1;
  cell(tr, 0).v = 'TOTAL';
  cell(tr, 0).fmt = { bold: true, italic: true };
  for (let m = 1; m <= 4; m++) {
    cell(tr, m).v = `=SUM(${ALPHABET[m]}2:${ALPHABET[m]}${tr})`;
    cell(tr, m).fmt = { bold: true, align: 'right', color: '#fbbf24', font: 'JetBrains Mono' };
  }
}

// ─── INIT ─────────────────────────────────────────────────────
autoLoad();
loadSampleData();
buildTable();
setActive(0, 0);
document.getElementById('st-total').textContent = `${ROWS}×${COLS}`;
showToast('🚀 GridPro listo');