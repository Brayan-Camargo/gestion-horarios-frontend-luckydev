document.addEventListener('DOMContentLoaded', () => {
    const user = Auth.getUser();

    // 1. Validar sesión y rol
    if (!user || user.rol !== 'SUPER_ADMIN') {
        console.warn("Acceso no autorizado o sesión expirada.");
        Auth.logout();
        return;
    }

    // 2. Personalizar la interfaz con el nombre del usuario
    const userNameElement = document.getElementById("userName");
    if (userNameElement) {
        userNameElement.textContent = user.nombre || user.username;
    }

    console.log("Sesión verificada para:", user.username);
    cargarSucursales();
});

// FUNCIÓN 1: Cargar Sucursales
async function cargarSucursales() {
    try {
    
        const token = localStorage.getItem("lucky_token");

        const response = await fetch('http://localhost:8080/api/admin/listar-sucursales', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        });

        if (!response.ok) {
            throw new Error('Error en la petición: ' + response.status);
        }

        const data = await response.json();
        console.log("Sucursales cargadas exitosamente:", data);
        
        // ... (Aquí irá tu lógica para pintar las sucursales en el select HTML) ...

    } catch (error) {
        console.error("Error cargando sucursales (Revisa tu backend):", error);
    }
}

// FUNCIÓN 2: Registrar Nueva Sucursal
async function registrarSucursal() {
    const boton = document.querySelector('.btn-azul');
    const input = document.querySelector('input[placeholder="Ej. Tienda de Ropa Lucky"]');
    const nombreSucursal = input ? input.value.trim() : "";

    if (!nombreSucursal) {
        alert("⚠️ Por favor, ingresa el nombre de la empresa.");
        return;
    }

    boton.disabled = true;
    boton.textContent = "Registrando...";

    try {
        // ✅ USANDO LA LLAVE CORRECTA DE LA IMAGEN
        const token = localStorage.getItem('lucky_token');

        const response = await fetch('http://localhost:8080/api/admin/registrar-sucursal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ nombre: nombreSucursal })
        });

        if (response.ok) {
            alert(`✅ Sucursal '${nombreSucursal}' registrada con éxito.`);
            location.reload();
        } else {
            const errorText = await response.text();
            alert("❌ Error: " + (errorText || "No se pudo registrar la sucursal. Verifica tus permisos."));
        }
    } catch (error) {
        console.error("Error en la petición:", error);
        alert("🚀 Error de conexión: El servidor de LuckyDev no responde.");
    } finally {
        boton.disabled = false;
        boton.textContent = "Crear Nueva Sucursal";
    }
}

// FUNCIÓN 3: Vincular Gerente
async function vincularGerencia() {
    const deptoId = document.querySelector('select').value;
    const username = document.querySelector('input[placeholder*="gerente"]').value;
    
    // ✅ USANDO LA LLAVE CORRECTA DE LA IMAGEN
    const token = localStorage.getItem('lucky_token');

    if (!deptoId || !username) {
        alert("⚠️ Completa los campos");
        return;
    }

    try {
        const response = await fetch('http://localhost:8080/api/admin/vincular-gerente', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ username, departamentoId: deptoId })
        });

        if (response.ok) {
            alert("✅ ¡Éxito total! Gerente vinculado correctamente.");
            location.reload();
        } else {
            alert("❌ Error en el servidor: " + response.status);
        }
    } catch (error) {
        console.error("Detalle del error:", error);
        alert("🚀 Error de conexión: El servidor no responde o bloqueó la petición.");
    }
}