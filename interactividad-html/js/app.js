/*1. Leer bloque de datos desconocido textContent 
extrae el string JSON del <script type="application/json"> */

const raw = document.getElementById('config-data').textContent;
const cfg = JSON.parse(raw);
document.getElementById('json-output').innerHTML =
  `<span style="color:var(--accent3)">Datos leídos del bloque:</span><br>
     version: <strong style="color:var(--accent)">${cfg.version}</strong> · 
     debug: <strong style="color:var(--accent)">${cfg.debug}</strong> · 
     maxItems: <strong style="color:var(--accent)">${cfg.maxItems}</strong>`;


/* 2. Eventos en HTML */
const zone = document.getElementById('event-zone');
const log = document.getElementById('event-log');
let logLines = [];

function addLog(type, detail) {
  const time = new Date().toLocaleTimeString('es', { hour12: false });
  logLines.unshift(`<div class="ev-line"><span>[${time}]</span> ${type} — ${detail}</div>`);
  if (logLines.length > 20) logLines.pop();
  log.innerHTML = logLines.join('');
}

// addEventListener escucha distintos tipos de evento
zone.addEventListener('click', (e) => addLog('click', `(${e.offsetX}, ${e.offsetY})`));
zone.addEventListener('mouseenter', () => addLog('mouseenter', 'puntero entró al área'));
zone.addEventListener('mouseleave', () => addLog('mouseleave', 'puntero salió del área'));
zone.addEventListener('keydown', (e) => addLog('keydown', `tecla: "${e.key}"`));

// Para capturar keydown el elemento necesita ser enfocable
zone.setAttribute('tabindex', '0');


/* 3. contenteditable → contador de caracteres  */
const editable = document.getElementById('editable-demo');
const charCount = document.getElementById('char-count');
charCount.textContent = editable.textContent.trim().length;

// El evento 'input' se dispara cada vez que el contenido cambia
editable.addEventListener('input', () => {
  charCount.textContent = editable.textContent.trim().length;
});


/*4. <template> — clonar tarjetas */
const datos = [
  { title: 'Módulos ESM', body: 'import / export entre archivos' },
  { title: '<details>', body: 'desplegable nativo sin JS' },
  { title: '<dialog>', body: 'modal con backdrop nativo' },
  { title: 'Popover API', body: 'capas flotantes declarativas' },
  { title: 'contenteditable', body: 'edición inline de HTML' },
  { title: '<template>', body: 'fragmentos de DOM inertes' },
];

const tpl = document.getElementById('tpl-card');
const container = document.getElementById('tpl-container');
let idx = 0;

document.getElementById('btn-add-card').addEventListener('click', () => {
  if (idx >= datos.length) { idx = 0; container.innerHTML = ''; }

  // content.cloneNode(true) duplica el fragmento completo del template
  const clone = tpl.content.cloneNode(true);
  clone.querySelector('.tpl-title').textContent = datos[idx].title;
  clone.querySelector('.tpl-body').textContent = datos[idx].body;
  container.appendChild(clone);
  idx++;
});


/*Lógica Navegación */

(function () {

  /* 1. Scroll suave al hacer clic en un ítem del navbar  */
  // querySelectorAll devuelve todos los elementos que coinciden con el selector
  const navItems = document.querySelectorAll('.nav-item[data-target]');

    navItems.forEach(function (btn) {
      btn.addEventListener('click', function () {
        // data-target contiene el id del elemento destino
        var targetId = btn.getAttribute('data-target');
        var target = document.getElementById(targetId);
        if (!target) return;

        // scrollIntoView con behavior:'smooth' anima el desplazamiento
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
  });


    /* 2. Scroll Spy con IntersectionObserver 
      IntersectionObserver observa elementos y dispara un callback
      cada vez que entran o salen del viewport (la pantalla visible).
      Es más eficiente que calcular posiciones en el evento scroll.
    */
    var activeId = null; // id de la sección actualmente visible

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        // entry.isIntersecting = true cuando el elemento es visible
        if (entry.isIntersecting) {
          activeId = entry.target.id;
          updateActiveNav(activeId);
        }
      });
  }, {
      // rootMargin: ajusta el área de detección (negativo = margen interior)
      rootMargin: '-56px 0px -60% 0px',
    threshold: 0   // basta con que 1px sea visible
  });

    // Observar todas las secciones con id que el navbar referencia
    var sections = document.querySelectorAll(
    '#sec-script, #sec-defer, #sec-esm, #sec-data, ' +
    '#sec-details, #sec-dialog, #sec-popover, #sec-events, ' +
    '#sec-editable, #sec-invokers, #sec-hidden, #sec-template'
    );
    sections.forEach(function (sec) {observer.observe(sec); });

    function updateActiveNav(id) {
      // Quitar clase active de todos los items
      navItems.forEach(function (btn) { btn.classList.remove('active'); });
    // Añadir active al ítem que apunta a la sección visible
    var active = document.querySelector('.nav-item[data-target="' + id + '"]');
    if (active) {
      active.classList.add('active');
    // scrollIntoView horizontal para que el ítem activo sea visible en móvil
    active.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }


    /* ── 3. Progreso de scroll 
      El evento 'scroll' se dispara cada vez que el usuario hace scroll.
      Calculamos el porcentaje de avance dividiendo scrollY entre
      el alto total del documento menos el alto de la ventana.*/

    var progressBar = document.getElementById('scroll-progress');
    var navbar      = document.getElementById('navbar');
    var backTop     = document.getElementById('back-top');

    window.addEventListener('scroll', function () {
    var scrollY      = window.scrollY;
    var docHeight    = document.documentElement.scrollHeight - window.innerHeight;
    var progress     = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;

    // Actualizar ancho de la barra de progreso
    progressBar.style.width = progress.toFixed(2) + '%';

    // Sombra en el navbar al hacer scroll
    navbar.classList.toggle('scrolled', scrollY > 20);

    // Mostrar botón "volver arriba" después de 300px
    backTop.classList.toggle('visible', scrollY > 300);
  });


    /*4. Botón volver arriba  */
    backTop.addEventListener('click', function () {
      // scrollTo con behavior:'smooth' desplaza suavemente al inicio
      window.scrollTo({ top: 0, behavior: 'smooth' });
  });

})();