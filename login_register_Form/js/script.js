// CONFIGURACIÓN DE REGEX
        const patterns = {
            name: /^[A-Za-zñÑáéíóúÁÉÍÓÚ\s]{3,50}$/,
            email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
        };

        // ALTERNAR FORMULARIOS
        function toggleForms() {
            const login = document.getElementById('loginForm');
            const register = document.getElementById('registerForm');
            
            // Animación de salida rápida
            login.style.opacity = "0";
            register.style.opacity = "0";

            setTimeout(() => {
                login.classList.toggle('hidden');
                register.classList.toggle('hidden');
                
                // Animación de entrada
                const active = register.classList.contains('hidden') ? login : register;
                active.style.opacity = "1";
                resetValidationStyles();
            }, 300);
        }

        function resetValidationStyles() {
            document.querySelectorAll('.input-group').forEach(group => {
                group.classList.remove('valid', 'invalid');
            });
        }

        function showToast(message) {
            const msgBox = document.getElementById('msgBox');
            msgBox.innerText = message;
            msgBox.classList.add('show');
            setTimeout(() => msgBox.classList.remove('show'), 3000);
        }

        // VALIDACIÓN
        const validateField = (input, regex, groupId) => {
            const group = document.getElementById(groupId);
            if (regex.test(input.value)) {
                group.classList.remove('invalid');
                group.classList.add('valid');
                return true;
            } else {
                group.classList.remove('valid');
                group.classList.add('invalid');
                return false;
            }
        };

        // Eventos Registro
        const regName = document.getElementById('reg-name');
        const regEmail = document.getElementById('reg-email');
        const regPass = document.getElementById('reg-pass');

        regName.addEventListener('input', () => validateField(regName, patterns.name, 'group-reg-name'));
        regEmail.addEventListener('input', () => validateField(regEmail, patterns.email, 'group-reg-email'));
        regPass.addEventListener('input', () => validateField(regPass, patterns.password, 'group-reg-pass'));

        // Eventos Login
        const logEmail = document.getElementById('login-email');
        logEmail.addEventListener('input', () => validateField(logEmail, patterns.email, 'group-login-email'));

        // SUBMIT REGISTRO
        document.getElementById('form-register').addEventListener('submit', (e) => {
            e.preventDefault();
            const valid = validateField(regName, patterns.name, 'group-reg-name') &&
                          validateField(regEmail, patterns.email, 'group-reg-email') &&
                          validateField(regPass, patterns.password, 'group-reg-pass');

            if (valid) simulateSubmit('¡Cuenta registrada exitosamente!');
            else showToast('Corrige los errores en el formulario.');
        });

        // SUBMIT LOGIN
        document.getElementById('form-login').addEventListener('submit', (e) => {
            e.preventDefault();
            const valid = validateField(logEmail, patterns.email, 'group-login-email') && 
                          document.getElementById('login-pass').value.length > 0;

            if (valid) simulateSubmit('Acceso concedido. Cargando...');
            else showToast('Verifica tus datos de acceso.');
        });

        function simulateSubmit(msg) {
            const btn = document.querySelector('.auth-form:not(.hidden) button');
            const original = btn.innerText;
            btn.disabled = true;
            btn.innerText = 'Cargando...';

            setTimeout(() => {
                showToast(msg);
                btn.innerText = original;
                btn.disabled = false;
            }, 1500);
        }