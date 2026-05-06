const Auth = {
    // 1. Mapeo de roles exacto al Enum de Java
    LEVELS: {
        SUPER_ADMIN:   'SUPER_ADMIN',   
        ADMIN_EMPRESA: 'ADMIN_EMPRESA', 
        GERENTE:       'GERENTE', 
        SUB_GERENTE:   'SUB_GERENTE',
        ENCARGADO:     'ENCARGADO',      
        EMPLEADO:      'EMPLEADO'       
    },

    // 2. Obtiene los datos del usuario logueado
    getUser: () => {
        const user = localStorage.getItem("lucky_user");
        return user ? JSON.parse(user) : null;
    },

    // 3. Un solo logout limpio
    logout: () => {
        localStorage.removeItem("lucky_user");
        localStorage.removeItem("lucky_token");
        window.location.href = 'login.html';
    },

    // 4. LOGIN — conecta con Java
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
                localStorage.setItem("lucky_token", data.jwToken);

                // ✅ CORRECCIÓN: Quitamos el window.location.href de aquí.
                // Tu archivo 'login.js' ya se encarga de redirigir correctamente.
                return { success: true, rol: data.rol };

            } else {
                // El backend devuelve un texto en caso de 401, no un JSON
                const errText = await response.text();
                return { success: false, message: errText || 'Credenciales inválidas' };
            }

        } catch (error) {
            console.error("Error de conexión:", error);
            return { success: false, message: 'No se pudo conectar con el servidor' };
        }
    },

    // 5. Guardián de rutas — protege tus páginas HTML
    checkGuard: (rolesPermitidos) => {
        const user = Auth.getUser();

        console.log("Rol del usuario en LocalStorage:", user ? user.rol : "No hay usuario");
        console.log("Roles permitidos en esta página:", rolesPermitidos);

        if (!user) {
            window.location.href = "login.html";
            return false;
        }

        // SUPER_ADMIN tiene acceso a todo
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

    // 6. Fetch autenticado — inyecta el token automáticamente
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

        // Si Java responde 401 = token modificado o expirado → cerrar sesión por seguridad
        if (res.status === 401) {
            Auth.logout();
            throw new Error('Sesión expirada');
        }

        return res;
    }
};