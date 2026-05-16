const Auth = {
    // 1. Mapeo de roles exacto al Enum de Java
    LEVELS: {
        SUPER_ADMIN: 'SUPER_ADMIN',
        ADMIN_EMPRESA: 'ADMIN_EMPRESA',
        GERENTE: 'GERENTE',
        SUB_GERENTE: 'SUB_GERENTE',
        ENCARGADO: 'ENCARGADO',
        EMPLEADO: 'EMPLEADO'
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
                const data = await response.json();

                const userData = {
                    nombre: data.nombre || username,
                    rol: data.rol,
                    token: data.jwToken,
                    empleadoId: data.empleadoId,
                    departamentoId: data.departamentoId
                };

                localStorage.setItem("lucky_user", JSON.stringify(userData));
                localStorage.setItem("lucky_token", data.jwToken);

                // 🚀 AQUÍ VA LA REDIRECCIÓN INTELIGENTE
                if (data.rol === 'SUPER_ADMIN' || data.rol === 'ADMIN_EMPRESA') {
                    window.location.href = 'admin.html'; // Los jefes van al panel
                } else {
                    window.location.href = 'index.html'; // Operativos van al horario
                }

                return { success: true, rol: data.rol };

            } else {
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

        if (!user) {
            window.location.href = "login.html";
            return false;
        }

        // Limpiamos la basura que pusiste aquí y dejamos solo la validación de acceso
        const rolUsuario = user.rol.trim().toUpperCase();
        const listaPermitida = rolesPermitidos.map(r => r.trim().toUpperCase());

        if (!listaPermitida.includes(rolUsuario)) {
            Swal.fire({ icon: 'error', title: 'Acceso denegado', text: `Tu rol (${rolUsuario}) no tiene permiso aquí.`, timer: 2000, showConfirmButton: false });
            if (rolUsuario === 'EMPLEADO' || rolUsuario === 'VENDEDOR') {
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