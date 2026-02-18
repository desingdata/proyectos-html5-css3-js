// ========================
// CORE STATE
// ========================
let spellCheckActive = false;
let lightTheme = false;
let sidebarOpen = false;
let findMatches = [];
let findIndex = 0;
let savedRange = null;

const editor = document.getElementById('editor');

// ========================
// INIT
// ========================
document.addEventListener('DOMContentLoaded', () => {
  updateStats();
  updateClock();
  setInterval(updateClock, 1000);
  editor.focus();
});

// ========================
// FORMATTING
// ========================
function fmt(cmd, val = null) {
  editor.focus();
  document.execCommand(cmd, false, val);
  updateToolbarState();
}

function applyFont(font) {
  editor.focus();
  document.execCommand('fontName', false, font);
  // Also set as default for new text
  editor.style.fontFamily = font;
}

function applyFontSize(size) {
  editor.focus();
  // Use pt sizes since execCommand fontSize uses 1-7
  const el = document.createElement('span');
  el.style.fontSize = size + 'px';
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
    const range = sel.getRangeAt(0);
    range.surroundContents(el);
  } else {
    // Set default size for editor
    editor.style.fontSize = size + 'px';
  }
}

function applyColor(cmd, color) {
  editor.focus();
  document.execCommand(cmd, false, color);
}

function clearFormat() {
  editor.focus();
  document.execCommand('removeFormat');
  toast('Formato eliminado', 'info');
}

function insertLink() {
  const url = prompt('URL del enlace:');
  if (url) {
    editor.focus();
    document.execCommand('createLink', false, url.startsWith('http') ? url : 'https://' + url);
    toast('Enlace insertado', 'success');
  }
}

function insertHR() {
  editor.focus();
  document.execCommand('insertHorizontalRule');
}

// ========================
// TOOLBAR STATE
// ========================
function updateToolbarState() {
  const cmds = ['bold', 'italic', 'underline', 'strikeThrough', 'superscript', 'subscript'];
  cmds.forEach(cmd => {
    const btn = document.getElementById('btn-' + cmd);
    if (btn) btn.classList.toggle('active', document.queryCommandState(cmd));
  });
}

// ========================
// CLIPBOARD
// ========================
async function copyText() {
  const sel = window.getSelection();
  if (sel && sel.toString().length > 0) {
    try {
      await navigator.clipboard.writeText(sel.toString());
      toast('Texto copiado al portapapeles', 'success');
    } catch {
      document.execCommand('copy');
      toast('Texto copiado', 'success');
    }
  } else {
    toast('Selecciona texto para copiar', 'info');
  }
}

async function cutText() {
  const sel = window.getSelection();
  if (sel && sel.toString().length > 0) {
    try {
      await navigator.clipboard.writeText(sel.toString());
      document.execCommand('delete');
      toast('Texto cortado', 'success');
    } catch {
      document.execCommand('cut');
      toast('Texto cortado', 'success');
    }
  } else {
    toast('Selecciona texto para cortar', 'info');
  }
}

async function pasteText() {
  try {
    const text = await navigator.clipboard.readText();
    editor.focus();
    document.execCommand('insertText', false, text);
    toast('Texto pegado', 'success');
  } catch {
    editor.focus();
    document.execCommand('paste');
    toast('Usa Ctrl+V si no se puede pegar automáticamente', 'info');
  }
}

// ========================
// DOCUMENT MANAGEMENT
// ========================
function newDoc() {
  if (editor.innerText.trim().length > 0) {
    if (!confirm('¿Descartar el documento actual y crear uno nuevo?')) return;
  }
  editor.innerHTML = '';
  toast('Nuevo documento creado', 'info');
  editor.focus();
}

function saveDoc() {
  const content = editor.innerHTML;
  const blob = new Blob([`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:'Lora',Georgia,serif;font-size:16px;line-height:1.8;max-width:800px;margin:40px auto;padding:0 40px;color:#333;}</style></head><body>${content}</body></html>`], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'documento-' + new Date().toISOString().slice(0,10) + '.html';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Documento guardado', 'success');
}

function printDoc() {
  window.print();
}

// ========================
// STATS
// ========================
function onEditorInput() {
  updateStats();
  if (spellCheckActive) {
    clearTimeout(window.spellTimer);
    window.spellTimer = setTimeout(runSpellCheck, 800);
  }
}

function updateStats() {
  const text = editor.innerText || '';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const lines = text.split('\n').length;

  document.getElementById('wordCount').textContent = words + ' palabras';
  document.getElementById('charCount').textContent = chars + ' caracteres';
  document.getElementById('lineCount').textContent = lines + ' líneas';
  document.getElementById('sb-words').textContent = words + ' palabras';
  document.getElementById('sb-chars').textContent = chars + ' caracteres';
  document.getElementById('sb-lines').textContent = 'Línea ' + lines;
}

function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  document.getElementById('sb-time').textContent = date + ' ' + time;
}

// ========================
// SPELL CHECK
// ========================
// Spanish common words dictionary (subset for demo - real impl would use a proper dict API)
const esDict = new Set([
  'el','la','los','las','un','una','unos','unas','de','del','en','con','por','para',
  'a','al','y','o','pero','que','si','no','me','te','se','le','lo','mi','tu','su',
  'es','son','ser','estar','fue','era','han','hay','he','ha','tiene','tienen',
  'como','más','muy','bien','mal','gran','grande','nuevo','nueva','otros','otras',
  'este','esta','estos','estas','ese','esa','esos','esas','todo','toda','todos','todas',
  'uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez',
  'aquí','allí','cuando','donde','quien','cual','cuyo','aunque','porque','sino',
  'también','ya','así','solo','tanto','mismo','misma','entre','hasta','desde','sobre',
  'texto','editor','documento','archivo','guardar','nuevo','abrir','cerrar','ayuda',
  'formato','fuente','tamaño','color','negrita','cursiva','subrayado','alinear',
  'copiar','pegar','cortar','deshacer','rehacer','buscar','reemplazar','insertar',
  'tabla','imagen','enlace','lista','párrafo','página','sección','capítulo','título',
  'hola','mundo','casa','vida','tiempo','día','noche','año','mes','hora','minuto',
  'persona','personas','hombre','mujer','niño','niña','familia','ciudad','país',
  'trabajo','empresa','escuela','universidad','libro','carta','mensaje','correo',
  'software','computadora','programa','sistema','internet','red','datos','información',
  'importante','necesario','posible','diferente','mismo','mejor','peor','mayor','menor'
]);

// Common Spanish typos/suggestions
const spellSuggestions = {
  'tecto': ['texto', 'techo'],
  'eitor': ['editor', 'actor'],
  'docuemento': ['documento'],
  'archvio': ['archivo'],
  'guadar': ['guardar'],
  'nuveo': ['nuevo'],
  'formaro': ['formato', 'formaron'],
  'fuenre': ['fuente'],
  'tamano': ['tamaño'],
  'negira': ['negrita'],
  'cursiba': ['cursiva'],
  'coiar': ['copiar'],
  'pager': ['pegar'],
  'cortar': ['cortar'],
};

let spellCheckEnabled = false;

function toggleSpellCheck() {
  spellCheckEnabled = !spellCheckEnabled;
  spellCheckActive = spellCheckEnabled;
  const btn = document.getElementById('btn-spell');
  const sb = document.getElementById('sb-spell');

  if (spellCheckEnabled) {
    btn.classList.add('active');
    sb.textContent = 'Activa';
    sb.className = 'spell-on';
    runSpellCheck();
    toast('Corrector ortográfico activado', 'success');
  } else {
    btn.classList.remove('active');
    sb.textContent = 'Inactiva';
    sb.className = 'spell-off';
    clearSpellHighlights();
    document.getElementById('spellList').innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:8px 0;">Activa el corrector ortográfico para ver sugerencias aquí.</div>';
    toast('Corrector desactivado', 'info');
  }
}

function clearSpellHighlights() {
  const spans = editor.querySelectorAll('.spell-error');
  spans.forEach(s => {
    const parent = s.parentNode;
    while (s.firstChild) parent.insertBefore(s.firstChild, s);
    parent.removeChild(s);
  });
}

function runSpellCheck() {
  if (!spellCheckEnabled) return;

  // Save selection
  const sel = window.getSelection();
  let savedSel = null;
  if (sel.rangeCount > 0) savedSel = sel.getRangeAt(0).cloneRange();

  clearSpellHighlights();

  const errors = [];
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);

  const nodesToProcess = [];
  let node;
  while (node = walker.nextNode()) {
    if (node.textContent.trim()) nodesToProcess.push(node);
  }

  nodesToProcess.forEach(textNode => {
    const text = textNode.textContent;
    const wordRegex = /\b([a-záéíóúüñA-ZÁÉÍÓÚÜÑ]{3,})\b/g;
    let match;
    const replacements = [];

    while ((match = wordRegex.exec(text)) !== null) {
      const word = match[1];
      const lower = word.toLowerCase();

      // Check if word is in dict
      if (!esDict.has(lower) && lower.length > 2) {
        replacements.push({ start: match.index, end: match.index + word.length, word });
        if (!errors.find(e => e.word === lower)) {
          errors.push({
            word: lower,
            suggestions: spellSuggestions[lower] || generateSuggestions(lower)
          });
        }
      }
    }

    if (replacements.length > 0) {
      const frag = document.createDocumentFragment();
      let lastIndex = 0;

      replacements.forEach(({ start, end, word }) => {
        if (start > lastIndex) {
          frag.appendChild(document.createTextNode(text.slice(lastIndex, start)));
        }
        const span = document.createElement('span');
        span.className = 'spell-error';
        span.textContent = word;
        span.title = 'Posible error ortográfico';
        frag.appendChild(span);
        lastIndex = end;
      });

      if (lastIndex < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex)));
      }

      textNode.parentNode.replaceChild(frag, textNode);
    }
  });

  // Restore selection
  if (savedSel) {
    try { sel.removeAllRanges(); sel.addRange(savedSel); } catch(e) {}
  }

  updateSpellList(errors);
}

function generateSuggestions(word) {
  // Simple: find words in dict with small edit distance
  const suggestions = [];
  const wl = word.length;
  for (const dictWord of esDict) {
    const dl = dictWord.length;
    if (Math.abs(dl - wl) > 2) continue;
    if (levenshtein(word, dictWord) <= 2) {
      suggestions.push(dictWord);
      if (suggestions.length >= 3) break;
    }
  }
  return suggestions;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({length: m+1}, (_, i) => Array.from({length: n+1}, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  }
  return dp[m][n];
}

function updateSpellList(errors) {
  const list = document.getElementById('spellList');
  if (errors.length === 0) {
    list.innerHTML = '<div style="font-size:12px;color:var(--accent3);padding:8px 0;">✓ No se encontraron errores ortográficos</div>';
    return;
  }

  list.innerHTML = errors.slice(0, 20).map(e => `
    <div class="spell-item">
      <div class="word">⚠ ${e.word}</div>
      <div class="sugg">
        ${e.suggestions.length ? 'Sugerencias:' : 'Sin sugerencias'}
        ${e.suggestions.map(s => `<span class="sugg-tag" onclick="replaceWord('${e.word}','${s}')">${s}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

function replaceWord(word, replacement) {
  const spans = editor.querySelectorAll('.spell-error');
  spans.forEach(span => {
    if (span.textContent.toLowerCase() === word) {
      span.textContent = replacement;
      span.className = '';
    }
  });
  toast(`"${word}" → "${replacement}"`, 'success');
  updateSpellList([]);
}

// ========================
// SIDEBAR
// ========================
function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  document.getElementById('sidebar').classList.toggle('open', sidebarOpen);
}

// ========================
// FIND & REPLACE
// ========================
function toggleFindBar() {
  const bar = document.getElementById('findBar');
  bar.classList.toggle('show');
  if (bar.classList.contains('show')) {
    document.getElementById('findInput').focus();
  }
}

function closeFindBar() {
  document.getElementById('findBar').classList.remove('show');
  clearFindHighlights();
  findMatches = [];
  findIndex = 0;
  document.getElementById('findCount').textContent = '';
}

function clearFindHighlights() {
  const marks = editor.querySelectorAll('mark');
  marks.forEach(m => {
    const parent = m.parentNode;
    while (m.firstChild) parent.insertBefore(m.firstChild, m);
    parent.removeChild(m);
  });
}

function findText() {
  clearFindHighlights();
  const query = document.getElementById('findInput').value;
  if (!query) { document.getElementById('findCount').textContent = ''; return; }

  const text = editor.innerHTML;
  const regex = new RegExp(escapeRegex(query), 'gi');
  let count = 0;
  editor.innerHTML = text.replace(regex, match => { count++; return `<mark style="background:rgba(124,106,247,0.35);color:var(--text);border-radius:2px;">${match}</mark>`; });
  
  findMatches = Array.from(editor.querySelectorAll('mark'));
  findIndex = 0;
  document.getElementById('findCount').textContent = count ? `${count} resultado${count>1?'s':''}` : 'Sin resultados';
  if (findMatches.length) scrollToMatch(0);
}

function findNext() {
  if (!findMatches.length) return;
  findIndex = (findIndex + 1) % findMatches.length;
  scrollToMatch(findIndex);
}

function findPrev() {
  if (!findMatches.length) return;
  findIndex = (findIndex - 1 + findMatches.length) % findMatches.length;
  scrollToMatch(findIndex);
}

function scrollToMatch(i) {
  findMatches.forEach((m, idx) => m.style.background = idx === i ? 'rgba(232,168,124,0.5)' : 'rgba(124,106,247,0.35)');
  if (findMatches[i]) findMatches[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function replaceCurrent() {
  const replacement = document.getElementById('replaceInput').value;
  if (findMatches[findIndex]) {
    findMatches[findIndex].outerHTML = replacement;
    findText();
    toast('Reemplazado', 'success');
  }
}

function replaceAll() {
  const query = document.getElementById('findInput').value;
  const replacement = document.getElementById('replaceInput').value;
  if (!query) return;
  const regex = new RegExp(escapeRegex(query), 'gi');
  const count = (editor.innerHTML.match(regex) || []).length;
  editor.innerHTML = editor.innerHTML.replace(regex, replacement);
  clearFindHighlights();
  findMatches = [];
  document.getElementById('findCount').textContent = '';
  if (count) toast(`${count} reemplazo${count>1?'s':''} realizados`, 'success');
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ========================
// THEME
// ========================
function toggleTheme() {
  lightTheme = !lightTheme;
  if (lightTheme) {
    document.documentElement.style.setProperty('--bg', '#f5f4f0');
    document.documentElement.style.setProperty('--surface', '#ffffff');
    document.documentElement.style.setProperty('--surface2', '#f0efec');
    document.documentElement.style.setProperty('--surface3', '#e8e6e0');
    document.documentElement.style.setProperty('--border', '#d5d2c8');
    document.documentElement.style.setProperty('--text', '#2a2825');
    document.documentElement.style.setProperty('--text-muted', '#6b6860');
    document.documentElement.style.setProperty('--text-dim', '#9c9890');
    document.documentElement.style.setProperty('--accent', '#5a4af0');
    toast('Tema claro activado', 'info');
  } else {
    document.documentElement.style.setProperty('--bg', '#0f0f13');
    document.documentElement.style.setProperty('--surface', '#17171f');
    document.documentElement.style.setProperty('--surface2', '#1e1e2a');
    document.documentElement.style.setProperty('--surface3', '#252535');
    document.documentElement.style.setProperty('--border', '#2e2e42');
    document.documentElement.style.setProperty('--text', '#e8e8f0');
    document.documentElement.style.setProperty('--text-muted', '#888899');
    document.documentElement.style.setProperty('--text-dim', '#55556a');
    document.documentElement.style.setProperty('--accent', '#7c6af7');
    toast('Tema oscuro activado', 'info');
  }
}

// ========================
// CONTEXT MENU
// ========================
function showContextMenu(e) {
  e.preventDefault();
  const menu = document.getElementById('ctxMenu');
  menu.style.left = Math.min(e.clientX, window.innerWidth - 180) + 'px';
  menu.style.top = Math.min(e.clientY, window.innerHeight - 200) + 'px';
  menu.classList.add('show');
}

function hideCtx() {
  document.getElementById('ctxMenu').classList.remove('show');
}

document.addEventListener('click', hideCtx);
document.addEventListener('keydown', e => { if (e.key === 'Escape') { hideCtx(); closeFindBar(); } });

// ========================
// KEYBOARD SHORTCUTS
// ========================
function handleKeyDown(e) {
  if (e.ctrlKey || e.metaKey) {
    switch(e.key.toLowerCase()) {
      case 'n': e.preventDefault(); newDoc(); break;
      case 's': e.preventDefault(); saveDoc(); break;
      case 'f': e.preventDefault(); toggleFindBar(); break;
    }
  }
  updateToolbarState();
}

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
    e.preventDefault(); printDoc();
  }
});

// ========================
// TOAST
// ========================
function toast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<div class="toast-dot"></div>${msg}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3100);
}