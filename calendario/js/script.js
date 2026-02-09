/*VARIABLES DE ESTADO GLOBAL
    @currentView: Determina qué vista se está mostrando (día, semana, mes, año o agenda).
    @viewDate: Objeto Date que representa la fecha central de la navegación actual.
    @events: Array que contiene los objetos de evento, cargados desde LocalStorage o con datos iniciales.
*/
let currentView = 'month';
let viewDate = new Date();
let events = JSON.parse(localStorage.getItem('cal_events_v3')) || [
    { id: 1, title: 'Reunión de Diseño', date: '2026-02-08', desc: 'Revisión de UI móvil' }
];

/*FUNCIÓN PRINCIPAL DE RENDERIZADO
  Se encarga de limpiar el contenedor y decidir qué función de dibujo llamar
  basándose en el estado de currentView. También actualiza las etiquetas de fecha.
 */
function render() {
    const container = document.getElementById('calendarContent');
    const label = document.getElementById('currentDateLabel');
    container.innerHTML = '';

    // Actualiza el estado visual de los botones del selector de vista
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.id === `btn-${currentView}`);
    });

    const options = { month: 'long', year: 'numeric' };

    // Lógica de ramificación por tipo de vista
    switch (currentView) {
        case 'month':
            label.innerText = new Intl.DateTimeFormat('es-ES', options).format(viewDate);
            renderMonth(container);
            break;
         case 'year':
            label.innerText = viewDate.getFullYear();
            renderYear(container);
            break; 
        case 'day':
            label.innerText = new Intl.DateTimeFormat('es-ES', { day: 'numeric', ...options }).format(viewDate);
            renderDay(container);
            break;
        case 'week':
            label.innerText = "Vista Semanal";
            renderWeek(container);
            break;
        case 'agenda':
            label.innerText = "Mi Agenda";
            renderAgenda(container);
            break;   
    }
}

/* RENDERIZADO DE VISTA MENSUAL
   Genera una cuadrícula de 7 columnas, calcula los días de desfase del mes anterior
   y dibuja cada celda del día con sus respectivos eventos. */
function renderMonth(container) {
    const scrollDiv = document.createElement('div');
    scrollDiv.className = 'month-scroll-container';
    const grid = document.createElement('div');
    grid.className = 'month-grid';

    // Dibujar cabeceras de días de la semana
    ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].forEach(d => {
        const h = document.createElement('div');
        h.className = 'day-header-label';
        h.innerText = d;
        grid.appendChild(h);
    });

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    // Calcular espacios vacíos al inicio (ajustando para que lunes sea 0)
    const offset = firstDay === 0 ? 6 : firstDay - 1;

    // Rellenar días vacíos
    for (let i = 0; i < offset; i++) grid.appendChild(document.createElement('div')).className = 'day-cell';

    // Dibujar días del mes
    for (let d = 1; d <= lastDate; d++) {
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        const today = new Date();
        const isToday = (d === today.getDate() && month === today.getMonth() && year === today.getFullYear());

         // Marca visual para el día actual
        cell.innerHTML = isToday ?
            `<div style="background:var(--google-blue); color:#fff; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.75rem">${d}</div>` :
            `<div style="font-size:0.8rem">${d}</div>`;

        // Filtrar y mostrar eventos para este día específico
        const dateStr = formatDate(new Date(year, month, d));
        events.filter(e => e.date === dateStr).forEach(e => {
            const chip = document.createElement('div');
            chip.className = 'event-chip';
            chip.innerText = e.title;
            cell.appendChild(chip);
        });

        // Permitir crear evento al hacer clic en la celda
        cell.onclick = () => openEventModal(dateStr);
        grid.appendChild(cell);
    }
    scrollDiv.appendChild(grid);
    container.appendChild(scrollDiv);
}

/*RENDERIZADO DE VISTA ANUAL
  Crea 12 mini-calendarios. Al hacer clic en un mes, navega a la vista mensual de dicho mes.
 */
function renderYear(container) {
    const grid = document.createElement('div');
    grid.className = 'year-grid';
    const year = viewDate.getFullYear();
    
     for (let m = 0; m < 12; m++) {
        const monthDiv = document.createElement('div');
        monthDiv.className = 'mini-month';
        const mName = new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(new Date(year, m, 1));
        monthDiv.innerHTML = `<div style="font-weight:bold; margin-bottom:5px; text-transform:uppercase; font-size:0.8rem">${mName}</div>`;
        
        const daysDiv = document.createElement('div');
        daysDiv.style = "display:grid; grid-template-columns: repeat(7, 1fr); gap:2px; font-size:0.6rem; text-align:center";
        ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach(d => daysDiv.innerHTML += `<b>${d}</b>`);

        const firstDay = new Date(year, m, 1).getDay();
        const lastDate = new Date(year, m + 1, 0).getDate();
        const offset = firstDay === 0 ? 6 : firstDay - 1;

        for (let i = 0; i < offset; i++) daysDiv.innerHTML += `<span></span>`;
        for (let d = 1; d <= lastDate; d++) {
            const dateStr = formatDate(new Date(year, m, d));
            const hasEv = events.some(e => e.date === dateStr);
            // Resaltar días que contienen eventos
            daysDiv.innerHTML += `<span style="${hasEv ? 'color:var(--google-blue); font-weight:bold;' : ''}">${d}</span>`;
        }
        monthDiv.appendChild(daysDiv);

        // Navegación contextual al hacer clic en un mini-mes
        monthDiv.onclick = () => { viewDate.setMonth(m); setView('month'); };
        grid.appendChild(monthDiv);
     }
     container.appendChild(grid);
}

/*RENDERIZADO DE VISTA DIARIA
 Muestra una línea de tiempo vertical de 0 a 23 horas para la fecha seleccionada.
 */
function renderDay(container) {
    
    const wrapper = document.createElement('div');
    wrapper.className = 'view-scroll-wrapper';
    
    const grid = document.createElement('div');
    grid.className = 'time-grid-wrapper';
    grid.style = "display: grid; grid-template-columns: 60px 1fr;";

     
    const dateStr = formatDate(viewDate);
    for (let i = 0; i < 24; i++) {
        grid.innerHTML += `<div style="font-size:0.7rem; color:var(--text-muted); padding:15px 5px; text-align:right">${i}:00</div>`;
        const row = document.createElement('div');
        row.style = "border-bottom: 1px solid #f0f0f0; height:50px; position:relative";

         // Muestra eventos del día (simplificado en la fila de las 10:00 para demostración)
        events.filter(e => e.date === dateStr).forEach(e => {
            if (i === 10) row.innerHTML += `<div class="event-chip" style="position:absolute; width:90%">${e.title}</div>`;
        });
        grid.appendChild(row);
    }
    wrapper.appendChild(grid);
    container.appendChild(wrapper);
}

/*RENDERIZADO DE VISTA SEMANAL
  Genera una tabla de 7 columnas (una por día) y 24 filas (una por hora).
 */
function renderWeek(container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'view-scroll-wrapper';
    const table = document.createElement('div');
    table.style = "min-width:800px; display:grid; grid-template-columns: 60px repeat(7, 1fr); border:1px solid #eee";
    
    // Esquina superior izquierda vacía
    table.innerHTML += `<div></div>`; 
    ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].forEach(d => {
        table.innerHTML += `<div style="text-align:center; padding:10px; font-weight:bold; font-size:0.8rem; border-bottom:1px solid #eee">${d}</div>`;
    });
     for (let h = 0; h < 24; h++) {
        table.innerHTML += `<div style="font-size:0.65rem; color:#999; text-align:right; padding:5px">${h}:00</div>`;
        for (let d = 0; d < 7; d++) {
            table.innerHTML += `<div style="border-left:1px solid #f0f0f0; border-bottom:1px solid #f0f0f0; height:40px"></div>`;
        }
    }
    wrapper.appendChild(table);
    container.appendChild(wrapper);
}

/*RENDERIZADO DE VISTA DE AGENDA
 Muestra una lista vertical de todos los eventos ordenados por fecha con opción de eliminar.
 */
function renderAgenda(container) {
    if (events.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:50px; color:#999">No hay eventos próximos.</div>`;
        return;
    }
    // Ordena eventos por fecha antes de mostrar
    events.sort((a, b) => a.date.localeCompare(b.date)).forEach(e => {
        const item = document.createElement('div');
        item.style = "padding:15px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center";
        item.innerHTML = `
                    <div>
                        <div style="color:var(--google-blue); font-weight:bold; font-size:0.9rem">${e.date}</div>
                        <div style="font-weight:500">${e.title}</div>
                    </div>
                    <button onclick="deleteEvent(${e.id})" style="border:none; background:none; cursor:pointer; font-size:1.1rem">🗑️</button>
                `;
        container.appendChild(item);
    });
}

/* LÓGICA DE MODAL Y EVENTOS*/

// Abre el modal de creación y limpia o pre-establece valores
function openEventModal(date) {
    const d = date || formatDate(new Date());
    document.getElementById('eventTitle').value = '';
    document.getElementById('inputStartDate').value = d;
    document.getElementById('inputEndDate').value = d;
    document.getElementById('eventDescription').innerText = '';
    document.getElementById('eventModal').style.display = 'block';
    document.body.style.overflow = 'hidden'; // Evita scroll de fondo
}

// Cierra el modal de creación
function closeEventModal() {
    document.getElementById('eventModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Guarda el nuevo evento en el estado y persiste en LocalStorage
function saveEvent() {
    const title = document.getElementById('eventTitle').value || '(Sin título)';
    const date = document.getElementById('inputStartDate').value;
    const desc = document.getElementById('eventDescription').innerText;

    events.push({ id: Date.now(), title, date, desc });
    localStorage.setItem('cal_events_v3', JSON.stringify(events));

    closeEventModal();
    render();
}

// Elimina un evento por ID y actualiza la vista
function deleteEvent(id) {
     events = events.filter(e => e.id !== id);
    localStorage.setItem('cal_events_v3', JSON.stringify(events));
    render();
}

/*UTILIDADES DE NAVEGACIÓN Y FORMATO
 */

// Convierte un objeto Date a string YYYY-MM-DD para compatibilidad con inputs y filtros
function formatDate(d) {
    return d.toISOString().split('T')[0];
}

// Cambia el tipo de vista activa y re-renderiza
function setView(v) {
    currentView = v;
    render();
}

// Función de navegación temporal (adelante/atrás) ajustada según la vista activa
function moveDate(step) {
    if (currentView === 'month') viewDate.setMonth(viewDate.getMonth() + step);
    else if (currentView === 'year') viewDate.setFullYear(viewDate.getFullYear() + step);
    else if (currentView === 'day') viewDate.setDate(viewDate.getDate() + step);
     else if (currentView === 'week') viewDate.setDate(viewDate.getDate() + (step * 7));
    render();
}

// Restablece la fecha de vista a la fecha actual del sistema
function goToday() {
   viewDate = new Date();
    render(); 
}

// Ejecución inicial al cargar la ventana
window.onload = render;