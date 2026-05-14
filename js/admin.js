document.addEventListener('DOMContentLoaded', () => {
    const user = Auth.getUser();

    if (!user) {
        Auth.logout();
        return;
    }

    const welcomeTitle = document.querySelector('h2');
    if (welcomeTitle) welcomeTitle.textContent = `Bienvenido, ${user.nombre || user.username}`;

    if (user.rol === 'SUPER_ADMIN') {
        cargarSucursales();
        cargarEmpresasParaAdmin(); // Carga datos en ambos selects de empresas
    } else if (user.rol === 'ADMIN_EMPRESA') {
        const rhDash = document.getElementById('rh-dashboard');
        if(rhDash) rhDash.classList.remove('hidden');
        
        const adminGrid = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2');
        if(adminGrid) adminGrid.classList.add('hidden');
        
        cargarReportesRH();
    }
});

// --- FUNCIONES DE CARGA ---

async function cargarEmpresasParaAdmin() {
    const selectAdmin = document.getElementById('empresaAdminSelect');
    const selectSucursal = document.getElementById('empresaSucursalSelect');
    
    try {
        const token = localStorage.getItem("lucky_token");
        const response = await fetch('http://localhost:8080/api/admin/listar-empresas', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const empresas = await response.json();
        
        const options = '<option value="">Selecciona la Empresa...</option>' + 
            empresas.map(emp => `<option value="${emp.id}">${emp.nombreComercial || emp.nombre_comercial}</option>`).join('');

        if (selectAdmin) selectAdmin.innerHTML = options;
        if (selectSucursal) selectSucursal.innerHTML = options;
        console.log("✅ Selects de empresas cargados");
    } catch (e) { console.error("Error al cargar empresas:", e); }
}

async function cargarSucursales() {
    const selectSucursal = document.getElementById('sucursalSelect');
    if (!selectSucursal) return;

    try {
        const token = localStorage.getItem("lucky_token");
        const response = await fetch('http://localhost:8080/api/admin/listar-sucursales', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await response.json();
        
        selectSucursal.innerHTML = '<option value="">Selecciona una sucursal...</option>';
        data.forEach(sucursal => {
            const opcion = document.createElement('option');
            opcion.value = sucursal.id;
            opcion.textContent = sucursal.nombre;
            selectSucursal.appendChild(opcion);
        });
    } catch (error) { console.error("Error en cargarSucursales:", error); }
}

// --- FUNCIONES DE ACCIÓN ---

async function registrarEmpresaMadre() {
    const nombre = document.getElementById('nombre-empresa-madre').value.trim();
    if (!nombre) {
        Swal.fire('Atención', 'Escribe el nombre de la marca global', 'warning');
        return;
    }

    try {
        const response = await fetch('http://localhost:8080/api/admin/registrar-empresa-real', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('lucky_token')}`
            },
            body: JSON.stringify({ nombre: nombre })
        });

        if (response.ok) {
            Swal.fire('✅ Éxito', 'Marca Global registrada.', 'success').then(() => location.reload());
        }
    } catch (e) { console.error(e); }
}

async function registrarSucursal() {
    const nombre = document.getElementById('nombre-sucursal-input').value.trim();
    const empresaId = document.getElementById('empresaSucursalSelect').value;

    if (!nombre || !empresaId) {
        Swal.fire('Atención', 'Nombre de sucursal y Empresa son obligatorios', 'warning');
        return;
    }

    try {
        const token = localStorage.getItem('lucky_token');
        const response = await fetch('http://localhost:8080/api/admin/registrar-sucursal', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ 
                nombre: nombre, 
                empresaId: parseInt(empresaId),
                descripcion: "Registrada por Super Admin" 
            })
        });

        if (response.ok) {
            Swal.fire('✅ ¡Éxito!', 'Sucursal vinculada correctamente.', 'success').then(() => location.reload());
        } else {
            const err = await response.json();
            Swal.fire('Error', err.error || 'No se pudo crear la sucursal', 'error');
        }
    } catch (error) { console.error(error); }
}


async function vincularGerencia() {
    const deptoId = document.getElementById('sucursalSelect').value;
    const nombre = document.getElementById('admin-nombre').value.trim();
    const paterno = document.getElementById('admin-paterno').value.trim();
    const materno = document.getElementById('admin-materno').value.trim();
    const token = localStorage.getItem('lucky_token');

    if (!deptoId || !nombre || !paterno || !materno) {
        Swal.fire({ icon: 'warning', title: 'Incompleto', text: 'Nombre, Paterno y Materno son obligatorios.', background: '#1a1d23', color: '#fff' });
        return;
    }

    try {
        const response = await fetch('http://localhost:8080/api/admin/vincular-gerente', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ nombre, apellidoPaterno: paterno, apellidoMaterno: materno, departamentoId: parseInt(deptoId) })
        });
        const data = await response.json();
        if (response.ok) {
            Swal.fire({
                title: '✅ Gerente vinculado',
                icon: 'success',
                background: '#1a1d23', color: '#fff',
                html: `<div style="text-align: left; background: #242832; padding: 15px; border-radius: 10px;">
                        <p>USUARIO: ${data.detalles.usuario}</p>
                        <p>PASSWORD: ${data.detalles.password}</p>
                       </div>`
            });
        }
    } catch (error) { console.error(error); }
}

async function crearAdminEmpresa() {
    const empresaId = document.getElementById('empresaAdminSelect').value;
    const nombre = document.getElementById('admin-marca-nombre').value.trim();
    const paterno = document.getElementById('admin-marca-paterno').value.trim();
    const materno = document.getElementById('admin-marca-materno').value.trim();

    if (!empresaId || !nombre || !paterno || !materno) {
        Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Todos los nombres son obligatorios.', background: '#1a1d23', color: '#fff' });
        return;
    }

    try {
        const response = await fetch('http://localhost:8080/api/admin/registrar-admin-empresa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('lucky_token')}` },
            body: JSON.stringify({ empresaId: parseInt(empresaId), nombre, apellidoPaterno: paterno, apellidoMaterno: materno })
        });
        const data = await response.json();
        if (response.ok) {
            Swal.fire({
                title: '✅ Acceso Creado',
                icon: 'success',
                background: '#1a1d23', color: '#fff',
                html: `<div style="background: #242832; padding: 15px; border-radius: 10px; border: 1px solid #a855f7;">
                        <p style="color: #a855f7;">USUARIO ADMIN:</p><p>${data.usuario}</p>
                        <p style="color: #fbbf24;">PASSWORD:</p><p>${data.password}</p>
                       </div>`
            });
        } else {
            Swal.fire('Error', data.error || 'No se pudo crear', 'error');
        }
    } catch (error) { console.error(error); }
}

async function registrarEmpresaMadre() {
    const nombre = document.getElementById('nombre-empresa-madre').value.trim();
    if (!nombre) {
        Swal.fire('Atención', 'Escribe el nombre de la marca global', 'warning');
        return;
    }

    try {
        const response = await fetch('http://localhost:8080/api/admin/registrar-empresa-real', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('lucky_token')}`
            },
            body: JSON.stringify({ nombre: nombre })
        });

        if (response.ok) {
            Swal.fire('✅ Éxito', 'Marca registrada. Ya puedes asignarle sucursales.', 'success')
                .then(() => location.reload());
        }
    } catch (e) { console.error(e); }
}