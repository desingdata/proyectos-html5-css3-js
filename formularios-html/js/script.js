// ─────────────────────────────────────────────
// Referencias a elementos del DOM
// ─────────────────────────────────────────────
const navbar = document.getElementById('navbar');
const readBar = document.getElementById('read-progress');
const backTop = document.getElementById('back-top');
const hamburger = document.getElementById('hamburger');
const drawer = document.getElementById('nav-drawer');

// Todos los links del navbar (escritorio + drawer)
const allNavLinks = document.querySelectorAll('.nav-links a, #nav-drawer a');

// Las secciones que se van a observar
const sections = document.querySelectorAll('section.category');

// ─────────────────────────────────────────────
// 1. Sombra del navbar al hacer scroll
// ─────────────────────────────────────────────
function onScroll() {
    // Sombra cuando el usuario baja un poco
    navbar.classList.toggle('scrolled', window.scrollY > 20);

    // Barra de progreso de lectura
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docH > 0 ? (window.scrollY / docH) * 100 : 0;
    readBar.style.width = pct + '%';

    // Botón volver arriba: visible después de 300px
    backTop.classList.toggle('visible', window.scrollY > 300);
}

window.addEventListener('scroll', onScroll, { passive: true });

// ─────────────────────────────────────────────
// 2. Scroll suave al hacer clic en los links
//    (funciona tanto en escritorio como en drawer)
// ─────────────────────────────────────────────
allNavLinks.forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();

        const targetId = link.getAttribute('href'); // ej. "#sec-etiquetas"
        const target = document.querySelector(targetId);

        if (target) {
            // Calculamos el desplazamiento restando la altura del navbar fijo
            const offset = 52 + 16; // altura navbar + margen
            const targetTop = target.getBoundingClientRect().top + window.scrollY - offset;

            window.scrollTo({ top: targetTop, behavior: 'smooth' });
        }

        // Cierra el drawer en móvil después de navegar
        drawer.classList.remove('open');
        hamburger.classList.remove('open');
    });
});

// ─────────────────────────────────────────────
// 3. IntersectionObserver: resalta el link activo
//    según la sección visible en pantalla
// ─────────────────────────────────────────────
const observerOptions = {
    root: null,
    // El elemento se considera "visible" cuando ocupa
    // al menos el 25% del área central de la ventana
    rootMargin: '-52px 0px -60% 0px',
    threshold: 0
};

const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const id = entry.target.id; // ej. "sec-etiquetas"

            // Quita la clase active de todos los links
            allNavLinks.forEach(l => l.classList.remove('active'));

            // Agrega active solo a los links que apuntan a la sección visible
            allNavLinks.forEach(l => {
                if (l.getAttribute('data-section') === id) {
                    l.classList.add('active');
                }
            });
        }
    });
}, observerOptions);

// Observamos cada sección
sections.forEach(sec => sectionObserver.observe(sec));

// ─────────────────────────────────────────────
// 4. Botón volver arriba
// ─────────────────────────────────────────────
backTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ─────────────────────────────────────────────
// 5. Hamburger: abre/cierra el drawer en móvil
// ─────────────────────────────────────────────
hamburger.addEventListener('click', () => {
    const isOpen = drawer.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
});

// Cierra el drawer al hacer clic fuera de él
document.addEventListener('click', e => {
    if (!navbar.contains(e.target) && !drawer.contains(e.target)) {
        drawer.classList.remove('open');
        hamburger.classList.remove('open');
    }
});