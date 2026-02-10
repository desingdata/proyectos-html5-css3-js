// --- LÓGICA DEL RELOJ ---
function updateClock() {
    const now = new Date();
    const seconds = now.getSeconds();
    const minutes = now.getMinutes();
    const hours = now.getHours();

    // Ángulos analógicos
    const secDegrees = (seconds / 60) * 360;
    const minDegrees = ((minutes / 60) * 360) + ((seconds / 60) * 6);
    const hourDegrees = ((hours % 12) / 12) * 360 + ((minutes / 60) * 30);

    document.getElementById('sec').style.transform = `translateX(-50%) rotate(${secDegrees}deg)`;
    document.getElementById('min').style.transform = `translateX(-50%) rotate(${minDegrees}deg)`;
    document.getElementById('hour').style.transform = `translateX(-50%) rotate(${hourDegrees}deg)`;

    // Texto digital
    const h = String(hours).padStart(2, '0');
    const m = String(minutes).padStart(2, '0');
    const s = String(seconds).padStart(2, '0');
    document.getElementById('digitalTime').textContent = `${h}:${m}:${s}`;

    // Fecha
    const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    document.getElementById('dateText').textContent = now.toLocaleDateString('es-ES', options);
}

setInterval(updateClock, 1000);
updateClock();

// --- LÓGICA DEL CLIMA ---
const API_KEY = 'bd5e378503939ddaee76f12ad7a97608';

async function fetchWeather(lat, lon) {
    try {
       const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=es`); 
       const data = await response.json();

       if (data.cod === 200) {
            document.getElementById('city').textContent = data.name;
            document.getElementById('temp').textContent = `${Math.round(data.main.temp)}°C`;
            document.getElementById('weatherDesc').textContent = data.weather[0].description;
            document.getElementById('status').textContent = 'Actualizado recientemente';
       }
    }catch (err) {
        document.getElementById('status').textContent = 'Error al conectar con el clima';
    }
}

function initLocation() {
    if (navigator.geolocation) {
         navigator.geolocation.getCurrentPosition(
            (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
            (err) => {
                document.getElementById('city').textContent = "Ubicación OFF";
                document.getElementById('status').textContent = "Activa el GPS para ver el clima";
            }
         );
    }else {
         document.getElementById('status').textContent = "Navegador no compatible";
    }
}

// Iniciar al cargar y actualizar clima cada 1 minuto
initLocation();
setInterval(initLocation, 100000);