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

        // 👇 ESTE ES EL CÓDIGO QUE FALTA PARA DIBUJAR EN PANTALLA 👇
        const selectEmpresa = document.querySelector('select');

        if (selectEmpresa && data.length > 0) {
            // 1. Limpiamos las opciones (por si se ejecuta dos veces)
            selectEmpresa.innerHTML = '<option value="">Selecciona una empresa...</option>';

            // 2. Recorremos los datos que llegaron de Java
            data.forEach(sucursal => {
                const opcion = document.createElement('option');
                opcion.value = sucursal.id;          // El ID oculto que se manda al backend
                opcion.textContent = sucursal.nombre; // El texto visible para ti
                selectEmpresa.appendChild(opcion);
            });
        }

    } catch (error) {
        console.error("Error cargando sucursales:", error);
    }
}

// FUNCIÓN 2: Registrar Nueva Sucursal
async function registrarSucursal() {
    const boton = document.querySelector('button[onclick="registrarSucursal()"]');
    const input = document.querySelector('input[placeholder="Ej. Tienda de Ropa Lucky"]');
    const nombreSucursal = input ? input.value.trim() : "";

    if (!nombreSucursal) {
        alert("⚠️ Por favor, ingresa el nombre de la empresa.");
        return;
    }

    if (boton) {
        boton.disabled = true;
        boton.textContent = "Registrando...";
    }

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

// FUNCIÓN 3: Vincular Gerente (Versión Final LuckyDev)
async function vincularGerencia() {
    const deptoId = document.getElementById('sucursalSelect').value;
    const nombre = document.getElementById('admin-nombre').value.trim();
    const paterno = document.getElementById('admin-paterno').value.trim();
    const materno = document.getElementById('admin-materno').value.trim();

    const token = localStorage.getItem('lucky_token');

    if (!deptoId || !nombre || !paterno) {
        Swal.fire({
            icon: 'warning',
            title: 'Datos incompletos',
            text: 'La sucursal, el nombre y el apellido paterno son obligatorios.',
            background: '#1a1d23', color: '#fff'
        });
        return;
    }

    const payload = {
        nombre: nombre,
        apellidoPaterno: paterno,
        apellidoMaterno: materno, // Aquí ya viaja el materno para la unicidad
        departamentoId: parseInt(deptoId)
    };

    try {
        const response = await fetch('http://localhost:8080/api/admin/vincular-gerente', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        // Procesamos la respuesta UNA sola vez
        const data = await response.json();

        if (response.ok) {
    Swal.fire({
        title: '✅ ¡Éxito! Gerente vinculado',
        icon: 'success',
        background: '#1a1d23', 
        color: '#ffffff',
        html: `
            <div style="text-align: left; background: #242832; color: white; padding: 20px; border-radius: 15px; border: 1px solid #10b981; margin-top: 15px;">
                <p style="font-size: 11px; color: #10b981; margin-bottom: 12px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Credenciales de Acceso</p>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-size: 10px; color: #9ca3af; display: block; margin-bottom: 4px;">USUARIO GERENCIAL</span>
                    <p style="font-family: 'JetBrains Mono', monospace; font-size: 16px; color: #ffffff; margin: 0; background: #1a1d23; padding: 8px; border-radius: 6px;">${data.detalles.usuario}</p>
                </div>

                <div>
                    <span style="font-size: 10px; color: #9ca3af; display: block; margin-bottom: 4px;">PASSWORD TEMPORAL</span>
                    <p style="font-family: 'JetBrains Mono', monospace; font-size: 16px; color: #fbbf24; margin: 0; background: #1a1d23; padding: 8px; border-radius: 6px;">${data.detalles.password}</p>
                </div>
            </div>
            <p style="font-size: 11px; color: #9ca3af; margin-top: 15px;">Copia estos datos y entrégalos al nuevo gerente de sucursal.</p>
        `,
        confirmButtonText: 'He guardado los datos',
        confirmButtonColor: '#6366f1', // Un color más acorde al Super Admin
        customClass: {
            popup: 'rounded-2xl'
        }
    });

            // Limpieza de campos
            document.getElementById('admin-nombre').value = '';
            document.getElementById('admin-paterno').value = '';
            document.getElementById('admin-materno').value = '';
            document.getElementById('sucursalSelect').value = '';

        } else {
            // Usamos el 'data' que ya procesamos arriba para mostrar el error de duplicado
            Swal.fire({
                icon: 'error',
                title: 'No se pudo vincular',
                text: data.error || 'El usuario ya existe o los datos son incorrectos.',
                background: '#1a1d23', color: '#fff'
            });
        }
    } catch (error) {
        console.error("Detalle del error:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: 'El servidor de LuckyDev no responde.',
            background: '#1a1d23', color: '#fff'
        });
    }
}