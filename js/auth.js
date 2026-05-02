checkGuard: (rolesPermitidos) => {
    const user = Auth.getUser(); 
    
    // 👇 AÑADE ESTAS DOS LÍNEAS 👇
    console.log("Rol del usuario en LocalStorage:", user ? user.rol : "No hay usuario");
    console.log("Rol esperado por el sistema:", Auth.LEVELS.SUPER_ADMIN);

    if (!user) {
        window.location.href = "login.html";
        return false;
    }

    if (user.rol === Auth.LEVELS.SUPER_ADMIN) return true;
}

const Auth = {
    LEVELS: {
        SUPER_ADMIN:   'SUPER_ADMIN',   
        ADMIN_EMPRESA: 'ADMIN_EMPRESA', 
        GERENTE:       'GERENTE',       
        EMPLEADO:      'EMPLEADO'       
    },

    // Obtiene los datos del usuario logueado
    getUser: () => {
        const user = localStorage.getItem("lucky_user");
        return user ? JSON.parse(user) : null;
    },

    // ✅ FIX 1: Solo UN logout (había dos definidos, el segundo pisaba al primero)
    logout: () => {
        localStorage.removeItem("lucky_user");
        localStorage.removeItem("lucky_token");
        window.location.href = 'login.html';
    },

    // LOGIN — conecta con Java y guarda la sesión
    login: async (username, password) => {
        try {
            const response = await fetch('http://localhost:8080/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const data = await response.json(); // Java devuelve { jwToken, rol }

                const userData = {
                    nombre: username,
                    rol:    data.rol,
                    token:  data.jwToken
                };

                localStorage.setItem("lucky_user",  JSON.stringify(userData));
                // ✅ FIX 2: Guardar el token por separado para que apiFetch lo lea fácil
                localStorage.setItem("lucky_token", data.jwToken);

                // ✅ FIX 3: Redirigir según el rol que devuelve Java
                if (data.rol === Auth.LEVELS.SUPER_ADMIN) {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'index.html';
                }

                return { success: true, rol: data.rol };

            } else {
                const err = await response.json().catch(() => ({}));
                return { success: false, message: err.message || 'Credenciales inválidas' };
            }

        } catch (error) {
            console.error("Error de conexión:", error);
            return { success: false, message: 'No se pudo conectar con el servidor' };
        }
    },

    // Guardián de rutas — llámalo al inicio de cada página protegida
    checkGuard: (rolesPermitidos) => {
        const user = Auth.getUser(); // ✅ FIX 4: usar getUser() en vez de duplicar el parse

        if (!user) {
            window.location.href = "login.html";
            return false;
        }

        // SUPER_ADMIN pasa siempre
        if (user.rol === Auth.LEVELS.SUPER_ADMIN) return true;

        if (!rolesPermitidos.includes(user.rol)) {
            alert("Acceso denegado: No tienes los permisos necesarios.");
            if (user.rol === Auth.LEVELS.EMPLEADO) {
                window.location.href = "checador.html";
            } else {
                window.location.href = "index.html";
            }
            return false;
        }

        return true;
    },

    // ✅ Fetch autenticado — agrega el token JWT automáticamente en cada petición
    // Reemplaza fetch() normal en app.js con Auth.apiFetch()
    apiFetch: async (endpoint, opciones = {}) => {
        const token = localStorage.getItem("lucky_token");

        const res = await fetch(`http://localhost:8080${endpoint}`, {
            ...opciones,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...(opciones.headers || {})
            }
        });

        // Si Java responde 401 = token expirado → cerrar sesión automáticamente
        if (res.status === 401) {
            Auth.logout();
            throw new Error('Sesión expirada');
        }

        return res;
    }
};