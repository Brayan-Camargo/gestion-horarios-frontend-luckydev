// js/login.js

document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    // Al intentar loguear, limpiamos cualquier rastro de sesiones fallidas previas
    localStorage.clear();

    const userVal = document.getElementById('username').value;
    const passVal = document.getElementById('password').value;
    const btn = document.querySelector('button[type="submit"]');

    // Feedback visual para evitar doble clic
    btn.disabled = true;
    btn.textContent = "Verificando...";

    try {
    
        const res = await Auth.login(userVal, passVal);

        console.log("Respuesta procesada en login.js:", res);

        if (res.success) {
            // Redirección inteligente basada en los roles de LuckyDev
            if (res.rol === Auth.LEVELS.SUPER_ADMIN) {
                window.location.href = "admin.html";
            } else if (res.rol === Auth.LEVELS.EMPLEADO) {
                window.location.href = "checador.html";
            } else {
                window.location.href = "index.html";
            }
        } else {
            // Si el backend responde 403 o credenciales inválidas
            Swal.fire({
                icon: 'error',
                title: 'Acceso Denegado',
                text: res.message || "Usuario o contraseña incorrectos",
                background: '#1a1d23',
                color: '#ffffff',
                confirmButtonColor: '#4f46e5'
            });
            btn.disabled = false;
            btn.textContent = "Entrar al Sistema";
        }
    } catch (error) {
        console.error("Error crítico en la comunicación:", error);
        Swal.fire({
            icon: 'warning',
            title: 'Error de Conexión',
            text: 'No se pudo conectar con el servidor de LuckyDev. Verifica que el backend esté corriendo.',
            background: '#1a1d23',
            color: '#ffffff'
        });
        btn.disabled = false;
        btn.textContent = "Entrar al Sistema";
    }
});