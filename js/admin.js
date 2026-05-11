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

// FUNCIÓN 3: Vincular Gerente (Actualizada con los 3 campos de Nombre)
async function vincularGerencia() {
    // 1. Atrapamos el valor de la sucursal (tu select)
    const deptoId = document.getElementById('sucursalSelect').value;
    
    // 2. Atrapamos los valores de los nuevos inputs que pusiste en el HTML
    const nombre = document.getElementById('admin-nombre').value.trim();
    const paterno = document.getElementById('admin-paterno').value.trim();
    const materno = document.getElementById('admin-materno').value.trim();

    const token = localStorage.getItem('lucky_token');

    // 3. Validamos que no dejen lo importante vacío
    if (!deptoId || !nombre || !paterno) {
        alert("⚠️ Faltan datos. La sucursal, el nombre y el apellido paterno son obligatorios.");
        return;
    }

    // 4. Armamos el "Paquete" exacto que espera recibir nuestro Java (DatosRegistroGerente)
    const payload = {
        nombre: nombre,
        apellidoPaterno: paterno,
        apellidoMaterno: materno,
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

        const data = await response.json();

        if (response.ok) {
            // Mostramos los datos de acceso generados por Java para que se los pases al gerente
            alert(`✅ ¡Éxito! Gerente vinculado.\n\nGuarda estos datos de acceso:\n👤 Usuario: ${data.detalles.usuario}\n🔑 Contraseña: ${data.detalles.password}`);
            
            // Limpiamos los campos
            document.getElementById('admin-nombre').value = '';
            document.getElementById('admin-paterno').value = '';
            document.getElementById('admin-materno').value = '';
            document.getElementById('sucursalSelect').value = '';
            
            // Opcional: location.reload(); si quieres refrescar toda la página
        } else {
            alert("❌ Error: " + (data.error || response.statusText));
        }
    } catch (error) {
        console.error("Detalle del error:", error);
        alert("🚀 Error de conexión: El servidor no responde o bloqueó la petición.");
    }
}