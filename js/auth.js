// js/auth.js

const Auth = {
    // 1. Niveles de acceso definidos
    LEVELS: {
        SUPER_ADMIN: 'SUPER_ADMIN',     // Tú (Brayan Camargo)
        ADMIN_EMPRESA: 'ADMIN_EMPRESA', // Dueño de la marca
        GERENTE: 'GERENTE',             // Jefe de sucursal
        EMPLEADO: 'EMPLEADO'            // Personal (Checador)
    },

    // 2. Simulación de Login para pruebas (esto conectará con Java después)
    login: async (username, password) => {
        // SIMULACIÓN: Usuario 'brayan' como Super Admin
        if (username === 'brayan' && password === 'admin123') {
            const userData = { nombre: 'Brayan', rol: 'SUPER_ADMIN', token: 'JWT-123' };
            localStorage.setItem("lucky_user", JSON.stringify(userData));
            return { success: true, rol: 'SUPER_ADMIN' };
        } 
        // SIMULACIÓN: Usuario 'gerente'
        else if (username === 'gerente' && password === 'lucky123') {
            const userData = { nombre: 'Gerente Tienda', rol: 'GERENTE', token: 'JWT-456' };
            localStorage.setItem("lucky_user", JSON.stringify(userData));
            return { success: true, rol: 'GERENTE' };
        }
        return { success: false, message: 'Usuario o contraseña incorrectos' };
    },

    // 3. El Guardián de rutas (lo que me preguntaste)
    checkGuard: (rolesPermitidos) => {
        const user = JSON.parse(localStorage.getItem("lucky_user"));
        
        if (!user) {
            window.location.href = "login.html";
            return;
        }

        if (user.rol === Auth.LEVELS.SUPER_ADMIN) return;

        if (!rolesPermitidos.includes(user.rol)) {
            if (user.rol === Auth.LEVELS.EMPLEADO) {
                window.location.href = "checador.html";
            } else {
                window.location.href = "index.html";
            }
            alert("Acceso denegado: No tienes los permisos necesarios.");
        }
    },

    // 4. Limpieza de sesión
    logout: () => {
        localStorage.removeItem("lucky_user");
        window.location.href = "login.html";
    }
};