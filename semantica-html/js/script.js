(function () {

    'use strict';

  const toggle   = document.getElementById('menu-toggle');
  const sidebar  = document.getElementById('sidebar-menu');
  const overlay  = document.getElementById('sidebar-overlay');
  const navList  = document.getElementById('sidebar-nav-list');
  const filterIn = document.getElementById('sidebar-filter');
  const countEl  = document.getElementById('sidebar-count');
  const progBar  = document.getElementById('reading-progress-bar');
  const btnPrev  = document.getElementById('btn-prev');
  const btnNext  = document.getElementById('btn-next');
  const btnTop   = document.getElementById('btn-top');

  /* ── 1. RECOPILAR <section> y <article> ── */
  const sections = [];
  document.querySelectorAll('section.section-block').forEach(function (sec) {
    const heading = sec.querySelector('h2.section-title');
    const sectionData = {
      id: sec.id || ('sec-' + Math.random().toString(36).slice(2, 7)),
      title: heading ? heading.textContent.trim() : 'Sección',
      element: sec,
      articles: []
    };
    if (!sec.id) sec.id = sectionData.id;

    sec.querySelectorAll('article.article-card').forEach(function (art, idx) {
      const badge = art.querySelector('.tag-label');
      const h3    = art.querySelector('h3');
      const label = badge ? badge.textContent.trim() : '';
      const title = h3 ? h3.textContent.replace(/La etiqueta|Las etiquetas/gi,'').trim() : ('Ítem ' + (idx+1));
      if (!art.id) art.id = 'art-' + label.replace(/[^a-zA-Z0-9]/g,'').toLowerCase() + '-' + idx;
      sectionData.articles.push({ id: art.id, badge: label, title: title, element: art });
    });
    sections.push(sectionData);
  });

  /* ── 2. CONSTRUIR EL MENÚ ── */
  let totalArticles = 0;
  const flatItems = [];

  sections.forEach(function (sec) {
    const groupLabel = document.createElement('div');
    groupLabel.className = 'sidebar-group-label';
    groupLabel.textContent = sec.title;
    navList.appendChild(groupLabel);

    sec.articles.forEach(function (art) {
      totalArticles++;
      flatItems.push(art);

      const item    = document.createElement('div');
      item.className = 'sidebar-item';
      item.dataset.target = art.id;
      item.setAttribute('role','button');
      item.setAttribute('tabindex','0');
      item.setAttribute('aria-label','Ir a: ' + art.title);

      const badgeEl = document.createElement('span');
      badgeEl.className = 'sidebar-item-badge';
      badgeEl.textContent = art.badge || '#';

      const textEl = document.createElement('span');
      textEl.className = 'sidebar-item-text';
      textEl.textContent = art.title;

      item.appendChild(badgeEl);
      item.appendChild(textEl);
      navList.appendChild(item);

      item.addEventListener('click', function () {
        scrollToArticle(art.id, item);
        if (window.innerWidth < 700) closeSidebar();
      });
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          scrollToArticle(art.id, item);
          if (window.innerWidth < 700) closeSidebar();
        }
      });
    });
  });

  countEl.textContent = totalArticles + ' etiquetas · ' + sections.length + ' secciones';

  /* ── 3. SCROLL SUAVE ── */
  function scrollToArticle(id, itemEl) {
    const target = document.getElementById(id);
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: top, behavior: 'smooth' });
    target.classList.remove('scroll-highlight');
    void target.offsetWidth;
    target.classList.add('scroll-highlight');
    setActiveItem(itemEl);
  }

  /* ── 4. ÍTEM ACTIVO ── */
  function setActiveItem(activeEl) {
    navList.querySelectorAll('.sidebar-item').forEach(function (el) { el.classList.remove('active'); });
    if (activeEl) {
      activeEl.classList.add('active');
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  /* ── 5. INTERSECTION OBSERVER ── */
  let currentActiveId = null;

  const observer = new IntersectionObserver(function (entries) {
    let best = null, bestRatio = 0;
    entries.forEach(function (entry) {
      if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
        bestRatio = entry.intersectionRatio;
        best = entry;
      }
    });
    if (best && best.target.id !== currentActiveId) {
      currentActiveId = best.target.id;
      const sidebarItem = navList.querySelector('[data-target="' + currentActiveId + '"]');
      setActiveItem(sidebarItem);
    }
  }, { threshold: [0.1, 0.3, 0.5], rootMargin: '-80px 0px -20% 0px' });

  flatItems.forEach(function (art) { observer.observe(art.element); });

  /* ── 6. FILTRO DEL SIDEBAR ── */
  filterIn.addEventListener('input', function () {
    const query = filterIn.value.toLowerCase().trim();
    let visibleCount = 0;
    navList.querySelectorAll('.sidebar-item').forEach(function (item) {
      const text  = item.querySelector('.sidebar-item-text').textContent.toLowerCase();
      const badge = item.querySelector('.sidebar-item-badge').textContent.toLowerCase();
      const match = !query || text.includes(query) || badge.includes(query);
      item.classList.toggle('hidden', !match);
      if (match) visibleCount++;
    });
    navList.querySelectorAll('.sidebar-group-label').forEach(function (label) {
      let sib = label.nextElementSibling, hasVisible = false;
      while (sib && !sib.classList.contains('sidebar-group-label')) {
        if (!sib.classList.contains('hidden')) hasVisible = true;
        sib = sib.nextElementSibling;
      }
      label.style.display = hasVisible ? '' : 'none';
    });
    countEl.textContent = (query ? visibleCount + ' resultados' : totalArticles + ' etiquetas') + ' · ' + sections.length + ' secciones';
  });

  /* ── 7. BOTONES PREV / NEXT / TOP ── */
  function getCurrentIndex() {
    return flatItems.findIndex(function (art) { return art.id === currentActiveId; });
  }
  btnPrev.addEventListener('click', function () {
    const idx = getCurrentIndex();
    if (idx > 0) { const p = flatItems[idx-1]; scrollToArticle(p.id, navList.querySelector('[data-target="'+p.id+'"]')); }
  });
  btnNext.addEventListener('click', function () {
    const idx = getCurrentIndex();
    if (idx < flatItems.length-1) { const n = flatItems[idx+1]; scrollToArticle(n.id, navList.querySelector('[data-target="'+n.id+'"]')); }
  });
  btnTop.addEventListener('click', function () { window.scrollTo({ top:0, behavior:'smooth' }); });

  /* ── 8. PROGRESO DE LECTURA ── */
  function updateProgress() {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    progBar.style.width = (docHeight > 0 ? Math.min((window.scrollY / docHeight) * 100, 100) : 0) + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  /* ── 9. ABRIR / CERRAR ── */
  function openSidebar() {
    sidebar.classList.add('open');
    sidebar.setAttribute('aria-hidden','false');
    overlay.classList.add('visible');
    toggle.classList.add('open');
    toggle.setAttribute('aria-expanded','true');
    toggle.querySelector('#menu-toggle-label').textContent = 'Cerrar';
    document.body.classList.add('sidebar-open');
    filterIn.focus();
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebar.setAttribute('aria-hidden','true');
    overlay.classList.remove('visible');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded','false');
    toggle.querySelector('#menu-toggle-label').textContent = 'Índice';
    document.body.classList.remove('sidebar-open');
    toggle.focus();
  }
  toggle.addEventListener('click', function () {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  overlay.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) closeSidebar();
  });

  /* ── 10. SWIPE PARA CERRAR EN MÓVIL ── */
  let touchStartX = 0;
  sidebar.addEventListener('touchstart', function (e) { touchStartX = e.touches[0].clientX; }, { passive:true });
  sidebar.addEventListener('touchend',   function (e) { if (e.changedTouches[0].clientX - touchStartX > 60) closeSidebar(); }, { passive:true });
})();

/* ================================================================
   BÚSQUEDA EN DOCUMENTO — JavaScript
   Funcionalidad completa:
   1. Limpiar marcas anteriores del DOM
   2. Recorrer nodos de texto del <main> y marcar coincidencias
   3. Navegar entre resultados con ◀ ▶
   4. Actualizar contador "X de Y resultados"
   5. Hacer scroll suave al resultado activo
   6. Resaltar el <article> que contiene el resultado actual
   7. Limpiar al pulsar ✕ o borrar el input
================================================================ */

(function () {
    'use strict';

  const input      = document.getElementById('buscador');
  const btnBuscar  = document.getElementById('btn-buscar');
  const controls   = document.getElementById('search-controls');
  const counter    = document.getElementById('search-counter');
  const btnPrevM   = document.getElementById('btn-match-prev');
  const btnNextM   = document.getElementById('btn-match-next');
  const btnClear   = document.getElementById('btn-clear-search');

  // Nodo raíz donde buscamos: el <main> del documento
  // Excluimos code-blocks para no romper el HTML visible del código demo
  const searchRoot = document.querySelector('main.container');

  let marks        = [];   // Array de <mark> inyectados
  let currentIdx   = -1;   // Índice del resultado activo

  /* ── UTILIDAD: Escapar regex ── */
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /* ── 1. LIMPIAR TODAS LAS MARCAS ANTERIORES ── */
  function clearMarks() {
    // Reemplazamos cada <mark> por su texto original y unimos nodos adyacentes
    marks.forEach(function (mark) {
      const parent = mark.parentNode;
      if (!parent) return;
      const text = document.createTextNode(mark.textContent);
      parent.replaceChild(text, mark);
      parent.normalize(); // une nodos de texto fragmentados
    });
    marks = [];
    currentIdx = -1;

    // Quitamos clase de artículo activo
    document.querySelectorAll('.search-article-active').forEach(function (el) {
      el.classList.remove('search-article-active');
    });

    controls.style.display = 'none';
    counter.textContent = '';
  }

  function runSearch() {
    clearMarks();
    const query = input.value.trim();
    if (query.length < 1) return;

    const regex = new RegExp('(' + escapeRegex(query) + ')', 'gi');

    /* Recopilamos todos los nodos de texto dentro del searchRoot,
       excluyendo los .code-block (código fuente de ejemplos) y
       los propios controles de búsqueda */
    const textNodes = [];
    const walker = document.createTreeWalker(
      searchRoot,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          // Ignorar nodos dentro de .code-block, .demo-label, script, style
          let el = node.parentElement;
          while (el && el !== searchRoot) {
            if (
              el.classList.contains('code-block') ||
              el.tagName === 'SCRIPT' ||
              el.tagName === 'STYLE'
            ) return NodeFilter.FILTER_REJECT;
            el = el.parentElement;
          }
          // Solo aceptar nodos con texto significativo
          return node.textContent.trim().length > 0
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
        }
      }
    );

    let node;
    while ((node = walker.nextNode())) {
      if (regex.test(node.textContent)) textNodes.push(node);
      regex.lastIndex = 0;
    }

    /* Para cada nodo de texto con coincidencia, dividimos en fragmentos
       e insertamos <mark class="search-hit"> alrededor de cada match */
    textNodes.forEach(function (textNode) {
      const parent  = textNode.parentNode;
      const text    = textNode.textContent;
      const parts   = text.split(regex);
      // parts: ['antes', 'match', 'después', 'match2', ...]

      if (parts.length <= 1) return; // sin coincidencias reales

      const frag = document.createDocumentFragment();
      parts.forEach(function (part) {
        if (regex.test(part)) {
          const mark = document.createElement('mark');
          mark.className = 'search-hit';
          mark.textContent = part;
          frag.appendChild(mark);
          marks.push(mark);
        } else {
          frag.appendChild(document.createTextNode(part));
        }
        regex.lastIndex = 0;
      });

      parent.replaceChild(frag, textNode);
    });

    /* ── Mostrar controles y activar primer resultado ── */
    if (marks.length > 0) {
      controls.style.display = 'flex';
      goToMatch(0);
    } else {
      controls.style.display = 'flex';
      counter.textContent = '0 resultados';
      counter.style.color = '#e74c3c';
    }
  }

  /* ── 3. IR A UN RESULTADO ESPECÍFICO ── */
  function goToMatch(idx) {
    if (marks.length === 0) return;

    // Quitamos .current del anterior
    if (currentIdx >= 0 && marks[currentIdx]) {
      marks[currentIdx].classList.remove('current');
    }
    // Quitamos highlight de artículo anterior
    document.querySelectorAll('.search-article-active').forEach(function (el) {
      el.classList.remove('search-article-active');
    });

    // Índice circular
    currentIdx = (idx + marks.length) % marks.length;
    const currentMark = marks[currentIdx];
    currentMark.classList.add('current');

    // Actualizamos el contador
    counter.textContent = (currentIdx + 1) + ' / ' + marks.length;
    counter.style.color = 'var(--gold)';

    // Scroll suave al resultado activo con offset para la barra fija
    const top = currentMark.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top: top, behavior: 'smooth' });

    // Resaltamos el <article> más cercano que contiene el resultado
    const parentArticle = currentMark.closest('article.article-card');
    if (parentArticle) {
      parentArticle.classList.add('search-article-active');
    }
  }

  /* ── 4. EVENTOS ── */

  // Botón "Buscar"
  btnBuscar.addEventListener('click', runSearch);

  // Enter en el input también busca
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      runSearch();
    }
  });

  // Limpiar búsqueda si el input queda vacío
  input.addEventListener('input', function () {
    if (input.value.trim() === '') clearMarks();
  });

  // Navegación entre resultados
  btnPrevM.addEventListener('click', function () { goToMatch(currentIdx - 1); });
  btnNextM.addEventListener('click', function () { goToMatch(currentIdx + 1); });

  // Limpiar todo
  btnClear.addEventListener('click', function () {
    input.value = '';
    clearMarks();
    input.focus();
  });

  // Teclas de navegación: F3 / Ctrl+G = siguiente; Shift+F3 = anterior
  document.addEventListener('keydown', function (e) {
    if (marks.length === 0) return;
    if (e.key === 'F3' || (e.ctrlKey && e.key === 'g')) {
      e.preventDefault();
      goToMatch(e.shiftKey ? currentIdx - 1 : currentIdx + 1);
    }
  });
})();