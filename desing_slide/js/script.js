// ═══════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════
let state = {
  slides: [],
  currentSlide: 0,
  selectedElement: null,
  clipboard: null,
  zoom: 100,
  history: [],
  historyIndex: -1,
  customDictionary: new Set()
};

const SLIDE_W = 960, SLIDE_H = 540;
let presentIndex = 0;
let dragInfo = null;
let resizeInfo = null;

// ─── SPANISH COMMON WORDS (minimal spell check dictionary) ───
const esDict = new Set([
  "el","la","los","las","un","una","unos","unas","de","del","al","y","e","o","u",
  "que","en","por","con","no","se","a","es","su","lo","como","más","pero","sus",
  "le","ya","o","fue","ha","este","esta","estos","estas","esto","ese","esa","esos",
  "esas","mi","tu","si","me","te","ser","han","todo","puede","cuando","muy","sin",
  "sobre","también","entre","después","hasta","desde","durante","aunque","donde",
  "siempre","cada","bien","hay","así","menos","solo","antes","aquí","ahí","allí",
  "tiene","tienen","tenemos","tenía","hacer","hecho","había","era","son","están",
  "está","estaba","estamos","soy","eres","todos","todas","hola","presentación",
  "diapositiva","texto","título","subtítulo","imagen","color","fondo","estilo",
  "fuente","tamaño","formato","editar","insertar","archivo","guardar","nuevo",
  "eliminar","copiar","pegar","cortar","deshacer","rehacer","negrita","cursiva",
  "subrayado","alinear","izquierda","derecha","centro","justificar","lista",
  "párrafo","página","documento","proyecto","empresa","nombre","apellido","ciudad",
  "país","fecha","número","primer","segundo","tercero","primero","segunda",
  "tercer","cuarto","quinto","sexto","séptimo","octavo","noveno","décimo",
  "para","porque","como","cuando","donde","mientras","aunque","sino","pues",
  "vez","dos","tres","cuatro","cinco","seis","siete","ocho","nueve","diez",
  "presentar","mostrar","agregar","nuevo","nueva","vista","panel","herramienta",
  "opción","configuración","propiedades","posición","ancho","alto","capa","orden"
]);

// ─── THEMES ───
const themes = [
  { id:'white',  label:'Blanco',   bg:'#ffffff', textColor:'#1a1a1a', style:'slide-bg-white' },
  { id:'light',  label:'Claro',    bg:'#f8fafc', textColor:'#1e293b', style:'slide-bg-light' },
  { id:'dark',   label:'Oscuro',   bg:'#1a1a2e', textColor:'#e8eaf6', style:'slide-bg-dark' },
  { id:'ocean',  label:'Océano',   bg:'',        textColor:'#e0f2fe', style:'slide-bg-ocean' },
  { id:'forest', label:'Bosque',   bg:'',        textColor:'#d1fae5', style:'slide-bg-forest' },
  { id:'sunset', label:'Atardecer',bg:'',        textColor:'#fce7f3', style:'slide-bg-sunset' },
  { id:'paper',  label:'Papel',    bg:'',        textColor:'#78350f', style:'slide-bg-paper' },
  { id:'space',  label:'Espacio',  bg:'',        textColor:'#c7d2fe', style:'slide-bg-space' },
];

const colorSwatches = [
  '#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6',
  '#8b5cf6','#ec4899','#ffffff','#f8fafc','#94a3b8','#475569',
  '#1e293b','#000000','transparent'
];

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
function init() {
  buildThemeGrid();
  buildColorSwatches();
  addSlide(); // first slide with default content
  insertTitle();
  document.querySelector('.slide-element').style.left = '80px';
  document.querySelector('.slide-element').style.top = '100px';
  document.querySelector('.slide-element').style.width = '800px';
  document.querySelector('.slide-element').querySelector('[contenteditable]').innerHTML = 'Título de la Presentación';
  document.querySelector('.slide-element').querySelector('[contenteditable]').style.fontSize = '48px';
  document.querySelector('.slide-element').querySelector('[contenteditable]').style.fontWeight = '800';

  insertText();
  const els = document.querySelectorAll('.slide-element');
  const sub = els[els.length - 1];
  sub.style.left = '80px'; sub.style.top = '220px'; sub.style.width = '600px';
  sub.querySelector('[contenteditable]').innerHTML = 'Subtítulo o descripción aquí...';
  sub.querySelector('[contenteditable]').style.fontSize = '22px';
  sub.querySelector('[contenteditable]').style.color = '#64748b';

  saveHistory();
  renderSlideList();
  updateStatus();
  setupGlobalEvents();
}

// ═══════════════════════════════════════════════════════
// SLIDES MANAGEMENT
// ═══════════════════════════════════════════════════════
function addSlide(templateTheme = 'white') {
  saveCurrentSlideData();
  const slide = {
    id: Date.now(),
    theme: templateTheme,
    elements: [],
    bg: '#ffffff',
    bgStyle: 'slide-bg-white'
  };
  state.slides.push(slide);
  state.currentSlide = state.slides.length - 1;
  loadSlide(state.currentSlide);
  renderSlideList();
  updateStatus();
  saveHistory();
}

function saveCurrentSlideData() {
  if (state.currentSlide >= 0 && state.slides[state.currentSlide]) {
    const canvas = document.getElementById('slide-canvas');
    const elems = canvas.querySelectorAll('.slide-element');
    state.slides[state.currentSlide].elements = [];
    elems.forEach(el => {
      state.slides[state.currentSlide].elements.push(serializeElement(el));
    });
    state.slides[state.currentSlide].bgStyle = canvas.className.replace('','').trim() || 'slide-bg-white';
    state.slides[state.currentSlide].bgClass = canvas.className;
  }
}

function serializeElement(el) {
  const contentEl = el.querySelector('[contenteditable]') || el;
  return {
    id: el.dataset.id,
    type: el.dataset.type,
    left: el.style.left,
    top: el.style.top,
    width: el.style.width,
    height: el.style.height,
    innerHTML: el.querySelector('[contenteditable]') ? el.querySelector('[contenteditable]').innerHTML : '',
    background: el.querySelector('.el-shape') ? el.querySelector('.el-shape').style.background : el.style.background,
    opacity: el.style.opacity || '1',
    zIndex: el.style.zIndex || '1',
    elBackground: el.style.background,
    borderRadius: el.style.borderRadius
  };
}

function loadSlide(index) {
  const canvas = document.getElementById('slide-canvas');
  canvas.innerHTML = '';
  canvas.className = '';
  state.selectedElement = null;
  
  const slide = state.slides[index];
  if (!slide) return;
  
  if (slide.bgClass) canvas.className = slide.bgClass;
  
  slide.elements.forEach(data => restoreElement(data));
}

function restoreElement(data) {
  const canvas = document.getElementById('slide-canvas');
  let el;
  if (data.type === 'shape') {
    el = createShapeElement(data.subtype || 'rect');
  } else {
    el = createTextElement();
  }
  el.dataset.id = data.id;
  el.style.left = data.left;
  el.style.top = data.top;
  el.style.width = data.width;
  el.style.height = data.height || 'auto';
  el.style.opacity = data.opacity || '1';
  el.style.zIndex = data.zIndex || '1';
  if (data.elBackground) el.style.background = data.elBackground;
  
  const contentEl = el.querySelector('[contenteditable]');
  if (contentEl && data.innerHTML !== undefined) contentEl.innerHTML = data.innerHTML;
  
  canvas.appendChild(el);
}

function switchSlide(index) {
  saveCurrentSlideData();
  renderSlideThumbnail(state.currentSlide);
  state.currentSlide = index;
  loadSlide(index);
  renderSlideList();
  updateStatus();
}

function deleteCurrentSlide() {
  if (state.slides.length <= 1) { setStatus('⚠ Debe haber al menos una diapositiva'); return; }
  state.slides.splice(state.currentSlide, 1);
  state.currentSlide = Math.min(state.currentSlide, state.slides.length - 1);
  loadSlide(state.currentSlide);
  renderSlideList();
  updateStatus();
  saveHistory();
}

function duplicateSlide() {
  saveCurrentSlideData();
  const copy = JSON.parse(JSON.stringify(state.slides[state.currentSlide]));
  copy.id = Date.now();
  state.slides.splice(state.currentSlide + 1, 0, copy);
  state.currentSlide++;
  loadSlide(state.currentSlide);
  renderSlideList();
  updateStatus();
  saveHistory();
}

// ═══════════════════════════════════════════════════════
// RENDER SLIDE LIST
// ═══════════════════════════════════════════════════════
function renderSlideList() {
  const list = document.getElementById('slides-list');
  list.innerHTML = '';
  state.slides.forEach((slide, i) => {
    const thumb = document.createElement('div');
    thumb.className = 'slide-thumb' + (i === state.currentSlide ? ' active' : '');
    thumb.dataset.index = i;
    
    thumb.innerHTML = `
      <div class="thumb-number">${i + 1}</div>
      <div class="thumb-actions">
        <button class="thumb-act-btn" onclick="event.stopPropagation();deleteSlideAt(${i})" title="Eliminar">✕</button>
      </div>
    `;

    // Mini preview
    const preview = document.createElement('div');
    preview.className = `thumb-canvas ${slide.bgClass || ''}`;
    preview.style.cssText = `position:absolute;inset:0;pointer-events:none;overflow:hidden;`;
    
    slide.elements.forEach(data => {
      const mini = document.createElement('div');
      const scaleX = 196 / SLIDE_W;
      const scaleY = 110 / SLIDE_H;
      const l = (parseFloat(data.left) || 0) * scaleX;
      const t = (parseFloat(data.top) || 0) * scaleY;
      const w = (parseFloat(data.width) || 100) * scaleX;
      mini.style.cssText = `position:absolute;left:${l}px;top:${t}px;width:${w}px;min-height:4px;font-size:${Math.max(4, (parseFloat(data.width || 100) / 120))}px;overflow:hidden;`;
      if (data.type !== 'shape') {
        const tmp = document.createElement('div');
        tmp.innerHTML = data.innerHTML || '';
        mini.textContent = tmp.textContent.substring(0, 30);
        mini.style.color = 'rgba(0,0,0,.6)';
      } else {
        mini.style.background = data.elBackground || '#888';
        mini.style.height = (parseFloat(data.height) || 30) * scaleY + 'px';
        mini.style.borderRadius = '2px';
      }
      preview.appendChild(mini);
    });
    
    thumb.insertBefore(preview, thumb.firstChild);
    thumb.onclick = () => switchSlide(i);
    list.appendChild(thumb);
  });
  document.getElementById('st-slides').textContent = `${state.slides.length} diapositiva${state.slides.length !== 1 ? 's' : ''}`;
}

function deleteSlideAt(i) {
  if (state.slides.length <= 1) return;
  state.slides.splice(i, 1);
  if (state.currentSlide >= state.slides.length) state.currentSlide = state.slides.length - 1;
  loadSlide(state.currentSlide);
  renderSlideList();
  saveHistory();
}

function renderSlideThumbnail(index) {
  // refresh thumbnail after edits
  saveCurrentSlideData();
  renderSlideList();
}

// ═══════════════════════════════════════════════════════
// ELEMENT CREATION
// ═══════════════════════════════════════════════════════
function createTextElement() {
  const el = document.createElement('div');
  el.className = 'slide-element';
  el.dataset.type = 'text';
  el.dataset.id = Date.now() + Math.random();
  el.style.cssText = `left:100px;top:100px;width:300px;min-height:40px;`;

  const content = document.createElement('div');
  content.className = 'el-text';
  content.contentEditable = 'true';
  content.spellcheck = true;
  content.style.cssText = `font-family:Georgia;font-size:16px;color:#1a1a1a;min-height:40px;outline:none;`;
  content.innerHTML = 'Texto aquí...';
  
  content.addEventListener('focus', () => {
    el.classList.add('editing');
    el.classList.add('selected');
    state.selectedElement = el;
    updatePropsPanel(el);
  });
  content.addEventListener('blur', () => el.classList.remove('editing'));
  content.addEventListener('input', () => { debounceThumbUpdate(); });
  content.addEventListener('mousedown', e => e.stopPropagation());

  el.appendChild(content);
  addResizeHandles(el);
  setupElementEvents(el);
  return el;
}

function createShapeElement(subtype = 'rect') {
  const el = document.createElement('div');
  el.className = 'slide-element';
  el.dataset.type = 'shape';
  el.dataset.subtype = subtype;
  el.dataset.id = Date.now() + Math.random();
  el.style.cssText = `left:150px;top:150px;width:200px;height:100px;`;

  const shape = document.createElement('div');
  shape.className = 'el-shape';
  shape.style.cssText = `width:100%;height:100%;background:${getAccentColor()};border-radius:${subtype === 'circle' ? '50%' : '6px'};`;
  el.appendChild(shape);
  
  addResizeHandles(el);
  setupElementEvents(el);
  return el;
}

function getAccentColor() {
  const colors = ['#3b82f6','#8b5cf6','#22c55e','#f59e0b','#ef4444','#14b8a6'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function addResizeHandles(el) {
  ['nw','n','ne','w','e','sw','s','se'].forEach(pos => {
    const h = document.createElement('div');
    h.className = `resize-handle rh-${pos}`;
    h.dataset.pos = pos;
    h.addEventListener('mousedown', startResize);
    el.appendChild(h);
  });
}

// ═══════════════════════════════════════════════════════
// INSERT ELEMENTS
// ═══════════════════════════════════════════════════════
function insertText() {
  const canvas = document.getElementById('slide-canvas');
  const el = createTextElement();
  el.style.left = randomPos(100, 400) + 'px';
  el.style.top = randomPos(100, 300) + 'px';
  canvas.appendChild(el);
  selectElement(el);
  el.querySelector('[contenteditable]').focus();
  saveHistory();
}

function insertTitle() {
  const canvas = document.getElementById('slide-canvas');
  const el = createTextElement();
  el.style.cssText = `left:80px;top:80px;width:800px;min-height:60px;`;
  const content = el.querySelector('[contenteditable]');
  content.style.cssText = `font-family:Syne;font-size:48px;font-weight:800;color:#1a1a1a;min-height:60px;outline:none;`;
  content.innerHTML = 'Título Principal';
  canvas.appendChild(el);
  selectElement(el);
  saveHistory();
}

function insertSubtitle() {
  const canvas = document.getElementById('slide-canvas');
  const el = createTextElement();
  el.style.cssText = `left:80px;top:200px;width:600px;min-height:40px;`;
  const content = el.querySelector('[contenteditable]');
  content.style.cssText = `font-family:DM Sans;font-size:22px;color:#64748b;min-height:40px;outline:none;`;
  content.innerHTML = 'Subtítulo aquí...';
  canvas.appendChild(el);
  selectElement(el);
  saveHistory();
}

function insertShape(subtype) {
  const canvas = document.getElementById('slide-canvas');
  const el = createShapeElement(subtype);
  canvas.appendChild(el);
  selectElement(el);
  saveHistory();
}

function randomPos(min, max) { return Math.floor(Math.random() * (max - min)) + min; }

// ═══════════════════════════════════════════════════════
// ELEMENT EVENTS (drag, select)
// ═══════════════════════════════════════════════════════
function setupElementEvents(el) {
  el.addEventListener('mousedown', e => {
    if (e.target.classList.contains('resize-handle')) return;
    if (e.target.contentEditable === 'true' && el.classList.contains('selected')) return;
    e.preventDefault();
    selectElement(el);
    startDrag(e, el);
  });
  
  el.addEventListener('contextmenu', e => {
    e.preventDefault();
    selectElement(el);
    showContextMenu(e.clientX, e.clientY);
  });
}

function selectElement(el) {
  document.querySelectorAll('.slide-element').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  state.selectedElement = el;
  updatePropsPanel(el);
  updateStatus();
}

function deselectAll() {
  document.querySelectorAll('.slide-element').forEach(e => e.classList.remove('selected','editing'));
  state.selectedElement = null;
  updatePropsPanel(null);
}

document.getElementById('slide-canvas').addEventListener('mousedown', e => {
  if (e.target === e.currentTarget) deselectAll();
});

// ─── DRAG ───
function startDrag(e, el) {
  const rect = el.getBoundingClientRect();
  const canvasRect = document.getElementById('slide-canvas').getBoundingClientRect();
  const scale = state.zoom / 100;
  dragInfo = {
    el,
    startX: e.clientX,
    startY: e.clientY,
    origLeft: parseFloat(el.style.left) || 0,
    origTop: parseFloat(el.style.top) || 0,
    scale
  };
}

document.addEventListener('mousemove', e => {
  if (dragInfo) {
    const dx = (e.clientX - dragInfo.startX) / dragInfo.scale;
    const dy = (e.clientY - dragInfo.startY) / dragInfo.scale;
    const newL = Math.max(0, Math.min(SLIDE_W - 40, dragInfo.origLeft + dx));
    const newT = Math.max(0, Math.min(SLIDE_H - 20, dragInfo.origTop + dy));
    dragInfo.el.style.left = newL + 'px';
    dragInfo.el.style.top = newT + 'px';
    updatePropsPanel(dragInfo.el);
    document.getElementById('st-pos').textContent = `${Math.round(newL)}, ${Math.round(newT)}`;
  }
  
  if (resizeInfo) {
    const dx = (e.clientX - resizeInfo.startX) / (state.zoom / 100);
    const dy = (e.clientY - resizeInfo.startY) / (state.zoom / 100);
    const el = resizeInfo.el;
    const pos = resizeInfo.pos;

    let newW = resizeInfo.origW, newH = resizeInfo.origH;
    let newL = resizeInfo.origL, newT = resizeInfo.origT;

    if (pos.includes('e')) newW = Math.max(60, resizeInfo.origW + dx);
    if (pos.includes('s')) newH = Math.max(30, resizeInfo.origH + dy);
    if (pos.includes('w')) { newW = Math.max(60, resizeInfo.origW - dx); newL = resizeInfo.origL + resizeInfo.origW - newW; }
    if (pos.includes('n')) { newH = Math.max(30, resizeInfo.origH - dy); newT = resizeInfo.origT + resizeInfo.origH - newH; }

    el.style.width = newW + 'px';
    el.style.height = newH + 'px';
    el.style.left = newL + 'px';
    el.style.top = newT + 'px';
    updatePropsPanel(el);
  }
});

document.addEventListener('mouseup', () => {
  if (dragInfo || resizeInfo) {
    debounceHistorySave();
    debounceThumbUpdate();
  }
  dragInfo = null;
  resizeInfo = null;
});

function startResize(e) {
  e.preventDefault();
  e.stopPropagation();
  const el = e.target.closest('.slide-element');
  resizeInfo = {
    el, pos: e.target.dataset.pos,
    startX: e.clientX, startY: e.clientY,
    origW: parseFloat(el.style.width) || el.offsetWidth,
    origH: parseFloat(el.style.height) || el.offsetHeight,
    origL: parseFloat(el.style.left) || 0,
    origT: parseFloat(el.style.top) || 0
  };
}

// ═══════════════════════════════════════════════════════
// FORMATTING
// ═══════════════════════════════════════════════════════
function getActiveTextEl() {
  if (state.selectedElement) {
    const ce = state.selectedElement.querySelector('[contenteditable]');
    if (ce) return ce;
  }
  return null;
}

function applyFormat(cmd) {
  const ce = getActiveTextEl();
  if (ce) {
    ce.focus();
    document.execCommand(cmd, false, null);
    updateFormatButtons();
    debounceThumbUpdate();
  }
}

function applyAlign(align) {
  const ce = getActiveTextEl();
  if (ce) { ce.focus(); document.execCommand('justify' + align.charAt(0).toUpperCase() + align.slice(1), false, null); }
}

function applyFont() {
  const font = document.getElementById('font-select').value;
  const ce = getActiveTextEl();
  if (ce) {
    ce.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      ce.style.fontFamily = font;
    } else {
      document.execCommand('fontName', false, font);
    }
    debounceThumbUpdate();
  }
}

function applyFontSize() {
  const size = document.getElementById('fontsize-select').value;
  const ce = getActiveTextEl();
  if (ce) {
    ce.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      ce.style.fontSize = size + 'px';
    } else {
      // wrap selection in span
      const range = sel.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = size + 'px';
      range.surroundContents(span);
    }
    debounceThumbUpdate();
  }
}

function applyTextColor(color) {
  document.getElementById('text-color-ind').style.background = color;
  const ce = getActiveTextEl();
  if (ce) { ce.focus(); document.execCommand('foreColor', false, color); }
}

function applyBgColor(color) {
  document.getElementById('bg-color-ind').style.background = color;
  const ce = getActiveTextEl();
  if (ce) { ce.focus(); document.execCommand('hiliteColor', false, color); }
}

function pickTextColor() {
  document.getElementById('text-color-picker').click();
}
function pickBgColor() {
  document.getElementById('bg-color-picker').click();
}

function updateFormatButtons() {
  ['bold','italic','underline','strikeThrough'].forEach(cmd => {
    const btn = document.getElementById('btn-' + (cmd === 'strikeThrough' ? 'strike' : cmd));
    if (btn) btn.classList.toggle('active', document.queryCommandState(cmd));
  });
}

document.addEventListener('selectionchange', updateFormatButtons);

// ═══════════════════════════════════════════════════════
// CLIPBOARD (Copy, Cut, Paste)
// ═══════════════════════════════════════════════════════
function doCopy() {
  if (state.selectedElement) {
    state.clipboard = { element: serializeElement(state.selectedElement), type: 'element' };
    setStatus('✅ Copiado al portapapeles');
  }
}

function doCut() {
  if (state.selectedElement) {
    state.clipboard = { element: serializeElement(state.selectedElement), type: 'element' };
    state.selectedElement.remove();
    state.selectedElement = null;
    saveHistory();
    debounceThumbUpdate();
    setStatus('✅ Cortado');
  }
}

function doPaste() {
  if (state.clipboard && state.clipboard.type === 'element') {
    const data = JSON.parse(JSON.stringify(state.clipboard.element));
    data.id = Date.now() + Math.random();
    // Offset slightly
    data.left = (parseFloat(data.left) + 20) + 'px';
    data.top = (parseFloat(data.top) + 20) + 'px';
    restoreElement(data);
    const canvas = document.getElementById('slide-canvas');
    const newEl = canvas.lastElementChild;
    selectElement(newEl);
    saveHistory();
    debounceThumbUpdate();
    setStatus('✅ Pegado');
  }
}

function doDuplicate() {
  if (state.selectedElement) {
    doCopy();
    doPaste();
  }
}

function deleteSelected() {
  if (state.selectedElement) {
    state.selectedElement.remove();
    state.selectedElement = null;
    saveHistory();
    debounceThumbUpdate();
    updatePropsPanel(null);
  }
}

function selectAll() {
  const canvas = document.getElementById('slide-canvas');
  const els = canvas.querySelectorAll('.slide-element');
  if (els.length > 0) selectElement(els[els.length - 1]);
}

// ═══════════════════════════════════════════════════════
// PROPERTIES PANEL
// ═══════════════════════════════════════════════════════
function updatePropsPanel(el) {
  if (!el) {
    document.getElementById('prop-x').value = '';
    document.getElementById('prop-y').value = '';
    document.getElementById('prop-w').value = '';
    document.getElementById('prop-h').value = '';
    return;
  }
  document.getElementById('prop-x').value = Math.round(parseFloat(el.style.left) || 0);
  document.getElementById('prop-y').value = Math.round(parseFloat(el.style.top) || 0);
  document.getElementById('prop-w').value = Math.round(parseFloat(el.style.width) || el.offsetWidth);
  document.getElementById('prop-h').value = Math.round(parseFloat(el.style.height) || el.offsetHeight);
  document.getElementById('prop-opacity').value = Math.round((parseFloat(el.style.opacity) || 1) * 100);
  document.getElementById('opacity-val').textContent = document.getElementById('prop-opacity').value + '%';
}

function applyPosition() {
  if (!state.selectedElement) return;
  state.selectedElement.style.left = document.getElementById('prop-x').value + 'px';
  state.selectedElement.style.top = document.getElementById('prop-y').value + 'px';
  debounceThumbUpdate();
}

function applySize() {
  if (!state.selectedElement) return;
  state.selectedElement.style.width = document.getElementById('prop-w').value + 'px';
  state.selectedElement.style.height = document.getElementById('prop-h').value + 'px';
  debounceThumbUpdate();
}

function applyOpacity(val) {
  if (!state.selectedElement) return;
  state.selectedElement.style.opacity = val / 100;
  document.getElementById('opacity-val').textContent = val + '%';
  debounceThumbUpdate();
}

function bringForward() {
  if (!state.selectedElement) return;
  const z = parseInt(state.selectedElement.style.zIndex || 1);
  state.selectedElement.style.zIndex = z + 1;
}

function sendBackward() {
  if (!state.selectedElement) return;
  const z = parseInt(state.selectedElement.style.zIndex || 1);
  state.selectedElement.style.zIndex = Math.max(0, z - 1);
}

// ─── THEMES ───
function buildThemeGrid() {
  const grid = document.getElementById('theme-grid');
  themes.forEach(t => {
    const card = document.createElement('div');
    card.className = 'theme-card ' + t.style;
    card.innerHTML = `<span class="theme-label">${t.label}</span>`;
    card.onclick = () => applyTheme(t);
    grid.appendChild(card);
  });
}

function applyTheme(t) {
  const canvas = document.getElementById('slide-canvas');
  canvas.className = t.style;
  state.slides[state.currentSlide].bgClass = t.style;
  document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
  debounceThumbUpdate();
  saveHistory();
}

// ─── COLOR SWATCHES ───
function buildColorSwatches() {
  const row = document.getElementById('el-color-swatches');
  colorSwatches.forEach(color => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch';
    sw.style.background = color === 'transparent' ? 'none' : color;
    if (color === 'transparent') sw.style.border = '1px dashed var(--border-lit)';
    sw.onclick = () => applyElementColor(color);
    row.appendChild(sw);
  });
}

function applyElementColor(color) {
  if (!state.selectedElement) return;
  const shape = state.selectedElement.querySelector('.el-shape');
  if (shape) {
    shape.style.background = color;
  } else {
    const ce = state.selectedElement.querySelector('[contenteditable]');
    if (ce) ce.style.color = color;
  }
  debounceThumbUpdate();
}

// ═══════════════════════════════════════════════════════
// SPELL CHECK
// ═══════════════════════════════════════════════════════
function toggleSpellPanel() {
  const panel = document.getElementById('spell-panel');
  panel.classList.toggle('open');
}

function runSpellCheck() {
  const canvas = document.getElementById('slide-canvas');
  const resultsDiv = document.getElementById('spell-results');
  
  // Get all text from contenteditable elements
  const textEls = canvas.querySelectorAll('[contenteditable]');
  let allWords = [];
  let misspelled = [];
  
  textEls.forEach(el => {
    const text = el.textContent;
    const words = text.match(/[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]+/g) || [];
    words.forEach(w => {
      const lower = w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const wordLower = w.toLowerCase();
      if (!esDict.has(wordLower) && !esDict.has(lower) && !state.customDictionary.has(wordLower) && w.length > 2) {
        allWords.push({ word: w, el });
      }
    });
  });
  
  // Remove duplicates
  const seen = new Set();
  allWords = allWords.filter(item => {
    if (seen.has(item.word)) return false;
    seen.add(item.word);
    return true;
  });
  
  if (allWords.length === 0) {
    resultsDiv.innerHTML = `<div style="color:var(--accent-3);font-size:12px;text-align:center;padding:16px">✅ No se encontraron errores ortográficos</div>`;
    return;
  }
  
  resultsDiv.innerHTML = `<div style="color:var(--text-2);font-size:11px;margin-bottom:8px">Se encontraron ${allWords.length} posible(s) error(es):</div>`;
  
  allWords.slice(0, 15).forEach(item => {
    const div = document.createElement('div');
    div.className = 'spell-word';
    div.style.flexDirection = 'column';
    div.style.alignItems = 'flex-start';
    div.style.gap = '4px';
    
    const suggestions = getSuggestions(item.word);
    div.innerHTML = `
      <span class="spell-word-text">✗ ${item.word}</span>
      <div class="spell-suggestions">
        ${suggestions.map(s => `<button class="spell-sugg-btn" onclick="replaceWord('${item.word}','${s}')">${s}</button>`).join('')}
        <button class="spell-sugg-btn" style="background:none;border-color:var(--border)" onclick="ignoreWord('${item.word}')">Ignorar</button>
        <button class="spell-sugg-btn" style="background:none;border-color:var(--accent-3);color:var(--accent-3)" onclick="addWordToDict('${item.word}')">+ Agregar</button>
      </div>
    `;
    resultsDiv.appendChild(div);
  });
}

function getSuggestions(word) {
  // Simple suggestions based on similar length words from dictionary
  const lower = word.toLowerCase();
  const matches = [];
  for (const dictWord of esDict) {
    if (Math.abs(dictWord.length - lower.length) <= 2 && dictWord.charAt(0) === lower.charAt(0)) {
      matches.push(dictWord);
      if (matches.length >= 3) break;
    }
  }
  return matches.slice(0, 3);
}

function replaceWord(original, replacement) {
  const canvas = document.getElementById('slide-canvas');
  canvas.querySelectorAll('[contenteditable]').forEach(el => {
    el.innerHTML = el.innerHTML.replace(new RegExp(`\\b${original}\\b`, 'g'), replacement);
  });
  debounceThumbUpdate();
  runSpellCheck();
  setStatus(`✅ "${original}" → "${replacement}"`);
}

function ignoreWord(word) {
  state.customDictionary.add(word.toLowerCase());
  runSpellCheck();
}

function addWordToDict() {
  const word = prompt('Agregar palabra al diccionario:');
  if (word) {
    state.customDictionary.add(word.toLowerCase());
    setStatus(`✅ "${word}" agregado al diccionario`);
    runSpellCheck();
  }
}

function addToDictionary() {
  addWordToDict();
}

// ═══════════════════════════════════════════════════════
// UNDO / REDO
// ═══════════════════════════════════════════════════════
function saveHistory() {
  saveCurrentSlideData();
  const snapshot = JSON.stringify(state.slides);
  if (state.historyIndex < state.history.length - 1) {
    state.history = state.history.slice(0, state.historyIndex + 1);
  }
  state.history.push(snapshot);
  if (state.history.length > 50) state.history.shift();
  state.historyIndex = state.history.length - 1;
}

function doUndo() {
  if (state.historyIndex > 0) {
    state.historyIndex--;
    state.slides = JSON.parse(state.history[state.historyIndex]);
    loadSlide(state.currentSlide);
    renderSlideList();
    setStatus('↩ Deshecho');
  }
}

function doRedo() {
  if (state.historyIndex < state.history.length - 1) {
    state.historyIndex++;
    state.slides = JSON.parse(state.history[state.historyIndex]);
    loadSlide(state.currentSlide);
    renderSlideList();
    setStatus('↪ Rehecho');
  }
}

let histDebounce;
function debounceHistorySave() {
  clearTimeout(histDebounce);
  histDebounce = setTimeout(saveHistory, 800);
}

let thumbDebounce;
function debounceThumbUpdate() {
  clearTimeout(thumbDebounce);
  thumbDebounce = setTimeout(() => {
    saveCurrentSlideData();
    renderSlideList();
  }, 500);
}

// ═══════════════════════════════════════════════════════
// ZOOM
// ═══════════════════════════════════════════════════════
function setZoom(val) {
  state.zoom = Math.max(25, Math.min(200, val));
  document.getElementById('zoom-val').textContent = state.zoom + '%';
  document.getElementById('slide-wrapper').style.transform = `scale(${state.zoom / 100})`;
  document.getElementById('slide-wrapper').style.transformOrigin = 'center center';
}
function zoomIn() { setZoom(state.zoom + 10); }
function zoomOut() { setZoom(state.zoom - 10); }

// ═══════════════════════════════════════════════════════
// CONTEXT MENU
// ═══════════════════════════════════════════════════════
function showContextMenu(x, y) {
  const menu = document.getElementById('ctx-menu');
  menu.style.left = Math.min(x, window.innerWidth - 200) + 'px';
  menu.style.top = Math.min(y, window.innerHeight - 200) + 'px';
  menu.classList.add('open');
}

document.addEventListener('click', () => {
  document.getElementById('ctx-menu').classList.remove('open');
  document.querySelectorAll('.dropdown-menu').forEach(d => d.classList.remove('open'));
});

document.addEventListener('contextmenu', e => {
  if (!e.target.closest('.slide-element')) {
    if (e.target.closest('#slide-canvas')) {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY);
    }
  }
});

// ═══════════════════════════════════════════════════════
// DROPDOWN MENUS
// ═══════════════════════════════════════════════════════
function toggleDropdown(id) {
  const all = document.querySelectorAll('.dropdown-menu');
  const target = document.getElementById(id);
  const wasOpen = target.classList.contains('open');
  all.forEach(d => d.classList.remove('open'));
  if (!wasOpen) target.classList.add('open');
  event.stopPropagation();
}

// ═══════════════════════════════════════════════════════
// PRESENTATION MODE
// ═══════════════════════════════════════════════════════
function presentMode() {
  saveCurrentSlideData();
  presentIndex = state.currentSlide;
  renderPresentSlide();
  document.getElementById('present-overlay').style.display = 'block';
  document.addEventListener('keydown', presentKeyHandler);
}

function renderPresentSlide() {
  const overlay = document.getElementById('present-slide');
  const slide = state.slides[presentIndex];
  if (!slide) return;
  
  overlay.innerHTML = '';
  const slideDiv = document.createElement('div');
  const vw = window.innerWidth, vh = window.innerHeight;
  const scale = Math.min(vw / SLIDE_W, vh / SLIDE_H);
  
  slideDiv.style.cssText = `position:relative;width:${SLIDE_W}px;height:${SLIDE_H}px;transform:scale(${scale});transform-origin:center;`;
  slideDiv.className = slide.bgClass || 'slide-bg-white';

  slide.elements.forEach(data => {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;left:${data.left};top:${data.top};width:${data.width};height:${data.height || 'auto'};opacity:${data.opacity || 1};z-index:${data.zIndex || 1};`;
    if (data.type === 'shape') {
      const s = document.createElement('div');
      s.className = 'el-shape';
      s.style.cssText = `width:100%;height:100%;background:${data.elBackground || '#888'};border-radius:${data.subtype === 'circle' ? '50%' : '6px'};`;
      el.appendChild(s);
    } else {
      el.innerHTML = data.innerHTML;
      el.style.padding = '8px 12px';
      el.style.fontFamily = 'Georgia';
      el.style.fontSize = '16px';
      el.style.color = '#1a1a1a';
    }
    slideDiv.appendChild(el);
  });
  overlay.appendChild(slideDiv);
  
  document.getElementById('present-counter').textContent = `${presentIndex + 1} / ${state.slides.length}`;
}

function nextPresentSlide() {
  if (presentIndex < state.slides.length - 1) { presentIndex++; renderPresentSlide(); }
}

function prevPresentSlide() {
  if (presentIndex > 0) { presentIndex--; renderPresentSlide(); }
}

function exitPresent() {
  document.getElementById('present-overlay').style.display = 'none';
  document.removeEventListener('keydown', presentKeyHandler);
}

function presentKeyHandler(e) {
  if (e.key === 'Escape') exitPresent();
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') nextPresentSlide();
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevPresentSlide();
}

// ═══════════════════════════════════════════════════════
// EXPORT / IMPORT
// ═══════════════════════════════════════════════════════
function savePresentation() {
  saveCurrentSlideData();
  const data = { name: document.getElementById('filename-input').value, slides: state.slides };
  localStorage.setItem('slideforge_save', JSON.stringify(data));
  setStatus('💾 Guardado en el navegador');
}

function exportJSON() {
  saveCurrentSlideData();
  const data = { name: document.getElementById('filename-input').value, slides: state.slides };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (document.getElementById('filename-input').value || 'presentacion') + '.json';
  a.click();
  setStatus('📤 JSON exportado');
}

function exportHTML() {
  saveCurrentSlideData();
  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${document.getElementById('filename-input').value}</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#111;font-family:Georgia,serif;}
.slide{position:relative;width:960px;height:540px;margin:20px auto;overflow:hidden;page-break-after:always;}
.slide-bg-white{background:#fff;} .slide-bg-light{background:#f8fafc;} .slide-bg-dark{background:#1a1a2e;}
.slide-bg-ocean{background:linear-gradient(135deg,#0f3460,#16213e);} .slide-bg-forest{background:linear-gradient(135deg,#134e4a,#052e16);}
.slide-bg-sunset{background:linear-gradient(135deg,#7c3aed,#db2777,#f97316);} .slide-bg-paper{background:linear-gradient(135deg,#fef3c7,#fde68a);}
.slide-bg-space{background:radial-gradient(ellipse at top,#1e1b4b,#0f0f23);}
</style></head><body>`;
  
  state.slides.forEach((slide, i) => {
    html += `<div class="slide ${slide.bgClass || 'slide-bg-white'}">`;
    slide.elements.forEach(el => {
      html += `<div style="position:absolute;left:${el.left};top:${el.top};width:${el.width};height:${el.height || 'auto'};opacity:${el.opacity || 1};">`;
      if (el.type === 'shape') {
        html += `<div style="width:100%;height:100%;background:${el.elBackground || '#888'};border-radius:${el.subtype === 'circle' ? '50%' : '6px'};"></div>`;
      } else {
        html += el.innerHTML;
      }
      html += '</div>';
    });
    html += '</div>';
  });
  html += '</body></html>';
  
  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (document.getElementById('filename-input').value || 'presentacion') + '.html';
  a.click();
  setStatus('📤 HTML exportado');
}

function importJSON() { document.getElementById('import-file').click(); }

function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.slides) {
        state.slides = data.slides;
        state.currentSlide = 0;
        if (data.name) document.getElementById('filename-input').value = data.name;
        loadSlide(0);
        renderSlideList();
        saveHistory();
        setStatus('📥 Presentación importada');
      }
    } catch { setStatus('⚠ Error al importar el archivo'); }
  };
  reader.readAsText(file);
}

function newPresentation() {
  if (confirm('¿Crear nueva presentación? Se perderán los cambios no guardados.')) {
    state.slides = [];
    state.currentSlide = 0;
    state.history = [];
    state.historyIndex = -1;
    document.getElementById('slide-canvas').innerHTML = '';
    document.getElementById('filename-input').value = 'Nueva Presentación';
    addSlide();
    insertTitle();
    const el = document.querySelector('.slide-element');
    if (el) {
      el.style.left = '80px'; el.style.top = '100px'; el.style.width = '800px';
      const ce = el.querySelector('[contenteditable]');
      if (ce) { ce.innerHTML = 'Nueva Presentación'; ce.style.fontSize = '48px'; ce.style.fontWeight = '800'; }
    }
    saveHistory();
  }
}

// ═══════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════
function setupGlobalEvents() {
  document.addEventListener('keydown', e => {
    const tag = document.activeElement.tagName;
    const isEditing = document.activeElement.isContentEditable;
    const isInput = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
    
    if (e.key === 'F5') { e.preventDefault(); presentMode(); return; }
    if (e.key === 'Escape') { deselectAll(); return; }
    
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'z': e.preventDefault(); doUndo(); break;
        case 'y': e.preventDefault(); doRedo(); break;
        case 'c': if (!isEditing && !isInput) { e.preventDefault(); doCopy(); } break;
        case 'x': if (!isEditing && !isInput) { e.preventDefault(); doCut(); } break;
        case 'v': if (!isEditing && !isInput) { e.preventDefault(); doPaste(); } break;
        case 'd': if (!isEditing) { e.preventDefault(); doDuplicate(); } break;
        case 'a': if (!isEditing && !isInput) { e.preventDefault(); selectAll(); } break;
        case 'm': e.preventDefault(); addSlide(); break;
        case 's': e.preventDefault(); savePresentation(); break;
        case 'n': e.preventDefault(); newPresentation(); break;
        case 'b': if (isEditing) { e.preventDefault(); applyFormat('bold'); } break;
        case 'i': if (isEditing) { e.preventDefault(); applyFormat('italic'); } break;
        case 'u': if (isEditing) { e.preventDefault(); applyFormat('underline'); } break;
      }
    }
    
    if (!isEditing && !isInput) {
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
      if (e.key === 'ArrowLeft' && state.selectedElement) {
        state.selectedElement.style.left = (parseFloat(state.selectedElement.style.left) - 1) + 'px';
      }
      if (e.key === 'ArrowRight' && state.selectedElement) {
        state.selectedElement.style.left = (parseFloat(state.selectedElement.style.left) + 1) + 'px';
      }
      if (e.key === 'ArrowUp' && state.selectedElement) {
        state.selectedElement.style.top = (parseFloat(state.selectedElement.style.top) - 1) + 'px';
      }
      if (e.key === 'ArrowDown' && state.selectedElement) {
        state.selectedElement.style.top = (parseFloat(state.selectedElement.style.top) + 1) + 'px';
      }
    }
  });
  
  // Auto-save to localStorage
  setInterval(() => { savePresentation(); }, 30000);
  
  // Load from localStorage
  const saved = localStorage.getItem('slideforge_save');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.slides && data.slides.length > 0) {
        if (confirm('Se encontró una sesión guardada. ¿Desea recuperarla?')) {
          state.slides = data.slides;
          if (data.name) document.getElementById('filename-input').value = data.name;
          loadSlide(0);
          renderSlideList();
          saveHistory();
        }
      }
    } catch (e) {}
  }
}

// ═══════════════════════════════════════════════════════
// STATUS
// ═══════════════════════════════════════════════════════
function setStatus(msg) {
  document.getElementById('st-status').textContent = msg;
  setTimeout(() => document.getElementById('st-status').textContent = 'Listo', 3000);
}

function updateStatus() {
  document.getElementById('st-slides').textContent = `${state.slides.length} diapositiva${state.slides.length !== 1 ? 's' : ''}`;
}

// ═══════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════
window.addEventListener('load', init);