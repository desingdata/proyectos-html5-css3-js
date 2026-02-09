/* CAMBIO DE COLOR AL HACER SCROLL */
const header = document.getElementById('header');

// Agrega o quita la clase según la posición del scroll
window.addEventListener('scroll', () => {

    header.classList.toggle('scrolled', window.scrollY > 50);
});

/* MENÚ RESPONSIVO  */

// Botón hamburguesa
const menuToggle = document.getElementById('menuToggle');

// Lista de links
const navLinks = document.getElementById('navLinks');

menuToggle.addEventListener('click', () => {
    // Muestra u oculta el menú
    navLinks.classList.toggle('active');
});

/* THEME TOGGLE*/
// Icono sol/luna
const themeToggle = document.getElementById('themeToggle');

// Body del documento
const body = document.body;
themeToggle.addEventListener('click', () => {
    // Cambia entre modo claro y oscuro
    body.classList.toggle('dark');

    // Cambia el icono según el tema
    themeToggle.textContent = body.classList.contains('dark') ? '☀️' : '🌙';
});

/* CERRAR MENÚ AL HACER CLICK AFUERA */
document.addEventListener('click', (e) => {
    // Verifica si el click fue dentro del navbar
    const isClickInsideNavbar = header.contains(e.target) || menuToggle.contains(e.target);

    // Si fue fuera, cierra el menú
    if (!isClickInsideNavbar && navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
    }
});

/* LINK ACTIVO */
 // Todos los links
const navItems = document.querySelectorAll('.nav-links a');

navItems.forEach(link => {
    link.addEventListener('click', () => {
        // Quita el estado activo de todos
        navItems.forEach(item => item.classList.remove('active'));

        // Marca el link seleccionado
        link.classList.add('active');

        // Cierra el menú en móvil
        navLinks.classList.remove('active');
    });
});

/* BUSCADOR LOCAL + INTERNET*/

// Formulario
const searchForm = document.getElementById('searchForm');

// Input de búsqueda
const searchInput = document.getElementById('searchInput');

// Páginas internas simuladas
const localPages = [
    { name: 'Inicio', url: '#inicio' },
    { name: 'Servicios', url: '#servicios' },
    { name: 'Proyectos', url: '#proyectos' },
    { name: 'Contacto', url: '#contacto' }
];

searchForm.addEventListener('submit', (e) => {
	// Evita recargar la página
    e.preventDefault(); 

    // Texto buscado
    const query = searchInput.value.trim().toLowerCase(); 
	// Si está vacío, no hace nada
    if (!query) return; 

    // Busca coincidencia local
    const localResult = localPages.find(page => page.name.toLowerCase().includes(query));

    if (localResult) {
        // Redirige a sección interna
        window.location.href = localResult.url;
    }else{
         // Abre búsqueda en Google
        window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
    }

    // Limpia el input
    searchInput.value = '';
});